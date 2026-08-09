import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, FilterBar, DataTable, StatusBadge, useToast } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import { mockPurchaseOrders as initialPOs } from '../data/mockPurchaseOrders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { Eye, Download, ShoppingCart } from 'lucide-react';
import { purchaseOrderService } from '../services/PurchaseOrderService';

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
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
    fetchPOs();
  }, []);

  const supplierOptions = useMemo(() => {
    const names = Array.from(new Set(purchaseOrders.map((p) => p.supplierName)));
    return names.map((name) => ({ value: name, label: name }));
  }, [purchaseOrders]);

  const statusOptions = [
    { value: 'Draft', label: 'Draft' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Partially Received', label: 'Partially Received' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchesSearch =
        searchQuery === '' ||
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.referenceOrderNum && po.referenceOrderNum.toLowerCase().includes(searchQuery.toLowerCase())) ||
        po.createdByName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === '' || po.status === statusFilter;
      const matchesSupplier = supplierFilter === '' || po.supplierName === supplierFilter;

      const poDate = po.poDate;
      const matchesDateFrom = dateFrom === '' || poDate >= dateFrom;
      const matchesDateTo = dateTo === '' || poDate <= dateTo;

      return matchesSearch && matchesStatus && matchesSupplier && matchesDateFrom && matchesDateTo;
    });
  }, [purchaseOrders, searchQuery, statusFilter, supplierFilter, dateFrom, dateTo]);

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
          <p className="text-[11px] text-[#94A3B8]">{row.supplierCity}</p>
        </div>
      ),
    },
    {
      key: 'createdByName',
      header: 'Created By',
      minWidth: '110px',
      render: (row) => <span className="text-xs text-[#CBD5E1]">{row.createdByName}</span>,
    },
    {
      key: 'poDate',
      header: 'PO Date',
      sortable: true,
      minWidth: '95px',
      render: (row) => <span className="text-xs text-[#CBD5E1]">{row.poDate}</span>,
    },
    {
      key: 'expectedDate',
      header: 'Expected',
      minWidth: '95px',
      render: (row) => <span className="text-xs text-[#94A3B8]">{row.expectedDate}</span>,
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
      key: 'status',
      header: 'Status',
      sortable: true,
      minWidth: '120px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '70px',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${row.id}`); }}
          className="erp-btn erp-btn-secondary erp-btn-sm gap-1"
        >
          <Eye size={13} /> View
        </button>
      ),
    },
  ];

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== '' || supplierFilter !== '' || dateFrom !== '' || dateTo !== '';

  const clearAllFilters = () => {
    setSearchQuery(''); setStatusFilter(''); setSupplierFilter('');
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
            <button onClick={handleExportCSV} className="erp-btn erp-btn-secondary erp-btn-sm gap-1.5 text-xs">
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />

      <div className="erp-card p-0 overflow-hidden shadow-lg">
        <FilterBar
          searchPlaceholder="Search PO number, supplier, ref order..."
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(val) => { setDateFrom(val); setCurrentPage(1); }}
          onDateToChange={(val) => { setDateTo(val); setCurrentPage(1); }}
          selects={[
            {
              value: statusFilter,
              onChange: (val) => { setStatusFilter(val); setCurrentPage(1); },
              options: statusOptions,
              placeholder: 'All PO Statuses',
              width: 'w-40',
            },
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
    </AppLayout>
  );
};

export default PurchaseOrders;
