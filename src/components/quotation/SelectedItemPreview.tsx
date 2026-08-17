import React from 'react';
import { AlertCircle, TrendingUp, Tag, DollarSign, X } from 'lucide-react';

interface SelectedItemPreviewProps {
  itemName: string;
  productCode?: string;
  unitPrice: number;
  costPrice?: number;
  stockWarning?: string | null;
  onClearSelection: () => void;
}

export const SelectedItemPreview: React.FC<SelectedItemPreviewProps> = ({
  itemName,
  productCode,
  unitPrice,
  costPrice = 0,
  stockWarning,
  onClearSelection,
}) => {
  const profit = unitPrice - costPrice;
  const marginPct = unitPrice > 0 ? ((profit / unitPrice) * 100).toFixed(1) : "0.0";
  const isPositive = profit >= 0;

  return (
    <div className="bg-[#0f172a] border border-blue-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-blue-400" />
          <span className="font-semibold text-sm text-gray-200">Selected Product</span>
          {productCode && (
            <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              {productCode}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-gray-400 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
        >
          <X size={14} /> Clear Selection
        </button>
      </div>

      <div className="mb-3">
        <h4 className="font-bold text-base text-white">{itemName}</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Selling Price / Unit Price */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-lg p-2.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
            Selling Price (Unit Price)
          </span>
          <div className="font-mono text-base font-bold text-emerald-400">
            LKR {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Fixed (Non-editable)</span>
        </div>

        {/* Cost Price */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-lg p-2.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <DollarSign size={12} className="text-gray-400" /> Cost Price
          </span>
          <div className="font-mono text-base font-medium text-gray-300">
            LKR {costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">Inventory Cost</span>
        </div>

        {/* Profit Margin */}
        <div className="bg-[#1e293b]/70 border border-emerald-500/20 rounded-lg p-2.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-400" /> Profit Margin
          </span>
          <div className={`font-mono text-base font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            LKR {profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 inline-block mt-0.5">
            {marginPct}% Margin
          </span>
        </div>
      </div>

      {stockWarning && (
        <div className="mt-3 p-2.5 bg-amber-900/30 border border-amber-600/40 rounded-lg flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{stockWarning}</span>
        </div>
      )}
    </div>
  );
};
