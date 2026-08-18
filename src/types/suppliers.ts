// ============= Supplier Status =============

export const SupplierStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;

export type SupplierStatusValue = typeof SupplierStatus[keyof typeof SupplierStatus];

// ============= Supplier =============

export interface Supplier {
  id: string;
  supplierId: string;         // SUP-XXXXX
  companyName: string;
  contactPerson?: string;     // Optional
  phone: string;              // Primary / WhatsApp number (Required)
  phone2?: string;            // Second phone number (Optional)
  phone3?: string;            // Third phone number (Optional)
  email?: string;
  address: string;
  city?: string;
  country?: string;

  supplierType?: string;      // Optional / Deprecated
  status: SupplierStatusValue;

  bankDetails?: string;

  // Categories they supply
  categories?: string[];

  // Statistics
  totalPOs: number;
  totalPurchaseAmount: number;
  outstandingPayments: number;

  createdAt: string;
  updatedAt: string;

  notes?: string;
}

export interface SupplierCreateDto {
  companyName: string;
  contactPerson?: string;     // Optional
  phone: string;              // Primary / WhatsApp number (Required)
  phone2?: string;            // Second phone number (Optional)
  phone3?: string;            // Third phone number (Optional)
  email?: string;
  address: string;
  city?: string;
  country?: string;
  supplierType?: string;
  status: SupplierStatusValue;
  bankDetails?: string;
  categories?: string[];
  notes?: string;
}

export type SupplierUpdateDto = Partial<SupplierCreateDto>;
