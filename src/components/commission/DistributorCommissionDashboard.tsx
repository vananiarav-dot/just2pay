import React, { useState } from 'react';
import {
  Sparkles, Layers, Clock, ShieldCheck, Zap, TrendingUp,
  ArrowRight, Bell, CheckCircle2, Award, BarChart3, Lock
} from 'lucide-react';

export const DistributorCommissionDashboard: React.FC = () => {
  const [notified, setNotified] = useState(false);
  const [email, setEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setNotified(true);
    setToastMessage('✨ Success! You have been added to the Commission V2.5 early access notification list.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  const upcomingFeatures = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Real-Time Settlement Engine",
      description: "Instant line-by-line commission calculation and wallet auto-credits upon every retailer transaction."
    },
    {
      icon: <Layers className="w-6 h-6 text-indigo-400" />,
      title: "Multi-Tier Tree Analytics",
      description: "Comprehensive visual hierarchy tracking across Super Distributors, Distributors, and Retailer networks."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-400" />,
      title: "Custom Slab Configurator",
      description: "Dynamic fee and margin slab management with percentage & flat cashback structures per BBPS service."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-purple-400" />,
      title: "Automated Wallet Payouts",
      description: "One-click instant commission withdrawal into your primary working wallet with TPIN authorization."
    }
  ];

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-300 text-emerald-800 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold tracking-wide uppercase shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Next-Gen Upgrade In Progress
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Distributor Hierarchy & Commission Passbook
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
              We are upgrading our enterprise multi-tier commission ledger and real-time passbook system to deliver higher throughput, automated payouts, and detailed margin reporting.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl flex-shrink-0 shadow-2xs">
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Target Release</p>
              <p className="text-xs font-black text-slate-900">Version 2.5 Roadmap</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Coming Soon Card */}
      <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="mx-auto w-20 h-20 bg-indigo-50 border border-indigo-200 p-1 rounded-3xl shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[20px] flex items-center justify-center border border-indigo-100">
              <Layers className="w-10 h-10 text-indigo-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Commission Tree & Slabs is Coming Soon
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              This module is currently undergoing scheduled architecture enhancements to introduce real-time Supabase RPC distribution, atomic wallet payouts, and exportable ledger certificates.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl max-w-md mx-auto space-y-2 shadow-2xs">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Development Status
              </span>
              <span className="text-indigo-600 font-extrabold">85% Completed</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 h-full rounded-full w-[85%] transition-all duration-1000" />
            </div>
          </div>

          {/* Early Notification Form */}
          <form onSubmit={handleSubscribe} className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <div className="relative w-full">
              <Bell className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Enter your admin email for early access..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={notified}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 transition"
              />
            </div>
            <button
              type="submit"
              disabled={notified}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {notified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Subscribed
                </>
              ) : (
                <>
                  Notify Me <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Feature Preview Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" /> What To Expect In Version 2.5
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {upcomingFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 hover:border-indigo-300 p-5 rounded-2xl transition hover:-translate-y-1 space-y-3 group shadow-xs hover:shadow-md"
            >
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-fit group-hover:scale-110 transition-transform">
                {feat.icon}
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                {feat.title}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Security & Compliance Guaranteed • 256-Bit Financial Encryption</span>
        </div>
        <span className="font-semibold text-slate-600">Just2Pay Enterprise Network</span>
      </div>
    </div>
  );
};
