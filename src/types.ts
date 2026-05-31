import { Timestamp } from 'firebase/firestore';

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash_paid' | 'cash_pending' | 'installments';

export interface Adjustment {
  id: string;
  description: string;
  amount: number;
  type: 'discount' | 'addition';
}

export interface Transaction {
  id: string;
  uid: string;
  amount: number;
  deduction: number; // Legacy field, will be replaced by adjustments
  adjustments?: Adjustment[];
  type: TransactionType;
  category: string;
  date: Timestamp;
  description?: string;
  paymentMethod: PaymentMethod;
  installmentsCount?: number;
  installmentNumber?: number;
  status: 'paid' | 'pending';
  createdAt?: Timestamp;
  isLoan?: boolean;
  loanType?: 'borrowed' | 'lent';
  loanPartner?: string;
}

export interface Category {
  id: string;
  uid: string;
  name: string;
  icon?: string;
  color?: string;
  type: TransactionType;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  createdAt?: Timestamp;
}
