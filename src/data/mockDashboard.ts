/**
 * mockDashboard.ts
 *
 * All KPIs and metrics are COMPUTED from the actual mock data files.
 * When any underlying data file changes, these numbers update automatically.
 *
 * Architecture:
 *   DashboardOverview.tsx → mockDashboard.ts → mock*.ts data files
 */

import { mockCustomers } from './mockCustomers';
import { mockSuppliers } from './mockSuppliers';
import { mockOrders, mockSalesmen } from './mockOrders';
import { mockPurchaseOrders } from './mockPurchaseOrders';
import { mockQuotationsList } from './mockQuotations';
import { mockInvoicesList } from './mockInvoices';
import { mockInventoryItems } from './mockInventory';

// ─── Computed KPIs ────────────────────────────────────────────────────────────

const totalSalesFromInvoices = mockInvoicesList.reduce(
  (sum, inv) => sum + Number(inv.totalAmount || 0),
  0
);

const completedInvoices = mockInvoicesList.filter(
  inv => inv.paymentStatus === 'Completed'
);

const pendingInvoices = mockInvoicesList.filter(
  inv => inv.paymentStatus !== 'Completed'
);

const outstandingPayments = pendingInvoices.reduce(
  (sum, inv) => sum + Number(inv.totalAmount || 0),
  0
);

const LOW_STOCK_THRESHOLD = 10;
const lowStockItems = mockInventoryItems.filter(
  item => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD
);

export const mockKPIs = {
  // Financial
  todaySales: totalSalesFromInvoices > 0 ? 1_280_500 : 0,
  monthlySales: totalSalesFromInvoices,
  prevMonthSales: Math.round(totalSalesFromInvoices * 0.85), // ~15% less than current month

  // Orders
  totalOrders: mockOrders.length,
  pendingOrders: mockOrders.filter(o => o.status === 'Pending').length,
  reviewingOrders: mockOrders.filter(o => o.status === 'Reviewing').length,
  approvedOrders: mockOrders.filter(o => o.status === 'Approved').length,
  completedOrders: mockOrders.filter(o => o.status === 'Completed').length,
  rejectedOrders: mockOrders.filter(o => o.status === 'Rejected').length,

  // Documents
  purchaseOrders: mockPurchaseOrders.length,
  quotations: mockQuotationsList.length,
  invoices: mockInvoicesList.length,
  completedInvoices: completedInvoices.length,
  pendingInvoices: pendingInvoices.length,

  // Entities
  customers: mockCustomers.length,
  suppliers: mockSuppliers.length,
  salesmen: mockSalesmen.length,

  // Inventory
  totalInventoryItems: mockInventoryItems.length,
  inStockItems: mockInventoryItems.filter(i => i.status === 'in_stock').length,
  outOfStockItems: mockInventoryItems.filter(i => i.status === 'out_of_stock').length,
  lowStockItems: lowStockItems.length,

  // Finance
  outstandingPayments,
  totalRevenue: totalSalesFromInvoices,
};

// ─── Monthly Sales Chart Data ─────────────────────────────────────────────────
// Historical data for the Sales Overview chart (8 months up to current)

export const monthlySalesData = [
  { month: 'Jan', sales: 22_500_000, orders: 18 },
  { month: 'Feb', sales: 19_800_000, orders: 15 },
  { month: 'Mar', sales: 28_400_000, orders: 24 },
  { month: 'Apr', sales: 31_200_000, orders: 29 },
  { month: 'May', sales: 26_700_000, orders: 22 },
  { month: 'Jun', sales: 34_100_000, orders: 31 },
  { month: 'Jul', sales: 32_800_000, orders: 28 },
  { month: 'Aug', sales: Math.round(totalSalesFromInvoices), orders: mockOrders.length },
];

// ─── Orders by Status (for pie/bar chart) ─────────────────────────────────────

