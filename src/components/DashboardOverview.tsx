import React, { useState, useEffect, useMemo } from "react";
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
import { getInvoiceCalculatedStatus } from "../types/invoice";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  ShoppingCart,
  Users,
  Truck,
  UserCheck,
  CreditCard,
  TrendingUp,
  ArrowRight,
  PackageCheck,
  Package,
  AlertCircle,
  Layers,
  RefreshCw,
  BarChart2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KpiCard, StatusBadge } from "./erp";
import { invoiceService } from "../services/InvoiceService";
import { orderService } from "../services/OrderService";
import { purchaseOrderService } from "../services/PurchaseOrderService";
import { inventoryService } from "../services/InventoryService";
import { supplierService } from "../services/SupplierService";
import { salesOfficerService } from "../services/SalesOfficerService";
import { financeService } from "../services/FinanceService";
import { invoiceReturnService } from "../services/InvoiceReturnService";
import type { InvoiceResponse } from "../types/invoice";
import type { Order } from "../types/orders";
import type { PurchaseOrder } from "../types/purchaseOrders";
import type { InventoryItem } from "../types/inventory";
import type { Supplier } from "../types/suppliers";
import type { SalesOfficer } from "../types/salesOfficer";
import type { InvoiceReturn } from "../types/invoice-return";

// ─── Skeleton Components ──────────────────────────────────────────────────────
const SkeletonBox = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-[#334155]/40 rounded-lg ${className}`} />
);

const KpiSkeleton = () => (
  <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <SkeletonBox className="h-4 w-28" />
      <SkeletonBox className="h-9 w-9 rounded-lg" />
    </div>
    <SkeletonBox className="h-7 w-40" />
    <SkeletonBox className="h-3 w-24" />
  </div>
);

