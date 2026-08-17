import React, { useRef, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import type { QuotationItem } from '../../types/quotation';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ItemSearchAndAddProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  filteredItems: InventoryItem[];
  newItem: {
    item: string;
    itemName: string;
    product_code?: string;
    quantity: string | number;
    unitPrice: string | number;
    costPrice?: number;
    discountType?: 'percentage' | 'amount';
    discountScope?: 'per_unit' | 'total_qty';
    discountValue?: string | number;
  };
  onItemSelect: (item: InventoryItem) => void;
  onQuantityChange: (value: string) => void;
  onDiscountChange: (discountData: {
    discountType: 'percentage' | 'amount';
    discountScope: 'per_unit' | 'total_qty';
    discountValue: string;
  }) => void;
  onAddItem: (itemData?: {
    item: string;
    itemName: string;
    product_code?: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    discountType: 'percentage' | 'amount';
    discountScope: 'per_unit' | 'total_qty';
    discountValue: number;
    discountAmount: number;
    total: number;
  }) => void;
  onClearSelection: () => void;
  stockWarning: string | null;
  quotationItems: QuotationItem[];
}

export const ItemSearchAndAdd: React.FC<ItemSearchAndAddProps> = ({
  searchTerm,
  onSearchChange,
  showSuggestions,
  onShowSuggestionsChange,
  filteredItems,
  newItem,
  onItemSelect,
  onQuantityChange,
  onDiscountChange,
  onAddItem,
  onClearSelection,
  stockWarning,
  quotationItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Discount configuration
  const discountType = newItem.discountType || 'percentage';
  const discountScope = newItem.discountScope || 'per_unit';
  const discountValue = newItem.discountValue !== undefined ? newItem.discountValue.toString() : '0';

  useClickOutside([containerRef], () => {
    onShowSuggestionsChange(false);
  });

  const isItemAlreadyAdded = quotationItems.some(item => item.item === newItem.item);

  // Numeric parsing
  const qty = Math.max(1, parseInt(newItem.quantity?.toString() || '1') || 1);
  const unitPrice = parseFloat(newItem.unitPrice?.toString() || '0') || 0;
  const costPrice = newItem.costPrice || 0;
  const discVal = parseFloat(discountValue) || 0;

  // Subtotal & Profit
  const baseSubtotal = qty * unitPrice;

  const calculatedDiscountAmount = useMemo(() => {
    if (discVal <= 0 || unitPrice <= 0) return 0;

    if (discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discVal));
      if (discountScope === 'per_unit') {
        return unitPrice * (pct / 100) * qty;
      } else {
        return baseSubtotal * (pct / 100);
      }
    } else {
      if (discountScope === 'per_unit') {
        return Math.min(unitPrice, discVal) * qty;
      } else {
        return Math.min(baseSubtotal, discVal);
      }
    }
  }, [discVal, unitPrice, qty, discountType, discountScope, baseSubtotal]);

  const finalLineTotal = Math.max(0, baseSubtotal - calculatedDiscountAmount);

  // Single unit profit & margin
  const profitPerUnit = unitPrice - costPrice;
  const marginPct = unitPrice > 0 ? ((profitPerUnit / unitPrice) * 100).toFixed(1) : "0.0";

  const handleAddClick = () => {
    if (!newItem.item || qty <= 0 || unitPrice <= 0) {
      alert("Please select a product from search.");
      return;
    }

    onAddItem({
      item: newItem.item,
      itemName: newItem.itemName,
      product_code: newItem.product_code,
      quantity: qty,
      unitPrice,
      costPrice,
      discountType,
      discountScope,
      discountValue: discVal,
      discountAmount: calculatedDiscountAmount,
      total: finalLineTotal,
    });
  };

  return (
    <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
          Add Line Item
        </h3>
        {newItem.item && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Product Search Field */}
      <div ref={containerRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onShowSuggestionsChange(true);
            }}
            onFocus={() => onShowSuggestionsChange(true)}
            onClick={() => onShowSuggestionsChange(true)}
            placeholder="Search product name or code..."
            className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search product"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute z-30 w-full mt-1 bg-[#0f172a] border border-[#334155] rounded-lg shadow-2xl max-h-60 overflow-y-auto divide-y divide-[#334155]/60">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-2.5 text-gray-400 text-xs italic text-center">
                  No products found matching "{searchTerm}"
                </div>
              ) : (
                filteredItems.map((item) => {
                  const profit = (item.sell_price || 0) - (item.purchase_price || 0);
                  const margin = item.sell_price > 0 ? ((profit / item.sell_price) * 100).toFixed(0) : "0";

                  return (
                    <div
                      key={item._id || item.id || item.product_code}
                      className="px-3.5 py-2 hover:bg-[#1e293b] cursor-pointer transition-colors duration-150 flex justify-between items-center text-xs"
                      onClick={() => {
                        onItemSelect(item);
                        onShowSuggestionsChange(false);
                      }}
                    >
                      <div>
                        <div className="font-semibold text-white">{item.product_name}</div>
                        <div className="text-[11px] font-mono text-gray-400">
                          Code: <span className="text-blue-400">{item.product_code}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          LKR {(item.sell_price || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Cost: LKR {(item.purchase_price || 0).toLocaleString()} • Margin: {margin}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Minimal Selected Product Pill (Clean, small, inline) */}
        {newItem.item && (
          <div className="mt-2 px-3 py-1.5 bg-[#0f172a] border border-blue-500/20 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{newItem.itemName}</span>
              {newItem.product_code && (
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  {newItem.product_code}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-gray-400">
                Cost: <span className="text-gray-200">LKR {costPrice.toLocaleString()}</span>
              </span>
              <span className="text-gray-400">
                Margin: <span className="text-emerald-400 font-bold">LKR {profitPerUnit.toLocaleString()} ({marginPct}%)</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Quantity */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase">
            Qty
          </label>
          <input
            type="number"
            min="1"
            value={newItem.quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            disabled={!newItem.item}
            placeholder="1"
            className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Unit Price (Read-only) */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase">
            Unit Price (Selling)
          </label>
          <input
            type="text"
            readOnly
            value={unitPrice > 0 ? `LKR ${unitPrice.toFixed(2)}` : 'LKR 0.00'}
            disabled={!newItem.item}
            className="w-full bg-[#0f172a]/70 border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 cursor-not-allowed opacity-90"
          />
        </div>

        {/* Discount Value */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase flex items-center justify-between">
            <span>Discount</span>
            <div className="flex gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => onDiscountChange({ discountType: 'percentage', discountScope, discountValue })}
                className={`px-1 py-0.5 rounded ${discountType === 'percentage' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => onDiscountChange({ discountType: 'amount', discountScope, discountValue })}
                className={`px-1 py-0.5 rounded ${discountType === 'amount' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
              >
                Rs.
              </button>
            </div>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={discountValue}
              onChange={(e) => onDiscountChange({ discountType, discountScope, discountValue: e.target.value })}
              disabled={!newItem.item}
              placeholder="0"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 pr-7"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-500">
              {discountType === 'percentage' ? '%' : 'Rs'}
            </div>
          </div>
        </div>

        {/* Discount Application Scope (Per Unit vs Total Qty) */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase">
            Apply Discount
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#0f172a] p-0.5 border border-[#334155] rounded-lg h-[34px]">
            <button
              type="button"
              disabled={!newItem.item}
              onClick={() => onDiscountChange({ discountType, discountScope: 'per_unit', discountValue })}
              className={`text-xs rounded font-medium transition ${
                discountScope === 'per_unit' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Per Unit
            </button>
            <button
              type="button"
              disabled={!newItem.item}
              onClick={() => onDiscountChange({ discountType, discountScope: 'total_qty', discountValue })}
              className={`text-xs rounded font-medium transition ${
                discountScope === 'total_qty' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Total Qty
            </button>
          </div>
        </div>
      </div>

      {/* Stock warning if applicable */}
      {stockWarning && (
        <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5">
          {stockWarning}
        </div>
      )}

      {/* Line Total & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#334155]">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">Line Total:</span>
          <span className="font-mono text-base font-bold text-green-400">
            LKR {finalLineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {calculatedDiscountAmount > 0 && (
            <span className="text-red-400 font-mono text-xs">
              (Disc: -LKR {calculatedDiscountAmount.toFixed(2)})
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddClick}
          disabled={!newItem.item}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
          {isItemAlreadyAdded ? 'Update Line Item' : 'Add Item'}
        </button>
      </div>
    </div>
  );
};
