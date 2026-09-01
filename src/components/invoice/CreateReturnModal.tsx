import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  FileText, 
  Phone, 
  MapPin, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  MessageSquare
} from 'lucide-react';
import { Modal, Button } from '../common';
import type { InvoiceResponse } from '../../types/invoice';
import { invoiceReturnService } from '../../services/InvoiceReturnService';
import { invoiceService } from '../../services/InvoiceService';
import type { InvoiceReturn } from '../../types/invoice-return';
import { useToast } from '../erp/Toast';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoice?: InvoiceResponse | null;
  invoice?: InvoiceResponse | null;
  onSuccess: (newReturn?: InvoiceReturn) => void;
}

const COMMON_REASONS = [
  'Defective / Damaged Item',
  'Wrong Item Delivered',
  'Customer Exchange / Return',
  'Quality Issue',
  'Duplicate Billing',
  'Other (Specify in Remarks)',
];

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  initialInvoice = null,
  invoice = null,
  onSuccess,
}) => {
  const toast = useToast();
  const preloadedInvoice = initialInvoice || invoice;

  // Invoice selection state
  const [allInvoices, setAllInvoices] = useState<InvoiceResponse[]>([]);
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);

  // Return form state
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [pastReturns, setPastReturns] = useState<InvoiceReturn[]>([]);
  const [isFetchingPastReturns, setIsFetchingPastReturns] = useState(false);
  const [returnReason, setReturnReason] = useState('Defective / Damaged Item');
  const [customReason, setCustomReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load invoices on modal open
  useEffect(() => {
    if (isOpen) {
      if (preloadedInvoice) {
        setSelectedInvoice(preloadedInvoice);
      } else {
        setSelectedInvoice(null);
        fetchInvoices();
      }
      setReturnQuantities({});
      setReturnReason('Defective / Damaged Item');
      setCustomReason('');
      setRemarks('');
      setInvoiceSearchQuery('');
    }
  }, [isOpen, preloadedInvoice]);

  // Load past returns when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const invId = selectedInvoice._id || selectedInvoice.invoiceId || selectedInvoice.id || selectedInvoice.invoiceNumber || '';
      fetchPastReturns(invId);
    } else {
      setPastReturns([]);
    }
  }, [selectedInvoice]);

  const fetchInvoices = async () => {
    try {
      setIsFetchingInvoices(true);
      const list = await invoiceService.getAll();
      setAllInvoices(list || []);
    } catch (err: any) {
      toast.error('Failed to load invoices: ' + (err.message || 'Network error'));
    } finally {
      setIsFetchingInvoices(false);
    }
  };

  const fetchPastReturns = async (invoiceId: string) => {
    try {
      setIsFetchingPastReturns(true);
      const returns = await invoiceReturnService.getByInvoiceId(invoiceId);
      setPastReturns(returns.filter(r => r.status !== 'cancelled'));
    } catch (err) {
      console.error('Failed to fetch past returns:', err);
    } finally {
      setIsFetchingPastReturns(false);
    }
  };

  // Filter invoices for live search (search by invoice ID, customer name, customer phone)
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearchQuery.trim()) {
      return allInvoices.slice(0, 10); // Show recent 10 invoices by default
    }

    const q = invoiceSearchQuery.toLowerCase().trim();
    return allInvoices.filter((inv) => {
      const invId = (inv.invoiceId || '').toLowerCase();
      const shopName = (
        typeof inv.customer === 'object' && inv.customer
          ? inv.customer.shopName || inv.customer.fullName || ''
          : ''
      ).toLowerCase();
      const phone = (
        typeof inv.customer === 'object' && inv.customer
          ? inv.customer.phone || inv.customer.phone2 || ''
          : ''
      ).toLowerCase();
      const customerCode = (
        typeof inv.customer === 'object' && inv.customer
          ? inv.customer.customerCode || ''
          : ''
      ).toLowerCase();

      return (
        invId.includes(q) ||
        shopName.includes(q) ||
        phone.includes(q) ||
        customerCode.includes(q)
      );
    });
  }, [allInvoices, invoiceSearchQuery]);

  // Calculate already returned qty for each item
  const getAlreadyReturned = (itemId: string) => {
    let sum = 0;
    pastReturns.forEach((pr) => {
      const match = pr.items.find((i) => {
        const itemObjId = i.inventoryItemId || (i as any).item;
        return itemObjId === itemId;
      });
      if (match) sum += match.quantity;
    });
    return sum;
  };

  const handleQuantityChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(val, maxQty));
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  const handleReturnAll = () => {
    if (!selectedInvoice) return;
    const allQtys: Record<string, number> = {};
    selectedInvoice.items.forEach((item, idx) => {
      const itemId = item.inventoryItemId || (item as any).item || `item-${idx}`;
      const alreadyReturned = getAlreadyReturned(itemId);
      const returnable = Math.max(0, item.quantity - alreadyReturned);
      allQtys[itemId] = returnable;
    });
    setReturnQuantities(allQtys);
  };

  const handleResetQuantities = () => {
    setReturnQuantities({});
  };

  // Calculate total return summary
  const returnSummary = useMemo(() => {
    if (!selectedInvoice) return { totalQty: 0, totalAmount: 0, itemsToReturn: [] };

    let totalQty = 0;
    let rawTotal = 0;

    const itemsToReturn: Array<{
      item: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    selectedInvoice.items.forEach((item, idx) => {
      const itemId = item.inventoryItemId || (item as any).item || `item-${idx}`;
      const itemName =
        (item as any).item?.product_name ||
        (item as any).itemName || 'Item ' + (idx + 1);
      const qty = returnQuantities[itemId] || 0;

      if (qty > 0) {
        const lineTotal = qty * item.unitPrice;
        totalQty += qty;
        rawTotal += lineTotal;
        itemsToReturn.push({
          item: itemId,
          itemName,
          quantity: qty,
          unitPrice: item.unitPrice,
          total: lineTotal,
        });
      }
    });

    // Proportionate invoice discount deduction if applicable
    let finalTotal = rawTotal;
    if (selectedInvoice.discount > 0 && selectedInvoice.subTotal > 0) {
      const discountPct = selectedInvoice.discount / selectedInvoice.subTotal;
      finalTotal = rawTotal - rawTotal * discountPct;
    }

    return { totalQty, totalAmount: finalTotal, itemsToReturn };
  }, [selectedInvoice, returnQuantities]);

  const handleSubmit = async () => {
    if (!selectedInvoice) {
      toast.error('Please select an invoice first');
      return;
    }

    if (returnSummary.totalQty === 0 || returnSummary.itemsToReturn.length === 0) {
      toast.error('Please enter a return quantity for at least one item');
      return;
    }

    const finalReason =
      returnReason === 'Other (Specify in Remarks)'
        ? customReason || remarks || 'Other reason'
        : returnReason;

    if (!finalReason.trim()) {
      toast.error('Please specify a return reason');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        invoiceId: selectedInvoice._id || selectedInvoice.invoiceId || '',
        items: returnSummary.itemsToReturn.map((i) => ({
          inventoryItemId: (i as any).item,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        returnReason: finalReason,
        remarks: remarks.trim() || undefined,
        returnTotal: returnSummary.totalAmount,
      };

      const result = await invoiceReturnService.create(payload);
      toast.success(`Return note ${result.returnNumber || ''} created successfully!`);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create return record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerDisplay = (inv: InvoiceResponse) => {
    if (typeof inv.customer === 'object' && inv.customer) {
      const addr = inv.customer.address;
      const addrStr = typeof addr === 'string' ? addr : (addr ? `${(addr as any).street || ''} ${(addr as any).city || ''}` : '');
      return {
        name: inv.customer.shopName || inv.customer.fullName || 'Customer',
        phone: inv.customer.phone || 'No phone',
        address: addrStr,
        code: inv.customer.customerCode || 'N/A',
      };
    }
    return {
      name: 'Walk-in Customer',
      phone: 'N/A',
      address: '',
      code: 'N/A',
    };
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedInvoice
          ? `Create Return for Invoice ${selectedInvoice.invoiceId}`
          : 'Create Sales Return'
      }
      icon={<RotateCcw className="w-5 h-5 text-amber-400" />}
      size="xl"
      className="max-w-4xl"
    >
      <div className="space-y-6 text-slate-100">
        {/* STEP 1: Invoice Search & Picker (when no invoice is active) */}
        {!selectedInvoice ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Search & Select Original Invoice
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                <input
                  type="text"
                  placeholder="Search by Invoice ID (e.g. INV-...), Customer Name, or Phone (e.g. 071...)..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 shadow-inner transition-all"
                  autoFocus
                />
                {invoiceSearchQuery && (
                  <button
                    onClick={() => setInvoiceSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-md"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Type customer phone number or invoice number to find the sale record instantly.
              </p>
            </div>

            {/* Invoices List */}
            <div className="bg-[#0e1726] border border-[#20293a] rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
              {isFetchingInvoices ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading recent invoices...</span>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="font-medium text-slate-300">No invoices matched your search.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching by complete customer phone number or invoice ID.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1e293b]">
                  {filteredInvoices.map((inv) => {
                    const cust = getCustomerDisplay(inv);
                    const dateVal = (inv as any).issueDate || (inv as any).created_at || (inv as any).createdAt;
                    return (
                      <div
                        key={inv._id || inv.invoiceId}
                        onClick={() => setSelectedInvoice(inv)}
                        className="p-3.5 hover:bg-[#1e293b]/70 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-cyan-400 transition-colors">
                            <FileText className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-cyan-400 text-xs">
                                {inv.invoiceId}
                              </span>
                              <span className="text-xs font-semibold text-slate-200 truncate">
                                {cust.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {cust.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1 text-slate-300 font-medium">
                                <Phone size={11} className="text-emerald-400" /> {cust.phone}
                              </span>
                              <span>•</span>
                              <span>
                                {dateVal ? new Date(dateVal).toLocaleDateString(
                                  undefined,
                                  { month: 'short', day: 'numeric', year: 'numeric' }
                                ) : 'N/A'}
                              </span>
                              <span>•</span>
                              <span>{inv.items?.length || 0} items</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <p className="font-bold text-white text-xs">
                            Rs. {inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[10px] text-cyan-400 font-medium group-hover:underline">
                            Select Invoice &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STEP 2: Return Items & Form when Invoice is Selected */
          <div className="space-y-5">
            {/* Selected Invoice Banner */}
            {(() => {
              const cust = getCustomerDisplay(selectedInvoice);
              return (
                <div className="bg-gradient-to-r from-[#0d1e3a] to-[#121c38] border border-cyan-500/30 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-cyan-400 text-sm">
                          {selectedInvoice.invoiceId}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          {selectedInvoice.paymentStatus || 'Invoice Paid'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white mt-0.5">
                        {cust.name} &bull; <span className="text-emerald-400">{cust.phone}</span>
                      </p>
                      {cust.address && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {cust.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {!preloadedInvoice && (
                    <button
                      onClick={() => {
                        setSelectedInvoice(null);
                        setReturnQuantities({});
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-colors self-end md:self-auto"
                    >
                      Change Invoice
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Items & Return Quantities
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReturnAll}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                  >
                    Return All Items
                  </button>
                  <button
                    type="button"
                    onClick={handleResetQuantities}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {isFetchingPastReturns ? (
                <div className="p-6 bg-[#0a1024] rounded-xl text-center text-slate-400 text-xs">
                  Checking past return history for this invoice...
                </div>
              ) : (
                <div className="bg-[#0e1726] border border-[#20293a] rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0a1024] text-slate-400 border-b border-[#20293a]">
                      <tr>
                        <th className="p-3 font-semibold">Item & Details</th>
                        <th className="p-3 font-semibold text-right">Invoiced</th>
                        <th className="p-3 font-semibold text-right">Returned</th>
                        <th className="p-3 font-semibold text-right">Returnable</th>
                        <th className="p-3 font-semibold text-right">Unit Price</th>
                        <th className="p-3 font-semibold text-center">Return Qty</th>
                        <th className="p-3 font-semibold text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {selectedInvoice.items.map((item: any, idx: number) => {
                        const itemId =
                          item.inventoryItemId || (item as any).item || `item-${idx}`;
                        const itemName =
                          (item as any).item?.product_name ||
                          (item as any).itemName ||
                          'Item ' + (idx + 1);
                        const itemCode =
                          (item.item as any)?.item_code || (item as any).itemCode || '';
                        const alreadyReturned = getAlreadyReturned(itemId);
                        const returnable = Math.max(0, item.quantity - alreadyReturned);
                        const currentQty = returnQuantities[itemId] || 0;
                        const lineTotal = currentQty * item.unitPrice;
                        const isExhausted = returnable === 0;

                        return (
                          <tr
                            key={itemId}
                            className={`transition-colors ${
                              isExhausted
                                ? 'bg-[#0a1024]/40 opacity-40'
                                : currentQty > 0
                                ? 'bg-cyan-950/20'
                                : 'hover:bg-[#162033]'
                            }`}
                          >
                            <td className="p-3">
                              <p className="font-semibold text-slate-200">{itemName}</p>
                              {itemCode && (
                                <p className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                                  {itemCode}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-300">
                              {item.quantity}
                            </td>
                            <td className="p-3 text-right font-mono text-amber-400">
                              {alreadyReturned}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {returnable}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-300">
                              Rs. {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-center">
                              {isExhausted ? (
                                <span className="text-[11px] text-slate-500 italic">Fully Returned</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(itemId, returnable, currentQty - 1)
                                    }
                                    disabled={currentQty <= 0}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max={returnable}
                                    value={currentQty === 0 ? '' : currentQty}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        itemId,
                                        returnable,
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    placeholder="0"
                                    className="w-14 text-center font-mono font-bold text-xs bg-[#0a1024] border border-[#2e265c] rounded-lg py-1 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(itemId, returnable, currentQty + 1)
                                    }
                                    disabled={currentQty >= returnable}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(itemId, returnable, returnable)
                                    }
                                    className="text-[10px] font-bold uppercase text-cyan-400 hover:text-cyan-300 ml-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
                                  >
                                    Max
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-white">
                              Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Return Reason and Remarks Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0e1726] border border-[#20293a] rounded-xl p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Return Reason <span className="text-rose-400">*</span>
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  {COMMON_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {returnReason === 'Other (Specify in Remarks)' && (
                  <input
                    type="text"
                    placeholder="Specify custom reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full mt-2 bg-[#0a1024] border border-[#2e265c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-amber-400" /> Remarks & Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter detailed reason, item conditions, or credit note instructions..."
                  className="w-full bg-[#0a1024] border border-[#2e265c] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none shadow-inner"
                />
              </div>
            </div>

            {/* Total Summary Callout */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Total Return Refund Value
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {returnSummary.totalQty} item(s) selected for return & restocking
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-mono font-extrabold text-amber-400">
                  Rs. {returnSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#1e293b]">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={isSubmitting || returnSummary.totalQty === 0}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border-none"
              >
                Submit Return
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateReturnModal;
