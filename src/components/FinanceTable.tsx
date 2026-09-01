import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Eye, 
  Download, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  UserCheck, 
  DollarSign, 
  Receipt 
} from "lucide-react";
import { Button } from "./common";
import { ActionMenu } from "./erp";
import type { InvoiceResponse } from "../types/invoice";
import { getInvoiceCalculatedStatus } from "../types/invoice";
import type { FinanceTransaction } from "../types/finance";
import PaymentBreakdownTooltip from "./invoice/PaymentBreakdownTooltip";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
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
                  Transaction: {transaction.transactionNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {transaction ? (
            <div className="space-y-4 text-xs">
              <div className="bg-[#0f172a] rounded-lg p-4 border border-[#334155] space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                  <span className="text-gray-400">Transaction ID:</span>
                  <span className="font-mono text-cyan-400 font-bold">{transaction.transactionNumber}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-gray-200">{formatDateTime(transaction.transactionDate)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-emerald-400 font-bold">{transaction.paymentMethod.replaceAll('_', ' ')}</span>
                </div>
                {transaction.transactionRef && (
                  <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                    <span className="text-gray-400">Cheque / Reference:</span>
                    <span className="font-mono text-gray-200">{transaction.transactionRef}</span>
                  </div>
                )}
                {transaction.bankName && (
                  <div className="flex justify-between items-center pb-2 border-b border-[#334155]">
                    <span className="text-gray-400">Bank:</span>
                    <span className="text-gray-200">{transaction.bankName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-300 font-semibold">Amount Paid:</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">{transaction.amount}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400">No transaction data available.</p>
          )}
        </div>
      </div>
    </div>
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
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'near_due' | 'partially_paid' | 'completed'>('all');
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

  // Auto-track Credit Period & Due Date Statuses with live paid & remaining amounts
  const trackedInvoices = useMemo(() => {
    return invoices.map(inv => {
      const calc = getInvoiceCalculatedStatus(inv);
      return {
        ...inv,
        calculatedStatus: calc.status,
        effectivePaidAmount: calc.paidAmount,
        effectiveRemainingAmount: calc.remainingAmount,
        diffDays: calc.diffDays,
      };
    });
  }, [invoices]);

  const overdueInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'overdue'), [trackedInvoices]);
  const nearDueInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'due_soon'), [trackedInvoices]);
  const partiallyPaidInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'partially_paid'), [trackedInvoices]);
  const completedInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'paid'), [trackedInvoices]);

  const totalOverdueAmount = useMemo(() => overdueInvoices.reduce((sum, i) => sum + i.effectiveRemainingAmount, 0), [overdueInvoices]);
  const totalNearDueAmount = useMemo(() => nearDueInvoices.reduce((sum, i) => sum + i.effectiveRemainingAmount, 0), [nearDueInvoices]);
  const totalOutstandingAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.effectiveRemainingAmount, 0), [trackedInvoices]);

  const filteredInvoices = useMemo(() => {
    if (activeTab === 'overdue') return overdueInvoices;
    if (activeTab === 'near_due') return nearDueInvoices;
    if (activeTab === 'partially_paid') return partiallyPaidInvoices;
    if (activeTab === 'completed') return completedInvoices;
    return trackedInvoices;
  }, [trackedInvoices, overdueInvoices, nearDueInvoices, partiallyPaidInvoices, completedInvoices, activeTab]);

  // Find transaction for a specific invoice
  const getTransactionForInvoice = (invoiceNumber: string) => {
    return financeTransactions.find(transaction => 
      transaction?.invoice?.invoiceNumber === invoiceNumber || transaction?.invoice?.invoiceNumber?.includes(invoiceNumber)
    ) || null;
  };

  // Handle Paid button click
  const handlePaidClick = (invoice: InvoiceResponse) => {
    const transaction = getTransactionForInvoice(invoice.invoiceNumber);
    if (transaction) {
      setSelectedTransaction(transaction);
      setShowTransactionDetails(true);
    } else {
      const alternativeTransaction = financeTransactions.find(t => 
        t.invoice?.invoiceNumber === invoice.invoiceNumber || t.invoice?.invoiceNumber?.includes(invoice.invoiceNumber)
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
        {/* Credit Period & Due Date Tracking KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-3.5 flex items-center gap-3 shadow-md">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium truncate">Outstanding Total</p>
              <p className="text-base sm:text-lg font-bold font-mono text-white tracking-tight truncate">
                {formatCurrency(totalOutstandingAmount)}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {trackedInvoices.filter(i => i.effectiveRemainingAmount > 0).length} pending balance
              </p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-red-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md bg-gradient-to-r from-red-950/20 to-transparent">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-red-300 font-medium truncate">Overdue Payments</p>
              <p className="text-base sm:text-lg font-bold font-mono text-red-400 tracking-tight truncate">
                {formatCurrency(totalOverdueAmount)}
              </p>
              <p className="text-[11px] text-red-400/80 font-medium truncate">
                {overdueInvoices.length} invoices passed due date
              </p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-amber-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md bg-gradient-to-r from-amber-950/20 to-transparent">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-amber-300 font-medium truncate">Near Expiry (7d)</p>
              <p className="text-base sm:text-lg font-bold font-mono text-amber-400 tracking-tight truncate">
                {formatCurrency(totalNearDueAmount)}
              </p>
              <p className="text-[11px] text-amber-400/80 font-medium truncate">
                {nearDueInvoices.length} invoices due in 7d
              </p>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-green-500/30 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
            <div className="p-2.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 shrink-0">
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

        {/* Overdue Alert Banner */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-red-300 truncate">
                  Credit Expiry Alert: {overdueInvoices.length} Overdue Invoice(s)
                </h4>
                <p className="text-[11px] text-red-400/90 truncate">
                  Total {formatCurrency(totalOverdueAmount)} has exceeded agreed credit period.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              View Overdue ({overdueInvoices.length})
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#334155] pb-2.5">
          {[
            { id: 'all', label: 'All Invoices', count: trackedInvoices.length },
            { id: 'overdue', label: 'Overdue Credit Period', count: overdueInvoices.length, badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
            { id: 'near_due', label: 'Near Due (7 Days)', count: nearDueInvoices.length, badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { id: 'partially_paid', label: 'partially_paid', count: partiallyPaidInvoices.length, badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            { id: 'completed', label: 'Completed / Paid', count: completedInvoices.length, badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
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

        {/* Compact Table (Desktop & Tablet) - Zero horizontal scroll */}
        <div className="bg-[#1e293b]/60 backdrop-blur-sm border border-[#334155] rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#334155] bg-[#1e293b] text-gray-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Invoice ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-2.5">Sales Officer</th>
                  <th className="py-3 px-2.5 text-right">Invoice Total</th>
                  <th className="py-3 px-2.5 text-right">Remaining</th>
                  <th className="py-3 px-2.5 text-center">Status</th>
                  <th className="py-3 px-2.5">Due Date</th>
                  <th className="py-3 px-3 text-right w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60 text-xs">
                {paginatedInvoices.map((invoice, idx) => {
                  const transaction = getTransactionForInvoice(invoice.invoiceNumber);
                  const hasTransaction = invoice.calculatedStatus === "paid" && transaction;

                  const sName = invoice.salesman?.fullName || invoice.salesmanName || '';

                  return (
                    <tr
                      key={invoice.id}
                      className={`transition-colors hover:bg-[#1e293b] ${
                        invoice.calculatedStatus === 'overdue' ? "bg-red-950/15" : (idx % 2 === 0 ? "bg-[#1e293b]/30" : "bg-[#1e293b]/10")
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">
                        <div>{invoice.invoiceNumber}</div>
                        <div className="text-[10px] text-gray-400 font-sans">{formatDate(invoice.issueDate)}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-semibold text-white truncate block max-w-[150px]">
                          {(invoice.customer as any)?.shopName || (invoice.customer as any)?.fullName || "N/A"}
                        </span>
                      </td>

                      <td className="py-3 px-2.5">
                        {sName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium truncate max-w-[110px]">
                            <UserCheck size={10} className="text-blue-400 shrink-0" />
                            <span className="truncate">{sName}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3 px-2.5 text-right">
                        <PaymentBreakdownTooltip
                          totalAmount={invoice.totalAmount || 0}
                          paidAmount={invoice.effectivePaidAmount}
                          remainingAmount={invoice.effectiveRemainingAmount}
                          statusText={invoice.calculatedStatus}
                        >
                          <span className="font-mono text-emerald-400 font-bold text-xs cursor-help underline decoration-emerald-500/30 underline-offset-2">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </PaymentBreakdownTooltip>
                      </td>

                      <td className="py-3 px-2.5 text-right">
                        <PaymentBreakdownTooltip
                          totalAmount={invoice.totalAmount || 0}
                          paidAmount={invoice.effectivePaidAmount}
                          remainingAmount={invoice.effectiveRemainingAmount}
                          statusText={invoice.calculatedStatus}
                        >
                          <span className={`font-mono font-bold text-xs cursor-help ${invoice.effectiveRemainingAmount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {formatCurrency(invoice.effectiveRemainingAmount)}
                          </span>
                        </PaymentBreakdownTooltip>
                      </td>

                      <td className="py-3 px-2.5 text-center">
                        <PaymentBreakdownTooltip
                          totalAmount={invoice.totalAmount || 0}
                          paidAmount={invoice.effectivePaidAmount}
                          remainingAmount={invoice.effectiveRemainingAmount}
                          statusText={invoice.calculatedStatus}
                        >
                          {invoice.calculatedStatus === 'paid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              <CheckCircle className="w-3 h-3" /> Paid
                            </span>
                          )}
                          {invoice.calculatedStatus === 'partially_paid' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              <Clock className="w-3 h-3" /> Partially Paid
                            </span>
                          )}
                          {invoice.calculatedStatus === 'overdue' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              <ShieldAlert className="w-3 h-3" /> Overdue
                            </span>
                          )}
                          {invoice.calculatedStatus === 'due_soon' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" /> Due Soon
                            </span>
                          )}
                          {invoice.calculatedStatus === 'outstanding' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-300 border border-gray-700">
                              Outstanding
                            </span>
                          )}
                        </PaymentBreakdownTooltip>
                      </td>

                      <td className="py-3 px-2.5 text-gray-300 font-mono text-xs whitespace-nowrap">
                        <div>{formatDate(invoice.dueDate)}</div>
                        {invoice.calculatedStatus === 'overdue' && (
                          <div className="text-[10px] text-red-400 font-bold">{Math.abs(invoice.diffDays)}d overdue</div>
                        )}
                        {invoice.calculatedStatus === 'due_soon' && (
                          <div className="text-[10px] text-amber-400 font-bold">in {invoice.diffDays}d</div>
                        )}
                      </td>

                      {/* Three-Dot Menu (⋮) */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <ActionMenu
                            title="Invoice Actions"
                            items={[
                              {
                                items: [
                                  {
                                    label: 'View Invoice',
                                    icon: <Eye size={13} />,
                                    variant: 'blue',
                                    onClick: () => onViewInvoice(invoice),
                                  },
                                  {
                                    label: 'Download PDF',
                                    icon: <Download size={13} />,
                                    variant: 'default',
                                    onClick: () => onDownloadInvoice(invoice),
                                  },
                                ],
                              },
                              {
                                items: [
                                  ...(invoice.effectiveRemainingAmount > 0
                                    ? [
                                        {
                                          label: 'Pay Remaining',
                                          icon: <DollarSign size={13} />,
                                          variant: 'emerald' as const,
                                          onClick: () => onMarkAsPaid(invoice),
                                        },
                                      ]
                                    : []),
                                  ...(hasTransaction
                                    ? [
                                        {
                                          label: 'Payment Details',
                                          icon: <Receipt size={13} />,
                                          variant: 'emerald' as const,
                                          onClick: () => handlePaidClick(invoice),
                                        },
                                      ]
                                    : []),
                                ],
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center p-3 sm:p-4 text-gray-300 gap-3 border-t border-[#334155]">
              <span className="text-xs sm:text-sm">
                Page {currentPage} of {totalPages} ({sortedInvoices.length} records)
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
