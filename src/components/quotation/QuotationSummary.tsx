import React from 'react';

interface QuotationSummaryProps {
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
}

export const QuotationSummary: React.FC<QuotationSummaryProps> = ({
  subTotal,
  discountPercentage,
  discountAmount,
  totalAmount,
}) => {
  return (
    <div className="mt-6 pt-4 border-t border-[#334155]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300">Subtotal:</span>
        <span className="text-white font-medium">LKR {subTotal.toFixed(2)}</span>
      </div>
      {discountPercentage > 0 && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300">Discount ({discountPercentage.toFixed(2)}%):</span>
          <span className="text-red-400 font-medium">- LKR {discountAmount.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between items-center text-lg font-semibold pt-2 border-t border-[#334155]">
        <span className="text-gray-200">Total Amount:</span>
        <span className="text-green-400">LKR {totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
};
