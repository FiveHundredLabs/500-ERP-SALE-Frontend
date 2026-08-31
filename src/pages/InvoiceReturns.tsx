import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { RotateCcw, Search, Eye, Menu } from 'lucide-react';
import { invoiceReturnService } from '../services/InvoiceReturnService';
import type { InvoiceReturn } from '../types/invoice-return';
import { Button } from '../components/common';
import { useToast } from '../components/erp/Toast';
import ReturnViewModal from '../components/invoice/ReturnViewModal';

const InvoiceReturns: React.FC = () => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [returns, setReturns] = useState<InvoiceReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<InvoiceReturn | null>(null);

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadReturns = async () => {
    try {
      setIsLoading(true);
      const data = await invoiceReturnService.getAll();
      setReturns(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const filteredReturns = returns.filter(r => 
    r.returnId.toLowerCase().includes(search.toLowerCase()) ||
    (typeof r.invoice !== 'string' && r.invoice.invoiceId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStatusChange = async (ret: InvoiceReturn, newStatus: any) => {
    try {
      await invoiceReturnService.updateStatus(ret._id, newStatus);
      toast.success('Return status updated successfully');
      loadReturns();
      if (selectedReturn?._id === ret._id) {
        setSelectedReturn(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans selection:bg-blue-500/30">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "ml-64" : "ml-20"}`}>
        <header className="h-16 bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30 shadow-inner">
                <RotateCcw className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
                  Invoice Returns
                </h1>
                <p className="text-xs text-gray-400 font-medium tracking-wide">Manage sales returns and refunds</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700/50">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Return ID or Invoice ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <Button variant="secondary" onClick={loadReturns} disabled={isLoading}>
                Refresh
              </Button>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="p-4 font-medium">Return ID</th>
                    <th className="p-4 font-medium">Invoice ID</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium text-right">Return Total</th>
                    <th className="p-4 font-medium text-center">Status</th>
                    <th className="p-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {isLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading returns...</td></tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No returns found.</td></tr>
                  ) : (
                    filteredReturns.map(ret => (
                      <tr key={ret._id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="p-4 font-medium text-blue-400">{ret.returnId}</td>
                        <td className="p-4 text-gray-300">{typeof ret.invoice === 'string' ? ret.invoice : ret.invoice.invoiceId}</td>
                        <td className="p-4 text-gray-400">{new Date(ret.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                        <td className="p-4 text-right text-gray-200">Rs. {ret.returnTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ret.status === 'Completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            ret.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                            'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}>
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => setSelectedReturn(ret)}
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

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
