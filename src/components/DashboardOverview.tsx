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
  RotateCcw,
  Plus,
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
import { poReturnService } from "../services/POReturnService";
import type { InvoiceResponse } from "../types/invoice";
import type { Order } from "../types/orders";
import type { PurchaseOrder } from "../types/purchaseOrders";
import type { InventoryItem } from "../types/inventory";
import type { Supplier } from "../types/suppliers";
import type { SalesOfficer } from "../types/salesOfficer";
import type { InvoiceReturn } from "../types/invoice-return";
import type { PurchaseOrderReturn } from "../types/po-return";
import CreateReturnModal from "./invoice/CreateReturnModal";
import CreatePOReturnModal from "./orders/CreatePOReturnModal";

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
  const [poReturns, setPoReturns] = useState<PurchaseOrderReturn[]>([]);

  // Modals for Returns Hub
  const [isCreateInvoiceReturnOpen, setIsCreateInvoiceReturnOpen] = useState(false);
  const [isCreatePOReturnOpen, setIsCreatePOReturnOpen] = useState(false);

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

    const [invs, ords, pos, invItems, custs, sups, officers, finTransactions, returnsList, poReturnsList] = await Promise.all([
      safe(invoiceService.getAll(), [], "Invoices"),
      safe(orderService.getAll(), [], "Orders"),
      safe(purchaseOrderService.getAll(), [], "Purchase Orders"),
      safe(inventoryService.getAll(), [], "Inventory"),
      safe(invoiceService.getAllCustomers(), [], "Customers"),
      safe(supplierService.getAll(), [], "Suppliers"),
      safe(salesOfficerService.getAll(), [], "Sales Officers"),
      safe(financeService.getAll(), [], "Finance"),
      safe(invoiceReturnService.getAll(), [], "Invoice Returns"),
      safe(poReturnService.getAll(), [], "PO Returns"),
    ]);

    setInvoices(invs);
    setOrders(ords);
    setPurchaseOrders(pos);
    setInventoryItems(invItems);
    setCustomers(custs);
    setSuppliers(sups);
    setSalesOfficers(officers);
    setInvoiceReturns(returnsList);
    setPoReturns(poReturnsList);

    // Map cheques from finance transactions
    const chequeFinTransactions = finTransactions
      .filter((t: any) => String(t.paymentMethod || "").toLowerCase() === "cheque")
      .map((t: any) => {
        const matchingInv = invs.find(
          (i: any) => i.invoiceNumber === t.invoiceNumber || i.id === t.invoiceId
        );
        const party =
          matchingInv?.customer?.shopName ||
          matchingInv?.customer?.fullName ||
          (typeof matchingInv?.customer === "string" ? matchingInv.customer : "") ||
          matchingInv?.customerDetails?.shopName ||
          matchingInv?.customerDetails?.fullName ||
          t.bankName ||
          "Customer";
        const dueDate = t.transactionDate || matchingInv?.dueDate || matchingInv?.issueDate || t.createdAt;

        return {
          id: t.id,
          referenceNumber: t.transactionRef || t.transactionNumber || "—",
          transactionNumber: t.transactionNumber,
          party,
          bank: t.bankName || "—",
          date: dueDate,
          dueDate: dueDate,
          transactionDate: t.transactionDate,
          amount: Number(t.amount) || 0,
          status: (t as any).status || "pending",
          invoiceNumber: t.invoiceNumber,
        };
      });

    // Also include any invoices where paymentMethod is cheque that might not have a finance transaction yet
    const chequeInvoices = invs
      .filter(
        (i: any) =>
          String(i.paymentMethod || "").toLowerCase() === "cheque" &&
          !chequeFinTransactions.some((ct: any) => ct.invoiceNumber === i.invoiceNumber)
      )
      .map((i: any) => {
        const party =
          i.customer?.shopName ||
          i.customer?.fullName ||
          (typeof i.customer === "string" ? i.customer : "") ||
          i.customerDetails?.shopName ||
          i.customerDetails?.fullName ||
          "Customer";
        const dueDate = i.dueDate || i.issueDate || i.createdAt;

        return {
          id: i.id,
          referenceNumber: i.invoiceNumber,
          transactionNumber: i.invoiceNumber,
          party,
          bank: "—",
          date: dueDate,
          dueDate: dueDate,
          transactionDate: dueDate,
          amount: Number(i.remainingAmount ?? i.totalAmount) || 0,
          status: i.paymentStatus === "completed" || i.paymentStatus === "paid" ? "cleared" : "pending",
          invoiceNumber: i.invoiceNumber,
        };
      });

    const allCheques = [...chequeFinTransactions, ...chequeInvoices];
    setCheques(allCheques);

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

    // 2. PO Stage: Only pending Purchase Orders (excluding approved, goods_received, completed, cancelled)
    const poStage = purchaseOrders.filter(
      (p) =>
        (p.status as string) === "pending_approval" ||
        (p.status as string) === "pending" ||
        (p.status as string) === "draft"
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

  // ── Top Selling Products (Amount-Wise / Best Sales Revenue) ──────────────
  const topSellingProducts = useMemo(() => {
    const salesByProduct = new Map<
      string,
      { name: string; code: string; sales: number; revenue: number; stock: number }
    >();

    // Index inventory items for rapid lookup of stock & code
    const invMap = new Map<string, InventoryItem>();
    inventoryItems.forEach((inv) => {
      if (inv.id) invMap.set(inv.id, inv);
      if (inv.productCode) invMap.set(inv.productCode.toLowerCase(), inv);
      if (inv.productName) invMap.set(inv.productName.trim().toLowerCase(), inv);
    });

    // 1. Aggregate from invoice items
    invoices.forEach((inv) => {
      (inv.items || []).forEach((it: any) => {
        const rawName = (it.itemName || it.productName || '').trim();
        if (!rawName) return;
        const normKey = rawName.toLowerCase();

        const lineRevenue = Number(
          it.total ?? Number(it.quantity || 0) * Number(it.unitPrice || 0),
        );
        const lineQty = Number(it.quantity || 0);

        const matchedInv =
          (it.inventoryItemId && invMap.get(it.inventoryItemId)) ||
          (it.itemCode && invMap.get(it.itemCode.toLowerCase())) ||
          invMap.get(normKey);

        const code = it.itemCode || it.productCode || matchedInv?.productCode || '—';
        const stock = matchedInv?.quantity ?? 0;

        const existing = salesByProduct.get(normKey);
        if (existing) {
          existing.sales += lineQty;
          existing.revenue += lineRevenue;
          if (existing.code === '—' && code !== '—') existing.code = code;
          if (existing.stock === 0 && stock > 0) existing.stock = stock;
        } else {
          salesByProduct.set(normKey, {
            name: rawName,
            code,
            sales: lineQty,
            revenue: lineRevenue,
            stock,
          });
        }
      });
    });

    // 2. Incorporate inventory items with soldCount * sellPrice
    inventoryItems.forEach((inv) => {
      const rawName = (inv.productName || '').trim();
      if (!rawName) return;
      const normKey = rawName.toLowerCase();
      const invRev = Number(inv.soldCount || 0) * Number(inv.sellPrice || 0);
      const invQty = Number(inv.soldCount || 0);
      if (invRev > 0 || invQty > 0) {
        const existing = salesByProduct.get(normKey);
        if (existing) {
          if (existing.revenue < invRev) existing.revenue = invRev;
          if (existing.sales < invQty) existing.sales = invQty;
        } else {
          salesByProduct.set(normKey, {
            name: rawName,
            code: inv.productCode || '—',
            sales: invQty,
            revenue: invRev,
            stock: inv.quantity ?? 0,
          });
        }
      }
    });

    // 3. Sort strictly amount-wise descending (highest sales revenue first)
    return Array.from(salesByProduct.values())
      .filter((p) => p.revenue > 0 || p.sales > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [invoices, inventoryItems]);

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

  // ── Overdue Cheques (due date < start of today) ───────────────────────────────────
  const overdueCheques = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return cheques
      .filter((chq) => {
        const rawDate = chq.dueDate || chq.transactionDate || chq.date || chq.issueDate || "";
        const due = new Date(rawDate);
        return (
          !isNaN(due.getTime()) &&
          due < startOfToday &&
          chq.status !== "cleared" &&
          chq.status !== "paid"
        );
      })
      .sort((a, b) => {
        const da = new Date(a.dueDate || a.transactionDate || a.date || "").getTime();
        const db = new Date(b.dueDate || b.transactionDate || b.date || "").getTime();
        return da - db;
      })
      .slice(0, 6);
  }, [cheques]);

  const pendingCheques = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return cheques
      .filter((chq) => {
        const rawDate = chq.dueDate || chq.transactionDate || chq.date || chq.issueDate || "";
        const due = new Date(rawDate);
        return (
          !isNaN(due.getTime()) &&
          due >= startOfToday &&
          chq.status !== "cleared" &&
          chq.status !== "paid"
        );
      })
      .sort((a, b) => {
        const da = new Date(a.dueDate || a.transactionDate || a.date || "").getTime();
        const db = new Date(b.dueDate || b.transactionDate || b.date || "").getTime();
        return da - db;
      })
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
          value={formatCurrency(totalRevenue)}
          subtitle={`${formatCurrency(collectedRevenue)} collected · ${formatCurrency(outstandingReceivables)} pending`}
          icon={<DollarSign size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/20 border border-purple-500/30"
          onClick={() => navigate("/invoice")}
        />
        <KpiCard
          title="Receivables Outstanding"
          value={formatCurrency(outstandingReceivables)}
          subtitle={`${unpaidInvoiceCount} invoices · ${overdueInvoiceCount > 0 ? `⚠ ${overdueInvoiceCount} overdue` : 'none overdue'}`}
          icon={<CreditCard size={20} className="text-amber-400" />}
          iconBg={overdueInvoiceCount > 0 ? "bg-red-500/20 border border-red-500/30" : "bg-amber-500/20 border border-amber-500/30"}
          onClick={() => navigate("/finance")}
        />
      </div>

      {/* ══════════════ 2. OPERATIONAL COUNTERS STRIP ══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Customers", value: customers.length, color: "blue", icon: <Users size={18} />, link: "/customers" },
          { label: "Suppliers", value: suppliers.length, color: "indigo", icon: <Truck size={18} />, link: "/suppliers" },
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
                Invoiced revenue vs collected · {formatCurrency(totalRevenue)} total
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
        {/* Most Sales Products (Amount-Wise) */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-400" />
                Most Sales Products
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Top products ranked by sales revenue · Total products: {totalProductsCount}</p>
            </div>
            <button
              onClick={() => navigate("/inventory")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Inventory <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sales data available</p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]/60 hover:border-[#475569] transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      {p.code && p.code !== '—' && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0">
                          {p.code}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 ml-7 block mt-0.5">
                      Stock: <strong className="text-slate-200">{p.stock ?? 0} units</strong>
                      {p.sales > 0 && <> · <span className="text-emerald-400 font-semibold">{p.sales} sold</span></>}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-mono font-bold text-emerald-400 block">
                      {formatCurrency(p.revenue)}
                    </span>
                    <span className="text-[10px] text-slate-400">Total Sales</span>
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
                    const rawDate = chq.dueDate || chq.transactionDate || chq.date || "";
                    const dueDate = new Date(rawDate);
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const isOverdue = !isNaN(dueDate.getTime()) && dueDate < startOfToday;
                    return (
                      <tr
                        key={chq.id || idx}
                        className={`border-b border-[#334155]/60 text-xs ${
                          isOverdue ? "bg-red-950/20" : idx % 2 ? "bg-[#111b2d]" : "bg-[#0f172a]"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                          {chq.referenceNumber || chq.transactionRef || chq.transactionNumber || chq.invoiceNumber || `—`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 truncate max-w-[120px]">
                          {chq.party || chq.customerName || chq.bank || "—"}
                        </td>
                        <td className={`py-2.5 px-3 ${isOverdue ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                          {!isNaN(dueDate.getTime()) ? dueDate.toLocaleDateString("en-GB") : "—"}
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

      {/* ══════════════ 5. RETURNS & INVENTORY ADJUSTMENTS HUB ══════════════ */}
      <div className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#111827] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <RotateCcw size={20} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Returns & Inventory Adjustments Hub
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage customer sales returns and supplier purchase returns with real-time stock & balance synchronization
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-10">
          {/* Left Card: Customer / Invoice Returns */}
          <div className="bg-[#0f172a]/90 border border-blue-500/30 hover:border-blue-500/60 rounded-xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 group-hover:scale-105 transition-transform">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Customer / Invoice Returns
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                      Sales
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Process returned items from customer invoices, restock items, and adjust credit accounts
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-[#1e293b]/60 p-3 rounded-xl border border-[#334155]/60">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Total Returns</span>
                <span className="text-lg font-bold font-mono text-white">
                  {invoiceReturns.length}{" "}
                  <span className="text-xs text-slate-400 font-normal">
                    ({invoiceReturns.filter((r) => r.status === "completed").length} completed)
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Total Refund / Credit</span>
                <span className="text-lg font-bold font-mono text-blue-400">
                  {formatCurrency(
                    invoiceReturns
                      .filter((r) => r.status !== "cancelled")
                      .reduce((sum, r) => sum + Number(r.returnTotal || 0), 0)
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreateInvoiceReturnOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Plus size={15} /> New Invoice Return
              </button>
              <button
                type="button"
                onClick={() => navigate("/invoice-returns")}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                View History <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Right Card: Supplier / PO Returns */}
          <div className="bg-[#0f172a]/90 border border-purple-500/30 hover:border-purple-500/60 rounded-xl p-5 shadow-lg transition-all flex flex-col justify-between space-y-4 group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 group-hover:scale-105 transition-transform">
                  <Truck size={22} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Supplier / Purchase Order Returns
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30 font-semibold">
                      Purchasing
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Return defective or excess stock back to suppliers and generate official debit notes
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 bg-[#1e293b]/60 p-3 rounded-xl border border-[#334155]/60">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Total PO Returns</span>
                <span className="text-lg font-bold font-mono text-white">
                  {poReturns.length}{" "}
                  <span className="text-xs text-slate-400 font-normal">
                    ({poReturns.filter((r) => r.status === "completed").length} completed)
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">Total Debit Amount</span>
                <span className="text-lg font-bold font-mono text-purple-400">
                  {formatCurrency(
                    poReturns
                      .filter((r) => r.status !== "cancelled")
                      .reduce((sum, r) => sum + Number(r.returnTotal || 0), 0)
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatePOReturnOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
              >
                <Plus size={15} /> New PO Return
              </button>
              <button
                type="button"
                onClick={() => navigate("/po-returns")}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 border border-[#334155] font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                View History <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE INVOICE RETURN MODAL */}
      <CreateReturnModal
        isOpen={isCreateInvoiceReturnOpen}
        onClose={() => setIsCreateInvoiceReturnOpen(false)}
        onSuccess={(newReturn) => {
          if (newReturn) {
            setInvoiceReturns((prev) => [newReturn, ...prev]);
          } else {
            loadDashboardData();
          }
        }}
      />

      {/* CREATE PO RETURN MODAL */}
      <CreatePOReturnModal
        isOpen={isCreatePOReturnOpen}
        onClose={() => setIsCreatePOReturnOpen(false)}
        onSuccess={(newReturn) => {
          if (newReturn) {
            setPoReturns((prev) => [newReturn, ...prev]);
          } else {
            loadDashboardData();
          }
        }}
      />
    </div>
  );
};

export default DashboardOverview;
