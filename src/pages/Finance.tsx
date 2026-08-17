import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import FinanceTable from "../components/FinanceTable";
import SearchFilterBar from "../components/SearchFilterBar";
import PaymentModal from "../components/PaymentModal";
import InvoiceViewModal from "../components/InvoiceViewModal";
import { LoadingSpinner } from "../components/common";
import { DollarSign } from "lucide-react";
import type { InvoiceResponse } from "../types/invoice";
import type { FinancePaymentData, FinanceTransaction } from "../types/finance";
import { invoiceService } from "../services/InvoiceService";
import { financeService } from "../services/FinanceService";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import CustomConfirm from "../components/CustomConfirm";
import InvoiceCanvas from "../components/InvoiceCanvas";
import UserProfileDropdown from "../components/UserProfileDropdown";

const Finance: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterConfig, setFilterConfig] = useState({
    searchQuery: "",
    selectedField: "All Fields",
    startDate: "",
    endDate: ""
  });
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "danger" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => { },
  });

  const [paymentDetails, setPaymentDetails] = useState({
    method: "Bank Transfer" as 'Bank Transfer' | 'Cash' | 'Card' | 'Bank Deposit' | 'Cheque' | 'Credit',
    bankName: "",
    accountNumber: "",
    transactionRef: "",
    amount: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  // Load invoices from backend
  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to load invoices. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load finance transactions
  const loadFinanceTransactions = async () => {
    try {
      const transactions = await financeService.getAll();
      setFinanceTransactions(transactions);
    } catch (error) {
      // Error handled by service 
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadInvoices(),
        loadFinanceTransactions()
      ]);
    };

    loadAllData();
  }, []);

  const handleMarkAsPaid = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
    setPaymentDetails({
      method: "Bank Transfer",
      bankName: "",
      accountNumber: "",
      transactionRef: "",
      amount: invoice.totalAmount.toFixed(2),
      transactionDate: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInvoice) return;

    try {
      setIsProcessingPayment(true);

      // First get the next transaction ID
      const transactionId = await financeService.getNextId();

      // Prepare payment data
      const paymentData: FinancePaymentData = {
        transactionId: transactionId,
        transactionDate: new Date(paymentDetails.transactionDate).toISOString(),
        paymentMethod: {
          type: paymentDetails.method,
          bankName: paymentDetails.bankName || 'N/A',
          accountNumber: paymentDetails.accountNumber || 'N/A',
          transactionRef: paymentDetails.transactionRef || 'PAY-' + Date.now(),
        },
        invoice: {
          invoiceId: selectedInvoice.invoiceId,
        },
        amount: 'LKR ' + parseFloat(paymentDetails.amount).toFixed(2),
      };

      // Create finance transaction
      await financeService.create(paymentData);

      // Update invoice payment status to "Completed"
      await invoiceService.updatePaymentStatus(selectedInvoice._id, 'Completed');

      setAlert({
        type: 'success',
        message: 'Payment successfully recorded for invoice ' + selectedInvoice.invoiceId
      });

      // Refresh data
      await Promise.all([
        loadInvoices(),
        loadFinanceTransactions()
      ]);

      // Reset form
      setShowPaymentModal(false);
      setPaymentDetails({
        method: "Bank Transfer",
        bankName: "",
        accountNumber: "",
        transactionRef: "",
        amount: "",
        transactionDate: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        'Failed to process payment. Please try again.';
      setAlert({
        type: 'error',
        message: errorMessage
      });
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
        setAlert({
          type: 'info',
          message: 'Generating PDF... Please wait.'
        });

        // temporary container for the invoice
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '0';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm';
        tempContainer.style.minHeight = '297mm';
        tempContainer.style.backgroundColor = 'white';
        tempContainer.style.zIndex = '9999';
        tempContainer.style.opacity = '0';
        tempContainer.style.overflow = 'hidden';
        document.body.appendChild(tempContainer);

        // Render the InvoiceCanvas
        const invoiceData = {
          invoiceId: invoice.invoiceId,
          customer: invoice.customer?._id || "",
          customerDetails: invoice.customer,
          items: invoice.items.map(item => ({
            id: item._id || Date.now().toString(),
            item: item.item?._id || "",
            itemName: item.item?.product_name || item.item?.itemName || item.item?.description || "Item",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
          subTotal: invoice.subTotal,
          discount: invoice.discount,
          discountPercentage: invoice.discount > 0 ? (invoice.discount / invoice.subTotal) * 100 : 0,
          totalAmount: invoice.totalAmount,
          paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod,
          bankDepositDate: invoice.bankDepositDate,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          vehicleNumber: invoice.vehicleNumber,
          notes: invoice.notes,
          applyVat: invoice.applyVat ?? false,
          vatAmount: invoice.vatAmount ?? 0,
          taxRate: invoice.taxRate ?? 0,
        };

        const { createRoot } = await import('react-dom/client');
        const root = createRoot(tempContainer);

        root.render(
          <div
            style={{
              width: '210mm',
              minHeight: '297mm',
              backgroundColor: 'white',
              padding: '0',
              margin: '0',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <InvoiceCanvas invoiceData={invoiceData} />
          </div>
        );

        await new Promise(resolve => setTimeout(resolve, 500));

        const invoiceElement = tempContainer.firstChild as HTMLElement;
        if (!invoiceElement) throw new Error('Invoice element not found');

        // Generate PDF
        const canvas = await html2canvas(invoiceElement, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Center the image on the page
        const xOffset = 0;
        const yOffset = 0;
        
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
        pdf.save(`invoice-${invoice.invoiceId}.pdf`);

        // Cleanup
        root.unmount();
        document.body.removeChild(tempContainer);

        setAlert({
          type: 'success',
          message: 'PDF downloaded successfully!'
        });
      } catch (error) {
        setAlert({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
        });
      } finally {
        setIsGeneratingPDF(false);
      }
    };

    if (!invoice._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Save Invoice First",
        message: "This invoice needs to be saved before downloading. Save now?",
        confirmText: "Save & Download",
        onConfirm: async () => {
          try {
            // Update payment status if pending
            if (invoice.paymentStatus === 'Pending') {
              await invoiceService.updatePaymentStatus(invoice._id, 'Completed');
              await loadInvoices();
            }
            await proceedWithDownload();
          } catch (error) {
            setAlert({
              type: 'error',
              message: 'Failed to save invoice before download'
            });
          }
        }
      });
      return;
    }

    await proceedWithDownload();
  };

  // Suggestions for instant search dropdown
  const financeSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];
    const seenCustomers = new Set<string>();

    invoices.forEach(inv => {
      // 1. Invoices
      suggestions.push({
        id: `inv-${inv._id || inv.invoiceId}`,
        title: inv.invoiceId,
        subtitle: `${inv.customer?.fullName || 'Customer'} · LKR ${(inv.totalAmount || 0).toLocaleString()} · ${inv.paymentStatus}`,
        category: 'Invoice ID',
        value: inv.invoiceId,
      });

      // 2. Customers
      if (inv.customer?.fullName && !seenCustomers.has(inv.customer.fullName)) {
        seenCustomers.add(inv.customer.fullName);
        suggestions.push({
          id: `cust-${inv.customer._id || inv.customer.fullName}`,
          title: inv.customer.fullName,
          subtitle: `${inv.customer.phone ? `${inv.customer.phone} · ` : ''}${inv.customer.email || ''}`,
          category: 'Customer',
          value: inv.customer.fullName,
        });
      }

      // 3. Vehicle Numbers
      if (inv.vehicleNumber) {
        suggestions.push({
          id: `veh-${inv.invoiceId}`,
          title: `Vehicle: ${inv.vehicleNumber}`,
          subtitle: `Invoice: ${inv.invoiceId} (${inv.customer?.fullName})`,
          category: 'Vehicle',
          value: inv.vehicleNumber,
        });
      }
    });

    return suggestions;
  }, [invoices]);

  // Filter invoices based on search and date range
  const filteredInvoices = invoices.filter(invoice => {
    const query = filterConfig.searchQuery.toLowerCase();
    const matchesSearch =
      invoice.invoiceId.toLowerCase().includes(query) ||
      invoice.customer?.fullName?.toLowerCase().includes(query) ||
      (invoice.vehicleNumber && invoice.vehicleNumber.toLowerCase().includes(query)) ||
      invoice.totalAmount.toString().includes(query);

    if (!matchesSearch) return false;

    // Date range filtering
    if (filterConfig.startDate || filterConfig.endDate) {
      const invoiceDate = new Date(invoice.issueDate);

      if (filterConfig.startDate) {
        const start = new Date(filterConfig.startDate);
        start.setHours(0, 0, 0, 0);
        if (invoiceDate < start) return false;
      }

      if (filterConfig.endDate) {
        const end = new Date(filterConfig.endDate);
        end.setHours(23, 59, 59, 999);
        if (invoiceDate > end) return false;
      }
    }

    // Field filtering
    if (filterConfig.selectedField !== "All Fields" && filterConfig.searchQuery.trim() !== "") {
      switch (filterConfig.selectedField) {
        case "Invoice ID":
          return invoice.invoiceId.toLowerCase().includes(filterConfig.searchQuery.toLowerCase());
        case "Customer Name":
          return invoice.customer?.fullName?.toLowerCase().includes(filterConfig.searchQuery.toLowerCase());
        case "Status":
          return invoice.paymentStatus.toLowerCase().includes(filterConfig.searchQuery.toLowerCase());
        default:
          return true;
      }
    }

    return true;
  });

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
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
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          type={confirmConfig.type}
          onConfirm={() => {
            confirmConfig.onConfirm();
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Header */}
        <div className="h-16 bg-[#1e293b]/80 backdrop-blur-xl border-b border-[#334155] flex items-center justify-between px-4 sm:px-6 shadow-lg relative z-40">
          <div className="flex items-center gap-3">
            <DollarSign className="text-blue-400 w-6 h-6" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-200">Finance</h1>
          </div>

          <div className="flex items-center gap-4">
            <UserProfileDropdown />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Search and Filters */}
          <div className="mb-8 bg-[#1e293b] border border-[#334155] rounded-lg p-4 sm:p-6">
            <SearchFilterBar
              config={filterConfig}
              onSearchChange={(query) => setFilterConfig({ ...filterConfig, searchQuery: query })}
              onFieldChange={(field) => setFilterConfig({ ...filterConfig, selectedField: field })}
              onDateRangeChange={(dates) => setFilterConfig({ ...filterConfig, ...dates })}
              suggestions={financeSuggestions}
            />
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <LoadingSpinner size="lg" text="Loading invoices..." />
            </div>
          ) : (
            /* Invoices Table */
            <FinanceTable
              invoices={filteredInvoices}
              loading={false}
              onViewInvoice={handleViewInvoice}
              onDownloadInvoice={handleDownloadInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              financeTransactions={financeTransactions}
            />
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        selectedInvoice={selectedInvoice}
        paymentDetails={paymentDetails}
        onPaymentDetailsChange={setPaymentDetails}
        onSubmit={handlePaymentSubmit}
        isProcessing={isProcessingPayment}
      />

      {/* Invoice View Modal */}
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
