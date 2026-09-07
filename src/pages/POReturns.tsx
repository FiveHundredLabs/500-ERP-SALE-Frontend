import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../components/AppLayout';
import { 
  RotateCcw, 
  Eye, 
  Plus, 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  MessageSquare,
  Trash2
} from 'lucide-react';
import { poReturnService } from '../services/POReturnService';
import type { PurchaseOrderReturn } from '../types/po-return';
import { POReturnStatus } from '../types/po-return';
import { useToast } from '../components/erp/Toast';
import { FilterBar, DataTable, ConfirmDialog } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import POReturnViewModal from '../components/orders/POReturnViewModal';
import CreatePOReturnModal from '../components/orders/CreatePOReturnModal';

const POReturns: React.FC = () => {
  const toast = useToast();
  const [returns, setReturns] = useState<PurchaseOrderReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedReturn, setSelectedReturn] = useState<PurchaseOrderReturn | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<PurchaseOrderReturn | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const data = await poReturnService.getAll();
      setReturns(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch purchase returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const getSupplierInfo = (r: PurchaseOrderReturn) => {
    if (r.supplier) {
      return {
        name: r.supplier.companyName || 'Supplier',
        phone: r.supplier.phone || '',
        contact: r.supplier.contactPerson || '',
      };
    }
    return {
      name: 'Supplier',
      phone: '',
      contact: '',
    };
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    returns.forEach((r) => {
      const sup = getSupplierInfo(r);
      const poNum = r.purchaseOrder?.poNumber || '';

      suggestions.push({
        id: `ret-${r.id}`,
        title: r.returnNumber,
        subtitle: `${poNum ? `PO: ${poNum} · ` : ''}${sup.name}`,
        category: 'Return ID',
        value: r.returnNumber,
      });

      if (poNum) {
        suggestions.push({
          id: `po-${r.id}`,
          title: poNum,
          subtitle: `Return: ${r.returnNumber} · ${sup.name}`,
          category: 'PO Number',
          value: poNum,
        });
      }

      if (sup.name && sup.name !== 'Supplier') {
        suggestions.push({
          id: `sup-${r.id}`,
          title: sup.name,
          subtitle: `Phone: ${sup.phone || 'N/A'} · Return: ${r.returnNumber}`,
          category: 'Supplier',
          value: sup.name,
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
      const poNum = (r.purchaseOrder?.poNumber || '').toLowerCase();
      const sup = getSupplierInfo(r);
      const supName = (sup.name || '').toLowerCase();
      const supPhone = (sup.phone || '').toLowerCase();
      const reason = (r.returnReason || '').toLowerCase();
      const remark = (r.remarks || '').toLowerCase();

      const matchesSearch =
        retId.includes(q) ||
        poNum.includes(q) ||
        supName.includes(q) ||
        supPhone.includes(q) ||
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

      if (sortColumn === 'purchaseOrder') {
        aVal = a.purchaseOrder?.poNumber || '';
        bVal = b.purchaseOrder?.poNumber || '';
      } else if (sortColumn === 'supplier') {
        aVal = getSupplierInfo(a).name;
        bVal = getSupplierInfo(b).name;
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

  const handleStatusChange = async (status: POReturnStatus) => {
    if (!selectedReturn) return;
    try {
      const updated = await poReturnService.updateStatus(selectedReturn.id, status);
      setReturns((prev) =>
        prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: updated.status } : r))
      );
      setSelectedReturn(prev => prev ? { ...prev, status: updated.status } : null);
      toast.success(`PO Return status updated to ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!returnToDelete) return;
    try {
      setIsDeleting(true);
      await poReturnService.delete(returnToDelete.id);
      setReturns((prev) => prev.filter((r) => r.id !== returnToDelete.id));
      if (selectedReturn?.id === returnToDelete.id) {
        setSelectedReturn(null);
      }
      toast.success('PO Return deleted successfully');
      setReturnToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete PO return');
    } finally {
      setIsDeleting(false);
    }
  };

  // KPI calculations
  const totalDebitSum = useMemo(() => {
    return returns
      .filter((r) => r.status !== POReturnStatus.CANCELLED)
      .reduce((sum, r) => sum + Number(r.returnTotal || 0), 0);
  }, [returns]);

  const completedReturnsCount = useMemo(() => {
    return returns.filter((r) => r.status === POReturnStatus.COMPLETED).length;
  }, [returns]);

  const pendingReturnsCount = useMemo(() => {
    return returns.filter((r) => r.status === POReturnStatus.PENDING).length;
  }, [returns]);

  const columns: Column<PurchaseOrderReturn>[] = [
    {
      key: 'returnNumber',
      header: 'Return ID',
      sortable: true,
      minWidth: '140px',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-purple-400 text-xs hover:underline cursor-pointer" onClick={() => setSelectedReturn(row)}>
            {row.returnNumber}
          </span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            {new Date(row.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: 'purchaseOrder',
      header: 'Purchase Order',
      sortable: true,
      minWidth: '140px',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-slate-200 font-semibold">
            {row.purchaseOrder?.poNumber || 'N/A'}
          </span>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            LKR {Math.round(Number(row.purchaseOrder?.totalAmount || 0)).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortable: true,
      minWidth: '180px',
      render: (row) => {
        const sup = getSupplierInfo(row);
        return (
          <div>
            <p className="font-bold text-slate-200 text-xs">{sup.name}</p>
            {sup.phone && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                <Phone size={10} className="text-slate-500" /> {sup.phone}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      minWidth: '80px',
      render: (row) => {
        const totalQty = (row.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
        return (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#0f172a] text-purple-300 border border-purple-500/30">
            {totalQty} units
          </span>
        );
      },
    },
    {
      key: 'returnTotal',
      header: 'Debit Amount',
      sortable: true,
      align: 'right',
      minWidth: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-slate-100 text-xs">
          LKR {Math.round(Number(row.returnTotal || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'returnReason',
      header: 'Reason & Remarks',
      minWidth: '200px',
      render: (row) => (
        <div className="max-w-[200px]">
          <p className="text-xs text-slate-300 truncate" title={row.returnReason}>
            {row.returnReason}
          </p>
          {row.remarks && (
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5" title={row.remarks}>
              <MessageSquare size={10} className="shrink-0 text-slate-500" />
              <span className="truncate">{row.remarks}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      minWidth: '110px',
      render: (row) => {
        const isCompleted = row.status === POReturnStatus.COMPLETED;
        const isPending = row.status === POReturnStatus.PENDING;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : isPending
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isCompleted && <CheckCircle2 size={11} />}
            {isPending && <Clock size={11} />}
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '80px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReturn(row);
            }}
            className="p-1.5 text-purple-400 hover:bg-purple-500/15 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="View Return Note"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setReturnToDelete(row);
            }}
            className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Delete Return"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      headerTitle="Purchase Order Returns & Debit Notes"
      headerSubtitle="Manage returns to suppliers, stock deductions, and debit balances"
      headerIcon={<RotateCcw size={20} className="text-purple-400" />}
    >
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total PO Returns
            </p>
            <p className="text-2xl font-black text-white mt-1">{returns.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Debit notes created</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <RotateCcw size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Pending Approval
            </p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingReturnsCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Completed & Dispatched
            </p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{completedReturnsCount}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Stock deducted</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Debit Value
            </p>
            <p className="text-2xl font-black text-purple-400 font-mono mt-1">
              LKR {Math.round(totalDebitSum).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Supplier credit claims</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Main Table Card with FilterBar */}
      <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
        <FilterBar
          searchPlaceholder="Search Return ID, PO #, Supplier Name, Remarks..."
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
                { value: 'PENDING', label: 'Pending' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
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
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>New PO Return</span>
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
            emptyMessage="No purchase order returns found matching your criteria."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedReturns.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* CREATE RETURN MODAL */}
      <CreatePOReturnModal
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
      <POReturnViewModal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
        onStatusChange={handleStatusChange}
        onDelete={() => {
          if (selectedReturn) {
            const current = selectedReturn;
            setSelectedReturn(null);
            setReturnToDelete(current);
          }
        }}
      />

      {/* CONFIRM DELETE RETURN MODAL */}
      <ConfirmDialog
        isOpen={!!returnToDelete}
        title="Delete Purchase Order Return?"
        message={`Are you sure you want to delete return note "${returnToDelete?.returnNumber}"? ${
          returnToDelete?.status === POReturnStatus.COMPLETED
            ? 'This return was completed, so deleting it will restore item quantities back into warehouse stock.'
            : 'This will permanently remove the return note.'
        } This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Return'}
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setReturnToDelete(null)}
      />
    </AppLayout>
  );
};

export default POReturns;
