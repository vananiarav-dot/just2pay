import React from 'react';
import { QrCode, CreditCard, ArrowRightLeft, Receipt, X, ArrowRight, Volume2 } from 'lucide-react';
import type { AdminToastAlert } from '../../hooks/useAdminSoundAlerts';

interface AdminSoundToastContainerProps {
  toasts: AdminToastAlert[];
  onDismiss: (id: string) => void;
  onClickToast: (toast: AdminToastAlert) => void;
}

export const AdminSoundToastContainer: React.FC<AdminSoundToastContainerProps> = ({
  toasts,
  onDismiss,
  onClickToast
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isQr = toast.type === 'qr';
        const isCc = toast.type === 'cc_bill';
        const isPayout = toast.type === 'payout';
        const isLive = toast.type === 'live_bill';

        return (
          <div
            key={toast.id}
            onClick={() => onClickToast(toast)}
            className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border cursor-pointer hover:scale-[1.02] transition-all duration-300 animate-in slide-in-from-top-3 flex items-start gap-3.5 group relative overflow-hidden ${
              isQr 
                ? 'border-emerald-300 shadow-emerald-500/10' 
                : isCc 
                ? 'border-pink-300 shadow-pink-500/10' 
                : isPayout 
                ? 'border-blue-300 shadow-blue-500/10' 
                : 'border-purple-300 shadow-purple-500/10'
            }`}
          >
            {/* Top accent glow line */}
            <div 
              className={`absolute top-0 left-0 right-0 h-1 ${
                isQr ? 'bg-emerald-500' : isCc ? 'bg-pink-500' : isPayout ? 'bg-blue-500' : 'bg-purple-500'
              }`} 
            />

            {/* Event Icon */}
            <div 
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                isQr 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                  : isCc 
                  ? 'bg-pink-50 text-pink-600 border border-pink-200' 
                  : isPayout 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'bg-purple-50 text-purple-600 border border-purple-200'
              }`}
            >
              {isQr && <QrCode className="w-5 h-5" />}
              {isCc && <CreditCard className="w-5 h-5" />}
              {isPayout && <ArrowRightLeft className="w-5 h-5" />}
              {isLive && <Receipt className="w-5 h-5" />}
            </div>

            {/* Notification Text */}
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-indigo-600 animate-pulse" />
                  Live Alert
                </span>
              </div>
              <h4 className="text-xs font-black text-slate-900 truncate mt-0.5">
                {toast.title}
              </h4>
              
              {toast.amount !== undefined && (
                <p className="text-sm font-black font-mono text-slate-900 mt-0.5">
                  ₹{Number(toast.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              )}

              {toast.subtitle && (
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  {toast.subtitle}
                </p>
              )}

              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 group-hover:text-indigo-700 mt-1.5">
                <span>Open Screen</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

