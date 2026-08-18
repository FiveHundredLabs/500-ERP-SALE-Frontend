// DashboardService.ts — demo mode, fully derived from mock data

import { mockInventoryItems } from "../data/mockInventory";
import { mockInvoicesList } from "../data/mockInvoices";
import { mockOrders } from "../data/mockOrders";
import { mockQuotationsList } from "../data/mockQuotations";
import { mockCustomers } from "../data/mockCustomers";
import { mockPurchaseOrders } from "../data/mockPurchaseOrders";

export const fetchFromBackend = async (_endpoint: string): Promise<any[]> => {
  return [];
};

export const fetchSalesOverview = async () => {
  const totalRevenue = mockInvoicesList.reduce(
    (sum: number, inv) => sum + Number(inv.totalAmount || 0),
    0
  );

  const completedRevenue = mockInvoicesList
    .filter(inv => inv.paymentStatus === 'Completed')
    .reduce((sum: number, inv) => sum + Number(inv.totalAmount || 0), 0);

  return {
    totalRevenue,
    completedRevenue,
    totalInvoices: mockInvoicesList.length,
    totalItems: mockInventoryItems.length,
    totalOrders: mockOrders.length,
    totalQuotations: mockQuotationsList.length,
    totalCustomers: mockCustomers.length,
    totalPOs: mockPurchaseOrders.length,
    overview: [],
  };
};