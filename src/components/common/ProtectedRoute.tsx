import React from 'react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/auth';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
  activeTab?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-2xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-slate-900 mb-2">Access Restricted (403)</h2>
          <p className="text-xs text-slate-600 mb-6">
            Your current role <span className="text-amber-700 font-bold uppercase">{user.role}</span> is not authorized to access this module.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 mb-6 text-xs text-slate-600 shadow-2xs">
            <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" /> Permitted Roles for this View:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono text-[11px]">
              {allowedRoles.map(role => (
                <li key={role} className="capitalize">{role.replace('_', ' ')}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch Role / Return to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
