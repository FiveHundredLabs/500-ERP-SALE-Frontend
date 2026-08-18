import React from 'react';

interface InvoiceSummaryProps {
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  applyVat: boolean;
}

export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({
  subTotal,
  discountPercentage,
  discountAmount,
  taxAmount,
  totalAmount,
  applyVat,
}) => {
  return (
    <div className="mt-6 pt-4 border-t border-[#334155]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300">Subtotal:</span>
        <span className="text-white font-medium font-mono">LKR {Math.round(subTotal).toLocaleString()}/=</span>
      </div>
      
      {applyVat && taxAmount > 0 && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300">Tax (18%):</span>
          <span className="text-yellow-400 font-medium font-mono">LKR {Math.round(taxAmount).toLocaleString()}/=</span>
        </div>
      )}
      
      {discountAmount > 0 && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300">Discount{discountPercentage > 0 ? ` (${discountPercentage.toFixed(1)}%)` : ''}:</span>
          <span className="text-red-400 font-medium font-mono">- LKR {Math.round(discountAmount).toLocaleString()}/=</span>
        </div>
      )}
      
      <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t border-[#334155]">
        <span className="text-gray-200">Total Amount:</span>
        <span className="text-green-400 font-mono">LKR {Math.round(totalAmount).toLocaleString()}/=</span>
      </div>
    </div>
  );
};