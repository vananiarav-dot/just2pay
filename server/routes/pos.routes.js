import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Local file storage path to ensure ZERO DATA LOSS across server restarts & deployments
const POS_DATA_FILE = path.join(process.cwd(), 'server/db/pos_data.json');

// Default seed machines
const DEFAULT_POS_MACHINES = [
  {
    id: 'pos_m_01',
    machine_name: 'HDFC SmartHub Android POS',
    terminal_id: 'HDFC_TID_8841',
    serial_number: 'SN-PAX-A910-001',
    model: 'Pax A910 4G Android',
    bank_name: 'HDFC Bank',
    default_t0_charge_percent: 1.20,
    default_t1_charge_percent: 0.80,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'pos_m_02',
    machine_name: 'ICICI Merchant Swipe POS',
    terminal_id: 'ICICI_TID_9923',
    serial_number: 'SN-VERIFONE-V200T',
    model: 'Verifone V200T High-Speed',
    bank_name: 'ICICI Bank',
    default_t0_charge_percent: 1.20,
    default_t1_charge_percent: 0.80,
    is_active: true,
    created_at: new Date().toISOString()
  }
];

// Helper to load persistent POS data from local JSON file
const loadPersistentPosData = () => {
  try {
    if (fs.existsSync(POS_DATA_FILE)) {
      const raw = fs.readFileSync(POS_DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data) {
        if (Array.isArray(data.pos_payment_requests) && data.pos_payment_requests.length > 0) {
          db.pos_payment_requests = data.pos_payment_requests;
        }
        if (Array.isArray(data.pos_machines) && data.pos_machines.length > 0) {
          db.pos_machines = data.pos_machines;
        }
        if (Array.isArray(data.pos_wallet_ledger) && data.pos_wallet_ledger.length > 0) {
          db.pos_wallet_ledger = data.pos_wallet_ledger;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed loading local pos_data.json:', err.message);
  }
};

// Helper to save persistent POS data to local JSON file
const savePersistentPosData = () => {
  try {
    const dir = path.dirname(POS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      pos_machines: db.pos_machines || [],
      pos_payment_requests: db.pos_payment_requests || [],
      pos_wallet_ledger: db.pos_wallet_ledger || [],
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(POS_DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Failed saving local pos_data.json:', err.message);
  }
};

// Helper to ensure in-memory store initialized & loaded from disk
const initPosStore = () => {
  if (!db.pos_machines || db.pos_machines.length === 0) {
    db.pos_machines = [...DEFAULT_POS_MACHINES];
  }
  if (!db.pos_payment_requests) db.pos_payment_requests = [];
  if (!db.pos_wallet_ledger) db.pos_wallet_ledger = [];
  loadPersistentPosData();
};
initPosStore();

// ============================================================================
// 1. POS MACHINES MANAGEMENT
// ============================================================================

// GET /api/pos/machines - List POS Machines
router.get('/machines', verifyToken, async (req, res) => {
  try {
    initPosStore();
    const isAdmin = req.user.role === 'admin';
    const includeInactive = req.query.include_inactive === 'true' && isAdmin;

    let machines = [];
    if (supabase) {
      try {
        let query = supabase.from('pos_machines').select('*').order('created_at', { ascending: false });
        if (!includeInactive) {
          query = query.eq('is_active', true);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          machines = data;
        }
      } catch (e) {
        console.warn('Supabase pos_machines fetch warning:', e.message);
      }
    }

    if (machines.length === 0) {
      machines = includeInactive 
        ? db.pos_machines 
        : db.pos_machines.filter(m => m.is_active !== false);
    }

    // For non-admin (retailer / user), only return machines that are assigned to them!
    if (!isAdmin) {
      const userId = req.user.id;
      let caller = (db.users || []).find(u => u.id === userId);
      if (!caller && supabase) {
        const { data } = await supabase.from('users_profiles').select('*').eq('id', userId).maybeSingle();
        if (data) caller = data;
      }
      const assignedIds = Array.isArray(caller?.assigned_pos_machine_ids) ? caller.assigned_pos_machine_ids : [];
      machines = machines.filter(m => assignedIds.includes(m.id));
    }

    return res.status(200).json({ success: true, machines });
  } catch (err) {
    console.error('Fetch POS machines error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch POS machines' });
  }
});

// POST /api/pos/machines - Create POS Machine (Admin only)
router.post('/machines', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const { 
      machine_name, terminal_id, serial_number, model, 
      bank_name, default_t0_charge_percent, default_t1_charge_percent, is_active 
    } = req.body;

    if (!machine_name || !terminal_id) {
      return res.status(400).json({ success: false, message: 'machine_name and terminal_id are required' });
    }

    const newMachine = {
      id: `pos_m_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
      machine_name: machine_name.trim(),
      terminal_id: terminal_id.trim(),
      serial_number: (serial_number || '').trim(),
      model: (model || 'Android Smart POS').trim(),
      bank_name: (bank_name || 'HDFC Bank').trim(),
      default_t0_charge_percent: Math.max(0, parseFloat(default_t0_charge_percent) || 1.20),
      default_t1_charge_percent: Math.max(0, parseFloat(default_t1_charge_percent) || 0.80),
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.pos_machines.unshift(newMachine);
    savePersistentPosData();

    if (supabase) {
      try {
        await supabase.from('pos_machines').insert([newMachine]);
      } catch (e) {
        console.warn('Supabase pos_machines insert warning:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'POS Machine created successfully',
      machine: newMachine
    });
  } catch (err) {
    console.error('Create POS machine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create POS machine' });
  }
});

// PUT /api/pos/machines/:id - Update POS Machine (Admin only)
router.put('/machines/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const { id } = req.params;
    const { 
      machine_name, terminal_id, serial_number, model, 
      bank_name, default_t0_charge_percent, default_t1_charge_percent, is_active 
    } = req.body;

    let idx = db.pos_machines.findIndex(m => m.id === id);
    if (idx !== -1) {
      if (machine_name !== undefined) db.pos_machines[idx].machine_name = machine_name.trim();
      if (terminal_id !== undefined) db.pos_machines[idx].terminal_id = terminal_id.trim();
      if (serial_number !== undefined) db.pos_machines[idx].serial_number = serial_number.trim();
      if (model !== undefined) db.pos_machines[idx].model = model.trim();
      if (bank_name !== undefined) db.pos_machines[idx].bank_name = bank_name.trim();
      if (default_t0_charge_percent !== undefined) db.pos_machines[idx].default_t0_charge_percent = Math.max(0, parseFloat(default_t0_charge_percent) || 0);
      if (default_t1_charge_percent !== undefined) db.pos_machines[idx].default_t1_charge_percent = Math.max(0, parseFloat(default_t1_charge_percent) || 0);
      if (is_active !== undefined) db.pos_machines[idx].is_active = Boolean(is_active);
      db.pos_machines[idx].updated_at = new Date().toISOString();
      savePersistentPosData();
    }

    if (supabase) {
      try {
        const updatePayload = { updated_at: new Date().toISOString() };
        if (machine_name !== undefined) updatePayload.machine_name = machine_name.trim();
        if (terminal_id !== undefined) updatePayload.terminal_id = terminal_id.trim();
        if (serial_number !== undefined) updatePayload.serial_number = serial_number.trim();
        if (model !== undefined) updatePayload.model = model.trim();
        if (bank_name !== undefined) updatePayload.bank_name = bank_name.trim();
        if (default_t0_charge_percent !== undefined) updatePayload.default_t0_charge_percent = Math.max(0, parseFloat(default_t0_charge_percent) || 0);
        if (default_t1_charge_percent !== undefined) updatePayload.default_t1_charge_percent = Math.max(0, parseFloat(default_t1_charge_percent) || 0);
        if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
        await supabase.from('pos_machines').update(updatePayload).eq('id', id);
      } catch (e) {
        console.warn('Supabase pos_machines update warning:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'POS Machine updated successfully'
    });
  } catch (err) {
    console.error('Update POS machine error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update POS machine' });
  }
});

// DELETE /api/pos/machines/:id - Delete POS Machine (Admin only)
router.delete('/machines/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const { id } = req.params;
    db.pos_machines = db.pos_machines.filter(m => m.id !== id);

    if (supabase) {
      try {
        await supabase.from('pos_machines').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase pos_machines delete warning:', e.message);
      }
    }

    return res.status(200).json({ success: true, message: 'POS machine deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete POS machine' });
  }
});

// ============================================================================
// 2. POS PAYMENT REQUESTS (User Submission & Admin Approval)
// ============================================================================

// POST /api/pos/requests - Submit POS Swipe Request
router.post('/requests', verifyToken, async (req, res) => {
  try {
    initPosStore();
    const userId = req.user.id;
    const {
      pos_machine_id, settlement_type, amount, rrn_number,
      approval_code, card_last4, card_network, slip_url
    } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount greater than ₹0' });
    }

    const cleanSettlement = (settlement_type || 'T0').toUpperCase();
    if (cleanSettlement !== 'T0' && cleanSettlement !== 'T1') {
      return res.status(400).json({ success: false, message: 'settlement_type must be T0 or T1' });
    }

    const cleanRrn = (rrn_number || '').trim();
    if (!cleanRrn || !/^\d{12}$/.test(cleanRrn)) {
      return res.status(400).json({ success: false, message: 'RRN number must be exactly 12 digits (12-digit numeric code from EDC slip)' });
    }

    // Find User
    let user = (db.users || []).find(u => u.id === userId);
    if (!user && supabase) {
      const { data } = await supabase.from('users_profiles').select('*').eq('id', userId).maybeSingle();
      if (data) user = data;
    }

    const isAdmin = req.user.role === 'admin';

    // Validate POS Machine assignment (retailer/subuser only)
    if (!isAdmin) {
      const assignedIds = Array.isArray(user?.assigned_pos_machine_ids) ? user.assigned_pos_machine_ids : [];
      if (!pos_machine_id || !assignedIds.includes(pos_machine_id)) {
        return res.status(403).json({
          success: false,
          message: 'This POS machine is not assigned to your account. Please select an assigned machine or contact admin.'
        });
      }

      // Validate Settlement Mode permission
      const allowedMode = user?.pos_allowed_settlement_types || 'BOTH';
      if (allowedMode === 'NONE') {
        return res.status(403).json({ success: false, message: 'POS swipe services are currently disabled for your account.' });
      }
      if (allowedMode === 'T0_ONLY' && cleanSettlement !== 'T0') {
        return res.status(403).json({ success: false, message: 'Only instant T+0 settlement is permitted for your account.' });
      }
      if (allowedMode === 'T1_ONLY' && cleanSettlement !== 'T1') {
        return res.status(403).json({ success: false, message: 'Only overnight T+1 settlement is permitted for your account.' });
      }
    }

    // Find Machine
    const machine = (db.pos_machines || []).find(m => m.id === pos_machine_id) || db.pos_machines[0] || DEFAULT_POS_MACHINES[0];

    // Determine Charge %
    let chargePct = 0;
    if (cleanSettlement === 'T0') {
      chargePct = user?.pos_t0_charge_percent !== undefined && user?.pos_t0_charge_percent !== null
        ? Number(user.pos_t0_charge_percent)
        : Number(machine.default_t0_charge_percent || 1.20);
    } else {
      chargePct = user?.pos_t1_charge_percent !== undefined && user?.pos_t1_charge_percent !== null
        ? Number(user.pos_t1_charge_percent)
        : Number(machine.default_t1_charge_percent || 0.80);
    }
    if (isNaN(chargePct)) chargePct = 0;

    const chargeAmount = parseFloat(((numAmount * chargePct) / 100).toFixed(2));
    const netAmount = parseFloat((numAmount - chargeAmount).toFixed(2));

    // Admin gets 100% of charge! DS and MS get ₹0!
    const adminCommission = chargeAmount;
    const dsCommission = 0;
    const msCommission = 0;

    const newRequest = {
      id: `pos_req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      user_name: user?.name || 'Retailer',
      firm_name: user?.firm_name || '',
      user_mobile: user?.mobile_number || '',
      pos_machine_id: machine.id,
      machine_name: machine.machine_name,
      settlement_type: cleanSettlement,
      amount: numAmount,
      charge_percent: chargePct,
      charge_amount: chargeAmount,
      net_amount: netAmount,
      rrn_number: rrn_number.trim(),
      approval_code: (approval_code || '').trim(),
      card_last4: (card_last4 || '').trim().slice(-4),
      card_network: (card_network || 'Card').trim(),
      slip_url: (slip_url || '').trim(),
      status: 'pending',
      rejection_reason: null,
      processed_by: null,
      processed_at: null,
      settled_at: null,
      admin_commission: adminCommission,
      distributor_commission: dsCommission,
      super_distributor_commission: msCommission,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.pos_payment_requests.unshift(newRequest);
    savePersistentPosData();

    if (supabase) {
      try {
        const { error } = await supabase.from('pos_payment_requests').insert([newRequest]);
        if (error) {
          console.warn('⚠️ Supabase pos_payment_requests insert warning (RLS or column):', error.message);
        } else {
          console.log('✅ Supabase pos_payment_requests row saved to DB:', newRequest.id);
        }
      } catch (e) {
        console.warn('Supabase pos_payment_requests insert warning:', e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `POS ${cleanSettlement} request submitted successfully! Pending admin approval.`,
      request: newRequest
    });
  } catch (err) {
    console.error('Submit POS request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit POS request' });
  }
});

// GET /api/pos/requests - List POS Requests
router.get('/requests', verifyToken, async (req, res) => {
  try {
    initPosStore();
    const isAdmin = req.user.role === 'admin';
    const isDist = req.user.role === 'distributor';
    const isSuperDist = req.user.role === 'super_distributor';

    let requests = [];

    if (supabase) {
      try {
        let query = supabase
          .from('pos_payment_requests')
          .select(`
            *,
            users_profiles (
              name,
              firm_name,
              mobile_number,
              distributor_id,
              super_distributor_id
            )
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          if (isDist) {
            query = query.eq('users_profiles.distributor_id', req.user.id);
          } else if (isSuperDist) {
            query = query.eq('users_profiles.super_distributor_id', req.user.id);
          } else {
            query = query.eq('user_id', req.user.id);
          }
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          const supaList = data.map(r => ({
            ...r,
            user_name: r.users_profiles?.name || r.user_name || 'Retailer',
            firm_name: r.users_profiles?.firm_name || r.firm_name || '',
            user_mobile: r.users_profiles?.mobile_number || r.user_mobile || ''
          }));
          const supaIds = new Set(supaList.map(r => r.id));
          const localOnly = (db.pos_payment_requests || []).filter(r => !supaIds.has(r.id));
          requests = [...supaList, ...localOnly];
          
          // Keep local persistent file updated with the full merged dataset
          db.pos_payment_requests = requests;
          savePersistentPosData();
        }
      } catch (e) {
        console.warn('Supabase pos_payment_requests fetch warning:', e.message);
      }
    }

    if (requests.length === 0) {
      requests = db.pos_payment_requests || [];
      if (!isAdmin) {
        if (isDist) {
          const myUsers = (db.users || []).filter(u => u.distributor_id === req.user.id).map(u => u.id);
          requests = requests.filter(r => r.user_id === req.user.id || myUsers.includes(r.user_id));
        } else if (isSuperDist) {
          const myUsers = (db.users || []).filter(u => u.super_distributor_id === req.user.id).map(u => u.id);
          requests = requests.filter(r => r.user_id === req.user.id || myUsers.includes(r.user_id));
        } else {
          requests = requests.filter(r => r.user_id === req.user.id);
        }
      }
    }

    return res.status(200).json({ success: true, requests });
  } catch (err) {
    console.error('Fetch POS requests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch POS requests' });
  }
});

// POST /api/pos/requests/:id/approve - Approve POS Request (Admin only)
router.post('/requests/:id/approve', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const { id } = req.params;

    // Find request
    let reqItem = (db.pos_payment_requests || []).find(r => r.id === id);
    if (!reqItem && supabase) {
      const { data } = await supabase.from('pos_payment_requests').select('*').eq('id', id).maybeSingle();
      if (data) reqItem = data;
    }

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'POS request not found' });
    }

    if (reqItem.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${reqItem.status}` });
    }

    // Find target user
    let user = (db.users || []).find(u => u.id === reqItem.user_id);
    if (!user && supabase) {
      const { data } = await supabase.from('users_profiles').select('*').eq('id', reqItem.user_id).maybeSingle();
      if (data) user = data;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found for this request' });
    }

    const netAmount = parseFloat(reqItem.net_amount || 0);
    const isT0 = reqItem.settlement_type === 'T0';

    let openBal = 0;
    let closeBal = 0;

    if (isT0) {
      // CREDIT DIRECTLY TO SPENDABLE POS T+0 WALLET
      openBal = parseFloat(user.pos_balance || 0);
      closeBal = parseFloat((openBal + netAmount).toFixed(2));
      user.pos_balance = closeBal;
    } else {
      // CREDIT TO INFORMATIONAL UPCOMING NEXT-DAY T+1 SETTLEMENT BALANCE
      openBal = parseFloat(user.pos_t1_pending_balance || 0);
      closeBal = parseFloat((openBal + netAmount).toFixed(2));
      user.pos_t1_pending_balance = closeBal;
    }

    // Update in-memory user
    const memUserIdx = (db.users || []).findIndex(u => u.id === user.id);
    if (memUserIdx !== -1) {
      if (isT0) db.users[memUserIdx].pos_balance = closeBal;
      else db.users[memUserIdx].pos_t1_pending_balance = closeBal;
    }

    // Write POS Wallet Ledger Entry
    const ledgerEntry = {
      id: `pos_led_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      user_name: user.name,
      firm_name: user.firm_name,
      user_mobile: user.mobile_number,
      type: 'CREDIT',
      wallet_type: isT0 ? 'T0' : 'T1',
      category: 'POS_SWIPE_LOAD',
      amount: netAmount,
      charge_amount: parseFloat(reqItem.charge_amount || 0),
      opening_balance: openBal,
      closing_balance: closeBal,
      reference_id: reqItem.id,
      description: isT0 
        ? `POS T+0 Instant Swipe Load (RRN: ${reqItem.rrn_number})` 
        : `POS T+1 Swipe Collection (Available Tomorrow, RRN: ${reqItem.rrn_number})`,
      created_at: new Date().toISOString()
    };
    db.pos_wallet_ledger.unshift(ledgerEntry);

    // Update Request Record
    reqItem.status = 'approved';
    reqItem.processed_by = req.user.id;
    reqItem.processed_at = new Date().toISOString();
    reqItem.updated_at = new Date().toISOString();

    const memReqIdx = (db.pos_payment_requests || []).findIndex(r => r.id === id);
    if (memReqIdx !== -1) db.pos_payment_requests[memReqIdx] = { ...reqItem };
    savePersistentPosData();

    // Supabase Updates
    if (supabase) {
      try {
        const updateObj = isT0 ? { pos_balance: closeBal } : { pos_t1_pending_balance: closeBal };
        await supabase.from('users_profiles').update(updateObj).eq('id', user.id);
        await supabase.from('pos_payment_requests').update({
          status: 'approved',
          processed_by: req.user.id,
          processed_at: reqItem.processed_at,
          updated_at: reqItem.updated_at
        }).eq('id', id);
        await supabase.from('pos_wallet_ledger').insert([ledgerEntry]);
      } catch (e) {
        console.warn('Supabase approve POS request error:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: isT0
        ? `POS T+0 request approved! ₹${netAmount.toFixed(2)} credited to spendable POS Wallet.`
        : `POS T+1 request approved! ₹${netAmount.toFixed(2)} recorded in Next-Day Settlement balance.`,
      request: reqItem,
      updated_pos_balance: user.pos_balance,
      updated_pos_t1_pending_balance: user.pos_t1_pending_balance
    });
  } catch (err) {
    console.error('Approve POS request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve POS request' });
  }
});

// POST /api/pos/requests/:id/reject - Reject POS Request (Admin only)
router.post('/requests/:id/reject', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const { id } = req.params;
    const { rejection_reason } = req.body;

    let reqItem = (db.pos_payment_requests || []).find(r => r.id === id);
    if (!reqItem && supabase) {
      const { data } = await supabase.from('pos_payment_requests').select('*').eq('id', id).maybeSingle();
      if (data) reqItem = data;
    }

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'POS request not found' });
    }

    if (reqItem.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${reqItem.status}` });
    }

    reqItem.status = 'rejected';
    reqItem.rejection_reason = (rejection_reason || 'Rejected by administrator').trim();
    reqItem.processed_by = req.user.id;
    reqItem.processed_at = new Date().toISOString();
    reqItem.updated_at = new Date().toISOString();

    const memIdx = (db.pos_payment_requests || []).findIndex(r => r.id === id);
    if (memIdx !== -1) db.pos_payment_requests[memIdx] = { ...reqItem };
    savePersistentPosData();

    if (supabase) {
      try {
        await supabase.from('pos_payment_requests').update({
          status: 'rejected',
          rejection_reason: reqItem.rejection_reason,
          processed_by: req.user.id,
          processed_at: reqItem.processed_at,
          updated_at: reqItem.updated_at
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase reject POS request warning:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'POS request rejected successfully',
      request: reqItem
    });
  } catch (err) {
    console.error('Reject POS request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject POS request' });
  }
});

// =============================================================================
// AUTOMATED T+1 OVERNIGHT SETTLEMENT ENGINE (Daily 11:00 AM IST Cut-Off)
// =============================================================================

// Store last auto-settlement IST date and stats
let lastAutoSettledIstDate = null;
let lastSettlementStats = null;

// Helper: Calculate today's start in IST (Asia/Kolkata)
export const getTodayIstStart = () => {
  const now = new Date();
  const istDateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  return new Date(`${istDateString}T00:00:00+05:30`);
};

export const getNowIstDateString = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

export const getNowIstHourMinute = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  }).formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
};

