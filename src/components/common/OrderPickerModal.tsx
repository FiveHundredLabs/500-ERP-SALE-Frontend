import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, ShoppingBag, ChevronRight, User, Calendar, Package, CheckCircle } from 'lucide-react';
import type { Order } from '../../types/orders';
import { orderService } from '../../services/OrderService';
import { mockOrders } from '../../data/mockOrders';

interface OrderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (order: Order) => void;
}

const OrderPickerModal: React.FC<OrderPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await orderService.getAll();
        setOrders(data);
      } catch {
        setOrders(mockOrders);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isOpen]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderId.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.salesman?.name || '').toLowerCase().includes(q) ||
        o.contactPerson.toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const statusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'Pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'Reviewing': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'Converted to PO': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'Completed': return 'text-teal-400 bg-teal-400/10 border-teal-400/30';
      case 'Rejected': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-fadeIn">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Import from Sales Order</h2>
              <p className="text-xs text-gray-400">Select an order to auto-fill customer & items</p>
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
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search by order ID, customer, salesman..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Reviewing">Reviewing</option>
            <option value="Approved">Approved</option>
            <option value="Converted to PO">Converted to PO</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Order List */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                <p className="text-sm">Loading orders...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center text-gray-500">
              <div>
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No orders match your search</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1e293b]">
              {filtered.map(order => (
                <div
                  key={order.id}
                  className={`px-6 py-4 cursor-pointer transition-all ${
                    hoveredId === order.id ? 'bg-blue-600/10' : 'hover:bg-[#1e293b]/50'
                  }`}
                  onMouseEnter={() => setHoveredId(order.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => { onSelect(order); onClose(); }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-blue-400 font-bold text-sm">{order.orderId}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {order.customerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {order.orderDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={11} />
                          {order.numberOfProducts} item{order.numberOfProducts !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Products preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {order.products.slice(0, 3).map((p, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-[#1e293b] text-gray-300 border border-[#334155] px-2 py-0.5 rounded font-mono"
                          >
                            {p.sku}
                          </span>
                        ))}
                        {order.products.length > 3 && (
                          <span className="text-[10px] text-gray-500 px-1 py-0.5">
                            +{order.products.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & action */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-mono text-white font-bold text-sm">{formatCurrency(order.grandTotal)}</span>
                      <div className={`flex items-center gap-1 text-xs font-semibold transition-all ${
                        hoveredId === order.id ? 'text-blue-400' : 'text-gray-500'
                      }`}>
                        {hoveredId === order.id ? (
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
          <span>{filtered.length} order{filtered.length !== 1 ? 's' : ''} shown</span>
          <span className="text-gray-600">Click any order to import its data</span>
        </div>
      </div>
    </div>
  );
};

export default OrderPickerModal;
