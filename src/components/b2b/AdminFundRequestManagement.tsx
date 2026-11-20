import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import type { 
  UsePayActiveServiceItem, 
  UsePayAdminBankAccount, 
  ApiFundRequestRecord, 
  ApiWalletType 
} from '../../types/b2b';
import { 
  Check, Copy, RefreshCw, Upload, AlertCircle, 
  CheckCircle2, Clock, Landmark, Wallet, ArrowRight, ExternalLink,
  ShieldCheck, Layers, Eye, Zap, ArrowRightLeft, X
} from 'lucide-react';

export const AdminFundRequestManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Active Services (Filtered strictly: only active ones from API)
  const [activeServices, setActiveServices] = useState<UsePayActiveServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);

  // Admin Bank Accounts
  const [bankAccounts, setBankAccounts] = useState<UsePayAdminBankAccount[]>([]);
  const [banksLoading, setBanksLoading] = useState<boolean>(true);

  // Form Fields
  const [walletType, setWalletType] = useState<ApiWalletType>('bbps');
  const [amount, setAmount] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [adminBankAccountId, setAdminBankAccountId] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ApiFundRequestRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [previewProofModal, setPreviewProofModal] = useState<string | null>(null);

  const pendingRequests = historyList.filter(r => (r.status || '').toLowerCase() === 'pending');

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Fetch Active Services (Strictly excludes any inactive services)
  const loadActiveServices = async () => {
    setServicesLoading(true);
    try {
      const res = await b2bApi.getFundRequestActiveServices();
      if (res.success && Array.isArray(res.active_services)) {
        setActiveServices(res.active_services);
        if (res.active_services.length > 0) {
          const isCurrentActive = res.active_services.some(s => s.wallet_type === walletType);
          if (!isCurrentActive) {
            setWalletType(res.active_services[0].wallet_type);
          }
        }
      }
    } catch (err) {
      console.error('Fetch Active Services Error:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  // Fetch Bank Accounts for Deposit
  const loadBankAccounts = async () => {
    setBanksLoading(true);
    try {
      const res = await b2bApi.getAdminBankAccounts();
      if (res.success && Array.isArray(res.bank_accounts)) {
        setBankAccounts(res.bank_accounts);
        if (res.bank_accounts.length > 0 && !adminBankAccountId) {
          setAdminBankAccountId(res.bank_accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch Admin Bank Accounts Error:', err);
    } finally {
      setBanksLoading(false);
    }
  };

  // Fetch Fund Request History
  const loadHistory = async (isInitial = false) => {
    if (isInitial) setHistoryLoading(true);
    try {
      const res = await b2bApi.getFundRequestHistory();
      if (res.success && Array.isArray(res.requests)) {
        setHistoryList(res.requests);
      }
    } catch (err) {
      console.error('Fetch Fund Request History Error:', err);
    } finally {
      if (isInitial) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadActiveServices();
    loadBankAccounts();
    loadHistory(true);
  }, []);

  // Real-time Background Polling for Pending Requests (every 15 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadHistory(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // File Upload Handler (FileReader to Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError('Receipt image must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setProofPreview(result);
        setProofUrl(result);
        setFormError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setFormError('Unique Bank Transaction Reference / UTR Number is required.');
      return;
    }

    if (!walletType) {
      setFormError('Please select a target wallet destination.');
      return;
    }

    const isWalletActive = activeServices.some(s => s.wallet_type === walletType);
    if (!isWalletActive && activeServices.length > 0) {
      setFormError(`The selected wallet service (${walletType.toUpperCase()}) is currently inactive on the API side.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await b2bApi.submitFundRequest({
        amount: numAmount,
        utr_number: cleanUtr,
        wallet_type: walletType,
        admin_bank_account_id: adminBankAccountId || undefined,
        proof_url: proofUrl || undefined
      });

      if (res.success) {
        setFormSuccess(res.message || 'Fund request submitted successfully and pending approval!');
        setAmount('');
        setUtrNumber('');
        setProofUrl('');
        setProofPreview(null);
        loadHistory(false);
        setTimeout(() => {
          setActiveTab('history');
        }, 1500);
      } else {
        setFormError(res.message || 'Failed to submit fund request.');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error communicating with UsePay API server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live Status Check
  const handleCheckStatus = async (requestId: string) => {
    setCheckingId(requestId);
    try {
      const res = await b2bApi.checkFundRequestStatus(requestId);
      if (res.success && res.data) {
        setHistoryList(prev => prev.map(item => {
          if (item.request_id === requestId || item.id === requestId) {
            return { ...item, status: res.data.status as any, updated_at: res.data.updated_at };
          }
          return item;
        }));
      }
    } catch (err: any) {
      console.error('Status check error:', err);
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                API Wallet Top-Up
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Upstream API
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Top up your CSPL Fast Bill, BBPS Utility & Instant Payout API wallets with verified UTR deposits
            </p>
          </div>
        </div>

        {/* Tab switcher buttons in header */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Submit Request</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Request History</span>
            {historyList.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold animate-pulse">
                {historyList.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CONTENT BASED ON ACTIVE TAB */}
      {activeTab === 'submit' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          
          {/* LEFT COLUMN: THE SUBMISSION FORM (40%) */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              
              {/* WALLET TYPE SELECTION (ONLY ACTIVE SERVICES SHOWN) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Target Destination Wallet (wallet_type)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                </div>

                {servicesLoading ? (
                  <div className="py-2 text-xs text-slate-500 animate-pulse">
                    Checking active API wallet services...
                  </div>
                ) : activeServices.length === 0 ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>No wallet services are currently active from the UsePay API provider.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-5 sm:gap-7 pt-1">
                    {activeServices.map((service) => {
                      const isSelected = walletType === service.wallet_type;
                      return (
                        <label
                          key={service.wallet_type}
                          className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
                        >
                          <input
                            type="radio"
                            name="wallet_type"
                            value={service.wallet_type}
                            checked={isSelected}
                            onChange={() => setWalletType(service.wallet_type)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                          />
                          <span className={`text-xs font-black transition ${
                            isSelected ? 'text-indigo-600' : 'text-slate-800 group-hover:text-slate-900'
                          }`}>
                            {service.label}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            ₹{service.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AMOUNT INPUT */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Deposit Amount (₹)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl pl-9 pr-4 py-3.5 text-sm text-slate-900 font-mono font-bold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition placeholder-slate-400"
                  />
                </div>
              </div>

              {/* UTR NUMBER INPUT */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>3. Unique Bank Transaction Reference / UTR Number</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. UTR9876543210 or 12-digit Ref"
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-3.5 text-sm text-slate-900 font-mono font-bold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition placeholder-slate-400 tracking-wider"
                />
              </div>

              {/* ADMIN BANK ACCOUNT ID (OPTIONAL) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>4. Deposited Bank Account (admin_bank_account_id)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                </label>
                <select
                  value={adminBankAccountId}
                  onChange={(e) => setAdminBankAccountId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-3 text-xs text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition cursor-pointer"
                >
                  <option value="">-- None / Direct UPI Transfer --</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number}{b.account_holder_name ? ` (${b.account_holder_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROOF SCREENSHOT UPLOAD (OPTIONAL) */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>5. Payment Receipt Proof</span>
                  <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                </label>

                <div>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-600 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition shadow-sm">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Upload Receipt Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-slate-500 block mt-1">PNG, JPG, JPEG up to 5MB</span>
                </div>

                {proofPreview && (
                  <div className="mt-2 flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <img 
                      src={proofPreview} 
                      alt="Receipt Preview" 
                      className="w-14 h-14 object-cover rounded-xl border border-slate-200" 
                    />
                    <div className="text-xs truncate flex-1">
                      <span className="text-emerald-700 font-bold block">✓ Receipt Attached</span>
                      <span className="text-slate-500 text-[11px] truncate block">Will be submitted as proof_url</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofPreview(null);
                        setProofUrl('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* FEEDBACK BANNERS */}
              {formError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting || activeServices.length === 0}
                className="w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm tracking-wide shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Fund Request to UsePay API...</span>
                  </>
                ) : (
                  <>
                    <span>Submit B2B Fund Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT COLUMN: OFFICIAL BANK ACCOUNTS & GUIDES (60%) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* PENDING APPROVAL REQUESTS (MAX 3 ENTRIES) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Pending Fund Requests
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                        {pendingRequests.length} Pending
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">Live queue awaiting UsePay Admin approval & balance credit</p>
                  </div>
                </div>
                {pendingRequests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({pendingRequests.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-4 px-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No pending fund requests in queue. All submitted requests are processed.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingRequests.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/90 shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-400 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black font-mono text-slate-900">
                          ₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-amber-100 text-amber-800 border-amber-200 font-mono">
                          {r.wallet_type}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-mono flex items-center justify-between">
                        <span className="truncate max-w-[130px]">UTR: {r.utr_number}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r.utr_number, `utr_${r.id}`)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy UTR"
                        >
                          {copiedText === `utr_${r.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">
                          {new Date(r.submitted_at || (r as any).created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-bold text-amber-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                          In Review
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 1. USEPAY OFFICIAL DEPOSIT BANK ACCOUNTS */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Official Deposit Accounts
                    </h3>
                    <p className="text-[10px] text-slate-500">Click to select for this deposit</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadBankAccounts}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                  title="Refresh Bank Accounts"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${banksLoading ? 'animate-spin text-indigo-600' : ''}`} />
                </button>
              </div>

              {banksLoading ? (
                <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading bank accounts...
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No bank accounts configured from API.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => setAdminBankAccountId(bank.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative ${
                        adminBankAccountId === bank.id
                          ? 'bg-indigo-50/60 border-indigo-600 ring-1 ring-indigo-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2.5">
                        <div>
                          <span className="text-xs font-black text-slate-900">{bank.bank_name}</span>
                          <p className="text-[11px] text-slate-600">{bank.account_holder_name}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg transition ${
                          adminBankAccountId === bank.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {adminBankAccountId === bank.id ? '✓ Selected' : 'Select'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px]">A/C No:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 font-bold">{bank.account_number}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(bank.account_number, `ac_${bank.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy Account Number"
                            >
                              {copiedText === `ac_${bank.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-slate-500 text-[10px]">IFSC:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-indigo-700 font-bold">{bank.ifsc_code}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(bank.ifsc_code, `ifsc_${bank.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy IFSC Code"
                            >
                              {copiedText === `ifsc_${bank.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {bank.upi_id && (
                          <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                            <span className="text-slate-500 text-[10px]">UPI:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 font-bold text-[11px] truncate max-w-[150px]">{bank.upi_id}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(bank.upi_id!, `upi_${bank.id}`);
                                }}
                                className="text-slate-400 hover:text-slate-700"
                                title="Copy UPI ID"
                              >
                                {copiedText === `upi_${bank.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. TARGET WALLET GUIDELINES CARD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-200 pb-3">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Target Wallet Selection Guide
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {activeServices.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No active wallet services available.</p>
                ) : (
                  activeServices.map((service) => {
                    const isCspl = service.wallet_type === 'cspl';
                    const isBbps = service.wallet_type === 'bbps';
                    const isPayout = service.wallet_type === 'payout';

                    const dotColor = isCspl 
                      ? 'bg-amber-500' 
                      : isBbps 
                      ? 'bg-emerald-500' 
                      : 'bg-indigo-600';

                    const titleColor = isCspl 
                      ? 'text-amber-800' 
                      : isBbps 
                      ? 'text-emerald-800' 
                      : 'text-indigo-700';

                    const desc = isCspl
                      ? 'For instant sub-second bill payment API (/cspl/pay-bill).'
                      : isBbps
                      ? 'For standard BillAvenue utility payments (/pay-bill).'
                      : isPayout
                      ? 'For 24x7 IMPS / NEFT instant transfers (/payout/transfer).'
                      : service.service_title;

                    return (
                      <div key={service.wallet_type} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${dotColor} mt-1 shrink-0`} />
                        <div>
                          <span className={`font-bold ${titleColor} block`}>
                            {service.label} ("{service.wallet_type}")
                          </span>
                          <span className="text-[11px] text-slate-600">{desc}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed font-medium">
                ⚠️ <strong className="text-amber-900">Notice:</strong> Deposited funds are credited strictly to the destination wallet selected above.
              </div>
            </div>

            {/* 3. RECENT REQUESTS SUMMARY */}
            {historyList.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Recent Requests
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({historyList.length})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {historyList.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-slate-900">
                            ₹{Number(r.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            ({r.wallet_type})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate max-w-[140px]">
                          UTR: {r.utr_number}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        r.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* TAB 2: REQUEST HISTORY & LIVE STATUS */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Submitted API Fund Requests Log
              </h2>
              <p className="text-xs text-slate-600">
                Live approval tracking for requests queued in UsePay Admin
              </p>
            </div>

            <button
              onClick={() => loadHistory(true)}
              disabled={historyLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-2 border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>

          {historyLoading && historyList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
              Loading fund request records...
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Clock className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-800">No Fund Requests Found</p>
              <p className="text-xs text-slate-500">Submit a new request from the Submit Request tab above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Request ID</th>
                    <th className="py-3.5 px-4">Target Wallet</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">UTR Number</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium text-[11px]">
                        {new Date(req.submitted_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[130px]">{req.request_id}</span>
                          <button
                            onClick={() => handleCopy(req.request_id, req.request_id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy Request ID"
                          >
                            {copiedText === req.request_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.wallet_type === 'cspl'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : req.wallet_type === 'payout'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {req.wallet_type === 'cspl' && 'CSPL Fast Bill'}
                          {req.wallet_type === 'payout' && 'Bank Payout'}
                          {req.wallet_type === 'bbps' && 'BBPS Utility'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(req.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{req.utr_number}</span>
                          <button
                            onClick={() => handleCopy(req.utr_number, req.utr_number)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy UTR"
                          >
                            {copiedText === req.utr_number ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                          {req.status === 'rejected' && <X className="w-3 h-3" />}
                          {req.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span>{req.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {req.proof_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewProofModal(req.proof_url || null)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition cursor-pointer"
                              title="View Receipt Screenshot"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCheckStatus(req.request_id)}
                            disabled={checkingId === req.request_id}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            title="Query live status from UsePay API"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${checkingId === req.request_id ? 'animate-spin' : ''}`} />
                            <span>Check Status</span>
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
      )}

      {/* PROOF PREVIEW LIGHTBOX MODAL */}
      {previewProofModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewProofModal(null)}
        >
          <div className="relative max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-sm font-bold text-slate-900">Payment Receipt Proof</span>
              <button 
                onClick={() => setPreviewProofModal(null)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl flex items-center justify-center bg-slate-50 p-2 border border-slate-200">
              <img 
                src={previewProofModal} 
                alt="Payment Receipt" 
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end pt-1">
              <a
                href={previewProofModal}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
              >
                <span>Open in new window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
