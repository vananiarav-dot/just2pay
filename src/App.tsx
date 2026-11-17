import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { userApi } from './services/api';
import { Sidebar } from './components/common/Sidebar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginSplitScreen } from './components/auth/LoginSplitScreen';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { CreateMpinModal } from './components/auth/CreateMpinModal';
import { ResetPinOtpModal } from './components/auth/ResetPinOtpModal';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { AdminOverviewDashboard } from './components/dashboards/AdminOverviewDashboard';
import { SuperDistributorDashboard } from './components/dashboards/SuperDistributorDashboard';
import { DistributorDashboard } from './components/dashboards/DistributorDashboard';
import { RetailerDashboard } from './components/dashboards/RetailerDashboard';
import { QRMasterManagement } from './components/qr/QRMasterManagement';
import { QRPaymentRequests } from './components/qr/QRPaymentRequests';
import { QRProofGallery } from './components/qr/QRProofGallery';
import { BankManagement } from './components/bank/BankManagement';
import { UserBillPaymentRequest } from './components/bills/UserBillPaymentRequest';
import { AdminBillRequestsManagement } from './components/bills/AdminBillRequestsManagement';
import { LiveBillPayment } from './components/bills/LiveBillPayment';
import { AdminLiveBillPayHistory } from './components/bills/AdminLiveBillPayHistory';
import { AdminCcBillerManagement } from './components/bills/AdminCcBillerManagement';
import { AdminPayoutManagement } from './components/payout/AdminPayoutManagement';
import { AdminFundRequestManagement } from './components/b2b/AdminFundRequestManagement';
import { UserPayoutTransfer } from './components/payout/UserPayoutTransfer';
import { UserAccountStatement } from './components/statement/UserAccountStatement';
import { AdminMasterStatement } from './components/statement/AdminMasterStatement';
import { LandingPage } from './components/home/LandingPage';
import { KycUploadScreen } from './components/kyc/KycUploadScreen';
import { KycUnderReviewScreen } from './components/kyc/KycUnderReviewScreen';
import { AdminKycManagement } from './components/kyc/AdminKycManagement';
import { ManageTpinPage } from './components/security/ManageTpinPage';
import { ChangeMpinPage } from './components/security/ChangeMpinPage';
import { ChangePasswordPage } from './components/security/ChangePasswordPage';
import type { UserRole } from './types/auth';
import { 
  Menu, LogOut, Wallet, Clock, ChevronDown, ChevronRight, Key, ShieldCheck,
  Zap, Bell, Settings, FileText, CreditCard, Landmark, X, SlidersHorizontal,
  LayoutDashboard, Users, ArrowRightLeft, RefreshCw, Images, Sliders, KeyRound, Lock, QrCode
} from 'lucide-react';

