import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, ShoppingBag, Search, ChevronDown, FileCheck, FileText, CheckCircle, TrendingUp, MessageCircle } from 'lucide-react';
import type { Order, OrderProduct } from '../../types/orders';
import type { InventoryItem } from '../../types/inventory';
import type { PurchaseOrder } from '../../types/purchaseOrders';
import { invoiceService } from '../../services/InvoiceService';
import { inventoryService } from '../../services/InventoryService';
import { purchaseOrderService } from '../../services/PurchaseOrderService';
import { salesOfficerService } from '../../services/SalesOfficerService';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useToast } from '../erp/Toast';
import { generateOrderWhatsAppMessage, getWhatsAppUrl } from '../../utils/whatsapp';
import CreatePOModal from './CreatePOModal';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order) => Promise<Order | void> | void;
}

interface DraftProduct {
  id: string;
  productName: string;
  quantity: number;
  unit: string; // strictly 'PCS'
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'amount';
  discountScope?: 'per_unit' | 'total';
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
    discountScope: 'per_unit',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [allSalesmen, setAllSalesmen] = useState<any[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      invoiceService.getAllCustomers().then(c => setAllCustomers(c || [])).catch(() => {});
      salesOfficerService.getAll().then(s => setAllSalesmen(s.map(o => ({ id: o.id, name: o.fullName, employeeId: o.officerId, phone: o.contactNumber || o.phone, area: o.assignedTerritory || o.assignedArea })) || [])).catch(() => {});
      inventoryService.getAll().then(i => setAllInventoryItems(i || [])).catch(() => {});
    }
  }, [isOpen]);

  // Filter customers by name only (Prefix / first letter match prioritized, then alphabetical)
  const filteredCustomers = useMemo(() => {
    const activeCusts = allCustomers.filter(c => c.status !== 'Inactive');
    const q = customerSearch.trim().toLowerCase();
    if (!q) {
      return [...activeCusts].sort((a, b) => (a.shopName || a.fullName || '').localeCompare(b.shopName || b.fullName || ''));
    }
    const matching = activeCusts.filter(c => (c.shopName || c.fullName || '').toLowerCase().includes(q));
    return matching.sort((a, b) => {
      const aName = a.shopName || a.fullName || '';
      const bName = b.shopName || b.fullName || '';
      const aStarts = aName.toLowerCase().startsWith(q);
      const bStarts = bName.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });
  }, [allCustomers, customerSearch]);

  // Filter salesmen by name only (Prefix / first letter match prioritized, then alphabetical)
  const filteredSalesmen = useMemo(() => {
    const q = salesmanSearch.trim().toLowerCase();
    if (!q) {
      return [...allSalesmen].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    const matching = allSalesmen.filter(s => (s.name || '').toLowerCase().includes(q));
    return matching.sort((a, b) => {
      const aStarts = (a.name || '').toLowerCase().startsWith(q);
      const bStarts = (b.name || '').toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [allSalesmen, salesmanSearch]);

  // Filter products (Prefix / first letter match prioritized, then alphabetical)
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) {
      return [...allInventoryItems].sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
    }
    const matching = allInventoryItems.filter(item =>
      (item.productName || '').toLowerCase().includes(q) ||
      (item.productCode || '').toLowerCase().includes(q)
    );
    return matching.sort((a, b) => {
      const aStarts = (a.productName || '').toLowerCase().startsWith(q) || (a.productCode || '').toLowerCase().startsWith(q);
      const bStarts = (b.productName || '').toLowerCase().startsWith(q) || (b.productCode || '').toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (a.productName || '').localeCompare(b.productName || '');
    });
  }, [allInventoryItems, productSearch]);

  const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId || c.id === selectedCustomerId || c.customerCode === selectedCustomerId);
  const selectedSalesman = allSalesmen.find(s => s.id === selectedSalesmanId || s.employeeId === selectedSalesmanId);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const calcProductLine = (p: DraftProduct) => {
    const qty = p.quantity || 0;
    const unitPrice = p.unitPrice || 0;
    const subtotal = qty * unitPrice;
    const discVal = p.discount || 0;
    const scope = p.discountScope || 'per_unit';
    let discAmt = 0;

    if (discVal > 0 && unitPrice > 0 && qty > 0) {
      if (p.discountType === 'amount') {
        if (scope === 'per_unit') {
          discAmt = Math.min(unitPrice, discVal) * qty;
        } else {
          discAmt = Math.min(subtotal, discVal);
        }
      } else {
        const pct = Math.min(100, Math.max(0, discVal));
        if (scope === 'per_unit') {
          discAmt = unitPrice * (pct / 100) * qty;
        } else {
          discAmt = subtotal * (pct / 100);
        }
      }
    }
    const total = Math.max(0, subtotal - discAmt);
    return { subtotal, discAmt, total };
  };

  const [totalDiscountType, setTotalDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [totalDiscountValue, setTotalDiscountValue] = useState<number>(0);

  const totals = useMemo(() => {
    let itemsSubtotal = 0;
    let lineDiscountTotal = 0;
    for (const p of products) {
      const { subtotal, discAmt } = calcProductLine(p);
      itemsSubtotal += subtotal;
      lineDiscountTotal += discAmt;
    }
    const subTotalAfterLineDiscounts = Math.max(0, itemsSubtotal - lineDiscountTotal);
    let orderDiscount = 0;
    if (totalDiscountValue > 0) {
      if (totalDiscountType === 'percentage') {
        orderDiscount = subTotalAfterLineDiscounts * (Math.min(100, totalDiscountValue) / 100);
      } else {
        orderDiscount = Math.min(subTotalAfterLineDiscounts, totalDiscountValue);
      }
    }
    const totalDiscount = lineDiscountTotal + orderDiscount;
    const grandTotal = Math.max(0, subTotalAfterLineDiscounts - orderDiscount);

    return {
      itemsSubtotal,
      lineDiscountTotal,
      orderDiscount,
      totalDiscount,
      subTotal: itemsSubtotal,
      grandTotal,
    };
  }, [products, totalDiscountType, totalDiscountValue]);

  const handleSelectProduct = (item: InventoryItem) => {
    setNewProduct(prev => ({
      ...prev,
      id: item.id,
      productName: item.productName,
      unitPrice: item.sellPrice || 0,
      quantity: 0,
      unit: 'PCS',
    }));
    setProductSearch(item.productName);
    setShowProductDropdown(false);
    setErrors(prev => ({ ...prev, productName: '', unitPrice: '' }));
  };

  const handleSaveNewProduct = async (e: React.FormEvent) => {
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
      id: newId,
      inventoryCode: newCode,
      productName: quickProduct.name.trim(),
      productCode: newCode,
      quantity: 0,
      soldCount: 0,
      status: 'in_stock',
      purchasePrice: Number(quickProduct.cost),
      sellPrice: Number(quickProduct.sellPrice),
      discountRate: 0,
      actualSoldPrice: Number(quickProduct.sellPrice),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await inventoryService.create(newItem);
    } catch {
      // ignore
    }
    setAllInventoryItems(prev => [newItem, ...prev]);
    handleSelectProduct(newItem);
    setShowAddProductModal(false);
    setQuickProduct({ name: '', cost: '', sellPrice: '' });
    setQuickProductErrors({});
    toast.success('Product Added', `"${newItem.productName}" added to inventory and selected.`);
  };

  const handleAddProduct = () => {
    const errs: Record<string, string> = {};
    if (!newProduct.productName.trim()) errs.productName = 'Product name required';
    if (newProduct.quantity <= 0) errs.quantity = 'Qty must be > 0';
    if (newProduct.unitPrice <= 0) errs.unitPrice = 'Selling price required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setProducts(prev => [...prev, { ...newProduct, id: newProduct.id || Date.now().toString() }]);
    setNewProduct({
      id: '',
      productName: '',
      quantity: 0,
      unit: 'PCS',
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      discountScope: 'per_unit',
    });
    setProductSearch('');
    setErrors({});
  };

  const handleRemoveProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedCustomerId) errs.customer = 'Please select a customer';
    if (products.length === 0) errs.products = 'Add at least one product';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const orderProducts: OrderProduct[] = products.map(p => {
      const { subtotal, discAmt, total } = calcProductLine(p);
      return {
        id: p.id,
        inventoryItemId: p.id,
        sku: p.id,
        productName: p.productName,
        quantity: p.quantity,
        unit: 'PCS',
        unitPrice: p.unitPrice,
        discount: p.discountType === 'percentage' ? p.discount : (subtotal > 0 ? (discAmt / subtotal) * 100 : 0),
        tax: 0,
        subTotal: subtotal,
        total,
      };
    });

    const orderId = `ORD-${10025 + Math.floor(Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: Date.now().toString(),
      orderNumber: orderId,
      orderDate,
      createdAt: now,
      updatedAt: now,
      salesman: selectedSalesman ? { id: selectedSalesman.id, fullName: selectedSalesman.name } as any : null,
      salesmanId: selectedSalesman?.id || null,
      salesmanName: selectedSalesman?.name || null,
      salesmanEmployeeId: selectedSalesman?.employeeId || null,
      salesmanPhone: selectedSalesman?.phone || null,
      salesmanArea: selectedSalesman?.area || null,
      customerId: selectedCustomer!.id,
      customerName: selectedCustomer!.shopName || selectedCustomer!.fullName || 'Customer',
      contactPerson: selectedCustomer!.contactPerson || '',
      contactPhone: selectedCustomer!.phone,
      customerAddress: selectedCustomer!.address || '',
      customerCity: selectedCustomer!.city || '',
      items: orderProducts,
      numberOfProducts: orderProducts.length,
      subTotal: totals.subTotal,
      totalDiscount: totals.totalDiscount,
      totalTax: 0,
      grandTotal: totals.grandTotal,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes,
      timeline: [
        {
          id: Date.now().toString(),
          event: 'Order Created',
          description: 'Order created manually by Admin',
          occurredAt: now,
          actor: 'Admin User',
        },
      ],
    };

    let createdResult: Order = newOrder;
    try {
      const res = await onSubmit(newOrder);
      if (res && (res as Order).id) {
        createdResult = res as Order;
      }
    } catch {
      // ignore
    }
    setCreatedOrder(createdResult);
    toast.success('Order Created', `Order ${createdResult.orderNumber} created successfully! You can now share on WhatsApp, or convert to PO / Invoice.`);
  };

  const handleShareWhatsApp = (orderToShare?: Order) => {
    const target = orderToShare || createdOrder;
    if (!target) return;
    const phone = target.contactPhone || selectedCustomer?.phone || '';
    const text = generateOrderWhatsAppMessage({
      orderNumber: target.orderNumber,
      customerName: target.customerName,
      totalAmount: target.grandTotal,
      orderDate: target.orderDate,
      itemsCount: target.items.length,
      remarks: target.notes || notes,
    });
    const url = getWhatsAppUrl(phone, text);
    window.open(url, '_blank');
  };

  const handleConvertToPO = () => {
    if (!createdOrder) return;
    setShowPOModal(true);
  };

  const handlePOSubmit = async (newPO: PurchaseOrder) => {
    try {
      await purchaseOrderService.create(newPO);
    } catch {
      // ignore
    }
    setShowPOModal(false);
    toast.success('converted_to_po', `Purchase Order ${newPO.poNumber} created using inventory product cost price.`);
    handleReset();
    onClose();
    navigate('/purchase-orders');
  };

  const handleConvertToInvoice = async () => {
    if (!createdOrder) return;
    // Navigate to Invoice page with the order as context.
    // The Invoice page will pre-fill the form so the user can review and save.
    handleReset();
    onClose();
    navigate('/invoice', { state: { convertFromOrder: createdOrder } });
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
    setTotalDiscountType('percentage');
    setTotalDiscountValue(0);
    setNewProduct({
      id: '',
      productName: '',
      quantity: 0,
      unit: 'PCS',
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage',
      discountScope: 'per_unit',
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

      {/* Slide-in panel - 70% width on md+ screens */}
      <div className="relative w-full md:w-[70vw] lg:w-[70vw] xl:w-[70vw] max-w-none h-screen bg-[#0f172a] border-l border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-slideIn">

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
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Order <strong>{createdOrder.orderNumber}</strong> created successfully! You can share on WhatsApp or convert to PO / Invoice.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(createdOrder)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <MessageCircle size={13} /> Share on WhatsApp
                </button>
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
                      value={selectedCustomer ? selectedCustomer.shopName : customerSearch}
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
                            <span>{c.shopName}</span>
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
              <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-3">
                {/* Header with Top-Left Add Button */}
                <div className="flex items-center justify-between pb-1 border-b border-[#334155]/60">
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={14} /> Add Product Line
                  </button>
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
                    <Plus size={13} /> Quick Add Product
                  </button>
                </div>

                {/* All Fields in One Row */}
                <div className="grid grid-cols-12 gap-3 items-start pt-1">
                  {/* Product Name Search Field (Smaller text, compact) */}
                  <div ref={productRef} className="col-span-12 md:col-span-4 lg:col-span-4 relative">
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      Product Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        className={`w-full bg-[#0f172a] border rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          errors.productName ? 'border-red-500' : 'border-[#334155]'
                        }`}
                        placeholder="Search product..."
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
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                          title="Clear product"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      )}
                    </div>

                    {showProductDropdown && (
                      <div className="absolute z-50 top-full mt-1 w-full min-w-[280px] bg-[#0f172a] border border-[#334155] rounded-xl shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase bg-[#1e293b]/50 flex justify-between">
                          <span>{productSearch ? `Matching (${filteredProducts.length})` : `All Products (${filteredProducts.length})`}</span>
                          <span className="text-[10px] text-gray-500">Price</span>
                        </div>
                        {filteredProducts.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-gray-400 text-center italic">No products found</p>
                        ) : (
                          filteredProducts.map(item => (
                            <div
                              key={item.id || item.productCode}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectProduct(item)}
                              className="px-3 py-2 cursor-pointer flex items-center justify-between text-xs transition-colors hover:bg-[#1e293b] border-b border-[#334155]/40 last:border-b-0"
                            >
                              <div className="truncate pr-2">
                                <span className="font-semibold text-gray-200 block truncate">{item.productName}</span>
                                {item.productCode && <span className="text-[10px] text-blue-400 font-mono">{item.productCode}</span>}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-emerald-400 font-mono text-xs">
                                  LKR {(item.sellPrice || 0).toLocaleString()}
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
                          className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border-t border-[#334155] transition-colors"
                        >
                          <Plus size={12} /> {productSearch ? `Add "${productSearch}"` : 'Add New Product'}
                        </div>
                      </div>
                    )}
                    {errors.productName && <p className="text-red-400 text-[11px] mt-0.5">{errors.productName}</p>}
                  </div>

                  {/* Unit Price (Auto) */}
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate">
                      Unit Price
                    </label>
                    <div className="w-full h-[32px] bg-[#0a101f] border border-[#334155]/60 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-mono font-semibold flex items-center justify-between cursor-not-allowed select-none">
                      <span className="truncate">{newProduct.unitPrice > 0 ? formatCurrency(newProduct.unitPrice) : 'LKR 0.00'}</span>
                    </div>
                    {errors.unitPrice && <p className="text-red-400 text-[11px] mt-0.5">{errors.unitPrice}</p>}
                  </div>

                  {/* Quantity (Roomier space for input) */}
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                      Quantity <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        className={`w-full h-[32px] bg-[#0f172a] border rounded-lg pl-3 pr-8 py-1 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center ${errors.quantity ? 'border-red-500' : 'border-[#334155]'}`}
                        placeholder="0"
                        value={newProduct.quantity === 0 && !errors.quantity ? '0' : newProduct.quantity || ''}
                        onChange={e => setNewProduct(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 pointer-events-none">
                        PCS
                      </span>
                    </div>
                    {errors.quantity && <p className="text-red-400 text-[11px] mt-0.5">{errors.quantity}</p>}
                  </div>

                  {/* Discount (Compact % / Rs. toggle + input) */}
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-gray-300">Discount</label>
                      <div className="flex items-center bg-[#0f172a] border border-[#334155] rounded p-0.5 text-[9px]">
                        <button
                          type="button"
                          onClick={() => setNewProduct(p => ({ ...p, discountType: 'percentage' }))}
                          className={`px-1 py-0.2 rounded transition-colors font-bold ${
                            newProduct.discountType === 'percentage'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Percentage (%)"
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewProduct(p => ({ ...p, discountType: 'amount' }))}
                          className={`px-1 py-0.2 rounded transition-colors font-bold ${
                            newProduct.discountType === 'amount'
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                          title="Amount (Rs.)"
                        >
                          Rs
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={newProduct.discountType === 'percentage' ? 100 : undefined}
                        step={newProduct.discountType === 'percentage' ? '0.1' : '1'}
                        className="w-full h-[32px] bg-[#0f172a] border border-[#334155] rounded-lg pl-2 pr-6 py-1 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                        placeholder="0"
                        value={newProduct.discount || ''}
                        onChange={e => setNewProduct(p => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 pointer-events-none">
                        {newProduct.discountType === 'percentage' ? '%' : 'Rs'}
                      </span>
                    </div>
                  </div>

                  {/* Apply Discount: Unit / Total (Invoice Style) */}
                  <div className="col-span-6 sm:col-span-3 md:col-span-2 lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1 truncate">
                      Apply Discount
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-[#0f172a] p-0.5 border border-[#334155] rounded-lg h-[32px]">
                      <button
                        type="button"
                        onClick={() => setNewProduct(p => ({ ...p, discountScope: 'per_unit' }))}
                        className={`text-[10px] rounded font-semibold transition flex items-center justify-center ${
                          newProduct.discountScope === 'per_unit'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        title="Apply discount per unit"
                      >
                        Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewProduct(p => ({ ...p, discountScope: 'total' }))}
                        className={`text-[10px] rounded font-semibold transition flex items-center justify-center ${
                          newProduct.discountScope === 'total'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        title="Apply discount on total line"
                      >
                        Total
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live calculated line total preview */}
                {newProduct.quantity > 0 && newProduct.unitPrice > 0 && (
                  <div className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-gray-400">
                      <span>
                        Subtotal: <strong className="text-gray-200 font-mono">{formatCurrency(newProduct.quantity * newProduct.unitPrice)}</strong>
                      </span>
                      {calcProductLine(newProduct).discAmt > 0 && (
                        <span>
                          Discount ({newProduct.discountScope === 'per_unit' ? 'Unit' : 'Total'}):{' '}
                          <strong className="text-amber-400 font-mono">- {formatCurrency(calcProductLine(newProduct).discAmt)}</strong>
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
              </div>

              {/* Added Products Table */}
              {products.length > 0 && (
                <div className="rounded-xl border border-[#334155] overflow-hidden bg-[#0f172a]">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#1e293b] text-gray-300 text-xs border-b border-[#334155]">
                          <th className="py-2.5 px-3 w-8 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[140px]">Product</th>
                          <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right">Selling Price</th>
                          <th className="py-2.5 px-3 w-24 text-center">Discount</th>
                          <th className="py-2.5 px-3 w-24 text-center">Apply Discount</th>
                          <th className="py-2.5 px-3 w-32 text-right">Line Total</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]/60 text-xs">
                        {products.map((p, idx) => {
                          const { discAmt, total } = calcProductLine(p);
                          return (
                            <tr
                              key={p.id}
                              className={`hover:bg-[#1e293b]/40 transition-colors ${idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#111b2d]'}`}
                            >
                              <td className="py-2.5 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-gray-200 text-xs">{p.productName}</p>
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-300 font-mono whitespace-nowrap">{p.quantity} PCS</td>
                              <td className="py-2.5 px-3 text-right text-gray-300 font-mono whitespace-nowrap">{formatCurrency(p.unitPrice)}</td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                {discAmt > 0 ? (
                                  <span className="text-amber-400">
                                    {p.discountType === 'percentage' ? `${p.discount}%` : `Rs. ${p.discount}`}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {p.discountScope === 'total' ? 'Total' : 'Unit'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-white font-mono whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                  <span className="text-emerald-400">{formatCurrency(total)}</span>
                                  {discAmt > 0 && (
                                    <span className="text-[10px] text-amber-400/80 font-normal">-{formatCurrency(discAmt)}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(p.id)}
                                  className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-[#1e293b] transition-colors"
                                  title="Remove product"
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
                </div>
              )}
            </div>

            {/* Section: Order Totals */}
            {products.length > 0 && (
              <div className="mt-4 bg-[#1e293b]/70 border border-[#334155] rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-gray-200">{formatCurrency(totals.itemsSubtotal)}</span>
                </div>

                {/* Total Order Discount Input (% or Rs.) */}
                <div className="py-2.5 px-3 bg-[#0f172a]/60 rounded-lg border border-[#334155]/80">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs font-medium">Order Discount:</span>
                      <div className="flex bg-[#1e293b] p-0.5 rounded border border-[#334155]">
                        <button
                          type="button"
                          onClick={() => setTotalDiscountType('percentage')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                            totalDiscountType === 'percentage'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setTotalDiscountType('amount')}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                            totalDiscountType === 'amount'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Rs.
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          max={totalDiscountType === 'amount' ? undefined : 100}
                          value={totalDiscountValue > 0 ? totalDiscountValue : ''}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setTotalDiscountValue(val);
                          }}
                          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-2.5 py-1 text-xs font-mono text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500 pr-7"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-500 pointer-events-none">
                          {totalDiscountType === 'amount' ? 'Rs' : '%'}
                        </span>
                      </div>
                      {totals.totalDiscount > 0 && (
                        <span className="text-amber-400 font-mono text-xs font-medium">
                          - {formatCurrency(totals.totalDiscount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

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

          <div className="flex flex-wrap items-center gap-2">
            {/* Share on WhatsApp button */}
            {createdOrder && (
              <button
                type="button"
                onClick={() => handleShareWhatsApp(createdOrder)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                title="Share order details on WhatsApp"
              >
                <MessageCircle size={14} /> Share on WhatsApp
              </button>
            )}

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
                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 cursor-pointer'
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
            sourceOrderId: createdOrder.id,
            sourceOrderNumber: createdOrder.orderNumber,
            customerName: createdOrder.customerName,
            notes: `Converted from Sales Order #${createdOrder.orderNumber}`,
            items: createdOrder.items.map((p) => ({
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
