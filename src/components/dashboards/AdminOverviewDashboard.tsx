import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { qrApi, userApi, billRequestApi, b2bApi, payoutApi } from '../../services/api';
import type { QrPaymentRequest } from '../../types/qr';
import type { UserProfile } from '../../types/auth';
import type { CreditCardBillRequest } from '../../types/billRequest';
import type { PayoutTransaction } from '../../types/payout';
import type { UsePayBalanceData, ApiWalletType } from '../../types/b2b';
import { ApiWalletFundRequestModal } from '../b2b/ApiWalletFundRequestModal';
import { 
  CheckCircle2, ShieldCheck, Users, Building2, Wallet, 
  ArrowUpRight, Clock, RefreshCw, Coins, Award, Zap, CreditCard, Receipt,
  ArrowRightLeft, IndianRupee, Calendar, RotateCcw, Filter, CircleDollarSign,
  AlertCircle, Server, Download, TrendingUp, SlidersHorizontal,
  ChevronDown, QrCode, Layers, Sparkles
} from 'lucide-react';

export const AdminOverviewDashboard: React.FC = () => {
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [billRequestsList, setBillRequestsList] = useState<CreditCardBillRequest[]>([]);
  const [liveHistoryList, setLiveHistoryList] = useState<any[]>([]);
  const [payoutTxnsList, setPayoutTxnsList] = useState<PayoutTransaction[]>([]);
  const [usepayData, setUsepayData] = useState<UsePayBalanceData | null>(null);
  const [usepayLoading, setUsepayLoading] = useState(false);
  const [usepayError, setUsepayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // API Fund Request Modal State
  const [showFundRequestModal, setShowFundRequestModal] = useState<boolean>(false);
  const [fundRequestDefaultWallet, setFundRequestDefaultWallet] = useState<ApiWalletType>('bbps');

  // Date Filter State (Default: TODAY)
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchUsepayBalanceOnly = async () => {
    setUsepayLoading(true);
    try {
      const res = await b2bApi.getUsepayBalance();
      if (res && res.success && res.data) {
        setUsepayData(res.data);
        if (res.message && res.is_mock) {
          setUsepayError(res.message);
        } else {
          setUsepayError(null);
        }
      } else if (res && res.message) {
        setUsepayError(res.message);
      }
    } catch (err: any) {
      console.error('Fetch UsePay Balance Error:', err);
    } finally {
      setUsepayLoading(false);
    }
  };

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [reqRes, userRes, billRes, b2bRes, payoutRes, usepayRes] = await Promise.all([
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] })),
        userApi.getHierarchy().catch(() => ({ success: false, users: [] })),
        billRequestApi.getRequests().catch(() => ({ success: false, requests: [] })),
        b2bApi.getHistory().catch(() => ({ status: 'error', data: [] })),
        payoutApi.getHistory().catch(() => ({ success: false, transactions: [] })),
        b2bApi.getUsepayBalance().catch(() => ({ success: false, data: null }))
      ]);

      if (reqRes.success && reqRes.payment_requests) {
        setRequestsList(reqRes.payment_requests);
      }
      if (userRes.success && userRes.users) {
        setUsersList(userRes.users);
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
      if (usepayRes && usepayRes.success && usepayRes.data) {
        setUsepayData(usepayRes.data);
        if (usepayRes.message && usepayRes.is_mock) {
          setUsepayError(usepayRes.message);
        } else {
          setUsepayError(null);
        }
      } else if (usepayRes && usepayRes.message) {
        setUsepayError(usepayRes.message);
      }
    } catch (err) {
      console.error('Fetch Overview Data Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    // Realtime listener for live updates with 0 continuous polling egress
    const channel = supabase
      .channel('realtime_admin_dashboard_qr')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qr_payment_requests' },
        () => {
          fetchData(false);
        }
      )
      .subscribe();

    // Safety fallback interval: 60s
    const interval = setInterval(() => {
      fetchData(false);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
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

  // Filter QR requests with date filter
  const filteredQrRequests = requestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedRequests = filteredQrRequests.filter(r => r.status === 'approved');
  const pendingRequests = filteredQrRequests.filter(r => r.status === 'pending');

  // Filter offline bill requests with date filter
  const filteredBillRequests = billRequestsList.filter(r => isWithinDateFilter(r.created_at));
  const approvedBillRequests = filteredBillRequests.filter(r => r.status === 'approved');
  const pendingBillRequests = filteredBillRequests.filter(r => r.status === 'pending');

  // Filter live BBPS payments with date filter
  const filteredLiveHistory = liveHistoryList.filter(r => isWithinDateFilter(r.created_at || r.createdAt || r.date || r.timestamp));
  const successfulLivePayments = filteredLiveHistory.filter(r => r.status === 'success' || r.status === 'approved');

  // Filter payout transactions with date filter
  const filteredPayoutTxns = payoutTxnsList.filter(t => isWithinDateFilter(t.created_at || (t as any).createdAt));
  const successfulPayouts = filteredPayoutTxns.filter(t => t.status === 'success');
  const pendingPayouts = filteredPayoutTxns.filter(t => t.status === 'pending');

  // 1. Total Approved QR Amount
  const totalApprovedAmount = approvedRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  // 2. Total Admin QR Charge Commission
  const totalAdminCommission = approvedRequests.reduce((acc, r) => {
    const rawChargeAmt = r.charge_amount !== undefined && r.charge_amount !== null
      ? Number(r.charge_amount)
      : null;
    const rawChargePct = r.charge_percent !== undefined && r.charge_percent !== null
      ? Number(r.charge_percent)
      : null;

    const chargeAmt = rawChargeAmt !== null
      ? rawChargeAmt
      : (rawChargePct !== null ? (Number(r.amount) * (rawChargePct / 100)) : 0);

    const dsComm = Number(r.distributor_commission || 0);
    const msComm = Number(r.super_distributor_commission || 0);
    const adminComm = r.admin_commission !== undefined && r.admin_commission !== null
      ? Number(r.admin_commission) 
      : Math.max(0, chargeAmt - (dsComm + msComm));
    return acc + adminComm;
  }, 0);

  // 3. Total Distributor Earning (DS)
  const totalDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.distributor_commission || 0);
  }, 0);

  // 4. Total Master Distributor Earning (MS)
  const totalMasterDistributorEarning = approvedRequests.reduce((acc, r) => {
    return acc + Number(r.super_distributor_commission || 0);
  }, 0);

  // 5. CC Bill Service Charges Breakdown (Offline + Live BBPS)
  const offlineBillServiceCharge = approvedBillRequests.reduce((acc, r) => acc + Number(r.service_charge || 0), 0);
  const liveBillServiceCharge = successfulLivePayments.reduce((acc, r) => {
    const raw = Number(r.service_charge ?? r.charge_amount ?? r.charge ?? 0);
    if (raw > 0) return acc + raw;
    const amt = Number(r.amount || 0);
    return acc + (amt <= 50000 ? 25 : (amt <= 100000 ? 50 : 75));
  }, 0);
  const totalBillServiceCharge = offlineBillServiceCharge + liveBillServiceCharge;

  // 6. CC Bill Volume Breakdown (Offline + Live BBPS)
  const offlineBillVolume = approvedBillRequests.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const liveBillVolume = successfulLivePayments.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalApprovedBillAmount = offlineBillVolume + liveBillVolume;

  // 7. Total Payout Volume
  const totalPayoutVolume = successfulPayouts.reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 8. Total Payout Charges
  const totalPayoutCharges = successfulPayouts.reduce((acc, t) => acc + Number(t.slab_charge || 0), 0);

  // 9. Total Combined Platform Charges (Admin QR Commission + CC Bill Charges + Payout Charges)
  const totalCombinedCharges = totalAdminCommission + totalBillServiceCharge + totalPayoutCharges;

  // Platform wallet stats
  const totalSystemBalance = usersList.reduce((acc, u) => acc + Number(u.wallet_balance || 0), 0);
  const activeUserCount = usersList.filter(u => u.status === 'Active').length;

  // CSV Report Exporter
  const handleExport = () => {
    const data = [
      ['Metric', 'Value'],
      ['Date Filter', dateFilter],
      ['Total Approved QR Amount', totalApprovedAmount.toFixed(2)],
      ['Total Admin Commission', totalAdminCommission.toFixed(2)],
      ['Distributor Earning (DS)', totalDistributorEarning.toFixed(2)],
      ['Master Dist Earning (MS)', totalMasterDistributorEarning.toFixed(2)],
      ['CC Bill Service Charge', totalBillServiceCharge.toFixed(2)],
      ['Total CC Bill Volume', totalApprovedBillAmount.toFixed(2)],
      ['Total Payout Volume', totalPayoutVolume.toFixed(2)],
      ['Total Payout Charges', totalPayoutCharges.toFixed(2)],
      ['Total Combined Revenue', totalCombinedCharges.toFixed(2)],
      ['Active Accounts', `${activeUserCount} / ${usersList.length}`],
      ['Total User Wallets', totalSystemBalance.toFixed(2)],
      ['Instant Payout Wallet', usepayData?.payout_wallet_balance || '0'],
      ['BBPS Utility Wallet', usepayData?.bbps_wallet_balance || '0'],
    ];
    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `just2pay_metrics_${dateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 w-full pb-14 animate-in fade-in duration-300">
      
      {/* ========================================================
          1. FINANCIAL STREAMS & SETTLEMENT ENGINES (1ST POSITION)
          ======================================================== */}
      {/* SECTION HEADER & TOP FILTER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Financial Streams & Settlement Engines
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Reconciliation
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-channel volume ledgers, tier commissions & upstream liquidity pools
            </p>
          </div>
        </div>

        {/* Right Controls: Rails Badge, Period dropdown, Export button, Filter toggle, Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="hidden xl:inline-flex px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            3 Active Payment Rails
          </span>

          {/* Period selector pill */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-bold rounded-2xl pl-4 pr-9 py-2.5 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition"
            >
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="ALL">All Time</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Export CSV Summary"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>

          {/* Filter Pill Button */}
          <button
            onClick={() => {
              if (dateFilter === 'ALL') setDateFilter('TODAY');
              else setDateFilter('ALL');
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition shadow-2xs cursor-pointer ${
              dateFilter !== 'ALL'
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          {/* Live Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl text-xs transition disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers (Shown if CUSTOM selected) */}
      {dateFilter === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 bg-white border border-indigo-200 p-4 rounded-2xl shadow-xs animate-in fade-in">
          <span className="text-xs font-bold text-slate-700">Custom Date Filter:</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            onClick={() => {
              setDateFilter('TODAY');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Today
          </button>
        </div>
      )}

      {/* 3 CORE TRANSACTION VERTICALS (QR, CC, PAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. QR PAYMENT GATEWAY DESK */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border border-emerald-200/90 rounded-[28px] p-6 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-200/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 border border-emerald-200/90 flex items-center justify-center shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">QR Payment Gateway</h3>
                  <p className="text-[11px] font-semibold text-slate-400">Merchant Collections</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200 font-extrabold text-[10px]">
                Instant UPI
              </span>
            </div>

            <div className="mt-2">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                Gross Approved QR Volume
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/90 text-emerald-700 border border-emerald-200/80 text-xs font-semibold shadow-2xs">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>{approvedRequests.length} Settled UPI Order(s)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-emerald-100/80 relative z-10">
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-3.5 border border-emerald-100/90 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Inflow Settlement</p>
                <p className="font-bold text-emerald-700 text-xs mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant T+0 Credit
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-500">Channel Mode</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">
                  Static & Dynamic UPI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. CREDIT CARD BILL DESK */}
        <div className="bg-gradient-to-br from-pink-50/90 via-rose-50/30 to-white border border-pink-200/90 rounded-[28px] p-6 shadow-xs hover:shadow-md hover:border-pink-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-200/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white text-pink-600 border border-pink-200/90 flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Credit Card Bill Desk</h3>
                  <p className="text-[11px] font-semibold text-slate-400">BBPS & Offline Utility</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-pink-100/80 text-pink-800 border border-pink-200 font-extrabold text-[10px]">
                Dual Switch
              </span>
            </div>

            <div className="mt-2">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                Total CC Bill Volume
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                ₹{totalApprovedBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/90 text-pink-700 border border-pink-200/80 text-xs font-semibold shadow-2xs">
                <Receipt className="w-3.5 h-3.5 text-pink-600" />
                <span>Service Fee: ₹{totalBillServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-pink-100/80 space-y-2 relative z-10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/85 backdrop-blur-xs p-3 rounded-2xl border border-pink-100/90 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                  <span>Offline Vol</span>
                  <span className="text-pink-600 font-bold">Fee: ₹{offlineBillServiceCharge.toFixed(0)}</span>
                </div>
                <p className="font-bold font-mono text-slate-900 text-sm mt-1">
                  ₹{offlineBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="bg-white/85 backdrop-blur-xs p-3 rounded-2xl border border-pink-100/90 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500">
                  <span>Live BBPS</span>
                  <span className="text-emerald-600 font-bold">Fee: ₹{liveBillServiceCharge.toFixed(0)}</span>
                </div>
                <p className="font-bold font-mono text-slate-900 text-sm mt-1">
                  ₹{liveBillVolume.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Proportion Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div 
                className="bg-pink-500 h-full transition-all" 
                style={{ width: `${totalApprovedBillAmount > 0 ? (offlineBillVolume / totalApprovedBillAmount) * 100 : 50}%` }} 
                title="Offline Share"
              />
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${totalApprovedBillAmount > 0 ? (liveBillVolume / totalApprovedBillAmount) * 100 : 50}%` }} 
                title="Live BBPS Share"
              />
            </div>
          </div>
        </div>

        {/* 3. INSTANT BANK PAYOUT ENGINE */}
        <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/30 to-white border border-blue-200/90 rounded-[28px] p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-200/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 border border-blue-200/90 flex items-center justify-center shadow-xs">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Bank Payout Engine</h3>
                  <p className="text-[11px] font-semibold text-slate-400">Direct IMPS Transfers</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200 font-extrabold text-[10px]">
                NPCI 24x7
              </span>
            </div>

            <div className="mt-2">
              <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                Disbursed Bank Payouts
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                ₹{totalPayoutVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/90 text-blue-700 border border-blue-200/80 text-xs font-semibold shadow-2xs">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                <span>{successfulPayouts.length} Settled Bank Transfer(s)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-blue-100/80 relative z-10">
            <div className="bg-white/85 backdrop-blur-xs rounded-2xl p-3.5 border border-blue-100/90 flex items-center justify-between shadow-2xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Payout Slab Charges</p>
                <p className="font-bold font-mono text-teal-700 text-sm mt-0.5">
                  ₹{totalPayoutCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-500">Routing Mode</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1 justify-end">
                  <Coins className="w-3.5 h-3.5 text-blue-600" /> Auto Slab Fee
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          2. COMMISSION HIERARCHY & UPSTREAM B2B ENGINE (2ND POSITION)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT CARD (7 COLS): MULTI-TIER COMMISSION HIERARCHY & SPREAD */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-[32px] p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-6">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Commission Hierarchy & Network Overrides
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Earnings allocation across Platform, Master Distributors (MS), and Distributors (DS)
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                Tier Revenue Hub
              </span>
            </div>

            {/* 3 Tier Inset Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
              
              {/* ADMIN NET MARGIN */}
              <div className="bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/90 rounded-2xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wide">
                    Admin Net Margin
                  </span>
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900">
                  ₹{totalAdminCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-medium text-indigo-600/90 mt-1">
                  Net Platform Margin
                </p>
              </div>

              {/* DISTRIBUTOR (DS) */}
              <div className="bg-amber-50/50 hover:bg-amber-50 border border-amber-100/90 rounded-2xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase text-amber-700 tracking-wide">
                    Distributor (DS)
                  </span>
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900">
                  ₹{totalDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-medium text-amber-600/90 mt-1">
                  Retailer Tier Markups
                </p>
              </div>

              {/* MASTER DISTRIBUTOR (MS) */}
              <div className="bg-purple-50/50 hover:bg-purple-50 border border-purple-100/90 rounded-2xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-700 tracking-wide">
                    Master Dist (MS)
                  </span>
                  <Building2 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900">
                  ₹{totalMasterDistributorEarning.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] font-medium text-purple-600/90 mt-1">
                  Hierarchy Network Payouts
                </p>
              </div>

            </div>
          </div>

          {/* Allocation Bar & Sources Breakdown */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Admin
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Distributor (DS)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600" /> Master Dist (MS)
              </span>
            </div>
            {(() => {
              const totalTier = totalAdminCommission + totalDistributorEarning + totalMasterDistributorEarning;
              const adminW = totalTier > 0 ? (totalAdminCommission / totalTier) * 100 : 33.3;
              const dsW = totalTier > 0 ? (totalDistributorEarning / totalTier) * 100 : 33.3;
              const msW = totalTier > 0 ? (totalMasterDistributorEarning / totalTier) * 100 : 33.4;
              return (
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-indigo-600 h-full transition-all" style={{ width: `${adminW}%` }} title={`Admin: ${adminW.toFixed(1)}%`} />
                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${dsW}%` }} title={`DS: ${dsW.toFixed(1)}%`} />
                  <div className="bg-purple-600 h-full transition-all" style={{ width: `${msW}%` }} title={`MS: ${msW.toFixed(1)}%`} />
                </div>
              );
            })()}

            {/* 3 Channel Revenue Sources Pill Bar */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <p className="text-[9px] uppercase font-bold text-slate-400">QR Platform Margin</p>
                <p className="font-bold font-mono text-indigo-700 text-xs mt-0.5">
                  ₹{totalAdminCommission.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <p className="text-[9px] uppercase font-bold text-slate-400">CC Service Fees</p>
                <p className="font-bold font-mono text-pink-700 text-xs mt-0.5">
                  ₹{totalBillServiceCharge.toFixed(2)}
                </p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <p className="text-[9px] uppercase font-bold text-slate-400">Payout Slab Fees</p>
                <p className="font-bold font-mono text-teal-700 text-xs mt-0.5">
                  ₹{totalPayoutCharges.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD (5 COLS): B2B UPSTREAM ENGINE & LIQUIDITY POOLS (EXCLUSIVE WALLET LOCATION) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-[32px] p-7 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-5">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Upstream API Liquidity Engine
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Operational provider wallet balances
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchUsepayBalanceOnly}
                disabled={usepayLoading}
                className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title="Refresh Provider Balance"
              >
                <RefreshCw className={`w-4 h-4 ${usepayLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            {/* Provider Notice if applicable */}
            {usepayError && (
              <div className="mt-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Provider Status: </span>
                  <span className="text-amber-800">{usepayError}</span>
                </div>
              </div>
            )}

            {/* Dual Wallet Display (Only Place on Entire Dashboard) */}
            <div className="space-y-3 mt-4">
              
              {/* WALLET 1: PAYOUT WALLET */}
              <div className="bg-slate-50/90 hover:bg-blue-50/30 border border-slate-200/80 rounded-2xl p-4 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Instant Payout Pool (IMPS)
                    </span>
                    <div className="text-xl font-black font-mono text-slate-900">
                      ₹{Number(usepayData?.payout_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFundRequestDefaultWallet('payout');
                    setShowFundRequestModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-500" /> + Top-Up
                </button>
              </div>

              {/* WALLET 2: BBPS UTILITY WALLET */}
              <div className="bg-slate-50/90 hover:bg-emerald-50/30 border border-slate-200/80 rounded-2xl p-4 transition-all flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      BBPS Utility Liquidity
                    </span>
                    <div className="text-xl font-black font-mono text-slate-900">
                      ₹{Number(usepayData?.bbps_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFundRequestDefaultWallet('bbps');
                    setShowFundRequestModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-500" /> + Top-Up
                </button>
              </div>

            </div>
          </div>

          {/* Quick Action Box */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFundRequestDefaultWallet('bbps');
                setShowFundRequestModal(true);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Top-Up API Wallet</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 font-medium mt-2">
              Instant balance top-up upon UTR verification by banking operations desk
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================
          3. SALES OVERVIEW (3RD POSITION)
          ======================================================== */}
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Sales Overview
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Your current platform summary, financial volumes and activity
            </p>
          </div>
        </div>
      </div>

      {/* TOP 4 METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: HERO ACCENT GRADIENT CARD (TILSHIFT VIOLET CARD) */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-[#6366f1] via-[#6d5dfc] to-[#7c3aed] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col justify-between group hover:scale-[1.01] transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-100 tracking-wide">Total Sales & Revenue</span>
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                <CircleDollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
                ₹{totalCombinedCharges >= 100000 
                  ? (totalCombinedCharges / 1000).toFixed(1) + 'k' 
                  : totalCombinedCharges.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> 4.3%
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 text-[11px] text-indigo-100 font-medium flex items-center justify-between">
            <span>Net Earnings (QR+CC+Payout)</span>
            <span className="font-mono font-bold text-white">₹{totalCombinedCharges.toFixed(2)}</span>
          </div>
        </div>

        {/* CARD 2: NEW CUSTOMER / ACTIVE ACCOUNTS (TILSHIFT YELLOW CARD) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wide">New Customer / Users</span>
              <div className="w-11 h-11 rounded-2xl bg-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-400/30">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {activeUserCount}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> 7.5%
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Active merchant ratio</span>
            <span className="font-bold text-slate-800">
              {usersList.length > 0 ? `${Math.round((activeUserCount / usersList.length) * 100)}% (${usersList.length} total)` : '0%'}
            </span>
          </div>
        </div>

        {/* CARD 3: RETURN PRODUCTS / PENDING APPROVALS (TILSHIFT CYAN/BLUE CARD) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wide">Pending Approvals</span>
              <div className="w-11 h-11 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {pendingRequests.length + pendingBillRequests.length + pendingPayouts.length}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                pendingRequests.length + pendingBillRequests.length + pendingPayouts.length > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {pendingRequests.length + pendingBillRequests.length + pendingPayouts.length > 0 ? 'Queue' : 'Clear'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Action Required</span>
            <span className="font-bold font-mono text-slate-800">
              {pendingRequests.length} QR • {pendingBillRequests.length} CC{pendingPayouts.length > 0 ? ` • ${pendingPayouts.length} Payout` : ''}
            </span>
          </div>
        </div>

        {/* CARD 4: TOTAL REVENUE / PLATFORM LIVE WALLET (TILSHIFT PURPLE CIRCLE CARD) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 tracking-wide">Total Live Wallets</span>
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                ₹{totalSystemBalance >= 100000 
                  ? (totalSystemBalance / 1000).toFixed(1) + 'k' 
                  : totalSystemBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>Platform liability</span>
            <span className="font-bold font-mono text-slate-800">
              ₹{totalSystemBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================
          4. API WALLET FUND REQUEST MODAL (LOGIC PRESERVED)
          ======================================================== */}
      <ApiWalletFundRequestModal
        isOpen={showFundRequestModal}
        onClose={() => setShowFundRequestModal(false)}
        onSuccess={() => {
          fetchUsepayBalanceOnly();
          fetchData(false);
        }}
        defaultWalletType={fundRequestDefaultWallet}
      />

    </div>
  );
};
