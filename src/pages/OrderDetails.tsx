import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, useToast } from '../components/erp';
import type { Order } from '../types/orders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { orderService } from '../services/OrderService';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import CreatePOModal from '../components/orders/CreatePOModal';
import CreateOrderModal from '../components/orders/CreateOrderModal';
import CustomConfirm from '../components/CustomConfirm';
import {
  ShoppingBag,
  UserCheck,
  Building2,
  Clock,
  ArrowLeft,
  FileCheck,
  FileText,
  Printer,
  Info,
  MessageCircle,
  ExternalLink,
  Edit,
  Trash2,
} from 'lucide-react';
import { generateOrderWhatsAppMessage, getWhatsAppUrl } from '../utils/whatsapp';

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showConvertToPOModal, setShowConvertToPOModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const isOrderEditable = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'pending' || s === 'pending_approval' || s === 'draft' || s === 'converted_to_po' || s === 'converted_to_invoice';
  };

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const data = await orderService.getById(id);
        setOrder(data);
      } catch {
        setOrder(undefined);
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

  const handleCreateConvertedPO = async (createdPO: PurchaseOrder) => {
    try {
      await purchaseOrderService.create(createdPO);
    } catch {
      // ignore
    }

    const updatedOrder: Order = {
      ...order,
      status: 'converted_to_po',
      convertedPurchaseOrder: { id: createdPO.id, poNumber: createdPO.poNumber },
      timeline: [
        ...order.timeline,
        {
          id: Math.random().toString(),
          event: 'converted_to_po',
          description: `Converted to Purchase Order ${createdPO.poNumber} for Supplier ${createdPO.supplierName}`,
          occurredAt: new Date().toISOString(),
          actor: 'Admin User',
        },
      ],
    };

    setOrder(updatedOrder);
    setShowConvertToPOModal(false);
    success('Converted to PO Successfully!', `Created Purchase Order ${createdPO.poNumber} from Order ${order.orderNumber}.`);
  };

  const handleUpdateOrder = async (updatedPayload: Order): Promise<Order> => {
    try {
      const saved = await orderService.update(updatedPayload.id, updatedPayload);
      setOrder(saved);
      setShowEditOrderModal(false);
      success('Order Updated', `Order ${saved.orderNumber} updated successfully.`);
      return saved;
    } catch {
      setOrder(updatedPayload);
      setShowEditOrderModal(false);
      success('Order Updated', `Order ${updatedPayload.orderNumber} updated.`);
      return updatedPayload;
    }
  };

  const handleDeleteOrder = () => {
    if (!order) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Order?',
      message: `Are you sure you want to delete Order "${order.orderNumber}"? This action may affect connected documents (Purchase Orders/Invoices) and cannot be undone.`,
      confirmText: 'Delete Order',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await orderService.delete(order.id);
          success('Order Deleted', `Order ${order.orderNumber} deleted successfully.`);
          navigate('/orders');
        } catch (err: any) {
          success('Error', err?.message || 'Failed to delete order');
        }
      },
    });
  };


  return (
    <AppLayout
      headerIcon={<ShoppingBag size={20} className="text-blue-400" />}
      headerTitle={`Order ${order.orderNumber}`}
      headerSubtitle={`Created on ${order.orderDate ? String(order.orderDate).split('T')[0] : 'N/A'} by ${order.salesmanName || (typeof order.salesman === 'object' && order.salesman?.fullName) || 'Sales Representative'}`}
    >
      <PageHeader
        title={`Order: ${order.orderNumber}`}
        description={`Sales order details for ${order.customerName}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Sales' },
          { label: 'Orders', path: '/orders' },
          { label: order.orderNumber },
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
              onClick={() => {
                const text = generateOrderWhatsAppMessage({
                  orderNumber: order.orderNumber,
                  customerName: order.customerName,
                  totalAmount: order.grandTotal,
                  orderDate: order.orderDate,
                  itemsCount: order.items?.length || 0,
                  remarks: order.notes,
                });
                const url = getWhatsAppUrl(order.contactPhone || '', text);
                window.open(url, '_blank');
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Share on WhatsApp"
            >
              <MessageCircle size={14} /> Share on WhatsApp
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Printer size={14} /> Print Order
            </button>

            {isOrderEditable(order.status) ? (
              <button
                onClick={() => setShowEditOrderModal(true)}
                className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit Order"
              >
                <Edit size={14} /> Edit Order
              </button>
            ) : (
              <button
                disabled
                className="px-3.5 py-1.5 border border-[#334155]/50 bg-[#1e293b]/50 text-gray-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-50"
                title={`Order is ${order.status.replace(/_/g, ' ')} and cannot be edited`}
              >
                <Edit size={14} /> Edit Locked
              </button>
            )}

            {order.status !== 'converted_to_po' && order.status !== 'completed' && (
              <button
                onClick={() => setShowConvertToPOModal(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                <FileCheck size={14} /> Convert to PO
              </button>
            )}

            {/* Convert to Invoice — available unless already completed/cancelled */}
            {order.status !== 'cancelled' && (
              <button
                onClick={() => navigate('/invoice', {
                  state: {
                    convertFromOrder: order,
                  }
                })}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <FileText size={14} /> Convert to Invoice
              </button>
            )}

            <button
              onClick={handleDeleteOrder}
              className="px-3.5 py-1.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete Order"
            >
              <Trash2 size={14} /> Delete
            </button>
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
              </div>
            </div>

            {/* Converted PO reference — only shown if converted */}
            {order.convertedPurchaseOrder && (
              <div className="bg-[#1e293b]/70 border border-purple-500/30 rounded-xl p-4 shadow-lg flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <ShoppingBag size={17} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Converted Purchase Order</p>
                  <Link
                    to={`/purchase-orders/${order.convertedPurchaseOrder.id}`}
                    className="text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-2 flex items-center gap-1 mt-0.5"
                  >
                    {order.convertedPurchaseOrder.poNumber} <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            )}

            {/* Salesman Info Card */}
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#334155]">
                <UserCheck size={18} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200">Sales Representative</h3>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Sales Officer Name</span>
                <span className="font-bold text-gray-100 text-sm block">
                  {order.salesmanName || (typeof order.salesman === 'object' && order.salesman?.fullName) || (typeof order.salesman === 'string' ? order.salesman : '') || '—'}
                </span>
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
                  {order.items.length} items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1e293b] text-gray-200 text-xs font-semibold border-b border-[#334155]">
                      <th className="p-3.5 text-left">Product Name</th>
                      <th className="p-3.5 text-right">Qty</th>
                      <th className="p-3.5 text-right">Unit Price</th>
                      <th className="p-3.5 text-right">Discount</th>
                      <th className="p-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={`border-b border-[#334155]/60 text-xs transition-colors hover:bg-[#334155]/20 ${
                          idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'
                        }`}
                      >
                        <td className="p-3.5">
                          <p className="font-semibold text-gray-200">{item.productName}</p>
                          <p className="text-[10px] text-gray-400">{item.category} · {item.brand}</p>
                        </td>
                        <td className="p-3.5 text-right text-gray-200 font-medium">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3.5 text-right text-gray-300 font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3.5 text-right text-amber-400 font-medium font-mono text-xs">
                          {(() => {
                            const dv = item.discountValue ?? item.discount;
                            if (!dv || Number(dv) <= 0) return '—';
                            const type = item.discountType || 'percentage';
                            const scope = item.discountScope || 'per_unit';
                            const scopeLabel = scope === 'per_unit' ? '/unit' : '/total';
                            if (type === 'percentage') return `${Number(dv)}%${scopeLabel}`;
                            return `LKR ${Number(dv).toLocaleString()}${scopeLabel}`;
                          })()}
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

                <div className="w-full sm:w-72 space-y-2 text-xs">
                  {/* Items gross subtotal if line discounts exist */}
                  {order.subTotal !== (order.items || []).reduce((s, i) => s + (i.total || 0), 0) && (
                    <div className="flex justify-between text-gray-400">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono text-gray-200">{formatCurrency(order.subTotal)}</span>
                    </div>
                  )}

                  {/* Effective Subtotal (after item line discounts) */}
                  <div className="flex justify-between text-gray-400 font-medium">
                    <span>Subtotal:</span>
                    <span className="font-mono text-gray-200">
                      {formatCurrency((order.items || []).reduce((s, i) => s + (i.total || 0), 0))}
                    </span>
                  </div>

                  {/* Order-level discount */}
                  {order.totalDiscount > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>
                        Order Discount
                        {order.totalDiscountType === 'percentage' && order.totalDiscountValue ? ` (${order.totalDiscountValue}%)` : ''}:
                      </span>
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
                        <span className="text-[10px] text-gray-400">{event.occurredAt}</span>
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
            sourceOrderId: order.id,
            sourceOrderNumber: order.orderNumber,
            customerName: order.customerName,
            notes: `Converted from Customer Order #${order.orderNumber}`,
            items: order.items.map((p) => ({
              sku: p.sku,
              productName: p.productName,
              quantity: p.quantity,
              sellingPrice: p.unitPrice,
            })),
          }}
        />
      )}
      {/* EDIT ORDER MODAL */}
      {showEditOrderModal && (
        <CreateOrderModal
          isOpen={showEditOrderModal}
          onClose={() => setShowEditOrderModal(false)}
          onSubmit={handleUpdateOrder}
          initialOrder={order}
        />
      )}

      {/* CUSTOM CONFIRM MODAL FOR DELETE */}
      <CustomConfirm
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={() => {
          confirmConfig.onConfirm();
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </AppLayout>
  );
};

export default OrderDetails;
