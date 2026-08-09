import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge } from '../components/erp';
import { mockCustomers } from '../data/mockCustomers';
import { mockOrders } from '../data/mockOrders';
import type { Customer } from '../types/customers';
import {
  Building2,
  Phone,
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  DollarSign,
} from 'lucide-react';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const customer: Customer | undefined = mockCustomers.find((c) => c.id === id || c.customerId === id) || mockCustomers[0];

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
        <PageHeader
          title={customer.businessName}
          description={`${customer.customerType} based in ${customer.city}`}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Customers', path: '/users/customers' },
            { label: customer.businessName },
          ]}
          actions={
            <button
              onClick={() => navigate('/orders')}
              className="erp-btn erp-btn-primary erp-btn-sm gap-1.5"
            >
              <ShoppingBag size={14} /> View All Orders
            </button>
          }
        />

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Orders</p>
              <p className="text-2xl font-bold text-slate-100">{customer.totalOrders}</p>
              <p className="text-xs text-slate-500">Completed trade orders</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-100">{formatCurrency(customer.totalSales)}</p>
              <p className="text-xs text-slate-500">Lifetime trade value</p>
            </div>
          </div>

          <div className="erp-card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Outstanding</p>
              <p className={`text-2xl font-bold ${customer.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
                {formatCurrency(customer.outstandingBalance)}
              </p>
              <p className="text-xs text-slate-500">Limit: {formatCurrency(customer.creditLimit)}</p>
            </div>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <Building2 size={16} className="text-cyan-400" /> Account Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer ID:</span>
                <span className="font-mono text-cyan-400 font-bold">{customer.customerId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={customer.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="text-slate-300">{customer.customerType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Terms:</span>
                <span className="text-slate-200 font-medium">{customer.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member Since:</span>
                <span className="text-slate-400">{customer.createdAt.split('T')[0]}</span>
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
                <span className="font-semibold text-slate-200">{customer.contactPerson}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-300">{customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-300">{customer.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">City / District:</span>
                <span className="text-slate-300">{customer.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Address:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{customer.address}</span>
              </div>
            </div>
          </div>

          <div className="erp-card space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 flex items-center gap-2">
              <CreditCard size={16} className="text-amber-400" /> Financial Standing
            </h3>
            <div className="space-y-2 text-xs">
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
                <span className="font-mono text-amber-400">{formatCurrency(customer.outstandingBalance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="erp-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Customer Order History</h3>
            <span className="text-xs text-slate-500">{customerOrders.length} orders found</span>
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
                    <td colSpan={7} className="text-center py-6 text-slate-500 text-xs">
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
