import React, { useState, useEffect } from 'react';
import { billRequestApi } from '../../services/api';
import type { ChargeSlab, CreditCardBillRequest } from '../../types/billRequest';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Copy,
  Building2,
  User,
  Sliders,
  DollarSign,
  Calendar,
  RotateCcw,
  Filter,
  Phone,
  FileText,
  StickyNote,
  IndianRupee,
  Percent
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const AdminBillRequestsManagement: React.FC = () => {
  const [requests, setRequests] = useState<CreditCardBillRequest[]>([]);
  const [slabs, setSlabs] = useState<ChargeSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Rejection Modal
  const [rejectingReq, setRejectingReq] = useState<CreditCardBillRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Edit Note Modal
  const [editingNoteReq, setEditingNoteReq] = useState<CreditCardBillRequest | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Add Slab Modal
  const [isSlabModalOpen, setIsSlabModalOpen] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  // Settings Toggle State
  const { ccBillPayEnabled, toggleCcBillPay, fetchSettings: fetchCcSettings } = useSettingsStore();
  const [isTogglingCc, setIsTogglingCc] = useState(false);
  const [toggleNotice, setToggleNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      fetchCcSettings();
      const [reqRes, slabRes] = await Promise.all([
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        billRequestApi.getSlabs().catch(() => ({ success: false, slabs: [] }))
      ]);

      if (reqRes.success && Array.isArray(reqRes.requests)) {
        setRequests(reqRes.requests);
      }
      if (slabRes.success && Array.isArray(slabRes.slabs)) {
        setSlabs(slabRes.slabs);
      }
    } catch (err: any) {
      console.error('Failed to load bill requests:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const showNotice = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleProcess = async (req: CreditCardBillRequest, action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !rejectingReq) {
      setRejectingReq(req);
      setRejectionReason('');
      return;
    }

    try {
      setSubmitting(true);
      const res = await billRequestApi.processRequest(
        req.id,
        action,
        action === 'rejected' ? rejectionReason : undefined
      );

      if (res.success) {
        showNotice('success', res.message);
        setRejectingReq(null);
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to process request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minAmount || !maxAmount || !chargeAmount) {
      showNotice('error', 'Please fill all slab fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await billRequestApi.createSlab({
        min_amount: Number(minAmount),
        max_amount: Number(maxAmount),
        charge_amount: Number(chargeAmount)
      });

      if (res.success) {
        showNotice('success', 'New charge slab created!');
        setIsSlabModalOpen(false);
        setMinAmount('');
        setMaxAmount('');
        setChargeAmount('');
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to add slab');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlab = async (id: string) => {
    try {
      setSubmitting(true);
      const res = await billRequestApi.deleteSlab(id);
      if (res.success) {
        showNotice('success', 'Slab deleted!');
        loadData();
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || 'Failed to delete slab');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCard = (card: string, id: string) => {
    navigator.clipboard.writeText(card);
    setCopiedId(`card_${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyMobile = (mobile: string, id: string) => {
    navigator.clipboard.writeText(mobile);
    setCopiedId(`mob_${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openNoteModal = (req: CreditCardBillRequest) => {
    setEditingNoteReq(req);
    setNoteInput(req.admin_note || '');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNoteReq) return;
    setSavingNote(true);
    try {
      const res = await billRequestApi.updateNote(editingNoteReq.id, noteInput);
      if (res.success) {
        showNotice('success', 'Admin note saved successfully!');
        setRequests(prev => prev.map(r => r.id === editingNoteReq.id ? { ...r, admin_note: noteInput.trim() } : r));
        setEditingNoteReq(null);
      } else {
        showNotice('error', res.message || 'Failed to save note');
      }
    } catch (err: any) {
      showNotice('error', err.response?.data?.message || err.message || 'Error saving note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleToggleCc = async () => {
    setIsTogglingCc(true);
    setToggleNotice(null);
    try {
      const res = await toggleCcBillPay();
      if (res.success) {
        setToggleNotice({
          type: 'success',
          message: res.enabled 
            ? '✅ CC Bill Pay Service is ACTIVE! New request form & charge slabs are now VISIBLE to users.' 
            : '🔒 CC Bill Pay Service is OFF! New request form & charge slabs are HIDDEN, and "Service Temporarily Off" message is shown to users.'
        });
      } else {
        setToggleNotice({
          type: 'error',
          message: res.message || 'Failed to update Credit Card Bill Pay toggle.'
        });
      }
    } catch (err: any) {
      setToggleNotice({
        type: 'error',
        message: err.message || 'An unexpected error occurred while toggling Credit Card Bill Pay.'
      });
    } finally {
      setIsTogglingCc(false);
    }
  };

  const isAnyFilterActive = Boolean(
    searchQuery.trim() ||
    filterStatus !== 'all' ||
    dateFilter !== 'ALL' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const filteredRequests = requests.filter(req => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!req.created_at) return false;
      const d = new Date(req.created_at);
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

    // 2. Status Filter
    if (filterStatus !== 'all' && req.status !== filterStatus) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        req.customer_name.toLowerCase().includes(q) ||
        req.card_number.includes(q) ||
        req.bank_name.toLowerCase().includes(q) ||
        (req.user_name || '').toLowerCase().includes(q) ||
        (req.mobile_number || '').includes(q) ||
        (req.user_mobile || '').includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const pendingCount = pendingRequests.length;
  const approvedCount = approvedRequests.length;
  const rejectedCount = rejectedRequests.length;

  const totalVolume = requests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalApprovedBillAmount = approvedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalApprovedChargeAmount = approvedRequests.reduce((sum, r) => sum + (Number(r.service_charge) || 0), 0);
  const totalPendingBillAmount = pendingRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalRejectedBillAmount = rejectedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 sm:p-5 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                CC Bill Payment Requests & Control
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Review offline Credit Card bill payments and control Retailer panel CC Bill Pay menu & route access
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions: Slabs Button & Toggle Switch in Top Right Corner */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsSlabModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-indigo-700 font-bold text-xs transition shadow-xs cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Charge Slabs ({slabs.length})</span>
          </button>

          {/* TOP RIGHT CORNER: CC BILL PAY TOGGLE SWITCH */}
          <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl shadow-xs">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <CreditCard className={`w-3.5 h-3.5 ${ccBillPayEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black text-slate-900">New Request & Slabs</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                  ccBillPayEnabled 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {ccBillPayEnabled ? 'ACTIVE / VISIBLE' : 'SERVICE OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {ccBillPayEnabled 
                  ? 'Request form & slabs are visible to users' 
                  : 'Form & slabs hidden ("Service Temporarily Off" shown)'}
              </p>
            </div>

            {/* TOGGLE BUTTON */}
            <button
              type="button"
              role="switch"
              aria-checked={ccBillPayEnabled}
              disabled={isTogglingCc}
              onClick={handleToggleCc}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                ccBillPayEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              } ${isTogglingCc ? 'opacity-70 cursor-not-allowed' : ''}`}
              title={ccBillPayEnabled ? 'Click to Turn OFF CC Bill Pay on User Panel' : 'Click to Turn ON CC Bill Pay on User Panel'}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-all duration-300 flex items-center justify-center`}
              >
                {isTogglingCc ? (
                  <RefreshCw className="w-3 h-3 text-slate-700 animate-spin" />
                ) : ccBillPayEnabled ? (
                  <Check className="w-3 h-3 text-emerald-600 font-bold" />
                ) : (
                  <X className="w-3 h-3 text-slate-400" />
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {toggleNotice && (
        <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          toggleNotice.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {toggleNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toggleNotice.message}</span>
          </div>
          <button onClick={() => setToggleNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Cards (Consolidated 4-Card Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Requests */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-black text-slate-900">{requests.length}</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Vol: ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Earned Charges</span>
              <span className="font-bold text-purple-700 font-mono">
                ₹{totalApprovedChargeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Pending Review */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                ₹{totalPendingBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingCount} Pending
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Pending Requests</span>
              <span className="font-bold text-amber-700">
                {pendingCount} {pendingCount === 1 ? 'request' : 'requests'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Approved Bills */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Approved Bills</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                ₹{totalApprovedBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {approvedCount} Approved
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Earned Charges</span>
              <span className="font-bold text-purple-700 font-mono">
                + ₹{totalApprovedChargeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Rejected & Refunded */}
        <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Rejected & Refunded</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                ₹{totalRejectedBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {rejectedCount} Rejected
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Refund Status</span>
              <span className="font-bold text-rose-600">Auto-Refunded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Filter Bill Requests
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              {filteredRequests.length}{filteredRequests.length !== requests.length ? ` / ${requests.length}` : ''}
            </span>
          </div>

          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, card, bank, mobile..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
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

          {/* Date Range Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer pr-2 font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs (when dateFilter === 'CUSTOM') */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-indigo-200 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-[11px] text-slate-600 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
              <span className="text-[11px] text-slate-600 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Requests ({requests.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="rejected">Reject ({rejectedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bill Payment Requests Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-medium">Loading requests list...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-slate-400 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-800">No requests found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? `No requests match "${searchQuery}"` : 'No credit card bill payment requests submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Retailer / Merchant</th>
                  <th className="py-3.5 px-4">Customer & Card</th>
                  <th className="py-3.5 px-4">Customer Mobile</th>
                  <th className="py-3.5 px-4">Bank Name</th>
                  <th className="py-3.5 px-4">Bill Amount</th>
                  <th className="py-3.5 px-4">Slab Charge</th>
                  <th className="py-3.5 px-4">Total Debited</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    {/* Date & Time (1st Column) */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {req.created_at ? (
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="font-bold text-slate-800">
                            {new Date(req.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(req.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">N/A</span>
                      )}
                    </td>

                    {/* Retailer */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{req.user_name || 'Retailer'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {req.user_mobile ? `+91 ${req.user_mobile}` : 'N/A'}
                      </p>
                    </td>

                    {/* Customer & Card */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-800">{req.customer_name}</p>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-600 font-bold mt-0.5">
                        <span>{req.card_number.replace(/(.{4})/g, '$1 ').trim()}</span>
                        <button
                          onClick={() => copyCard(req.card_number, req.id)}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title="Copy Full Card Number"
                        >
                          {copiedId === `card_${req.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {req.admin_note && (
                        <div 
                          onClick={() => openNoteModal(req)}
                          className="mt-1.5 flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2 py-0.5 text-[10px] font-mono cursor-pointer hover:bg-amber-100 transition w-fit max-w-[220px]"
                          title={`Admin Note: ${req.admin_note} (Click to edit)`}
                        >
                          <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">{req.admin_note}</span>
                        </div>
                      )}
                    </td>

                    {/* Customer Mobile */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {req.mobile_number ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 font-bold">
                          <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>+91 {req.mobile_number}</span>
                          <button
                            onClick={() => copyMobile(req.mobile_number, req.id)}
                            className="text-slate-400 hover:text-indigo-600 transition p-0.5 rounded hover:bg-slate-100"
                            title="Copy Customer Mobile Number"
                          >
                            {copiedId === `mob_${req.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">N/A</span>
                      )}
                    </td>

                    {/* Bank Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.bank_name}</span>
                      </div>
                    </td>

                    {/* Bill Amount */}
                    <td className="py-4 px-4 font-black text-slate-900">
                      ₹{Number(req.amount).toLocaleString('en-IN')}
                    </td>

                    {/* Slab Charge */}
                    <td className="py-4 px-4 font-bold text-amber-600">
                      ₹{req.service_charge}
                    </td>

                    {/* Total Debited */}
                    <td className="py-4 px-4 font-black text-emerald-600">
                      ₹{Number(req.total_amount).toLocaleString('en-IN')}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {req.status === 'pending' && <Clock className="w-3 h-3 animate-pulse" />}
                        <span>{req.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleProcess(req, 'approved')}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcess(req, 'rejected')}
                            disabled={submitting}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => openNoteModal(req)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                              req.admin_note 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={req.admin_note ? 'Edit Admin Note' : 'Add Admin Note'}
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span className="hidden xl:inline text-[10px]">{req.admin_note ? 'Edit Note' : 'Note'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-slate-400 font-medium">Processed</span>
                          <button
                            onClick={() => openNoteModal(req)}
                            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer ${
                              req.admin_note
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={req.admin_note ? 'Edit Admin Note' : 'Add Admin Note'}
                          >
                            <FileText className="w-3 h-3 text-amber-600" />
                            <span>{req.admin_note ? 'Edit Note' : '+ Note'}</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reject Request & Refund Wallet?</h3>
                <p className="text-xs text-slate-500 mt-0.5">₹{Number(rejectingReq.total_amount).toLocaleString('en-IN')} will be credited back to user wallet instantly.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Invalid Card Details / Verification Failure"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProcess(rejectingReq, 'rejected')}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Reject & Refund Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHARGE SLABS MODAL */}
      {isSlabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" /> Manage Dynamic Service Charge Slabs
              </h3>
              <button onClick={() => setIsSlabModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Slabs List */}
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase text-slate-500">Current Charge Slabs</p>
              {slabs.map((slab) => (
                <div key={slab.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">
                      ₹{Number(slab.min_amount).toLocaleString('en-IN')} to ₹{Number(slab.max_amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-600">₹{slab.charge_amount} Charge</span>
                    <button
                      onClick={() => handleDeleteSlab(slab.id)}
                      className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                      title="Delete Slab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Slab Form */}
            <form onSubmit={handleAddSlab} className="pt-3 border-t border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-800">Add New Service Charge Slab</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Min Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Max Amount</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600 font-bold mb-1">Charge (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 25"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Charge Slab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INTERNAL ADMIN NOTE MODAL */}
      {editingNoteReq && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !savingNote && setEditingNoteReq(null)}
        >
          <div 
            className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Admin Internal Note
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      Confidential
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Private reference for <strong className="text-slate-800">{editingNoteReq.customer_name}</strong>'s bill request
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteReq(null)}
                disabled={savingNote}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Summary Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Request ID</span>
                <span className="font-mono text-slate-800 font-bold">{editingNoteReq.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Bank & Card</span>
                <span className="font-bold text-slate-900">{editingNoteReq.bank_name} •••• {editingNoteReq.card_number.slice(-4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Bill Amount</span>
                <span className="font-black text-emerald-600 font-mono">₹{Number(editingNoteReq.amount).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  editingNoteReq.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : editingNoteReq.status === 'rejected'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {editingNoteReq.status}
                </span>
              </div>
            </div>

            {/* Confidential Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
              <StickyNote className="w-4 h-4 text-amber-600 shrink-0" />
              <span>આ નોંધ ફક્ત Admin ની જાણકારી માટે છે. User કે Retailer ને દેખાશે નહીં.</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Admin Note / Remarks
                  </label>
                  {noteInput.trim() && (
                    <button
                      type="button"
                      onClick={() => setNoteInput('')}
                      className="text-[10px] text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    >
                      Clear Note
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="દા.ત. Netbanking UTR: 48921849, Verified on ICICI portal, customer confirmed on call..."
                  className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded-2xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans resize-none"
                  disabled={savingNote}
                />
              </div>

              {/* Quick Tags / Chips */}
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Quick Tags:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Paid via Netbanking',
                    'UTR Generated',
                    'Waiting Bank Confirmation',
                    'Customer Verified',
                    'Card Payment Hold',
                    'Refund Initiated'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNoteInput(prev => prev ? `${prev} | ${tag}` : tag)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-[10px] font-semibold transition border border-slate-200 cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNoteReq(null)}
                  disabled={savingNote}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingNote ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
