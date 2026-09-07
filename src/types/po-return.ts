import type { Supplier } from './suppliers';
import type { InventoryItem } from './inventory';

export const POReturnStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type POReturnStatus = typeof POReturnStatus[keyof typeof POReturnStatus];

export interface PurchaseOrderReturnItem {
  id: string;
  inventoryItemId?: string | null;
  inventoryItem?: InventoryItem;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderReturn {
  id: string;
  returnNumber: string;
  purchaseOrderId: string;
  purchaseOrder: {
    id: string;
    poNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  };
  supplierId: string;
  supplier: Supplier;
  items: PurchaseOrderReturnItem[];
  returnTotal: number;
  returnReason: string;
  remarks?: string;
  status: POReturnStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePOReturnDto {
  purchaseOrderId: string;
  items: Array<{
    inventoryItemId?: string | null;
    sku: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    total?: number;
  }>;
  returnReason: string;
  remarks?: string;
  returnTotal?: number;
  status?: POReturnStatus;
}
