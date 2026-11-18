export type PosSettlementType = 'T0' | 'T1';
export type PosDebitWalletType = 'main' | 'pos';

export interface PosMachine {
  id: string;
  machine_name: string;
  terminal_id: string;
  serial_number?: string;
  model?: string;
  bank_name?: string;
  default_t0_charge_percent: number;
  default_t1_charge_percent: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PosPaymentRequest {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  user_mobile?: string;
  pos_machine_id?: string;
  machine_name?: string;
  settlement_type: PosSettlementType;
  amount: number;
  charge_percent: number;
  charge_amount: number;
  net_amount: number;
  rrn_number: string;
  approval_code?: string;
  card_last4?: string;
  card_network?: string;
  slip_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'settled' | 'reverted';
  rejection_reason?: string;
  processed_by?: string;
  processed_at?: string;
  settled_at?: string;
  admin_commission: number;
  distributor_commission?: number;
  super_distributor_commission?: number;
  created_at: string;
  updated_at?: string;
}

export interface PosWalletLedger {
  id: string;
  user_id: string;
  user_name?: string;
  firm_name?: string;
  user_mobile?: string;
  type: 'CREDIT' | 'DEBIT';
  wallet_type: 'T0' | 'T1';
  category: 'POS_SWIPE_LOAD' | 'T1_SETTLEMENT_CREDIT' | 'PAYOUT_DEBIT' | 'LIVE_BILL_DEBIT' | 'CC_BILL_DEBIT' | 'REFUND_CREDIT' | 'MANUAL_ADJUST';
  amount: number;
  charge_amount: number;
  opening_balance: number;
  closing_balance: number;
  reference_id?: string;
  description?: string;
  created_at: string;
}

export interface PosSummaryStats {
  totalVolume: number;
  totalRequests: number;
  pendingCount: number;
  pendingVolume: number;
  approvedCount: number;
  approvedVolume: number;
  totalAdminProfit: number;
  t0Volume: number;
  t1Volume: number;
}
