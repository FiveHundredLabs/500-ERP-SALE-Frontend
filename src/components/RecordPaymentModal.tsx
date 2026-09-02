import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, AlertCircle, CheckCircle2, ArrowRight, X, FileCheck } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PaymentMethodOption =
  | 'cash'
  | 'bank_transfer'
  | 'bank_deposit'
  | 'card'
  | 'cheque';

export interface RecordPaymentFormData {
  method: PaymentMethodOption;
  amount: string;
  transactionDate: string;
  refNumber: string;
  bankName: string;
  cardLast4: string;
  chequeNumber: string;
  chequeDate: string;
  chequeBankName: string;
  notes: string;
}

export interface RecordPaymentResult {
  method: PaymentMethodOption;
  amount: number;
  transactionDate: string;
  transactionRef: string;
  bankName: string;
  notes: string;
}

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: RecordPaymentResult) => Promise<void>;
  isProcessing?: boolean;
  documentNumber: string;
  partyName: string;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount: number;
  mode?: 'invoice' | 'supplier';
  title?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `LKR ${Math.round(n).toLocaleString('en-US')}/=`;

const todayStr = () => new Date().toISOString().split('T')[0];

const METHOD_OPTIONS: { value: PaymentMethodOption; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'bank_deposit',  label: 'Bank Deposit' },
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Credit/Debit Card' },
  { value: 'cheque',        label: 'Cheque' },
];

