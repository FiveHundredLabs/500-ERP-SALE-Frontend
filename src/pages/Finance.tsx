import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import FinanceTable from "../components/FinanceTable";
import RecordPaymentModal from "../components/RecordPaymentModal";
import type { RecordPaymentResult } from "../components/RecordPaymentModal";
import { getInvoiceCalculatedStatus } from "../types/invoice";
import InvoiceViewModal from "../components/InvoiceViewModal";
import { LoadingSpinner } from "../components/common";
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, RefreshCw,
  FileText, RotateCcw, Receipt, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import type { InvoiceResponse } from "../types/invoice";
import type { FinancePaymentData, FinanceTransaction } from "../types/finance";
import type { InvoiceReturn } from "../types/invoice-return";
import { invoiceService } from "../services/InvoiceService";
import { financeService } from "../services/FinanceService";
import { invoiceReturnService } from "../services/InvoiceReturnService";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import CustomConfirm from "../components/CustomConfirm";
import InvoiceCanvas from "../components/InvoiceCanvas";
import UserProfileDropdown from "../components/UserProfileDropdown";
import ThemeToggle from "../components/ThemeToggle";

// ─── Types ──────────────────────────────────────────────────────────────────
type FinanceTab = "transactions" | "invoices" | "returns";

// ─── KPI Card Component ──────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, iconBg, valueColor, sub, trend }) => (
  <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-[#475569] transition-all duration-200">
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
    </div>
    <div className="flex items-end justify-between gap-2">
      <span className={`text-xl font-bold font-mono ${valueColor} leading-tight`}>{value}</span>
      {trend && (
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-400"}`}>
          {trend === "up" ? <ArrowUpRight size={12} /> : trend === "down" ? <ArrowDownRight size={12} /> : null}
        </span>
      )}
    </div>
    {sub && <p className="text-[11px] text-gray-500 leading-tight">{sub}</p>}
  </div>
);

