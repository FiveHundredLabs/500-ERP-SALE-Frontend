import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Printer,
  Download,
  Copy,
  Check,
  MessageCircle,
  FileText,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import InvoiceCanvas from "../components/InvoiceCanvas";
import type { InvoiceData } from "../types/invoice";
import type { PurchaseOrder } from "../types/purchaseOrders";
import { purchaseOrderService } from "../services/PurchaseOrderService";
import { generatePOWhatsAppMessage, getWhatsAppUrl } from "../utils/whatsapp";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";

const PurchaseOrderPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [poData, setPoData] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const poRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPOData = async () => {
      if (!id) {
        setAlert({ type: 'error', message: 'Purchase Order ID is required' });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await purchaseOrderService.getById(id);
        setPoData(response);
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        setAlert({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load purchase order'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOData();
  }, [id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setAlert({ type: 'success', message: 'Purchase order link copied to clipboard!' });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadPDF = async () => {
    if (!poRef.current || !poData) return;
    try {
      setIsGeneratingPDF(true);
      const pages = poRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      const fileName = `PurchaseOrder-${poData.poNumber || 'document'}.pdf`;
      pdf.save(fileName);
      setAlert({ type: 'success', message: 'Purchase order PDF downloaded successfully.' });
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setAlert({ type: 'error', message: 'Failed to generate PDF' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    if (!poRef.current || !poData) return;
    try {
      setIsPrinting(true);
      const pages = poRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) {
        window.print();
        return;
      }

      const images: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        images.push(canvas.toDataURL('image/jpeg', 0.95));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const imgTags = images.map(src => `<img class="page-img" src="${src}" />`).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order ${poData.poNumber}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .page-img {
                width: 210mm;
                height: 297mm;
                object-fit: contain;
                display: block;
                page-break-after: always;
              }
              .page-img:last-child {
                page-break-after: auto;
              }
              @media print {
                body { margin: 0 !important; padding: 0 !important; }
              }
            </style>
          </head>
          <body>
            ${imgTags}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 1000);
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to print with custom canvas, falling back to standard print:', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!poData) return;
    const text = generatePOWhatsAppMessage({
      poNumber: poData.poNumber,
      supplierName: poData.supplierName,
      totalAmount: poData.totalAmount,
      poDate: poData.poDate ? String(poData.poDate).split('T')[0] : '',
      itemsCount: poData.totalItems || poData.items?.length || 0,
      remarks: poData.notes,
      shareUrl: window.location.href,
    });
    const url = getWhatsAppUrl(poData.supplierPhone || '', text);
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium text-sm">Loading Purchase Order...</p>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Purchase Order Not Found</h1>
          <p className="text-gray-600 mb-6">The requested purchase order could not be loaded or doesn't exist.</p>
          <div className="text-sm text-gray-500">
            Please check the purchase order link or contact S &amp; K Enterprises support.
          </div>
        </div>
      </div>
    );
  }

  // Map PurchaseOrder to InvoiceData shape expected by InvoiceCanvas
  const mappedInvoiceData: InvoiceData = {
    documentTitle: 'PURCHASE ORDER',
    invoiceNumber: poData.poNumber,
    customer: poData.supplierId || poData.supplierName,
    customerDetails: {
      id: poData.supplierId,
      customerCode: poData.supplierId,
      fullName: poData.supplierName,
      shopName: poData.supplierName,
      phone: poData.supplierPhone || '',
      address: poData.supplierAddress || '',
      city: poData.supplierCity || '',
      contactPerson: poData.supplierContact || '',
      salesRepName: poData.createdByName || '',
    },
    items: (poData.items || []).map((item, index) => ({
      id: item.id || (Date.now() + index).toString(),
      inventoryItemId: item.inventoryItemId || item.id,
      itemName: item.productName || 'Unknown Item',
      itemCode: item.sku || '',
      quantity: item.quantityOrdered,
      unitPrice: item.unitPrice,
      total: item.totalPrice,
      discount: item.discount || 0,
    })),
    subTotal: poData.subTotal,
    discount: poData.totalDiscount || 0,
    discountPercentage: poData.subTotal > 0 && poData.totalDiscount ? (poData.totalDiscount / poData.subTotal) * 100 : 0,
    totalAmount: poData.totalAmount,
    paymentStatus: (poData.paymentStatus === 'paid' ? 'completed' : 'pending') as any,
    paymentMethod: (poData.paymentTerms ? 'credit' : 'cash') as any,
    issueDate: poData.poDate ? String(poData.poDate).split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: poData.expectedDeliveryDate
      ? String(poData.expectedDeliveryDate).split('T')[0]
      : (poData.poDate ? String(poData.poDate).split('T')[0] : new Date().toISOString().split('T')[0]),
    vehicleNumber: '',
    notes: poData.notes || '',
    applyVat: false,
    vatAmount: poData.totalTax || 0,
    taxRate: 0,
    paidAmount: 0,
    salesman: poData.createdByName ? { id: '', name: poData.createdByName } : null,
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {alert && (
        <div className="fixed top-4 right-4 z-50">
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            duration={4000}
          />
        </div>
      )}

      {/* Top Action & Preview Header (Hidden during print) */}
      <div className="print:hidden bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Purchase Order</span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  {poData.poNumber}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">&bull; {poData.supplierName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Share via WhatsApp"
            >
              <MessageCircle size={14} />
              <span className="hidden xs:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Copy link to clipboard"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting || isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              title="Print document"
            >
              <Printer size={14} />
              <span>{isPrinting ? 'Printing...' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF || isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50 cursor-pointer"
              title="Download as PDF"
            >
              <Download size={14} />
              <span>{isGeneratingPDF ? 'Generating...' : 'PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Purchase Order Document Canvas (A4 format identical to Invoice/Quotation view) */}
      <div className="flex-1 flex justify-center items-center p-4 bg-gray-100 overflow-x-auto">
        <div 
          ref={poRef}
          className="w-[210mm] max-w-full bg-white shadow-xl"
        >
          <ErrorBoundary>
            <InvoiceCanvas invoiceData={mappedInvoiceData} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderPreview;
