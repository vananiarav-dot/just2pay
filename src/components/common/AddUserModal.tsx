import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Camera, User, Mail, Phone, MapPin, 
  Building2, Shield, AlertCircle, CheckCircle2, Loader2,
  Copy, Check, Eye, EyeOff, Key
} from 'lucide-react';
import { userApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { UserProfile, UserRole } from '../../types/auth';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: () => void;
  distributors?: UserProfile[];
  allUsers?: UserProfile[];
  userToEdit?: UserProfile | null;
  defaultRole?: UserRole;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onUserAdded,
  distributors = [],
  allUsers = [],
  userToEdit = null,
  defaultRole = 'user'
}) => {
  const { user: currentUser } = useAuthStore();

  const targetDefaultRole = currentUser?.role === 'super_distributor'
    ? 'distributor'
    : currentUser?.role === 'distributor'
    ? 'user'
    : defaultRole;

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  
  const [homeAddress, setHomeAddress] = useState('');
  const [firmName, setFirmName] = useState('');
  const [firmAddress, setFirmAddress] = useState('');

  const [role, setRole] = useState<UserRole>(targetDefaultRole);
  const [assignedDistributorId, setAssignedDistributorId] = useState<string>('');
  const [qrChargePercent, setQrChargePercent] = useState<string>('');

  const parentOptions = React.useMemo(() => {
    const usersList = allUsers.length > 0 ? allUsers : distributors;
    if (role === 'distributor') {
      return {
        label: 'ASSIGN TO MASTER DISTRIBUTOR (PARENT MS)',
        subtext: 'CHOOSE WHICH SUPER DISTRIBUTOR (MS) WILL MANAGE THIS DISTRIBUTOR.',
        list: usersList.filter(u => u.role === 'super_distributor')
      };
    }
    if (role === 'user') {
      return {
        label: 'ASSIGN TO DISTRIBUTOR (PARENT DS)',
        subtext: 'CHOOSE WHICH DISTRIBUTOR (DS) WILL MANAGE THIS RETAILER.',
        list: usersList.filter(u => u.role === 'distributor')
      };
    }
    return null;
  }, [allUsers, distributors, role]);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createdCredentials, setCreatedCredentials] = useState<{
    user: UserProfile;
    generatedPassword: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        const parts = (userToEdit.name || '').trim().split(/\s+/);
        setFirstName(userToEdit.first_name || parts[0] || '');
        setMiddleName(userToEdit.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''));
        setLastName(userToEdit.last_name || (parts.length > 1 ? parts[parts.length - 1] : ''));
        setEmail(userToEdit.email || '');
        setMobileNumber(userToEdit.mobile_number || '');
        const hAddr = userToEdit.home_address || (userToEdit as any).address || '';
        const fAddr = userToEdit.firm_address || (userToEdit as any).business_address || '';
        setHomeAddress(hAddr);
        setFirmName(userToEdit.firm_name || '');
        setFirmAddress(fAddr);
        setRole(userToEdit.role || targetDefaultRole);
        setAssignedDistributorId(userToEdit.distributor_id || '');
        const chargeVal = userToEdit.qr_charge_percent !== undefined && userToEdit.qr_charge_percent !== null
          ? userToEdit.qr_charge_percent 
          : (userToEdit.charge_percentage !== undefined && userToEdit.charge_percentage !== null ? userToEdit.charge_percentage : '');
        setQrChargePercent(chargeVal !== '' ? String(chargeVal) : '');
        setPhotoPreview(userToEdit.profile_photo_url || null);
      } else {
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setEmail('');
        setMobileNumber('');
        setHomeAddress('');
        setFirmName('');
        setFirmAddress('');
        setRole(targetDefaultRole);
        setAssignedDistributorId('');
        setQrChargePercent('');
        setPhotoPreview(null);
      }
      setErrorMessage(null);
      setSuccessMessage(null);
      setCreatedCredentials(null);
      setShowCreatedPassword(false);
      setCopiedCredentials(false);
    }
  }, [isOpen, userToEdit, targetDefaultRole]);

  if (!isOpen) return null;

  if (createdCredentials) {
    const handleCopy = () => {
      const shareText = `🎉 *AsEasySwipe Account Credentials*\n\n` +
        `👤 *Name:* ${createdCredentials.user.name}\n` +
        `📱 *User ID / Mobile:* ${createdCredentials.user.mobile_number}\n` +
        `🔑 *Temporary Password:* ${createdCredentials.generatedPassword}\n` +
        `🏷️ *Role:* ${createdCredentials.user.role === 'super_distributor' ? 'Super Distributor' : createdCredentials.user.role === 'distributor' ? 'Distributor' : 'Retailer'}\n\n` +
        `🔐 *Note:* Mandatory password change required on first login.\n` +
        `🌐 *Portal:* ${window.location.origin}`;
      
      navigator.clipboard.writeText(shareText);
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2500);
    };

    const handleFinish = () => {
      setCreatedCredentials(null);
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-100/40 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">User Account Created!</h3>
            <p className="text-xs text-slate-500">
              Copy the credentials below and send them to the user. First-time login will require a password change.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 uppercase font-sans text-[10px] font-bold">Account Name</span>
              <span className="text-slate-900 font-sans font-bold text-sm">{createdCredentials.user.name}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 uppercase font-sans text-[10px] font-bold">User ID / Mobile</span>
              <span className="text-indigo-600 font-bold text-sm">{createdCredentials.user.mobile_number}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 uppercase font-sans text-[10px] font-bold">Account Role</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-sans text-xs font-bold uppercase border border-purple-200">
                {createdCredentials.user.role === 'super_distributor' ? 'Super Distributor' : createdCredentials.user.role === 'distributor' ? 'Distributor' : 'Retailer'}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-slate-500 uppercase font-sans text-[10px] font-bold block mb-1.5 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Generated 8-Digit Password</span>
              </span>
              <div className="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-4 py-2.5">
                <span className="text-emerald-700 font-mono font-bold text-base tracking-wider">
                  {showCreatedPassword ? createdCredentials.generatedPassword : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title={showCreatedPassword ? 'Hide password' : 'Show password'}
                >
                  {showCreatedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                copiedCredentials 
                  ? 'bg-emerald-600 text-white shadow-emerald-200' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-indigo-200'
              }`}
            >
              {copiedCredentials ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Credentials Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Credentials (ID & Password)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }

    if (!mobileNumber.trim() || mobileNumber.trim().length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!firmName.trim()) {
      setErrorMessage('Firm Name is required.');
      return;
    }

    setLoading(true);

    try {
      const parsedCharge = qrChargePercent.trim() !== '' ? parseFloat(qrChargePercent) : 0;
      const finalCharge = isNaN(parsedCharge) ? 0 : parsedCharge;
      const payload = {
        firstName,
        middleName,
        lastName,
        name: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
        email,
        mobile_number: mobileNumber,
        firm_name: firmName,
        home_address: homeAddress,
        firm_address: firmAddress,
        role,
        target_distributor_id: assignedDistributorId || null,
        qr_charge_percent: finalCharge,
        charge_percentage: finalCharge,
        profile_photo_url: photoPreview || ''
      };

      if (userToEdit) {
        const res = await userApi.updateUser(userToEdit.id, payload);
        if (res.success) {
          userToEdit.qr_charge_percent = finalCharge;
          userToEdit.charge_percentage = finalCharge;
          userToEdit.home_address = homeAddress;
          userToEdit.firm_address = firmAddress;
          userToEdit.firm_name = firmName;
          userToEdit.name = payload.name;
          userToEdit.email = email;
          userToEdit.mobile_number = mobileNumber;
          userToEdit.role = role;
          setSuccessMessage(res.message || 'User updated successfully!');
          if (onUserAdded) onUserAdded();
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setErrorMessage(res.message || 'Operation failed.');
        }
      } else {
        const res = await userApi.createSubuser(payload);
        if (res.success) {
          if (res.generatedPassword && res.user) {
            setCreatedCredentials({
              user: res.user,
              generatedPassword: res.generatedPassword
            });
            if (onUserAdded) onUserAdded();
          } else {
            setSuccessMessage(res.message || 'User registered successfully!');
            if (onUserAdded) onUserAdded();
            setTimeout(() => {
              onClose();
            }, 1500);
          }
        } else {
          setErrorMessage(res.message || 'Operation failed.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Error occurred while saving user details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* HEADER BAR */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-white/95 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition border border-slate-200 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {userToEdit ? 'Edit User Profile' : 'Add New User'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userToEdit 
                  ? 'Update details for this user account.' 
                  : 'Fill in the details below to register a new user in the system.'}
              </p>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT CARD: PHOTO & PERSONAL DETAILS */}
            <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
              
              {/* UPLOAD PHOTO CONTAINER */}
              <div className="flex flex-col items-center justify-center pt-2 pb-1">
                <label className="relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-slate-300 group-hover:border-purple-600 bg-white flex flex-col items-center justify-center transition shadow-xs overflow-hidden relative">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 group-hover:scale-110 transition">
                          <Camera className="w-5 h-5 text-slate-500 group-hover:text-purple-600" />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-500 group-hover:text-purple-600 tracking-wider">
                          UPLOAD PHOTO
                        </span>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* FIRST NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  FIRST NAME <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER FIRST NAME"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                </div>
              </div>

              {/* MIDDLE NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  MIDDLE NAME <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER MIDDLE NAME"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                </div>
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  LAST NAME <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="ENTER LAST NAME"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                </div>
              </div>

              {/* EMAIL ADDRESS */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  EMAIL ADDRESS <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                </div>
              </div>

              {/* MOBILE NUMBER */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  MOBILE NUMBER (10 DIGITS) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="1234567890"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: BUSINESS & ROLE DETAILS */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* CARD 1: ADDRESS & BUSINESS DETAILS */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-wide">Address & Business Details</h3>
                </div>

                {/* HOME ADDRESS */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    HOME ADDRESS <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required={!userToEdit}
                    placeholder="ENTER COMPLETE HOME ADDRESS"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition resize-none"
                  />
                </div>

                {/* FIRM NAME */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    FIRM NAME <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="ENTER FIRM NAME"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                    />
                  </div>
                </div>

                {/* FIRM ADDRESS */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    FIRM ADDRESS <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required={!userToEdit}
                    placeholder="ENTER FIRM ADDRESS"
                    value={firmAddress}
                    onChange={(e) => setFirmAddress(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition resize-none"
                  />
                </div>
              </div>

              {/* CARD 2: ROLE & ACCOUNT SETTINGS */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-wide">Role & Account Settings</h3>
                </div>

                {/* SELECT ROLE */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    SELECT ROLE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Shield className="w-4 h-4 text-slate-400" />
                    </div>
                    <select
                      value={role}
                      disabled={currentUser?.role === 'super_distributor' || currentUser?.role === 'distributor'}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition appearance-none cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                      {currentUser?.role === 'super_distributor' ? (
                        <option value="distributor">Distributor</option>
                      ) : currentUser?.role === 'distributor' ? (
                        <option value="user">Retailer</option>
                      ) : (
                        <>
                          <option value="user">Retailer</option>
                          <option value="distributor">Distributor</option>
                          <option value="super_distributor">Super Distributor</option>
                          <option value="admin">Admin</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* DYNAMIC PARENT ASSIGNMENT - SHOWN FOR ADMIN */}
                {currentUser?.role === 'admin' && parentOptions && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                      {parentOptions.label}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <select
                        value={assignedDistributorId}
                        onChange={(e) => setAssignedDistributorId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition appearance-none cursor-pointer"
                      >
                        <option value="">NONE (DIRECT UNDER ADMIN HQ)</option>
                        {parentOptions.list.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.firm_name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium uppercase tracking-tight">
                      {parentOptions.subtext}
                    </p>
                  </div>
                )}

                {/* DYNAMIC QR CHARGE (%) */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    {role === 'distributor' 
                      ? 'DS QR CHARGE (%)' 
                      : role === 'super_distributor'
                      ? 'MS QR CHARGE (%)'
                      : 'RETAILER QR CHARGE (%)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={qrChargePercent}
                      onChange={(e) => setQrChargePercent(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                      %
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-medium uppercase tracking-tight">
                    {role === 'distributor' 
                      ? 'SET QR RATE SLAB FOR THIS DISTRIBUTOR. PROFIT MARGIN IS CALCULATED FROM THIS RATE.' 
                      : role === 'super_distributor'
                      ? 'SET QR RATE SLAB FOR THIS MASTER DISTRIBUTOR.'
                      : 'PERCENTAGE CHARGE DEDUCTED FROM THIS RETAILER\'S PAYMENTS UPON APPROVAL.'}
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{userToEdit ? 'Saving Changes...' : 'Registering User...'}</span>
                </>
              ) : (
                <span>{userToEdit ? 'Save / Update User' : 'Submit / Register User'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
