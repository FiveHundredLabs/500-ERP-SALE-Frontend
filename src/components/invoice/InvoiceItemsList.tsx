import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { InvoiceItem } from '../../types/invoice';
import type { InventoryItem } from '../../types/inventory';

interface InvoiceItemsListProps {
  items: InvoiceItem[];
  inventoryItems: InventoryItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onUpdateUnitPrice?: (id: string, newPrice: number) => void;
  onUpdateItem?: (id: string, updates: Partial<InvoiceItem>) => void;
  onRemoveItem: (id: string) => void;
}

export const InvoiceItemsList: React.FC<InvoiceItemsListProps> = ({
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
    const discountValue = updates.discountValue !== undefined ? updates.discountValue : (currentItem.discountValue ?? 0);

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
    <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-200">
          Items List ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h3>
        <div className="text-sm text-gray-400">
          Subtotal: <span className="text-green-400 font-semibold">{formatAmount(subTotal)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const inventoryItem = inventoryItems.find((inv) => inv._id === item.item);
          const hasDiscount = (item.discountAmount && item.discountAmount > 0) || (item.discountValue && item.discountValue > 0);
          const discountType = item.discountType || 'percentage';
          const discountScope = item.discountScope || 'per_unit';

          return (
            <div key={item.id} className="bg-[#0f172a] p-4 rounded-xl border border-[#334155]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-100 text-sm">
                        {item.itemName || inventoryItem?.product_name || `Item ${item.item ? item.item.substring(0, 8) : 'Unknown'}...`}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-gray-400 hover:text-red-400 ml-4 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Remove item"
                      aria-label={`Remove ${item.itemName || 'item'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm mt-3 pt-3 border-t border-[#334155]/60 items-start">
                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase h-[18px] leading-[18px]">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingValues[item.id]?.quantity ?? item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        onBlur={() => handleQuantityBlur(item.id, item.quantity)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-[38px]"
                        aria-label={`Quantity for ${item.itemName || 'item'}`}
                      />
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase h-[18px] leading-[18px]">
                        Unit Price (LKR)
                      </label>
                      <div className="w-full bg-[#1e293b]/60 border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 h-[38px] flex items-center">
                        {formatAmount(item.unitPrice)}
                      </div>
                    </div>

                    {/* Discount Value with % / Rs. Toggle */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase h-[18px] flex items-center justify-between">
                        <span>Discount</span>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountType: 'percentage' })}
                            className={`px-1.5 py-0.5 rounded font-bold transition ${
                              discountType === 'percentage' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white bg-[#1e293b]'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemDiscountChange(item.id, { discountType: 'amount' })}
                            className={`px-1.5 py-0.5 rounded font-bold transition ${
                              discountType === 'amount' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white bg-[#1e293b]'
                            }`}
                          >
                            Rs.
                          </button>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={discountType === 'amount' ? undefined : 100}
                          value={
                            editingValues[item.id]?.discount !== undefined
                              ? editingValues[item.id]?.discount
                              : item.discountValue !== undefined && item.discountValue > 0
                              ? item.discountValue
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
                          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7 h-[38px]"
                        />
                        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-500 pointer-events-none">
                          {discountType === 'percentage' ? '%' : 'Rs'}
                        </div>
                      </div>
                    </div>

                    {/* Apply Discount Scope: Per Unit / Total Qty */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase h-[18px] leading-[18px]">
                        Apply Discount
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-[#1e293b] p-1 border border-[#334155] rounded-lg h-[38px] items-center">
                        <button
                          type="button"
                          onClick={() => handleItemDiscountChange(item.id, { discountScope: 'per_unit' })}
                          className={`h-full text-xs rounded font-medium transition flex items-center justify-center ${
                            discountScope === 'per_unit' ? 'bg-purple-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Per Unit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemDiscountChange(item.id, { discountScope: 'total_qty' })}
                          className={`h-full text-xs rounded font-medium transition flex items-center justify-center ${
                            discountScope === 'total_qty' ? 'bg-purple-600 text-white shadow-sm font-semibold' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          Total Qty
                        </button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase h-[18px] leading-[18px]">
                        Line Total (LKR)
                      </label>
                      <div className="w-full bg-[#1e293b]/60 border border-[#334155] rounded-lg px-3 py-1.5 h-[38px] flex items-center justify-between">
                        <span className="text-emerald-400 font-mono font-bold text-sm">
                          {formatAmount(item.total)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            -{formatAmount(item.discountAmount || 0)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InvoiceItemsList;
