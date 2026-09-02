import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, FilterBar, DataTable, StatusBadge, useToast } from '../components/erp';
import type { Column } from '../components/erp/DataTable';
import type { Order } from '../types/orders';
import { Eye, Edit, Download, ShoppingBag, Plus, MessageCircle, Trash2 } from 'lucide-react';
import CreateOrderModal from '../components/orders/CreateOrderModal';
import CustomConfirm from '../components/CustomConfirm';
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

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

  const isOrderEditable = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'pending_approval' || s === 'draft' || s === 'converted_to_po' || s === 'converted_to_invoice';
  };

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
    const names = Array.from(new Set(orders.map((o) => o.salesman?.fullName).filter(Boolean))) as string[];
    return names.map((name) => ({ value: name, label: name }));
  }, [orders]);

  const statusOptions = [
    { value: 'pending',             label: 'Pending' },
    { value: 'rejected',            label: 'Rejected' },
    { value: 'converted_to_po',     label: 'Converted to PO' },
    { value: 'converted_to_invoice',label: 'Converted to Invoice' },
    { value: 'completed',           label: 'Completed' },
  ];

  const paymentOptions = [
    { value: 'unpaid', label: 'unpaid' },
    { value: 'paid', label: 'paid' },
    { value: 'partial', label: 'partial' },
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
      const matchesSalesman = salesmanFilter === '' || ord.salesman?.fullName === salesmanFilter;

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
      if (sortColumn === 'salesman') { valA = a.salesman?.fullName || ''; valB = b.salesman?.fullName || ''; }
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
      o.orderNumber, o.orderDate, `"${o.customerName}"`, o.contactPhone,
      `"${o.salesman?.fullName || 'Unassigned'}"`, o.numberOfProducts, o.grandTotal, o.paymentStatus, o.status,
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

  const handleSaveOrder = async (orderPayload: Order): Promise<Order> => {
    try {
      const isExisting = orders.some(o => o.id === orderPayload.id);
      let result: Order;
      if (isExisting) {
        result = await orderService.update(orderPayload.id, orderPayload);
        setOrders(prev => prev.map(o => o.id === result.id ? result : o));
      } else {
        result = await orderService.create(orderPayload);
        setOrders(prev => [result, ...prev.filter(o => o.id !== result.id)]);
      }
      return result;
    } catch {
      setOrders(prev => {
        const isExisting = prev.some(o => o.id === orderPayload.id);
        if (isExisting) {
          return prev.map(o => o.id === orderPayload.id ? orderPayload : o);
        }
        return [orderPayload, ...prev];
      });
      return orderPayload;
    }
  };

  const handleDeleteOrder = (orderToDelete: Order) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Order?',
      message: `Are you sure you want to delete Order "${orderToDelete.orderNumber}"? This action may affect connected documents (Purchase Orders/Invoices) and cannot be undone.`,
      confirmText: 'Delete Order',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await orderService.delete(orderToDelete.id);
          setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
          success('Order Deleted', `Order ${orderToDelete.orderNumber} deleted successfully.`);
        } catch (err: any) {
          success('Error', err?.message || 'Failed to delete order');
        }
      },
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const columns: Column<Order>[] = [
    {
      key: 'orderId',
      header: 'Order ID',
      sortable: true,
      minWidth: '110px',
      render: (row) => <span className="font-mono text-blue-400 font-bold text-xs">{row.orderNumber}</span>,
    },
    {
      key: 'orderDate',
      header: 'Date',
      sortable: true,
      minWidth: '105px',
      render: (row) => {
        const cleanDate = row.orderDate ? String(row.orderDate).split('T')[0] : '—';
        return <span className="text-gray-300 text-xs font-mono font-medium">{cleanDate}</span>;
      },
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      minWidth: '180px',
      render: (row) => {
        const fullAddress = row.customerAddress ? `${row.customerAddress}, ${row.customerCity || ''}` : row.customerCity || 'N/A';
        const tooltip = `Full Name: ${row.customerName}\nFull Address: ${fullAddress}`;
        return (
          <div className="min-w-0 cursor-help" title={tooltip}>
            <p className="font-semibold text-gray-200 text-sm leading-tight truncate max-w-[200px]">{row.customerName}</p>
            <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{fullAddress}</p>
          </div>
        );
      },
    },
    {
      key: 'salesman',
      header: 'Salesman',
      sortable: true,
      minWidth: '140px',
      render: (row) => {
        const salesmanName = row.salesmanName || (typeof row.salesman === 'object' && row.salesman?.fullName) || (typeof row.salesman === 'string' ? row.salesman : '') || '—';
        const area = (typeof row.salesman === 'object' && row.salesman?.area) || (row as any).salesmanArea;
        return (
          <div>
            <p className="text-xs font-semibold text-gray-300">{salesmanName}</p>
            {area && <p className="text-[11px] text-gray-400">{area}</p>}
          </div>
        );
      },
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
                orderNumber: row.orderNumber,
                customerName: row.customerName,
                totalAmount: row.grandTotal,
                orderDate: row.orderDate,
                itemsCount: row.numberOfProducts || row.items?.length || 0,
                remarks: row.notes,
              });
              const url = getWhatsAppUrl(row.contactPhone || '', text);
              window.open(url, '_blank');
            }}
            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle size={15} />
          </button>
          
          {isOrderEditable(row.status) ? (
            <button
              onClick={() => {
                setEditingOrder(row);
                setShowCreateModal(true);
              }}
              className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
              title="Edit Order"
            >
              <Edit size={15} />
            </button>
          ) : (
            <button
              disabled
              className="p-1.5 text-gray-600 rounded-lg inline-flex items-center gap-1 text-xs cursor-not-allowed opacity-40"
              title={`Order is ${row.status.replace(/_/g, ' ')} and cannot be edited`}
            >
              <Edit size={15} />
            </button>
          )}

          <button
            onClick={() => navigate(`/orders/${row.id}`)}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="View Order"
          >
            <Eye size={15} />
          </button>

          <button
            onClick={() => handleDeleteOrder(row)}
            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Delete Order"
          >
            <Trash2 size={15} />
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
                onClick={() => {
                  setEditingOrder(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
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

      {/* Create / Edit Order Slide-in Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingOrder(null);
        }}
        onSubmit={handleSaveOrder}
        initialOrder={editingOrder}
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
    </>
  );
};

export default Orders;
