import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Search, ShoppingBag } from 'lucide-react';
import type { PurchaseOrder, POItem } from '../../types/purchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockInventoryItems } from '../../data/mockInventory';
import type { InventoryItem } from '../../types/inventory';
import { useToast } from '../erp/Toast';
import { useClickOutside } from '../../hooks/useClickOutside';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (po: PurchaseOrder) => void;
  poToEdit?: PurchaseOrder | null;
}

interface DraftItem {
  inventoryItem: InventoryItem;
  quantity: number;
  unitPrice: number;
}

const CreatePOModal: React.FC<CreatePOModalProps> = ({ isOpen, onClose, onSubmit, poToEdit }) => {
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];

  // Supplier state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);
  useClickOutside([supplierRef], () => setShowSupplierDropdown(false));

  // Quick Add Supplier state (if no suppliers exist or custom)
  const [isCustomSupplier, setIsCustomSupplier] = useState(false);
  const [customSupplier, setCustomSupplier] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
  });

  // Dates & Details
  const [poDate, setPoDate] = useState(today);
  const [referenceOrderNum, setReferenceOrderNum] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  useClickOutside([itemRef], () => setShowItemDropdown(false));

  const [selectedItemToAdd, setSelectedItemToAdd] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);

  // Quick Add Product state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    name: '',
    cost: '',
    sellPrice: '',
  });
  const [quickProductErrors, setQuickProductErrors] = useState<Record<string, string>>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (poToEdit) {
      const exists = mockSuppliers.some((s) => s.supplierId === poToEdit.supplierId);
      if (exists) {
        setSelectedSupplierId(poToEdit.supplierId);
        setSupplierSearch(`${poToEdit.supplierName} (${poToEdit.supplierId})`);
        setIsCustomSupplier(false);
      } else {
        setSelectedSupplierId('');
        setIsCustomSupplier(true);
        setCustomSupplier({
          companyName: poToEdit.supplierName,
          contactPerson: poToEdit.supplierContact,
          phone: poToEdit.supplierPhone,
          email: poToEdit.supplierEmail || '',
          address: poToEdit.supplierAddress,
          city: poToEdit.supplierCity,
        });
      }
      setPoDate(poToEdit.poDate);
      setReferenceOrderNum(poToEdit.referenceOrderNum || '');
      setNotes(poToEdit.notes || '');

      const draftItems: DraftItem[] = poToEdit.items.map((item) => {
        const invItem = mockInventoryItems.find((inv) => inv.product_code === item.sku) || {
          _id: item.id,
          id: item.id,
          product_code: item.sku,
          product_name: item.productName,
          quantity: 0,
          sold_count: 0,
          status: 'in_stock' as const,
          vehicle: { brand: 'Universal', model: 'All Models', chassis_no: 'N/A', year: 2026 },
          purchase_price: item.unitPrice,
          sell_price: item.unitPrice * 1.3,
          shipment_code: 'DIRECT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          inventoryItem: invItem,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        };
      });
      setItems(draftItems);
    } else {
      resetState();
    }
  }, [poToEdit, isOpen]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return mockSuppliers;
    return mockSuppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.supplierId.toLowerCase().includes(q)
    );
  }, [supplierSearch]);

  // Filter items
  const filteredInventoryItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return mockInventoryItems;
    return mockInventoryItems.filter(
      (item) =>
        item.product_name.toLowerCase().includes(q) ||
        item.product_code.toLowerCase().includes(q)
    );
  }, [itemSearch]);

  const handleSelectSupplier = (sup: typeof mockSuppliers[0]) => {
    setSelectedSupplierId(sup.id);
    setSupplierSearch(`${sup.companyName} (${sup.supplierId})`);
    setShowSupplierDropdown(false);
    setIsCustomSupplier(false);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemToAdd(item);
    setItemSearch(`${item.product_name} (${item.product_code})`);
    setAddPrice(item.purchase_price || 0);
    setShowItemDropdown(false);
  };

  const handleAddItem = () => {
    if (!selectedItemToAdd) {
      toast.error('Validation Error', 'Please select an item to add.');
      return;
    }
    if (addQty <= 0) {
      toast.error('Validation Error', 'Quantity must be greater than 0.');
      return;
    }

    const existingIdx = items.findIndex((it) => it.inventoryItem._id === selectedItemToAdd._id);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += addQty;
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          inventoryItem: selectedItemToAdd,
          quantity: addQty,
          unitPrice: addPrice,
        },
      ]);
    }

    setSelectedItemToAdd(null);
    setItemSearch('');
    setAddQty(1);
    setAddPrice(0);
    toast.success('Item Added', 'Item added to draft purchase order.');
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick Add Product action
  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct.name.trim()) {
      setQuickProductErrors({ name: 'Product name is required' });
      return;
    }

    const cost = parseFloat(quickProduct.cost) || 0;
    const sellPrice = parseFloat(quickProduct.sellPrice) || 0;

    const newInvItem: InventoryItem = {
      _id: `inv-${Date.now()}`,
      id: `inv-${Date.now()}`,
      product_code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      product_name: quickProduct.name.trim(),
      quantity: 0,
      sold_count: 0,
      status: 'in_stock',
      vehicle: { brand: 'Universal', model: 'All Models', chassis_no: 'N/A', year: new Date().getFullYear() },
      purchase_price: cost,
      sell_price: sellPrice,
      shipment_code: 'DIRECT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockInventoryItems.unshift(newInvItem);
    handleSelectItem(newInvItem);
    setShowAddProductModal(false);
    toast.success('Product Added', `${quickProduct.name} created and selected.`);
  };

  // Financial calculations
  const financials = useMemo(() => {
    const subTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return { subTotal, grandTotal: subTotal };
  }, [items]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (isCustomSupplier) {
      if (!customSupplier.companyName.trim()) newErrors.supplier = 'Company Name is required';
      if (!customSupplier.phone.trim()) newErrors.phone = 'Phone number is required';
    } else if (!selectedSupplierId) {
      newErrors.supplier = 'Please select a supplier or create a custom one';
    }

    if (items.length === 0) {
      newErrors.items = 'Please add at least one item to this Purchase Order';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Form Error', 'Please correct the errors in the form before submitting.');
      return;
    }

    // Build supplier info
    let supplierInfo = {
      supplierId: `SUP-${Math.floor(10000 + Math.random() * 90000)}`,
      supplierName: '',
      supplierContact: '',
      supplierPhone: '',
      supplierAddress: '',
      supplierCity: '',
    };

    if (isCustomSupplier) {
      supplierInfo.supplierName = customSupplier.companyName;
      supplierInfo.supplierContact = customSupplier.contactPerson || 'N/A';
      supplierInfo.supplierPhone = customSupplier.phone;
      supplierInfo.supplierAddress = customSupplier.address || 'N/A';
      supplierInfo.supplierCity = customSupplier.city || 'N/A';
    } else {
      const found = mockSuppliers.find((s) => s.id === selectedSupplierId);
      if (found) {
        supplierInfo.supplierId = found.supplierId;
        supplierInfo.supplierName = found.companyName;
        supplierInfo.supplierContact = found.contactPerson;
        supplierInfo.supplierPhone = found.phone;
        supplierInfo.supplierAddress = found.address;
        supplierInfo.supplierCity = found.city;
      }
    }

    // Build Items
    const poItems: POItem[] = items.map((it) => ({
      id: it.inventoryItem._id,
      sku: it.inventoryItem.product_code,
      productName: it.inventoryItem.product_name,
      category: 'Parts',
      quantity: it.quantity,
      unit: 'PCS',
      unitPrice: it.unitPrice,
      discount: 0,
      tax: 0,
      subtotal: it.quantity * it.unitPrice,
      total: it.quantity * it.unitPrice,
    }));

    const poId = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPO: PurchaseOrder = {
      id: poToEdit ? poToEdit.id : Date.now().toString(),
      poNumber: poToEdit ? poToEdit.poNumber : poId,
      referenceOrderNum: referenceOrderNum || undefined,
      supplierId: supplierInfo.supplierId,
      supplierName: supplierInfo.supplierName,
      supplierContact: supplierInfo.supplierContact,
      supplierPhone: supplierInfo.supplierPhone,
      supplierAddress: supplierInfo.supplierAddress,
      supplierCity: supplierInfo.supplierCity,
      createdById: poToEdit ? poToEdit.createdById : 'admin-1',
      createdByName: poToEdit ? poToEdit.createdByName : 'Admin User',
      poDate,
      expectedDate: poDate, // Removed from UI, default to poDate
      createdAt: poToEdit ? poToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: poItems,
      numberOfItems: poItems.length,
      subTotal: financials.subTotal,
      totalDiscount: poToEdit ? poToEdit.totalDiscount : 0,
      totalTax: poToEdit ? poToEdit.totalTax : 0,
      shippingCharges: 0,
      grandTotal: financials.grandTotal,
      status: poToEdit ? poToEdit.status : 'Pending Approval',
      paymentStatus: poToEdit ? poToEdit.paymentStatus : 'Unpaid',
      paymentTerms: poToEdit ? poToEdit.paymentTerms : 'Net 30', // Removed from UI, default Net 30
      notes,
    };

    onSubmit(newPO);
    toast.success('PO Created Successfully', `Purchase Order ${poId} has been created.`);
    resetState();
  };

  const resetState = () => {
    setSelectedSupplierId('');
    setSupplierSearch('');
    setIsCustomSupplier(false);
    setCustomSupplier({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
    });
    setPoDate(today);
    setReferenceOrderNum('');
    setNotes('');
    setItems([]);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#1e293b] bg-[#0b1120]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20">
                <ShoppingBag size={18} />
              </div>
            <div>
              <h2 className="text-base font-bold text-white">{poToEdit ? `Update Purchase Order — ${poToEdit.poNumber}` : 'Create Purchase Order'}</h2>
              <p className="text-xs text-slate-400">Issue direct procurement requests to suppliers</p>
            </div>
          </div>
          <button
            onClick={() => { resetState(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Supplier and Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Supplier Picker */}
            <div ref={supplierRef} className="space-y-1.5 relative">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Supplier</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomSupplier(!isCustomSupplier);
                    setSelectedSupplierId('');
                    setSupplierSearch('');
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                >
                  {isCustomSupplier ? 'Select Existing Supplier' : '+ Quick Add Supplier'}
                </button>
              </div>

              {isCustomSupplier ? (
                <div className="space-y-3 p-4 bg-[#0b1120] border border-[#1e293b] rounded-xl">
                  <div>
                    <input
                      type="text"
                      placeholder="Company Name *"
                      value={customSupplier.companyName}
                      onChange={(e) => setCustomSupplier({ ...customSupplier, companyName: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Contact Person"
                      value={customSupplier.contactPerson}
                      onChange={(e) => setCustomSupplier({ ...customSupplier, contactPerson: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone (WhatsApp) *"
                      value={customSupplier.phone}
                      onChange={(e) => setCustomSupplier({ ...customSupplier, phone: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Address"
                      value={customSupplier.address}
                      onChange={(e) => setCustomSupplier({ ...customSupplier, address: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={customSupplier.city}
                      onChange={(e) => setCustomSupplier({ ...customSupplier, city: e.target.value })}
                      className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search existing suppliers..."
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      className={`w-full bg-[#0b1120] border ${
                        errors.supplier ? 'border-red-500' : 'border-[#1e293b]'
                      } rounded-xl px-3 py-2.5 pl-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.supplier && <p className="text-[10px] text-red-500">{errors.supplier}</p>}

                  {/* Dropdown list */}
                  {showSupplierDropdown && filteredSuppliers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 bg-[#0b1120] border border-[#1e293b] rounded-xl shadow-2xl overflow-y-auto z-50 p-1">
                      {filteredSuppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSupplier(s)}
                          className="px-3 py-2 hover:bg-[#1e293b] rounded-lg cursor-pointer transition text-xs flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-white">{s.companyName}</span>
                            <span className="text-slate-400 ml-1.5">({s.contactPerson})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{s.supplierId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Dates & Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">PO Date</label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Ref Sales Order (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ORD-10041"
                  value={referenceOrderNum}
                  onChange={(e) => setReferenceOrderNum(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Item Selector Section */}
          <div className="border-t border-[#1e293b] pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Purchase Items</h3>
              <button
                type="button"
                onClick={() => {
                  setQuickProduct({ name: '', cost: '', sellPrice: '' });
                  setQuickProductErrors({});
                  setShowAddProductModal(true);
                }}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
              >
                <Plus size={13} /> Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-[#0b1120] p-4 rounded-xl border border-[#1e293b]">
              <div ref={itemRef} className="md:col-span-6 space-y-1.5 relative">
                <label className="text-[11px] font-semibold text-slate-400">Search Product</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product from inventory..."
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                </div>

                {showItemDropdown && filteredInventoryItems.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-40 bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-2xl overflow-y-auto z-50 p-1">
                    {filteredInventoryItems.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleSelectItem(item)}
                        className="px-3 py-2 hover:bg-[#1e293b] rounded-lg cursor-pointer transition text-xs flex justify-between items-center"
                      >
                        <span className="text-white font-medium">{item.product_name}</span>
                        <span className="text-slate-500 font-mono text-[10px]">{item.product_code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Unit Cost (LKR)</label>
                <input
                  type="number"
                  value={addPrice || ''}
                  onChange={(e) => setAddPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">Quantity</label>
                <input
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>

            {/* Selected Items Table */}
            {items.length > 0 ? (
              <div className="border border-[#1e293b] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b1120] text-slate-400 border-b border-[#1e293b]">
                      <th className="p-3">Product Description</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#0b1120]/40 transition text-slate-200">
                        <td className="p-3">
                          <p className="font-semibold text-white">{item.inventoryItem.product_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.inventoryItem.product_code}</p>
                        </td>
                        <td className="p-3 text-right font-mono">LKR {item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-center font-semibold">{item.quantity}</td>
                        <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                          LKR {(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-[#0b1120]/50 border border-dashed border-[#1e293b] rounded-xl text-slate-500">
                No items added. Add items from the panel above.
              </div>
            )}
            {errors.items && <p className="text-[10px] text-red-500">{errors.items}</p>}
          </div>

          {/* Pricing Summary and Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#1e293b] pt-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Purchase Terms & Notes</label>
              <textarea
                rows={3}
                placeholder="Enter additional terms or delivery instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="bg-[#0b1120] p-4 rounded-xl border border-[#1e293b] space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-white font-mono">LKR {financials.subTotal.toLocaleString()}</span>
              </div>
              <div className="border-t border-[#1e293b] pt-3 flex justify-between text-sm font-bold text-white">
                <span>Total Requisition:</span>
                <span className="text-purple-400 font-mono">LKR {financials.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#1e293b] bg-[#0b1120] flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => { resetState(); onClose(); }}
            className="px-4 py-2 border border-[#334155] hover:bg-[#1e293b] text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
          >
            {poToEdit ? 'Save Changes' : 'Save Draft PO'}
          </button>
        </div>
      </div>
      </div>

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155] bg-[#0f172a]/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Add New Product</h3>
                  <p className="text-[11px] text-gray-400">Create a new product to select for this PO</p>
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
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full bg-[#0f172a] border rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                    quickProductErrors.name ? 'border-red-500' : 'border-[#334155]'
                  }`}
                  placeholder="e.g. GI Elbow Joint 25mm"
                  value={quickProduct.name}
                  onChange={(e) => {
                    setQuickProduct({ ...quickProduct, name: e.target.value });
                    if (quickProductErrors.name) setQuickProductErrors({});
                  }}
                  autoFocus
                />
                {quickProductErrors.name && (
                  <p className="text-red-400 text-[10px] mt-1">{quickProductErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Purchase Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={quickProduct.cost}
                    onChange={(e) => setQuickProduct({ ...quickProduct, cost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Selling Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={quickProduct.sellPrice}
                    onChange={(e) => setQuickProduct({ ...quickProduct, sellPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#334155] mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-600/20"
                >
                  <Plus size={14} /> Add & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreatePOModal;
