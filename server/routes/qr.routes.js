import express from 'express';
import { db } from '../db/store.js';
import { supabase } from '../db/supabase.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// Smart In-Memory State Cache for QR Payment Requests (Zero Egress Polling)
let isQrCacheInitialized = false;
let lastQrDbSyncTime = 0;
const QR_CACHE_TTL = 5 * 60 * 1000; // 5-minute periodic background refresh

// Helper: Format ISO date string into IST (Asia/Kolkata) "YYYY-MM-DD"
const toIstDateString = (dateVal) => {
  if (!dateVal) return new Date().toISOString().substring(0, 10);
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).substring(0, 10);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  } catch {
    return String(dateVal).substring(0, 10);
  }
};

const formatIstTime = (isoString) => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(d);
  } catch {
    return '';
  }
};

const formatRelativeDate = (dateStr) => {
  const today = toIstDateString(new Date());
  const yesterday = toIstDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  try {
    const d = new Date(dateStr + 'T12:00:00Z');
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(d);
  } catch {
    return dateStr;
  }
};

// Helper to calculate QR status
const computeQrStatus = (qr) => {
  if (!qr.is_active) return 'Inactive';
  return 'Active';
};

// -----------------------------------------------------------------------------
// GET /api/qr/master/active-history (Returns QR Masters with last 5 days active sessions)
// -----------------------------------------------------------------------------
router.get('/master/active-history', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    // 1. Ensure qr_masters is loaded
    if (supabase && (!db.qr_masters || db.qr_masters.length === 0)) {
      const { data: qData } = await supabase.from('qr_masters').select('id, name, upi_id, is_active, is_selected, created_at, updated_at').order('created_at', { ascending: false });
      if (qData) db.qr_masters = qData;
    }

    const masters = db.qr_masters || [];
    const masterMap = new Map();
    masters.forEach(m => masterMap.set(m.id, m));

    // 2. Scan qr_payment_requests to detect active usage sessions per QR per day over the last 5 days
    const reqList = db.qr_payment_requests || [];
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const sessionMap = new Map();

    reqList.forEach(r => {
      if (!r.created_at) return;
      const d = new Date(r.created_at);
      if (d < fiveDaysAgo) return;

      const istDate = toIstDateString(r.created_at);
      const qId = r.qr_master_id;
      if (!qId) return;

      const key = `${qId}_${istDate}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          qr_master_id: qId,
          date: istDate,
          first_seen: r.created_at,
          last_seen: r.created_at,
          count: 0
        });
      }
      const entry = sessionMap.get(key);
      entry.count += 1;
      if (new Date(r.created_at) < new Date(entry.first_seen)) entry.first_seen = r.created_at;
      if (new Date(r.created_at) > new Date(entry.last_seen)) entry.last_seen = r.created_at;
    });

    const historyItems = [];

    // Add session history items (each active QR on each of the last 5 days with time)
    Array.from(sessionMap.values()).forEach(s => {
      const m = masterMap.get(s.qr_master_id);
      if (!m) return;
      const isLive = (m.is_selected || m.is_active) && s.date === toIstDateString(new Date());

      historyItems.push({
        uniqueKey: `${s.qr_master_id}_${s.date}`,
        qr_master_id: s.qr_master_id,
        qr_name: m.name,
        upi_id: m.upi_id,
        date: s.date,
        relative_day: formatRelativeDate(s.date),
        formatted_time: `${formatRelativeDate(s.date)} • ${formatIstTime(s.last_seen)}`,
        is_current_active: isLive,
        transaction_count: s.count,
        sort_time: new Date(s.last_seen).getTime()
      });
    });

    // Also include any master from qr_masters that has no requests yet or newly activated
    masters.forEach(m => {
      const isLive = m.is_selected || m.is_active;
      const actDate = m.updated_at ? toIstDateString(m.updated_at) : toIstDateString(m.created_at);
      const key = `${m.id}_${actDate}`;

      if (!sessionMap.has(key)) {
        historyItems.push({
          uniqueKey: key,
          qr_master_id: m.id,
          qr_name: m.name,
          upi_id: m.upi_id,
          date: actDate,
          relative_day: formatRelativeDate(actDate),
          formatted_time: `${formatRelativeDate(actDate)} • ${formatIstTime(m.updated_at || m.created_at)}`,
          is_current_active: isLive,
          transaction_count: 0,
          sort_time: new Date(m.updated_at || m.created_at || 0).getTime()
        });
      }
    });

    // Sort newest first
    historyItems.sort((a, b) => b.sort_time - a.sort_time);

    return res.status(200).json({
      success: true,
      history: historyItems
    });
  } catch (err) {
    console.error('Fetch QR Active History Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch QR active history.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/master/list (Direct Supabase Database Query)
// -----------------------------------------------------------------------------
router.get('/master/list', verifyToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('qr_masters').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        db.qr_masters = data;
        db.qr_master = data;
      }
    }

    const list = (db.qr_masters || []).map(qr => ({
      ...qr,
      status: computeQrStatus(qr)
    }));

    return res.status(200).json({
      success: true,
      count: list.length,
      qr_masters: list
    });
  } catch (error) {
    console.error('Fetch QR Master List Error:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving QR Master list.' });
  }
});

// Alias GET /api/qr/list for backwards compatibility
router.get('/list', verifyToken, (req, res) => {
  const list = (db.qr_masters || []).map(qr => ({
    ...qr,
    status: computeQrStatus(qr)
  }));
  return res.status(200).json({ success: true, count: list.length, qr_masters: list });
});

// -----------------------------------------------------------------------------
// POST /api/qr/master/create (Admin Only - Entry Page)
// -----------------------------------------------------------------------------
router.post('/master/create', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { name, mobile_number, upi_id, default_charge_percent, qr_image_url, bank_name, account_holder_name } = req.body;

    if (!name || !mobile_number || !upi_id) {
      return res.status(400).json({ success: false, message: 'QR Name, Mobile Number, and UPI ID are required.' });
    }

    const newId = 'qrm_' + Date.now();
    const finalQrUrl = qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi_id)}%26pn=${encodeURIComponent(name)}`;

    const newQr = {
      id: newId,
      name,
      mobile_number,
      upi_id,
      default_charge_percent: isNaN(parseFloat(default_charge_percent)) ? 0 : parseFloat(default_charge_percent),
      qr_image_url: finalQrUrl,
      is_active: true,
      is_selected: (db.qr_masters || []).length === 0,
      bank_name: bank_name || 'HDFC Bank',
      account_holder_name: account_holder_name || name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      const { error } = await supabase.from('qr_masters').insert([newQr]);
      if (error) console.error('Supabase QR Insert Warning:', error);
    }

    db.qr_masters.unshift(newQr);

    return res.status(201).json({
      success: true,
      message: `New Master QR "${name}" created successfully!`,
      qr_master: newQr
    });
  } catch (error) {
    console.error('Create QR Master Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating QR Master.' });
  }
});

