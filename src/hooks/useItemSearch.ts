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
      const matchesProductName = item.product_name?.toLowerCase().includes(searchTermLower);
      const matchesProductCode = item.product_code?.toLowerCase().includes(searchTermLower);
      const matchesVehicleBrand = item.vehicle?.brand?.toLowerCase().includes(searchTermLower);
      const matchesVehicleModel = item.vehicle?.model?.toLowerCase().includes(searchTermLower);
      
      return matchesProductName || matchesProductCode || matchesVehicleBrand || matchesVehicleModel;
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
