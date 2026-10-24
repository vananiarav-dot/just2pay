import React, { useState, useEffect } from 'react';
import { b2bApi } from '../../services/api';
import type { UsePayBalanceData } from '../../types/b2b';
import { ApiWalletFundRequestModal } from '../b2b/ApiWalletFundRequestModal';
import { RefreshCw, AlertCircle, Server, Zap } from 'lucide-react';

export const UsePayBalanceWidget: React.FC = () => {
  const [balanceData, setBalanceData] = useState<UsePayBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean>(true);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);

  const fetchBalance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await b2bApi.getUsepayBalance();
      if (res.success && res.data) {
        setBalanceData(res.data);
        setConfigured(res.configured !== false);
        setIsMock(Boolean(res.is_mock));
        if (res.message && res.is_mock) {
          setErrorMessage(res.message);
        }
      } else {
        setErrorMessage(res.message || 'Could not connect to UsePay API server');
      }
    } catch (err: any) {
      console.error('UsePay Balance Fetch Error:', err);
      setErrorMessage(err.response?.data?.message || 'Network error fetching UsePay balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);


  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs relative overflow-hidden space-y-6">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-50/50 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-wide">API Wallet</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                !isMock && configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {!isMock && configured ? 'Live Sync Active' : 'API Ready'}
              </span>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFundModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Top-Up Wallet</span>
          </button>

          <button
            onClick={fetchBalance}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Fetching...' : 'Sync Balance'}</span>
          </button>
        </div>
      </div>

      {/* ERROR OR NOTICE ALERT */}
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">Notice / System Warning:</p>
            <p className="text-amber-800 leading-relaxed">{errorMessage}</p>
            <p className="text-[11px] text-amber-700/80 italic pt-1">
              * Note: Ensure your server IP address is whitelisted in your UsePay B2B Agent Portal and valid <code className="font-mono font-bold text-amber-900">x-api-key</code> & <code className="font-mono font-bold text-amber-900">x-secret-key</code> headers are configured.
            </p>
          </div>
        </div>
      )}

      {/* WALLET BALANCES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
        
        {/* WALLET 1: BBPS UTILITY WALLET */}
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 hover:border-emerald-400 transition shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">BBPS Utility Wallet</span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
              balanceData?.is_bbps_enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {balanceData?.is_bbps_enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono">
            ₹{Number(balanceData?.bbps_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 font-medium border-t border-slate-100 pt-2.5">
            <span>Usable BBPS Balance:</span>
            <span className="font-mono text-emerald-700 font-bold">
              ₹{Number(balanceData?.usable_bbps_balance || balanceData?.bbps_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* WALLET 2: INSTANT PAYOUT WALLET */}
        <div className="bg-white border border-indigo-200 rounded-2xl p-5 hover:border-indigo-400 transition shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">Instant Payout Wallet</span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
              balanceData?.is_payout_enabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {balanceData?.is_payout_enabled ? '24x7 Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono">
            ₹{Number(balanceData?.payout_wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 font-medium border-t border-slate-100 pt-2.5">
            <span>Bank Transfers:</span>
            <span className="text-indigo-700 font-bold">24x7 Instant Payouts</span>
          </div>
        </div>

      </div>

      {/* FUND REQUEST MODAL */}
      <ApiWalletFundRequestModal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        onSuccess={fetchBalance}
      />

    </div>
  );
};

