import type { PaymentMethodType } from './invoice';

export interface FinanceTransaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType: 'payment' | 'refund';
  paymentMethod: PaymentMethodType;
  bankName?: string;
  accountNumber?: string;
  transactionRef?: string;
  invoiceId?: string | null;
  invoiceNumber: string;
  invoice?: { id: string; invoiceNumber: string } | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export type FinancePaymentData = Omit<FinanceTransaction, 'id' | 'invoice' | 'createdAt' | 'updatedAt'> & {
  transactionNumber?: string;
};
