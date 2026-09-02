import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { StatusBadge, ActionMenu, useToast } from '../components/erp';
import { supplierService } from '../services/SupplierService';
import { purchaseOrderService } from '../services/PurchaseOrderService';
import { financeService } from '../services/FinanceService';
import type { Supplier } from '../types/suppliers';
import type { PurchaseOrder } from '../types/purchaseOrders';
import {
  Truck,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  CheckCircle,
  FileText,
  User,
  ShoppingBag,
  Eye,
  X,
  History
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../utils/whatsapp';
import RecordPaymentModal, { type RecordPaymentResult } from '../components/RecordPaymentModal';

interface SupplierPaymentRecord {
  id: string;
  date: string;
  poNumber: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  bankName?: string;
  notes?: string;
}

const SupplierDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [supplier, setSupplier] = useState<Supplier | undefined>(undefined);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid' | 'payments'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPoForSettlement, setSelectedPoForSettlement] = useState<PurchaseOrder | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState<SupplierPaymentRecord[]>([]);

  const loadData = useCallback(async () => {
    try {
      const found = await supplierService.getById(id || '');
      setSupplier(found);

      const [allPOs, allTxs] = await Promise.all([
        purchaseOrderService.getAll(),
        financeService.getAll().catch(() => []),
      ]);
      const matchingPOs = (allPOs || []).filter(
        (p) => p.supplierId === found?.id || p.supplierName === found?.companyName
      );
      setPurchaseOrders(matchingPOs);

      // Load real payment history from Finance transactions
      const poNumbers = new Set(matchingPOs.map(p => p.poNumber.toLowerCase()));
      const supCode = (found?.supplierCode || '').toLowerCase();
      const supName = (found?.companyName || '').toLowerCase();

      const matchingTxs = (allTxs || []).filter(t => {
        const invNum = (t.invoiceNumber || '').toLowerCase();
        const ref = (t.transactionRef || '').toLowerCase();
        return (
          poNumbers.has(invNum) ||
          (supCode && invNum.includes(supCode)) ||
          invNum.includes('sup-settle') ||
          (supName && ref.includes(supName))
        );
      });

      const records: SupplierPaymentRecord[] = matchingTxs.map((t, idx) => ({
        id: t.transactionNumber || `SPAY-${idx}`,
        date: t.transactionDate,
        poNumber: t.invoiceNumber || 'SUP-SETTLEMENT',
        amount: Math.abs(t.amount),
        paymentMethod: (t.paymentMethod || 'Bank Transfer').replace('_', ' '),
        reference: t.transactionRef,
        bankName: t.bankName,
      }));
      setPaymentHistory(records);
    } catch (err) {
      console.error('Failed to load supplier details:', err);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate financials based on real POs and actual payments recorded
  const totalPurchases = useMemo(() => {
    return purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0) || (supplier?.totalSpent || 0);
  }, [purchaseOrders, supplier]);

  // Actual amount paid to supplier from ledger and settled POs
  const totalPaid = useMemo(() => {
    const paidFromLedger = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidFromPOs = purchaseOrders
      .filter((po) => po.paymentStatus === 'paid')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const paid = Math.max(paidFromLedger, paidFromPOs);
    return Math.min(totalPurchases, paid);
  }, [totalPurchases, paymentHistory, purchaseOrders]);

  const totalOutstanding = useMemo(() => {
    return Math.max(0, totalPurchases - totalPaid);
  }, [totalPurchases, totalPaid]);

  // Filtered PO lists
  const unpaidPOs = useMemo(() => {
    if (totalOutstanding <= 0) return [];
    return purchaseOrders.filter((po) => po.paymentStatus === 'unpaid' || po.paymentStatus === 'partial');
  }, [purchaseOrders, totalOutstanding]);

  const paidPOs = useMemo(() => {
    if (totalOutstanding <= 0) return purchaseOrders;
    return purchaseOrders.filter((po) => po.paymentStatus === 'paid');
  }, [purchaseOrders, totalOutstanding]);

  const filteredPOs = useMemo(() => {
    if (activeTab === 'unpaid') return unpaidPOs;
    if (activeTab === 'paid') return paidPOs;
    return purchaseOrders;
  }, [purchaseOrders, unpaidPOs, paidPOs, activeTab]);

  const formatCurrency = (val: number) => `LKR ${Math.round(val).toLocaleString('en-US')}/=`;
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmSettlement = async (result: RecordPaymentResult) => {
    setIsProcessingPayment(true);
    try {
      const transactionId = await financeService.getNextId();

      if (selectedPoForSettlement) {
        // Specific PO settlement
        await financeService.create({
          transactionNumber: transactionId,
          transactionDate: new Date(result.transactionDate).toISOString(),
          transactionType: 'payment',
          paymentMethod: result.method,
          bankName: result.bankName || undefined,
          transactionRef: result.transactionRef,
          amount: result.amount,
          invoiceNumber: selectedPoForSettlement.poNumber,
        });

        // Update PO payment status
        const isFull = result.amount >= selectedPoForSettlement.totalAmount - 0.01;
        const newStatus = isFull ? 'paid' : 'partial';
        await purchaseOrderService.update(selectedPoForSettlement.id, {
          paymentStatus: newStatus,
        });
      } else {
        // General Supplier settlement across unpaid POs (FIFO)
        await financeService.create({
          transactionNumber: transactionId,
          transactionDate: new Date(result.transactionDate).toISOString(),
          transactionType: 'payment',
          paymentMethod: result.method,
          bankName: result.bankName || undefined,
          transactionRef: result.transactionRef,
          amount: result.amount,
          invoiceNumber: `SUP-SETTLE-${supplier?.supplierCode || supplier?.companyName || '001'}`,
        });

        // Cumulative FIFO allocation across all POs chronologically (oldest first)
        const newCumulativePaid = totalPaid + result.amount;
        const sortedPOs = [...purchaseOrders].sort(
          (a, b) => new Date(a.poDate || a.createdAt).getTime() - new Date(b.poDate || b.createdAt).getTime()
        );

        let remainingMoney = newCumulativePaid;
        for (const po of sortedPOs) {
          if (remainingMoney >= po.totalAmount) {
            if (po.paymentStatus !== 'paid') {
              await purchaseOrderService.update(po.id, { paymentStatus: 'paid' });
            }
            remainingMoney -= po.totalAmount;
          } else if (remainingMoney > 0) {
            if (po.paymentStatus !== 'partial') {
              await purchaseOrderService.update(po.id, { paymentStatus: 'partial' });
            }
            remainingMoney = 0;
          } else {
            if (po.paymentStatus !== 'unpaid') {
              await purchaseOrderService.update(po.id, { paymentStatus: 'unpaid' });
            }
          }
        }
      }

      // Update supplier balance
      const newOutstanding = Math.max(0, totalOutstanding - result.amount);
      await supplierService.update(supplier!.id, { balanceDue: newOutstanding });

      success('Payment Recorded', `Successfully settled ${formatCurrency(result.amount)} to ${supplier?.companyName}.`);
      setShowPaymentModal(false);
      setSelectedPoForSettlement(null);

      // Reload all data
      await loadData();
    } catch (err: any) {
      toastError('Payment Failed', err?.message || 'Failed to record supplier settlement.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!supplier) {
    return (
      <AppLayout 
        headerIcon={<Truck size={20} className="text-purple-400" />}
        headerTitle="Supplier Profile"
      >
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <Truck className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Supplier account not found.</p>
          <button
            onClick={() => navigate('/suppliers')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Back to Suppliers Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  const city = supplier.city || (supplier.address.includes(',') ? supplier.address.split(',').pop()?.trim() : '');

  return (
    <AppLayout
      headerIcon={<Truck size={20} className="text-purple-400" />}
      headerTitle="Supplier Details"
      headerSubtitle={supplier.supplierCode}
      headerRight={
        <button
          onClick={() => navigate('/suppliers')}
          className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} /> Back to Suppliers
        </button>
      }
    >
      <div className="space-y-5">
        {/* ── Breadcrumb Navigation ── */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="hover:text-blue-400 transition"
          >
            Dashboard
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate('/suppliers')} 
            className="hover:text-blue-400 transition"
          >
            Suppliers
          </button>
          <span>/</span>
          <span className="text-slate-200 font-medium truncate max-w-[200px]">
            {supplier.companyName}
          </span>
        </div>

        {/* ── Clean & Minimal Header Banner ── */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Supplier Identity & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {supplier.companyName}
                </h1>
                <span className="font-mono text-xs font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-md">
                  {supplier.supplierCode}
                </span>
                <StatusBadge status={supplier.status} />
              </div>

              {/* Subtitle Details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
                {supplier.contactPerson && (
                  <span className="flex items-center gap-1">
                    <User size={13} className="text-gray-400 shrink-0" />
                    <span className="text-gray-400">Contact:</span>
                    <strong className="text-white">{supplier.contactPerson}</strong>
                  </span>
                )}

                <div className="flex items-center gap-1 text-gray-300">
                  <MapPin size={13} className="text-blue-400 shrink-0" />
                  <span>{supplier.address}</span>
                  {city && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-[#0f172a] text-[10px] text-gray-300 border border-[#334155]">
                      {city}
                    </span>
                  )}
                </div>

                {supplier.email && (
                  <div className="flex items-center gap-1 text-gray-300">
                    <Mail size={13} className="text-amber-400 shrink-0" />
                    <span>{supplier.email}</span>
                  </div>
                )}
              </div>

              {/* Phone & WhatsApp Links */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber(supplier.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-semibold transition"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle size={13} />
                  <span>{supplier.phone}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-sans">WhatsApp</span>
                </a>

                {supplier.phone2 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                    <Phone size={11} className="text-gray-400" /> {supplier.phone2}
                  </span>
                )}

                {supplier.phone3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                    <Phone size={11} className="text-gray-400" /> {supplier.phone3}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#334155]">
              <button
                onClick={() => navigate('/suppliers')}
                className="px-3.5 py-2 border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <button
                onClick={() => {
                  setSelectedPoForSettlement(null);
                  setShowPaymentModal(true);
                }}
                disabled={totalOutstanding <= 0}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md ${
                  totalOutstanding > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-[#1e293b] text-gray-500 border border-[#334155] cursor-not-allowed shadow-none'
                }`}
              >
                <DollarSign size={14} /> {totalOutstanding > 0 ? 'Settle Payment' : 'All Settled'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 4 Minimal KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Purchased */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Purchases</p>
              <p className="text-lg font-bold font-mono text-white mt-0.5 tracking-tight truncate">
                {formatCurrency(totalPurchases)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{purchaseOrders.length} POs processed</p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-blue-400 shrink-0">
              <FileText size={18} />
            </div>
          </div>

          {/* Total Settled / Paid */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Total Paid / Settled</p>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tracking-tight truncate">
                {formatCurrency(totalPaid)}
              </p>
              <p className="text-[11px] text-emerald-500/80 mt-0.5">{paidPOs.length} POs fully paid</p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-emerald-400 shrink-0">
              <CheckCircle size={18} />
            </div>
          </div>

          {/* Outstanding Pay */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Outstanding Due</p>
              <p className={`text-lg font-bold font-mono mt-0.5 tracking-tight truncate ${totalOutstanding > 0 ? 'text-amber-400' : 'text-gray-200'}`}>
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {totalOutstanding > 0 ? `${unpaidPOs.length} PO(s) pending settlement` : 'All purchases settled'}
              </p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-amber-400 shrink-0">
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Total POs */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">Purchase Orders</p>
              <p className="text-lg font-bold font-mono text-purple-300 mt-0.5 tracking-tight truncate">
                {purchaseOrders.length} Orders
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{paymentHistory.length} payments recorded</p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-purple-400 shrink-0">
              <ShoppingBag size={18} />
            </div>
          </div>
        </div>

        {/* ── Main Tabbed Content ── */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl overflow-hidden shadow-sm">
          {/* Tab Filter Bar */}
          <div className="p-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-2 bg-[#0f172a]">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: 'All Purchase Orders', count: purchaseOrders.length },
                { id: 'unpaid', label: 'Unpaid / Partial', count: unpaidPOs.length, color: 'text-amber-400' },
                { id: 'paid', label: 'completed', count: paidPOs.length, color: 'text-emerald-400' },
                { id: 'payments', label: 'Payment Ledger', count: paymentHistory.length, icon: History },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e293b]'
                    }`}
                  >
                    {Icon && <Icon size={12} />}
                    <span>{tab.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive 
                        ? 'bg-blue-700 text-white' 
                        : tab.color ? `${tab.color} bg-[#1e293b]` : 'text-gray-400 bg-[#1e293b]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* POs Table */}
          {activeTab !== 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a]/60 text-gray-400 uppercase tracking-wider">
                    <th className="p-3">PO Number</th>
                    <th className="p-3">Order Date</th>
                    <th className="p-3">Expected Date</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Payment Status</th>
                    <th className="p-3 text-center">Order Status</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-500">
                        <FileText size={22} className="mx-auto mb-2 opacity-40" />
                        No purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => {
                      return (
                        <tr 
                          key={po.id}
                          className="hover:bg-[#1e293b]/70 transition cursor-pointer"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        >
                          <td className="p-3 font-mono font-bold text-purple-400">
                            {po.poNumber}
                          </td>
                          <td className="p-3 text-gray-300 font-mono">
                            {formatDate(po.poDate)}
                          </td>
                          <td className="p-3 text-gray-300 font-mono">
                            {formatDate(po.expectedDeliveryDate)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-gray-300">
                            {po.totalItems}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-100">
                            {formatCurrency(po.totalAmount)}
                          </td>
                          <td className="p-3 text-center">
                            {po.paymentStatus === 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Paid
                              </span>
                            )}
                            {po.paymentStatus === 'partial' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                Partial
                              </span>
                            )}
                            {po.paymentStatus === 'unpaid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <StatusBadge status={po.status} />
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <ActionMenu
                                title="PO Actions"
                                items={[
                                  {
                                    label: 'View PO Details',
                                    icon: <Eye size={13} />,
                                    variant: 'purple',
                                    onClick: () => navigate(`/purchase-orders/${po.id}`),
                                  },
                                  ...(po.paymentStatus !== 'paid'
                                    ? [
                                        {
                                          label: 'Record Settlement',
                                          icon: <DollarSign size={13} />,
                                          variant: 'emerald' as const,
                                          onClick: () => {
                                            setSelectedPoForSettlement(po);
                                            setShowPaymentModal(true);
                                          },
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Ledger */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a]/60 text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">PO Ref</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Reference / Bank</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40">
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">
                        <History size={22} className="mx-auto mb-2 opacity-40" />
                        No payments recorded yet for this supplier.
                      </td>
                    </tr>
                  ) : (
                    paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-[#1e293b]/70 transition">
                        <td className="p-3 font-mono text-gray-300">{formatDate(p.date)}</td>
                        <td className="p-3 font-mono text-purple-400 font-semibold">{p.id}</td>
                        <td className="p-3 font-mono text-blue-400 font-bold">{p.poNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-gray-300">
                          {p.bankName ? `${p.bankName} (${p.reference || '—'})` : p.reference || '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="p-3 text-gray-400 italic truncate max-w-[200px]">
                          {p.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SETTLEMENT PAYMENT MODAL ── */}
      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPoForSettlement(null);
        }}
        onConfirm={handleConfirmSettlement}
        isProcessing={isProcessingPayment}
        documentNumber={selectedPoForSettlement ? selectedPoForSettlement.poNumber : (supplier?.supplierCode || 'SUP-SETTLE')}
        partyName={supplier?.companyName || 'Supplier'}
        totalAmount={selectedPoForSettlement ? selectedPoForSettlement.totalAmount : totalPurchases}
        paidAmount={selectedPoForSettlement ? (selectedPoForSettlement.paymentStatus === 'paid' ? selectedPoForSettlement.totalAmount : 0) : totalPaid}
        remainingAmount={selectedPoForSettlement ? (selectedPoForSettlement.paymentStatus === 'paid' ? 0 : selectedPoForSettlement.totalAmount) : totalOutstanding}
        mode="supplier"
        title={selectedPoForSettlement ? `Settle PO ${selectedPoForSettlement.poNumber}` : 'Settle Supplier Balance'}
      />
    </AppLayout>
  );
};

export default SupplierDetails;
