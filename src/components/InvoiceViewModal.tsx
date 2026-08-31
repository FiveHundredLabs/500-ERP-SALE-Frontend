import React, { useRef, useState } from 'react';
import { FileText, Download, AlertCircle, Printer } from 'lucide-react';
import { Modal, Button, LoadingSpinner } from './common';
import InvoiceCanvas from './InvoiceCanvas';
import html2canvas from 'html2canvas';
import type { InvoiceResponse } from '../types/invoice';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice: InvoiceResponse | null;
  onDownloadInvoice: (invoice: InvoiceResponse) => Promise<void>;
  onReturnInvoice?: (invoice: InvoiceResponse) => void;
  isGeneratingPDF: boolean;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice,
  onDownloadInvoice,
  onReturnInvoice,
  isGeneratingPDF
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!selectedInvoice || !invoiceRef.current) return;

    try {
      setIsPrinting(true);
      setError('');
      
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
          <InvoiceCanvas
            invoiceData={{
              invoiceNumber: selectedInvoice.invoiceNumber,
              customer: selectedInvoice.customer?.id || "",
              customerDetails: selectedInvoice.customer ?? undefined,
              items: selectedInvoice.items.map(item => ({
                id: item.id || Date.now().toString(),
                inventoryItemId: item.inventoryItemId,
                itemName: item.itemName || item.inventoryItem?.productName || "Item",
                itemCode: item.itemCode || item.inventoryItem?.productCode || '',
                discount: item.discount || 0,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
              })),
              subTotal: selectedInvoice.subTotal,
              discount: selectedInvoice.discount,
              discountPercentage: selectedInvoice.discount > 0 ? (selectedInvoice.discount / selectedInvoice.subTotal) * 100 : 0,
              totalAmount: selectedInvoice.totalAmount,
              paymentStatus: selectedInvoice.paymentStatus,
              paymentMethod: selectedInvoice.paymentMethod,
              bankDepositDate: selectedInvoice.bankDepositDate,
              issueDate: selectedInvoice.issueDate,
              dueDate: selectedInvoice.dueDate,
              vehicleNumber: selectedInvoice.vehicleNumber,
              notes: selectedInvoice.notes,
              applyVat: selectedInvoice.applyVat ?? false,
              vatAmount: selectedInvoice.vatAmount ?? 0,
              taxRate: selectedInvoice.taxRate ?? 0,
              paidAmount: selectedInvoice.paidAmount,
              salesman: typeof selectedInvoice.salesman === 'object' && selectedInvoice.salesman !== null 
                ? selectedInvoice.salesman 
                : (selectedInvoice.salesmanName ? { id: '', name: selectedInvoice.salesmanName } : null),
            }}
          />
        </div>
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const pages = tempContainer.querySelectorAll('.invoice-page');
      if (pages.length === 0) throw new Error('Invoice element not found');

      const images: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        images.push(canvas.toDataURL('image/png', 1.0));
      }

      root.unmount();
      document.body.removeChild(tempContainer);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError("Popup blocked! Please allow popups for this site to print.");
        setIsPrinting(false);
        return;
      }

      const imgTags = images.map(src => `<img class="invoice-image" src="${src}" />`).join('');

      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${selectedInvoice.invoiceNumber}</title>
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
                  page-break-inside: avoid;
                  page-break-after: avoid;
                }
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
      console.error('Error printing invoice:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice Preview - ${selectedInvoice?.invoiceNumber}`}
      icon={<FileText className="w-5 h-5 text-blue-400" />}
      size="xl"
      className="max-h-[95vh] max-w-[95vw] flex flex-col"
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Action Buttons */}
        <div className="flex-shrink-0 flex justify-between items-center gap-3 mb-4 px-2">
          <p className="text-sm text-gray-400">
            Viewing invoice details
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
              disabled={isGeneratingPDF || !selectedInvoice || isPrinting}
              isLoading={isPrinting}
            >
              Print
            </Button>
            {onReturnInvoice && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => selectedInvoice && onReturnInvoice(selectedInvoice)}
                disabled={isGeneratingPDF || !selectedInvoice || isPrinting}
                className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
              >
                Return Invoice
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={() => selectedInvoice && onDownloadInvoice(selectedInvoice)}
              isLoading={isGeneratingPDF}
              disabled={isGeneratingPDF || !selectedInvoice || isPrinting}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex-shrink-0 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 mx-2">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div className="text-sm text-red-400">{error}</div>
            </div>
          </div>
        )}

        {/* Invoice Preview Container */}
        <div className="flex-1 overflow-auto bg-gray-800 rounded-lg min-h-0 px-1">
          {isGeneratingPDF ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="lg" text="Generating PDF..." />
            </div>
          ) : selectedInvoice ? (
            <div className="h-full w-full flex items-center justify-center">
              <div
                ref={invoiceRef}
                className="bg-white overflow-auto"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  transform: 'scale(0.9)',
                  transformOrigin: 'center',
                  overflow: 'hidden'
                }}
              >
                <InvoiceCanvas
                  invoiceData={{
                    invoiceNumber: selectedInvoice.invoiceNumber,
                    customer: selectedInvoice.customer?.id || "",
                    customerDetails: selectedInvoice.customer ?? undefined,
                    items: selectedInvoice.items.map(item => ({
                      id: item.id || Date.now().toString(),
                      inventoryItemId: item.inventoryItemId,
                      itemName: item.itemName || item.inventoryItem?.productName || "Item",
                      itemCode: item.itemCode || item.inventoryItem?.productCode || '',
                      discount: item.discount || 0,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      total: item.total,
                    })),
                    subTotal: selectedInvoice.subTotal,
                    discount: selectedInvoice.discount,
                    discountPercentage: selectedInvoice.discount > 0 ? (selectedInvoice.discount / selectedInvoice.subTotal) * 100 : 0,
                    totalAmount: selectedInvoice.totalAmount,
                    paymentStatus: selectedInvoice.paymentStatus,
                    paymentMethod: selectedInvoice.paymentMethod,
                    bankDepositDate: selectedInvoice.bankDepositDate,
                    issueDate: selectedInvoice.issueDate,
                    dueDate: selectedInvoice.dueDate,
                    vehicleNumber: selectedInvoice.vehicleNumber,
                    notes: selectedInvoice.notes,
                      applyVat: selectedInvoice.applyVat ?? false,
                      vatAmount: selectedInvoice.vatAmount ?? 0,
                      taxRate: selectedInvoice.taxRate ?? 0,
                      paidAmount: selectedInvoice.paidAmount,
                      salesman: typeof selectedInvoice.salesman === 'object' && selectedInvoice.salesman !== null 
                        ? selectedInvoice.salesman 
                        : (selectedInvoice.salesmanName ? { id: '', name: selectedInvoice.salesmanName } : null),
                    }}
                  />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No invoice selected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceViewModal;
