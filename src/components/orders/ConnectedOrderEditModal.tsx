import React from 'react';
import { AlertTriangle, Unlink, X, FileCheck, FileText, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ConnectedDocsInfo {
  po?: { id: string; poNumber: string; supplierName?: string; status?: string; totalAmount?: number } | null;
  invoices?: Array<{ id: string; invoiceNumber: string; totalAmount?: number; paymentStatus?: string; issueDate?: string }>;
}

interface ConnectedOrderEditModalProps {
  isOpen: boolean;
  orderNumber: string;
  connectedDocs: ConnectedDocsInfo;
  onDisconnect: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConnectedOrderEditModal: React.FC<ConnectedOrderEditModalProps> = ({
  isOpen,
  orderNumber,
  connectedDocs,
  onDisconnect,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const hasPO = Boolean(connectedDocs.po);
  const hasInvoices = Boolean(connectedDocs.invoices && connectedDocs.invoices.length > 0);

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing ? onCancel : undefined}
      />

      {/* Minimal Modal Box */}
      <div className="relative bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] bg-[#0f172a]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Disconnect Connected Order?</h3>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-[#334155] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs text-gray-300 leading-relaxed">
          <p>
            Order <span className="font-mono text-blue-400 font-semibold">{orderNumber}</span> has already been converted to connected downstream documents:
          </p>

          {/* Connected Badges */}
          <div className="flex flex-wrap gap-2 py-1">
            {hasPO && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 font-mono text-[11px]">
                <FileCheck size={12} className="text-purple-400" />
                PO #{connectedDocs.po?.poNumber}
              </span>
            )}
            {hasInvoices && (
              connectedDocs.invoices!.map((inv) => (
                <span key={inv.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-mono text-[11px]">
                  <FileText size={12} className="text-emerald-400" />
                  INV #{inv.invoiceNumber}
                </span>
              ))
            )}
          </div>

          <div className="p-3 rounded-lg bg-[#0f172a]/60 border border-[#334155] text-gray-400 text-[11px] space-y-1">
            <div className="text-amber-300/90 font-medium">To save your changes:</div>
            <div>• Order will be disconnected and returned to <strong className="text-gray-200">Pending</strong> status.</div>
            <div>• Existing PO & Invoice will remain as independent documents.</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#334155] bg-[#0f172a]/40">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-3.5 py-1.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDisconnect}
            disabled={isProcessing}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-lg text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <Unlink size={13} />
                <span>Disconnect & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConnectedOrderEditModal;

