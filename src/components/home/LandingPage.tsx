import React, { useState } from 'react';
import {
  QrCode,
  CreditCard,
  Zap,
  ShieldCheck,
  ArrowRight,
  LogIn,
  CheckCircle2,
  TrendingUp,
  Building2,
  Users,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  Mail,
  MapPin,
  Lock,
  RefreshCw,
  Wallet,
  Receipt,
  Headphones,
  Check,
  ChevronUp,
  Menu,
  X,
  ExternalLink,
  Percent,
  Sliders,
  DollarSign
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [monthlyVolume, setMonthlyVolume] = useState<number>(500000); // 5 Lakh default

  // Calculate estimated commission (approx 0.35% - 0.5% average)
  const estimatedCommission = Math.round(monthlyVolume * 0.0035);
  const annualEarnings = estimatedCommission * 12;

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqs = [
    {
      q: 'How fast are QR payments credited into the retailer wallet?',
      a: 'All Dynamic QR collections are verified with automated and admin controls, instantly crediting the retailer wallet with full statement transparency and real-time commission split.'
    },
    {
      q: 'Which banks are supported for Instant Credit Card Bill Payments?',
      a: 'Just2Pay supports all major Indian banks including HDFC, SBI, ICICI, Axis, Kotak, RBL, IndusInd, and Bank of Baroda with instant status verification.'
    },
    {
      q: 'How does the multi-tier Distributor and Super Distributor commission work?',
      a: 'Whenever a retailer completes a transaction, the platform automatically calculates and credits commissions in real-time to the respective Distributor and Super Distributor wallets.'
    },
    {
      q: 'What is the Payout settlement timing to bank accounts?',
      a: 'Our IMPS Payout gateway operates 24x7x365, ensuring fund settlements hit any verified beneficiary bank account within 2 to 5 seconds.'
    },
    {
      q: 'What security measures are implemented to protect accounts?',
      a: 'Just2Pay enforces mandatory 6-digit MPIN authorization, TPIN for sensitive transactions, session timeouts, and bank-grade 256-bit AES encryption.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Dot Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Ambient Floating Pastel Glow Orbs */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[400px] bg-gradient-to-tr from-cyan-200/40 via-blue-200/30 to-indigo-200/20 rounded-full blur-[130px] pointer-events-none animate-float"></div>
      <div className="absolute top-96 right-10 w-[450px] h-[350px] bg-gradient-to-br from-indigo-200/30 via-purple-200/20 to-blue-200/30 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '3s' }}></div>

      {/* ========================================================
          1. TOP ANNOUNCEMENT BAR
          ======================================================== */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 relative z-50 shadow-xs">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span>Just2Pay 2.0 Live: Ultra-Fast Dynamic QR Collections & 24x7 Instant IMPS Settlements Activated!</span>
        <button 
          onClick={onNavigateToLogin}
          className="ml-2 underline font-bold hover:text-cyan-200 transition hidden sm:inline-flex items-center gap-1 cursor-pointer"
        >
          Access Portal <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* ========================================================
          2. NAVBAR (Crisp Light Theme)
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 transition shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center cursor-pointer group"
          >
            <img 
              src="/just2pay-logo.png" 
              alt="Just2Pay" 
              className="h-10 sm:h-12 w-auto object-contain select-none group-hover:scale-105 transition-transform duration-200" 
            />
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
              className="text-blue-600 hover:text-blue-700 transition font-bold"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('services')} 
              className="hover:text-blue-600 transition"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection('calculator')} 
              className="hover:text-blue-600 transition"
            >
              Commission Calculator
            </button>
            <button 
              onClick={() => scrollToSection('security')} 
              className="hover:text-blue-600 transition"
            >
              Security
            </button>
            <button 
              onClick={() => scrollToSection('faq')} 
              className="hover:text-blue-600 transition"
            >
              FAQ
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="hover:text-blue-600 transition"
            >
              Contact
            </button>
          </nav>

          {/* Action Button */}
          <div className="hidden sm:flex items-center gap-4">
            <button
              onClick={onNavigateToLogin}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white overflow-hidden shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition duration-300 cursor-pointer"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 group-hover:from-blue-700 group-hover:to-cyan-600 transition duration-300"></span>
              <span className="relative flex items-center gap-2">
                <LogIn className="w-4 h-4 text-cyan-100" />
                <span>Merchant Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition duration-200" />
              </span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 px-6 py-5 space-y-4 shadow-xl">
            <button
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="block w-full text-left font-bold text-blue-600 py-1"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('services')}
              className="block w-full text-left font-semibold text-slate-700 py-1 hover:text-blue-600"
            >
              Services
            </button>
            <button
              onClick={() => scrollToSection('calculator')}
              className="block w-full text-left font-semibold text-slate-700 py-1 hover:text-blue-600"
            >
              Commission Calculator
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="block w-full text-left font-semibold text-slate-700 py-1 hover:text-blue-600"
            >
              Security
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="block w-full text-left font-semibold text-slate-700 py-1 hover:text-blue-600"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left font-semibold text-slate-700 py-1 hover:text-blue-600"
            >
              Contact
            </button>
            <div className="pt-2">
              <button
                onClick={onNavigateToLogin}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 font-bold text-white shadow-md shadow-blue-500/25"
              >
                <LogIn className="w-4 h-4" />
                <span>Merchant Login</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          3. HERO SECTION (Light Theme with Elevated Visuals)
          ======================================================== */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                <span>India's Most Advanced B2B Fintech Network</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Powering Fast, Secure & Automated{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500">
                  Digital Payments
                </span>
              </h1>

              {/* Description */}
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Equip your retail and distribution business with Dynamic QR collections, 
                instant Credit Card bill clearance, real-time 24x7 IMPS bank payouts, and automated multi-tier commission settlements.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition duration-200 cursor-pointer"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Enter Just2Pay Portal</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => scrollToSection('calculator')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300/90 text-slate-700 font-bold text-base transition hover:border-blue-400 shadow-xs cursor-pointer"
                >
                  <Percent className="w-5 h-5 text-blue-600" />
                  <span>Calculate Commission</span>
                </button>
              </div>

              {/* Trust Micro-Badges */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Instant Settlements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">99.99% Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Bank-Grade 256-Bit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">24x7 IMPS Active</span>
                </div>
              </div>

            </div>

            {/* Right Visual Column (Interactive Live Fintech Mockup) */}
            <div className="lg:col-span-5 relative">
              
              {/* Main Showcase Box */}
              <div className="relative mx-auto max-w-md rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-xl">
                
                {/* Header inside mockup */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <QrCode className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Dynamic Merchant QR</h4>
                      <p className="text-[10px] text-slate-500">Limit: ₹10,00,000 / Day</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>

                {/* Simulated QR Code Graphic */}
                <div className="my-6 p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col items-center justify-center shadow-md relative group">
                  <div className="w-44 h-44 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* QR Matrix Mockup */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full p-2 opacity-85">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-[2px] ${
                            i % 2 === 0 || i % 5 === 0 ? 'bg-slate-900' : 'bg-transparent'
                          } ${i === 0 || i === 5 || i === 30 ? 'bg-blue-600' : ''}`}
                        />
                      ))}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-md p-1">
                        <img src="/just2pay-logo.png" alt="Just2Pay" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] font-black text-slate-900 tracking-wide">
                    SCAN TO PAY WITH ANY UPI APP
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">
                    GPay • PhonePe • Paytm • BHIM
                  </p>
                </div>

                {/* Real-time Transaction Notifications Stack */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-white border border-emerald-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">QR Payment Approved</p>
                        <p className="text-[10px] text-slate-500">Commission Credited: +₹17.50</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-600">+₹5,000.00</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white border border-blue-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Credit Card Bill Cleared</p>
                        <p className="text-[10px] text-slate-500">HDFC Bank • Ending in 4108</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-blue-600">₹25,000.00</span>
                  </div>
                </div>

              </div>

              {/* Floating Accent Card 1: Instant Payout */}
              <div className="absolute -bottom-6 -left-6 bg-white/95 border border-slate-200/90 rounded-2xl p-4 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-3 animate-float-card">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">24x7 Instant IMPS</p>
                  <p className="text-[11px] font-semibold text-emerald-600">Bank Settlement: 1.4s</p>
                </div>
              </div>

              {/* Floating Accent Card 2: Security Badge */}
              <div className="absolute -top-4 -right-4 bg-white/95 border border-slate-200/90 rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md hidden sm:flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">ISO & NPCI Standard</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          4. STATS PROOF BAR (Light Theme)
          ======================================================== */}
      <section className="border-y border-slate-200 bg-slate-50/70 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            <div className="pt-4 lg:pt-0">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                ₹50+ Cr
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Monthly Processing Volume
              </p>
            </div>

            <div className="pt-4 lg:pt-0">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                12,000+
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Active Retailers & Distributors
              </p>
            </div>

            <div className="pt-4 lg:pt-0">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                &lt; 2 Sec
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Average IMPS Payout Speed
              </p>
            </div>

            <div className="pt-4 lg:pt-0">
              <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                99.99%
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Platform High Availability
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          5. CORE SERVICES GRID (Crisp White Cards)
          ======================================================== */}
      <section id="services" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full">
              Full-Stack Fintech Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Every Service Your Business Needs Under One Roof
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Engineered with speed, high success rates, and transparent automated commission tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Service 1: Dynamic QR */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Dynamic QR Engine</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Generate high-limit Dynamic QR codes with daily collection caps, automatic midnight limit rotation, and safety undo controls.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Instant wallet credit with proof upload</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Configurable daily merchant limit caps</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Automated multi-tier commission split</span>
                </li>
              </ul>
            </div>

            {/* Service 2: Credit Card Bill Payment */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Credit Card Bill Pay</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Pay credit card bills across all banks instantly with live biller fetch, automated clearance confirmation, and custom internal notes.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Supports Visa, MasterCard, RuPay & Diners</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Instant clearance receipts & reference tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Real-time bill fetch via B2B API gateways</span>
                </li>
              </ul>
            </div>

            {/* Service 3: Instant IMPS Payouts */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">24x7 Instant Bank Payouts</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Direct-to-bank account settlement with sub-second turnaround times. Settle funds anytime, including bank holidays and Sundays.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>24x7 IMPS / NEFT settlement routing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Beneficiary account & IFSC verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Low transaction charges & instant UTR</span>
                </li>
              </ul>
            </div>

            {/* Service 4: Multi-Role Distribution */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Multi-Tier Distribution</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Specialized role architecture for Retailers, Distributors, and Super Distributors. Scale your partner network effortlessly.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Downline retailer performance tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Automated commission distribution engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Detailed multi-user wallet logs</span>
                </li>
              </ul>
            </div>

            {/* Service 5: Account Statement & Passbook */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-cyan-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 mb-6 group-hover:scale-110 transition">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Digital Passbook & Ledger</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Complete transparency for every rupee. Filter, search, and export account statements with detailed debit/credit audit trails.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Real-time running wallet balance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Exportable CSV / PDF financial ledgers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Comprehensive reversal & adjustment logs</span>
                </li>
              </ul>
            </div>

            {/* Service 6: Security & MPIN Protection */}
            <div className="group rounded-3xl bg-white border border-slate-200/90 p-8 hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 relative shadow-xs hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Zero-Trust Security</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Hardened authentication with mandatory 6-digit MPIN, TPIN security, encrypted JWT tokens, and automated session invalidation.
              </p>
              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mandatory MPIN for all financial actions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>256-bit SSL encrypted data transport</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Comprehensive KYC compliance verification</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          6. INTERACTIVE COMMISSION CALCULATOR (Light Theme)
          ======================================================== */}
      <section id="calculator" className="py-20 bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-50 border-y border-slate-200 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full">
              Earnings Estimator
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3">
              Calculate Your Monthly Just2Pay Earnings
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Drag the slider to preview your estimated commission and net earnings.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl">
            
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-700">
                  Monthly Payment Collection Volume:
                </label>
                <div className="text-2xl font-black text-blue-600">
                  ₹{monthlyVolume.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Volume Range Slider */}
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />

              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>₹50,000 / mo</span>
                <span>₹25,00,000 / mo</span>
                <span>₹50,00,000 / mo</span>
              </div>

              {/* Results Grid */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-center">
                  <span className="text-xs text-emerald-800 font-bold">Estimated Monthly Earnings</span>
                  <div className="text-2xl font-black text-emerald-600 mt-1">
                    ₹{estimatedCommission.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold">Credited instantly to wallet</span>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-center">
                  <span className="text-xs text-blue-800 font-bold">Projected Annual Earnings</span>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    ₹{annualEarnings.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-blue-700 font-semibold">Yearly payout compounding</span>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-center">
                  <span className="text-xs text-purple-800 font-bold">Settlement Turnaround</span>
                  <div className="text-2xl font-black text-purple-600 mt-1">
                    Real-Time
                  </div>
                  <span className="text-[10px] text-purple-700 font-semibold">Zero waiting period</span>
                </div>

              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={onNavigateToLogin}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 font-bold text-white text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition cursor-pointer"
                >
                  <span>Start Earning with Just2Pay Today</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          7. HOW IT WORKS (3 SIMPLE STEPS - Light Theme)
          ======================================================== */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full">
              Fast Onboarding
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3">
              Start Accepting Payments in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 text-center relative group hover:border-blue-400 hover:shadow-lg transition shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-black text-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Login & KYC Check</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Log into the Just2Pay secure portal and verify your merchant details in less than 2 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 text-center relative group hover:border-indigo-400 hover:shadow-lg transition shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-black text-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Generate Dynamic QR</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Activate your daily dynamic QR code or load your business wallet for live bill payments.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 text-center relative group hover:border-emerald-400 hover:shadow-lg transition shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Payouts & Commission</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Collect payments, earn instant commissions, and trigger 24x7 IMPS bank payouts anytime.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================
          8. SECURITY & COMPLIANCE SECTION (Light Theme)
          ======================================================== */}
      <section id="security" className="py-20 bg-slate-50/80 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full">
                Enterprise-Grade Defense
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                Your Funds & Data Protected by Multi-Layered Security
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Just2Pay is built with fintech security at its foundation. We employ strict cryptographic standards, role segregation, and live audit telemetry to ensure complete safety.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">6-Digit Mandatory MPIN</h4>
                    <p className="text-xs text-slate-600 mt-0.5">All transactions require custom MPIN authorization, preventing unauthorized transfers.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">256-Bit SSL End-to-End Encryption</h4>
                    <p className="text-xs text-slate-600 mt-0.5">All communications between client and server are fully encrypted with modern TLS cipher suites.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Method 2 Undo Reversal Guard</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Automated wallet balance verification ensures zero negative wallet balance vulnerabilities.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-xs">
                <ShieldCheck className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">ISO 27001</h4>
                <p className="text-xs text-slate-500 mt-1">Information Security Standard</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-xs">
                <Lock className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">256-Bit AES</h4>
                <p className="text-xs text-slate-500 mt-1">Military Grade Cryptography</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-xs">
                <RefreshCw className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">NPCI Compliant</h4>
                <p className="text-xs text-slate-500 mt-1">UPI & IMPS Guidelines</p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center shadow-xs">
                <Headphones className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900">24x7 Monitoring</h4>
                <p className="text-xs text-slate-500 mt-1">Proactive Fraud Prevention</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          9. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION)
          ======================================================== */}
      <section id="faq" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-full">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden transition shadow-2xs hover:border-blue-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                  >
                    <span className="text-base">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================
          10. BOTTOM CALL TO ACTION (Vibrant Blue Card)
          ======================================================== */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white p-10 sm:p-14 text-center shadow-2xl relative overflow-hidden">
            
            {/* Glow Orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Ready to Accelerate Your Payments with Just2Pay?
              </h2>
              <p className="text-blue-100 text-sm sm:text-base">
                Join thousands of merchants, distributors, and partners who trust Just2Pay for their daily financial operations.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onNavigateToLogin}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-black text-base shadow-xl hover:scale-105 transition duration-200 cursor-pointer"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Access Merchant Portal</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          11. FOOTER (Light Theme)
          ======================================================== */}
      <footer id="contact" className="border-t border-slate-200 bg-slate-50 pt-16 pb-12 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200">
            
            {/* Col 1: Brand */}
            <div className="lg:col-span-2 space-y-4">
              <div className="inline-block">
                <img 
                  src="/just2pay-logo.png" 
                  alt="Just2Pay" 
                  className="h-9 sm:h-10 w-auto object-contain select-none" 
                />
              </div>
              <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
                Next-generation B2B fintech platform providing high-speed Dynamic QR collections, Credit Card bill payments, instant 24x7 IMPS payouts, and multi-tier commission settlements.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All Payment Gateways & API Engines Operational</span>
              </div>
            </div>

            {/* Col 2: Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Services</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition cursor-pointer">Dynamic QR Collection</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition cursor-pointer">Credit Card Bill Pay</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition cursor-pointer">24x7 IMPS Payouts</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition cursor-pointer">Distribution Management</button></li>
                <li><button onClick={() => scrollToSection('services')} className="hover:text-blue-600 transition cursor-pointer">Digital Account Passbook</button></li>
              </ul>
            </div>

            {/* Col 3: Portal Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><button onClick={onNavigateToLogin} className="hover:text-blue-600 transition cursor-pointer">Merchant Login</button></li>
                <li><button onClick={onNavigateToLogin} className="hover:text-blue-600 transition cursor-pointer">Admin Console</button></li>
                <li><button onClick={() => scrollToSection('calculator')} className="hover:text-blue-600 transition cursor-pointer">Commission Calculator</button></li>
                <li><button onClick={() => scrollToSection('security')} className="hover:text-blue-600 transition cursor-pointer">Security Standards</button></li>
                <li><button onClick={() => scrollToSection('faq')} className="hover:text-blue-600 transition cursor-pointer">Help & FAQ</button></li>
              </ul>
            </div>

            {/* Col 4: Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Support Desk</h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>support@just2pay.in</span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>+91 99999 99999</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>24x7 Dedicated Assistance</span>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Just2Pay Technologies Pvt Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-800 transition cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-800 transition cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-800 transition cursor-pointer">Security Compliance</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
