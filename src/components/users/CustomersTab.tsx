import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import { mockCustomers as initialCustomers } from '../../data/mockCustomers';
import type { Customer, CustomerCreateDto, CustomerTypeValue, CustomerStatusValue } from '../../types/customers';
import { Plus, Eye, Edit2, Trash2, X } from 'lucide-react';

const CustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Table state
  const [sortColumn, setSortColumn] = useState('businessName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  // Form state
  const [formData, setFormData] = useState<CustomerCreateDto>({
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    customerType: 'Hardware Shop',
    status: 'Active',
    creditLimit: 1000000,
    paymentTerms: 'Net 30',
  });

  const typeOptions = [
    { value: 'Hardware Shop', label: 'Hardware Shop' },
    { value: 'Retailer', label: 'Retailer' },
    { value: 'Contractor', label: 'Contractor' },
    { value: 'Distributor', label: 'Distributor' },
    { value: 'Other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === '' || c.status === statusFilter;
      const matchesType = typeFilter === '' || c.customerType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [customers, searchQuery, statusFilter, typeFilter]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      const valA = (a as any)[sortColumn];
      const valB = (b as any)[sortColumn];
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(start, start + itemsPerPage);
  }, [sortedCustomers, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  // Submit Handler (Add or Edit)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.contactPerson || !formData.phone) {
      return;
    }

    if (editCustomer) {
      // Edit
      setCustomers((prev) =>
        prev.map((c) => (c.id === editCustomer.id ? { ...c, ...formData, updatedAt: new Date().toISOString() } : c))
      );
      success('Customer Updated', `Successfully updated ${formData.businessName}.`);
      setEditCustomer(null);
    } else {
      // Add
      const newCust: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        customerId: `CUST-${Math.floor(10000 + Math.random() * 90000)}`,
        ...formData,
        totalOrders: 0,
        totalSales: 0,
        outstandingBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCustomers((prev) => [newCust, ...prev]);
      success('Customer Created', `Added ${formData.businessName} to database.`);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setFormData({
      businessName: customer.businessName,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address,
      city: customer.city,
      customerType: customer.customerType,
      status: customer.status,
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms,
      notes: customer.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteCustomer) return;
    setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
    success('Customer Deleted', `Deleted customer ${deleteCustomer.businessName}.`);
    setDeleteCustomer(null);
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      customerType: 'Hardware Shop',
      status: 'Active',
      creditLimit: 1000000,
      paymentTerms: 'Net 30',
    });
  };

  const columns: Column<Customer>[] = [
    {
      key: 'customerId',
      header: 'Customer ID',
      sortable: true,
      minWidth: '110px',
      render: (row) => <span className="font-mono text-cyan-400 font-bold text-xs">{row.customerId}</span>,
    },
    {
      key: 'businessName',
      header: 'Shop / Business Name',
      sortable: true,
      minWidth: '190px',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-200 text-sm leading-tight truncate max-w-[200px]">{row.businessName}</p>
          <p className="text-[11px] text-slate-500 truncate">{row.address}, {row.city}</p>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact',
      minWidth: '140px',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-300 font-semibold">{row.contactPerson}</p>
          <p className="text-[11px] text-slate-500 font-mono">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'customerType',
      header: 'Type',
      sortable: true,
      minWidth: '100px',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
          {row.customerType}
        </span>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Orders',
      align: 'center',
      minWidth: '70px',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-slate-700">{row.totalOrders}</span>
      ),
    },
    {
      key: 'totalSales',
      header: 'Total Sales',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => <span className="font-bold text-slate-100 font-mono">{formatCurrency(row.totalSales)}</span>,
    },
    {
      key: 'outstandingBalance',
      header: 'Outstanding',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => (
        <span className={`font-mono font-bold ${row.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
          {formatCurrency(row.outstandingBalance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      minWidth: '80px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/users/customers/${row.id}`)}
            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
            title="Edit Customer"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setDeleteCustomer(row)}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
            title="Delete Customer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header bar within tab */}
      <div className="erp-card mb-6 p-0 overflow-hidden">
        <FilterBar
          searchPlaceholder="Search customer, ID, city, phone..."
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          selects={[
            {
              value: typeFilter,
              onChange: (val) => {
                setTypeFilter(val);
                setCurrentPage(1);
              },
              options: typeOptions,
              placeholder: 'All Customer Types',
              width: 'w-40',
            },
            {
              value: statusFilter,
              onChange: (val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              },
              options: statusOptions,
              placeholder: 'All Statuses',
              width: 'w-32',
            },
          ]}
          hasActiveFilters={searchQuery !== '' || statusFilter !== '' || typeFilter !== ''}
          onClearFilters={() => {
            setSearchQuery('');
            setStatusFilter('');
            setTypeFilter('');
            setCurrentPage(1);
          }}
          rightContent={
            <button
              onClick={() => {
                setEditCustomer(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="erp-btn erp-btn-primary erp-btn-sm gap-1.5"
            >
              <Plus size={14} /> Add Customer
            </button>
          }
        />

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedCustomers}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/users/customers/${item.id}`)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyMessage="No hardware customers found."
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative erp-card w-full max-w-lg animate-slideIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                {editCustomer ? 'Edit Customer' : 'Add New Hardware Customer'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Business / Shop Name *</label>
                <input
                  required
                  type="text"
                  className="erp-input"
                  placeholder="e.g. Nirosha Hardware Mart"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Contact Person *</label>
                  <input
                    required
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Nirosha Bandara"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone Number *</label>
                  <input
                    required
                    type="text"
                    className="erp-input"
                    placeholder="077-123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    className="erp-input"
                    placeholder="info@shop.lk"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">City / Location *</label>
                  <input
                    required
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Colombo 09"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Street Address</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="e.g. 145, Baseline Road"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Customer Type</label>
                  <select
                    className="erp-select w-full"
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerTypeValue })}
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Status</label>
                  <select
                    className="erp-select w-full"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatusValue })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Credit Limit (LKR)</label>
                  <input
                    type="number"
                    className="erp-input"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Terms</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Net 30, COD"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="erp-btn erp-btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary">
                  {editCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteCustomer}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteCustomer?.businessName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCustomer(null)}
      />
    </div>
  );
};

export default CustomersTab;
