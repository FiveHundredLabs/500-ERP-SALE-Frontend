import React, { useState, useEffect } from 'react';
import { Modal, Button, FormInput as Input, FormField } from '../common';
import { AlertCircle, RotateCcw } from 'lucide-react';
import type { InvoiceResponse } from '../../types/invoice';
import { invoiceReturnService } from '../../services/InvoiceReturnService';
import type { InvoiceReturn } from '../../types/invoice-return';
import { useToast } from '../erp/Toast';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceResponse | null;
  onSuccess: () => void;
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const toast = useToast();
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [pastReturns, setPastReturns] = useState<InvoiceReturn[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPast, setIsFetchingPast] = useState(false);

  useEffect(() => {
    if (isOpen && invoice) {
      setReturnQuantities({});
      setReturnReason('');
      setRemarks('');
      fetchPastReturns(invoice.id || invoice.invoiceNumber);
    }
  }, [isOpen, invoice]);

  const fetchPastReturns = async (invoiceNumber: string) => {
    try {
      setIsFetchingPast(true);
      const returns = await invoiceReturnService.getByInvoiceId(invoiceNumber);
      setPastReturns(returns.filter(r => r.status !== 'cancelled'));
    } catch (err) {
      console.error('Failed to fetch past returns', err);
    } finally {
      setIsFetchingPast(false);
    }
  };

  if (!invoice) return null;

  const getAlreadyReturned = (itemId: string) => {
    let sum = 0;
    pastReturns.forEach(pr => {
      const match = pr.items.find(i => i.inventoryItemId === itemId);
      if (match) sum += match.quantity;
    });
    return sum;
  };

  const handleQuantityChange = (itemId: string, maxQty: number, val: string) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    if (num > maxQty) {
      toast.error(`Maximum returnable quantity is ${maxQty}`);
      return;
    }
    setReturnQuantities(prev => ({ ...prev, [itemId]: num }));
  };

  const calculateReturnTotal = () => {
    let total = 0;
    invoice.items.forEach(item => {
      const itemId = item.inventoryItemId;
      const qty = returnQuantities[itemId] || 0;
      total += qty * item.unitPrice; // Simplified, not factoring in itemized discounts precisely if they were flat
    });
    // Subtract overall invoice discount percentage if applicable
    if (invoice.discount > 0 && invoice.subTotal > 0) {
      const discountPct = invoice.discount / invoice.subTotal;
      total = total - (total * discountPct);
    }
    return total;
  };

  const handleSubmit = async () => {
    const total = calculateReturnTotal();
    if (total <= 0) {
      toast.error('Please select at least one item to return');
      return;
    }
    if (!returnReason.trim()) {
      toast.error('Please provide a return reason');
      return;
    }

    const itemsToReturn = invoice.items
      .map(item => {
        const itemId = item.inventoryItemId;
        const qty = returnQuantities[itemId] || 0;
        return {
          inventoryItemId: itemId,
          quantity: qty,
          unitPrice: item.unitPrice,
          total: qty * item.unitPrice
        };
      })
      .filter(item => item.quantity > 0);

    try {
      setIsLoading(true);
      await invoiceReturnService.create({
        invoiceId: invoice.id,
        items: itemsToReturn,
        returnReason,
        remarks,
        returnTotal: total
      });
      toast.success('Return request created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create return');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create Return for ${invoice.invoiceNumber}`}
      icon={<RotateCcw className="w-5 h-5 text-yellow-400" />}
      size="xl"
    >
      <div className="space-y-6">
        {isFetchingPast ? (
          <div className="text-gray-400">Loading past return history...</div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3 text-right">Invoiced Qty</th>
                  <th className="p-3 text-right">Returned</th>
                  <th className="p-3 text-right">Returnable</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Return Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {invoice.items.map((item, idx) => {
                  const itemId = item.inventoryItemId || `item-${idx}`;
                  const itemName = item.itemName || item.inventoryItem?.productName || 'Unknown Item';
                  const alreadyReturned = getAlreadyReturned(itemId);
                  const returnable = item.quantity - alreadyReturned;

                  return (
                    <tr key={itemId} className={returnable === 0 ? 'opacity-50' : ''}>
                      <td className="p-3 text-gray-200">{itemName}</td>
                      <td className="p-3 text-right text-gray-400">{item.quantity}</td>
                      <td className="p-3 text-right text-yellow-400">{alreadyReturned}</td>
                      <td className="p-3 text-right text-green-400">{returnable}</td>
                      <td className="p-3 text-right text-gray-400">Rs. {item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={returnable.toString()}
                          value={returnQuantities[itemId] || ''}
                          onChange={(e) => handleQuantityChange(itemId, returnable, e.target.value)}
                          disabled={returnable === 0}
                          className="w-24 text-right ml-auto"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Return Reason" required>
            <Input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Defective, Wrong Item"
            />
          </FormField>
          <FormField label="Remarks (Optional)">
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional notes..."
            />
          </FormField>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span>Estimated Return Total (before approval)</span>
          </div>
          <span className="text-2xl font-bold text-yellow-400">
            Rs. {calculateReturnTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Submit Return
          </Button>
        </div>
      </div>
    </Modal>
  );
};
