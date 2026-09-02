import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, ActionMenu, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import { invoiceService } from '../../services/InvoiceService';
import { salesOfficerService } from '../../services/SalesOfficerService';
import type { Customer, CustomerCreateDto, CustomerStatusValue } from '../../types/customers';
import type { SalesOfficer } from '../../types/salesOfficer';
import { extractCityFromAddress } from '../../types/customers';
import { getInvoiceCalculatedStatus } from '../../types/invoice';
import { 
  Plus, 
  Eye,
  Edit2,
  Trash2, 
  X, 
  MessageCircle, 
  Phone, 
  UserCheck, 
  MapPin, 
  ChevronDown,
  Upload
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';
import CustomerPdfImportModal from './CustomerPdfImportModal';

const getCustomerSalesRepName = (customer: Customer): string => {
  if (customer.salesRepName) return customer.salesRepName;

  // Prisma returns null for an unassigned relation. Older Mongo-backed data may
  // still expose the representative as a string or with a `name` property.
  const salesRep = customer.salesRep as
    | { fullName?: string; name?: string }
    | string
    | null
    | undefined;

  if (!salesRep) return '';
  return typeof salesRep === 'string'
    ? salesRep
    : salesRep.fullName || salesRep.name || '';
};

const CustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficer[]>([]);

  const fetchCustomers = async () => {
    try {
      const [custs, officers, allInvoices] = await Promise.all([
        invoiceService.getAllCustomers(),
        salesOfficerService.getAll(),
        invoiceService.getAll().catch(() => []),
      ]);

      // Calculate live outstanding balance per customer from real invoices
      const invoiceCustomerMap = new Map<string, { totalInvoiced: number; totalPaid: number; outstandingBalance: number }>();
      (allInvoices || []).forEach(inv => {
        const custId = (inv.customer as any)?.id || inv.customerId;
        const custCode = (inv.customer as any)?.customerCode;
        const custName = (inv.customer as any)?.shopName || (inv.customer as any)?.fullName;

        const calc = getInvoiceCalculatedStatus(inv);
        const rem = calc.remainingAmount;
        const paid = calc.paidAmount;
        const total = inv.totalAmount || 0;

        const recordBalance = (key?: string | null) => {
          if (!key) return;
          const k = key.trim().toLowerCase();
          const prev = invoiceCustomerMap.get(k) || { totalInvoiced: 0, totalPaid: 0, outstandingBalance: 0 };
          invoiceCustomerMap.set(k, {
            totalInvoiced: prev.totalInvoiced + total,
            totalPaid: prev.totalPaid + paid,
            outstandingBalance: prev.outstandingBalance + rem,
          });
        };

        if (custId) recordBalance(custId);
        if (custCode) recordBalance(custCode);
        if (custName) recordBalance(custName);
      });

      const enriched = (custs as any || []).map((c: any) => {
        const byId = c.id ? invoiceCustomerMap.get(c.id.toLowerCase()) : null;
        const byCode = c.customerCode ? invoiceCustomerMap.get(c.customerCode.toLowerCase()) : null;
        const byName = c.shopName ? invoiceCustomerMap.get(c.shopName.toLowerCase()) : null;
        const stats = byId || byCode || byName;

        const outstanding = stats ? stats.outstandingBalance : (c.outstandingBalance || 0);
        const totalInvoiced = stats ? stats.totalInvoiced : (c.totalInvoiced || 0);
        const totalPaid = stats ? stats.totalPaid : (c.totalPaid || 0);

        return {
          ...c,
          outstandingBalance: outstanding,
          totalInvoiced,
          totalPaid,
        };
      });

      setCustomers(enriched);
      setSalesOfficers(officers || []);
    } catch {
      setCustomers([]);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');

  // Table state
  const [sortColumn, setSortColumn] = useState('shopName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);

  // Form state
  const [formData, setFormData] = useState<CustomerCreateDto>({
    shopName: '',
    contactPerson: '',
    phone: '',
    phone2: '',
    phone3: '',
    address: '',
    creditLimit: 1000000,
    creditPeriod: 30,
    salesRepId: null,
    salesRepName: '',
    status: 'Active',
    notes: '',
  });

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const salesRepOptions = useMemo(() => {
    return salesOfficers.map(s => ({ value: s.fullName, label: s.fullName }));
  }, [salesOfficers]);

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    // 1. Customer Names
    customers.forEach(c => {
      const name = c.shopName || c.fullName || 'Customer';
      const rep = getCustomerSalesRepName(c);
      suggestions.push({
        id: `c-name-${c.id}`,
        title: name,
        subtitle: `${c.contactPerson ? `${c.contactPerson} · ` : ''}WA: ${c.phone || ''} · ${c.city || extractCityFromAddress(c.address || '')} ${rep ? `· Rep: ${rep}` : ''}`,
        category: 'Shop / Customer',
        value: name,
      });
    });

    // 2. Customer IDs
    customers.forEach(c => {
      const code = c.customerCode || c.id || '';
      if (code) {
        suggestions.push({
          id: `c-id-${c.id}`,
          title: code,
          subtitle: `${c.shopName || c.fullName || ''} · ${c.city || extractCityFromAddress(c.address || '')}`,
          category: 'Customer ID',
          value: code,
        });
      }
    });

    return suggestions;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = (c.shopName || '').toLowerCase();
      const contact = (c.contactPerson || '').toLowerCase();
      const rep = getCustomerSalesRepName(c).toLowerCase();
      const city = (c.city || extractCityFromAddress(c.address) || '').toLowerCase();
      const addr = (c.address || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        query === '' ||
        name.includes(query) ||
        contact.includes(query) ||
        c.customerCode.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.phone2 && c.phone2.toLowerCase().includes(query)) ||
        (c.phone3 && c.phone3.toLowerCase().includes(query)) ||
        rep.includes(query) ||
        city.includes(query) ||
        addr.includes(query);

      const matchesStatus = statusFilter === '' || c.status === statusFilter;
      const matchesSalesRep = salesRepFilter === '' || rep.includes(salesRepFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesSalesRep;
    });
  }, [customers, searchQuery, statusFilter, salesRepFilter]);

  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let valA = (a as any)[sortColumn];
      let valB = (b as any)[sortColumn];
      if (sortColumn === 'shopName') {
        valA = a.shopName || '';
        valB = b.shopName || '';
      } else if (sortColumn === 'outstandingBalance') {
        valA = Number(a.outstandingBalance || 0);
        valB = Number(b.outstandingBalance || 0);
      }
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
    `LKR ${Math.round(val || 0).toLocaleString()}/=`;

  // Submit Handler (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName || !formData.phone || !formData.address) {
      return;
    }

    const city = extractCityFromAddress(formData.address);

    if (editCustomer) {
      // Edit
      try {
        await invoiceService.updateCustomer(editCustomer.id, {
          ...formData,
          shopName: formData.shopName,
          fullName: formData.shopName,
          city,
        } as any);
        success('Customer Updated', `Successfully updated ${formData.shopName}.`);
        fetchCustomers();
      } catch (err) {
        console.error(err);
      }
      setEditCustomer(null);
    } else {
      // Add
      try {
        await invoiceService.createCustomer({
          ...formData,
          shopName: formData.shopName,
          fullName: formData.shopName,
          city,
        } as any);
        success('Customer Created', `Added ${formData.shopName} to database.`);
        fetchCustomers();
      } catch (err) {
        console.error(err);
      }
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditCustomer(customer);
    const rep = getCustomerSalesRepName(customer);
    setFormData({
      shopName: customer.shopName || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone,
      phone2: customer.phone2 || '',
      phone3: customer.phone3 || '',
      address: customer.address,
      creditLimit: customer.creditLimit || 1000000,
      creditPeriod: customer.creditPeriod ?? 30,
      salesRepId: customer.salesRepId || customer.salesRep?.id || null,
      salesRepName: rep,
      status: customer.status,
      notes: customer.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/customers/${deleteCustomer.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      success('Customer Deleted', `Deleted customer ${deleteCustomer.shopName}.`);
      fetchCustomers();
    } catch {
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomer.id));
    }
    setDeleteCustomer(null);
  };

  const resetForm = () => {
    setFormData({
      shopName: '',
      contactPerson: '',
      phone: '',
      phone2: '',
      phone3: '',
      address: '',
      creditLimit: 1000000,
      salesRepId: null,
      salesRepName: '',
      status: 'Active',
      notes: '',
    });
  };

  // Columns: Removed Type, Removed Orders, Added Sales Rep, Compact Three-Dot Menu
  const columns: Column<Customer>[] = [
    {
      key: 'customerCode',
      header: 'Customer ID',
      sortable: true,
      minWidth: '100px',
      render: (row) => <span className="font-mono text-cyan-400 font-bold text-xs">{row.customerCode}</span>,
    },
    {
      key: 'shopName',
      header: 'Shop Name & Address',
      sortable: true,
      minWidth: '220px',
      render: (row) => {
        const city = row.city || extractCityFromAddress(row.address);
        return (
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-xs leading-tight truncate">{row.shopName}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 truncate">
              <MapPin size={10} className="text-slate-500 shrink-0" />
              <span className="truncate">{row.address}</span>
              {city && (
                <span className="shrink-0 px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-medium">
                  {city}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'contactPerson',
      header: 'Contact & WhatsApp',
      minWidth: '170px',
      render: (row) => (
        <div className="min-w-0">
          {row.contactPerson ? (
            <p className="text-xs text-slate-200 font-medium truncate">{row.contactPerson}</p>
          ) : (
            <p className="text-[11px] text-slate-500 italic">No contact person</p>
          )}
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
        </div>
      ),
    },
    {
      key: 'salesRep',
      header: 'Sales Rep',
      sortable: true,
      minWidth: '130px',
      render: (row) => {
        const rep = getCustomerSalesRepName(row);
        return rep ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-medium truncate max-w-[130px]">
            <UserCheck size={11} className="text-blue-400 shrink-0" />
            <span className="truncate">{rep}</span>
          </span>
        ) : (
          <span className="text-slate-500 text-xs font-mono">—</span>
        );
      },
    },
    {
      key: 'outstandingBalance',
      header: 'outstanding',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => (
        <div className="text-right">
          <span className={`font-mono font-bold text-xs ${row.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {formatCurrency(row.outstandingBalance || 0)}
          </span>
          {row.outstandingBalance > 0 && (
            <p className="text-[10px] text-amber-500/80 font-medium">Pending</p>
          )}
        </div>
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
      header: '',
      align: 'right',
      minWidth: '50px',
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            title="Customer Actions"
            items={[
              {
                items: [
                  {
                    label: 'View Details',
                    icon: <Eye size={14} />,
                    variant: 'blue',
                    onClick: () => navigate(`/customers/${row.id}`),
                  },
                  {
                    label: 'Edit Customer',
                    icon: <Edit2 size={14} />,
                    variant: 'purple',
                    onClick: () => handleOpenEdit(row),
                  },
                ],
              },
              {
                items: [
                  {
                    label: 'Delete Customer',
                    icon: <Trash2 size={14} />,
                    variant: 'danger',
                    onClick: () => setDeleteCustomer(row),
                  },
                ],
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header bar within tab */}
      <div className="erp-card mb-6 p-0 overflow-hidden">
        <FilterBar
          searchPlaceholder="Search by shop name, contact, phone, city, rep..."
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          suggestions={searchSuggestions}
          selects={[
            {
              value: salesRepFilter,
              onChange: (val) => {
                setSalesRepFilter(val);
                setCurrentPage(1);
              },
              options: salesRepOptions,
              placeholder: 'All Sales Reps',
              width: 'w-44',
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
          hasActiveFilters={searchQuery !== '' || statusFilter !== '' || salesRepFilter !== ''}
          onClearFilters={() => {
            setSearchQuery('');
            setStatusFilter('');
            setSalesRepFilter('');
            setCurrentPage(1);
          }}
          rightContent={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-600/20 dark:hover:bg-purple-600/30 dark:text-purple-300 dark:border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                title="Import Customers from PDF"
              >
                <Upload size={14} /> Import Customers
              </button>
              <button
                onClick={() => {
                  setEditCustomer(null);
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 hover:shadow-blue-600/30"
              >
                <Plus size={15} /> Add Customer
              </button>
            </div>
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
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-[#1e293b] rounded-2xl w-full max-w-4xl p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1e293b]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {editCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set shop details, contact numbers, and assigned sales representative
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#1e293b] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Shop & Business Info */}
                <div className="bg-slate-50 dark:bg-[#111c3a]/70 border border-slate-200 dark:border-[#1e2e54] rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-[#1e2e54] text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wider">
                    <span>Shop & Location Details</span>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs">
                      Shop Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-white dark:bg-[#0a1024] border border-slate-300 dark:border-[#233560] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Enterprise"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs">
                      Contact Person <span className="text-slate-500 font-normal text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-[#0a1024] border border-slate-300 dark:border-[#233560] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Bandara"
                      value={formData.contactPerson || ''}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                        Address <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        City extracted after comma
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <MapPin size={14} />
                      </div>
                      <input
                        required
                        type="text"
                        className="w-full bg-white dark:bg-[#0a1024] border border-slate-300 dark:border-[#233560] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                        placeholder="e.g. 145, Baseline Road, Colombo 09"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Contact Numbers & Credit Terms */}
                <div className="space-y-4">
                  {/* WhatsApp & Phones Box */}
                  <div className="bg-emerald-50/60 dark:bg-[#0f2324]/60 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-500/20">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Phone size={13} className="text-emerald-600 dark:text-emerald-400" /> Contact Numbers
                      </span>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                        <MessageCircle size={10} /> 1st = WhatsApp Direct
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs">
                        WhatsApp Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        className="w-full bg-white dark:bg-[#071518] border border-emerald-300 dark:border-emerald-500/50 rounded-xl px-3.5 py-2 text-emerald-800 dark:text-emerald-300 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="e.g. +94705787818"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs">
                          Phone 2 <span className="text-slate-500 text-[10px]">(Office)</span>
                        </label>
                        <input
                          type="tel"
                          className="w-full bg-white dark:bg-[#0a1024] border border-slate-300 dark:border-[#1e2e54] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="011-255-4321"
                          value={formData.phone2 || ''}
                          onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold text-xs">
                          Phone 3 <span className="text-slate-500 text-[10px]">(Mobile)</span>
                        </label>
                        <input
                          type="tel"
                          className="w-full bg-white dark:bg-[#0a1024] border border-slate-300 dark:border-[#1e2e54] rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder="077-123-4567"
                          value={formData.phone3 || ''}
                          onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credit Terms & Sales Officer */}
                  <div className="bg-purple-50/60 dark:bg-gradient-to-br dark:from-[#1b1539]/90 dark:to-[#10193b]/90 border border-purple-200 dark:border-purple-500/30 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-purple-900 dark:text-purple-200 mb-1 font-semibold text-xs">
                          Credit Period ({formData.creditPeriod || 30}d)
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {[15, 30, 45, 60, 90].map((days) => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => setFormData({ ...formData, creditPeriod: days })}
                              className={`py-1.5 rounded-lg text-[11px] font-bold border transition ${
                                formData.creditPeriod === days
                                  ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                                  : 'bg-white dark:bg-[#0a1024] border-purple-200 dark:border-[#2e265c] text-slate-700 dark:text-slate-300 hover:border-purple-400'
                              }`}
                            >
                              {days}d
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-purple-900 dark:text-purple-200 mb-1 font-semibold text-xs">
                          Account Status
                        </label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none bg-white dark:bg-[#0a1024] border border-purple-200 dark:border-[#2e265c] rounded-xl pl-3 pr-8 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium cursor-pointer"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatusValue })}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-500 dark:text-purple-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-purple-900 dark:text-purple-200 mb-1 font-semibold text-xs">
                        Sales Representative
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-500 dark:text-purple-400">
                          <UserCheck size={14} />
                        </div>
                        <select
                          className="w-full appearance-none bg-white dark:bg-[#0a1024] border border-purple-200 dark:border-[#2e265c] rounded-xl pl-9 pr-8 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium cursor-pointer"
                          value={formData.salesRepId || ''}
                          onChange={(e) => {
                            const repId = e.target.value;
                            const rep = salesOfficers.find(so => so.id === repId);
                            setFormData({ 
                              ...formData, 
                              salesRepId: repId || null,
                              salesRepName: rep?.fullName || ''
                            });
                          }}
                        >
                          <option value="">Unassigned</option>
                          {salesOfficers.map((so: SalesOfficer) => (
                            <option key={so.id} value={so.id}>
                              {so.fullName} {so.officerId ? `(${so.officerId})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-500 dark:text-purple-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#1e293b] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#1e293b] rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 active:scale-98"
                >
                  {editCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Customer Import Modal */}
      <CustomerPdfImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(count) => {
          setShowImportModal(false);
          success('Import Successful', `Successfully imported ${count} customers from PDF.`);
          fetchCustomers();
        }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteCustomer}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteCustomer?.shopName}? This action cannot be undone.`}
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
