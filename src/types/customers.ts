// ============= Customer Helper =============

export function extractCityFromAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return address.trim();
}

// ============= Customer Status =============

export const CustomerStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;

export type CustomerStatusValue = typeof CustomerStatus[keyof typeof CustomerStatus];

// ============= Customer =============

export interface Customer {
  id: string;
  customerCode: string;       // CUS-XXXXX
  shopName: string;           // Shop / Business Name (Required)
  fullName: string;
  contactPerson?: string;     // Contact Person (Optional)
  phone: string;              // Primary / WhatsApp number (Required)
  phone2?: string;            // Second phone number (Optional)
  phone3?: string;            // Third phone number (Optional)
  address: string;            // Address (Required, e.g. "Main Street, Colombo")
  city?: string;              // Internally extracted from address
  district?: string;

  status: CustomerStatusValue;

  creditLimit: number;        // Credit Limit in LKR
  creditPeriod?: number;      // Credit Period in Days (e.g. 15, 30, 45, 60, 90, custom)
  salesRepId?: string | null;
  salesRep?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;                   // Assigned Sales Representative
  salesRepName?: string;

  // Financial statistics
  totalInvoiced?: number;
  totalPaid?: number;
  totalSales?: number;
  outstandingBalance: number;
  totalOrders?: number;

  createdAt: string;
  updatedAt: string;

  notes?: string;
}

export interface CustomerCreateDto {
  customerCode?: string;
  shopName: string;           // Required
  fullName?: string;
  contactPerson?: string;     // Optional
  phone: string;              // Primary / WhatsApp (Required)
  phone2?: string;            // Optional
  phone3?: string;            // Optional
  address: string;            // Required
  creditLimit: number;
  creditPeriod?: number;      // Credit Period in Days
  salesRepId?: string | null; // Sales representative UUID
  salesRepName?: string;
  status?: CustomerStatusValue;
  notes?: string;
}

export type CustomerUpdateDto = Partial<CustomerCreateDto>;
