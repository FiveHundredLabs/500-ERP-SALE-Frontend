import type { InvoiceCustomer, PaymentMethodType, PaymentStatusType } from './invoice';
import type { InventoryItem } from './inventory';

export const ReturnStatus = {
  PENDING: 'pending', APPROVED: 'approved', COMPLETED: 'completed', CANCELLED: 'cancelled',
} as const;
export type ReturnStatus = typeof ReturnStatus[keyof typeof ReturnStatus];

export interface InvoiceReturnItem {
  id: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceReturn {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    paymentStatus: PaymentStatusType;
    paymentMethod: PaymentMethodType;
  };
  customerId: string;
  customer: InvoiceCustomer;
  items: InvoiceReturnItem[];
  returnTotal: number;
  returnReason: string;
  remarks?: string;
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceReturnDto {
  invoiceId: string;
  items: Array<{ inventoryItemId: string; quantity: number; unitPrice?: number; total?: number }>;
  returnReason: string;
  remarks?: string;
  returnTotal?: number;
}
