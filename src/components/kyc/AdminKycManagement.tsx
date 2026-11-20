import React, { useState, useEffect } from 'react';
import { kycApi } from '../../services/api';
import type { KycVerificationRecord } from '../../types/auth';
import { 
  ShieldCheck, CheckCircle2, XCircle, Search, Filter, 
  RefreshCw, Eye, Clock, AlertCircle, Building2, Phone, Calendar,
  CreditCard, FileText, Store, Landmark, X, ZoomIn, Loader2
} from 'lucide-react';

export const AdminKycManagement: React.FC = () => {
  const [requests, setRequests] = useState<KycVerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [viewingRequest, setViewingRequest] = useState<KycVerificationRecord | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'pan' | 'aadhaar_front' | 'aadhaar_back' | 'firm_selfie' | 'cheque'>('pan');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal
  const [rejectingRequest, setRejectingRequest] = useState<KycVerificationRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await kycApi.getAdminKycRequests();
      if (res.success && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Fetch KYC Requests Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
    const interval = setInterval(() => {
      fetchRequests(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenDocs = async (req: KycVerificationRecord) => {
    setActiveDocTab('pan');
    setViewingRequest(req);

    // If document images are not loaded yet (since list is lightweight for high performance), fetch on demand
    if (!req.pan_card_url && !req.aadhaar_front_url) {
      setLoadingDocs(true);
      try {
        const res = await kycApi.getAdminKycDetail(req.id);
        if (res.success && res.kyc) {
          setViewingRequest(res.kyc);
          setRequests(prev => prev.map(r => r.id === req.id ? res.kyc : r));
        }
      } catch (err) {
        console.error('Failed to load full KYC document images:', err);
      } finally {
        setLoadingDocs(false);
      }
    }
  };

  const handleApprove = async (record: KycVerificationRecord) => {
    if (!window.confirm(`Are you sure you want to APPROVE KYC for ${record.user?.name || record.user_id}? This will immediately unlock their dashboard.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await kycApi.reviewKycRequest({
        kyc_id: record.id,
        user_id: record.user_id,
        action: 'approve'
      });
      if (res.success) {
        alert('KYC Approved successfully!');
        setViewingRequest(null);
        fetchRequests();
      } else {
        alert(res.message || 'Failed to approve KYC');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Server error approving KYC.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest || !rejectionReason.trim()) {
      alert('Please enter a valid rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await kycApi.reviewKycRequest({
        kyc_id: rejectingRequest.id,
        user_id: rejectingRequest.user_id,
        action: 'reject',
        rejection_reason: rejectionReason.trim()
      });
      if (res.success) {
        alert('KYC Rejected. User can now view the reason and re-upload documents.');
        setRejectingRequest(null);
        setRejectionReason('');
        setViewingRequest(null);
        fetchRequests();
      } else {
        alert(res.message || 'Failed to reject KYC');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Server error rejecting KYC.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const user = r.user || {};
    const name = user.name || '';
    const firm = user.firm_name || '';
    const mobile = user.mobile_number || '';
    const userId = r.user_id || '';

    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mobile.includes(searchTerm) ||
      userId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'under_review' || r.status === 'pending').length;
  const verifiedCount = requests.filter(r => r.status === 'verified').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getDocUrl = (req: KycVerificationRecord, tab: typeof activeDocTab) => {
    switch (tab) {
      case 'pan': return req.pan_card_url;
      case 'aadhaar_front': return req.aadhaar_front_url;
      case 'aadhaar_back': return req.aadhaar_back_url;
      case 'firm_selfie': return req.firm_selfie_url;
      case 'cheque': return req.cheque_url;
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* HEADER & REFRESH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>KYC Verification Management</span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                {pendingCount} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review submitted merchant onboarding documents, verify details, and approve/reject user dashboard access.
          </p>
        </div>

        <button
          onClick={() => fetchRequests(true)}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved KYC</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{verifiedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejected Submissions</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-black text-indigo-600 font-mono mt-1">{requests.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by User Name, Mobile, Firm Name, or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 w-full sm:w-auto font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="under_review">Under Review (Pending)</option>
            <option value="verified">Verified (Approved)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Firm / Business</th>
                <th className="p-4">Role</th>
                <th className="p-4">Submitted At</th>
                <th className="p-4">KYC Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span className="font-medium">Loading KYC verification requests...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    No KYC requests found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const user = req.user || {};
                  const isPending = req.status === 'under_review' || req.status === 'pending';
                  const isApproved = req.status === 'verified';
                  const isRejected = req.status === 'rejected';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition">
                      {/* USER DETAILS */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.name || 'Unnamed User'}</p>
                          <p className="text-[11px] text-indigo-600 font-mono font-semibold mt-0.5">{user.mobile_number || req.user_id}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{user.email || req.id}</p>
                        </div>
                      </td>

                      {/* FIRM NAME */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{user.firm_name || 'N/A'}</span>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {user.role || 'Retailer'}
                        </span>
                      </td>

                      {/* SUBMITTED AT */}
                      <td className="p-4 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(req.submitted_at || req.created_at)}</span>
                        </div>
                      </td>

                      {/* KYC STATUS */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shadow-2xs ${
                          isApproved 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}>
                          {isApproved ? '✓ Verified' : isRejected ? '✕ Rejected' : '⏳ Under Review'}
                        </span>
                        {isRejected && req.rejection_reason && (
                          <p className="text-[10px] text-rose-600 mt-1 max-w-[200px] truncate font-medium" title={req.rejection_reason}>
                            {req.rejection_reason}
                          </p>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDocs(req)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Docs</span>
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                                title="Approve KYC"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingRequest(req);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                                title="Reject KYC"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* MODAL HEADER */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>KYC Documents Review</span>
                  <span className="text-xs text-indigo-600 font-medium">
                    — {viewingRequest.user?.name || viewingRequest.user_id} ({viewingRequest.user?.firm_name})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Mobile: {viewingRequest.user?.mobile_number} • Submitted: {formatDate(viewingRequest.submitted_at)}
                </p>
              </div>

              <button
                onClick={() => setViewingRequest(null)}
                className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DOCUMENT TABS */}
            <div className="flex border-b border-slate-200 bg-white px-4 overflow-x-auto">
              <button
                onClick={() => setActiveDocTab('pan')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeDocTab === 'pan' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>1. PAN Card</span>
              </button>

              <button
                onClick={() => setActiveDocTab('aadhaar_front')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeDocTab === 'aadhaar_front' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>2. Aadhaar (Front)</span>
              </button>

              <button
                onClick={() => setActiveDocTab('aadhaar_back')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeDocTab === 'aadhaar_back' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>3. Aadhaar (Back)</span>
              </button>

              <button
                onClick={() => setActiveDocTab('firm_selfie')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeDocTab === 'firm_selfie' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>4. Firm Selfie</span>
              </button>

              <button
                onClick={() => setActiveDocTab('cheque')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeDocTab === 'cheque' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>5. Bank Cheque</span>
              </button>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center bg-slate-50/70 min-h-[350px]">
              {loadingDocs ? (
                <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                  <p className="text-sm font-bold text-slate-800">Loading original KYC documents...</p>
                  <p className="text-xs text-slate-500 mt-1">Fetching high-resolution files from secure storage</p>
                </div>
              ) : getDocUrl(viewingRequest, activeDocTab) ? (
                <div className="max-w-2xl w-full flex flex-col items-center">
                  <img
                    src={getDocUrl(viewingRequest, activeDocTab)}
                    alt={activeDocTab}
                    className="max-h-[480px] w-auto object-contain rounded-2xl border border-slate-200 shadow-xl bg-white"
                  />
                  <a
                    href={getDocUrl(viewingRequest, activeDocTab)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold underline cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Open full original image in new tab</span>
                  </a>
                </div>
              ) : (
                <div className="text-center p-8 max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Document File Not Found On Server</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    User submitted a KYC request, but image files were not stored on the database due to large file size before auto-compression was enabled.
                  </p>
                  <p className="text-[11px] text-indigo-800 mt-3 font-medium bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 text-left">
                    💡 <strong>Admin Action:</strong> You can click <strong>Approve</strong> to unlock the user dashboard directly, or click <strong>Reject</strong> with reason (e.g. <em>"Please re-upload photos"</em>) so the user can re-upload with the new compressed uploader.
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Status: <span className="font-bold text-slate-900 uppercase">{viewingRequest.status}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition"
                >
                  Close
                </button>

                {(viewingRequest.status === 'under_review' || viewingRequest.status === 'pending') && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setRejectingRequest(viewingRequest);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject KYC</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(viewingRequest)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve KYC & Unlock Dashboard</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-2xs">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject KYC Submission</h3>
                <p className="text-xs text-slate-500">User: {rejectingRequest.user?.name || rejectingRequest.user_id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              Please specify the exact reason for rejecting this KYC. The user will see this message and be asked to re-upload clear documents.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Aadhaar back photo is blurry / Name on PAN does not match registration."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
