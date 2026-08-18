import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import { mockCustomers as initialCustomers } from '../../data/mockCustomers';
import type { Customer, CustomerCreateDto, CustomerTypeValue, CustomerStatusValue } from '../../types/customers';
import { Plus, Eye, Edit2, Trash2, X, MessageCircle, Phone } from 'lucide-react';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';

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
    phone2: '',
    phone3: '',
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

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    // 1. Customer Names
    customers.forEach(c => {
      suggestions.push({
        id: `c-name-${c.id}`,
        title: c.businessName,
        subtitle: `${c.contactPerson} · WA: ${c.phone}${c.phone2 ? ` · ${c.phone2}` : ''} · ${c.city}`,
        category: 'Customer',
        value: c.businessName,
      });
    });

    // 2. Customer IDs
    customers.forEach(c => {
      suggestions.push({
        id: `c-id-${c.id}`,
        title: c.customerId,
        subtitle: `${c.businessName} · ${c.customerType}`,
        category: 'Customer ID',
        value: c.customerId,
      });
    });

    return suggestions;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        searchQuery === '' ||
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone2 && c.phone2.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone3 && c.phone3.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
      const foundIdx = initialCustomers.findIndex(c => c.id === editCustomer.id);
      if (foundIdx !== -1) {
        initialCustomers[foundIdx] = { ...initialCustomers[foundIdx], ...formData, updatedAt: new Date().toISOString() };
      }
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
      initialCustomers.unshift(newCust);
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
      phone2: customer.phone2 || '',
      phone3: customer.phone3 || '',
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
    const foundIdx = initialCustomers.findIndex(c => c.id === deleteCustomer.id);
    if (foundIdx !== -1) {
      initialCustomers.splice(foundIdx, 1);
    }
    success('Customer Deleted', `Deleted customer ${deleteCustomer.businessName}.`);
    setDeleteCustomer(null);
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      contactPerson: '',
      phone: '',
      phone2: '',
      phone3: '',
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
      header: 'Contact & WhatsApp',
      minWidth: '180px',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-300 font-semibold">{row.contactPerson}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <a
              href={`https://wa.me/${cleanWhatsAppNumber(row.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-medium transition"
              title="Chat on WhatsApp"
            >
              <MessageCircle size={11} className="text-emerald-400" />
              <span>{row.phone}</span>
            </a>
          </div>
          {(row.phone2 || row.phone3) && (
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[170px]" title={`Phone 2: ${row.phone2 || '-'} | Phone 3: ${row.phone3 || '-'}`}>
              {[row.phone2, row.phone3].filter(Boolean).join(' · ')}
            </p>
          )}
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
            onClick={() => navigate(`/customers/${row.id}`)}
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
          suggestions={searchSuggestions}
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
          onRowClick={(item) => navigate(`/customers/${item.id}`)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyMessage="No customers found."
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedCustomers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b132b] border border-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative text-slate-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set business details, credit terms, and contact phone numbers
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* General Info */}
              <div className="bg-[#111c3a]/80 border border-[#1e2e54] rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Business / Shop Name *</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Enterprise"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Contact Person *</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Bandara"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                      placeholder="info@shop.lk"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">City / Location *</label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                      placeholder="e.g. Colombo 09"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Street Address</label>
                  <input
                    type="text"
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                    placeholder="e.g. 145, Baseline Road"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Phone Numbers Section (Up to 3) */}
              <div className="p-3.5 rounded-xl bg-[#0f2324]/60 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">Contact Numbers</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1">
                    <MessageCircle size={10} /> 1st Phone = WhatsApp Direct
                  </span>
                </div>

                <div>
                  <label className="flex items-center justify-between text-slate-300 mb-1 font-semibold">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <MessageCircle size={12} /> WhatsApp Number * (Required)
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Chat & Invoicing Target</span>
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full bg-[#071518] border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-emerald-300 placeholder-slate-500 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="e.g. +94705787818"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Phone 2 <span className="text-slate-500 text-[10px]">(Landline / Office)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="e.g. 011-255-4321"
                      value={formData.phone2 || ''}
                      onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Phone 3 <span className="text-slate-500 text-[10px]">(Secondary Mobile)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full bg-[#0a1024] border border-[#1e2e54] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="e.g. 077-123-4567"
                      value={formData.phone3 || ''}
                      onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Credit Terms & Limit */}
              <div className="bg-gradient-to-br from-[#1b1539]/90 to-[#10193b]/90 border border-purple-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Default Credit & Trade Terms</span>
                  <span className="text-[10px] text-purple-400">Auto-applies to Invoices & Quotations</span>
                </div>

                {/* Preset Days */}
                <div>
                  <label className="block text-purple-200 mb-1.5 font-semibold">Default Credit Period (Days)</label>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[7, 14, 15, 30, 45, 60, 90].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            creditPeriod: days, 
                            paymentTerms: `Net ${days}` 
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          formData.creditPeriod === days
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40'
                            : 'bg-[#0a1024] text-slate-300 border border-[#2e265c] hover:bg-[#1a1740]'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">Credit Limit (LKR)</label>
                    <input
                      type="number"
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">Payment Terms Label</label>
                    <input
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
                      placeholder="e.g. Net 30, COD"
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Customer Type</label>
                  <select
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                    className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatusValue })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#1e293b] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1e293b] rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
                >
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
