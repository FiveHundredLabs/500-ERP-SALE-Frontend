import React, { useState, useCallback, useEffect } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import { Modal, Button, FormField, FormInput, FormSelect } from './common';
import type { InvoiceResponse } from '../types/invoice';
import { financeService } from '../services/FinanceService';

export interface PaymentDetails {
  method: 'Bank Transfer' | 'Cash' | 'Card' | 'Bank Deposit' | 'Cheque' | 'Credit';
  bankName?: string;
  accountNumber?: string;
  transactionRef?: string;
  refNumber?: string;
  cardLast4?: string;
  chequeNumber?: string;
  chequeDate?: string;
  amount: string;
  transactionDate: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice: InvoiceResponse | null;
  paymentDetails: PaymentDetails;
  onPaymentDetailsChange: (details: PaymentDetails) => void;
  onSubmit: () => Promise<void>;
  isProcessing: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice,
  paymentDetails,
  onPaymentDetailsChange,
  onSubmit,
  isProcessing
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const fetchNextId = async () => {
        try {
          await financeService.getNextId();
        } catch (error) {
          // Silent error handling for next ID
        }
      };
      fetchNextId();
    }
  }, [isOpen]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!paymentDetails.transactionDate) {
      newErrors.transactionDate = 'Transaction date is required';
    }

    if (!paymentDetails.amount || parseFloat(paymentDetails.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Validate amount matches invoice amount
    if (selectedInvoice) {
      const invoiceAmount = selectedInvoice.totalAmount;
      const paymentAmount = parseFloat(paymentDetails.amount);
      if (Math.abs(paymentAmount - invoiceAmount) > 0.01) {
        newErrors.amount = `Amount must match invoice amount (LKR ${invoiceAmount.toFixed(2)})`;
      }
    }

    // Cheque-specific validations
    if (paymentDetails.method === 'Cheque') {
      if (!paymentDetails.bankName?.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
      if (!paymentDetails.chequeNumber?.trim() && !paymentDetails.transactionRef?.trim()) {
        newErrors.chequeNumber = 'Cheque number is required';
      }
      if (!paymentDetails.chequeDate?.trim()) {
        newErrors.chequeDate = 'Cheque date is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [paymentDetails, selectedInvoice]);

  const handleMethodChange = (method: any) => {
    const updated: PaymentDetails = {
      ...paymentDetails,
      method,
    };

    if (method === 'Cash') {
      updated.bankName = 'N/A';
      updated.accountNumber = 'N/A';
      updated.transactionRef = 'CASH-' + Date.now();
    } else if (method === 'Bank Transfer' || method === 'Bank Deposit') {
      updated.bankName = '';
      updated.accountNumber = '';
      updated.transactionRef = updated.refNumber || '';
    } else if (method === 'Card') {
      updated.bankName = '';
      updated.accountNumber = '';
      updated.transactionRef = updated.cardLast4 ? `Card **** ${updated.cardLast4}` : '';
    } else if (method === 'Cheque') {
      if (!updated.chequeDate) {
        updated.chequeDate = paymentDetails.transactionDate || new Date().toISOString().split('T')[0];
      }
    }

    onPaymentDetailsChange(updated);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      await onSubmit();
      setErrors({});
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      icon={<DollarSign className="w-5 h-5 text-blue-400" />}
      size="md"
    >
      <div className="space-y-6">
        {/* Invoice Summary */}
        {selectedInvoice && (
          <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-300">Invoice Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Invoice ID</p>
                <p className="text-gray-200 font-medium">{selectedInvoice.invoiceId}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
                <p className={`font-semibold ${selectedInvoice.paymentStatus === 'Completed' ? 'text-green-400' :
                    selectedInvoice.paymentStatus === 'Pending' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                  {selectedInvoice.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Amount</p>
                <p className="text-blue-400 font-semibold">LKR {selectedInvoice.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Due Date</p>
                <p className="text-gray-200 font-medium">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Customer</p>
                <p className="text-gray-200 font-medium">{selectedInvoice.customer?.fullName || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <div className="space-y-4">
          {/* Payment Method */}
          <FormField label="Payment Method" required>
            <FormSelect
              options={[
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Bank Deposit', label: 'Bank Deposit' },
                { value: 'Cash', label: 'Cash' },
                { value: 'Card', label: 'Credit / Debit Card' },
                { value: 'Cheque', label: 'Cheque' },
              ]}
              value={paymentDetails.method}
              onChange={(e) => handleMethodChange(e.target.value)}
            />
          </FormField>

          {/* Bank Transfer / Bank Deposit -> Ref Number (Optional) */}
          {(paymentDetails.method === 'Bank Transfer' || paymentDetails.method === 'Bank Deposit') && (
            <FormField
              label="Reference Number (Optional)"
              hint="Optional bank transfer / deposit reference number"
            >
              <FormInput
                placeholder="e.g. REF-102938"
                value={paymentDetails.refNumber || paymentDetails.transactionRef || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onPaymentDetailsChange({
                    ...paymentDetails,
                    refNumber: val,
                    transactionRef: val,
                  });
                }}
              />
            </FormField>
          )}

          {/* Credit / Debit Card -> Last 4 Digits (Optional) */}
          {paymentDetails.method === 'Card' && (
            <FormField
              label="Card Last 4 Digits (Optional)"
              hint="Optional last 4 digits of the payment card"
            >
              <FormInput
                placeholder="e.g. 4321"
                maxLength={4}
                value={paymentDetails.cardLast4 || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  onPaymentDetailsChange({
                    ...paymentDetails,
                    cardLast4: val,
                    transactionRef: val ? `Card **** ${val}` : '',
                  });
                }}
              />
            </FormField>
          )}

          {/* Cheque -> Bank Name, Cheque Date, Cheque Number */}
          {paymentDetails.method === 'Cheque' && (
            <div className="space-y-4 bg-[#0f172a]/50 p-3.5 rounded-xl border border-[#334155]">
              <FormField
                label="Bank Name"
                required
                error={errors.bankName}
                hint="Bank where the cheque is drawn"
              >
                <FormInput
                  placeholder="e.g. Commercial Bank, Sampath Bank, BOC"
                  value={paymentDetails.bankName || ''}
                  onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, bankName: e.target.value })}
                  error={!!errors.bankName}
                />
              </FormField>

              <FormField
                label="Cheque Date"
                required
                error={errors.chequeDate}
                hint="Date written on the cheque"
              >
                <FormInput
                  type="date"
                  value={paymentDetails.chequeDate || paymentDetails.transactionDate || ''}
                  onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, chequeDate: e.target.value })}
                  error={!!errors.chequeDate}
                />
              </FormField>

              <FormField
                label="Cheque Number"
                required
                error={errors.chequeNumber}
                hint="Cheque serial / leaf number"
              >
                <FormInput
                  placeholder="e.g. CHQ-654321"
                  value={paymentDetails.chequeNumber || paymentDetails.transactionRef || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onPaymentDetailsChange({
                      ...paymentDetails,
                      chequeNumber: val,
                      transactionRef: val,
                    });
                  }}
                  error={!!errors.chequeNumber}
                />
              </FormField>
            </div>
          )}

          {/* Transaction Date */}
          <FormField
            label="Transaction Date"
            required
            error={errors.transactionDate}
            hint="Date when payment was made"
          >
            <FormInput
              type="date"
              value={paymentDetails.transactionDate}
              onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, transactionDate: e.target.value })}
              error={!!errors.transactionDate}
            />
          </FormField>

          {/* Amount */}
          <FormField
            label="Amount (LKR)"
            required
            error={errors.amount}
            hint="Payment amount in Sri Lankan Rupees"
          >
            <FormInput
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={paymentDetails.amount}
              onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, amount: e.target.value })}
              error={!!errors.amount}
            />
          </FormField>

          {/* Validation Error Alert */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400">
                Please fix the errors above before submitting
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleSubmit}
            isLoading={isProcessing}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;