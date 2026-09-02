import React from 'react';
import { AlertTriangle, Unlink, RefreshCw, X, FileCheck, FileText } from 'lucide-react';
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
  onSync: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConnectedOrderEditModal: React.FC<ConnectedOrderEditModalProps> = ({
  isOpen,
  orderNumber,
  connectedDocs,
  onDisconnect,
  onSync,
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
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={!isProcessing ? onCancel : undefined}
      />

      {/* Modal Container */}
      <div className="relative bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#334155] bg-[#0f172a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Connected Documents Detected</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Order <span className="font-mono text-blue-400 font-semibold">{orderNumber}</span> is connected to downstream documents
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#334155] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Connected Documents Summary */}
        <div className="px-5 py-3.5 bg-[#0f172a]/40 border-b border-[#334155] flex flex-wrap gap-2.5 items-center text-xs">
          <span className="text-gray-400 font-medium">Linked to:</span>
          {hasPO && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-medium">
              <FileCheck size={13} className="text-purple-400" />
              <span>Purchase Order {connectedDocs.po?.poNumber}</span>
              {connectedDocs.po?.supplierName && (
                <span className="text-gray-400 text-[11px]">({connectedDocs.po.supplierName})</span>
              )}
            </div>
          )}
          {hasInvoices && (
            connectedDocs.invoices!.map((inv) => (
              <div key={inv.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                <FileText size={13} className="text-emerald-400" />
                <span>Invoice {inv.invoiceNumber}</span>
              </div>
            ))
          )}
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-gray-300">
            Please choose how to handle the connected documents before saving your changes:
          </p>

          {/* Option 1: Disconnect */}
          <div
            onClick={!isProcessing ? onDisconnect : undefined}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0f172a]/60 hover:bg-amber-500/10 border-[#334155] hover:border-amber-500/50 group ${
              isProcessing ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform">
                <Unlink size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-gray-100 group-hover:text-amber-300 transition-colors">
                    Option 1 — Disconnect
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    Returns to Pending
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Remove Order references from the PO and Invoice. Return the Order status to <strong>Pending</strong>.
                  Existing PO and Invoice will remain as independent documents without being deleted.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isProcessing) onDisconnect();
                    }}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs rounded-lg transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlink size={13} />
                    <span>Disconnect & Reset to Pending</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Update Connected Documents */}
          <div
            onClick={!isProcessing ? onSync : undefined}
            className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0f172a]/60 hover:bg-blue-500/10 border-[#334155] hover:border-blue-500/50 group ${
              isProcessing ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 group-hover:scale-105 transition-transform">
                <RefreshCw size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-gray-100 group-hover:text-blue-300 transition-colors">
                    Option 2 — Update Connected Documents
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                    Auto-Sync
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Save edits to the Order and automatically synchronize matching product quantities, items, and totals in the connected PO and Invoice.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isProcessing) onSync();
                    }}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-lg transition shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Update & Sync Connected Docs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#334155] bg-[#0f172a]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Option 3 — Cancel (Keep Unchanged)
          </button>

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Processing update...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectedOrderEditModal;
