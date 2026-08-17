import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterBar, StatusBadge, ConfirmDialog, useToast } from '../erp';
import type { Column } from '../erp/DataTable';
import { mockSuppliers as initialSuppliers } from '../../data/mockSuppliers';
import type { Supplier, SupplierCreateDto, SupplierTypeValue, SupplierStatusValue } from '../../types/suppliers';
import { Plus, Eye, Edit2, Trash2, X } from 'lucide-react';
import { supplierService } from '../../services/SupplierService';

const SuppliersTab: React.FC = () => {
  const navigate = useNavigate();
  const { success } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchSuppliers = async () => {
      setLoading(true);
      try {
        const data = await supplierService.getAll();
        setSuppliers(data);
      } catch {
        setSuppliers(initialSuppliers);
      } finally {
        setLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

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
    email: '',
    address: '',
    city: '',
    country: 'Sri Lanka',
    supplierType: 'Manufacturer',
    status: 'Active',
    paymentTerms: 'Net 30',
  });

  const typeOptions = [
    { value: 'Manufacturer', label: 'Manufacturer' },
    { value: 'Wholesaler', label: 'Wholesaler' },
    { value: 'Importer', label: 'Importer' },
    { value: 'Local Supplier', label: 'Local Supplier' },
    { value: 'Other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];

    // 1. Supplier Names
    suppliers.forEach(s => {
      suggestions.push({
        id: `s-name-${s.id}`,
        title: s.companyName,
        subtitle: `${s.contactPerson} · ${s.phone} · ${s.city}`,
        category: 'Supplier',
        value: s.companyName,
      });
    });

    // 2. Supplier IDs
    suppliers.forEach(s => {
      suggestions.push({
        id: `s-id-${s.id}`,
        title: s.supplierId,
        subtitle: `${s.companyName} · ${s.supplierType}`,
        category: 'Supplier ID',
        value: s.supplierId,
      });
    });

    return suggestions;
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.supplierId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === '' || s.status === statusFilter;
      const matchesType = typeFilter === '' || s.supplierType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [suppliers, searchQuery, statusFilter, typeFilter]);

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  // Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactPerson || !formData.phone) return;

    if (editSupplier) {
      try {
        const updated = await supplierService.update(editSupplier.id, formData);
        setSuppliers((prev) => prev.map((s) => (s.id === editSupplier.id ? { ...s, ...updated } : s)));
      } catch {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editSupplier.id ? { ...s, ...formData, updatedAt: new Date().toISOString() } : s))
        );
      }
      success('Supplier Updated', `Successfully updated ${formData.companyName}.`);
      setEditSupplier(null);
    } else {
      try {
        const created = await supplierService.create(formData);
        setSuppliers((prev) => [created, ...prev]);
      } catch {
        const newSup: Supplier = {
          id: Math.random().toString(36).substr(2, 9),
          supplierId: `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
          ...formData,
          totalPOs: 0,
          totalPurchaseAmount: 0,
          outstandingPayments: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSuppliers((prev) => [newSup, ...prev]);
      }
      success('Supplier Created', `Added ${formData.companyName} to database.`);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({
      companyName: supplier.companyName,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email || '',
      address: supplier.address,
      city: supplier.city,
      country: supplier.country || 'Sri Lanka',
      supplierType: supplier.supplierType,
      status: supplier.status,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSupplier) return;
    try {
      await supplierService.delete(deleteSupplier.id);
    } catch {}
    setSuppliers((prev) => prev.filter((s) => s.id !== deleteSupplier.id));
    success('Supplier Deleted', `Deleted supplier ${deleteSupplier.companyName}.`);
    setDeleteSupplier(null);
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      country: 'Sri Lanka',
      supplierType: 'Manufacturer',
      status: 'Active',
      paymentTerms: 'Net 30',
    });
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
          <p className="text-[11px] text-slate-500 truncate">{row.address}, {row.city}</p>
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      minWidth: '140px',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-300 font-semibold">{row.contactPerson}</p>
          <p className="text-[11px] text-slate-500 font-mono">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'supplierType',
      header: 'Type',
      sortable: true,
      minWidth: '100px',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700">
          {row.supplierType}
        </span>
      ),
    },
    {
      key: 'totalPOs',
      header: 'Total POs',
      align: 'center',
      minWidth: '70px',
      render: (row) => <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-slate-700">{row.totalPOs}</span>,
    },
    {
      key: 'totalPurchaseAmount',
      header: 'Total Purchases',
      sortable: true,
      align: 'right',
      minWidth: '130px',
      render: (row) => <span className="font-bold text-slate-100 font-mono">{formatCurrency(row.totalPurchaseAmount)}</span>,
    },
    {
      key: 'outstandingPayments',
      header: 'Outstanding Pay',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => (
        <span className={`font-mono font-bold ${row.outstandingPayments > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
          {formatCurrency(row.outstandingPayments)}
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
            onClick={() => navigate(`/users/suppliers/${row.id}`)}
            className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-800"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
            title="Edit Supplier"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => setDeleteSupplier(row)}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800"
            title="Delete Supplier"
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
          searchPlaceholder="Search supplier, ID, city, phone..."
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
              placeholder: 'All Supplier Types',
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
                setEditSupplier(null);
                resetForm();
                setShowAddModal(true);
              }}
              className="erp-btn erp-btn-primary erp-btn-sm gap-1.5 bg-purple-600 hover:bg-purple-700"
            >
              <Plus size={14} /> Add Supplier
            </button>
          }
        />

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={paginatedSuppliers}
          loading={loading}
          keyExtractor={(item) => item.id}
          onRowClick={(item) => navigate(`/users/suppliers/${item.id}`)}
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

      {/* Add / Edit Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative erp-card w-full max-w-lg animate-slideIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                {editSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Company Name *</label>
                <input
                  required
                  type="text"
                  className="erp-input"
                  placeholder="e.g. Petrotec Industries Ltd"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Contact Person *</label>
                  <input
                    required
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Shantha Wijesinghe"
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
                    placeholder="011-567-8901"
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
                    placeholder="orders@petrotec.lk"
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
                    placeholder="e.g. Colombo 14"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Address</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="e.g. 78, Grandpass Road"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Supplier Type</label>
                  <select
                    className="erp-select w-full"
                    value={formData.supplierType}
                    onChange={(e) => setFormData({ ...formData, supplierType: e.target.value as SupplierTypeValue })}
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
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as SupplierStatusValue })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Terms</label>
                <input
                  type="text"
                  className="erp-input"
                  placeholder="e.g. Net 30, Cash on Delivery"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="erp-btn erp-btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="erp-btn erp-btn-primary bg-purple-600 hover:bg-purple-700">
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
