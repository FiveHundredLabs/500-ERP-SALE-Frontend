import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, ConfirmDialog, useToast } from '../components/erp';
import { mockOrders } from '../data/mockOrders';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { Order, OrderStatusType } from '../types/orders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import {
  ShoppingBag,
  UserCheck,
  Building2,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileCheck,
  Printer,
  Info,
} from 'lucide-react';

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, info } = useToast();

  const [order, setOrder] = useState<Order | undefined>(() =>
    mockOrders.find((o) => o.id === id || o.orderId === id) || mockOrders[0]
  );

  const [confirmPOModal, setConfirmPOModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  if (!order) {
    return (
      <div className="flex h-screen bg-[#0f172a] text-white items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-300">Order Not Found</p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const handleConvertToPO = () => {
    setIsConverting(true);
    setTimeout(() => {
      const generatedPONumber = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newPO: PurchaseOrder = {
        id: Math.random().toString(36).substr(2, 9),
        poNumber: generatedPONumber,
        referenceOrderId: order.id,
        referenceOrderNum: order.orderId,
        supplierId: 'SUP-00001',
        supplierName: 'Petrotec Industries Ltd',
        supplierContact: 'Shantha Wijesinghe',
        supplierPhone: '011-567-8901',
        supplierAddress: '78, Grandpass Road',
        supplierCity: 'Colombo 14',
        customerName: order.customerName,
        createdById: 'admin-001',
        createdByName: 'Admin User',
        poDate: new Date().toISOString().split('T')[0],
        expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: order.products.map((p) => ({
          id: p.id,
          sku: p.sku,
          productName: p.productName,
          category: p.category,
          quantity: p.quantity,
          unit: p.unit,
          unitPrice: p.unitPrice,
          discount: p.discount,
          tax: p.tax,
          subtotal: p.subtotal,
          total: p.total,
        })),
        numberOfItems: order.numberOfProducts,
        subTotal: order.subTotal,
        totalDiscount: order.totalDiscount,
        totalTax: order.totalTax,
        shippingCharges: 2500,
        grandTotal: order.grandTotal + 2500,
        status: 'Draft',
        paymentStatus: 'Unpaid',
        paymentTerms: 'Net 30',
      };

      mockPurchaseOrders.unshift(newPO);

      const updatedOrder: Order = {
        ...order,
        status: 'Converted to PO',
        convertedPOId: generatedPONumber,
        timeline: [
          ...order.timeline,
          {
            id: Math.random().toString(),
            event: 'Converted to PO',
            description: `Converted to Purchase Order ${generatedPONumber}`,
            timestamp: new Date().toISOString(),
            actor: 'Admin User',
          },
        ],
      };

      setOrder(updatedOrder);
      setIsConverting(false);
      setConfirmPOModal(false);
      success('Converted to PO Successfully!', `Created Purchase Order ${generatedPONumber} from Order ${order.orderId}.`);
    }, 600);
  };

  const handleUpdateStatus = (newStatus: OrderStatusType) => {
    const updated: Order = {
      ...order,
      status: newStatus,
      timeline: [
        ...order.timeline,
        {
          id: Math.random().toString(),
          event: `Status set to ${newStatus}`,
          timestamp: new Date().toISOString(),
          actor: 'Admin User',
        },
      ],
    };
    setOrder(updated);
    info('Status Updated', `Order ${order.orderId} status changed to ${newStatus}.`);
  };

  return (
    <AppLayout
      headerIcon={<ShoppingBag size={20} className="text-blue-400" />}
      headerTitle="Order Details"
      headerSubtitle={order.orderId}
      headerRight={
        <button
          onClick={() => navigate('/orders')}
          className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to Orders
        </button>
      }
    >
      <div className="space-y-6 pb-8">

        {/* Page Header */}
        <PageHeader
          title={`Order ${order.orderId}`}
          description={`Submitted by ${order.salesman.name} on ${order.orderDate}`}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Orders', path: '/orders' },
            { label: order.orderId },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Print
              </button>

              {order.status !== 'Converted to PO' && order.status !== 'Completed' && (
                <button
                  onClick={() => setConfirmPOModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck size={14} /> Convert to PO
                </button>
              )}

              {order.convertedPOId && (
                <button
                  onClick={() => navigate('/purchase-orders')}
                  className="px-3 py-2 border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck size={14} /> View PO ({order.convertedPOId})
                </button>
              )}
            </div>
          }
        />

        {/* Status Bar */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Current Status:</span>
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider ml-3">Payment:</span>
            <StatusBadge status={order.paymentStatus} />
          </div>

          {order.status !== 'Converted to PO' && order.status !== 'Completed' && (
            <div className="flex items-center gap-2 flex-wrap">
              {order.status === 'Pending' && (
                <button
                  onClick={() => handleUpdateStatus('Reviewing')}
                  className="px-3 py-1.5 border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-colors"
                >
                  Mark as Reviewing
                </button>
              )}
              {(order.status === 'Pending' || order.status === 'Reviewing') && (
                <button
                  onClick={() => handleUpdateStatus('Approved')}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCircle size={13} /> Approve Order
                </button>
              )}
              {order.status !== 'Rejected' && (
                <button
                  onClick={() => handleUpdateStatus('Rejected')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <XCircle size={13} /> Reject Order
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Salesman Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-blue-400 font-semibold text-xs uppercase tracking-wider">
              <UserCheck size={15} /> Salesman Info
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Salesman Name:</span>
                <span className="font-semibold text-gray-200 text-right">{order.salesman.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Employee ID:</span>
                <span className="font-mono text-gray-300">{order.salesman.employeeId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Territory / Area:</span>
                <span className="text-gray-300 text-right">{order.salesman.area}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Contact Number:</span>
                <span className="font-mono text-gray-300">{order.salesman.phone}</span>
              </div>
            </div>
          </div>

          {/* Customer Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Building2 size={15} /> Customer / Shop Info
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Shop / Business:</span>
                <span className="font-semibold text-gray-200 text-right truncate max-w-[180px]">{order.customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Customer ID:</span>
                <span className="font-mono text-gray-300">{order.customerId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Contact Person:</span>
                <span className="text-gray-300 text-right">{order.contactPerson}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Phone:</span>
                <span className="font-mono text-gray-300">{order.contactPhone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Address:</span>
                <span className="text-gray-300 text-right truncate max-w-[180px]">{order.customerAddress}, {order.customerCity}</span>
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-purple-400 font-semibold text-xs uppercase tracking-wider">
              <ShoppingBag size={15} /> Order Overview
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Order ID:</span>
                <span className="font-mono font-bold text-blue-400">{order.orderId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Order Date:</span>
                <span className="text-gray-300">{order.orderDate}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Created Time:</span>
                <span className="text-gray-300">{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Products Count:</span>
                <span className="font-semibold text-gray-200">{order.numberOfProducts} items</span>
              </div>
              <div className="flex justify-between gap-2 pt-2 border-t border-[#334155]">
                <span className="text-gray-300 font-medium">Grand Total:</span>
                <span className="font-bold text-emerald-400 text-sm">{formatCurrency(order.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-200">Ordered Products Specification</h3>
            <span className="text-xs text-gray-400 bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-full">
              {order.products.length} line items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-xs font-semibold border-b border-[#334155]">
                  <th className="p-3 text-left min-w-[100px]">SKU Code</th>
                  <th className="p-3 text-left min-w-[200px]">Product Name</th>
                  <th className="p-3 text-left min-w-[110px]">Category</th>
                  <th className="p-3 text-left min-w-[100px]">Brand</th>
                  <th className="p-3 text-right min-w-[60px]">Qty</th>
                  <th className="p-3 text-left min-w-[60px]">Unit</th>
                  <th className="p-3 text-right min-w-[110px]">Unit Price</th>
                  <th className="p-3 text-right min-w-[80px]">Discount</th>
                  <th className="p-3 text-right min-w-[110px]">Subtotal</th>
                  <th className="p-3 text-right min-w-[110px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#334155]/60 ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'} hover:bg-[#1e293b] transition-colors`}
                  >
                    <td className="p-3 text-xs font-mono text-blue-400 font-semibold">{p.sku}</td>
                    <td className="p-3 text-sm font-semibold text-gray-200">{p.productName}</td>
                    <td className="p-3 text-xs text-gray-400">{p.category}</td>
                    <td className="p-3 text-xs text-gray-400">{p.brand}</td>
                    <td className="p-3 text-right font-semibold text-gray-100 text-sm">{p.quantity}</td>
                    <td className="p-3 text-xs text-gray-400">{p.unit}</td>
                    <td className="p-3 text-right text-gray-300 text-sm font-mono">{formatCurrency(p.unitPrice)}</td>
                    <td className="p-3 text-right text-amber-400 text-xs font-semibold">{p.discount}%</td>
                    <td className="p-3 text-right text-gray-400 text-xs font-mono">{formatCurrency(p.subtotal)}</td>
                    <td className="p-3 text-right font-bold text-white text-sm font-mono">{formatCurrency(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline & Financial Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-200 mb-5 pb-2 border-b border-[#334155] flex items-center gap-2">
              <Clock size={16} className="text-blue-400" /> Order Lifecycle Timeline
            </h3>
            <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#334155]">
              {order.timeline.map((evt, idx) => (
                <div key={evt.id || idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#1e293b]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-gray-200">{evt.event}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{new Date(evt.timestamp).toLocaleString()}</span>
                    </div>
                    {evt.description && <p className="text-xs text-gray-400 mt-0.5">{evt.description}</p>}
                    {evt.actor && <p className="text-[10px] text-gray-500 mt-0.5">By: {evt.actor}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-5 pb-2 border-b border-[#334155]">
                Financial Breakdown
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono text-gray-200">{formatCurrency(order.subTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Total Line Discounts:</span>
                  <span className="font-mono text-amber-400">- {formatCurrency(order.totalDiscount)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (VAT/NBT):</span>
                  <span className="font-mono text-gray-300">{formatCurrency(order.totalTax)}</span>
                </div>
                <div className="pt-3 border-t border-[#334155] flex justify-between items-center">
                  <span className="text-base font-bold text-gray-100">Grand Total:</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </div>

            {order.status !== 'Converted to PO' && (
              <div className="mt-6 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-purple-300">
                  <Info size={15} />
                  <span>Ready for supplier fulfillment?</span>
                </div>
                <button
                  onClick={() => setConfirmPOModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  Convert to PO
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmPOModal}
        title="Convert Order to Purchase Order"
        message={`This will automatically generate a Purchase Order from Order ${order.orderId}, transferring all ${order.numberOfProducts} products, pricing, and customer references.`}
        confirmText={isConverting ? 'Converting...' : 'Confirm Conversion'}
        cancelText="Cancel"
        type="info"
        onConfirm={handleConvertToPO}
        onCancel={() => setConfirmPOModal(false)}
      />
    </AppLayout>
  );
};

export default OrderDetails;
