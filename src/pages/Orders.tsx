import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, FilterBar, DataTable, StatusBadge, useToast } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import type { Order } from '../types/orders';
import { Eye, Download, ShoppingBag, Plus, MessageCircle } from 'lucide-react';
import CreateOrderModal from '../components/orders/CreateOrderModal';
import { orderService } from '../services/OrderService';
import { generateOrderWhatsAppMessage, getWhatsAppUrl } from '../utils/whatsapp';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await orderService.getAll();
        setOrders(data || []);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const salesmenOptions = useMemo(() => {
    const names = Array.from(new Set(orders.map((o) => o.salesman?.name).filter(Boolean))) as string[];
    return names.map((name) => ({ value: name, label: name }));
  }, [orders]);

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Reviewing', label: 'Reviewing' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Converted to PO', label: 'Converted to PO' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const paymentOptions = [
    { value: 'Unpaid', label: 'Unpaid' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Partial', label: 'Partial' },
  ];

  // Dynamic suggestions for FilterBar instant dropdown (Customer Name only)
  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];
    const seenCustomers = new Set<string>();

    orders.forEach(o => {
      if (o.customerName && !seenCustomers.has(o.customerName)) {
        seenCustomers.add(o.customerName);
        suggestions.push({
          id: `cust-${o.customerId || o.customerName}`,
          title: o.customerName,
          subtitle: `${o.contactPerson ? `${o.contactPerson} · ` : ''}${o.customerCity || o.contactPhone || ''}`,
          category: 'Customer',
          value: o.customerName,
        });
      }
    });

    return suggestions;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        ord.customerName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === '' || ord.status === statusFilter;
      const matchesPayment = paymentFilter === '' || ord.paymentStatus === paymentFilter;
      const matchesSalesman = salesmanFilter === '' || ord.salesman?.name === salesmanFilter;

      const ordDate = ord.orderDate;
      const matchesDateFrom = dateFrom === '' || ordDate >= dateFrom;
      const matchesDateTo = dateTo === '' || ordDate <= dateTo;

      return matchesSearch && matchesStatus && matchesPayment && matchesSalesman && matchesDateFrom && matchesDateTo;
    });
  }, [orders, searchQuery, statusFilter, paymentFilter, salesmanFilter, dateFrom, dateTo]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];
      if (sortColumn === 'salesman') { valA = a.salesman?.name || ''; valB = b.salesman?.name || ''; }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedOrders.slice(start, start + itemsPerPage);
  }, [sortedOrders, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Order Date', 'Customer', 'Contact Phone', 'Salesman', 'Items', 'Total', 'Payment Status', 'Status'];
    const rows = sortedOrders.map((o) => [
      o.orderId, o.orderDate, `"${o.customerName}"`, o.contactPhone,
      `"${o.salesman?.name || 'Unassigned'}"`, o.numberOfProducts, o.grandTotal, o.paymentStatus, o.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Export Completed', `Exported ${sortedOrders.length} orders to CSV.`);
  };

  const handleCreateOrder = async (newOrder: Order) => {
    try {
      const created = await orderService.create(newOrder);
      setOrders(prev => [created, ...prev]);
    } catch {
      setOrders(prev => [newOrder, ...prev]);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const columns: Column<Order>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      sortable: true,
      minWidth: '110px',
      render: (row) => <span className="font-mono text-blue-400 font-bold text-xs">{row.orderId}</span>,
    },
    {
      key: 'orderDate',
      header: 'Date',
      sortable: true,
      minWidth: '95px',
      render: (row) => <span className="text-gray-400 text-xs">{row.orderDate}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      minWidth: '180px',
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-200 text-sm leading-tight truncate max-w-[200px]">{row.customerName}</p>
          <p className="text-[11px] text-gray-400 truncate">{row.customerCity}</p>
        </div>
      ),
    },
    {
      key: 'salesman',
      header: 'Salesman',
      sortable: true,
      minWidth: '140px',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-300">{row.salesman?.name || '—'}</p>
          {row.salesman?.area && <p className="text-[11px] text-gray-400">{row.salesman.area}</p>}
        </div>
      ),
    },
    {
      key: 'numberOfProducts',
      header: 'Items',
      align: 'center',
      minWidth: '60px',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#1e293b] text-gray-200 border border-[#334155]">
          {row.numberOfProducts}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      header: 'Amount',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => <span className="font-bold text-white text-sm font-mono">{formatCurrency(row.grandTotal)}</span>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      minWidth: '90px',
      render: (row) => <StatusBadge status={row.paymentStatus} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      minWidth: '110px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '120px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              const text = generateOrderWhatsAppMessage({
                orderId: row.orderId,
                customerName: row.customerName,
                totalAmount: row.grandTotal,
                orderDate: row.orderDate,
                itemsCount: row.numberOfProducts || row.products?.length || 0,
                remarks: row.notes,
              });
              const url = getWhatsAppUrl(row.contactPhone || '', text);
              window.open(url, '_blank');
            }}
            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs"
            title="Share on WhatsApp"
          >
            <MessageCircle size={15} />
          </button>
          <button
            onClick={() => navigate(`/orders/${row.id}`)}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs"
          >
            <Eye size={15} /> View
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== '' || paymentFilter !== '' ||
    salesmanFilter !== '' || dateFrom !== '' || dateTo !== '';

  const clearAllFilters = () => {
    setSearchQuery(''); setStatusFilter(''); setPaymentFilter('');
    setSalesmanFilter(''); setDateFrom(''); setDateTo('');
    setCurrentPage(1);
  };

  return (
    <>
      <AppLayout
        headerIcon={<ShoppingBag size={20} className="text-blue-400" />}
        headerTitle="Orders Management"
        headerSubtitle="Orders submitted by salesmen or created by admin"
      >
        <PageHeader
          title="Customer Orders"
          description="Manage and review customer orders created in the field."
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Sales' },
            { label: 'Orders' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
              >
                <Plus size={15} /> New Order
              </button>
            </div>
          }
        />

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <FilterBar
            searchPlaceholder="Search customer name..."
            searchValue={searchQuery}
            onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
            suggestions={searchSuggestions}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(val) => { setDateFrom(val); setCurrentPage(1); }}
            onDateToChange={(val) => { setDateTo(val); setCurrentPage(1); }}
            selects={[
              {
                value: statusFilter,
                onChange: (val) => { setStatusFilter(val); setCurrentPage(1); },
                options: statusOptions,
                placeholder: 'All Statuses',
                width: 'w-36',
              },
              {
                value: paymentFilter,
                onChange: (val) => { setPaymentFilter(val); setCurrentPage(1); },
                options: paymentOptions,
                placeholder: 'All Payments',
                width: 'w-32',
              },
              {
                value: salesmanFilter,
                onChange: (val) => { setSalesmanFilter(val); setCurrentPage(1); },
                options: salesmenOptions,
                placeholder: 'All Salesmen',
                width: 'w-36',
              },
            ]}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
          />

          <div className="p-4">
            <DataTable
              columns={columns}
              data={paginatedOrders}
              loading={loading}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => navigate(`/orders/${item.id}`)}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage="No orders found matching the criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedOrders.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </AppLayout>

      {/* Create Order Slide-in Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOrder}
      />
    </>
  );
};

export default Orders;
