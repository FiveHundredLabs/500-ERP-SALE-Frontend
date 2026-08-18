import React from 'react';
import { ChevronUp, ChevronDown, Inbox, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  emptyMessage?: string;
  className?: string;

  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  keyExtractor,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  emptyMessage = 'No records found',
  className = '',
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}: DataTableProps<T>) {

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#1e293b]">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#1e293b] border-b border-[#334155]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ fontSize: '0.78rem', letterSpacing: '0.05em', width: col.width, minWidth: col.minWidth }}
                  className={`px-4 py-3.5 font-bold uppercase tracking-wide text-gray-200 ${getAlignClass(col.align)} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-white hover:bg-[#334155]' : ''
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className={`flex items-center gap-1.5 ${
                    col.align === 'right' ? 'justify-end' :
                    col.align === 'center' ? 'justify-center' : 'justify-start'
                  }`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      sortColumn === col.key ? (
                        sortDirection === 'asc'
                          ? <ChevronUp size={14} className="text-blue-400" />
                          : <ChevronDown size={14} className="text-blue-400" />
                      ) : (
                        <ArrowUpDown size={14} className="text-slate-500 opacity-60 hover:opacity-100" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="bg-[#0f172a]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="skeleton-text rounded w-3/4 h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <Inbox size={40} className="text-slate-500 stroke-[1.5]" />
                    <p className="font-medium text-gray-300" style={{ fontSize: '0.95rem' }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-[#334155]/60 transition-colors ${
                    idx % 2 ? 'bg-[#111b2d]' : 'bg-[#0f172a]'
                  } ${onRowClick ? 'cursor-pointer hover:bg-[#1e293b]' : 'hover:bg-[#1e293b]'}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 text-gray-200 ${getAlignClass(col.align)}`} style={{ fontSize: '0.9rem' }}>
                      {col.render ? col.render(row, idx) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages && totalPages > 1 && onPageChange && currentPage && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-gray-400" style={{ fontSize: '0.88rem' }}>
          <div>
            Showing{' '}
            <span className="text-white font-semibold">
              {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems || 0)}
            </span>{' '}
            of{' '}
            <span className="text-white font-semibold">{totalItems || 0}</span>{' '}
            entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3.5 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-gray-200 hover:bg-[#334155] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ fontSize: '0.875rem' }}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNum = i + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-[#1e293b] text-gray-300 border border-[#334155] hover:bg-[#334155]'
                    }`}
                    style={{ fontSize: '0.875rem' }}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                (pageNum === 2 && currentPage > 3) ||
                (pageNum === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return <span key={pageNum} className="px-1 text-gray-500">...</span>;
              }
              return null;
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3.5 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-gray-200 hover:bg-[#334155] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ fontSize: '0.875rem' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
