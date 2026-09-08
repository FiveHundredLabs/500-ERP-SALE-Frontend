import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, useToast } from '../components/erp';
import type { PurchaseOrder } from '../types/purchaseOrders';
import type { PurchaseOrderReturn } from '../types/po-return';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { orderService } from '../services/OrderService';
import {
  ShoppingCart,
  Truck,
  ArrowLeft,
  MessageCircle,
  MessageSquare,
  FileText,
  PackageCheck,
  ShoppingBag,
  Edit,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Eye,
  Plus,
  DollarSign
} from 'lucide-react';
import { getWhatsAppUrl, generatePOWhatsAppMessage } from '../utils/whatsapp';
import PurchaseOrderViewModal from '../components/orders/PurchaseOrderViewModal';
import CreatePOModal from '../components/orders/CreatePOModal';
import CreatePOReturnModal from '../components/orders/CreatePOReturnModal';
import POReturnViewModal from '../components/orders/POReturnViewModal';
import CustomConfirm from '../components/CustomConfirm';

export const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  processing: 'Processing',
  goods_received: 'Goods Received',
  partially_received: 'Partially Received',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
  partially_returned: 'Partial Return',
};

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [po, setPo] = useState<PurchaseOrder | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<PurchaseOrderReturn | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const isPOEditable = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s !== 'completed' && s !== 'paid' && s !== 'cancelled' && s !== 'returned';
  };

  const fetchPO = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await purchaseOrderService.getById(id);
      setPo(data);
    } catch {
      setPo(undefined);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPO();
  }, [id]);

  if (loading) {
    return (
      <AppLayout headerTitle="Purchase Order Details">
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3" />
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
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
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

  // Calculate returned quantities for each item
  const getReturnedQtyForItem = (item: any) => {
    if (!po.returns || po.returns.length === 0) return 0;
    return po.returns
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => {
        const matching = (r.items || []).filter(
          (ri: any) =>
            (item.inventoryItemId && ri.inventoryItemId === item.inventoryItemId) ||
            (item.sku && ri.sku?.toLowerCase() === item.sku?.toLowerCase()) ||
            (item.productName && ri.productName?.toLowerCase() === item.productName?.toLowerCase())
        );
        return sum + matching.reduce((itSum: number, it: any) => itSum + (it.quantity || 0), 0);
      }, 0);
  };

  const totalReturnedDebit = (po.returns || [])
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + Number(r.returnTotal || 0), 0);

  const activeReturns = (po.returns || []).filter((r) => r.status !== 'cancelled');

  const handleMarkGoodsReceived = async () => {
    if (!po || !id) return;
    setUpdatingStatus(true);
    try {
      const updated = await purchaseOrderService.updateStatus(id, 'goods_received');
      setPo(updated);
      success('Goods Received', `PO ${po.poNumber} marked as Goods Received.`);
    } catch {
      toastError('Failed to update status', 'Could not mark PO as goods received. Please try again.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePO = async (updatedPO: PurchaseOrder) => {
    try {
      const saved = await purchaseOrderService.update(updatedPO.id, updatedPO);
      setPo(saved);
      setShowEditModal(false);
      success('PO Updated', `Purchase Order ${saved.poNumber} updated successfully.`);
    } catch (err: any) {
      toastError('Update Failed', err?.message || 'Failed to update Purchase Order');
    }
  };

  const handleDeletePO = () => {
    if (!po) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Purchase Order?',
      message: `Are you sure you want to delete PO "${po.poNumber}"? If this PO is linked to a Sales Order, the link will be detached. This action cannot be undone.`,
      confirmText: 'Delete PO',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await purchaseOrderService.delete(po.id);
          success('PO Deleted', `Purchase Order ${po.poNumber} deleted.`);
          navigate('/purchase-orders');
        } catch (err: any) {
          toastError('Error', err?.message || 'Failed to delete PO');
        }
      },
    });
  };

  const getSalesmanFromPO = (p: PurchaseOrder): { id: string; name: string } | undefined => {
    if (p.sourceOrder?.salesmanId || p.sourceOrder?.salesmanName) {
      return {
        id: p.sourceOrder.salesmanId || p.sourceOrder.salesman?.id || '',
        name: p.sourceOrder.salesmanName || p.sourceOrder.salesman?.fullName || '',
      };
    }
    return undefined;
  };

  const handleConvertToInvoice = async () => {
    if (!po) return;
    let sourceOrder = null;
    const orderId = po.sourceOrderId || po.sourceOrder?.id;
    if (orderId) {
      try {
        sourceOrder = await orderService.getById(orderId);
      } catch {
        // ignore
      }
    }
    const salesman = (sourceOrder?.salesmanId ? { id: sourceOrder.salesmanId, name: sourceOrder.salesmanName || '' } : undefined) || getSalesmanFromPO(po);
    navigate('/invoice', {
      state: {
        convertFromPO: po,
        convertFromOrder: sourceOrder,
        salesman,
      },
    });
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

        {/* Status + Source Order + Returns KPI Banners */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg">
              <ShoppingCart size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">PO Status</p>
              <StatusBadge status={po.calculatedStatus || po.status} />
            </div>
          </div>

          {/* Source Order reference */}
          {(po.sourceOrderNumber || po.sourceOrderId) ? (
            <div className="bg-[#1e293b]/70 border border-blue-500/30 rounded-xl p-4 shadow-lg flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <ShoppingBag size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Source Order</p>
                {po.sourceOrderId ? (
                  <Link
                    to={`/orders/${po.sourceOrderId}`}
                    className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2 mt-0.5 block"
                  >
                    {po.sourceOrderNumber || po.sourceOrderId}
                  </Link>
                ) : (
                  <p className="text-sm font-bold text-blue-300 mt-0.5">{po.sourceOrderNumber}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center gap-4">
              <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">PO Total Value</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">
                  {formatCurrency(po.totalAmount)}
                </p>
              </div>
            </div>
          )}

          {/* Return Debit summary banner */}
          <div className={`border rounded-xl p-4 shadow-lg flex items-center gap-4 ${
            activeReturns.length > 0
              ? 'bg-purple-950/30 border-purple-500/40'
              : 'bg-[#1e293b]/70 border-[#334155]'
          }`}>
            <div className={`p-3 rounded-lg border ${
              activeReturns.length > 0
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                : 'bg-[#0f172a] border-[#334155] text-gray-500'
            }`}>
              <RotateCcw size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Returns / Debit Claims</p>
              {activeReturns.length > 0 ? (
                <p className="text-sm font-bold text-purple-300 mt-0.5 font-mono">
                  {activeReturns.length} Return{activeReturns.length > 1 ? 's' : ''} · {formatCurrency(totalReturnedDebit)}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">No returns processed</p>
              )}
            </div>
          </div>
        </div>

        {/* Page Header with Action Buttons */}
        <PageHeader
          title={`PURCHASE ORDER — ${po.poNumber}`}
          description={`Issued on ${po.poDate ? String(po.poDate).split('T')[0] : 'N/A'}`}
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Purchase Orders', path: '/purchase-orders' },
            { label: po.poNumber },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const text = generatePOWhatsAppMessage({
                    poNumber: po.poNumber,
                    supplierName: po.supplierName,
                    totalAmount: po.totalAmount,
                    poDate: po.poDate ? String(po.poDate).split('T')[0] : '',
                    itemsCount: po.totalItems || po.items?.length || 0,
                    remarks: po.notes,
                    shareUrl: `${window.location.origin}/purchase-orders/${po.id || po.poNumber}/preview`,
                  });
                  const url = getWhatsAppUrl(po.supplierPhone || '+94705787818', text);
                  window.open(url, '_blank');
                  success('WhatsApp Opened', `Opened chat for ${po.supplierName} (${po.supplierPhone || '+94 705787818'})`);
                }}
                className="px-3.5 py-2 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Share Purchase Order via WhatsApp"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>

              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3.5 py-2 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Preview, Download PDF or Print Purchase Order"
              >
                <FileText size={15} /> Preview & Print
              </button>

              {/* Return Items Button */}
              <button
                onClick={() => setShowReturnModal(true)}
                className="px-3.5 py-2 border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Create a Return to Supplier for this PO"
              >
                <RotateCcw size={14} /> Return to Supplier
              </button>

              {/* Edit PO — locked if completed/paid/cancelled */}
              {isPOEditable(po.status) ? (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3.5 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-amber-400 hover:text-amber-300 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Edit Purchase Order"
                >
                  <Edit size={14} /> Edit PO
                </button>
              ) : (
                <button
                  disabled
                  className="px-3.5 py-2 border border-[#334155]/50 bg-[#1e293b]/50 text-gray-500 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-50"
                  title={`PO is ${po.status.replace(/_/g, ' ')} and cannot be edited`}
                >
                  <Edit size={14} /> Edit Locked
                </button>
              )}

              {/* Mark Goods Received */}
              {po.status !== 'goods_received' && po.status !== 'completed' && po.status !== 'cancelled' && po.status !== 'returned' && (
                <button
                  onClick={handleMarkGoodsReceived}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20"
                  title="Mark this PO as Goods Received from supplier"
                >
                  <PackageCheck size={15} /> {updatingStatus ? 'Updating...' : 'Mark Goods Received'}
                </button>
              )}

              <button
                onClick={handleConvertToInvoice}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
                title="Convert Purchase Order to Sales Invoice"
              >
                <FileText size={15} /> Convert to Invoice
              </button>

              <button
                onClick={handleDeletePO}
                className="px-3 py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Delete Purchase Order"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          }
        />

        {/* Supplier Card */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg w-full">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#334155] text-indigo-400 font-semibold text-xs uppercase tracking-wider">
            <Truck size={15} /> Supplier Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-xs">
            <div className="flex justify-between md:justify-start gap-4">
              <span className="text-gray-400 min-w-[100px]">Company:</span>
              <span className="font-semibold text-gray-200">{po.supplierName}</span>
            </div>
            <div className="flex justify-between md:justify-start gap-4">
              <span className="text-gray-400 min-w-[100px]">Contact Person:</span>
              <span className="text-gray-300">{po.supplierContact}</span>
            </div>
            <div className="flex justify-between md:justify-start gap-4">
              <span className="text-gray-400 min-w-[100px]">Phone:</span>
              <span className="font-mono text-gray-300">{po.supplierPhone}</span>
            </div>
            <div className="flex justify-between md:justify-start gap-4 md:col-span-2">
              <span className="text-gray-400 min-w-[100px]">Address:</span>
              <span className="text-gray-300">{po.supplierAddress}, {po.supplierCity}</span>
            </div>
          </div>
        </div>

        {/* Products Table with Return Accountability */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-200">Purchased Products</h3>
              {activeReturns.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <RotateCcw size={11} /> Returns Logged
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 bg-[#0f172a] border border-[#334155] px-2.5 py-1 rounded-full">
              {po.items.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-gray-200 text-xs font-semibold border-b border-[#334155]">
                  <th className="p-3 text-left w-8">#</th>
                  <th className="p-3 text-left">Product Description</th>
                  <th className="p-3 text-left min-w-[180px]">Remark</th>
                  <th className="p-3 text-center min-w-[80px]">Ordered</th>
                  <th className="p-3 text-center min-w-[80px]">Returned</th>
                  <th className="p-3 text-right min-w-[120px]">Unit Price</th>
                  <th className="p-3 text-right min-w-[120px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, idx) => {
                  const retQty = getReturnedQtyForItem(item);
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-[#334155]/60 ${
                        retQty > 0 ? 'bg-purple-950/15' : idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'
                      } hover:bg-[#1e293b] transition-colors`}
                    >
                      <td className="p-3 text-xs text-gray-500 font-mono">{idx + 1}</td>
                      <td className="p-3">
                        <p className="text-sm font-semibold text-gray-200">{item.productName}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="p-3">
                        {item.remark ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 max-w-[220px]">
                            <MessageSquare size={11} className="text-amber-400 shrink-0" />
                            <span className="leading-snug">{item.remark}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-semibold text-gray-100 text-sm">{item.quantityOrdered}</td>
                      <td className="p-3 text-center">
                        {retQty > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <RotateCcw size={10} /> {retQty} returned
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-gray-300 text-sm font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-bold text-white text-sm font-mono">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RETURNS & DEBIT NOTES HISTORY CARD */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <RotateCcw size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">Supplier Returns & Debit Notes</h3>
                <p className="text-[11px] text-gray-400">Track all debit notes and stock deductions linked to this PO</p>
              </div>
            </div>

            <button
              onClick={() => setShowReturnModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus size={13} />
              <span>Issue New Return</span>
            </button>
          </div>

          <div className="p-5">
            {(!po.returns || po.returns.length === 0) ? (
              <div className="text-center py-6 border border-dashed border-[#334155] rounded-xl bg-[#0f172a]/50">
                <RotateCcw size={28} className="mx-auto text-gray-600 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-gray-400">No returns or debit notes issued for this Purchase Order</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Any items returned to {po.supplierName} will be recorded here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0f172a] text-gray-400 border-b border-[#334155] font-semibold">
                      <th className="p-3">Return Note ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Items Returned</th>
                      <th className="p-3 text-right">Debit Total</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/50">
                    {po.returns.map((ret) => {
                      const totalItemsCount = (ret.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
                      const isCompleted = ret.status === 'completed';
                      return (
                        <tr key={ret.id} className="hover:bg-[#1e293b] transition-colors">
                          <td className="p-3 font-mono font-bold text-purple-400">
                            {ret.returnNumber}
                          </td>
                          <td className="p-3 text-gray-300 font-mono text-[11px]">
                            {new Date(ret.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-gray-300">
                            <span className="font-semibold text-white">{totalItemsCount} units</span>
                            <span className="text-gray-500 text-[11px] block truncate max-w-[180px]">
                              {(ret.items || []).map(i => i.productName).join(', ')}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-purple-300">
                            {formatCurrency(Number(ret.returnTotal || 0))}
                          </td>
                          <td className="p-3 text-gray-300 max-w-[200px] truncate" title={ret.returnReason}>
                            {ret.returnReason}
                            {ret.remarks && <p className="text-[10px] text-gray-500 truncate">{ret.remarks}</p>}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>
                              {isCompleted && <CheckCircle2 size={10} />}
                              {ret.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedReturnForView(ret)}
                              className="px-2.5 py-1 bg-[#0f172a] hover:bg-purple-900/30 border border-purple-500/30 hover:border-purple-500/60 text-purple-300 rounded text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>View Slip</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* PO Notes & Audit History Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-[#334155] flex items-center gap-2">
              <MessageSquare size={15} className="text-purple-400" />
              PO Notes & Audit History
            </h3>
            {po.notes ? (
              <div className="space-y-2">
                {po.notes.split('\n').map((line, idx) => {
                  const isReturnLog = line.includes('PO Return') || line.includes('Return Reversal');
                  if (isReturnLog) {
                    return (
                      <div key={idx} className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2">
                        <RotateCcw size={13} className="text-purple-400 shrink-0 mt-0.5" />
                        <span className="font-mono leading-relaxed">{line}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-xs text-gray-300">
                      {line}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No notes recorded for this purchase order.</p>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-gray-200 mb-4 pb-2 border-b border-[#334155] flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-400" />
              PO Financial Breakdown
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal Amount:</span>
                <span className="font-mono text-gray-200">{formatCurrency(po.subTotal)}</span>
              </div>
              {po.totalDiscount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span>Total Discount</span>
                    {po.discountType === 'percentage' && po.discountValue ? (
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                        {po.discountValue}%
                      </span>
                    ) : null}
                    :
                  </span>
                  <span className="font-mono text-amber-400">- {formatCurrency(po.totalDiscount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-[#334155] flex justify-between items-center">
                <span className="font-bold text-gray-100">PO Grand Total:</span>
                <span className="text-lg font-bold text-purple-400 font-mono">{formatCurrency(po.totalAmount)}</span>
              </div>
              {totalReturnedDebit > 0 && (
                <div className="pt-2 border-t border-purple-500/30 flex justify-between items-center text-xs">
                  <span className="font-semibold text-purple-300 flex items-center gap-1">
                    <RotateCcw size={12} /> Total Returned Debit:
                  </span>
                  <span className="font-mono font-bold text-rose-400">- {formatCurrency(totalReturnedDebit)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* VIEW / PRINT PO MODAL */}
      <PurchaseOrderViewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        selectedPO={po}
        onShareSuccess={(msg) => success('Shared', msg)}
      />

      {/* EDIT PO MODAL */}
      {showEditModal && po && (
        <CreatePOModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdatePO}
          poToEdit={po}
        />
      )}

      {/* CREATE RETURN MODAL */}
      <CreatePOReturnModal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        defaultPOId={po.id}
        onSuccess={(newReturn) => {
          fetchPO();
          if (newReturn) {
            setSelectedReturnForView(newReturn);
          }
        }}
      />

      {/* VIEW DEBIT NOTE SLIP MODAL */}
      <POReturnViewModal
        isOpen={!!selectedReturnForView}
        onClose={() => setSelectedReturnForView(null)}
        returnRecord={selectedReturnForView}
        onStatusChange={() => fetchPO()}
        onDelete={() => {
          setSelectedReturnForView(null);
          fetchPO();
        }}
      />

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

export default PurchaseOrderDetails;