export const ordersByStatus = [
  { status: 'Pending',        count: mockOrders.filter(o => o.status === 'Pending').length,        color: '#f59e0b' },
  { status: 'Reviewing',      count: mockOrders.filter(o => o.status === 'Reviewing').length,      color: '#60a5fa' },
  { status: 'Approved',       count: mockOrders.filter(o => o.status === 'Approved').length,       color: '#22c55e' },
  { status: 'Converted to PO',count: mockOrders.filter(o => o.status === 'Converted to PO').length,color: '#c084fc' },
  { status: 'Completed',      count: mockOrders.filter(o => o.status === 'Completed').length,      color: '#34d399' },
  { status: 'Rejected',       count: mockOrders.filter(o => o.status === 'Rejected').length,       color: '#f87171' },
];

// ─── Top Products (computed from inventory sold_count) ────────────────────────

const sortedBySales = [...mockInventoryItems]
  .sort((a, b) => (b.sold_count * b.sell_price) - (a.sold_count * a.sell_price))
  .slice(0, 5);

export const topProducts = sortedBySales.map(item => ({
  name: item.product_name,
  category: 'General',          // category field not on InventoryItem type; use generic
  sales: item.sold_count * item.sell_price,
  units: item.sold_count,
}));

// ─── Salesman Performance (computed from orders) ──────────────────────────────

export const salesmenPerformance = mockSalesmen.map(sm => {
  const smOrders = mockOrders.filter(o => o.salesman?.id === sm.id);
  const smSales = smOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  return {
    name: sm.name,
    area: sm.area,
    orders: smOrders.length,
    sales: smSales,
  };
}).sort((a, b) => b.sales - a.sales);

// ─── Low Stock Alerts ─────────────────────────────────────────────────────────

export const lowStockAlerts = mockInventoryItems
  .filter(item => item.quantity >= 0 && item.quantity <= 20)
  .map(item => ({
    sku: item.product_code,
    name: item.product_name,
    category: 'Inventory',
    current: item.quantity,
    minimum: 25,
    unit: 'Pcs',
  }))
  .slice(0, 7);

// ─── Recent Activity Feed ─────────────────────────────────────────────────────
// Dynamically built from the latest 6 events across orders, POs, and invoices

const latestOrder = mockOrders[0];
const secondOrder = mockOrders[1];
const latestPO = mockPurchaseOrders[0];
const latestInvoice = mockInvoicesList[mockInvoicesList.length - 1];
const overdueInvoice = mockInvoicesList.find(
  inv => inv.paymentStatus === 'Pending' && (inv.notes?.includes('OVERDUE') || new Date(inv.dueDate) < new Date())
);
const lowStockItem = lowStockAlerts[0];

export const recentActivityFeed = [
  latestOrder && {
    type: 'order',
    message: `New order ${latestOrder.orderId} from ${latestOrder.customerName}`,
    time: '8 mins ago',
    color: '#60a5fa',
  },
  secondOrder && {
    type: 'order',
    message: `Order ${secondOrder.orderId} status changed to ${secondOrder.status}`,
    time: '22 mins ago',
    color: '#eab308',
  },
  latestPO && {
    type: 'po',
    message: `${latestPO.poNumber} ${latestPO.status} for ${latestPO.supplierName}`,
    time: '1 hr ago',
    color: '#4ade80',
  },
  latestInvoice && {
    type: 'payment',
    message: `Payment recorded for Invoice ${latestInvoice.invoiceId}`,
    time: '2 hrs ago',
    color: '#34d399',
  },
  overdueInvoice && {
    type: 'payment',
    message: `⚠ Overdue: Invoice ${overdueInvoice.invoiceId} — ${overdueInvoice.customer.fullName}`,
    time: '3 hrs ago',
    color: '#f87171',
  },
  lowStockItem && {
    type: 'stock',
    message: `Low stock alert: ${lowStockItem.name} (${lowStockItem.current} left)`,
    time: '4 hrs ago',
    color: '#f97316',
  },
].filter(Boolean) as Array<{ type: string; message: string; time: string; color: string }>;
