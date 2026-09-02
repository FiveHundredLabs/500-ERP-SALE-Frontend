import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import { 
  RotateCcw, 
  Eye, 
  Plus, 
  RefreshCw, 
  FileText, 
  Phone, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  MessageSquare
} from 'lucide-react';
import { invoiceReturnService } from '../services/InvoiceReturnService';
import type { InvoiceReturn } from '../types/invoice-return';
import { ReturnStatus } from '../types/invoice-return';
import { useToast } from '../components/erp/Toast';
import { FilterBar, DataTable } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import ReturnViewModal from '../components/invoice/ReturnViewModal';
import CreateReturnModal from '../components/invoice/CreateReturnModal';

const InvoiceReturns: React.FC = () => {
  const toast = useToast();
  const [returns, setReturns] = useState<InvoiceReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedReturn, setSelectedReturn] = useState<InvoiceReturn | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceReturnService.getAll();
      setReturns(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const getCustomerInfo = (r: InvoiceReturn) => {
    if (r.customer) {
      return {
        name: r.customer.shopName || r.customer.fullName || 'Customer',
        phone: r.customer.phone || '',
      };
    }
    return {
      name: 'Walk-in Customer',
      phone: '',
    };
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    returns.forEach((r) => {
      const cust = getCustomerInfo(r);
      const invId = r.invoice?.invoiceNumber || '';

      suggestions.push({
        id: `ret-${r.id}`,
        title: r.returnNumber,
        subtitle: `${invId ? `Inv: ${invId} · ` : ''}${cust.name}`,
        category: 'Return ID',
        value: r.returnNumber,
      });

      if (invId) {
        suggestions.push({
          id: `inv-${r.id}`,
          title: invId,
          subtitle: `Return: ${r.returnNumber} · ${cust.name}`,
          category: 'Invoice ID',
          value: invId,
        });
      }

      if (cust.name && cust.name !== 'Customer' && cust.name !== 'Walk-in Customer') {
        suggestions.push({
          id: `cust-${r.id}`,
          title: cust.name,
          subtitle: `Phone: ${cust.phone || 'N/A'} · Return: ${r.returnNumber}`,
          category: 'Customer',
          value: cust.name,
        });
      }
    });

    return suggestions;
  }, [returns]);

  // Filtering
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesStatus =
        !statusFilter || r.status.toUpperCase() === statusFilter.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const retId = (r.returnNumber || '').toLowerCase();
      const invId = (
        typeof r.invoice === 'string'
          ? r.invoice
          : r.invoice?.invoiceNumber || r.invoice?.id || ''
      ).toLowerCase();
      const cust = getCustomerInfo(r);
      const custName = (cust.name || '').toLowerCase();
      const custPhone = (cust.phone || '').toLowerCase();
      const reason = (r.returnReason || '').toLowerCase();
      const remark = (r.remarks || '').toLowerCase();

      const matchesSearch =
        retId.includes(q) ||
        invId.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        reason.includes(q) ||
        remark.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [returns, searchQuery, statusFilter]);

  // Sorting
  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      let aVal: any = (a as any)[sortColumn];
      let bVal: any = (b as any)[sortColumn];

      if (sortColumn === 'invoice') {
        aVal = a.invoice?.invoiceNumber || '';
        bVal = b.invoice?.invoiceNumber || '';
      } else if (sortColumn === 'customer') {
        aVal = getCustomerInfo(a).name;
        bVal = getCustomerInfo(b).name;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? (aVal || '').localeCompare(bVal || '')
          : (bVal || '').localeCompare(aVal || '');
      }

      if (sortDirection === 'asc') {
        return (aVal || 0) > (bVal || 0) ? 1 : -1;
      }
      return (aVal || 0) < (bVal || 0) ? 1 : -1;
    });
  }, [filteredReturns, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedReturns.length / itemsPerPage) || 1;
  const paginatedReturns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedReturns.slice(start, start + itemsPerPage);
  }, [sortedReturns, currentPage]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // KPI Metrics
  const stats = useMemo(() => {
    const totalCount = returns.length;
    const pendingCount = returns.filter((r) => r.status === ReturnStatus.PENDING).length;
    const completedCount = returns.filter((r) => r.status === ReturnStatus.COMPLETED).length;
    const totalRefundAmount = returns
      .filter((r) => r.status !== ReturnStatus.CANCELLED)
      .reduce((sum, r) => sum + (r.returnTotal || 0), 0);

    return { totalCount, pendingCount, completedCount, totalRefundAmount };
  }, [returns]);

  const handleStatusChange = async (ret: InvoiceReturn, newStatus: ReturnStatus) => {
    try {
      await invoiceReturnService.updateStatus(ret.id, newStatus);
      toast.success(`Return marked as ${newStatus}`);
      loadReturns();
      if (selectedReturn?.id === ret.id) {
        setSelectedReturn((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update return status');
    }
  };

  // Table Columns Definition
  const columns: Column<InvoiceReturn>[] = [
    {
      key: 'returnNumber',
      header: 'Return ID',
      sortable: true,
      minWidth: '150px',
      render: (row) => (
        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 whitespace-nowrap text-xs">
          {row.returnNumber}
        </span>
      ),
    },
    {
      key: 'invoice',
      header: 'Original Invoice',
      sortable: true,
      minWidth: '160px',
      render: (row) => {
        const invId = row.invoice?.invoiceNumber || 'INV';
        return (
          <span className="font-mono text-cyan-400 font-semibold whitespace-nowrap flex items-center gap-1.5 text-xs">
            <FileText size={13} className="text-cyan-500 shrink-0" />
            <span>{invId}</span>
          </span>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer & Phone',
      sortable: true,
      minWidth: '180px',
      render: (row) => {
        const cust = getCustomerInfo(row);
        return (
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-xs truncate">{cust.name}</p>
            {cust.phone ? (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 whitespace-nowrap font-medium">
                <Phone size={10} className="shrink-0" /> {cust.phone}
              </p>
            ) : (
              <span className="text-[10px] text-slate-500">Walk-in</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      header: 'Items / Details',
      minWidth: '140px',
      render: (row) => {
        const itemsCount = row.items?.length || 0;
        const totalQty = row.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        return (
          <span className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 font-medium text-xs">
            {totalQty} qty ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
          </span>
        );
      },
    },
    {
      key: 'returnReason',
      header: 'Reason & Remarks',
      minWidth: '190px',
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="font-semibold text-slate-200 text-xs truncate" title={row.returnReason}>
            {row.returnReason || 'Customer Return'}
          </p>
          {row.remarks && (
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5" title={row.remarks}>
              <MessageSquare size={10} className="text-amber-400 shrink-0" />
              <span className="truncate">{row.remarks}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'returnTotal',
      header: 'Refund Total',
      sortable: true,
      align: 'right',
      minWidth: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-amber-400 whitespace-nowrap text-xs">
          Rs. {row.returnTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      minWidth: '110px',
      render: (row) => (
        <span className="text-slate-400 whitespace-nowrap text-xs">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      minWidth: '120px',
      render: (row) => (
        <span
          className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            row.status === ReturnStatus.COMPLETED
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : row.status === ReturnStatus.PENDING
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'center',
      minWidth: '80px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedReturn(row)}
            title="View & Print Return Note"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-700 transition-colors shadow-sm"
          >
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      headerTitle="Invoice Returns & Credits"
      headerSubtitle="Manage sales returns, restock inventory items, and issue refunds"
      headerIcon={<RotateCcw size={20} className="text-amber-400" />}
    >
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Returns
            </p>
            <p className="text-2xl font-black text-white mt-1">{stats.totalCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Processed return notes</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileText size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pending Approval
            </p>
            <p className="text-2xl font-black text-amber-400 mt-1">{stats.pendingCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting verification</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Completed & Restocked
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completedCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Stock replenished</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Refund Value
            </p>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">
              Rs. {stats.totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Total credit value</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Main Table Card with FilterBar */}
      <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
        <FilterBar
          searchPlaceholder="Search Return ID, Invoice #, Customer Phone, Remarks..."
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          suggestions={searchSuggestions}
          selects={[
            {
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              },
              options: [
                { value: '', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' },
              ],
              placeholder: 'All Statuses',
              width: 'w-36',
            },
          ]}
          hasActiveFilters={!!searchQuery || !!statusFilter}
          onClearFilters={() => {
            setSearchQuery('');
            setStatusFilter('');
            setCurrentPage(1);
          }}
          rightContent={
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={loadReturns}
                disabled={isLoading}
                className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                title="Refresh return notes"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Create Return</span>
              </button>
            </div>
          }
        />

        <div className="p-4">
          <DataTable
            columns={columns}
            data={paginatedReturns}
            loading={isLoading}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => setSelectedReturn(item)}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            emptyMessage="No return notes found matching your criteria."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedReturns.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* CREATE RETURN MODAL */}
      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newReturn) => {
          loadReturns();
          if (newReturn) {
            setSelectedReturn(newReturn);
          }
        }}
      />

      {/* VIEW & PRINT RETURN NOTE MODAL */}
      <ReturnViewModal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
        onStatusChange={async (status) => {
          if (selectedReturn) {
            await handleStatusChange(selectedReturn, status);
          }
        }}
      />
    </AppLayout>
  );
};

export default InvoiceReturns;
