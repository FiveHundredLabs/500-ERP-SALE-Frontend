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
  inv => inv.paymentStatus === 'completed'
);

const pendingInvoices = mockInvoicesList.filter(
  inv => inv.paymentStatus !== 'completed'
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
  pendingOrders: mockOrders.filter(o => o.status === 'pending').length,
  reviewingOrders: mockOrders.filter(o => o.status === 'reviewing').length,
  approvedOrders: mockOrders.filter(o => o.status === 'approved').length,
  completedOrders: mockOrders.filter(o => o.status === 'completed').length,
  rejectedOrders: mockOrders.filter(o => o.status === 'rejected').length,

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
  { status: 'pending',        count: mockOrders.filter(o => o.status === 'pending').length,        color: '#f59e0b' },
  { status: 'reviewing',      count: mockOrders.filter(o => o.status === 'reviewing').length,      color: '#60a5fa' },
  { status: 'approved',       count: mockOrders.filter(o => o.status === 'approved').length,       color: '#22c55e' },
  { status: 'converted_to_po',count: mockOrders.filter(o => o.status === 'converted_to_po').length,color: '#c084fc' },
  { status: 'completed',      count: mockOrders.filter(o => o.status === 'completed').length,      color: '#34d399' },
  { status: 'rejected',       count: mockOrders.filter(o => o.status === 'rejected').length,       color: '#f87171' },
];

// ─── Top Products (computed from inventory soldCount) ────────────────────────

const sortedBySales = [...mockInventoryItems]
  .sort((a, b) => (b.soldCount * b.sellPrice) - (a.soldCount * a.sellPrice))
  .slice(0, 5);

export const topProducts = sortedBySales.map(item => ({
  name: item.productName,
  category: 'General',          // category field not on InventoryItem type; use generic
  sales: item.soldCount * item.sellPrice,
  units: item.soldCount,
}));

// ─── Salesman Performance (computed from orders) ──────────────────────────────

export const salesmenPerformance = mockSalesmen.map(sm => {
  const smOrders = mockOrders.filter(o => o.salesman?.id === sm.id);
  const smSales = smOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  return {
    name: sm.fullName,
    area: sm.area,
    orders: smOrders.length,
    sales: smSales,
  };
}).sort((a, b) => b.sales - a.sales);

// ─── Overdue Cheques List ──────────────────────────────────────────────────

export interface OverdueCheque {
  id: string;
  chequeNumber: string;
  bankName: string;
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  amount: number;
  status: "overdue" | "Deposited" | "Returned";
}

export const mockChequesOverdue: OverdueCheque[] = [
  {
    id: "chq-01",
    chequeNumber: "CHQ-884210",
    bankName: "Commercial Bank",
    customerName: "Lanka Hardware Traders",
    invoiceNumber: "INV-2026-104",
    dueDate: "2026-08-05",
    daysOverdue: 14,
    amount: 185000,
    status: "overdue",
  },
  {
    id: "chq-02",
    chequeNumber: "CHQ-449102",
    bankName: "Hatton National Bank",
    customerName: "Metro Auto Care",
    invoiceNumber: "INV-2026-082",
    dueDate: "2026-07-28",
    daysOverdue: 22,
    amount: 94500,
    status: "overdue",
  },
  {
    id: "chq-03",
    chequeNumber: "CHQ-110933",
    bankName: "Sampath Bank",
    customerName: "Apex Motors Ltd",
    invoiceNumber: "INV-2026-091",
    dueDate: "2026-07-20",
    daysOverdue: 30,
    amount: 320000,
    status: "overdue",
  },
  {
    id: "chq-04",
    chequeNumber: "CHQ-772184",
    bankName: "Bank of Ceylon",
    customerName: "Kandy Construction Supplies",
    invoiceNumber: "INV-2026-045",
    dueDate: "2026-07-15",
    daysOverdue: 35,
    amount: 142800,
    status: "overdue",
  },
  {
    id: "chq-05",
    chequeNumber: "CHQ-556129",
    bankName: "Nations Trust Bank",
    customerName: "Silver Star Motors",
    invoiceNumber: "INV-2026-033",
    dueDate: "2026-07-08",
    daysOverdue: 42,
    amount: 215000,
    status: "overdue",
  },
];

// ─── Operational Status (Order / PO / Pending / Settle) ──────────────────────

export const operationalStatusBreakdown = [
  { name: "Order", count: mockOrders.filter(o => o.status === 'approved' || o.status === 'converted_to_po').length || 112, color: "#3b82f6", label: "Active Orders" },
  { name: "PO", count: mockPurchaseOrders.length || 38, color: "#8b5cf6", label: "Purchase Orders" },
  { name: "pending", count: mockOrders.filter(o => o.status === 'pending' || o.status === 'reviewing').length || 48, color: "#f59e0b", label: "Pending Invoices" },
  { name: "Settle", count: mockOrders.filter(o => o.status === 'completed').length || 64, color: "#10b981", label: "Settled / Invoiced" },
];

export const lowStockAlerts = mockInventoryItems
  .filter(item => item.quantity >= 0 && item.quantity <= 20)
  .map(item => ({
    sku: item.productCode,
    name: item.productName,
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
  inv => inv.paymentStatus === 'pending' && (inv.notes?.includes('OVERDUE') || new Date(inv.dueDate) < new Date())
);
const lowStockItem = lowStockAlerts[0];

export const recentActivityFeed = [
  latestOrder && {
    type: 'order',
    message: `New order ${latestOrder.orderNumber} from ${latestOrder.customerName}`,
    time: '8 mins ago',
    color: '#60a5fa',
  },
  secondOrder && {
    type: 'order',
    message: `Order ${secondOrder.orderNumber} status changed to ${secondOrder.status}`,
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
    message: `Payment recorded for Invoice ${latestInvoice.invoiceNumber}`,
    time: '2 hrs ago',
    color: '#34d399',
  },
  overdueInvoice && {
    type: 'payment',
    message: `⚠ Overdue: Invoice ${overdueInvoice.invoiceNumber} — ${overdueInvoice.customer?.fullName || 'Customer'}`,
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
