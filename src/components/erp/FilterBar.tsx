import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, ChevronRight, Tag } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FilterBarSuggestion {
  id?: string;
  title: string;
  subtitle?: string;
  category?: string;
  value?: string;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;

  suggestions?: FilterBarSuggestion[];

  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;

  selects?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    width?: string;
  }>;

  onClearFilters?: () => void;
  hasActiveFilters?: boolean;

  rightContent?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  suggestions = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selects = [],
  onClearFilters,
  hasActiveFilters,
  rightContent,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useClickOutside([containerRef], () => setIsOpen(false));

  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const q = (searchValue || '').toLowerCase().trim();
    if (!q) {
      return [...suggestions].sort((a, b) => (a?.title || '').localeCompare(b?.title || ''));
    }
    const matching = suggestions.filter(item => {
      if (!item) return false;
      const matchTitle = item.title ? item.title.toLowerCase().includes(q) : false;
      const matchSubtitle = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
      const matchCategory = item.category ? item.category.toLowerCase().includes(q) : false;
      const matchValue = item.value ? item.value.toLowerCase().includes(q) : false;
      return matchTitle || matchSubtitle || matchCategory || matchValue;
    });

    return matching.sort((a, b) => {
      const aTitle = a?.title || '';
      const bTitle = b?.title || '';
      const aVal = a?.value || '';
      const bVal = b?.value || '';
      const aStarts = aTitle.toLowerCase().startsWith(q) || (aVal && aVal.toLowerCase().startsWith(q));
      const bStarts = bTitle.toLowerCase().startsWith(q) || (bVal && bVal.toLowerCase().startsWith(q));
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aTitle.localeCompare(bTitle);
    });
  }, [suggestions, searchValue]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSuggestions]);

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleSelectSuggestion = (suggestion: FilterBarSuggestion) => {
    const val = suggestion.value || suggestion.title;
    onSearchChange(val);
    setIsOpen(false);
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearchChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const categoryColor = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'order':
      case 'order id':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'customer':
      case 'customer id':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'salesman':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'supplier':
      case 'purchase order':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'product':
      case 'item':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div
      className="w-full px-4 py-3 flex flex-wrap items-center gap-3 relative z-30"
      style={{
        backgroundColor: 'var(--filter-bar-bg)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(8px)',
      }}
    >

      {/* Search Input with Instant Popover */}
      <div ref={containerRef} className="relative flex-1 min-w-[260px]">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-lg pl-10 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          style={{
            fontSize: '0.9rem',
            height: '42px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* Clear Button */}
        {searchValue && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {/* Dropdown Popover on Focus */}
        {isOpen && suggestions.length > 0 && (
          <div
            ref={listRef}
            className="absolute top-full mt-1.5 left-0 w-full min-w-[300px] max-h-72 rounded-xl shadow-2xl overflow-y-auto z-50 py-1.5"
            style={{
              backgroundColor: 'var(--bg-dropdown)',
              border: '1px solid var(--border-color)',
              scrollbarWidth: 'thin',
            }}
          >
            {/* Header info */}
            <div
              className="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase"
              style={{
                backgroundColor: 'var(--bg-card-inner)',
                color: 'var(--text-muted)',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <span>{searchValue ? `Matching results (${filteredSuggestions.length})` : `All available data (${suggestions.length})`}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click to filter</span>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
                No matching records found for "{searchValue}"
              </div>
            ) : (
              filteredSuggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                return (
                  <div
                    key={item.id || `${item.title}-${idx}`}
                    data-idx={idx}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(item)}
                    className="px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                    style={{
                      backgroundColor: isHighlighted ? 'rgba(37,99,235,0.1)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                        {item.category && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-0.5 ${categoryColor(item.category)}`}
                          >
                            <Tag size={9} />
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Date Filters */}
      {onDateFromChange && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="date"
            className="rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            style={{
              fontSize: '0.9rem',
              height: '42px',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            value={dateFrom || ''}
            onChange={e => onDateFromChange(e.target.value)}
            title="From date"
          />
          <span className="font-semibold" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>–</span>
          <input
            type="date"
            className="rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            style={{
              fontSize: '0.9rem',
              height: '42px',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            value={dateTo || ''}
            onChange={e => onDateToChange?.(e.target.value)}
            title="To date"
          />
        </div>
      )}

      {/* Select Dropdowns */}
      {selects.map((sel, idx) => (
        <select
          key={idx}
          className={`rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${sel.width || 'w-44'}`}
          style={{
            fontSize: '0.9rem',
            height: '42px',
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
          }}
          value={sel.value}
          onChange={e => sel.onChange(e.target.value)}
        >
          {sel.placeholder && <option value="">{sel.placeholder}</option>}
          {sel.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ))}

      {/* Clear Active Filters */}
      {hasActiveFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
        >
          <X size={14} />
          Clear filters
        </button>
      )}

      {/* Action Buttons */}
      {rightContent && (
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
