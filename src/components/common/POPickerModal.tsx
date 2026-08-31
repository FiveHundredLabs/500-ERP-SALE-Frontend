import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, ShoppingCart, ChevronRight, Truck, Calendar, Package, CheckCircle } from 'lucide-react';
import type { PurchaseOrder } from '../../types/purchaseOrders';
import { purchaseOrderService } from '../../services/PurchaseOrderService';

interface POPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (po: PurchaseOrder) => void;
}

const POPickerModal: React.FC<POPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPOs = async () => {
      setLoading(true);
      try {
        const data = await purchaseOrderService.getAll();
        setPOs(data || []);
      } catch {
        setPOs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, [isOpen]);

  const filtered = useMemo(() => {
    return pos.filter(po => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        po.poNumber.toLowerCase().includes(q) ||
        po.supplierName.toLowerCase().includes(q) ||
        (po.sourceOrderNumber || '').toLowerCase().includes(q) ||
        (po.customerName || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pos, search, statusFilter]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'draft': return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
      case 'pending_approval': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'processing': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'completed': return 'text-teal-400 bg-teal-400/10 border-teal-400/30';
      case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import from Purchase Order</h2>
              <p className="text-xs text-gray-400">Select a PO to auto-fill items & reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#334155] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-[#334155] flex gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Search by PO number, supplier, ref order..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* PO List */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3" />
                <p className="text-sm">Loading purchase orders...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center text-gray-500">
              <div>
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No purchase orders match your search</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {filtered.map(po => (
                <div
                  key={po.id}
                  className={`px-6 py-4 cursor-pointer transition-all ${
                    hoveredId === po.id ? 'bg-purple-600/10' : 'hover:bg-[#1e293b]/50'
                  }`}
                  onMouseEnter={() => setHoveredId(po.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { onSelect(po); onClose(); }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-purple-400 font-bold text-sm">{po.poNumber}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(po.status)}`}>
                          {po.status}
                        </span>
                        {po.sourceOrderNumber && (
                          <span className="text-[10px] text-blue-400 font-mono bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded">
                            Ref: {po.sourceOrderNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Truck size={11} />
                          {po.supplierName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {po.poDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={11} />
                          {po.totalItems} item{po.totalItems !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Item SKUs preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {po.items.slice(0, 3).map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-[#1e293b] text-gray-300 border border-[#334155] px-2 py-0.5 rounded font-mono"
                          >
                            {item.sku}
                          </span>
                        ))}
                        {po.items.length > 3 && (
                          <span className="text-[10px] text-gray-500 px-1 py-0.5">
                            +{po.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & action */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-mono text-white font-bold text-sm">{formatCurrency(po.totalAmount)}</span>
                      <div className={`flex items-center gap-1 text-xs font-semibold transition-all ${
                        hoveredId === po.id ? 'text-purple-400' : 'text-gray-500'
                      }`}>
                        {hoveredId === po.id ? (
                          <>
                            <CheckCircle size={13} />
                            Select
                          </>
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#334155] text-xs text-gray-500 flex-shrink-0 flex items-center justify-between">
          <span>{filtered.length} PO{filtered.length !== 1 ? 's' : ''} shown</span>
          <span className="text-gray-600">Click any PO to import its items</span>
        </div>
      </div>
    </div>
  );
};

export default POPickerModal;
