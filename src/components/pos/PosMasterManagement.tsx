import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  RefreshCw, ShieldCheck, Cpu, Building2, Search, ArrowUpDown, AlertCircle
} from 'lucide-react';
import { posApi } from '../../services/api';
import type { PosMachine } from '../../types/pos';

export const PosMasterManagement: React.FC = () => {
  const [machines, setMachines] = useState<PosMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<PosMachine | null>(null);
  const [formData, setFormData] = useState({
    machine_name: '',
    terminal_id: '',
    serial_number: '',
    model: '',
    bank_name: 'HDFC Bank',
    default_t0_charge_percent: 1.20,
    default_t1_charge_percent: 0.80,
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const res = await posApi.getMachines(true);
      if (res.success && Array.isArray(res.machines)) {
        setMachines(res.machines);
      }
    } catch (err: any) {
      console.error('Fetch POS machines error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const openCreateModal = () => {
    setEditingMachine(null);
    setFormData({
      machine_name: '',
      terminal_id: '',
      serial_number: '',
      model: 'Android Smart POS',
      bank_name: 'HDFC Bank',
      default_t0_charge_percent: 1.20,
      default_t1_charge_percent: 0.80,
      is_active: true
    });
    setActionError(null);
    setShowModal(true);
  };

  const openEditModal = (machine: PosMachine) => {
    setEditingMachine(machine);
    setFormData({
      machine_name: machine.machine_name || '',
      terminal_id: machine.terminal_id || '',
      serial_number: machine.serial_number || '',
      model: machine.model || 'Android Smart POS',
      bank_name: machine.bank_name || 'HDFC Bank',
      default_t0_charge_percent: Number(machine.default_t0_charge_percent) || 1.20,
      default_t1_charge_percent: Number(machine.default_t1_charge_percent) || 0.80,
      is_active: machine.is_active !== false
    });
    setActionError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.machine_name.trim() || !formData.terminal_id.trim()) {
      setActionError('Machine Name and Terminal ID are required');
      return;
    }

    try {
      setSaving(true);
      setActionError(null);

      if (editingMachine) {
        await posApi.updateMachine(editingMachine.id, formData);
        setSuccessMessage(`Machine ${formData.machine_name} updated successfully!`);
      } else {
        await posApi.createMachine(formData);
        setSuccessMessage(`New POS Machine ${formData.machine_name} added successfully!`);
      }

      setShowModal(false);
      fetchMachines();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to save POS Machine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete POS Machine "${name}"?`)) return;
    try {
      await posApi.deleteMachine(id);
      setSuccessMessage(`Machine "${name}" deleted.`);
      fetchMachines();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete machine');
    }
  };

  const filteredMachines = machines.filter(m => 
    (m.machine_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.terminal_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.bank_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = machines.filter(m => m.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Terminals Control Hub</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">POS Machine Master Management</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Configure and deploy POS EDC machines, assign terminal IDs, define base settlement rates for T+0 (Instant) and T+1 (Overnight Clearing), and monitor machine status.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add POS Machine</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Terminals</span>
            <p className="text-2xl font-black font-mono text-white mt-0.5">{machines.length}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400">Active Live</span>
            <p className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400">Default T+0 Rate</span>
            <p className="text-2xl font-black font-mono text-amber-300 mt-0.5">1.20%</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400">Default T+1 Rate</span>
            <p className="text-2xl font-black font-mono text-cyan-300 mt-0.5">0.80%</p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search machine, TID, bank, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchMachines}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border border-slate-200 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Machines Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Loading POS Machines Master...</p>
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No POS Machines Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No terminals match your filter.' : 'Add your first POS swipe machine to enable card processing.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMachines.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-3xl border p-5 transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                m.is_active ? 'border-slate-200/90' : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {m.bank_name || 'Acquiring Bank'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">{m.machine_name}</h3>
                    <p className="text-xs text-slate-500 font-mono">TID: <span className="font-bold text-slate-800">{m.terminal_id}</span></p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {m.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{m.is_active ? 'Active' : 'Disabled'}</span>
                  </span>
                </div>

                {/* Details Pill Box */}
                <div className="p-3 bg-slate-50 rounded-2xl space-y-2 border border-slate-100 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Model:</span>
                    <span className="font-semibold text-slate-800">{m.model || 'Standard POS'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Serial No:</span>
                    <span className="font-mono text-slate-700">{m.serial_number || 'N/A'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-center">
                    <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">T+0 Instant</span>
                      <span className="text-sm font-black font-mono text-amber-900">{Number(m.default_t0_charge_percent || 1.20).toFixed(2)}%</span>
                    </div>
                    <div className="p-1.5 rounded-xl bg-cyan-50 border border-cyan-100">
                      <span className="text-[10px] font-bold text-cyan-800 uppercase block">T+1 Next-Day</span>
                      <span className="text-sm font-black font-mono text-cyan-900">{Number(m.default_t1_charge_percent || 0.80).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(m)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(m.id, m.machine_name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Machine Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingMachine ? 'Edit POS Terminal' : 'Add New POS Terminal'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure machine parameters and default charges</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Machine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC SmartHub Android POS"
                    value={formData.machine_name}
                    onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Terminal ID (TID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC_TID_8841"
                    value={formData.terminal_id}
                    onChange={(e) => setFormData({ ...formData, terminal_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Acquiring Bank</label>
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                    <option value="RBL Bank">RBL Bank</option>
                    <option value="Yes Bank">Yes Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hardware Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Pax A910 Android"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-PAX-001"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Base Charge Rates */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                  Default Platform Swipe Fee (%)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">T+0 Instant Settlement (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.default_t0_charge_percent}
                        onChange={(e) => setFormData({ ...formData, default_t0_charge_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-cyan-800 mb-1">T+1 Next-Day Settlement (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={formData.default_t1_charge_percent}
                        onChange={(e) => setFormData({ ...formData, default_t1_charge_percent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Note: 100% of this fee goes directly to Admin profit. Distributors/Super Distributors receive ₹0 commission for POS transactions.
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Machine Status</span>
                  <span className="text-[10px] text-slate-500">Allow retailers to select this terminal for swipe requests</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingMachine ? 'Update Machine' : 'Create Machine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
