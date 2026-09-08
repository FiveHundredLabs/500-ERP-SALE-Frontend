import React, { useRef } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { Modal, Button, LoadingSpinner } from './common';
import InvoiceCanvas from './InvoiceCanvas';
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

  const handlePrint = () => {
    window.print();
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
              disabled={isGeneratingPDF || !selectedInvoice}
            >
              Print
            </Button>
            {onReturnInvoice && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => selectedInvoice && onReturnInvoice(selectedInvoice)}
                disabled={isGeneratingPDF || !selectedInvoice}
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
              disabled={isGeneratingPDF || !selectedInvoice}
            >
              Download PDF
            </Button>
          </div>
        </div>

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
                    customer: typeof selectedInvoice.customer === 'object' ? (selectedInvoice.customer as any)?.id || '' : selectedInvoice.customer,
                    customerDetails: (typeof selectedInvoice.customer === 'object' ? selectedInvoice.customer : undefined) as any,
                    items: selectedInvoice.items.map((item: any) => ({
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
