import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  playEventSound, 
  getStoredSoundSettings, 
  type AdminSoundEventType 
} from '../utils/soundNotification';

export interface AdminToastAlert {
  id: string;
  type: AdminSoundEventType;
  title: string;
  amount?: number;
  subtitle?: string;
  targetTab: string;
  createdAt: number;
}

export const useAdminSoundAlerts = (
  isAdmin: boolean,
  onNavigateTab?: (tab: string) => void
) => {
  const [toasts, setToasts] = useState<AdminToastAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadTimeRef = useRef<number>(Date.now());
  const prevCountsRef = useRef<{ [key: string]: number }>({});

  // Trigger alert helper with deduplication
  const triggerAlert = useCallback((
    type: AdminSoundEventType, 
    recordId: string, 
    info: { title: string; amount?: number; subtitle?: string; targetTab: string }
  ) => {
    if (!isAdmin) return;
    
    // Prevent duplicate alerts for the same record
    if (recordId && seenIdsRef.current.has(recordId)) {
      return;
    }
    if (recordId) {
      seenIdsRef.current.add(recordId);
      // Keep set size reasonable
      if (seenIdsRef.current.size > 2000) {
        const arr = Array.from(seenIdsRef.current).slice(-1000);
        seenIdsRef.current = new Set(arr);
      }
    }

    // Play event sound
    playEventSound(type);

    // Show on-screen toast if enabled
    const settings = getStoredSoundSettings();
    if (settings.showToasts) {
      const newToast: AdminToastAlert = {
        id: recordId || `${type}_${Date.now()}_${Math.random()}`,
        type,
        title: info.title,
        amount: info.amount,
        subtitle: info.subtitle,
        targetTab: info.targetTab,
        createdAt: Date.now()
      };

      setToasts(prev => [newToast, ...prev.slice(0, 4)]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 6000);
    }
  }, [isAdmin]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleToastClick = useCallback((toast: AdminToastAlert) => {
    dismissToast(toast.id);
    if (onNavigateTab && toast.targetTab) {
      onNavigateTab(toast.targetTab);
    }
  }, [dismissToast, onNavigateTab]);

  // Real-time Supabase Table listener for live INSERTs
  useEffect(() => {
    if (!isAdmin) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel('admin_live_sound_alerts')
        // 1. QR Payment Requests
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'qr_payment_requests' },
          (payload: any) => {
            const row = payload.new || {};
            triggerAlert('qr', row.id, {
              title: 'New QR Payment Request',
              amount: Number(row.amount) || undefined,
              subtitle: row.user_name || row.mobile_number ? `${row.user_name || ''} (${row.mobile_number || ''})`.trim() : 'Retailer QR Load',
              targetTab: 'qr_requests'
            });
          }
        )
        // 2. CC Bill Requests
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'credit_card_bill_requests' },
          (payload: any) => {
            const row = payload.new || {};
            triggerAlert('cc_bill', row.id, {
              title: 'New CC Bill Request',
              amount: Number(row.amount) || undefined,
              subtitle: row.customer_name ? `${row.customer_name} • ${row.bank_name || 'Card'}` : 'Offline Bill Submission',
              targetTab: 'admin_bill_requests'
            });
          }
        )
        // 3. Bank Payout Transfers
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payout_transactions' },
          (payload: any) => {
            const row = payload.new || {};
            triggerAlert('payout', row.id, {
              title: 'New Bank Payout Transfer',
              amount: Number(row.amount) || undefined,
              subtitle: row.beneficiary_name ? `To: ${row.beneficiary_name}` : 'Instant IMPS Payout',
              targetTab: 'admin_payout'
            });
          }
        )
        // 4. Live BBPS Bill Payments
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bbps_bill_payments' },
          (payload: any) => {
            const row = payload.new || {};
            triggerAlert('live_bill', row.id, {
              title: 'New Live BBPS Bill Payment',
              amount: Number(row.amount) || undefined,
              subtitle: row.biller_name ? `${row.biller_name}` : 'BBPS Live Bill Payment',
              targetTab: 'live_bill_history'
            });
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime sound channel subscription error:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdmin, triggerAlert]);

  // Hook into badge counts changes for fallback polling trigger
  const checkBadgeCountIncrease = useCallback((newCounts: { [key: string]: number }) => {
    if (!isAdmin) return;
    const prev = prevCountsRef.current;

    // Only alert if we have seen previous counts (not on very first fetch)
    if (Object.keys(prev).length > 0) {
      // 1. Check QR count increase
      if ((newCounts.qr_requests || 0) > (prev.qr_requests || 0)) {
        triggerAlert('qr', `poll_qr_${Date.now()}`, {
          title: 'New QR Payment Request',
          subtitle: `${newCounts.qr_requests} pending in queue`,
          targetTab: 'qr_requests'
        });
      }
      // 2. Check CC Bill count increase
      if ((newCounts.admin_bill_requests || 0) > (prev.admin_bill_requests || 0)) {
        triggerAlert('cc_bill', `poll_cc_${Date.now()}`, {
          title: 'New CC Bill Request',
          subtitle: `${newCounts.admin_bill_requests} pending in queue`,
          targetTab: 'admin_bill_requests'
        });
      }
      // 3. Check Payout count increase
      if ((newCounts.admin_payout || 0) > (prev.admin_payout || 0)) {
        triggerAlert('payout', `poll_payout_${Date.now()}`, {
          title: 'New Bank Payout Transfer',
          subtitle: `${newCounts.admin_payout} pending in queue`,
          targetTab: 'admin_payout'
        });
      }
    }

    prevCountsRef.current = { ...newCounts };
  }, [isAdmin, triggerAlert]);

  return {
    toasts,
    dismissToast,
    handleToastClick,
    checkBadgeCountIncrease
  };
};
