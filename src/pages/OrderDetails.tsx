import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, useToast } from '../components/erp';
import { mockOrders } from '../data/mockOrders';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { Order, OrderStatusType } from '../types/orders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { orderService } from '../services/OrderService';
import CreatePOModal from '../components/orders/CreatePOModal';
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

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showConvertToPOModal, setShowConvertToPOModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await orderService.getById(id);
        setOrder(data);
      } catch {
        const found = mockOrders.find((o) => o.id === id || o.orderId === id) || mockOrders[0];
        setOrder(found);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#0f172a] text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Loading Order Details...</p>
        </div>
      </div>
    );
  }

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

  const handleCreateConvertedPO = (createdPO: PurchaseOrder) => {
    mockPurchaseOrders.unshift(createdPO);

    const updatedOrder: Order = {
      ...order,
      status: 'Converted to PO',
      convertedPOId: createdPO.poNumber,
      timeline: [
        ...order.timeline,
        {
          id: Math.random().toString(),
          event: 'Converted to PO',
          description: `Converted to Purchase Order ${createdPO.poNumber} for Supplier ${createdPO.supplierName}`,
          timestamp: new Date().toISOString(),
          actor: 'Admin User',
        },
      ],
    };

    setOrder(updatedOrder);
    setShowConvertToPOModal(false);
    success('Converted to PO Successfully!', `Created Purchase Order ${createdPO.poNumber} from Order ${order.orderId}.`);
  };

  const handleUpdateStatus = async (newStatus: OrderStatusType) => {
    if (!order || !id) return;
    try {
      await orderService.updateStatus(order.id || id, newStatus);
      setOrder(prev => prev ? { ...prev, status: newStatus } : undefined);
    } catch {
      setOrder(prev => prev ? { ...prev, status: newStatus } : undefined);
    }
    info('Status Updated', `Order ${order.orderId} status changed to ${newStatus}.`);
  };

  return (
    <AppLayout
      headerIcon={<ShoppingBag size={20} className="text-blue-400" />}
      headerTitle={`Order ${order.orderId}`}
      headerSubtitle={`Created on ${order.orderDate} by ${typeof order.salesman === 'object' && order.salesman ? order.salesman.name : (order.salesman || 'Sales Representative')}`}
    >
      <PageHeader
        title={`Order: ${order.orderId}`}
        description={`Sales order details for ${order.customerName}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Sales' },
          { label: 'Orders', path: '/orders' },
          { label: order.orderId },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/orders')}
              className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Orders
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer size={14} /> Print Order
            </button>

            {order.status !== 'Converted to PO' && order.status !== 'Completed' && (
              <button
                onClick={() => setShowConvertToPOModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                <FileCheck size={14} /> Convert to PO
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {/* TOP METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Order Status</p>
              <div className="mt-1">
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg">
              <ShoppingBag size={20} className="text-blue-400" />
            </div>
          </div>

          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Payment Status</p>
              <div className="mt-1">
                <StatusBadge status={order.paymentStatus} />
              </div>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg">
              <Clock size={20} className="text-amber-400" />
            </div>
          </div>

          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Grand Total</p>
              <p className="text-lg font-bold text-white mt-0.5 font-mono">{formatCurrency(order.grandTotal)}</p>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg">
              <Building2 size={20} className="text-emerald-400" />
            </div>
          </div>

          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Items</p>
              <p className="text-lg font-bold text-white mt-0.5">{order.numberOfProducts} Products</p>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg">
              <UserCheck size={20} className="text-purple-400" />
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Customer & Salesman Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Info Card */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#334155]">
                <Building2 size={18} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-200">Customer Details</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Business Name</span>
                  <span className="font-bold text-gray-100 text-sm">{order.customerName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Contact Person</span>
                    <span className="text-gray-200 font-medium">{order.contactPerson}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Phone</span>
                    <span className="text-gray-200 font-medium">{order.contactPhone}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Address</span>
                  <span className="text-gray-300">{order.customerAddress}, {order.customerCity}</span>
                </div>
                <div className="pt-1">
                  <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Customer ID</span>
                  <span className="font-mono text-blue-400 font-semibold">{order.customerId}</span>
                </div>
              </div>
            </div>

            {/* Salesman Info Card */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#334155]">
                <UserCheck size={18} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Sales Representative</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-semibold text-gray-200">{order.salesman?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Employee ID:</span>
                  <span className="font-mono text-gray-300">{order.salesman?.employeeId || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Assigned Territory:</span>
                  <span className="text-gray-300">{order.salesman?.area || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Contact Phone:</span>
                  <span className="text-gray-300">{order.salesman?.phone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Update Order Status</h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus('Approved')}
                  disabled={order.status === 'Approved'}
                  className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={14} /> Approve Order
                </button>

                <button
                  onClick={() => handleUpdateStatus('Rejected')}
                  disabled={order.status === 'Rejected'}
                  className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} /> Reject Order
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Products Table & Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Table */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">Ordered Products</h3>
                <span className="text-xs text-gray-400 bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-full">
                  {order.products.length} items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1e293b] text-gray-200 text-xs font-semibold border-b border-[#334155]">
                      <th className="p-3.5 text-left">SKU</th>
                      <th className="p-3.5 text-left">Product Name</th>
                      <th className="p-3.5 text-right">Qty</th>
                      <th className="p-3.5 text-right">Unit Price</th>
                      <th className="p-3.5 text-right">Discount</th>
                      <th className="p-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.products.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`border-b border-[#334155]/60 text-xs transition-colors hover:bg-[#334155]/20 ${
                          idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'
                        }`}
                      >
                        <td className="p-3.5 font-mono text-blue-400 font-semibold">{item.sku}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-gray-200">{item.productName}</p>
                          <p className="text-[10px] text-gray-400">{item.category} · {item.brand}</p>
                        </td>
                        <td className="p-3.5 text-right text-gray-200 font-medium">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3.5 text-right text-gray-300 font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3.5 text-right text-amber-400 font-medium">
                          {item.discount > 0 ? `${item.discount}%` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-bold text-white font-mono">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div className="p-5 bg-[#111b2d] border-t border-[#334155] flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="text-xs text-gray-400 space-y-1">
                  {order.notes && (
                    <div className="flex items-start gap-1.5 max-w-sm">
                      <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                      <p><span className="font-medium text-gray-300">Notes:</span> {order.notes}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-gray-200">{formatCurrency(order.subTotal)}</span>
                  </div>
                  {order.totalDiscount > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Total Discount:</span>
                      <span className="font-mono text-amber-400">- {formatCurrency(order.totalDiscount)}</span>
                    </div>
                  )}
                  {order.totalTax > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Total Tax:</span>
                      <span className="font-mono text-gray-300">{formatCurrency(order.totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-white border-t border-[#334155] pt-2">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400 font-mono text-base">{formatCurrency(order.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Log */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 pb-3 border-b border-[#334155]">Order Audit Log & Timeline</h3>

              <div className="space-y-4">
                {order.timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-200">{event.event}</p>
                        <span className="text-[10px] text-gray-400">{event.timestamp}</span>
                      </div>
                      {event.description && <p className="text-gray-400 text-[11px] mt-0.5">{event.description}</p>}
                      {event.actor && <span className="text-[10px] text-blue-400 font-medium mt-0.5 inline-block">By: {event.actor}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONVERT TO PO MODAL */}
      {showConvertToPOModal && (
        <CreatePOModal
          isOpen={showConvertToPOModal}
          onClose={() => setShowConvertToPOModal(false)}
          onSubmit={handleCreateConvertedPO}
          initialData={{
            referenceOrderId: order.orderId,
            referenceOrderNum: order.orderId,
            customerName: order.customerName,
            notes: `Converted from Customer Order #${order.orderId}`,
            items: order.products.map((p) => ({
              sku: p.sku,
              productName: p.productName,
              quantity: p.quantity,
              sellingPrice: p.unitPrice,
            })),
          }}
        />
      )}
    </AppLayout>
  );
};

export default OrderDetails;
