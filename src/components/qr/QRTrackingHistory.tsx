import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  FileText, 
  Phone, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  TrendingUp, 
  RefreshCw, 
  ChevronRight, 
  X,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  ExternalLink
} from 'lucide-react';
import { qrApi } from '../../services/api';
import type { QrMaster, QrPaymentRequest } from '../../types/qr';

interface QRTrackingHistoryProps {
  onBackToMaster?: () => void;
}

type DateFilterType = 'today' | 'yesterday' | 'last7' | 'this_month' | 'all' | 'custom';

export const QRTrackingHistory: React.FC<QRTrackingHistoryProps> = ({ onBackToMaster }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrList, setQrList] = useState<QrMaster[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<QrPaymentRequest[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selected QR for Drill-down Modal
  const [selectedQrDetails, setSelectedQrDetails] = useState<{
    qr: QrMaster;
    requests: QrPaymentRequest[];
  } | null>(null);

  // Load Data
  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [qrRes, reqRes] = await Promise.all([
        qrApi.getQrList().catch(() => ({ success: false, qr_masters: [] })),
        qrApi.getPaymentRequests().catch(() => ({ success: false, payment_requests: [] }))
      ]);

      if (qrRes.success && qrRes.qr_masters) {
        setQrList(qrRes.qr_masters);
      }
      if (reqRes.success && reqRes.payment_requests) {
        setPaymentRequests(reqRes.payment_requests);
      }
    } catch (err) {
      console.error('Failed to fetch QR tracking data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Requests by Date Range
  const filteredRequests = useMemo(() => {
    const now = new Date();
    
    // Start of Today in Local Time
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Start of Yesterday
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    // Last 7 Days
    const last7DaysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

    // This Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    return paymentRequests.filter((req) => {
      // Use processed_at if approved/processed, otherwise created_at
      const reqDateStr = req.processed_at || req.created_at;
      if (!reqDateStr) return false;
      const reqDate = new Date(reqDateStr);

      if (dateFilter === 'today') {
        return reqDate >= startOfToday && reqDate <= endOfToday;
      }
      if (dateFilter === 'yesterday') {
        return reqDate >= startOfYesterday && reqDate <= endOfYesterday;
      }
      if (dateFilter === 'last7') {
        return reqDate >= last7DaysStart && reqDate <= endOfToday;
      }
      if (dateFilter === 'this_month') {
        return reqDate >= thisMonthStart && reqDate <= endOfToday;
      }
      if (dateFilter === 'custom') {
        if (!customStartDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = customEndDate ? new Date(customEndDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return reqDate >= start && reqDate <= end;
      }
      return true; // 'all'
    });
  }, [paymentRequests, dateFilter, customStartDate, customEndDate]);

  // Aggregate stats per QR Master
  const qrTrackingRows = useMemo(() => {
    // Group requests by QR Master ID or QR Name
    const map = new Map<string, QrPaymentRequest[]>();

    filteredRequests.forEach((req) => {
      // Key can be qr_master_id, or if missing fallback to qr_name
      const key = req.qr_master_id || req.qr_name || 'unknown';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(req);
    });

    // Create a list from all QR Masters
    return qrList.map((qr) => {
      // Match either by qr.id or qr.name
      const matchedRequests = [
        ...(map.get(qr.id) || []),
        ...(map.get(qr.name) || [])
      ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i); // unique

      const totalEntries = matchedRequests.length;
      
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      let approvedAmount = 0;
      let adminComm = 0;
      let sDistComm = 0;
      let distComm = 0;

      matchedRequests.forEach((req) => {
        if (req.status === 'pending') {
          pendingCount++;
        } else if (req.status === 'approved') {
          approvedCount++;
          approvedAmount += Number(req.amount) || 0;
          adminComm += Number(req.admin_commission) || 0;
          sDistComm += Number(req.super_distributor_commission) || 0;
          distComm += Number(req.distributor_commission) || 0;
        } else if (req.status === 'rejected' || req.status === 'reverted') {
          rejectedCount++;
        }
      });

      // Total Margin = ADMIN + S.DIST + DIST (Total Platform Margin collected from retailers)
      const totalMargin = adminComm + sDistComm + distComm;

      // QR % (Rent rate set in QR Master)
      const qrPercent = Number(qr.default_charge_percent) || 0;

      // QR Profit / Rent Cost = Approved Amount * (qrPercent / 100)
      const qrProfit = (approvedAmount * qrPercent) / 100;

      // Final Net Admin Profit = TOTAL - QR PROFIT
      const finalProfit = totalMargin - qrProfit;

      return {
        qr,
        matchedRequests,
        totalEntries,
        pendingCount,
        approvedCount,
        rejectedCount,
        approvedAmount,
        adminComm,
        sDistComm,
        distComm,
        totalMargin,
        qrPercent,
        qrProfit,
        finalProfit,
      };
    });
  }, [qrList, filteredRequests]);

  // Search Filter
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return qrTrackingRows;
    const q = searchQuery.toLowerCase().trim();
    return qrTrackingRows.filter((row) => {
      const name = (row.qr.name || '').toLowerCase();
      const upi = (row.qr.upi_id || '').toLowerCase();
      const phone = (row.qr.mobile_number || '').toLowerCase();
      return name.includes(q) || upi.includes(q) || phone.includes(q);
    });
  }, [qrTrackingRows, searchQuery]);

  // Grand Totals across all rows
  const grandTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.totalEntries += row.totalEntries;
        acc.pendingCount += row.pendingCount;
        acc.approvedCount += row.approvedCount;
        acc.rejectedCount += row.rejectedCount;
        acc.approvedAmount += row.approvedAmount;
        acc.adminComm += row.adminComm;
        acc.sDistComm += row.sDistComm;
        acc.distComm += row.distComm;
        acc.totalMargin += row.totalMargin;
        acc.qrProfit += row.qrProfit;
        acc.finalProfit += row.finalProfit;
        return acc;
      },
      {
        totalEntries: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        approvedAmount: 0,
        adminComm: 0,
        sDistComm: 0,
        distComm: 0,
        totalMargin: 0,
        qrProfit: 0,
        finalProfit: 0,
      }
    );
  }, [filteredRows]);

  // Export to CSV / Excel
  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'QR Name',
      'UPI ID',
      'Mobile Number',
      'Status',
      'Entries',
      'Pending (P)',
      'Approved (A)',
      'Rejected (R)',
      'Approved Amount (₹)',
      'Admin Margin (₹)',
      'S.Dist Margin (₹)',
      'Dist Margin (₹)',
      'Total Margin (₹)',
      'QR Rent %',
      'QR Rent Cost (₹)',
      'Final Net Profit (₹)'
    ];

    const rows = filteredRows.map((r) => [
      `"${(r.qr.name || '').replace(/"/g, '""')}"`,
      `"${r.qr.upi_id || ''}"`,
      `"${r.qr.mobile_number || ''}"`,
      r.qr.is_active ? 'ACTIVE' : 'ARCHIVED',
      r.totalEntries,
      r.pendingCount,
      r.approvedCount,
      r.rejectedCount,
      r.approvedAmount.toFixed(2),
      r.adminComm.toFixed(2),
      r.sDistComm.toFixed(2),
      r.distComm.toFixed(2),
      r.totalMargin.toFixed(2),
      `${r.qrPercent}%`,
      r.qrProfit.toFixed(2),
      r.finalProfit.toFixed(2)
    ]);

    // Append Grand Total Row
    rows.push([
      '"GRAND TOTAL"',
      '""',
      '""',
      '""',
      grandTotals.totalEntries,
      grandTotals.pendingCount,
      grandTotals.approvedCount,
      grandTotals.rejectedCount,
      grandTotals.approvedAmount.toFixed(2),
      grandTotals.adminComm.toFixed(2),
      grandTotals.sDistComm.toFixed(2),
      grandTotals.distComm.toFixed(2),
      grandTotals.totalMargin.toFixed(2),
      '""',
      grandTotals.qrProfit.toFixed(2),
      grandTotals.finalProfit.toFixed(2)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `QR_Tracking_History_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export / Print PDF
  const handleExportPDF = () => {
    window.print();
  };

  // Helper date-time formatter
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' at ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 w-full pb-14 font-sans text-slate-800">
      
      {/* 1. TOP HEADER & FILTER BAR (Matching Screenshot Layout) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        
        {/* Left: Title + Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              QR Tracking History
              {refreshing && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Track performance per activation period & daily volume
            </p>
          </div>
        </div>

        {/* Right: Search + Date Dropdown + Export Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Search Box */}
          <div className="relative min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search QR..."
              className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Dropdown (Default Today) */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
              className="appearance-none pl-8 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Custom Date Pickers (Shown only when 'custom' is selected) */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 px-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none text-slate-700 font-semibold cursor-pointer"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none text-slate-700 font-semibold cursor-pointer"
              />
            </div>
          )}

          {/* Excel Export Button (Emerald green matching screenshot) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black tracking-wide shadow-xs shadow-emerald-600/20 transition cursor-pointer"
            title="Export Excel (CSV)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* PDF Export Button (Rose red matching screenshot) */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black tracking-wide shadow-xs shadow-rose-500/20 transition cursor-pointer"
            title="Export or Print PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. MAIN TRACKING TABLE (Matching User Screenshot Columns) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs font-bold font-mono uppercase tracking-wider">Calculating QR Tracking Analytics...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold text-slate-600">No QR Tracking records found</p>
            <p className="text-xs text-slate-400">Try changing the date filter or searching for another QR name.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase text-slate-500 tracking-wider select-none">
                  <th className="py-4 px-5">QR NAME / INFO</th>
                  <th className="py-4 px-3 text-center">STATUS</th>
                  <th className="py-4 px-3 text-center">ENTRIES</th>
                  <th className="py-4 px-3 text-right">APPR. AMOUNT</th>
                  <th className="py-4 px-3 text-center">BREAKDOWN <span className="text-[9px] font-bold text-slate-400">(P/A/R)</span></th>
                  <th className="py-4 px-3 text-right">ADMIN</th>
                  <th className="py-4 px-3 text-right">S.DIST</th>
                  <th className="py-4 px-3 text-right">DIST.</th>
                  <th className="py-4 px-3 text-right font-black text-slate-700">TOTAL</th>
                  <th className="py-4 px-3 text-center">QR %</th>
                  <th className="py-4 px-3 text-right">QR PROFIT</th>
                  <th className="py-4 px-5 text-right font-black text-indigo-900">FINAL PROFIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredRows.map((row) => (
                  <tr 
                    key={row.qr.id}
                    onClick={() => setSelectedQrDetails({ qr: row.qr, requests: row.matchedRequests })}
                    className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    title="Click to view detailed transactions"
                  >
                    
                    {/* 1. QR NAME / INFO (NO T+1 AS REQUESTED, Clean Name, Date & Time, Mobile & UPI) */}
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <div className="font-black text-slate-900 text-xs uppercase tracking-tight group-hover:text-indigo-600 transition flex items-center gap-1.5">
                          <span>{row.qr.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono">
                          <span>{formatDateTime(row.qr.created_at)}</span>
                          {row.qr.mobile_number && (
                            <span className="flex items-center gap-0.5 text-slate-500">
                              <Phone className="w-2.5 h-2.5 text-slate-400" />
                              {row.qr.mobile_number}
                            </span>
                          )}
                        </div>

                        {row.qr.upi_id && (
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={row.qr.upi_id}>
                            {row.qr.upi_id}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 2. STATUS (ACTIVE in green, ARCHIVED in gray) */}
                    <td className="py-4 px-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        row.qr.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {row.qr.is_active ? 'ACTIVE' : 'ARCHIVED'}
                      </span>
                    </td>

                    {/* 3. ENTRIES (Total count) */}
                    <td className="py-4 px-3 text-center font-bold text-slate-800 font-mono">
                      {row.totalEntries}
                    </td>

                    {/* 4. APPR. AMOUNT */}
                    <td className="py-4 px-3 text-right font-black text-slate-900 font-mono">
                      ₹{row.approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 5. BREAKDOWN (P/A/R) -> Yellow / Green / Red */}
                    <td className="py-4 px-3 text-center font-mono font-bold text-[11px] whitespace-nowrap">
                      <span className="text-amber-500">{row.pendingCount}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-emerald-600 font-black">{row.approvedCount}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-rose-500">{row.rejectedCount}</span>
                    </td>

                    {/* 6. ADMIN Margin */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-slate-700">
                      ₹{row.adminComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 7. S.DIST Margin */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-indigo-700">
                      ₹{row.sDistComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 8. DIST. Margin */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-amber-700">
                      ₹{row.distComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 9. TOTAL = ADMIN + S.DIST + DIST. */}
                    <td className="py-4 px-3 text-right font-mono font-black text-slate-900 bg-slate-50/50">
                      ₹{row.totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 10. QR % (Rent rate % from QR Master) */}
                    <td className="py-4 px-3 text-center font-mono font-bold text-slate-600">
                      {row.qrPercent}%
                    </td>

                    {/* 11. QR PROFIT (Cost to external QR = Appr Amount * QR %) */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-rose-600">
                      ₹{row.qrProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* 12. FINAL PROFIT = TOTAL - QR PROFIT */}
                    <td className="py-4 px-5 text-right font-mono font-black text-indigo-700 text-[13px] bg-indigo-50/20">
                      ₹{row.finalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* 3. TABLE FOOTER: GRAND TOTAL ROW */}
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-mono font-black text-xs text-slate-900 select-none">
                  <td className="py-4 px-5 uppercase tracking-wider text-slate-700 font-extrabold font-sans">
                    GRAND TOTAL ({filteredRows.length} QRs)
                  </td>
                  <td className="py-4 px-3 text-center text-slate-400">—</td>
                  <td className="py-4 px-3 text-center">{grandTotals.totalEntries}</td>
                  <td className="py-4 px-3 text-right text-slate-900">
                    ₹{grandTotals.approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-3 text-center whitespace-nowrap">
                    <span className="text-amber-600">{grandTotals.pendingCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-emerald-700">{grandTotals.approvedCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-rose-600">{grandTotals.rejectedCount}</span>
                  </td>
                  <td className="py-4 px-3 text-right text-slate-700">
                    ₹{grandTotals.adminComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-3 text-right text-indigo-700">
                    ₹{grandTotals.sDistComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-3 text-right text-amber-700">
                    ₹{grandTotals.distComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-3 text-right text-slate-900 bg-slate-200/50">
                    ₹{grandTotals.totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-3 text-center text-slate-400">—</td>
                  <td className="py-4 px-3 text-right text-rose-600">
                    ₹{grandTotals.qrProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-5 text-right text-indigo-900 text-sm bg-indigo-100/60 font-black">
                    ₹{grandTotals.finalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 4. BOTTOM GRAND SUMMARY CARDS (Quick Visual Totals for the Selected Day) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
        
        {/* Card 1: Approved Volume */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Approved Volume</span>
          <div className="text-base font-black text-slate-900 font-mono truncate">
            ₹{grandTotals.approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {grandTotals.approvedCount} Settled
          </div>
        </div>

        {/* Card 2: Total Margin */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Fees Collected</span>
          <div className="text-base font-black text-slate-800 font-mono truncate">
            ₹{grandTotals.totalMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            Gross Margin (Admin+DS+MS)
          </div>
        </div>

        {/* Card 3: Admin Share */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Admin Margin</span>
          <div className="text-base font-black text-indigo-700 font-mono truncate">
            ₹{grandTotals.adminComm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            Direct Admin Earning
          </div>
        </div>

        {/* Card 4: Network Commissions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Network Comm (DS+MS)</span>
          <div className="text-base font-black text-amber-600 font-mono truncate">
            ₹{(grandTotals.sDistComm + grandTotals.distComm).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-bold">
            MS: ₹{grandTotals.sDistComm.toFixed(2)} | DS: ₹{grandTotals.distComm.toFixed(2)}
          </div>
        </div>

        {/* Card 5: Total QR Rent Cost */}
        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Total QR Rent Cost</span>
          <div className="text-base font-black text-rose-600 font-mono truncate">
            ₹{grandTotals.qrProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-500 font-bold">
            External QR Expense
          </div>
        </div>

        {/* Card 6: FINAL NET PROFIT */}
        <div className="bg-linear-to-br from-indigo-500 to-indigo-700 text-white p-4 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-indigo-100 tracking-wider">Final Net Profit</span>
          <div className="text-lg font-black font-mono truncate">
            ₹{grandTotals.finalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-indigo-100 font-medium">
            Total Profit − QR Rent
          </div>
        </div>
      </div>

      {/* 5. TRANSACTION DETAIL DRAWER / MODAL (When clicking any QR row) */}
      {selectedQrDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span>{selectedQrDetails.qr.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    selectedQrDetails.qr.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedQrDetails.qr.is_active ? 'ACTIVE' : 'ARCHIVED'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  UPI: {selectedQrDetails.qr.upi_id} | Mobile: {selectedQrDetails.qr.mobile_number} | Rent: {selectedQrDetails.qr.default_charge_percent || 0}%
                </p>
              </div>
              <button
                onClick={() => setSelectedQrDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Transaction List */}
            <div className="p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
              {selectedQrDetails.requests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No payment requests found for this QR within the selected date period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 select-none pb-2">
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">User / Firm</th>
                        <th className="py-2.5 px-3">12-Digit UTR</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Fee</th>
                        <th className="py-2.5 px-3 text-right">Admin Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedQrDetails.requests.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                            {formatDateTime(tx.processed_at || tx.created_at)}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-800">
                            <div>{tx.user_name || 'Retailer'}</div>
                            {tx.firm_name && <div className="text-[10px] text-slate-400 font-normal">{tx.firm_name}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-bold select-all">
                            {tx.utr_number}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              tx.status === 'approved' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : tx.status === 'pending'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            ₹{Number(tx.charge_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                            ₹{Number(tx.admin_commission || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Total Transactions: {selectedQrDetails.requests.length}</span>
              <button
                onClick={() => setSelectedQrDetails(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition cursor-pointer text-xs font-bold"
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
