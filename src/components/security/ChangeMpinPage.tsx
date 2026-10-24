import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, 
  RefreshCw, ShieldAlert, Key, Check, HelpCircle, UserCheck
} from 'lucide-react';

export const ChangeMpinPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();

  // Verification method: 'old_mpin' | 'password'
  const [verificationMethod, setVerificationMethod] = useState<'old_mpin' | 'password'>('old_mpin');
  
  // Verification input values
  const [oldMpin, setOldMpin] = useState('');
  const [password, setPassword] = useState('');

  // New MPIN values
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showNewMpin, setShowNewMpin] = useState(false);
  const [showVerificationSecret, setShowVerificationSecret] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSixDigits = newMpin.length === 6 && /^\d+$/.test(newMpin);
  const isMatch = newMpin.length > 0 && newMpin === confirmMpin;

  // Check if current verification value is ready
  const isVerificationReady = () => {
    if (verificationMethod === 'old_mpin') return oldMpin.length === 6 && /^\d+$/.test(oldMpin);
    if (verificationMethod === 'password') return password.trim().length >= 6;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSixDigits || !isMatch || !isVerificationReady()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let verificationValue = '';
      if (verificationMethod === 'old_mpin') verificationValue = oldMpin.trim();
      if (verificationMethod === 'password') verificationValue = password.trim();

      const res = await authApi.changeMpin({
        newMpin,
        verificationType: verificationMethod,
        verificationValue
      });

      if (res && res.success) {
        updateUser({ ...(res.user || user), mpin: newMpin, mpin_set: true } as any);
        setSuccessMsg(res.message || '6-Digit Login MPIN successfully updated!');
        setOldMpin('');
        setPassword('');
        setNewMpin('');
        setConfirmMpin('');
      } else {
        setErrorMsg(res.message || 'Failed to update 6-digit MPIN.');
      }
    } catch (err: any) {
      console.error('MPIN Update Error:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to process MPIN update.';
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-300">
      
      {/* HEADER BANNER */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Login Security
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 6-Digit MPIN Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 mt-2">
              <KeyRound className="w-7 h-7 text-indigo-600" />
              6-Digit Login MPIN Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage your 6-digit Login MPIN used to authenticate your daily portal access after entering your password.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-700">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">MPIN Status</p>
              <p className="text-base font-black text-slate-900">
                Active & Protected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CHANGE MPIN FORM CARD */}
        <div className="lg:col-span-7 space-y-6">

          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Change 6-Digit Login MPIN
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify your identity using your Old 6-Digit MPIN or Account Password to set a new 6-digit MPIN.
              </p>
            </div>

            {successMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* STEP 1: IDENTITY VERIFICATION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600" /> Step 1: Verify Current Identity
                  </span>

                  {/* Method selector pills */}
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMethod('old_mpin');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        verificationMethod === 'old_mpin'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Old 6-Digit MPIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationMethod('password');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        verificationMethod === 'password'
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Password
                    </button>
                  </div>
                </div>

                {/* Sub-inputs depending on verification method */}
                {verificationMethod === 'old_mpin' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Enter Current Old 6-Digit MPIN <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        {showVerificationSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showVerificationSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showVerificationSecret ? 'text' : 'password'}
                        required
                        maxLength={6}
                        value={oldMpin}
                        onChange={(e) => setOldMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px]">
                      <span className="text-slate-500">Enter your 6-digit login MPIN</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('password');
                          setErrorMsg(null);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer"
                      >
                        Forgot Old MPIN? Use Password →
                      </button>
                    </div>
                  </div>
                )}

                {verificationMethod === 'password' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Enter Account Login Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        {showVerificationSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showVerificationSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showVerificationSecret ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your login account password"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px]">
                      <span className="text-slate-500">Authorize using your main login password</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('old_mpin');
                          setErrorMsg(null);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer"
                      >
                        Remember Old MPIN? Use MPIN →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: ENTER NEW 6-DIGIT MPIN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-emerald-600" /> Step 2: Enter New 6-Digit MPIN
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    New 6-Digit MPIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewMpin ? 'text' : 'password'}
                      required
                      maxLength={6}
                      value={newMpin}
                      onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-slate-900 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewMpin(!showNewMpin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showNewMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm New 6-Digit MPIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showNewMpin ? 'text' : 'password'}
                    required
                    maxLength={6}
                    value={confirmMpin}
                    onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Validation indicators */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className={`flex items-center space-x-2 transition-colors ${isSixDigits ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Exactly 6 numeric digits (0-9)</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isMatch ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Both MPIN fields match</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isVerificationReady() ? 'text-emerald-700 font-bold' : 'text-amber-600'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {verificationMethod === 'old_mpin' && 'Current Old 6-digit MPIN entered'}
                    {verificationMethod === 'password' && 'Account Password entered'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isSixDigits || !isMatch || !isVerificationReady()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Saving MPIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>Verify & Update 6-Digit MPIN</span>
                  </>
                )}
              </button>

            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: RECOVERY CASCADE EXPLANATION & SECURITY RULES */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Recovery Hierarchy Guide */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              MPIN Reset Hierarchy (No OTP)
            </h3>
            <p className="text-xs text-slate-500">
              You do not need to wait for mobile or WhatsApp OTPs! Reset your 6-digit Login MPIN instantly using your credentials:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-700">Level 1: Old 6-Digit MPIN</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    If you know your current MPIN, enter it directly to update to a new 6-digit MPIN.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-700">Level 2: Account Password</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Forgot your old MPIN? Simply enter your main account login password to reset your MPIN anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Rules Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Protection Notice
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" /> Secure Login Access
                </p>
                <p className="text-[11px] text-slate-500">
                  Your 6-digit MPIN protects your daily portal login session and prevents unauthorized access to your account.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-amber-700 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" /> Never Share Credentials
                </p>
                <p className="text-[11px] text-slate-500">
                  AS EasySwipe support will never ask for your MPIN, TPIN, or Password. Always keep them private.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
