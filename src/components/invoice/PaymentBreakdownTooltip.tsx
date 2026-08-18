import React, { useState } from 'react';

interface PaymentBreakdownTooltipProps {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  statusText?: string;
  children: React.ReactNode;
}

export const PaymentBreakdownTooltip: React.FC<PaymentBreakdownTooltipProps> = ({
  totalAmount,
  paidAmount,
  remainingAmount,
  statusText,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatCurrency = (val: number) =>
    `LKR ${Math.round(val || 0).toLocaleString()}/=`;

  const percentPaid = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-60 bg-[#0b132b] border border-slate-700/90 rounded-xl shadow-2xl p-3 text-slate-100 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-[#0b132b]" />

          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800">
            <span className="font-bold text-[11px] text-slate-300 uppercase tracking-wider">Payment Breakdown</span>
            {statusText && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {statusText}
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-sans">Total Amount:</span>
              <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span className="text-slate-400 font-sans">Paid Amount:</span>
              <span className="font-bold">+{formatCurrency(paidAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-amber-400 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-sans font-semibold">Remaining:</span>
              <span className="font-bold">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Progress Mini Bar */}
          <div className="mt-2.5 pt-1.5 border-t border-slate-800/60">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Settled</span>
              <span className="font-mono text-emerald-400 font-bold">{percentPaid}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  percentPaid === 100 ? 'bg-emerald-500' : percentPaid > 0 ? 'bg-purple-500' : 'bg-slate-600'
                }`}
                style={{ width: `${percentPaid}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentBreakdownTooltip;
