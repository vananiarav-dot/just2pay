import React, { useState, useEffect } from 'react';
import { 
  Volume2, VolumeX, Play, RotateCcw, Check, X, Bell, 
  QrCode, CreditCard, ArrowRightLeft, Receipt, Sparkles, Sliders
} from 'lucide-react';
import { 
  type AdminSoundSettings, 
  SOUND_PRESETS, 
  type SoundPresetKey, 
  DEFAULT_SOUND_SETTINGS, 
  getStoredSoundSettings, 
  saveSoundSettings, 
  playSoundPreview 
} from '../../utils/soundNotification';

interface AdminSoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSoundSettingsModal: React.FC<AdminSoundSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [settings, setSettings] = useState<AdminSoundSettings>(getStoredSoundSettings);
  const [savedNotice, setSavedNotice] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoredSoundSettings());
      setSavedNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePreview = (key: SoundPresetKey, eventLabel: string) => {
    setPlayingKey(eventLabel);
    playSoundPreview(key, settings.volume);
    setTimeout(() => {
      setPlayingKey(null);
    }, 700);
  };

  const handleSave = () => {
    saveSoundSettings(settings);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SOUND_SETTINGS);
    saveSoundSettings(DEFAULT_SOUND_SETTINGS);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Audio Alert Settings
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Play instant sound notifications when new requests arrive on the platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* MASTER CONTROLS CARD */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            
            {/* Master Switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {settings.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Master Sound Alerts</h4>
                  <p className="text-[11px] text-slate-500">
                    {settings.enabled ? 'Sound notifications are ACTIVE' : 'Sound notifications are MUTED'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  settings.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Master Volume Slider */}
            <div className="pt-3 border-t border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  Alert Volume
                </span>
                <span className="font-mono text-slate-900 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.volume}
                disabled={!settings.enabled}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSettings(prev => ({ ...prev, volume: val }));
                }}
                className="w-full accent-indigo-600 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>

          {/* 4 EVENT SOUND SELECTORS */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase font-extrabold text-slate-400 tracking-wider">
              Custom Sound Assignments
            </h4>

            {/* EVENT 1: QR PAYMENT REQUEST */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">QR Payment Requests</h5>
                  <p className="text-[11px] text-slate-400">Triggered on retail QR load submission</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                <select
                  value={settings.qrSound}
                  disabled={!settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, qrSound: e.target.value as SoundPresetKey }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 sm:flex-initial cursor-pointer disabled:opacity-50"
                >
                  {SOUND_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handlePreview(settings.qrSound, 'qr')}
                  className={`p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shrink-0 ${
                    playingKey === 'qr' ? 'scale-95 bg-indigo-200' : ''
                  }`}
                  title="Test Sound"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-600" />
                </button>
              </div>
            </div>

            {/* EVENT 2: CREDIT CARD BILL REQUEST */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-700 border border-pink-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">CC Bill Requests</h5>
                  <p className="text-[11px] text-slate-400">Triggered on offline CC bill submission</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                <select
                  value={settings.ccBillSound}
                  disabled={!settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, ccBillSound: e.target.value as SoundPresetKey }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 sm:flex-initial cursor-pointer disabled:opacity-50"
                >
                  {SOUND_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handlePreview(settings.ccBillSound, 'cc_bill')}
                  className={`p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shrink-0 ${
                    playingKey === 'cc_bill' ? 'scale-95 bg-indigo-200' : ''
                  }`}
                  title="Test Sound"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-600" />
                </button>
              </div>
            </div>

            {/* EVENT 3: BANK PAYOUT TRANSFERS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Bank Payout Transfers</h5>
                  <p className="text-[11px] text-slate-400">Triggered on user IMPS payout transfer</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                <select
                  value={settings.payoutSound}
                  disabled={!settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, payoutSound: e.target.value as SoundPresetKey }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 sm:flex-initial cursor-pointer disabled:opacity-50"
                >
                  {SOUND_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handlePreview(settings.payoutSound, 'payout')}
                  className={`p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shrink-0 ${
                    playingKey === 'payout' ? 'scale-95 bg-indigo-200' : ''
                  }`}
                  title="Test Sound"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-600" />
                </button>
              </div>
            </div>

            {/* EVENT 4: LIVE BBPS BILL PAYMENTS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Live BBPS Bill Payments</h5>
                  <p className="text-[11px] text-slate-400">Triggered on live BBPS payment success</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
                <select
                  value={settings.liveBillSound}
                  disabled={!settings.enabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, liveBillSound: e.target.value as SoundPresetKey }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 sm:flex-initial cursor-pointer disabled:opacity-50"
                >
                  {SOUND_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handlePreview(settings.liveBillSound, 'live_bill')}
                  className={`p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shrink-0 ${
                    playingKey === 'live_bill' ? 'scale-95 bg-indigo-200' : ''
                  }`}
                  title="Test Sound"
                >
                  <Play className="w-3.5 h-3.5 fill-indigo-600" />
                </button>
              </div>
            </div>

          </div>

          {/* VISUAL POPUP TOAST TOGGLE */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-bold text-slate-900 text-xs">Floating Toast Notifications</p>
                <p className="text-[10px] text-slate-500">Show visual pop-up banners on screen when requests arrive</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showToasts}
              onChange={(e) => setSettings(prev => ({ ...prev, showToasts: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              Settings saved & updated successfully!
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 text-xs font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save & Apply
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
