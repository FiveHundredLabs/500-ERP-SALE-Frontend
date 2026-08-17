import React from 'react';
import { Trash2, Tag } from 'lucide-react';
import type { QuotationItem } from '../../types/quotation';
import type { InventoryItem } from '../../types/inventory';

interface QuotationItemsListProps {
  items: QuotationItem[];
  inventoryItems: InventoryItem[];
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onUpdateUnitPrice?: (id: string, newPrice: number) => void;
  onRemoveItem: (id: string) => void;
}

export const QuotationItemsList: React.FC<QuotationItemsListProps> = ({
  items,
  inventoryItems,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [editingValues, setEditingValues] = React.useState<Record<string, { quantity?: string }>>({});

  if (items.length === 0) {
    return null;
  }

  const handleQuantityChange = (id: string, value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [id]: { ...prev[id], quantity: value }
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
    setEditingValues(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id].quantity;
        if (Object.keys(next[id]).length === 0) delete next[id];
      }
      return next;
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
          Total: <span className="text-green-400 font-semibold">LKR {subTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const inventoryItem = inventoryItems.find(inv => (inv._id === item.item || (inv as any).id === item.item));
          const totalQuantityInCart = items
            .filter(invItem => invItem.item === item.item)
            .reduce((sum, invItem) => sum + invItem.quantity, 0);

          const hasInsufficientStock = inventoryItem && totalQuantityInCart > (inventoryItem.quantity || 0);
          const hasDiscount = (item.discountAmount && item.discountAmount > 0) || (item.discountValue && item.discountValue > 0);

          return (
            <div key={item.id} className="bg-[#0f172a] p-4 rounded-xl border border-[#334155]">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-100">
                        {item.itemName || inventoryItem?.product_name || `Item ${item.item.substring(0, 8)}...`}
                      </h4>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Code: <span className="text-blue-400 font-mono">{item.product_code || inventoryItem?.product_code || 'N/A'}</span>
                      </div>
                      {inventoryItem && (
                        <div className="text-xs text-gray-500 mt-1">
                          Stock: {inventoryItem.quantity || 0} units
                          {hasInsufficientStock && (
                            <span className="text-red-400 ml-2 font-medium">(Insufficient stock!)</span>
                          )}
                        </div>
                      )}
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

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm mt-3 pt-3 border-t border-[#334155]/60">
                    <div className="text-gray-400">
                      <div className="text-[11px] font-medium uppercase mb-1">Quantity</div>
                      <input
                        type="number"
                        min="1"
                        value={editingValues[item.id]?.quantity ?? item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        onBlur={() => handleQuantityBlur(item.id, item.quantity)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        aria-label={`Quantity for ${item.itemName || 'item'}`}
                      />
                    </div>

                    <div className="text-gray-400">
                      <div className="text-[11px] font-medium uppercase mb-1">Selling Price</div>
                      <div className="w-full bg-[#1e293b]/60 border border-[#334155] rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold text-sm">
                        LKR {item.unitPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-gray-400">
                      <div className="text-[11px] font-medium uppercase mb-1">Discount</div>
                      {hasDiscount ? (
                        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 text-red-400 font-mono text-xs flex items-center gap-1">
                          <Tag size={11} />
                          <span>- LKR {(item.discountAmount || 0).toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            ({item.discountValue}{item.discountType === 'percentage' ? '%' : ' Rs.'} {item.discountScope === 'per_unit' ? '/u' : 'tot'})
                          </span>
                        </div>
                      ) : (
                        <div className="w-full bg-[#1e293b]/40 border border-[#334155] rounded-lg px-2.5 py-1.5 text-gray-500 font-mono text-xs">
                          None (0.00)
                        </div>
                      )}
                    </div>

                    <div className="text-gray-400">
                      <div className="text-[11px] font-medium uppercase mb-1">Line Total</div>
                      <div className="text-green-400 font-mono font-bold text-base mt-1">
                        LKR {item.total.toFixed(2)}
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
