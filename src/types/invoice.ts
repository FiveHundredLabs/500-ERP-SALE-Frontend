export const PaymentMethod = {
  CASH: 'Cash',
  CREDIT: 'Credit',
  CARD: 'Card',
  BANK_DEPOSIT: 'Bank Deposit',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
} as const;

export const PaymentStatus = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OUTSTANDING: 'Outstanding',
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due Soon',
} as const;

export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus] | 'Pending' | 'Completed' | 'Rejected' | 'Partially Paid' | 'Paid' | 'Outstanding' | 'Overdue' | 'Due Soon';

export interface InvoicePaymentRecord {
  id?: string;
  transactionId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  reference?: string;
  bankName?: string;
  notes?: string;
}

export interface InvoiceCustomer {
  _id: string;
  shopName?: string;
  fullName: string;
  contactPerson?: string;
  phone: string;              // WhatsApp (Primary)
  phone2?: string;            // Secondary
  phone3?: string;            // Alternative
  address?: string | {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  city?: string;
  customerCode?: string;
  creditLimit?: number;
  salesRep?: { id: string; name: string } | string;
  salesRepName?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  year_of_manufacture?: number;
}

export interface InvoiceItem {
  id: string;
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemName?: string;
  description?: string;
  product_code?: string;
  costPrice?: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total_qty';
  discountValue?: number;
  discountAmount?: number;
}

export interface InvoiceItemBackend {
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
  _id?: string;
}

export interface InvoiceData {
  _id?: string;
  invoiceId: string;
  customer: string;
  customerDetails?: InvoiceCustomer;
  salesman?: { _id: string; name: string } | null;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  discountPercentage: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: InvoicePaymentRecord[];
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  creditPeriod?: number;
  bankDepositDate?: string;
  issueDate: string;
  dueDate: string;
  vehicleNumber: string;
  notes?: string;
  applyVat: boolean;
  vatAmount: number;
  taxRate: number;
  created_at?: string;
  updated_at?: string;
}

export interface BackendInvoiceData {
  invoiceId: string;
  customer: string;
  salesman?: string | null;
  items: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subTotal: number;
  discount: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: InvoicePaymentRecord[];
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  vehicleNumber: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  bankDepositDate?: string;
  applyVat?: boolean;
  vatAmount?: number;
  taxRate?: number;
  _id?: string;
}

export interface InvoiceResponse {
  _id: string;
  invoiceId: string;
  customer: InvoiceCustomer;
  items: Array<{
    item: any;
    quantity: number;
    unitPrice: number;
    total: number;
    _id?: string;
  }>;
  subTotal: number;
  discount: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  payments?: InvoicePaymentRecord[];
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  salesman?: { _id: string; name: string } | string | null;
  salesmanName?: string;
  bankDepositDate?: string;
  issueDate: string;
  dueDate: string;
  vehicleNumber: string;
  notes?: string;
  applyVat?: boolean;
  vatAmount?: number;
  taxRate?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SalesOverviewResponse {
  period: string;
  totalSales: number;
  totalProducts: number;
  weeklyData: Array<{
    week: string;
    sales: number;
    products: number;
  }>;
}

/**
 * Calculates effective invoice status based on due date, paid amount, and total amount.
 */
export function getInvoiceCalculatedStatus(invoice: {
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: string;
  dueDate?: string;
}): {
  status: 'Paid' | 'Partially Paid' | 'Outstanding' | 'Overdue' | 'Due Soon';
  paidAmount: number;
  remainingAmount: number;
  diffDays: number;
} {
  const total = invoice.totalAmount || 0;
  let paid = invoice.paidAmount ?? (invoice.paymentStatus === 'Completed' ? total : 0);
  if (paid > total) paid = total;
  const remaining = Math.max(0, total - paid);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let diffDays = 0;
  if (invoice.dueDate) {
    const due = new Date(invoice.dueDate);
    due.setHours(0, 0, 0, 0);
    diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (remaining <= 0 || paid >= total || invoice.paymentStatus === 'Completed' || invoice.paymentStatus === 'Paid') {
    return { status: 'Paid', paidAmount: total, remainingAmount: 0, diffDays };
  }

  if (paid > 0) {
    if (diffDays < 0) return { status: 'Overdue', paidAmount: paid, remainingAmount: remaining, diffDays };
    if (diffDays <= 7) return { status: 'Due Soon', paidAmount: paid, remainingAmount: remaining, diffDays };
    return { status: 'Partially Paid', paidAmount: paid, remainingAmount: remaining, diffDays };
  }

  if (diffDays < 0) {
    return { status: 'Overdue', paidAmount: 0, remainingAmount: remaining, diffDays };
  }
  if (diffDays <= 7) {
    return { status: 'Due Soon', paidAmount: 0, remainingAmount: remaining, diffDays };
  }

  return { status: 'Outstanding', paidAmount: 0, remainingAmount: remaining, diffDays };
}