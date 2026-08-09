import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, useToast, ConfirmDialog } from '../components/erp';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import {
  ShoppingCart,
  Truck,
  Calendar,
  ArrowLeft,
  CheckCircle,
  Printer,
  Mail,
  CreditCard,
} from 'lucide-react';

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, info } = useToast();

  const [po, setPo] = useState<PurchaseOrder | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [confirmApproveModal, setConfirmApproveModal] = useState(false);

  React.useEffect(() => {
    if (!id) return;
    const fetchPO = async () => {
      setLoading(true);
      try {
        const data = await purchaseOrderService.getById(id);
        setPo(data);
      } catch {
        const found = mockPurchaseOrders.find((p) => p.id === id || p.poNumber === id) || mockPurchaseOrders[0];
        setPo(found);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [id]);

  if (loading) {
    return (
      <AppLayout headerTitle="Purchase Order Details">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            <p className="text-sm">Loading Purchase Order...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!po) {
    return (
      <AppLayout headerTitle="Purchase Order Details">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-300">Purchase Order Not Found</p>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Back to Purchase Orders
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const handleApprovePO = () => {
    const updated: PurchaseOrder = {
      ...po,
      status: 'Approved',
      approvedByName: 'Admin User',
      approvedAt: new Date().toISOString(),
    };
    setPo(updated);
    setConfirmApproveModal(false);
    success('PO Approved Successfully!', `Purchase Order ${po.poNumber} has been approved.`);
  };

  return (
    <AppLayout
      headerIcon={<ShoppingCart size={20} className="text-purple-400" />}
      headerTitle="Purchase Order Details"
      headerSubtitle={po.poNumber}
      headerRight={
        <button
          onClick={() => navigate('/purchase-orders')}
          className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to POs
        </button>
      }
    >
      <div className="space-y-6 pb-8">

        {/* Page Header */}
        <PageHeader
          title={`PURCHASE ORDER — ${po.poNumber}`}
          description={`Created by ${po.createdByName} on ${po.poDate}`}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Purchase Orders', path: '/purchase-orders' },
            { label: po.poNumber },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Print
              </button>

              <button
                onClick={() => info('Email Sent', `Purchase Order ${po.poNumber} sent to ${po.supplierEmail || po.supplierName}`)}
                className="px-3 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Mail size={14} /> Send to Supplier
              </button>

              {(po.status === 'Draft' || po.status === 'Pending Approval') && (
                <button
                  onClick={() => setConfirmApproveModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle size={14} /> Approve PO
                </button>
              )}
            </div>
          }
        />

        {/* Status Bar */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">PO Status:</span>
            <StatusBadge status={po.status} />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider ml-3">Payment:</span>
            <StatusBadge status={po.paymentStatus} />
          </div>

          {po.referenceOrderNum && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Reference Order:</span>
              <button
                onClick={() => navigate('/orders')}
                className="font-mono text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors"
              >
                {po.referenceOrderNum}
              </button>
            </div>
          )}
        </div>

        {/* 3 Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Supplier Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-indigo-400 font-semibold text-xs uppercase tracking-wider">
              <Truck size={15} /> Supplier Information
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Company:</span>
                <span className="font-semibold text-gray-200 text-right">{po.supplierName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Supplier ID:</span>
                <span className="font-mono text-gray-300">{po.supplierId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Contact Person:</span>
                <span className="text-gray-300 text-right">{po.supplierContact}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Phone:</span>
                <span className="font-mono text-gray-300">{po.supplierPhone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Address:</span>
                <span className="text-gray-300 text-right truncate max-w-[180px]">{po.supplierAddress}, {po.supplierCity}</span>
              </div>
            </div>
          </div>

          {/* Dates & Delivery Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Calendar size={15} /> Dates & Delivery
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">PO Issue Date:</span>
                <span className="font-semibold text-gray-200">{po.poDate}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Expected Date:</span>
                <span className="text-gray-300">{po.expectedDate}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Delivery Terms:</span>
                <span className="text-gray-300 text-right">{po.deliveryTerms || 'Standard Warehouse Delivery'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Created By:</span>
                <span className="text-gray-300">{po.createdByName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Approved By:</span>
                <span className={po.approvedByName ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {po.approvedByName || 'Pending Approval'}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Notes Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-purple-400 font-semibold text-xs uppercase tracking-wider">
              <CreditCard size={15} /> Terms & Notes
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Payment Terms:</span>
                <span className="font-semibold text-gray-200">{po.paymentTerms}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Customer Ref:</span>
                <span className="text-gray-300 text-right">{po.customerName || 'Central Warehouse'}</span>
              </div>
              {po.notes && (
                <div className="pt-2 border-t border-[#334155] text-gray-400">
                  <span className="text-gray-400 font-medium block mb-1">Notes:</span>
                  <p className="text-[11px] leading-snug text-gray-300">{po.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">Purchased Products</h3>
            <span className="text-xs text-gray-400 bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-full">
              {po.items.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-xs font-semibold border-b border-[#334155]">
                  <th className="p-3 text-left min-w-[100px]">SKU Code</th>
                  <th className="p-3 text-left min-w-[200px]">Product Description</th>
                  <th className="p-3 text-left min-w-[110px]">Category</th>
                  <th className="p-3 text-right min-w-[60px]">Qty</th>
                  <th className="p-3 text-left min-w-[60px]">Unit</th>
                  <th className="p-3 text-right min-w-[110px]">Unit Price</th>
                  <th className="p-3 text-right min-w-[80px]">Discount</th>
                  <th className="p-3 text-right min-w-[110px]">Subtotal</th>
                  <th className="p-3 text-right min-w-[110px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[#334155]/60 ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'} hover:bg-[#1e293b] transition-colors`}
                  >
                    <td className="p-3 text-xs font-mono text-purple-400 font-semibold">{item.sku}</td>
                    <td className="p-3 text-sm font-semibold text-gray-200">{item.productName}</td>
                    <td className="p-3 text-xs text-gray-400">{item.category}</td>
                    <td className="p-3 text-right font-semibold text-gray-100 text-sm">{item.quantity}</td>
                    <td className="p-3 text-xs text-gray-400">{item.unit}</td>
                    <td className="p-3 text-right text-gray-300 text-sm font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-right text-amber-400 text-xs font-semibold">{item.discount}%</td>
                    <td className="p-3 text-right text-gray-400 text-xs font-mono">{formatCurrency(item.subtotal)}</td>
                    <td className="p-3 text-right font-bold text-white text-sm font-mono">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="flex justify-end">
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg w-full max-w-md">
            <h3 className="text-sm font-semibold text-gray-200 mb-4 pb-2 border-b border-[#334155]">
              PO Financial Breakdown
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal Amount:</span>
                <span className="font-mono text-gray-200">{formatCurrency(po.subTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Total Discount:</span>
                <span className="font-mono text-amber-400">- {formatCurrency(po.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping & Handling:</span>
                <span className="font-mono text-gray-200">{formatCurrency(po.shippingCharges)}</span>
              </div>
              <div className="pt-3 border-t border-[#334155] flex justify-between items-center">
                <span className="font-bold text-gray-100">Grand Total:</span>
                <span className="text-lg font-bold text-purple-400 font-mono">{formatCurrency(po.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmApproveModal}
        title="Approve Purchase Order"
        message={`Are you sure you want to approve Purchase Order ${po.poNumber} for ${po.supplierName}?`}
        confirmText="Approve PO"
        cancelText="Cancel"
        type="info"
        onConfirm={handleApprovePO}
        onCancel={() => setConfirmApproveModal(false)}
      />
    </AppLayout>
  );
};

export default PurchaseOrderDetails;
