import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface ForceChangePasswordModalProps {
  isOpen?: boolean;
  user?: UserProfile;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen = true,
  user: propUser,
}) => {
  const { user: storeUser, updateUser } = useAuthStore();
  const user = propUser || storeUser;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMinLength || !hasNumber || !isMatch) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.changePassword({ newPassword });
      if (res.success && res.user) {
        updateUser(res.user);
      } else {
        setErrorMessage(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden animate-shake">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200 shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">First Login: Password Update Required</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            For security compliance, you must set a new strong password before accessing your account.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Account Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm transition"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className={`flex items-center space-x-2 ${isMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Check className={`w-3.5 h-3.5 ${isMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>At least 6 characters</span>
            </div>
            <div className={`flex items-center space-x-2 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>Contains at least one number</span>
            </div>
            <div className={`flex items-center space-x-2 ${isMatch ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Check className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isMinLength || !hasNumber || !isMatch}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Continue'}
          </button>
        </form>

      </div>
    </div>
  );
};
