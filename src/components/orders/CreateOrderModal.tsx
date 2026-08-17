import React, { useState, useMemo, useRef } from 'react';
import { X, Plus, Trash2, ShoppingBag, Search, ChevronDown } from 'lucide-react';
import type { Order, OrderProduct } from '../../types/orders';
import { mockSalesmen } from '../../data/mockOrders';
import { mockCustomers } from '../../data/mockCustomers';
import { useClickOutside } from '../../hooks/useClickOutside';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order) => void;
}

interface DraftProduct {
  id: string;
  sku: string;
  productName: string;
  category: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
}

const UNIT_OPTIONS = ['Pcs', 'Meters', 'Length', 'Bags', 'Rolls', 'Sets', 'Kg', 'Liters', 'Boxes'];

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const today = new Date().toISOString().split('T')[0];

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');
  const [showSalesmanDropdown, setShowSalesmanDropdown] = useState(false);

  const [orderDate, setOrderDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<DraftProduct[]>([]);

  const customerRef = useRef<HTMLDivElement>(null);
  const salesmanRef = useRef<HTMLDivElement>(null);

  useClickOutside([customerRef], () => setShowCustomerDropdown(false));
  useClickOutside([salesmanRef], () => setShowSalesmanDropdown(false));

  // New product row state
  const [newProduct, setNewProduct] = useState<DraftProduct>({
    id: '', sku: '', productName: '', category: '', brand: '',
    quantity: 1, unit: 'Pcs', unitPrice: 0, discount: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter customers by name only (Prefix / first letter match prioritized, then alphabetical)
  const filteredCustomers = useMemo(() => {
    const activeCusts = mockCustomers.filter(c => c.status === 'Active');
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      return [...activeCusts].sort((a, b) => a.businessName.localeCompare(b.businessName));
    }
    const matching = activeCusts.filter(c => c.businessName.toLowerCase().includes(q));
    return matching.sort((a, b) => {
      const aStarts = a.businessName.toLowerCase().startsWith(q);
      const bStarts = b.businessName.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.businessName.localeCompare(b.businessName);
    });
  }, [customerSearch]);

  // Filter salesmen by name only (Prefix / first letter match prioritized, then alphabetical)
  const filteredSalesmen = useMemo(() => {
    const q = salesmanSearch.trim().toLowerCase();
    if (!q) {
      return [...mockSalesmen].sort((a, b) => a.name.localeCompare(b.name));
    }
    const matching = mockSalesmen.filter(s => s.name.toLowerCase().includes(q));
    return matching.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q);
      const bStarts = b.name.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [salesmanSearch]);

  const selectedCustomer = mockCustomers.find(c => c.id === selectedCustomerId);
  const selectedSalesman = mockSalesmen.find(s => s.id === selectedSalesmanId);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const calcProductLine = (p: DraftProduct) => {
    const subtotal = p.quantity * p.unitPrice;
    const discAmt = subtotal * (p.discount / 100);
    return { subtotal, total: subtotal - discAmt };
  };

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    for (const p of products) {
      const { subtotal, total } = calcProductLine(p);
      subTotal += subtotal;
      totalDiscount += subtotal - total;
    }
    return { subTotal, totalDiscount, grandTotal: subTotal - totalDiscount };
  }, [products]);

  const handleAddProduct = () => {
    const errs: Record<string, string> = {};
    if (!newProduct.productName.trim()) errs.productName = 'Product name required';
    if (!newProduct.sku.trim()) errs.sku = 'SKU required';
    if (newProduct.quantity <= 0) errs.quantity = 'Qty must be > 0';
    if (newProduct.unitPrice <= 0) errs.unitPrice = 'Unit price required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setProducts(prev => [...prev, { ...newProduct, id: Date.now().toString() }]);
    setNewProduct({ id: '', sku: '', productName: '', category: '', brand: '', quantity: 1, unit: 'Pcs', unitPrice: 0, discount: 0 });
    setErrors({});
  };

  const handleRemoveProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedCustomerId) errs.customer = 'Please select a customer';
    if (!selectedSalesmanId) errs.salesman = 'Please select a salesman';
    if (products.length === 0) errs.products = 'Add at least one product';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const orderProducts: OrderProduct[] = products.map(p => {
      const { subtotal, total } = calcProductLine(p);
      return { ...p, tax: 0, subtotal, total };
    });

    const orderId = `ORD-${10025 + Math.floor(Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: Date.now().toString(),
      orderId,
      orderDate,
      createdAt: now,
      updatedAt: now,
      salesman: selectedSalesman!,
      customerId: selectedCustomer!.customerId,
      customerName: selectedCustomer!.businessName,
      contactPerson: selectedCustomer!.contactPerson,
      contactPhone: selectedCustomer!.phone,
      customerAddress: selectedCustomer!.address,
      customerCity: selectedCustomer!.city,
      products: orderProducts,
      numberOfProducts: orderProducts.length,
      subTotal: totals.subTotal,
      totalDiscount: totals.totalDiscount,
      totalTax: 0,
      grandTotal: totals.grandTotal,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      notes,
      timeline: [
        {
          id: Date.now().toString(),
          event: 'Order Created',
          description: 'Order created manually by Admin',
          timestamp: now,
          actor: 'Admin User',
        },
      ],
    };

    onSubmit(newOrder);
    handleReset();
  };

  const handleReset = () => {
    setSelectedCustomerId(''); setCustomerSearch(''); setSelectedSalesmanId('');
    setOrderDate(today); setNotes(''); setProducts([]); setErrors({});
    setNewProduct({ id: '', sku: '', productName: '', category: '', brand: '', quantity: 1, unit: 'Pcs', unitPrice: 0, discount: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="relative w-full max-w-2xl h-screen bg-[#0f172a] border-l border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-slideIn">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Create New Order</h2>
              <p className="text-xs text-gray-400">Fill in the details below to create a manual order</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#334155] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
          <form id="create-order-form" onSubmit={handleSubmit}>

            {/* Section: Customer & Salesman */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-1 border-b border-[#334155]">
                Order Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Selector (Instant click dropdown, name only, first-letter sorted) */}
                <div ref={customerRef} className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Customer <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      className={`w-full bg-[#1e293b] border rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.customer ? 'border-red-500' : 'border-[#334155]'
                      }`}
                      placeholder="Select a customer..."
                      value={selectedCustomer ? selectedCustomer.businessName : customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomerId('');
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onClick={() => setShowCustomerDropdown(true)}
                      autoComplete="off"
                    />
                    {(selectedCustomer || customerSearch) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomerId('');
                          setCustomerSearch('');
                          setShowCustomerDropdown(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                        title="Clear customer"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    )}
                  </div>

                  {showCustomerDropdown && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase bg-[#1e293b]/50 flex justify-between">
                        <span>{customerSearch ? `Matching (${filteredCustomers.length})` : `All Customers (${filteredCustomers.length})`}</span>
                        <span className="text-[10px] text-gray-500">A-Z</span>
                      </div>
                      {filteredCustomers.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-400 text-center italic">No customers found</p>
                      ) : (
                        filteredCustomers.map(c => (
                          <div
                            key={c.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerSearch('');
                              setShowCustomerDropdown(false);
                              setErrors(prev => ({ ...prev, customer: '' }));
                            }}
                            className={`px-3 py-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedCustomerId === c.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'hover:bg-[#1e293b] text-gray-200'
                            }`}
                          >
                            <span>{c.businessName}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {errors.customer && <p className="text-red-400 text-xs mt-1">{errors.customer}</p>}
                </div>

                {/* Salesman Selector (Instant click dropdown, name only, first-letter sorted) */}
                <div ref={salesmanRef} className="relative">
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Salesman <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      className={`w-full bg-[#1e293b] border rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.salesman ? 'border-red-500' : 'border-[#334155]'
                      }`}
                      placeholder="Select salesman..."
                      value={selectedSalesman ? selectedSalesman.name : salesmanSearch}
                      onChange={e => {
                        setSalesmanSearch(e.target.value);
                        setSelectedSalesmanId('');
                        setShowSalesmanDropdown(true);
                      }}
                      onFocus={() => setShowSalesmanDropdown(true)}
                      onClick={() => setShowSalesmanDropdown(true)}
                      autoComplete="off"
                    />
                    {(selectedSalesman || salesmanSearch) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSalesmanId('');
                          setSalesmanSearch('');
                          setShowSalesmanDropdown(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                        title="Clear salesman"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    )}
                  </div>

                  {showSalesmanDropdown && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase bg-[#1e293b]/50 flex justify-between">
                        <span>{salesmanSearch ? `Matching (${filteredSalesmen.length})` : `All Salesmen (${filteredSalesmen.length})`}</span>
                        <span className="text-[10px] text-gray-500">A-Z</span>
                      </div>
                      {filteredSalesmen.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-400 text-center italic">No salesmen found</p>
                      ) : (
                        filteredSalesmen.map(s => (
                          <div
                            key={s.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedSalesmanId(s.id);
                              setSalesmanSearch('');
                              setShowSalesmanDropdown(false);
                              setErrors(prev => ({ ...prev, salesman: '' }));
                            }}
                            className={`px-3 py-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedSalesmanId === s.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'hover:bg-[#1e293b] text-gray-200'
                            }`}
                          >
                            <span>{s.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {errors.salesman && <p className="text-red-400 text-xs mt-1">{errors.salesman}</p>}
                </div>

                {/* Order Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Order Date</label>
                  <input
                    type="date"
                    className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section: Products */}
            <div className="space-y-4 mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-1 border-b border-[#334155]">
                Order Products
              </h3>

              {errors.products && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
                  {errors.products}
                </div>
              )}

              {/* Add product row */}
              <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Product Line</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.productName ? 'border-red-500' : 'border-[#334155]'}`}
                      placeholder="Product name *"
                      value={newProduct.productName}
                      onChange={e => setNewProduct(p => ({ ...p, productName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <input
                      className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.sku ? 'border-red-500' : 'border-[#334155]'}`}
                      placeholder="SKU code *"
                      value={newProduct.sku}
                      onChange={e => setNewProduct(p => ({ ...p, sku: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <input
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Category"
                      value={newProduct.category}
                      onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <input
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Brand"
                      value={newProduct.brand}
                      onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <input
                      type="number"
                      min="1"
                      className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.quantity ? 'border-red-500' : 'border-[#334155]'}`}
                      placeholder="Qty *"
                      value={newProduct.quantity}
                      onChange={e => setNewProduct(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <select
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={newProduct.unit}
                      onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                    >
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.unitPrice ? 'border-red-500' : 'border-[#334155]'}`}
                      placeholder="Unit Price *"
                      value={newProduct.unitPrice || ''}
                      onChange={e => setNewProduct(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Disc %"
                      value={newProduct.discount || ''}
                      onChange={e => setNewProduct(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {/* Preview line total */}
                {newProduct.quantity > 0 && newProduct.unitPrice > 0 && (
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>Line Total:</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(calcProductLine(newProduct).total)}
                    </span>
                    {newProduct.discount > 0 && (
                      <span className="text-amber-400">({newProduct.discount}% off)</span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="w-full py-2 border border-dashed border-blue-500/50 text-blue-400 hover:bg-blue-500/10 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={15} /> Add Product Line
                </button>
              </div>

              {/* Added Products Table */}
              {products.length > 0 && (
                <div className="rounded-xl border border-[#334155] overflow-hidden">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1e293b] text-gray-300 text-xs border-b border-[#334155]">
                        <th className="p-3 text-left">Product</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Disc</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, idx) => {
                        const { total } = calcProductLine(p);
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-[#334155]/60 text-sm ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'}`}
                          >
                            <td className="p-3">
                              <p className="font-semibold text-gray-200 text-xs">{p.productName}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{p.sku}</p>
                            </td>
                            <td className="p-3 text-right text-gray-300 text-xs">{p.quantity} {p.unit}</td>
                            <td className="p-3 text-right text-gray-300 text-xs font-mono">{formatCurrency(p.unitPrice)}</td>
                            <td className="p-3 text-right text-amber-400 text-xs">{p.discount > 0 ? `${p.discount}%` : '—'}</td>
                            <td className="p-3 text-right font-bold text-white text-xs font-mono">{formatCurrency(total)}</td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(p.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section: Order Totals */}
            {products.length > 0 && (
              <div className="mt-4 bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-gray-200">{formatCurrency(totals.subTotal)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Total Discount:</span>
                    <span className="font-mono text-amber-400">- {formatCurrency(totals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white border-t border-[#334155] pt-2.5 mt-1">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400 font-mono text-base">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Notes (optional)</label>
              <textarea
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Any special instructions or notes for this order..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#334155] bg-[#1e293b]/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-order-form"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <ShoppingBag size={15} /> Create Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
