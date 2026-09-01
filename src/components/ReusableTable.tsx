import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, Edit, Trash2, Plus, Eye } from "lucide-react";
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
  computeRowValue
}) => {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const rowsPerPage = 5;

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
    if (data.length === 0) return;

    let filtered = [...data];

    // search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.productName?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term)
      );
    }

    // category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => {
        const productName = item.productName?.toLowerCase() || '';
        const productCode = item.productCode?.toLowerCase() || '';
        
        switch (selectedCategory) {
          case 'engine':
            return productName.includes('engine') || productCode.includes('eng');
          case 'body':
            return productName.includes('bumper') || productName.includes('body') || productCode.includes('fb');
          case 'brake':
            return productName.includes('brake') || productCode.includes('cv');
          case 'electrical':
            return productName.includes('wire') || productName.includes('electrical') || productCode.includes('el');
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
    setPage(1);
  }, [data, searchTerm, selectedCategory]);

  const formatCellValue = (value: any, _column: string): string => {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const tableColumns = columns || (filteredData.length > 0 ? Object.keys(filteredData[0]) : []);

  const displayColumns = showActions ? [...tableColumns, 'actions'] : tableColumns;

  const formatColumnName = (column: string) => {
    if (columnLabels[column]) {
      return columnLabels[column];
    }
    if (column === 'actions') return 'Actions';
    return column.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const currentRows = filteredData.slice(start, start + rowsPerPage);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl bg-[#0f172a] shadow-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Authentication Required</h3>
        <p className="text-gray-400">Please log in to view data.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0f172a] border border-[#334155] shadow-xl p-6">
      <div className="flex justify-between items-center mb-4 gap-3">
        <h2 className="text-xl font-semibold text-white">{headerTitle}</h2>
        <div className="flex items-center gap-2.5">
          {customActions}
          {onAdd && (
            <button
              onClick={onAdd}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add New
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-200 font-medium">Error loading data</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          Loading data...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No data found</p>
          {(searchTerm || selectedCategory !== "all") ? (
            <p className="text-sm mt-1">No items match your search criteria.</p>
          ) : (
            <p className="text-sm mt-1">The table is empty.</p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#334155]">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-sm">
                  {displayColumns.map((col) => (
                    <th key={col} className="p-3 text-left">
                      {formatColumnName(col)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {currentRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 ? "bg-[#111b2d]" : "bg-[#0f172a]"} hover:bg-[#1e293b]`}
                  >
                    {tableColumns.map((col) => (
                      <td key={col} className="p-3 text-sm text-gray-300">
                        {computeRowValue ? computeRowValue(col, row) : formatCellValue(row[col], col)}
                      </td>
                    ))}
                    {showActions && (
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {onView && (
                            <button
                              onClick={() => onView(row)}
                              className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
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

          <div className="flex justify-between items-center mt-6">
            <p className="text-gray-400 text-sm">
              Showing {start + 1} – {Math.min(start + rowsPerPage, filteredData.length)} of {filteredData.length}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                    page === 1 ? "text-gray-500" : "text-white bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm ${
                      page === i + 1 ? "bg-blue-600 text-white shadow-md" : "text-gray-300 hover:bg-[#1e293b]"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                    page === totalPages ? "text-gray-500" : "text-white bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <ChevronRight size={18} />
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
