import React, { useEffect, useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Eye,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../api/axios";

interface TableProps {
  endpoint: string;
  columns?: string[];
  columnLabels?: { [key: string]: string };
  headerTitle?: string;
  customActions?: React.ReactNode;
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  showActions?: boolean;
  refreshTrigger?: number;
  searchTerm?: string;
  selectedCategory?: string;
  computeRowValue?: (column: string, item: any) => any;
  defaultRowsPerPage?: number;
  rowsPerPageOptions?: number[];
}

const ReusableTable: React.FC<TableProps> = ({
  endpoint,
  columns,
  columnLabels = {},
  headerTitle = "Data Table",
  customActions,
  onAdd,
  onEdit,
  onDelete,
  onView,
  showActions = true,
  refreshTrigger = 0,
  searchTerm = "",
  selectedCategory = "all",
  computeRowValue,
  defaultRowsPerPage = 10,
  rowsPerPageOptions = [10, 25, 50, 100],
}) => {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        setError("Please log in to view data");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(endpoint);
        const items = Array.isArray(response.data) ? response.data : [];
        setData(items);
        setFilteredData(items);
        setPage(1);
      } catch (error: any) {
        setData([]);
        setFilteredData([]);
        setPage(1);
        console.error(`Error fetching data from ${endpoint}:`, error);
        if (error.response?.status === 401) {
          setError("Authentication failed. Please log in again.");
        } else if (error.response?.status === 403) {
          setError("You don't have permission to view this data.");
        } else if (error.response?.status === 404) {
          setError("Data not found. The endpoint might be incorrect.");
        } else {
          setError(error.response?.data?.message || error.message || "Failed to fetch data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, isAuthenticated, refreshTrigger]);

  useEffect(() => {
    if (data.length === 0) {
      setFilteredData([]);
      setPage(1);
      return;
    }

    let filtered = [...data];

    // search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      if (selectedCategory === "name") {
        filtered = filtered.filter((item) =>
          item.productName?.toLowerCase().includes(term)
        );
      } else if (selectedCategory === "code") {
        filtered = filtered.filter((item) =>
          item.productCode?.toLowerCase().includes(term)
        );
      } else {
        // default / all
        filtered = filtered.filter(
          (item) =>
            item.productName?.toLowerCase().includes(term) ||
            item.productCode?.toLowerCase().includes(term)
        );
      }

      // Smart Relevance Ranking:
      // Priority 0: Product Name or Code starts with search term (e.g. "Number Pad Lock...")
      // Priority 1: Any individual word in product name starts with search term (e.g. "... Nut Socket")
      // Priority 2: Substring match earlier in text
      filtered.sort((a, b) => {
        const getRelevanceScore = (item: any): number => {
          const name = (item.productName || "").toLowerCase();
          const code = (item.productCode || "").toLowerCase();

          if (selectedCategory === "name") {
            if (name.startsWith(term)) return 0;
            const words = name.split(/[\s\-_\/]+/);
            if (words.some((w: string) => w.startsWith(term))) return 1;
            const idx = name.indexOf(term);
            return 2 + (idx >= 0 ? idx : 999);
          } else if (selectedCategory === "code") {
            if (code.startsWith(term)) return 0;
            const idx = code.indexOf(term);
            return 1 + (idx >= 0 ? idx : 999);
          } else {
            if (name.startsWith(term)) return 0;
            if (code.startsWith(term)) return 1;
            const words = name.split(/[\s\-_\/]+/);
            if (words.some((w: string) => w.startsWith(term))) return 2;
            const nameIdx = name.indexOf(term);
            const codeIdx = code.indexOf(term);
            const minIdx = Math.min(
              nameIdx >= 0 ? nameIdx : 999,
              codeIdx >= 0 ? codeIdx : 999
            );
            return 3 + minIdx;
          }
        };

        const scoreA = getRelevanceScore(a);
        const scoreB = getRelevanceScore(b);
        if (scoreA !== scoreB) {
          return scoreA - scoreB;
        }
        return (a.productName || "").localeCompare(b.productName || "");
      });
    }

    setFilteredData(filtered);
    setPage(1);
  }, [data, searchTerm, selectedCategory]);

  const formatCellValue = (value: any, _column: string): string => {
    if (value === null || value === undefined) return "N/A";

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const tableColumns = columns || (filteredData.length > 0 ? Object.keys(filteredData[0]) : []);
  const displayColumns = showActions ? [...tableColumns, "actions"] : tableColumns;

  const formatColumnName = (column: string) => {
    if (columnLabels[column]) {
      return columnLabels[column];
    }
    if (column === "actions") return "Actions";
    return column
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const currentRows = filteredData.slice(start, start + rowsPerPage);

  // Smart sliding window pagination range generator
  const paginationRange = useMemo(() => {
    const siblingCount = 1;
    const totalPageNumbers = siblingCount * 2 + 5; // e.g., 7 buttons

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "dots-end", lastPageIndex];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, "dots-start", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "dots-start", ...middleRange, "dots-end", lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages, page]);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(targetPage);
  };

  const handleRowsPerPageChange = (newSize: number) => {
    setRowsPerPage(newSize);
    setPage(1);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl bg-[#0f172a] shadow-xl p-6 text-center border border-[#334155]">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
        <p className="text-gray-400">Please log in to view data.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0f172a] border border-[#334155] shadow-xl p-4 sm:p-6">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{headerTitle}</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-medium">
            {filteredData.length} {filteredData.length === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {customActions}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-blue-600/20"
            >
              <Plus size={16} />
              <span>Add New</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/40 border border-red-700/80 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-200 font-medium text-sm">Error loading data</p>
            <p className="text-red-300 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm font-medium text-gray-300">Loading products data...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border border-dashed border-[#334155] rounded-xl bg-[#1e293b]/20">
          <p className="text-base font-semibold text-gray-300">No products found</p>
          {searchTerm || selectedCategory !== "all" ? (
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              No items match your active filters or search keyword. Try refining your search query.
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Your inventory list is currently empty.</p>
          )}
        </div>
      ) : (
        <>
          {/* Responsive Table Container */}
          <div className="overflow-x-auto rounded-xl border border-[#334155] bg-[#0b1329]/40 shadow-inner">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#1e293b] text-gray-300 text-xs uppercase tracking-wider font-semibold border-b border-[#334155]">
                  {displayColumns.map((col) => (
                    <th key={col} className="py-3 px-4 text-left whitespace-nowrap">
                      {formatColumnName(col)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#334155]/60">
                {currentRows.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className={`${
                      idx % 2 ? "bg-[#111b2d]/60" : "bg-[#0f172a]/80"
                    } hover:bg-[#1e293b] transition-colors`}
                  >
                    {tableColumns.map((col) => (
                      <td key={col} className="py-3 px-4 text-xs sm:text-sm text-gray-300 align-middle">
                        {computeRowValue ? computeRowValue(col, row) : formatCellValue(row[col], col)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="py-3 px-4 text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {onView && (
                            <button
                              onClick={() => onView(row)}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 rounded-lg transition-colors"
                              title="View Details"
                              aria-label="View Details"
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Edit size={15} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Senior UX Responsive Pagination Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-5 pt-4 border-t border-[#334155]/70">
            {/* Left Side: Summary & Rows-Per-Page Selector */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs sm:text-sm text-gray-400 w-full md:w-auto">
              <div>
                Showing{" "}
                <span className="font-semibold text-gray-100 font-mono">
                  {filteredData.length === 0 ? 0 : start + 1}
                </span>{" "}
                –{" "}
                <span className="font-semibold text-gray-100 font-mono">
                  {Math.min(start + rowsPerPage, filteredData.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-100 font-mono">
                  {filteredData.length}
                </span>{" "}
                products
              </div>

              {/* Rows Per Page Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#1e293b]/80 border border-[#334155] hover:border-slate-500 rounded-lg px-2.5 py-1 transition-colors">
                <label htmlFor="rows-per-page" className="text-xs text-gray-400">
                  Rows:
                </label>
                <div className="relative inline-flex items-center">
                  <select
                    id="rows-per-page"
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    className="appearance-none bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer pr-4"
                  >
                    {rowsPerPageOptions.map((option) => (
                      <option key={option} value={option} className="bg-[#1e293b] text-gray-200">
                        {option}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-0" />
                </div>
              </div>
            </div>

            {/* Right Side: Responsive Smart Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {/* First Page Button */}
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(1)}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#1e293b]/80 border border-[#334155] text-gray-300 hover:text-white hover:bg-[#1e293b] disabled:opacity-30 disabled:hover:bg-[#1e293b]/80 disabled:hover:text-gray-300 disabled:cursor-not-allowed transition-all"
                  title="First Page"
                  aria-label="Go to first page"
                >
                  <ChevronsLeft size={16} />
                </button>

                {/* Previous Page Button */}
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#1e293b]/80 border border-[#334155] text-gray-300 hover:text-white hover:bg-[#1e293b] disabled:opacity-30 disabled:hover:bg-[#1e293b]/80 disabled:hover:text-gray-300 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                  aria-label="Go to previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Mobile Compact Page Indicator (screens < 640px) */}
                <div className="sm:hidden px-3 py-1 bg-[#1e293b] border border-[#334155] rounded-lg text-xs font-medium text-gray-300">
                  <span className="text-white font-bold">{page}</span> / {totalPages}
                </div>

                {/* Desktop & Tablet Page Numbers with Smart Truncation (screens >= 640px) */}
                <div className="hidden sm:flex items-center gap-1">
                  {paginationRange.map((item, index) => {
                    if (typeof item === "string") {
                      return (
                        <span
                          key={`dots-${index}`}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 font-mono select-none tracking-widest text-xs"
                        >
                          •••
                        </span>
                      );
                    }

                    const isCurrent = page === item;
                    return (
                      <button
                        key={item}
                        onClick={() => handlePageChange(item)}
                        aria-current={isCurrent ? "page" : undefined}
                        className={`min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-semibold transition-all ${
                          isCurrent
                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                            : "bg-[#1e293b]/80 text-gray-300 border border-[#334155] hover:bg-[#1e293b] hover:text-white hover:border-blue-500/40"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page Button */}
                <button
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#1e293b]/80 border border-[#334155] text-gray-300 hover:text-white hover:bg-[#1e293b] disabled:opacity-30 disabled:hover:bg-[#1e293b]/80 disabled:hover:text-gray-300 disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                  aria-label="Go to next page"
                >
                  <ChevronRight size={16} />
                </button>

                {/* Last Page Button */}
                <button
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  className="p-1.5 sm:p-2 rounded-lg bg-[#1e293b]/80 border border-[#334155] text-gray-300 hover:text-white hover:bg-[#1e293b] disabled:opacity-30 disabled:hover:bg-[#1e293b]/80 disabled:hover:text-gray-300 disabled:cursor-not-allowed transition-all"
                  title="Last Page"
                  aria-label="Go to last page"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReusableTable;
