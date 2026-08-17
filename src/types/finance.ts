export interface PaymentMethodDetails {
  type: 'Cash' | 'Card' | 'Bank Deposit' | 'Bank Transfer' | 'Cheque' | 'Credit';
  bankName: string;
  accountNumber: string;
  transactionRef: string;
}

export interface InvoiceReference {
  invoiceId: string;
}

export interface FinanceTransaction {
  _id: string;
  transactionId: string;
  transactionDate: string;
  paymentMethod: PaymentMethodDetails;
  invoice: InvoiceReference;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface FinancePaymentData {
  transactionId: string;
  transactionDate: string;
  paymentMethod: PaymentMethodDetails;
  invoice: InvoiceReference;
  amount: string;
}