// -----------------------------------------------------------------------------
// PUT /api/qr/master/:id (Admin Only - Edit Entry)
// -----------------------------------------------------------------------------
router.put('/master/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    const { name, mobile_number, upi_id, default_charge_percent, qr_image_url } = req.body;
    if (name) qr.name = name;
    if (mobile_number) qr.mobile_number = mobile_number;
    if (upi_id) {
      qr.upi_id = upi_id;
      if (!qr_image_url) {
        qr.qr_image_url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upi_id)}%26pn=${encodeURIComponent(qr.name)}`;
      }
    }
    if (default_charge_percent !== undefined) qr.default_charge_percent = parseFloat(default_charge_percent);
    if (qr_image_url) qr.qr_image_url = qr_image_url;
    qr.updated_at = new Date().toISOString();

    if (supabase) {
      const { error } = await supabase.from('qr_masters').update({
        name: qr.name,
        mobile_number: qr.mobile_number,
        upi_id: qr.upi_id,
        default_charge_percent: qr.default_charge_percent,
        qr_image_url: qr.qr_image_url,
        updated_at: qr.updated_at
      }).eq('id', qr.id);
      if (error) console.error('Supabase QR Edit Error:', error);
    }

    return res.status(200).json({
      success: true,
      message: `QR Master "${qr.name}" updated successfully.`,
      qr_master: qr
    });
  } catch (error) {
    console.error('Edit QR Master Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update QR Master.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/qr/master/:id/toggle (Admin Only - On/Off Toggle Switch)
// -----------------------------------------------------------------------------
router.patch('/master/:id/toggle', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!qr) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    qr.is_active = !qr.is_active;
    qr.updated_at = new Date().toISOString();

    if (supabase) {
      const { error } = await supabase.from('qr_masters').update({
        is_active: qr.is_active,
        updated_at: qr.updated_at
      }).eq('id', qr.id);
      if (error) console.error('Supabase QR Toggle Error:', error);
    }

    return res.status(200).json({
      success: true,
      message: `QR "${qr.name}" is now ${qr.is_active ? 'ACTIVE (ON)' : 'INACTIVE (OFF)'}.`,
      qr_master: qr
    });
  } catch (error) {
    console.error('Toggle QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle QR status.' });
  }
});

// Alias for patch toggle active
router.patch('/toggle-active/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  const qrId = req.params.id;
  const qr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));
  if (!qr) return res.status(404).json({ success: false, message: 'QR not found.' });
  qr.is_active = !qr.is_active;
  qr.updated_at = new Date().toISOString();
  if (supabase) {
    await supabase.from('qr_masters').update({ is_active: qr.is_active, updated_at: qr.updated_at }).eq('id', qr.id);
  }
  return res.status(200).json({ success: true, message: `QR status toggled to ${qr.is_active ? 'ON' : 'OFF'}`, qr_master: qr });
});

// -----------------------------------------------------------------------------
// DELETE /api/qr/master/:id (Admin Only)
// -----------------------------------------------------------------------------
router.delete('/master/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const targetQr = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (supabase) {
      try {
        // 1. Unlink foreign key references in qr_payment_requests first
        await supabase.from('qr_payment_requests').update({ qr_master_id: null }).eq('qr_master_id', qrId);

        // 2. Delete QR master entry from Supabase PostgreSQL database
        const { error: sbErr } = await supabase.from('qr_masters').delete().eq('id', qrId);
        if (sbErr) {
          console.error('Supabase QR Delete Error:', sbErr);
          return res.status(500).json({ success: false, message: 'Failed to delete QR from database: ' + sbErr.message });
        }
      } catch (err) {
        console.error('Supabase QR Delete Catch Error:', err);
        return res.status(500).json({ success: false, message: 'Database error deleting QR: ' + err.message });
      }
    }

    // Clean in-memory state
    db.qr_masters = db.qr_masters.filter(q => q.id !== qrId && String(q.id) !== String(qrId));
    db.qr_master = db.qr_masters;

    if (db.qr_payment_requests) {
      db.qr_payment_requests.forEach(r => {
        if (r.qr_master_id === qrId) r.qr_master_id = null;
      });
    }

    return res.status(200).json({
      success: true,
      message: `QR "${targetQr ? targetQr.name : qrId}" deleted successfully.`
    });
  } catch (error) {
    console.error('Delete QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete QR entry: ' + error.message });
  }
});

router.delete('/:id', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    if (supabase) {
      await supabase.from('qr_payment_requests').update({ qr_master_id: null }).eq('qr_master_id', qrId);
      await supabase.from('qr_masters').delete().eq('id', qrId);
    }
    db.qr_masters = db.qr_masters.filter(q => q.id !== qrId && String(q.id) !== String(qrId));
    db.qr_master = db.qr_masters;
    return res.status(200).json({ success: true, message: `QR deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete QR.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/master/:id/select (Set Active QR for User Panel)
// -----------------------------------------------------------------------------
router.post('/master/:id/select', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const qrId = req.params.id;
    const target = db.qr_masters.find(q => q.id === qrId || String(q.id) === String(qrId));

    if (!target) {
      return res.status(404).json({ success: false, message: 'QR Master entry not found.' });
    }

    db.qr_masters.forEach(q => {
      q.is_selected = (q.id === target.id || String(q.id) === String(target.id));
    });

    target.is_active = true; // Automatically turn ON when selected
    target.updated_at = new Date().toISOString();

    if (supabase) {
      // Unselect all QRs in Supabase
      const { error: unselectErr } = await supabase
        .from('qr_masters')
        .update({ is_selected: false })
        .neq('id', 'dummy_non_existent_id');
      if (unselectErr) console.error('Supabase QR Unselect All Error:', unselectErr);

      // Select target QR and activate in Supabase
      const { error: selectErr } = await supabase
        .from('qr_masters')
        .update({ is_selected: true, is_active: true, updated_at: target.updated_at })
        .eq('id', target.id);
      if (selectErr) console.error('Supabase QR Select Target Error:', selectErr);
    }

    return res.status(200).json({
      success: true,
      message: `QR "${target.name}" is now set as the active User Panel QR!`,
      qr_master: target
    });
  } catch (error) {
    console.error('Select Active QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to set active QR.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/active & /api/qr/active-for-retailer
// Directly queries Supabase PostgreSQL for the Admin Selected & Active QR
// -----------------------------------------------------------------------------
const fetchActiveQrFromDb = async () => {
  let activeQr = null;

  if (supabase) {
    try {
      // 1. Fetch QR explicitly set as is_selected = true and is_active = true
      const { data: selectedData, error: selErr } = await supabase
        .from('qr_masters')
        .select('*')
        .eq('is_selected', true)
        .eq('is_active', true)
        .maybeSingle();

      if (!selErr && selectedData) {
        activeQr = selectedData;
      } else {
        // 2. Fallback: fetch active QR with is_active = true ordered by updated_at
        const { data: activeData, error: actErr } = await supabase
          .from('qr_masters')
          .select('*')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!actErr && activeData && activeData.length > 0) {
          activeQr = activeData[0];
        }
      }
    } catch (err) {
      console.error('Supabase Active QR Fetch Error:', err);
    }
  }

  // Fallback to in-memory store if DB query yielded nothing
  if (!activeQr) {
    activeQr = (db.qr_masters || []).find(q => q.is_selected && q.is_active) ||
      (db.qr_masters || []).find(q => q.is_active) ||
      (db.qr_masters || [])[0] || null;
  }

  return activeQr;
};

router.get('/active', verifyToken, async (req, res) => {
  try {
    const activeQr = await fetchActiveQrFromDb();
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true };
    }

    return res.status(200).json({
      success: true,
      qr_master: activeQr,
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Get Active QR Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get active QR.' });
  }
});

router.get('/active-for-retailer', verifyToken, async (req, res) => {
  try {
    const activeQr = await fetchActiveQrFromDb();
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true };
    }
    return res.status(200).json({ success: true, qr_master: activeQr, settings: db.system_settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active QR' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/settings (Fetch User QR Visibility & Request System Toggles)
// -----------------------------------------------------------------------------
router.get('/settings', verifyToken, async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = {
        user_qr_visible: true,
        qr_request_section_enabled: true,
        live_bill_pay_enabled: true,
        instant_payout_enabled: true,
        cc_bill_pay_enabled: true,
        min_wallet_balance: 200
      };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'qr_controls')
          .maybeSingle();
        if (!error && data) {
          db.system_settings.user_qr_visible = data.user_qr_visible !== false;
          db.system_settings.qr_request_section_enabled = data.qr_request_section_enabled !== false;
          if (data.live_bill_pay_enabled !== undefined) {
            db.system_settings.live_bill_pay_enabled = data.live_bill_pay_enabled !== false;
          }
          if (data.instant_payout_enabled !== undefined) {
            db.system_settings.instant_payout_enabled = data.instant_payout_enabled !== false;
          }
          if (data.cc_bill_pay_enabled !== undefined) {
            db.system_settings.cc_bill_pay_enabled = data.cc_bill_pay_enabled !== false;
          }
          if (data.min_wallet_balance !== undefined) {
            db.system_settings.min_wallet_balance = Number(data.min_wallet_balance);
          }
        }
      } catch (sbErr) {
        // Table may not exist yet, use in-memory store
      }
    }

    if (db.system_settings.min_wallet_balance === undefined) {
      db.system_settings.min_wallet_balance = 200;
    }

    return res.status(200).json({
      success: true,
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Fetch QR Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching QR settings.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/settings (Admin Only - Update Toggles)
// -----------------------------------------------------------------------------
router.post('/settings', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (!db.system_settings) {
      db.system_settings = { user_qr_visible: true, qr_request_section_enabled: true, live_bill_pay_enabled: true, instant_payout_enabled: true, cc_bill_pay_enabled: true, min_wallet_balance: 200 };
    }

    const { user_qr_visible, qr_request_section_enabled, live_bill_pay_enabled, instant_payout_enabled, cc_bill_pay_enabled, min_wallet_balance } = req.body;

    if (user_qr_visible !== undefined) db.system_settings.user_qr_visible = Boolean(user_qr_visible);
    if (qr_request_section_enabled !== undefined) db.system_settings.qr_request_section_enabled = Boolean(qr_request_section_enabled);
    if (live_bill_pay_enabled !== undefined) db.system_settings.live_bill_pay_enabled = Boolean(live_bill_pay_enabled);
    if (instant_payout_enabled !== undefined) db.system_settings.instant_payout_enabled = Boolean(instant_payout_enabled);
    if (cc_bill_pay_enabled !== undefined) db.system_settings.cc_bill_pay_enabled = Boolean(cc_bill_pay_enabled);
    if (min_wallet_balance !== undefined) db.system_settings.min_wallet_balance = Math.max(0, parseFloat(min_wallet_balance) || 0);

    if (supabase) {
      try {
        const payload = {
          id: 'qr_controls',
          user_qr_visible: db.system_settings.user_qr_visible,
          qr_request_section_enabled: db.system_settings.qr_request_section_enabled,
          live_bill_pay_enabled: db.system_settings.live_bill_pay_enabled,
          instant_payout_enabled: db.system_settings.instant_payout_enabled,
          cc_bill_pay_enabled: db.system_settings.cc_bill_pay_enabled,
          updated_at: new Date().toISOString()
        };
        if (min_wallet_balance !== undefined) {
          payload.min_wallet_balance = db.system_settings.min_wallet_balance;
        }
        await supabase
          .from('system_settings')
          .upsert([payload]);
      } catch (sbErr) {
        // Table or column in system_settings may not exist in Supabase schema, safe in-memory fallback
      }
    }

    return res.status(200).json({
      success: true,
      message: 'System QR controls updated successfully.',
      settings: db.system_settings
    });
  } catch (error) {
    console.error('Update QR Settings Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update system settings.' });
  }
});

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// POST /api/qr/request/submit (User Payment Submission)
// -----------------------------------------------------------------------------
router.post('/request/submit', verifyToken, async (req, res) => {
  try {
    if (db.system_settings && db.system_settings.qr_request_section_enabled === false) {
      return res.status(403).json({
        success: false,
        message: 'QR Payment Request submissions are currently disabled by Admin.'
      });
    }

    const { amount, utr_number, mobile_number, screenshot_url, qr_master_id } = req.body;
    const user = db.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount.' });
    }

    const cleanUtr = (utr_number || '').toString().trim();
    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({ success: false, message: 'UTR Number must be exactly 12 numeric digits.' });
    }

    // Sanitize mobile number strictly to 10 digits to prevent VARCHAR(10) database error
    const rawMobile = (mobile_number || user.mobile_number || '').toString();
    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10);
    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    // Check for duplicate UTR number in in-memory store (only block if currently active: approved or pending)
    const activeInMem = (db.qr_payment_requests || []).filter(r => r.utr_number === cleanUtr);
    const hasActiveInMem = activeInMem.some(r => r.status === 'approved' || r.status === 'pending');
    if (hasActiveInMem) {
      return res.status(400).json({ success: false, message: 'This 12-digit UTR number has already been submitted or processed.' });
    }
    // For any in-memory rejected/reverted records holding this UTR, archive their UTR so cleanUtr is freed
    activeInMem.forEach((r, idx) => {
      const archivedUtr = ('R' + (Date.now() + idx).toString().slice(-11)).slice(0, 12);
      r.original_utr_number = r.utr_number;
      r.utr_number = archivedUtr;
      r.admin_note = r.admin_note ? `${r.admin_note} | Original UTR: ${cleanUtr}` : `Original UTR: ${cleanUtr}`;
    });

    // Check duplicate UTR in Supabase database & free UTR if previously rejected or reverted
    if (supabase) {
      try {
        const { data: existingRecords } = await supabase
          .from('qr_payment_requests')
          .select('id, status, rejection_reason, admin_note')
          .eq('utr_number', cleanUtr);

        if (existingRecords && existingRecords.length > 0) {
          const hasActive = existingRecords.some(r => r.status === 'approved' || r.status === 'pending');
          if (hasActive) {
            return res.status(400).json({
              success: false,
              message: 'This 12-digit UTR number has already been submitted or processed.'
            });
          }

          // If records exist but all are rejected or reverted, release the UTR in PostgreSQL
          // by archiving their utr_number to a unique 12-char value starting with 'R'
          for (let i = 0; i < existingRecords.length; i++) {
            const oldRec = existingRecords[i];
            const archivedUtr = ('R' + (Date.now() + i).toString().slice(-11)).slice(0, 12);
            await supabase
              .from('qr_payment_requests')
              .update({
                utr_number: archivedUtr,
                admin_note: oldRec.admin_note ? `${oldRec.admin_note} | Original UTR: ${cleanUtr}` : `Original UTR: ${cleanUtr}`
              })
              .eq('id', oldRec.id);

            // Also update local in-memory store
            const memRec = (db.qr_payment_requests || []).find(r => r.id === oldRec.id);
            if (memRec) {
              memRec.original_utr_number = cleanUtr;
              memRec.utr_number = archivedUtr;
              memRec.admin_note = oldRec.admin_note ? `${oldRec.admin_note} | Original UTR: ${cleanUtr}` : `Original UTR: ${cleanUtr}`;
            }
          }
        }
      } catch (checkErr) {
        console.error('Supabase UTR Check Warning:', checkErr);
      }
    }

    const activeQr = db.qr_masters.find(q => q.id === qr_master_id) ||
      db.qr_masters.find(q => q.is_selected && q.is_active) ||
      db.qr_masters[0];

    const userChargePct = user.qr_charge_percent !== undefined ? parseFloat(user.qr_charge_percent) : 0;
    const chargeAmt = Math.round((numericAmount * (userChargePct / 100)) * 100) / 100;
    const netAmt = Math.round((numericAmount - chargeAmt) * 100) / 100;

    // Calculate Hierarchy Markup Commission
    let distUser = user.distributor_id ? db.users.find(u => u.id === user.distributor_id) : null;
    let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id))
      ? db.users.find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id)))
      : null;

    const userRate = userChargePct;
    const distRate = distUser ? (parseFloat(distUser.qr_charge_percent) || 0) : 0;
    const superDistRate = superDistUser ? (parseFloat(superDistUser.qr_charge_percent) || 0) : 0;

    const dsMargin = distUser ? Math.max(0, userRate - distRate) : 0;
    const dsComm = distUser ? Math.round((numericAmount * (dsMargin / 100)) * 100) / 100 : 0;

    const msMargin = superDistUser ? Math.max(0, distRate - superDistRate) : 0;
    const msComm = superDistUser ? Math.round((numericAmount * (msMargin / 100)) * 100) / 100 : 0;
    const adminComm = Math.round(Math.max(0, chargeAmt - (dsComm + msComm)) * 100) / 100;

    // Validate foreign keys to avoid PostgreSQL constraint errors
    let validQrMasterId = activeQr ? activeQr.id : null;
    if (supabase && validQrMasterId) {
      try {
        const { data: qmExists } = await supabase
          .from('qr_masters')
          .select('id')
          .eq('id', validQrMasterId)
          .maybeSingle();
        if (!qmExists) {
          validQrMasterId = null;
        }
      } catch {
        validQrMasterId = null;
      }
    }

    // Ensure user profile exists in Supabase users_profiles for FK integrity
    if (supabase) {
      try {
        const { data: uExists } = await supabase
          .from('users_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!uExists) {
          await supabase.from('users_profiles').upsert([{
            id: user.id,
            name: user.name || 'User',
            firm_name: user.firm_name || '',
            mobile_number: cleanMobile,
            role: user.role || 'retailer',
            wallet_balance: user.wallet_balance || 0,
            created_at: new Date().toISOString()
          }], { onConflict: 'id' }).catch(() => { });
        }
      } catch (uErr) {
        console.error('Supabase users_profiles check warning:', uErr);
      }
    }

    const newRequest = {
      id: 'qr_req_' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      firm_name: user.firm_name,
      qr_master_id: validQrMasterId,
      qr_name: activeQr ? activeQr.name : 'System QR',
      upi_id: activeQr ? activeQr.upi_id : '',
      amount: numericAmount,
      utr_number: cleanUtr,
      mobile_number: cleanMobile,
      screenshot_url: screenshot_url || '',
      status: 'pending',
      charge_percent: userChargePct,
      charge_amount: chargeAmt,
      net_amount: netAmt,
      distributor_commission: dsComm,
      super_distributor_commission: msComm,
      admin_commission: adminComm,
      created_at: new Date().toISOString()
    };

    // If screenshot is base64, upload to Supabase Storage bucket 'qr-receipts'
    if (supabase && screenshot_url && screenshot_url.startsWith('data:image')) {
      try {
        const mimeMatch = screenshot_url.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpg';
        const base64Data = screenshot_url.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${user.id}_${cleanUtr}_${Date.now()}.${ext}`;

        const { data: upData, error: upErr } = await supabase.storage
          .from('qr-receipts')
          .upload(fileName, buffer, { contentType: mimeType, upsert: true });

        if (!upErr && upData) {
          const { data: pubData } = supabase.storage.from('qr-receipts').getPublicUrl(fileName);
          if (pubData?.publicUrl) {
            newRequest.screenshot_url = pubData.publicUrl;
          }
        } else if (upErr) {
          console.warn('[QR Submit] Storage upload warning:', upErr.message);
        }
      } catch (storageErr) {
        console.warn('[QR Submit] Storage upload fallback notice:', storageErr.message);
      }
    }

    // Insert to Supabase first with strict error verification
    if (supabase) {
      try {
        const supabasePayload = {
          id: newRequest.id,
          user_id: newRequest.user_id,
          qr_master_id: newRequest.qr_master_id,
          amount: newRequest.amount,
          utr_number: newRequest.utr_number,
          mobile_number: cleanMobile,
          screenshot_url: newRequest.screenshot_url,
          status: newRequest.status,
          charge_percent: newRequest.charge_percent,
          charge_amount: newRequest.charge_amount,
          net_amount: newRequest.net_amount,
          distributor_commission: newRequest.distributor_commission,
          super_distributor_commission: newRequest.super_distributor_commission,
          admin_commission: newRequest.admin_commission,
          created_at: newRequest.created_at
        };

        const { error: sbErr } = await supabase.from('qr_payment_requests').insert([supabasePayload]);
        if (sbErr) {
          console.error('Supabase Insert QR Request Error:', sbErr);
          if (sbErr.code === '23505') {
            return res.status(400).json({
              success: false,
              message: 'This 12-digit UTR number has already been recorded in the database.'
            });
          }
          return res.status(500).json({
            success: false,
            message: 'Database error: Could not save payment request. ' + (sbErr.message || 'Please try again.')
          });
        }
      } catch (sbErr) {
        console.error('Supabase Insert QR Request Exception:', sbErr);
        return res.status(500).json({
          success: false,
          message: 'Server error saving payment request to database. Please try again.'
        });
      }
    }

    // Only unshift after database persistence is guaranteed
    db.qr_payment_requests.unshift(newRequest);
    lastQrDbSyncTime = Date.now();

    return res.status(201).json({
      success: true,
      message: `Payment request of ₹${numericAmount.toLocaleString('en-IN')} submitted successfully! Admin will verify UTR: ${cleanUtr}.`,
      payment_request: newRequest
    });
  } catch (error) {
    console.error('Submit Payment Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting payment request.' });
  }
});

// Alias /submit-payment-utr for backwards compatibility (delegates to the main logic)
router.post('/submit-payment-utr', verifyToken, async (req, res) => {
  req.url = '/request/submit';
  return router.handle(req, res);
});

// -----------------------------------------------------------------------------
// GET /api/qr/request/list (Fetch Payment Requests - Lightweight & Ultra Fast)
// -----------------------------------------------------------------------------
router.get('/request/list', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const shouldFetchFromDb = !isQrCacheInitialized 
      || (Date.now() - lastQrDbSyncTime > QR_CACHE_TTL) 
      || !db.qr_payment_requests 
      || db.qr_payment_requests.length === 0;

    if (supabase && shouldFetchFromDb) {
      try {
        if (!db.users || db.users.length === 0) {
          const { data: uData } = await supabase.from('users_profiles').select('*');
          if (uData && Array.isArray(uData)) {
            db.users = uData;
          }
        }

        if (!db.qr_masters || db.qr_masters.length === 0) {
          const { data: qData } = await supabase.from('qr_masters').select('id, name, upi_id, is_active, is_selected');
          if (qData && Array.isArray(qData)) {
            db.qr_masters = qData;
          }
        }

        // Lightweight selection: Exclude screenshot_url base64 to prevent 12MB+ payloads and Supabase egress spike
        const { data, error } = await supabase
          .from('qr_payment_requests')
          .select('id, user_id, qr_master_id, amount, utr_number, mobile_number, status, charge_percent, charge_amount, net_amount, distributor_commission, super_distributor_commission, rejection_reason, processed_at, processed_by, created_at, admin_commission, reverted_at, reverted_by, revert_reason, admin_note')
          .order('created_at', { ascending: false });

        if (!error && data) {
          isQrCacheInitialized = true;
          lastQrDbSyncTime = Date.now();
          const fetchedIds = new Set(data.map(r => r.id));
          const localPending = (db.qr_payment_requests || []).filter(r => !fetchedIds.has(r.id) && r.status === 'pending');

          const mappedFromDb = data.map(r => {
            const u = (db.users || []).find(u => u.id === r.user_id);
            const q = (db.qr_masters || []).find(qm => qm.id === r.qr_master_id);
            const isReverted = r.status === 'reverted' || (r.status === 'rejected' && String(r.rejection_reason || '').startsWith('[REVERTED]'));
            const originalUtrMatch = (r.admin_note && r.admin_note.match(/Original UTR:\s*(\d{12})/)?.[1])
              || (r.revert_reason && r.revert_reason.match(/Original UTR:\s*(\d{12})/)?.[1])
              || (r.rejection_reason && r.rejection_reason.match(/Original UTR:\s*(\d{12})/)?.[1]);

            return {
              ...r,
              screenshot_url: null, // Excluded from listing; loaded on-demand via /api/qr/request/:id/screenshot
              has_screenshot: true,
              utr_number: originalUtrMatch || r.utr_number,
              original_utr_number: originalUtrMatch || r.utr_number,
              status: isReverted ? 'reverted' : r.status,
              revert_reason: r.revert_reason || (String(r.rejection_reason || '').startsWith('[REVERTED]') ? r.rejection_reason.replace('[REVERTED]', '').trim() : null),
              user_name: u ? u.name : (r.user_name || 'Retailer User'),
              firm_name: u ? u.firm_name : (r.firm_name || 'N/A'),
              mobile_number: r.mobile_number || (u ? u.mobile_number : ''),
              user_wallet_balance: u ? Number(u.wallet_balance || 0) : 0,
              distributor_id: u ? u.distributor_id : null,
              super_distributor_id: u ? u.super_distributor_id : null,
              qr_name: q ? q.name : (r.qr_name || 'Active QR'),
              upi_id: q ? q.upi_id : (r.upi_id || '')
            };
          });

          db.qr_payment_requests = [...localPending, ...mappedFromDb];
        }
      } catch (err) {
        console.error('Supabase QR Request list fetch error:', err);
      }
    }

    let list = db.qr_payment_requests || [];

    if (user.role === 'admin') {
      // Admin sees all
    } else if (user.role === 'distributor') {
      // Distributor sees all requests from downline retailers mapped to them and their own
      const downlineUserIds = new Set(
        (db.users || [])
          .filter(u => u.distributor_id === user.id || u.id === user.id)
          .map(u => u.id)
      );
      downlineUserIds.add(user.id);
      list = list.filter(r => downlineUserIds.has(r.user_id));
    } else if (user.role === 'super_distributor') {
      // Master Distributor sees all requests from downline distributors and retailers
      const downlineDistributorIds = (db.users || [])
        .filter(u => u.super_distributor_id === user.id || u.id === user.id)
        .map(u => u.id);
      const downlineDistSet = new Set(downlineDistributorIds);
      downlineDistSet.add(user.id);

      const downlineUserIds = new Set(
        (db.users || [])
          .filter(u => u.super_distributor_id === user.id || downlineDistSet.has(u.distributor_id) || u.id === user.id)
          .map(u => u.id)
      );
      downlineUserIds.add(user.id);
      list = list.filter(r => downlineUserIds.has(r.user_id));
    } else {
      // Regular user sees only their own
      list = list.filter(r => r.user_id === user.id);
    }

    // Optional Limit & Pagination (returns all requests unless limit is explicitly requested)
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : 0;
    const pageParam = Math.max(1, parseInt(req.query.page, 10) || 1);
    const totalCount = list.length;
    let paginatedList = list;
    if (limitParam > 0) {
      const offset = (pageParam - 1) * limitParam;
      paginatedList = list.slice(offset, offset + limitParam);
    }

    // Ensure qr_masters is always available in memory to resolve exact QR names
    if (supabase && (!db.qr_masters || db.qr_masters.length === 0)) {
      try {
        const { data: qData } = await supabase.from('qr_masters').select('id, name, upi_id, is_active, is_selected');
        if (qData && Array.isArray(qData)) db.qr_masters = qData;
      } catch (e) {
        console.warn('Failed to load qr_masters for name resolution:', e.message);
      }
    }

    const defaultQr = (db.qr_masters || []).find(qm => qm.is_selected) || (db.qr_masters || []).find(qm => qm.is_active);

    const enrichedList = paginatedList.map(r => {
      const q = (db.qr_masters || []).find(qm => qm.id === r.qr_master_id);
      const resolvedQrName = q?.name?.trim() 
        || (r.qr_name && r.qr_name !== 'Active QR' && r.qr_name !== 'System QR' ? r.qr_name.trim() : null)
        || defaultQr?.name?.trim() 
        || 'ARIHANT ENTERPRISE';

      return {
        ...r,
        qr_name: resolvedQrName,
        screenshot_url: null
      };
    });

    return res.status(200).json({
      success: true,
      count: enrichedList.length,
      total_count: totalCount,
      payment_requests: enrichedList
    });
  } catch (error) {
    console.error('Fetch Payment Requests Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment requests.' });
  }
});

// GET /api/qr/request/:id/screenshot (Fetch single screenshot on demand)
router.get('/request/:id/screenshot', verifyToken, async (req, res) => {
  try {
    const reqId = req.params.id;
    let screenshot_url = null;

    const memoryReq = db.qr_payment_requests.find(r => r.id === reqId || String(r.id) === String(reqId));
    if (memoryReq && memoryReq.screenshot_url) {
      screenshot_url = memoryReq.screenshot_url;
    } else if (supabase) {
      const { data } = await supabase.from('qr_payment_requests').select('screenshot_url').eq('id', reqId).maybeSingle();
      if (data && data.screenshot_url) {
        screenshot_url = data.screenshot_url;
        if (memoryReq) memoryReq.screenshot_url = data.screenshot_url;
      }
    }

    return res.status(200).json({ success: true, screenshot_url });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch screenshot' });
  }
});

// Helper: Format ISO date string into IST (Asia/Kolkata) "YYYY-MM-DD"
const toIstDateString = (dateVal) => {
  if (!dateVal) return new Date().toISOString().substring(0, 10);
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).substring(0, 10);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  } catch {
    return String(dateVal).substring(0, 10);
  }
};

// -----------------------------------------------------------------------------
// GET /api/qr/gallery/summary (Admin Approved Screenshot Gallery Summary - Date & QR Wise)
// -----------------------------------------------------------------------------
router.get('/gallery/summary', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    if (supabase) {
      try {
        if (!db.qr_masters || db.qr_masters.length === 0) {
          const { data: qData } = await supabase.from('qr_masters').select('*');
          if (qData) db.qr_masters = qData;
        }
        if (!db.users || db.users.length === 0) {
          const { data: uData } = await supabase.from('users_profiles').select('*');
          if (uData) db.users = uData;
        }

        const { data: approvedData, error } = await supabase
          .from('qr_payment_requests')
          .select('id, user_id, qr_master_id, amount, utr_number, mobile_number, status, processed_at, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(approvedData)) {
          approvedData.forEach(item => {
            const idx = (db.qr_payment_requests || []).findIndex(r => r.id === item.id);
            if (idx >= 0) {
              db.qr_payment_requests[idx] = { ...db.qr_payment_requests[idx], ...item };
            } else {
              db.qr_payment_requests.push(item);
            }
          });
        }
      } catch (sbErr) {
        console.error('Supabase QR gallery sync error:', sbErr);
      }
    }

    // Filter only approved requests
    const approvedRequests = (db.qr_payment_requests || []).filter(r => r.status === 'approved');

    // Group by IST Date & QR
    const dateMap = new Map();

    for (const reqItem of approvedRequests) {
      const istDate = toIstDateString(reqItem.processed_at || reqItem.created_at);
      if (!dateMap.has(istDate)) {
        dateMap.set(istDate, {
          date: istDate,
          total_approved_amount: 0,
          total_approved_count: 0,
          total_screenshots: 0,
          qr_map: new Map()
        });
      }

      const dayObj = dateMap.get(istDate);
      const amt = Number(reqItem.amount || 0);
      dayObj.total_approved_amount += amt;
      dayObj.total_approved_count += 1;

      const hasScreenshot = reqItem.screenshot_url !== undefined && reqItem.screenshot_url !== null
        ? Boolean(String(reqItem.screenshot_url).trim().length > 0)
        : true;
      if (hasScreenshot) {
        dayObj.total_screenshots += 1;
      }

      const qrKey = reqItem.qr_master_id || 'system_qr';
      if (!dayObj.qr_map.has(qrKey)) {
        const qm = (db.qr_masters || []).find(q => q.id === reqItem.qr_master_id);
        dayObj.qr_map.set(qrKey, {
          qr_master_id: reqItem.qr_master_id || null,
          qr_name: qm ? qm.name : (reqItem.qr_name || 'Active QR'),
          upi_id: qm ? qm.upi_id : (reqItem.upi_id || ''),
          total_amount: 0,
          total_count: 0,
          screenshot_count: 0,
          batches_count: 0
        });
      }

      const qrObj = dayObj.qr_map.get(qrKey);
      qrObj.total_amount += amt;
      qrObj.total_count += 1;
      if (hasScreenshot) {
        qrObj.screenshot_count += 1;
      }
    }

    // Convert map to sorted array (newest date first)
    const datesSummary = Array.from(dateMap.values())
      .map(d => {
        const qrList = Array.from(d.qr_map.values()).map(q => ({
          ...q,
          batches_count: Math.ceil(q.screenshot_count / 10)
        }));
        qrList.sort((a, b) => b.total_amount - a.total_amount);

        return {
          date: d.date,
          total_approved_amount: d.total_approved_amount,
          total_approved_count: d.total_approved_count,
          total_screenshots: d.total_screenshots,
          total_batches: Math.ceil(d.total_screenshots / 10),
          qr_breakdown: qrList
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return res.status(200).json({
      success: true,
      count: datesSummary.length,
      dates_summary: datesSummary
    });
  } catch (error) {
    console.error('Fetch Gallery Summary Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch proof gallery summary.' });
  }
});

// -----------------------------------------------------------------------------
// GET /api/qr/gallery/images (Fetch 10-image batch of approved screenshots)
// -----------------------------------------------------------------------------
router.get('/gallery/images', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { date, qr_master_id, batch } = req.query;
    const batchNum = Math.max(1, parseInt(batch, 10) || 1);
    const limit = 10;
    const offset = (batchNum - 1) * limit;

    let matching = (db.qr_payment_requests || []).filter(r => {
      if (r.status !== 'approved') return false;
      const istDate = toIstDateString(r.processed_at || r.created_at);
      if (date && date !== 'ALL' && istDate !== date) return false;
      if (qr_master_id && qr_master_id !== 'all') {
        if (r.qr_master_id !== qr_master_id && (!r.qr_master_id && qr_master_id !== 'system_qr')) {
          return false;
        }
      }
      return Boolean(r.screenshot_url && String(r.screenshot_url).trim().length > 0);
    });

    if (supabase && matching.length === 0 && date && date !== 'ALL') {
      try {
        let query = supabase
          .from('qr_payment_requests')
          .select('*')
          .eq('status', 'approved')
          .not('screenshot_url', 'is', null)
          .neq('screenshot_url', '')
          .order('created_at', { ascending: false });

        if (qr_master_id && qr_master_id !== 'all' && qr_master_id !== 'system_qr') {
          query = query.eq('qr_master_id', qr_master_id);
        }
        const { data: sbData } = await query;
        if (sbData && Array.isArray(sbData)) {
          matching = sbData.filter(r => toIstDateString(r.processed_at || r.created_at) === date);
        }
      } catch (sbErr) {
        console.error('Supabase query error in gallery images:', sbErr);
      }
    }

    // Sort newest first
    matching.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalImages = matching.length;
    const totalBatches = Math.ceil(totalImages / limit);
    const paginated = matching.slice(offset, offset + limit);

    const populated = paginated.map(r => {
      const u = (db.users || []).find(user => user.id === r.user_id);
      const q = (db.qr_masters || []).find(qm => qm.id === r.qr_master_id);
      const originalUtrMatch = (r.admin_note && r.admin_note.match(/Original UTR:\s*(\d{12})/)?.[1])
        || (r.revert_reason && r.revert_reason.match(/Original UTR:\s*(\d{12})/)?.[1])
        || (r.rejection_reason && r.rejection_reason.match(/Original UTR:\s*(\d{12})/)?.[1]);

      return {
        id: r.id,
        amount: Number(r.amount || 0),
        utr_number: originalUtrMatch || r.utr_number,
        original_utr_number: originalUtrMatch || r.utr_number,
        mobile_number: r.mobile_number || (u ? u.mobile_number : ''),
        user_name: u ? u.name : (r.user_name || 'Retailer User'),
        firm_name: u ? u.firm_name : (r.firm_name || 'N/A'),
        qr_master_id: r.qr_master_id,
        qr_name: q ? q.name : (r.qr_name || 'Active QR'),
        upi_id: q ? q.upi_id : (r.upi_id || ''),
        status: r.status,
        created_at: r.created_at,
        processed_at: r.processed_at,
        screenshot_url: r.screenshot_url
      };
    });

    return res.status(200).json({
      success: true,
      date: date || 'ALL',
      qr_master_id: qr_master_id || 'all',
      batch: batchNum,
      limit,
      total_images: totalImages,
      total_batches: totalBatches,
      images: populated
    });
  } catch (error) {
    console.error('Fetch Gallery Images Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch proof gallery images.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/request/:id/process (ATOMIC & IDEMPOTENT APPROVAL / REJECTION)
// Prevents Double Approval & Double Credit
// -----------------------------------------------------------------------------
router.post('/request/:id/process', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    const { action, rejection_reason } = req.body; // action: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approved" or "rejected".' });
    }

    // 1. STRICT IDEMPOTENCY & LOCK CHECK
    const targetReq = db.qr_payment_requests.find(r => r.id === reqId);
    if (!targetReq) {
      return res.status(404).json({ success: false, message: 'Payment request record not found.' });
    }

    if (targetReq.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${targetReq.status.toUpperCase()}! Double approval or credit prevented.`
      });
    }

    // 2. ATOMIC STATE CHANGE TO PREVENT RACE CONDITIONS
    targetReq.status = action;
    targetReq.processed_at = new Date().toISOString();
    targetReq.processed_by = req.user.id;

    if (action === 'rejected') {
      targetReq.rejection_reason = rejection_reason || 'Rejected by System Administrator';

      if (supabase) {
        try {
          await supabase.from('qr_payment_requests').update({
            status: 'rejected',
            rejection_reason: targetReq.rejection_reason,
            processed_at: targetReq.processed_at,
            processed_by: targetReq.processed_by
          }).eq('id', reqId);
        } catch (sbErr) {
          console.error('Supabase Reject Request Update Error:', sbErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Payment request ${reqId} rejected.`,
        payment_request: targetReq
      });
    }

    // 3. APPROVAL LOGIC: CREDIT WALLET & HIERARCHY COMMISSIONS
    const user = db.users.find(u => u.id === targetReq.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated user account not found.' });
    }

    const chargePct = user.qr_charge_percent !== undefined ? parseFloat(user.qr_charge_percent) : (targetReq.charge_percent || 0);
    const chargeAmt = Math.round((targetReq.amount * (chargePct / 100)) * 100) / 100;
    const netCreditAmt = Math.round((targetReq.amount - chargeAmt) * 100) / 100;

    targetReq.charge_percent = chargePct;
    targetReq.charge_amount = chargeAmt;
    targetReq.net_amount = netCreditAmt;

    // ATOMIC WALLET INCREMENT
    user.wallet_balance += netCreditAmt;
    user.updated_at = new Date().toISOString();

    // HIERARCHY COMMISSION DISTRIBUTIONS (DS & MS BASED ON MARKUP SLAB)
    let distUser = user.distributor_id ? db.users.find(u => u.id === user.distributor_id) : null;
    let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id))
      ? db.users.find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id)))
      : null;

    const userRate = chargePct;
    const distRate = distUser ? (parseFloat(distUser.qr_charge_percent) || 0) : 0;
    const superDistRate = superDistUser ? (parseFloat(superDistUser.qr_charge_percent) || 0) : 0;

    const dsMargin = distUser ? Math.max(0, userRate - distRate) : 0;
    const dsComm = distUser ? Math.round((targetReq.amount * (dsMargin / 100)) * 100) / 100 : 0;

    const msMargin = superDistUser ? Math.max(0, distRate - superDistRate) : 0;
    const msComm = superDistUser ? Math.round((targetReq.amount * (msMargin / 100)) * 100) / 100 : 0;
    const adminComm = Math.round(Math.max(0, chargeAmt - (dsComm + msComm)) * 100) / 100;

    targetReq.distributor_commission = distUser ? dsComm : 0;
    targetReq.super_distributor_commission = superDistUser ? msComm : 0;
    targetReq.admin_commission = adminComm;

    if (distUser && dsComm > 0) {
      distUser.commission_balance = (distUser.commission_balance || 0) + dsComm;
      distUser.wallet_balance = (distUser.wallet_balance || 0) + dsComm; // Instantly available in wallet
      distUser.updated_at = new Date().toISOString();
    }

    if (superDistUser && msComm > 0) {
      superDistUser.commission_balance = (superDistUser.commission_balance || 0) + msComm;
      superDistUser.wallet_balance = (superDistUser.wallet_balance || 0) + msComm; // Instantly available in wallet
      superDistUser.updated_at = new Date().toISOString();
    }

    // Record Transaction Log
    const txRecord = {
      id: 'tx_qr_' + Date.now(),
      user_id: user.id,
      type: 'QR_ADD_MONEY',
      amount: targetReq.amount,
      service_charge: chargeAmt,
      net_amount: netCreditAmt,
      recipient_account: `UTR: ${targetReq.utr_number}`,
      recipient_name: 'QR Payment Request Approved',
      status: 'SUCCESS',
      reference_number: 'ASY-QR-' + Date.now().toString().slice(-8),
      created_at: new Date().toISOString()
    };
    db.transactions.unshift(txRecord);

    if (supabase) {
      try {
        await supabase.from('qr_payment_requests').update({
          status: 'approved',
          charge_percent: targetReq.charge_percent !== undefined ? targetReq.charge_percent : 0,
          charge_amount: targetReq.charge_amount !== undefined ? targetReq.charge_amount : 0,
          net_amount: targetReq.net_amount,
          distributor_commission: targetReq.distributor_commission || 0,
          super_distributor_commission: targetReq.super_distributor_commission || 0,
          admin_commission: targetReq.admin_commission !== undefined ? targetReq.admin_commission : 0,
          processed_at: targetReq.processed_at,
          processed_by: targetReq.processed_by
        }).eq('id', reqId);

        // 1. Credit Retailer user wallet in Supabase
        await supabase.from('users_profiles').update({
          wallet_balance: user.wallet_balance,
          updated_at: user.updated_at
        }).eq('id', user.id);

        // 2. Credit Distributor wallet & commission balance in Supabase
        if (distUser && dsComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: distUser.wallet_balance,
            commission_balance: distUser.commission_balance,
            updated_at: distUser.updated_at
          }).eq('id', distUser.id);
        }

        // 3. Credit Super Distributor (Master Distributor) wallet & commission balance in Supabase
        if (superDistUser && msComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: superDistUser.wallet_balance,
            commission_balance: superDistUser.commission_balance,
            updated_at: superDistUser.updated_at
          }).eq('id', superDistUser.id);
        }
      } catch (sbErr) {
        console.error('Supabase Process Request Sync Error:', sbErr);
      }
    }

    lastQrRequestsFetch = 0;
    return res.status(200).json({
      success: true,
      message: `Payment Approved! ₹${netCreditAmt.toFixed(2)} credited to ${user.name}'s wallet (Charge: ${chargePct}% = ₹${chargeAmt.toFixed(2)}).`,
      payment_request: targetReq,
      updated_wallet: user.wallet_balance
    });
  } catch (error) {
    console.error('Process QR Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing payment request.' });
  }
});

