import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { QuotationItem } from '../../types/quotation';
import type { InventoryItem } from '../../types/inventory';

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
    const currentItem = items.find((it) => it.id === id);
    if (!currentItem || !onUpdateItem) return;

    const discountType = updates.discountType ?? currentItem.discountType ?? 'percentage';
    const discountScope = updates.discountScope ?? currentItem.discountScope ?? 'per_unit';
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : (Number(currentItem.discountValue) || 0);

    const qty = currentItem.quantity;
    const price = currentItem.unitPrice;
    let discAmount = 0;

    if (discountValue > 0 && price > 0) {
      if (discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discountValue));
        if (discountScope === 'per_unit') {
          discAmount = price * (pct / 100) * qty;
        } else {
          discAmount = (qty * price) * (pct / 100);
        }
      } else {
        if (discountScope === 'per_unit') {
          discAmount = Math.min(price, discountValue) * qty;
        } else {
          discAmount = Math.min(qty * price, discountValue);
        }
      }
    }

    const newTotal = Math.max(0, qty * price - discAmount);

    onUpdateItem(id, {
      discountType,
      discountScope,
      discountValue,
      discountAmount: discAmount,
      total: newTotal,
    });
  };

  const subTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <span>Items List</span>
          <span className="text-xs font-normal text-gray-400">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </h3>
        <div className="text-xs text-gray-300 font-mono">
          Subtotal: <span className="text-green-400 font-semibold text-sm">{formatAmount(subTotal)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#334155] bg-[#0f172a]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#334155] text-xs font-bold text-gray-300 uppercase bg-[#0f172a]/90 whitespace-nowrap">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[200px]">Product</th>
              <th className="py-3 px-3 w-24 text-center">Qty</th>
              <th className="py-3 px-3 w-32 text-right">Unit Price (LKR)</th>
              <th className="py-3 px-3 w-48 text-center">Discount</th>
              <th className="py-3 px-3 w-48 text-center">Apply Discount</th>
              <th className="py-3 px-3 w-36 text-right">Line Total (LKR)</th>
              <th className="py-3 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60 text-xs">
            {items.map((item, idx) => {
              const inventoryItem = inventoryItems.find((inv) => inv.id === item.inventoryItemId);
              const discVal = Number(item.discountValue) || 0;
              const discAmt = Number(item.discountAmount) || 0;
              const discountType = item.discountType || 'percentage';
              const discountScope = item.discountScope || 'per_unit';

              return (
                <tr key={item.id} className="hover:bg-[#1e293b]/40 transition-colors">
                  {/* # */}
                  <td className="py-3 px-3 text-center text-gray-400 font-mono text-xs">
                    {idx + 1}
                  </td>

                  {/* Product */}
                  <td className="py-3 px-3">
                    <p className="font-semibold text-gray-100 text-sm leading-snug">
                      {item.itemName || inventoryItem?.productName || `Item ${item.inventoryItemId.substring(0, 8)}...`}
                    </p>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="number"
                      min="1"
                      value={editingValues[item.id]?.quantity ?? item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      onBlur={() => handleQuantityBlur(item.id, item.quantity)}
                      className="w-20 bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-center text-sm font-mono font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Quantity for ${item.itemName || 'item'}`}
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-200 font-semibold">
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
                          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7"
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
                      <span className="font-mono text-sm font-bold text-emerald-400">
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationItemsList;
