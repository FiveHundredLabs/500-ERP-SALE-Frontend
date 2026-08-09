// ============= Order Status =============

export const OrderStatus = {
  PENDING: 'Pending',
  REVIEWING: 'Reviewing',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CONVERTED_TO_PO: 'Converted to PO',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// ============= Payment Status =============

export const OrderPaymentStatus = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PARTIAL: 'Partial',
} as const;

export type OrderPaymentStatusType = typeof OrderPaymentStatus[keyof typeof OrderPaymentStatus];

// ============= Order Product =============

export interface OrderProduct {
  id: string;
  sku: string;
  productName: string;
  category: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;         // percentage
  tax: number;              // percentage
  subtotal: number;
  total: number;
}

// ============= Salesman =============

export interface Salesman {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  area: string;             // Assigned territory
  email?: string;
}

// ============= Order =============

export interface Order {
  id: string;
  orderId: string;          // ORD-XXXXX
  orderDate: string;        // ISO date
  createdAt: string;        // ISO datetime
  updatedAt: string;

  // Salesman
  salesman: Salesman;

  // Customer
  customerId: string;
  customerName: string;     // Shop / Business name
  contactPerson: string;
  contactPhone: string;
  customerAddress: string;
  customerCity: string;

  // Products
  products: OrderProduct[];
  numberOfProducts: number;

  // Financials
  subTotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;

  // Status
  status: OrderStatusType;
  paymentStatus: OrderPaymentStatusType;

  // References
  convertedPOId?: string;   // PO Number if converted

  // Timeline events
  timeline: OrderTimelineEvent[];

  notes?: string;
}

// ============= Timeline =============

export interface OrderTimelineEvent {
  id: string;
  event: string;
  description?: string;
  timestamp: string;        // ISO datetime
  actor?: string;           // Who performed this action
}

// ============= DTOs =============

export interface UpdateOrderStatusDto {
  status: OrderStatusType;
  notes?: string;
}