// -----------------------------------------------------------------------------
// POST /api/qr/request/:id/revert (ADMIN ONLY - UNDO / REVERT ACCIDENTAL APPROVAL)
// Method 2 Enforcement: Blocks revert if user does not have sufficient wallet balance
// -----------------------------------------------------------------------------
router.post('/request/:id/revert', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Revert reason is mandatory.'
      });
    }

    // 1. Fetch Target Request
    let targetReq = (db.qr_payment_requests || []).find(r => r.id === reqId);
    if (!targetReq && supabase) {
      try {
        const { data } = await supabase.from('qr_payment_requests').select('*').eq('id', reqId).maybeSingle();
        if (data) targetReq = data;
      } catch (err) {
        console.error('Supabase fetch request error:', err);
      }
    }

    if (!targetReq) {
      return res.status(404).json({ success: false, message: 'Payment request record not found.' });
    }

    if (targetReq.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Only approved requests can be reverted. Current status is ${targetReq.status.toUpperCase()}.`
      });
    }

    // 2. Fetch User & Current Wallet Balance
    let user = (db.users || []).find(u => u.id === targetReq.user_id);
    if (supabase) {
      try {
        const { data: uData } = await supabase.from('users_profiles').select('*').eq('id', targetReq.user_id).maybeSingle();
        if (uData) {
          if (user) {
            Object.assign(user, uData);
          } else {
            user = uData;
            if (!db.users) db.users = [];
            db.users.push(uData);
          }
        }
      } catch (uErr) {
        console.error('Supabase fetch user error:', uErr);
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated retailer user account not found.' });
    }

    const netCreditAmt = parseFloat(
      targetReq.net_amount !== undefined
        ? targetReq.net_amount
        : (targetReq.amount - (targetReq.charge_amount || 0))
    );
    const currentWalletBalance = parseFloat(user.wallet_balance || 0);

    // -------------------------------------------------------------------------
    // METHOD 2 STRICT ENFORCEMENT:
    // Block Revert if retailer has insufficient balance!
    // -------------------------------------------------------------------------
    if (currentWalletBalance < netCreditAmt) {
      return res.status(400).json({
        success: false,
        insufficient_balance: true,
        message: `Insufficient balance! User currently has ₹${currentWalletBalance.toFixed(2)}, while ₹${netCreditAmt.toFixed(2)} is required to revert. Revert can only be processed after user adds sufficient balance.`,
        available_balance: currentWalletBalance,
        required_amount: netCreditAmt,
        shortage_amount: parseFloat((netCreditAmt - currentWalletBalance).toFixed(2))
      });
    }

    // 3. ATOMIC DEDUCTION FROM USER WALLET
    const newWalletBalance = parseFloat((currentWalletBalance - netCreditAmt).toFixed(2));
    user.wallet_balance = newWalletBalance;
    user.updated_at = new Date().toISOString();

    // 4. REVERSE HIERARCHY COMMISSIONS
    let distUser = user.distributor_id ? (db.users || []).find(u => u.id === user.distributor_id) : null;
    let superDistUser = (user.super_distributor_id || (distUser && distUser.super_distributor_id))
      ? (db.users || []).find(u => u.id === (user.super_distributor_id || (distUser && distUser.super_distributor_id)))
      : null;

    const dsComm = parseFloat(targetReq.distributor_commission || 0);
    if (distUser && dsComm > 0) {
      distUser.wallet_balance = Math.max(0, parseFloat(((distUser.wallet_balance || 0) - dsComm).toFixed(2)));
      distUser.commission_balance = Math.max(0, parseFloat(((distUser.commission_balance || 0) - dsComm).toFixed(2)));
      distUser.updated_at = new Date().toISOString();
    }

    const msComm = parseFloat(targetReq.super_distributor_commission || 0);
    if (superDistUser && msComm > 0) {
      superDistUser.wallet_balance = Math.max(0, parseFloat(((superDistUser.wallet_balance || 0) - msComm).toFixed(2)));
      superDistUser.commission_balance = Math.max(0, parseFloat(((superDistUser.commission_balance || 0) - msComm).toFixed(2)));
      superDistUser.updated_at = new Date().toISOString();
    }

    // 5. UPDATE REQUEST RECORD & ARCHIVE UTR TO FREE IT FOR USER RESUBMISSION
    const originalUtr = targetReq.utr_number;
    const archivedUtr = ('R' + Date.now().toString().slice(-11)).slice(0, 12);

    targetReq.original_utr_number = originalUtr;
    targetReq.utr_number = archivedUtr;
    targetReq.status = 'reverted';
    targetReq.revert_reason = `${reason.trim()} (Original UTR: ${originalUtr})`;
    targetReq.reverted_at = new Date().toISOString();
    targetReq.reverted_by = req.user.id;
    targetReq.admin_note = targetReq.admin_note ? `${targetReq.admin_note} | Original UTR: ${originalUtr}` : `Original UTR: ${originalUtr}`;

    // 6. RECORD REVERSAL TRANSACTION LOG
    const txRecord = {
      id: 'tx_rev_' + Date.now(),
      user_id: user.id,
      type: 'QR_REVERT',
      amount: targetReq.amount,
      service_charge: targetReq.charge_amount || 0,
      net_amount: netCreditAmt,
      recipient_account: `UTR: ${originalUtr}`,
      recipient_name: `QR Approval Reverted: ${reason.trim()}`,
      status: 'SUCCESS',
      reference_number: 'ASY-REV-' + Date.now().toString().slice(-8),
      created_at: new Date().toISOString()
    };
    if (!db.transactions) db.transactions = [];
    db.transactions.unshift(txRecord);

    // 7. SUPABASE DATABASE SYNC WITH SAFE FALLBACK
    if (supabase) {
      try {
        const { error: sbReqErr } = await supabase.from('qr_payment_requests').update({
          status: 'reverted',
          utr_number: archivedUtr,
          rejection_reason: `[REVERTED] ${reason.trim()} (Original UTR: ${originalUtr})`,
          reverted_at: targetReq.reverted_at,
          reverted_by: targetReq.reverted_by,
          revert_reason: targetReq.revert_reason,
          admin_note: targetReq.admin_note
        }).eq('id', reqId);

        if (sbReqErr) {
          // If PostgreSQL CHECK constraint fails on 'reverted', fallback to 'rejected'
          console.warn('Supabase reverted status update warning, trying fallback:', sbReqErr.message);
          await supabase.from('qr_payment_requests').update({
            status: 'rejected',
            utr_number: archivedUtr,
            rejection_reason: `[REVERTED] ${reason.trim()} (Original UTR: ${originalUtr})`,
            processed_at: targetReq.reverted_at,
            processed_by: targetReq.reverted_by,
            admin_note: targetReq.admin_note
          }).eq('id', reqId);
        }

        // Update Retailer wallet
        await supabase.from('users_profiles').update({
          wallet_balance: user.wallet_balance,
          updated_at: user.updated_at
        }).eq('id', user.id);

        // Update Distributor if commission reversed
        if (distUser && dsComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: distUser.wallet_balance,
            commission_balance: distUser.commission_balance,
            updated_at: distUser.updated_at
          }).eq('id', distUser.id);
        }

        // Update Super Distributor if commission reversed
        if (superDistUser && msComm > 0) {
          await supabase.from('users_profiles').update({
            wallet_balance: superDistUser.wallet_balance,
            commission_balance: superDistUser.commission_balance,
            updated_at: superDistUser.updated_at
          }).eq('id', superDistUser.id);
        }

        // Insert reversal transaction
        await supabase.from('transactions').insert([txRecord]).catch(() => { });
      } catch (sbErr) {
        console.error('Supabase Revert QR Sync Error:', sbErr);
      }
    }

    lastQrRequestsFetch = 0;
    return res.status(200).json({
      success: true,
      message: `Request Reverted! ₹${netCreditAmt.toFixed(2)} deducted from ${user.name}'s wallet. New wallet balance: ₹${newWalletBalance.toFixed(2)}.`,
      payment_request: targetReq,
      updated_wallet: newWalletBalance
    });
  } catch (error) {
    console.error('Revert QR Request Error:', error);
    return res.status(500).json({ success: false, message: 'Server error reverting payment request.' });
  }
});

