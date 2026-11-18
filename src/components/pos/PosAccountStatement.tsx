import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, ArrowDownLeft, ArrowUpRight, Filter, Search, 
  Download, RefreshCw, Calendar, CreditCard, Wallet, Clock, CheckCircle2 
} from 'lucide-react';
import { posApi } from '../../services/api';
import type { PosWalletLedger } from '../../types/pos';
import type { UserProfile } from '../../types/auth';

interface PosAccountStatementProps {
  user: UserProfile;
}

export const PosAccountStatement: React.FC<PosAccountStatementProps> = ({ user }) => {
  const isAdmin = user.role === 'admin';
  const [statement, setStatement] = useState<PosWalletLedger[]>([]);
  const [balances, setBalances] = useState({
    main_wallet: Number(user.wallet_balance || 0),
    pos_balance: Number(user.pos_balance || 0),
    pos_t1_pending_balance: Number(user.pos_t1_pending_balance || 0)
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [walletFilter, setWalletFilter] = useState<'ALL' | 'T0' | 'T1'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await posApi.getStatement({
        wallet_type: walletFilter !== 'ALL' ? walletFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined
      });

      if (res.success) {
        if (Array.isArray(res.statement)) setStatement(res.statement);
        if (res.balances) setBalances(res.balances);
      }
    } catch (err: any) {
      console.error('Fetch POS statement error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [walletFilter, categoryFilter]);

  // Filtered entries
  const filteredEntries = statement.filter(e => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchRef = (e.reference_id || '').toLowerCase().includes(q);
      const matchUser = (e.user_name || '').toLowerCase().includes(q) || (e.firm_name || '').toLowerCase().includes(q);
      const matchAmt = String(e.amount || '').includes(q);
      return matchDesc || matchRef || matchUser || matchAmt;
    }
    return true;
  });

  // Totals
  const totalCredits = filteredEntries.filter(e => e.type === 'CREDIT').reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const totalDebits = filteredEntries.filter(e => e.type === 'DEBIT').reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const exportToCsv = () => {
    if (filteredEntries.length === 0) return;
    const headers = ['Date', 'Time', 'Reference ID', 'Merchant', 'Type', 'Wallet', 'Category', 'Amount', 'Opening Balance', 'Closing Balance', 'Description'];
    const rows = filteredEntries.map(e => [
      new Date(e.created_at).toLocaleDateString('en-IN'),
      new Date(e.created_at).toLocaleTimeString('en-IN'),
      e.reference_id || e.id,
      e.firm_name || e.user_name || 'Retailer',
      e.type,
      e.wallet_type,
      e.category,
      Number(e.amount).toFixed(2),
      Number(e.opening_balance).toFixed(2),
      Number(e.closing_balance).toFixed(2),
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `POS_Account_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'POS_SWIPE_LOAD':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">Swipe Load</span>;
      case 'T1_SETTLEMENT_CREDIT':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-bold text-[10px]">T+1 Settled</span>;
      case 'PAYOUT_DEBIT':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">Payout Debit</span>;
      case 'LIVE_BILL_DEBIT':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">Live Bill Debit</span>;
      case 'CC_BILL_DEBIT':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]">CC Bill Debit</span>;
      case 'PAYOUT_REFUND':
      case 'LIVE_BILL_REFUND':
      case 'REFUND_CREDIT':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">Refund</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Multi-Wallet Display */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>POS Passbook & Financial Ledger</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">POS Account Statement</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Complete audited history of card swipes credited, overnight T+1 clearing releases, outward payout debits, bill payments, and automated source refunds.
            </p>
          </div>

          <button
            onClick={exportToCsv}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel / CSV</span>
          </button>
        </div>

        {/* Multi-Wallet Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          {/* Main Wallet */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <span className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              🔵 Main Wallet
            </span>
            <p className="text-xl font-black font-mono text-white mt-0.5">
              ₹{Number(balances.main_wallet).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Regular Platform Business Balance</span>
          </div>

          {/* POS T+0 Wallet */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                🟢 POS Wallet (T+0 Available)
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-400/20 text-[9px] font-bold text-emerald-300">Live</span>
            </div>
            <p className="text-xl font-black font-mono text-emerald-300 mt-0.5">
              ₹{Number(balances.pos_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-emerald-200/70">Usable for Payout, Live Bill & CC Bill</span>
          </div>

          {/* POS T+1 Clearance */}
          <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-400/30 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                🟣 POS T+1 (Clearing Tomorrow)
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-400/20 text-[9px] font-bold text-purple-300">Next Day</span>
            </div>
            <p className="text-xl font-black font-mono text-purple-300 mt-0.5">
              ₹{Number(balances.pos_t1_pending_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-purple-200/70">Overnight clearing — Settle to POS Wallet</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Wallet Filter Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 w-full lg:w-auto overflow-x-auto">
          {(['ALL', 'T0', 'T1'] as const).map(w => (
            <button
              key={w}
              onClick={() => setWalletFilter(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                walletFilter === w ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {w === 'ALL' ? 'All Wallets' : w === 'T0' ? '🟢 POS T+0 (Spendable)' : '🟣 POS T+1 (Overnight)'}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Type Filter */}
          {(['ALL', 'CREDIT', 'DEBIT'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === t ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All Dr/Cr' : t === 'CREDIT' ? '🟢 Credits Only' : '🔴 Debits Only'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, ref, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <button
            onClick={fetchStatement}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border border-slate-200 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Credits (Inflow)</span>
          <p className="text-xl font-black font-mono text-emerald-600 mt-1">
            +₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Debits (Outflow)</span>
          <p className="text-xl font-black font-mono text-rose-600 mt-1">
            -₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Net Movement</span>
          <p className={`text-xl font-black font-mono mt-1 ${totalCredits >= totalDebits ? 'text-emerald-700' : 'text-rose-700'}`}>
            ₹{(totalCredits - totalDebits).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500">Ledger Entries</span>
          <p className="text-xl font-black font-mono text-slate-800 mt-1">
            {filteredEntries.length} Records
          </p>
        </div>
      </div>

      {/* Passbook Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">Loading POS Statement Passbook...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Statement Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">No transactions match your selected wallet and category filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  {isAdmin && <th className="py-3.5 px-4">Merchant / User</th>}
                  <th className="py-3.5 px-4">Reference / Order ID</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Wallet</th>
                  <th className="py-3.5 px-4 text-center">Dr / Cr</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Opening Bal</th>
                  <th className="py-3.5 px-4 text-right font-black">Closing Bal</th>
                  <th className="py-3.5 px-4">Narration / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((e) => {
                  const isCredit = e.type === 'CREDIT';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Merchant User (Admin view) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{e.firm_name || e.user_name || 'Retailer'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{e.user_mobile || e.user_id}</div>
                        </td>
                      )}

                      {/* Reference ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {e.reference_id || e.id.slice(-10)}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getCategoryBadge(e.category)}
                      </td>

                      {/* Wallet */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold">
                        {e.wallet_type === 'T0' ? (
                          <span className="text-emerald-700">🟢 POS T+0</span>
                        ) : (
                          <span className="text-purple-700">🟣 POS T+1</span>
                        )}
                      </td>

                      {/* Dr / Cr */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${
                          isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{e.type}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className={`py-3.5 px-4 text-right font-mono font-black whitespace-nowrap text-sm ${
                        isCredit ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isCredit ? '+' : '-'}₹{Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Opening Balance */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                        ₹{Number(e.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Closing Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        ₹{Number(e.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Narration */}
                      <td className="py-3.5 px-4 text-slate-700 text-xs max-w-xs">
                        {e.description || 'POS Ledger Movement'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
