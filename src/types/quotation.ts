import type { InventoryItem } from './inventory';
import type { InvoiceCustomer, PaymentMethodType } from './invoice';

export const QuotationStatus = {
  PENDING: 'pending', ACCEPTED: 'accepted', REJECTED: 'rejected', EXPIRED: 'expired',
} as const;
export type QuotationStatusType = typeof QuotationStatus[keyof typeof QuotationStatus];
export type QuotationCustomer = InvoiceCustomer;

export interface QuotationItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  unitPrice: number;
  total: number;
  itemName?: string;
  productCode?: string;
  description?: string;
  costPrice?: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total_qty';
  discountValue?: number;
  discountAmount?: number;
}

export interface BackendQuotationData {
  quotationNumber?: string;
  customerId: string;
  items: Array<{ inventoryItemId: string; quantity: number; unitPrice?: number; total?: number }>;
  subTotal?: number;
  discount?: number;
  totalAmount?: number;
  paymentMethod: PaymentMethodType;
  issueDate?: string;
  validUntil?: string;
  status?: QuotationStatusType;
  notes?: string;
}

export interface QuotationResponse {
  id: string;
  quotationNumber: string;
  customerId: string;
  customer: QuotationCustomer;
  items: QuotationItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  issueDate: string;
  validUntil: string;
  status: QuotationStatusType;
  notes?: string;
  salesman?: { id: string; fullName: string; name?: string; email?: string; role?: string };
  salesmanName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationData {
  id?: string;
  quotationNumber: string;
  customer: string;
  customerDetails?: QuotationCustomer;
  salesman?: { id: string; fullName: string; name?: string; email?: string; role?: string };
  salesmanName?: string;
  items: QuotationItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  issueDate: string;
  validUntil: string;
  status: QuotationStatusType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  discountPercentage?: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  creditPeriod?: number;
}
