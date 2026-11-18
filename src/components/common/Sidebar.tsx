import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { userApi } from '../../services/api';
import { 
  LogOut, Users, ChevronRight, X, Key, KeyRound, Lock, QrCode, FileText, CreditCard, LayoutDashboard, Landmark, Receipt, Zap, Clock, ArrowRightLeft, ShieldCheck, Images, Sliders, History
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose
}) => {
  const { user, logout, decrementTimer } = useAuthStore();
  const { liveBillPayEnabled, instantPayoutEnabled, ccBillPayEnabled } = useSettingsStore();
  const [badgeCounts, setBadgeCounts] = React.useState<{ [key: string]: number }>({});

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'super_distributor': return 'Super Distributor';
      case 'distributor': return 'Distributor';
      case 'user': return 'Retailer';
      default: return 'User';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'super_distributor': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'distributor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'user': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  React.useEffect(() => {
    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [decrementTimer]);

  // Real-time polling for live request badge counts (Admin only)
  React.useEffect(() => {
    if (user?.role !== 'admin') return;

    const fetchBadgeCounts = async () => {
      try {
        const res = await userApi.getAdminBadgeCounts();
        if (res.success && res.counts) {
          setBadgeCounts(res.counts);
        }
      } catch {
        // Silent catch for background poll
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 3000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const getNavItems = (): SidebarNavItem[] => {
    if (user?.role === 'admin') {
      return [
        {
          id: 'dashboard',
          label: 'Overview & Earnings',
          icon: LayoutDashboard
        },
        {
          id: 'users',
          label: 'User Accounts',
          icon: Users
        },
        {
          id: 'admin_kyc',
          label: 'KYC Verification',
          icon: ShieldCheck,
          badge: badgeCounts['admin_kyc'],
          badgeColor: 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
        },
        {
          id: 'qr_requests',
          label: 'QR Payment Requests',
          icon: FileText,
          badge: badgeCounts['qr_requests'],
          badgeColor: 'bg-amber-500 text-slate-950 shadow-amber-500/30'
        },
        {
          id: 'qr_gallery',
          label: 'QR Proof Gallery',
          icon: Images
        },
        {
          id: 'admin_bill_requests',
          label: 'CC Bill Requests',
          icon: CreditCard,
          badge: badgeCounts['admin_bill_requests'],
          badgeColor: 'bg-rose-500 text-white shadow-rose-500/30'
        },
        {
          id: 'live_bill_history',
          label: 'LiveBillPay History',
          icon: Clock
        },
        {
          id: 'ccbiller',
          label: 'ccbiller',
          icon: Sliders
        },
        {
          id: 'admin_payout',
          label: 'Payout Slabs & Txns',
          icon: ArrowRightLeft,
          badge: badgeCounts['admin_payout'],
          badgeColor: 'bg-cyan-500 text-slate-950 shadow-cyan-500/30'
        },
        {
          id: 'api_fund_request',
          label: 'API Wallet Top-Up',
          icon: Zap,
          badge: badgeCounts['api_fund_request'],
          badgeColor: 'bg-purple-500 text-white shadow-purple-500/30'
        },
        {
          id: 'admin_statement',
          label: 'Account Passbook',
          icon: FileText
        },
        {
          id: 'bank_entry',
          label: 'Bank Entry',
          icon: Landmark
        },
        {
          id: 'qr_master',
          label: 'QR Master',
          icon: QrCode
        },
        {
          id: 'qr_tracking',
          label: 'QR Tracking History',
          icon: History
        },
        {
          id: 'change_password',
          label: 'Change Password',
          icon: Key
        }
      ];
    }

    if (user?.role === 'user') {
      const userItems: SidebarNavItem[] = [
        { id: 'users', label: 'Dashboard', icon: Users },
        { id: 'qr_requests', label: 'QR Payments', icon: QrCode },
        { id: 'bill_request', label: 'CC Bill Pay', icon: CreditCard },
      ];

      if (liveBillPayEnabled) {
        userItems.push({ id: 'live_bill_pay', label: 'Live Bill Pay', icon: Zap });
      }

      if (instantPayoutEnabled) {
        userItems.push({ id: 'payout_transfer', label: 'Instant Payout', icon: ArrowRightLeft });
      }

      userItems.push(
        { id: 'user_statement', label: 'Account Passbook', icon: FileText },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound },
        { id: 'change_password', label: 'Security & Password', icon: Lock }
      );

      return userItems;
    }

    if (user?.role === 'distributor') {
      const dsItems: SidebarNavItem[] = [
        { id: 'users', label: 'Dashboard', icon: Users },
        { id: 'qr_requests', label: 'QR Payments', icon: QrCode },
      ];

      if (instantPayoutEnabled) {
        dsItems.push({ id: 'payout_transfer', label: 'Instant Payout', icon: ArrowRightLeft });
      }

      dsItems.push(
        { id: 'user_statement', label: 'Account Passbook', icon: FileText },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound },
        { id: 'change_password', label: 'Security & Password', icon: Lock }
      );

      return dsItems;
    }

    if (user?.role === 'super_distributor') {
      const msItems: SidebarNavItem[] = [
        { id: 'users', label: 'Dashboard', icon: Users },
        { id: 'qr_requests', label: 'QR Payments', icon: QrCode },
      ];

      if (instantPayoutEnabled) {
        msItems.push({ id: 'payout_transfer', label: 'Instant Payout', icon: ArrowRightLeft });
      }

      msItems.push(
        { id: 'user_statement', label: 'Account Passbook', icon: FileText },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound },
        { id: 'change_password', label: 'Security & Password', icon: Lock }
      );

      return msItems;
    }

    const items: SidebarNavItem[] = [
      { id: 'users', label: 'Dashboard', icon: Users },
      { id: 'qr_requests', label: 'QR Payments', icon: QrCode },
    ];

    if (instantPayoutEnabled) {
      items.push({ id: 'payout_transfer', label: 'Instant Payout', icon: ArrowRightLeft });
    }

    items.push(
      { id: 'user_statement', label: 'Account Passbook', icon: FileText },
      { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key },
      { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound },
      { id: 'change_password', label: 'Security & Password', icon: Lock }
    );

    return items;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container (Mobile Slide-Over Drawer) */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50
        w-72 sm:w-80 h-full shrink-0 bg-white border-r border-slate-200/90 shadow-2xl
        flex flex-col justify-between lg:hidden
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Brand Header (Aligned to h-16) */}
        <div className="h-16 px-3.5 border-b border-slate-200/90 bg-white flex items-center justify-between shrink-0">
          <div 
            onClick={() => onTabChange('dashboard')}
            className="flex-1 flex items-center cursor-pointer hover:opacity-90 transition-opacity min-w-0 py-1"
            title="Overview & Earnings"
          >
            <img 
              src="/just2pay-logo.png" 
              alt="Just2Pay" 
              className="w-full max-h-12 object-contain select-none p-[3px]"
            />
          </div>

          {/* Mobile Close Button */}
          <button 
            onClick={onClose} 
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
            Navigation Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={`
                  w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`
                    p-2 rounded-xl transition-colors flex-shrink-0
                    ${isActive ? 'bg-white/20 text-white shadow-xs' : 'bg-slate-100 text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50'}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left truncate">
                    <p className="truncate font-bold tracking-tight">{item.label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-[10px] font-black font-mono shadow-xs animate-pulse
                      ${item.badgeColor || 'bg-rose-500 text-white'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:translate-x-1 group-hover:text-slate-700'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/90 space-y-2 bg-slate-50/70">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-600 text-xs font-bold transition-all shadow-2xs"
          >
            <LogOut className="w-4 h-4" /> Log Out Session
          </button>
        </div>
      </aside>
    </>
  );
};
