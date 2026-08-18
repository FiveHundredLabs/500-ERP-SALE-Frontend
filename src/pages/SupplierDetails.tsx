import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { StatusBadge } from '../components/erp';
import { mockSuppliers } from '../data/mockSuppliers';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { Supplier } from '../types/suppliers';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  DollarSign,
  Calendar,
  Tag,
  AlertCircle,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../utils/whatsapp';

const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const supplier: Supplier | undefined =
    mockSuppliers.find((s) => s.id === id || s.supplierId === id);

  if (!supplier) {
    return (
      <AppLayout headerTitle="Supplier Profile">
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <Truck className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Supplier account not found or no supplier data available.</p>
          <button
            onClick={() => navigate('/suppliers')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Back to Suppliers Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const supplierPOs = mockPurchaseOrders.filter(
    (p) => p.supplierId === supplier.supplierId || p.supplierName === supplier.companyName
  );

  return (
    <AppLayout
      headerIcon={<Truck size={18} />}
      headerTitle="Supplier Profile"
      headerSubtitle={supplier.supplierId}
      headerRight={
        <button
          onClick={() => navigate('/suppliers')}
          className="erp-btn erp-btn-outline erp-btn-sm gap-1.5 text-xs"
        >
          <ArrowLeft size={13} /> Back to Suppliers
        </button>
      }
    >
      <div className="space-y-6">
        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-[#1a0f40] via-[#1e293b] to-[#0f172a] shadow-2xl">
          {/* subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5 p-6 md:p-8">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-purple-600/20 border-2 border-purple-500/40 flex items-center justify-center shadow-lg">
              <Truck size={36} className="text-purple-400" />
            </div>

            {/* Primary Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                  {supplier.companyName}
                </h1>
                <StatusBadge status={supplier.status} />
              </div>
              <p className="text-sm text-slate-400 mb-3">
                {supplier.contactPerson} &middot; {supplier.supplierType} &middot; {supplier.city}, {supplier.country}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {/* Primary WhatsApp */}
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber(supplier.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-medium transition"
                  title="Chat with supplier on WhatsApp"
                >
                  <MessageCircle size={13} className="text-emerald-400" />
                  <span>{supplier.phone}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold">WhatsApp</span>
                </a>

                {/* Optional Phone 2 */}
                {supplier.phone2 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    <Phone size={12} className="text-slate-400" /> {supplier.phone2} <span className="text-[10px] text-slate-500 font-sans">(Phone 2)</span>
                  </span>
                )}

                {/* Optional Phone 3 */}
                {supplier.phone3 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    <Phone size={12} className="text-slate-400" /> {supplier.phone3} <span className="text-[10px] text-slate-500 font-sans">(Phone 3)</span>
                  </span>
                )}

                {supplier.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={12} className="text-blue-400" /> {supplier.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-amber-400" /> {supplier.city}, {supplier.country}
                </span>
              </div>
            </div>

            {/* ID Badge */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="font-mono text-xs font-bold text-purple-300 bg-purple-900/40 border border-purple-500/30 px-3 py-1 rounded-full">
                {supplier.supplierId}
              </span>
              <span className="text-[11px] text-slate-500">
                Est. {supplier.createdAt?.split('T')[0] || 'N/A'}
              </span>
              <button
                onClick={() => navigate('/purchase-orders')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors shadow"
              >
                <ShoppingCart size={13} /> View All POs
              </button>
            </div>
          </div>
        </div>

        {/* ── 3 Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 flex-shrink-0 border border-purple-500/20">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total POs</p>
              <p className="text-2xl font-bold text-slate-100">{supplier.totalPOs}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Procurement orders</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0 border border-emerald-500/20">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Spend</p>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(supplier.totalPurchaseAmount)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Lifetime procurement value</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0 border border-indigo-500/20">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Payment Terms</p>
              <p className="text-xl font-bold text-slate-100">{supplier.paymentTerms}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Credit terms agreement</p>
            </div>
          </div>
        </div>

        {/* ── Detail Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Company Info */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Building2 size={15} className="text-purple-400" /> Company Info
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Supplier ID', value: supplier.supplierId, mono: true, accent: 'text-purple-400' },
                { label: 'Supplier Type', value: supplier.supplierType },
                { label: 'Payment Terms', value: supplier.paymentTerms, bold: true },
                { label: 'Bank Info', value: supplier.bankDetails || 'Standard Wire Transfer', mono: true },
              ].map(({ label, value, mono, accent, bold }) => (
                <div key={label} className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex-shrink-0">{label}:</span>
                  <span className={`${mono ? 'font-mono' : ''} ${accent || (bold ? 'text-slate-200 font-medium' : 'text-slate-300')} truncate max-w-[160px]`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Phone size={15} className="text-emerald-400" /> Contact Info
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                Up to 3 Phones
              </span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-shrink-0">Contact Person:</span>
                <span className="font-semibold text-slate-200">{supplier.contactPerson}</span>
              </div>

              {/* WhatsApp Number (Phone 1) */}
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 flex-shrink-0 flex items-center gap-1">
                  <MessageCircle size={11} className="text-emerald-400" /> WhatsApp (Primary):
                </span>
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber(supplier.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition"
                  title="Open chat in WhatsApp"
                >
                  <span>{supplier.phone}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold">Chat</span>
                </a>
              </div>

              {/* Phone 2 */}
              {supplier.phone2 && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex-shrink-0">Phone 2 (Secondary):</span>
                  <span className="font-mono text-slate-300">{supplier.phone2}</span>
                </div>
              )}

              {/* Phone 3 */}
              {supplier.phone3 && (
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex-shrink-0">Phone 3 (Alternative):</span>
                  <span className="font-mono text-slate-300">{supplier.phone3}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-800/60">
                <span className="text-slate-500 flex-shrink-0">Email:</span>
                <span className="text-slate-300">{supplier.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 flex-shrink-0">Location:</span>
                <span className="text-slate-300">{supplier.city}, {supplier.country}</span>
              </div>
            </div>
          </div>

          {/* Categories Supplied */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Tag size={15} className="text-cyan-400" /> Categories Supplied
            </h3>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(supplier.categories || ['General Goods', 'Consumables']).map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:border-purple-500/40 hover:text-purple-300 transition-colors cursor-default"
                >
                  {cat}
                </span>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Avg. Delivery:</span>
                <span className="text-slate-300">{(supplier as any).averageDeliveryDays || 7} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rating:</span>
                <span className="text-emerald-400 font-semibold">{(supplier as any).rating || '4.5'} / 5.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PO History Table ── */}
        <div className="erp-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Procurement History</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
              {supplierPOs.length} purchase orders
            </span>
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
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
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
