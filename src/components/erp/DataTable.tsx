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
  onPageChange?: (page: number) => number | void;
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
      <div
        className="overflow-x-auto rounded-xl"
        style={{
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <table className="min-w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    fontSize: '0.78rem',
                    letterSpacing: '0.05em',
                    width: col.width,
                    minWidth: col.minWidth,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-table-header)',
                    padding: '0.875rem 1rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                  className={`${getAlignClass(col.align)} ${
                    col.sortable ? 'cursor-pointer select-none' : ''
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
                        <ArrowUpDown size={14} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
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
                <tr key={idx} style={{ backgroundColor: 'var(--bg-table-row-odd)' }}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="skeleton-text rounded w-3/4 h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex flex-col items-center gap-3">
                    <Inbox size={40} style={{ color: 'var(--text-muted)', opacity: 0.6 }} className="stroke-[1.5]" />
                    <p className="font-medium" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className="transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: idx % 2 ? 'var(--bg-table-row-even)' : 'var(--bg-table-row-odd)',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-table-row-hover)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2
                      ? 'var(--bg-table-row-even)'
                      : 'var(--bg-table-row-odd)';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={getAlignClass(col.align)}
                      style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', verticalAlign: 'middle' }}
                    >
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
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <div>
            Showing{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems || 0)}
            </span>{' '}
            of{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalItems || 0}</span>{' '}
            entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
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
                    className="w-9 h-9 flex items-center justify-center rounded-lg font-medium transition-colors"
                    style={{
                      fontSize: '0.875rem',
                      backgroundColor: currentPage === pageNum ? '#2563eb' : 'var(--bg-card)',
                      color: currentPage === pageNum ? '#ffffff' : 'var(--text-secondary)',
                      border: `1px solid ${currentPage === pageNum ? '#2563eb' : 'var(--border-color)'}`,
                      fontWeight: currentPage === pageNum ? 600 : 400,
                    }}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                (pageNum === 2 && currentPage > 3) ||
                (pageNum === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return <span key={pageNum} className="px-1" style={{ color: 'var(--text-muted)' }}>...</span>;
              }
              return null;
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3.5 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
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
