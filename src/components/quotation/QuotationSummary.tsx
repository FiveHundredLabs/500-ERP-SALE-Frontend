import React from 'react';

interface QuotationSummaryProps {
  subTotal: number;
  totalDiscountType?: 'percentage' | 'amount';
  totalDiscountValue?: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
  onTotalDiscountChange?: (discountType: 'percentage' | 'amount', discountValue: number) => void;
}

export const QuotationSummary: React.FC<QuotationSummaryProps> = ({
  subTotal,
  totalDiscountType = 'percentage',
  totalDiscountValue = 0,
  discountAmount,
  totalAmount,
  onTotalDiscountChange,
}) => {
  return (
    <div className="mt-6 pt-4 border-t border-[#334155] space-y-3">
      {/* Subtotal */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-300">Subtotal:</span>
        <span className="text-white font-medium font-mono">LKR {Math.round(subTotal).toLocaleString()}/=</span>
      </div>

      {/* Interactive Total Discount */}
      <div className="py-2.5 px-3 bg-[#0f172a]/60 rounded-lg border border-[#334155]/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 text-sm font-medium">Total Discount:</span>
            {onTotalDiscountChange && (
              <div className="flex bg-[#1e293b] p-0.5 rounded border border-[#334155]">
                <button
                  type="button"
                  onClick={() => onTotalDiscountChange('percentage', totalDiscountValue || 0)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                    totalDiscountType === 'percentage'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => onTotalDiscountChange('amount', totalDiscountValue || 0)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                    totalDiscountType === 'amount'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Rs.
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onTotalDiscountChange && (
              <div className="relative w-32">
                <input
                  type="number"
                  min="0"
                  max={totalDiscountType === 'amount' ? undefined : 100}
                  value={totalDiscountValue !== undefined && totalDiscountValue > 0 ? totalDiscountValue : ''}
                  placeholder="0"
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    onTotalDiscountChange(totalDiscountType, val);
                  }}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-sm font-mono text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 pointer-events-none">
                  {totalDiscountType === 'amount' ? 'Rs' : '%'}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <span className="text-red-400 font-mono text-sm font-medium">
                - LKR {Math.round(discountAmount).toLocaleString()}/=
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Final Total Amount */}
      <div className="flex justify-between items-center text-base sm:text-lg font-bold pt-3 border-t border-[#334155]">
        <span className="text-gray-200">Total Amount:</span>
        <span className="text-green-400 font-mono">LKR {Math.round(totalAmount).toLocaleString()}/=</span>
      </div>
    </div>
  );
};

export default QuotationSummary;
