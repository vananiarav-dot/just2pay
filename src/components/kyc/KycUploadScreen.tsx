import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { useAuthStore } from '../../store/authStore';
import { kycApi } from '../../services/api';
import { 
  ShieldCheck, CheckCircle2, AlertCircle, FileText, 
  CreditCard, Store, Building2, Camera, LogOut, ArrowRight, 
  ArrowLeft, Loader2, X, Check, Info, Sparkles, Eye
} from 'lucide-react';
import type { UserProfile } from '../../types/auth';

interface KycUploadScreenProps {
  user: UserProfile;
}

export const KycUploadScreen: React.FC<KycUploadScreenProps> = ({ user }) => {
  const { updateUser, logout } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [docs, setDocs] = useState<{
    pan_card_url: string;
    aadhaar_front_url: string;
    aadhaar_back_url: string;
    firm_selfie_url: string;
    cheque_url: string;
  }>({
    pan_card_url: '',
    aadhaar_front_url: '',
    aadhaar_back_url: '',
    firm_selfie_url: '',
    cheque_url: ''
  });

  const [compressing, setCompressing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);

  // File upload with auto-compression to ~350KB
  const handleFileUpload = async (key: keyof typeof docs, file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please upload a smaller image.');
      return;
    }

    setCompressing(prev => ({ ...prev, [key]: true }));
    setErrorMessage(null);

    try {
      let fileToProcess: File | Blob = file;

      if (file.type.startsWith('image/')) {
        try {
          const options = {
            maxSizeMB: 0.35,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/jpeg'
          };
          fileToProcess = await imageCompression(file, options);
        } catch (compErr) {
          console.warn('Image compression fallback:', compErr);
          fileToProcess = file;
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setDocs(prev => ({ ...prev, [key]: base64 }));
        setCompressing(prev => ({ ...prev, [key]: false }));
      };
      reader.onerror = () => {
        setCompressing(prev => ({ ...prev, [key]: false }));
      };
      reader.readAsDataURL(fileToProcess);
    } catch (err) {
      console.error('File upload error:', err);
      setCompressing(prev => ({ ...prev, [key]: false }));
    }
  };

  const removeDoc = (key: keyof typeof docs) => {
    setDocs(prev => ({ ...prev, [key]: '' }));
  };

  // Completion states per step
  const isStep1Complete = Boolean(docs.pan_card_url);
  const isStep2Complete = Boolean(docs.aadhaar_front_url && docs.aadhaar_back_url);
  const isStep3Complete = Boolean(docs.cheque_url);
  const isStep4Complete = Boolean(docs.firm_selfie_url);
  const isAllComplete = isStep1Complete && isStep2Complete && isStep3Complete && isStep4Complete;

  const isCompressingAny = Object.values(compressing).some(Boolean);

  // Submit all KYC documents to backend
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isCompressingAny) {
      alert('Images are still being optimized. Please wait a moment.');
      return;
    }
    if (!isAllComplete) {
      setErrorMessage('Please complete and attach all 4 required KYC steps before submitting.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await kycApi.submitKyc(docs);
      if (res.success && res.user) {
        updateUser(res.user);
      } else {
        setErrorMessage(res.message || 'Failed to submit KYC documents.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Server error while submitting KYC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRejected = user.kyc_status === 'rejected';

  // Step definitions for the wizard header
  const stepsConfig = [
    {
      num: 1 as const,
      label: 'PAN Card',
      desc: 'Tax Identity',
      icon: CreditCard,
      isDone: isStep1Complete,
    },
    {
      num: 2 as const,
      label: 'Aadhaar Card',
      desc: 'Front & Back',
      icon: FileText,
      isDone: isStep2Complete,
    },
    {
      num: 3 as const,
      label: 'Bank Cheque',
      desc: 'Cancelled / Passbook',
      icon: Building2,
      isDone: isStep3Complete,
    },
    {
      num: 4 as const,
      label: 'Firm Photo',
      desc: 'Outlet / Shop Banner',
      icon: Store,
      isDone: isStep4Complete,
    },
  ];

  // Helper component to render an upload box
  const renderUploadBox = (
    key: keyof typeof docs,
    title: string,
    subtitle: string,
    badgeText: string,
    icon: React.ElementType
  ) => {
    const fileData = docs[key];
    const isComp = compressing[key];
    const inputId = `kyc_file_input_${key}`;
    const IconComp = icon;

    return (
      <div className={`relative rounded-3xl p-5 sm:p-6 transition-all duration-300 border flex flex-col justify-between ${
        fileData 
          ? 'bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10' 
          : 'bg-white border-slate-200/90 hover:border-indigo-400 shadow-xs hover:shadow-md'
      }`}>
        {/* Top Header of Upload Box */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition ${
              fileData 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-2xs'
            }`}>
              <IconComp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 leading-tight">{title}</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
            </div>
          </div>

          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shrink-0 transition ${
            fileData 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-mono'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {fileData ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Uploaded</span>
              </>
            ) : badgeText}
          </span>
        </div>

        {/* Dropzone or Preview */}
        {isComp ? (
          <div className="border-2 border-dashed border-indigo-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-indigo-50/50 min-h-[220px]">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2.5" />
            <span className="text-sm font-bold text-indigo-900">Compressing & Optimizing...</span>
            <span className="text-xs text-slate-500 mt-1">Preparing high-resolution file for upload</span>
          </div>
        ) : fileData ? (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group min-h-[220px] max-h-[300px] flex items-center justify-center">
            <img 
              src={fileData} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            {/* Overlay buttons on hover */}
            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-3 backdrop-blur-2xs">
              <button
                type="button"
                onClick={() => setPreviewModalImg({ url: fileData, title })}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => removeDoc(key)}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>

            <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-emerald-600/95 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready</span>
            </div>
          </div>
        ) : (
          <label 
            htmlFor={inputId}
            className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition bg-slate-50/70 hover:bg-indigo-50/40 min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-2xs">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
              Click to Upload / Take Photo
            </span>
            <span className="text-xs text-slate-500 mt-1 max-w-xs">
              Upload PNG, JPG or JPEG from device or take photo with camera (auto-compressed)
            </span>
          </label>
        )}

        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(key, file);
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafb] text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. TOP BRAND HEADER */}
      <header className="h-18 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <div className="flex items-center gap-3">
          <img src="/just2pay-logo.png" alt="Just2Pay" className="h-9 w-auto object-contain" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900 tracking-tight">Just2Pay</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                KYC Onboarding
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              RBI Compliance & Bank Identity Verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900">{user.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{user.firm_name || 'Retail Outlet'} • {user.mobile_number}</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WIZARD BODY */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start">
        
        {/* REJECTION REASON BANNER (IF REJECTED PREVIOUSLY) */}
        {isRejected && (
          <div className="mb-6 p-4 rounded-3xl bg-rose-50 border border-rose-200 flex items-start gap-3.5 text-rose-800 shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-black text-rose-700 uppercase tracking-wider text-[11px]">
                Previous KYC Submission Was Rejected by Administrator
              </p>
              <p className="mt-1 text-rose-900 font-semibold">
                Reason: <span className="font-bold underline">{user.kyc_rejection_reason || 'Document photo unclear or mismatched details.'}</span>
              </p>
              <p className="mt-1 text-slate-600 text-[11px]">
                Please upload clear, original photos for each step below and submit again.
              </p>
            </div>
          </div>
        )}

        {/* 3. WIZARD STEPPERS (4 STEPS INDICATOR) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 mb-6 shadow-xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 relative">
            {stepsConfig.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              const StepIcon = s.icon;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex flex-col items-center text-center p-2 sm:p-3 rounded-2xl transition cursor-pointer select-none group ${
                    isActive 
                      ? 'bg-indigo-50/80 border border-indigo-200 shadow-2xs' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {/* Step Bubble */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm transition-all duration-300 shadow-xs mb-2 ${
                    s.isDone
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-200'
                      : isActive
                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-100 scale-105'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                  }`}>
                    {s.isDone ? (
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="min-w-0">
                    <span className={`text-[10px] sm:text-xs font-black tracking-tight block truncate ${
                      isActive ? 'text-indigo-900' : (s.isDone ? 'text-emerald-700' : 'text-slate-600')
                    }`}>
                      <span className="hidden sm:inline">Step {s.num}: </span>{s.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden md:block truncate mt-0.5">
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Overall Progress Bar */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-700">Verification Steps Completed:</span>
              <span className="font-bold font-mono text-indigo-600">
                {[isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete].filter(Boolean).length} of 4
              </span>
            </div>

            <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0 hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-500 rounded-full"
                style={{ 
                  width: `${([isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete].filter(Boolean).length / 4) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE (IF ANY) */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 4. STEP SPECIFIC CONTENT (CARD CONTAINER) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs flex-1 flex flex-col justify-between">
          
          {/* ========================================================
              STEP 1: PAN CARD PHOTO (MANDATORY)
              ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Step 1 of 4 • Tax Identity</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Upload Original PAN Card
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Please provide a clear, color photo of your physical PAN Card. The Name, PAN number, and Date of Birth must be clearly legible.
                </p>
              </div>

              {renderUploadBox(
                'pan_card_url',
                'Permanent Account Number (PAN) Card',
                'Upload front photo showing full 10-digit PAN number & signature',
                'Mandatory',
                CreditCard
              )}

              {/* Guidelines Note */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Guidelines for PAN verification:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ensure there is no camera flash glare over your PAN number or photo. All 4 borders of the card should be fully visible within the frame.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: AADHAAR CARD (FRONT & BACK)
              ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Step 2 of 4 • National Identity Proof</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Upload Aadhaar Card (Front & Back)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Upload photos of both the front side (photo & Aadhaar number) and back side (full address & QR) of your Aadhaar card.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderUploadBox(
                  'aadhaar_front_url',
                  'Aadhaar Card (Front Side)',
                  'Showing your Photo, Full Name, DOB and 12-digit Aadhaar Number',
                  'Front Side',
                  FileText
                )}

                {renderUploadBox(
                  'aadhaar_back_url',
                  'Aadhaar Card (Back Side)',
                  'Showing your Permanent Residential Address & Security QR code',
                  'Back Side',
                  FileText
                )}
              </div>

              {/* Guidelines Note */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Guidelines for Aadhaar verification:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Both front and back images are strictly mandatory for biometric and address verification under banking guidelines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: BANK CHEQUE / PASSBOOK
              ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Step 3 of 4 • Payout Settlement Bank</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Upload Bank Cheque / Passbook Copy
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Upload a photo of your Cancelled Cheque or the first page of your Bank Passbook showing your Bank Name, Account Number, and IFSC Code.
                </p>
              </div>

              {renderUploadBox(
                'cheque_url',
                'Cancelled Cheque / Passbook First Page',
                'Showing Account Holder Name, Account Number, IFSC Code & Branch',
                'Settlement Bank',
                Building2
              )}

              {/* Guidelines Note */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Settlement Account Match Rule:</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your banking withdrawals and payout credits will be settled directly to this account. Ensure the name matches your PAN and registration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: FIRM / SHOP PHOTO (FINAL STEP BEFORE SUBMIT)
              ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Step 4 of 4 • Outlet Verification</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Upload Firm / Shop Photo with You
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Upload a clear photo or selfie of yourself standing in front of your shop, office or outlet showing your firm banner or counter.
                </p>
              </div>

              {renderUploadBox(
                'firm_selfie_url',
                'Firm / Shop Photo or Store Selfie',
                'Photo showing you in your business outlet / shop counter with banner',
                'Physical Store',
                Store
              )}

              {/* Summary Checklist of All 4 Steps */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                  Summary Verification Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isStep1Complete ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Step 1: PAN Card
                    </span>
                    <span className="font-extrabold">{isStep1Complete ? '✓ Attached' : 'Missing'}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isStep2Complete ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Step 2: Aadhaar (F & B)
                    </span>
                    <span className="font-extrabold">{isStep2Complete ? '✓ Attached' : 'Missing'}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isStep3Complete ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Step 3: Bank Cheque
                    </span>
                    <span className="font-extrabold">{isStep3Complete ? '✓ Attached' : 'Missing'}</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isStep4Complete ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" /> Step 4: Firm Photo
                    </span>
                    <span className="font-extrabold">{isStep4Complete ? '✓ Attached' : 'Missing'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. BOTTOM STEP NAVIGATION BUTTONS */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            {/* Back Button */}
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div /> // Spacer
            )}

            {/* Next or Final Submit Button */}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !isStep1Complete) {
                    setErrorMessage('Please upload your PAN card photo before proceeding.');
                    return;
                  }
                  if (currentStep === 2 && !isStep2Complete) {
                    setErrorMessage('Please upload both Front and Back sides of your Aadhaar card.');
                    return;
                  }
                  if (currentStep === 3 && !isStep3Complete) {
                    setErrorMessage('Please upload your Bank Cheque or Passbook copy before proceeding.');
                    return;
                  }
                  setErrorMessage(null);
                  setCurrentStep((prev) => (prev + 1) as any);
                }}
                disabled={
                  (currentStep === 1 && !isStep1Complete) ||
                  (currentStep === 2 && !isStep2Complete) ||
                  (currentStep === 3 && !isStep3Complete) ||
                  isCompressingAny
                }
                className={`px-7 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition shadow-md ${
                  (currentStep === 1 && isStep1Complete) ||
                  (currentStep === 2 && isStep2Complete) ||
                  (currentStep === 3 && isStep3Complete)
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white cursor-pointer shadow-indigo-500/25'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                }`}
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              /* Step 4 Final Submit Button */
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isAllComplete || loading || isCompressingAny}
                className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition shadow-lg ${
                  isAllComplete && !loading && !isCompressingAny
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-emerald-600/30 hover:scale-[1.01]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Submitting All Documents...</span>
                  </>
                ) : isCompressingAny ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Optimizing Images...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit KYC Verification</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </main>

      {/* 6. IMAGE PREVIEW MODAL */}
      {previewModalImg && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="text-sm font-bold text-slate-900">{previewModalImg.title}</h4>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-[70vh] flex items-center justify-center border border-slate-200">
              <img 
                src={previewModalImg.url} 
                alt={previewModalImg.title} 
                className="w-full h-auto max-h-[70vh] object-contain" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
