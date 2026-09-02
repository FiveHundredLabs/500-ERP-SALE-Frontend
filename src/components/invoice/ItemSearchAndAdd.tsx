import React, { useRef, useMemo } from 'react';
import { Search, Plus, X, AlertCircle } from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import type { InvoiceItem } from '../../types/invoice';
import { useClickOutside } from '../../hooks/useClickOutside';
import { validateLineDiscount, resolveMinPrice } from '../../utils/discountValidator';

interface ItemSearchAndAddProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  filteredItems: InventoryItem[];
  newItem: {
    inventoryItemId: string;
    itemName: string;
    productCode?: string;
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
    inventoryItemId: string;
    itemName: string;
    productCode?: string;
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
  invoiceItems: InvoiceItem[];
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
  invoiceItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const discountType = newItem.discountType || 'percentage';
  const discountScope = newItem.discountScope || 'per_unit';
  const discountValue = newItem.discountValue !== undefined ? newItem.discountValue.toString() : '0';

  useClickOutside([containerRef], () => {
    onShowSuggestionsChange(false);
  });

  const isItemAlreadyAdded = invoiceItems.some(item => item.inventoryItemId === newItem.inventoryItemId);

  const qty = Math.max(1, parseInt(newItem.quantity?.toString() || '1') || 1);
  const unitPrice = parseFloat(newItem.unitPrice?.toString() || '0') || 0;
  const costPrice = newItem.costPrice || 0;
  const discVal = parseFloat(discountValue) || 0;

  const selectedInvItem = filteredItems.find(it => it.id === newItem.inventoryItemId);
  const minPrice = resolveMinPrice(selectedInvItem || { costPrice: newItem.costPrice });

  const lineDiscountValidation = useMemo(() => {
    if (!newItem.inventoryItemId) {
      return { isValid: true, error: undefined, discountAmount: 0, effectiveUnitPrice: unitPrice, minPrice, maxAllowedDiscount: 0, maxAllowedPercentage: 0 };
    }
    return validateLineDiscount({
      productName: newItem.itemName,
      unitPrice,
      quantity: qty,
      discountType,
      discountScope,
      discountValue: discVal,
      minPrice,
    });
  }, [newItem.inventoryItemId, newItem.itemName, unitPrice, qty, discountType, discountScope, discVal, minPrice]);

  const baseSubtotal = qty * unitPrice;
  const calculatedDiscountAmount = lineDiscountValidation.discountAmount;
  const finalLineTotal = Math.max(0, baseSubtotal - calculatedDiscountAmount);

  const profitPerUnit = unitPrice - costPrice;
  const marginPct = unitPrice > 0 ? ((profitPerUnit / unitPrice) * 100).toFixed(1) : '0.0';

  const handleAddClick = () => {
    if (!newItem.inventoryItemId || qty <= 0 || unitPrice <= 0) {
      alert('Please select a product from search.');
      return;
    }

    if (!lineDiscountValidation.isValid) {
      alert(lineDiscountValidation.error || 'Discount reduces price below allowed minimum price.');
      return;
    }

    onAddItem({
      inventoryItemId: newItem.inventoryItemId,
      itemName: newItem.itemName,
      productCode: newItem.productCode,
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
    <div className="bg-[#1e293b] rounded-xl p-4 sm:p-5 border border-[#334155] shadow-lg space-y-3">
      {/* Header with Top-Left Add Button */}
      <div className="flex items-center justify-between pb-1 border-b border-[#334155]/60">
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!newItem.inventoryItemId}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          {isItemAlreadyAdded ? 'Update Line Item' : 'Add Line Item'}
        </button>

        {newItem.inventoryItemId && (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Single-Row Grid for All Fields */}
      <div className="grid grid-cols-12 gap-3 items-start pt-1">
        {/* 1. Product Search Field */}
        <div ref={containerRef} className="col-span-12 md:col-span-4 lg:col-span-4 relative">
          <label className="block text-[11px] font-semibold text-gray-300 mb-1">
            Product Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onShowSuggestionsChange(true);
              }}
              onFocus={() => onShowSuggestionsChange(true)}
              onClick={() => onShowSuggestionsChange(true)}
              placeholder="Search product..."
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search product"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSelection();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                title="Clear product"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute z-30 w-full min-w-[280px] mt-1 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[#334155]/60">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase bg-[#1e293b]/60 flex justify-between">
                <span>{searchTerm ? `Matching (${filteredItems.length})` : `All items (${filteredItems.length})`}</span>
                <span className="text-[10px] text-gray-500">Price / Margin</span>
              </div>
              {filteredItems.length === 0 ? (
                <div className="px-4 py-2.5 text-gray-400 text-xs italic text-center">
                  No products found{searchTerm ? ` matching "${searchTerm}"` : ''}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const profit = (item.sellPrice || 0) - (item.purchasePrice || 0);
                  const margin = item.sellPrice > 0 ? ((profit / item.sellPrice) * 100).toFixed(0) : '0';
                  const existingItem = invoiceItems.find(inv => inv.inventoryItemId === item.id);
                  const existingQuantity = existingItem ? existingItem.quantity : 0;

                  return (
                    <div
                      key={item.id || item.productCode}
                      className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer transition-colors duration-150 flex justify-between items-center text-xs"
                      onClick={() => {
                        onItemSelect(item);
                        onShowSuggestionsChange(false);
                      }}
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate">{item.productName}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>Code: <span className="text-blue-400">{item.productCode}</span></span>
                          {existingQuantity > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">({existingQuantity} in invoice)</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400 text-xs">
                          LKR {(item.sellPrice || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Margin: {margin}%
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 2. Unit Price (Read-only) */}
        <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate">
            Unit Price
          </label>
          <div className="w-full h-[32px] bg-[#0a101f] border border-[#334155]/60 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono font-semibold flex items-center justify-between cursor-not-allowed select-none">
            <span className="truncate">{unitPrice > 0 ? `LKR ${unitPrice.toFixed(2)}` : 'LKR 0.00'}</span>
          </div>
        </div>

        {/* 3. Quantity */}
        <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-300 mb-1">
            Quantity <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={newItem.quantity === '0' || newItem.quantity === 0 ? '0' : newItem.quantity || ''}
              onChange={(e) => onQuantityChange(e.target.value)}
              disabled={!newItem.inventoryItemId}
              placeholder="0"
              className="w-full h-[32px] bg-[#0f172a] border border-[#334155] rounded-lg pl-2 pr-7 py-1 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-center"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 pointer-events-none">
              PCS
            </span>
          </div>
        </div>

        {/* 4. Discount Value (Compact) */}
        <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-gray-300">Discount</label>
            <div className="flex items-center bg-[#0f172a] border border-[#334155] rounded p-0.5 text-[9px]">
              <button
                type="button"
                onClick={() => onDiscountChange({ discountType: 'percentage', discountScope, discountValue })}
                className={`px-1 py-0.2 rounded transition-colors font-bold ${
                  discountType === 'percentage' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Percentage (%)"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => onDiscountChange({ discountType: 'amount', discountScope, discountValue })}
                className={`px-1 py-0.2 rounded transition-colors font-bold ${
                  discountType === 'amount' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Amount (Rs.)"
              >
                Rs
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={discountValue === '0' ? '' : discountValue}
              onChange={(e) => onDiscountChange({ discountType, discountScope, discountValue: e.target.value })}
              disabled={!newItem.inventoryItemId}
              placeholder="0"
              className={`w-full h-[32px] bg-[#0f172a] border rounded-lg pl-2 pr-6 py-1 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 pr-7 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                !lineDiscountValidation.isValid ? 'border-red-500' : 'border-[#334155]'
              }`}
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[10px] font-bold text-gray-500 pointer-events-none">
              {discountType === 'percentage' ? '%' : 'Rs'}
            </span>
          </div>
        </div>

        {/* 5. Discount Scope (Unit vs Total) */}
        <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
          <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate">
            Apply Discount
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#0f172a] p-0.5 border border-[#334155] rounded-lg h-[32px]">
            <button
              type="button"
              disabled={!newItem.inventoryItemId}
              onClick={() => onDiscountChange({ discountType, discountScope: 'per_unit', discountValue })}
              className={`text-[10px] rounded font-semibold transition flex items-center justify-center ${
                discountScope === 'per_unit' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Apply discount per unit"
            >
              Unit
            </button>
            <button
              type="button"
              disabled={!newItem.inventoryItemId}
              onClick={() => onDiscountChange({ discountType, discountScope: 'total_qty', discountValue })}
              className={`text-[10px] rounded font-semibold transition flex items-center justify-center ${
                discountScope === 'total_qty' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Apply discount on total line"
            >
              Total
            </button>
          </div>
        </div>
      </div>

      {/* Discount Validation Warning */}
      {!lineDiscountValidation.isValid && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-400">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{lineDiscountValidation.error}</span>
        </div>
      )}

      {/* Selected Product Pill & Margin */}
      {newItem.inventoryItemId && (
        <div className="px-3 py-1.5 bg-[#0f172a] border border-blue-500/20 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{newItem.itemName}</span>
            {newItem.productCode && (
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                {newItem.productCode}
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

      {/* Stock warning */}
      {stockWarning && (
        <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5">
          {stockWarning}
        </div>
      )}

      {/* Line Total */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#334155]">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">Line Total:</span>
          <span className="font-mono text-base font-bold text-green-400">
            LKR {finalLineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {calculatedDiscountAmount > 0 && (
            <span className="text-red-400 font-mono text-xs">
              (Disc ({discountScope === 'per_unit' ? 'Unit' : 'Total'}): -LKR {calculatedDiscountAmount.toFixed(2)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
