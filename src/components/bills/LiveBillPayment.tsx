import React, { useState, useEffect, useRef } from 'react';
import { b2bApi, authApi, billRequestApi } from '../../services/api';
import type { 
  BillerCategory, Biller, BillerInputParam, CustomerParamItem, 
  FetchBillResponse, PayBillResponse 
} from '../../types/b2b';
import { 
  CreditCard, Search, ShieldCheck, CheckCircle2, Clock, AlertCircle, ArrowRight, 
  RefreshCw, FileText, Lock, ChevronDown, Calendar, Filter, RotateCcw, X, Printer
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';

const defaultCategoriesList: BillerCategory[] = [
  { category_id: 7, category_name: "Credit Card" }
];

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Safely extract the last 4 digits of the card number from the transaction item
 */
const getCardLast4 = (item: any): string => {
  if (!item) return '';

  if (item.card_last4) {
    const clean = String(item.card_last4).replace(/\D/g, '');
    if (clean.length >= 4) return clean.slice(-4);
    if (clean.length > 0) return clean;
    return String(item.card_last4).trim().slice(-4);
  }

  let params = item.customer_params || item.customerParams;
  if (typeof params === 'string') {
    try {
      params = JSON.parse(params);
    } catch {
      params = [];
    }
  }

  if (Array.isArray(params)) {
    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      if (name.includes('account') || name.includes('acc') || name.includes('num')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }

    for (const p of params) {
      if (!p) continue;
      const name = String(p.name || p.paramName || p.key || p.label || '').toLowerCase();
      const val = String(p.value ?? p.val ?? '').trim();
      if (!val || name.includes('mobile') || name.includes('phone') || name.includes('pan')) continue;

      const digits = val.replace(/\D/g, '');
      if (digits.length === 4) return digits;
      if (digits.length >= 12 && digits.length <= 19 && digits.length !== 10) {
        return digits.slice(-4);
      }
    }
  } else if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      const name = k.toLowerCase();
      const val = String(v ?? '').trim();
      if (!val) continue;

      if (name.includes('card') || name.includes('credit') || name.includes('last 4') || name.includes('last4') || name.includes('account')) {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 4) return digits.slice(-4);
        if (digits.length > 0) return digits;
        return val.slice(-4);
      }
    }
  }

  const addInfo = item.additional_info || item.additionalInfo || item.biller_response_info || item.billerResponseInfo;
  if (addInfo) {
    const str = typeof addInfo === 'string' ? addInfo : JSON.stringify(addInfo);
    const cardMatch = str.match(/card[^\d]*(\d{4})/i) || str.match(/account[^\d]*(\d{4})/i);
    if (cardMatch && cardMatch[1]) return cardMatch[1];
  }

  return '';
};

/**
 * Safely compute service charge according to official charge slabs
 */
const getServiceCharge = (item: any): number => {
  const charge = Number(item?.service_charge ?? item?.charge_amount ?? item?.charge ?? 0);
  if (charge > 0) return charge;
  const amt = Number(item?.amount || 0);
  if (amt <= 50000) return 25;
  if (amt <= 100000) return 50;
  if (amt <= 150000) return 75;
  return 100;
};