export default function App() {
  const { user, isAuthenticated, logout, updateUser, sessionRemainingSeconds } = useAuthStore();
  const { liveBillPayEnabled, instantPayoutEnabled, ccBillPayEnabled, fetchSettings } = useSettingsStore();
  const getTabFromPath = (path: string, role?: string): string => {
    const p = path.toLowerCase().trim();
    if (p.includes('admin-statement') || p.includes('admin_statement')) return 'admin_statement';
    if (p.includes('statement') || p.includes('passbook')) return role === 'admin' ? 'admin_statement' : 'user_statement';
    if (p.includes('admin-payout') || p.includes('admin_payout')) return 'admin_payout';
    if (p.includes('api-fund-request') || p.includes('fund-request') || p.includes('fund_request')) {
      return role === 'admin' ? 'api_fund_request' : 'dashboard';
    }
    if (p.includes('payout')) {
      if (role === 'admin') return 'admin_payout';
      return instantPayoutEnabled ? 'payout_transfer' : 'users';
    }
    if (p.includes('dashboard')) return role === 'admin' ? 'dashboard' : 'users';
    if (p.includes('bank-entry') || p.includes('bank_entry')) return 'bank_entry';
    if (p.includes('admin-bill-requests') || p.includes('admin_bill_requests')) return 'admin_bill_requests';
    if (p.includes('ccbiller')) return 'ccbiller';
    if (p.includes('live-bill-history') || p.includes('live_bill_history')) return 'live_bill_history';
    if (p.includes('live-bill-pay') || p.includes('live_bill_pay')) {
      if (role === 'user') {
        return liveBillPayEnabled ? 'live_bill_pay' : 'users';
      }
      return role === 'admin' ? 'live_bill_history' : 'users';
    }
    if (p.includes('bill-request') || p.includes('bill_request')) {
      if (role === 'admin') return 'admin_bill_requests';
      return 'bill_request';
    }
    if (p.includes('admin-kyc') || p.includes('admin_kyc') || p.includes('kyc')) {
      return role === 'admin' ? 'admin_kyc' : 'users';
    }
    if (p.includes('manage-tpin') || p.includes('tpin')) {
      return role === 'admin' ? 'dashboard' : 'manage_tpin';
    }
    if (p.includes('change-mpin') || p.includes('change_mpin')) {
      return role === 'admin' ? 'dashboard' : 'change_mpin';
    }
    if (p.includes('change-password') || p.includes('change_password')) {
      return 'change_password';
    }
    if (p.includes('qr-master') || p.includes('qr_master')) return 'qr_master';
    if (p.includes('qr-gallery') || p.includes('qr_gallery')) return role === 'admin' ? 'qr_gallery' : 'dashboard';
    if (p.includes('qr-requests') || p.includes('qr_requests')) return 'qr_requests';
    if (p.includes('users')) return 'users';
    if (role === 'admin') return 'dashboard';
    return 'users';
  };

  const getPathFromTab = (tab: string): string => {
    if (tab === 'dashboard' || tab === 'users') return '/dashboard';
    if (tab === 'manage_tpin') return '/manage-tpin';
    if (tab === 'change_mpin') return '/change-mpin';
    if (tab === 'change_password') return '/change-password';
    if (tab === 'admin_kyc') return '/admin-kyc';
    if (tab === 'admin_payout') return '/admin-payout';
    if (tab === 'api_fund_request') return '/fund-request';
    if (tab === 'payout_transfer') return '/payout';
    if (tab === 'admin_statement') return '/admin-statement';
    if (tab === 'user_statement') return '/statement';
    if (tab === 'bank_entry') return '/bank-entry';
    if (tab === 'admin_bill_requests') return '/admin-bill-requests';
    if (tab === 'live_bill_history') return '/live-bill-history';
    if (tab === 'ccbiller') return '/ccbiller';
    if (tab === 'live_bill_pay') return '/live-bill-pay';
    if (tab === 'bill_request') return '/bill-request';
    if (tab === 'qr_master') return '/qr-master';
    if (tab === 'qr_requests') return '/qr-requests';
    if (tab === 'qr_gallery') return '/qr-gallery';
    return '/dashboard';
  };


  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return getTabFromPath(window.location.pathname, user?.role);
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState<{ [key: string]: number }>({});

  const moreMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
        setShowProfileMenu(false);
        setShowNotifications(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Real-time polling for live request badge counts
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
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
  }, [isAuthenticated, user?.role]);

  // Auto-sync profile & wallet balance in real-time
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncProfile = async () => {
      try {
        const res = await userApi.getProfile();
        if (res.success && res.user) {
          updateUser(res.user);
        }
      } catch {
        // Silent catch for background sync
      }
    };

    syncProfile();
    const interval = setInterval(syncProfile, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated, updateUser]);

  // Auto-sync system settings periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchSettings();
    const interval = setInterval(fetchSettings, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchSettings]);

  // Guard direct URL / tab navigation if Live Bill Pay is disabled for retailer
  useEffect(() => {
    if (user?.role === 'user' && !liveBillPayEnabled && activeTab === 'live_bill_pay') {
      setActiveTabState('users');
      setCurrentPath('/users');
      window.history.replaceState({ tab: 'users' }, '', '/users');
    }
  }, [user?.role, liveBillPayEnabled, activeTab]);

  // Guard direct URL / tab navigation if Instant Payout is disabled for users
  useEffect(() => {
    if (user?.role !== 'admin' && !instantPayoutEnabled && activeTab === 'payout_transfer') {
      setActiveTabState('users');
      setCurrentPath('/users');
      window.history.replaceState({ tab: 'users' }, '', '/users');
    }
  }, [user?.role, instantPayoutEnabled, activeTab]);

  const handleTabChange = (tabId: string) => {
    let finalTab = tabId;
    if (user?.role === 'user' && !liveBillPayEnabled && tabId === 'live_bill_pay') {
      finalTab = 'users';
    }
    if (user?.role !== 'admin' && !instantPayoutEnabled && tabId === 'payout_transfer') {
      finalTab = 'users';
    }
    setActiveTabState(finalTab);
    const targetPath = getPathFromTab(finalTab);
    setCurrentPath(targetPath);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ tab: finalTab }, '', targetPath);
    }
  };

  // Listen for browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p);
      const currentTab = getTabFromPath(p, user?.role);
      setActiveTabState(currentTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role]);

  // Sync initial URL path and tab on auth load
  useEffect(() => {
    if (isAuthenticated) {
      const p = window.location.pathname;
      if (p === '/login' || p === '/') {
        const currentTab = getTabFromPath(p, user?.role);
        setActiveTabState(currentTab);
        const targetPath = getPathFromTab(currentTab);
        window.history.replaceState({ tab: currentTab }, '', targetPath);
        setCurrentPath(targetPath);
      }
    }
  }, [isAuthenticated, user?.role]);

  // Session expiry listener
  useEffect(() => {
    const handleExpired = () => {
      alert('🔒 Security Notice: Your session token has expired. Automatically logging out for security.');
      logout();
    };
    window.addEventListener('aseasy_session_expired', handleExpired);
    return () => window.removeEventListener('aseasy_session_expired', handleExpired);
  }, [logout]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'super_distributor': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'distributor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'user': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPageTitle = (tab: string, role?: string): string => {
    switch (tab) {
      case 'dashboard':
        return role === 'admin' ? 'Overview & Earnings' : 'Dashboard Overview';
      case 'users':
        return role === 'admin' ? 'User Accounts' : 'Dashboard & Account';
      case 'admin_kyc':
        return 'KYC Verification Requests';
      case 'qr_requests':
        return 'QR Payment Requests';
      case 'qr_gallery':
        return 'Approved QR Proof Gallery';
      case 'admin_bill_requests':
        return 'CC Bill Requests';
      case 'live_bill_history':
        return 'LiveBillPay History';
      case 'ccbiller':
        return 'ccbiller';
      case 'admin_payout':
        return 'Payout Slabs & Txns';
      case 'api_fund_request':
        return 'API Wallet Top-Up';
      case 'payout_transfer':
        return 'Instant Payout';
      case 'admin_statement':
        return 'Account Passbook';
      case 'user_statement':
        return 'Account Passbook';
      case 'bank_entry':
        return 'Bank Entry';
      case 'qr_master':
        return 'QR Master';
      case 'live_bill_pay':
        return 'Live Bill Pay';
      case 'bill_request':
        return 'Credit Card Bill Payment';
      case 'manage_tpin':
        return 'Create TPIN';
      case 'change_mpin':
        return 'Change MPIN';
      case 'change_password':
        return 'Account Password Security';
      default:
        return 'Dashboard';
    }
  };

  interface NavTabItem {
    id: string;
    label: string;
    badgeKey?: string;
    icon?: React.ElementType;
    desc?: string;
  }

  // Navigation tabs for the Tilshift top capsule bar
  const getNavTabs = (): { primary: NavTabItem[]; more: NavTabItem[] } => {
    if (user?.role === 'admin') {
      const primary: NavTabItem[] = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'users', label: 'Users' },
        { id: 'qr_requests', label: 'QR Requests', badgeKey: 'qr_requests' },
        { id: 'qr_master', label: 'QR Master' },
        { id: 'admin_bill_requests', label: 'CC Bills', badgeKey: 'admin_bill_requests' },
        { id: 'live_bill_history', label: 'LiveBill History' },
        { id: 'admin_payout', label: 'Payouts', badgeKey: 'admin_payout' },
        { id: 'api_fund_request', label: 'API Top-Up', badgeKey: 'api_fund_request' },
      ];

      const more: NavTabItem[] = [
        { id: 'admin_kyc', label: 'KYC Verification', icon: ShieldCheck, badgeKey: 'admin_kyc', desc: 'Merchant identity verification' },
        { id: 'admin_statement', label: 'Account Passbook', icon: FileText, desc: 'Ledger statements & transactions' },
        { id: 'bank_entry', label: 'Bank Entry', icon: Landmark, desc: 'Bank accounts & deposit entries' },
        { id: 'qr_gallery', label: 'QR Proof Gallery', icon: Images, desc: 'Approved UPI payment slips' },
        { id: 'ccbiller', label: 'ccbiller', icon: Sliders, desc: 'Card switch configuration' },
        { id: 'change_password', label: 'Security & Password', icon: Key, desc: 'Account access credentials' },
      ];

      return { primary, more };
    }

    if (user?.role === 'user') {
      const primary: NavTabItem[] = [
        { id: 'users', label: 'Dashboard' },
        { id: 'qr_requests', label: 'QR Payments' },
        { id: 'bill_request', label: 'CC Bill Pay' },
        ...(liveBillPayEnabled ? [{ id: 'live_bill_pay', label: 'Live Bill Pay' }] : []),
        ...(instantPayoutEnabled ? [{ id: 'payout_transfer', label: 'Instant Payout' }] : []),
      ];

      const more: NavTabItem[] = [
        { id: 'user_statement', label: 'Account Passbook', icon: FileText, desc: 'Ledger statements & passbook' },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key, desc: 'Transaction security PIN' },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound, desc: '6-digit mobile login PIN' },
        { id: 'change_password', label: 'Security & Password', icon: Lock, desc: 'Account access credentials' },
      ];

      return { primary, more };
    }

    if (user?.role === 'distributor') {
      const primary: NavTabItem[] = [
        { id: 'users', label: 'Dashboard' },
        { id: 'qr_requests', label: 'QR Payments' },
        ...(instantPayoutEnabled ? [{ id: 'payout_transfer', label: 'Instant Payout' }] : []),
      ];

      const more: NavTabItem[] = [
        { id: 'user_statement', label: 'Account Passbook', icon: FileText, desc: 'Commission ledger & passbook' },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key, desc: 'Transaction security PIN' },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound, desc: '6-digit mobile login PIN' },
        { id: 'change_password', label: 'Security & Password', icon: Lock, desc: 'Account access credentials' },
      ];

      return { primary, more };
    }

    if (user?.role === 'super_distributor') {
      const primary: NavTabItem[] = [
        { id: 'users', label: 'Dashboard' },
        { id: 'qr_requests', label: 'QR Payments' },
        ...(instantPayoutEnabled ? [{ id: 'payout_transfer', label: 'Instant Payout' }] : []),
      ];

      const more: NavTabItem[] = [
        { id: 'user_statement', label: 'Account Passbook', icon: FileText, desc: 'Master ledger & passbook' },
        { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key, desc: 'Transaction security PIN' },
        { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound, desc: '6-digit mobile login PIN' },
        { id: 'change_password', label: 'Security & Password', icon: Lock, desc: 'Account access credentials' },
      ];

      return { primary, more };
    }

    const primary: NavTabItem[] = [
      { id: 'users', label: 'Dashboard' },
      { id: 'qr_requests', label: 'QR Payments' },
      ...(instantPayoutEnabled ? [{ id: 'payout_transfer', label: 'Instant Payout' }] : []),
    ];

    const more: NavTabItem[] = [
      { id: 'user_statement', label: 'Account Passbook', icon: FileText, desc: 'Ledger statements & transactions' },
      { id: 'manage_tpin', label: user?.tpin_set ? 'Manage TPIN' : 'Create TPIN', icon: Key, desc: 'Transaction security PIN' },
      { id: 'change_mpin', label: 'Change MPIN', icon: KeyRound, desc: '6-digit mobile login PIN' },
      { id: 'change_password', label: 'Security & Password', icon: Lock, desc: 'Account access credentials' },
    ];

    return { primary, more };
  };

  const renderDashboardByRole = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard onTabChange={handleTabChange} />
          </ProtectedRoute>
        );
      case 'super_distributor':
        return (
          <ProtectedRoute allowedRoles={['super_distributor', 'admin']}>
            <SuperDistributorDashboard />
          </ProtectedRoute>
        );
      case 'distributor':
        return (
          <ProtectedRoute allowedRoles={['distributor', 'admin']}>
            <DistributorDashboard />
          </ProtectedRoute>
        );
      case 'user':
      default:
        return (
          <ProtectedRoute allowedRoles={['user', 'distributor', 'super_distributor', 'admin']}>
            <RetailerDashboard />
          </ProtectedRoute>
        );
    }
  };

  // 1. Not Authenticated -> Show Landing Page on / and Login on /login
  if (!isAuthenticated || !user) {
    if (currentPath === '/login') {
      return (
        <>
          <LoginSplitScreen
            onBackToHome={() => {
              window.history.pushState(null, '', '/');
              setCurrentPath('/');
            }}
            onOpenResetPin={() => setShowResetPinModal(true)}
          />
          {showResetPinModal && (
            <ResetPinOtpModal
              isOpen={true}
              onClose={() => setShowResetPinModal(false)}
            />
          )}
        </>
      );
    }

    return (
      <LandingPage
        onNavigateToLogin={() => {
          window.history.pushState(null, '', '/login');
          setCurrentPath('/login');
        }}
      />
    );
  }

  // 2. Force Change Password Guard
  if (user.must_change_password) {
    return <ForceChangePasswordModal isOpen={true} user={user} />;
  }

  // 3. Mandatory 6-Digit MPIN Setup Guard (Applies to Retailer, Distributor, Super Distributor - NOT Admin)
  if (user.role !== 'admin' && !user.mpin_set) {
    return <CreateMpinModal isOpen={true} user={user} />;
  }

  // 4. Mandatory KYC Guard (Applies to all non-admin users: Retailer, Distributor, Super Distributor)
  if (user.role !== 'admin') {
    const kycStatus = user.kyc_status || 'not_submitted';

    if (kycStatus !== 'verified') {
      if (kycStatus === 'under_review' || kycStatus === 'pending') {
        return <KycUnderReviewScreen user={user} />;
      }
      // 'not_submitted' or 'rejected'
      return <KycUploadScreen user={user} />;
    }
  }

  const { primary: primaryTabs, more: moreTabs } = getNavTabs();
  const activeMoreItem = moreTabs.find((t) => t.id === activeTab);
  const isMoreActive = Boolean(activeMoreItem);
  const moreBadgeCount = moreTabs.reduce((acc, tab) => acc + (tab.badgeKey ? (badgeCounts[tab.badgeKey] || 0) : 0), 0);

  return (
    <div className="h-screen overflow-hidden bg-white text-slate-800 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Mobile Slide-Over Sidebar Drawer (lg:hidden) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Tilshift Top Header Navigation Bar */}
      <header className="h-20 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-30 shadow-2xs relative">
        
        {/* LEFT: BRAND LOGO (Tilshift Style with Purple Lightning Circle) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo & Name */}
          <div 
            onClick={() => handleTabChange(user.role === 'admin' ? 'dashboard' : 'users')}
            className="flex items-center gap-2.5 cursor-pointer group select-none py-0.5"
            title="Just2Pay Home"
          >
            <img 
              src="/just2pay-logo.png" 
              alt="Just2Pay" 
              className="h-10 sm:h-12 w-auto object-contain group-hover:opacity-95 transition-opacity" 
            />
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              {getRoleLabel(user.role)}
            </span>
          </div>
        </div>

        {/* CENTER: TILSHIFT PILL CAPSULE NAVIGATION BAR */}
        <nav 
          style={{ background: 'linear-gradient(135deg, #FFB000 0%, #FF8500 50%, #FF5A00 100%)' }}
          className="hidden lg:flex items-center p-1.5 rounded-full border border-orange-400/40 shadow-sm shadow-orange-500/20"
        >
          {primaryTabs.map((item) => {
            const isActive = activeTab === item.id;
            const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleTabChange(item.id);
                  setShowMoreMenu(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap ${
                  isActive
                    ? 'bg-[#00265C] text-white shadow-sm'
                    : 'text-[#00265C] hover:bg-white/20'
                }`}
              >
                <span>{item.label}</span>
                {badgeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white ring-1 ring-white/50 animate-pulse font-mono shadow-xs">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* More Dropdown Pill */}
          {moreTabs.length > 0 && (
            <div ref={moreMenuRef} className="relative nav-dropdown-container">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap ${
                  isMoreActive
                    ? 'bg-[#00265C] text-white shadow-sm'
                    : 'text-[#00265C] hover:bg-white/20'
                }`}
              >
                <span>{isMoreActive ? activeMoreItem?.label : 'MORE'}</span>
                {moreBadgeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500 text-white ring-1 ring-white/50 animate-pulse font-mono shadow-xs">
                    {moreBadgeCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isMoreActive ? 'text-white' : 'text-[#00265C]'
                } ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* More Dropdown Popover */}
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-3xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Additional Modules
                  </div>
                  <div className="space-y-1">
                    {moreTabs.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      const subBadge = sub.badgeKey ? (badgeCounts[sub.badgeKey] || 0) : 0;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            handleTabChange(sub.id);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-2xl flex items-center gap-3 transition cursor-pointer ${
                            isSubActive
                              ? 'bg-indigo-50/80 text-indigo-700 font-bold border border-indigo-100'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {SubIcon && (
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSubActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <SubIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold truncate">{sub.label}</span>
                              {subBadge > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                                  {subBadge}
                                </span>
                              )}
                            </div>
                            {sub.desc && (
                              <div className="text-[10px] text-slate-400 truncate">{sub.desc}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* RIGHT: CONTROLS & USER PROFILE (Matching Screenshot: Bell, Gear, Avatar+Name) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Session Timer Pill */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(sessionRemainingSeconds)}</span>
          </div>

          {/* Main Wallet pill (Retailer / Dist only) */}
          {user.role !== 'admin' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold text-slate-500">Main Wallet</p>
                <p className="text-xs font-black font-mono text-emerald-700">
                  ₹{user.wallet_balance ? Number(user.wallet_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>
            </div>
          )}

          {/* 1. Notification Bell with Count Badge */}
          {(() => {
            const totalPendingAlerts = (badgeCounts['qr_requests'] || 0) +
              (badgeCounts['admin_bill_requests'] || 0) +
              (badgeCounts['admin_kyc'] || 0) +
              (badgeCounts['admin_payout'] || 0) +
              (badgeCounts['api_fund_request'] || 0);

            return (
              <div ref={notificationsRef} className="relative nav-dropdown-container">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowProfileMenu(false);
                    setShowMoreMenu(false);
                  }}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200/90 hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs relative transition cursor-pointer"
                  title="Pending Queue Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {totalPendingAlerts > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white animate-pulse shadow-xs font-mono">
                      {totalPendingAlerts}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-indigo-600" />
                        Pending Queue Alerts
                      </h4>
                      <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full ${
                        totalPendingAlerts > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {totalPendingAlerts > 0 ? `${totalPendingAlerts} Pending` : 'All Clear'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {/* 1. QR Requests */}
                      <div 
                        onClick={() => { handleTabChange('qr_requests'); setShowNotifications(false); }}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50 flex justify-between items-center cursor-pointer transition group border border-slate-100 hover:border-amber-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-slate-700 font-bold group-hover:text-amber-800">Pending QR Loads</span>
                        </div>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] ${
                          (badgeCounts['qr_requests'] || 0) > 0 ? 'bg-amber-500 text-white shadow-xs animate-pulse' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {badgeCounts['qr_requests'] || 0}
                        </span>
                      </div>

                      {/* 2. CC Bills */}
                      <div 
                        onClick={() => { handleTabChange('admin_bill_requests'); setShowNotifications(false); }}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-rose-50 flex justify-between items-center cursor-pointer transition group border border-slate-100 hover:border-rose-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-slate-700 font-bold group-hover:text-rose-800">Pending CC Bills</span>
                        </div>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] ${
                          (badgeCounts['admin_bill_requests'] || 0) > 0 ? 'bg-rose-500 text-white shadow-xs animate-pulse' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {badgeCounts['admin_bill_requests'] || 0}
                        </span>
                      </div>

                      {/* 3. KYC Submissions */}
                      <div 
                        onClick={() => { handleTabChange('admin_kyc'); setShowNotifications(false); }}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 flex justify-between items-center cursor-pointer transition group border border-slate-100 hover:border-emerald-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-slate-700 font-bold group-hover:text-emerald-800">Pending KYC Submissions</span>
                        </div>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] ${
                          (badgeCounts['admin_kyc'] || 0) > 0 ? 'bg-emerald-500 text-white shadow-xs animate-pulse' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {badgeCounts['admin_kyc'] || 0}
                        </span>
                      </div>

                      {/* 4. Instant Payouts */}
                      <div 
                        onClick={() => { handleTabChange('admin_payout'); setShowNotifications(false); }}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-cyan-50 flex justify-between items-center cursor-pointer transition group border border-slate-100 hover:border-cyan-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-500" />
                          <span className="text-slate-700 font-bold group-hover:text-cyan-800">Pending Payout Transfers</span>
                        </div>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] ${
                          (badgeCounts['admin_payout'] || 0) > 0 ? 'bg-cyan-500 text-white shadow-xs animate-pulse' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {badgeCounts['admin_payout'] || 0}
                        </span>
                      </div>

                      {/* 5. API Top-Up */}
                      <div 
                        onClick={() => { handleTabChange('api_fund_request'); setShowNotifications(false); }}
                        className="p-2.5 rounded-2xl bg-slate-50 hover:bg-purple-50 flex justify-between items-center cursor-pointer transition group border border-slate-100 hover:border-purple-200"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-slate-700 font-bold group-hover:text-purple-800">Pending API Top-Up</span>
                        </div>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[11px] ${
                          (badgeCounts['api_fund_request'] || 0) > 0 ? 'bg-purple-500 text-white shadow-xs animate-pulse' : 'text-slate-400 bg-slate-100'
                        }`}>
                          {badgeCounts['api_fund_request'] || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. Settings Gear Button */}
          <button
            onClick={() => handleTabChange('change_password')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/90 hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition cursor-pointer"
            title="Security & System Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 3. User Profile Avatar Widget (Matching Screenshot: Avatar + Name + Subtext) */}
          <div ref={profileMenuRef} className="relative nav-dropdown-container">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-3 p-1 pr-2 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition cursor-pointer group"
            >
              <img
                src={user.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Admin')}&background=6366f1&color=fff`}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:scale-105 transition"
              />
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-black text-slate-900 leading-tight">
                  {user.name || 'Super Admin HQ'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                  {user.email || user.mobile_number || 'admin@aseasyswipe.com'}
                </span>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-3xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email || user.mobile_number}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                {user.role !== 'admin' && (
                  <button
                    onClick={() => {
                      handleTabChange('manage_tpin');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>{user.tpin_set ? 'Manage TPIN' : 'Create TPIN'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    handleTabChange('change_password');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4 text-slate-400" />
                  <span>Change Password</span>
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Log Out Session
                </button>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* 3. Master Content Area (Full screen width) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white">
          {activeTab === 'dashboard' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOverviewDashboard />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_payout' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPayoutManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'api_fund_request' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminFundRequestManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_statement' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMasterStatement />
            </ProtectedRoute>
          )}
          {activeTab === 'user_statement' && <UserAccountStatement />}
          {activeTab === 'payout_transfer' && (
            instantPayoutEnabled ? <UserPayoutTransfer /> : renderDashboardByRole(user.role)
          )}
          {activeTab === 'bank_entry' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <BankManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'admin_bill_requests' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminBillRequestsManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'live_bill_history' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLiveBillPayHistory />
            </ProtectedRoute>
          )}
          {activeTab === 'ccbiller' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCcBillerManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'live_bill_pay' && (
            user.role === 'user' ? (
              liveBillPayEnabled ? <LiveBillPayment /> : renderDashboardByRole(user.role)
            ) : (
              user.role === 'admin' ? <AdminLiveBillPayHistory /> : renderDashboardByRole(user.role)
            )
          )}
          {activeTab === 'bill_request' && (
            <UserBillPaymentRequest />
          )}
          {activeTab === 'admin_kyc' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminKycManagement />
            </ProtectedRoute>
          )}
          {activeTab === 'manage_tpin' && (
            <ProtectedRoute allowedRoles={['user', 'distributor', 'super_distributor']}>
              <ManageTpinPage />
            </ProtectedRoute>
          )}
          {activeTab === 'change_mpin' && (
            <ProtectedRoute allowedRoles={['user', 'distributor', 'super_distributor']}>
              <ChangeMpinPage />
            </ProtectedRoute>
          )}
          {activeTab === 'change_password' && <ChangePasswordPage />}
          {activeTab === 'qr_master' && <QRMasterManagement />}
          {activeTab === 'qr_requests' && <QRPaymentRequests />}
          {activeTab === 'qr_gallery' && (
            <ProtectedRoute allowedRoles={['admin']}>
              <QRProofGallery />
            </ProtectedRoute>
          )}
          {activeTab === 'users' && renderDashboardByRole(user.role)}
          {activeTab !== 'dashboard' && activeTab !== 'admin_kyc' && activeTab !== 'admin_payout' && activeTab !== 'api_fund_request' && activeTab !== 'admin_statement' && activeTab !== 'user_statement' && activeTab !== 'payout_transfer' && activeTab !== 'bank_entry' && activeTab !== 'admin_bill_requests' && activeTab !== 'live_bill_history' && activeTab !== 'ccbiller' && activeTab !== 'live_bill_pay' && activeTab !== 'bill_request' && activeTab !== 'qr_master' && activeTab !== 'qr_requests' && activeTab !== 'qr_gallery' && activeTab !== 'manage_tpin' && activeTab !== 'change_mpin' && activeTab !== 'change_password' && activeTab !== 'users' && renderDashboardByRole(user.role)}
        </main>
    </div>
  );
}
