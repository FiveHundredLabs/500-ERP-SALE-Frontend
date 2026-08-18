export interface SalesOfficer {
  id: string;
  fullName: string;
  contactNumber: string;     // Sri Lankan mobile (WhatsApp enabled)
  joiningDate: string;       // YYYY-MM-DD
  username: string;
  password?: string;
  status: 'Active' | 'Inactive';
  designation?: string;
  assignedCustomerIds?: string[]; // IDs of assigned customers
  assignedCustomers?: string[];    // Shop/Business names of assigned customers
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  // Optional legacy fields
  officerId?: string;
  email?: string;
  assignedTerritory?: string;
  commissionRate?: number;
}

export interface SalesOfficerPerformanceSummary {
  officerId: string;
  officerName: string;
  officerCode: string;
  territory: string;
  status: 'Active' | 'Inactive';
  totalSalesValue: number;
  completedSalesValue: number;
  collectedAmount: number;
  pendingCreditAmount: number;
  overdueAmount: number;
  totalInvoicesCount: number;
  completedInvoicesCount: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  totalOrdersCount: number;
  collectionRate: number; // percentage (0 - 100)
}

export interface SalesOfficerFilterPeriod {
  type: 'week' | 'month' | 'last_month' | 'last_6_months' | 'all' | 'custom';
  label: string;
  startDate?: string;
  endDate?: string;
}
