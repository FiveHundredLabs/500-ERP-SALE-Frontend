// Mock Dashboard Data — HardTrade ERP

export const mockKPIs = {
  todaySales: 1280500,
  monthlySales: 38450000,
  prevMonthSales: 32800000,
  totalOrders: 248,
  pendingOrders: 12,
  reviewingOrders: 5,
  approvedOrders: 8,
  purchaseOrders: 6,
  quotations: 34,
  invoices: 186,
  customers: 12,
  suppliers: 12,
  salesmen: 5,
  lowStockItems: 7,
  outstandingPayments: 5623885,
};

export const monthlySalesData = [
  { month: 'Jan', sales: 22500000, orders: 18 },
  { month: 'Feb', sales: 19800000, orders: 15 },
  { month: 'Mar', sales: 28400000, orders: 24 },
  { month: 'Apr', sales: 31200000, orders: 29 },
  { month: 'May', sales: 26700000, orders: 22 },
  { month: 'Jun', sales: 34100000, orders: 31 },
  { month: 'Jul', sales: 32800000, orders: 28 },
  { month: 'Aug', sales: 38450000, orders: 35 },
];

export const ordersByStatus = [
  { status: 'Pending', count: 12, color: '#eab308' },
  { status: 'Reviewing', count: 5, color: '#60a5fa' },
  { status: 'Approved', count: 8, color: '#4ade80' },
  { status: 'Converted to PO', count: 6, color: '#c084fc' },
  { status: 'Completed', count: 192, color: '#34d399' },
  { status: 'Rejected', count: 14, color: '#f87171' },
  { status: 'Cancelled', count: 11, color: '#9ca3af' },
];

export const topProducts = [
  { name: 'Portland Cement 50kg', category: 'Construction', sales: 8500000, units: 4500 },
  { name: 'GI Pipe 25mm', category: 'Pipes & Fittings', sales: 6200000, units: 2800 },
  { name: 'GI Roofing Sheet 26G', category: 'Roofing', sales: 5800000, units: 1900 },
  { name: 'PVC Pipe 50mm', category: 'Plumbing', sales: 3400000, units: 8500 },
  { name: 'Electrical Cable 2.5mm²', category: 'Electrical', sales: 2900000, units: 12000 },
];

export const salesmenPerformance = [
  { name: 'Kasun Perera', area: 'Colombo Central', orders: 58, sales: 9800000 },
  { name: 'Nuwan Silva', area: 'Colombo South', orders: 52, sales: 8500000 },
  { name: 'Dinesh Fernando', area: 'Kandy Region', orders: 47, sales: 7200000 },
  { name: 'Ruwan Jayasinghe', area: 'Gampaha District', orders: 44, sales: 6800000 },
  { name: 'Sachith Kumara', area: 'Matara & Galle', orders: 47, sales: 6150000 },
];

export const lowStockAlerts = [
  { sku: 'BOLT-M10', name: 'Hex Bolt M10 x 50mm', category: 'Fasteners', current: 85, minimum: 500, unit: 'Pcs' },
  { sku: 'CABLE-6', name: 'Electrical Cable 6mm²', category: 'Electrical', current: 120, minimum: 400, unit: 'Meters' },
  { sku: 'DOOR-LOCK-SS', name: 'Door Lock Stainless Steel', category: 'Door Hardware', current: 4, minimum: 20, unit: 'Pcs' },
  { sku: 'ANGLE-GRD', name: 'Angle Grinder 115mm', category: 'Power Tools', current: 2, minimum: 10, unit: 'Pcs' },
  { sku: 'PRIMER-4L', name: 'Wall Primer 4L', category: 'Paint', current: 8, minimum: 50, unit: 'Tins' },
  { sku: 'HINGE-4IN', name: 'Heavy Duty Hinge 4 inch', category: 'Door Hardware', current: 35, minimum: 100, unit: 'Pcs' },
  { sku: 'VALVE-BALL-20', name: 'Ball Valve 20mm', category: 'Plumbing', current: 12, minimum: 80, unit: 'Pcs' },
];

export const recentActivityFeed = [
  { type: 'order', message: 'New order ORD-10025 from Nirosha Hardware Mart', time: '8 mins ago', color: '#60a5fa' },
  { type: 'order', message: 'Order ORD-10024 status changed to Reviewing', time: '22 mins ago', color: '#eab308' },
  { type: 'po', message: 'PO-2026-0045 approved for Nippon Paint Lanka', time: '1 hr ago', color: '#4ade80' },
  { type: 'payment', message: 'Payment received for Invoice INV-00186', time: '2 hrs ago', color: '#34d399' },
  { type: 'order', message: 'Order ORD-10023 converted to PO-2026-0046', time: '3 hrs ago', color: '#c084fc' },
  { type: 'stock', message: 'Low stock alert: Hex Bolt M10 x 50mm (85 Pcs left)', time: '4 hrs ago', color: '#f97316' },
];
