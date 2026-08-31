import type { InvoiceResponse, InvoiceCustomer } from './invoice';
import type { InventoryItem } from './inventory';

export const ReturnStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type ReturnStatus = typeof ReturnStatus[keyof typeof ReturnStatus];

export interface InvoiceReturnItem {
  item: string | InventoryItem;
  quantity: number;
  unitPrice: number;
  total: number;
  _id?: string;
}

export interface InvoiceReturn {
  _id: string;
  returnId: string;
  invoice: string | InvoiceResponse;
  customer: string | InvoiceCustomer;
  items: InvoiceReturnItem[];
  returnTotal: number;
  returnReason: string;
  remarks?: string;
  status: ReturnStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceReturnDto {
  invoice: string;
  items: {
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  returnReason: string;
  remarks?: string;
  returnTotal: number;
}
