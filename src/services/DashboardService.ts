const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const fetchFromBackend = async (endpoint: string): Promise<any[]> => {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
};

export const fetchSalesOverview = async () => {
  try {
    const [invoices, items, orders, quotations, customers, pos] = await Promise.all([
      fetchFromBackend('invoices'),
      fetchFromBackend('inventory-items'),
      fetchFromBackend('orders'),
      fetchFromBackend('quotations'),
      fetchFromBackend('customers'),
      fetchFromBackend('purchase-orders'),
    ]);

    const totalRevenue = invoices.reduce(
      (sum: number, inv: any) => sum + Number(inv.totalAmount || 0),
      0
    );

    const completedRevenue = invoices
      .filter((inv: any) => inv.paymentStatus === 'Completed' || inv.paymentStatus === 'Paid')
      .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);

    return {
      totalRevenue,
      completedRevenue,
      totalInvoices: invoices.length,
      totalItems: items.length,
      totalOrders: orders.length,
      totalQuotations: quotations.length,
      totalCustomers: customers.length,
      totalPOs: pos.length,
      overview: [],
    };
  } catch {
    return {
      totalRevenue: 0,
      completedRevenue: 0,
      totalInvoices: 0,
      totalItems: 0,
      totalOrders: 0,
      totalQuotations: 0,
      totalCustomers: 0,
      totalPOs: 0,
      overview: [],
    };
  }
};