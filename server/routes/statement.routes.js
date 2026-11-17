import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Helper to determine if an entry represents an actual wallet balance impact in the ledger
export const entryAffectsBalance = (entry) => {
  if (!entry) return false;
  if (entry.type === 'CREDIT') {
    return entry.status === 'SUCCESS' || entry.status === 'REFUNDED' || entry.status === 'REVERTED';
  }
  if (entry.type === 'DEBIT') {
    if (entry.status === 'SUCCESS' || entry.status === 'PENDING') return true;
    if (entry.has_refund) return true; // Debited upfront and subsequently refunded
    return false;
  }
  return false;
};

// Helper: Compile Unified Account Statement for a User
export const compileUserStatement = async (userId, options = {}) => {
  const { startDate, endDate, type, category, search } = options;

  // 1. Fetch User Profile
  let userProfile = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) userProfile = data;
    } catch {}
  }
  if (!userProfile) {
    userProfile = (db.users || []).find(u => u.id === userId);
  }

  if (!userProfile) return null;

  const rawEntries = [];

  // 2. Fetch QR Payment Requests (All states: Approved, Reverted, Rejected, Pending)
  let qrRequests = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('qr_payment_requests')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(data)) qrRequests = data;
    } catch {}
  }
  if (qrRequests.length === 0) {
    qrRequests = (db.qr_payment_requests || []).filter(r => r.user_id === userId);
  }

  for (const qr of qrRequests) {
    const gross = parseFloat(qr.amount || 0);
    const fee = parseFloat(qr.charge_amount || 0);
    const net = parseFloat(qr.net_amount || (gross - fee));
    const feePct = qr.charge_percent ? `${qr.charge_percent}%` : '';
    const isReverted = qr.status === 'reverted' || (qr.status === 'rejected' && String(qr.rejection_reason || '').startsWith('[REVERTED]'));
    const isRejected = (qr.status === 'rejected' || qr.status === 'declined') && !isReverted;
    const isPending = qr.status === 'pending';

    const originalUtrMatch = (qr.admin_note && qr.admin_note.match(/Original UTR:\s*(\d{12})/)?.[1])
      || (qr.revert_reason && qr.revert_reason.match(/Original UTR:\s*(\d{12})/)?.[1])
      || (qr.rejection_reason && qr.rejection_reason.match(/Original UTR:\s*(\d{12})/)?.[1]);
    const displayUtr = originalUtrMatch || qr.utr_number || qr.id;

    let entryStatus = 'SUCCESS';
    let entryTitle = 'QR Add Money - UPI Settlement';
    let entryNarration = `QR Add Money via UPI (${qr.mobile_number || 'Mobile'})`;
    let mathBreakdown = `Request: ₹${gross.toFixed(2)} - QR Charge ${feePct ? `(${feePct})` : ''}: ₹${fee.toFixed(2)} = Net Credited: ₹${net.toFixed(2)}`;

    if (isReverted) {
      entryStatus = 'REVERTED';
      entryTitle = 'QR Add Money (Reverted Later)';
      entryNarration = `QR Add Money via UPI (${qr.mobile_number || 'Mobile'}) [Reverted]`;
    } else if (isRejected) {
      entryStatus = 'REJECTED';
      entryTitle = 'QR Add Money (Rejected)';
      const reason = qr.rejection_reason || 'Rejected by Admin';
      entryNarration = `QR Add Money via UPI (${qr.mobile_number || 'Mobile'}) - ${reason}`;
      mathBreakdown = `Request: ₹${gross.toFixed(2)} - Rejected by Admin (${reason})`;
    } else if (isPending) {
      entryStatus = 'PENDING';
      entryTitle = 'QR Add Money (Pending Verification)';
      entryNarration = `QR Add Money via UPI (${qr.mobile_number || 'Mobile'}) [Pending Approval]`;
      mathBreakdown = `Request: ₹${gross.toFixed(2)} (Awaiting Admin Verification)`;
    }

    // 1. Original Credit Entry
    rawEntries.push({
      id: `stmt_qr_${qr.id}`,
      original_id: qr.id,
      user_id: userId,
      type: 'CREDIT',
      category: 'QR_LOAD',
      amount: gross,
      charge_amount: fee,
      net_amount: net,
      title: entryTitle,
      narration: entryNarration,
      math_breakdown: mathBreakdown,
      reference_id: displayUtr,
      status: entryStatus,
      created_at: qr.processed_at || qr.created_at
    });

    // 2. If Reverted, record matching DEBIT reversal entry in the ledger
    if (isReverted) {
      const revertReason = qr.revert_reason || (String(qr.rejection_reason || '').startsWith('[REVERTED]') ? qr.rejection_reason.replace('[REVERTED]', '').trim() : 'Reverted by Admin');
      rawEntries.push({
        id: `stmt_qr_rev_${qr.id}`,
        original_id: qr.id,
        user_id: userId,
        type: 'DEBIT',
        category: 'REVERSAL',
        amount: gross,
        charge_amount: 0,
        net_amount: net,
        title: 'QR Deposit Reversal (Admin Undo)',
        narration: `Reversal of UTR ${displayUtr} - ${revertReason}`,
        math_breakdown: `Reversal Deduction: -₹${net.toFixed(2)} (Reason: ${revertReason})`,
        reference_id: displayUtr,
        status: 'SUCCESS',
        created_at: qr.reverted_at || qr.processed_at || qr.created_at
      });
    }
  }

  // 3. Fetch Payout Transfers (DEBIT for transfer + CREDIT for auto-refunds)
  let payouts = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('payout_transactions')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(data)) payouts = data;
    } catch {}
  }
  if (payouts.length === 0) {
    payouts = (db.payout_transactions || []).filter(p => p.user_id === userId);
  }

  for (const po of payouts) {
    const principal = parseFloat(po.amount || 0);
    const fee = parseFloat(po.slab_charge || 0);
    const totalDeducted = parseFloat(po.total_deducted || (principal + fee));
    const accMasked = po.account_number ? `••${String(po.account_number).slice(-4)}` : '';
    const bankName = po.bank_name || 'Bank';
    const isRefunded = !!(po.refunded_to_wallet || po.status === 'refunded' || (po.status === 'failed' && po.refunded_to_wallet !== false));

    // Debit entry (Initial deduction)
    rawEntries.push({
      id: `stmt_po_deb_${po.id}`,
      original_id: po.id,
      user_id: userId,
      type: 'DEBIT',
      category: 'PAYOUT',
      amount: principal,
      charge_amount: fee,
      net_amount: totalDeducted,
      title: `Instant Payout to ${po.beneficiary_name} (${bankName} A/C ${accMasked})`,
      narration: `Bank Transfer (${po.transfer_mode || 'IMPS'}) to ${po.beneficiary_name} - ${po.ifsc_code}`,
      math_breakdown: `Transfer: ₹${principal.toFixed(2)} + Payout Slab Fee: ₹${fee.toFixed(2)} = Total Debited: ₹${totalDeducted.toFixed(2)}`,
      reference_id: po.utr || po.client_order_id,
      status: po.status === 'success' ? 'SUCCESS' : (po.status === 'failed' ? 'FAILED' : 'PENDING'),
      has_refund: isRefunded,
      created_at: po.created_at
    });

    // If failed & refunded, create separate CREDIT refund row
    if (isRefunded) {
      rawEntries.push({
        id: `stmt_po_ref_${po.id}`,
        original_id: po.id,
        user_id: userId,
        type: 'CREDIT',
        category: 'REFUND',
        amount: principal,
        charge_amount: fee,
        net_amount: totalDeducted,
        title: `REFUND: Payout Reversal to Wallet`,
        narration: `Reversal of Payout Ref: ${po.client_order_id} (${po.failure_reason || 'Bank Transfer Failed'})`,
        math_breakdown: `Refunded: ₹${principal.toFixed(2)} + Fee Refund: ₹${fee.toFixed(2)} = Total Credited: ₹${totalDeducted.toFixed(2)}`,
        reference_id: po.client_order_id,
        status: 'REFUNDED',
        has_refund: false,
        created_at: po.updated_at || new Date(new Date(po.created_at).getTime() + 1000).toISOString()
      });
    }
  }

  // 4. Fetch Credit Card Bill Requests (DEBIT for bill request + CREDIT for rejection refunds)
  let ccRequests = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('credit_card_bill_requests')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(data)) ccRequests = data;
    } catch {}
  }
  if (ccRequests.length === 0) {
    ccRequests = (db.bill_requests || []).filter(r => r.user_id === userId);
  }

  for (const cc of ccRequests) {
    const billAmt = parseFloat(cc.amount || 0);
    const fee = parseFloat(cc.service_charge || 0);
    const totalAmt = parseFloat(cc.total_amount || (billAmt + fee));
    const cardMasked = cc.card_number ? `••${String(cc.card_number).slice(-4)}` : '';
    const isRejected = cc.status === 'rejected';

    rawEntries.push({
      id: `stmt_cc_deb_${cc.id}`,
      original_id: cc.id,
      user_id: userId,
      type: 'DEBIT',
      category: 'CC_BILL',
      amount: billAmt,
      charge_amount: fee,
      net_amount: totalAmt,
      title: `CC Bill Pay - ${cc.bank_name || 'Card'} (${cardMasked})`,
      narration: `Credit Card Bill for ${cc.customer_name || 'Customer'} - ${cc.bank_name || ''}`,
      math_breakdown: `Bill: ₹${billAmt.toFixed(2)} + Service Charge: ₹${fee.toFixed(2)} = Total Debited: ₹${totalAmt.toFixed(2)}`,
      reference_id: cc.id,
      status: cc.status === 'approved' ? 'SUCCESS' : (cc.status === 'rejected' ? 'REJECTED' : 'PENDING'),
      has_refund: isRejected,
      created_at: cc.created_at
    });

    if (isRejected) {
      rawEntries.push({
        id: `stmt_cc_ref_${cc.id}`,
        original_id: cc.id,
        user_id: userId,
        type: 'CREDIT',
        category: 'REFUND',
        amount: billAmt,
        charge_amount: fee,
        net_amount: totalAmt,
        title: `REFUND: CC Bill Request Rejected`,
        narration: `Reversal for CC Request ${cc.id} (${cc.rejection_reason || 'Rejected by Admin'})`,
        math_breakdown: `Refunded Bill: ₹${billAmt.toFixed(2)} + Charge Refund: ₹${fee.toFixed(2)} = Total Credited: ₹${totalAmt.toFixed(2)}`,
        reference_id: cc.id,
        status: 'REFUNDED',
        has_refund: false,
        created_at: cc.processed_at || new Date(new Date(cc.created_at).getTime() + 1000).toISOString()
      });
    }
  }

  // 5. Fetch BBPS Bill Payments
  let bbpsPayments = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('bbps_bill_payments')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(data)) bbpsPayments = data;
    } catch {}
  }
  if (bbpsPayments.length === 0) {
    bbpsPayments = (db.bill_payments || []).filter(b => b.user_id === userId);
  }

  for (const bp of bbpsPayments) {
    const bpAmt = parseFloat(bp.amount || 0);
    const fee = parseFloat(bp.service_charge || 0);
    const totalDeducted = parseFloat(bp.total_deducted || (bpAmt + fee));
    const isSuccess = bp.status === 'success' || bp.status === 'approved';
    const isPending = bp.status === 'pending';

    rawEntries.push({
      id: `stmt_bp_${bp.id}`,
      original_id: bp.id,
      user_id: userId,
      type: 'DEBIT',
      category: 'BBPS_BILL',
      amount: bpAmt,
      charge_amount: fee,
      net_amount: totalDeducted,
      title: bp.biller_name ? `BBPS Live Payment - ${bp.biller_name}` : 'BBPS Live Payment',
      narration: `Utility Bill Payment for ${bp.customer_name || bp.customer_mobile}`,
      math_breakdown: fee > 0
        ? `Bill: ₹${bpAmt.toFixed(2)} + Service Charge: ₹${fee.toFixed(2)} = Total Debited: ₹${totalDeducted.toFixed(2)}`
        : `Bill Amount: ₹${bpAmt.toFixed(2)} = Total Debited: ₹${totalDeducted.toFixed(2)}`,
      reference_id: bp.bbps_txn_ref_id || bp.client_transaction_id || bp.id,
      status: isSuccess ? 'SUCCESS' : (isPending ? 'PENDING' : 'FAILED'),
      has_refund: false,
      created_at: bp.created_at
    });
  }

  // 5b. Fetch Bank Account Penny Drop Verifications
  let verifications = [];
  if (supabase) {
    try {
      const { data } = await supabase
        .from('payout_verifications')
        .select('*')
        .eq('user_id', userId);
      if (Array.isArray(data)) verifications = data;
    } catch {}
  }
  if (verifications.length === 0) {
    verifications = (db.payout_verifications || []).filter(v => v.user_id === userId);
  }

  for (const v of verifications) {
    const fee = parseFloat(v.charge_deducted || 0);
    if (v.status === 'success' && fee > 0) {
      const accMasked = v.account_number ? `••${String(v.account_number).slice(-4)}` : '';
      rawEntries.push({
        id: `stmt_vfy_${v.id}`,
        original_id: v.id,
        user_id: userId,
        type: 'DEBIT',
        category: 'VERIFICATION',
        amount: fee,
        charge_amount: 0,
        net_amount: fee,
        title: `Bank Account Verification (${v.bank_name || 'Bank'} A/C ${accMasked})`,
        narration: `Penny Drop Verification for ${v.name_at_bank || 'Beneficiary'} - ${v.ifsc_code || ''}`,
        math_breakdown: `Verification Charge: ₹${fee.toFixed(2)} = Total Debited: ₹${fee.toFixed(2)}`,
        reference_id: v.client_reference_id || v.id,
        status: 'SUCCESS',
        has_refund: false,
        created_at: v.created_at
      });
    }
  }

  // 6. Chronological Sorting ASC to compute exact Bank Running Balance
  rawEntries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const currentWalletBalance = parseFloat(userProfile.wallet_balance || 0);

  // Compute total delta across history
  let totalCredits = 0;
  let totalDebits = 0;

  for (const entry of rawEntries) {
    if (entryAffectsBalance(entry)) {
      if (entry.type === 'CREDIT') totalCredits += entry.net_amount;
      else if (entry.type === 'DEBIT') totalDebits += entry.net_amount;
    }
  }

  // Inferred initial opening balance at the dawn of account
  let running = Math.max(0, parseFloat((currentWalletBalance - totalCredits + totalDebits).toFixed(2)));
  const initialBaseBalance = running;

  // Assign Running Balance to each row
  for (const entry of rawEntries) {
    entry.opening_balance = parseFloat(running.toFixed(2));
    if (entryAffectsBalance(entry)) {
      if (entry.type === 'CREDIT') {
        running += entry.net_amount;
      } else if (entry.type === 'DEBIT') {
        running -= entry.net_amount;
      }
    }
    entry.running_balance = parseFloat(running.toFixed(2));
    entry.closing_balance = entry.running_balance;
  }

  // 7. Apply Filters (Date range, type, category, search)
  let filtered = [...rawEntries];

  if (startDate) {
    const startTs = new Date(startDate).getTime();
    filtered = filtered.filter(e => new Date(e.created_at).getTime() >= startTs);
  }

  if (endDate) {
    const endTs = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
    filtered = filtered.filter(e => new Date(e.created_at).getTime() <= endTs);
  }

  if (type && type !== 'ALL') {
    if (type === 'REFUND') {
      filtered = filtered.filter(e => e.category === 'REFUND');
    } else {
      filtered = filtered.filter(e => e.type === type.toUpperCase());
    }
  }

  if (category && category !== 'ALL') {
    filtered = filtered.filter(e => e.category === category);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.narration || '').toLowerCase().includes(q) ||
      (e.math_breakdown || '').toLowerCase().includes(q) ||
      (e.reference_id || '').toLowerCase().includes(q)
    );
  }

  // 8. Calculate Filtered Period Summaries
  let periodCredit = 0;
  let periodDebit = 0;

  for (const e of filtered) {
    if (entryAffectsBalance(e)) {
      if (e.type === 'CREDIT') periodCredit += e.net_amount;
      else if (e.type === 'DEBIT') periodDebit += e.net_amount;
    }
  }

  const periodOpening = filtered.length > 0 ? filtered[0].opening_balance : currentWalletBalance;
  const periodClosing = filtered.length > 0 ? filtered[filtered.length - 1].running_balance : currentWalletBalance;

  // Reverse filtered items to DESC (most recent first) for UI display
  filtered.reverse();

  return {
    account_details: {
      user_id: userProfile.id,
      name: userProfile.name,
      firm_name: userProfile.firm_name || 'Retail Outlet',
      mobile_number: userProfile.mobile_number,
      role: userProfile.role,
      status: userProfile.status || 'Active'
    },
    summary: {
      opening_balance: parseFloat(periodOpening.toFixed(2)),
      total_credits: parseFloat(periodCredit.toFixed(2)),
      total_debits: parseFloat(periodDebit.toFixed(2)),
      total_commission: parseFloat((userProfile.commission_balance || 0).toFixed(2)),
      closing_balance: parseFloat(periodClosing.toFixed(2)),
      current_wallet_balance: currentWalletBalance,
      total_entries_count: filtered.length
    },
    entries: filtered
  };
};

