import React from "react";
import { Search, ChevronDown } from "lucide-react";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}) => {
  return (
    <div
      className="
        w-full 
        rounded-2xl 
        bg-[#1e293b]/70 
        border border-[#334155] 
        shadow-lg 
        p-4 
        flex flex-wrap items-center gap-3
      "
    >
      <div className="relative flex-1 min-w-[240px]">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder={
            selectedCategory === "name"
              ? "Search products by name..."
              : selectedCategory === "code"
              ? "Search products by code..."
              : "Search products (name or code)..."
          }
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="
            w-full
            bg-[#0f172a] 
            border border-[#334155] 
            rounded-full 
            pl-10 pr-4 py-2.5 
            text-sm text-gray-200 
            placeholder:text-gray-400
            focus:outline-none 
            focus:ring-2 focus:ring-blue-500/50 
            focus:border-blue-500
            transition-colors
          "
        />
      </div>

      <div className="relative inline-flex items-center">
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="
            appearance-none 
            bg-[#0f172a] 
            border border-[#334155] 
            rounded-full 
            pl-4 pr-10 py-2.5 
            text-sm 
            font-medium
            text-gray-200 
            focus:outline-none 
            focus:ring-2 focus:ring-blue-500/50
            focus:border-blue-500
            hover:border-slate-500
            cursor-pointer
            transition-colors
          "
        >
          <option value="all">Default (All)</option>
          <option value="name">Product Name</option>
          <option value="code">Product Code</option>
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 pointer-events-none transition-transform" />
      </div>
    </div>
  );
};

export default SearchFilter;