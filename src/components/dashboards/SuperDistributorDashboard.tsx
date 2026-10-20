import React, { useState, useEffect } from 'react';
import { userApi, qrApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import type { QrPaymentRequest } from '../../types/qr';
import { useAuthStore } from '../../store/authStore';
import { AddUserModal } from '../common/AddUserModal';
import { 
  Award, Users, Wallet, ShieldCheck, UserPlus, RefreshCw, 
  QrCode, Coins, ArrowUpRight, Lock, Edit3, Percent, 
  CheckCircle2, AlertCircle, X, Loader2 
} from 'lucide-react';

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

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER BANNER WITH ADD USER BUTTON */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" /> Super Distributor Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Master Network Hierarchy: Oversee mapped Distributors & Retailer outlets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-xl transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New User / DS</span>
          </button>
          
          <button
            onClick={fetchTeam}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Network"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TPIN SETUP NOTICE (IF NOT SET) */}
      {!user?.tpin_set && (
        <div className="bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-indigo-500/15 border border-amber-500/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Setup 4-Digit TPIN for Live Bill Pay & Instant Payout
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Action Needed</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                You have not created your 4-digit Transaction PIN yet. Create it now anytime so you can instantly pay bills and payout funds.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              window.history.pushState(null, '', '/manage-tpin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition shrink-0 cursor-pointer"
          >
            Create 4-Digit TPIN Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400">Mapped DS</p>
            <p className="text-xl font-bold text-indigo-400 mt-1">{distributors.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Distributors</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400">Mapped Retailers</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{retailers.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Active Outlets</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400">Downline QR Volume</p>
            <p className="text-xl font-bold text-purple-300 mt-1 font-mono">
              ₹{totalApprovedQrVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-purple-400/80 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{approvedQr.length} Loads</span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <QrCode className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400">QR Comm (MS)</p>
            <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
              ₹{totalMsCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-amber-400/80 mt-0.5">Hierarchy Earning</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400">Network Balance</p>
            <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">
              ₹{totalDownstreamBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">All Wallets</p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

      </div>

      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Downstream Distributor & Retailer Network
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> + Onboard User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Firm Name</th>
                <th className="py-3 px-4">Role Level</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">QR Rent %</th>
                <th className="py-3 px-4">Wallet Balance</th>
                <th className="py-3 px-4 text-amber-400">Commission Earning</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr><td colSpan={9} className="py-6 text-center text-slate-400">Loading network...</td></tr>
              ) : teamMembers.filter(u => u.id !== user?.id).length === 0 ? (
                <tr><td colSpan={9} className="py-6 text-center text-slate-400">No downstream users mapped yet. Click '+ Add New User / DS' above to register your first distributor.</td></tr>
              ) : (
                teamMembers.filter(u => u.id !== user?.id).map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-white">{member.name}</td>
                    <td className="py-3 px-4 text-slate-400">{member.firm_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        member.role === 'distributor' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {member.role === 'distributor' ? 'Distributor' : 'Retailer'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-300">{member.mobile_number}</td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-300">
                      {member.qr_charge_percent !== undefined && member.qr_charge_percent !== null ? member.qr_charge_percent : (member.charge_percentage !== undefined && member.charge_percentage !== null ? member.charge_percentage : 0)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      ₹{Number(member.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                      ₹{Number(member.commission_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        member.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenRateModal(member)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-[11px] font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-sm"
                        title="Change Member QR Rate %"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-purple-400" />
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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !updatingRate && setEditingRateUser(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Update Service Rate
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set QR rent / fee for <strong className="text-white">{editingRateUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRateUser(null)}
                disabled={updatingRate}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Meta Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Firm / Member</span>
                <span className="font-bold text-white">{editingRateUser.firm_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Role</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  editingRateUser.role === 'distributor' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {editingRateUser.role === 'distributor' ? 'Distributor' : 'Retailer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Mobile</span>
                <span className="font-mono text-indigo-300 font-bold">{editingRateUser.mobile_number}</span>
              </div>
            </div>

            {/* Rate Margin Analysis */}
            {(() => {
              const myBaseRate = Number(user?.qr_charge_percent || 0);
              const targetVal = parseFloat(rateInput) || 0;
              const margin = Math.max(0, targetVal - myBaseRate);
              return (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Your Base Rate (MS)</p>
                    <p className="text-sm font-black font-mono text-purple-300 mt-1">{myBaseRate.toFixed(2)}%</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Your Earning Margin</p>
                    <p className={`text-sm font-black font-mono mt-1 ${margin > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      +{margin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Error & Success Alerts */}
            {rateError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rateError}</span>
              </div>
            )}
            {rateSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{rateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveRate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
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
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl py-3 px-4 font-mono font-bold text-white text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition border border-slate-700/60 cursor-pointer"
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
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRate}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
