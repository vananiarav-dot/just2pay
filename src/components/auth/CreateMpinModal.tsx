import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Smartphone, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface CreateMpinModalProps {
  isOpen?: boolean;
  user?: UserProfile;
  onSuccess?: () => void;
}

export const CreateMpinModal: React.FC<CreateMpinModalProps> = ({
  isOpen = true,
  user: propUser,
  onSuccess,
}) => {
  const { user: storeUser, updateUser } = useAuthStore();
  const user = propUser || storeUser;
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSixDigits = mpin.length === 6 && /^\d+$/.test(mpin);
  const isMatch = mpin.length > 0 && mpin === confirmMpin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSixDigits || !isMatch) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.createMpin(mpin);
      const updatedProfile = { ...(res.user || user), mpin, mpin_set: true };
      updateUser(updatedProfile);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to save MPIN:', err);
      const apiMsg = err.response?.data?.message || err.message || 'Failed to save MPIN on server. Please try again.';
      setErrorMessage(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl relative overflow-hidden animate-shake">
        
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-200 shadow-2xs">
            <Smartphone className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Security Setup: Create 6-Digit MPIN</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Please create a secret 6-digit MPIN. You will need this MPIN every time you log in to your account.
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Enter 6-Digit MPIN</label>
            <div className="relative">
              <input
                type={showMpin ? 'text' : 'password'}
                required
                maxLength={6}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit secret code"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm font-mono tracking-widest text-center transition"
              />
              <button
                type="button"
                onClick={() => setShowMpin(!showMpin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm 6-Digit MPIN</label>
            <input
              type={showMpin ? 'text' : 'password'}
              required
              maxLength={6}
              value={confirmMpin}
              onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter 6-digit MPIN"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-sm font-mono tracking-widest text-center transition"
            />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs">
            <div className={`flex items-center space-x-2 ${isSixDigits ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Check className={`w-3.5 h-3.5 ${isSixDigits ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>Exactly 6 numeric digits</span>
            </div>
            <div className={`flex items-center space-x-2 ${isMatch ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
              <Check className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>MPINs match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isSixDigits || !isMatch}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-40 cursor-pointer"
          >
            {loading ? 'Setting MPIN...' : 'Save 6-Digit MPIN & Access Portal'}
          </button>
        </form>

      </div>
    </div>
  );
};
