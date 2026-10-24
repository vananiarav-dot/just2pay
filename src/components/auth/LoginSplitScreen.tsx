import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Just2PayLogo } from '../common/Just2PayLogo';
import { 
  ShieldCheck, Eye, EyeOff, Lock, Phone, ArrowRight, 
  Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Key,
  TrendingUp, CreditCard, QrCode, Zap, Shield, Check
} from 'lucide-react';

interface LoginSplitScreenProps {
  onOpenResetPin?: () => void;
  onBackToHome?: () => void;
}

export const LoginSplitScreen: React.FC<LoginSplitScreenProps> = ({ onOpenResetPin, onBackToHome }) => {
  const { setAuth } = useAuthStore();
  const [loginStep, setLoginStep] = useState<'password' | 'mpin_verify'>('password');
  
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setBlockedReason(null);

    try {
      if (loginStep === 'password') {
        const res = await authApi.login({ mobile_number: mobileNumber, password });
        if (res.require_mpin_verify) {
          setLoginStep('mpin_verify');
          setUserName(res.user_name || 'Merchant');
          setMpin('');
        } else if (res.success && res.token && res.user) {
          setAuth(res.user, res.token, res.must_change_password);
        } else {
          setErrorMessage(res.message || 'Authentication failed.');
        }
      } else {
        // Step 2: MPIN Verify
        if (!mpin || mpin.length !== 6) {
          setErrorMessage('Please enter your 6-digit MPIN.');
          setLoading(false);
          return;
        }

        const res = await authApi.login({ mobile_number: mobileNumber, password, mpin });
        if (res.success && res.token && res.user) {
          setAuth(res.user, res.token, res.must_change_password);
        } else {
          setErrorMessage(res.message || 'MPIN verification failed.');
        }
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp) {
        if (resp.reason === 'ACCOUNT_BLOCKED' || resp.reason === 'ACCOUNT_INACTIVE') {
          setBlockedReason(resp.message);
        } else {
          setErrorMessage(resp.message || 'Authentication error occurred.');
        }
      } else {
        setErrorMessage('Server unreachable or network error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      
      {/* ========================================================
          ANIMATED BACKGROUND: Crisp White with Ambient Floating Glow Orbs
          ======================================================== */}
      {/* Dot Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />

      {/* Floating Ambient Glow Orbs with Smooth Animation */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 via-blue-500/20 to-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-float"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-cyan-400/20 rounded-full blur-[110px] pointer-events-none animate-float" style={{ animationDelay: '4s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-r from-blue-100/40 via-cyan-50/30 to-indigo-100/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* ========================================================
            LEFT PANEL: Cobalt Blue 3D Graphic Showcase with Floating Cards
            ======================================================== */}
        <div className="lg:col-span-7 space-y-6 lg:pr-4">
          
          {/* Top Row: Back to Home + Security Badge */}
          <div className="flex items-center justify-between">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-xs hover:shadow transition duration-200 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-blue-600 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Next-Gen Enterprise Fintech Portal</span>
            </div>
          </div>

          {/* Main 3D Card Stack Container (Rich Cobalt Blue & Indigo) */}
          <div className="relative rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 border border-blue-500/25 p-7 sm:p-9 shadow-2xl shadow-blue-950/20 overflow-hidden backdrop-blur-2xl">
            
            {/* Ambient Internal Sheen */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Three Animated 3D Floating Feature Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              
              {/* Tile 1: Growth Volume (Floating Animation) */}
              <div className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 p-4 backdrop-blur-md shadow-xl transition-all duration-300 animate-float-card group">
                <div className="flex items-center justify-between text-cyan-300 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <TrendingUp className="w-4 h-4 text-cyan-300" />
                  </div>
                  <span className="text-[10px] font-bold bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-400/30">
                    Live
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">₹50+ Cr</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">Processed Volume</p>
              </div>

              {/* Tile 2: Metal Credit Card (Reverse Floating Animation) */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600/40 via-indigo-700/30 to-purple-800/40 hover:from-blue-600/50 border border-white/20 p-4 backdrop-blur-md shadow-xl transition-all duration-300 animate-float-card-reverse group">
                <div className="flex items-center justify-between text-blue-300 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <CreditCard className="w-4 h-4 text-cyan-300" />
                  </div>
                  {/* Golden Card Chip */}
                  <div className="w-5 h-3.5 rounded-xs bg-gradient-to-r from-amber-300 to-amber-500 border border-amber-200 shadow-xs"></div>
                </div>
                <div className="text-sm font-black text-white tracking-widest font-mono">•••• 4108</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">Instant CC Bill Pay</p>
              </div>

              {/* Tile 3: Dynamic QR Code with Laser Scan Animation */}
              <div className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 p-4 backdrop-blur-md shadow-xl transition-all duration-300 animate-float-card group relative overflow-hidden">
                {/* Laser Scanning Beam Animation */}
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan-laser pointer-events-none"></div>

                <div className="flex items-center justify-between text-emerald-300 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition">
                    <QrCode className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white tracking-tight">Dynamic</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">UPI QR Settlement</p>
              </div>

            </div>

            {/* Headline and Value Proposition */}
            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Accelerate Your Business with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
                  Instant Settlements
                </span>
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                Dynamic QR Collections, BBPS Credit Card Bill Payments & 24x7 Instant IMPS Bank Settlements across India.
              </p>
            </div>

            {/* Bottom Trust Indicators */}
            <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sub-Second Payout SLA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>256-Bit Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multi-Tier Commission Engine</span>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================
            RIGHT PANEL: Crisp Elevated Modern White Card
            ======================================================== */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-slate-300/60 border border-slate-200/80 relative overflow-hidden">
            
            {/* Top Brand Logo Center Highlighted */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 hover:scale-105 transition-transform duration-200">
                <Just2PayLogo variant="light" size="lg" showTagline={false} />
              </div>

              {loginStep === 'password' ? (
                <>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Login to Your Account</h2>
                  <p className="text-xs text-slate-500 mt-1">Enter your registered mobile number and password</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                    <Lock className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900">Step 2: Enter 6-Digit MPIN</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Welcome <span className="font-bold text-blue-600">{userName}</span>! Enter your secret 6-digit MPIN.
                  </p>
                </>
              )}
            </div>

            {/* Blocked Account Alert */}
            {blockedReason && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Account Access Denied</p>
                  <p className="mt-0.5">{blockedReason}</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {loginStep === 'password' ? (
                <>
                  {/* Mobile Number Field with Indian Flag */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600 text-xs font-bold gap-1.5">
                        <span className="text-base leading-none">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-16 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-semibold tracking-wider transition shadow-2xs"
                      />
                      <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter account password"
                        className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm transition shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Utility Links Row */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
                      />
                      <span>Remember Me</span>
                    </label>

                    {onOpenResetPin && (
                      <button
                        type="button"
                        onClick={onOpenResetPin}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1 transition"
                      >
                        <Key className="w-3 h-3" />
                        <span>Forgot Password / MPIN?</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: 6-Digit MPIN Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Enter 6-Digit MPIN</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={6}
                        value={mpin}
                        onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-xl font-mono tracking-[0.45em] text-center font-bold transition shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-4 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => { setLoginStep('password'); setMpin(''); setErrorMessage(null); }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Password Input
                    </button>
                  </div>
                </>
              )}

              {/* Radiant Animated Gradient Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : loginStep === 'password' ? (
                  <>
                    <span>Continue to 6-Digit MPIN</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <span>Verify MPIN & Enter Portal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Security Trust Badges */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-[11px] font-bold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit SSL Secured</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Encrypted Bank-Grade Authorization</span>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
