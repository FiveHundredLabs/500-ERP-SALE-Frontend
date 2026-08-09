import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge } from '../components/erp';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { Supplier } from '../types/suppliers';
import {
  Truck,
  Phone,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Tag,
} from 'lucide-react';

const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const supplier: Supplier | undefined = mockSuppliers.find((s) => s.id === id || s.supplierId === id) || mockSuppliers[0];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const supplierPOs = mockPurchaseOrders.filter(
    (p) => p.supplierId === supplier?.supplierId || p.supplierName === supplier?.companyName
  );

  if (!supplier) {
    return (
      <AppLayout headerTitle="Supplier Profile">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Supplier not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      headerIcon={<Truck size={18} />}
      headerTitle="Supplier Profile"
      headerSubtitle={supplier.supplierId}
      headerRight={
        <button
          onClick={() => navigate('/users/suppliers')}
          className="erp-btn erp-btn-outline erp-btn-sm gap-1.5 text-xs"
        >
          <ArrowLeft size={13} /> Back to Suppliers
        </button>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={supplier.companyName}
          description={`${supplier.supplierType} • ${supplier.city}, ${supplier.country}`}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Suppliers', path: '/users/suppliers' },
            { label: supplier.companyName },
          ]}
          actions={
            <button
              onClick={() => navigate('/purchase-orders')}
              className="erp-btn erp-btn-primary erp-btn-sm gap-1.5 bg-purple-600 hover:bg-purple-700"
            >
              <ShoppingCart size={14} /> View All POs
            </button>
          }
        />

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total POs</p>
              <p className="text-2xl font-bold text-slate-100">{supplier.totalPOs}</p>
              <p className="text-xs text-slate-500">Procurement orders</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Spend</p>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(supplier.totalPurchaseAmount)}</p>
              <p className="text-xs text-slate-500">Lifetime procurement value</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Payment Terms</p>
              <p className="text-xl font-bold text-slate-100">{supplier.paymentTerms}</p>
              <p className="text-xs text-slate-500">Credit terms agreement</p>
            </div>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Truck size={16} className="text-purple-400" /> Company Info
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier ID:</span>
                <span className="font-mono text-purple-400 font-bold">{supplier.supplierId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={supplier.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier Type:</span>
                <span className="text-slate-300">{supplier.supplierType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Info:</span>
                <span className="font-mono text-slate-300">{supplier.bankDetails || 'Standard Wire Transfer'}</span>
              </div>
            </div>
          </div>

          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Phone size={16} className="text-emerald-400" /> Contact Info
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contact Person:</span>
                <span className="font-semibold text-slate-200">{supplier.contactPerson}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-300">{supplier.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-300">{supplier.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location:</span>
                <span className="text-slate-300">{supplier.city}, {supplier.country}</span>
              </div>
            </div>
          </div>

          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Tag size={16} className="text-cyan-400" /> Categories Supplied
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(supplier.categories || ['General Hardware', 'Fasteners']).map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="erp-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Procurement History (Purchase Orders)</h3>
            <span className="text-xs text-slate-500">{supplierPOs.length} purchase orders</span>
          </div>

          <div className="erp-table-container border-0 rounded-none">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Ref Order</th>
                  <th>PO Date</th>
                  <th>Expected Date</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {supplierPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                      No purchase orders issued to this supplier yet.
                    </td>
                  </tr>
                ) : (
                  supplierPOs.map((po) => (
                    <tr
                      key={po.id}
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="cursor-pointer hover:bg-slate-800/60"
                    >
                      <td className="font-mono text-purple-400 font-semibold text-xs">{po.poNumber}</td>
                      <td className="font-mono text-xs text-slate-400">{po.referenceOrderNum || 'Direct PO'}</td>
                      <td className="text-slate-300 text-xs">{po.poDate}</td>
                      <td className="text-slate-400 text-xs">{po.expectedDate}</td>
                      <td className="text-right font-semibold text-slate-200 text-xs">{po.numberOfItems}</td>
                      <td className="text-right font-semibold text-slate-100">{formatCurrency(po.grandTotal)}</td>
                      <td><StatusBadge status={po.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SupplierDetails;
