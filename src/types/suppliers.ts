// ============= Supplier Type =============

export const SupplierType = {
  MANUFACTURER: 'Manufacturer',
  WHOLESALER: 'Wholesaler',
  IMPORTER: 'Importer',
  LOCAL_SUPPLIER: 'Local Supplier',
  OTHER: 'Other',
} as const;

export type SupplierTypeValue = typeof SupplierType[keyof typeof SupplierType];

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
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  country?: string;

  supplierType: SupplierTypeValue;
  status: SupplierStatusValue;

  paymentTerms: string;       // e.g., "Net 45", "Advance Payment"
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
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  country?: string;
  supplierType: SupplierTypeValue;
  status: SupplierStatusValue;
  paymentTerms: string;
  bankDetails?: string;
  categories?: string[];
  notes?: string;
}

export type SupplierUpdateDto = Partial<SupplierCreateDto>;
