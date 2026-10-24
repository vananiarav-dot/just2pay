import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, AlertTriangle, X, RefreshCw, Key } from 'lucide-react';
import { authApi } from '../../services/api';

interface TpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tpinCode: string) => void;
  title?: string;
  subtitle?: string;
  onOpenResetOtp?: () => void;
}

export const TpinModal: React.FC<TpinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'TPIN Transaction Verification',
  subtitle = 'Enter your 4-Digit Security TPIN to authorize this operation',
  onOpenResetOtp
}) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setErrorMessage(null);
      setIsLocked(false);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = char;
    setPin(newPin);
    setErrorMessage(null);

    if (char && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    if (char && index === 3) {
      const fullPin = newPin.join('');
      if (fullPin.length === 4) {
        verifyPinCode(fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pin[index] && index > 0) {
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  const verifyPinCode = async (pinString: string) => {
    setLoading(true);
    setErrorMessage(null);
    setIsShake(false);

    try {
      const res = await authApi.verifyTpin(pinString);
      if (res.success) {
        onSuccess(pinString);
        onClose();
      } else {
        triggerShakeError(res.message || 'Invalid TPIN');
        if (res.isLocked) {
          setIsLocked(true);
        }
        if (res.attemptsLeft !== undefined) {
          setAttemptsLeft(res.attemptsLeft);
        }
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data) {
        if (data.isLocked) {
          setIsLocked(true);
        }
        if (data.attemptsLeft !== undefined) {
          setAttemptsLeft(data.attemptsLeft);
        }
        triggerShakeError(data.message || 'TPIN Verification Failed');
      } else {
        triggerShakeError('Network error verifying TPIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerShakeError = (msg: string) => {
    setErrorMessage(msg);
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`max-w-sm w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl relative ${isShake ? 'animate-shake' : ''}`}>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-200 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {isLocked ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center mb-4 space-y-2">
            <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-rose-800">TPIN Account Security Locked!</p>
            <p className="text-[11px] text-rose-600">
              3 consecutive invalid entries detected. TPIN transactions locked for 15 minutes.
            </p>
            {onOpenResetOtp && (
              <button
                onClick={() => {
                  onClose();
                  onOpenResetOtp();
                }}
                className="mt-2 text-xs text-amber-700 hover:text-amber-800 underline font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" /> Reset TPIN via WhatsApp OTP
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-center space-x-3 my-6">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="password"
                  maxLength={1}
                  value={digit}
                  disabled={loading}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 rounded-xl text-center font-mono font-extrabold text-2xl border transition focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    errorMessage
                      ? 'border-rose-300 text-rose-600 bg-rose-50/50'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {errorMessage && (
              <div className="text-center mb-4 space-y-1">
                <p className="text-xs font-semibold text-rose-600">{errorMessage}</p>
                {attemptsLeft !== null && (
                  <p className="text-[11px] text-amber-700 font-mono">
                    Warning: {attemptsLeft} attempt(s) remaining before 15-min lock
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => verifyPinCode(pin.join(''))}
              disabled={loading || pin.join('').length !== 4}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition disabled:opacity-40 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Financial Request</span>
                </>
              )}
            </button>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center flex items-center justify-between text-[11px] text-slate-500">
              <span>Demo TPIN: <strong className="text-indigo-600 font-mono">1234</strong></span>
              {onOpenResetOtp && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenResetOtp();
                  }}
                  className="text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="w-3 h-3" /> Forgot TPIN?
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
