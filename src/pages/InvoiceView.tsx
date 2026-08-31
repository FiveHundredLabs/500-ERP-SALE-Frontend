import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InvoiceCanvas from "../components/InvoiceCanvas";
import type { InvoiceData } from "../types/invoice";
import { invoiceService } from "../services/InvoiceService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";

const InvoiceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!id) {
        setAlert({ type: 'error', message: 'Invoice ID is required' });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await invoiceService.getById(id);
        
        const customerDetails = typeof response.customer === 'object' ? response.customer : undefined;
        
        const invoiceData: InvoiceData = {
          id: response.id,
          invoiceNumber: response.invoiceNumber,
          customer: typeof response.customer === 'object' ? (response.customer as any).id || '' : response.customer || '',
          customerDetails: customerDetails ?? undefined,
          items: response.items.map((item: any, index: number) => ({
            id: (Date.now() + index).toString(),
            inventoryItemId: item.inventoryItemId,
            itemName: item.itemName || item.inventoryItem?.productName || 'Unknown Item',
            itemCode: item.itemCode || item.inventoryItem?.productCode || '',
            discount: item.discount || 0,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          subTotal: response.subTotal,
          discount: response.discount,
          discountPercentage: response.subTotal > 0 ? (response.discount / response.subTotal) * 100 : 0,
          totalAmount: response.totalAmount,
          paymentStatus: response.paymentStatus,
          paymentMethod: response.paymentMethod,
          bankDepositDate: response.bankDepositDate ? response.bankDepositDate.split('T')[0] : undefined,
          issueDate: response.issueDate.split('T')[0],
          dueDate: response.dueDate.split('T')[0],
          vehicleNumber: response.vehicleNumber || '',
          notes: response.notes || '',
          applyVat: response.applyVat ?? false,
          vatAmount: response.vatAmount ?? 0,
          taxRate: response.taxRate ?? 0,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt
        };

        setInvoiceData(invoiceData);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setAlert({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load invoice'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-6">The requested invoice could not be loaded or doesn't exist.</p>
          <div className="text-sm text-gray-500">
            Please check the invoice link or contact support.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-0">
      {alert && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
          duration={5000}
        />
      )}

      {/* Standalone Invoice Display */}
      <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
        <div className="w-[210mm] max-w-full bg-white shadow-lg">
          <ErrorBoundary>
            <InvoiceCanvas invoiceData={invoiceData} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
