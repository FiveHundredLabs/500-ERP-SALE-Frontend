import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Search, ShoppingBag, MessageSquare, Percent, Edit2, Check, AlertCircle } from 'lucide-react';
import type { PurchaseOrder, POItem } from '../../types/purchaseOrders';
import type { InventoryItem } from '../../types/inventory';
import type { Supplier } from '../../types/suppliers';
import { supplierService } from '../../services/SupplierService';
import { inventoryService } from '../../services/InventoryService';
import { useToast } from '../erp/Toast';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface POConversionItem {
  sku?: string;
  productName: string;
  quantity: number;
  sellingPrice?: number; // selling price (for reference only, NEVER used as cost)
  costPrice?: number;    // optional cost if known
  remark?: string;
}

export interface POInitialData {
  sourceOrderId?: string;
  sourceOrderNumber?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  items?: POConversionItem[];
  notes?: string;
  sourceType?: 'order' | 'quotation' | 'direct';
}

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (po: PurchaseOrder) => void;
  poToEdit?: PurchaseOrder | null;
  initialData?: POInitialData | null;
}

export interface DraftItem {
  inventoryItem: InventoryItem;
  quantity: number;
  unitPrice: number;
  remark?: string;
}

const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  poToEdit,
  initialData,
}) => {
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];

  // Supplier state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);
  useClickOutside([supplierRef], () => setShowSupplierDropdown(false));

  // Quick Add Supplier state
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
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Items State
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  useClickOutside([itemRef], () => setShowItemDropdown(false));

  const [selectedItemToAdd, setSelectedItemToAdd] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState(0);
  const [addPrice, setAddPrice] = useState(0);
  const [addRemark, setAddRemark] = useState('');

  // Quick Add Product state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    name: '',
    cost: '',
    sellPrice: '',
  });
  const [quickProductErrors, setQuickProductErrors] = useState<Record<string, string>>({});

  // Editing remark inline state
  const [editingRemarkIdx, setEditingRemarkIdx] = useState<number | null>(null);
  const [editingRemarkVal, setEditingRemarkVal] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      supplierService.getAll().then(s => setAllSuppliers(s || [])).catch(() => {});
      inventoryService.getAll().then(i => setAllInventoryItems(i || [])).catch(() => {});
    }
  }, [isOpen]);

  // Lifecycle to populate data on open / change
  useEffect(() => {
    if (!isOpen) return;

    if (poToEdit) {
      // Editing existing PO
      const exists = allSuppliers.some((s) => s.id === poToEdit.supplierId);
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
          address: poToEdit.supplierAddress || '',
          city: poToEdit.supplierCity || '',
        });
      }
      setPoDate(poToEdit.poDate);
      setReferenceOrderNum(poToEdit.sourceOrderNumber || '');
      setCustomerName(poToEdit.customerName || '');
      setNotes(poToEdit.notes || '');
      setDiscountType(poToEdit.discountType || 'fixed');
      setDiscountValue(poToEdit.discountValue !== undefined ? poToEdit.discountValue : poToEdit.totalDiscount || 0);

      const draftItems: DraftItem[] = (poToEdit.items || []).map((item) => {
        const invItem = allInventoryItems.find((inv) => inv.productCode === item.sku || inv.productName.toLowerCase() === item.productName.toLowerCase()) || {
          id: item.inventoryItemId || item.id,
          inventoryCode: item.sku || 'INV-EXT',
          productCode: item.sku || 'PRD-EXT',
          productName: item.productName,
          quantity: 0,
          soldCount: 0,
          status: 'in_stock' as const,
          purchasePrice: item.unitPrice,
          sellPrice: item.unitPrice * 1.3,
          discountRate: 0,
          actualSoldPrice: item.unitPrice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return {
          inventoryItem: invItem,
          quantity: item.quantityOrdered,
          unitPrice: item.unitPrice,
          remark: item.remark || '',
        };
      });
      setItems(draftItems);
    } else if (initialData) {
      // Converting from Order / Quotation
      setReferenceOrderNum(initialData.sourceOrderNumber || '');
      setCustomerName(initialData.customerName || '');
      setNotes(initialData.notes || (initialData.sourceOrderNumber ? `Converted from Order #${initialData.sourceOrderNumber}` : ''));
      setPoDate(today);
      setDiscountType('percentage');
      setDiscountValue(0);

      if (initialData.supplierId) {
        const found = allSuppliers.find((s) => s.id === initialData.supplierId);
        if (found) {
          setSelectedSupplierId(found.id);
          setSupplierSearch(`${found.companyName} (${found.supplierCode})`);
          setIsCustomSupplier(false);
        }
      } else {
        setSelectedSupplierId('');
        setSupplierSearch('');
        setIsCustomSupplier(false);
      }

      // Convert items and retrieve Cost Price from inventory
      const convertedDraftItems: DraftItem[] = (initialData.items || []).map((it) => {
        // Match inventory item by SKU or product name
        const matchedInv = allInventoryItems.find(
          (inv) =>
            (it.sku && inv.productCode.toLowerCase() === it.sku.toLowerCase()) ||
            inv.productName.toLowerCase() === it.productName.toLowerCase()
        );

        // Crucial Business Rule: ALWAYS use matched purchasePrice (Cost Price), NEVER selling price
        const costPrice = matchedInv
          ? matchedInv.purchasePrice
          : it.costPrice !== undefined
          ? it.costPrice
          : 0;

        const invItem: InventoryItem = matchedInv || {
          id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          inventoryCode: `INV-${Date.now()}`,
          productCode: it.sku || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
          productName: it.productName,
          quantity: 0,
          soldCount: 0,
          status: 'in_stock' as const,
          purchasePrice: costPrice,
          sellPrice: it.sellingPrice || costPrice * 1.3,
          discountRate: 0,
          actualSoldPrice: it.sellingPrice || costPrice * 1.3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return {
          inventoryItem: invItem,
          quantity: it.quantity,
          unitPrice: costPrice,
          remark: it.remark || '',
        };
      });

      setItems(convertedDraftItems);
    } else {
      resetState();
    }
  }, [isOpen, poToEdit, initialData, allSuppliers, allInventoryItems]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return allSuppliers;
    return allSuppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.supplierCode.toLowerCase().includes(q)
    );
  }, [allSuppliers, supplierSearch]);

  // Filter items
  const filteredInventoryItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return allInventoryItems;
    return allInventoryItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.productCode.toLowerCase().includes(q)
    );
  }, [allInventoryItems, itemSearch]);

  const handleSelectSupplier = (sup: Supplier) => {
    setSelectedSupplierId(sup.id);
    setSupplierSearch(`${sup.companyName} (${sup.supplierCode})`);
    setShowSupplierDropdown(false);
    setIsCustomSupplier(false);
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemToAdd(item);
    setItemSearch(`${item.productName} (${item.productCode})`);
    // Load existing inventory cost price into unit price
    setAddPrice(item.purchasePrice || 0);
    setAddQty(0);
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

    const existingIdx = items.findIndex((it) => it.inventoryItem.id === selectedItemToAdd.id);
    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += addQty;
      if (addRemark.trim()) {
        updated[existingIdx].remark = addRemark.trim();
      }
      setItems(updated);
    } else {
      setItems((prev) => [
        ...prev,
        {
          inventoryItem: selectedItemToAdd,
          quantity: addQty,
          unitPrice: addPrice,
          remark: addRemark.trim() || undefined,
        },
      ]);
    }

    setSelectedItemToAdd(null);
    setItemSearch('');
    setAddQty(0);
    setAddPrice(0);
    setAddRemark('');
    toast.success('Item Added', 'Item added to draft purchase order.');
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRemark = (idx: number, newRemark: string) => {
    const updated = [...items];
    updated[idx].remark = newRemark.trim() || undefined;
    setItems(updated);
    setEditingRemarkIdx(null);
  };

  const handleUpdateItemQty = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].quantity = Math.max(1, qty);
    setItems(updated);
  };

  const handleUpdateItemCost = (idx: number, cost: number) => {
    const updated = [...items];
    updated[idx].unitPrice = Math.max(0, cost);
    setItems(updated);
  };

  // Quick Add Product action
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct.name.trim()) {
      setQuickProductErrors({ name: 'Product name is required' });
      return;
    }

    const cost = parseFloat(quickProduct.cost) || 0;
    const sellPrice = parseFloat(quickProduct.sellPrice) || 0;

    const newInvItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      inventoryCode: `INV-${Date.now()}`,
      productCode: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      productName: quickProduct.name.trim(),
      quantity: 0,
      soldCount: 0,
      status: 'in_stock',
      purchasePrice: cost,
      sellPrice: sellPrice,
      discountRate: 0,
      actualSoldPrice: sellPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await inventoryService.create(newInvItem);
    } catch {
      // ignore
    }
    setAllInventoryItems(prev => [newInvItem, ...prev]);
    handleSelectItem(newInvItem);
    setShowAddProductModal(false);
    toast.success('Product Added', `${quickProduct.name} registered in inventory master with cost LKR ${cost.toLocaleString()}.`);
  };

  // Financial calculations
  const financials = useMemo(() => {
    const subTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (subTotal * Math.min(100, Math.max(0, discountValue))) / 100;
    } else {
      discountAmount = Math.min(subTotal, Math.max(0, discountValue));
    }
    const grandTotal = Math.max(0, subTotal - discountAmount);
    return { subTotal, discountAmount, grandTotal };
  }, [items, discountType, discountValue]);

  const handleFormSubmit = async (e: React.FormEvent) => {
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
      supplierId: '',
      supplierName: '',
      supplierContact: '',
      supplierPhone: '',
      supplierAddress: '',
      supplierCity: '',
    };

    if (isCustomSupplier) {
      const createdSupplier = await supplierService.create({
        companyName: customSupplier.companyName,
        contactPerson: customSupplier.contactPerson || 'N/A',
        phone: customSupplier.phone,
        email: customSupplier.email || undefined,
        address: customSupplier.address || '',
        city: customSupplier.city || '',
        status: 'Active',
      });
      supplierInfo.supplierId = createdSupplier.id;
      supplierInfo.supplierName = customSupplier.companyName;
      supplierInfo.supplierContact = customSupplier.contactPerson || 'N/A';
      supplierInfo.supplierPhone = customSupplier.phone;
      supplierInfo.supplierAddress = customSupplier.address || 'N/A';
      supplierInfo.supplierCity = customSupplier.city || 'N/A';
    } else {
      const found = allSuppliers.find((s) => s.id === selectedSupplierId);
      if (found) {
        supplierInfo.supplierId = found.id;
        supplierInfo.supplierName = found.companyName;
        supplierInfo.supplierContact = found.contactPerson || 'N/A';
        supplierInfo.supplierPhone = found.phone;
        supplierInfo.supplierAddress = found.address;
        supplierInfo.supplierCity = found.city || (typeof found.address === 'string' ? found.address.split(',').pop()?.trim() || 'N/A' : 'N/A');
      }
    }

    // Build Items
    const poItems: POItem[] = items.map((it) => ({
      id: it.inventoryItem.id,
      sku: it.inventoryItem.productCode,
      productName: it.inventoryItem.productName,
      category: 'Parts',
      quantityOrdered: it.quantity,
      quantityReceived: 0,
      unit: 'PCS',
      unitPrice: it.unitPrice,
      discount: 0,
      tax: 0,
      subTotal: it.quantity * it.unitPrice,
      totalPrice: it.quantity * it.unitPrice,
      remark: it.remark?.trim() || undefined,
    }));

    const poId = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPO: PurchaseOrder = {
      id: poToEdit ? poToEdit.id : Date.now().toString(),
      poNumber: poToEdit ? poToEdit.poNumber : poId,
      sourceOrderId: initialData?.sourceOrderId,
      sourceOrderNumber: referenceOrderNum || undefined,
      customerName: customerName || (poToEdit ? poToEdit.customerName : undefined),
      supplierId: supplierInfo.supplierId,
      supplierName: supplierInfo.supplierName,
      supplierContact: supplierInfo.supplierContact,
      supplierPhone: supplierInfo.supplierPhone,
      supplierAddress: supplierInfo.supplierAddress,
      supplierCity: supplierInfo.supplierCity,
      createdById: poToEdit ? poToEdit.createdById : 'admin-1',
      createdByName: poToEdit ? poToEdit.createdByName : 'Admin User',
      poDate,
      expectedDeliveryDate: poDate,
      createdAt: poToEdit ? poToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: poItems,
      totalItems: poItems.length,
      subTotal: financials.subTotal,
      discountType,
      discountValue,
      totalDiscount: financials.discountAmount,
      totalTax: 0,
      shippingCharges: 0,
      totalAmount: financials.grandTotal,
      status: poToEdit ? poToEdit.status : 'pending_approval',
      paymentStatus: poToEdit ? poToEdit.paymentStatus : 'unpaid',
      paymentTerms: poToEdit ? poToEdit.paymentTerms : 'Net 30',
      notes,
    };

    onSubmit(newPO);
    toast.success(
      poToEdit ? 'PO Updated' : 'PO Created Successfully',
      `Purchase Order ${newPO.poNumber} has been ${poToEdit ? 'updated' : 'created'}.`
    );
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
    setCustomerName('');
    setNotes('');
    setDiscountType('percentage');
    setDiscountValue(0);
    setItems([]);
    setErrors({});
    setSelectedItemToAdd(null);
    setItemSearch('');
    setAddQty(1);
    setAddPrice(0);
    setAddRemark('');
  };

  if (!isOpen) return null;

  const isConverting = !!initialData && !poToEdit;

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
                <h2 className="text-base font-bold text-white">
                  {poToEdit
                    ? `Update Purchase Order — ${poToEdit.poNumber}`
                    : isConverting
                    ? `Convert to Purchase Order ${referenceOrderNum ? `(Ref #${referenceOrderNum})` : ''}`
                    : 'Create Purchase Order'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isConverting
                    ? 'Review quantities, retrieved inventory cost prices, and add item remarks before creating PO'
                    : 'Issue direct procurement requests to suppliers'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetState();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Banner if converting from Order */}
          {isConverting && (
            <div className="bg-purple-950/40 border-b border-purple-800/30 px-6 py-2.5 flex items-center gap-2 text-xs text-purple-200">
              <AlertCircle size={14} className="text-purple-400 shrink-0" />
              <span>
                <strong>Customer Order Converted:</strong> Product cost prices have been automatically loaded from your{' '}
                <strong>Inventory Master Data</strong> (selling prices were not used as purchase costs). Please select a Supplier.
              </span>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Supplier and Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Supplier Picker */}
              <div ref={supplierRef} className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    Supplier <span className="text-purple-400">*</span>
                  </label>
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
                        placeholder="Search & select supplier..."
                        value={supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          setShowSupplierDropdown(true);
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        className={`w-full bg-[#0b1120] border ${
                          errors.supplier ? 'border-red-500 ring-1 ring-red-500' : 'border-[#1e293b]'
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
                            <span className="text-[10px] text-slate-500 font-mono">{s.supplierCode}</span>
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
                  <label className="text-xs font-semibold text-slate-300">Ref Order # (Optional)</label>
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

              <div className="bg-[#0b1120] p-4 rounded-xl border border-[#1e293b] space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
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
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="px-3 py-2 hover:bg-[#1e293b] rounded-lg cursor-pointer transition text-xs flex justify-between items-center"
                          >
                            <span className="text-white font-medium">{item.productName}</span>
                            <div className="text-right">
                              <span className="text-emerald-400 font-mono text-[11px] block">Cost: LKR {item.purchasePrice.toLocaleString()}</span>
                              <span className="text-slate-500 font-mono text-[10px]">{item.productCode}</span>
                            </div>
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
                      min="0"
                      value={addQty === 0 ? '0' : addQty || ''}
                      onChange={(e) => setAddQty(parseInt(e.target.value) || 0)}
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

                {/* Item-level Remark Input */}
                <div className="space-y-1 pt-1 border-t border-[#1e293b]/60">
                  <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <MessageSquare size={12} className="text-purple-400" /> Item Remark (Optional - visible to supplier)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please provide latest production batch, specify grade/brand, packaging notes..."
                    value={addRemark}
                    onChange={(e) => setAddRemark(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Selected Items Table */}
              {items.length > 0 ? (
                <div className="border border-[#1e293b] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#0b1120] text-slate-400 border-b border-[#1e293b]">
                        <th className="p-3">Product Description & Remarks</th>
                        <th className="p-3 text-right w-28">Unit Cost</th>
                        <th className="p-3 text-center w-20">Qty</th>
                        <th className="p-3 text-right w-28">Subtotal</th>
                        <th className="p-3 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#0b1120]/40 transition text-slate-200">
                          <td className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-white">{item.inventoryItem.productName}</p>
                              <span className="text-[10px] text-slate-500 font-mono">{item.inventoryItem.productCode}</span>
                            </div>

                            {/* Remark display & inline editing */}
                            {editingRemarkIdx === idx ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="text"
                                  value={editingRemarkVal}
                                  onChange={(e) => setEditingRemarkVal(e.target.value)}
                                  placeholder="Enter item remark..."
                                  className="flex-1 bg-[#0f172a] border border-purple-500/50 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemRemark(idx, editingRemarkVal)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300 rounded"
                                  title="Save Remark"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRemarkIdx(null)}
                                  className="p-1 text-slate-400 hover:text-slate-300 rounded"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : item.remark ? (
                              <div className="flex items-center justify-between bg-purple-950/30 border border-purple-800/30 px-2 py-1 rounded text-[11px] text-purple-200">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare size={11} className="text-purple-400 shrink-0" />
                                  <span>{item.remark}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRemarkIdx(idx);
                                    setEditingRemarkVal(item.remark || '');
                                  }}
                                  className="text-slate-400 hover:text-purple-300 p-0.5"
                                  title="Edit Remark"
                                >
                                  <Edit2 size={11} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRemarkIdx(idx);
                                  setEditingRemarkVal('');
                                }}
                                className="text-[11px] text-slate-500 hover:text-purple-400 flex items-center gap-1 transition"
                              >
                                <Plus size={11} /> Add Item Remark
                              </button>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                              className="w-24 bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1 text-right text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                            />
                          </td>

                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                              className="w-16 bg-[#0f172a] border border-[#1e293b] rounded px-2 py-1 text-center text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                              min={1}
                            />
                          </td>

                          <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                            LKR {(item.quantity * item.unitPrice).toLocaleString()}
                          </td>

                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                              title="Remove item"
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

            {/* Pricing Summary, Discount, and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-[#1e293b] pt-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Purchase Terms & Notes</label>
                <textarea
                  rows={4}
                  placeholder="Enter additional delivery instructions, payment notes, or general terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="bg-[#0b1120] p-4 rounded-xl border border-[#1e293b] space-y-3.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-white font-mono">LKR {financials.subTotal.toLocaleString()}</span>
                </div>

                {/* Total PO Discount Controls */}
                <div className="pt-2 border-t border-[#1e293b]/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <Percent size={12} className="text-amber-400" /> Total PO Discount:
                    </span>
                    <div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded-lg border border-[#1e293b]">
                      <button
                        type="button"
                        onClick={() => setDiscountType('percentage')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                          discountType === 'percentage'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                          discountType === 'fixed'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        LKR
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        placeholder="Discount value"
                        value={discountValue || ''}
                        onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#0f172a] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-right text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                        min={0}
                        max={discountType === 'percentage' ? 100 : undefined}
                      />
                      <span className="text-slate-400 text-xs font-semibold">{discountType === 'percentage' ? '%' : 'LKR'}</span>
                    </div>
                    {financials.discountAmount > 0 && (
                      <span className="font-mono text-amber-400 font-semibold shrink-0">
                        - LKR {financials.discountAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
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
              onClick={() => {
                resetState();
                onClose();
              }}
              className="px-4 py-2 border border-[#334155] hover:bg-[#1e293b] text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFormSubmit}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
            >
              {poToEdit ? 'Save Changes' : isConverting ? 'Create Converted PO' : 'Create Purchase Order'}
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
                  <p className="text-[11px] text-gray-400">Register product into inventory master data</p>
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
            <form onSubmit={handleSaveNewProduct} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. UltraTech Cement 50kg"
                  value={quickProduct.name}
                  onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
                {quickProductErrors.name && <p className="text-red-400 text-[10px]">{quickProductErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Cost Price (LKR)</label>
                  <input
                    type="number"
                    placeholder="2100"
                    value={quickProduct.cost}
                    onChange={(e) => setQuickProduct({ ...quickProduct, cost: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Selling Price (LKR)</label>
                  <input
                    type="number"
                    placeholder="2450"
                    value={quickProduct.sellPrice}
                    onChange={(e) => setQuickProduct({ ...quickProduct, sellPrice: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
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
