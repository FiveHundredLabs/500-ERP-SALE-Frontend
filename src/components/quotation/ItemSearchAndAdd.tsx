import React, { useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import type { InventoryItem } from '../../types/inventory';
import type { QuotationItem } from '../../types/quotation';
import { useClickOutside } from '../../hooks/useClickOutside';
import { SelectedItemPreview } from './SelectedItemPreview';

interface ItemSearchAndAddProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  filteredItems: InventoryItem[];
  newItem: {
    item: string;
    itemName: string;
    quantity: string | number;
    unitPrice: string | number;
  };
  onItemSelect: (item: InventoryItem) => void;
  onQuantityChange: (value: string) => void;
  onUnitPriceChange: (value: string) => void;
  onAddItem: () => void;
  onClearSelection: () => void;
  itemTotal: number;
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
  onUnitPriceChange,
  onAddItem,
  onClearSelection,
  itemTotal,
  stockWarning,
  quotationItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useClickOutside([containerRef], () => {
    onShowSuggestionsChange(false);
  });

  const isItemAlreadyAdded = quotationItems.some(item => item.item === newItem.item);

  return (
    <div className="bg-[#1e293b] rounded-lg p-6 border border-[#334155]">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Add Item</h3>
      
      <div className="space-y-4">
        {/* Item Search */}
        <div ref={containerRef}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search Item*
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                onSearchChange(value);
                onShowSuggestionsChange(true);
              }}
              onFocus={() => onShowSuggestionsChange(true)}
              onClick={() => onShowSuggestionsChange(true)}
              placeholder="Search product / item name..."
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search items by name, code, or vehicle"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 w-full mt-1 bg-[#0f172a] border border-[#334155] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase bg-[#1e293b]/60 flex justify-between">
                  <span>{searchTerm ? `Matching items (${filteredItems.length})` : `All available items (${filteredItems.length})`}</span>
                  <span className="text-[10px] text-gray-500">Product / Item</span>
                </div>
                {filteredItems.length === 0 ? (
                  <div className="px-3 py-2 text-gray-400 text-sm italic">
                    No items found matching "{searchTerm}"
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const existingItem = quotationItems.find(invItem => invItem.item === item._id);
                    const existingQuantity = existingItem ? existingItem.quantity : 0;
                    const available = (item.quantity || 0) - existingQuantity;
                    
                    return (
                      <div
                        key={item._id}
                        className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer border-b border-[#334155] last:border-b-0 transition-colors duration-150"
                        onClick={() => onItemSelect(item)}
                      >
                        <div className="font-medium text-white">{item.product_name || 'Unnamed Item'}</div>
                        <div className="text-sm text-gray-400 flex justify-between mt-1">
                          <span>Code: {item.product_code || 'N/A'}</span>
                          <span className="text-green-400">LKR {(item.sell_price || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">
                            Stock: {item.quantity || 0} units
                            {existingQuantity > 0 && (
                              <span className="text-blue-400 ml-1">({existingQuantity} in cart)</span>
                            )}
                          </span>
                          <span className={`text-xs ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Available: {available}
                          </span>
                        </div>
                        {item.vehicle && (
                          <div className="text-xs text-gray-500 mt-1">
                            Vehicle: {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Search by product name, code, or vehicle brand/model
          </div>
        </div>

        {/* Selected Item Details */}
        {newItem.itemName && (
          <SelectedItemPreview
            itemName={newItem.itemName}
            unitPrice={Number(newItem.unitPrice)}
            stockWarning={stockWarning}
            onClearSelection={onClearSelection}
          />
        )}

        {/* Quantity and Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity*
            </label>
            <input
              type="number"
              min="1"
              value={newItem.quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              disabled={!newItem.item}
              placeholder="Enter quantity"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Unit Price*
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newItem.unitPrice}
              onChange={(e) => onUnitPriceChange(e.target.value)}
              disabled={!newItem.item}
              placeholder="Enter unit price"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="text-xs text-gray-500 mt-1">Auto-filled from item selection, but editable</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Item Total
            </label>
            <div className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2">
              <div className="text-lg font-semibold text-green-400">
                LKR {itemTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={onAddItem}
          disabled={!newItem.item}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          {isItemAlreadyAdded ? 'Update Item Quantity' : 'Add Item to Quotation'}
        </button>
      </div>
    </div>
  );
};
