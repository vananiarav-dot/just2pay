import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { kycApi } from '../../services/api';
import { 
  Clock, ShieldAlert, CheckCircle2, RefreshCw, LogOut, 
  Building2, Phone, Mail, FileCheck2, AlertCircle 
} from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface KycUnderReviewScreenProps {
  user: UserProfile;
}

export const KycUnderReviewScreen: React.FC<KycUnderReviewScreenProps> = ({ user }) => {
  const { updateUser, logout } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMessage(null);
    try {
      const res = await kycApi.getMyKycStatus();
      setLastChecked(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (res.success && res.kyc_status) {
        if (res.kyc_status !== user.kyc_status) {
          // Status updated! Update store so React re-renders to Dashboard or Upload screen
          updateUser({
            ...user,
            kyc_status: res.kyc_status,
            kyc_rejection_reason: res.rejection_reason || null
          });
        } else {
          setCheckMessage('Status is still Under Review. Please check back shortly.');
        }
      }
    } catch (err: any) {
      setCheckMessage('Unable to check status at this moment. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* TOP HEADER */}
      <header className="h-16 shrink-0 bg-white/95 border-b border-slate-200 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-3">
          <img src="/just2pay-logo.png" alt="Just2Pay" className="h-8 w-auto object-contain rounded-lg shadow-xs" />
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Just2Pay</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                Under Review
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{user.firm_name} • {user.mobile_number}</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-sm text-center">
          {/* BACKGROUND GLOW */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl pointer-events-none" />

          {/* STATUS ICON */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm relative z-10">
              <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          {/* TITLE & DESCRIPTION */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
            KYC Verification Pending
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Account Under Review
          </h2>

          <p className="text-sm text-slate-700 mt-3 leading-relaxed max-w-lg mx-auto font-medium">
            તમારા બધા જ KYC દસ્તાવેજો (PAN, Aadhaar, Firm Selfie, Cheque) સફળતાપૂર્વક સબમિટ થઈ ગયા છે. હાલમાં એડમિન ટીમ દ્વારા દસ્તાવેજોની ચકાસણી કરવામાં આવી રહી છે.
          </p>

          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Your KYC documents are currently being verified by the compliance desk. As soon as Admin approves your request, your dashboard will automatically unlock.
          </p>

          {/* SUBMISSION SUMMARY BOX */}
          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 shadow-2xs">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Account Name</span>
              <span className="font-bold text-slate-900">{user.name}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Firm / Business Name</span>
              <span className="font-bold text-slate-900">{user.firm_name}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Registered Mobile</span>
              <span className="font-mono font-bold text-indigo-600">+91 {user.mobile_number}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Documents Submitted</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>5 / 5 Documents Verified Upload</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">Current Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                Under Review
              </span>
            </div>
          </div>

          {/* STATUS NOTIFICATION / FEEDBACK */}
          {checkMessage && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-center gap-2 font-medium shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{checkMessage}</span>
            </div>
          )}

          {/* ACTIONS */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {lastChecked && (
            <p className="text-[10px] text-slate-400 mt-4 font-mono font-medium">
              Last checked at {lastChecked}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};
