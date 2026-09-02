import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, FilterBar, DataTable, useToast } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import { ShoppingCart, Plus, MessageCircle, Eye, Edit, Trash2, FileText, Download } from 'lucide-react';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { orderService } from '../services/OrderService';
import CreatePOModal from '../components/orders/CreatePOModal';
import PurchaseOrderViewModal from '../components/orders/PurchaseOrderViewModal';
import CustomConfirm from '../components/CustomConfirm';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { generatePOWhatsAppMessage, getWhatsAppUrl } from '../utils/whatsapp';

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPOToUpdate, setSelectedPOToUpdate] = useState<PurchaseOrder | null>(null);
  const [selectedPOForPreview, setSelectedPOForPreview] = useState<PurchaseOrder | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const isPOEditable = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s !== 'completed' && s !== 'paid' && s !== 'cancelled';
  };

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data || []);
    } catch {
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, []);

  const handleUpdatePO = async (updatedPO: PurchaseOrder) => {
    try {
      await purchaseOrderService.updateStatus(updatedPO.id, updatedPO.status);
    } catch {
      // ignore
    }
    setSelectedPOToUpdate(null);
    success('PO Updated', `Purchase order ${updatedPO.poNumber} has been updated.`);
    fetchPOs();
  };

  const handleCreatePO = async (newPO: PurchaseOrder) => {
    await purchaseOrderService.create(newPO);
    setShowCreateModal(false);
    fetchPOs();
  };

  // Returns the salesman from the original order if the PO was converted from one
  const getSalesmanFromPO = (_po: PurchaseOrder): { id: string; name: string } | undefined => {
    return undefined;
  };

  const supplierOptions = useMemo(() => {
    const names = Array.from(new Set(purchaseOrders.map((p) => p.supplierName)));
    return names.map((name) => ({ value: name, label: name }));
  }, [purchaseOrders]);



  // Dynamic suggestions for FilterBar instant dropdown
  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];
    const seenSuppliers = new Set<string>();

    // 1. Suppliers
    purchaseOrders.forEach(po => {
      if (po.supplierName && !seenSuppliers.has(po.supplierName)) {
        seenSuppliers.add(po.supplierName);
        suggestions.push({
          id: `sup-${po.supplierId || po.supplierName}`,
          title: po.supplierName,
          subtitle: `${po.supplierContact ? `${po.supplierContact} · ` : ''}${po.supplierCity || po.supplierPhone || ''}`,
          category: 'Supplier',
          value: po.supplierName,
        });
      }
    });

    // 2. Purchase Orders
    purchaseOrders.forEach(po => {
      suggestions.push({
        id: `po-${po.poNumber}`,
        title: po.poNumber,
        subtitle: `${po.supplierName} · LKR ${(po.totalAmount || 0).toLocaleString()} · ${po.status}`,
        category: 'Purchase Order',
        value: po.poNumber,
      });
    });

    // 3. Reference Orders
    purchaseOrders.forEach(po => {
      if (po.sourceOrderNumber) {
        suggestions.push({
          id: `ref-${po.sourceOrderNumber}`,
          title: `Ref: ${po.sourceOrderNumber}`,
          subtitle: `Linked PO: ${po.poNumber} (${po.supplierName})`,
          category: 'Order ID',
          value: po.sourceOrderNumber,
        });
      }
    });

    return suggestions;
  }, [purchaseOrders]);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        searchQuery === '' ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.sourceOrderNumber && po.sourceOrderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        po.createdByName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSupplier = supplierFilter === '' || po.supplierName === supplierFilter;

      const poDate = po.poDate;
      const matchesDateFrom = dateFrom === '' || poDate >= dateFrom;
      const matchesDateTo = dateTo === '' || poDate <= dateTo;

      return matchesSearch && matchesSupplier && matchesDateFrom && matchesDateTo;
    });
  }, [purchaseOrders, searchQuery, supplierFilter, dateFrom, dateTo]);

  const sortedPOs = useMemo(() => {
    return [...filteredPOs].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPOs, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedPOs.length / itemsPerPage);
  const paginatedPOs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedPOs.slice(start, start + itemsPerPage);
  }, [sortedPOs, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['PO Number', 'PO Date', 'Supplier', 'Ref Order', 'Created By', 'Items', 'Total', 'Status'];
    const rows = sortedPOs.map((p) => [
      p.poNumber, p.poDate, `"${p.supplierName}"`, p.sourceOrderNumber || 'Direct PO',
      `"${p.createdByName}"`, p.totalItems, p.totalAmount, p.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `purchase_orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Completed', `Exported ${sortedPOs.length} purchase orders to CSV.`);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber',
      header: 'PO Number',
      sortable: true,
      minWidth: '120px',
      render: (row) => <span className="font-mono text-[#38BDF8] font-bold text-xs">{row.poNumber}</span>,
    },
    {
      key: 'referenceOrderNum',
      header: 'Ref Order',
      minWidth: '110px',
      render: (row) => {
        const refNum = row.sourceOrderNumber || (row as any).sourceOrder?.orderNumber || (row as any).sourceOrderId || (row as any).refOrder;
        return refNum ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-[11px] font-semibold">
            <FileText size={11} className="text-blue-400 shrink-0" />
            <span>{refNum}</span>
          </span>
        ) : (
          <span className="text-slate-500 text-xs font-mono">—</span>
        );
      },
    },
    {
      key: 'supplierName',
      header: 'Supplier',
      sortable: true,
      minWidth: '170px',
      render: (row) => (
        <div>
          <p className="font-semibold text-[#F8FAFC] text-sm truncate max-w-[180px]">{row.supplierName}</p>
          <p
            className="text-[11px] text-[#94A3B8] cursor-help hover:text-purple-400 transition-colors"
            title={`Full Address: ${row.supplierAddress || 'N/A'}, ${row.supplierCity || 'N/A'}`}
          >
            {row.supplierCity}
          </p>
        </div>
      ),
    },
    {
      key: 'poDate',
      header: 'Created Date',
      sortable: true,
      minWidth: '110px',
      render: (row) => {
        if (!row.poDate) return <span className="text-xs text-slate-500 font-mono">—</span>;
        const cleanDate = String(row.poDate).split('T')[0];
        return <span className="text-xs text-slate-300 font-mono font-medium">{cleanDate}</span>;
      },
    },
    {
      key: 'numberOfItems',
      header: 'Items',
      align: 'center',
      minWidth: '60px',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#111827] text-[#CBD5E1] border border-[#334155]">
          {row.totalItems}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => <span className="font-bold text-[#F8FAFC] font-mono">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '240px',
      render: (row) => {
        const isEligibleForInvoice = !!(row.items && row.items.length > 0);
        return (
          <div className="flex gap-1.5 justify-end items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                const text = generatePOWhatsAppMessage({
                  poNumber: row.poNumber,
                  supplierName: row.supplierName,
                  totalAmount: row.totalAmount,
                  poDate: row.poDate,
                  itemsCount: row.totalItems || row.items?.length || 0,
                  remarks: row.notes,
                  shareUrl: `${window.location.origin}/purchase-orders/${row.id || row.poNumber}`,
                });
                const url = getWhatsAppUrl(row.supplierPhone || '+94705787818', text);
                window.open(url, '_blank');
                success('WhatsApp Shared', `Opened chat for ${row.supplierName} (${row.supplierPhone || '+94 705787818'})`);
              }}
              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition shadow-sm"
              title="Share Purchase Order on WhatsApp"
              aria-label="Share Purchase Order on WhatsApp"
            >
              <MessageCircle size={14} />
            </button>
            <button
              onClick={() => setSelectedPOForPreview(row)}
              className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white transition shadow-sm cursor-pointer"
              title="Preview, Download PDF & Print"
              aria-label="Preview Purchase Order"
            >
              <FileText size={14} />
            </button>
            <button
              onClick={() => navigate(`/purchase-orders/${row.id}`)}
              className="p-1.5 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white transition shadow-sm cursor-pointer"
              title="View PO Details"
              aria-label="View PO Details"
            >
              <Eye size={14} />
            </button>
            {isPOEditable(row.status) ? (
              <button
                onClick={() => setSelectedPOToUpdate(row)}
                className="p-1.5 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-amber-400 hover:text-amber-300 transition shadow-sm cursor-pointer"
                title="Edit Purchase Order"
                aria-label="Edit Purchase Order"
              >
                <Edit size={14} />
              </button>
            ) : (
              <button
                disabled
                className="p-1.5 rounded-lg border border-[#334155]/50 bg-[#1e293b]/50 text-gray-600 transition shadow-sm cursor-not-allowed opacity-40"
                title={`PO is ${row.status.replace(/_/g, ' ')} and cannot be edited`}
                aria-label="Edit Locked"
              >
                <Edit size={14} />
              </button>
            )}

            <button
              onClick={() => {
                setConfirmConfig({
                  isOpen: true,
                  title: 'Delete Purchase Order?',
                  message: `Are you sure you want to delete PO "${row.poNumber}"? If this PO is linked to a Sales Order, the link will be detached. This action cannot be undone.`,
                  confirmText: 'Delete PO',
                  cancelText: 'Cancel',
                  type: 'danger',
                  onConfirm: async () => {
                    try {
                      await purchaseOrderService.delete(row.id);
                      setPurchaseOrders(prev => prev.filter(p => p.id !== row.id));
                      success('PO Deleted', `Purchase Order ${row.poNumber} deleted.`);
                    } catch (err: any) {
                      success('Error', err?.message || 'Failed to delete PO');
                    }
                  },
                });
              }}
              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition shadow-sm cursor-pointer"
              title="Delete Purchase Order"
              aria-label="Delete Purchase Order"
            >
              <Trash2 size={14} />
            </button>
            <button
              onClick={async () => {
                let sourceOrder = null;
                if (row.sourceOrderId) {
                  try {
                    sourceOrder = await orderService.getById(row.sourceOrderId);
                  } catch {
                    // fall back
                  }
                }
                navigate('/invoice', {
                  state: {
                    convertFromPO: row,
                    convertFromOrder: sourceOrder,
                    salesman: getSalesmanFromPO(row),
                  },
                });
              }}
              disabled={!isEligibleForInvoice}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap ${
                isEligibleForInvoice
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-[#1e293b] text-gray-500 border border-[#334155] cursor-not-allowed opacity-50'
              }`}
              title={isEligibleForInvoice ? "Convert Purchase Order to Sales Invoice" : "No items to convert"}
            >
              <FileText size={13} />
              <span>Invoice</span>
            </button>
          </div>
        );
      },
    },
  ];

  const hasActiveFilters =
    searchQuery !== '' || supplierFilter !== '' || dateFrom !== '' || dateTo !== '';

  const clearAllFilters = () => {
    setSearchQuery(''); setSupplierFilter('');
    setDateFrom(''); setDateTo('');
    setCurrentPage(1);
  };

  return (
    <AppLayout
      headerIcon={<ShoppingCart size={18} />}
      headerTitle="Purchase Orders"
      headerSubtitle="Inventory procurement & supplier POs"
    >
      <PageHeader
        title="Purchase Orders"
        description="Manage stock replenishment orders sent to suppliers."
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Purchasing' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b]/80 hover:bg-[#334155] text-slate-300 hover:text-white border border-[#334155] rounded-xl text-xs font-semibold shadow-md transition-all duration-200"
            >
              <Download size={13} className="text-slate-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus size={14} />
              <span>New PO</span>
            </button>
          </div>
        }
      />

      <div className="erp-card p-0 overflow-hidden shadow-lg">
        <FilterBar
          searchPlaceholder="Search PO number, supplier, ref order..."
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          suggestions={searchSuggestions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(val) => { setDateFrom(val); setCurrentPage(1); }}
          onDateToChange={(val) => { setDateTo(val); setCurrentPage(1); }}
          selects={[
            {
              value: supplierFilter,
              onChange: (val) => { setSupplierFilter(val); setCurrentPage(1); },
              options: supplierOptions,
              placeholder: 'All Suppliers',
              width: 'w-40',
            },
          ]}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
        />

        <DataTable
          columns={columns}
          data={paginatedPOs}
          loading={loading}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/purchase-orders/${item.id}`)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyMessage="No purchase orders found matching criteria."
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedPOs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <CreatePOModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePO}
      />

      <CreatePOModal
        isOpen={selectedPOToUpdate !== null}
        onClose={() => setSelectedPOToUpdate(null)}
        onSubmit={handleUpdatePO}
        poToEdit={selectedPOToUpdate}
      />
      {/* Custom Confirm Modal for Delete */}
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Dedicated Purchase Order Preview & Print Modal */}
      <PurchaseOrderViewModal
        isOpen={selectedPOForPreview !== null}
        onClose={() => setSelectedPOForPreview(null)}
        selectedPO={selectedPOForPreview}
        onShareSuccess={(msg) => success('Shared', msg)}
      />
    </AppLayout>
  );
};

export default PurchaseOrders;