// ============================================================================
// ENDPOINTS
// ============================================================================

// GET /api/statement/user - Fetch logged-in user statement
router.get('/user', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, type, category, search } = req.query;

    const statement = await compileUserStatement(req.user.id, {
      startDate,
      endDate,
      type,
      category,
      search
    });

    if (!statement) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    return res.status(200).json({
      success: true,
      statement
    });
  } catch (err) {
    console.error('Fetch User Statement Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate account statement' });
  }
});

// GET /api/statement/admin - Fetch Admin statement (can specify targetUserId)
router.get('/admin', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { targetUserId, startDate, endDate, type, category, search } = req.query;

    // If specific user selected
    if (targetUserId) {
      const statement = await compileUserStatement(targetUserId, {
        startDate,
        endDate,
        type,
        category,
        search
      });

      if (!statement) {
        return res.status(404).json({ success: false, message: 'Target user not found' });
      }

      return res.status(200).json({
        success: true,
        statement
      });
    }

    // Master Statement across all users
    let allUsers = [];
    if (supabase) {
      try {
        const { data } = await supabase.from('users_profiles').select('id, name, firm_name, mobile_number, wallet_balance, commission_balance, role');
        if (Array.isArray(data)) allUsers = data;
      } catch {}
    }
    if (allUsers.length === 0) {
      allUsers = db.users || [];
    }

    // Compile combined statements
    let allEntries = [];
    let totalInflow = 0;
    let totalOutflow = 0;
    let totalPlatformCommission = 0;
    let totalSystemWalletBalance = 0;

    for (const u of allUsers) {
      totalSystemWalletBalance += parseFloat(u.wallet_balance || 0);
      totalPlatformCommission += parseFloat(u.commission_balance || 0);

      const st = await compileUserStatement(u.id, { startDate, endDate, type, category, search });
      if (st && Array.isArray(st.entries)) {
        for (const e of st.entries) {
          allEntries.push({
            ...e,
            user_name: u.name,
            firm_name: u.firm_name,
            user_mobile: u.mobile_number
          });
          if (entryAffectsBalance(e)) {
            if (e.type === 'CREDIT') totalInflow += e.net_amount;
            else if (e.type === 'DEBIT') totalOutflow += e.net_amount;
          }
        }
      }
    }

    // Sort combined entries DESC
    allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({
      success: true,
      statement: {
        account_details: {
          name: 'Super Admin HQ',
          firm_name: 'Master Company Ledger',
          role: 'admin'
        },
        summary: {
          opening_balance: 0,
          total_credits: parseFloat(totalInflow.toFixed(2)),
          total_debits: parseFloat(totalOutflow.toFixed(2)),
          total_commission: parseFloat(totalPlatformCommission.toFixed(2)),
          closing_balance: parseFloat(totalSystemWalletBalance.toFixed(2)),
          total_entries_count: allEntries.length
        },
        entries: allEntries
      }
    });
  } catch (err) {
    console.error('Fetch Admin Statement Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate admin master statement' });
  }
});

// GET /api/statement/users-list (Admin only - to populate user select dropdown)
router.get('/users-list', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    let users = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('users_profiles')
          .select('id, name, firm_name, mobile_number, role, wallet_balance, commission_balance')
          .order('name', { ascending: true });
        if (Array.isArray(data)) users = data;
      } catch {}
    }
    if (users.length === 0) {
      users = (db.users || []).map(u => ({
        id: u.id,
        name: u.name,
        firm_name: u.firm_name,
        mobile_number: u.mobile_number,
        role: u.role,
        wallet_balance: u.wallet_balance,
        commission_balance: u.commission_balance
      }));
    }

    return res.status(200).json({
      success: true,
      users
    });
  } catch (err) {
    console.error('Fetch Users List Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users list' });
  }
});

export default router;
