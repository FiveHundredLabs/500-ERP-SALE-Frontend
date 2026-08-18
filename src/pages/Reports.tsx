import React, { useState, useId } from "react";
import AppLayout from "../components/AppLayout";
import {
  FileText,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  X,
  Clock,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import { useToast } from "../components/erp/Toast";

interface ReportTypeOption {
  id: string;
  name: string;
  category: string;
  description: string;
  estimatedRecords: number;
  status: "available" | "in_development";
}

const REPORT_OPTIONS: ReportTypeOption[] = [
  {
    id: "contacts-leads",
    name: "1. Contacts & Leads Pipeline Report",
    category: "CRM & Sales",
    description: "Full audit of leads, active contacts, customer lifecycle stages, and conversion metrics.",
    estimatedRecords: 12,
    status: "available",
  },
  {
    id: "sales-revenue",
    name: "2. Sales & Revenue Summary Report",
    category: "Finance & Sales",
    description: "Consolidated breakdown of daily, weekly, and monthly sales volumes and collected revenue.",
    estimatedRecords: 48,
    status: "in_development",
  },
  {
    id: "customer-outstanding",
    name: "3. Customer Outstanding Balances & Aging",
    category: "Accounts Receivable",
    description: "Aging analysis (0-30, 31-60, 61-90, 90+ days) of pending customer payments and credit limits.",
    estimatedRecords: 29,
    status: "in_development",
  },
  {
    id: "inventory-valuation",
    name: "4. Inventory Stock Valuation & Reorder Report",
    category: "Warehouse & Stock",
    description: "Comprehensive valuation of stock on hand, safety thresholds, and reorder triggers.",
    estimatedRecords: 64,
    status: "in_development",
  },
  {
    id: "purchase-suppliers",
    name: "5. Purchase Orders & Supplier Ledger Report",
    category: "Procurement",
    description: "Summary of vendor purchases, outstanding balances, and supplier lead-time performance.",
    estimatedRecords: 18,
    status: "in_development",
  },
  {
    id: "officer-performance",
    name: "6. Sales Officer Commission & Route Performance",
    category: "Field Operations",
    description: "Route visit coverage, order value booked per officer, target vs actuals, and commission calculation.",
    estimatedRecords: 8,
    status: "in_development",
  },
  {
    id: "tax-invoicing",
    name: "7. Tax & Invoicing Compliance Statement",
    category: "Compliance",
    description: "Tax audit statement with invoice numbers, customer VAT/TIN, gross amounts, and net taxes.",
    estimatedRecords: 35,
    status: "in_development",
  },
];

const SCOPES = [
  "All Teams",
  "Direct Sales Team",
  "Wholesale Division",
  "Fleet & Corporate Accounts",
  "Spare Parts & Service Division",
];

const Reports: React.FC = () => {
  const { info, success } = useToast();
  const selectId = useId();

  // Form State
  const [selectedReportId, setSelectedReportId] = useState<string>("contacts-leads");
  const [selectedScope, setSelectedScope] = useState<string>("All Teams");
  const [datePreset, setDatePreset] = useState<string>("This Month");
  const [fromDate, setFromDate] = useState<string>("2026-08-01");
  const [toDate, setToDate] = useState<string>("2026-08-31");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Under Development Modal State
  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const [modalTargetReport, setModalTargetReport] = useState<ReportTypeOption | null>(null);

  const currentReport = REPORT_OPTIONS.find((r) => r.id === selectedReportId) || REPORT_OPTIONS[0];

  // Handle Preset Change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    switch (preset) {
      case "Today":
        setFromDate(`${year}-${month}-${day}`);
        setToDate(`${year}-${month}-${day}`);
        break;
      case "This Week": {
        const monday = new Date(now);
        const dayOfWeek = monday.getDay() || 7;
        monday.setDate(monday.getDate() - dayOfWeek + 1);
        const mMonth = String(monday.getMonth() + 1).padStart(2, "0");
        const mDay = String(monday.getDate()).padStart(2, "0");
        setFromDate(`${monday.getFullYear()}-${mMonth}-${mDay}`);
        setToDate(`${year}-${month}-${day}`);
        break;
      }
      case "This Month":
        setFromDate(`${year}-${month}-01`);
        setToDate(`${year}-${month}-31`);
        break;
      case "Last Month": {
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const lastYear = now.getMonth() === 0 ? year - 1 : year;
        const lmStr = String(lastMonth).padStart(2, "0");
        setFromDate(`${lastYear}-${lmStr}-01`);
        setToDate(`${lastYear}-${lmStr}-28`);
        break;
      }
      case "This Year":
        setFromDate(`${year}-01-01`);
        setToDate(`${year}-12-31`);
        break;
      default:
        break;
    }
  };

  const handleReportSelection = (reportId: string) => {
    const target = REPORT_OPTIONS.find((r) => r.id === reportId);
    if (!target) return;

    if (target.status === "in_development") {
      setModalTargetReport(target);
      setShowDevModal(true);
    } else {
      setSelectedReportId(reportId);
    }
  };

  const handleDownload = () => {
    if (currentReport.status === "in_development") {
      setModalTargetReport(currentReport);
      setShowDevModal(true);
      return;
    }

    setIsExporting(true);
    info("Preparing Report", `Generating ${currentReport.name} in ${format.toUpperCase()} format...`);

    setTimeout(() => {
      setIsExporting(false);
      // Sample mock CSV / text download
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "ID,Contact Name,Company,Stage,Phone,Email,Owner,Scope,Created Date\n" +
        "1,Apex Auto Garage,Apex Motors Ltd,Qualified Lead,+94 77 123 4567,apex@example.com,Sunil Perera,All Teams,2026-08-05\n" +
        "2,Metro Fleet Services,Metro Transport,Proposal Sent,+94 71 987 6543,metro@example.com,Nimal Silva,All Teams,2026-08-08\n" +
        "3,Silver Star Motors,Silver Star Ltd,Customer Active,+94 76 555 4321,silver@example.com,Kamal Dias,All Teams,2026-08-11\n" +
        "4,Lanka Express Logistics,Lanka Express,Negotiation,+94 70 333 2211,ops@lankaexpress.com,Sunil Perera,All Teams,2026-08-14\n" +
        "5,Ceylon Transit Fleet,Ceylon Transit,Qualified Lead,+94 72 444 8899,fleet@ceylontransit.com,Nimal Silva,All Teams,2026-08-17\n";

      if (format === "csv") {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `500Core_Report_${currentReport.id}_${fromDate}_to_${toDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        success("Export Successful", `Downloaded CSV file with ${currentReport.estimatedRecords} records.`);
      } else {
        // PDF Simulation
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${currentReport.name}</title>
                <style>
                  body { font-family: sans-serif; padding: 24px; color: #1e293b; }
                  h1 { color: #2563eb; margin-bottom: 4px; font-size: 20px; }
                  .meta { font-size: 13px; color: #64748b; margin-bottom: 20px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                  th { background-color: #f1f5f9; font-weight: 600; }
                </style>
              </head>
              <body>
                <h1>500Core ERP - ${currentReport.name}</h1>
                <div class="meta">
                  <strong>Scope:</strong> ${selectedScope} | 
                  <strong>Date Range:</strong> ${fromDate} to ${toDate} | 
                  <strong>Records:</strong> ${currentReport.estimatedRecords} entries
                </div>
                <table>
                  <thead>
                    <tr><th>#</th><th>Contact / Entity</th><th>Category / Stage</th><th>Owner</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>1</td><td>Apex Auto Garage</td><td>Qualified Lead</td><td>Sunil Perera</td><td>2026-08-05</td></tr>
                    <tr><td>2</td><td>Metro Fleet Services</td><td>Proposal Sent</td><td>Nimal Silva</td><td>2026-08-08</td></tr>
                    <tr><td>3</td><td>Silver Star Motors</td><td>Customer Active</td><td>Kamal Dias</td><td>2026-08-11</td></tr>
                    <tr><td>4</td><td>Lanka Express Logistics</td><td>Negotiation</td><td>Sunil Perera</td><td>2026-08-14</td></tr>
                  </tbody>
                </table>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
        success("PDF Generated", "Report statement preview opened for printing/saving.");
      }
    }, 600);
  };

  return (
    <AppLayout
      headerIcon={<FileSpreadsheet size={19} />}
      headerTitle="Generate System Report"
      headerSubtitle="Configure report parameters, date filters, and export format"
      showBell
    >
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-10">
        {/* Main Generator Card — Replicating user's design */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl overflow-hidden">
          {/* Card Top Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-4 border-b border-[#334155] bg-[#1a2333]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <FileText size={18} />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Generate System Report
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Configure report parameters, date filters, and export format
            </p>
          </div>

          {/* Card Form Body */}
          <div className="p-6 space-y-7">
            {/* ================= STEP 1 ================= */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  1
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  Select System Report Type
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Report Specification */}
                <div className="space-y-1.5">
                  <label htmlFor={`report-spec-${selectId}`} className="block text-xs font-medium text-slate-300">
                    Report Specification
                  </label>
                  <div className="relative">
                    <select
                      id={`report-spec-${selectId}`}
                      value={selectedReportId}
                      onChange={(e) => handleReportSelection(e.target.value)}
                      className="w-full bg-[#0f172a] border border-[#334155] focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 outline-none appearance-none cursor-pointer transition-colors pr-10"
                    >
                      {REPORT_OPTIONS.map((report) => (
                        <option key={report.id} value={report.id} className="bg-[#1e293b] text-white">
                          {report.name} {report.status === "in_development" ? "⏳ [In Development]" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[0.72rem] text-slate-400 pt-0.5 px-0.5">
                    <span>{currentReport.category}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetReport(currentReport);
                        setShowDevModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                    >
                      Explore other report modules
                    </button>
                  </div>
                </div>

                {/* Right: Team / Brand Scope */}
                <div className="space-y-1.5">
                  <label htmlFor={`brand-scope-${selectId}`} className="block text-xs font-medium text-slate-300">
                    Team / Brand Scope
                  </label>
                  <div className="relative">
                    <select
                      id={`brand-scope-${selectId}`}
                      value={selectedScope}
                      onChange={(e) => setSelectedScope(e.target.value)}
                      className="w-full bg-[#0f172a] border border-[#334155] focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 outline-none appearance-none cursor-pointer transition-colors pr-10"
                    >
                      {SCOPES.map((scope) => (
                        <option key={scope} value={scope} className="bg-[#1e293b] text-white">
                          {scope}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ================= STEP 2 ================= */}
            <div className="space-y-3.5 pt-2 border-t border-[#334155]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  2
                </div>
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Calendar size={14} />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">
                    Select Date Range
                  </h3>
                </div>
              </div>

              {/* Date Preset Dropdown */}
              <div className="relative">
                <select
                  value={datePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 outline-none appearance-none cursor-pointer transition-colors pr-10"
                >
                  <option value="This Month">This Month</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Quarter">This Quarter</option>
                  <option value="This Year">This Year</option>
                  <option value="Custom">Custom Range</option>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>

              {/* From Date & To Date Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={`from-date-${selectId}`} className="block text-xs font-medium text-slate-300">
                    From Date
                  </label>
                  <div className="relative">
                    <input
                      id={`from-date-${selectId}`}
                      type="date"
                      value={fromDate}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        setDatePreset("Custom");
                      }}
                      className="w-full bg-[#0f172a] border border-[#334155] focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor={`to-date-${selectId}`} className="block text-xs font-medium text-slate-300">
                    To Date
                  </label>
                  <div className="relative">
                    <input
                      id={`to-date-${selectId}`}
                      type="date"
                      value={toDate}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        setDatePreset("Custom");
                      }}
                      className="w-full bg-[#0f172a] border border-[#334155] focus:border-blue-500 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ================= STEP 3 ================= */}
            <div className="space-y-3.5 pt-2 border-t border-[#334155]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  3
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  Select Type of Report Format
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CSV Format Card */}
                <div
                  onClick={() => setFormat("csv")}
                  className={`
                    flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${
                      format === "csv"
                        ? "bg-emerald-950/20 border-emerald-500/80 shadow-md shadow-emerald-900/20"
                        : "bg-[#0f172a] border-[#334155] hover:border-slate-500 hover:bg-[#162032]"
                    }
                  `}
                >
                  {/* Radio indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${format === "csv" ? "border-emerald-500 bg-emerald-500/10" : "border-slate-500"}
                    `}
                  >
                    {format === "csv" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Download size={16} className="flex-shrink-0" />
                      <span>CSV Spreadsheet (.csv)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Instant CSV data file download</p>
                  </div>
                </div>

                {/* PDF Format Card */}
                <div
                  onClick={() => setFormat("pdf")}
                  className={`
                    flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${
                      format === "pdf"
                        ? "bg-blue-950/20 border-blue-500/80 shadow-md shadow-blue-900/20"
                        : "bg-[#0f172a] border-[#334155] hover:border-slate-500 hover:bg-[#162032]"
                    }
                  `}
                >
                  {/* Radio indicator */}
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                      ${format === "pdf" ? "border-blue-500 bg-blue-500/10" : "border-slate-500"}
                    `}
                  >
                    {format === "pdf" && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <Printer size={16} className="flex-shrink-0" />
                      <span>PDF Audit Statement (.pdf)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Print or Save as PDF document</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Footer Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 bg-[#162032] border-t border-[#334155]">
            <div className="text-xs text-slate-400">
              Matching System Records:{" "}
              <span className="font-bold text-slate-100">{currentReport.estimatedRecords} entries</span>
            </div>

            <button
              onClick={handleDownload}
              disabled={isExporting}
              className={`
                flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm shadow-lg transition-all cursor-pointer
                bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30
                ${isExporting ? "opacity-75 cursor-not-allowed" : ""}
              `}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Preparing Download...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download {format.toUpperCase()} Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Report Type Directory Card */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">System Reports Catalog</h3>
            </div>
            <span className="text-xs text-slate-400">
              Click any report to configure or inspect development status
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {REPORT_OPTIONS.map((report) => {
              const isSelected = selectedReportId === report.id;
              const isDev = report.status === "in_development";

              return (
                <div
                  key={report.id}
                  onClick={() => handleReportSelection(report.id)}
                  className={`
                    p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between
                    ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500/60"
                        : "bg-[#0f172a]/80 border-[#334155] hover:border-slate-500 hover:bg-[#0f172a]"
                    }
                  `}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{report.name}</h4>
                      {isDev ? (
                        <span className="text-[0.68rem] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold flex-shrink-0 border border-amber-500/30">
                          Dev
                        </span>
                      ) : (
                        <span className="text-[0.68rem] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex-shrink-0 border border-emerald-500/30">
                          Ready
                        </span>
                      )}
                    </div>
                    <p className="text-[0.74rem] text-slate-400 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[0.7rem] text-slate-500 pt-2.5 border-t border-[#334155]/40 mt-2">
                    <span>{report.category}</span>
                    <span className="font-semibold text-slate-300">{report.estimatedRecords} records</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= UNDER DEVELOPMENT POP-UP MODAL ================= */}
      {showDevModal && modalTargetReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowDevModal(false)}
        >
          <div
            className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative p-6 bg-gradient-to-r from-blue-900/40 via-[#1e293b] to-amber-950/20 border-b border-[#334155]">
              <button
                onClick={() => setShowDevModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#334155] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Clock size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Under Active Development
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {modalTargetReport.name}
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-sm text-slate-300">
              <p className="leading-relaxed">
                The automated query engine for <strong className="text-white">{modalTargetReport.name}</strong> is currently being connected to the live ledger and operational database.
              </p>

              {/* Progress Box */}
              <div className="bg-[#0f172a] rounded-xl p-4 border border-[#334155] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Data Aggregation Pipeline</span>
                  <span className="text-amber-400 font-bold">85% Complete</span>
                </div>
                <div className="w-full bg-[#1e293b] rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-amber-400 h-full rounded-full w-[85%]" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Schema definitions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Calculated KPIs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-400" />
                    <span>High-volume indexing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-400" />
                    <span>PDF visual engine</span>
                  </div>
                </div>
              </div>

              {/* Description preview */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-200">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>What’s planned:</strong> {modalTargetReport.description}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#162032] border-t border-[#334155] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDevModal(false);
                  info("Notification Set", `You will be notified when ${modalTargetReport.name} is ready for production.`);
                }}
                className="px-4 py-2 rounded-lg bg-[#334155] hover:bg-[#475569] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Notify Me on Release
              </button>
              <button
                onClick={() => setShowDevModal(false)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Reports;