// -----------------------------------------------------------------------------
// PATCH /api/qr/request/:id/note - Update Admin Internal Note (Admin Only)
// -----------------------------------------------------------------------------
router.patch('/request/:id/note', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;
    const noteText = typeof admin_note === 'string' ? admin_note.trim() : '';

    let reqIndex = (db.qr_payment_requests || []).findIndex(r => r.id === id);
    let targetRequest = reqIndex !== -1 ? db.qr_payment_requests[reqIndex] : null;

    if (supabase) {
      try {
        const { data } = await supabase.from('qr_payment_requests').select('*').eq('id', id).maybeSingle();
        if (data && !targetRequest) {
          targetRequest = data;
        }
      } catch (sbFetchErr) {
        console.warn('Supabase fetch request error:', sbFetchErr.message);
      }
    }

    if (!targetRequest) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    // Update in-memory
    if (reqIndex !== -1) {
      db.qr_payment_requests[reqIndex].admin_note = noteText;
    } else {
      targetRequest.admin_note = noteText;
      if (!db.qr_payment_requests) db.qr_payment_requests = [];
      db.qr_payment_requests.push(targetRequest);
    }

    // Persist to Supabase
    if (supabase) {
      try {
        const { error: sbErr } = await supabase
          .from('qr_payment_requests')
          .update({ admin_note: noteText })
          .eq('id', id);

        if (sbErr) {
          console.warn('[PATCH /request/:id/note] Supabase Note Update Notice:', sbErr.message);
        }
      } catch (e) {
        console.warn('[PATCH /request/:id/note] Supabase update exception:', e.message);
      }
    }

    lastQrRequestsFetch = 0;
    return res.status(200).json({
      success: true,
      message: 'Admin note updated successfully.',
      admin_note: noteText,
      payment_request: {
        ...targetRequest,
        admin_note: noteText
      }
    });
  } catch (err) {
    console.error('Update QR Request Note Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update admin note: ' + err.message });
  }
});

