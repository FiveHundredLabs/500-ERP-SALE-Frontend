// DashboardService.ts — mock mode, no backend calls

import { mockInventoryItems } from "../data/mockInventory";
import { mockInvoicesList } from "../data/mockInvoices";

export const fetchFromBackend = async (_endpoint: string): Promise<any[]> => {
  return [];
};

export const fetchSalesOverview = async () => {
  const totalRevenue = mockInvoicesList.reduce(
    (sum: number, inv) => sum + Number(inv.totalAmount || 0),
    0
  );

  return {
    totalRevenue,
    totalInvoices: mockInvoicesList.length,
    totalItems: mockInventoryItems.length,
    overview: []
  };
};