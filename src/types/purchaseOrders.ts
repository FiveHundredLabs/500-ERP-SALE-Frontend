export const POStatus = {
  DRAFT: 'draft', PENDING_APPROVAL: 'pending_approval', APPROVED: 'approved', PROCESSING: 'processing',
  PARTIALLY_RECEIVED: 'partially_received', COMPLETED: 'completed', CANCELLED: 'cancelled',
} as const;
export type POStatusType = typeof POStatus[keyof typeof POStatus];
export const POPaymentStatus = { UNPAID: 'unpaid', PAID: 'paid', PARTIAL: 'partial' } as const;
export type POPaymentStatusType = typeof POPaymentStatus[keyof typeof POPaymentStatus];

export interface POItem {
  id: string;
  inventoryItemId?: string | null;
  sku: string;
  productName: string;
  category?: string;
  brand?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  discount: number;
  tax: number;
  subTotal: number;
  totalPrice: number;
  remark?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  sourceOrderId?: string | null;
  sourceOrder?: { id: string; orderNumber: string } | null;
  sourceOrderNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  supplierPhone: string;
  supplierAddress?: string;
  supplierCity?: string;
  supplierEmail?: string;
  customerName?: string;
  createdById?: string | null;
  createdByName: string;
  approvedById?: string | null;
  approvedByName?: string;
  approvedAt?: string | null;
  poDate: string;
  expectedDeliveryDate: string;
  createdAt: string;
  updatedAt: string;
  items: POItem[];
  totalItems: number;
  subTotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  totalDiscount: number;
  totalTax: number;
  shippingCharges: number;
  totalAmount: number;
  status: POStatusType;
  paymentStatus: POPaymentStatusType;
  paymentTerms: string;
  deliveryTerms?: string;
  notes?: string;
}