export const LiveBillPayment: React.FC = () => {
  const { user } = useAuthStore();
  const { liveBillPayEnabled, minWalletBalance } = useSettingsStore();

  // Category & Biller State (Credit Card Only - Fetched from Database)
  const [categories] = useState<BillerCategory[]>(defaultCategoriesList);
  const [billers, setBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [billerSearch, setBillerSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form State
  const [mobileNumber, setMobileNumber] = useState('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  
  // Step 1: Fetch State
  const [fetchingBill, setFetchingBill] = useState(false);
  const [fetchResult, setFetchResult] = useState<FetchBillResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedBiller, setFetchedBiller] = useState<Biller | null>(null);
  const [fetchedCardNumber, setFetchedCardNumber] = useState<string>('');

  // Step 2: Payment Modal & Exec State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [customerPan, setCustomerPan] = useState('');
  const [tpin, setTpin] = useState('');
  const [verifyingTpin, setVerifyingTpin] = useState(false);
  const [payingBill, setPayingBill] = useState(false);
  const [payResult, setPayResult] = useState<PayBillResponse | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Active Bill Charge Slabs State
  const [billSlabs, setBillSlabs] = useState<any[]>([]);

  const loadBillSlabs = async () => {
    try {
      const res = await billRequestApi.getSlabs();
      if (res && res.success && Array.isArray(res.slabs)) {
        setBillSlabs(res.slabs);
      }
    } catch (e) {
      console.warn('Failed to load bill charge slabs:', e);
    }
  };

  useEffect(() => {
    loadBillSlabs();
  }, []);

  const activeBillSlabs = billSlabs.filter((s: any) => s.is_active !== false);
  const minBillLimit = activeBillSlabs.length > 0 ? Math.min(...activeBillSlabs.map((s: any) => Number(s.min_amount))) : 1;
  const maxBillLimit = activeBillSlabs.length > 0 ? Math.max(...activeBillSlabs.map((s: any) => Number(s.max_amount))) : 200000;

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [historyDateFilter, setHistoryDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [historyCustomStartDate, setHistoryCustomStartDate] = useState('');
  const [historyCustomEndDate, setHistoryCustomEndDate] = useState('');

  const isAnyHistoryFilterActive = Boolean(
    historySearchQuery.trim() ||
    historyStatusFilter !== 'all' ||
    historyDateFilter !== 'ALL' ||
    historyCustomStartDate ||
    historyCustomEndDate
  );

  const handleClearHistoryFilters = () => {
    setHistorySearchQuery('');
    setHistoryStatusFilter('all');
    setHistoryDateFilter('ALL');
    setHistoryCustomStartDate('');
    setHistoryCustomEndDate('');
  };

  const filteredHistoryList = historyList.filter(item => {
    // 1. Date Filter
    if (historyDateFilter !== 'ALL') {
      if (!item.created_at) return false;
      const d = new Date(item.created_at);
      const t = d.getTime();
      if (isNaN(t)) return false;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      if (historyDateFilter === 'TODAY') {
        if (t < startOfToday || t > endOfToday) return false;
      } else if (historyDateFilter === 'YESTERDAY') {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        if (t < startOfYesterday || t > endOfYesterday) return false;
      } else if (historyDateFilter === 'LAST_7_DAYS') {
        const startOf7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
        if (t < startOf7Days || t > endOfToday) return false;
      } else if (historyDateFilter === 'LAST_30_DAYS') {
        const startOf30Days = startOfToday - 29 * 24 * 60 * 60 * 1000;
        if (t < startOf30Days || t > endOfToday) return false;
      } else if (historyDateFilter === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
        if (t < startOfMonth || t > endOfToday) return false;
      } else if (historyDateFilter === 'CUSTOM') {
        if (historyCustomStartDate) {
          const [sY, sM, sD] = historyCustomStartDate.split('-').map(Number);
          const startTime = new Date(sY, sM - 1, sD, 0, 0, 0, 0).getTime();
          if (t < startTime) return false;
        }
        if (historyCustomEndDate) {
          const [eY, eM, eD] = historyCustomEndDate.split('-').map(Number);
          const endTime = new Date(eY, eM - 1, eD, 23, 59, 59, 999).getTime();
          if (t > endTime) return false;
        }
      }
    }

    // 2. Status Filter
    const itemStatus = (item.status || '').toLowerCase();
    const isSuccess = itemStatus === 'success' || itemStatus === 'approved';
    const isPending = itemStatus === 'pending';
    const isFailed = itemStatus === 'failed' || itemStatus === 'rejected';

    if (historyStatusFilter === 'success' && !isSuccess) return false;
    if (historyStatusFilter === 'pending' && !isPending) return false;
    if (historyStatusFilter === 'failed' && !isFailed) return false;

    // 3. Search Query
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.trim().toLowerCase();
      const card4 = getCardLast4(item);
      const matchesSearch = 
        (item.biller_name || '').toLowerCase().includes(q) ||
        (item.biller_id || '').toLowerCase().includes(q) ||
        (item.customer_name || '').toLowerCase().includes(q) ||
        (item.customer_mobile || '').toLowerCase().includes(q) ||
        (item.client_transaction_id || '').toLowerCase().includes(q) ||
        (item.bbps_txn_ref_id || '').toLowerCase().includes(q) ||
        card4.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  const successCount = historyList.filter(i => (i.status || '').toLowerCase() === 'success' || (i.status || '').toLowerCase() === 'approved').length;
  const pendingCount = historyList.filter(i => (i.status || '').toLowerCase() === 'pending').length;
  const failedCount = historyList.filter(i => (i.status || '').toLowerCase() === 'failed' || (i.status || '').toLowerCase() === 'rejected').length;

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await b2bApi.getHistory();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (err) {
      console.warn('Error loading bill payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Synchronize Credit Card Billers directly from Database & Load History
  useEffect(() => {
    const loadCreditCardBillers = async () => {
      try {
        const billerRes = await b2bApi.getBillers({ category_id: 7 });
        if (billerRes && billerRes.status === 'success' && Array.isArray(billerRes.data) && billerRes.data.length > 0) {
          setBillers(billerRes.data);
          
          let sessionRestored = false;
          try {
            const saved = sessionStorage.getItem('live_cc_bill_session');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed.fetchResult && parsed.biller) {
                const foundBiller = billerRes.data.find((b: any) => b.biller_id === parsed.biller.biller_id) || parsed.biller;
                setSelectedBiller(foundBiller);
                setFetchedBiller(foundBiller);
                setFetchResult(parsed.fetchResult);
                if (parsed.cardNumber) setFetchedCardNumber(parsed.cardNumber);
                if (parsed.paramValues) setParamValues(parsed.paramValues);
                if (parsed.payAmount) setPayAmount(parsed.payAmount);
                sessionRestored = true;
              }
            }
          } catch (e) {
            console.warn('Session restore error:', e);
          }

          if (!sessionRestored) {
            setSelectedBiller(billerRes.data[0]);
          }
        }
      } catch (err) {
        console.warn('Error fetching Credit Card billers from database:', err);
      }
    };
    loadCreditCardBillers();
    loadHistory();
  }, []);

  const rawParams = selectedBiller?.metadata?.billerInputParams?.paramInfo;
  const currentInputParams: BillerInputParam[] = (Array.isArray(rawParams) && rawParams.length > 0)
    ? rawParams
    : [
        { paramName: "Last 4 digits of Credit Card Number", dataType: "NUMERIC", isOptional: "false", minLength: 4, maxLength: 4 },
        { paramName: "Registered Mobile Number", dataType: "NUMERIC", isOptional: "false", minLength: 10, maxLength: 10 }
      ];

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }));
  };

  // Step 1: Execute Fetch Bill
  const handleFetchBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiller) return;

    for (const param of currentInputParams) {
      if (param.isOptional === 'false' || param.isOptional === false) {
        if (!paramValues[param.paramName] || paramValues[param.paramName].trim() === '') {
          alert(`Please enter required parameter: ${param.paramName}`);
          return;
        }
      }
    }

    setFetchingBill(true);
    setFetchError(null);
    setFetchResult(null);

    const findMobileKey = Object.keys(paramValues).find(k => k.toLowerCase().includes('mobile'));
    const activeMobile = mobileNumber || (findMobileKey ? paramValues[findMobileKey] : '') || '9876543210';

    const formattedCustomerParams: CustomerParamItem[] = currentInputParams.map(p => ({
      name: p.paramName,
      value: paramValues[p.paramName] || ''
    }));

    try {
      const res = await b2bApi.fetchBill({
        billerId: selectedBiller.biller_id,
        mobile: activeMobile,
        customerParams: formattedCustomerParams
      });

      if (res && res.status === 'success' && res.data) {
        setFetchResult(res);
        setFetchedBiller(selectedBiller);

        const cardParam = currentInputParams.find(p => {
          const name = p.paramName.toLowerCase();
          return name.includes('card') || name.includes('last 4') || name.includes('digit');
        });
        const currentCard4 = cardParam && paramValues[cardParam.paramName]
          ? String(paramValues[cardParam.paramName]).replace(/\D/g, '').slice(-4)
          : '';
        setFetchedCardNumber(currentCard4);

        const rawData = res.data;
        const rawBillerInfo = rawData.billerResponseInfo || rawData.billerResponse || {};
        const fetchedAmt = parseFloat(rawBillerInfo.amount || rawBillerInfo.billAmount || rawData.amount || '0');
        const finalPayAmt = fetchedAmt > 0 ? fetchedAmt : 100;
        setPayAmount(finalPayAmt);

        try {
          sessionStorage.setItem('live_cc_bill_session', JSON.stringify({
            fetchResult: res,
            biller: selectedBiller,
            cardNumber: currentCard4,
            paramValues: paramValues,
            payAmount: finalPayAmt
          }));
        } catch (e) {
          console.warn('Could not save session:', e);
        }
      } else {
        const errorDetail = res?.data?.billFetchResponse?.errorInfo?.error?.errorMessage || res?.data?.billerResponseInfo?.errorInfo?.error?.errorMessage || res?.data?.billerResponse?.errorInfo?.error?.errorMessage || res?.message || 'Failed to fetch bill from BBPS network.';
        setFetchError(errorDetail);
      }
    } catch (err: any) {
      console.error('Fetch Bill Error:', err);
      setFetchError(err.response?.data?.message || 'Error communicating with BBPS Biller network.');
    } finally {
      setFetchingBill(false);
    }
  };

  // Charge Calculation & Wallet Check State
  const [chargeInfo, setChargeInfo] = useState<{
    serviceCharge: number;
    totalDeduction: number;
    walletBalance: number;
    hasSufficientBalance: boolean;
    valid?: boolean;
    message?: string;
    min_limit?: number;
    max_limit?: number;
  } | null>(null);

  const fetchChargeInfo = async (amt: number) => {
    if (amt <= 0) {
      setChargeInfo(null);
      return;
    }
    try {
      const res = await b2bApi.calculateCharge(amt);
      if (res && res.success) {
        const minReserve = minWalletBalance !== undefined ? minWalletBalance : 200;
        setChargeInfo({
          serviceCharge: res.serviceCharge,
          totalDeduction: res.totalDeduction,
          walletBalance: res.walletBalance,
          hasSufficientBalance: (res.walletBalance - res.totalDeduction >= minReserve),
          valid: true,
          min_limit: res.min_limit,
          max_limit: res.max_limit
        });
      } else {
        setChargeInfo({
          serviceCharge: 0,
          totalDeduction: 0,
          walletBalance: res?.walletBalance || 0,
          hasSufficientBalance: false,
          valid: false,
          message: res?.message || 'Amount is outside active slab range'
        });
      }
    } catch (err: any) {
      console.warn('Error calculating charge:', err);
      const errMsg = err.response?.data?.message || 'Amount is outside active charge slab limits.';
      setChargeInfo({
        serviceCharge: 0,
        totalDeduction: 0,
        walletBalance: 0,
        hasSufficientBalance: false,
        valid: false,
        message: errMsg
      });
    }
  };

  // Step 2: Open Payment Modal
  const openPayModal = () => {
    if (activeBillSlabs.length > 0) {
      if (payAmount < minBillLimit) {
        alert(`Bill amount ₹${payAmount.toLocaleString('en-IN')} cannot be less than minimum active slab limit of ₹${minBillLimit.toLocaleString('en-IN')}`);
        return;
      }
      if (payAmount > maxBillLimit) {
        alert(`Bill amount ₹${payAmount.toLocaleString('en-IN')} exceeds maximum active slab limit of ₹${maxBillLimit.toLocaleString('en-IN')}`);
        return;
      }
    }
    if (payAmount >= 50000) {
      const cleanPan = customerPan.trim().toUpperCase();
      if (!cleanPan) {
        alert('Please enter a valid 10-digit Customer PAN Card for payments of ₹50,000 or above.');
        return;
      }
      if (!PAN_REGEX.test(cleanPan)) {
        alert('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
        return;
      }
    }
    setPayResult(null);
    setPayError(null);
    setTpin('');
    fetchChargeInfo(payAmount);
    setShowPayModal(true);
  };

  // Execute Bill Payment
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiller || !fetchResult || !fetchResult.data) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (activeBillSlabs.length > 0) {
      if (payAmount < minBillLimit) {
        setPayError(`Bill amount ₹${payAmount.toLocaleString('en-IN')} cannot be less than minimum active slab limit of ₹${minBillLimit.toLocaleString('en-IN')}`);
        return;
      }
      if (payAmount > maxBillLimit) {
        setPayError(`Bill amount ₹${payAmount.toLocaleString('en-IN')} exceeds maximum active slab limit of ₹${maxBillLimit.toLocaleString('en-IN')}`);
        return;
      }
    }
    if (chargeInfo && chargeInfo.valid === false) {
      setPayError(chargeInfo.message || 'Amount is outside active slab range.');
      return;
    }
    const minReserve = minWalletBalance !== undefined ? minWalletBalance : 200;
    const availableBal = chargeInfo ? chargeInfo.walletBalance : Number(user?.wallet_balance || 0);
    const totalDed = chargeInfo ? chargeInfo.totalDeduction : payAmount;
    if (availableBal - totalDed < minReserve) {
      setPayError(
        `Insufficient Wallet Balance! A mandatory minimum reserve balance of ₹${minReserve.toFixed(2)} must be maintained in your wallet. Required: ₹${totalDed.toLocaleString('en-IN')} + ₹${minReserve.toFixed(2)} reserve = ₹${(totalDed + minReserve).toLocaleString('en-IN')}, Available: ₹${availableBal.toLocaleString('en-IN')}.`
      );
      return;
    }

    const cleanPan = customerPan.trim().toUpperCase();
    if (payAmount >= 50000) {
      if (!cleanPan) {
        setPayError('Customer PAN Card (10 digits) is required for payments of ₹50,000 or above.');
        return;
      }
      if (!PAN_REGEX.test(cleanPan)) {
        setPayError('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
        return;
      }
    } else if (cleanPan && !PAN_REGEX.test(cleanPan)) {
      setPayError('Invalid Customer PAN format! PAN must be 10 characters (5 letters, 4 numbers, 1 letter, e.g. ABCDE1234F).');
      return;
    }
    if (!tpin || tpin.length !== 4) {
      setPayError('Please enter your 4-digit TPIN to authorize bill payment.');
      return;
    }

    setPayingBill(true);
    setVerifyingTpin(true);
    setPayError(null);

    try {
      // 1. Authorize with 4-Digit TPIN
      const tpinRes = await authApi.verifyTpin(tpin);
      if (!tpinRes.success) {
        setPayError(tpinRes.message || 'Invalid 4-digit TPIN.');
        setPayingBill(false);
        setVerifyingTpin(false);
        return;
      }

      const formattedCustomerParams: CustomerParamItem[] = currentInputParams.map(p => ({
        name: p.paramName,
        value: paramValues[p.paramName] || ''
      }));

      const rawData: any = fetchResult.data || fetchResult;
      const rawBillerInfo = rawData.billerResponse || rawData.billerResponseInfo || undefined;

      let rawAddInfo: any = undefined;
      const bfrAdd = rawData.billFetchResponse?.additionalInfo;
      if (bfrAdd && ((Array.isArray(bfrAdd) && bfrAdd.length > 0) || (typeof bfrAdd === 'object' && Object.keys(bfrAdd).length > 0))) {
        rawAddInfo = bfrAdd;
      } else if (rawData.additionalInfo && ((Array.isArray(rawData.additionalInfo) && rawData.additionalInfo.length > 0) || (typeof rawData.additionalInfo === 'object' && Object.keys(rawData.additionalInfo).length > 0))) {
        rawAddInfo = rawData.additionalInfo;
      } else if (rawBillerInfo?.additionalInfo && ((Array.isArray(rawBillerInfo.additionalInfo) && rawBillerInfo.additionalInfo.length > 0) || (typeof rawBillerInfo.additionalInfo === 'object' && Object.keys(rawBillerInfo.additionalInfo).length > 0))) {
        rawAddInfo = rawBillerInfo.additionalInfo;
      } else {
        rawAddInfo = bfrAdd !== undefined ? bfrAdd : (rawData.additionalInfo !== undefined ? rawData.additionalInfo : undefined);
      }

      const activeMobile = mobileNumber || paramValues['Registered Mobile Number'] || paramValues['Mobile Number'] || paramValues['Customer Mobile'] || '9876543210';

      const payRes = await b2bApi.payBill({
        billerId: selectedBiller.biller_id,
        amount: payAmount,
        mobile: activeMobile,
        paymentMode: paymentMode,
        client_transaction_id: 'TXN_ORD_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000),
        fetchRequestId: rawData.requestId || rawData.fetchRequestId,
        customerParams: formattedCustomerParams,
        billerResponseInfo: rawBillerInfo,
        additionalInfo: rawAddInfo,
        customerPan: cleanPan || undefined
      });

      setPayResult(payRes);
      loadHistory();
      window.dispatchEvent(new Event('wallet_updated'));
    } catch (err: any) {
      console.error('Pay Bill Error:', err);
      setPayError(err.response?.data?.message || 'Payment failed. Please try again.');
      loadHistory();
      window.dispatchEvent(new Event('wallet_updated'));
    } finally {
      setPayingBill(false);
      setVerifyingTpin(false);
    }
  };

  const safeBillers = Array.isArray(billers) ? billers : [];
  const filteredBillers = safeBillers.filter(b => 
    b.is_active !== false && (
      (b.biller_name || '').toLowerCase().includes(billerSearch.toLowerCase()) ||
      (b.biller_id || '').toLowerCase().includes(billerSearch.toLowerCase())
    )
  );

  // Computed values for Credit Card Confirmation & Success Modal
  const modalCustomerName = 
    payResult?.customer_name || 
    payResult?.data?.customer_name || 
    (fetchResult?.data as any)?.billerResponse?.customerName || 
    (fetchResult?.data as any)?.billerResponseInfo?.customerName || 
    (fetchResult?.data as any)?.customerName || 
    paramValues['Customer Name'] || 
    'VALUED CARD HOLDER';

  const modalMobile = 
    payResult?.customer_mobile || 
    payResult?.data?.customer_mobile || 
    payResult?.mobile || 
    mobileNumber || 
    paramValues['Registered Mobile Number'] || 
    paramValues['Mobile Number'] || 
    paramValues['Customer Mobile'] || 
    (fetchResult?.data as any)?.billerResponse?.mobile || 
    '—';

  const modalCardLast4 = (() => {
    if (payResult?.card_last4) {
      const clean = String(payResult.card_last4).replace(/\D/g, '');
      if (clean.length >= 4) return clean.slice(-4);
      if (clean.length > 0) return clean;
    }
    if (payResult?.data?.card_last4) {
      const clean = String(payResult.data.card_last4).replace(/\D/g, '');
      if (clean.length >= 4) return clean.slice(-4);
      if (clean.length > 0) return clean;
    }
    for (const [key, val] of Object.entries(paramValues)) {
      const k = key.toLowerCase();
      if (k.includes('card') || k.includes('last 4') || k.includes('last4')) {
        const clean = String(val).replace(/\D/g, '');
        if (clean.length >= 4) return clean.slice(-4);
        if (clean.length > 0) return clean;
      }
    }
    const fromPay = getCardLast4(payResult) || getCardLast4(payResult?.data);
    if (fromPay) return fromPay;
    const fromFetch = getCardLast4(fetchResult?.data) || getCardLast4(fetchResult);
    if (fromFetch) return fromFetch;
    for (const [key, val] of Object.entries(paramValues)) {
      const clean = String(val).replace(/\D/g, '');
      if (clean.length === 4 && !key.toLowerCase().includes('mobile') && !key.toLowerCase().includes('pin')) {
        return clean;
      }
    }
    return '';
  })();

  const modalBillerName = 
    payResult?.biller_name || 
    payResult?.data?.biller_name || 
    selectedBiller?.biller_name || 
    selectedBiller?.biller_id || 
    'Credit Card Biller';

  const modalBillAmount = 
    Number(payResult?.amount || payResult?.data?.amount || payAmount || 0);

  const modalServiceCharge = 
    Number(payResult?.service_charge || chargeInfo?.serviceCharge || 0);

  const modalTxnId = 
    payResult?.transaction_id || 
    payResult?.data?.transaction_id || 
    payResult?.client_transaction_id || 
    '—';

  const modalBbpsRefId = 
    payResult?.bbps_txn_ref_id || 
    payResult?.data?.bbps_txn_ref_id || 
    null;

  const handlePrintReceipt = (overrideData?: any) => {
    const bName = overrideData?.biller_name || modalBillerName;
    const cName = overrideData?.customer_name || modalCustomerName;
    const cMob = overrideData?.customer_mobile || overrideData?.mobile || modalMobile;
    const cCard = overrideData ? (getCardLast4(overrideData) || modalCardLast4) : modalCardLast4;
    const bAmt = Number(overrideData?.amount ?? modalBillAmount);
    const sCharge = Number(overrideData?.service_charge ?? modalServiceCharge);
    const tId = overrideData?.client_transaction_id || overrideData?.transaction_id || overrideData?.id || modalTxnId;
    const bbpsId = overrideData?.bbps_txn_ref_id || modalBbpsRefId;
    const dateStr = overrideData?.created_at ? new Date(overrideData.created_at).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
    const statusStr = (overrideData?.status || payResult?.status || 'SUCCESS').toUpperCase();

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print receipt');
      return;
    }
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt_${tId}</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; padding: 12px; color: #000; font-size: 11px; }
          .text-center { text-align: center; }
          .border-b { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .flex-between { display: flex; justify-content: space-between; margin: 4px 0; }
          .font-bold { font-weight: bold; }
          .paid-stamp { border: 2px solid #000; padding: 6px; text-align: center; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="text-center border-b">
          <h2 style="margin: 0; font-size: 14px;">BBPS BILL PAYMENT RECEIPT</h2>
          <p style="margin: 2px 0; font-size: 10px;">CREDIT CARD BILL PAYMENT</p>
          <p style="margin: 2px 0; font-size: 9px;">${dateStr}</p>
        </div>
        <div class="paid-stamp">${statusStr} - BILL ${statusStr === 'SUCCESS' ? 'PAID' : statusStr}</div>
        <div class="border-b">
          <div class="flex-between"><span>Biller Bank:</span><span class="font-bold">${bName}</span></div>
          <div class="flex-between"><span>Customer Name:</span><span class="font-bold">${cName}</span></div>
          <div class="flex-between"><span>Mobile:</span><span class="font-bold">${cMob}</span></div>
          <div class="flex-between"><span>Card (Last 4):</span><span class="font-bold">•••• ${cCard || '----'}</span></div>
          <div class="flex-between"><span>Bill Amount:</span><span class="font-bold">₹${bAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          ${sCharge > 0 ? `<div class="flex-between"><span>Convenience Fee:</span><span>+₹${sCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
          ${sCharge > 0 ? `<div class="flex-between"><span>Total Deducted:</span><span class="font-bold">₹${(bAmt + sCharge).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>` : ''}
        </div>
        <div class="border-b">
          <div class="flex-between"><span>Txn ID:</span><span class="font-bold">${tId}</span></div>
          ${bbpsId ? `<div class="flex-between"><span>BBPS Ref ID:</span><span class="font-bold">${bbpsId}</span></div>` : ''}
          <div class="flex-between"><span>Status:</span><span class="font-bold">${statusStr}</span></div>
        </div>
        <div class="text-center" style="margin-top: 10px; font-size: 9px;">
          Computer generated payment receipt.<br/>Thank you for using our BBPS Service!
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (!liveBillPayEnabled) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Live Bill Pay Service Disabled</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Live Bill Payment service has been temporarily disabled by the administrator. 
            Access to this feature and route is currently restricted.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/users'}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Extract Card Last 4 digits specifically for the fetched bill or active card input
  const cardLastDigits = (() => {
    // 1. If we have a fetched bill, extract directly from the fetch response payload
    if (fetchResult) {
      const rawData: any = fetchResult.data || fetchResult;
      const inputList = rawData?.billFetchResponse?.inputParams?.input ||
                        rawData?.billFetchResponse?.inputParams ||
                        rawData?.inputParams?.input ||
                        rawData?.inputParams ||
                        (fetchResult as any)?.customerParams;
      if (Array.isArray(inputList)) {
        const cardItem = inputList.find((p: any) => {
          const name = String(p?.paramName || p?.name || '').toLowerCase();
          return name.includes('card') || name.includes('last 4') || name.includes('digit');
        });
        if (cardItem) {
          const clean = String(cardItem.paramValue || cardItem.value || '').replace(/\D/g, '');
          if (clean) return clean.slice(-4);
        }
      }

      if (fetchedCardNumber) return fetchedCardNumber;
    }

    // 2. Otherwise look at the CURRENT biller's card input param ONLY
    const cardParam = currentInputParams.find(p => {
      const name = p.paramName.toLowerCase();
      return name.includes('card') || name.includes('last 4') || name.includes('digit');
    });
    if (cardParam && paramValues[cardParam.paramName]) {
      const clean = String(paramValues[cardParam.paramName]).replace(/\D/g, '');
      if (clean) return clean.slice(-4);
    }

    return '';
  })();

  return (
    <div className="space-y-6 w-full max-w-[90%] mx-auto pb-16 animate-in fade-in duration-300">
      
      {/* OPTION 1: CLEAN MINIMALIST WHITE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700">
              Bharat Bill Payment System (BBPS)
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {filteredBillers.length > 0 ? `${filteredBillers.length} Indian Bank Billers Live` : '27 Indian Bank Billers Live'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
            Credit Card Bill Payment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Real-time direct bill fetch and instant settlement with upstream card issuer
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] shrink-0 self-start sm:self-auto">
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-sm">
            ₹
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</p>
            <p className="text-sm font-extrabold text-slate-900">
              ₹{Number(user?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

            {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: STEP 1 - BANK SELECTOR & DETAILS (7 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">1</span>
              <h2 className="text-base font-bold text-slate-900">Select Bank & Enter Card Details</h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">Step 1 of 2</span>
          </div>

          <div className="space-y-4">
            {/* Searchable Biller Bank Selector */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Credit Card Biller Bank <span className="text-rose-500">*</span>
              </label>

              {/* Bank Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {selectedBiller ? selectedBiller.biller_name.slice(0, 3).toUpperCase() : <CreditCard className="w-4 h-4 text-white" />}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {selectedBiller ? selectedBiller.biller_name : 'Choose Credit Card Bank...'}
                    </p>
                    {selectedBiller ? (
                      <p className="text-[10px] font-mono text-slate-400">Biller ID: {selectedBiller.biller_id}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Click to choose from {filteredBillers.length} banks</p>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>


              {/* Dropdown Menu Overlay */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 flex flex-col">
                  {/* Embedded Sticky Search Input */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 backdrop-blur-xs sticky top-0 z-10">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search bank name (e.g. HDFC, SBI, ICICI)..."
                        value={billerSearch}
                        onChange={(e) => setBillerSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 focus:border-slate-900 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                      {billerSearch && (
                        <button
                          type="button"
                          onClick={() => setBillerSearch('')}
                          className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtered Billers List */}
                  <div className="overflow-y-auto divide-y divide-slate-100 max-h-60">
                    {filteredBillers.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 text-center font-medium">
                        No credit card biller banks match "{billerSearch}"
                      </div>
                    ) : (
                      filteredBillers.map((biller) => {
                        const isSelected = selectedBiller?.biller_id === biller.biller_id;
                        return (
                          <button
                            key={biller.biller_id}
                            type="button"
                            onClick={() => {
                              if (selectedBiller?.biller_id !== biller.biller_id) {
                                setSelectedBiller(biller);
                                setParamValues({});
                                setFetchResult(null);
                                setFetchError(null);
                                setFetchedCardNumber('');
                                setFetchedBiller(null);
                                setPayAmount(0);
                                try {
                                  sessionStorage.removeItem('live_cc_bill_session');
                                } catch (e) {}
                              }
                              setIsDropdownOpen(false);
                              setBillerSearch('');
                            }}
                            className={`w-full p-3 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              isSelected ? 'bg-slate-100 text-slate-900 font-bold border-l-4 border-slate-900' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-slate-900' : 'bg-slate-300'}`} />
                              <span className="text-xs font-semibold text-slate-900 truncate">{biller.biller_name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 ml-2">
                              {biller.biller_id}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* DYNAMIC PARAMETER FORM */}
            {selectedBiller && (
              <form onSubmit={handleFetchBill} className="space-y-4 pt-1">
                {/* Inputs Stacked Vertically */}
                <div className="space-y-4">
                  {(Array.isArray(currentInputParams) ? currentInputParams : []).map((param) => {
                    const isCardParam = param.paramName.toLowerCase().includes('card') || param.paramName.toLowerCase().includes('digit');
                    const isMobileParam = param.paramName.toLowerCase().includes('mobile') || param.paramName.toLowerCase().includes('phone');
                    return (
                      <div key={param.paramName}>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          {param.paramName} {param.isOptional === 'true' || param.isOptional === true ? '(Optional)' : '*'}
                        </label>
                        <div className="relative flex items-center bg-white border border-slate-300 rounded-xl focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-100 transition">
                          <input
                            type="text"
                            inputMode={param.dataType === 'NUMERIC' ? 'numeric' : undefined}
                            required={param.isOptional === 'false' || param.isOptional === false}
                            minLength={param.minLength}
                            maxLength={param.maxLength}
                            placeholder={isCardParam ? 'e.g. 8730' : isMobileParam ? '10-digit mobile' : `Enter ${param.paramName}`}
                            value={paramValues[param.paramName] || ''}
                            onChange={(e) => {
                              const val = param.dataType === 'NUMERIC' ? e.target.value.replace(/\D/g, '') : e.target.value;
                              handleParamChange(param.paramName, val);
                            }}
                            className="w-full px-4 py-3.5 bg-transparent font-mono font-bold text-sm text-slate-900 focus:outline-none"
                          />
                          <span className="pr-3 text-slate-400 select-none">
                            {isCardParam ? '💳' : isMobileParam ? '📱' : '📝'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fetch Bill Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={fetchingBill}
                    className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${fetchingBill ? 'animate-spin' : 'text-slate-400'}`} />
                    <span>{fetchingBill ? 'Fetching Real-Time Card Bill Details...' : 'Fetch Credit Card Bill Details'}</span>
                    {!fetchingBill && <ArrowRight className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: STEP 2 - FETCHED BILL SUMMARY & PAY ACTION (5 COLS) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* FETCH ERROR NOTICE */}
          {fetchError && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Bill Fetch Notice</p>
                <p className="text-rose-700 leading-relaxed mt-0.5">{fetchError}</p>
              </div>
            </div>
          )}

          {/* FETCHED BILL SUMMARY CARD */}
          {fetchResult && fetchResult.data && fetchResult.data.billerResponse ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center">✓</span>
                  <h3 className="text-base font-bold text-slate-900">Fetched Card Details</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready for Payment
                </span>
              </div>

              {/* Virtual Card Header Badge */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Card Issuer</p>
                    <p className="text-sm font-extrabold text-white">{fetchedBiller?.biller_name || selectedBiller?.biller_name || 'Credit Card'}</p>
                  </div>
                  <div className="w-8 h-6 rounded bg-amber-400/80 border border-amber-300 shadow-inner"></div>
                </div>
                <div className="pt-1">
                  <p className="font-mono text-base font-bold tracking-widest text-slate-200">
                    •••• •••• •••• {cardLastDigits || '••••'}
                  </p>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Card Holder</p>
                    <p className="text-xs font-bold text-white uppercase tracking-wide">
                      {fetchResult.data.billerResponse.customerName || 'VALUED CARD HOLDER'}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-emerald-300 border border-white/10 font-bold">BBPS Active</span>
                </div>
              </div>

              {/* Due Date, Bill Date & Minimum Due Chips + 1-Row Action Form */}
              {(() => {
                const rawBillerResponse: any = fetchResult?.data?.billerResponse || (fetchResult?.data as any)?.billerResponseInfo || {};
                const rawData = fetchResult?.data as any;

                // Robust extraction of all additional info items from nested BBPS responses
                const extractInfoList = (): Array<{ infoName: string; infoValue: string }> => {
                  const candidates = [
                    rawData?.billFetchResponse?.additionalInfo?.info,
                    rawData?.additionalInfo?.info,
                    rawData?.additionalInfo,
                    rawData?.billFetchResponse?.additionalInfo,
                    rawBillerResponse?.additionalInfo?.info,
                    rawBillerResponse?.additionalInfo
                  ];
                  for (const cand of candidates) {
                    if (Array.isArray(cand) && cand.length > 0) {
                      return cand.map((item: any) => ({
                        infoName: String(item?.infoName || item?.name || item?.key || ''),
                        infoValue: String(item?.infoValue || item?.value || '')
                      })).filter(x => x.infoName && x.infoValue);
                    }
                  }
                  return [];
                };

                const additionalInfoItems = extractInfoList();

                // Extract Minimum Due Amount from API response
                let minDueVal = 0;
                let minDueRaw: string | null = null;
                const directCandidates = [
                  rawBillerResponse.minAmountDue,
                  rawBillerResponse.minimumAmountDue,
                  rawBillerResponse.minBillAmount,
                  rawBillerResponse.minAmount,
                  rawBillerResponse.minimumDue,
                  rawBillerResponse.min_amount_due,
                  rawData?.minAmountDue,
                  rawData?.minimumAmountDue,
                  rawData?.minBillAmount,
                  rawData?.minAmount,
                  rawData?.minimumDue,
                  rawData?.billFetchResponse?.billerResponse?.minAmountDue,
                  rawData?.billFetchResponse?.billerResponse?.minimumAmountDue
                ];
                for (const cand of directCandidates) {
                  if (cand !== undefined && cand !== null && String(cand).trim() !== '' && String(cand).trim() !== '0') {
                    minDueRaw = String(cand);
                    minDueVal = parseFloat(minDueRaw.replace(/[^0-9.]/g, '')) || 0;
                    if (minDueVal > 0) break;
                  }
                }

                // If not found directly, search in additional info items (like BBPS additionalInfo.info)
                if (minDueVal <= 0) {
                  for (const item of additionalInfoItems) {
                    const name = item.infoName.toLowerCase();
                    if (name.includes('min') && (name.includes('due') || name.includes('amt') || name.includes('amount'))) {
                      const parsed = parseFloat(item.infoValue.replace(/[^0-9.]/g, '')) || 0;
                      if (parsed > 0) {
                        minDueVal = parsed;
                        minDueRaw = item.infoValue;
                        break;
                      }
                    }
                  }
                }

                const totalBillAmt = parseFloat(rawBillerResponse.amount || rawBillerResponse.billAmount || rawData?.amount || '0') || 0;
                const showPanField = payAmount >= 50000 || (customerPan && customerPan.length > 0);

                // Filter out minimum amount due from additional info display to avoid duplicate
                const displayAdditionalInfo = additionalInfoItems.filter(item => {
                  const name = item.infoName.toLowerCase();
                  if (minDueVal > 0 && name.includes('min') && (name.includes('due') || name.includes('amt') || name.includes('amount'))) {
                    return false;
                  }
                  return true;
                });

                return (
                  <>
                    {/* Due Date, Bill Date & (if available) Minimum Due Chips */}
                    <div className={`grid grid-cols-1 ${minDueVal > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Due Date</p>
                        <p className="text-xs font-bold text-rose-600 mt-0.5">{rawBillerResponse.dueDate || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Bill Date</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{rawBillerResponse.billDate || 'N/A'}</p>
                      </div>
                      {minDueVal > 0 && (
                        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-amber-700 uppercase">Minimum Due</p>
                            <button
                              type="button"
                              onClick={() => setPayAmount(minDueVal)}
                              className="text-[9px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                              title="Click to set payment amount to Minimum Due"
                            >
                              Pay Min
                            </button>
                          </div>
                          <p className="text-xs font-extrabold text-amber-900 mt-0.5 font-mono">
                            ₹{Number(minDueVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ADDITIONAL INFO ITEMS */}
                    {displayAdditionalInfo.length > 0 && (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 animate-in fade-in">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Additional Biller Information</p>
                        {displayAdditionalInfo.map((info, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                            <span>{info.infoName}:</span>
                            <span className="font-bold text-slate-900 font-mono">
                              {info.infoValue.startsWith('₹') ? info.infoValue : (isNaN(Number(info.infoValue)) ? info.infoValue : `₹${info.infoValue}`)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 1-ROW ACTION FORM: CUSTOMER PAN + PAYMENT AMOUNT + PROCEED TO PAY BUTTON */}
                    <div className={`grid grid-cols-1 ${showPanField ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3 items-end pt-1`}>
                      
                      {/* 1. Customer PAN Card (Required for >= 50,000) */}
                      {showPanField && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center h-4">
                            <label className="text-xs font-bold text-slate-700 truncate">
                              Customer PAN Card {payAmount >= 50000 ? <span className="text-rose-500">*</span> : <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>}
                            </label>
                            <span className="text-[10px] font-bold text-rose-500 shrink-0">
                              {payAmount >= 50000 ? 'Required for ≥ ₹50K' : 'Optional'}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              maxLength={10}
                              required={payAmount >= 50000}
                              placeholder="e.g. ABCDE1234F"
                              value={customerPan}
                              onChange={(e) => setCustomerPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                              className={`w-full h-12 bg-white border rounded-xl px-3 font-mono font-bold text-xs uppercase text-slate-900 focus:outline-none transition ${
                                customerPan.length === 10
                                  ? PAN_REGEX.test(customerPan)
                                    ? 'border-emerald-500 focus:border-emerald-600 ring-1 ring-emerald-500/20'
                                    : 'border-rose-500 focus:border-rose-600 ring-1 ring-rose-500/20'
                                  : 'border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-100'
                              }`}
                            />
                            {customerPan.length === 10 && (
                              <div className="absolute right-2 top-3.5 flex items-center gap-1 text-[10px] font-bold">
                                {PAN_REGEX.test(customerPan) ? (
                                  <span className="text-emerald-600 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                                  </span>
                                ) : (
                                  <span className="text-rose-600 flex items-center gap-0.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Invalid
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 2. Payment Amount (Editable) */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center h-4">
                          <p className="text-xs font-bold text-slate-700 truncate">
                            Payment Amount <span className="text-[10px] font-normal text-slate-400">(Editable)</span>
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 truncate ml-1">
                            Fetched Total Due: <strong className="text-slate-900">₹{totalBillAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          </span>
                        </div>

                        <div className="relative flex items-center h-12 bg-white border border-slate-300 rounded-xl focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-100 transition">
                          <span className="pl-3.5 text-sm font-bold text-slate-900">₹</span>
                          <input
                            type="number"
                            min={minBillLimit}
                            max={maxBillLimit}
                            step="0.01"
                            required
                            value={payAmount || ''}
                            onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                            placeholder={`Amount (${minBillLimit} - ${maxBillLimit})`}
                            className="w-full px-2.5 font-bold text-base text-slate-900 bg-transparent focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 3. Proceed to Pay Button */}
                      <div className="space-y-1.5">
                        <div className="flex justify-end items-center h-4">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Slab: ₹{minBillLimit.toLocaleString('en-IN')} - ₹{maxBillLimit.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={openPayModal}
                          disabled={payAmount <= 0 || (activeBillSlabs.length > 0 && (payAmount < minBillLimit || payAmount > maxBillLimit))}
                          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <span className="truncate">Proceed to Pay (₹{payAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          <ArrowRight className="w-4 h-4 text-white shrink-0" />
                        </button>
                      </div>

                    </div>

                    {/* Slab limit alert message */}
                    {payAmount > 0 && activeBillSlabs.length > 0 && (payAmount < minBillLimit || payAmount > maxBillLimit) && (
                      <p className="text-[11px] text-rose-600 font-bold mt-1">
                        ⚠️ Amount must be between ₹{minBillLimit.toLocaleString('en-IN')} and ₹{maxBillLimit.toLocaleString('en-IN')} as per active slabs.
                      </p>
                    )}
                  </>
                );
              })()}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <CreditCard className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">No Active Card Bill Session</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
                  Select your Credit Card Bank on the left and enter your card details to fetch real-time bill details directly from BBPS.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2 flex-wrap text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Instant BBPS Fetch</span>
                <span>•</span>
                <span>Real-time Settlement</span>
                <span>•</span>
                <span>100% Encrypted</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* RECENT CREDIT CARD BILL PAYMENTS HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Credit Card Bill Payment History
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                  {filteredHistoryList.length}{filteredHistoryList.length !== historyList.length ? ` / ${historyList.length}` : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time record of all initiated and completed BBPS credit card payments</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAnyHistoryFilterActive && (
              <button
                type="button"
                onClick={handleClearHistoryFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 border border-rose-200 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}

            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER CONTROLS */}
        <div className="flex flex-wrap items-center gap-2.5 pb-2">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Biller / Customer / Mobile / Txn ID..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-xs">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={historyDateFilter}
              onChange={(e) => setHistoryDateFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer pr-2 font-medium"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Inputs */}
          {historyDateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-[11px] text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={historyCustomStartDate}
                onChange={(e) => setHistoryCustomStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none font-mono"
              />
              <span className="text-[11px] text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={historyCustomEndDate}
                onChange={(e) => setHistoryCustomEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none font-mono"
              />
            </div>
          )}

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-xs">
            <select
              value={historyStatusFilter}
              onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All Records ({historyList.length})</option>
              <option value="success">Success ({successCount})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="failed">Failed ({failedCount})</option>
            </select>
          </div>
        </div>

        {filteredHistoryList.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Biller Bank</th>
                  <th className="p-3.5">Card (Last 4)</th>
                  <th className="p-3.5">Customer Name & Mobile</th>
                  <th className="p-3.5">Bill Amount (₹)</th>
                  <th className="p-3.5">Charge (₹)</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Transaction Ref IDs</th>
                  <th className="p-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredHistoryList.map((item, idx) => {
                  const cardLast4 = getCardLast4(item);
                  return (
                    <tr key={item.client_transaction_id || item.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-slate-500 font-sans whitespace-nowrap">
                        {new Date(item.created_at || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 font-sans">{item.biller_name || item.biller_id}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{item.biller_id}</span>
                      </td>
                      <td className="p-3.5 font-sans whitespace-nowrap">
                        {cardLast4 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs font-bold tracking-wider">
                            <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            •••• {cardLast4}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">•••• ----</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <p className="font-bold text-slate-900">{item.customer_name || 'VALUED CARD HOLDER'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.customer_mobile || item.mobile}</p>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 text-xs font-mono">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-bold text-slate-600 text-xs font-mono">
                        +₹{getServiceCharge(item).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.payment_mode || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {item.status === 'success' || item.status === 'approved' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Success
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        <p className="text-slate-800 font-bold">{item.client_transaction_id || item.id}</p>
                        {item.bbps_txn_ref_id && (
                          <p className="text-emerald-600 text-[10px]">BBPS: {item.bbps_txn_ref_id}</p>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-[11px] font-bold transition shadow-xs cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No credit card bill payment history recorded yet.
          </div>
        )}
      </div>

      {/* STEP 2: BILL PAYMENT MODAL WITH MPIN SECURITY (CLEAN WHITE THEME) */}
      {showPayModal && fetchResult && fetchResult.data && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Confirm Credit Card Payment</h3>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* PAY RESULT DISPLAY IF FINISHED */}
            {payResult ? (
              <div className="space-y-4">
                {payResult.status === 'success' || payResult.payment_status === 'success' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3.5">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Credit Card Bill Paid!</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">{payResult.message || 'Bill Paid successfully'}</p>
                    </div>

                    {/* ENRICHED TRANSACTION DETAILS CARD */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 shadow-xs">
                      {/* Biller Bank */}
                      <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-100">
                        <span className="text-slate-500 font-sans">Biller Bank:</span>
                        <span className="text-slate-900 font-extrabold font-sans text-right truncate max-w-[210px]">
                          {modalBillerName}
                        </span>
                      </div>

                      {/* Customer Name */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Name:</span>
                        <span className="text-slate-900 font-bold font-sans text-right truncate max-w-[210px]">
                          {modalCustomerName}
                        </span>
                      </div>

                      {/* Customer Mobile */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Mobile:</span>
                        <span className="text-slate-800 font-bold font-mono">{modalMobile}</span>
                      </div>

                      {/* Card (Last 4) */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Card (Last 4):</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs font-bold tracking-wider">
                          <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          •••• {modalCardLast4 || '----'}
                        </span>
                      </div>

                      {/* Bill Amount */}
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-sans font-medium">Bill Amount:</span>
                        <span className="text-emerald-600 font-black text-sm font-mono">
                          ₹{modalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Convenience Fee (if any) */}
                      {modalServiceCharge > 0 && (
                        <div className="flex justify-between items-center gap-2 text-[11px]">
                          <span className="text-slate-500 font-sans">Convenience Fee:</span>
                          <span className="text-slate-700 font-bold font-mono">
                            +₹{modalServiceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Txn ID */}
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-500 font-sans">Txn ID:</span>
                        <span className="text-slate-900 font-bold truncate max-w-[210px]">{modalTxnId}</span>
                      </div>

                      {/* BBPS Ref ID */}
                      {modalBbpsRefId && (
                        <div className="flex justify-between items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-500 font-sans">BBPS Ref ID:</span>
                          <span className="text-emerald-600 font-bold">{modalBbpsRefId}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt()}
                        className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Print Receipt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPayModal(false);
                          setPayResult(null);
                          setFetchResult(null);
                        }}
                        className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition cursor-pointer"
                      >
                        Done & Close
                      </button>
                    </div>
                  </div>
                ) : payResult.status === 'pending' || payResult.payment_status === 'pending' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-3.5">
                    <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                      <Clock className="w-9 h-9" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Payment Processing (Pending)</h4>
                      <p className="text-xs text-amber-700 mt-0.5">{payResult.message || 'Processing at biller bank network.'}</p>
                    </div>

                    {/* ENRICHED TRANSACTION DETAILS CARD */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 shadow-xs">
                      <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-100">
                        <span className="text-slate-500 font-sans">Biller Bank:</span>
                        <span className="text-slate-900 font-extrabold font-sans text-right truncate max-w-[210px]">{modalBillerName}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Name:</span>
                        <span className="text-slate-900 font-bold font-sans text-right truncate max-w-[210px]">{modalCustomerName}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Mobile:</span>
                        <span className="text-slate-800 font-bold font-mono">{modalMobile}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Card (Last 4):</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs font-bold tracking-wider">
                          <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          •••• {modalCardLast4 || '----'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-sans font-medium">Bill Amount:</span>
                        <span className="text-amber-600 font-black text-sm font-mono">₹{modalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-500 font-sans">Txn ID:</span>
                        <span className="text-slate-900 font-bold truncate max-w-[210px]">{modalTxnId}</span>
                      </div>
                      {modalBbpsRefId && (
                        <div className="flex justify-between items-center gap-2 font-mono text-[11px]">
                          <span className="text-slate-500 font-sans">BBPS Ref ID:</span>
                          <span className="text-emerald-600 font-bold">{modalBbpsRefId}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPayModal(false);
                        setPayResult(null);
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Close & Check History
                    </button>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-3.5">
                    <div className="w-14 h-14 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600 shadow-sm">
                      <AlertCircle className="w-9 h-9" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900">Payment Failed</h4>
                      <p className="text-xs text-rose-700 mt-0.5">{payResult.message || 'Payment was declined or failed.'}</p>
                    </div>

                    {/* ENRICHED TRANSACTION DETAILS CARD */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 shadow-xs">
                      <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-100">
                        <span className="text-slate-500 font-sans">Biller Bank:</span>
                        <span className="text-slate-900 font-extrabold font-sans text-right truncate max-w-[210px]">{modalBillerName}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Name:</span>
                        <span className="text-slate-900 font-bold font-sans text-right truncate max-w-[210px]">{modalCustomerName}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Customer Mobile:</span>
                        <span className="text-slate-800 font-bold font-mono">{modalMobile}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500 font-sans">Card (Last 4):</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs font-bold tracking-wider">
                          <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          •••• {modalCardLast4 || '----'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-sans font-medium">Attempted Amount:</span>
                        <span className="text-rose-600 font-black text-sm font-mono">₹{modalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setPayResult(null)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleExecutePayment} className="space-y-4">
                
                {payError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {payError}
                  </div>
                )}

                {/* CARD & CUSTOMER SUMMARY BEFORE PAYMENT */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-2 pb-2 border-b border-slate-200/80">
                    <span className="text-slate-500">Biller Bank:</span>
                    <span className="text-slate-900 font-extrabold text-right truncate max-w-[210px]">{modalBillerName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Customer Name:</span>
                    <span className="text-slate-900 font-bold text-right truncate max-w-[210px]">{modalCustomerName}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Customer Mobile:</span>
                    <span className="text-slate-800 font-mono font-bold">{modalMobile}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-500">Card (Last 4):</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-mono text-xs font-bold tracking-wider">
                      <CreditCard className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      •••• {modalCardLast4 || '----'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pay Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPayAmount(val);
                      fetchChargeInfo(val);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* SLAB CHARGE & WALLET DEDUCTION BREAKDOWN */}
                {chargeInfo && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    {chargeInfo.valid === false ? (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                        ⚠️ {chargeInfo.message || 'Amount is outside the active slab limits.'}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-500">
                          <span>Bill Amount:</span>
                          <span className="text-slate-900 font-bold font-mono">₹{payAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Slab Convenience Charge:</span>
                          <span className="text-slate-700 font-bold font-mono">+₹{chargeInfo.serviceCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-slate-900">
                          <span>Total Wallet Deduction:</span>
                          <span className="text-emerald-600 font-mono">₹{chargeInfo.totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-[11px] pt-1 text-slate-500">
                          <span>Available Wallet Balance:</span>
                          <span className={`font-mono font-bold ${chargeInfo.hasSufficientBalance ? 'text-slate-800' : 'text-rose-600'}`}>
                            ₹{chargeInfo.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-amber-600 font-medium">
                          <span>Mandatory Reserve Balance:</span>
                          <span className="font-mono font-bold">₹{(minWalletBalance !== undefined ? minWalletBalance : 200).toFixed(2)}</span>
                        </div>
                        {!chargeInfo.hasSufficientBalance && (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold text-center">
                            ⚠️ Insufficient Wallet Balance! A mandatory minimum balance of ₹{(minWalletBalance !== undefined ? minWalletBalance : 200).toFixed(2)} must remain in your wallet.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* CUSTOMER PAN CARD INPUT (FOR >= 50,000) */}
                {payAmount >= 50000 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer PAN Card <span className="text-rose-500">*</span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        required
                        placeholder="e.g. ABCDE1234F"
                        value={customerPan}
                        onChange={(e) => setCustomerPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                        className={`w-full bg-white border rounded-xl p-3 text-sm font-mono tracking-widest text-slate-900 focus:outline-none transition ${
                          customerPan.length === 10
                            ? PAN_REGEX.test(customerPan)
                              ? 'border-emerald-500 focus:border-emerald-600'
                              : 'border-rose-500 focus:border-rose-600'
                            : 'border-slate-300 focus:border-slate-900'
                        }`}
                      />
                      {customerPan.length === 10 && (
                        <div className="absolute right-3 top-3.5 flex items-center gap-1 text-[11px] font-bold">
                          {PAN_REGEX.test(customerPan) ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Valid PAN
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" /> Invalid PAN
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4-Digit TPIN Input / Prompt */}
                {!user?.tpin_set ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800">4-Digit TPIN Required</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        You have not created your 4-digit Transaction PIN yet. Create it now to authorize Live Bill Pay.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPayModal(false);
                        window.history.pushState(null, '', '/manage-tpin');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Go to TPIN Page to Create TPIN
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enter 4-Digit TPIN <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="••••"
                      value={tpin}
                      onChange={(e) => setTpin(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-base text-center font-mono tracking-widest text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      Enter your secret 4-digit transaction PIN to authorize payment
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!user?.tpin_set || payingBill || verifyingTpin || tpin.length !== 4 || (chargeInfo ? (!chargeInfo.hasSufficientBalance || chargeInfo.valid === false) : false)}
                    className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShieldCheck className={`w-4 h-4 ${payingBill || verifyingTpin ? 'animate-spin' : ''}`} />
                    <span>{payingBill || verifyingTpin ? 'Verifying & Paying...' : 'Confirm & Pay Bill'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
