import React, { useState, useRef, useMemo } from 'react';
import { Search, Calendar, ChevronDown, X, Tag } from 'lucide-react';
import { FormField } from './common';
import { useClickOutside } from '../hooks/useClickOutside';

export interface SearchFilterSuggestion {
  id?: string;
  title: string;
  subtitle?: string;
  category?: string;
  value?: string;
}

interface FilterConfig {
  searchQuery: string;
  selectedField: string;
  startDate: string;
  endDate: string;
}

interface SearchFilterBarProps {
  config: FilterConfig;
  onSearchChange: (query: string) => void;
  onFieldChange: (field: string) => void;
  onDateRangeChange: (dates: { startDate: string; endDate: string }) => void;
  fieldOptions?: string[];
  suggestions?: SearchFilterSuggestion[];
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  config,
  onSearchChange,
  onFieldChange,
  onDateRangeChange,
  fieldOptions = ['All Fields', 'Invoice ID', 'Customer Name', 'Sales Officer', 'Status'],
  suggestions = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside([containerRef], () => setIsOpen(false));

  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const q = config.searchQuery.toLowerCase().trim();

    // If specific field is selected, filter by that category first
    let list = suggestions;
    if (config.selectedField === 'Sales Officer') {
      list = suggestions.filter(item => item.category === 'Sales Officer');
    } else if (config.selectedField === 'Customer Name') {
      list = suggestions.filter(item => item.category === 'Customer');
    } else if (config.selectedField === 'Invoice ID') {
      list = suggestions.filter(item => item.category === 'Invoice ID');
    } else if (config.selectedField === 'Status') {
      list = suggestions.filter(item => item.category === 'Status');
    }

    if (!q) return list;

    return list.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
      const matchCategory = item.category ? item.category.toLowerCase().includes(q) : false;
      return matchTitle || matchSubtitle || matchCategory;
    });
  }, [suggestions, config.searchQuery, config.selectedField]);

  const handleSelect = (item: SearchFilterSuggestion) => {
    onSearchChange(item.value || item.title);
    setIsOpen(false);
  };

  const handleFieldSelect = (field: string) => {
    onFieldChange(field);
    // If user picks a specific field, open dropdown to show relevant options (e.g. Sales Officers)
    setIsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm text-gray-400">
          Search by invoice ID, customer name, sales officer, or amount
        </h2>
      </div>

      {/* Search Input */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search Box with Popover */}
        <div ref={containerRef} className="lg:col-span-2 relative">
          <FormField label="Search">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  config.selectedField === 'Sales Officer'
                    ? "Select or search sales officer..."
                    : config.selectedField === 'Customer Name'
                    ? "Select or search customer name..."
                    : "Type invoice ID, customer name, sales officer..."
                }
                value={config.searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onClick={() => setIsOpen(true)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-8 py-2.5 text-sm text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                autoComplete="off"
              />
              {config.searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </FormField>

          {/* Suggestions Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-full max-h-64 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-y-auto z-50 py-1.5 divide-y divide-[#1e293b]">
              <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase bg-[#1e293b]/50">
                <span>
                  {config.selectedField === 'Sales Officer'
                    ? `Sales Officers (${filteredSuggestions.length})`
                    : config.searchQuery
                    ? `Matching records (${filteredSuggestions.length})`
                    : `All records (${filteredSuggestions.length})`}
                </span>
                <span className="text-[10px] text-gray-500">Click to select</span>
              </div>
              {filteredSuggestions.length === 0 ? (
                <div className="px-4 py-4 text-center text-xs text-gray-400">
                  No matching records found for "{config.searchQuery}"
                </div>
              ) : (
                filteredSuggestions.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                    className="px-3 py-2 cursor-pointer hover:bg-[#1e293b] flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{item.title}</span>
                        {item.category && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] border flex items-center gap-0.5 ${
                            item.category === 'Sales Officer'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            <Tag size={8} />
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.subtitle && <p className="text-[11px] text-gray-400">{item.subtitle}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Field Filter */}
        <FormField label="Filter by Field">
          <div className="relative">
            <select
              value={config.selectedField}
              onChange={(e) => handleFieldSelect(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer hover:border-[#475569] transition-all"
            >
              {fieldOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </FormField>
      </div>

      {/* Date Range - Collapsible on Mobile */}
      <div className="border-t border-[#334155] pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden flex items-center gap-2 text-gray-300 hover:text-gray-200 transition-colors mb-4"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by Date</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isExpanded ? 'block' : 'hidden lg:grid'}`}>
          <FormField label="Start Date">
            <input
              type="date"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={config.startDate}
              onChange={(e) => onDateRangeChange({ startDate: e.target.value, endDate: config.endDate })}
            />
          </FormField>

          <FormField label="End Date">
            <input
              type="date"
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={config.endDate}
              onChange={(e) => onDateRangeChange({ startDate: config.startDate, endDate: e.target.value })}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default SearchFilterBar;
