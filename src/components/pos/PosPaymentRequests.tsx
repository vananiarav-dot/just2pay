import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, CheckCircle2, XCircle, Clock, AlertCircle, 
  Search, RefreshCw, Eye, ArrowRight, ShieldCheck, Download, 
  Sparkles, Filter, ChevronRight, FileText, Check, DollarSign, Calendar,
  Upload, Camera, Trash2
} from 'lucide-react';
import { posApi } from '../../services/api';
import type { PosPaymentRequest, PosMachine, PosSettlementType } from '../../types/pos';
import type { UserProfile } from '../../types/auth';

interface PosPaymentRequestsProps {
  user: UserProfile;
  onRefreshUser?: () => void;
}

export const PosPaymentRequests: React.FC<PosPaymentRequestsProps> = ({ user, onRefreshUser }) => {
  const isAdmin = user.role === 'admin';
  const isRetailer = user.role === 'user';
  
  const [requests, setRequests] = useState<PosPaymentRequest[]>([]);
  const [machines, setMachines] = useState<PosMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'pending' | 'approved' | 'rejected' | 'T0' | 'T1'>('ALL');
  
  // Submit Swipe Modal State (Retailer)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [settlementType, setSettlementType] = useState<PosSettlementType>('T0');
  const [amount, setAmount] = useState('');
  const [rrnNumber, setRrnNumber] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Admin Action State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<PosPaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [settlingT1, setSettlingT1] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // View Slip Image Modal
  const [viewSlipUrl, setViewSlipUrl] = useState<string | null>(null);

  // Helper permissions for settlements
  const userAllowedSettlement = user.pos_allowed_settlement_types || 'BOTH';
  const isT0Allowed = userAllowedSettlement === 'BOTH' || userAllowedSettlement === 'T0_ONLY';
  const isT1Allowed = userAllowedSettlement === 'BOTH' || userAllowedSettlement === 'T1_ONLY';

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          resolve(compressed);
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSubmitError('Please select a valid image file (JPG, PNG).');
        return;
      }
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImage(file);
        setSlipPreview(compressedBase64);
        setSlipUrl(compressedBase64);
        setSubmitError(null);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          setSlipPreview(res);
          setSlipUrl(res);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleOpenSubmitModal = () => {
    if (isT0Allowed) {
      setSettlementType('T0');
    } else if (isT1Allowed) {
      setSettlementType('T1');
    }
    setSubmitError(null);
    setAmount('');
    setRrnNumber('');
    setCardLast4('');
    setSlipUrl('');
    setSlipPreview(null);
    setShowSubmitModal(true);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, machRes] = await Promise.all([
        posApi.getRequests(),
        posApi.getMachines(false)
      ]);

      if (reqRes.success && Array.isArray(reqRes.requests)) {
        setRequests(reqRes.requests);
      }
      if (machRes.success && Array.isArray(machRes.machines)) {
        setMachines(machRes.machines);
        if (machRes.machines.length > 0 && !selectedMachineId) {
          setSelectedMachineId(machRes.machines[0].id);
        }
      }
    } catch (err: any) {
      console.error('Load POS data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live Charge Calculation in Modal
  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];
  const numAmount = parseFloat(amount) || 0;
  
  let effectiveChargePct = 0;
  if (settlementType === 'T0') {
    effectiveChargePct = user.pos_t0_charge_percent !== undefined && user.pos_t0_charge_percent !== null
      ? Number(user.pos_t0_charge_percent)
      : Number(selectedMachine?.default_t0_charge_percent || 1.20);
  } else {
    effectiveChargePct = user.pos_t1_charge_percent !== undefined && user.pos_t1_charge_percent !== null
      ? Number(user.pos_t1_charge_percent)
      : Number(selectedMachine?.default_t1_charge_percent || 0.80);
  }
  const calcChargeAmount = parseFloat(((numAmount * effectiveChargePct) / 100).toFixed(2));
  const calcNetAmount = parseFloat((numAmount - calcChargeAmount).toFixed(2));

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setSubmitError('Please enter a valid amount greater than ₹0');
      return;
    }
    const cleanRrn = rrnNumber.trim();
    if (!cleanRrn || cleanRrn.length !== 12 || !/^\d{12}$/.test(cleanRrn)) {
      setSubmitError('RRN નંબર બરાબર ૧૨ આંકડા (12 Digits) નો જ હોવો જોઈએ (e.g. 432109876543).');
      return;
    }
    if (!slipUrl) {
      setSubmitError('કૃપા કરીને POS સ્વાઇપ સ્લિપનો ફોટો (Slip Photo) અપલોડ કરો.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await posApi.submitRequest({
        pos_machine_id: selectedMachineId || undefined,
        settlement_type: settlementType,
        amount: numAmount,
        rrn_number: cleanRrn,
        approval_code: approvalCode.trim() || undefined,
        card_last4: cardLast4.trim() || undefined,
        card_network: 'Card',
        slip_url: slipUrl.trim() || undefined
      });

      if (res.success) {
        setSubmitSuccess(res.message);
        setShowSubmitModal(false);
        setAmount('');
        setRrnNumber('');
        setCardLast4('');
        setApprovalCode('');
        setSlipUrl('');
        setSlipPreview(null);
        loadData();
        if (onRefreshUser) onRefreshUser();
        setTimeout(() => setSubmitSuccess(null), 5000);
      }
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Failed to submit POS request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string, merchantName: string, netAmt: number, mode: string) => {
    if (!window.confirm(`Approve POS ${mode} swipe slip for ${merchantName}? ₹${netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be credited.`)) return;

    try {
      setProcessingId(id);
      const res = await posApi.approveRequest(id);
      if (res.success) {
        setGlobalNotice({ type: 'success', message: res.message });
        loadData();
        if (onRefreshUser) onRefreshUser();
        setTimeout(() => setGlobalNotice(null), 4000);
      }
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.response?.data?.message || 'Failed to approve request' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalReq) return;

    try {
      setProcessingId(rejectModalReq.id);
      const res = await posApi.rejectRequest(rejectModalReq.id, rejectionReason || 'Invalid swipe receipt or mismatch');
      if (res.success) {
        setGlobalNotice({ type: 'success', message: 'POS request rejected successfully.' });
        setRejectModalReq(null);
        setRejectionReason('');
        loadData();
        setTimeout(() => setGlobalNotice(null), 4000);
      }
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.response?.data?.message || 'Failed to reject request' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSettleAllT1 = async () => {
    if (!window.confirm('⚡ 1-Click T+1 Settlement: This will clear all pending T+1 Overnight Clearing balances across all users and transfer the funds directly into their spendable POS Wallets. Proceed?')) return;

    try {
      setSettlingT1(true);
      const res = await posApi.settleT1();
      if (res.success) {
        setGlobalNotice({ type: 'success', message: res.message });
        loadData();
        if (onRefreshUser) onRefreshUser();
        setTimeout(() => setGlobalNotice(null), 5000);
      }
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.response?.data?.message || 'Failed to settle T+1 balances' });
    } finally {
      setSettlingT1(false);
    }
  };

  // Metrics
  const totalVolume = requests.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const approvedReqs = requests.filter(r => r.status === 'approved');
  const approvedVolume = approvedReqs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const pendingReqs = requests.filter(r => r.status === 'pending');
  const pendingVolume = pendingReqs.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const totalAdminProfit = approvedReqs.reduce((acc, r) => acc + (Number(r.admin_commission || r.charge_amount) || 0), 0);

  // Filtered List
  const filteredRequests = requests.filter(r => {
    // Tab filter
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'approved' && r.status !== 'approved') return false;
    if (activeTab === 'rejected' && r.status !== 'rejected') return false;
    if (activeTab === 'T0' && r.settlement_type !== 'T0') return false;
    if (activeTab === 'T1' && r.settlement_type !== 'T1') return false;

    // Search filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchRrn = (r.rrn_number || '').toLowerCase().includes(q);
      const matchUser = (r.user_name || '').toLowerCase().includes(q) || (r.firm_name || '').toLowerCase().includes(q);
      const matchMachine = (r.machine_name || '').toLowerCase().includes(q);
      const matchAmt = String(r.amount || '').includes(q);
      return matchRrn || matchUser || matchMachine || matchAmt;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/20 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Card Swipe Collections</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {isAdmin ? 'POS Swipe Requests & Settlements' : 'POS Card Swipe Portal'}
            </h1>
            <p className="text-sm text-emerald-100/80 max-w-2xl">
              {isAdmin 
                ? 'Review merchant POS swipe slips, approve instant T+0 or overnight T+1 requests, and execute 1-click batch settlement into merchant POS wallets.'
                : 'Submit your POS card swipe receipts with RRN for instant T+0 or next-day T+1 clearing. Funds credited directly to your POS Wallet!'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={handleSettleAllT1}
                disabled={settlingT1}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Clears all users T+1 overnight balances into spendable POS Wallet"
              >
                <Sparkles className={`w-4 h-4 ${settlingT1 ? 'animate-spin' : ''}`} />
                <span>{settlingT1 ? 'Settling T+1...' : '⚡ 1-Click Settle T+1'}</span>
              </button>
            )}

            {!isAdmin && (
              <button
                onClick={handleOpenSubmitModal}
                disabled={machines.length === 0 || userAllowedSettlement === 'NONE'}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition transform active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                title={machines.length === 0 ? 'No POS terminal assigned' : 'Submit POS swipe slip'}
              >
                <Plus className="w-4 h-4" />
                <span>Submit Swipe Request</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Wallet Balances (For Retailers) */}
        {!isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <span className="text-[10px] uppercase font-bold text-slate-300">🔵 Main Wallet</span>
              <p className="text-xl font-black font-mono text-white mt-0.5">
                ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">Regular Platform Balance</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-300">🟢 POS Wallet (T+0 Spendable)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-400/20 text-[9px] font-bold text-emerald-300">Live</span>
              </div>
              <p className="text-xl font-black font-mono text-emerald-300 mt-0.5">
                ₹{Number(user.pos_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-200/70">Ready for Payout & Bill Payments</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-400/30 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-purple-300">🟣 POS T+1 (Clearing Tomorrow)</span>
                <span className="px-1.5 py-0.5 rounded-md bg-purple-400/20 text-[9px] font-bold text-purple-300">Next Day</span>
              </div>
              <p className="text-xl font-black font-mono text-purple-300 mt-0.5">
                ₹{Number(user.pos_t1_pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-purple-200/70">Auto-moves to spendable POS wallet tomorrow</span>
            </div>
          </div>
        )}

        {/* Stats Row for Admin */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300">Total Swipe Vol</span>
              <p className="text-xl font-black font-mono text-white mt-0.5">
                ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">{requests.length} total slips</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400">Approved Volume</span>
              <p className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                ₹{approvedVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-400/70">{approvedReqs.length} settled</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-300">Pending Review</span>
              <p className="text-xl font-black font-mono text-amber-300 mt-0.5">
                ₹{pendingVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-amber-300/70">{pendingReqs.length} in queue</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-300">Admin 100% Fee Profit</span>
              <p className="text-xl font-black font-mono text-cyan-300 mt-0.5">
                +₹{totalAdminProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-cyan-300/70">DS/MS: ₹0 Commission</span>
            </div>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {globalNotice && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-semibold animate-in fade-in ${
          globalNotice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {globalNotice.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span>{globalNotice.message}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Retailer Notice: No POS Machine Assigned */}
      {!isAdmin && !loading && machines.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">કોઈ POS મશીન અસાઇન કરેલ નથી (No POS Machine Assigned)</p>
            <p className="text-[11px] text-amber-700 font-normal mt-0.5">
              કાર્ડ સ્વાઇપ સ્લિપ સબમિટ કરવા માટે કૃપા કરીને એડમિનનો સંપર્ક કરો જેથી તમારા એકાઉન્ટમાં POS મશીન અસાઇન થઈ શકે.
            </p>
          </div>
        </div>
      )}

      {/* Retailer Notice: POS Blocked */}
      {!isAdmin && !loading && userAllowedSettlement === 'NONE' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">POS સેવા બંધ કરેલ છે (POS Service Blocked)</p>
            <p className="text-[11px] text-rose-700 font-normal mt-0.5">
              તમારા એકાઉન્ટ માટે POS કાર્ડ સ્વાઇપ સુવિધા એડમિન દ્વારા અસ્થાયી રૂપે બંધ કરવામાં આવી છે.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'pending', 'approved', 'rejected', 'T0', 'T1'] as const).map((tab) => {
            const count = tab === 'ALL' 
              ? requests.length 
              : tab === 'T0' 
                ? requests.filter(r => r.settlement_type === 'T0').length
                : tab === 'T1'
                  ? requests.filter(r => r.settlement_type === 'T1').length
                  : requests.filter(r => r.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>
                  {tab === 'ALL' ? 'All Slips' : tab === 'T0' ? '⚡ T+0 Instant' : tab === 'T1' ? '📅 T+1 Clearing' : tab.toUpperCase()}
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search RRN, merchant, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border border-slate-200 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading POS Swipe Records...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No POS Requests Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no card swipe requests matching your current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  {isAdmin && <th className="py-3.5 px-4">Merchant / User</th>}
                  <th className="py-3.5 px-4">Machine & TID</th>
                  <th className="py-3.5 px-4">RRN / Batch Ref</th>
                  <th className="py-3.5 px-4">Settlement</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Platform Fee</th>
                  <th className="py-3.5 px-4 text-right font-black text-slate-900">Net Credited</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Receipt Slip</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => {
                  const isT0 = r.settlement_type === 'T0';
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Merchant User (Admin view) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{r.firm_name || r.user_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.user_mobile || r.user_id}</div>
                        </td>
                      )}

                      {/* Machine */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{r.machine_name || 'POS Terminal'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {r.pos_machine_id?.slice(-8) || 'N/A'}</div>
                      </td>

                      {/* RRN Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                          {r.rrn_number}
                        </span>
                        {r.card_last4 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Card: •••• {r.card_last4} ({r.card_network || 'Card'})
                          </div>
                        )}
                      </td>

                      {/* Settlement Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          isT0 ? 'bg-amber-100 text-amber-900' : 'bg-cyan-100 text-cyan-900'
                        }`}>
                          {isT0 ? '⚡ T+0 (Instant)' : '📅 T+1 (Tomorrow)'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Platform Fee */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        <span className="text-[10px] text-slate-400 mr-1">({Number(r.charge_percent).toFixed(2)}%)</span>
                        -₹{Number(r.charge_amount).toFixed(2)}
                      </td>

                      {/* Net Credited */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 whitespace-nowrap text-sm">
                        ₹{Number(r.net_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                          {r.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span>{r.status.toUpperCase()}</span>
                        </span>
                        {r.rejection_reason && (
                          <div className="text-[10px] text-rose-600 max-w-xs truncate mt-0.5" title={r.rejection_reason}>
                            {r.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Slip Preview Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {r.slip_url ? (
                          <button
                            onClick={() => setViewSlipUrl(r.slip_url || null)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Slip</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300">No image</span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {r.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprove(r.id, r.user_name || 'Retailer', r.net_amount, r.settlement_type)}
                                disabled={processingId === r.id}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              >
                                {processingId === r.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalReq(r);
                                  setRejectionReason('');
                                }}
                                disabled={processingId === r.id}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Swipe Slip Modal (Retailer & Admin) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Submit POS Card Swipe</h3>
                  <p className="text-xs text-slate-500">Record physical card swipe slip for wallet load</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Select Machine */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select POS Terminal {machines.length > 1 ? `(${machines.length} Assigned)` : ''} *
                </label>
                {machines.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    તમને કોઈ POS મશીન અસાઇન કરેલ નથી. કૃપા કરીને એડમિનનો સંપર્ક કરો.
                  </div>
                ) : (
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_name} (TID: {m.terminal_id}) - {m.bank_name}
                      </option>
                    ))}
                  </select>
                )}
                {machines.length > 1 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    તમને {machines.length} મશીનો અસાઇન થયેલા છે. સ્લિપ મુજબ યોગ્ય મશીન સિલેક્ટ કરો.
                  </p>
                )}
              </div>

              {/* Settlement Mode Selection: T+0 vs T+1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Settlement Type *</label>
                <div className={`grid ${isT0Allowed && isT1Allowed ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {/* T+0 Card */}
                  {isT0Allowed && (
                    <div
                      onClick={() => setSettlementType('T0')}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        settlementType === 'T0'
                          ? 'border-amber-500 bg-amber-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-amber-900">⚡ T+0 Instant</span>
                        <input
                          type="radio"
                          checked={settlementType === 'T0'}
                          onChange={() => setSettlementType('T0')}
                          className="text-amber-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Funds credited <b>today</b> directly into spendable POS Wallet.
                      </p>
                      <span className="text-[10px] font-bold text-amber-800 mt-2 block">
                        Fee: {Number(user.pos_t0_charge_percent !== undefined && user.pos_t0_charge_percent !== null ? user.pos_t0_charge_percent : (selectedMachine?.default_t0_charge_percent || 1.20)).toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {/* T+1 Card */}
                  {isT1Allowed && (
                    <div
                      onClick={() => setSettlementType('T1')}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        settlementType === 'T1'
                          ? 'border-cyan-500 bg-cyan-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-cyan-900">📅 T+1 Clearing</span>
                        <input
                          type="radio"
                          checked={settlementType === 'T1'}
                          onChange={() => setSettlementType('T1')}
                          className="text-cyan-600"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 leading-tight">
                        Overnight clearing. Settle into spendable POS Wallet <b>tomorrow</b>.
                      </p>
                      <span className="text-[10px] font-bold text-cyan-800 mt-2 block">
                        Fee: {Number(user.pos_t1_charge_percent !== undefined && user.pos_t1_charge_percent !== null ? user.pos_t1_charge_percent : (selectedMachine?.default_t1_charge_percent || 0.80)).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Swipe Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Enter swiped amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Live Fee Breakdown Card */}
              {numAmount > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Swipe Amount:</span>
                    <span className="font-mono font-bold text-slate-900">₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee ({effectiveChargePct.toFixed(2)}%):</span>
                    <span className="font-mono font-bold text-rose-600">-₹{calcChargeAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                    <span>Net Wallet Credit:</span>
                    <span className="font-mono text-emerald-700">₹{calcNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1">
                    {settlementType === 'T0'
                      ? '⚡ Will be credited to your spendable POS Wallet as soon as approved.'
                      : '🟣 Will show in your POS T+1 (Tomorrow) clearance balance and settle next day.'}
                  </div>
                </div>
              )}

              {/* RRN and Card Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      RRN / Ref Transaction Number (12 Digits) *
                    </label>
                    <span className={`text-[10px] font-mono font-bold ${
                      rrnNumber.length === 12 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {rrnNumber.length}/12 Digits
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Enter 12-digit RRN number from EDC slip"
                    value={rrnNumber}
                    onChange={(e) => setRrnNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Card Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5432"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Slip Photo Upload */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    POS Swipe Slip Photo *
                  </label>
                  
                  {slipPreview ? (
                    <div className="relative rounded-2xl border-2 border-emerald-400 overflow-hidden bg-slate-900 group">
                      <img 
                        src={slipPreview} 
                        alt="Slip Receipt" 
                        className="w-full h-44 object-contain bg-slate-950"
                      />
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition cursor-pointer flex items-center gap-1.5 shadow-md">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleSlipUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setSlipPreview(null);
                            setSlipUrl('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition cursor-pointer flex items-center gap-1.5 shadow-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Slip Photo Attached</span>
                      </div>
                    </div>
                  ) : (
                    <label className={`w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 transition flex flex-col items-center justify-center gap-2 cursor-pointer text-center ${
                      isCompressing ? 'opacity-50 cursor-wait' : ''
                    }`}>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {isCompressing ? 'Compressing Slip Photo...' : 'Click to Upload or Capture Slip Photo'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Supports Camera capture, JPG, PNG from mobile or computer
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isCompressing}
                        onChange={handleSlipUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting Slip...' : `Submit ${settlementType === 'T0' ? 'T+0' : 'T+1'} Request`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal (Admin) */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Reject POS Request</h3>
            <p className="text-xs text-slate-500 mb-4">
              Specify reason for rejecting request with RRN <b>{rejectModalReq.rrn_number}</b> (₹{rejectModalReq.amount}).
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Invalid RRN, transaction not settled at bank, slip blurry"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectModalReq.id}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slip Image View Modal */}
      {viewSlipUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setViewSlipUrl(null)}>
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 shadow-2xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b mb-3">
              <span className="text-xs font-bold text-slate-700">EDC POS Slip Receipt</span>
              <button onClick={() => setViewSlipUrl(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-xl bg-slate-100 flex items-center justify-center p-2">
              <img src={viewSlipUrl} alt="POS Receipt" className="max-w-full h-auto object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
