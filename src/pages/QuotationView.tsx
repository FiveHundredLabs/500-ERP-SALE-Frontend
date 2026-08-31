import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import QuotationCanvas from "../components/quotation/QuotationCanvas";
import type { QuotationData } from "../types/quotation";
import { quotationService } from "../services/QuotationService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";

const QuotationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  useEffect(() => {
    const fetchQuotationData = async () => {
      if (!id) {
        setAlert({ type: 'error', message: 'Quotation ID is required' });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await quotationService.getById(id);
        
        const discountPercentage = response.subTotal > 0 
          ? (response.discount / response.subTotal) * 100 
          : 0;

        const quotationData: QuotationData = {
          id: response.id,
          quotationNumber: response.quotationNumber,
          customer: response.customer.id || '',
          customerDetails: response.customer,
          items: response.items.map((item: any, index: number) => ({
            id: (Date.now() + index).toString(),
            inventoryItemId: item.inventoryItemId,
            inventoryItem: item.inventoryItem,
            itemName: item.itemName || item.inventoryItem?.productName || 'Unknown Item',
            productCode: item.productCode || item.inventoryItem?.productCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          subTotal: response.subTotal,
          discount: response.discount,
          discountPercentage: discountPercentage,
          totalAmount: response.totalAmount,
          paymentMethod: response.paymentMethod,
          status: response.status,
          issueDate: response.issueDate.split('T')[0],
          validUntil: response.validUntil.split('T')[0],
          notes: response.notes || '',
        };

        setQuotationData(quotationData);
      } catch (error) {
        console.error('Error fetching quotation:', error);
        setAlert({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to load quotation'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotationData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!quotationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Quotation Not Found</h1>
          <p className="text-gray-600 mb-6">The requested quotation could not be loaded or doesn't exist.</p>
          <div className="text-sm text-gray-500">
            Please check the quotation link or contact support.
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

      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <div 
          className="bg-white shadow-lg"
          style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
          }}
        >
          <ErrorBoundary>
            <QuotationCanvas quotationData={quotationData} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default QuotationView;
