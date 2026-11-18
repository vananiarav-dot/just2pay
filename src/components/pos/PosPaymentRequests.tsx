import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, CheckCircle2, XCircle, Clock, AlertCircle, 
  Search, RefreshCw, Eye, ArrowRight, ShieldCheck, Download, 
  Sparkles, Filter, ChevronRight, FileText, Check, DollarSign, Calendar,
  Upload, Camera, Trash2, Radio, Zap
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [printedSlipData, setPrintedSlipData] = useState<{
    machineName: string;
    terminalId: string;
    bankName: string;
    rrn: string;
    amount: number;
    chargeAmount: number;
    netAmount: number;
    settlementType: string;
    cardLast4: string;
    date: string;
    time: string;
  } | null>(null);

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

  // Synthesize authentic POS thermal printer "trak trak trak" mechanical ratchet clicks and paper cutter sound
  const playPosPrintSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Generates a burst of mechanical "trak-trak-trak" ratchet clicks
      const playTrakBurst = (start: number, count: number, speed: number) => {
        for (let i = 0; i < count; i++) {
          const t = start + i * speed;
          // 1. Mechanical clack impact
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = 'square';
          osc.frequency.setValueAtTime(150 + (i % 2) * 40, t);
          osc.frequency.exponentialRampToValueAtTime(35, t + 0.022);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(950 + (i % 3) * 120, t);
          filter.Q.setValueAtTime(4.5, t);

          gain.gain.setValueAtTime(0.09, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.022);

          // 2. Micro paper friction pop
          const noiseOsc = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noiseOsc.type = 'sawtooth';
          noiseOsc.frequency.setValueAtTime(3200, t);
          noiseGain.gain.setValueAtTime(0.025, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
          noiseOsc.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noiseOsc.start(t);
          noiseOsc.stop(t + 0.016);
        }
      };

      const t0 = ctx.currentTime + 0.05;
      // 6 progressive "trak-trak-trak" feeds spread over 4.2 seconds
      playTrakBurst(t0 + 0.00, 10, 0.045); // Line 1: Header (0.45s)
      playTrakBurst(t0 + 0.70, 10, 0.045); // Line 2: RRN & TID (0.45s)
      playTrakBurst(t0 + 1.40, 12, 0.045); // Line 3: Swipe Amount (0.54s)
      playTrakBurst(t0 + 2.15, 10, 0.045); // Line 4: Fee & Mode (0.45s)
      playTrakBurst(t0 + 2.85, 10, 0.045); // Line 5: Net Credit (0.45s)
      playTrakBurst(t0 + 3.55, 10, 0.045); // Line 6: Stamp & Barcode (0.45s)

      // Mechanical cutter 'snip-clack' at 4.25s
      setTimeout(() => {
        try {
          const cutOsc = ctx.createOscillator();
          const cutGain = ctx.createGain();
          cutOsc.type = 'triangle';
          cutOsc.frequency.setValueAtTime(140, ctx.currentTime);
          cutOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.08);
          cutGain.gain.setValueAtTime(0.18, ctx.currentTime);
          cutGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          cutOsc.connect(cutGain);
          cutGain.connect(ctx.destination);
          cutOsc.start();
          cutOsc.stop(ctx.currentTime + 0.08);
        } catch {}
      }, 4250);
    } catch (e) {
      console.warn('Audio playback not supported:', e);
    }
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
        const printedSlip = {
          machineName: selectedMachine?.machine_name || 'POS Terminal',
          terminalId: selectedMachine?.terminal_id || 'TID_8841',
          bankName: selectedMachine?.bank_name || 'HDFC Bank',
          rrn: cleanRrn,
          amount: numAmount,
          chargeAmount: calcChargeAmount,
          netAmount: calcNetAmount,
          settlementType: settlementType,
          cardLast4: cardLast4.trim() || '****',
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
        setPrintedSlipData(printedSlip);
        playPosPrintSound();
        setIsPrinting(true);
        setTimeout(() => {
          setIsPrinting(false);
        }, 4800);
        setSubmitSuccess(res.message);
        setAmount('');
        setRrnNumber('');
        setCardLast4('');
        setApprovalCode('');
        setSlipUrl('');
        setSlipPreview(null);
        loadData();
        if (onRefreshUser) onRefreshUser();
        setTimeout(() => setSubmitSuccess(null), 8000);
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
      {/* Admin Control Bar & Stats (Clean, No Green Banner) */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Admin POS Control & Settlement</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                POS Swipe Requests & Settlements
              </h1>
              <p className="text-xs text-slate-500">
                Review merchant POS swipe slips, approve instant T+0 or overnight T+1 requests, and execute 1-click batch settlement.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSettleAllT1}
                disabled={settlingT1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Clears all users T+1 overnight balances into spendable POS Wallet"
              >
                <Sparkles className={`w-4 h-4 ${settlingT1 ? 'animate-spin' : ''}`} />
                <span>{settlingT1 ? 'Settling T+1...' : '⚡ 1-Click Settle T+1'}</span>
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Refresh Requests"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Admin Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Swipe Vol</span>
              <p className="text-lg sm:text-xl font-black font-mono text-slate-900 mt-0.5">
                ₹{totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-400">{requests.length} total slips</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Approved Volume</span>
              <p className="text-lg sm:text-xl font-black font-mono text-emerald-600 mt-0.5">
                ₹{approvedVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-600/70">{approvedReqs.length} settled</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Pending Review</span>
              <p className="text-lg sm:text-xl font-black font-mono text-amber-600 mt-0.5">
                ₹{pendingVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-amber-600/70">{pendingReqs.length} in queue</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-indigo-600 block">Admin 100% Fee Profit</span>
              <p className="text-lg sm:text-xl font-black font-mono text-indigo-600 mt-0.5">
                +₹{totalAdminProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-indigo-500 font-bold">DS/MS: ₹0 Commission</span>
            </div>
          </div>
        </div>
      )}

      {/* Retailer Header & Wallet Summary Bar */}
      {!isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS EDC Terminal Workstation</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              POS Card Swipe & Wallet Settlement
            </h1>
            <p className="text-xs text-slate-500">
              Record your EDC terminal card swipe receipt to load spendable funds directly into your POS Wallet.
            </p>
          </div>

          {/* Live Wallet Balances */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-50 border border-blue-200 min-w-[120px]">
              <span className="text-[9px] uppercase font-bold text-blue-600 block">🔵 Main Wallet</span>
              <p className="text-sm sm:text-base font-black font-mono text-blue-900 mt-0.5">
                ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50 border border-emerald-200 min-w-[130px]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-emerald-600 block">🟢 POS (T+0)</span>
                <span className="px-1 py-0.2 rounded-md bg-emerald-200 text-[8px] font-bold text-emerald-800">Live</span>
              </div>
              <p className="text-sm sm:text-base font-black font-mono text-emerald-900 mt-0.5">
                ₹{Number(user.pos_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-50 border border-purple-200 min-w-[130px]" title="Settles tomorrow into POS spendable wallet">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-purple-600 block">🟣 POS T+1</span>
                <span className="px-1 py-0.2 rounded-md bg-purple-200 text-[8px] font-bold text-purple-800">Tomorrow</span>
              </div>
              <p className="text-sm sm:text-base font-black font-mono text-purple-900 mt-0.5">
                ₹{Number(user.pos_t1_pending_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* POS WORKSTATION: 2 SIDE-BY-SIDE SECTIONS (VISIBLE TO ALL) */}
      <div className="space-y-6">
        {/* 2 Side-by-Side Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT SECTION (5 Cols): Straight Front-Facing Smart Android Touchscreen POS Terminal (PhonePe / Pax A920 Style) */}
          <div className="lg:col-span-5 flex flex-col items-center pt-28 sm:pt-36 lg:pt-48 relative">
            
            {/* Countertop Desk Status Bar / Printing Indicator (Firmly anchored above machine headroom) */}
            <div className="h-7 mb-2 flex items-center justify-center">
              {isPrinting ? (
                <div className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1.5 shadow-md animate-pulse">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>🖨️ Printing Thermal Slip... (ટ્રક... ટ્રક...)</span>
                </div>
              ) : (
                <div className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-500 text-[8.5px] font-bold flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SMARTPOS DESK • READY</span>
                </div>
              )}
            </div>

            {/* Anchored POS Machine Station (Stays 100% Fixed & Stationary on Desktop) */}
            <div className="w-full max-w-[285px] mx-auto flex flex-col items-center select-none relative">
              
              {/* The Thermal Paper Slip (Emerges UPWARDS out of slot into headroom; POS Machine NEVER moves down!) */}
              <div 
                style={{ perspective: '1000px' }}
                className={`absolute bottom-[calc(100%-18px)] left-0 right-0 mx-auto w-[240px] max-w-[90%] transition-all ${
                  isPrinting || submitSuccess || printedSlipData
                    ? 'duration-[4500ms] cubic-bezier(0.12, 0.8, 0.32, 1) translate-y-0 opacity-100 scale-100 pointer-events-auto'
                    : 'duration-300 translate-y-[100%] opacity-0 scale-95 pointer-events-none'
                } transform origin-bottom z-10`}
              >
                {/* 3D Curled Receipt Card with forward curl */}
                <div className="bg-gradient-to-b from-amber-100/95 via-amber-50/98 to-white text-slate-800 rounded-t-[2.2rem] rounded-b-md p-3.5 shadow-[0_20px_35px_-8px_rgba(0,0,0,0.35),0_10px_15px_-5px_rgba(0,0,0,0.15)] border-x border-t-4 border-amber-300/80 font-mono text-[9px] space-y-1.5 transform -rotate-x-[6deg] origin-bottom transition-transform duration-700">
                  
                  {/* Curled Top Cylinder Head Simulation */}
                  <div className="relative -mt-2 -mx-2 mb-2 pt-1.5 pb-1 px-3 bg-gradient-to-b from-amber-200/90 via-amber-100/95 to-amber-50 rounded-t-[2rem] border-b border-amber-200 shadow-inner flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-700">● THERMAL RECEIPT ROLL</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPrinting(false);
                        setSubmitSuccess(null);
                        setPrintedSlipData(null);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-white/90 hover:bg-rose-500 hover:text-white text-slate-700 text-[8px] font-black cursor-pointer transition shadow-2xs"
                      title="Tear off receipt"
                    >
                      ✕ Tear
                    </button>
                  </div>

                  <div className="text-center pb-1 border-b border-dashed border-slate-300">
                    <p className="font-black text-xs tracking-wider text-slate-900 leading-none">JUST2PAY EDC SWIPE</p>
                    <p className="text-[8px] text-slate-500 uppercase font-semibold mt-0.5">
                      {printedSlipData?.bankName || selectedMachine?.bank_name || 'HDFC Bank'} • {printedSlipData?.terminalId || selectedMachine?.terminal_id || 'TID_8841'}
                    </p>
                    <p className="text-[7px] text-slate-400 mt-0.5">
                      {printedSlipData?.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {printedSlipData?.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="space-y-0.5 py-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">RRN:</span>
                      <span className="font-bold text-slate-900 font-mono">{printedSlipData?.rrn || rrnNumber || '••••••••••••'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">CARD:</span>
                      <span className="font-bold text-slate-900 font-mono">•••• •••• •••• {printedSlipData?.cardLast4 || cardLast4 || '****'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">MODE:</span>
                      <span className="font-bold text-slate-900">{(printedSlipData?.settlementType || settlementType) === 'T0' ? '⚡ T+0 (INSTANT)' : '📅 T+1 (CLEARING)'}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black pt-1 border-t border-dashed border-slate-300">
                      <span>SWIPE AMT:</span>
                      <span className="text-slate-950 font-mono">
                        ₹{printedSlipData?.amount ? Number(printedSlipData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : (numAmount > 0 ? numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500">
                      <span>FEE ({effectiveChargePct.toFixed(2)}%):</span>
                      <span className="text-rose-600 font-mono">-₹{(printedSlipData?.chargeAmount || calcChargeAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-800 text-[10px] pt-0.5 border-t border-slate-200">
                      <span>NET CREDIT:</span>
                      <span className="font-mono">₹{(printedSlipData?.netAmount || calcNetAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="pt-1 text-center border-t border-dashed border-slate-300">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ SUBMITTED PENDING REVIEW
                    </span>
                    <p className="text-[7px] text-slate-400 mt-0.5">*** CUSTOMER SWIPE COPY ***</p>
                  </div>

                  {/* Decorative jagged tear line */}
                  <div className="flex justify-center gap-1 pt-0.5 opacity-40">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} className="w-1.5 h-1 bg-slate-400 rotate-45 transform inline-block" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Android Smart Touchscreen POS Terminal (PhonePe / Pax A920 Two-Tone Styling: Straight Front-Facing) */}
              <div className="w-full bg-gradient-to-b from-white via-slate-50 to-slate-100 rounded-[2.5rem] p-3 shadow-[0_25px_50px_-10px_rgba(0,0,0,0.35),inset_0_2px_3px_rgba(255,255,255,1),inset_0_-4px_8px_rgba(0,0,0,0.15)] border-4 border-slate-200/90 relative z-20 space-y-2">
                
                {/* Purple Side Grip Panels (PhonePe Two-Tone Flanks with Emblem) */}
                <div className="absolute -left-2 top-8 bottom-12 w-4 bg-gradient-to-r from-[#4c1d80] to-[#5f259f] rounded-l-2xl shadow-md border-r border-[#3b1666]" />
                <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center border border-purple-200 z-30" title="Just2Pay Merchant SmartPOS">
                  <span className="text-[8px] font-black text-[#5f259f]">JP</span>
                </div>

                <div className="absolute -right-2 top-8 bottom-12 w-4 bg-gradient-to-l from-[#4c1d80] to-[#5f259f] rounded-r-2xl shadow-md border-l border-[#3b1666]" />

                {/* Right-Edge Magnetic Stripe Card Swipe Track */}
                <div className="absolute -right-2.5 top-20 bottom-24 w-2 bg-slate-950 rounded-full border border-purple-900/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center z-30" title="Magnetic Stripe Card Swipe Slot">
                  <div className="w-0.5 h-12 bg-slate-700/80 rounded-full" />
                </div>

                {/* Cylindrical Paper Roll Chamber at Top */}
                <div className="relative pt-1 pb-1 px-3 bg-gradient-to-b from-slate-200 via-white to-slate-100 rounded-t-[2.2rem] border-t border-slate-300/80 shadow-2xs">
                  {/* Metallic Serrated Paper Slit */}
                  <div className="w-48 h-2.5 mx-auto bg-slate-950 rounded-full border border-slate-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] flex items-center justify-center relative overflow-hidden">
                    {!(isPrinting || submitSuccess || printedSlipData) ? (
                      <div className="w-28 h-1 bg-amber-100/80 rounded-full shadow-2xs" title="Thermal paper roll loaded" />
                    ) : (
                      <div className="w-32 h-1.5 bg-emerald-400 animate-pulse rounded-full" />
                    )}
                  </div>
                </div>

                {/* Brand Header & Status Bar */}
                <div className="flex items-center justify-between px-2 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-black text-[9px] shadow-xs">
                      JP
                    </div>
                    <span className="text-[10px] font-black tracking-wider text-slate-800 uppercase">
                      Just2Pay <span className="text-[#5f259f]">SmartPOS</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
                    <span className="text-[8px] font-mono text-emerald-700 font-bold uppercase tracking-wider">ONLINE</span>
                  </div>
                </div>

                {/* Full-Glass Android Touchscreen Display (No physical buttons!) */}
                <div className="bg-gradient-to-b from-[#090d16] via-[#0d1322] to-[#090d16] border-2 border-slate-800 rounded-2xl p-2.5 shadow-[inset_0_4px_8px_rgba(0,0,0,0.95),inset_0_-1px_2px_rgba(255,255,255,0.06)] text-white font-mono space-y-2 relative overflow-hidden">
                  {/* Diagonal Glass Sheen Glare */}
                  <div className="absolute -inset-1 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none rotate-12 scale-150 transform" />

                  {/* Android Top Status Bar */}
                  <div className="flex items-center justify-between text-[8px] text-slate-400 pb-1 border-b border-slate-800/80 relative z-10">
                    <span className="font-bold text-slate-300">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="truncate max-w-[100px] text-slate-400 font-semibold">
                      {selectedMachine?.bank_name || 'HDFC Bank'}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="text-[7px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">4G LTE</span>
                      <span>98%</span>
                    </div>
                  </div>

                  {/* Live Transaction Touch Display Card */}
                  <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-700/60 rounded-xl p-2.5 text-center relative z-10 shadow-inner">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold mb-1 ${
                      settlementType === 'T0' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {settlementType === 'T0' ? '⚡ T+0 Instant Settlement' : '📅 T+1 Overnight Clearing'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight my-0.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]">
                      ₹{numAmount > 0 ? numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </div>
                    <p className="text-[8px] text-slate-400">
                      TID: {selectedMachine?.terminal_id || 'HDFC_TID_8841'}
                    </p>
                  </div>

                  {/* Live Card & RRN Readout */}
                  <div className="bg-slate-900/80 rounded-xl p-2 text-[8px] space-y-1 border border-slate-800 relative z-10">
                    <div className="flex justify-between">
                      <span className="text-slate-400">RRN:</span>
                      <span className="font-bold text-amber-300 tracking-wider font-mono">
                        {rrnNumber || '•••• •••• ••••'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CARD:</span>
                      <span className="font-bold text-slate-300 font-mono">
                        {cardLast4 ? `•••• •••• ${cardLast4}` : 'SWIPE / TAP CARD'}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                      <span>NET WALLET CREDIT:</span>
                      <span className="font-mono">₹{calcNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Android Smart POS Quick Touch Tiles (PhonePe style!) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-0.5 relative z-10">
                    <div className="p-1.5 rounded-lg bg-blue-950/70 border border-blue-800/60 text-center shadow-xs">
                      <CreditCard className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                      <span className="text-[7px] text-blue-200 block font-bold leading-tight">Card Swipe</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-center shadow-xs">
                      <FileText className="w-3.5 h-3.5 mx-auto text-slate-400 mb-0.5" />
                      <span className="text-[7px] text-slate-300 block font-bold leading-tight">History</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-center shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 mx-auto text-amber-400 mb-0.5" />
                      <span className="text-[7px] text-amber-200 block font-bold leading-tight">Reports</span>
                    </div>
                  </div>

                  {/* Contactless Wave / NFC Zone on Glass */}
                  <div className="flex items-center justify-center gap-1.5 py-1 text-slate-400 border-t border-slate-800/80 relative z-10">
                    <Radio className="w-3 h-3 text-[#5f259f] rotate-90" />
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Contactless NFC / Tap to Pay</span>
                  </div>
                </div>

                {/* Bottom EMV Chip Card Insertion Slot */}
                <div className="pt-0.5 pb-0.5">
                  <div className="w-32 h-1.5 mx-auto bg-slate-950 rounded-full border border-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)]" />
                  <p className="text-[7px] font-mono text-center text-slate-500 mt-0.5 uppercase tracking-widest font-semibold">
                    EMV CHIP INSERTION SLOT
                  </p>
                </div>
              </div>

              {/* Realistic Desktop Countertop Contact Shadow */}
              <div className="w-56 h-3 mx-auto bg-black/35 blur-md rounded-full mt-1 transform scale-y-50 pointer-events-none" />
            </div>
          </div>

          {/* RIGHT SECTION (7 Cols): Compact Embedded Swipe Request Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Record POS Card Swipe</h3>
                  <p className="text-[11px] text-slate-500">Fill in transaction details to load spendable funds</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                Live Form
              </span>
            </div>

            {submitError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-3">
              {/* Select Machine */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select POS Terminal {machines.length > 1 ? `(${machines.length} Assigned)` : ''} *
                </label>
                {machines.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    તમને કોઈ POS મશીન અસાઇન કરેલ નથી. કૃપા કરીને એડમિનનો સંપર્ક કરો.
                  </div>
                ) : (
                  <select
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 cursor-pointer"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_name} (TID: {m.terminal_id}) - {m.bank_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Settlement Mode Selection: T+0 vs T+1 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Settlement Type *</label>
                <div className={`grid ${isT0Allowed && isT1Allowed ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                  {/* T+0 Card */}
                  {isT0Allowed && (
                    <div
                      onClick={() => setSettlementType('T0')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        settlementType === 'T0'
                          ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-1 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-amber-900">⚡ T+0 Instant</span>
                        <input
                          type="radio"
                          checked={settlementType === 'T0'}
                          onChange={() => setSettlementType('T0')}
                          className="text-amber-600 scale-90"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Funds credited <b>today</b> directly into spendable POS Wallet.
                      </p>
                      <span className="text-[9px] font-bold text-amber-800 mt-1 block">
                        Fee: {Number(user.pos_t0_charge_percent !== undefined && user.pos_t0_charge_percent !== null ? user.pos_t0_charge_percent : (selectedMachine?.default_t0_charge_percent || 1.20)).toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {/* T+1 Card */}
                  {isT1Allowed && (
                    <div
                      onClick={() => setSettlementType('T1')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        settlementType === 'T1'
                          ? 'border-cyan-500 bg-cyan-50/60 shadow-xs ring-1 ring-cyan-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-cyan-900">📅 T+1 Clearing</span>
                        <input
                          type="radio"
                          checked={settlementType === 'T1'}
                          onChange={() => setSettlementType('T1')}
                          className="text-cyan-600 scale-90"
                        />
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Overnight clearing. Settle into spendable POS Wallet <b>tomorrow</b>.
                      </p>
                      <span className="text-[9px] font-bold text-cyan-800 mt-1 block">
                        Fee: {Number(user.pos_t1_charge_percent !== undefined && user.pos_t1_charge_percent !== null ? user.pos_t1_charge_percent : (selectedMachine?.default_t1_charge_percent || 0.80)).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Swipe Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Enter swiped amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Live Fee Breakdown Card */}
              {numAmount > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Swipe Amount:</span>
                    <span className="font-mono font-bold text-slate-900">₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee ({effectiveChargePct.toFixed(2)}%):</span>
                    <span className="font-mono font-bold text-rose-600">-₹{calcChargeAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between font-black text-slate-900 text-xs">
                    <span>Net Wallet Credit:</span>
                    <span className="font-mono text-emerald-700">₹{calcNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* RRN and Card Details (Single Row 2 Columns) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      RRN (12 Digits) *
                    </label>
                    <span className={`text-[9px] font-mono font-bold ${
                      rrnNumber.length === 12 ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {rrnNumber.length}/12
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="12-digit RRN from EDC"
                    value={rrnNumber}
                    onChange={(e) => setRrnNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Card Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 5432"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Slip Photo Upload (Compact) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  POS Swipe Slip Photo *
                </label>
                
                {slipPreview ? (
                  <div className="relative rounded-xl border border-emerald-400 overflow-hidden bg-slate-900 group">
                    <img 
                      src={slipPreview} 
                      alt="Slip Receipt" 
                      className="w-full h-28 object-contain bg-slate-950"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-[10px] font-bold hover:bg-white transition cursor-pointer flex items-center gap-1 shadow-xs">
                        <Camera className="w-3 h-3" />
                        <span>Change</span>
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
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 transition cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Photo Attached</span>
                    </div>
                  </div>
                ) : (
                  <label className={`w-full p-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 transition flex items-center justify-center gap-2.5 cursor-pointer text-left ${
                    isCompressing ? 'opacity-50 cursor-wait' : ''
                  }`}>
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {isCompressing ? 'Compressing Photo...' : 'Click to Upload / Capture Slip Photo'}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Mobile Camera, JPG, PNG from device
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

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting || machines.length === 0 || userAllowedSettlement === 'NONE'}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transform active:scale-[0.99]"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Slip...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Submit {settlementType === 'T0' ? 'T+0 (Instant)' : 'T+1 (Clearing)'} Swipe Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
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
