import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Eye, EyeOff, 
  RefreshCw, ShieldAlert, Check, HelpCircle, KeyRound, UserCheck
} from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Verification method: 'old_password' | 'mpin' (Admin always uses 'old_password')
  const [verificationMethod, setVerificationMethod] = useState<'old_password' | 'mpin'>('old_password');

  // Verification inputs
  const [oldPassword, setOldPassword] = useState('');
  const [mpin, setMpin] = useState('');

  // New Password inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Toggles for visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showVerificationSecret, setShowVerificationSecret] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMinLength = newPassword.length >= 6;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Check if current verification value is valid
  const isVerificationReady = () => {
    if (isAdmin || verificationMethod === 'old_password') {
      return oldPassword.trim().length >= 6;
    }
    if (verificationMethod === 'mpin') {
      return mpin.length === 6 && /^\d+$/.test(mpin);
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMinLength || !isMatch || !isVerificationReady()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let verificationValue = '';
      if (isAdmin || verificationMethod === 'old_password') {
        verificationValue = oldPassword.trim();
      } else if (verificationMethod === 'mpin') {
        verificationValue = mpin.trim();
      }

      const res = await authApi.changePassword({
        newPassword,
        verificationType: isAdmin ? 'old_password' : verificationMethod,
        verificationValue
      });

      if (res && res.user) {
        updateUser(res.user);
        setSuccessMsg(res.message || 'Account password successfully updated!');
        setOldPassword('');
        setMpin('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.message || 'Failed to update account password.');
      }
    } catch (err: any) {
      console.error('Change Password Error:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to update account password.';
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
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Security Center
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Password Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 mt-2">
              <Key className="w-7 h-7 text-indigo-600" />
              Account Password Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Update your account login password to keep your portal access secure and protected against unauthorized attempts.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-700">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Account Access</p>
              <p className="text-base font-black text-slate-900">
                Protected & Secured
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CHANGE PASSWORD FORM CARD */}
        <div className="lg:col-span-7 space-y-6">

          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Change Account Login Password
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin
                  ? 'Verify your identity using your current account password to set a new password.'
                  : 'Verify your identity using your Current Password or 6-Digit MPIN to set a new password.'}
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
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Step 1: Verify Current Identity
                  </span>

                  {/* Method selector pills for Non-Admin */}
                  {!isAdmin && (
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('old_password');
                          setErrorMsg(null);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          verificationMethod === 'old_password'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Old Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('mpin');
                          setErrorMsg(null);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                          verificationMethod === 'mpin'
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        6-Digit MPIN
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-inputs depending on verification method */}
                {(isAdmin || verificationMethod === 'old_password') && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Enter Current Account Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        {showVerificationSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showVerificationSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showVerificationSecret ? 'text' : 'password'}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter your current login password"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                    {!isAdmin && (
                      <div className="flex justify-between items-center mt-1.5 text-[11px]">
                        <span className="text-slate-500">Remember your current password?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVerificationMethod('mpin');
                            setErrorMsg(null);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer"
                        >
                          Forgot Password? Use 6-Digit MPIN →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!isAdmin && verificationMethod === 'mpin' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Enter 6-Digit Login MPIN <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowVerificationSecret(!showVerificationSecret)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
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
                        value={mpin}
                        onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full bg-white border border-slate-200 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-base text-center font-mono tracking-widest text-slate-900 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5 text-[11px]">
                      <span className="text-slate-500">Verify using your 6-digit login MPIN</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationMethod('old_password');
                          setErrorMsg(null);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer"
                      >
                        Remember Old Password? Use Password →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: ENTER NEW PASSWORD */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-600" /> Step 2: Set New Password
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Validation indicators */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className={`flex items-center space-x-2 transition-colors ${isMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>At least 6 characters long</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isMatch ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Both passwords match</span>
                </div>
                <div className={`flex items-center space-x-2 transition-colors ${isVerificationReady() ? 'text-emerald-700 font-bold' : 'text-amber-600'}`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {(isAdmin || verificationMethod === 'old_password') && 'Current Old Password entered'}
                    {!isAdmin && verificationMethod === 'mpin' && '6-Digit Login MPIN entered'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isMinLength || !isMatch || !isVerificationReady()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying & Saving Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Verify & Update Password</span>
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
              Password Reset Hierarchy (No OTP)
            </h3>
            <p className="text-xs text-slate-500">
              Update your account password securely without waiting for mobile or WhatsApp OTP codes:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-700">Level 1: Old Password</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    If you remember your current password, enter it directly to set your new password.
                  </p>
                </div>
              </div>

              {!isAdmin && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-700">Level 2: 6-Digit Login MPIN</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Forgot your old password? Simply verify using your 6-digit Login MPIN to create a new password instantly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Rules Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Security Recommendations
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Strong Password Tips
                </p>
                <p className="text-[11px] text-slate-500">
                  Use a combination of uppercase letters, numbers, and symbols (e.g. Pass@2026) for optimal security.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-amber-700 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" /> Confidentiality Notice
                </p>
                <p className="text-[11px] text-slate-500">
                  Never share your password, MPIN, or TPIN with anyone. AS EasySwipe staff will never ask for your password.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
