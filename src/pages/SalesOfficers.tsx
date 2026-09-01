import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import {
  UserCheck,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Clock,
  ShieldAlert,
  CheckCircle,
  Eye,
  MessageCircle,
  Edit2,
  Trash2,
  Users,
  MapPin,
  RefreshCw,
} from "lucide-react";
import type { SalesOfficer, SalesOfficerFilterPeriod } from "../types/salesOfficer";
import type { InvoiceResponse } from "../types/invoice";
import type { Order } from "../types/orders";
import { salesOfficerService } from "../services/SalesOfficerService";
import { invoiceService } from "../services/InvoiceService";
import { orderService } from "../services/OrderService";
import SalesOfficerModal from "../components/salesOfficers/SalesOfficerModal";
import InvoiceViewModal from "../components/invoice/InvoiceViewModal";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import CustomConfirm from "../components/CustomConfirm";

export const SalesOfficers: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Data states
  const [officers, setOfficers] = useState<SalesOfficer[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("ALL");
  const [period, setPeriod] = useState<SalesOfficerFilterPeriod>({
    type: "all",
    label: "All Time",
  });
  const [customDates, setCustomDates] = useState({ startDate: "", endDate: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "pending" | "overdue">("all");

  // Modal states
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [officerModalMode, setOfficerModalMode] = useState<"create" | "edit">("create");
  const [editingOfficer, setEditingOfficer] = useState<SalesOfficer | null>(null);

  // Invoice view modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [showInvoiceView, setShowInvoiceView] = useState(false);

  // Alert & Confirm
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [officersData, invoicesData, ordersData] = await Promise.all([
        salesOfficerService.getAll(),
        invoiceService.getAll(),
        orderService.getAll().catch(() => []),
      ]);
      setOfficers(officersData);
      setInvoices(invoicesData);
      setOrders(ordersData);
    } catch (error) {
      setAlert({
        type: "error",
        message: "Failed to load sales officers or invoices.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Currently active selected officer object
  const currentOfficer = useMemo(() => {
    if (selectedOfficerId === "ALL") return "ALL";
    return officers.find((o) => o.id === selectedOfficerId || o.officerId === selectedOfficerId) || "ALL";
  }, [selectedOfficerId, officers]);

  // Filter invoices by timeframe
  const periodFilteredInvoices = useMemo(() => {
    return salesOfficerService.filterRecordsByPeriod(invoices, period);
  }, [invoices, period]);

  // Filter orders by timeframe
  const periodFilteredOrders = useMemo(() => {
    return salesOfficerService.filterRecordsByPeriod(orders, period);
  }, [orders, period]);

  // Calculate real-time performance summary
  const performance = useMemo(() => {
    return salesOfficerService.calculateOfficerPerformance(
      currentOfficer,
      periodFilteredInvoices,
      periodFilteredOrders
    );
  }, [currentOfficer, periodFilteredInvoices, periodFilteredOrders]);

  // Invoices filtered by active officer selection & search & tab
  const displayedInvoices = useMemo(() => {
    let list = periodFilteredInvoices;

    // Filter by officer
    if (selectedOfficerId !== "ALL") {
      const officer = officers.find((o) => o.id === selectedOfficerId || o.officerId === selectedOfficerId);
      const officerName = officer ? officer.fullName : "";
      list = list.filter((inv: InvoiceResponse) => {
        const sName = inv.salesman?.fullName || inv.salesmanName || "";
        return sName === officerName || inv.salesman?.id === selectedOfficerId;
      });
    }

    // Filter by Tab (all, completed, pending, overdue)
    const now = new Date();
    if (activeTab === "completed") {
      list = list.filter((inv: InvoiceResponse) => inv.paymentStatus === "completed");
    } else if (activeTab === "pending") {
      list = list.filter((inv: InvoiceResponse) => {
        if (inv.paymentStatus === "completed") return false;
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        return !dueDate || dueDate >= now;
      });
    } else if (activeTab === "overdue") {
      list = list.filter((inv: InvoiceResponse) => {
        if (inv.paymentStatus === "completed") return false;
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        return dueDate && dueDate < now;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((inv: InvoiceResponse) => {
        const idMatch = inv.invoiceNumber.toLowerCase().includes(q);
        const custMatch = inv.customer?.fullName?.toLowerCase().includes(q);
        const sName = inv.salesman?.fullName || inv.salesmanName || "";
        const salesMatch = sName.toLowerCase().includes(q);
        return idMatch || custMatch || salesMatch;
      });
    }

    return list;
  }, [periodFilteredInvoices, selectedOfficerId, officers, activeTab, searchQuery]);

  // Handle Save Officer
  const handleSaveOfficer = async (data: Omit<SalesOfficer, "id" | "createdAt" | "updatedAt"> & { password?: string; assignedCustomers?: string[] }) => {
    try {
      if (officerModalMode === "create") {
        const created = await salesOfficerService.create(data);
        setOfficers((prev) => [created, ...prev]);
        setAlert({ type: "success", message: `Sales Officer "${created.fullName}" created successfully!` });
      } else if (editingOfficer) {
        const updated = await salesOfficerService.update(editingOfficer.id, data);
        setOfficers((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
        setAlert({ type: "success", message: `Sales Officer "${updated.fullName}" updated successfully!` });
      }
      setIsOfficerModalOpen(false);
      setEditingOfficer(null);
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save Sales Officer",
      });
    }
  };

  // Handle Delete Officer
  const handleDeleteOfficer = (officer: SalesOfficer) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Sales Officer",
      message: `Are you sure you want to remove ${officer.fullName} (${officer.officerId}) from the system?`,
      onConfirm: async () => {
        try {
          await salesOfficerService.delete(officer.id);
          setOfficers((prev) => prev.filter((o) => o.id !== officer.id));
          if (selectedOfficerId === officer.id) {
            setSelectedOfficerId("ALL");
          }
          setAlert({ type: "success", message: `Sales Officer "${officer.fullName}" removed.` });
        } catch (err) {
          setAlert({ type: "error", message: "Failed to delete officer." });
        }
      },
    });
  };

  const formatLKR = (amount: number) => {
    return `LKR ${Math.round(amount || 0).toLocaleString()}/=`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getCreditBadge = (inv: InvoiceResponse) => {
    if (inv.paymentStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle size={11} /> Settled
        </span>
      );
    }
    const now = new Date();
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    if (!dueDate) return <span className="text-gray-500 text-xs">—</span>;

    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <ShieldAlert size={11} /> Overdue ({Math.abs(diffDays)}d)
        </span>
      );
    } else if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Clock size={11} /> Due in {diffDays}d
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          On Track ({diffDays}d)
        </span>
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden font-sans">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#0f172a]">
        {/* Custom Alerts */}
        {alert && (
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            duration={3000}
          />
        )}

        <CustomConfirm
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type="danger"
          onConfirm={() => {
            confirmConfig.onConfirm();
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Top Header Bar */}
        <header className="px-6 py-4 border-b border-[#334155] bg-[#0f172a] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Sales Officers</h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {officers.length} Officers
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Track sales performance, invoices, collections, and credit recovery
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-[#334155] text-gray-400 hover:text-white hover:bg-[#1e293b] transition"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => {
                setOfficerModalMode("create");
                setEditingOfficer(null);
                setIsOfficerModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition"
            >
              <Plus size={16} />
              <span>Add Sales Officer</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Timeframe Filter Bar */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
              <Calendar size={15} className="text-blue-400" />
              <span>Sales Period:</span>
            </div>

            {/* Quick Period Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
              {[
                { type: "week", label: "This Week" },
                { type: "month", label: "This Month" },
                { type: "last_month", label: "Last Month" },
                { type: "last_6_months", label: "Last 6 Months" },
                { type: "all", label: "All Time" },
              ].map((t) => (
                <button
                  key={t.type}
                  onClick={() => setPeriod({ type: t.type as any, label: t.label })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    period.type === t.type
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-[#1e293b]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDates.startDate}
                onChange={(e) => {
                  setCustomDates((prev) => ({ ...prev, startDate: e.target.value }));
                  if (e.target.value) {
                    setPeriod({
                      type: "custom",
                      label: "Custom Range",
                      startDate: e.target.value,
                      endDate: customDates.endDate,
                    });
                  }
                }}
                className="bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="From"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={customDates.endDate}
                onChange={(e) => {
                  setCustomDates((prev) => ({ ...prev, endDate: e.target.value }));
                  if (customDates.startDate && e.target.value) {
                    setPeriod({
                      type: "custom",
                      label: "Custom Range",
                      startDate: customDates.startDate,
                      endDate: e.target.value,
                    });
                  }
                }}
                className="bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="To"
              />
            </div>
          </div>

          {/* Sales Officer Switcher Horizontal Carousel */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 px-1">
              <span>SELECT SALES OFFICER:</span>
              <span className="text-blue-400">{selectedOfficerId === "ALL" ? "Showing Entire Team" : `Viewing: ${performance.officerName}`}</span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#334155]">
              {/* All Officers Card */}
              <button
                onClick={() => setSelectedOfficerId("ALL")}
                className={`flex-shrink-0 p-3.5 rounded-xl border text-left transition-all min-w-[200px] ${
                  selectedOfficerId === "ALL"
                    ? "bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30"
                    : "bg-[#1e293b] border-[#334155] hover:border-[#475569] hover:bg-[#1e293b]/80"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none">All Officers</h4>
                    <span className="text-[10px] text-gray-400 font-mono">TEAM OVERVIEW</span>
                  </div>
                </div>
                <div className="text-xs text-blue-400 font-mono font-bold mt-2">
                  {formatLKR(
                    periodFilteredInvoices.reduce((acc: number, inv: InvoiceResponse) => acc + (inv.totalAmount || 0), 0)
                  )}
                </div>
              </button>

              {/* 10 Individual Sales Officer Cards */}
              {officers.map((officer) => {
                const isSelected = selectedOfficerId === officer.id || selectedOfficerId === officer.officerId;
                const officerInvoices = periodFilteredInvoices.filter((inv: InvoiceResponse) => {
                  const sName = inv.salesman?.fullName || inv.salesmanName || "";
                  return sName === officer.fullName;
                });
                const officerSales = officerInvoices.reduce((sum: number, i: InvoiceResponse) => sum + (i.totalAmount || 0), 0);

                return (
                  <div
                    key={officer.id}
                    className={`flex-shrink-0 relative group p-3.5 rounded-xl border text-left transition-all min-w-[220px] ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                        : "bg-[#1e293b] border-[#334155] hover:border-[#475569] hover:bg-[#1e293b]/80"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedOfficerId(officer.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {officer.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white truncate max-w-[120px]">
                              {officer.fullName}
                            </h4>
                            <span className="text-[10px] text-emerald-400 font-mono font-medium">
                              {officer.contactNumber}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                        <span className="truncate max-w-[110px] text-[10px] text-purple-300">
                          {officer.assignedCustomerIds?.length || 0} Customers
                        </span>
                        <span className="text-emerald-400 font-mono font-bold">{formatLKR(officerSales)}</span>
                      </div>
                    </button>

                    {/* Quick Edit/Delete Buttons on Hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingOfficer(officer);
                          setOfficerModalMode("edit");
                          setIsOfficerModalOpen(true);
                        }}
                        className="p-1 hover:text-blue-300 text-gray-400 transition"
                        title="Edit Officer"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOfficer(officer);
                        }}
                        className="p-1 hover:text-red-400 text-gray-400 transition"
                        title="Delete Officer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance KPI Cards Section (Finance Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sales */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Sales Value
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white tracking-tight mb-1">
                {formatLKR(performance.totalSalesValue)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{performance.totalInvoicesCount} Invoices Total</span>
                <span className="text-blue-400 font-medium font-mono">{period.label}</span>
              </div>
            </div>

            {/* Card 2: Completed Sales / Collected */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Collected Amount
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight mb-1">
                {formatLKR(performance.collectedAmount)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{performance.completedInvoicesCount} Settled Invoices</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {performance.collectionRate}% Rate
                </span>
              </div>
            </div>

            {/* Card 3: Pending Credit / Amount to Collect */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Pending Credit to Collect
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock size={18} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 tracking-tight mb-1">
                {formatLKR(performance.pendingCreditAmount)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{performance.pendingInvoicesCount} Pending Invoices</span>
                <span className="text-amber-400 font-medium">Within Terms</span>
              </div>
            </div>

            {/* Card 4: Overdue Sales */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Overdue Amount
                </span>
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <ShieldAlert size={18} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-red-400 tracking-tight mb-1">
                {formatLKR(performance.overdueAmount)}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="text-red-400 font-semibold">{performance.overdueInvoicesCount} Overdue Invoices</span>
                <span className="text-red-400 text-[11px] font-mono font-bold">Action Needed</span>
              </div>
            </div>
          </div>

          {/* Detailed Sales Invoices Table Section */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-md">
            {/* Table Filter Tabs and Search Bar */}
            <div className="p-4 border-b border-[#334155] flex flex-wrap items-center justify-between gap-4 bg-[#0f172a]/50">
              {/* Tab Pills */}
              <div className="flex items-center gap-1.5 bg-[#0f172a] p-1 rounded-lg border border-[#334155]">
                {[
                  { id: "all", label: "All Records", count: periodFilteredInvoices.length },
                  { id: "completed", label: "Completed / Settled", count: performance.completedInvoicesCount },
                  { id: "pending", label: "Pending Credit", count: performance.pendingInvoicesCount },
                  { id: "overdue", label: "Overdue Sales", count: performance.overdueInvoicesCount, badgeCls: "bg-red-500/20 text-red-300" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === t.id
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-gray-400 hover:text-white hover:bg-[#1e293b]"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${t.badgeCls || "bg-[#1e293b] text-gray-300"}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[260px]">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoice, customer, officer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f172a] text-gray-400 uppercase tracking-wider text-[11px] border-b border-[#334155] sticky top-0">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Sales Officer</th>
                    <th className="p-3.5">Issue Date</th>
                    <th className="p-3.5">Due Date & Credit State</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60 text-sm">
                  {displayedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400">
                        No sales invoices found for this selection and period.
                      </td>
                    </tr>
                  ) : (
                    displayedInvoices.map((inv: InvoiceResponse) => {
                      const sName = inv.salesman?.fullName || inv.salesmanName || "";

                      return (
                        <tr
                          key={inv.id || inv.invoiceNumber}
                          className="hover:bg-[#0f172a]/50 transition-colors"
                        >
                          <td className="p-3.5 font-mono font-bold text-blue-400">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3.5">
                            <div>
                              <p className="font-semibold text-white truncate max-w-[180px]">
                                {(typeof inv.customer === 'object' && inv.customer ? (inv.customer as any).fullName : null) || "Walk-in Customer"}
                              </p>
                              {(() => {
                                const city = typeof inv.customer === 'object' && inv.customer ? (inv.customer as any).city : null;
                                return city ? (
                                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {city}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {sName ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                                <UserCheck size={12} className="text-blue-400 shrink-0" />
                                <span>{sName}</span>
                              </span>
                            ) : (
                              <span className="text-gray-500 font-mono text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-gray-400 text-xs">
                            {formatDate(inv.issueDate)}
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <span className="font-mono text-gray-300 text-xs block">
                                {formatDate(inv.dueDate)}
                              </span>
                              {getCreditBadge(inv)}
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-emerald-400 font-bold text-sm">
                            {formatLKR(inv.totalAmount || 0)}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                inv.paymentStatus === "completed"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {inv.paymentStatus || "pending"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {typeof inv.customer === 'object' && inv.customer && (inv.customer as any).phone && (
                                <a
                                  href={`https://wa.me/${(inv.customer as any).phone.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition"
                                  title="WhatsApp Customer"
                                >
                                  <MessageCircle size={15} />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setShowInvoiceView(true);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition"
                                title="View Invoice"
                              >
                                <Eye size={15} />
                              </button>
                            </div>
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
      </div>

      {/* Sales Officer Add/Edit Modal */}
      <SalesOfficerModal
        isOpen={isOfficerModalOpen}
        onClose={() => {
          setIsOfficerModalOpen(false);
          setEditingOfficer(null);
        }}
        onSave={handleSaveOfficer}
        initialData={editingOfficer}
        mode={officerModalMode}
      />

      {/* Invoice View Modal */}
      {showInvoiceView && selectedInvoice && (
        <InvoiceViewModal
          isOpen={showInvoiceView}
          onClose={() => {
            setShowInvoiceView(false);
            setSelectedInvoice(null);
          }}
          invoiceData={{
            ...selectedInvoice,
            customer: typeof selectedInvoice.customer === 'object' ? selectedInvoice.customer?.id || '' : selectedInvoice.customer,
            customerDetails: typeof selectedInvoice.customer === 'object' ? selectedInvoice.customer : undefined,
            items: selectedInvoice.items.map(item => ({
              id: item.id || Math.random().toString(),
              inventoryItemId: item.inventoryItemId || item.itemCode || '',
              itemName: item.itemName || item.inventoryItem?.productName || 'Product',
              itemCode: item.itemCode || item.inventoryItem?.productCode || '',
              discount: item.discount || 0,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
            discountPercentage: selectedInvoice.discount > 0 && selectedInvoice.subTotal > 0
              ? (selectedInvoice.discount / selectedInvoice.subTotal) * 100
              : 0,
            applyVat: selectedInvoice.applyVat || false,
            vatAmount: selectedInvoice.vatAmount || 0,
            taxRate: selectedInvoice.taxRate || 0,
            salesman: selectedInvoice.salesman || (selectedInvoice.salesmanName
              ? { id: '', name: selectedInvoice.salesmanName }
              : null),
          }}
        />
      )}
    </div>
  );
};

export default SalesOfficers;
