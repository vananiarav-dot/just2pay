import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import { 
  Clock, Search, RefreshCw, CheckCircle2, AlertCircle, 
  Receipt, Landmark, ShieldCheck, UserCheck, ArrowUpRight,
  X, RotateCcw, Activity, Zap, Check, Calendar, Filter,
  Building2, CreditCard, Sliders, Plus, Edit, Trash2, TrendingUp, Power
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import type { LiveBillApiSlab } from '../../types/billRequest';

/**
 * Safely extract the last 4 digits of the card number from the transaction item
 */
const getCardLast4 = (item: any): string => {
  if (!item) return '';

  if (item.card_last4) {
    const clean = String(item.card_last4).replace(/\D/g, '');
    if (clean.length >= 4) return clean.slice(-4);
    if (clean.length > 0) return clean;
    return String(item.card_last4).trim().slice(-4);
  }

  let params = item.customer_params || item.customerParams;
  if (typeof params === 'string') {
    try {
      params = JSON.parse(params);
    } catch {
      params = [];
    }
  }

  if (Array.isArray(params)) {
    // 1st Priority: Param name explicitly mentions card / credit / last 4
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    // 2nd Priority: Param name mentions account / number (excluding mobile, phone, pan)
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      if (name.includes('account') || name.includes('acc') || name.includes('num')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    // 3rd Priority: Any 4-digit or 12-19 digit numeric param that is not 10-digit mobile
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      const digits = val.replace(/\D/g, '');
      if (digits.length === 4) return digits;
      if (digits.length >= 12 && digits.length <= 19 && digits.length !== 10) {
        return digits.slice(-4);
      }
    }
  } else if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      const name = k.toLowerCase();
      const val = String(v ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4') || name.includes('account')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }
  }

  const addInfo = item.additional_info || item.additionalInfo || item.biller_response_info || item.billerResponseInfo;
  if (addInfo) {
    const str = typeof addInfo === 'string' ? addInfo : JSON.stringify(addInfo);
    const cardMatch = str.match(/card[^\d]*(\d{4})/i) || str.match(/account[^\d]*(\d{4})/i);
    if (cardMatch && cardMatch[1]) return cardMatch[1];
  }

  return '';
};

/**
 * Safely compute service charge according to official charge slabs
 */
export const getServiceCharge = (item: any): number => {
  const charge = Number(item?.service_charge ?? item?.charge_amount ?? item?.charge ?? 0);
  if (charge > 0) return charge;
  const amt = Number(item?.amount || 0);
  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  if (amt <= 150000) return 75;
  return 100;
};

/**
 * Dynamic Upstream API Charge computation based on admin configured slabs
 * If no matching slab found, automatically falls back to ₹16 per ₹50,000 block
 */
export const computeLiveBillApiCharge = (amount: number, slabs: LiveBillApiSlab[]): number => {
  const amt = Number(amount || 0);
  if (amt <= 0) return 0;

  const activeSlabs = (slabs || []).filter(s => s.is_active !== false);
  if (activeSlabs.length > 0) {
    const matched = activeSlabs.find(s => amt >= Number(s.min_amount) && amt <= Number(s.max_amount));
    if (matched) return Number(matched.charge_amount || 0);
  }

  // Dynamic formula fallback: ₹16 per ₹50,000 slab block
  return Math.ceil(amt / 50000) * 16;
};

export const AdminLiveBillPayHistory: React.FC = () => {
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<{
    item: any;
    data: any;
  } | null>(null);

  // Dynamic Upstream API Charge Slabs State
  const [apiSlabs, setApiSlabs] = useState<LiveBillApiSlab[]>(() => {
    try {
      const cached = localStorage.getItem('just2pay_livebill_api_slabs');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [
      { id: 'lbslab_01', min_amount: 1, max_amount: 50000, charge_amount: 16, is_active: true },
      { id: 'lbslab_02', min_amount: 50001, max_amount: 100000, charge_amount: 32, is_active: true },
      { id: 'lbslab_03', min_amount: 100001, max_amount: 150000, charge_amount: 48, is_active: true },
      { id: 'lbslab_04', min_amount: 150001, max_amount: 200000, charge_amount: 64, is_active: true }
    ];
  });
  const [isSlabModalOpen, setIsSlabModalOpen] = useState(false);
  const [savingSlab, setSavingSlab] = useState(false);
  const [editingSlab, setEditingSlab] = useState<LiveBillApiSlab | null>(null);
  const [slabForm, setSlabForm] = useState({
    min_amount: '',
    max_amount: '',
    charge_amount: '',
    is_active: true
  });
  const [slabNotice, setSlabNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { liveBillPayEnabled, toggleLiveBillPay, fetchSettings: fetchLiveBillSettings } = useSettingsStore();
  const [isTogglingLiveBill, setIsTogglingLiveBill] = useState(false);
  const [toggleAlert, setToggleAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAdminHistory = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await b2bApi.getHistory();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin live bill pay history:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const fetchApiSlabs = async () => {
    try {
      const res = await b2bApi.getApiSlabs();
      if (res && res.success && Array.isArray(res.slabs)) {
        setApiSlabs(res.slabs);
        localStorage.setItem('just2pay_livebill_api_slabs', JSON.stringify(res.slabs));
      }
    } catch (err) {
      console.warn('Failed to fetch API slabs from server, using cached/default:', err);
    }
  };

  useEffect(() => {
    fetchAdminHistory(true);
    fetchLiveBillSettings();
    fetchApiSlabs();
    const interval = setInterval(() => {
      fetchAdminHistory(false);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveBillSettings]);

  const handleSaveSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseFloat(slabForm.min_amount);
    const max = parseFloat(slabForm.max_amount);
    const chg = parseFloat(slabForm.charge_amount);

    if (isNaN(min) || isNaN(max) || isNaN(chg) || min < 0 || max < min || chg < 0) {
      setSlabNotice({ type: 'error', message: 'Please enter valid positive numbers. Min must be <= Max.' });
      return;
    }

    setSavingSlab(true);
    setSlabNotice(null);
    try {
      if (editingSlab) {
        const res = await b2bApi.updateApiSlab(editingSlab.id, {
          min_amount: min,
          max_amount: max,
          charge_amount: chg,
          is_active: slabForm.is_active
        });
        if (res.success && res.slabs) {
          setApiSlabs(res.slabs);
          localStorage.setItem('just2pay_livebill_api_slabs', JSON.stringify(res.slabs));
        } else {
          setApiSlabs(prev => prev.map(s => s.id === editingSlab.id ? { ...s, min_amount: min, max_amount: max, charge_amount: chg, is_active: slabForm.is_active } : s));
        }
        setSlabNotice({ type: 'success', message: 'API charge slab updated successfully!' });
      } else {
        const res = await b2bApi.createApiSlab({
          min_amount: min,
          max_amount: max,
          charge_amount: chg,
          is_active: slabForm.is_active
        });
        if (res.success && res.slabs) {
          setApiSlabs(res.slabs);
          localStorage.setItem('just2pay_livebill_api_slabs', JSON.stringify(res.slabs));
        } else {
          const newS: LiveBillApiSlab = { id: `lbslab_${Date.now()}`, min_amount: min, max_amount: max, charge_amount: chg, is_active: slabForm.is_active };
          setApiSlabs(prev => [...prev, newS].sort((a,b) => a.min_amount - b.min_amount));
        }
        setSlabNotice({ type: 'success', message: 'New API charge slab created!' });
      }
      setEditingSlab(null);
      setSlabForm({ min_amount: '', max_amount: '', charge_amount: '', is_active: true });
    } catch (err: any) {
      setSlabNotice({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to save slab' });
    } finally {
      setSavingSlab(false);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this API charge slab?')) return;
    try {
      const res = await b2bApi.deleteApiSlab(id);
      if (res.success && res.slabs) {
        setApiSlabs(res.slabs);
        localStorage.setItem('just2pay_livebill_api_slabs', JSON.stringify(res.slabs));
      } else {
        setApiSlabs(prev => prev.filter(s => s.id !== id));
      }
      setSlabNotice({ type: 'success', message: 'Slab deleted successfully.' });
    } catch (err: any) {
      setApiSlabs(prev => prev.filter(s => s.id !== id));
      setSlabNotice({ type: 'success', message: 'Slab deleted.' });
    }
  };

  const handleToggleLiveBill = async () => {
    setIsTogglingLiveBill(true);
    setToggleAlert(null);
    try {
      const res = await toggleLiveBillPay();
      if (res.success) {
        setToggleAlert({
          type: 'success',
          message: res.enabled 
            ? '✅ Live Bill Pay enabled! Retailer portal menu is now VISIBLE and route is ACCESSIBLE.' 
            : '🔒 Live Bill Pay disabled! Retailer portal menu is now HIDDEN and direct route URL is BLOCKED.'
        });
      } else {
        setToggleAlert({
          type: 'error',
          message: res.message || 'Failed to update Live Bill Pay toggle.'
        });
      }
    } catch (err: any) {
      setToggleAlert({
        type: 'error',
        message: err.message || 'An unexpected error occurred while toggling Live Bill Pay.'
      });
    } finally {
      setIsTogglingLiveBill(false);
    }
  };

  const handleCheckStatus = async (item: any) => {
    const txnId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
    if (!txnId) return;
    setCheckingStatusId(txnId);
    try {
      const res = await b2bApi.checkStatus(txnId);
      setStatusModal({
        item,
        data: res
      });
      fetchAdminHistory();
    } catch (err: any) {
      setStatusModal({
        item,
        data: {
          status: 'failed',
          payment_status: 'failed',
          message: err.response?.data?.message || err.message || 'Unable to check live transaction status'
        }
      });
    } finally {
      setCheckingStatusId(null);
    }
  };

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'all' ||
    dateFilter !== 'TODAY' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('TODAY');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Base history filtered by Date and Search (used for Top Metrics Summary Cards)
  const summaryBaseHistory = historyList.filter(item => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      const t = d.getTime();
      if (isNaN(t)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (dateFilter === 'TODAY') {
        if (t < startOfToday || t > endOfToday) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (t < startOfYesterday || t > endOfYesterday) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (t < startOf7Days || t > endOfToday) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (t < startOf30Days || t > endOfToday) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (t < startOfMonth || t > endOfToday) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const [sY, sM, sD] = customStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (t < startTime) return false;
        }
        if (customEndDate) {
          const [eY, eM, eD] = customEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (t > endTime) return false;
        }
      }
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const card4 = getCardLast4(item);
      const matchesSearch = 
        (item.biller_name || '').toLowerCase().includes(q) ||
        (item.biller_id || '').toLowerCase().includes(q) ||
        (item.customer_name || '').toLowerCase().includes(q) ||
        (item.customer_mobile || '').toLowerCase().includes(q) ||
        (item.client_transaction_id || '').toLowerCase().includes(q) ||
        (item.bbps_txn_ref_id || '').toLowerCase().includes(q) ||
        (item.user_id || '').toLowerCase().includes(q) ||
        (item.firm_name || '').toLowerCase().includes(q) ||
        (item.user_name || '').toLowerCase().includes(q) ||
        card4.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Table rows: further filtered by Status
  const filteredHistory = summaryBaseHistory.filter(item => {
    const itemStatus = (item.status || '').toLowerCase();
    const isSuccess = itemStatus === 'success' || itemStatus === 'approved';
    const isPending = itemStatus === 'pending';
    const isFailed = itemStatus === 'failed' || itemStatus === 'rejected';

    if (statusFilter === 'success' && !isSuccess) return false;
    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'failed' && !isFailed) return false;

    return true;
  });

  // Calculate Metrics dynamically from selected range
  const totalRequests = summaryBaseHistory.length;
  const totalVolume = summaryBaseHistory.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0), 
    0
  );

  const successTransactions = summaryBaseHistory.filter(
    i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved'
  );
  const successVolume = successTransactions.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0), 
    0
  );
  const successCount = successTransactions.length;

  const totalEarnedCharges = successTransactions.reduce(
    (sum, item) => sum + getServiceCharge(item),
    0
  );

  const totalApiCost = successTransactions.reduce(
    (sum, item) => sum + computeLiveBillApiCharge(item.amount, apiSlabs),
    0
  );

  const totalNetProfit = totalEarnedCharges - totalApiCost;

  const pendingTransactions = summaryBaseHistory.filter(
    i => (i.status || '').toLowerCase() === 'pending'
  );
  const pendingVolume = pendingTransactions.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const pendingCount = pendingTransactions.length;

  const failedTransactions = summaryBaseHistory.filter(
    i => (i.status || '').toLowerCase() === 'failed' || (i.status || '').toLowerCase() === 'rejected'
  );
  const failedVolume = failedTransactions.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const failedCount = failedTransactions.length;

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      


      {/* TOP HEADER WITH LIVE BILL PAY TOGGLE SWITCH IN TOP RIGHT CORNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                LiveBillPay Monitoring & Gateway Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Monitor live BBPS transactions and control Retailer panel Live Bill Pay menu & route access
              </p>
            </div>
          </div>
        </div>

        {/* TOP RIGHT: DYNAMIC API SLABS BUTTON & TOGGLE SWITCH */}
        <div className="flex items-center self-end sm:self-auto gap-3 flex-wrap">
          
          {/* SLABS BUTTON */}
          <button
            type="button"
            onClick={() => {
              setEditingSlab(null);
              setSlabForm({ min_amount: '', max_amount: '', charge_amount: '', is_active: true });
              setSlabNotice(null);
              setIsSlabModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-black transition shadow-2xs cursor-pointer group"
            title="Configure Upstream API Cost Slabs for Live Bill Payments"
          >
            <Sliders className="w-4 h-4 text-purple-600 group-hover:rotate-45 transition-transform" />
            <span>API Charge Slabs</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-600 text-white font-mono shadow-xs">
              {apiSlabs.length}
            </span>
          </button>

          {/* TOGGLE SWITCH */}
          <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl shadow-inner">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Zap className={`w-3.5 h-3.5 ${liveBillPayEnabled ? 'text-emerald-600 fill-emerald-600/20' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-900">Live Bill Pay Menu</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  liveBillPayEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {liveBillPayEnabled ? 'ACTIVE / VISIBLE' : 'OFF / BLOCKED'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {liveBillPayEnabled 
                  ? 'User panel menu is visible & route accessible' 
                  : 'User menu is hidden & route URL blocked'}
              </p>
            </div>

            {/* TOGGLE BUTTON */}
            <button
              type="button"
              role="switch"
              aria-checked={liveBillPayEnabled}
              disabled={isTogglingLiveBill}
              onClick={handleToggleLiveBill}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-inner ${
                liveBillPayEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              } ${isTogglingLiveBill ? 'opacity-70 cursor-not-allowed' : ''}`}
              title={liveBillPayEnabled ? 'Click to Turn OFF Live Bill Pay on User Panel' : 'Click to Turn ON Live Bill Pay on User Panel'}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 flex items-center justify-center`}
              >
                {isTogglingLiveBill ? (
                  <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
                ) : liveBillPayEnabled ? (
                  <Check className="w-3 h-3 text-emerald-600 font-bold" />
                ) : (
                  <X className="w-3 h-3 text-slate-500" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {toggleAlert && (
        <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          toggleAlert.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {toggleAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toggleAlert.message}</span>
          </div>
          <button onClick={() => setToggleAlert(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards (Consolidated 4-Card Dual-Metric Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOTAL REQUESTS */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Live Bills</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-black text-slate-900">{totalRequests}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Vol: ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Net Admin Margin</span>
              <span className="font-bold text-emerald-700 font-mono">
                {totalNetProfit >= 0 ? '+' : ''}₹{totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PENDING / PROCESSING */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Pending / Processing</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                ₹{pendingVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingCount} Pending
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Network Queue</span>
              <span className="font-bold text-amber-700">
                {pendingCount === 0 ? 'Queue Clear' : `${pendingCount} in queue`}
              </span>
            </div>
          </div>
        </div>

        {/* 3. SUCCESSFUL BILLS */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Successful Bills</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                ₹{successVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {successCount} Successful
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Earned User Fees</span>
                <span className="font-bold text-purple-700 font-mono">
                  + ₹{totalEarnedCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Upstream API Cost</span>
                <span className="font-bold text-amber-700 font-mono">
                  - ₹{totalApiCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-100">
                <span className="text-slate-700 font-extrabold">Net Profit</span>
                <span className="font-black text-emerald-700 font-mono text-xs">
                  {totalNetProfit >= 0 ? '+' : ''}₹{totalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. FAILED / REJECTED */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Failed / Rejected</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                ₹{failedVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {failedCount} Failed
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Gateway Status</span>
              <span className="font-bold text-rose-600">
                {failedCount === 0 ? 'No Failures' : 'Auto-Refunded'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Filter Records
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono">
              {filteredHistory.length}{filteredHistory.length !== historyList.length ? ` / ${historyList.length}` : ''}
            </span>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* SEARCH BOX */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search User / Mobile / Biller / Txn ID / Ref ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DATE RANGE DROPDOWN */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer pr-2 font-medium"
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {/* CUSTOM DATE RANGE INPUTS */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-purple-300 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600 font-mono"
              />
              <span className="text-[11px] text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600 font-mono"
              />
            </div>
          )}

          {/* STATUS DROPDOWN */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Records ({historyList.length})</option>
              <option value="success">Success ({successCount})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="failed">Failed ({failedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* MASTER HISTORY TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-600" />
            Showing {filteredHistory.length} Live Bill Pay Records
          </h2>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Merchant / Firm Name</th>
                  <th className="p-3.5">Biller Bank</th>
                  <th className="p-3.5">Card (Last 4)</th>
                  <th className="p-3.5">Customer Name & Mobile</th>
                  <th className="p-3.5">Bill Amount (₹)</th>
                  <th className="p-3.5 text-right">User Charge (₹)</th>
                  <th className="p-3.5 text-right">API Charge (₹)</th>
                  <th className="p-3.5 text-right">Final Profit (₹)</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Transaction Ref IDs</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredHistory.map((item, idx) => {
                  const itemId = item.client_transaction_id || item.transaction_id || item.bbps_txn_ref_id || item.id;
                  const isCheckingThis = checkingStatusId === itemId;
                  const cardLast4 = getCardLast4(item);

                  return (
                    <tr key={itemId || idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-slate-600 font-sans whitespace-nowrap">
                        {new Date(item.created_at || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{item.firm_name || 'Retailer Firm'}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                            <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.user_id || 'System User'}</span>
                            {item.user_name && item.user_name !== item.user_id && (
                              <span className="text-slate-400 font-sans text-[10px]">({item.user_name})</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 font-sans">{item.biller_name || item.biller_id}</p>
                        <span className="text-[10px] text-indigo-600 font-mono font-medium">{item.biller_id}</span>
                      </td>
                      <td className="p-3.5 font-sans whitespace-nowrap">
                        {cardLast4 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs font-bold tracking-wider">
                            <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            •••• {cardLast4}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">•••• ----</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <p className="font-bold text-slate-900">{item.customer_name || 'VALUED CARD HOLDER'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.customer_mobile || item.mobile}</p>
                      </td>
                      {/* Bill Amount */}
                      <td className="p-3.5 font-black text-slate-900 text-xs font-mono">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* User Charge (Collected from Retailer) */}
                      <td className="p-3.5 font-bold text-pink-600 text-xs font-mono text-right whitespace-nowrap">
                        +₹{getServiceCharge(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* API Charge (Upstream Dynamic Cost) */}
                      <td className="p-3.5 text-xs font-mono text-right whitespace-nowrap">
                        {(item.status === 'success' || item.status === 'approved') ? (
                          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-block">
                            ₹{computeLiveBillApiCharge(item.amount, apiSlabs).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>

                      {/* Final Net Profit (User Charge - API Charge) */}
                      <td className="p-3.5 text-xs font-mono text-right whitespace-nowrap">
                        {(item.status === 'success' || item.status === 'approved') ? (() => {
                          const uChg = getServiceCharge(item);
                          const aChg = computeLiveBillApiCharge(item.amount, apiSlabs);
                          const profit = uChg - aChg;
                          return (
                            <span className={`font-black px-2 py-0.5 rounded-lg border inline-block ${
                              profit >= 0
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>
                              {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          );
                        })() : (
                          <span className="text-slate-400 font-sans text-[11px]">—</span>
                        )}
                      </td>

                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {item.status === 'success' || item.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Success
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        <p className="text-slate-800 font-bold">{item.client_transaction_id || item.id}</p>
                        {item.bbps_txn_ref_id && (
                          <p className="text-indigo-600 text-[10px] font-semibold">BBPS: {item.bbps_txn_ref_id}</p>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <button
                          onClick={() => handleCheckStatus(item)}
                          disabled={isCheckingThis}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isCheckingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <Activity className="w-3.5 h-3.5 text-purple-200" />
                              <span>Check Status</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No live credit card bill pay records found matching your filters.
          </div>
        )}
      </div>

      {/* LIVE STATUS RESULT MODAL */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-900 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-200">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Live Biller Status Check</h3>
                  <p className="text-[11px] text-slate-500">Direct query response from UsePay BBPS Biller Network</p>
                </div>
              </div>
              <button
                onClick={() => setStatusModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const resData = statusModal.data?.data || statusModal.data || {};
              const mainStatus = (statusModal.data?.status || resData.status || resData.current_status || 'unknown').toLowerCase();
              const isSuccess = mainStatus === 'success';
              const isPending = mainStatus === 'pending';
              const isFailed = mainStatus === 'failed';

              return (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    isSuccess 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : isPending 
                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {isSuccess && <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />}
                    {isPending && <Clock className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />}
                    {isFailed && <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />}
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        {isSuccess && 'Payment Confirmed by Biller (HTTP 200)'}
                        {isPending && 'Processing at Biller (HTTP 202)'}
                        {isFailed && 'Payment Failed / Auto-Refunded'}
                      </h4>
                      <p className="text-xs font-mono mt-0.5 opacity-90">
                        BBPS Status: <span className="font-bold">{resData.bbps_status || resData.current_status || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Failure / Refund Info Message */}
                  {(resData.message || resData.refund_status) && (
                    <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs space-y-1">
                      {resData.message && <p className="text-rose-800 font-medium">{resData.message}</p>}
                      {resData.refund_status && (
                        <div className="flex items-center gap-2 text-rose-700 font-bold pt-1 font-mono">
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund Status: {resData.refund_status}</span>
                          {resData.refunded_amount && (
                            <span className="text-slate-900"> (₹{resData.refunded_amount})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Transaction Details Grid */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Merchant / Firm:</span>
                      <span className="font-bold text-slate-900 font-sans text-right">
                        {statusModal.item.firm_name ? `${statusModal.item.firm_name} (${statusModal.item.user_id})` : (statusModal.item.user_id || 'N/A')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Card (Last 4):</span>
                      <span className="font-bold text-purple-700 font-mono">
                        {getCardLast4(statusModal.item) ? `•••• ${getCardLast4(statusModal.item)}` : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Biller:</span>
                      <span className="font-bold text-slate-900 font-sans">{statusModal.item.biller_name || statusModal.item.biller_id}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Customer / Card Holder:</span>
                      <span className="font-bold text-slate-900 font-sans">{statusModal.item.customer_name || 'VALUED CARD HOLDER'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Amount:</span>
                      <span className="font-black text-emerald-600 text-sm">₹{Number(statusModal.item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Service Charge (Slab):</span>
                      <span className="font-bold text-pink-600 font-mono">+₹{getServiceCharge(statusModal.item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Total Deducted:</span>
                      <span className="font-black text-slate-900 font-mono">₹{(Number(statusModal.item.amount || 0) + getServiceCharge(statusModal.item)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">Client Txn ID:</span>
                      <span className="font-bold text-slate-800">{resData.client_transaction_id || statusModal.item.client_transaction_id || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-sans">BBPS Txn Ref ID:</span>
                      <span className="font-bold text-indigo-700">{resData.bbps_txn_ref_id || resData.transaction_id || statusModal.item.bbps_txn_ref_id || 'N/A'}</span>
                    </div>

                    {resData.approval_ref_number && (
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-slate-500 font-sans">Approval Ref No:</span>
                        <span className="font-bold text-emerald-700">{resData.approval_ref_number}</span>
                      </div>
                    )}

                    {resData.polled_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-sans">Polled At:</span>
                        <span className="text-slate-500 text-[11px]">{new Date(resData.polled_at).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setStatusModal(null)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition"
              >
                Close & Refresh
              </button>
            </div>

          </div>
        </div>
      )}

      {/* UPSTREAM API CHARGE SLABS MODAL */}
      {isSlabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-900 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Live Bill Pay - Upstream API Charge Slabs</h3>
                  <p className="text-xs text-slate-500">Configure dynamic cost slabs charged by upstream gateway. Net Profit = User Charge − API Charge.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSlabModalOpen(false);
                  setEditingSlab(null);
                  setSlabNotice(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slab Notice */}
            {slabNotice && (
              <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                slabNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {slabNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{slabNotice.message}</span>
              </div>
            )}

            {/* Add / Edit Form */}
            <form onSubmit={handleSaveSlab} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-purple-600" />
                  <span>{editingSlab ? 'Edit API Slab' : 'Create New API Charge Slab'}</span>
                </h4>
                {editingSlab && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSlab(null);
                      setSlabForm({ min_amount: '', max_amount: '', charge_amount: '', is_active: true });
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500">Min Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50001"
                    value={slabForm.min_amount}
                    onChange={(e) => setSlabForm({ ...slabForm, min_amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500">Max Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 100000"
                    value={slabForm.max_amount}
                    onChange={(e) => setSlabForm({ ...slabForm, max_amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-500">API Charge (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 32.00"
                    value={slabForm.charge_amount}
                    onChange={(e) => setSlabForm({ ...slabForm, charge_amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={slabForm.is_active}
                    onChange={(e) => setSlabForm({ ...slabForm, is_active: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Slab</span>
                </label>

                <button
                  type="submit"
                  disabled={savingSlab}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingSlab ? 'Saving...' : editingSlab ? 'Update Slab' : 'Save Slab'}
                </button>
              </div>
            </form>

            {/* Slabs List Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Configured API Slabs ({apiSlabs.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">Higher amounts auto-scale at ₹16 / 50k</span>
              </div>

              {apiSlabs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No custom slabs found. Using default ₹16 per ₹50,000 calculation.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Range (Amount ₹)</th>
                        <th className="py-2.5 px-3 text-right">API Cost (₹)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {apiSlabs.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-800">
                            ₹{Number(s.min_amount).toLocaleString('en-IN')} — ₹{Number(s.max_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-700">
                            ₹{Number(s.charge_amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              s.is_active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {s.is_active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlab(s);
                                  setSlabForm({
                                    min_amount: String(s.min_amount),
                                    max_amount: String(s.max_amount),
                                    charge_amount: String(s.charge_amount),
                                    is_active: s.is_active !== false
                                  });
                                  setSlabNotice(null);
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                                title="Edit Slab"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlab(s.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Slab"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSlabModalOpen(false);
                  setEditingSlab(null);
                  setSlabNotice(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

