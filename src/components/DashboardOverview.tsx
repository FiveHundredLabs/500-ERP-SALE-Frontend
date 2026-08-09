import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle,
  ShoppingCart,
  FileText,
  Receipt,
  Users,
  Truck,
  AlertTriangle,
  CreditCard,
  Calendar,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KpiCard, StatusBadge } from "./erp";
import {
  mockKPIs,
  monthlySalesData,
  topProducts,
  salesmenPerformance,
} from "../data/mockDashboard";
import { mockOrders } from "../data/mockOrders";
import { mockPurchaseOrders } from "../data/mockPurchaseOrders";

const ordersByStatusDark = [
  { status: 'Approved', count: 112, color: '#22c55e' },
  { status: 'Pending', count: 48, color: '#f59e0b' },
  { status: 'Processing', count: 34, color: '#3b82f6' },
  { status: 'Completed', count: 29, color: '#60a5fa' },
  { status: 'Rejected', count: 15, color: '#ef4444' },
  { status: 'Cancelled', count: 10, color: '#94a3b8' },
];

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* 1. Primary Metrics Row (Key Financials) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Today's Sales"
          value={formatCurrency(mockKPIs.todaySales)}
          subtitle="Updated just now"
          icon={<DollarSign size={20} className="text-green-400" />}
          iconBg="bg-green-500/20 border border-green-500/30"
          trend={{ value: 14.2, positive: true }}
        />

        <KpiCard
          title="Monthly Sales"
          value={formatCurrency(mockKPIs.monthlySales)}
          subtitle="Vs prev month: LKR 32.8M"
          icon={<Calendar size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/20 border border-blue-500/30"
          trend={{ value: 17.2, positive: true }}
        />

        <KpiCard
          title="Total Orders"
          value={mockKPIs.totalOrders}
          subtitle="12 pending approval"
          icon={<ShoppingBag size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/20 border border-purple-500/30"
          onClick={() => navigate('/orders')}
        />

        <KpiCard
          title="Outstanding Payments"
          value={formatCurrency(mockKPIs.outstandingPayments)}
          subtitle="Across 8 customers"
          icon={<CreditCard size={20} className="text-amber-400" />}
          iconBg="bg-amber-500/20 border border-amber-500/30"
          trend={{ value: 3.5, positive: false }}
          onClick={() => navigate('/users/customers')}
        />
      </div>

      {/* 2. Operational Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div
          onClick={() => navigate('/orders?status=Pending')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-500/50 hover:bg-[#1e293b] transition-all"
        >
          <Clock size={16} className="text-amber-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.pendingOrders}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Pending</span>
        </div>

        <div
          onClick={() => navigate('/orders?status=Approved')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-green-500/50 hover:bg-[#1e293b] transition-all"
        >
          <CheckCircle size={16} className="text-green-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.approvedOrders}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Approved</span>
        </div>

        <div
          onClick={() => navigate('/purchase-orders')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 hover:bg-[#1e293b] transition-all"
        >
          <ShoppingCart size={16} className="text-purple-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.purchaseOrders}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">POs</span>
        </div>

        <div
          onClick={() => navigate('/quotations')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500/50 hover:bg-[#1e293b] transition-all"
        >
          <FileText size={16} className="text-blue-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.quotations}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Quotes</span>
        </div>

        <div
          onClick={() => navigate('/invoice')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-teal-500/50 hover:bg-[#1e293b] transition-all"
        >
          <Receipt size={16} className="text-teal-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.invoices}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Invoices</span>
        </div>

        <div
          onClick={() => navigate('/users/customers')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-500/50 hover:bg-[#1e293b] transition-all"
        >
          <Users size={16} className="text-cyan-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.customers}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Customers</span>
        </div>

        <div
          onClick={() => navigate('/users/suppliers')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 hover:bg-[#1e293b] transition-all"
        >
          <Truck size={16} className="text-indigo-400 mb-1" />
          <span className="text-lg font-bold text-white">{mockKPIs.suppliers}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Suppliers</span>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-500/50 hover:bg-[#1e293b] transition-all"
        >
          <AlertTriangle size={16} className="text-red-400 mb-1" />
          <span className="text-lg font-bold text-red-400">{mockKPIs.lowStockItems}</span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Low Stock</span>
        </div>
      </div>

      {/* 3. Main Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (2 cols) */}
        <div className="lg:col-span-2 bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Sales Performance Over Time</h3>
              <p className="text-xs text-gray-400">Monthly revenue growth (LKR)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">
                <TrendingUp size={14} /> +17.2% MoM
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySalesData}>
                <defs>
                  <linearGradient id="salesGradDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                  formatter={(val) => [formatCurrency(Number(val)), "Sales"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} fill="url(#salesGradDark)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status (1 col) */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Orders by Status</h3>
              <p className="text-xs text-gray-400">Distribution across 248 orders</p>
            </div>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatusDark}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {ordersByStatusDark.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#334155]">
            {ordersByStatusDark.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5 text-xs text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.status}:</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Products & Salesman Performance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Top-Selling Hardware Products</h3>
              <p className="text-xs text-gray-400">Highest revenue items this month</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                  formatter={(val) => [formatCurrency(Number(val)), "Revenue"]}
                />
                <Bar dataKey="sales" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salesman Performance */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Salesman Performance</h3>
              <p className="text-xs text-gray-400">Mobile app orders created by territory</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {salesmenPerformance.map((sm, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#0f172a] border border-[#334155]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                    {sm.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-200">{sm.name}</p>
                    <p className="text-xs text-gray-400">{sm.area}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white font-mono">{formatCurrency(sm.sales)}</p>
                  <p className="text-xs text-gray-400">{sm.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Tables Row: Recent Orders & Recent POs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Mobile Orders */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Recent Customer Orders</h3>
              <p className="text-xs text-gray-400">Submitted by salesmen via mobile app</p>
            </div>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#1e293b]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-sm border-b border-[#334155]">
                  <th className="p-3 text-left">Order ID</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Salesman</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockOrders.slice(0, 5).map((ord, idx) => (
                  <tr
                    key={ord.id}
                    onClick={() => navigate(`/orders/${ord.id}`)}
                    className={`border-b border-[#334155]/60 cursor-pointer hover:bg-[#1e293b] ${
                      idx % 2 ? 'bg-[#111b2d]' : 'bg-[#0f172a]'
                    }`}
                  >
                    <td className="p-3 text-sm font-mono text-blue-400 font-bold">{ord.orderId}</td>
                    <td className="p-3 text-sm font-semibold text-gray-200 truncate max-w-[140px]">{ord.customerName}</td>
                    <td className="p-3 text-xs text-gray-400">{ord.salesman.name}</td>
                    <td className="p-3 text-sm font-bold text-white text-right font-mono">{formatCurrency(ord.grandTotal)}</td>
                    <td className="p-3 text-sm"><StatusBadge status={ord.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchase Orders */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-200">Recent Purchase Orders</h3>
              <p className="text-xs text-gray-400">Supplier procurement orders</p>
            </div>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#1e293b]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-sm border-b border-[#334155]">
                  <th className="p-3 text-left">PO Number</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-left">Ref Order</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockPurchaseOrders.slice(0, 5).map((po, idx) => (
                  <tr
                    key={po.id}
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    className={`border-b border-[#334155]/60 cursor-pointer hover:bg-[#1e293b] ${
                      idx % 2 ? 'bg-[#111b2d]' : 'bg-[#0f172a]'
                    }`}
                  >
                    <td className="p-3 text-sm font-mono text-purple-400 font-bold">{po.poNumber}</td>
                    <td className="p-3 text-sm font-semibold text-gray-200 truncate max-w-[140px]">{po.supplierName}</td>
                    <td className="p-3 text-xs font-mono text-gray-400">{po.referenceOrderNum || "—"}</td>
                    <td className="p-3 text-sm font-bold text-white text-right font-mono">{formatCurrency(po.grandTotal)}</td>
                    <td className="p-3 text-sm"><StatusBadge status={po.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