// ─── Returns Tab ─────────────────────────────────────────────────────────────
interface ReturnsTabProps { returns: InvoiceReturn[]; loading: boolean; searchQuery: string; }

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  approved: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ReturnsTab: React.FC<ReturnsTabProps> = ({ returns, loading, searchQuery }) => {
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return returns;
    return returns.filter(r =>
      r.returnNumber.toLowerCase().includes(q) ||
      r.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
      r.customer?.fullName?.toLowerCase().includes(q) ||
      r.returnReason?.toLowerCase().includes(q)
    );
  }, [returns, searchQuery]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text="Loading returns..." />
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-[#334155]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1e293b] border-b border-[#334155]">
            {["Return #", "Invoice #", "Customer", "Items", "Return Total", "Reason", "Status", "Date"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e293b]">
          {filtered.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-12 text-gray-500">No returns found</td></tr>
          ) : filtered.map(r => {
            const customer = r.customer;
            return (
              <tr key={r.id} className="bg-[#0f172a] hover:bg-[#1e293b]/70 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-red-400">{r.returnNumber}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-cyan-400">{r.invoice?.invoiceNumber || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-200 text-xs">{customer?.shopName || customer?.fullName || "Walk-in"}</div>
                  {customer?.phone && <div className="text-[10px] text-gray-500">{customer.phone}</div>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-bold text-gray-300">{r.items?.length ?? 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-red-400">LKR {Math.round(r.returnTotal).toLocaleString()}/=</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-300 max-w-[140px] block truncate" title={r.returnReason}>{r.returnReason}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[r.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Transactions Tab ─────────────────────────────────────────────────────────
interface TransactionsTabProps { transactions: FinanceTransaction[]; loading: boolean; searchQuery: string; typeFilter: "all" | "payment" | "refund"; }

const TransactionsTab: React.FC<TransactionsTabProps> = ({ transactions, loading, searchQuery, typeFilter }) => {
  const filtered = useMemo(() => {
    let data = transactions;
    if (typeFilter !== "all") data = data.filter(t => t.transactionType === typeFilter);
    const q = searchQuery.toLowerCase().trim();
    if (q) data = data.filter(t =>
      t.transactionNumber.toLowerCase().includes(q) ||
      t.invoiceNumber.toLowerCase().includes(q) ||
      (t.transactionRef ?? "").toLowerCase().includes(q)
    );
    return data.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  }, [transactions, searchQuery, typeFilter]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" text="Loading transactions..." />
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-[#334155]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1e293b] border-b border-[#334155]">
            {["Transaction #", "Type", "Invoice #", "Method", "Ref", "Amount", "Date"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e293b]">
          {filtered.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-12 text-gray-500">No transactions found</td></tr>
          ) : filtered.map(t => {
            const isRefund = t.transactionType === "refund";
            return (
              <tr key={t.id} className={`hover:bg-[#1e293b]/70 transition-colors ${isRefund ? "bg-red-950/10" : "bg-[#0f172a]"}`}>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs font-bold ${isRefund ? "text-red-400" : "text-emerald-400"}`}>
                    {t.transactionNumber}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isRefund
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}>
                    {isRefund ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {isRefund ? "Refund" : "Payment"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-cyan-400">{t.invoiceNumber}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-300 capitalize">{(t.paymentMethod ?? "").replaceAll("_", " ")}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400 font-mono">{t.transactionRef || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-sm font-bold ${isRefund ? "text-red-400" : "text-emerald-400"}`}>
                    {isRefund ? "-" : "+"}LKR {Math.abs(Math.round(t.amount)).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                  {new Date(t.transactionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Finance Page ────────────────────────────────────────────────────────
const Finance: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<FinanceTab>("invoices");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "payment" | "refund">("all");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Data State ───────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [invoiceReturns, setInvoiceReturns] = useState<InvoiceReturn[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Modal State ──────────────────────────────────────────────────────────
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [selectedInvoiceRemaining, setSelectedInvoiceRemaining] = useState(0);
  const [selectedInvoicePaid, setSelectedInvoicePaid] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title?: string; message: string;
    confirmText?: string; cancelText?: string; type?: "warning" | "danger" | "info";
    onConfirm: () => void;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadAll = async () => {
    try {
      setLoading(true);
      const [invData, txData, retData] = await Promise.allSettled([
        invoiceService.getAll(),
        financeService.getAll(),
        invoiceReturnService.getAll(),
      ]);
      if (invData.status === "fulfilled") setInvoices(invData.value);
      if (txData.status === "fulfilled") setFinanceTransactions(txData.value);
      if (retData.status === "fulfilled") setInvoiceReturns(retData.value);
    } catch {
      setAlert({ type: "error", message: "Failed to load finance data. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // ─── KPI Computations ─────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const payments = financeTransactions.filter(t => t.transactionType === "payment" && t.amount > 0);
    const cashRefunds = financeTransactions.filter(t => t.transactionType === "refund");

    const totalRevenue = payments.reduce((s, t) => s + Math.abs(t.amount), 0);
    const cashRefundsTotal = cashRefunds.reduce((s, t) => s + Math.abs(t.amount), 0);

    // Sum of all completed invoice return amounts
    const completedReturnsTotal = invoiceReturns
      .filter(r => r.status === "completed")
      .reduce((s, r) => s + (Number(r.returnTotal) || 0), 0);

    // Total returns: sum of completed returns (or cash refund transactions if higher)
    const totalReturns = completedReturnsTotal > 0 ? completedReturnsTotal : cashRefundsTotal;

    // Real Outstanding: remaining on unpaid invoices minus completed returns on those invoices
    const outstanding = invoices
      .filter(inv => ["pending", "overdue", "outstanding", "partially_paid"].includes(inv.paymentStatus))
      .reduce((s, inv) => {
        const remaining = inv.remainingAmount ?? (inv.totalAmount - (inv.paidAmount ?? 0));
        const returnedOnThis = invoiceReturns
          .filter(r => r.invoiceId === inv.id && r.status === "completed")
          .reduce((sum, r) => sum + (Number(r.returnTotal) || 0), 0);
        return s + Math.max(0, remaining - returnedOnThis);
      }, 0);

    const pendingReturns = invoiceReturns.filter(r => r.status === "pending" || r.status === "approved").length;
    const completedReturns = invoiceReturns.filter(r => r.status === "completed").length;

    const netRevenue = totalRevenue - cashRefundsTotal;

    return { totalRevenue, totalReturns, netRevenue, outstanding, pendingReturns, completedReturns };
  }, [financeTransactions, invoices, invoiceReturns]);

  // ─── Invoice Filtering (Invoices Tab) ─────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customer as any)?.fullName?.toLowerCase().includes(q) ||
      (inv.customer as any)?.shopName?.toLowerCase().includes(q) ||
      inv.paymentStatus.toLowerCase().includes(q)
    );
  }, [invoices, globalSearch]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleMarkAsPaid = (invoice: InvoiceResponse) => {
    const calc = getInvoiceCalculatedStatus(invoice);
    setSelectedInvoice(invoice);
    setSelectedInvoiceRemaining(calc.remainingAmount);
    setSelectedInvoicePaid(calc.paidAmount);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (result: RecordPaymentResult) => {
    if (!selectedInvoice) return;
    try {
      setIsProcessingPayment(true);
      const transactionId = await financeService.getNextId();
      const paymentData: FinancePaymentData = {
        transactionNumber: transactionId,
        transactionDate: new Date(result.transactionDate).toISOString(),
        transactionType: "payment",
        paymentMethod: result.method,
        bankName: result.bankName || undefined,
        transactionRef: result.transactionRef,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        amount: result.amount,
      };
      await financeService.create(paymentData);
      // Smart status: full payment → completed, partial → partially_paid
      const isFullPayment = Math.abs(result.amount - selectedInvoiceRemaining) < 0.01;
      const newStatus = isFullPayment ? "completed" : "partially_paid";
      const newPaid = (selectedInvoice.paidAmount || 0) + result.amount;
      const newRemaining = Math.max(0, selectedInvoice.totalAmount - newPaid);

      await Promise.allSettled([
        invoiceService.update(selectedInvoice.id, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newStatus as any,
        }),
        invoiceService.updatePaymentStatus(selectedInvoice.id, newStatus as any),
      ]);

      setAlert({ type: "success", message: `Payment of LKR ${Math.round(result.amount).toLocaleString()} recorded for ${selectedInvoice.invoiceNumber}` });
      await loadAll();
      setShowPaymentModal(false);
    } catch (error: any) {
      setAlert({ type: "error", message: error?.response?.data?.message || error?.message || "Failed to process payment." });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleViewInvoice = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
    setShowInvoiceView(true);
  };

  const handleDownloadInvoice = async (invoice: InvoiceResponse) => {
    if (!invoice) return;
    const proceedWithDownload = async () => {
      try {
        setIsGeneratingPDF(true);
        setAlert({ type: "info", message: "Generating PDF... Please wait." });
        const tempContainer = document.createElement("div");
        Object.assign(tempContainer.style, {
          position: "fixed", left: "0", top: "0", width: "210mm",
          minHeight: "297mm", backgroundColor: "white", zIndex: "9999", opacity: "0", overflow: "hidden",
        });
        document.body.appendChild(tempContainer);
        const invoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          customer: typeof invoice.customer === "object" ? (invoice.customer as any)?.id || "" : invoice.customer,
          customerDetails: (typeof invoice.customer === "object" ? invoice.customer : undefined) as any,
          items: invoice.items.map((item: any) => ({
            id: item.id || Date.now().toString(), inventoryItemId: item.inventoryItemId,
            itemName: item.itemName || item.inventoryItem?.productName || "Item",
            itemCode: item.itemCode || item.inventoryItem?.productCode || "",
            discount: item.discount || 0, quantity: item.quantity, unitPrice: item.unitPrice, total: item.total,
          })),
          subTotal: invoice.subTotal, discount: invoice.discount,
          discountPercentage: invoice.discount > 0 ? (invoice.discount / invoice.subTotal) * 100 : 0,
          totalAmount: invoice.totalAmount, paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod, bankDepositDate: invoice.bankDepositDate,
          issueDate: invoice.issueDate, dueDate: invoice.dueDate,
          vehicleNumber: invoice.vehicleNumber, notes: invoice.notes,
          applyVat: invoice.applyVat ?? false, vatAmount: invoice.vatAmount ?? 0, taxRate: invoice.taxRate ?? 0,
        };
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(tempContainer);
        root.render(
          <div style={{ width: "210mm", minHeight: "297mm", backgroundColor: "white", padding: "0", margin: "0", boxSizing: "border-box", overflow: "hidden" }}>
            <InvoiceCanvas invoiceData={invoiceData} />
          </div>
        );
        await new Promise(resolve => setTimeout(resolve, 500));
        const invoiceElement = tempContainer.firstChild as HTMLElement;
        if (!invoiceElement) throw new Error("Invoice element not found");
        const canvas = await html2canvas(invoiceElement, {
          scale: 3, useCORS: true, allowTaint: true, logging: false, backgroundColor: "#ffffff",
          width: 794, height: 1123, windowWidth: 794, windowHeight: 1123,
        });
        const imgData = canvas.toDataURL("image/png", 1.0);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, (canvas.height * pageWidth) / canvas.width);
        pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
        root.unmount();
        document.body.removeChild(tempContainer);
        setAlert({ type: "success", message: "PDF downloaded successfully!" });
      } catch (error) {
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Failed to generate PDF." });
      } finally {
        setIsGeneratingPDF(false);
      }
    };
    await proceedWithDownload();
  };

  // ─── Tab Config ───────────────────────────────────────────────────────────
  const tabs: { id: FinanceTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "invoices",      label: "Invoices",     icon: <FileText size={14} />,   count: invoices.length },
    { id: "transactions",  label: "Transactions", icon: <Receipt size={14} />,    count: financeTransactions.length },
    { id: "returns",       label: "Returns",      icon: <RotateCcw size={14} />,  count: invoiceReturns.length },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {alert && (
          <CustomAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} duration={3000} />
        )}
        <CustomConfirm
          isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message}
          confirmText={confirmConfig.confirmText} cancelText={confirmConfig.cancelText} type={confirmConfig.type}
          onConfirm={() => { confirmConfig.onConfirm(); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />

        {/* Header */}
        <div className="h-[68px] bg-[#1e293b]/90 backdrop-blur-xl border-b border-[#334155] flex items-center justify-between px-4 sm:px-6 shadow-lg relative z-40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <h1 className="text-[1.15rem] font-bold text-gray-100 leading-tight tracking-tight">Finance & Accounts</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAll}
              disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <ThemeToggle />
            <UserProfileDropdown />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Total Revenue"
              value={`LKR ${Math.round(kpi.totalRevenue).toLocaleString()}`}
              icon={<TrendingUp size={16} className="text-emerald-400" />}
              iconBg="bg-emerald-500/15"
              valueColor="text-emerald-400"
              sub={`${financeTransactions.filter(t => t.transactionType === "payment").length} payment(s)`}
              trend="up"
            />
            <KpiCard
              label="Outstanding"
              value={`LKR ${Math.round(kpi.outstanding).toLocaleString()}`}
              icon={<AlertCircle size={16} className="text-amber-400" />}
              iconBg="bg-amber-500/15"
              valueColor="text-amber-400"
              sub={`${invoices.filter(i => ["pending", "overdue", "outstanding"].includes(i.paymentStatus)).length} unpaid invoice(s)`}
            />
            <KpiCard
              label="Total Returns"
              value={`LKR ${Math.round(kpi.totalReturns).toLocaleString()}`}
              icon={<TrendingDown size={16} className="text-red-400" />}
              iconBg="bg-red-500/15"
              valueColor="text-red-400"
              sub={`${kpi.completedReturns} completed · ${kpi.pendingReturns} pending`}
              trend="down"
            />
            <KpiCard
              label="Net Revenue"
              value={`LKR ${Math.round(kpi.netRevenue).toLocaleString()}`}
              icon={<DollarSign size={16} className="text-blue-400" />}
              iconBg="bg-blue-500/15"
              valueColor={kpi.netRevenue >= 0 ? "text-blue-300" : "text-red-400"}
              sub="Revenue minus refunds"
            />
          </div>

          {/* Search + Tabs Row */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Tab Buttons */}
            <div className="flex gap-1 bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#1e293b]"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-[#334155] text-gray-400"
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="flex-1 w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />

            {/* Transaction Type Filter (only on transactions tab) */}
            {activeTab === "transactions" && (
              <div className="flex gap-1 bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
                {(["all", "payment", "refund"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTxTypeFilter(f)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold capitalize transition-colors ${
                      txTypeFilter === f
                        ? f === "refund" ? "bg-red-600 text-white" : f === "payment" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >{f}</button>
                ))}
              </div>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === "invoices" && (
            loading ? (
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" text="Loading invoices..." />
              </div>
            ) : (
              <FinanceTable
                invoices={filteredInvoices}
                loading={false}
                onViewInvoice={handleViewInvoice}
                onDownloadInvoice={handleDownloadInvoice}
                onMarkAsPaid={handleMarkAsPaid}
                financeTransactions={financeTransactions}
                invoiceReturns={invoiceReturns.map(r => ({
                  id: r.id,
                  invoiceId: r.invoiceId,
                  returnNumber: r.returnNumber,
                  returnTotal: Number(r.returnTotal),
                  status: r.status,
                }))}
              />
            )
          )}

          {activeTab === "transactions" && (
            <TransactionsTab
              transactions={financeTransactions}
              loading={loading}
              searchQuery={globalSearch}
              typeFilter={txTypeFilter}
            />
          )}

          {activeTab === "returns" && (
            <ReturnsTab
              returns={invoiceReturns}
              loading={loading}
              searchQuery={globalSearch}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentSubmit}
        isProcessing={isProcessingPayment}
        documentNumber={selectedInvoice?.invoiceNumber ?? ""}
        partyName={(selectedInvoice?.customer as any)?.shopName || (selectedInvoice?.customer as any)?.fullName || ""}
        totalAmount={selectedInvoice?.totalAmount ?? 0}
        paidAmount={selectedInvoicePaid}
        remainingAmount={selectedInvoiceRemaining}
        mode="invoice"
      />
      <InvoiceViewModal
        isOpen={showInvoiceView}
        onClose={() => setShowInvoiceView(false)}
        selectedInvoice={selectedInvoice}
        onDownloadInvoice={handleDownloadInvoice}
        isGeneratingPDF={isGeneratingPDF}
      />
    </div>
  );
};

export default Finance;