// Core settlement execution function
export const executeT1OvernightSettlement = async (isManual = false) => {
  initPosStore();

  // Cut-off rule: Requests created BEFORE today's 00:00:00 IST (Yesterday night 12:00 AM midnight cut-off)
  const todayStartIst = getTodayIstStart();

  // Ensure requests are loaded
  if (supabase && (!db.pos_payment_requests || db.pos_payment_requests.length === 0)) {
    try {
      const { data } = await supabase.from('pos_payment_requests').select('*');
      if (data && data.length > 0) db.pos_payment_requests = data;
    } catch (e) {
      console.warn('Supabase pos_payment_requests fetch error:', e.message);
    }
  }

  const allRequests = db.pos_payment_requests || [];

  // Filter eligible T+1 requests:
  // 1. settlement_type === 'T1'
  // 2. status === 'approved'
  // 3. created_at < todayStartIst (Created before midnight cut-off)
  // 4. !settled_at (Not already settled)
  const eligibleRequests = allRequests.filter(r => {
    if ((r.settlement_type || '').toUpperCase() !== 'T1') return false;
    if (r.status !== 'approved') return false;
    if (r.settled_at) return false;
    const reqTime = new Date(r.created_at || r.processed_at || 0);
    return reqTime < todayStartIst;
  });

  if (eligibleRequests.length === 0) {
    console.log(`ℹ️ [POS T+1 Settlement] No pending approved T+1 requests prior to midnight cut-off (${todayStartIst.toISOString()})`);
    return {
      success: true,
      message: `No approved T+1 requests prior to yesterday midnight cut-off (${todayStartIst.toLocaleDateString('en-IN')}) waiting for settlement.`,
      settledUsersCount: 0,
      totalSettledAmount: 0,
      settledRequestsCount: 0,
      cut_off_time: todayStartIst.toISOString()
    };
  }

  // Group by user_id
  const userRequestsMap = new Map();
  eligibleRequests.forEach(r => {
    const uid = r.user_id;
    if (!userRequestsMap.has(uid)) userRequestsMap.set(uid, []);
    userRequestsMap.get(uid).push(r);
  });

  // Load all users
  let usersList = db.users || [];
  if (supabase) {
    const { data: supaUsers } = await supabase.from('users_profiles').select('*');
    if (supaUsers && supaUsers.length > 0) usersList = supaUsers;
  }
  const userMap = new Map();
  usersList.forEach(u => userMap.set(u.id, u));

  let settledUsersCount = 0;
  let totalSettledAmount = 0;
  const settlementTimestamp = new Date().toISOString();
  const settledReqIds = [];

  for (const [uid, userReqs] of userRequestsMap.entries()) {
    const user = userMap.get(uid) || (db.users || []).find(u => u.id === uid);
    if (!user) continue;

    const userSum = userReqs.reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
    if (userSum <= 0) continue;

    const oldPosBal = parseFloat(user.pos_balance || 0);
    const newPosBal = parseFloat((oldPosBal + userSum).toFixed(2));
    const oldT1Bal = parseFloat(user.pos_t1_pending_balance || 0);
    const newT1Bal = Math.max(0, parseFloat((oldT1Bal - userSum).toFixed(2)));

    user.pos_balance = newPosBal;
    user.pos_t1_pending_balance = newT1Bal;

    // Update in-memory user
    const memIdx = (db.users || []).findIndex(x => x.id === uid);
    if (memIdx !== -1) {
      db.users[memIdx].pos_balance = newPosBal;
      db.users[memIdx].pos_t1_pending_balance = newT1Bal;
    }

    // Ledger Entry
    const ledgerEntry = {
      id: `pos_led_set_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: user.id,
      user_name: user.name,
      firm_name: user.firm_name,
      user_mobile: user.mobile_number,
      type: 'CREDIT',
      wallet_type: 'T0',
      category: 'T1_SETTLEMENT_CREDIT',
      amount: userSum,
      charge_amount: 0,
      opening_balance: oldPosBal,
      closing_balance: newPosBal,
      reference_id: `SETTLE_T1_${Date.now()}`,
      description: isManual 
        ? `Manual T+1 Overnight Settle (${userReqs.length} slips, Midnight Cut-off) -> Credited to Spendable POS Wallet`
        : `Automated 11:00 AM T+1 Overnight Settle (${userReqs.length} slips, Midnight Cut-off) -> Credited to Spendable POS Wallet`,
      created_at: settlementTimestamp
    };
    db.pos_wallet_ledger.unshift(ledgerEntry);

    // Mark requests settled
    userReqs.forEach(r => {
      r.settled_at = settlementTimestamp;
      r.updated_at = settlementTimestamp;
      settledReqIds.push(r.id);
      const memReqIdx = (db.pos_payment_requests || []).findIndex(x => x.id === r.id);
      if (memReqIdx !== -1) db.pos_payment_requests[memReqIdx] = { ...r };
    });

    if (supabase) {
      try {
        await supabase.from('users_profiles').update({
          pos_balance: newPosBal,
          pos_t1_pending_balance: newT1Bal,
          updated_at: settlementTimestamp
        }).eq('id', user.id);

        await supabase.from('pos_wallet_ledger').insert([ledgerEntry]);
      } catch (e) {
        console.warn('Supabase user profile & ledger update warning:', e.message);
      }
    }

    settledUsersCount++;
    totalSettledAmount += userSum;
  }

  // Update settled_at for all settled requests in Supabase
  if (supabase && settledReqIds.length > 0) {
    try {
      await supabase.from('pos_payment_requests').update({
        settled_at: settlementTimestamp,
        updated_at: settlementTimestamp
      }).in('id', settledReqIds);
    } catch (e) {
      console.warn('Supabase mark settled_at warning:', e.message);
    }
  }

  savePersistentPosData();

  console.log(`✅ [POS T+1 Settlement Complete]: Settled ₹${totalSettledAmount.toFixed(2)} for ${settledUsersCount} users (${eligibleRequests.length} slips).`);

  return {
    success: true,
    message: `Successfully settled ₹${totalSettledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} for ${settledUsersCount} users (${eligibleRequests.length} slips from yesterday night cut-off) into spendable POS Wallet!`,
    settledUsersCount,
    totalSettledAmount,
    settledRequestsCount: eligibleRequests.length,
    cut_off_time: todayStartIst.toISOString()
  };
};

// Background Auto-Settlement Scheduler (Checks every 30s)
const checkAndRunAutoSettlement = async () => {
  try {
    const todayIst = getNowIstDateString();
    const { hour, minute } = getNowIstHourMinute();

    // Trigger condition: IST time is >= 11:00 AM AND settlement has not run yet for today's IST date
    if (hour >= 11 && lastAutoSettledIstDate !== todayIst) {
      console.log(`⏰ [POS T+1 Auto-Settlement] Triggering daily 11:00 AM settlement for IST date ${todayIst} at ${hour}:${String(minute).padStart(2, '0')} IST...`);
      lastAutoSettledIstDate = todayIst;
      const stats = await executeT1OvernightSettlement(false);
      lastSettlementStats = {
        ...stats,
        settled_at: new Date().toISOString(),
        ist_date: todayIst
      };
    }
  } catch (err) {
    console.error('❌ [POS T+1 Auto-Settlement Interval Error]:', err.message);
  }
};

// Start background scheduler interval (every 30 seconds)
setInterval(checkAndRunAutoSettlement, 30 * 1000);
// Also run check 5 seconds after server startup (in case restarted after 11 AM)
setTimeout(checkAndRunAutoSettlement, 5000);

// GET /api/pos/settlement-status - Check next/last settlement status (Admin Only)
router.get('/settlement-status', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    initPosStore();
    const todayStartIst = getTodayIstStart();
    const allRequests = db.pos_payment_requests || [];
    
    // Count overnight requests waiting for settlement
    const pendingOvernightReqs = allRequests.filter(r => {
      if ((r.settlement_type || '').toUpperCase() !== 'T1') return false;
      if (r.status !== 'approved') return false;
      if (r.settled_at) return false;
      return new Date(r.created_at || 0) < todayStartIst;
    });

    const pendingOvernightAmount = pendingOvernightReqs.reduce((sum, r) => sum + parseFloat(r.net_amount || 0), 0);
    const { hour } = getNowIstHourMinute();
    const nextSettlementTime = hour < 11 ? 'Today at 11:00 AM IST' : 'Tomorrow at 11:00 AM IST';

    return res.status(200).json({
      success: true,
      last_settled_date: lastAutoSettledIstDate,
      last_stats: lastSettlementStats,
      next_settlement: nextSettlementTime,
      pending_overnight_slips: pendingOvernightReqs.length,
      pending_overnight_amount: pendingOvernightAmount,
      cut_off_time: todayStartIst.toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settlement status' });
  }
});

// POST /api/pos/settle-t1 - Settle All Next-Day T+1 Balances into Usable POS T+0 Wallets (Admin 1-Click / Force)
router.post('/settle-t1', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const result = await executeT1OvernightSettlement(true);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Settle T1 error:', err);
    return res.status(500).json({ success: false, message: 'Failed to settle T+1 balances' });
  }
});

// ============================================================================
// 3. POS ACCOUNT STATEMENT / PASSBOOK
// ============================================================================

// GET /api/pos/statement - POS Financial Statement
router.get('/statement', verifyToken, async (req, res) => {
  try {
    initPosStore();
    const isAdmin = req.user.role === 'admin';
    const isDist = req.user.role === 'distributor';
    const isSuperDist = req.user.role === 'super_distributor';

    const { target_user_id, wallet_type, category, start_date, end_date } = req.query;

    let entries = [];
    if (supabase) {
      try {
        let query = supabase
          .from('pos_wallet_ledger')
          .select('*')
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          query = query.eq('user_id', req.user.id);
        } else if (target_user_id) {
          query = query.eq('user_id', target_user_id);
        }

        if (wallet_type && wallet_type !== 'ALL') {
          query = query.eq('wallet_type', wallet_type);
        }

        if (category && category !== 'ALL') {
          query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) entries = data;
      } catch (e) {
        console.warn('Supabase pos_wallet_ledger fetch warning:', e.message);
      }
    }

    if (entries.length === 0) {
      entries = db.pos_wallet_ledger || [];
      if (!isAdmin) {
        entries = entries.filter(e => e.user_id === req.user.id);
      } else if (target_user_id) {
        entries = entries.filter(e => e.user_id === target_user_id);
      }
      if (wallet_type && wallet_type !== 'ALL') {
        entries = entries.filter(e => e.wallet_type === wallet_type);
      }
      if (category && category !== 'ALL') {
        entries = entries.filter(e => e.category === category);
      }
    }

    // Target user profile for live header cards
    const userToFetch = target_user_id || req.user.id;
    let targetProfile = (db.users || []).find(u => u.id === userToFetch);
    if (!targetProfile && supabase) {
      const { data } = await supabase.from('users_profiles').select('id, name, firm_name, mobile_number, wallet_balance, pos_balance, pos_t1_pending_balance').eq('id', userToFetch).maybeSingle();
      if (data) targetProfile = data;
    }

    return res.status(200).json({
      success: true,
      statement: entries,
      balances: {
        main_wallet: parseFloat(targetProfile?.wallet_balance || 0),
        pos_balance: parseFloat(targetProfile?.pos_balance || 0),
        pos_t1_pending_balance: parseFloat(targetProfile?.pos_t1_pending_balance || 0)
      }
    });
  } catch (err) {
    console.error('Fetch POS statement error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch POS statement' });
  }
});

export default router;
