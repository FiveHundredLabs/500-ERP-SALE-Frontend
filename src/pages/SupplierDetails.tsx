import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { StatusBadge, useToast } from '../components/erp';
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
  MoreVertical,
  Eye,
  X,
  History
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../utils/whatsapp';

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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Settlement Form
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer',
    reference: '',
    bankName: 'Commercial Bank',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [paymentHistory, setPaymentHistory] = useState<SupplierPaymentRecord[]>([
    {
      id: 'SPAY-001',
      date: '2026-08-10',
      poNumber: 'PO-2026-001',
      amount: 450000,
      paymentMethod: 'Bank Transfer',
      reference: 'TXN-BNK-9892',
      bankName: 'Commercial Bank',
      notes: 'Initial deposit for engine filters batch',
    },
    {
      id: 'SPAY-002',
      date: '2026-07-28',
      poNumber: 'PO-2026-002',
      amount: 600000,
      paymentMethod: 'Cheque',
      reference: 'CHQ-554109',
      bankName: 'HNB',
      notes: 'Full settlement on delivery',
    },
  ]);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const found = await supplierService.getById(id || '');
        setSupplier(found);

        const allPOs = await purchaseOrderService.getAll();
        const matchingPOs = (allPOs || []).filter(
          (p) => p.supplierId === found?.id || p.supplierName === found?.companyName
        );
        setPurchaseOrders(matchingPOs);
      } catch (err) {
        console.error('Failed to load supplier details:', err);
      }
    };
    loadData();
  }, [id]);

  // Calculate financials
  const totalPurchases = useMemo(() => {
    return purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) || (supplier?.totalSpent || 0);
  }, [purchaseOrders, supplier]);

  const totalOutstanding = useMemo(() => {
    return supplier?.balanceDue || 0;
  }, [supplier]);

  const totalPaid = useMemo(() => {
    return Math.max(0, totalPurchases - totalOutstanding);
  }, [totalPurchases, totalOutstanding]);

  // Filtered PO lists
  const unpaidPOs = useMemo(() => {
    return purchaseOrders.filter((po) => po.paymentStatus === 'unpaid' || po.paymentStatus === 'partial');
  }, [purchaseOrders]);

  const paidPOs = useMemo(() => {
    return purchaseOrders.filter((po) => po.paymentStatus === 'paid');
  }, [purchaseOrders]);

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

  const enteredAmount = Math.max(0, parseFloat(settlementForm.amount) || 0);

  // Auto-allocation calculation
  const poAllocations = useMemo(() => {
    if (enteredAmount <= 0) return [];

    let remainingPayment = enteredAmount;
    return unpaidPOs.map((po) => {
      const needed = po.totalAmount;
      let allocated = 0;
      if (remainingPayment >= needed) {
        allocated = needed;
        remainingPayment -= needed;
      } else if (remainingPayment > 0) {
        allocated = remainingPayment;
        remainingPayment = 0;
      }

      return {
        po,
        allocated,
        newRemaining: Math.max(0, po.totalAmount - allocated),
        newStatus: allocated >= po.totalAmount ? 'paid' : allocated > 0 ? 'partial' : po.paymentStatus,
      };
    });
  }, [unpaidPOs, enteredAmount]);

  const handleConfirmSettlement = async () => {
    if (enteredAmount <= 0) {
      toastError('Invalid Amount', 'Please enter a valid settlement payment amount.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // 1. Record transaction in Finance
      await financeService.create({
        transactionNumber: `TXN-${Date.now()}`,
        transactionDate: settlementForm.date,
        paymentMethod: settlementForm.paymentMethod === 'Cheque' ? 'cheque' : 'bank_transfer',
        bankName: settlementForm.bankName || undefined,
        transactionRef: settlementForm.reference || undefined,
        amount: enteredAmount,
        invoiceNumber: `SUP-SETTLE-${supplier?.supplierCode || '001'}`,
      });

      // 2. Add to payment ledger
      const newRecord: SupplierPaymentRecord = {
        id: `SPAY-${Date.now().toString().slice(-4)}`,
        date: settlementForm.date,
        poNumber: poAllocations[0]?.po.poNumber || 'BULK-SETTLEMENT',
        amount: enteredAmount,
        paymentMethod: settlementForm.paymentMethod,
        reference: settlementForm.reference,
        bankName: settlementForm.bankName,
        notes: settlementForm.notes || `Settlement payment to ${supplier?.companyName}`,
      };
      setPaymentHistory((prev) => [newRecord, ...prev]);

      // 3. Update supplier outstanding payments
      const newOutstanding = Math.max(0, totalOutstanding - enteredAmount);
      const updatedSupplier = {
        ...supplier!,
        balanceDue: newOutstanding,
      };
      setSupplier(updatedSupplier);
      await supplierService.update(supplier!.id, { balanceDue: newOutstanding });

      success('Payment Recorded', `Successfully settled ${formatCurrency(enteredAmount)} to ${supplier?.companyName}.`);
      setShowPaymentModal(false);
      setSettlementForm({
        amount: '',
        paymentMethod: 'Bank Transfer',
        reference: '',
        bankName: 'Commercial Bank',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
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
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <DollarSign size={14} /> Settle Payment
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
                {totalOutstanding > 0 ? 'Pending supplier settlement' : 'All purchases settled'}
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

            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <DollarSign size={13} /> Settle Due Balance
            </button>
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
                      const isMenuOpen = activeMenuId === po.id;
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
                            {po.poDate}
                          </td>
                          <td className="p-3 text-gray-300 font-mono">
                            {po.expectedDeliveryDate}
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
                            <div className="relative flex justify-end">
                              <button
                                onClick={() => setActiveMenuId(isMenuOpen ? null : po.id)}
                                className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#334155] transition"
                              >
                                <MoreVertical size={14} />
                              </button>

                              {isMenuOpen && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-7 z-50 w-40 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl py-1 text-xs text-gray-200 divide-y divide-[#334155] animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <div className="p-1">
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        navigate(`/purchase-orders/${po.id}`);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-600/20 text-gray-200 hover:text-purple-300 transition text-left"
                                    >
                                      <Eye size={13} className="text-purple-400" />
                                      <span>View PO Details</span>
                                    </button>

                                    {po.paymentStatus !== 'paid' && (
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setSettlementForm(prev => ({
                                            ...prev,
                                            amount: po.totalAmount.toString(),
                                            notes: `Payment settlement for ${po.poNumber}`,
                                          }));
                                          setShowPaymentModal(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition text-left font-medium"
                                      >
                                        <DollarSign size={13} />
                                        <span>Settle PO</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
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
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Settle Supplier Payment</span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Recording payment to <strong className="text-white">{supplier.companyName}</strong> ({supplier.supplierCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#1e293b]/60 p-4 rounded-xl border border-[#334155]">
                {/* Payment Amount */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Settlement Amount (LKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-emerald-400 font-bold">
                      LKR
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={settlementForm.amount}
                      onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-xl pl-12 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      autoFocus
                    />
                  </div>
                  {totalOutstanding > 0 && (
                    <div className="flex justify-between items-center mt-1 text-[11px]">
                      <span className="text-gray-400">Total Outstanding:</span>
                      <button
                        type="button"
                        onClick={() => setSettlementForm({ ...settlementForm, amount: totalOutstanding.toString() })}
                        className="text-emerald-400 hover:underline font-mono font-semibold"
                      >
                        {formatCurrency(totalOutstanding)} (Settle Full)
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={settlementForm.paymentMethod}
                    onChange={(e) => setSettlementForm({ ...settlementForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={settlementForm.date}
                    onChange={(e) => setSettlementForm({ ...settlementForm, date: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Cheque / Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-88902 or Cheque No"
                    value={settlementForm.reference}
                    onChange={(e) => setSettlementForm({ ...settlementForm, reference: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Commercial Bank, HNB"
                    value={settlementForm.bankName}
                    onChange={(e) => setSettlementForm({ ...settlementForm, bankName: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Settlement for invoice INV-1002"
                    value={settlementForm.notes}
                    onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessingPayment}
                  className="px-4 py-2 border border-[#334155] rounded-xl text-xs font-semibold text-gray-300 hover:bg-[#1e293b] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={isProcessingPayment || enteredAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      <span>Confirm Settlement ({formatCurrency(enteredAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default SupplierDetails;
