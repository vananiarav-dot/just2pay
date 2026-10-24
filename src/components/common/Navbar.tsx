import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { 
  ShieldCheck, LogOut, Wallet, Clock, 
  ChevronDown, Key, Lock
} from 'lucide-react';
import type { UserRole } from '../../types/auth';

interface NavbarProps {}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, sessionRemainingSeconds, decrementTimer } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [decrementTimer]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'super_distributor': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'distributor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'user': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'super_distributor': return 'Super Distributor';
      case 'distributor': return 'Distributor';
      case 'user': return 'Retailer';
      default: return 'User';
    }
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center space-x-3">
          <img src="/just2pay-logo.png" alt="Just2Pay" className="h-10 w-auto object-contain" />
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            {getRoleLabel(user?.role)}
          </span>
        </div>

        {user && (
          <div className="flex items-center space-x-3 lg:space-x-6">

            {user.role !== 'admin' && (
              <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Main Wallet</p>
                  <p className="text-sm font-black text-emerald-600">
                    ₹{Number(user.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Session Auto-Logout</p>
                <p className="text-xs font-mono font-bold text-amber-700">
                  {formatTimer(sessionRemainingSeconds)}
                </p>
              </div>
            </div>

            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs ${getRoleBadgeStyle(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 focus:outline-none cursor-pointer"
              >
                {user.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt={user.name} className="w-8 h-8 rounded-lg object-cover ring-2 ring-indigo-500/40" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="hidden lg:inline-block text-xs font-bold text-slate-800">{user.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.firm_name}</p>
                    <p className="text-xs text-indigo-600 mt-1 font-mono font-semibold">+91 {user.mobile_number}</p>
                  </div>

                  <div className="border-t border-slate-100 py-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </header>
  );
};
