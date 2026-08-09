import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { StatusBadge } from '../components/erp';
import { mockCustomers } from '../data/mockCustomers';
import { mockOrders } from '../data/mockOrders';
import type { Customer } from '../types/customers';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  DollarSign,
  User,
  Calendar,
  Tag,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const customer: Customer | undefined =
    mockCustomers.find((c) => c.id === id || c.customerId === id) || mockCustomers[0];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const customerOrders = mockOrders.filter(
    (o) => o.customerId === customer?.customerId || o.customerName === customer?.businessName
  );

  if (!customer) {
    return (
      <AppLayout headerTitle="Customer Profile">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Customer not found.</p>
        </div>
      </AppLayout>
    );
  }

  const creditUtilization = customer.creditLimit > 0
    ? Math.min(100, Math.round((customer.outstandingBalance / customer.creditLimit) * 100))
    : 0;

  return (
    <AppLayout
      headerIcon={<Building2 size={18} />}
      headerTitle="Customer Profile"
      headerSubtitle={customer.customerId}
      headerRight={
        <button
          onClick={() => navigate('/users/customers')}
          className="erp-btn erp-btn-outline erp-btn-sm gap-1.5 text-xs"
        >
          <ArrowLeft size={13} /> Back to Customers
        </button>
      }
    >
      <div className="space-y-6">
        {/* ── Hero Banner ── */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-700/60 bg-gradient-to-br from-[#0f2240] via-[#1e293b] to-[#0f172a] shadow-2xl">
          {/* subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-5 p-6 md:p-8">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center shadow-lg">
              <Building2 size={36} className="text-blue-400" />
            </div>

            {/* Primary Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                  {customer.businessName}
                </h1>
                <StatusBadge status={customer.status} />
              </div>
              <p className="text-sm text-slate-400 mb-3">
                {customer.contactPerson} &middot; {customer.customerType} &middot; {customer.city}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-400" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={12} className="text-blue-400" /> {customer.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-amber-400" /> {customer.address}
                </span>
              </div>
            </div>

            {/* ID Badge */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-900/40 border border-blue-500/30 px-3 py-1 rounded-full">
                {customer.customerId}
              </span>
              <span className="text-[11px] text-slate-500">
                Since {customer.createdAt?.split('T')[0]}
              </span>
              <button
                onClick={() => navigate('/orders')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow"
              >
                <ShoppingBag size={13} /> View Orders
              </button>
            </div>
          </div>
        </div>

        {/* ── 3 Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 flex-shrink-0 border border-blue-500/20">
              <ShoppingBag size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-slate-100">{customer.totalOrders}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Completed trade orders</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0 border border-emerald-500/20">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(customer.totalSales)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Lifetime trade value</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0 border border-amber-500/20">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Outstanding</p>
              <p className={`text-2xl font-bold ${customer.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                {formatCurrency(customer.outstandingBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Limit: {formatCurrency(customer.creditLimit)}</p>
            </div>
          </div>
        </div>

        {/* ── Detail Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Details */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <User size={15} className="text-blue-400" /> Account Details
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Customer ID', value: customer.customerId, mono: true, accent: 'text-blue-400' },
                { label: 'Type', value: customer.customerType },
                { label: 'Payment Terms', value: customer.paymentTerms, bold: true },
                { label: 'Member Since', value: customer.createdAt?.split('T')[0] },
              ].map(({ label, value, mono, accent, bold }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-slate-500">{label}:</span>
                  <span className={`${mono ? 'font-mono' : ''} ${accent || (bold ? 'text-slate-200 font-medium' : 'text-slate-300')}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Phone size={15} className="text-emerald-400" /> Contact Info
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Contact Person', value: customer.contactPerson, bold: true },
                { label: 'Phone', value: customer.phone, mono: true },
                { label: 'Email', value: customer.email || 'N/A' },
                { label: 'City / District', value: customer.city },
                { label: 'Address', value: customer.address, truncate: true },
              ].map(({ label, value, mono, bold, truncate }) => (
                <div key={label} className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 flex-shrink-0">{label}:</span>
                  <span className={`${mono ? 'font-mono' : ''} ${bold ? 'font-semibold text-slate-200' : 'text-slate-300'} ${truncate ? 'truncate max-w-[150px]' : ''}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Standing */}
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <TrendingUp size={15} className="text-amber-400" /> Financial Standing
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Limit:</span>
                <span className="font-mono text-slate-200">{formatCurrency(customer.creditLimit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Credit:</span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(Math.max(0, customer.creditLimit - customer.outstandingBalance))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding:</span>
                <span className={`font-mono ${customer.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatCurrency(customer.outstandingBalance)}
                </span>
              </div>
              {/* Credit utilization bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Credit Utilization</span>
                  <span>{creditUtilization}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditUtilization > 80 ? 'bg-red-500' : creditUtilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${creditUtilization}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Terms:</span>
                <span className="text-slate-200 font-medium">{customer.paymentTerms}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Order History Table ── */}
        <div className="erp-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Order History</h3>
            </div>
            <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
              {customerOrders.length} orders
            </span>
          </div>

          <div className="erp-table-container border-0 rounded-none">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Salesman</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customerOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                      No orders recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  customerOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      onClick={() => navigate(`/orders/${ord.id}`)}
                      className="cursor-pointer hover:bg-slate-800/60"
                    >
                      <td className="font-mono text-blue-400 font-semibold text-xs">{ord.orderId}</td>
                      <td className="text-slate-300 text-xs">{ord.orderDate}</td>
                      <td className="text-slate-400 text-xs">{ord.salesman.name}</td>
                      <td className="text-right font-semibold text-slate-200 text-xs">{ord.numberOfProducts}</td>
                      <td className="text-right font-semibold text-slate-100">{formatCurrency(ord.grandTotal)}</td>
                      <td><StatusBadge status={ord.paymentStatus} /></td>
                      <td><StatusBadge status={ord.status} /></td>
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

export default CustomerDetails;
