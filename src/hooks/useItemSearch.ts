import { useState, useEffect } from 'react';
import type { InventoryItem } from '../types/inventory';

export const useItemSearch = (inventoryItems: InventoryItem[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(inventoryItems);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const filtered = inventoryItems.filter(item => {
      const matchesProductName = item.productName?.toLowerCase().includes(searchTermLower);
      const matchesProductCode = item.productCode?.toLowerCase().includes(searchTermLower);
      
      return matchesProductName || matchesProductCode;
    });
    
    setFilteredItems(filtered);
  }, [searchTerm, inventoryItems]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    showSuggestions,
    setShowSuggestions,
  };
};
