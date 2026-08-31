import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import { invoiceService } from '../../services/InvoiceService';
import { salesOfficerService } from '../../services/SalesOfficerService';
import type { Customer, CustomerCreateDto, CustomerStatusValue } from '../../types/customers';
import type { SalesOfficer } from '../../types/salesOfficer';
import { extractCityFromAddress } from '../../types/customers';
import { 
  Plus, 
  Eye,
  Edit2,
  Trash2, 
  X, 
  MessageCircle, 
  Phone, 
  MoreVertical, 
  UserCheck, 
  MapPin
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';

const CustomersTab: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesOfficers, setSalesOfficers] = useState<SalesOfficer[]>([]);

  const fetchCustomers = async () => {
    try {
      const [custs, officers] = await Promise.all([
        invoiceService.getAllCustomers(),
        salesOfficerService.getAll(),
      ]);
      setCustomers(custs as any || []);
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

  // Active three-dot menu ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close three-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
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
    return [
      { value: '', label: 'All Sales Reps' },
      ...salesOfficers.map(s => ({ value: s.fullName, label: s.fullName })),
    ];
  }, [salesOfficers]);

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    // 1. Customer Names
    customers.forEach(c => {
      const name = c.shopName || c.businessName || (c as any).fullName || 'Customer';
      const rep = c.salesRepName || c.salesRep?.fullName || '';
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
          subtitle: `${c.shopName || c.businessName || (c as any).fullName || ''} · ${c.city || extractCityFromAddress(c.address || '')}`,
          category: 'Customer ID',
          value: code,
        });
      }
    });

    return suggestions;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const name = (c.shopName || c.businessName || '').toLowerCase();
      const contact = (c.contactPerson || '').toLowerCase();
      const rep = (c.salesRepName || c.salesRep?.fullName || '').toLowerCase();
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
        valA = a.shopName || a.businessName || '';
        valB = b.shopName || b.businessName || '';
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
    const rep = customer.salesRepName || customer.salesRep?.fullName || '';
    setFormData({
      shopName: customer.shopName || customer.businessName || '',
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
    setActiveMenuId(null);
    setShowAddModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/customers/${deleteCustomer.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      success('Customer Deleted', `Deleted customer ${deleteCustomer.shopName || deleteCustomer.businessName}.`);
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
            <p className="font-bold text-slate-100 text-xs leading-tight truncate">{row.shopName || row.businessName}</p>
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
        const rep = row.salesRepName || row.salesRep?.fullName;
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
      key: 'creditLimit',
      header: 'Credit Limit',
      sortable: true,
      align: 'right',
      minWidth: '110px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-300 font-medium">
          {formatCurrency(row.creditLimit || 0)}
        </span>
      ),
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
      render: (row) => {
        const isMenuOpen = activeMenuId === row.id;

        return (
          <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveMenuId(isMenuOpen ? null : row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Customer Actions"
              aria-label="Actions menu"
            >
              <MoreVertical size={16} />
            </button>

            {/* Three-Dot Floating Dropdown Menu */}
            {isMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-8 z-50 w-44 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl py-1 text-xs text-slate-200 divide-y divide-[#334155]/60 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      navigate(`/customers/${row.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 transition text-left"
                  >
                    <Eye size={14} className="text-blue-400" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(row)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 transition text-left"
                  >
                    <Edit2 size={14} className="text-purple-400" />
                    <span>Edit Customer</span>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      setDeleteCustomer(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition text-left"
                  >
                    <Trash2 size={14} className="text-red-400" />
                    <span>Delete Customer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      },
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
                    Set shop details, contact person, address, and assigned sales representative
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
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Shop Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Enterprise"
                      value={formData.shopName}
                      onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">
                      Contact Person <span className="text-slate-500 font-normal text-[11px]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-medium"
                      placeholder="e.g. Nirosha Bandara"
                      value={formData.contactPerson || ''}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">
                      Address <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-400">
                      City automatically extracted after comma (e.g. "Main Street, Colombo")
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <MapPin size={13} />
                    </div>
                    <input
                      required
                      type="text"
                      className="w-full bg-[#0a1024] border border-[#233560] rounded-xl pl-8.5 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs"
                      placeholder="e.g. 145, Baseline Road, Colombo 09"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
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
                      <MessageCircle size={12} /> WhatsApp Number <span className="text-rose-400">*</span>
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

              {/* Credit Limit & Credit Period & Sales Representative */}
              <div className="bg-gradient-to-br from-[#1b1539]/90 to-[#10193b]/90 border border-purple-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Credit Terms & Sales Officer Assignment</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">Credit Limit (LKR)</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2 text-white font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">
                      Credit Period <span className="text-purple-400 font-normal text-[11px]">({formData.creditPeriod || 30} Days)</span>
                    </label>
                    <div className="grid grid-cols-6 gap-1">
                      {[15, 30, 45, 60, 90].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setFormData({ ...formData, creditPeriod: days })}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                            formData.creditPeriod === days
                              ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                              : 'bg-[#0a1024] border-[#2e265c] text-slate-300 hover:border-purple-500/50 hover:bg-purple-900/20'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cust"
                          title="Custom Days"
                          className={`w-full py-1.5 px-1 bg-[#0a1024] border rounded-lg text-xs font-mono text-center text-white focus:outline-none ${
                            ![15, 30, 45, 60, 90].includes(Number(formData.creditPeriod))
                              ? 'border-purple-400 bg-purple-950/40 text-purple-200 font-bold'
                              : 'border-[#2e265c] placeholder:text-slate-500'
                          }`}
                          value={![15, 30, 45, 60, 90].includes(Number(formData.creditPeriod)) ? (formData.creditPeriod || '') : ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setFormData({ ...formData, creditPeriod: isNaN(val) ? 0 : val });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">Sales Representative</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                        <UserCheck size={13} />
                      </div>
                      <select
                        className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl pl-8.5 pr-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
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
                            {so.fullName} ({so.assignedTerritory || so.assignedArea || 'Region'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-purple-200 mb-1 font-semibold">Account Status</label>
                    <select
                      className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-medium"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatusValue })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
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
        message={`Are you sure you want to delete ${deleteCustomer?.shopName || deleteCustomer?.businessName}? This action cannot be undone.`}
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
