import React, { useState, useEffect } from 'react';
import { qrApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { QrMaster, QrPaymentRequest } from '../../types/qr';
import { 
  QrCode, Copy, Check, Upload, ArrowRight, ArrowDown, ShieldCheck, 
  AlertCircle, CheckCircle2, Clock, XCircle, Search, RefreshCw, 
  CheckCircle, X, Eye, FileText, Lock, Calendar, Hash, RotateCcw, Filter, Coins, Images,
  ZoomIn, ZoomOut, RotateCw, ExternalLink, Move, Pencil
} from 'lucide-react';

export const QRPaymentRequests: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isDistributor = user?.role === 'distributor';
  const isSuperDistributor = user?.role === 'super_distributor';
  const isChannelPartner = isDistributor || isSuperDistributor;

  // Active QR for Retailer
  const [activeQr, setActiveQr] = useState<QrMaster | null>(null);
  const [requestsList, setRequestsList] = useState<QrPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // System Settings State
  const [userQrVisible, setUserQrVisible] = useState(true);
  const [qrRequestSectionEnabled, setQrRequestSectionEnabled] = useState(true);

  // Retailer Payment Form State
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Copy State
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Admin Processing State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<QrPaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [revertingReq, setRevertingReq] = useState<QrPaymentRequest | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [editingNoteReq, setEditingNoteReq] = useState<QrPaymentRequest | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [previewRequest, setPreviewRequest] = useState<QrPaymentRequest | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [copiedModalUtr, setCopiedModalUtr] = useState<boolean>(false);

  // Re-assign QR Master State (Admin Only)
  const [allQrMasters, setAllQrMasters] = useState<QrMaster[]>([]);
  const [editingQrRequest, setEditingQrRequest] = useState<QrPaymentRequest | null>(null);
  const [selectedNewQrId, setSelectedNewQrId] = useState<string>('');
  const [updatingQr, setUpdatingQr] = useState<boolean>(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [utrFilter, setUtrFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const setRes = await qrApi.getSettings().catch(() => ({ success: false, settings: null }));
      if (setRes.success && setRes.settings) {
        setUserQrVisible(setRes.settings.user_qr_visible !== false);
        setQrRequestSectionEnabled(setRes.settings.qr_request_section_enabled !== false);
      }

      if (!isAdmin && !isChannelPartner) {
        const activeRes = await qrApi.getActiveQr();
        if (activeRes.success) {
          setActiveQr(activeRes.qr_master);
          if (activeRes.settings) {
            setUserQrVisible(activeRes.settings.user_qr_visible !== false);
            setQrRequestSectionEnabled(activeRes.settings.qr_request_section_enabled !== false);
          }
        }
      }

      const reqRes = await qrApi.getPaymentRequests();
      if (reqRes.success) {
        setRequestsList(reqRes.payment_requests || []);
      }
    } catch (err) {
      console.error('Fetch Data Error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoomLevel(prev => {
      const next = prev + delta;
      return Math.min(Math.max(0.5, next), 4);
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCloseModal = () => {
    setPreviewScreenshot(null);
    setPreviewRequest(null);
    handleResetZoom();
  };

  const handleCopyModalUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedModalUtr(true);
    setTimeout(() => setCopiedModalUtr(false), 2000);
  };

  const handleOpenScreenshot = async (req: QrPaymentRequest) => {
    setPreviewRequest(req);
    handleResetZoom();
    if (req.screenshot_url) {
      setPreviewScreenshot(req.screenshot_url);
      return;
    }
    try {
      const res = await qrApi.getScreenshot(req.id);
      if (res.success && res.screenshot_url) {
        setPreviewScreenshot(res.screenshot_url);
      } else {
        alert('No receipt screenshot available for this request.');
      }
    } catch {
      alert('Failed to load receipt screenshot.');
    }
  };

  useEffect(() => {
    fetchData(true);

    // Supabase Realtime Channel: Instant Push on DB changes (0 KB continuous egress)
    const channel = supabase
      .channel('realtime_qr_payment_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qr_payment_requests' },
        (payload) => {
          console.log('⚡ Realtime QR change event received:', payload.eventType);
          fetchData(false);
        }
      )
      .subscribe();

    // Fallback safety interval: 60s (was 3s / 12s)
    const interval = setInterval(() => {
      fetchData(false);
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isAdmin]);

  // Fetch QR Masters list for Admin re-assignment dropdown
  useEffect(() => {
    if (isAdmin) {
      qrApi.getQrList().then(res => {
        if (res.success && res.qr_masters) {
          setAllQrMasters(res.qr_masters);
        }
      }).catch(err => console.warn('Failed to load QR masters:', err));
    }
  }, [isAdmin]);

  const formatQrActiveTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const handleOpenEditQr = (req: QrPaymentRequest) => {
    setEditingQrRequest(req);
    const initialQrId = req.qr_master_id || allQrMasters.find(q => q.is_selected || q.is_active)?.id || '';
    setSelectedNewQrId(initialQrId);
  };

  const handleSaveReassignedQr = async () => {
    if (!editingQrRequest || !selectedNewQrId) return;
    setUpdatingQr(true);
    try {
      const res = await qrApi.updateRequestQrMaster(editingQrRequest.id, selectedNewQrId);
      if (res.success) {
        setSuccessMessage(res.message);
        const updatedTarget = allQrMasters.find(q => q.id === selectedNewQrId);
        const newName = updatedTarget ? updatedTarget.name : res.qr_name || 'Primary QR';

        setRequestsList(prev => prev.map(item => {
          if (item.id === editingQrRequest.id) {
            return {
              ...item,
              qr_master_id: selectedNewQrId,
              qr_name: newName,
              upi_id: updatedTarget?.upi_id || item.upi_id
            };
          }
          return item;
        }));

        if (previewRequest?.id === editingQrRequest.id) {
          setPreviewRequest(prev => prev ? {
            ...prev,
            qr_master_id: selectedNewQrId,
            qr_name: newName
          } : null);
        }

        setEditingQrRequest(null);
      } else {
        alert(res.message || 'Failed to update QR master.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating QR master.');
    } finally {
      setUpdatingQr(false);
    }
  };

  const handleCopyUpi = (upi?: string) => {
    if (!upi) return;
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // High-performance Canvas Image Compressor: converts heavy screenshots (3-8MB) to ~150-250KB Web-optimized JPEG
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          resolve(compressed);
        };
        img.onerror = () => resolve(event.target?.result as string);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select a valid image file (PNG, JPG, JPEG).');
        return;
      }
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImage(file);
        setScreenshotPreview(compressedBase64);
        setScreenshotUrl(compressedBase64);
      } catch (err) {
        console.error('Image compression error:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setScreenshotPreview(result);
          setScreenshotUrl(result);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isCompressing) {
      setErrorMessage('Please wait a moment while the screenshot is optimizing...');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage('UTR Number must be exactly 12 numeric digits.');
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!screenshotUrl && !screenshotPreview) {
      setErrorMessage('Payment receipt screenshot is required. Please upload screenshot.');
      return;
    }

    setSubmitting(true);
    try {
      let finalScreenshotUrl = screenshotUrl;

      // Direct Upload to Supabase Storage Bucket 'qr-receipts' (Zero DB image bloat)
      if (screenshotUrl && screenshotUrl.startsWith('data:image')) {
        try {
          const parts = screenshotUrl.split(';base64,');
          const contentType = parts[0].split(':')[1] || 'image/jpeg';
          const raw = window.atob(parts[1]);
          const uInt8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const ext = contentType.includes('png') ? 'png' : 'jpg';
          const fileName = `${user?.id || 'usr'}_${cleanUtr}_${Date.now()}.${ext}`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('qr-receipts')
            .upload(fileName, blob, { contentType, upsert: true });

          if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage
              .from('qr-receipts')
              .getPublicUrl(fileName);
            if (urlData?.publicUrl) {
              finalScreenshotUrl = urlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Frontend storage upload fallback to backend:', storageErr);
        }
      }

      const res = await qrApi.submitPaymentRequest({
        amount: numAmount,
        utr_number: cleanUtr,
        mobile_number: cleanMobile,
        screenshot_url: finalScreenshotUrl,
        qr_master_id: activeQr?.id
      });

      if (res.success) {
        setSuccessMessage(res.message || 'Payment request submitted successfully!');
        setAmount('');
        setUtrNumber('');
        setMobileNumber('');
        setScreenshotUrl('');
        setScreenshotPreview(null);
        await fetchData();
      } else {
        setErrorMessage(res.message || 'Submission failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Error submitting payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ATOMIC & IDEMPOTENT APPROVAL / REJECTION
  const handleProcessRequest = async (reqId: string, action: 'approved' | 'rejected', reason?: string) => {
    setProcessingId(reqId);
    try {
      const res = await qrApi.processPaymentRequest(reqId, action, reason);
      if (res.success) {
        setSuccessMessage(res.message);
        setRejectingReq(null);
        setRejectionReason('');
        if (previewRequest?.id === reqId) {
          setPreviewRequest(prev => prev ? { ...prev, status: action, rejection_reason: reason } : null);
        }
        fetchData();
      } else {
        alert(res.message || 'Operation failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error processing payment request.');
    } finally {
      setProcessingId(null);
    }
  };

  // METHOD 2: ATOMIC REVERT PAYMENT REQUEST (BLOCKS IF USER HAS INSUFFICIENT BALANCE)
  const handleRevertRequest = async (reqId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Please enter a reason for reverting this payment request.');
      return;
    }
    setProcessingId(reqId);
    try {
      const res = await qrApi.revertPaymentRequest(reqId, reason.trim());
      if (res.success) {
        setSuccessMessage(res.message);
        setRevertingReq(null);
        setRevertReason('');
        if (previewRequest?.id === reqId) {
          setPreviewRequest(prev => prev ? { ...prev, status: 'reverted', revert_reason: reason.trim() } : null);
        }
        fetchData();
      } else {
        alert(res.message || 'Operation failed.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error reverting payment request.');
    } finally {
      setProcessingId(null);
    }
  };

  const openNoteModal = (req: QrPaymentRequest) => {
    setEditingNoteReq(req);
    setNoteInput(req.admin_note || '');
  };

  const handleSaveNote = async (reqId: string, noteText: string) => {
    setSavingNote(true);
    try {
      const res = await qrApi.updateNote(reqId, noteText);
      if (res.success) {
        setSuccessMessage('Admin internal note saved successfully!');
        setRequestsList(prev => prev.map(r => r.id === reqId ? { ...r, admin_note: noteText.trim() } : r));
        if (previewRequest?.id === reqId) {
          setPreviewRequest(prev => prev ? { ...prev, admin_note: noteText.trim() } : null);
        }
        if (revertingReq?.id === reqId) {
          setRevertingReq(prev => prev ? { ...prev, admin_note: noteText.trim() } : null);
        }
        setEditingNoteReq(null);
      } else {
        alert(res.message || 'Failed to save note');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error saving note');
    } finally {
      setSavingNote(false);
    }
  };

  const isAnyFilterActive = Boolean(
    searchTerm.trim() ||
    utrFilter.trim() ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'TODAY' ||
    customStartDate ||
    customEndDate
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setUtrFilter('');
    setStatusFilter('ALL');
    setDateFilter('TODAY');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Base requests filtered by Date Range, UTR number, and Keyword Search (used for Top Summary Metrics)
  const summaryBaseRequests = requestsList.filter(r => {
    // 1. Date Filter
    if (dateFilter !== 'ALL') {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      const t = d.getTime();
      if (isNaN(t)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (dateFilter === 'TODAY') {
        if (t < startOfToday || t > endOfToday) return false;
      } else if (dateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (t < startOfYesterday || t > endOfYesterday) return false;
      } else if (dateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (t < startOf7Days || t > endOfToday) return false;
      } else if (dateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (t < startOf30Days || t > endOfToday) return false;
      } else if (dateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (t < startOfMonth || t > endOfToday) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate) {
          const [sY, sM, sD] = customStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (t < startTime) return false;
        }
        if (customEndDate) {
          const [eY, eM, eD] = customEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (t > endTime) return false;
        }
      }
    }

    // 2. UTR Number Filter
    if (utrFilter.trim()) {
      const cleanUtr = utrFilter.trim().toLowerCase();
      if (!(r.utr_number || '').toLowerCase().includes(cleanUtr)) {
        return false;
      }
    }

    // 3. Admin & Channel Partner Search (User, Firm, Mobile, QR Name)
    if ((isAdmin || isChannelPartner) && searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matches =
        (r.user_name || '').toLowerCase().includes(q) ||
        (r.mobile_number || '').includes(q) ||
        (r.firm_name || '').toLowerCase().includes(q) ||
        (r.qr_name || '').toLowerCase().includes(q) ||
        (r.utr_number || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    return true;
  });

  // Table rows: further filtered by Status
  const filteredRequests = summaryBaseRequests.filter(r => {
    if (statusFilter !== 'ALL') {
      if (r.status !== statusFilter) return false;
    }
    return true;
  });

  // Summary Metrics calculated dynamically from filtered range
  const totalSummaryCount = summaryBaseRequests.length;
  const pendingRequests = summaryBaseRequests.filter(r => r.status === 'pending');
  const approvedRequests = summaryBaseRequests.filter(r => r.status === 'approved');
  const rejectedRequests = summaryBaseRequests.filter(r => r.status === 'rejected');
  const revertedRequests = summaryBaseRequests.filter(r => r.status === 'reverted');

  const pendingCount = pendingRequests.length;
  const approvedCount = approvedRequests.length;
  const rejectedCount = rejectedRequests.length;
  const revertedCount = revertedRequests.length;

  const totalRequestedVolume = summaryBaseRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalApprovedAmount = approvedRequests.reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0);
  const totalApprovedRequestedAmount = approvedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalApprovedAdminCommission = approvedRequests.reduce((sum, r) => sum + (Number(r.admin_commission) || 0), 0);
  const totalPendingAmount = pendingRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalRejectedAmount = rejectedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const totalCommissionEarned = summaryBaseRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => {
      if (isSuperDistributor) {
        return sum + Number(r.super_distributor_commission || 0);
      }
      if (isDistributor) {
        return sum + Number(r.distributor_commission || 0);
      }
      return sum;
    }, 0);

  return (
    <div className="space-y-6 w-full pb-10">
      
      {/* HEADER / ACTIONS (REGULAR RETAILER) */}
      {!isAdmin && !isChannelPartner && (
        <div className="px-1 pt-1">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight uppercase">
            <QrCode className="w-6 h-6 text-[#0878E8]" /> 
            ADD QR payment
          </h2>
        </div>
      )}

      {/* HEADER / ACTIONS (CHANNEL PARTNER: DISTRIBUTOR & SUPER DISTRIBUTOR) */}
      {isChannelPartner && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white border border-purple-100 p-6 sm:p-7 rounded-3xl shadow-sm">
          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold uppercase tracking-wider">
              {isSuperDistributor ? 'Super Distributor Downline' : 'Distributor Downline'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
              <QrCode className="w-7 h-7 text-purple-700" /> 
              Downline QR Payment History
            </h2>
            <p className="text-xs text-slate-500">
              Live tracking of QR payment requests and commission earnings across your mapped downstream network.
            </p>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* RETAILER VIEW (WHEN REQUEST SECTION IS DISABLED) */}
      {!isAdmin && !isChannelPartner && !qrRequestSectionEnabled && (
        <div className="bg-amber-50/90 border border-amber-200 p-8 rounded-3xl text-center space-y-4 shadow-sm relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-slate-900">QR Payment Request Service Offline</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              QR Add Money and UTR payment request submissions are currently turned OFF / disabled by Admin. New load requests are temporarily paused.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-mono">
            <span>Status: Disabled by Admin</span>
          </div>
        </div>
      )}

      {/* RETAILER VIEW (UNIFIED MASTER CARD: MODERN UPI STANDEE + STEP ARROW + VERIFICATION FORM) */}
      {!isAdmin && !isChannelPartner && qrRequestSectionEnabled && (
        <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-100/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-center items-center lg:items-stretch gap-6 lg:gap-10 xl:gap-14 w-full">
            
            {/* LEFT SIDE: MODERN UPI STANDEE PASS CARD (STEP 1) */}
            <div className="w-full lg:w-[38%] xl:w-[34%] max-w-[440px] bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center justify-between space-y-3.5 relative overflow-hidden shadow-2xs">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-100/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* TOP GROUP: BRAND HEADER, LOGO & QR FRAME */}
              <div className="z-10 flex flex-col items-center text-center w-full space-y-1">
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black">1</span>
                    Step 1: Scan & Pay
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#00265C] text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Official QR
                  </span>
                </div>
                <img src="/just2pay-logo.png" alt="Just2Pay" className="h-9 sm:h-10 w-auto object-contain mx-auto mt-1 mb-3.5 sm:mb-4" />

                {/* QR CODE STANDEE FRAME WITH ROYAL BLUE BORDER */}
                <div className="relative group z-10 pt-1">
                  <div className="p-2.5 rounded-2xl bg-white border-[3px] border-[#0878E8] shadow-md transition-transform group-hover:scale-[1.01]">
                    <div className="rounded-xl overflow-hidden bg-white p-0.5">
                      {!userQrVisible ? (
                        <div className="w-52 h-52 sm:w-56 sm:h-56 relative rounded-xl overflow-hidden flex items-center justify-center bg-slate-900">
                          <img
                            src="/qr_invisible.jpg?v=2"
                            alt="QR Display Hidden"
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col items-center justify-end p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/30 backdrop-blur-md border border-purple-500/50 text-purple-200 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-lg mb-1">
                              <Lock className="w-3 h-3 text-amber-400" /> QR Code Hidden
                            </span>
                            <p className="text-[9px] font-extrabold text-white leading-tight">
                              Active QR code display is paused by Admin
                            </p>
                          </div>
                        </div>
                      ) : activeQr ? (
                        <img
                          src={activeQr.qr_image_url}
                          alt={activeQr.name}
                          className="w-52 h-52 sm:w-56 sm:h-56 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-52 h-52 sm:w-56 sm:h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
                          <Clock className="w-7 h-7 animate-spin text-[#0878E8] mb-1.5" />
                          <span className="text-[11px]">Loading Active QR...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MERCHANT NAME & COPYABLE UPI ID */}
              <div className="space-y-1 z-10 flex flex-col items-center text-center w-full">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {activeQr ? activeQr.name : 'Just2Pay Merchant'}
                </h3>

                {activeQr && (
                  <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs max-w-full">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider shrink-0">UPI ID:</span>
                    <span className="text-[11px] font-mono font-extrabold text-[#00265C] truncate">{activeQr.upi_id}</span>
                    <button
                      onClick={() => handleCopyUpi(activeQr.upi_id)}
                      className="ml-0.5 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0878E8] text-[9px] font-bold border border-blue-200 transition flex items-center gap-1 shrink-0 active:scale-95 shadow-2xs cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ACCEPTED ON ALL UPI APPS ROW */}
              <div className="pt-2.5 border-t border-slate-200/80 w-full z-10">
                <p className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Accepted via any UPI App</p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[9px] font-extrabold text-[#5f259f] shadow-2xs">PhonePe</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[9px] font-extrabold text-slate-800 shadow-2xs">GPay</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[9px] font-extrabold text-[#002970] shadow-2xs">Paytm</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[9px] font-extrabold text-[#008450] shadow-2xs">BHIM</span>
                </div>
              </div>
            </div>

            {/* MIDDLE: DIRECTIONAL STEP ARROW CONNECTOR */}
            <div className="flex flex-col items-center justify-center self-center shrink-0 z-10 my-1 lg:my-0">
              {/* Desktop direction arrow */}
              <div className="hidden lg:flex flex-col items-center gap-2 group">
                <div className="relative flex items-center justify-center">
                  <div className="absolute -inset-2 rounded-full bg-blue-400/20 blur-sm animate-pulse"></div>
                  <div className="w-13 h-13 rounded-full bg-gradient-to-r from-[#0878E8] via-[#0756B5] to-[#FF8500] p-[2px] shadow-lg transform transition-transform group-hover:scale-110">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-[#0878E8] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00265C] bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    Next Step ➔
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold mt-0.5">Submit Details</span>
                </div>
              </div>

              {/* Mobile direction arrow */}
              <div className="lg:hidden flex flex-col items-center gap-1.5 my-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#0878E8] to-[#FF8500] p-[2px] shadow-md">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <ArrowDown className="w-5 h-5 text-[#0878E8] animate-bounce" />
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#00265C] uppercase bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                  Step 2: Submit Details Below
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: PAYMENT REQUEST FORM (STEP 2 - COMPACT RIGHT SIDE) */}
            <div className="w-full lg:w-[38%] xl:w-[34%] max-w-[460px] flex flex-col justify-between space-y-4">
              
              {/* STEP 2 HEADER BADGE */}
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#00265C] text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#00265C] text-white flex items-center justify-center text-[8px] font-black">2</span>
                  Step 2: Submit Verification
                </span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ⚡ Instant Load
                </span>
              </div>
              
              {/* 3-STEP PROGRESS GUIDE RIBBON */}
              <div className="flex items-center justify-between p-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px]">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold shadow-2xs">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black">1</span>
                  <span>Scan QR</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#00265C] text-white font-bold shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[9px] font-black">2</span>
                  <span>Enter UTR</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-500 font-bold">
                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[9px] font-black">3</span>
                  <span>Wallet Credit</span>
                </div>
              </div>

              <form onSubmit={handleUserSubmit} className="flex-1 flex flex-col justify-between space-y-3.5">
                <div className="space-y-3.5">
                  
                  {/* AMOUNT */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                      Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        required
                        step="0.01"
                        placeholder="e.g. 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-bold focus:outline-none focus:border-[#0878E8] focus:ring-1 focus:ring-[#0878E8]/50 transition shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  {/* 12-DIGIT UTR NUMBER */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                        12-Digit UTR / Transaction ID <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${utrNumber.length === 12 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {utrNumber.length}/12 Digits {utrNumber.length === 12 && '✓'}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="Enter 12-digit UTR from your UPI app receipt"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#0878E8] focus:ring-1 focus:ring-[#0878E8]/50 transition shadow-2xs tracking-wider"
                    />
                  </div>

                  {/* SENDER MOBILE */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                      Sender Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit registered mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-[#0878E8] focus:ring-1 focus:ring-[#0878E8]/50 transition shadow-2xs"
                    />
                  </div>

                  {/* PAYMENT SCREENSHOT UPLOAD */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                      Payment Receipt Screenshot <span className="text-rose-500">*</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50 border-2 border-dashed ${
                      screenshotPreview ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-[#0878E8] hover:bg-blue-50/30'
                    } cursor-pointer transition-all duration-200 shadow-2xs group text-center`}>
                      {isCompressing ? (
                        <div className="w-6 h-6 border-2 border-[#0878E8] border-t-transparent rounded-full animate-spin" />
                      ) : screenshotPreview ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : (
                        <Upload className="w-6 h-6 text-[#0878E8] group-hover:scale-110 transition-transform shrink-0" />
                      )}
                      <div className="space-y-0.5">
                        <span className={`text-[11px] font-extrabold block ${screenshotPreview ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {isCompressing ? 'Optimizing Screenshot...' : screenshotPreview ? 'Receipt Screenshot Attached ✓' : 'Upload Payment Screenshot *'}
                        </span>
                        <p className="text-[9px] text-slate-400 font-medium">PNG, JPG, JPEG (Auto-compressed for instant upload)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        disabled={isCompressing}
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* SUBMIT BUTTON WITH GRADIENT */}
                <button
                  type="submit"
                  disabled={submitting || isCompressing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0878E8] via-[#0756B5] to-[#FF8500] hover:opacity-95 text-white font-black text-xs shadow-md transition transform hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {submitting ? 'Verifying & Submitting...' : isCompressing ? 'Optimizing Image...' : 'Submit Verification'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN STATS CARDS (CONSOLIDATED 4-CARD LAYOUT) */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Requests */}
          <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Total QR Requests</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xl font-black text-slate-900">{totalSummaryCount}</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Vol: ₹{totalRequestedVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Admin Commission</span>
                <span className="font-bold text-purple-700 font-mono">
                  + ₹{totalApprovedAdminCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Pending Approvals */}
          <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Pending Approvals</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                  ₹{totalPendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingCount} Pending
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Pending Requests</span>
                <span className="font-bold text-amber-700">
                  {pendingCount} {pendingCount === 1 ? 'request' : 'requests'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Approved Payments */}
          <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Approved Payments</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                  ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {approvedCount} Approved
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Requested Vol / Comm</span>
                <span className="font-bold text-slate-700 font-mono">
                  ₹{totalApprovedRequestedAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  <span className="text-purple-700 ml-1">(+₹{totalApprovedAdminCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4. Rejected Requests */}
          <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-rose-300 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Rejected Payments</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                  ₹{totalRejectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {rejectedCount} Rejected
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="font-bold text-rose-600">Declined / Invalid UTR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL PARTNER (DISTRIBUTOR / SUPER DISTRIBUTOR) STATS CARDS */}
      {isChannelPartner && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Downline Approved Volume</p>
              <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                ₹{totalApprovedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{approvedCount} Settled Payment(s)</p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Approvals</p>
              <p className="text-xl font-bold text-amber-700 mt-1">{pendingCount}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Under Admin Verification</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">
                {isSuperDistributor ? 'Your Commission (MS)' : 'Your Commission (DS)'}
              </p>
              <p className="text-xl font-bold text-purple-700 mt-1 font-mono">
                ₹{totalCommissionEarned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-purple-700/80 mt-0.5 font-medium">Earned from Downline Loads</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT REQUESTS HISTORY TABLE (ADMIN, CHANNEL PARTNER, & USER) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm space-y-4">
        
        {/* TABLE SEARCH & FILTER HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-700" />
                {isAdmin 
                  ? 'All User QR Payment Requests' 
                  : isChannelPartner 
                  ? 'Downline QR Payment Requests History' 
                  : 'My Payment Requests History'}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  {filteredRequests.length}{filteredRequests.length !== requestsList.length ? ` / ${requestsList.length}` : ''}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isChannelPartner
                  ? 'Real-time record of all QR wallet reload requests made across your downstream retailers'
                  : 'Filter by date range, UTR number, or transaction status'}
              </p>
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* FILTERS BAR */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Date Range Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer pr-2 font-medium"
              >
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
                <option value="ALL">All Time</option>
              </select>
            </div>

            {/* Custom Range Inputs (when dateFilter === 'CUSTOM') */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-purple-300 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[11px] text-slate-500 font-medium">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600 font-mono"
                />
                <span className="text-[11px] text-slate-500 font-medium">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600 font-mono"
                />
              </div>
            )}

            {/* UTR Number Filter Input */}
            <div className="relative min-w-[180px] sm:w-52">
              <Hash className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by UTR No..."
                value={utrFilter}
                onChange={(e) => setUtrFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 font-mono"
              />
              {utrFilter && (
                <button
                  type="button"
                  onClick={() => setUtrFilter('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="reverted">Reverted</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Admin & Channel Partner Search Bar (User, Firm, QR, Mobile) */}
            {(isAdmin || isChannelPartner) && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search user, firm, mobile..." : "Search downline retailer, firm, mobile..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">User & Firm</th>
                <th className="p-4">Mobile Number</th>
                <th className="p-4">QR Name</th>
                <th className="p-4">12-Digit UTR</th>
                <th className="p-4">Requested Amt</th>
                <th className="p-4">Charge (%)</th>
                {(isAdmin || isDistributor) && (
                  <th className="p-4 text-amber-700">{isDistributor ? 'Your Comm (DS)' : 'DS Comm'}</th>
                )}
                {(isAdmin || isSuperDistributor) && (
                  <th className="p-4 text-indigo-700">{isSuperDistributor ? 'Your Comm (MS)' : 'MS Comm'}</th>
                )}
                {isAdmin && <th className="p-4 text-emerald-700">Admin Comm</th>}
                <th className="p-4">Net Credit</th>
                <th className="p-4">Status</th>
                {isAdmin && <th className="p-4 text-amber-700">Admin Note</th>}
                <th className="p-4 text-right">Actions / Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 14 : isChannelPartner ? 11 : 10} className="p-8 text-center text-slate-400">
                    Loading QR payment requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 14 : isChannelPartner ? 11 : 10} className="p-8 text-center text-slate-400">
                    No payment requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    
                    {/* DATE & TIME (1ST COLUMN) */}
                    <td className="p-4 whitespace-nowrap">
                      {r.created_at ? (
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="font-bold text-slate-800">
                            {new Date(r.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.created_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">N/A</span>
                      )}
                    </td>

                    {/* USER & FIRM */}
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-900">{r.user_name || 'Retailer User'}</p>
                        <p className="text-[10px] text-slate-400">{r.firm_name || 'N/A'}</p>
                      </div>
                    </td>

                    {/* MOBILE NUMBER */}
                    <td className="p-4 font-mono font-semibold text-slate-700">
                      {r.mobile_number || 'N/A'}
                    </td>

                    {/* QR NAME */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs inline-block tracking-wide">
                          {r.qr_name || activeQr?.name || 'Primary QR'}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditQr(r)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-700 border border-slate-200 hover:border-purple-300 transition-all shadow-xs cursor-pointer"
                            title="Edit / Change Assigned QR"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* UTR NUMBER */}
                    <td className="p-4 font-mono font-bold text-purple-700">
                      {r.utr_number}
                    </td>

                    {/* REQUESTED AMOUNT */}
                    <td className="p-4 font-bold text-slate-900">
                      ₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* CHARGE (%) */}
                    <td className="p-4 font-mono text-slate-500">
                      {(r.charge_percent !== undefined && r.charge_percent !== null ? r.charge_percent : 0)}% (-₹{Number(r.charge_amount || 0).toFixed(2)})
                    </td>

                    {/* DS COMMISSION (ADMIN OR DISTRIBUTOR) */}
                    {(isAdmin || isDistributor) && (
                      <td className="p-4 font-mono font-bold text-amber-700">
                        +₹{Number(r.distributor_commission || 0).toFixed(2)}
                      </td>
                    )}

                    {/* MS COMMISSION (ADMIN OR SUPER DISTRIBUTOR) */}
                    {(isAdmin || isSuperDistributor) && (
                      <td className="p-4 font-mono font-bold text-indigo-700">
                        +₹{Number(r.super_distributor_commission || 0).toFixed(2)}
                      </td>
                    )}

                    {/* ADMIN COMMISSION (ADMIN ONLY) */}
                    {isAdmin && (
                      <td className="p-4 font-mono font-bold text-emerald-700">
                        +₹{Number(
                          r.admin_commission !== undefined
                            ? r.admin_commission
                            : Math.max(0, (r.charge_amount || 0) - ((r.distributor_commission || 0) + (r.super_distributor_commission || 0)))
                        ).toFixed(2)}
                      </td>
                    )}

                    {/* NET CREDIT */}
                    <td className="p-4 font-extrabold text-emerald-700 font-mono">
                      ₹{Number(r.net_amount || (r.amount - (r.charge_amount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
                        r.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        r.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        r.status === 'reverted' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {r.status === 'reverted' && <RotateCcw className="w-3 h-3 text-purple-600" />}
                        {r.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                        <span className="uppercase">{r.status}</span>
                      </span>
                    </td>

                    {/* ADMIN NOTE COLUMN (ADMIN ONLY) */}
                    {isAdmin && (
                      <td className="p-4">
                        {r.admin_note ? (
                          <div
                            onClick={() => openNoteModal(r)}
                            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg px-2.5 py-1 text-xs font-mono font-medium cursor-pointer transition w-fit max-w-[200px] shadow-2xs group"
                            title={`Admin Note: ${r.admin_note} (Click to edit)`}
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">{r.admin_note}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openNoteModal(r)}
                            className="px-2 py-1 rounded-lg border border-dashed border-slate-300 hover:border-amber-400 text-slate-400 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Add internal admin note (e.g. Needs Revert)"
                          >
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>+ Note</span>
                          </button>
                        )}
                      </td>
                    )}

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* SCREENSHOT PREVIEW ICON */}
                        <button
                          onClick={() => handleOpenScreenshot(r)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                          title="View Receipt Screenshot"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* ADMIN NOTE QUICK ICON (ADMIN ONLY) */}
                        {isAdmin && (
                          <button
                            onClick={() => openNoteModal(r)}
                            className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                              r.admin_note 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                            title={r.admin_note ? `Admin Note: ${r.admin_note} (Click to edit)` : 'Add Admin Note'}
                          >
                            <FileText className="w-4 h-4 text-amber-600" />
                          </button>
                        )}

                        {/* ADMIN APPROVE / REJECT BUTTONS */}
                        {isAdmin && r.status === 'pending' && (
                          <>
                            <button
                              disabled={processingId === r.id}
                              onClick={() => handleProcessRequest(r.id, 'approved')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{processingId === r.id ? 'Processing...' : 'Approve'}</span>
                            </button>

                            <button
                              disabled={processingId === r.id}
                              onClick={() => setRejectingReq(r)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {r.status === 'approved' && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Approved
                            </span>
                            {isAdmin && (
                              <button
                                disabled={processingId === r.id}
                                onClick={() => {
                                  setRevertingReq(r);
                                  setRevertReason('');
                                }}
                                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs hover:border-amber-400 active:scale-95"
                                title="Revert accidental approval"
                              >
                                <RotateCcw className="w-3 h-3 text-amber-700" /> Revert
                              </button>
                            )}
                          </div>
                        )}

                        {r.status === 'reverted' && (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <RotateCcw className="w-3.5 h-3.5" /> Reverted
                          </span>
                        )}

                        {r.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CHANGE QR MASTER MODAL (Admin Only, z-[60]) */}
      {editingQrRequest && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600" /> Change QR Master Assignment
              </h3>
              <button
                type="button"
                onClick={() => setEditingQrRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction Brief */}
            <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-2xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer User:</span>
                <span className="font-bold text-slate-900">{editingQrRequest.user_name} ({editingQrRequest.firm_name || 'N/A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">12-Digit UTR:</span>
                <span className="font-mono font-bold text-purple-700">{editingQrRequest.utr_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">₹{Number(editingQrRequest.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Shown QR:</span>
                <span className="font-extrabold text-purple-700">{editingQrRequest.qr_name || 'None'}</span>
              </div>
            </div>

            {/* Select Target QR */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Correct QR Master:
              </label>
              <select
                value={selectedNewQrId}
                onChange={(e) => setSelectedNewQrId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="" disabled>-- Select QR Code --</option>
                {allQrMasters.map((qm) => {
                  const activeTime = formatQrActiveTime(qm.updated_at || qm.created_at);
                  const isLive = qm.is_selected || qm.is_active;
                  return (
                    <option key={qm.id} value={qm.id}>
                      {qm.name} ({qm.upi_id}) • Active since: {activeTime} {isLive ? '★ [CURRENT ACTIVE]' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected QR Card Preview */}
            {selectedNewQrId && (() => {
              const selectedQm = allQrMasters.find(q => q.id === selectedNewQrId);
              if (!selectedQm) return null;
              const activeTime = formatQrActiveTime(selectedQm.updated_at || selectedQm.created_at);
              const isLive = selectedQm.is_selected || selectedQm.is_active;

              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800">{selectedQm.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {isLive ? 'Currently Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">UPI: {selectedQm.upi_id}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Active / Updated Date: <strong className="text-slate-700">{activeTime}</strong></span>
                  </div>
                </div>
              );
            })()}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 આ QR બદલવાથી આ એન્ટ્રી પસંદ કરેલા QR ના ખાતામાં અને QR Tracking History / Proof Gallery માં પણ તે જ QR નીચે ગણાશે.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingQrRequest(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingQr || !selectedNewQrId || selectedNewQrId === editingQrRequest.qr_master_id}
                onClick={handleSaveReassignedQr}
                className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {updatingQr ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Save & Update QR
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL (z-[60] so it appears on top of preview modal) */}
      {rejectingReq && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" /> Reject Payment Request
            </h3>
            <p className="text-xs text-slate-500">
              UTR: <strong className="text-slate-900 font-mono">{rejectingReq.utr_number}</strong> | User: <strong className="text-slate-900">{rejectingReq.user_name}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Enter reason for rejection (e.g. Invalid UTR or Amount mismatch)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId === rejectingReq.id}
                onClick={() => handleProcessRequest(rejectingReq.id, 'rejected', rejectionReason)}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METHOD 2: REVERT CONFIRMATION MODAL (z-[60] so it appears on top) */}
      {revertingReq && (() => {
        const availableBalance = Number(revertingReq.user_wallet_balance || 0);
        const requiredAmount = Number(
          revertingReq.net_amount !== undefined
            ? revertingReq.net_amount
            : (revertingReq.amount - (revertingReq.charge_amount || 0))
        );
        const isInsufficient = availableBalance < requiredAmount;
        const shortage = Math.max(0, requiredAmount - availableBalance);

        return (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-600" /> Revert Approved Request
                </h3>
                <button
                  onClick={() => setRevertingReq(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DETAILS SUMMARY */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Retailer User</span>
                  <span className="font-extrabold text-slate-800">{revertingReq.user_name || 'Retailer User'}</span>
                  <span className="text-slate-400 block text-[10px]">{revertingReq.firm_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">12-Digit UTR</span>
                  <span className="font-mono font-bold text-slate-900">{revertingReq.utr_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Original Amount</span>
                  <span className="font-mono font-bold text-slate-800">₹{Number(revertingReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Amount to Deduct</span>
                  <span className="font-mono font-black text-rose-600">₹{requiredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* METHOD 2 BALANCE VALIDATION BANNER */}
              {isInsufficient ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Insufficient Wallet Balance (Revert Blocked)</span>
                  </div>
                  <p className="text-rose-700 leading-relaxed text-[11px]">
                    User currently has only <strong className="font-mono text-rose-900">₹{availableBalance.toFixed(2)}</strong>, while <strong className="font-mono text-rose-900">₹{requiredAmount.toFixed(2)}</strong> is required to revert.
                  </p>
                  <p className="text-[11px] text-rose-600 font-semibold bg-rose-100/60 p-2 rounded-xl border border-rose-200">
                    ⚠️ Shortage: <strong className="font-mono">₹{shortage.toFixed(2)}</strong>. This request cannot be reverted until the retailer deposits sufficient funds into their wallet.
                  </p>

                  {/* QUICK REVERT NOTE ACTION IN REVERT MODAL */}
                  <div className="pt-2 border-t border-rose-200/70 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-rose-800 font-semibold">
                      Leave an admin note to track needed reversal:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        openNoteModal(revertingReq);
                        if (!revertingReq.admin_note) {
                          setNoteInput(`⚠️ Needs Revert: ₹${requiredAmount.toFixed(2)} (Shortage: ₹${shortage.toFixed(2)})`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition shrink-0"
                    >
                      <FileText className="w-3 h-3" />
                      <span>{revertingReq.admin_note ? 'Edit Admin Note' : '+ Add Revert Note'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Sufficient Wallet Balance Available</span>
                  </div>
                  <p className="text-emerald-700 text-[11px]">
                    User's current balance: <strong className="font-mono">₹{availableBalance.toFixed(2)}</strong>. 
                    Balance after revert will be: <strong className="font-mono">₹{(availableBalance - requiredAmount).toFixed(2)}</strong>.
                  </p>
                </div>
              )}

              {/* REVERT REASON (MANDATORY) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Revert Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Accidental approval of wrong UTR or amount mismatch"
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevertingReq(null)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isInsufficient || processingId === revertingReq.id || !revertReason.trim()}
                  onClick={() => handleRevertRequest(revertingReq.id, revertReason)}
                  className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  title={isInsufficient ? "User has insufficient balance (Revert Blocked)" : "Confirm Revert"}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{processingId === revertingReq.id ? 'Reverting...' : 'Confirm Revert'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADMIN INTERNAL NOTE MODAL (z-[70] so it appears on top of any other modal) */}
      {editingNoteReq && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" /> Admin Internal Note
              </h3>
              <button
                onClick={() => setEditingNoteReq(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer User:</span>
                <span className="font-bold text-slate-900">{editingNoteReq.user_name || 'Retailer User'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">12-Digit UTR:</span>
                <span className="font-mono font-bold text-slate-900">{editingNoteReq.utr_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-emerald-700">₹{Number(editingNoteReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Note (Visible to Admins only)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Needs Revert once user adds funds, or wrong UTR verified..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none font-mono"
              />
            </div>

            {/* QUICK PRESETS */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setNoteInput(`⚠️ Needs Revert: Accidental approval, wait for retailer to add balance.`)}
                  className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-medium cursor-pointer"
                >
                  ⚠️ Needs Revert
                </button>
                <button
                  type="button"
                  onClick={() => setNoteInput(`📞 Asked retailer to deposit funds for reversal.`)}
                  className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-medium cursor-pointer"
                >
                  📞 Contacted Retailer
                </button>
                <button
                  type="button"
                  onClick={() => setNoteInput('')}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium cursor-pointer"
                >
                  Clear Note
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingNoteReq(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingNote}
                onClick={() => handleSaveNote(editingNoteReq.id, noteInput)}
                className="w-1/2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingNote ? 'Saving...' : 'Save Note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RICH SCREENSHOT PREVIEW & VERIFICATION MODAL */}
      {previewScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div 
            className="relative w-full max-w-5xl xl:max-w-6xl h-[92vh] max-h-[850px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Images className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 truncate">
                      Payment Receipt & Request Verification
                    </h3>
                    {previewRequest && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        previewRequest.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        previewRequest.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {previewRequest.status}
                      </span>
                    )}
                  </div>
                  {previewRequest && (
                    <p className="text-xs text-slate-500 truncate">
                      UTR: <span className="font-mono text-slate-800 font-bold">{previewRequest.utr_number}</span> • Amount: <span className="font-bold text-slate-900">₹{Number(previewRequest.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* TOP HEADER CONTROLS */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <span className="text-[11px] font-mono text-slate-500 font-bold">{Math.round(zoomLevel * 100)}%</span>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MODAL BODY (SPLIT 2 COLUMNS ON LG) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: INTERACTIVE ZOOMABLE & DRAGGABLE IMAGE VIEWER */}
              <div 
                className={`${previewRequest ? 'lg:col-span-7' : 'lg:col-span-12'} h-full flex flex-col bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200 relative select-none overflow-hidden`}
              >
                {/* INTERACTIVE STAGE */}
                <div 
                  className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={handleResetZoom}
                  title="Scroll to Zoom • Click & Drag to Move • Double click to Reset"
                >
                  <img
                    src={previewScreenshot}
                    alt="Payment Screenshot Receipt"
                    draggable={false}
                    className="max-h-[82%] max-w-[85%] object-contain rounded-xl shadow-xl pointer-events-none select-none border border-slate-200 bg-white"
                    style={{
                      transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.12s ease-out'
                    }}
                  />

                  {/* FLOATING HELPER TIP */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] text-slate-600 pointer-events-none flex items-center gap-1.5 shadow-sm">
                    <Move className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scroll to Zoom • Drag to Move • Double-click to Reset</span>
                  </div>

                  {/* FLOATING CONTROLS BAR (BOTTOM) */}
                  <div className="absolute bottom-3 inset-x-0 mx-auto w-fit flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl z-10">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-700 px-2 min-w-[50px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button
                      onClick={handleRotate}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Reset Zoom & Position"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <a
                      href={previewScreenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Open Original Image in New Tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: REQUEST DETAILS & VERIFICATION ACTIONS */}
              {previewRequest && (
                <div className="lg:col-span-5 h-full flex flex-col bg-white overflow-hidden">
                  <div className="flex-1 p-5 overflow-y-auto space-y-4">

                    {/* 1. FINANCIAL SUMMARY CARD */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment Breakdown</p>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-slate-600">Requested Amount:</span>
                        <span className="text-xl font-black text-slate-900 font-mono">
                          ₹{Number(previewRequest.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                        <span className="text-slate-500">QR Charge ({previewRequest.charge_percent || 0.5}%):</span>
                        <span className="text-rose-600 font-mono font-bold">
                          -₹{Number(previewRequest.charge_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                        <span className="font-extrabold text-emerald-700">Net Wallet Credit:</span>
                        <span className="text-lg font-black text-emerald-700 font-mono">
                          ₹{Number(previewRequest.net_amount || (previewRequest.amount - (previewRequest.charge_amount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* 2. TRANSACTION IDENTIFICATION CARD */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Transaction Info</p>
                      
                      {/* UTR NUMBER WITH 1-CLICK COPY */}
                      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank UTR / Ref No</span>
                          <span className="font-mono font-black text-indigo-700 text-sm tracking-wide select-all truncate block">
                            {previewRequest.utr_number}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyModalUtr(previewRequest.utr_number)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          {copiedModalUtr ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedModalUtr ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex justify-between py-1 border-b border-slate-200/80">
                        <span className="text-slate-500">Assigned QR:</span>
                        <span className="font-bold text-slate-900">{previewRequest.qr_name || 'Primary QR'}</span>
                      </div>
                      {previewRequest.upi_id && (
                        <div className="flex justify-between py-1 border-b border-slate-200/80">
                          <span className="text-slate-500">Target UPI ID:</span>
                          <span className="font-mono text-slate-700">{previewRequest.upi_id}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Request Date & Time:</span>
                        <span className="font-mono text-slate-700">
                          {new Date(previewRequest.created_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </span>
                      </div>
                    </div>

                    {/* 3. RETAILER PROFILE CARD */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">User / Retailer Details</p>
                      <div className="flex justify-between py-1 border-b border-slate-200/80">
                        <span className="text-slate-500">User Name:</span>
                        <span className="font-bold text-slate-900">{previewRequest.user_name || 'Retailer'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200/80">
                        <span className="text-slate-500">Firm Name:</span>
                        <span className="font-bold text-slate-700">{previewRequest.firm_name || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Registered Mobile:</span>
                        <span className="font-mono text-indigo-700 font-bold">{previewRequest.mobile_number}</span>
                      </div>
                    </div>

                    {/* 4. ADMIN COMMISSION (IF ADMIN) */}
                    {isAdmin && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">Platform Commission</p>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Admin Commission:</span>
                          <span className="font-mono font-bold text-emerald-700">
                            +₹{Number(
                              previewRequest.admin_commission !== undefined
                                ? previewRequest.admin_commission
                                : Math.max(0, (previewRequest.charge_amount || 0) - ((previewRequest.distributor_commission || 0) + (previewRequest.super_distributor_commission || 0)))
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* REJECTION REASON IF REJECTED */}
                    {previewRequest.status === 'rejected' && previewRequest.rejection_reason && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Rejection Reason</p>
                        <p className="text-rose-800 mt-1">{previewRequest.rejection_reason}</p>
                      </div>
                    )}

                    {/* ADMIN INTERNAL NOTE IF EXISTS (FOR ADMIN) */}
                    {isAdmin && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-amber-600" /> Admin Internal Note
                          </span>
                          <button
                            onClick={() => openNoteModal(previewRequest)}
                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                          >
                            {previewRequest.admin_note ? 'Edit Note' : '+ Add Note'}
                          </button>
                        </div>
                        {previewRequest.admin_note ? (
                          <p className="text-amber-900 font-mono text-xs mt-1 bg-white/70 p-2 rounded-xl border border-amber-100">
                            {previewRequest.admin_note}
                          </p>
                        ) : (
                          <p className="text-slate-400 text-[11px] italic">No note added yet.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MODAL BOTTOM ACTION BAR */}
                  <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    {isAdmin && previewRequest.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          disabled={processingId === previewRequest.id}
                          onClick={async () => {
                            await handleProcessRequest(previewRequest.id, 'approved');
                            setPreviewRequest(prev => prev ? { ...prev, status: 'approved' } : null);
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{processingId === previewRequest.id ? 'Approving...' : `Approve (₹${Number(previewRequest.amount).toLocaleString('en-IN')})`}</span>
                        </button>

                        <button
                          disabled={processingId === previewRequest.id}
                          onClick={() => setRejectingReq(previewRequest)}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject Request</span>
                        </button>
                      </div>
                    ) : previewRequest.status === 'approved' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                          <CheckCircle className="w-4 h-4" />
                          <span>Approved & Credited: ₹{Number(previewRequest.net_amount || (previewRequest.amount - (previewRequest.charge_amount || 0))).toFixed(2)} to wallet.</span>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setRevertingReq(previewRequest);
                              setRevertReason('');
                            }}
                            className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                            <span>Revert This Approval (Undo)</span>
                          </button>
                        )}
                      </div>
                    ) : previewRequest.status === 'reverted' ? (
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span>This payment request was Reverted by Admin{previewRequest.revert_reason ? `: ${previewRequest.revert_reason}` : ''}.</span>
                      </div>
                    ) : previewRequest.status === 'rejected' ? (
                      <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs">
                        <XCircle className="w-4 h-4" />
                        <span>This payment request was Rejected.</span>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-500">
                        Status: <strong className="text-amber-700 uppercase">{previewRequest.status}</strong>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
