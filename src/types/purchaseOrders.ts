// ============= PO Status =============

export const POStatus = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  PARTIALLY_RECEIVED: 'Partially Received',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type POStatusType = typeof POStatus[keyof typeof POStatus];

// ============= PO Payment Status =============

export const POPaymentStatus = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PARTIAL: 'Partial',
} as const;

export type POPaymentStatusType = typeof POPaymentStatus[keyof typeof POPaymentStatus];

// ============= PO Item =============

export interface POItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;         // percentage
  tax: number;              // percentage
  subtotal: number;
  total: number;
  receivedQty?: number;
}

// ============= Purchase Order =============

export interface PurchaseOrder {
  id: string;
  poNumber: string;         // PO-YYYY-XXXXX
  referenceOrderId?: string; // ORD-XXXXX
  referenceOrderNum?: string;

  // Supplier
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  supplierPhone: string;
  supplierAddress: string;
  supplierCity: string;
  supplierEmail?: string;

  // Customer (from original order if converted)
  customerName?: string;

  // Created by (admin)
  createdById: string;
  createdByName: string;

  // Approved by
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;

  // Dates
  poDate: string;
  expectedDate: string;
  createdAt: string;
  updatedAt: string;

  // Items
  items: POItem[];
  numberOfItems: number;

  // Financials
  subTotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCharges: number;
  grandTotal: number;

  // Status
  status: POStatusType;
  paymentStatus: POPaymentStatusType;

  // Terms
  paymentTerms: string;
  deliveryTerms?: string;

  notes?: string;
}
