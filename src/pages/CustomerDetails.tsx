import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { StatusBadge, ActionMenu, useToast } from '../components/erp';
import { invoiceService } from '../services/InvoiceService';
import { financeService } from '../services/FinanceService';
import { orderService } from '../services/OrderService';
import type { Customer } from '../types/customers';
import { extractCityFromAddress } from '../types/customers';
import type { InvoiceResponse, InvoicePaymentRecord, PaymentMethodType } from '../types/invoice';
import type { Order } from '../types/orders';
import { getInvoiceCalculatedStatus, PaymentMethod } from '../types/invoice';
import InvoiceViewModal from '../components/invoice/InvoiceViewModal';
import RecordPaymentModal, { type RecordPaymentResult } from '../components/RecordPaymentModal';
import {
  Building2,
  Phone,
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  Clock,
  CheckCircle,
  FileText,
  UserCheck,
  MapPin,
  Eye,
  X,
  History,
  ShieldCheck
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../utils/whatsapp';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [customer, setCustomer] = useState<Customer | undefined>(undefined);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'due_soon' | 'partially_paid' | 'paid' | 'payments' | 'orders'>('all');

  // Modal states
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceResponse | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);
  const [showIndividualPaymentModal, setShowIndividualPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Bulk Payment Form State
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    amount: '',
    paymentMethod: PaymentMethod.CHEQUE as PaymentMethodType,
    reference: '',
    bankName: 'Commercial Bank',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch customer and their invoices
  const loadCustomerData = useCallback(async () => {
    try {
      const allCustomers = await invoiceService.getAllCustomers();
      const foundCustomer = allCustomers.find((c: any) => c.id === id);
      setCustomer(foundCustomer as any);

      const [allInvoices, allOrders] = await Promise.all([
        invoiceService.getAll(),
        orderService.getAll().catch(() => []),
      ]);
      setOrders(allOrders);

      const customerInvoices = allInvoices.filter((inv) => {
        const invCustId = (inv.customer as any)?.id || inv.customer;
        const invCustName = (inv.customer as any)?.fullName || (inv.customer as any)?.shopName || inv.customer;
        const targetName = foundCustomer?.shopName || foundCustomer?.fullName;
        const targetId = foundCustomer?.id || foundCustomer?.customerCode;

        return (
          invCustId === targetId ||
          invCustId === foundCustomer?.id ||
          invCustName === targetName
        );
      });

      setInvoices(customerInvoices);
    } catch (err) {
      console.error('Failed to load customer details:', err);
    }
  }, [id]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // Enrich invoices with calculated status & breakdown
  const trackedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      const calc = getInvoiceCalculatedStatus(inv);
      const today = new Date();
      const dueDate = new Date(inv.dueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...inv,
        calculatedStatus: calc.status,
        effectivePaidAmount: calc.paidAmount,
        effectiveRemainingAmount: calc.remainingAmount,
        diffDays,
      };
    });
  }, [invoices]);

  // Categorization
  const overdueInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'overdue'), [trackedInvoices]);
  const dueSoonInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'due_soon'), [trackedInvoices]);
  const partiallyPaidInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'partially_paid'), [trackedInvoices]);
  const paidInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'paid'), [trackedInvoices]);

  // Aggregate stats
  const totalInvoicedAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0), [trackedInvoices]);
  const totalPaidAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.effectivePaidAmount, 0), [trackedInvoices]);
  const totalOutstandingAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.effectiveRemainingAmount, 0), [trackedInvoices]);

  // Payment history ledger
  const paymentHistoryRecords = useMemo(() => {
    const records: Array<InvoicePaymentRecord & { invoiceNumber: string }> = [];
    trackedInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(p => {
          records.push({
            ...p,
            invoiceNumber: inv.invoiceNumber,
          });
        });
      }
    });
    return records.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [trackedInvoices]);

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return orders.filter(
      (o) => o.customerId === customer.id || o.customerName === (customer.shopName || customer.fullName)
    );
  }, [customer, orders]);

  // Filtered invoices by active tab
  const filteredInvoices = useMemo(() => {
    if (activeTab === 'overdue') return overdueInvoices;
    if (activeTab === 'due_soon') return dueSoonInvoices;
    if (activeTab === 'partially_paid') return partiallyPaidInvoices;
    if (activeTab === 'paid') return paidInvoices;
    return trackedInvoices;
  }, [trackedInvoices, overdueInvoices, dueSoonInvoices, partiallyPaidInvoices, paidInvoices, activeTab]);

  // Credit Utilization
  const creditLimit = customer?.creditLimit || 1000000;
  const creditUtilization = creditLimit > 0
    ? Math.min(100, Math.round((totalOutstandingAmount / creditLimit) * 100))
    : 0;

  // ----------------------------------------------------
  // FIFO AUTO-ALLOCATION FOR BULK PAYMENT
  // ----------------------------------------------------
  const enteredAmount = Math.max(0, parseFloat(bulkPaymentForm.amount) || 0);

  const bulkAllocations = useMemo(() => {
    if (enteredAmount <= 0) return [];

    const unpaidInvoices = trackedInvoices
      .filter((i) => i.effectiveRemainingAmount > 0)
      .sort((a, b) => {
        const dueA = new Date(a.dueDate).getTime();
        const dueB = new Date(b.dueDate).getTime();
        return dueA - dueB;
      });

    let remainingPayment = enteredAmount;

    return unpaidInvoices.map((inv) => {
      const needed = inv.effectiveRemainingAmount;
      let allocated = 0;

      if (remainingPayment >= needed) {
        allocated = needed;
        remainingPayment -= needed;
      } else if (remainingPayment > 0) {
        allocated = remainingPayment;
        remainingPayment = 0;
      }

      const newPaid = inv.effectivePaidAmount + allocated;
      const newRemaining = Math.max(0, inv.totalAmount - newPaid);
      let newStatus: 'paid' | 'partially_paid' | 'outstanding' | 'overdue' | 'due_soon' = 'outstanding';

      if (newRemaining <= 0) {
        newStatus = 'paid';
      } else if (newPaid > 0) {
        newStatus = inv.diffDays < 0 ? 'overdue' : inv.diffDays <= 7 ? 'due_soon' : 'partially_paid';
      } else {
        newStatus = inv.diffDays < 0 ? 'overdue' : inv.diffDays <= 7 ? 'due_soon' : 'outstanding';
      }

      return {
        invoice: inv,
        allocated,
        newPaid,
        newRemaining,
        newStatus,
      };
    });
  }, [trackedInvoices, enteredAmount]);

  const totalAllocated = useMemo(() => {
    return bulkAllocations.reduce((sum, item) => sum + item.allocated, 0);
  }, [bulkAllocations]);

  const unallocatedSurplus = Math.max(0, enteredAmount - totalAllocated);

  const handleIndividualPaymentSubmit = async (result: RecordPaymentResult) => {
    if (!selectedInvoiceForPayment) return;
    setIsProcessingPayment(true);
    try {
      const transactionId = await financeService.getNextId();
      await financeService.create({
        transactionNumber: transactionId,
        transactionDate: new Date(result.transactionDate).toISOString(),
        transactionType: 'payment',
        paymentMethod: result.method,
        bankName: result.bankName || undefined,
        transactionRef: result.transactionRef,
        amount: result.amount,
        invoiceId: selectedInvoiceForPayment.id,
        invoiceNumber: selectedInvoiceForPayment.invoiceNumber,
      });

      const isFull = Math.abs(result.amount - selectedInvoiceForPayment.effectiveRemainingAmount) < 0.01;
      const newStatus = isFull ? 'completed' : 'partially_paid';
      const newPaid = (selectedInvoiceForPayment.paidAmount || 0) + result.amount;
      const newRemaining = Math.max(0, selectedInvoiceForPayment.totalAmount - newPaid);

      await Promise.allSettled([
        invoiceService.update(selectedInvoiceForPayment.id, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          paymentStatus: newStatus as any,
        }),
        invoiceService.updatePaymentStatus(selectedInvoiceForPayment.id, newStatus as any),
      ]);

      success(
        'Payment Recorded',
        `Successfully recorded payment of ${formatCurrency(result.amount)} for invoice ${selectedInvoiceForPayment.invoiceNumber}.`
      );
      setShowIndividualPaymentModal(false);
      setSelectedInvoiceForPayment(null);
      await loadCustomerData();
    } catch (err: any) {
      toastError('Payment Failed', err?.message || 'Failed to record payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmBulkPayment = async () => {
    if (enteredAmount <= 0) {
      toastError('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (bulkAllocations.length === 0 || totalAllocated <= 0) {
      toastError('No Unpaid Invoices', 'There are no outstanding invoices to apply this payment.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const transactionId = await financeService.getNextId();
      const allocatedItems = bulkAllocations.filter((a) => a.allocated > 0);

      // 1. Record finance transaction
      await financeService.create({
        transactionNumber: transactionId,
        transactionDate: new Date(bulkPaymentForm.date).toISOString(),
        transactionType: 'payment',
        paymentMethod: bulkPaymentForm.paymentMethod === 'cheque' ? 'cheque' : 'bank_transfer',
        bankName: bulkPaymentForm.bankName || undefined,
        transactionRef: bulkPaymentForm.reference || undefined,
        amount: totalAllocated,
        invoiceId: allocatedItems[0]?.invoice.id,
        invoiceNumber: allocatedItems.length === 1
          ? allocatedItems[0].invoice.invoiceNumber
          : `BULK-${customer?.customerCode || 'PAY'}`,
      });

      // 2. Persist updated payment status & amounts on each allocated invoice
      for (const alloc of allocatedItems) {
        const statusToSet = alloc.newStatus === 'paid' ? 'completed' : 'partially_paid';
        await Promise.allSettled([
          invoiceService.update(alloc.invoice.id, {
            paidAmount: alloc.newPaid,
            remainingAmount: alloc.newRemaining,
            paymentStatus: statusToSet as any,
          }),
          invoiceService.updatePaymentStatus(alloc.invoice.id, statusToSet as any),
        ]);
      }

      // 3. Reload complete customer profile & invoices
      await loadCustomerData();

      success(
        'Payment Recorded Successfully',
        `Allocated ${formatCurrency(totalAllocated)} across ${allocatedItems.length} invoice(s).`
      );

      setShowBulkPaymentModal(false);
      setBulkPaymentForm({
        amount: '',
        paymentMethod: PaymentMethod.CHEQUE,
        reference: '',
        bankName: 'Commercial Bank',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err: any) {
      toastError('Payment Failed', err?.message || 'Failed to record bulk payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${Math.round(amount).toLocaleString('en-US')}/=`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (!customer) {
    return (
      <AppLayout 
        headerIcon={<Building2 size={20} className="text-blue-400" />}
        headerTitle="Customer Profile"
      >
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-600" />
          <p className="text-slate-400">Customer account not found.</p>
          <button
            onClick={() => navigate('/customers')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Back to Customers Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  const city = customer.city || extractCityFromAddress(customer.address);
  const repName = customer.salesRepName || customer.salesRep?.fullName || 'Unassigned';

  return (
    <AppLayout
      headerIcon={<Building2 size={20} className="text-blue-400" />}
      headerTitle="Customer Details"
      headerSubtitle={customer.customerCode}
      headerRight={
        <button
          onClick={() => navigate('/customers')}
          className="px-3 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft size={13} /> Back to Customers
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
            onClick={() => navigate('/customers')} 
            className="hover:text-blue-400 transition"
          >
            Customers
          </button>
          <span>/</span>
          <span className="text-slate-200 font-medium truncate max-w-[200px]">
            {customer.shopName}
          </span>
        </div>

        {/* ── Clean & Minimal Header Banner ── */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Customer Identity & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {customer.shopName}
                </h1>
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                  {customer.customerCode}
                </span>
                <StatusBadge status={customer.status} />
              </div>

              {/* Subtitle Details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
                {customer.contactPerson && (
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">Contact:</span>
                    <strong className="text-white">{customer.contactPerson}</strong>
                  </span>
                )}

                <div className="flex items-center gap-1 text-gray-300">
                  <MapPin size={13} className="text-blue-400 shrink-0" />
                  <span>{customer.address}</span>
                  {city && (
                    <span className="ml-1 px-1.5 py-0.2 rounded bg-[#0f172a] text-[10px] text-gray-300 border border-[#334155]">
                      {city}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-purple-300">
                  <UserCheck size={13} className="text-purple-400 shrink-0" />
                  <span>Sales Rep: <strong className="text-white">{repName}</strong></span>
                </div>
              </div>

              {/* Phone & WhatsApp Links */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber(customer.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-semibold transition"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle size={13} />
                  <span>{customer.phone}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-sans">WhatsApp</span>
                </a>

                {customer.phone2 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                    <Phone size={11} className="text-gray-400" /> {customer.phone2}
                  </span>
                )}

                {customer.phone3 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                    <Phone size={11} className="text-gray-400" /> {customer.phone3}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#334155]">
              <button
                onClick={() => navigate('/customers')}
                className="px-3.5 py-2 border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <button
                onClick={() => setShowBulkPaymentModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
              >
                <DollarSign size={14} /> Record Payment
              </button>
            </div>
          </div>
        </div>

        {/* ── 4 Minimal KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Invoiced */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-lg font-bold font-mono text-white mt-0.5 tracking-tight truncate">
                {formatCurrency(totalInvoicedAmount)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{trackedInvoices.length} invoices generated</p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-blue-400 shrink-0">
              <FileText size={18} />
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Total Paid Amount</p>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tracking-tight truncate">
                {formatCurrency(totalPaidAmount)}
              </p>
              <p className="text-[11px] text-emerald-500/80 mt-0.5">{paidInvoices.length} fully settled invoices</p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-emerald-400 shrink-0">
              <CheckCircle size={18} />
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Outstanding</p>
              <p className={`text-lg font-bold font-mono mt-0.5 tracking-tight truncate ${totalOutstandingAmount > 0 ? 'text-amber-400' : 'text-gray-200'}`}>
                {formatCurrency(totalOutstandingAmount)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue invoices` : 'No overdue invoices'}
              </p>
            </div>
            <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-amber-400 shrink-0">
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Credit Limit & Availability */}
          <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">Credit Available</span>
              <span className="font-mono text-[11px] text-purple-400 font-bold">{creditUtilization}% Used</span>
            </div>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {formatCurrency(Math.max(0, creditLimit - totalOutstandingAmount))}
            </p>
            <div className="w-full bg-[#0f172a] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#334155]">
              <div
                className={`h-full rounded-full transition-all ${
                  creditUtilization > 85 ? 'bg-red-500' : creditUtilization > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${creditUtilization}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Limit: {formatCurrency(creditLimit)}</span>
          </div>
        </div>

        {/* ── Overdue Warning Banner (Clean) ── */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-300">
                  {overdueInvoices.length} Overdue Invoice(s) Exceeded Payment Terms
                </h4>
                <p className="text-[11px] text-red-400">
                  Total {formatCurrency(overdueInvoices.reduce((s, i) => s + i.effectiveRemainingAmount, 0))} is past the due date.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition"
            >
              Filter Overdue ({overdueInvoices.length})
            </button>
          </div>
        )}

        {/* ── Main Tabbed Content ── */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl overflow-hidden shadow-sm">
          {/* Minimal Tab Filter Bar */}
          <div className="p-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-2 bg-[#0f172a]">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: 'All Invoices', count: trackedInvoices.length },
                { id: 'overdue', label: 'overdue', count: overdueInvoices.length, color: 'text-red-400' },
                { id: 'due_soon', label: 'due_soon', count: dueSoonInvoices.length, color: 'text-amber-400' },
                { id: 'partially_paid', label: 'partially_paid', count: partiallyPaidInvoices.length, color: 'text-purple-400' },
                { id: 'paid', label: 'paid', count: paidInvoices.length, color: 'text-emerald-400' },
                { id: 'payments', label: 'Payment Ledger', count: paymentHistoryRecords.length, icon: History },
                { id: 'orders', label: 'Orders', count: customerOrders.length, icon: ShoppingBag },
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

          {/* Invoices Table */}
          {activeTab !== 'payments' && activeTab !== 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a]/60 text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Due Date & Terms</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3 text-right">Paid Amount</th>
                    <th className="p-3 text-right">Remaining</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-gray-500">
                        <FileText size={22} className="mx-auto mb-2 opacity-40" />
                        No invoices found in this category.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      return (
                        <tr 
                          key={inv.id}
                          className="hover:bg-[#1e293b]/70 transition cursor-pointer"
                          onClick={() => setSelectedInvoiceForView(inv)}
                        >
                          <td className="p-3 font-mono font-bold text-blue-400">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3 text-gray-300 font-mono">
                            {formatDate(inv.issueDate)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-gray-300">{formatDate(inv.dueDate)}</span>
                              {inv.calculatedStatus === 'overdue' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  {Math.abs(inv.diffDays)}d overdue
                                </span>
                              )}
                              {inv.calculatedStatus === 'due_soon' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  due in {inv.diffDays}d
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-gray-100">
                            {formatCurrency(inv.totalAmount)}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold text-emerald-400">
                            {formatCurrency(inv.effectivePaidAmount)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-400">
                            {formatCurrency(inv.effectiveRemainingAmount)}
                          </td>
                          <td className="p-3 text-center">
                            {inv.calculatedStatus === 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle size={10} /> Paid
                              </span>
                            )}
                            {inv.calculatedStatus === 'partially_paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Clock size={10} /> Partially Paid
                              </span>
                            )}
                            {inv.calculatedStatus === 'overdue' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                <AlertTriangle size={10} /> Overdue
                              </span>
                            )}
                            {inv.calculatedStatus === 'due_soon' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock size={10} /> Due Soon
                              </span>
                            )}
                            {inv.calculatedStatus === 'outstanding' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0f172a] text-gray-300 border border-[#334155]">
                                Outstanding
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              <ActionMenu
                                title="Invoice actions"
                                items={[
                                  {
                                    label: 'View Invoice PDF',
                                    icon: <Eye size={13} />,
                                    variant: 'blue',
                                    onClick: () => setSelectedInvoiceForView(inv),
                                  },
                                  ...(inv.effectiveRemainingAmount > 0
                                    ? [
                                        {
                                          label: 'Pay Remaining',
                                          icon: <DollarSign size={13} />,
                                          variant: 'emerald' as const,
                                          onClick: () => {
                                            setSelectedInvoiceForPayment(inv);
                                            setShowIndividualPaymentModal(true);
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

          {/* Payment Ledger History */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a]/60 text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Invoice Ref</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Reference / Bank</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40">
                  {paymentHistoryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">
                        <History size={22} className="mx-auto mb-2 opacity-40" />
                        No payments recorded yet for this customer.
                      </td>
                    </tr>
                  ) : (
                    paymentHistoryRecords.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-[#1e293b]/70 transition">
                        <td className="p-3 font-mono text-gray-300">{formatDate(p.paidAt)}</td>
                        <td className="p-3 font-mono text-cyan-400 font-semibold">{p.id || `TXN-${idx + 1}`}</td>
                        <td className="p-3 font-mono text-blue-400 font-bold">{p.invoiceNumber}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {p.paymentMethod || (p as any).method || 'Payment'}
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

          {/* Orders History */}
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a]/60 text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Salesman</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Payment Status</th>
                    <th className="p-3 text-center">Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/40">
                  {customerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-500">
                        <ShoppingBag size={22} className="mx-auto mb-2 opacity-40" />
                        No orders recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerOrders.map((ord: Order) => (
                      <tr 
                        key={ord.id} 
                        onClick={() => navigate(`/orders/${ord.id}`)}
                        className="hover:bg-[#1e293b]/70 transition cursor-pointer"
                      >
                        <td className="p-3 font-mono font-bold text-blue-400">{ord.orderNumber}</td>
                        <td className="p-3 font-mono text-gray-300">{ord.orderDate}</td>
                        <td className="p-3 text-gray-300">{typeof ord.salesman === 'object' && ord.salesman ? ord.salesman.fullName : (ord.salesman || '—')}</td>
                        <td className="p-3 text-right font-mono font-semibold">{ord.numberOfProducts}</td>
                        <td className="p-3 text-right font-mono font-bold text-gray-100">{formatCurrency(ord.grandTotal)}</td>
                        <td className="p-3 text-center"><StatusBadge status={ord.paymentStatus} /></td>
                        <td className="p-3 text-center"><StatusBadge status={ord.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── BULK PAYMENT & AUTO-ALLOCATION MODAL ── */}
      {showBulkPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Record Customer Payment</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                      FIFO Auto-Allocation
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Applying payment for <strong className="text-white">{customer.shopName}</strong> ({customer.customerCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkPaymentModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-[#1e293b]/60 p-4 rounded-xl border border-[#334155]">
                {/* Payment Amount */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Payment Amount (LKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-emerald-400 font-bold">
                      LKR
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={bulkPaymentForm.amount}
                      onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, amount: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-xl pl-12 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[11px]">
                    <span className="text-gray-400">Total Due:</span>
                    <button
                      type="button"
                      onClick={() => setBulkPaymentForm({ ...bulkPaymentForm, amount: totalOutstandingAmount.toString() })}
                      className="text-emerald-400 hover:underline font-mono font-semibold"
                    >
                      {formatCurrency(totalOutstandingAmount)} (Pay Full)
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={bulkPaymentForm.paymentMethod}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentMethod: e.target.value as PaymentMethodType })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value={PaymentMethod.CHEQUE}>Cheque</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                    <option value={PaymentMethod.CASH}>Cash</option>
                    <option value={PaymentMethod.CARD}>Credit / Debit Card</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={bulkPaymentForm.date}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, date: e.target.value })}
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
                    placeholder="e.g. CHQ-889201"
                    value={bulkPaymentForm.reference}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, reference: e.target.value })}
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
                    placeholder="e.g. Commercial Bank"
                    value={bulkPaymentForm.bankName}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, bankName: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Partial settlement"
                    value={bulkPaymentForm.notes}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, notes: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* FIFO Distribution Breakdown */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    FIFO Allocation Preview
                  </h3>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Allocated: {formatCurrency(totalAllocated)}
                    </span>
                    {unallocatedSurplus > 0 && (
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Surplus: {formatCurrency(unallocatedSurplus)}
                      </span>
                    )}
                  </div>
                </div>

                {bulkAllocations.length === 0 ? (
                  <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-6 text-center text-gray-400 text-xs">
                    Enter an amount above to preview how it will be allocated across outstanding invoices.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#334155] rounded-xl">
                    <table className="w-full text-xs text-left bg-[#0f172a]">
                      <thead>
                        <tr className="border-b border-[#334155] bg-[#1e293b] text-gray-400 uppercase tracking-wider">
                          <th className="p-2.5">Invoice ID</th>
                          <th className="p-2.5">Due Date</th>
                          <th className="p-2.5 text-right">Total Amount</th>
                          <th className="p-2.5 text-right">Previously Paid</th>
                          <th className="p-2.5 text-right text-emerald-400">Allocated Now</th>
                          <th className="p-2.5 text-right">New Remaining</th>
                          <th className="p-2.5 text-center">New Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]/40">
                        {bulkAllocations.map((alloc) => {
                          const isAllocated = alloc.allocated > 0;
                          return (
                            <tr
                              key={alloc.invoice.id}
                              className={isAllocated ? 'bg-emerald-950/10' : 'opacity-60'}
                            >
                              <td className="p-2.5 font-mono font-bold text-blue-400">
                                {alloc.invoice.invoiceNumber}
                              </td>
                              <td className="p-2.5 font-mono text-gray-300">
                                {formatDate(alloc.invoice.dueDate)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-gray-300">
                                {formatCurrency(alloc.invoice.totalAmount)}
                              </td>
                              <td className="p-2.5 text-right font-mono text-gray-400">
                                {formatCurrency(alloc.invoice.effectivePaidAmount)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                {alloc.allocated > 0 ? `+${formatCurrency(alloc.allocated)}` : '—'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-gray-200">
                                {formatCurrency(alloc.newRemaining)}
                              </td>
                              <td className="p-2.5 text-center">
                                {alloc.newStatus === 'paid' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Paid
                                  </span>
                                )}
                                {alloc.newStatus === 'partially_paid' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    Partially Paid
                                  </span>
                                )}
                                {alloc.newStatus === 'overdue' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                    Overdue
                                  </span>
                                )}
                                {alloc.newStatus === 'due_soon' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Due Soon
                                  </span>
                                )}
                                {alloc.newStatus === 'outstanding' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1e293b] text-gray-400 border border-[#334155]">
                                    Outstanding
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setShowBulkPaymentModal(false)}
                  disabled={isProcessingPayment}
                  className="px-4 py-2 border border-[#334155] rounded-xl text-xs font-semibold text-gray-300 hover:bg-[#1e293b] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkPayment}
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
                      <span>Confirm & Record Payment ({formatCurrency(enteredAmount)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice View Modal ── */}
      {selectedInvoiceForView && (
        <InvoiceViewModal
          isOpen={!!selectedInvoiceForView}
          onClose={() => setSelectedInvoiceForView(null)}
          invoiceData={{
            ...selectedInvoiceForView,
            salesman: selectedInvoiceForView.salesman || (selectedInvoiceForView.salesmanName
              ? { id: '', name: selectedInvoiceForView.salesmanName }
              : null),
            customer: selectedInvoiceForView.customer?.id || '',
            customerDetails: selectedInvoiceForView.customer ?? undefined,
            items: selectedInvoiceForView.items.map(item => ({
              id: item.id || Math.random().toString(),
              inventoryItemId: item.inventoryItemId || item.itemCode || '',
              itemName: item.itemName || item.inventoryItem?.productName || 'Product',
              itemCode: item.itemCode || item.inventoryItem?.productCode || '',
              discount: item.discount || 0,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
            discountPercentage: selectedInvoiceForView.discount > 0 && selectedInvoiceForView.subTotal > 0
              ? (selectedInvoiceForView.discount / selectedInvoiceForView.subTotal) * 100
              : 0,
            applyVat: selectedInvoiceForView.applyVat || false,
            vatAmount: selectedInvoiceForView.vatAmount || 0,
            taxRate: selectedInvoiceForView.taxRate || 0,
          }}
        />
      )}

      {/* ── Individual Invoice Record Payment Modal ── */}
      <RecordPaymentModal
        isOpen={showIndividualPaymentModal}
        onClose={() => {
          setShowIndividualPaymentModal(false);
          setSelectedInvoiceForPayment(null);
        }}
        onConfirm={handleIndividualPaymentSubmit}
        isProcessing={isProcessingPayment}
        documentNumber={selectedInvoiceForPayment?.invoiceNumber ?? ''}
        partyName={customer?.shopName || customer?.fullName || ''}
        totalAmount={selectedInvoiceForPayment?.totalAmount ?? 0}
        paidAmount={selectedInvoiceForPayment?.effectivePaidAmount ?? 0}
        remainingAmount={selectedInvoiceForPayment?.effectiveRemainingAmount ?? 0}
        mode="invoice"
      />
    </AppLayout>
  );
};

export default CustomerDetails;
