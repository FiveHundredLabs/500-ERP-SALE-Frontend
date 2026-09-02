export const OrderStatus = {
  PENDING: 'pending', REVIEWING: 'reviewing', APPROVED: 'approved', REJECTED: 'rejected',
  CONVERTED_TO_PO: 'converted_to_po', CONVERTED_TO_INVOICE: 'converted_to_invoice', COMPLETED: 'completed', CANCELLED: 'cancelled',
} as const;
export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderPaymentStatus = { UNPAID: 'unpaid', PAID: 'paid', PARTIAL: 'partial' } as const;
export type OrderPaymentStatusType = typeof OrderPaymentStatus[keyof typeof OrderPaymentStatus];

export interface OrderProduct {
  id: string;
  inventoryItemId?: string | null;
  sku: string;
  productName: string;
  category?: string;
  brand?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total_qty' | 'total';
  discountValue?: number;
  discountAmount?: number;
  tax: number;
  subTotal: number;
  total: number;
}

export interface Salesman { id: string; fullName: string; email?: string; employeeId?: string; area?: string; phone?: string; }
export interface OrderTimelineEvent { id: string; event: string; description?: string; occurredAt: string; actor?: string; }

export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
  salesmanId?: string | null;
  salesman?: Salesman | null;
  salesmanName?: string | null;
  salesmanEmployeeId?: string | null;
  salesmanPhone?: string | null;
  salesmanArea?: string | null;
  salesmanEmail?: string | null;
  customerId: string;
  customerName: string;
  contactPerson: string;
  contactPhone: string;
  customerAddress?: string;
  customerCity?: string;
  items: OrderProduct[];
  numberOfProducts: number;
  subTotal: number;
  totalDiscount: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  totalTax: number;
  grandTotal: number;
  status: OrderStatusType;
  paymentStatus: OrderPaymentStatusType;
  convertedPurchaseOrder?: { id: string; poNumber: string } | null;
  timeline: OrderTimelineEvent[];
  notes?: string;
}

export interface UpdateOrderStatusDto { status: OrderStatusType; notes?: string; }
