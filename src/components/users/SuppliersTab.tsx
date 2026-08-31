import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import type { Supplier, SupplierCreateDto } from '../../types/suppliers';
import { 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  MessageCircle, 
  Phone, 
  MoreVertical, 
  Truck, 
  Building2, 
  User, 
  MapPin, 
  Mail, 
  Check 
} from 'lucide-react';
import { supplierService } from '../../services/SupplierService';
import { cleanWhatsAppNumber } from '../../utils/whatsapp';

const SuppliersTab: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Floating Action Menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getAll();
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Table state
  const [sortColumn, setSortColumn] = useState('companyName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState<SupplierCreateDto>({
    companyName: '',
    contactPerson: '',
    phone: '',
    phone2: '',
    phone3: '',
    email: '',
    address: '',
    city: '',
    country: 'Sri Lanka',
    status: 'Active',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    suppliers.forEach(s => {
      const name = s.companyName || (s as any).name || 'Supplier';
      suggestions.push({
        id: `s-name-${s.id || (s as any)._id}`,
        title: name,
        subtitle: `${s.contactPerson || 'Supplier'} · WA: ${s.phone || ''} · ${s.city || s.address || ''}`,
        category: 'Supplier',
        value: name,
      });

      const code = s.supplierId || (s as any).supplier_code || s.id || (s as any)._id;
      if (code) {
        suggestions.push({
          id: `s-id-${s.id || (s as any)._id}`,
          title: code,
          subtitle: `${name}`,
          category: 'Supplier ID',
          value: code,
        });
      }
    });

    return suggestions;
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        s.companyName.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.supplierId.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.phone2 && s.phone2.toLowerCase().includes(q)) ||
        (s.phone3 && s.phone3.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q));

      const matchesStatus = statusFilter === '' || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      const valA = (a as any)[sortColumn];
      const valB = (b as any)[sortColumn];
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSuppliers, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSuppliers.slice(start, start + itemsPerPage);
  }, [sortedSuppliers, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (val: number) => `LKR ${Math.round(val).toLocaleString('en-US')}/=`;

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company / Supplier Name is required';
    if (!formData.phone.trim() || formData.phone.length < 8) errs.phone = 'Valid primary contact phone is required';
    if (!formData.address.trim()) errs.address = 'Address is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Extract city if not provided
    let extractedCity = formData.city;
    if (!extractedCity && formData.address.includes(',')) {
      extractedCity = formData.address.split(',').pop()?.trim() || '';
    }

    const payload = {
      ...formData,
      city: extractedCity,
    };

    if (editSupplier) {
      try {
        const updated = await supplierService.update(editSupplier.id, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editSupplier.id ? { ...s, ...updated } : s)));
        success('Supplier Updated', `Successfully updated ${formData.companyName}.`);
      } catch (err: any) {
        toastError('Update Failed', err?.message || 'Failed to update supplier.');
      }
    } else {
      try {
        const created = await supplierService.create(payload);
        setSuppliers((prev) => [created, ...prev]);
        success('Supplier Created', `Added ${formData.companyName} to database.`);
      } catch (err: any) {
        toastError('Create Failed', err?.message || 'Failed to create supplier.');
      }
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone,
      phone2: supplier.phone2 || '',
      phone3: supplier.phone3 || '',
      email: supplier.email || '',
      address: supplier.address,
      city: supplier.city || '',
      country: supplier.country || 'Sri Lanka',
      status: supplier.status,
      notes: supplier.notes || '',
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSupplier) return;
    try {
      await supplierService.delete(deleteSupplier.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteSupplier.id));
      success('Supplier Deleted', `Deleted supplier ${deleteSupplier.companyName}.`);
    } catch {
      toastError('Delete Failed', 'Failed to delete supplier.');
    }
    setDeleteSupplier(null);
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      phone: '',
      phone2: '',
      phone3: '',
      email: '',
      address: '',
      city: '',
      country: 'Sri Lanka',
      status: 'Active',
      notes: '',
    });
    setFormErrors({});
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'supplierId',
      header: 'Supplier ID',
      sortable: true,
      minWidth: '110px',
      render: (row) => <span className="font-mono text-purple-400 font-bold text-xs">{row.supplierId}</span>,
    },
    {
      key: 'companyName',
      header: 'Supplier Company',
      sortable: true,
      minWidth: '190px',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-200 text-sm leading-tight truncate max-w-[200px]">{row.companyName}</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{row.address}{row.city ? `, ${row.city}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact & WhatsApp',
      minWidth: '180px',
      render: (row) => (
        <div>
          {row.contactPerson ? (
            <p className="text-xs text-slate-300 font-semibold">{row.contactPerson}</p>
          ) : (
            <p className="text-xs text-slate-500 italic">No contact person</p>
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
          {(row.phone2 || row.phone3) && (
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[170px]">
              {[row.phone2, row.phone3].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'totalPOs',
      header: 'Total POs',
      align: 'center',
      minWidth: '75px',
      render: (row) => <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">{row.totalPOs}</span>,
    },
    {
      key: 'totalPurchaseAmount',
      header: 'Total Purchases',
      sortable: true,
      align: 'right',
      minWidth: '130px',
      render: (row) => <span className="font-bold text-slate-100 font-mono text-xs">{formatCurrency(row.totalPurchaseAmount)}</span>,
    },
    {
      key: 'outstandingPayments',
      header: 'Outstanding Pay',
      sortable: true,
      align: 'right',
      minWidth: '125px',
      render: (row) => (
        <span className={`font-mono font-bold text-xs ${row.outstandingPayments > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
          {formatCurrency(row.outstandingPayments)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      minWidth: '85px',
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
              title="Supplier actions"
            >
              <MoreVertical size={16} />
            </button>

            {/* Three-Dot Floating Menu */}
            {isMenuOpen && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-8 z-50 w-44 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl py-1 text-xs text-slate-200 divide-y divide-[#334155]/60 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      navigate(`/suppliers/${row.id}`);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 transition text-left"
                  >
                    <Eye size={14} className="text-purple-400" />
                    <span>View & Settle</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      handleOpenEdit(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 transition text-left"
                  >
                    <Edit2 size={14} className="text-blue-400" />
                    <span>Edit Supplier</span>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setActiveMenuId(null);
                      setDeleteSupplier(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition text-left"
                  >
                    <Trash2 size={14} className="text-red-400" />
                    <span>Delete Supplier</span>
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
      <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl mb-6 p-0 overflow-hidden shadow-lg">
        <FilterBar
          searchPlaceholder="Search supplier, ID, city, phone..."
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
              options: statusOptions,
              placeholder: 'All Statuses',
              width: 'w-36',
            },
          ]}
          hasActiveFilters={searchQuery !== '' || statusFilter !== ''}
          onClearFilters={() => {
            setSearchQuery('');
            setStatusFilter('');
            setCurrentPage(1);
          }}
          rightContent={
            <button
              onClick={() => {
                setEditSupplier(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 hover:shadow-blue-600/30"
            >
              <Plus size={15} /> Add Supplier
            </button>
          }
        />

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedSuppliers}
          loading={loading}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/suppliers/${item.id}`)}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          emptyMessage="No suppliers found."
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedSuppliers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Supplier Modal (Styled like Customer Create Modal) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative text-slate-100 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-md">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editSupplier ? 'Edit Supplier Profile' : 'Add New Supplier'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {editSupplier ? `Update information for ${editSupplier.companyName}` : 'Register a new vendor or wholesale supplier'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Row 1: Company Name & Contact Person (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Company / Supplier Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tokyo Bearings & Lubricants"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                  {formErrors.companyName && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Contact Person <span className="text-gray-500 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Nimal Fernando"
                      value={formData.contactPerson || ''}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Phone Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Primary / WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                    <input
                      type="text"
                      required
                      placeholder="+94771234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-emerald-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  {formErrors.phone && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Phone 2 <span className="text-gray-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94112345678"
                    value={formData.phone2 || ''}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Phone 3 <span className="text-gray-500 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94712345678"
                    value={formData.phone3 || ''}
                    onChange={(e) => setFormData({ ...formData, phone3: e.target.value })}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>

              {/* Row 3: Address (with City note) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Supplier Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 112, Kandy Road, Kelaniya"
                    value={formData.address}
                    onChange={(e) => {
                      const addr = e.target.value;
                      let city = formData.city;
                      if (addr.includes(',')) {
                        city = addr.split(',').pop()?.trim() || '';
                      }
                      setFormData({ ...formData, address: addr, city });
                    }}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Tip: End with city name after comma (e.g. <em>Main Street, Kelaniya</em>) for automated city categorization.
                </p>
                {formErrors.address && (
                  <p className="text-red-400 text-xs mt-1">{formErrors.address}</p>
                )}
              </div>

              {/* Row 4: Email & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-gray-500 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="e.g. supplier@domain.lk"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Supplier Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Notes & Remarks <span className="text-gray-500 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes about products supplied, bank account numbers, or terms..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#1e293b] border border-[#334155] rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#334155] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-[#1e293b] rounded-xl transition border border-[#334155]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25 flex items-center gap-1.5"
                >
                  <Check size={15} />
                  {editSupplier ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteSupplier}
        title="Delete Supplier"
        message={`Are you sure you want to delete ${deleteSupplier?.companyName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteSupplier(null)}
      />
    </div>
  );
};

export default SuppliersTab;