const EMPTY_FORM: RecordPaymentFormData = {
  method: 'bank_transfer',
  amount: '',
  transactionDate: todayStr(),
  refNumber: '',
  bankName: '',
  cardLast4: '',
  chequeNumber: '',
  chequeDate: todayStr(),
  chequeBankName: '',
  notes: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  documentNumber,
  partyName,
  totalAmount,
  paidAmount = 0,
  remainingAmount,
  mode = 'invoice',
  title,
}) => {
  const [form, setForm] = useState<RecordPaymentFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amountFocused, setAmountFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...EMPTY_FORM,
        transactionDate: todayStr(),
        chequeDate: todayStr(),
        amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : '',
      });
      setErrors({});
    }
  }, [isOpen, remainingAmount]);

  const set = <K extends keyof RecordPaymentFormData>(key: K, val: RecordPaymentFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const enteredAmount = Math.max(0, parseFloat(form.amount) || 0);
  const isFullPayment = Math.abs(enteredAmount - remainingAmount) < 0.01 && enteredAmount > 0;
  const isPartialPayment = enteredAmount > 0 && enteredAmount < remainingAmount - 0.01;
  const overpaying = enteredAmount > remainingAmount + 0.01;
  const paidPct = Math.min(100, totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.transactionDate) errs.transactionDate = 'Transaction date is required';
    if (enteredAmount <= 0) errs.amount = 'Amount must be greater than 0';
    else if (overpaying) errs.amount = `Cannot exceed outstanding amount (${fmtCurrency(remainingAmount)})`;
    if (form.method === 'cheque') {
      if (!form.chequeBankName.trim()) errs.chequeBankName = 'Bank name is required for cheque';
      if (!form.chequeNumber.trim()) errs.chequeNumber = 'Cheque number is required';
      if (!form.chequeDate) errs.chequeDate = 'Cheque date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form, enteredAmount, overpaying, remainingAmount]);

  const buildRef = (): string => {
    switch (form.method) {
      case 'cash': return `CASH-${Date.now()}`;
      case 'card': return form.cardLast4 ? `CARD-****${form.cardLast4}` : `CARD-${Date.now()}`;
      case 'cheque': return form.chequeNumber.trim() || `CHQ-${Date.now()}`;
      default: return form.refNumber.trim() || `TXN-${Date.now()}`;
    }
  };

  const buildBank = (): string => {
    if (form.method === 'cash') return 'N/A';
    if (form.method === 'cheque') return form.chequeBankName;
    return form.bankName;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onConfirm({
      method: form.method,
      amount: enteredAmount,
      transactionDate: form.transactionDate,
      transactionRef: buildRef(),
      bankName: buildBank(),
      notes: form.notes,
    });
  };

  if (!isOpen) return null;

  const modalTitle = title ?? (mode === 'supplier' ? 'Settle Supplier Payment' : 'Record Payment');

  // Shared input class builder
  const inputCls = (errKey?: string) =>
    `w-full bg-white dark:bg-[#1e293b] border rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${errKey && errors[errKey] ? 'border-red-500' : 'border-slate-300 dark:border-[#334155]'}`;

  const darkInputCls = (errKey?: string) =>
    `w-full bg-white dark:bg-[#0f172a] border rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors ${errKey && errors[errKey] ? 'border-red-500' : 'border-slate-300 dark:border-[#334155]'}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#334155] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-gradient-to-r dark:from-[#1e293b] dark:to-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <DollarSign size={18} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{modalTitle}</h2>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5 truncate max-w-[220px]">{documentNumber} · {partyName}</p>
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:text-gray-500 dark:hover:text-white dark:hover:bg-[#334155] transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto max-h-[calc(100vh-200px)] px-5 py-4 space-y-4">

          {/* Outstanding summary */}
          <div className="bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-1">
                  {mode === 'supplier' ? 'PO Total' : 'Invoice Total'}
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-gray-300 font-mono">
                  {Math.round(totalAmount).toLocaleString()}/=
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Already Paid</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">
                  {Math.round(paidAmount).toLocaleString()}/=
                </p>
              </div>
              <div>
                <p className="text-[10px] text-amber-400/80 uppercase tracking-wider mb-1 font-semibold">
                  Outstanding
                </p>
                <p className="text-base font-bold text-amber-400 font-mono leading-tight">
                  {Math.round(remainingAmount).toLocaleString()}/=
                </p>
              </div>
            </div>
            {/* Progress */}
            <div className="w-full bg-[#0f172a] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            {paidPct > 0 && (
              <p className="text-[10px] text-gray-500 text-center">
                {Math.round(paidPct)}% paid
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {METHOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setForm(p => ({ ...p, method: opt.value })); setErrors({}); }}
                  className={`px-2 py-2.5 rounded-xl border text-[11px] font-semibold transition-all duration-150 leading-tight ${
                    form.method === opt.value
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-[#1e293b] border-slate-200 dark:border-[#334155] text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-[#475569] hover:text-slate-900 dark:hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Transfer / Deposit fields */}
          {(form.method === 'bank_transfer' || form.method === 'bank_deposit') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Commercial Bank"
                  value={form.bankName}
                  onChange={e => set('bankName', e.target.value)}
                  className={inputCls()}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Reference No.</label>
                <input
                  type="text"
                  placeholder="e.g. REF-102938"
                  value={form.refNumber}
                  onChange={e => set('refNumber', e.target.value)}
                  className={inputCls()}
                />
              </div>
            </div>
          )}

          {/* Card field */}
          {form.method === 'card' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Card Last 4 Digits (Optional)</label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 4321"
                value={form.cardLast4}
                onChange={e => set('cardLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={inputCls()}
              />
            </div>
          )}

          {/* Cheque fields */}
          {form.method === 'cheque' && (
            <div className="space-y-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <FileCheck size={12} /> Cheque Details
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Bank Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Commercial Bank, HNB, BOC"
                  value={form.chequeBankName}
                  onChange={e => set('chequeBankName', e.target.value)}
                  className={darkInputCls('chequeBankName')}
                />
                {errors.chequeBankName && (
                  <p className="text-xs text-red-400 mt-1">{errors.chequeBankName}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Cheque No. <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="654321"
                    value={form.chequeNumber}
                    onChange={e => set('chequeNumber', e.target.value)}
                    className={darkInputCls('chequeNumber')}
                  />
                  {errors.chequeNumber && (
                    <p className="text-xs text-red-400 mt-1">{errors.chequeNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Cheque Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.chequeDate}
                    onChange={e => set('chequeDate', e.target.value)}
                    className={darkInputCls('chequeDate')}
                  />
                  {errors.chequeDate && (
                    <p className="text-xs text-red-400 mt-1">{errors.chequeDate}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Transaction Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.transactionDate}
              onChange={e => set('transactionDate', e.target.value)}
              className={inputCls('transactionDate')}
            />
            {errors.transactionDate && (
              <p className="text-xs text-red-400 mt-1">{errors.transactionDate}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Amount (LKR) <span className="text-red-400">*</span>
              </label>
              {remainingAmount > 0 && (
                <button
                  type="button"
                  onClick={() => set('amount', remainingAmount.toFixed(2))}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Pay Full Outstanding ↗
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 pointer-events-none">
                LKR
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onFocus={() => setAmountFocused(true)}
                onBlur={() => setAmountFocused(false)}
                onChange={e => {
                  set('amount', e.target.value);
                  if (errors.amount) setErrors(p => ({ ...p, amount: '' }));
                }}
                className={`w-full bg-[#1e293b] border rounded-xl pl-12 pr-4 py-3 text-xl font-bold font-mono text-white placeholder-gray-600 focus:outline-none transition-colors ${
                  errors.amount
                    ? 'border-red-500'
                    : overpaying
                    ? 'border-orange-500'
                    : amountFocused
                    ? 'border-blue-500'
                    : 'border-[#334155]'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.amount}
              </p>
            )}
            {!errors.amount && isFullPayment && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> Full balance — will be marked as <strong>Paid</strong>
              </p>
            )}
            {!errors.amount && isPartialPayment && (
              <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                <ArrowRight size={11} /> Partial payment — {fmtCurrency(remainingAmount - enteredAmount)} will remain outstanding
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-400 mb-1.5">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder={
                mode === 'supplier'
                  ? 'e.g. Settlement for batch delivery PO-264'
                  : 'e.g. Payment received at counter'
              }
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-[#334155] rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#0f172a] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#334155] text-sm font-semibold text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e293b] transition-all duration-150 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || enteredAmount <= 0}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
              isProcessing || enteredAmount <= 0
                ? 'bg-emerald-700/40 text-emerald-400/50 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                {mode === 'supplier' ? 'Confirm Settlement' : 'Confirm Payment'}
                {enteredAmount > 0 && ` · ${fmtCurrency(enteredAmount)}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;

