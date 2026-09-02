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

    // Smart Relevance Ranking
    filtered.sort((a, b) => {
      const getScore = (item: InventoryItem): number => {
        const name = (item.productName || '').toLowerCase();
        const code = (item.productCode || '').toLowerCase();
        if (name.startsWith(searchTermLower)) return 0;
        if (code.startsWith(searchTermLower)) return 1;
        const words = name.split(/[\s\-_\/]+/);
        if (words.some((w: string) => w.startsWith(searchTermLower))) return 2;
        const nameIdx = name.indexOf(searchTermLower);
        const codeIdx = code.indexOf(searchTermLower);
        const minIdx = Math.min(
          nameIdx >= 0 ? nameIdx : 999,
          codeIdx >= 0 ? codeIdx : 999
        );
        return 3 + minIdx;
      };

      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.productName || '').localeCompare(b.productName || '');
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
