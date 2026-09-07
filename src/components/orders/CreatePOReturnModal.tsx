import React, { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, 
  Search, 
  RefreshCw, 
  Plus, 
  Minus, 
  MessageSquare,
  Truck
} from 'lucide-react';
import { Modal, Button } from '../common';
import type { PurchaseOrder } from '../../types/purchaseOrders';
import { purchaseOrderService } from '../../services/PurchaseOrderService';
import { poReturnService } from '../../services/POReturnService';
import type { PurchaseOrderReturn } from '../../types/po-return';
import { useToast } from '../erp/Toast';

interface CreatePOReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPO?: PurchaseOrder | null;
  po?: PurchaseOrder | null;
  onSuccess: (newReturn?: PurchaseOrderReturn) => void;
}

const COMMON_PO_REASONS = [
  'Defective / Damaged Goods',
  'Wrong Item / Specification Received',
  'Quality Rejection / Substandard Material',
  'Excess Quantity Delivered',
  'Supplier Price Discrepancy',
  'Other (Specify in Remarks)',
];

export const CreatePOReturnModal: React.FC<CreatePOReturnModalProps> = ({
  isOpen,
  onClose,
  initialPO = null,
  po = null,
  onSuccess,
}) => {
  const toast = useToast();
  const preloadedPO = initialPO || po;

  // PO selection state
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [isFetchingPOs, setIsFetchingPOs] = useState(false);
  const [poSearchQuery, setPOSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Return form state
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [pastReturns, setPastReturns] = useState<PurchaseOrderReturn[]>([]);
  const [isFetchingPastReturns, setIsFetchingPastReturns] = useState(false);
  const [returnReason, setReturnReason] = useState('Defective / Damaged Goods');
  const [customReason, setCustomReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load POs on modal open
  useEffect(() => {
    if (isOpen) {
      if (preloadedPO) {
        setSelectedPO(preloadedPO);
      } else {
        setSelectedPO(null);
        fetchPOs();
      }
      setReturnQuantities({});
      setReturnReason('Defective / Damaged Goods');
      setCustomReason('');
      setRemarks('');
      setPOSearchQuery('');
    }
  }, [isOpen, preloadedPO]);

  // Load past returns when PO is selected
  useEffect(() => {
    if (selectedPO) {
      const poId = selectedPO.id || selectedPO.poNumber;
      fetchPastReturns(poId);
    } else {
      setPastReturns([]);
    }
  }, [selectedPO]);

  const fetchPOs = async () => {
    try {
      setIsFetchingPOs(true);
      const list = await purchaseOrderService.getAll();
      setAllPOs(list || []);
    } catch (err: any) {
      toast.error('Failed to load purchase orders: ' + (err.message || 'Network error'));
    } finally {
      setIsFetchingPOs(false);
    }
  };

  const fetchPastReturns = async (poId: string) => {
    try {
      setIsFetchingPastReturns(true);
      const returns = await poReturnService.getByPurchaseOrderId(poId);
      setPastReturns(returns.filter(r => r.status !== 'cancelled'));
    } catch (err) {
      console.error('Failed to fetch past PO returns:', err);
    } finally {
      setIsFetchingPastReturns(false);
    }
  };

  // Filter POs for search
  const filteredPOs = useMemo(() => {
    if (!poSearchQuery.trim()) {
      return allPOs.slice(0, 10);
    }

    const q = poSearchQuery.toLowerCase().trim();
    return allPOs.filter(p => {
      const poNum = (p.poNumber || '').toLowerCase();
      const supName = (p.supplierName || (p as any).supplier?.companyName || '').toLowerCase();
      const refOrder = (p.sourceOrderNumber || '').toLowerCase();
      return poNum.includes(q) || supName.includes(q) || refOrder.includes(q);
    });
  }, [allPOs, poSearchQuery]);

  // Calculate remaining returnable quantity for each PO line item
  const returnableItems = useMemo(() => {
    if (!selectedPO || !selectedPO.items) return [];

    return selectedPO.items.map((item: any) => {
      const alreadyReturned = pastReturns.reduce((sum, ret) => {
        const match = ret.items.find((ri: any) => 
          (item.inventoryItemId && ri.inventoryItemId === item.inventoryItemId) ||
          (item.sku && ri.sku?.toLowerCase() === item.sku?.toLowerCase()) ||
          (item.productName && ri.productName?.toLowerCase() === item.productName?.toLowerCase())
        );
        return sum + (match ? match.quantity : 0);
      }, 0);

      const maxQty = (item.quantityReceived || 0) > 0 ? item.quantityReceived : (item.quantityOrdered || 0);
      const remainingQty = Math.max(0, maxQty - alreadyReturned);

      return {
        ...item,
        originalQty: item.quantityOrdered,
        receivedQty: item.quantityReceived,
        alreadyReturned,
        remainingQty,
        itemKey: item.inventoryItemId || item.id || item.sku,
      };
    });
  }, [selectedPO, pastReturns]);

  // Total return calculations
  const returnSummary = useMemo(() => {
    let totalItemsCount = 0;
    let totalDebitAmount = 0;

    returnableItems.forEach((item: any) => {
      const qty = returnQuantities[item.itemKey] || 0;
      if (qty > 0) {
        totalItemsCount += qty;
        totalDebitAmount += qty * Number(item.unitPrice || 0);
      }
    });

    return { totalItemsCount, totalDebitAmount };
  }, [returnableItems, returnQuantities]);

  const handleQuantityChange = (itemKey: string, newQty: number, maxQty: number) => {
    const validQty = Math.max(0, Math.min(newQty, maxQty));
    setReturnQuantities(prev => ({
      ...prev,
      [itemKey]: validQty,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedPO) {
      toast.error('Please select a Purchase Order');
      return;
    }

    const itemsToReturn = returnableItems
      .filter((item: any) => (returnQuantities[item.itemKey] || 0) > 0)
      .map((item: any) => ({
        inventoryItemId: item.inventoryItemId,
        sku: item.sku,
        productName: item.productName,
        quantity: returnQuantities[item.itemKey],
        unitPrice: Number(item.unitPrice || 0),
        total: returnQuantities[item.itemKey] * Number(item.unitPrice || 0),
      }));

    if (itemsToReturn.length === 0) {
      toast.error('Please specify return quantity for at least one item');
      return;
    }

    const finalReason =
      returnReason === 'Other (Specify in Remarks)'
        ? customReason || remarks || 'Other reason'
        : returnReason;

    try {
      setIsSubmitting(true);
      const createdReturn = await poReturnService.create({
        purchaseOrderId: selectedPO.id,
        items: itemsToReturn,
        returnTotal: returnSummary.totalDebitAmount,
        returnReason: finalReason,
        remarks: remarks.trim() || undefined,
      });

      toast.success(`PO Return ${createdReturn.returnNumber} created successfully!`);
      onSuccess(createdReturn);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create PO return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Purchase Order Return (Supplier Debit Note)"
      icon={<RotateCcw className="w-5 h-5 text-purple-400" />}
      size="xl"
      className="max-h-[92vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-gray-200">
        
        {/* PO SELECTOR SECTION */}
        {!preloadedPO && (
          <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] space-y-3">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search size={14} className="text-purple-400" />
              Select Purchase Order to Return From
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search PO number (e.g. PO-2026...), supplier name, or ref order..."
                value={poSearchQuery}
                onChange={e => setPOSearchQuery(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
            </div>

            {isFetchingPOs ? (
              <div className="flex items-center justify-center py-4 text-xs text-gray-400 gap-2">
                <RefreshCw size={14} className="animate-spin text-purple-400" /> Loading purchase orders...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredPOs.length === 0 ? (
                  <p className="text-xs text-gray-500 col-span-2 text-center py-3">
                    No purchase orders found matching &quot;{poSearchQuery}&quot;
                  </p>
                ) : (
                  filteredPOs.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPO(p);
                        setReturnQuantities({});
                      }}
                      className={`text-left p-2.5 rounded-lg border transition-all text-xs flex justify-between items-center ${
                        selectedPO?.id === p.id
                          ? 'bg-purple-900/30 border-purple-500 text-white'
                          : 'bg-[#0f172a] border-[#334155] hover:border-purple-500/50 text-gray-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold font-mono text-purple-400">{p.poNumber}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">
                          {p.supplierName || (p as any).supplier?.companyName || 'Supplier'}
                        </div>
                      </div>
                      <div className="text-right font-mono font-semibold">
                        LKR {Math.round(Number(p.totalAmount || 0)).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* SELECTED PO & SUPPLIER INFO CARD */}
        {selectedPO && (
          <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-400 uppercase">Purchase Order:</span>
                <span className="text-sm font-bold text-purple-400 font-mono">{selectedPO.poNumber}</span>
                <span className="text-[11px] bg-[#0f172a] px-2 py-0.5 rounded border border-[#334155] text-gray-400">
                  {selectedPO.poDate ? new Date(selectedPO.poDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Truck size={13} className="text-purple-400" />
                {selectedPO.supplierName || (selectedPO as any).supplier?.companyName || 'Supplier'}
                {selectedPO.supplierPhone && (
                  <span className="text-gray-400 font-normal">({selectedPO.supplierPhone})</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">PO Total Amount</div>
              <div className="text-base font-bold text-white font-mono">
                LKR {Math.round(Number(selectedPO.totalAmount || 0)).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* ITEMS SELECTION & RETURN QUANTITY TABLE */}
        {selectedPO && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Select Items & Return Quantities
              </h3>
              {isFetchingPastReturns && (
                <span className="text-[11px] text-purple-400 flex items-center gap-1">
                  <RefreshCw size={11} className="animate-spin" /> Verifying return history...
                </span>
              )}
            </div>

            <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1e293b] text-gray-300 border-b border-[#334155] font-semibold">
                    <th className="p-3">Item / SKU</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-center">Ordered / Received</th>
                    <th className="p-3 text-center">Returnable</th>
                    <th className="p-3 text-center w-36">Return Qty</th>
                    <th className="p-3 text-right">Debit Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/60">
                  {returnableItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500 text-xs">
                        No items found on this Purchase Order
                      </td>
                    </tr>
                  ) : (
                    returnableItems.map((item: any) => {
                      const qtyToReturn = returnQuantities[item.itemKey] || 0;
                      const lineDebit = qtyToReturn * Number(item.unitPrice || 0);
                      const isExhausted = item.remainingQty === 0;

                      return (
                        <tr 
                          key={item.itemKey}
                          className={qtyToReturn > 0 ? 'bg-purple-950/20' : isExhausted ? 'opacity-50 bg-slate-900/40' : ''}
                        >
                          <td className="p-3">
                            <div className="font-semibold text-white">{item.productName}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{item.sku}</div>
                          </td>
                          <td className="p-3 text-right font-mono text-gray-300">
                            LKR {Math.round(Number(item.unitPrice || 0)).toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-gray-400">
                            {item.quantityOrdered} {item.quantityReceived > 0 && `(${item.quantityReceived} rec)`}
                          </td>
                          <td className="p-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isExhausted ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {item.remainingQty} left
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={qtyToReturn <= 0}
                                onClick={() => handleQuantityChange(item.itemKey, qtyToReturn - 1, item.remainingQty)}
                                className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-gray-300 disabled:opacity-30"
                              >
                                <Minus size={12} />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={item.remainingQty}
                                value={qtyToReturn}
                                onChange={e => handleQuantityChange(item.itemKey, parseInt(e.target.value) || 0, item.remainingQty)}
                                className="w-14 text-center bg-[#1e293b] border border-[#334155] rounded px-1 py-1 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                              <button
                                type="button"
                                disabled={qtyToReturn >= item.remainingQty}
                                onClick={() => handleQuantityChange(item.itemKey, qtyToReturn + 1, item.remainingQty)}
                                className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-gray-300 disabled:opacity-30"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-purple-400">
                            LKR {Math.round(lineDebit).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REASON & REMARKS SECTION */}
        {selectedPO && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#1e293b] p-4 rounded-xl border border-[#334155]">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Reason for Return to Supplier*
                </label>
                <select
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {COMMON_PO_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {returnReason === 'Other (Specify in Remarks)' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Specify Custom Reason
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Enter custom return reason..."
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
                <MessageSquare size={13} className="text-purple-400" /> Remarks / Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter remarks or notes (optional)..."
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* SUMMARY BAR */}
        {selectedPO && (
          <div className="bg-[#1e293b] p-4 rounded-xl border border-purple-500/40 flex justify-between items-center">
            <div>
              <span className="text-xs text-gray-400">Total Items to Return: </span>
              <span className="text-sm font-bold text-white font-mono">{returnSummary.totalItemsCount} units</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 mr-2">Total Debit Amount:</span>
              <span className="text-lg font-extrabold text-purple-400 font-mono">
                LKR {Math.round(returnSummary.totalDebitAmount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* MODAL FOOTER */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#334155] mt-4">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!selectedPO || returnSummary.totalItemsCount === 0 || isSubmitting}
          isLoading={isSubmitting}
          className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          Create Supplier Return
        </Button>
      </div>
    </Modal>
  );
};

export default CreatePOReturnModal;
