// ============= Customer Type =============

export const CustomerType = {
  HARDWARE_SHOP: 'Hardware Shop',
  RETAILER: 'Retailer',
  CONTRACTOR: 'Contractor',
  DISTRIBUTOR: 'Distributor',
  GOVERNMENT: 'Government',
  OTHER: 'Other',
} as const;

export type CustomerTypeValue = typeof CustomerType[keyof typeof CustomerType];

// ============= Customer Status =============

export const CustomerStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;

export type CustomerStatusValue = typeof CustomerStatus[keyof typeof CustomerStatus];

// ============= Customer =============

export interface Customer {
  id: string;
  customerId: string;         // CUST-XXXXX
  businessName: string;       // Shop / Company name
  contactPerson: string;
  phone: string;              // Primary / WhatsApp number (Required)
  phone2?: string;            // Second phone number (Optional)
  phone3?: string;            // Third phone number (Optional)
  email?: string;
  address: string;
  city: string;
  district?: string;

  customerType: CustomerTypeValue;
  status: CustomerStatusValue;

  creditLimit: number;
  paymentTerms: string;       // e.g., "Net 30", "Cash on Delivery"

  // Statistics
  totalOrders: number;
  totalSales: number;
  outstandingBalance: number;

  createdAt: string;
  updatedAt: string;

  notes?: string;
}

export interface CustomerCreateDto {
  businessName: string;
  contactPerson: string;
  phone: string;              // Primary / WhatsApp number (Required)
  phone2?: string;            // Second phone number (Optional)
  phone3?: string;            // Third phone number (Optional)
  email?: string;
  address: string;
  city: string;
  district?: string;
  customerType: CustomerTypeValue;
  status: CustomerStatusValue;
  creditLimit: number;
  paymentTerms: string;
  notes?: string;
}

export type CustomerUpdateDto = Partial<CustomerCreateDto>;
