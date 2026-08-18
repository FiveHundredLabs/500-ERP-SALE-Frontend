import React from "react";
import {
  AreaChart,
  Area,
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
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  UserCheck,
  CreditCard,
  TrendingUp,
  ArrowRight,
  PackageCheck,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KpiCard, StatusBadge } from "./erp";
import {
  mockKPIs,
  monthlySalesData,
  topProducts,
  salesmenPerformance,
  mockChequesOverdue,
  operationalStatusBreakdown,
} from "../data/mockDashboard";
import { mockOrders } from "../data/mockOrders";
import { mockPurchaseOrders } from "../data/mockPurchaseOrders";

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
    }).format(amount);

  const pendingPOCount = mockPurchaseOrders.filter(
    (p) => p.status === "Pending Approval" || p.status === "Draft"
  ).length || 14;

  const totalOverdueChequesAmount = mockChequesOverdue.reduce((sum, chq) => sum + chq.amount, 0);

  return (
    <div className="w-full space-y-6 pb-10 animate-fadeIn">
      {/* ================= 1. PRIMARY METRICS ROW ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Orders (Replaced Today's Sales) */}
        <KpiCard
          title="Today's Orders"
          value="8 Orders"
          subtitle="Value: LKR 1,280,500"
          icon={<ShoppingBag size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/20 border border-emerald-500/30"
          trend={{ value: 14.2, positive: true }}
          onClick={() => navigate("/orders")}
        />

        {/* Total Orders (Replaced Total Sales) */}
        <KpiCard
          title="Total Orders"
          value={`${mockKPIs.totalOrders} Orders`}
          subtitle="LKR 46.2M enterprise volume"
          icon={<PackageCheck size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/20 border border-blue-500/30"
          trend={{ value: 11.8, positive: true }}
          onClick={() => navigate("/orders")}
        />

        {/* Monthly Revenue */}
        <KpiCard
          title="Monthly Revenue"
          value={formatCurrency(mockKPIs.monthlySales)}
          subtitle="Vs prev month: LKR 32.8M"
          icon={<DollarSign size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/20 border border-purple-500/30"
          trend={{ value: 17.2, positive: true }}
          onClick={() => navigate("/invoice")}
        />

        {/* Outstanding Receivables */}
        <KpiCard
          title="Outstanding Receivables"
          value={formatCurrency(mockKPIs.outstandingPayments)}
          subtitle="Across 8 credit customer accounts"
          icon={<CreditCard size={20} className="text-amber-400" />}
          iconBg="bg-amber-500/20 border border-amber-500/30"
          trend={{ value: 3.5, positive: false }}
          onClick={() => navigate("/finance")}
        />
      </div>

      {/* ================= 2. SECOND ROW OPERATIONAL METRICS ================= */}
      {/* Requested: Total Invoices / Total Customers / Suppliers / Sales Officers / Pending Orders / Pending POs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Invoices */}
        <div
          onClick={() => navigate("/invoice")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-teal-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-teal-500/15 text-teal-400 mb-2 group-hover:scale-110 transition-transform">
            <Receipt size={18} />
          </div>
          <span className="text-xl font-bold text-white font-mono">{mockKPIs.invoices}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Total Invoices
          </span>
        </div>

        {/* Total Customers */}
        <div
          onClick={() => navigate("/customers")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-cyan-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400 mb-2 group-hover:scale-110 transition-transform">
            <Users size={18} />
          </div>
          <span className="text-xl font-bold text-white font-mono">{mockKPIs.customers}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Total Customers
          </span>
        </div>

        {/* Total Suppliers */}
        <div
          onClick={() => navigate("/suppliers")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-indigo-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
            <Truck size={18} />
          </div>
          <span className="text-xl font-bold text-white font-mono">{mockKPIs.suppliers}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Total Suppliers
          </span>
        </div>

        {/* Sales Officers */}
        <div
          onClick={() => navigate("/sales-officers")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-blue-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 mb-2 group-hover:scale-110 transition-transform">
            <UserCheck size={18} />
          </div>
          <span className="text-xl font-bold text-white font-mono">{mockKPIs.salesmen}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Sales Officers
          </span>
        </div>

        {/* Pending Orders */}
        <div
          onClick={() => navigate("/orders?status=Pending")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-amber-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 mb-2 group-hover:scale-110 transition-transform">
            <Clock size={18} />
          </div>
          <span className="text-xl font-bold text-amber-400 font-mono">{mockKPIs.pendingOrders}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Pending Orders
          </span>
        </div>

        {/* Pending POs */}
        <div
          onClick={() => navigate("/purchase-orders")}
          className="bg-[#1e293b]/80 border border-[#334155] hover:border-purple-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm"
        >
          <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 mb-2 group-hover:scale-110 transition-transform">
            <ShoppingCart size={18} />
          </div>
          <span className="text-xl font-bold text-purple-400 font-mono">{pendingPOCount}</span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Pending POs
          </span>
        </div>
      </div>

      {/* ================= 3. MAIN ANALYTICS CHARTS ROW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance Over Time Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#334155] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                    <TrendingUp size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Sales Performance Over Time
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Monthly gross sales trend and booking volume (LKR)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full font-bold">
                  <TrendingUp size={14} /> +17.2% MoM
                </span>
              </div>
            </div>

            {/* Area Chart with custom styling */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradAesthetic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#1e293b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.7} />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                      padding: "10px 14px",
                    }}
                    formatter={(val) => [formatCurrency(Number(val)), "Gross Sales"]}
                    labelStyle={{ fontWeight: "bold", color: "#60a5fa", marginBottom: "4px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", stroke: "#93c5fd", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 7, stroke: "#ffffff", strokeWidth: 2 }}
                    fill="url(#salesGradAesthetic)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-[#334155]/60 mt-3">
            <span>Historical 8-Month Trajectory</span>
            <span className="font-semibold text-slate-300">Peak Month: August (LKR 46.2M)</span>
          </div>
        </div>

        {/* Orders by Status (Order / PO / Pending / Settle) (1 Col) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#334155] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                    <Layers size={17} />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">Orders by Status</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Status breakdown & distribution</p>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="h-48 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={operationalStatusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {operationalStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#1e293b" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-extrabold text-white font-mono leading-none">
                  {operationalStatusBreakdown.reduce((sum, item) => sum + item.count, 0)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Total Logs</span>
              </div>
            </div>

            {/* Status Breakdown List: Order / PO / Pending / Settle */}
            <div className="space-y-2.5 mt-2 pt-2 border-t border-[#334155]">
              {operationalStatusBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0f172a]/60 border border-[#334155]/60 hover:bg-[#0f172a] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0 truncate">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5 font-normal">({item.label})</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-100 bg-[#1e293b] px-2 py-0.5 rounded border border-[#334155] flex-shrink-0 ml-2">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 4. TOP PRODUCTS & CHEQUE OVERDUE LIST ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top-Selling Products (5 Cols) */}
        <div className="lg:col-span-5 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-[#334155] pb-3">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Top-Selling Products</h3>
                <p className="text-xs text-slate-400 mt-0.5">Highest volume and revenue contributors</p>
              </div>
              <button
                onClick={() => navigate("/inventory")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Inventory <ChevronRight size={14} />
              </button>
            </div>

            {/* Products Ranked List with Visual Bar Chart */}
            <div className="space-y-3.5">
              {topProducts.map((prod, idx) => {
                const maxSales = topProducts[0]?.sales || 1;
                const percentage = Math.round((prod.sales / maxSales) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            idx === 0
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : idx === 1
                              ? "bg-slate-400/20 text-slate-200 border border-slate-400/40"
                              : idx === 2
                              ? "bg-amber-700/20 text-amber-500 border border-amber-700/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">{prod.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2 font-mono">
                        <span className="font-bold text-white">{formatCurrency(prod.sales)}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {prod.units} units sold
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="w-full bg-[#0f172a] rounded-full h-2 overflow-hidden border border-[#334155]/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0
                            ? "bg-gradient-to-r from-blue-500 to-emerald-400"
                            : idx === 1
                            ? "bg-gradient-to-r from-blue-600 to-cyan-400"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#334155]/60 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Fast Movers: Auto & Hardware</span>
            <span className="font-semibold text-emerald-400">Top 5: 64% of Revenue</span>
          </div>
        </div>

        {/* Cheque Overdue List with Button to Go to Finance (7 Cols) */}
        <div className="lg:col-span-7 bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[#334155] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Cheque Overdue List
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Matured & pending customer cheques requiring banking clearance
                </p>
              </div>

              {/* Button to go to finance */}
              <button
                onClick={() => navigate("/finance")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer flex-shrink-0"
              >
                <span>Go to Finance</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Overdue Cheques Table */}
            <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#0f172a]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1e293b] text-slate-300 font-bold border-b border-[#334155] uppercase text-[11px] tracking-wider">
                    <th className="py-2.5 px-3">Cheque # / Bank</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Overdue Status</th>
                    <th className="py-2.5 px-3 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {mockChequesOverdue.map((chq) => (
                    <tr
                      key={chq.id}
                      onClick={() => navigate("/finance")}
                      className="hover:bg-[#1e293b]/70 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-blue-400">{chq.chequeNumber}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Building2 size={10} /> {chq.bankName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200 truncate max-w-[140px]">
                          {chq.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{chq.invoiceId}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          <span>{chq.dueDate}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 whitespace-nowrap">
                          {chq.daysOverdue} Days Overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(chq.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Summary */}
          <div className="pt-3.5 border-t border-[#334155]/60 mt-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Total Overdue: <strong className="text-white">{mockChequesOverdue.length} Cheques</strong>
            </span>
            <div className="text-right">
              <span className="text-slate-400 mr-2">Total Outstanding:</span>
              <strong className="text-red-400 font-mono text-sm font-bold">
                {formatCurrency(totalOverdueChequesAmount)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. RECENT TRANSACTIONS & SALESMAN PERFORMANCE ROW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Recent Customer Orders</h3>
              <p className="text-xs text-slate-400">Submitted by salesmen via mobile app</p>
            </div>
            <button
              onClick={() => navigate("/orders")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#0f172a]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-slate-300 text-xs border-b border-[#334155] font-bold uppercase">
                  <th className="p-3 text-left">Order ID</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Sales Officer</th>
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
                      idx % 2 ? "bg-[#111b2d]" : "bg-[#0f172a]"
                    }`}
                  >
                    <td className="p-3 text-xs font-mono text-blue-400 font-bold">{ord.orderId}</td>
                    <td className="p-3 text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                      {ord.customerName}
                    </td>
                    <td className="p-3 text-xs text-slate-400">{ord.salesman?.name || "—"}</td>
                    <td className="p-3 text-xs font-bold text-white text-right font-mono">
                      {formatCurrency(ord.grandTotal)}
                    </td>
                    <td className="p-3 text-xs">
                      <StatusBadge status={ord.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Officer Performance */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Sales Officer Performance</h3>
                <p className="text-xs text-slate-400">Order revenue generation by assigned route</p>
              </div>
              <button
                onClick={() => navigate("/sales-officers")}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                Officers <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2.5">
              {salesmenPerformance.slice(0, 4).map((sm, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate("/sales-officers")}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a] border border-[#334155] hover:border-blue-500/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                      {sm.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{sm.name}</p>
                      <p className="text-[11px] text-slate-400">{sm.area}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white font-mono">{formatCurrency(sm.sales)}</p>
                    <p className="text-[10px] text-slate-400">{sm.orders} orders booked</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#334155]/60 mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Route Coverage Active</span>
            <span className="font-semibold text-blue-400">100% Territory Mapped</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
