import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { 
  ShieldCheck, Eye, EyeOff, Lock, Phone, ArrowRight, 
  Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Key,
  TrendingUp, CreditCard, QrCode, Zap, Check
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        
        {/* ========================================================
            LEFT PANEL: Cobalt Blue & 3D Glass Graphic Showcase
            ======================================================== */}
        <div className="lg:col-span-7 space-y-8 lg:pr-6">
          
          {/* Back to Home & Brand Header */}
          <div className="flex items-center justify-between">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-800 transition duration-200 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fintech 2.0 Security Architecture</span>
            </div>
          </div>

          {/* 3D Glassmorphic Floating Tiles Banner */}
          <div className="relative rounded-3xl bg-gradient-to-br from-blue-900/90 via-indigo-950/80 to-slate-950 border border-blue-500/30 p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
            
            {/* Subtle mesh background */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Three 3D Glass Tiles Showcase */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              
              {/* Tile 1: Volume Growth */}
              <div className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-md shadow-lg transform hover:-translate-y-1 transition duration-300">
                <div className="flex items-center justify-between text-cyan-300 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-[10px] font-bold bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-300">Live</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">₹50+ Cr</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">Processed Volume</p>
              </div>

              {/* Tile 2: Metal Credit Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600/40 to-indigo-800/40 border border-white/20 p-4 backdrop-blur-md shadow-lg transform hover:-translate-y-1 transition duration-300">
                <div className="flex items-center justify-between text-blue-300 mb-2">
                  <CreditCard className="w-5 h-5 text-cyan-300" />
                  <div className="w-4 h-3 rounded-xs bg-amber-400/80"></div>
                </div>
                <div className="text-sm font-black text-white tracking-widest">•••• 4108</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">Instant CC Bill Pay</p>
              </div>

              {/* Tile 3: Dynamic QR */}
              <div className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-md shadow-lg transform hover:-translate-y-1 transition duration-300">
                <div className="flex items-center justify-between text-emerald-300 mb-2">
                  <QrCode className="w-5 h-5" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-white">Dynamic</div>
                <p className="text-[11px] font-medium text-slate-300 mt-1">UPI QR Settlement</p>
              </div>

            </div>

            {/* Headline and Platform Value */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-2xl font-black text-white">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Just2Pay</span> Portal
                </span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Seamless Collections, BBPS Credit Card Bill Payments & 24x7 Instant IMPS Bank Settlements across India.
              </p>
            </div>

            {/* Trust points */}
            <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Sub-Second Payout SLA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>256-Bit Bank-Grade Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Multi-Tier Commission Engine</span>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================
            RIGHT PANEL: Crisp White & Modern Floating Card (Concept 2)
            ======================================================== */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-2xl shadow-indigo-950/40 border border-slate-100 relative overflow-hidden">
            
            {/* Top Brand Tag in Card */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex items-center tracking-tight">
                  <span className="text-2xl font-black text-slate-900">Just</span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">2Pay</span>
                </div>
              </div>

              {loginStep === 'password' ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Login to Your Account</h2>
                  <p className="text-xs text-slate-500 mt-1">Enter your registered mobile number and password</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Step 2: Enter 6-Digit MPIN</h2>
                  <p className="text-xs text-slate-600 mt-1">
                    Welcome <span className="font-bold text-blue-600">{userName}</span>! Enter your secret 6-digit MPIN.
                  </p>
                </>
              )}
            </div>

            {/* Blocked Alert */}
            {blockedReason && (
              <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Account Access Denied</p>
                  <p className="mt-0.5">{blockedReason}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
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
                        <span className="text-base">🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-16 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm font-semibold tracking-wider transition"
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
                        className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-sm transition"
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

                  {/* Utility Links Row: Remember Me & Forgot Password */}
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
                        className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-lg font-mono tracking-[0.4em] text-center font-bold transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700"
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

              {/* Radiant Gradient Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : loginStep === 'password' ? (
                  <>
                    <span>Continue to 6-Digit MPIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Verify MPIN & Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Security Trust Badges at Bottom of Card */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit SSL Secured</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Secure & Encrypted Connection</span>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
