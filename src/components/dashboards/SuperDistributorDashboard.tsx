import React, { useState, useEffect } from 'react';
import { userApi, qrApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import type { QrPaymentRequest } from '../../types/qr';
import { useAuthStore } from '../../store/authStore';
import { AddUserModal } from '../common/AddUserModal';
import { 
  Users, Wallet, ShieldCheck, UserPlus, RefreshCw, 
  QrCode, Coins, ArrowUpRight, Lock, Edit3, Percent, 
  CheckCircle2, AlertCircle, X, Loader2, BadgeCheck,
  ArrowDownLeft
} from 'lucide-react';

// Visual SVG Mini Sparkline component
const Sparkline: React.FC<{ color?: 'emerald' | 'indigo' | 'violet' | 'blue' | 'amber' }> = ({ color = 'emerald' }) => {
  const colorMap = {
    emerald: { stroke: '#059669', gradId: 'ms-grad-emerald' },
    indigo: { stroke: '#4f46e5', gradId: 'ms-grad-indigo' },
    violet: { stroke: '#7c3aed', gradId: 'ms-grad-violet' },
    blue: { stroke: '#2563eb', gradId: 'ms-grad-blue' },
    amber: { stroke: '#d97706', gradId: 'ms-grad-amber' }
  };
  const cfg = colorMap[color];

  return (
    <svg className="w-full h-7 overflow-visible pointer-events-none" viewBox="0 0 120 28" preserveAspectRatio="none">
      <defs>
        <linearGradient id={cfg.gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={cfg.stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={cfg.stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,20 Q18,26 32,14 T65,16 T94,7 T120,11 L120,28 L0,28 Z"
        fill={`url(#${cfg.gradId})`}
      />
      <path
        d="M0,20 Q18,26 32,14 T65,16 T94,7 T120,11"
        fill="none"
        stroke={cfg.stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const SuperDistributorDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [qrRequests, setQrRequests] = useState<QrPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Rate Editing State
  const [editingRateUser, setEditingRateUser] = useState<UserProfile | null>(null);
  const [rateInput, setRateInput] = useState<string>('');
  const [updatingRate, setUpdatingRate] = useState<boolean>(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [rateSuccess, setRateSuccess] = useState<string | null>(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const [hierarchyRes, qrRes] = await Promise.all([
        userApi.getHierarchy().catch(() => ({ success: false, users: [] })),
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] }))
      ]);

      if (hierarchyRes.success && Array.isArray(hierarchyRes.users)) {
        setTeamMembers(hierarchyRes.users);
      }
      if (qrRes.success && Array.isArray(qrRes.payment_requests)) {
        setQrRequests(qrRes.payment_requests);
      }
    } catch (err) {
      console.error('Fetch Hierarchy & QR Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleOpenRateModal = (member: UserProfile) => {
    setEditingRateUser(member);
    const currentRate = member.qr_charge_percent !== undefined && member.qr_charge_percent !== null 
      ? member.qr_charge_percent 
      : (member.charge_percentage || 0);
    setRateInput(String(currentRate));
    setRateError(null);
    setRateSuccess(null);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRateUser) return;
    const num = parseFloat(rateInput);
    if (isNaN(num) || num < 0 || num > 100) {
      setRateError('Please enter a valid rate between 0% and 100%.');
      return;
    }
    setUpdatingRate(true);
    setRateError(null);
    setRateSuccess(null);
    try {
      const res = await userApi.updateUserRate(editingRateUser.id, num);
      if (res.success) {
        setRateSuccess(res.message || 'Rate updated successfully!');
        setTeamMembers(prev => prev.map(m => m.id === editingRateUser.id ? { ...m, qr_charge_percent: num, charge_percentage: num } : m));
        setTimeout(() => {
          setEditingRateUser(null);
          fetchTeam();
        }, 1200);
      } else {
        setRateError(res.message || 'Failed to update rate.');
      }
    } catch (err: any) {
      setRateError(err.response?.data?.message || err.message || 'Error occurred while saving rate.');
    } finally {
      setUpdatingRate(false);
    }
  };

  const distributors = teamMembers.filter(u => u.role === 'distributor');
  const retailers = teamMembers.filter(u => u.role === 'user');
  const totalDownstreamBalance = teamMembers
    .filter(u => u.id !== user?.id)
    .reduce((acc, u) => acc + (u.wallet_balance || 0), 0);

  const approvedQr = qrRequests.filter(r => r.status === 'approved');
  const totalApprovedQrVolume = approvedQr.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalMsCommission = approvedQr.reduce((acc, r) => acc + Number(r.super_distributor_commission || 0), 0);

  const handleNavigate = (path: string) => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
      
      {/* EXECUTIVE GREETING & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Welcome, {user?.name || 'Master Distributor'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              <BadgeCheck className="w-3.5 h-3.5 text-purple-600" /> Super Distributor Partner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Agency: <strong className="text-slate-700 font-semibold">{user?.firm_name || 'Master Partner Agency'}</strong> • Hierarchy: <span className="font-semibold text-purple-700">{distributors.length} DS • {retailers.length} Retailers</span>
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add User / DS</span>
          </button>

          <button
            onClick={fetchTeam}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-2xs cursor-pointer"
            title="Refresh Network"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TPIN SETUP NOTICE (IF NOT SET) */}
      {!user?.tpin_set && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Setup 4-Digit TPIN for Live Bill Pay & Instant Payout
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">Action Needed</span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                You have not created your 4-digit Transaction PIN yet. Create it now anytime so you can instantly pay bills and payout funds.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('/manage-tpin')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
          >
            Create 4-Digit TPIN Now
          </button>
        </div>
      )}

      {/* 4 CONSOLIDATED DUAL-METRIC SERVICE CARDS (OPTION A EXACT SPEC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: MASTER NETWORK SIZE */}
        <div className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Users className="w-4 h-4" />
                </div>
                Master Hierarchy
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Network
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Downlines</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {distributors.length + retailers.length} <span className="text-sm font-semibold text-slate-400">Members</span>
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Structure:</span>
              <span className="font-bold text-slate-800 font-mono text-[11px]">
                {distributors.length} DS • {retailers.length} Retailers
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="blue" />
            <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                Active Downline Chain
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: DOWNLINE QR VOLUME */}
        <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <QrCode className="w-4 h-4" />
                </div>
                Network QR Volume
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Turnover
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Settled Volume</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalApprovedQrVolume.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Approved Loads:</span>
              <span className="font-bold text-slate-800 font-mono">
                {approvedQr.length} Requests
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="emerald" />
            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                Aggregated Network Load
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: SUPER DS COMMISSION */}
        <div className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Coins className="w-4 h-4" />
                </div>
                Super DS Commission
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Override
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Master Revenue</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalMsCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Your Base Rate (MS):</span>
              <span className="font-bold text-slate-800 font-mono">
                {Number(user?.qr_charge_percent || 0).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="violet" />
            <div className="flex items-center justify-between text-[11px] text-purple-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />
                Hierarchy Override Earning
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: DOWNSTREAM NETWORK BALANCE */}
        <div className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-3xl p-5 relative overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide flex items-center gap-1.5">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Wallet className="w-4 h-4" />
                </div>
                Network Liquidity
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Holding
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Downstream Balance</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{totalDownstreamBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs pt-3 border-t border-slate-100">
              <span className="text-slate-500 font-medium">All Downline Wallets:</span>
              <span className="font-bold text-slate-800 font-mono">
                {teamMembers.filter(u => u.id !== user?.id).length} Active
              </span>
            </div>
          </div>

          <div className="mt-4 pt-1">
            <Sparkline color="indigo" />
            <div className="flex items-center justify-between text-[11px] text-indigo-700 font-semibold mt-1">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
                Total Network Capital
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2-COLUMN LOWER CONTAINER (DOWNSTREAM TEAM TABLE & MASTER SUMMARY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: DOWNSTREAM DISTRIBUTOR & RETAILER NETWORK TABLE (8 COLS ON LG) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Downstream Hierarchy Network ({teamMembers.filter(u => u.id !== user?.id).length})
              </h3>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> + Onboard User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                  <th className="pb-3 pl-1 font-semibold">Member / Firm</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Mobile</th>
                  <th className="pb-3 font-semibold">QR Rate %</th>
                  <th className="pb-3 font-semibold text-right">Wallet Balance</th>
                  <th className="pb-3 font-semibold text-right">Comm. Earning</th>
                  <th className="pb-3 pr-1 font-semibold text-center">Status</th>
                  <th className="pb-3 pr-1 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Loading hierarchy network...
                    </td>
                  </tr>
                ) : teamMembers.filter(u => u.id !== user?.id).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No downstream members mapped yet. Click '+ Add User / DS' to register your first partner.
                    </td>
                  </tr>
                ) : (
                  teamMembers.filter(u => u.id !== user?.id).map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 pl-1">
                        <p className="font-bold text-slate-900">{member.name}</p>
                        <p className="text-[10px] text-slate-400">{member.firm_name}</p>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          member.role === 'distributor' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {member.role === 'distributor' ? 'Distributor' : 'Retailer'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                        {member.mobile_number}
                      </td>
                      <td className="py-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                        {member.qr_charge_percent !== undefined && member.qr_charge_percent !== null ? member.qr_charge_percent : (member.charge_percentage || 0)}%
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₹{Number(member.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        ₹{Number(member.commission_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 pr-1 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          member.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {member.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 pr-1 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenRateModal(member)}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                          title="Change Member QR Rate %"
                        >
                          <Edit3 className="w-3 h-3 text-purple-600" />
                          <span>Edit Rate</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: MASTER DISTRIBUTOR WALLET & SECURITY (4 COLS ON LG) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* QUICK WALLET OVERVIEW CARD */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600" /> Master Wallet
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Super DS
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Available Balance</p>
                <p className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
                  ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60">
                <button
                  onClick={() => handleNavigate('/fund-request')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Top-up Wallet</span>
                </button>
                <button
                  onClick={() => handleNavigate('/instant-payout')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Payouts</span>
                </button>
              </div>
            </div>

            {/* Base Rate Highlight */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Your Base Rate (MS)</span>
                <span className="font-mono font-bold text-purple-700">{Number(user?.qr_charge_percent || 0).toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mapped Distributors</span>
                <span className="font-mono font-bold text-blue-700">{distributors.length} DS Partners</span>
              </div>
            </div>
          </div>

          {/* AGENCY PROFILE CARD */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Master Security & Profile
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Master Agency</span>
                <span className="font-bold text-slate-900">{user?.firm_name || 'Super Distributor Agency'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Registered Phone</span>
                <span className="font-mono font-bold text-slate-900">{user?.mobile_number}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> {user?.status || 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 font-medium">TPIN Security</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${user?.tpin_set ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                  {user?.tpin_set ? 'Enabled' : 'Action Needed'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* CREATE NEW USER MODAL */}
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onUserAdded={fetchTeam}
        distributors={distributors}
        defaultRole="distributor"
      />

      {/* QUICK RATE EDIT MODAL */}
      {editingRateUser && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !updatingRate && setEditingRateUser(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Update Service Rate
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set QR rent / fee for <strong className="text-slate-900">{editingRateUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRateUser(null)}
                disabled={updatingRate}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Meta Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Firm / Member</span>
                <span className="font-bold text-slate-900">{editingRateUser.firm_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Role</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  editingRateUser.role === 'distributor' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {editingRateUser.role === 'distributor' ? 'Distributor' : 'Retailer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Mobile</span>
                <span className="font-mono text-indigo-700 font-bold">{editingRateUser.mobile_number}</span>
              </div>
            </div>

            {/* Rate Margin Analysis */}
            {(() => {
              const myBaseRate = Number(user?.qr_charge_percent || 0);
              const targetVal = parseFloat(rateInput) || 0;
              const margin = Math.max(0, targetVal - myBaseRate);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Your Base Rate (MS)</p>
                    <p className="text-sm font-black font-mono text-purple-700 mt-1">{myBaseRate.toFixed(2)}%</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Your Earning Margin</p>
                    <p className={`text-sm font-black font-mono mt-1 ${margin > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      +{margin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Error & Success Alerts */}
            {rateError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rateError}</span>
              </div>
            )}
            {rateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{rateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
                  New Rate Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="e.g. 0.80"
                    className="w-full bg-white border border-slate-300 focus:border-purple-600 rounded-xl py-3 px-4 font-mono font-bold text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-purple-100 shadow-2xs"
                    required
                    disabled={updatingRate}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    %
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Add:</span>
                  {[0.5, 0.7, 0.8, 1.0, 1.2].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRateInput(String(pct))}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold transition border border-slate-200 cursor-pointer shadow-2xs"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRateUser(null)}
                  disabled={updatingRate}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRate}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updatingRate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Rate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
