import { Search, X } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;

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
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  selects = [],
  onClearFilters,
  hasActiveFilters,
  rightContent,
}) => {
  return (
    <div className="w-full bg-[#1e293b]/70 border-b border-[#334155] p-4 flex flex-wrap items-center gap-3">

      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>

      {/* Date Filters */}
      {onDateFromChange && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="date"
            className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={dateFrom || ''}
            onChange={e => onDateFromChange(e.target.value)}
            title="From date"
          />
          <span className="text-gray-400 text-xs font-semibold">–</span>
          <input
            type="date"
            className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
          className={`bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${sel.width || 'w-40'}`}
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