// Also support POST for /request/:id/note
router.post('/request/:id/note', verifyToken, requireRoles(['admin']), async (req, res) => {
  req.url = `/request/${encodeURIComponent(req.params.id)}/note`;
  return router.handle(req, res);
});

// -----------------------------------------------------------------------------
// PATCH /api/qr/request/:id/qr-master - Reassign QR Master for a payment request (Admin Only)
// -----------------------------------------------------------------------------
router.patch('/request/:id/qr-master', verifyToken, requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { qr_master_id } = req.body;

    if (!qr_master_id) {
      return res.status(400).json({ success: false, message: 'QR Master ID is required.' });
    }

    // Ensure qr_masters is loaded in memory
    if (supabase && (!db.qr_masters || db.qr_masters.length === 0)) {
      const { data: qData } = await supabase.from('qr_masters').select('id, name, upi_id, is_active, is_selected, created_at, updated_at');
      if (qData && Array.isArray(qData)) db.qr_masters = qData;
    }

    const targetMaster = (db.qr_masters || []).find(qm => qm.id === qr_master_id || String(qm.id) === String(qr_master_id));
    if (!targetMaster) {
      return res.status(404).json({ success: false, message: 'Selected QR Master not found.' });
    }

    // Find and update in memory
    const reqIndex = (db.qr_payment_requests || []).findIndex(r => r.id === id || String(r.id) === String(id));
    let targetRequest = reqIndex !== -1 ? db.qr_payment_requests[reqIndex] : null;

    if (targetRequest) {
      targetRequest.qr_master_id = targetMaster.id;
      targetRequest.qr_name = targetMaster.name;
      targetRequest.upi_id = targetMaster.upi_id;
    }

    // Persist to Supabase
    if (supabase) {
      try {
        const { error: sbErr } = await supabase
          .from('qr_payment_requests')
          .update({
            qr_master_id: targetMaster.id
          })
          .eq('id', id);

        if (sbErr) {
          console.error('[PATCH /request/:id/qr-master] Supabase update error:', sbErr);
          return res.status(500).json({ success: false, message: 'Database error updating QR master: ' + sbErr.message });
        }
      } catch (sbEx) {
        console.error('[PATCH /request/:id/qr-master] Supabase exception:', sbEx);
      }
    }

    lastQrDbSyncTime = Date.now();

    return res.status(200).json({
      success: true,
      message: `QR code successfully reassigned to "${targetMaster.name}"!`,
      qr_master_id: targetMaster.id,
      qr_name: targetMaster.name,
      upi_id: targetMaster.upi_id,
      payment_request: targetRequest
    });
  } catch (err) {
    console.error('Reassign QR Master Error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating QR Master: ' + err.message });
  }
});

// Also support POST for /request/:id/qr-master
router.post('/request/:id/qr-master', verifyToken, requireRoles(['admin']), async (req, res) => {
  req.url = `/request/${encodeURIComponent(req.params.id)}/qr-master`;
  return router.handle(req, res);
});

// GET Settings endpoint
router.get('/settings', (req, res) => {
  return res.status(200).json({
    success: true,
    settings: { is_qr_enabled: true }
  });
});

export default router;
