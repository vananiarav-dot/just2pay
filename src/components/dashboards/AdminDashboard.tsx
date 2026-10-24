import React, { useState, useEffect } from 'react';
import { userApi } from '../../services/api';
import type { UserProfile } from '../../types/auth';
import { AddUserModal } from '../common/AddUserModal';
import { 
  ShieldAlert, CheckCircle, Wallet, Search, Filter, 
  UserPlus, RefreshCw, Users, Lock, Activity, Edit, Trash2, Calendar, Building2,
  Key, KeyRound, Eye, EyeOff, Copy, Check, ShieldCheck, X
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onTabChange }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Credentials View Modal State
  const [viewingCredentialsUser, setViewingCredentialsUser] = useState<UserProfile | null>(null);
  const [showCredentialsPassword, setShowCredentialsPassword] = useState(false);
  const [showCredentialsMpin, setShowCredentialsMpin] = useState(false);
  const [showCredentialsTpin, setShowCredentialsTpin] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopyCredential = (val: string, fieldName: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getHierarchy();
      if (res.success) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Fetch Users Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    let nextStatus = 'Active';
    if (currentStatus === 'Active') nextStatus = 'Inactive';
    else if (currentStatus === 'Inactive') nextStatus = 'Blocked';
    else nextStatus = 'Active';

    try {
      const res = await userApi.updateStatus({ targetUserId: userId, newStatus: nextStatus });
      if (res.success) {
        fetchUsers();
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleWalletAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;

    try {
      const res = await userApi.updateStatus({
        targetUserId: selectedUser.id,
        walletAdjustAmount: parseFloat(adjustAmount)
      });

      if (res.success) {
        setSelectedUser(null);
        setAdjustAmount('');
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Wallet adjustment failed');
    }
  };



  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        const res = await userApi.deleteUser(userId);
        if (res.success) {
          setUsers(prev => prev.filter(u => u.id !== userId));
          fetchUsers();
        } else {
          alert(res.message || 'Failed to delete user.');
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete user.');
      }
    }
  };

  const formatJoiningDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const adminUsers = users.filter(u => u.role === 'admin');
  const nonAdminUsers = users.filter(u => u.role !== 'admin');

  const filteredUsers = nonAdminUsers.filter(u => {
    const name = u.name || '';
    const firmName = u.firm_name || '';
    const mobileNumber = u.mobile_number || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          firmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mobileNumber.includes(searchTerm);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPlatformBalance = nonAdminUsers.reduce((acc, u) => acc + (u.wallet_balance || 0), 0);
  const activeCount = nonAdminUsers.filter(u => u.status === 'Active').length;
  const blockedCount = nonAdminUsers.filter(u => u.status === 'Blocked').length;
  const pendingKycCount = nonAdminUsers.filter(u => u.kyc_status === 'under_review' || u.kyc_status === 'pending').length;

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* TOP ACTION BAR */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New User</span>
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total User Live Wallet Balance</p>
            <p className="text-xl font-bold text-purple-700 mt-1">
              ₹{totalPlatformBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Accounts</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{activeCount} / {nonAdminUsers.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-red-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Blocked Security Lockouts</p>
            <p className="text-xl font-bold text-red-700 mt-1">{blockedCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => onTabChange?.('admin_kyc')}
          className="bg-white rounded-2xl p-4 border border-amber-200 hover:border-amber-400 cursor-pointer transition flex items-center justify-between group shadow-2xs hover:shadow-md"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition">Pending KYC Submissions</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{pendingKycCount}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. DOWNSTREAM USER & MERCHANT HIERARCHY TABLE */}
      <div className="space-y-4">
        
        {/* FILTER SEARCH BAR */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Merchant Accounts</h3>
              <p className="text-[11px] text-slate-500">Super Distributors (MS), Distributors (DS) & Retailers</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, firm, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 shadow-2xs"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Hierarchy Roles</option>
                <option value="super_distributor">Super Distributor</option>
                <option value="distributor">Distributor</option>
                <option value="user">Retailer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* USERS TABLE */}
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Firm Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Mobile</th>
                  <th className="p-4">Wallet Balance</th>
                  <th className="p-4 text-amber-700">Commission Earning</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Loading hierarchy user records...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      No users found matching search filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      {/* USER DETAILS */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={u.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`} 
                            alt={u.name} 
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[10px] text-slate-500">{u.email || u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* FIRM NAME */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{u.firm_name}</span>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          u.role === 'super_distributor' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          u.role === 'distributor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.role === 'super_distributor' ? 'Super Distributor' : u.role === 'distributor' ? 'Distributor' : 'Retailer'}
                        </span>
                      </td>

                      {/* MOBILE */}
                      <td className="p-4 font-mono font-medium">{u.mobile_number}</td>

                      {/* WALLET BALANCE */}
                      <td className="p-4 font-bold text-slate-900 font-mono">
                        ₹{Number(u.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* COMMISSION BALANCE */}
                      <td className="p-4 font-bold text-amber-700 font-mono">
                        ₹{Number(u.commission_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* JOINING DATE */}
                      <td className="p-4 font-mono text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatJoiningDate(u.created_at)}</span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            u.status === 'Blocked' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {u.status}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            u.kyc_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : (u.kyc_status === 'under_review' || u.kyc_status === 'pending')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : u.kyc_status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {u.kyc_status === 'verified' ? '✓ KYC Verified' : (u.kyc_status === 'under_review' || u.kyc_status === 'pending') ? '⏳ KYC Review' : u.kyc_status === 'rejected' ? '✕ KYC Rejected' : 'KYC Pending'}
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* TOGGLE STATUS SWITCH */}
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            title={`Current status: ${u.status}. Click to toggle.`}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              u.status === 'Active' ? 'bg-emerald-500' : u.status === 'Blocked' ? 'bg-rose-600' : 'bg-amber-500'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                u.status === 'Active' ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* VIEW SECURITY CREDENTIALS ICON (PASSWORD, MPIN, TPIN) */}
                          <button
                            onClick={() => {
                              setViewingCredentialsUser(u);
                              setShowCredentialsPassword(false);
                              setShowCredentialsMpin(false);
                              setShowCredentialsTpin(false);
                              setCopiedField(null);
                            }}
                            title="View Credentials (Password, MPIN, TPIN)"
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-purple-700 hover:text-purple-900 border border-slate-200 transition cursor-pointer"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* EDIT ICON */}
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Edit User Details"
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-blue-700 hover:text-blue-900 border border-slate-200 transition cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* DELETE ICON */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete User"
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-rose-600 hover:text-rose-800 border border-slate-200 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* EDIT USER MODAL */}
      <AddUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onUserAdded={fetchUsers}
        distributors={users.filter(u => u.role === 'distributor')}
        userToEdit={editingUser}
      />

      {/* WALLET BALANCE ADJUST MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900">Adjust User Balance</h3>
            <p className="text-xs text-slate-500">User: <strong className="text-slate-900">{selectedUser.name}</strong> ({selectedUser.firm_name})</p>

            <form onSubmit={handleWalletAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. +5000 or -1000"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONBOARD NEW USER MODAL */}
      <AddUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserAdded={fetchUsers}
        distributors={users.filter(u => u.role === 'distributor')}
        allUsers={users}
      />

      {/* USER SECURITY CREDENTIALS VIEW MODAL (VIEW ONLY FOR ADMIN) */}
      {viewingCredentialsUser && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingCredentialsUser(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Security Credentials
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                      View Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong className="text-slate-900">{viewingCredentialsUser.name}</strong> ({viewingCredentialsUser.firm_name})
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Mobile: {viewingCredentialsUser.mobile_number}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingCredentialsUser(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Confidential Access Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] text-slate-600">
                Authorized Admin Confidential View. Admin cannot edit credentials from here.
              </span>
            </div>

            {/* 3 CREDENTIALS CARDS: PASSWORD, 6-DIGIT MPIN, 4-DIGIT TPIN */}
            <div className="space-y-3.5">
              
              {/* 1. LOGIN PASSWORD */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" /> Account Login Password
                  </span>
                  <span className="text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    Login Secret
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-base font-mono font-bold text-slate-900 tracking-wider select-all truncate">
                    {showCredentialsPassword ? (viewingCredentialsUser.plain_password || 'Password@123') : '••••••••'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCredentialsPassword(!showCredentialsPassword)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title={showCredentialsPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showCredentialsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential(viewingCredentialsUser.plain_password || 'Password@123', 'password')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title="Copy Password"
                    >
                      {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. 6-DIGIT LOGIN MPIN */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-purple-600" /> 6-Digit Login MPIN
                  </span>
                  <span className="text-[9px] uppercase font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    2-Step Login PIN
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-base font-mono font-bold text-slate-900 tracking-widest select-all">
                    {showCredentialsMpin ? (viewingCredentialsUser.mpin || '123456') : '••••••'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCredentialsMpin(!showCredentialsMpin)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title={showCredentialsMpin ? 'Hide MPIN' : 'Show MPIN'}
                    >
                      {showCredentialsMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential(viewingCredentialsUser.mpin || '123456', 'mpin')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title="Copy MPIN"
                    >
                      {copiedField === 'mpin' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. 4-DIGIT FINANCIAL TPIN */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" /> 4-Digit Financial TPIN
                  </span>
                  <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Bill Pay & Payout PIN
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-base font-mono font-bold text-slate-900 tracking-widest select-all">
                    {showCredentialsTpin ? (viewingCredentialsUser.tpin || '1234') : '••••'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowCredentialsTpin(!showCredentialsTpin)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title={showCredentialsTpin ? 'Hide TPIN' : 'Show TPIN'}
                    >
                      {showCredentialsTpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential(viewingCredentialsUser.tpin || '1234', 'tpin')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                      title="Copy TPIN"
                    >
                      {copiedField === 'tpin' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingCredentialsUser(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
