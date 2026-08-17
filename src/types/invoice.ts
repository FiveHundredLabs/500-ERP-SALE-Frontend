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
} as const;

export type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface InvoiceCustomer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  vatNumber: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  customerCode: string;
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
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  discountPercentage: number;
  totalAmount: number;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
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
  items: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subTotal: number;
  discount: number;
  totalAmount: number;
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
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType;
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