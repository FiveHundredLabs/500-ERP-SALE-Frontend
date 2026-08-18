import React, { useState, useMemo } from "react";
import { FileText, Building, Eye, Download, CheckCircle, X, AlertTriangle, Clock, Calendar, ShieldAlert, UserCheck } from "lucide-react";
import { Button } from "./common";
import type { InvoiceResponse } from "../types/invoice";
import type { FinanceTransaction } from "../types/finance";

interface FinanceTableProps {
  invoices: InvoiceResponse[];
  loading: boolean;
  onViewInvoice: (invoice: InvoiceResponse) => void;
  onDownloadInvoice: (invoice: InvoiceResponse) => void;
  onMarkAsPaid: (invoice: InvoiceResponse) => void;
  financeTransactions: FinanceTransaction[];
  pageSize?: number;
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinanceTransaction | null;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ isOpen, onClose, transaction }) => {
  if (!isOpen) return null;

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-200 truncate">
                Payment Details
              </h3>
              {transaction && (
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  Transaction: {transaction.transactionId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#334155] rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {transaction ? (
            <div className="space-y-4">
              {/* Invoice Info */}
              <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Invoice Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs mb-1">Invoice ID</p>
                    <p className="text-gray-200 font-medium truncate">{transaction.invoice?.invoiceId || 'N/A'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs mb-1">Amount Paid</p>
                    <p className="text-green-400 font-semibold truncate">{transaction.amount}</p>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Payment Method</h4>
                <div className="space-y-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs mb-1">Method</p>
                    <p className="text-gray-200 font-medium truncate">{transaction.paymentMethod.type}</p>
                  </div>
                  
                  {transaction.paymentMethod.type !== 'Cash' && (
                    <>
                      {transaction.paymentMethod.bankName && transaction.paymentMethod.bankName !== 'N/A' && (
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs mb-1">Bank Name</p>
                          <p className="text-gray-200 font-medium truncate">{transaction.paymentMethod.bankName}</p>
                        </div>
                      )}
                      
                      {transaction.paymentMethod.accountNumber && transaction.paymentMethod.accountNumber !== 'N/A' && (
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs mb-1">Account Number</p>
                          <p className="text-gray-200 font-medium truncate">{transaction.paymentMethod.accountNumber}</p>
                        </div>
                      )}

                      {transaction.paymentMethod.transactionRef && transaction.paymentMethod.transactionRef !== 'N/A' && (
                        <div className="min-w-0">
                          <p className="text-gray-500 text-xs mb-1">Transaction Reference</p>
                          <p className="text-gray-200 font-medium truncate">{transaction.paymentMethod.transactionRef}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Transaction Date */}
              <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">Processed At</p>
                <p className="text-gray-200 font-medium text-sm">{formatDateTime(transaction.transactionDate)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Transaction details not available
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-[#334155]">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string; isOverdue?: boolean }> = ({ status, isOverdue }) => {
  if (status === "Pending" && isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Pending
      </span>
    );
  }

  const statusMap: Record<string, { bg: string; text: string; dot: string }> = {
    Completed: { bg: "bg-green-500/20 border-green-500/30", text: "text-green-400", dot: "bg-green-400" },
    Pending: { bg: "bg-yellow-500/20 border-yellow-500/30", text: "text-yellow-400", dot: "bg-yellow-400" },
    Rejected: { bg: "bg-red-500/20 border-red-500/30", text: "text-red-400", dot: "bg-red-400" },
  };
  const { bg, text, dot } = statusMap[status] || { bg: "bg-gray-500/20 border-gray-500/30", text: "text-gray-400", dot: "bg-gray-400" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${bg} ${text} border whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
};

const FinanceTable: React.FC<FinanceTableProps> = ({
  invoices,
  onViewInvoice,
  onDownloadInvoice,
  onMarkAsPaid,
  financeTransactions = [],
  pageSize = 10,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'near_due' | 'completed'>('all');
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransaction | null>(null);

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat("en-GB").format(new Date(date));
    } catch {
      return date;
    }
  };
  
  const formatCurrency = (amount: number) =>
    `LKR ${Math.round(amount || 0).toLocaleString()}/=`;

  // Auto-track Credit Period & Due Date Statuses
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const trackedInvoices = useMemo(() => {
    return invoices.map(inv => {
      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let creditState: 'overdue' | 'near_due' | 'normal' | 'settled' = 'normal';

      if (inv.paymentStatus === 'Completed') {
        creditState = 'settled';
      } else if (diffDays < 0) {
        creditState = 'overdue';
      } else if (diffDays <= 7) {
        creditState = 'near_due';
      }

      return {
        ...inv,
        diffDays,
        creditState,
      };
    });
  }, [invoices, now]);

  const overdueInvoices = useMemo(() => trackedInvoices.filter(i => i.creditState === 'overdue'), [trackedInvoices]);
  const nearDueInvoices = useMemo(() => trackedInvoices.filter(i => i.creditState === 'near_due'), [trackedInvoices]);
  const completedInvoices = useMemo(() => trackedInvoices.filter(i => i.creditState === 'settled'), [trackedInvoices]);

  const totalOverdueAmount = useMemo(() => overdueInvoices.reduce((sum, i) => sum + i.totalAmount, 0), [overdueInvoices]);
  const totalNearDueAmount = useMemo(() => nearDueInvoices.reduce((sum, i) => sum + i.totalAmount, 0), [nearDueInvoices]);
  const totalPendingAmount = useMemo(() => trackedInvoices.filter(i => i.paymentStatus === 'Pending').reduce((sum, i) => sum + i.totalAmount, 0), [trackedInvoices]);

  const filteredInvoices = useMemo(() => {
    if (activeTab === 'overdue') return overdueInvoices;
    if (activeTab === 'near_due') return nearDueInvoices;
    if (activeTab === 'completed') return completedInvoices;
    return trackedInvoices;
  }, [trackedInvoices, overdueInvoices, nearDueInvoices, completedInvoices, activeTab]);

  // Find transaction for a specific invoice
  const getTransactionForInvoice = (invoiceId: string) => {
    return financeTransactions.find(transaction => 
      transaction?.invoice?.invoiceId === invoiceId
    ) || null;
  };

  // Handle Paid button click
  const handlePaidClick = (invoice: InvoiceResponse) => {
    const transaction = getTransactionForInvoice(invoice.invoiceId);
    
    if (transaction) {
      setSelectedTransaction(transaction);
      setShowTransactionDetails(true);
    } else {
      const alternativeTransaction = financeTransactions.find(t => 
        t.invoice?.invoiceId === invoice.invoiceId
      );
      
      if (alternativeTransaction) {
        setSelectedTransaction(alternativeTransaction);
        setShowTransactionDetails(true);
      }
    }
  };

  const sortedInvoices = useMemo(
    () => [...filteredInvoices].sort((a, b) => {
      try {
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      } catch {
        return 0;
      }
    }),
    [filteredInvoices]
  );

  const totalPages = Math.ceil(sortedInvoices.length / pageSize);

  const paginatedInvoices = useMemo(
    () => sortedInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedInvoices, currentPage, pageSize]
  );

  if (!invoices.length)
    return (
      <div className="text-center py-16 bg-[#1e293b]/30 rounded-xl border border-[#334155] border-dashed">
        <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No invoices found</h3>
        <p className="text-gray-400 text-sm">Try adjusting your search or date filters</p>
      </div>
    );

  return (
    <>
      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showTransactionDetails}
        onClose={() => {
          setShowTransactionDetails(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />

      <div className="space-y-5">
        {/* Credit Period & Due Date Tracking Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3.5 flex items-center gap-3 shadow-md hover:border-[#475569] transition-colors">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium truncate">Outstanding Total</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white tracking-tight truncate">{formatCurrency(totalPendingAmount)}</p>
              <p className="text-[11px] text-gray-500 truncate">{trackedInvoices.filter(i => i.paymentStatus === 'Pending').length} pending invoices</p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-red-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md bg-gradient-to-r from-red-950/20 to-transparent hover:border-red-500/50 transition-colors">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-red-300 font-medium truncate">Overdue Payments</p>
              <p className="text-base sm:text-lg font-bold font-mono text-red-400 tracking-tight truncate">{formatCurrency(totalOverdueAmount)}</p>
              <p className="text-[11px] text-red-400/80 font-medium truncate">{overdueInvoices.length} invoices passed due date</p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md bg-gradient-to-r from-amber-950/20 to-transparent hover:border-amber-500/50 transition-colors">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-amber-300 font-medium truncate">Near Expiry (7d)</p>
              <p className="text-base sm:text-lg font-bold font-mono text-amber-400 tracking-tight truncate">{formatCurrency(totalNearDueAmount)}</p>
              <p className="text-[11px] text-amber-400/80 font-medium truncate">{nearDueInvoices.length} invoices due in 7d</p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-green-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md hover:border-green-500/50 transition-colors">
            <div className="p-2.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium truncate">Settled / Completed</p>
              <p className="text-base sm:text-lg font-bold font-mono text-green-400 tracking-tight truncate">
                {formatCurrency(completedInvoices.reduce((sum, i) => sum + i.totalAmount, 0))}
              </p>
              <p className="text-[11px] text-green-500 truncate">{completedInvoices.length} invoices fully paid</p>
            </div>
          </div>
        </div>

        {/* Overdue Alert Banner if overdue invoices exist */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-red-300 truncate">Credit Expiry Alert: {overdueInvoices.length} Overdue Invoice(s)</h4>
                <p className="text-[11px] text-red-400/90 truncate">
                  Total {formatCurrency(totalOverdueAmount)} has exceeded agreed credit period.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex-shrink-0 transition-colors shadow-sm"
            >
              View Overdue ({overdueInvoices.length})
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#334155] pb-2.5">
          {[
            { id: 'all', label: 'All Invoices', count: trackedInvoices.length, color: 'text-gray-300' },
            { id: 'overdue', label: 'Overdue Credit Period', count: overdueInvoices.length, badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
            { id: 'near_due', label: 'Near Due (Next 7 Days)', count: nearDueInvoices.length, badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { id: 'completed', label: 'Completed / Paid', count: completedInvoices.length, badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shadow-sm'
                  : 'text-gray-400 hover:bg-[#1e293b] hover:text-gray-200 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono border ${tab.badge || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Desktop Table (Full-width, auto-responsive, no scroll needed) */}
        <div className="hidden lg:block bg-[#1e293b]/50 backdrop-blur-sm border border-[#334155] rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#334155] bg-[#1e293b]">
                <th className="py-3 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Invoice ID</th>
                <th className="py-3 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wider">Customer</th>
                <th className="py-3 px-2.5 text-gray-400 font-semibold text-xs uppercase tracking-wider">Sales Officer</th>
                <th className="py-3 px-2.5 text-gray-400 font-semibold text-xs uppercase tracking-wider">Due Date</th>
                <th className="py-3 px-2.5 text-gray-400 font-semibold text-xs uppercase tracking-wider">Days</th>
                <th className="py-3 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wider text-right">Amount</th>
                <th className="py-3 px-2.5 text-gray-400 font-semibold text-xs uppercase tracking-wider text-center">Status</th>
                <th className="py-3 px-3 text-gray-400 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-xs">
              {paginatedInvoices.map((invoice, idx) => {
                const transaction = getTransactionForInvoice(invoice.invoiceId);
                const hasTransaction = invoice.paymentStatus === "Completed" && transaction;
                const isOverdue = invoice.creditState === 'overdue';
                
                return (
                  <tr
                    key={invoice._id}
                    className={`transition-colors hover:bg-[#1e293b] ${
                      isOverdue ? "bg-red-950/15" : (idx % 2 === 0 ? "bg-[#1e293b]/30" : "bg-[#1e293b]/10")
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold font-mono text-blue-400 truncate">{invoice.invoiceId}</span>
                        <span className="text-[11px] text-gray-400 truncate">{formatDate(invoice.issueDate)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-white truncate block max-w-[130px] xl:max-w-[160px] text-xs">
                        {invoice.customer?.fullName || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-2.5">
                      {(() => {
                        const sName = typeof invoice.salesman === 'object' && invoice.salesman !== null
                          ? invoice.salesman.name || (invoice.salesman as any).fullName
                          : (invoice.salesmanName || (typeof invoice.salesman === 'string' ? invoice.salesman : ''));
                        return sName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium truncate max-w-[120px]">
                            <UserCheck size={11} className="text-blue-400 shrink-0" />
                            <span className="truncate">{sName}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs font-mono">—</span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2.5 text-gray-300 font-mono text-xs whitespace-nowrap">{formatDate(invoice.dueDate)}</td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      {invoice.creditState === 'overdue' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                          Overdue ({Math.abs(invoice.diffDays)}d)
                        </span>
                      )}
                      {invoice.creditState === 'near_due' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          Due in {invoice.diffDays}d
                        </span>
                      )}
                      {invoice.creditState === 'normal' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700">
                          On Track ({invoice.diffDays}d)
                        </span>
                      )}
                      {invoice.creditState === 'settled' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Settled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold text-xs text-right whitespace-nowrap">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="py-3 px-2.5 text-center">
                      <StatusBadge status={invoice.paymentStatus} isOverdue={isOverdue} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => onViewInvoice(invoice)}
                          aria-label="View Invoice"
                          title="View Invoice"
                          className="p-1.5"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download className="w-3.5 h-3.5" />}
                          onClick={() => onDownloadInvoice(invoice)}
                          aria-label="Download Invoice"
                          title="Download PDF"
                          className="p-1.5"
                        />
                        {invoice.paymentStatus === "Pending" || invoice.paymentStatus === "Rejected" ? (
                          <button 
                            onClick={() => onMarkAsPaid(invoice)}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-semibold flex-shrink-0 transition-colors"
                            title="Mark as Paid"
                          >
                            Pay
                          </button>
                        ) : hasTransaction ? (
                          <button
                            onClick={() => handlePaidClick(invoice)}
                            className="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 rounded text-[11px] font-semibold flex items-center gap-1"
                            title="View Payment Details"
                          >
                            <CheckCircle className="w-3 h-3" /> Paid
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-green-400 bg-green-500/10 border border-green-500/30 rounded">
                            <CheckCircle className="w-3 h-3 flex-shrink-0" /> Paid
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 text-gray-300 gap-3 border-t border-[#334155]">
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tablet View (768px - 1023px) */}
        <div className="hidden md:block lg:hidden">
          <div className="grid grid-cols-1 gap-3">
            {paginatedInvoices.map((invoice) => {
              const transaction = getTransactionForInvoice(invoice.invoiceId);
              const hasTransaction = invoice.paymentStatus === "Completed" && transaction;
              
              return (
                <div
                  key={invoice._id}
                  className="bg-[#1e293b]/50 border border-[#334155] rounded-lg p-4 hover:bg-[#1e293b]/70 transition-colors"
                >
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="font-semibold text-gray-200 truncate">{invoice.invoiceId}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={invoice.paymentStatus} isOverdue={invoice.creditState === 'overdue'} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Total Amount</p>
                      <p className="text-blue-400 font-bold text-sm">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Customer</p>
                      <p className="text-gray-200 font-medium text-sm truncate">{invoice.customer?.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Sales Officer</p>
                      {(() => {
                        const sName = typeof invoice.salesman === 'object' && invoice.salesman !== null
                          ? invoice.salesman.name || (invoice.salesman as any).fullName
                          : (invoice.salesmanName || (typeof invoice.salesman === 'string' ? invoice.salesman : ''));
                        return sName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium truncate">
                            <UserCheck size={11} className="text-purple-400 shrink-0" />
                            <span className="truncate">{sName}</span>
                          </span>
                        ) : (
                          <p className="text-gray-500 text-sm">—</p>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Issued Date</p>
                      <p className="text-gray-200 text-sm">{formatDate(invoice.issueDate)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Due Date</p>
                      <p className="text-gray-200 text-sm">{formatDate(invoice.dueDate)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="w-3 h-3" />}
                      onClick={() => onViewInvoice(invoice)}
                      className="flex-1"
                      title="View Invoice"
                    >
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download className="w-3 h-3" />}
                      onClick={() => onDownloadInvoice(invoice)}
                      className="flex-1"
                      title="Download PDF"
                    >
                      PDF
                    </Button>
                    {invoice.paymentStatus === "Pending" || invoice.paymentStatus === "Rejected" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle className="w-3 h-3" />}
                        onClick={() => onMarkAsPaid(invoice)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        title="Mark as Paid"
                      >
                        Pay
                      </Button>
                    ) : hasTransaction ? (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle className="w-3 h-3" />}
                        onClick={() => handlePaidClick(invoice)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        title="View Payment Details"
                      >
                        Details
                      </Button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-medium">
                        <CheckCircle className="w-4 h-4" /> Paid
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Tablet Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 text-gray-300 gap-3">
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex-shrink-0"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-shrink-0"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cards (below 768px) */}
        <div className="md:hidden space-y-3">
          {paginatedInvoices.map((invoice) => {
            const transaction = getTransactionForInvoice(invoice.invoiceId);
            const hasTransaction = invoice.paymentStatus === "Completed" && transaction;
            
            return (
              <div
                key={invoice._id}
                className="bg-[#1e293b]/50 border border-[#334155] rounded-lg p-3 hover:bg-[#1e293b]/70 transition-colors"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-200 truncate text-sm">{invoice.invoiceId}</p>
                      <p className="text-xs text-gray-500 truncate">{formatDate(invoice.issueDate)}</p>
                    </div>
                  </div>
                  <StatusBadge status={invoice.paymentStatus} isOverdue={invoice.creditState === 'overdue'} />
                </div>

                {/* Customer & Vehicle */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs mb-1">Customer</p>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <p className="text-gray-200 text-xs truncate">{invoice.customer?.fullName || "N/A"}</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs mb-1">Vehicle</p>
                    <p className="text-gray-200 text-xs truncate">{invoice.vehicleNumber || "—"}</p>
                  </div>
                </div>

                {/* Dates & Amount */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs mb-1">Issued</p>
                    <p className="text-gray-200 text-xs truncate">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs mb-1">Due</p>
                    <p className="text-gray-200 text-xs truncate">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs mb-1">Total</p>
                    <p className="text-blue-400 font-bold text-xs truncate">{formatCurrency(invoice.totalAmount)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Eye className="w-3 h-3" />}
                    onClick={() => onViewInvoice(invoice)}
                    className="flex-1 min-w-0"
                    title="View Invoice"
                  >
                    <span className="text-xs">View</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download className="w-3 h-3" />}
                    onClick={() => onDownloadInvoice(invoice)}
                    className="flex-1 min-w-0"
                    title="Download PDF"
                  >
                    <span className="text-xs">PDF</span>
                  </Button>
                  {invoice.paymentStatus === "Pending" || invoice.paymentStatus === "Rejected" ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle className="w-3 h-3" />}
                      onClick={() => onMarkAsPaid(invoice)}
                      className="flex-1 min-w-0 bg-green-600 hover:bg-green-700"
                      title="Mark as Paid"
                    >
                      <span className="text-xs">Pay</span>
                    </Button>
                  ) : hasTransaction ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle className="w-3 h-3" />}
                      onClick={() => handlePaidClick(invoice)}
                      className="flex-1 min-w-0 bg-green-600 hover:bg-green-700"
                      title="View Payment Details"
                    >
                      <span className="text-xs">Paid</span>
                    </Button>
                  ) : (
                    <div className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs">
                      <CheckCircle className="w-3 h-3 flex-shrink-0" /> Paid
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Mobile Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center p-3 text-gray-300 gap-3">
              <span className="text-xs sm:text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-shrink-0 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-shrink-0 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FinanceTable;