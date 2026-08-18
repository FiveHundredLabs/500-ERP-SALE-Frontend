import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PageHeader, StatusBadge, useToast } from '../components/erp';
import { mockCustomers } from '../data/mockCustomers';
import { mockInvoicesList } from '../data/mockInvoices';
import { mockOrders } from '../data/mockOrders';
import { invoiceService } from '../services/InvoiceService';
import { financeService } from '../services/FinanceService';
import type { Customer } from '../types/customers';
import { extractCityFromAddress } from '../types/customers';
import type { InvoiceResponse, InvoicePaymentRecord, PaymentMethodType } from '../types/invoice';
import { getInvoiceCalculatedStatus, PaymentMethod } from '../types/invoice';
import InvoiceViewModal from '../components/invoice/InvoiceViewModal';
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
  MoreVertical,
  Eye,
  PlusCircle,
  Sparkles,
  X,
  History
} from 'lucide-react';
import { cleanWhatsAppNumber } from '../utils/whatsapp';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [customer, setCustomer] = useState<Customer | undefined>(() =>
    mockCustomers.find((c) => c.id === id || c.customerId === id)
  );

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'overdue' | 'due_soon' | 'partially_paid' | 'paid' | 'payments' | 'orders'>('all');

  // Modal states
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<InvoiceResponse | null>(null);
  const [activeInvoiceMenuId, setActiveInvoiceMenuId] = useState<string | null>(null);
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

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveInvoiceMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch customer and their invoices
  useEffect(() => {
    const loadCustomerData = async () => {
      setLoading(true);
      try {
        const foundCustomer = mockCustomers.find((c) => c.id === id || c.customerId === id);
        setCustomer(foundCustomer);

        const allInvoices = await invoiceService.getAll();
        const customerInvoices = allInvoices.filter((inv) => {
          const invCustId = inv.customer?._id || (inv.customer as any)?.id;
          const invCustName = inv.customer?.fullName || (inv.customer as any)?.shopName;
          const targetName = foundCustomer?.shopName || foundCustomer?.businessName;
          const targetId = foundCustomer?.customerId || foundCustomer?.id;

          return (
            invCustId === targetId ||
            invCustId === foundCustomer?.id ||
            invCustName === targetName
          );
        });

        // If no API invoices found, fallback to mock list for this customer
        if (customerInvoices.length > 0) {
          setInvoices(customerInvoices);
        } else {
          const mockMatch = mockInvoicesList.filter(
            (inv) =>
              inv.customer?.fullName === (foundCustomer?.shopName || foundCustomer?.businessName) ||
              inv.customer?.customerCode === foundCustomer?.customerId
          );
          setInvoices(mockMatch.length > 0 ? mockMatch : mockInvoicesList.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load customer details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [id]);

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
        calculatedStatus: calc.calculatedStatus,
        effectivePaidAmount: calc.paidAmount,
        effectiveRemainingAmount: calc.remainingAmount,
        diffDays,
      };
    });
  }, [invoices]);

  // Invoice categorization
  const overdueInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'Overdue'), [trackedInvoices]);
  const dueSoonInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'Due Soon'), [trackedInvoices]);
  const partiallyPaidInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'Partially Paid'), [trackedInvoices]);
  const paidInvoices = useMemo(() => trackedInvoices.filter(i => i.calculatedStatus === 'Paid'), [trackedInvoices]);

  // Aggregate financial statistics
  const totalInvoicedAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.totalAmount, 0), [trackedInvoices]);
  const totalPaidAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.effectivePaidAmount, 0), [trackedInvoices]);
  const totalOutstandingAmount = useMemo(() => trackedInvoices.reduce((sum, i) => sum + i.effectiveRemainingAmount, 0), [trackedInvoices]);

  // All payment history records for this customer
  const paymentHistoryRecords = useMemo(() => {
    const records: Array<InvoicePaymentRecord & { invoiceId: string }> = [];
    trackedInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach(p => {
          records.push({
            ...p,
            invoiceId: inv.invoiceId,
          });
        });
      }
    });
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trackedInvoices]);

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return mockOrders.filter(
      (o) => o.customerId === customer.customerId || o.customerName === (customer.shopName || customer.businessName)
    );
  }, [customer]);

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
  // FIFO AUTO-ALLOCATION CALCULATION FOR BULK PAYMENT
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
      let newStatus: 'Paid' | 'Partially Paid' | 'Outstanding' | 'Overdue' | 'Due Soon' = 'Outstanding';

      if (newRemaining <= 0) {
        newStatus = 'Paid';
      } else if (newPaid > 0) {
        newStatus = inv.diffDays < 0 ? 'Overdue' : inv.diffDays <= 7 ? 'Due Soon' : 'Partially Paid';
      } else {
        newStatus = inv.diffDays < 0 ? 'Overdue' : inv.diffDays <= 7 ? 'Due Soon' : 'Outstanding';
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

  // Handle Bulk Payment Submission
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
      const allocationList = bulkAllocations
        .filter((a) => a.allocated > 0)
        .map((a) => ({
          invoiceId: a.invoice._id,
          amount: a.allocated,
        }));

      // 1. Process via InvoiceService
      await invoiceService.recordBulkPayment({
        customerId: customer?.customerId || customer?.id || '',
        customerName: customer?.shopName || customer?.businessName || '',
        totalAmount: totalAllocated,
        paymentMethod: bulkPaymentForm.paymentMethod,
        reference: bulkPaymentForm.reference,
        bankName: bulkPaymentForm.bankName,
        paymentDate: bulkPaymentForm.date,
        notes: bulkPaymentForm.notes,
        allocations: allocationList,
      });

      // 2. Also register in Finance Transactions
      await financeService.create({
        type: 'Payment',
        amount: totalAllocated,
        category: 'Customer Invoice Settlement',
        description: `Settlement for ${customer?.shopName || customer?.businessName} (${allocationList.length} invoices)`,
        paymentMethod: bulkPaymentForm.paymentMethod,
        reference: bulkPaymentForm.reference || `REC-${Date.now()}`,
        bankName: bulkPaymentForm.bankName,
        date: bulkPaymentForm.date,
        party: customer?.shopName || customer?.businessName || 'Customer',
        partyType: 'Customer',
      });

      // 3. Update local state
      const updatedInvoicesList = await invoiceService.getAll();
      const matching = updatedInvoicesList.filter((inv) => {
        const invCustName = inv.customer?.fullName || (inv.customer as any)?.shopName;
        const targetName = customer?.shopName || customer?.businessName;
        return invCustName === targetName;
      });
      setInvoices(matching);

      // 4. Update customer outstanding balance
      const newOutstanding = matching.reduce((sum, inv) => {
        const c = getInvoiceCalculatedStatus(inv);
        return sum + c.remainingAmount;
      }, 0);

      const updatedCustomer: Customer = {
        ...customer!,
        outstandingBalance: newOutstanding,
        totalPaid: (customer!.totalPaid || 0) + totalAllocated,
      };
      setCustomer(updatedCustomer);
      const cIdx = mockCustomers.findIndex(c => c.id === customer!.id);
      if (cIdx !== -1) {
        mockCustomers[cIdx] = updatedCustomer;
      }

      success(
        'Payment Recorded Successfully',
        `Allocated ${formatCurrency(totalAllocated)} across ${allocationList.length} invoices.`
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
          <p className="text-slate-400">Customer account not found or no customer data available.</p>
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
  const repName = customer.salesRepName || (typeof customer.salesRep === 'object' ? customer.salesRep.name : customer.salesRep) || 'Unassigned';

  return (
    <AppLayout
      headerIcon={<Building2 size={20} className="text-blue-400" />}
      headerTitle={`Customer: ${customer.shopName || customer.businessName}`}
      headerSubtitle={`Customer Code: ${customer.customerId}`}
    >
      <PageHeader
        title={customer.shopName || customer.businessName}
        description={`Customer Account & Financial Profile · ${customer.customerId}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Customers', path: '/customers' },
          { label: customer.shopName || customer.businessName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/customers')}
              className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Customers
            </button>

            <button
              onClick={() => setShowBulkPaymentModal(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <DollarSign size={14} /> Record Bulk Payment
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* ── Top Customer Info Card (Clean Style matching ERP standards) ── */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-5 shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Left: Identity */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                <Building2 size={26} />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
                    {customer.shopName || customer.businessName}
                  </h1>
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-md">
                    {customer.customerId}
                  </span>
                  <StatusBadge status={customer.status} />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300">
                  {customer.contactPerson && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-400">Contact:</span> 
                      <strong className="text-white font-semibold">{customer.contactPerson}</strong>
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <MapPin size={13} className="text-blue-400" />
                    <span>{customer.address}</span>
                    {city && (
                      <span className="ml-1 px-1.5 py-0.2 rounded bg-[#0f172a] text-[10px] text-gray-300 border border-[#334155]">
                        {city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Communication links */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={`https://wa.me/${cleanWhatsAppNumber(customer.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-semibold transition"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle size={13} className="text-emerald-400" />
                    <span>{customer.phone}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-sans">WhatsApp</span>
                  </a>

                  {customer.phone2 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                      <Phone size={11} className="text-gray-400" /> {customer.phone2}
                    </span>
                  )}

                  {customer.phone3 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f172a] text-gray-300 border border-[#334155] text-xs font-mono">
                      <Phone size={11} className="text-gray-400" /> {customer.phone3}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium">
                    <UserCheck size={12} className="text-purple-400" />
                    <span>Sales Rep: <strong className="text-white">{repName}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Button */}
            <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#334155] w-full lg:w-auto">
              <button
                onClick={() => setShowBulkPaymentModal(true)}
                className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-600/20"
              >
                <DollarSign size={15} /> Record Payment (Bulk / Single)
              </button>
              <span className="text-[11px] text-gray-400">Auto-allocates to oldest due invoices</span>
            </div>
          </div>
        </div>

        {/* ── 4 KPI Financial Overview Cards (Style matching OrderDetails and Finance) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Invoiced */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Invoiced</p>
              <p className="text-lg font-bold font-mono text-white mt-0.5 tracking-tight truncate">
                {formatCurrency(totalInvoicedAmount)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">{trackedInvoices.length} invoices generated</p>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-blue-400 shrink-0">
              <FileText size={20} />
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Total Paid Amount</p>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5 tracking-tight truncate">
                {formatCurrency(totalPaidAmount)}
              </p>
              <p className="text-[11px] text-emerald-500/80 mt-0.5">{paidInvoices.length} fully settled invoices</p>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-emerald-400 shrink-0">
              <CheckCircle size={20} />
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Total Outstanding</p>
              <p className={`text-lg font-bold font-mono mt-0.5 tracking-tight truncate ${totalOutstandingAmount > 0 ? 'text-amber-400' : 'text-gray-200'}`}>
                {formatCurrency(totalOutstandingAmount)}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {overdueInvoices.length > 0 ? `${overdueInvoices.length} overdue invoices` : 'No overdue invoices'}
              </p>
            </div>
            <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-lg text-amber-400 shrink-0">
              <AlertTriangle size={20} />
            </div>
          </div>

          {/* Credit Available & Utilization */}
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">Credit Available</span>
              <span className="font-mono text-xs text-purple-400 font-bold">{creditUtilization}% Used</span>
            </div>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {formatCurrency(Math.max(0, creditLimit - totalOutstandingAmount))}
            </p>
            <div className="w-full bg-[#0f172a] h-1.5 rounded-full overflow-hidden mt-2 border border-[#334155]">
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

        {/* ── Status Alert Banners if Overdue ── */}
        {overdueInvoices.length > 0 && (
          <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={18} />
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
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition"
            >
              Filter Overdue ({overdueInvoices.length})
            </button>
          </div>
        )}

        {/* ── Main Tabbed Sections (Invoices, Payment History, Orders) ── */}
        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl overflow-hidden shadow-lg">
          {/* Navigation Filter Tabs */}
          <div className="p-4 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 bg-[#0f172a]">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Invoices', count: trackedInvoices.length, badge: 'bg-[#1e293b] text-gray-300 border-[#334155]' },
                { id: 'overdue', label: 'Overdue', count: overdueInvoices.length, badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
                { id: 'due_soon', label: 'Due Soon (7d)', count: dueSoonInvoices.length, badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                { id: 'partially_paid', label: 'Partially Paid', count: partiallyPaidInvoices.length, badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                { id: 'paid', label: 'Paid / Completed', count: paidInvoices.length, badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                { id: 'payments', label: 'Payment Ledger', count: paymentHistoryRecords.length, icon: History, badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                { id: 'orders', label: 'Orders History', count: customerOrders.length, icon: ShoppingBag, badge: 'bg-[#1e293b] text-gray-400 border-[#334155]' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-gray-400 hover:bg-[#1e293b] hover:text-gray-200'
                    }`}
                  >
                    {IconComponent && <IconComponent size={13} />}
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border ${isActive ? 'bg-blue-700 text-white border-blue-500' : tab.badge}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowBulkPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle size={14} /> Record Payment
            </button>
          </div>

          {/* Tab 1: Invoices Table (All / Overdue / Due Soon / Partial / Paid) */}
          {activeTab !== 'payments' && activeTab !== 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a] text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Due Date & Terms</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3 text-right">Paid Amount</th>
                    <th className="p-3 text-right">Remaining Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500">
                        <FileText size={24} className="mx-auto mb-2 opacity-40" />
                        No invoices found in this category.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isMenuOpen = activeInvoiceMenuId === inv._id;

                      return (
                        <tr 
                          key={inv._id}
                          className="hover:bg-[#1e293b] transition cursor-pointer"
                          onClick={() => setSelectedInvoiceForView(inv)}
                        >
                          <td className="p-3 font-mono font-bold text-blue-400">
                            {inv.invoiceId}
                          </td>
                          <td className="p-3 text-gray-300 font-mono">
                            {formatDate(inv.issueDate)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-gray-300">{formatDate(inv.dueDate)}</span>
                              {inv.calculatedStatus === 'Overdue' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  {Math.abs(inv.diffDays)}d overdue
                                </span>
                              )}
                              {inv.calculatedStatus === 'Due Soon' && (
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
                            {inv.calculatedStatus === 'Paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle size={10} /> Paid
                              </span>
                            )}
                            {inv.calculatedStatus === 'Partially Paid' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Clock size={10} /> Partially Paid
                              </span>
                            )}
                            {inv.calculatedStatus === 'Overdue' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                <AlertTriangle size={10} /> Overdue
                              </span>
                            )}
                            {inv.calculatedStatus === 'Due Soon' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock size={10} /> Due Soon
                              </span>
                            )}
                            {inv.calculatedStatus === 'Outstanding' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0f172a] text-gray-300 border border-[#334155]">
                                Outstanding
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex justify-end">
                              <button
                                onClick={() => setActiveInvoiceMenuId(isMenuOpen ? null : inv._id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#334155] transition"
                                title="Invoice actions"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {isMenuOpen && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-8 z-50 w-44 bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl py-1 text-xs text-gray-200 divide-y divide-[#334155] animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <div className="p-1">
                                    <button
                                      onClick={() => {
                                        setActiveInvoiceMenuId(null);
                                        setSelectedInvoiceForView(inv);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-600/20 text-gray-200 hover:text-blue-300 transition text-left"
                                    >
                                      <Eye size={13} className="text-blue-400" />
                                      <span>View Invoice PDF</span>
                                    </button>

                                    {inv.effectiveRemainingAmount > 0 && (
                                      <button
                                        onClick={() => {
                                          setActiveInvoiceMenuId(null);
                                          setBulkPaymentForm(prev => ({
                                            ...prev,
                                            amount: inv.effectiveRemainingAmount.toString(),
                                            notes: `Payment for ${inv.invoiceId}`,
                                          }));
                                          setShowBulkPaymentModal(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition text-left font-medium"
                                      >
                                        <DollarSign size={13} />
                                        <span>Pay Remaining</span>
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

          {/* Tab 2: Payment Ledger History */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a] text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Invoice Ref</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Bank / Reference</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {paymentHistoryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        <History size={24} className="mx-auto mb-2 opacity-40" />
                        No payments recorded yet for this customer.
                      </td>
                    </tr>
                  ) : (
                    paymentHistoryRecords.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-[#1e293b] transition">
                        <td className="p-3 font-mono text-gray-300">{formatDate(p.date)}</td>
                        <td className="p-3 font-mono text-cyan-400 font-semibold">{p.id || `TXN-${idx + 1}`}</td>
                        <td className="p-3 font-mono text-blue-400 font-bold">{p.invoiceId}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {p.method}
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

          {/* Tab 3: Customer Sales Orders History */}
          {activeTab === 'orders' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#334155] bg-[#0f172a] text-gray-400 uppercase tracking-wider">
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Salesman</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-center">Payment Status</th>
                    <th className="p-3 text-center">Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {customerOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        <ShoppingBag size={24} className="mx-auto mb-2 opacity-40" />
                        No orders recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerOrders.map((ord) => (
                      <tr 
                        key={ord.id} 
                        onClick={() => navigate(`/orders/${ord.id}`)}
                        className="hover:bg-[#1e293b] transition cursor-pointer"
                      >
                        <td className="p-3 font-mono font-bold text-blue-400">{ord.orderId}</td>
                        <td className="p-3 font-mono text-gray-300">{ord.orderDate}</td>
                        <td className="p-3 text-gray-300">{typeof ord.salesman === 'object' && ord.salesman ? ord.salesman.name : (ord.salesman || '—')}</td>
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
          <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/70">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Record Customer Payment</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                      FIFO Auto-Allocation
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Settling invoices for <strong className="text-white">{customer.shopName || customer.businessName}</strong> ({customer.customerId})
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
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#1e293b]/70 p-4 rounded-xl border border-[#334155]">
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
                    <span className="text-gray-400">Total Outstanding:</span>
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
                    placeholder="e.g. CHQ-889201 or Ref ID"
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
                    placeholder="e.g. Commercial Bank, HNB"
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
                    placeholder="e.g. Partial settlement for Q3"
                    value={bulkPaymentForm.notes}
                    onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, notes: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Real-time Allocation Distribution Preview */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      Automatic FIFO Distribution Breakdown
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Payment is auto-distributed in priority order: Overdue &rarr; Due Soon &rarr; Oldest Outstanding
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Allocated: {formatCurrency(totalAllocated)}
                    </span>
                    {unallocatedSurplus > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Surplus / Credit: {formatCurrency(unallocatedSurplus)}
                      </span>
                    )}
                  </div>
                </div>

                {bulkAllocations.length === 0 ? (
                  <div className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-8 text-center text-gray-400 text-xs">
                    Enter a payment amount above to view the automatic distribution breakdown.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#334155] rounded-xl">
                    <table className="w-full text-xs text-left bg-[#0f172a]">
                      <thead>
                        <tr className="border-b border-[#334155] bg-[#1e293b] text-gray-400 uppercase tracking-wider">
                          <th className="p-3">Invoice ID</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3 text-right">Total Amount</th>
                          <th className="p-3 text-right">Previously Paid</th>
                          <th className="p-3 text-right text-emerald-400">Allocated Now</th>
                          <th className="p-3 text-right">New Remaining</th>
                          <th className="p-3 text-center">New Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]/60">
                        {bulkAllocations.map((alloc) => {
                          const isAllocated = alloc.allocated > 0;
                          return (
                            <tr
                              key={alloc.invoice._id}
                              className={isAllocated ? 'bg-emerald-950/10' : 'opacity-60'}
                            >
                              <td className="p-3 font-mono font-bold text-blue-400">
                                {alloc.invoice.invoiceId}
                              </td>
                              <td className="p-3 font-mono text-gray-300">
                                {formatDate(alloc.invoice.dueDate)}
                              </td>
                              <td className="p-3 text-right font-mono text-gray-300">
                                {formatCurrency(alloc.invoice.totalAmount)}
                              </td>
                              <td className="p-3 text-right font-mono text-gray-400">
                                {formatCurrency(alloc.invoice.effectivePaidAmount)}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                {alloc.allocated > 0 ? `+${formatCurrency(alloc.allocated)}` : '—'}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-gray-200">
                                {formatCurrency(alloc.newRemaining)}
                              </td>
                              <td className="p-3 text-center">
                                {alloc.newStatus === 'Paid' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Fully Paid
                                  </span>
                                )}
                                {alloc.newStatus === 'Partially Paid' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    Partially Paid
                                  </span>
                                )}
                                {alloc.newStatus === 'Overdue' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                    Overdue
                                  </span>
                                )}
                                {alloc.newStatus === 'Due Soon' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Due Soon
                                  </span>
                                )}
                                {alloc.newStatus === 'Outstanding' && (
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
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      <span>Confirm & Allocate Payment ({formatCurrency(enteredAmount)})</span>
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
            salesman: typeof selectedInvoiceForView.salesman === 'object' && selectedInvoiceForView.salesman !== null
              ? selectedInvoiceForView.salesman
              : { _id: 'so-001', name: typeof selectedInvoiceForView.salesman === 'string' ? selectedInvoiceForView.salesman : 'Kasun Perera' },
            customer: selectedInvoiceForView.customer?._id || '',
            customerDetails: selectedInvoiceForView.customer,
            items: selectedInvoiceForView.items.map(item => ({
              id: item._id || Math.random().toString(),
              item: typeof item.item === 'object' ? item.item?._id : item.item,
              itemName: typeof item.item === 'object' ? item.item?.product_name || item.item?.itemName : 'Product',
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
    </AppLayout>
  );
};

export default CustomerDetails;
