import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, ShoppingBag, Search, ChevronDown, Tag, Percent, FileCheck, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import type { Order, OrderProduct } from '../../types/orders';
import { mockSalesmen } from '../../data/mockOrders';
import { mockCustomers } from '../../data/mockCustomers';
import { mockInventoryItems } from '../../data/mockInventory';
import type { InventoryItem } from '../../types/inventory';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import type { PurchaseOrder } from '../../types/purchaseOrders';
import { mockInvoicesList } from '../../data/mockInvoices';
import type { InvoiceResponse } from '../../types/invoice';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useToast } from '../erp/Toast';
import CreatePOModal from './CreatePOModal';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order) => void;
}

interface DraftProduct {
  id: string;
  productName: string;
  quantity: number;
  unit: string; // strictly 'PCS'
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'amount';
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [salesmanSearch, setSalesmanSearch] = useState('');
  const [showSalesmanDropdown, setShowSalesmanDropdown] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [orderDate, setOrderDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Quick Add Product state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [createdInvoiceData, setCreatedInvoiceData] = useState<InvoiceResponse | null>(null);

  const [showPOModal, setShowPOModal] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    name: '',
    cost: '',
    sellPrice: '',
  });
  const [quickProductErrors, setQuickProductErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setCreatedOrder(null);
    }
  }, [isOpen]);

  const customerRef = useRef<HTMLDivElement>(null);
  const salesmanRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  useClickOutside([customerRef], () => setShowCustomerDropdown(false));
  useClickOutside([salesmanRef], () => setShowSalesmanDropdown(false));
  useClickOutside([productRef], () => setShowProductDropdown(false));

  // New product row state (quantity starts at 0, no sku/category/brand)
  const [newProduct, setNewProduct] = useState<DraftProduct>({
    id: '',
    productName: '',
    quantity: 0,
    unit: 'PCS',
    unitPrice: 0,
    discount: 0,
    discountType: 'percentage',
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

  // Filter products (Prefix / first letter match prioritized, then alphabetical)
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) {
      return [...mockInventoryItems].sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    }
    const matching = mockInventoryItems.filter(item =>
      (item.product_name || '').toLowerCase().includes(q) ||
      (item.product_code || '').toLowerCase().includes(q)
    );
    return matching.sort((a, b) => {
      const aStarts = (a.product_name || '').toLowerCase().startsWith(q) || (a.product_code || '').toLowerCase().startsWith(q);
      const bStarts = (b.product_name || '').toLowerCase().startsWith(q) || (b.product_code || '').toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (a.product_name || '').localeCompare(b.product_name || '');
    });
  }, [productSearch]);

  const selectedCustomer = mockCustomers.find(c => c.id === selectedCustomerId);
  const selectedSalesman = mockSalesmen.find(s => s.id === selectedSalesmanId);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const calcProductLine = (p: DraftProduct) => {
    const subtotal = (p.quantity || 0) * (p.unitPrice || 0);
    let discAmt = 0;
    if (p.discountType === 'amount') {
      discAmt = Math.min(p.discount || 0, subtotal);
    } else {
      discAmt = subtotal * (Math.min(100, Math.max(0, p.discount || 0)) / 100);
    }
    const total = Math.max(0, subtotal - discAmt);
    return { subtotal, discAmt, total };
  };

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalDiscount = 0;
    for (const p of products) {
      const { subtotal, discAmt } = calcProductLine(p);
      subTotal += subtotal;
      totalDiscount += discAmt;
    }
    return { subTotal, totalDiscount, grandTotal: Math.max(0, subTotal - totalDiscount) };
  }, [products]);

  const handleSelectProduct = (item: InventoryItem) => {
    setNewProduct(prev => ({
      ...prev,
      productName: item.product_name,
      unitPrice: item.sell_price || 0,
      unit: 'PCS',
    }));
    setProductSearch(item.product_name);
    setShowProductDropdown(false);
    setErrors(prev => ({ ...prev, productName: '', unitPrice: '' }));
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!quickProduct.name.trim()) errs.name = 'Product name is required';
    if (!quickProduct.cost || Number(quickProduct.cost) <= 0) errs.cost = 'Valid cost price is required';
    if (!quickProduct.sellPrice || Number(quickProduct.sellPrice) <= 0) errs.sellPrice = 'Valid selling price is required';
    if (Object.keys(errs).length > 0) {
      setQuickProductErrors(errs);
      return;
    }

    const newId = `inv-${Date.now()}`;
    const newCode = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newItem: InventoryItem = {
      _id: newId,
      id: newId,
      product_name: quickProduct.name.trim(),
      product_code: newCode,
      quantity: 100,
      sold_count: 0,
      status: 'in_stock',
      vehicle: { brand: 'Universal', model: 'All Models', chassis_no: 'N/A', year: 2026 },
      purchase_price: Number(quickProduct.cost),
      sell_price: Number(quickProduct.sellPrice),
      shipment_code: 'SHP-NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockInventoryItems.unshift(newItem);
    handleSelectProduct(newItem);
    setShowAddProductModal(false);
    setQuickProduct({ name: '', cost: '', sellPrice: '' });
    setQuickProductErrors({});
    toast.success('Product Added', `"${newItem.product_name}" added to inventory and selected.`);
  };

  const handleAddProduct = () => {
    const errs: Record<string, string> = {};
    if (!newProduct.productName.trim()) errs.productName = 'Product name required';
    if (newProduct.quantity <= 0) errs.quantity = 'Qty must be > 0';
    if (newProduct.unitPrice <= 0) errs.unitPrice = 'Selling price required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setProducts(prev => [...prev, { ...newProduct, id: Date.now().toString() }]);
    setNewProduct({
      id: '',
      productName: '',
      quantity: 0,
      unit: 'PCS',
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
    });
    setProductSearch('');
    setErrors({});
  };

  const handleRemoveProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedCustomerId) errs.customer = 'Please select a customer';
    if (products.length === 0) errs.products = 'Add at least one product';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const orderProducts: OrderProduct[] = products.map(p => {
      const { subtotal, discAmt, total } = calcProductLine(p);
      return {
        id: p.id,
        productName: p.productName,
        quantity: p.quantity,
        unit: 'PCS',
        unitPrice: p.unitPrice,
        discount: p.discountType === 'percentage' ? p.discount : (subtotal > 0 ? (discAmt / subtotal) * 100 : 0),
        tax: 0,
        subtotal,
        total,
      };
    });

    const orderId = `ORD-${10025 + Math.floor(Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: Date.now().toString(),
      orderId,
      orderDate,
      createdAt: now,
      updatedAt: now,
      salesman: selectedSalesman || null,
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
    setCreatedOrder(newOrder);
    toast.success('Order Created', `Order ${newOrder.orderId} created successfully! You can now convert to PO or Invoice.`);
  };

  const handleConvertToPO = () => {
    if (!createdOrder) return;
    setShowPOModal(true);
  };

  const handlePOSubmit = (newPO: PurchaseOrder) => {
    mockPurchaseOrders.unshift(newPO);
    setShowPOModal(false);
    toast.success('Converted to PO', `Purchase Order ${newPO.poNumber} created using inventory product cost price.`);
    handleReset();
    onClose();
    navigate('/purchase-orders');
  };

  const handleConvertToInvoice = () => {
    if (!createdOrder) return;
    const nextIdStr = `INV-2026-${(mockInvoicesList.length + 1).toString().padStart(3, '0')}`;

    const newInv: InvoiceResponse = {
      _id: `inv-${Date.now()}`,
      invoiceId: nextIdStr,
      customer: {
        _id: `c-${Date.now()}`,
        fullName: createdOrder.customerName,
        email: 'customer@business.lk',
        phone: createdOrder.contactPhone || '011-0000000',
        vatNumber: 'VAT-PENDING',
        customerCode: createdOrder.customerId || 'CUST-000',
        address: {
          street: createdOrder.customerAddress || 'N/A',
          city: createdOrder.customerCity || 'Colombo',
          country: 'Sri Lanka',
          zip: '00100',
        },
      },
      items: createdOrder.products.map((p, idx) => ({
        _id: `ii-${Date.now()}-${idx}`,
        item: p.id,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        total: p.total,
      })),
      subTotal: createdOrder.subTotal,
      discount: createdOrder.totalDiscount,
      totalAmount: createdOrder.grandTotal,
      paymentStatus: 'Pending',
      paymentMethod: 'Bank Transfer',
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleNumber: 'WP-CAD-1024',
      notes: `Generated from Order ${createdOrder.orderId}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockInvoicesList.unshift(newInv);
    toast.success('Converted to Invoice', `Invoice ${nextIdStr} created from ${createdOrder.orderId}`);
    handleReset();
    onClose();
    navigate('/invoice');
  };

  const handleReset = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
    setSelectedSalesmanId('');
    setSalesmanSearch('');
    setProductSearch('');
    setOrderDate(today);
    setNotes('');
    setProducts([]);
    setErrors({});
    setCreatedOrder(null);
    setNewProduct({
      id: '',
      productName: '',
      quantity: 0,
      unit: 'PCS',
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
    });
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
          <form id="create-order-form" onSubmit={handleSubmit} className="space-y-6">

            {/* Order Created Success Banner */}
            {createdOrder && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Order <strong>{createdOrder.orderId}</strong> created successfully! You can now use <strong>Convert to PO</strong> or <strong>Convert to Invoice</strong> below.
                  </span>
                </div>
              </div>
            )}

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

              {/* Add product line card */}
              <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Product Line</p>

                {/* Product Name Search Field with Instant Dropdown */}
                <div ref={productRef} className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-300">
                      Product Name <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickProduct({
                          name: productSearch.trim() || '',
                          cost: '',
                          sellPrice: '',
                        });
                        setQuickProductErrors({});
                        setShowAddProductModal(true);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Add New Product
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      className={`w-full bg-[#0f172a] border rounded-lg pl-9 pr-8 py-2.5 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        errors.productName ? 'border-red-500' : 'border-[#334155]'
                      }`}
                      placeholder="Select or search product name..."
                      value={newProduct.productName || productSearch}
                      onChange={e => {
                        const val = e.target.value;
                        setProductSearch(val);
                        setNewProduct(prev => ({ ...prev, productName: val, unitPrice: 0 }));
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onClick={() => setShowProductDropdown(true)}
                      autoComplete="off"
                    />
                    {(newProduct.productName || productSearch) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewProduct(prev => ({ ...prev, productName: '', unitPrice: 0 }));
                          setProductSearch('');
                          setShowProductDropdown(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                        title="Clear product"
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    )}
                  </div>

                  {showProductDropdown && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase bg-[#1e293b]/50 flex justify-between">
                        <span>{productSearch ? `Matching Products (${filteredProducts.length})` : `All Available Products (${filteredProducts.length})`}</span>
                        <span className="text-[10px] text-gray-500">A-Z</span>
                      </div>
                      {filteredProducts.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-400 text-center italic">No products found</p>
                      ) : (
                        filteredProducts.map(item => (
                          <div
                            key={item._id || item.product_code}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectProduct(item)}
                            className="px-3.5 py-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors hover:bg-[#1e293b] border-b border-[#334155]/40 last:border-b-0"
                          >
                            <span className="font-semibold text-gray-200">{item.product_name}</span>
                            <div className="text-right shrink-0 ml-3">
                              <span className="font-bold text-emerald-400 font-mono">
                                LKR {(item.sell_price || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                      {/* Quick Add Product button in dropdown footer */}
                      <div
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuickProduct({
                            name: productSearch.trim() || '',
                            cost: '',
                            sellPrice: '',
                          });
                          setQuickProductErrors({});
                          setShowAddProductModal(true);
                          setShowProductDropdown(false);
                        }}
                        className="p-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border-t border-[#334155] transition-colors"
                      >
                        <Plus size={13} /> {productSearch ? `Add "${productSearch}" as New Product` : 'Add New Product'}
                      </div>
                    </div>
                  )}
                  {errors.productName && <p className="text-red-400 text-xs mt-1">{errors.productName}</p>}
                </div>

                {/* Same Row: Selling Price (Not editable), Quantity (starts on 0, PCS), and Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  {/* Selling Price (Not Editable) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                      Selling Price
                    </label>
                    <div className="w-full bg-[#0a101f] border border-[#334155]/60 rounded-lg px-3 py-2.5 text-sm text-emerald-400 font-mono font-semibold flex items-center justify-between cursor-not-allowed select-none">
                      <span>{newProduct.unitPrice > 0 ? formatCurrency(newProduct.unitPrice) : 'LKR 0.00'}</span>
                      <span className="text-[10px] text-gray-500 font-sans font-normal uppercase">Auto</span>
                    </div>
                    {errors.unitPrice && <p className="text-red-400 text-[11px] mt-1">{errors.unitPrice}</p>}
                  </div>

                  {/* Quantity (Starts on 0, limited to PCS) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Quantity <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        className={`w-full bg-[#0f172a] border rounded-lg pl-3 pr-14 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.quantity ? 'border-red-500' : 'border-[#334155]'}`}
                        placeholder="0"
                        value={newProduct.quantity === 0 && !errors.quantity ? '0' : newProduct.quantity || ''}
                        onChange={e => setNewProduct(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#1e293b] text-gray-400 text-[11px] font-semibold px-2 py-0.5 rounded border border-[#334155] pointer-events-none">
                        PCS
                      </div>
                    </div>
                    {errors.quantity && <p className="text-red-400 text-[11px] mt-1">{errors.quantity}</p>}
                  </div>

                  {/* Discount Field (Same row with % vs Rs. toggle) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-gray-300">Discount</label>
                      <div className="flex items-center bg-[#0f172a] border border-[#334155] rounded-md p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setNewProduct(p => ({ ...p, discountType: 'percentage' }))}
                          className={`px-1.5 py-0.5 rounded transition-colors font-medium flex items-center gap-0.5 ${
                            newProduct.discountType === 'percentage'
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Percentage discount"
                        >
                          <Percent size={10} /> %
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewProduct(p => ({ ...p, discountType: 'amount' }))}
                          className={`px-1.5 py-0.5 rounded transition-colors font-medium flex items-center gap-0.5 ${
                            newProduct.discountType === 'amount'
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Amount discount (Rs.)"
                        >
                          <Tag size={10} /> Rs.
                        </button>
                      </div>
                    </div>

                    <input
                      type="number"
                      min="0"
                      max={newProduct.discountType === 'percentage' ? 100 : undefined}
                      step={newProduct.discountType === 'percentage' ? '0.1' : '1'}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={newProduct.discountType === 'percentage' ? '0 %' : 'Rs. 0'}
                      value={newProduct.discount || ''}
                      onChange={e => setNewProduct(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                {/* Live calculated line total summary */}
                {newProduct.quantity > 0 && newProduct.unitPrice > 0 && (
                  <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-4 text-gray-400">
                      <span>
                        Subtotal: <strong className="text-gray-200 font-mono">{formatCurrency(newProduct.quantity * newProduct.unitPrice)}</strong>
                      </span>
                      {calcProductLine(newProduct).discAmt > 0 && (
                        <span>
                          Discount: <strong className="text-amber-400 font-mono">- {formatCurrency(calcProductLine(newProduct).discAmt)}</strong>
                          <span className="text-[10px] text-gray-500 ml-1">
                            ({newProduct.discountType === 'percentage' ? `${newProduct.discount}%` : `Rs. ${newProduct.discount}`})
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-300 font-medium">Line Total:</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {formatCurrency(calcProductLine(newProduct).total)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="w-full py-2.5 border border-dashed border-blue-500/50 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={15} /> Add to Product Line
                </button>
              </div>

              {/* Added Products Table */}
              {products.length > 0 && (
                <div className="rounded-xl border border-[#334155] overflow-hidden">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-[#1e293b] text-gray-300 text-xs border-b border-[#334155]">
                        <th className="p-3 text-left">Product Name</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Selling Price</th>
                        <th className="p-3 text-right">Discount</th>
                        <th className="p-3 text-right">Line Total</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p, idx) => {
                        const { discAmt, total } = calcProductLine(p);
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-[#334155]/60 text-sm ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'}`}
                          >
                            <td className="p-3">
                              <p className="font-semibold text-gray-200 text-xs">{p.productName}</p>
                            </td>
                            <td className="p-3 text-right text-gray-300 text-xs font-mono">{p.quantity} PCS</td>
                            <td className="p-3 text-right text-gray-300 text-xs font-mono">{formatCurrency(p.unitPrice)}</td>
                            <td className="p-3 text-right text-xs font-mono">
                              {discAmt > 0 ? (
                                <span className="text-amber-400">
                                  {p.discountType === 'percentage' ? `${p.discount}% (-${formatCurrency(discAmt)})` : `- ${formatCurrency(discAmt)}`}
                                </span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
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
        <div className="flex-shrink-0 px-6 py-4 border-t border-[#334155] bg-[#1e293b]/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition-colors"
          >
            {createdOrder ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {/* Convert to PO button */}
            <button
              type="button"
              onClick={handleConvertToPO}
              disabled={!createdOrder}
              title={!createdOrder ? 'Create the order first to convert to Purchase Order' : 'Convert order to Purchase Order'}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                createdOrder
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'bg-[#1e293b]/50 border border-[#334155] text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              <FileCheck size={14} /> Convert to PO
            </button>

            {/* Convert to Invoice button */}
            <button
              type="button"
              onClick={handleConvertToInvoice}
              disabled={!createdOrder}
              title={!createdOrder ? 'Create the order first to convert to Invoice' : 'Convert order to Invoice'}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                createdOrder
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer'
                  : 'bg-[#1e293b]/50 border border-[#334155] text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              <FileText size={14} /> Convert to Invoice
            </button>

            {/* Create Order button / Created State */}
            {!createdOrder ? (
              <button
                type="submit"
                form="create-order-form"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
              >
                <ShoppingBag size={14} /> Create Order
              </button>
            ) : (
              <div className="px-3.5 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 select-none">
                <CheckCircle size={14} /> Order Created
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add New Product Modal Dialog */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] bg-[#0f172a]/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Add New Product</h3>
                  <p className="text-[11px] text-gray-400">Create a product and auto-fill it into the order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    quickProductErrors.name ? 'border-red-500' : 'border-[#334155]'
                  }`}
                  placeholder="e.g. PVC High Pressure Valve 25mm"
                  value={quickProduct.name}
                  onChange={e => {
                    setQuickProduct(p => ({ ...p, name: e.target.value }));
                    if (quickProductErrors.name) setQuickProductErrors(p => ({ ...p, name: '' }));
                  }}
                  autoFocus
                />
                {quickProductErrors.name && (
                  <p className="text-red-400 text-[11px] mt-1">{quickProductErrors.name}</p>
                )}
              </div>

              {/* Cost & Selling Price in 2 Columns */}
              <div className="grid grid-cols-2 gap-3">
                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Cost (LKR) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      quickProductErrors.cost ? 'border-red-500' : 'border-[#334155]'
                    }`}
                    placeholder="0.00"
                    value={quickProduct.cost}
                    onChange={e => {
                      setQuickProduct(p => ({ ...p, cost: e.target.value }));
                      if (quickProductErrors.cost) setQuickProductErrors(p => ({ ...p, cost: '' }));
                    }}
                  />
                  {quickProductErrors.cost && (
                    <p className="text-red-400 text-[11px] mt-1">{quickProductErrors.cost}</p>
                  )}
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Selling Price (LKR) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      quickProductErrors.sellPrice ? 'border-red-500' : 'border-[#334155]'
                    }`}
                    placeholder="0.00"
                    value={quickProduct.sellPrice}
                    onChange={e => {
                      setQuickProduct(p => ({ ...p, sellPrice: e.target.value }));
                      if (quickProductErrors.sellPrice) setQuickProductErrors(p => ({ ...p, sellPrice: '' }));
                    }}
                  />
                  {quickProductErrors.sellPrice && (
                    <p className="text-red-400 text-[11px] mt-1">{quickProductErrors.sellPrice}</p>
                  )}
                </div>
              </div>

              {/* Auto-Calculated Profit Margin Card */}
              {Number(quickProduct.sellPrice) > 0 && Number(quickProduct.cost) > 0 && (
                <div className="bg-[#0f172a] border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <TrendingUp size={14} />
                    </div>
                    <span className="text-xs font-semibold text-gray-300">Profit Margin:</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-xs font-bold ${
                      Number(quickProduct.sellPrice) >= Number(quickProduct.cost) ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(Number(quickProduct.sellPrice) - Number(quickProduct.cost))}
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {(
                        ((Number(quickProduct.sellPrice) - Number(quickProduct.cost)) /
                          Number(quickProduct.sellPrice)) *
                        100
                      ).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#334155] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Plus size={14} /> Save & Select Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to PO Modal */}
      {showPOModal && createdOrder && (
        <CreatePOModal
          isOpen={showPOModal}
          onClose={() => setShowPOModal(false)}
          onSubmit={handlePOSubmit}
          initialData={{
            referenceOrderId: createdOrder.orderId,
            referenceOrderNum: createdOrder.orderId,
            customerName: createdOrder.customerName,
            notes: `Converted from Sales Order #${createdOrder.orderId}`,
            items: createdOrder.products.map((p) => ({
              sku: p.sku,
              productName: p.productName,
              quantity: p.quantity,
              sellingPrice: p.unitPrice,
            })),
          }}
        />
      )}
    </div>
  );
};

export default CreateOrderModal;
