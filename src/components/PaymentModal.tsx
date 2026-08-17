import React, { useState, useCallback, useEffect } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import { Modal, Button, FormField, FormInput, FormSelect } from './common';
import type { InvoiceResponse } from '../types/invoice';
import { financeService } from '../services/FinanceService';

interface PaymentDetails {
  method: 'Bank Transfer' | 'Cash' | 'Card' | 'Bank Deposit' | 'Cheque' | 'Credit';
  bankName: string;
  accountNumber: string;
  transactionRef: string;
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

    if (paymentDetails.method !== 'Cash' && !paymentDetails.transactionRef.trim()) {
      newErrors.transactionRef = 'Transaction reference is required';
    }

    if (['Bank Transfer', 'Bank Deposit', 'Cheque'].includes(paymentDetails.method)) {
      if (!paymentDetails.bankName.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
      if (!paymentDetails.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [paymentDetails, selectedInvoice]);

  const handleMethodChange = (method: any) => {
    const updated: PaymentDetails = { ...paymentDetails, method };
    if (method === 'Cash') {
      updated.bankName = 'N/A';
      updated.accountNumber = 'N/A';
      updated.transactionRef = 'CASH-' + Date.now();
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
                { value: 'Card', label: 'Credit/Debit Card' },
                { value: 'Cheque', label: 'Cheque' },
              ]}
              value={paymentDetails.method}
              onChange={(e) => handleMethodChange(e.target.value)}
            />
          </FormField>

          {/* Bank Details - Conditional */}
          {['Bank Transfer', 'Bank Deposit', 'Cheque'].includes(paymentDetails.method) && (
            <>
              <FormField
                label="Bank Name"
                required
                error={errors.bankName}
                hint="Name of the bank"
              >
                <FormInput
                  placeholder="Enter bank name"
                  value={paymentDetails.bankName}
                  onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, bankName: e.target.value })}
                  error={!!errors.bankName}
                />
              </FormField>

              <FormField
                label="Account Number"
                required
                error={errors.accountNumber}
                hint="Bank account number"
              >
                <FormInput
                  placeholder="Enter account number"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, accountNumber: e.target.value })}
                  error={!!errors.accountNumber}
                />
              </FormField>
            </>
          )}

          {/* Transaction Reference */}
          {paymentDetails.method !== 'Cash' && (
            <FormField
              label="Transaction Reference"
              required
              error={errors.transactionRef}
              hint={paymentDetails.method === 'Card' ? 'Card transaction ID' : 'Reference/Cheque number'}
            >
              <FormInput
                placeholder={paymentDetails.method === 'Card' ? 'Enter card transaction ID' : 'Enter reference number'}
                value={paymentDetails.transactionRef}
                onChange={(e) => onPaymentDetailsChange({ ...paymentDetails, transactionRef: e.target.value })}
                error={!!errors.transactionRef}
              />
            </FormField>
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