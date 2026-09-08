import type { InventoryItem } from './inventory';
import type { InvoiceReturn } from './invoice-return';

export const PaymentMethod = {
  CASH: 'cash',
  CREDIT: 'credit',
  CARD: 'card',
  BANK_DEPOSIT: 'bank_deposit',
  BANK_TRANSFER: 'bank_transfer',
  CHEQUE: 'cheque',
} as const;

export const PaymentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OUTSTANDING: 'outstanding',
  OVERDUE: 'overdue',
  DUE_SOON: 'due_soon',
  CANCELLED: 'cancelled',
} as const;

export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export const paymentMethodLabels: Record<PaymentMethodType, string> = {
  cash: 'Cash', credit: 'credit', card: 'Card', bank_deposit: 'Bank Deposit',
  bank_transfer: 'Bank Transfer', cheque: 'Cheque',
};

export const paymentStatusLabels: Record<PaymentStatusType, string> = {
  pending: 'pending', completed: 'completed', rejected: 'rejected',
  partially_paid: 'partially_paid', paid: 'paid', outstanding: 'outstanding',
  overdue: 'overdue', due_soon: 'due_soon', cancelled: 'cancelled',
};

export interface InvoicePaymentRecord {
  id?: string;
  transactionId?: string;
  amount: number;
  paidAt: string;
  paymentMethod: PaymentMethodType;
  reference?: string;
  bankName?: string;
  notes?: string;
}

export interface InvoiceCustomer {
  id: string;
  customerCode: string;
  shopName: string;
  fullName: string;
  contactPerson?: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  salesRepId?: string | null;
  salesRepName?: string;
}

export interface InvoiceItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  itemCode?: string;
  productCode?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  description?: string;
  costPrice?: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total_qty' | 'total';
  discountValue?: number;
  discountAmount?: number;
}

export interface InvoiceData {
  id?: string;
  documentTitle?: string;
  invoiceNumber: string;
  customer: string | InvoiceCustomer;
  customerDetails?: InvoiceCustomer | null;
  salesman?: { _id?: string; id?: string; fullName?: string; name?: string } | null;
  salesmanName?: string;
  items: InvoiceItem[];
  payments?: InvoicePaymentRecord[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  bankDepositDate?: string | null;
  issueDate: string;
  dueDate: string;
  vehicleNumber: string;
  notes?: string;
  sourceOrderId?: string | null;
  sourcePoId?: string | null;
  applyVat: boolean;
  vatAmount: number;
  taxRate: number;
  createdAt?: string;
  updatedAt?: string;
  discountPercentage?: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  creditPeriod?: number;
}

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  customerId?: string | null;
  customer: InvoiceCustomer | null;
  customerDetails?: InvoiceCustomer | null;
  salesmanId?: string | null;
  salesman?: { id: string; fullName?: string; name?: string; email?: string } | null;
  salesmanName?: string;
  items: InvoiceItem[];
  payments: InvoicePaymentRecord[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
  bankDepositDate?: string | null;
  issueDate: string;
  dueDate: string;
  vehicleNumber: string;
  notes?: string;
  sourceOrderId?: string | null;
  sourcePoId?: string | null;
  applyVat: boolean;
  vatAmount: number;
  taxRate: number;
  returns?: InvoiceReturn[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendInvoiceData {
  id?: string;
  invoiceNumber?: string;
  customerId?: string | null;
  customerDetails?: InvoiceCustomer;
  salesmanId?: string | null;
  salesmanName?: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
    discountType?: 'percentage' | 'amount';
    discountScope?: 'per_unit' | 'total_qty' | 'total';
    discountValue?: number;
    discountAmount?: number;
    total?: number;
  }>;
  payments?: InvoicePaymentRecord[];
  subTotal?: number;
  discount?: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: PaymentStatusType;
  paymentMethod?: PaymentMethodType;
  vehicleNumber?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  sourceOrderId?: string | null;
  sourcePoId?: string | null;
  bankDepositDate?: string;
  applyVat?: boolean;
  vatAmount?: number;
  taxRate?: number;
}

export interface SalesOverviewResponse {
  period: string;
  totalSales: number;
  totalProducts: number;
  weeklyData: Array<{ week: string; sales: number; products: number }>;
}

export function getInvoiceCalculatedStatus(invoice: {
  totalAmount: number; paidAmount?: number; paymentStatus?: string; dueDate?: string;
}) {
  const total = invoice.totalAmount || 0;
  let paid = invoice.paidAmount ?? (invoice.paymentStatus === 'completed' || invoice.paymentStatus === 'paid' ? total : 0);
  if (paid > total) paid = total;
  const remainingAmount = Math.max(0, total - paid);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = invoice.dueDate ? new Date(invoice.dueDate) : now; due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  let status: PaymentStatusType = 'outstanding';
  if (remainingAmount <= 0) status = 'paid';
  else if (diffDays < 0) status = 'overdue';
  else if (diffDays <= 7) status = 'due_soon';
  else if (paid > 0) status = 'partially_paid';
  return { status, paidAmount: paid, remainingAmount, diffDays };
}

/**
 * Extracts the trailing numeric sequence from an invoice number, ignoring any Sales Officer prefix.
 * e.g. "BIMI2024" -> 2024, "STAI2036" -> 2036
 */
export function extractInvoiceSequence(invoiceNumber?: string | null): number {
  if (!invoiceNumber) return -1;
  const match = String(invoiceNumber).trim().match(/(\d+)$/);
  if (match) {
    const val = parseInt(match[1], 10);
    return isNaN(val) ? -1 : val;
  }
  return -1;
}

/**
 * Sorts invoices strictly by numeric sequence in descending order (highest numeric sequence first).
 * If sequences are identical (e.g. BIMI2027 and STAI2027), the most recently created/entered invoice appears first.
 */
export function compareInvoicesBySequence(a: any, b: any): number {
  const seqA = extractInvoiceSequence(a?.invoiceNumber);
  const seqB = extractInvoiceSequence(b?.invoiceNumber);

  if (seqA !== seqB) {
    return seqB - seqA;
  }

  // Secondary tie-breaker: creation/entry timestamp (most recent first)
  const timeA = a?.createdAt
    ? new Date(a.createdAt).getTime()
    : a?.issueDate
      ? new Date(a.issueDate).getTime()
      : 0;
  const timeB = b?.createdAt
    ? new Date(b.createdAt).getTime()
    : b?.issueDate
      ? new Date(b.issueDate).getTime()
      : 0;

  return timeB - timeA;
}

