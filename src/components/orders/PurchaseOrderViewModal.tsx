import React, { useRef, useState } from 'react';
import { FileText, Download, AlertCircle, Printer } from 'lucide-react';
import { Modal, Button, LoadingSpinner } from '../common';
import InvoiceCanvas from '../InvoiceCanvas';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { PurchaseOrder } from '../../types/purchaseOrders';

interface PurchaseOrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: PurchaseOrder | null;
}

export const PurchaseOrderViewModal: React.FC<PurchaseOrderViewModalProps> = ({
  isOpen,
  onClose,
  selectedPO,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = async () => {
    if (!selectedPO || !invoiceRef.current) return;

    try {
      setIsPrinting(true);
      setError('');
      
      const pages = invoiceRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return;
      
      const images: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        images.push(canvas.toDataURL('image/png', 1.0));
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError("Popup blocked! Please allow popups for this site to print.");
        setIsPrinting(false);
        return;
      }

      const imgTags = images.map(src => `<img src="${src}" alt="PO ${selectedPO.poNumber}" class="invoice-image" />`).join('');

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order ${selectedPO.poNumber}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #fff;
              }
              .invoice-image {
                width: 210mm;
                height: 297mm;
                object-fit: contain;
                display: block;
                page-break-after: always;
              }
              .invoice-image:last-child {
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
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 300);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Print error: ${errorMessage}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedPO || !invoiceRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const pages = invoiceRef.current.querySelectorAll('.invoice-page');
      if (pages.length === 0) return;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`PurchaseOrder-${selectedPO.poNumber}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!selectedPO) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order Preview - ${selectedPO.poNumber}`}
      icon={<FileText className="w-5 h-5 text-purple-400" />}
      size="xl"
      className="max-h-[95vh] max-w-[95vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 flex justify-between items-center gap-3 mb-4 px-2">
          <p className="text-sm text-gray-400">
            Previewing Purchase Order document
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              disabled={isGeneratingPDF || isPrinting}
              isLoading={isPrinting}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownloadPDF}
              isLoading={isGeneratingPDF}
              disabled={isGeneratingPDF || isPrinting}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex-shrink-0 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 mx-2">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="text-sm text-red-400">{error}</div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[#0b1120] rounded-xl p-4 flex items-center justify-center min-h-[550px]">
          {isGeneratingPDF ? (
            <LoadingSpinner size="lg" text="Generating Document..." />
          ) : (
            <div
              ref={invoiceRef}
              style={{
                width: '210mm',
                minHeight: '297mm',
                backgroundColor: 'white',
                transform: 'scale(0.88)',
                transformOrigin: 'top center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                margin: '0 auto',
              }}
            >
              <InvoiceCanvas
                invoiceData={{
                  documentTitle: "PURCHASE ORDER",
                  invoiceNumber: selectedPO.poNumber,
                  invoiceId: selectedPO.poNumber,
                  customer: selectedPO.supplierId || selectedPO.supplierName,
                  customerDetails: {
                    _id: selectedPO.supplierId || "",
                    fullName: selectedPO.supplierName,
                    shopName: selectedPO.supplierName,
                    phone: selectedPO.supplierPhone || "",
                    address: {
                      street: selectedPO.supplierAddress || "",
                      city: selectedPO.supplierCity || "",
                    },
                    salesRepName: selectedPO.createdByName || "",
                  } as any,
                  items: selectedPO.items.map(item => ({
                    id: item.id || Date.now().toString(),
                    inventoryItemId: (item as any).productId || (item as any).sku || 'unknown',
                    itemCode: (item as any).sku || '',
                    itemName: (item as any).productName || 'Product',
                    quantity: (item as any).orderedQuantity || (item as any).quantity || 0,
                    unitPrice: (item as any).unitPrice || 0,
                    total: (item as any).totalPrice || (item as any).total || 0,
                  })),
                  subTotal: (selectedPO as any).grandTotal || (selectedPO as any).totalAmount || 0,
                  discount: 0,
                  discountPercentage: 0,
                  totalAmount: (selectedPO as any).grandTotal || (selectedPO as any).totalAmount || 0,
                  paymentStatus: 'pending',
                  paymentMethod: 'cash',
                  issueDate: selectedPO.poDate,
                  dueDate: selectedPO.poDate,
                  vehicleNumber: '',
                  notes: selectedPO.notes,
                  applyVat: false,
                  vatAmount: 0,
                  taxRate: 0,
                  paidAmount: 0,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PurchaseOrderViewModal;
