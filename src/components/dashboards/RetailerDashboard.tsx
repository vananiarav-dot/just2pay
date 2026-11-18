import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { qrApi, billRequestApi, b2bApi, payoutApi } from '../../services/api';
import type { QrPaymentRequest } from '../../types/qr';
import type { CreditCardBillRequest } from '../../types/billRequest';
import type { PayoutTransaction } from '../../types/payout';
import { 
  ShieldCheck, CheckCircle2, ArrowUpRight, RefreshCw, Zap, CreditCard, 
  ArrowRightLeft, Calendar, RotateCcw, QrCode, Wallet, ArrowDownLeft, 
  Clock3, AlertCircle, ChevronRight, BadgeCheck
} from 'lucide-react';

interface UnifiedRecentTxn {
  id: string;
  type: 'qr' | 'cc_bill' | 'bbps' | 'payout';
  serviceName: string;
  reference: string;
  identifier: string;
  amount: number;
  charge: number;
  status: 'completed' | 'processing' | 'failed';
  rawStatus: string;
  createdAt: string;
}

// Visual SVG Mini Sparkline component
const Sparkline: React.FC<{ color?: 'emerald' | 'indigo' | 'violet' | 'blue' }> = ({ color = 'emerald' }) => {
  const colorMap = {
    emerald: { stroke: '#059669', gradId: 'grad-emerald' },
    indigo: { stroke: '#4f46e5', gradId: 'grad-indigo' },
    violet: { stroke: '#7c3aed', gradId: 'grad-violet' },
    blue: { stroke: '#2563eb', gradId: 'grad-blue' }
  };
  const cfg = colorMap[color];

  return (
    <svg className="w-full h-7 overflow-visible pointer-events-none" viewBox="0 0 120 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id={cfg.gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={cfg.stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={cfg.stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,20 Q18,26 32,14 T65,16 T94,7 T120,11 L120,28 L0,28 Z"
        fill={`url(#${cfg.gradId})`}
      />
      <path
        d="M0,20 Q18,26 32,14 T65,16 T94,7 T120,11"
        fill="none"
        stroke={cfg.stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const RetailerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [billRequestsList, setBillRequestsList] = useState<CreditCardBillRequest[]>([]);
  const [liveHistoryList, setLiveHistoryList] = useState<any[]>([]);
  const [payoutTxnsList, setPayoutTxnsList] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State (Default: TODAY as requested)
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchUserData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [reqRes, billRes, b2bRes, payoutRes] = await Promise.all([
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        b2bApi.getHistory().catch(() => ({ status: 'error', data: [] })),
        payoutApi.getHistory().catch(() => ({ success: false, transactions: [] }))
      ]);

      if (reqRes.success && reqRes.payment_requests) {
        setRequestsList(reqRes.payment_requests);
      }
      if (billRes.success && billRes.requests) {
        setBillRequestsList(billRes.requests);
      }
      if (b2bRes && (b2bRes.status === 'success' || b2bRes.success) && Array.isArray(b2bRes.data)) {
        setLiveHistoryList(b2bRes.data);
      }
      if (payoutRes.success && Array.isArray(payoutRes.transactions)) {
        setPayoutTxnsList(payoutRes.transactions);
      }
    } catch (err) {
      console.error('Fetch User Dashboard Data Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData(true);
    const interval = setInterval(() => {
      fetchUserData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Helper to check if a record matches the selected date filter
  const isWithinDateFilter = (createdAt?: string | null) => {
    if (dateFilter === 'ALL') return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    const t = d.getTime();
    if (isNaN(t)) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    if (dateFilter === 'TODAY') {
      return t >= startOfToday && t <= endOfToday;
    } else if (dateFilter === 'YESTERDAY') {
      const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
      const endOfYesterday = startOfToday - 1;
      return t >= startOfYesterday && t <= endOfYesterday;
    } else if (dateFilter === 'LAST_7_DAYS') {
      const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
      return t >= startOf7Days && t <= endOfToday;
    } else if (dateFilter === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      return t >= startOfMonth && t <= endOfToday;
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
      return true;
    }
    return true;
  };

  // 1. QR Add Money
  const filteredQrRequests = requestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedQrRequests = filteredQrRequests.filter(r => r.status === 'approved');
  const totalApprovedQrAmount = approvedQrRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalQrCharges = approvedQrRequests.reduce((acc, r) => {
    const charge = r.charge_amount !== undefined 
      ? Number(r.charge_amount) 
      : (Number(r.amount || 0) * (Number(r.charge_percent || 0.5) / 100));
    return acc + charge;
  }, 0);

  // 2. Offline Credit Card Bill
  const filteredBillRequests = billRequestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedBillRequests = filteredBillRequests.filter(r => r.status === 'approved');
  const totalCcBillVolume = approvedBillRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalCcBillCharges = approvedBillRequests.reduce((acc, r) => acc + Number(r.service_charge || 0), 0);

  // 3. Live BBPS Bill Pay
  const filteredLiveHistory = liveHistoryList.filter(r => isWithinDateFilter(r.created_at || r.createdAt || r.date || r.timestamp));
  const successfulLivePayments = filteredLiveHistory.filter(r => r.status === 'success' || r.status === 'approved');
  const totalLiveBillVolume = successfulLivePayments.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalLiveBillCharges = successfulLivePayments.reduce((acc, r) => {
    const raw = Number(r.service_charge ?? r.charge_amount ?? r.charge ?? 0);
    if (raw > 0) return acc + raw;
    const amt = Number(r.amount || 0);
    return acc + (amt <= 50000 ? 25 : (amt <= 100000 ? 50 : 75));
  }, 0);

  // 4. Instant Payout
  const filteredPayoutTxns = payoutTxnsList.filter(t => isWithinDateFilter(t.created_at || (t as any).createdAt));
  const successfulPayouts = filteredPayoutTxns.filter(t => t.status === 'success');
  const totalPayoutVolume = successfulPayouts.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalPayoutCharges = successfulPayouts.reduce((acc, t) => acc + Number(t.slab_charge || 0), 0);

  // Calculate First Name & Middle Name only for greeting
  const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
  const displayName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : (user?.name || 'Retailer');

  // Unified Recent Live Transactions across all 4 services
  const recentTransactions = useMemo<UnifiedRecentTxn[]>(() => {
    const combined: UnifiedRecentTxn[] = [];

    // QR requests
    requestsList.forEach(r => {
      combined.push({
        id: `qr-${r.id}`,
        type: 'qr',
        serviceName: 'QR Add Money',
        reference: r.utr_number ? `UTR: ${r.utr_number}` : `REQ-#${r.id}`,
        identifier: r.customer_mobile || r.payer_name || 'UPI Collection',
        amount: Number(r.amount || 0),
        charge: Number(r.charge_amount || 0),
        status: r.status === 'approved' ? 'completed' : r.status === 'rejected' ? 'failed' : 'processing',
        rawStatus: r.status,
        createdAt: r.created_at
      });
    });

    // CC Bill requests
    billRequestsList.forEach(b => {
      combined.push({
        id: `cc-${b.id}`,
        type: 'cc_bill',
        serviceName: 'CC Bill Pay',
        reference: b.reference_id ? `REF: ${b.reference_id}` : `CC-#${b.id}`,
        identifier: b.bank_name ? `${b.bank_name} (••${b.card_last_4 || '••••'})` : `Card ••${b.card_last_4 || '••••'}`,
        amount: Number(b.amount || 0),
        charge: Number(b.service_charge || 0),
        status: b.status === 'approved' ? 'completed' : b.status === 'rejected' ? 'failed' : 'processing',
        rawStatus: b.status,
        createdAt: b.created_at
      });
    });

    // BBPS Live
    liveHistoryList.forEach((live, idx) => {
      const isOk = live.status === 'success' || live.status === 'approved';
      const isFail = live.status === 'failed' || live.status === 'rejected';
      combined.push({
        id: `bbps-${live.id || idx}`,
        type: 'bbps',
        serviceName: live.operator || 'Live BBPS',
        reference: live.txnid || live.operator_ref || `BBPS-${live.id || idx}`,
        identifier: live.canumber || live.account || live.mobile || 'Utility Bill',
        amount: Number(live.amount || 0),
        charge: Number(live.service_charge ?? live.charge_amount ?? 0),
        status: isOk ? 'completed' : isFail ? 'failed' : 'processing',
        rawStatus: live.status || 'success',
        createdAt: live.created_at || live.createdAt || live.date || ''
      });
    });

    // Payouts
    payoutTxnsList.forEach(p => {
      combined.push({
        id: `payout-${p.id}`,
        type: 'payout',
        serviceName: 'Instant Payout',
        reference: p.utr ? `UTR: ${p.utr}` : `PO-#${p.id}`,
        identifier: p.beneficiary_name ? `${p.beneficiary_name} (${p.account_number ? '••' + p.account_number.slice(-4) : 'A/C'})` : (p.account_number ? `A/C ••${p.account_number.slice(-4)}` : 'Bank Transfer'),
        amount: Number(p.amount || 0),
        charge: Number(p.slab_charge || 0),
        status: p.status === 'success' ? 'completed' : p.status === 'failed' ? 'failed' : 'processing',
        rawStatus: p.status,
        createdAt: p.created_at || (p as any).createdAt || ''
      });
    });

    // Sort descending by date
    return combined
      .filter(x => x.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 7);
  }, [requestsList, billRequestsList, liveHistoryList, payoutTxnsList]);

  const handleNavigate = (path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const formatTxnTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Just now';
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
      
      {/* EXECUTIVE GREETING & DATE FILTER ROW */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {displayName}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Outlet: <strong className="text-slate-700 font-semibold">{user?.firm_name || 'Retail Outlet'}</strong> • ID: <span className="font-mono text-slate-600">ES{user?.id || '8472'}</span>
          </p>
        </div>

        {/* Top-Right Corner Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl px-3 py-2 text-xs transition shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer pr-1 font-semibold"
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="ALL">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs animate-in fade-in shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          )}

          {dateFilter !== 'TODAY' && (
            <button
              onClick={() => {
                setDateFilter('TODAY');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition border border-slate-200 shadow-2xs cursor-pointer font-medium"
              title="Reset filter to Today"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => fetchUserData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 CONSOLIDATED DUAL-METRIC SERVICE CARDS (OPTION A EXACT SPEC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: QR PAYMENTS */}
        <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <QrCode className="w-4 h-4" />
                </div>
                QR Payments
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Volume</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalApprovedQrAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">QR Charges:</span>
              <span className="font-bold text-slate-800 font-mono">
                ₹{totalQrCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="emerald" />
            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                {approvedQrRequests.length} Approved Requests
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: CREDIT CARD BILL */}
        <div className="bg-white border border-slate-200/90 hover:border-cyan-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100">
                  <CreditCard className="w-4 h-4" />
                </div>
                Credit Card Bill
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                Instant
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Settled Volume</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalCcBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Service Fees:</span>
              <span className="font-bold text-slate-800 font-mono">
                ₹{totalCcBillCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="indigo" />
            <div className="flex items-center justify-between text-[11px] text-cyan-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-600" />
                {approvedBillRequests.length} Settled Requests
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: LIVE BBPS UTILITIES */}
        <div className="bg-white border border-slate-200/90 hover:border-violet-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                  <Zap className="w-4 h-4" />
                </div>
                Live BBPS Utilities
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Live
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Volume</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalLiveBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Live Charges:</span>
              <span className="font-bold text-slate-800 font-mono">
                ₹{totalLiveBillCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="violet" />
            <div className="flex items-center justify-between text-[11px] text-violet-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-violet-600" />
                {successfulLivePayments.length} Paid Bills
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: INSTANT PAYOUT */}
        <div className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                Instant Payout
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                24x7 IMPS
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Disbursed Volume</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalPayoutVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Slab Charges:</span>
              <span className="font-bold text-slate-800 font-mono">
                ₹{totalPayoutCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="blue" />
            <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                {successfulPayouts.length} Settled Transfers
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2-COLUMN LOWER CONTAINER (RECENT TRANSACTIONS & WALLET / ACCOUNT PROFILE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: RECENT LIVE TRANSACTIONS (8 COLS ON LG) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Recent Live Transactions
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Real-time Stream</span>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                  <th className="pb-3 pl-1 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Service</th>
                  <th className="pb-3 font-semibold">Details / Account</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 pr-1 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 pl-1 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {formatTxnTime(tx.createdAt)}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block">{tx.serviceName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tx.reference}</span>
                      </td>
                      <td className="py-3 text-slate-600 max-w-[160px] truncate">
                        {tx.identifier}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-1 text-center whitespace-nowrap">
                        {tx.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> COMPLETED
                          </span>
                        )}
                        {tx.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                            <Clock3 className="w-3 h-3" /> PROCESSING
                          </span>
                        )}
                        {tx.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> FAILED
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No transactions recorded for the selected period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK WALLET OVERVIEW & ACCOUNT SECURITY (4 COLS ON LG) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QUICK WALLET OVERVIEW CARD */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> Quick Wallet Overview
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Balance
              </span>
            </div>

            <div className="space-y-3">
              {/* Main Wallet Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Available Main Wallet</p>
                    <p className="text-xl font-black font-mono tracking-tight text-white mt-0.5">
                      ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                </div>
              </div>

              {/* POS Multi-Wallet Card - ONLY SHOWN IF POS IS ASSIGNED TO USER */}
              {Array.isArray(user?.assigned_pos_machine_ids) && user.assigned_pos_machine_ids.length > 0 && user.pos_allowed_settlement_types !== 'NONE' && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 text-white shadow-sm border border-emerald-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-400 block">🟢 POS Wallet (T+0)</span>
                      <p className="text-base font-black font-mono text-emerald-300 mt-0.5">
                        ₹{Number(user?.pos_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[9px] text-emerald-200/60">Live Spendable</span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-bold text-purple-400 block">🟣 POS T+1 (Tomorrow)</span>
                      <p className="text-base font-black font-mono text-purple-300 mt-0.5">
                        ₹{Number(user?.pos_t1_pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[9px] text-purple-200/60">Clearing Tomorrow</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => handleNavigate('/pos-requests')}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition cursor-pointer text-center"
                    >
                      + Submit POS Swipe Slip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Service Links */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleNavigate('/qr-payments')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition cursor-pointer group"
              >
                <p className="font-bold text-slate-800 group-hover:text-emerald-700 flex items-center justify-between">
                  QR Add Money <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                </p>
                <p className="text-[10px] text-slate-400">Scan & Collect</p>
              </button>

              <button
                onClick={() => handleNavigate('/cc-bill-pay')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40 text-left transition cursor-pointer group"
              >
                <p className="font-bold text-slate-800 group-hover:text-cyan-700 flex items-center justify-between">
                  CC Bill Pay <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600" />
                </p>
                <p className="text-[10px] text-slate-400">Card Settlement</p>
              </button>
            </div>
          </div>

          {/* ACCOUNT SECURITY CARD */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Account Security & Profile
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Merchant Outlet</span>
                <span className="font-bold text-slate-900">{user?.firm_name || 'Retailer Outlet'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Registered Phone</span>
                <span className="font-mono font-bold text-slate-900">{user?.mobile_number}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> {user?.status || 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">KYC Verification</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-[11px] uppercase">
                  {user?.kyc_status || 'Verified'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
