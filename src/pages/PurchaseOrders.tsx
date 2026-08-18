import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, FilterBar, DataTable, useToast } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import { mockPurchaseOrders as initialPOs } from '../data/mockPurchaseOrders';
import { Eye, Download, ShoppingCart, Plus, Edit, FileText } from 'lucide-react';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import CreatePOModal from '../components/orders/CreatePOModal';

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

  const handleUpdatePO = async (updatedPO: PurchaseOrder) => {
    const index = initialPOs.findIndex(po => po.id === updatedPO.id);
    if (index !== -1) {
      initialPOs[index] = updatedPO;
    }
    try {
      await purchaseOrderService.updateStatus(updatedPO.id, updatedPO.status);
    } catch {
      // ignore
    }
    setSelectedPOToUpdate(null);
    success('PO Updated', `Purchase order ${updatedPO.poNumber} has been updated.`);
    fetchPOs();
  };

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data);
    } catch {
      setPurchaseOrders(initialPOs);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPOs();
  }, []);

  const handleCreatePO = async (newPO: PurchaseOrder) => {
    await purchaseOrderService.create(newPO);
    setShowCreateModal(false);
    fetchPOs();
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
        subtitle: `${po.supplierName} · LKR ${(po.grandTotal || 0).toLocaleString()} · ${po.status}`,
        category: 'Purchase Order',
        value: po.poNumber,
      });
    });

    // 3. Reference Orders
    purchaseOrders.forEach(po => {
      if (po.referenceOrderNum) {
        suggestions.push({
          id: `ref-${po.referenceOrderNum}`,
          title: `Ref: ${po.referenceOrderNum}`,
          subtitle: `Linked PO: ${po.poNumber} (${po.supplierName})`,
          category: 'Order ID',
          value: po.referenceOrderNum,
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
        (po.referenceOrderNum && po.referenceOrderNum.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
      p.poNumber, p.poDate, `"${p.supplierName}"`, p.referenceOrderNum || 'Direct PO',
      `"${p.createdByName}"`, p.numberOfItems, p.grandTotal, p.status,
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
      minWidth: '100px',
      render: (row) => <span className="font-mono text-xs text-[#CBD5E1]">{row.referenceOrderNum || '—'}</span>,
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
      render: (row) => <span className="text-xs text-[#CBD5E1]">{row.poDate}</span>,
    },
    {
      key: 'numberOfItems',
      header: 'Items',
      align: 'center',
      minWidth: '60px',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#111827] text-[#CBD5E1] border border-[#334155]">
          {row.numberOfItems}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => <span className="font-bold text-[#F8FAFC] font-mono">{formatCurrency(row.grandTotal)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '220px',
      render: (row) => {
        const isEligibleForInvoice = !!(row.items && row.items.length > 0);
        return (
          <div className="flex gap-2 justify-end items-center">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${row.id}`); }}
              className="p-1.5 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 hover:text-white transition shadow-sm"
              title="View Purchase Order"
              aria-label="View Purchase Order"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPOToUpdate(row);
              }}
              className="p-1.5 rounded-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-amber-400 hover:text-amber-300 transition shadow-sm"
              title="Edit Purchase Order"
              aria-label="Edit Purchase Order"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/invoice', { state: { convertFromPO: row } });
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
    </AppLayout>
  );
};

export default PurchaseOrders;
