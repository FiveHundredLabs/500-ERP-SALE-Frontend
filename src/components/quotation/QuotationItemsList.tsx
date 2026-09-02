import React, { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import type { QuotationItem } from '../../types/quotation';
import type { InventoryItem } from '../../types/inventory';
import { validateLineDiscount, resolveMinPrice } from '../../utils/discountValidator';

interface QuotationItemsListProps {
  items: QuotationItem[];
  inventoryItems: InventoryItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onUpdateUnitPrice?: (id: string, newPrice: number) => void;
  onUpdateItem?: (id: string, updates: Partial<QuotationItem>) => void;
  onRemoveItem: (id: string) => void;
}

export const QuotationItemsList: React.FC<QuotationItemsListProps> = ({
  items,
  inventoryItems,
  onUpdateQuantity,
  onUpdateItem,
  onRemoveItem,
}) => {
  const [editingValues, setEditingValues] = useState<Record<string, { quantity?: string; discount?: string }>>({});

  if (items.length === 0) {
    return null;
  }

  const formatAmount = (val: number) => {
    return `${Math.round(val).toLocaleString()}/=`;
  };

  const handleQuantityChange = (id: string, value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantity: value },
    }));

    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      onUpdateQuantity(id, num);
    }
  };

  const handleQuantityBlur = (id: string, originalValue: number) => {
    const val = editingValues[id]?.quantity;
    if (val === undefined) return;

    let num = parseInt(val);
    if (isNaN(num) || num <= 0) {
      num = originalValue;
    }

    onUpdateQuantity(id, num);
    setEditingValues((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id].quantity;
        if (Object.keys(next[id]).length === 0) delete next[id];
      }
      return next;
    });
  };

  const handleItemDiscountChange = (
    id: string,
    updates: {
      discountType?: 'percentage' | 'amount';
      discountScope?: 'per_unit' | 'total_qty';
      discountValue?: number;
    }
  ) => {
    if (!onUpdateItem) return;
    const current = items.find((it) => it.id === id);
    if (!current) return;

    const discountType = updates.discountType ?? current.discountType ?? 'percentage';
    const discountScope = updates.discountScope ?? current.discountScope ?? 'per_unit';
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : (current.discountValue ?? 0);

    const qty = current.quantity;
    const unitPrice = current.unitPrice;
    const baseSubtotal = qty * unitPrice;
    let calculatedDiscount = 0;

    if (discountValue > 0 && unitPrice > 0) {
      if (discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discountValue));
        if (discountScope === 'per_unit') {
          calculatedDiscount = unitPrice * (pct / 100) * qty;
        } else {
          calculatedDiscount = baseSubtotal * (pct / 100);
        }
      } else {
        if (discountScope === 'per_unit') {
          calculatedDiscount = Math.min(unitPrice, discountValue) * qty;
        } else {
          calculatedDiscount = Math.min(baseSubtotal, discountValue);
        }
      }
    }

    const total = Math.max(0, baseSubtotal - calculatedDiscount);

    onUpdateItem(id, {
      discountType,
      discountScope,
      discountValue,
      discountAmount: calculatedDiscount,
      total,
    });
  };

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155] shadow-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          Quotation Items
          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-mono rounded-full border border-blue-500/20">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </h3>
        <div className="text-xs text-gray-300 font-mono">
          Subtotal: <span className="text-green-400 font-semibold text-sm">{formatAmount(subTotal)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#0f172a] text-gray-400 text-xs uppercase tracking-wider border-b border-[#334155]">
              <th className="py-3 px-4 font-semibold">Item</th>
              <th className="py-3 px-3 font-semibold text-center w-24">Qty</th>
              <th className="py-3 px-3 font-semibold text-right w-28">Unit Price</th>
              <th className="py-3 px-3 font-semibold text-center w-48">Discount</th>
              <th className="py-3 px-3 font-semibold text-center w-36">Apply Discount</th>
              <th className="py-3 px-3 font-semibold text-right w-32">Total</th>
              <th className="py-3 px-2 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60 text-gray-200">
            {items.map((item, index) => {
              const discountType = item.discountType || 'percentage';
              const discountScope = item.discountScope || 'per_unit';
              const discVal = item.discountValue !== undefined ? Number(item.discountValue) : 0;
              const discAmt = item.discountAmount !== undefined ? Number(item.discountAmount) : 0;

              const inv = inventoryItems.find(i => i.id === item.inventoryItemId || i.productCode === item.productCode);
              const minPrice = resolveMinPrice(inv || { costPrice: (item as any).costPrice });
              const lineValidation = validateLineDiscount({
                productName: item.itemName,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                discountType,
                discountScope,
                discountValue: discVal,
                minPrice,
              });
              const isInvalid = !lineValidation.isValid;

              return (
                <React.Fragment key={item.id}>
                  <tr
                    className={`hover:bg-[#334155]/20 transition-colors ${
                      isInvalid
                        ? 'bg-red-950/20 border-l-2 border-l-red-500'
                        : index % 2 === 0
                        ? 'bg-[#1e293b]/40'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Item Details */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white text-xs">{item.itemName}</span>
                        {item.productCode && (
                          <span className="text-[11px] font-mono text-blue-400">
                            {item.productCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quantity Input */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={
                          editingValues[item.id]?.quantity !== undefined
                            ? editingValues[item.id]?.quantity
                            : item.quantity
                        }
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        onBlur={() => handleQuantityBlur(item.id, item.quantity)}
                        className="w-16 bg-[#0f172a] border border-[#334155] rounded-lg px-2 py-1 text-center text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label={`Quantity for ${item.itemName}`}
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-300">
                        {formatAmount(item.unitPrice)}
                      </span>
                    </td>

                    {/* Discount (% / Rs. + input) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="flex bg-[#1e293b] p-0.5 rounded-lg border border-[#334155] shrink-0">
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountType: 'percentage' })}
                            className={`px-2 py-1 rounded text-xs font-bold transition ${
                              discountType === 'percentage'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountType: 'amount' })}
                            className={`px-2 py-1 rounded text-xs font-bold transition ${
                              discountType === 'amount'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Rs.
                          </button>
                        </div>
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max={discountType === 'amount' ? undefined : 100}
                            value={
                              editingValues[item.id]?.discount !== undefined
                                ? editingValues[item.id]?.discount
                                : discVal > 0
                                ? discVal
                                : ''
                            }
                            placeholder="0"
                            onChange={(e) => {
                              const strVal = e.target.value;
                              setEditingValues((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], discount: strVal },
                              }));
                              const val = Math.max(0, parseFloat(strVal) || 0);
                              handleItemDiscountChange(item.id, { discountValue: val });
                            }}
                            onBlur={() => {
                              setEditingValues((prev) => {
                                const next = { ...prev };
                                if (next[item.id]) {
                                  delete next[item.id].discount;
                                  if (Object.keys(next[item.id]).length === 0) delete next[item.id];
                                }
                                return next;
                              });
                            }}
                            className={`w-full bg-[#1e293b] border rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              isInvalid ? 'border-red-500' : 'border-[#334155]'
                            }`}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                            {discountType === 'percentage' ? '%' : 'Rs'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Apply Discount Scope */}
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <div className="inline-flex bg-[#1e293b] p-0.5 border border-[#334155] rounded-lg items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountScope: 'per_unit' })}
                            className={`px-3 py-1 text-xs rounded font-semibold whitespace-nowrap transition ${
                              discountScope === 'per_unit'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            Unit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountScope: 'total_qty' })}
                            className={`px-3 py-1 text-xs rounded font-semibold whitespace-nowrap transition ${
                              discountScope === 'total_qty'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            Total
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end justify-center">
                        <span className={`font-mono text-sm font-bold ${isInvalid ? 'text-red-400' : 'text-emerald-400'}`}>
                          {formatAmount(item.total)}
                        </span>
                        {discAmt > 0 && (
                          <span className="text-xs text-amber-400 font-mono whitespace-nowrap">
                            -{formatAmount(discAmt)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove item"
                        aria-label={`Remove ${item.itemName || 'item'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {isInvalid && (
                    <tr className="bg-red-950/20 border-b border-red-500/20">
                      <td colSpan={7} className="py-1 px-4 text-[11px] text-red-400">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{lineValidation.error}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationItemsList;
