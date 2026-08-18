import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, useToast } from '../components/erp';
import { mockPurchaseOrders } from '../data/mockPurchaseOrders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import {
  ShoppingCart,
  Truck,
  ArrowLeft,
  Printer,
  MessageCircle,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { getWhatsAppUrl, generatePOWhatsAppMessage } from '../utils/whatsapp';

const PurchaseOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success } = useToast();

  const [po, setPo] = useState<PurchaseOrder | undefined>(undefined);
  const [loading, setLoading] = useState(true);

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
          description={`Issued on ${po.poDate}`}
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
                onClick={() => {
                  navigate('/invoice', { state: { convertFromPO: po } });
                }}
                className="px-3 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                title="Convert Purchase Order to Sales Invoice"
              >
                <FileText size={14} /> Convert to Invoice
              </button>

              <button
                onClick={() => {
                  const message = generatePOWhatsAppMessage({
                    poNumber: po.poNumber,
                    supplierName: po.supplierName,
                    totalAmount: po.grandTotal,
                    poDate: po.poDate,
                    itemsCount: po.items.length,
                    shareUrl: `${window.location.origin}/purchase-orders/view/${po.id || po.poNumber}`,
                  });
                  const waUrl = getWhatsAppUrl(po.supplierPhone, message);
                  window.open(waUrl, '_blank');
                  success('WhatsApp Shared', `Opened chat for ${po.supplierName} (${po.supplierPhone})`);
                }}
                className="px-3 py-2 border border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle size={14} /> Send via WhatsApp
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
              <span className="text-gray-400 min-w-[100px]">Supplier ID:</span>
              <span className="font-mono text-gray-300">{po.supplierId}</span>
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
                  <th className="p-3 text-left w-8">#</th>
                  <th className="p-3 text-left">Product Description</th>
                  <th className="p-3 text-left min-w-[180px]">Remark</th>
                  <th className="p-3 text-right min-w-[60px]">Qty</th>
                  <th className="p-3 text-right min-w-[120px]">Unit Price</th>
                  <th className="p-3 text-right min-w-[120px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-[#334155]/60 ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'} hover:bg-[#1e293b] transition-colors`}
                  >
                    <td className="p-3 text-xs text-gray-500 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <p className="text-sm font-semibold text-gray-200">{item.productName}</p>
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
                    <td className="p-3 text-right font-semibold text-gray-100 text-sm">{item.quantity}</td>
                    <td className="p-3 text-right text-gray-300 text-sm font-mono">{formatCurrency(item.unitPrice)}</td>
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
                <span className="font-bold text-gray-100">Grand Total:</span>
                <span className="text-lg font-bold text-purple-400 font-mono">{formatCurrency(po.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </AppLayout>
  );
};

export default PurchaseOrderDetails;
