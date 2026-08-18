export const QuotationStatus = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
} as const;

export type QuotationStatusType = typeof QuotationStatus[keyof typeof QuotationStatus];

export interface QuotationCustomer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;              // WhatsApp (Primary)
  phone2?: string;            // Secondary
  phone3?: string;            // Alternative
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

export interface QuotationItem {
  id: string;
  item: string;
  itemName?: string;
  product_code?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  discountType?: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total_qty';
  discountValue?: number;
  discountAmount?: number;
  total: number;
}

export interface QuotationItemBackend {
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotationData {
  _id?: string;
  quotationId: string;
  customer: string;
  customerDetails?: QuotationCustomer;
  items: QuotationItem[];
  subTotal: number;
  discount: number;
  discountPercentage: number;
  totalAmount: number;
  paymentMethod: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatusType;
  notes?: string;
}

export interface BackendQuotationData {
  _id?: string;
  quotationId?: string;
  customer: string;
  items: QuotationItemBackend[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatusType;
  notes?: string;
}

export interface QuotationResponse {
  _id: string;
  quotationId: string;
  customer: QuotationCustomer;
  items: Array<QuotationItemBackend & { _id?: string }>;
  subTotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatusType;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}