// ─── Dashboard Overview Component ─────────────────────────────────────────────
const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficer[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);
  const [invoiceReturns, setInvoiceReturns] = useState<InvoiceReturn[]>([]);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    setErrors([]);

    const errs: string[] = [];
    const safe = async <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        return await promise;
      } catch (e: any) {
        errs.push(`${label}: ${e?.message || "Failed"}`);
        return fallback;
      }
    };

    const [invs, ords, pos, invItems, custs, sups, officers, finTransactions, returnsList] = await Promise.all([
      safe(invoiceService.getAll(), [], "Invoices"),
      safe(orderService.getAll(), [], "Orders"),
      safe(purchaseOrderService.getAll(), [], "Purchase Orders"),
      safe(inventoryService.getAll(), [], "Inventory"),
      safe(invoiceService.getAllCustomers(), [], "Customers"),
      safe(supplierService.getAll(), [], "Suppliers"),
      safe(salesOfficerService.getAll(), [], "Sales Officers"),
      safe(financeService.getAll(), [], "Finance"),
      safe(invoiceReturnService.getAll(), [], "Returns"),
    ]);

    setInvoices(invs);
    setOrders(ords);
    setPurchaseOrders(pos);
    setInventoryItems(invItems);
    setCustomers(custs);
    setSuppliers(sups);
    setSalesOfficers(officers);
    setInvoiceReturns(returnsList);

    const chqs = finTransactions.filter(
      (t: any) => t.paymentMethod === "cheque" || t.paymentMethod === "Cheque"
    );
    setCheques(chqs);

    if (errs.length > 0) setErrors(errs);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatCompact = (amount: number) => {
    if (amount >= 1_000_000) return `LKR ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `LKR ${(amount / 1_000).toFixed(0)}K`;
    return formatCurrency(amount);
  };

  // ── KPI Computations — use remainingAmount as source of truth for collection status ──
  // This correctly handles credit invoices where DB paymentStatus may be 'pending'
  // but the real collection state is determined by paidAmount vs totalAmount.
  const invoiceStatuses = useMemo(
    () =>
      invoices.map((inv) => ({
        inv,
        calc: getInvoiceCalculatedStatus(inv),
      })),
    [invoices]
  );

  const totalRevenue = useMemo(
    () => invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    [invoices]
  );

  // Collected = invoices where remainingAmount <= 0 (fully paid)
  const collectedRevenue = useMemo(
    () =>
      invoiceStatuses
        .filter(({ calc }) => calc.remainingAmount <= 0)
        .reduce((sum, { inv }) => sum + (inv.totalAmount || 0), 0),
    [invoiceStatuses]
  );

  // Outstanding = sum of remainingAmount for all invoices not fully paid
  const outstandingReceivables = useMemo(
    () =>
      invoiceStatuses
        .filter(({ calc }) => calc.remainingAmount > 0)
        .reduce((sum, { calc }) => sum + calc.remainingAmount, 0),
    [invoiceStatuses]
  );

  const paidInvoiceCount = useMemo(
    () => invoiceStatuses.filter(({ calc }) => calc.remainingAmount <= 0).length,
    [invoiceStatuses]
  );

  const unpaidInvoiceCount = useMemo(
    () => invoiceStatuses.filter(({ calc }) => calc.remainingAmount > 0).length,
    [invoiceStatuses]
  );

  const overdueInvoiceCount = useMemo(
    () => invoiceStatuses.filter(({ calc }) => calc.status === "overdue").length,
    [invoiceStatuses]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === "pending" || o.status === "reviewing").length,
    [orders]
  );

  const pendingPOCount = useMemo(
    () =>
      purchaseOrders.filter(
        (p) => (p.status as string) === "pending_approval" || (p.status as string) === "draft" || (p.status as string) === "pending"
      ).length,
    [purchaseOrders]
  );

  const totalProductsCount = useMemo(
    () => inventoryItems.length,
    [inventoryItems]
  );


  // ── Operational Status Breakdown (Categories: Order Stage, PO Stage, Pending (Invoice), Overdue, Completed, Return) ──
  const operationalStatusBreakdown = useMemo(() => {
    // 1. Order Stage: Orders active in the workflow (not yet completed, cancelled, or rejected)
    const orderStage = orders.filter(
      (o) => o.status !== "completed" && o.status !== "cancelled" && o.status !== "rejected"
    ).length;

    // 2. PO Stage: Purchase Orders in progress (not completed or cancelled)
    const poStage = purchaseOrders.filter(
      (p) => p.status !== "completed" && p.status !== "cancelled"
    ).length;

    // 3. Pending (Invoice): Invoices that are outstanding and NOT yet overdue
    const pendingInvoice = invoiceStatuses.filter(
      ({ calc }) => calc.remainingAmount > 0 && calc.status !== "overdue"
    ).length;

    // 4. Overdue: Invoices that have exceeded their credit period / due date
    const overdue = invoiceStatuses.filter(
      ({ calc }) => calc.remainingAmount > 0 && calc.status === "overdue"
    ).length;

    // 5. Completed: Finished orders, completed POs, and fully settled invoices
    const completedOrders = orders.filter((o) => o.status === "completed").length;
    const completedPOs = purchaseOrders.filter((p) => p.status === "completed").length;
    const completedInvoices = invoiceStatuses.filter(
      ({ calc }) => calc.remainingAmount <= 0
    ).length;
    const completed = completedOrders + completedPOs + completedInvoices;

    // 6. Return: Active invoice returns
    const returnsCount = invoiceReturns.filter(
      (r) => r.status !== "cancelled"
    ).length;

    const total =
      orderStage + poStage + pendingInvoice + overdue + completed + returnsCount || 1;

    return [
      {
        name: "Order Stage",
        value: orderStage,
        color: "#3b82f6", // Blue
        link: "/orders",
        percentage: Math.round((orderStage / total) * 100),
      },
      {
        name: "PO Stage",
        value: poStage,
        color: "#8b5cf6", // Purple
        link: "/purchase-orders",
        percentage: Math.round((poStage / total) * 100),
      },
      {
        name: "Pending (Invoice)",
        value: pendingInvoice,
        color: "#f59e0b", // Amber
        link: "/invoice",
        percentage: Math.round((pendingInvoice / total) * 100),
      },
      {
        name: "Overdue",
        value: overdue,
        color: "#ef4444", // Red
        link: "/finance",
        percentage: Math.round((overdue / total) * 100),
      },
      {
        name: "Completed",
        value: completed,
        color: "#10b981", // Emerald
        link: "/orders",
        percentage: Math.round((completed / total) * 100),
      },
      {
        name: "Return",
        value: returnsCount,
        color: "#f43f5e", // Rose
        link: "/invoice-returns",
        percentage: Math.round((returnsCount / total) * 100),
      },
    ];
  }, [orders, purchaseOrders, invoiceStatuses, invoiceReturns]);

  // ── Monthly Revenue Chart (real invoice dates, use remainingAmount for collected) ──
  const monthlySalesData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonthIdx - i, 1);
      const mIdx = targetDate.getMonth();
      const mYear = targetDate.getFullYear();
      const mName = months[mIdx];

      const monthEntries = invoiceStatuses.filter(({ inv }) => {
        const d = new Date(inv.issueDate || inv.createdAt || "");
        return !isNaN(d.getTime()) && d.getMonth() === mIdx && d.getFullYear() === mYear;
      });

      const rev = monthEntries.reduce((sum, { inv }) => sum + (inv.totalAmount || 0), 0);
      // Collected = paidAmount per invoice (partial collections count too)
      const collected = monthEntries.reduce((sum, { calc }) => sum + calc.paidAmount, 0);

      result.push({
        name: mName,
        revenue: rev,
        collected,
        orders: monthEntries.length,
      });
    }
    return result;
  }, [invoiceStatuses]);

  // ── Top Products by soldCount (real) ─────────────────────────────────────
  const topProducts = useMemo(() => {
    return [...inventoryItems]
      .filter((i) => (i.soldCount || 0) > 0 || (i.quantity || 0) > 0)
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 5)
      .map((item) => ({
        name: item.productName,
        code: item.productCode,
        sales: item.soldCount || 0,
        revenue: (item.soldCount || 0) * (item.sellPrice || 0),
        stock: item.quantity,
      }));
  }, [inventoryItems]);

  // ── Sales Officer Performance (real invoice totals matched by name) ───────
  const salesmenPerformance = useMemo(() => {
    return salesOfficers
      .map((so) => {
        const soOrders = orders.filter((ord) => {
          const sm = ord.salesman;
          return (
            sm?.fullName === so.fullName ||
            ord.salesmanName === so.fullName
          );
        });
        const soTotal = soOrders.reduce((sum, ord) => sum + (ord.grandTotal || 0), 0);
        const target = so.monthlyTarget || 0;
        return {
          name: so.fullName,
          area: so.assignedArea || so.assignedTerritory || "—",
          totalSales: soTotal,
          target,
          progress: target > 0 ? Math.min(100, Math.round((soTotal / target) * 100)) : 0,
          ordersCount: soOrders.length,
        };
      })
      .filter((so) => so.ordersCount > 0 || so.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);
  }, [salesOfficers, orders]);

  // ── Recent Orders (last 5 sorted by date) ────────────────────────────────
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const da = new Date(a.createdAt || a.orderDate || "").getTime();
        const db = new Date(b.createdAt || b.orderDate || "").getTime();
        return db - da;
      })
      .slice(0, 5);
  }, [orders]);

  // ── Overdue Cheques (due date <= today) ───────────────────────────────────
  const overdueCheques = useMemo(() => {
    const today = new Date();
    return cheques
      .filter((chq) => {
        const due = new Date(chq.date || chq.dueDate || "");
        return !isNaN(due.getTime()) && due <= today && chq.status !== "cleared";
      })
      .sort((a, b) => new Date(a.date || a.dueDate || "").getTime() - new Date(b.date || b.dueDate || "").getTime())
      .slice(0, 6);
  }, [cheques]);

  const pendingCheques = useMemo(() => {
    const today = new Date();
    return cheques
      .filter((chq) => {
        const due = new Date(chq.date || chq.dueDate || "");
        return !isNaN(due.getTime()) && due > today && chq.status !== "cleared";
      })
      .sort((a, b) => new Date(a.date || a.dueDate || "").getTime() - new Date(b.date || b.dueDate || "").getTime())
      .slice(0, 6);
  }, [cheques]);

  const displayCheques = overdueCheques.length > 0 ? overdueCheques : pendingCheques;
  const hasOverdueCheques = overdueCheques.length > 0;

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full space-y-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <KpiSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <SkeletonBox key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonBox className="lg:col-span-2 h-80 rounded-xl" />
          <SkeletonBox className="h-80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonBox className="h-64 rounded-xl" />
          <SkeletonBox className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-10 animate-fadeIn">
      {/* ── Error Banner ─────────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-start gap-3 text-xs text-red-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Some data failed to load:</p>
            <ul className="space-y-0.5 opacity-80">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
          <button
            onClick={loadDashboardData}
            className="ml-auto shrink-0 flex items-center gap-1 text-red-300 hover:text-red-200 font-semibold"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* ── Last Updated ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ══════════════ 1. PRIMARY KPI CARDS ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Orders"
          value={`${orders.length}`}
          subtitle={`${pendingOrdersCount} pending · ${orders.filter(o => o.status === 'completed').length} completed`}
          icon={<ShoppingBag size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/20 border border-emerald-500/30"
          onClick={() => navigate("/orders")}
        />
        <KpiCard
          title="Total Invoices"
          value={`${invoices.length}`}
          subtitle={`${unpaidInvoiceCount} outstanding · ${paidInvoiceCount} fully collected`}
          icon={<PackageCheck size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/20 border border-blue-500/30"
          onClick={() => navigate("/invoice")}
        />
        <KpiCard
          title="Total Revenue"
          value={formatCompact(totalRevenue)}
          subtitle={`${formatCompact(collectedRevenue)} collected · ${formatCompact(outstandingReceivables)} pending`}
          icon={<DollarSign size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/20 border border-purple-500/30"
          onClick={() => navigate("/invoice")}
        />
        <KpiCard
          title="Receivables Outstanding"
          value={formatCompact(outstandingReceivables)}
          subtitle={`${unpaidInvoiceCount} invoices · ${overdueInvoiceCount > 0 ? `⚠ ${overdueInvoiceCount} overdue` : 'none overdue'}`}
          icon={<CreditCard size={20} className="text-amber-400" />}
          iconBg={overdueInvoiceCount > 0 ? "bg-red-500/20 border border-red-500/30" : "bg-amber-500/20 border border-amber-500/30"}
          onClick={() => navigate("/finance")}
        />
      </div>

      {/* ══════════════ 2. OPERATIONAL COUNTERS STRIP ══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Customers", value: customers.length, color: "blue", icon: <Users size={18} />, link: "/users?tab=customers" },
          { label: "Suppliers", value: suppliers.length, color: "indigo", icon: <Truck size={18} />, link: "/users?tab=suppliers" },
          { label: "Sales Officers", value: salesOfficers.length, color: "violet", icon: <UserCheck size={18} />, link: "/sales-officers" },
          { label: "Pending Orders", value: pendingOrdersCount, color: "amber", icon: <Clock size={18} />, link: "/orders" },
          { label: "Pending POs", value: pendingPOCount, color: "purple", icon: <ShoppingCart size={18} />, link: "/purchase-orders" },
          { label: "Total Products", value: inventoryItems.length, color: "teal", icon: <Package size={18} />, link: "/inventory" },
        ].map(({ label, value, color, icon, link }) => (
          <div
            key={label}
            onClick={() => navigate(link)}
            className={`bg-[#1e293b]/80 border border-[#334155] hover:border-${color}-500/60 rounded-xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#1e293b] group shadow-sm`}
          >
            <div className={`p-2 rounded-lg bg-${color}-500/15 text-${color}-400 mb-2 group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
            <span className={`text-xl font-bold font-mono ${value > 0 ? `text-${color}-400` : "text-white"}`}>
              {value}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* ══════════════ 3. CHARTS ROW ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-400" />
                Revenue Trend — Last 6 Months
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Invoiced revenue vs collected · {formatCompact(totalRevenue)} total
              </p>
            </div>
            <button
              onClick={() => navigate("/finance")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Finance <ArrowRight size={12} />
            </button>
          </div>

          {monthlySalesData.every((m) => m.revenue === 0) ? (
            <div className="h-64 flex items-center justify-center flex-col gap-2 text-slate-500">
              <BarChart2 size={32} className="opacity-30" />
              <p className="text-xs">No invoice data for the last 6 months</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlySalesData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    itemStyle={{ color: "#e2e8f0", fontSize: "12px" }}
                    formatter={(val: any, name: string) => [
                      formatCurrency(Number(val)),
                      name === "revenue" ? "Invoiced" : "Collected",
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#collectedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status Breakdown Donut */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-purple-400" />
                Status Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Pipeline distribution across ERP stages</p>
            </div>
          </div>

          {operationalStatusBreakdown.every((s) => s.value === 0) ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs py-10">
              No active pipeline items recorded
            </div>
          ) : (
            <>
              <div className="h-44 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operationalStatusBreakdown.filter((s) => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {operationalStatusBreakdown
                        .filter((s) => s.value > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                      itemStyle={{ color: "#e2e8f0", fontSize: "12px" }}
                      formatter={(val: any, _: any, props: any) => [`${val} (${props.payload.percentage}%)`, props.payload.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <span className="text-xl font-bold text-white font-mono">
                      {operationalStatusBreakdown.reduce((s, i) => s + i.value, 0)}
                    </span>
                    <p className="text-[10px] text-slate-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 mt-3 pt-3 border-t border-[#334155]/60">
                {operationalStatusBreakdown.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => navigate(item.link)}
                    className="flex items-center gap-1.5 text-xs p-1 rounded-md hover:bg-[#0f172a] cursor-pointer transition-colors group"
                    title={`View ${item.name}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 group-hover:text-white truncate text-[11px] transition-colors">{item.name}</span>
                    <span className={`font-mono font-bold ml-auto text-xs ${item.value > 0 ? 'text-white' : 'text-slate-600'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════ 4. PRODUCTS & CHEQUES ROW ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 High-Demand Products */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">High-Demand Products</h3>
              <p className="text-xs text-slate-400 mt-0.5">Top items by units sold · Total products: {totalProductsCount}</p>
            </div>
            <button
              onClick={() => navigate("/inventory")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Inventory <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sold inventory data available</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]/60 hover:border-[#475569] transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 w-4">{idx + 1}</span>
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
                        {p.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 ml-6 block mt-0.5">
                      Stock: <strong className="text-slate-200">{p.stock ?? 0} units</strong>
                      {p.sales > 0 && <> · <span className="text-emerald-400 font-semibold">{p.sales} sold</span></>}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {p.revenue > 0 ? (
                      <span className="text-xs font-mono font-bold text-white block">{formatCurrency(p.revenue)}</span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cheques Due & Overdue */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle size={18} className={hasOverdueCheques ? "text-red-400" : "text-amber-400"} />
                {hasOverdueCheques ? "Overdue Cheques" : "Upcoming Cheques"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasOverdueCheques
                  ? `${overdueCheques.length} overdue — immediate attention required`
                  : `${pendingCheques.length} pending clearance`}
              </p>
            </div>
            <button
              onClick={() => navigate("/finance")}
              className={`text-xs ${hasOverdueCheques ? "text-red-400 hover:text-red-300" : "text-amber-400 hover:text-amber-300"} font-semibold flex items-center gap-1`}
            >
              Finance <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#0f172a] flex-1">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-slate-300 text-xs border-b border-[#334155] font-bold">
                  <th className="py-2.5 px-3 text-left">Ref #</th>
                  <th className="py-2.5 px-3 text-left">Party</th>
                  <th className="py-2.5 px-3 text-left">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {displayCheques.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                      No cheques recorded
                    </td>
                  </tr>
                ) : (
                  displayCheques.map((chq: any, idx: number) => {
                    const dueDate = new Date(chq.date || chq.dueDate || "");
                    const isOverdue = dueDate <= new Date();
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-[#334155]/60 text-xs ${
                          isOverdue ? "bg-red-950/20" : idx % 2 ? "bg-[#111b2d]" : "bg-[#0f172a]"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                          {chq.referenceNumber || chq.transactionNumber || `—`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 truncate max-w-[120px]">
                          {chq.party || chq.customerName || chq.bank || "—"}
                        </td>
                        <td className={`py-2.5 px-3 ${isOverdue ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                          {!isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {formatCurrency(Number(chq.amount) || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════ 5. RECENT ORDERS & SALESMAN PERFORMANCE ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Recent Orders</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest {Math.min(5, recentOrders.length)} of {orders.length} orders</p>
            </div>
            <button
              onClick={() => navigate("/orders")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#0f172a]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-slate-300 text-xs border-b border-[#334155] font-bold uppercase">
                  <th className="p-3 text-left">Order</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Officer</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs text-slate-500">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord, idx) => (
                    <tr
                      key={ord.id}
                      onClick={() => navigate(`/orders/${ord.id}`)}
                      className={`border-b border-[#334155]/60 cursor-pointer hover:bg-[#1e293b] transition-colors ${
                        idx % 2 ? "bg-[#111b2d]" : "bg-[#0f172a]"
                      }`}
                    >
                      <td className="p-3 text-xs font-mono text-blue-400 font-bold whitespace-nowrap">
                        {ord.orderNumber || `ORD-${ord.id?.slice(0, 8)}`}
                      </td>
                      <td className="p-3 text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                        {ord.customerName || "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-400 truncate max-w-[100px]">
                        {(ord.salesman as any)?.fullName || ord.salesmanName || "—"}
                      </td>
                      <td className="p-3 text-xs font-bold text-white text-right font-mono whitespace-nowrap">
                        {ord.grandTotal ? formatCurrency(ord.grandTotal) : "—"}
                      </td>
                      <td className="p-3 text-xs">
                        <StatusBadge status={ord.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Officer Performance */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Sales Officer Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">Revenue from assigned orders by officer</p>
            </div>
            <button
              onClick={() => navigate("/sales-officers")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Officers <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3 flex-1">
            {salesmenPerformance.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-xs text-slate-500 text-center">
                  {salesOfficers.length === 0
                    ? "No sales officers registered"
                    : "No orders linked to any sales officer yet"}
                </p>
              </div>
            ) : (
              salesmenPerformance.map((so, idx) => (
                <div key={idx} className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-xs font-bold text-white">{so.name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({so.area})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrency(so.totalSales)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">· {so.ordersCount} orders</span>
                    </div>
                  </div>
                  {so.target > 0 ? (
                    <>
                      <div className="w-full bg-[#1e293b] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            so.progress >= 100 ? "bg-emerald-500" : so.progress >= 70 ? "bg-blue-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${so.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                        <span>Target: {formatCurrency(so.target)}</span>
                        <span
                          className={`font-bold ${
                            so.progress >= 100 ? "text-emerald-400" : so.progress >= 70 ? "text-blue-400" : "text-amber-400"
                          }`}
                        >
                          {so.progress}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">No target set</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
