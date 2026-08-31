import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { 
  RotateCcw, 
  Search, 
  Eye, 
  Plus, 
  RefreshCw, 
  Menu, 
  FileText, 
  Phone, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Filter,
  MessageSquare
} from 'lucide-react';
import { invoiceReturnService } from '../services/InvoiceReturnService';
import type { InvoiceReturn } from '../types/invoice-return';
import { ReturnStatus } from '../types/invoice-return';
import { Button } from '../components/common';
import { useToast } from '../components/erp/Toast';
import ReturnViewModal from '../components/invoice/ReturnViewModal';
import CreateReturnModal from '../components/invoice/CreateReturnModal';

const InvoiceReturns: React.FC = () => {
  const toast = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [returns, setReturns] = useState<InvoiceReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedReturn, setSelectedReturn] = useState<InvoiceReturn | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceReturnService.getAll();
      setReturns(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesStatus =
        statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter.toUpperCase();

      const q = search.toLowerCase().trim();
      if (!q) return matchesStatus;

      const retId = (r.returnId || '').toLowerCase();
      const invId = (
        typeof r.invoice === 'string' ? r.invoice : r.invoice?.invoiceId || ''
      ).toLowerCase();
      const custName = (
        typeof r.customer === 'string'
          ? r.customer
          : r.customer?.shopName || r.customer?.fullName || ''
      ).toLowerCase();
      const custPhone = (
        typeof r.customer === 'object' && r.customer ? r.customer.phone || '' : ''
      ).toLowerCase();
      const reason = (r.returnReason || '').toLowerCase();
      const remark = (r.remarks || '').toLowerCase();

      const matchesSearch =
        retId.includes(q) ||
        invId.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        reason.includes(q) ||
        remark.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [returns, search, statusFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalCount = returns.length;
    const pendingCount = returns.filter((r) => r.status === ReturnStatus.PENDING).length;
    const completedCount = returns.filter((r) => r.status === ReturnStatus.COMPLETED).length;
    const totalRefundAmount = returns
      .filter((r) => r.status !== ReturnStatus.CANCELLED)
      .reduce((sum, r) => sum + (r.returnTotal || 0), 0);

    return { totalCount, pendingCount, completedCount, totalRefundAmount };
  }, [returns]);

  const handleStatusChange = async (ret: InvoiceReturn, newStatus: ReturnStatus) => {
    try {
      await invoiceReturnService.updateStatus(ret._id, newStatus);
      toast.success(`Return marked as ${newStatus}`);
      loadReturns();
      if (selectedReturn?._id === ret._id) {
        setSelectedReturn((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update return status');
    }
  };

  const getCustomerInfo = (r: InvoiceReturn) => {
    if (typeof r.customer === 'object' && r.customer) {
      return {
        name: r.customer.shopName || r.customer.fullName || 'Customer',
        phone: r.customer.phone || '',
      };
    }
    return {
      name: typeof r.customer === 'string' ? r.customer : 'Walk-in Customer',
      phone: '',
    };
  };

  return (
    <div className="flex h-screen bg-[#070c18] text-slate-100 overflow-hidden font-sans selection:bg-amber-500/30">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Navigation Bar */}
        <header className="h-16 bg-[#0c1427]/80 backdrop-blur-md border-b border-[#1c2842] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl hover:bg-[#1c2842] text-slate-400 hover:text-white transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 shadow-inner">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-amber-200">
                  Invoice Returns & Credits
                </h1>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  Manage sales returns, restock inventory items, and issue refunds
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={loadReturns}
              disabled={isLoading}
              className="bg-[#121c33] border-[#223356] text-slate-300 hover:text-white"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border-none shadow-lg shadow-amber-500/20"
            >
              Create Return
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-6">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Returns
                </p>
                <p className="text-2xl font-black text-white mt-1">{stats.totalCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">All time processed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText size={20} />
              </div>
            </div>

            <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Pending Approval
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1">{stats.pendingCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Awaiting stock return</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock size={20} />
              </div>
            </div>

            <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Completed & Restocked
                </p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completedCount}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Stock replenished</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Refund Value
                </p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  Rs. {stats.totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Total credit value</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <DollarSign size={20} />
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Search Return ID, Invoice #, Customer Phone, Remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#070c18] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={12} /> Status:
              </span>
              {['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-[#121c33] text-slate-400 hover:text-white border border-[#223356]'
                  }`}
                >
                  {st === 'ALL' ? 'All Returns' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Returns List Table */}
          <div className="bg-[#0e172a] border border-[#1e293b] rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090f1d] text-slate-400 border-b border-[#1e293b] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">Return ID</th>
                    <th className="p-4">Original Invoice</th>
                    <th className="p-4">Customer & Phone</th>
                    <th className="p-4">Items / Details</th>
                    <th className="p-4">Reason & Remarks</th>
                    <th className="p-4 text-right">Refund Total</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                          <span>Loading invoice returns...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-[#121c33] border border-[#223356] flex items-center justify-center text-slate-500">
                            <RotateCcw size={28} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-200 text-sm">No returns found</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {search || statusFilter !== 'ALL'
                                ? 'Try adjusting your search query or status filter.'
                                : 'No return notes have been created yet.'}
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Plus size={14} />}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none mt-2"
                          >
                            Create First Return
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((ret) => {
                      const cust = getCustomerInfo(ret);
                      const invId =
                        typeof ret.invoice === 'string'
                          ? ret.invoice
                          : ret.invoice?.invoiceId || 'INV';
                      const itemsCount = ret.items?.length || 0;
                      const totalQty = ret.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

                      return (
                        <tr
                          key={ret._id}
                          className="hover:bg-[#142038]/60 transition-colors group cursor-pointer"
                          onClick={() => setSelectedReturn(ret)}
                        >
                          <td className="p-4">
                            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                              {ret.returnId}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-semibold">
                              <FileText size={13} className="text-cyan-500" />
                              <span>{invId}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-200">{cust.name}</p>
                            {cust.phone && (
                              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Phone size={10} /> {cust.phone}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                                {totalQty} qty ({itemsCount} item{itemsCount > 1 ? 's' : ''})
                              </span>
                            </div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <p className="font-medium text-slate-200 truncate">
                              {ret.returnReason || 'Customer Return'}
                            </p>
                            {ret.remarks && (
                              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <MessageSquare size={10} className="text-amber-400 shrink-0" />
                                <span className="truncate">{ret.remarks}</span>
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-amber-400 text-sm">
                            Rs. {ret.returnTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-slate-400 whitespace-nowrap">
                            {new Date(ret.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                ret.status === ReturnStatus.COMPLETED
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : ret.status === ReturnStatus.PENDING
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {ret.status}
                            </span>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedReturn(ret)}
                              title="View & Print Return Note"
                              className="p-2 bg-[#121c33] hover:bg-[#1a284a] text-slate-300 hover:text-white rounded-xl border border-[#223356] transition-all hover:scale-105"
                            >
                              <Eye className="w-4 h-4 text-cyan-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* CREATE RETURN MODAL */}
      <CreateReturnModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newReturn) => {
          loadReturns();
          if (newReturn) {
            setSelectedReturn(newReturn);
          }
        }}
      />

      {/* VIEW & PRINT RETURN NOTE MODAL */}
      <ReturnViewModal
        isOpen={!!selectedReturn}
        onClose={() => setSelectedReturn(null)}
        returnRecord={selectedReturn}
        onStatusChange={async (status) => {
          if (selectedReturn) {
            await handleStatusChange(selectedReturn, status);
          }
        }}
      />
    </div>
  );
};

export default InvoiceReturns;
