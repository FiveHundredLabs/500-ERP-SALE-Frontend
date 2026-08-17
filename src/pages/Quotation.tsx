import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  FileText,
  Download,
  Printer,
  Menu,
  X,
  Save,
  List,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  Copy,
  Check,
  Share2,
  ShoppingCart,
} from "lucide-react";
import QuotationForm from "../components/quotation/QuotationForm";
import QuotationViewModal from "../components/quotation/QuotationViewModal";
import type {
  QuotationData,
  QuotationItem,
  BackendQuotationData,
  QuotationResponse
} from "../types/quotation";
import type { InventoryItem as QuotationInventoryItem } from "../types/inventory";
import { PaymentMethod } from "../types/invoice";
import { QuotationStatus } from "../types/quotation";
import { quotationService } from "../services/QuotationService";
import { inventoryService } from "../services/InventoryService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";
import CustomConfirm from "../components/CustomConfirm";
import UserProfileDropdown from "../components/UserProfileDropdown";
import { mockPurchaseOrders } from "../data/mockPurchaseOrders";
import type { PurchaseOrder } from "../types/purchaseOrders";

const Quotation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<QuotationInventoryItem[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<QuotationData | null>(null);
  const lastSavedAtRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<'edit' | 'manage'>('edit');
  const [allQuotations, setAllQuotations] = useState<QuotationResponse[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [manageSearch, setManageSearch] = useState("");

  const [copiedQuotationId, setCopiedQuotationId] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "warning" | "danger" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: "",
    onConfirm: () => { },
  });

  const getInitialQuotationData = (): QuotationData => ({
    quotationId: "",
    customer: "",
    customerDetails: undefined,
    items: [],
    subTotal: 0,
    discount: 0,
    discountPercentage: 0,
    totalAmount: 0,
    paymentMethod: PaymentMethod.CASH,
    status: QuotationStatus.PENDING,
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
  });

  const [quotationData, setQuotationData] = useState<QuotationData>(getInitialQuotationData());

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const items = await inventoryService.getAll();
      setInventoryItems(items as QuotationInventoryItem[]);

      const nextId = await quotationService.getNextId();
      setQuotationData({
        ...getInitialQuotationData(),
        quotationId: nextId
      });
      lastSavedRef.current = null;
      setIsDirty(false);
      lastSavedAtRef.current = null;

    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleAddItem = (item: Omit<QuotationItem, 'id' | 'total'> & { total?: number }) => {
    const existingItemIndex = quotationData.items.findIndex(
      existing => existing.item === item.item
    );

    let newItems: QuotationItem[];

    if (existingItemIndex !== -1) {
      newItems = [...quotationData.items];
      const existingItem = newItems[existingItemIndex];
      const newQty = existingItem.quantity + item.quantity;
      const baseSub = newQty * existingItem.unitPrice;
      let discAmount = 0;
      
      if (item.discountType === 'percentage' || existingItem.discountType === 'percentage') {
        const pct = item.discountValue !== undefined ? item.discountValue : (existingItem.discountValue || 0);
        discAmount = (baseSub * pct) / 100;
      } else if (item.discountType === 'amount' || existingItem.discountType === 'amount') {
        const val = item.discountValue !== undefined ? item.discountValue : (existingItem.discountValue || 0);
        const scope = item.discountScope || existingItem.discountScope || 'per_unit';
        discAmount = scope === 'total_qty' ? Math.min(baseSub, val) : Math.min(baseSub, val * newQty);
      } else {
        discAmount = (existingItem.discountAmount || 0) + (item.discountAmount || 0);
      }

      const updatedTotal = Math.max(0, baseSub - discAmount);

      const updatedItem: QuotationItem = {
        ...existingItem,
        ...item,
        quantity: newQty,
        discountAmount: discAmount,
        total: updatedTotal
      };
      newItems[existingItemIndex] = updatedItem;
    } else {
      const lineTotal = item.total !== undefined ? item.total : (item.quantity * item.unitPrice);
      const newItem: QuotationItem = {
        ...item,
        id: Date.now().toString(),
        total: lineTotal
      };
      newItems = [...quotationData.items, newItem];
    }

    const subTotal = newItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const totalDiscount = newItems.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
    const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount: totalAmount > 0 ? totalAmount : 0
    }));
    setIsDirty(true);
  };

  const handleCancelEdit = async () => {
    if (quotationData._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Discard Changes",
        message: "Are you sure you want to discard changes? You will lose any unsaved modifications.",
        confirmText: "Discard",
        type: "danger",
        onConfirm: async () => {
          await loadInitialData();
          setViewMode('manage');
        }
      });
    } else {
      setConfirmConfig({
        isOpen: true,
        title: "Clear Quotation",
        message: "Are you sure you want to clear this quotation? All unsaved changes will be lost.",
        confirmText: "Clear",
        type: "danger",
        onConfirm: async () => {
          await loadInitialData();
          setAlert({ type: 'success', message: 'Quotation cleared' });
        }
      });
    }
  };

  const handleSaveChanges = async () => {
    const saved = await handleSave();
    if (saved) {
      lastSavedRef.current = { ...quotationData };
    }
  };

  // copy quotation link to clipboard
  const handleCopyQuotationLink = (quotationId: string, quotationNumber: string) => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationId}`;
  
    navigator.clipboard.writeText(quotationLink)
      .then(() => {
        setCopiedQuotationId(quotationId);
        setAlert({
          type: 'success',
          message: `Quotation ${quotationNumber} link copied to clipboard!`
        });
        
        setTimeout(() => {
          setCopiedQuotationId(null);
        }, 2000);
      })
      .catch(() => {
        setAlert({
          type: 'error',
          message: 'Failed to copy link to clipboard'
        });
      });
  };

  // share quotation link
  // Preview completed quotation on-demand
  const handleOpenPreview = () => {
    if (quotationData.items.length === 0) {
      setAlert({
        type: 'info',
        message: 'Please add at least one item to preview the quotation'
      });
      return;
    }
    setShowPreviewModal(true);
  };

  // Share quotation - show preview modal first so user can review before sharing
  const handleShareQuotation = () => {
    if (!quotationData.customer && quotationData.items.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please add customer and items to share quotation'
      });
      return;
    }
    setShowPreviewModal(true);
  };

  const statusBadgeMap: Record<
    typeof QuotationStatus[keyof typeof QuotationStatus],
    { cls: string; icon: React.ReactNode }
  > = {
    [QuotationStatus.PENDING]: {
      cls: 'bg-yellow-200 text-yellow-900',
      icon: <Clock className="w-3 h-3" />,
    },
    [QuotationStatus.ACCEPTED]: {
      cls: 'bg-green-200 text-green-900',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    [QuotationStatus.REJECTED]: {
      cls: 'bg-red-200 text-red-900',
      icon: <XCircle className="w-3 h-3" />,
    },
    [QuotationStatus.EXPIRED]: {
      cls: 'bg-gray-200 text-gray-900',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const prepareQuotationForSave = (data: QuotationData): BackendQuotationData => {
    return {
      quotationId: data.quotationId,
      customer: data.customer,
      items: data.items.map(item => ({
        item: item.item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subTotal: data.subTotal,
      discount: data.discount,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod,
      issueDate: data.issueDate,
      validUntil: data.validUntil,
      status: data.status,
      notes: data.notes,
    };
  };

  const handleRemoveItem = (id: string) => {
    const newItems = quotationData.items.filter(item => item.id !== id);
    const subTotal = newItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const totalDiscount = newItems.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
    const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount: totalAmount > 0 ? totalAmount : 0
    }));
    setIsDirty(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuotationItem>) => {
    const newItems = quotationData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          const qty = updatedItem.quantity;
          const baseSub = qty * updatedItem.unitPrice;
          let discAmount = 0;

          if (updatedItem.discountType === 'percentage') {
            const pct = updatedItem.discountValue || 0;
            discAmount = (baseSub * pct) / 100;
          } else if (updatedItem.discountType === 'amount') {
            const val = updatedItem.discountValue || 0;
            const scope = updatedItem.discountScope || 'per_unit';
            discAmount = scope === 'total_qty' ? Math.min(baseSub, val) : Math.min(baseSub, val * qty);
          } else {
            discAmount = updatedItem.discountAmount || 0;
          }

          updatedItem.discountAmount = discAmount;
          updatedItem.total = Math.max(0, baseSub - discAmount);
        }
        return updatedItem;
      }
      return item;
    });

    const subTotal = newItems.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
    const totalDiscount = newItems.reduce((sum, it) => sum + (it.discountAmount || 0), 0);
    const totalAmount = newItems.reduce((sum, it) => sum + it.total, 0);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount: totalAmount > 0 ? totalAmount : 0
    }));
    setIsDirty(true);
  };

  const handleFieldChange = (field: keyof QuotationData, value: string | number | boolean | Date) => {
    setQuotationData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'discountPercentage') {
        const discountAmount = prev.subTotal * (Number(value) / 100);
        const totalAmount = prev.subTotal - discountAmount;
        return {
          ...updated,
          discount: discountAmount,
          totalAmount: totalAmount > 0 ? totalAmount : 0
        };
      }

      return updated;
    });
    setIsDirty(true);
  };

  const handleCustomerIdChange = (customerId: string, customerDetails?: any) => {
    setQuotationData(prev => ({
      ...prev,
      customer: customerId,
      customerDetails: customerDetails
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!quotationData.customer || quotationData.items.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please add customer and at least one item before saving'
      });
      return false;
    }

    try {
      setIsSaving(true);

      const backendData = prepareQuotationForSave(quotationData);

      if (quotationData._id) {
        setAlert({
          type: 'info',
          message: 'Updating quotation...'
        });

        await quotationService.update(quotationData._id, backendData);

        setAlert({
          type: 'success',
          message: 'Quotation updated successfully!'
        });
        lastSavedRef.current = { ...quotationData };
        setIsDirty(false);
        lastSavedAtRef.current = new Date().toISOString();
        setShowPreviewModal(true);
      } else {
        setAlert({
          type: 'info',
          message: 'Saving quotation...'
        });

        const response = await quotationService.create(backendData);

        setQuotationData(prev => ({
          ...prev,
          _id: response._id
        }));

        setAlert({
          type: 'success',
          message: 'Quotation saved successfully!'
        });
        lastSavedRef.current = { ...quotationData, _id: response._id } as QuotationData;
        setIsDirty(false);
        lastSavedAtRef.current = new Date().toISOString();
        setShowPreviewModal(true);
      }

      return true;
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save quotation'
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAllQuotations = async () => {
    try {
      setIsLoadingQuotations(true);
      const quotations = await quotationService.getAll();
      const sortedQuotations = (quotations || []).sort((a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      );
      setAllQuotations(sortedQuotations);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load quotations'
      });
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  const handleLoadQuotation = (quotation: any, mode: 'view' | 'edit') => {
    const mappedItems: QuotationItem[] = quotation.items.map((item: any, index: number) => ({
      id: (Date.now() + index).toString(),
      item: item.item._id || item.item,
      itemName: item.item.product_name || item.itemName || 'Unknown Item',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));

    const discountPercentage = quotation.subTotal > 0
      ? (quotation.discount / quotation.subTotal) * 100
      : 0;

    setQuotationData({
      _id: quotation._id,
      quotationId: quotation.quotationId,
      customer: quotation.customer._id || quotation.customer,
      customerDetails: quotation.customer,
      items: mappedItems,
      subTotal: quotation.subTotal,
      discount: quotation.discount,
      discountPercentage: discountPercentage,
      totalAmount: quotation.totalAmount,
      paymentMethod: quotation.paymentMethod,
      status: quotation.status,
      issueDate: quotation.issueDate.split('T')[0],
      validUntil: quotation.validUntil.split('T')[0],
      notes: quotation.notes || '',
    });

    lastSavedRef.current = {
      _id: quotation._id,
      quotationId: quotation.quotationId,
      customer: quotation.customer._id || quotation.customer,
      customerDetails: quotation.customer,
      items: mappedItems,
      subTotal: quotation.subTotal,
      discount: quotation.discount,
      discountPercentage: discountPercentage,
      totalAmount: quotation.totalAmount,
      paymentMethod: quotation.paymentMethod,
      status: quotation.status,
      issueDate: quotation.issueDate.split('T')[0],
      validUntil: quotation.validUntil.split('T')[0],
      notes: quotation.notes || '',
    } as QuotationData;
    setIsDirty(false);
    lastSavedAtRef.current = new Date().toISOString();

    if (mode === 'view') {
      setShowPreviewModal(true);
    } else {
      setViewMode('edit');
    }
  };

  const handleDeleteQuotation = async (quotationId: string, quotationNumber: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Quotation",
      message: `Are you sure you want to delete quotation ${quotationNumber}? This action cannot be undone.`,
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        try {
          await quotationService.delete(quotationId);
          setAlert({
            type: 'success',
            message: `Quotation ${quotationNumber} deleted successfully`
          });
          fetchAllQuotations();
        } catch (error) {
          setAlert({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to delete quotation'
          });
        }
      }
    });
  };

  const handleOpenManageModal = () => {
    setViewMode('manage');
    setCurrentPage(1);
  };

  const handleConvertQuotationToPO = (quotation: QuotationResponse | QuotationData) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Convert to Purchase Order',
      message: `Convert quotation ${quotation.quotationId} to a Purchase Order? This will create a new draft PO with the quotation items.`,
      confirmText: 'Convert to PO',
      type: 'info',
      onConfirm: () => {
        const generatedPONumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const customerObj = 'customerDetails' in quotation ? quotation.customerDetails : undefined;
        const customerName = customerObj
          ? customerObj.fullName
          : typeof quotation.customer === 'object'
            ? (quotation.customer as any)?.fullName || (quotation.customer as any)?.name || 'Unknown'
            : String(quotation.customer || 'Unknown');

        const newPO: PurchaseOrder = {
          id: Math.random().toString(36).substr(2, 9),
          poNumber: generatedPONumber,
          referenceOrderNum: quotation.quotationId,
          supplierId: 'SUP-001',
          supplierName: 'Pending Supplier',
          supplierContact: '',
          supplierPhone: '',
          supplierAddress: '',
          supplierCity: '',
          customerName,
          createdById: 'admin',
          createdByName: 'Admin User',
          poDate: new Date().toISOString().split('T')[0],
          expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          items: quotation.items.map((it: any) => ({
            id: it._id || it.id || Math.random().toString(36).substr(2, 9),
            sku: it.item?.product_code || (typeof it.item === 'string' ? it.item : 'SKU-NA'),
            productName: it.itemName || it.item?.product_name || 'Item',
            category: 'General',
            quantity: it.quantity,
            unit: 'pcs',
            unitPrice: it.unitPrice,
            discount: 0,
            tax: 0,
            subtotal: it.quantity * it.unitPrice,
            total: it.quantity * it.unitPrice,
          })),
          numberOfItems: quotation.items.length,
          subTotal: quotation.subTotal,
          totalDiscount: quotation.discount,
          totalTax: 0,
          shippingCharges: 0,
          grandTotal: quotation.totalAmount,
          status: 'Draft',
          paymentStatus: 'Unpaid',
          paymentTerms: 'Net 30',
          notes: `Converted from Quotation ${quotation.quotationId}`,
        };

        mockPurchaseOrders.unshift(newPO);
        setAlert({
          type: 'success',
          message: `Purchase Order ${generatedPONumber} created from Quotation ${quotation.quotationId}!`,
        });
      }
    });
  };

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchAllQuotations();
    }
  }, [viewMode]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const getCustomerDisplay = (customer: any) => {
    if (!customer) return '';
    if (typeof customer === 'object') return String(customer.fullName || customer.name || '');
    return String(customer);
  };

  const filteredQuotations = manageSearch.trim()
    ? allQuotations.filter(q => {
      const idMatch = String(q.quotationId).toLowerCase().includes(manageSearch.toLowerCase());
      const customerDisplay = getCustomerDisplay(q.customer);
      const customerMatch = customerDisplay.toLowerCase().includes(manageSearch.toLowerCase());
      return idMatch || customerMatch;
    })
    : allQuotations;
  const filteredTotalPages = Math.max(1, Math.ceil(filteredQuotations.length / itemsPerPage));
  const currentQuotations = filteredQuotations.slice(startIndex, Math.min(endIndex, filteredQuotations.length));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {alert && (
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            duration={3000}
          />
        )}

        <CustomConfirm
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText={confirmConfig.cancelText}
          type={confirmConfig.type}
          onConfirm={() => {
            confirmConfig.onConfirm();
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        />

        <div className="h-16 bg-[#0f172a]/70 backdrop-blur-sm border-b border-[#1f2937] flex items-center justify-between px-4 md:px-6 relative z-40">
          <div className="flex items-center gap-3">
            {viewMode === 'manage' ? (
              <button onClick={() => setViewMode('edit')} className="p-2 rounded-lg hover:bg-[#15202b] transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              isMobileView && (
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg hover:bg-[#15202b] transition">
                  {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )
            )}

            <FileText className="text-blue-400 w-5 h-5 md:w-6 md:h-6" />
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-semibold text-gray-200">Quotation Management</h1>
              <div className="text-sm text-gray-400">
                {viewMode === 'manage'
                  ? 'View Quotations'
                  : quotationData._id
                    ? `Edit Quotation – ${quotationData.quotationId}`
                    : 'Create New Quotation'}
              </div>
            </div>
          </div>          <div className="flex items-center gap-2 md:gap-3">
            {viewMode === "manage" ? (
              <>
                <div className="relative">
                  <input
                    value={manageSearch}
                    onChange={(e) => {
                      setManageSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by ID or customer"
                    className="pl-9 pr-3 py-2 rounded-md bg-[#061425] text-sm placeholder:text-gray-500 text-gray-200 border border-[#16324a] focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <button
                  onClick={() => setViewMode('edit')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>+ New Quotation</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleConvertQuotationToPO(quotationData)}
                  disabled={quotationData.items.length === 0}
                  className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  title="Convert to Purchase Order"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Convert to PO</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={quotationData.items.length === 0}
                  className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  title="Preview Quotation"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareQuotation}
                  disabled={quotationData.items.length === 0}
                  className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  title="Share Quotation"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isLoading || isSaving}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenManageModal}
                  title="Manage quotations"
                  className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Manage</span>
                </button>
              </>
            )}

            <div className="flex items-center gap-4 ml-1">
              <UserProfileDropdown />
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'manage' ? (
            <div className="w-full overflow-auto p-4">
              <div className="bg-[#1e293b] rounded-lg w-full h-full flex flex-col border border-[#334155] shadow-2xl">
                <div className="flex-1 overflow-auto rounded-lg">
                  {isLoadingQuotations ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : filteredQuotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <FileText className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No quotations found</p>
                      <p className="text-sm mt-2">Try a different search or create a new quotation</p>
                    </div>
                  ) : (
                    <>
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-[#1e293b] border-b border-[#243244]">
                              <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Quotation ID
                              </th>
                              <th className="text-left px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Customer
                              </th>
                              <th className="hidden md:table-cell text-center px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Issue Date
                              </th>
                              <th className="hidden sm:table-cell text-center px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Status
                              </th>
                              <th className="text-right px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Total
                              </th>
                              <th className="text-center px-2 md:px-4 py-3 font-semibold text-gray-300">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#243244]">
                            {currentQuotations.map((quotation: QuotationResponse) => {
                              const statusConfig = quotation.status ? statusBadgeMap[quotation.status as keyof typeof statusBadgeMap] : null;
                              return (
                                <tr
                                  key={quotation._id}
                                  className="hover:bg-[#243244]/50 transition"
                                >
                                  {/* Quotation ID */}
                                  <td className="px-2 md:px-4 py-3 font-medium text-blue-400">
                                    {quotation.quotationId}
                                  </td>

                                  {/* Customer */}
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="font-medium text-white">
                                      {quotation.customer?.fullName || "Walk-in Customer"}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {quotation.customer?.phone || ""}
                                    </div>
                                  </td>

                                  {/* Date */}
                                  <td className="hidden md:table-cell px-2 md:px-4 py-3 text-gray-400">
                                    {formatDate(quotation.issueDate)}
                                  </td>

                                  {/* Status */}
                                  <td className="hidden sm:table-cell px-2 md:px-4 py-3">
                                    {statusConfig && (
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.cls}`}
                                      >
                                        {statusConfig.icon}
                                        {quotation.status}
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount */}
                                  <td className="px-2 md:px-4 py-3 text-right font-semibold text-white">
                                    LKR {quotation.totalAmount.toFixed(2)}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleLoadQuotation(quotation, 'view')}
                                        title="View Preview"
                                        className="p-2 rounded-md text-blue-400 hover:bg-blue-500/20 transition"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleLoadQuotation(quotation, 'edit')}
                                        title="Edit"
                                        className="p-2 rounded-md text-green-400 hover:bg-green-500/20 transition"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleCopyQuotationLink(quotation._id!, quotation.quotationId)}
                                        title="Copy Quotation Link"
                                        className={`p-2 rounded-md transition ${copiedQuotationId === quotation._id 
                                          ? 'text-green-400 bg-green-500/20' 
                                          : 'text-purple-400 hover:bg-purple-500/20'}`}
                                      >
                                        {copiedQuotationId === quotation._id ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>

                                      <button
                                        onClick={() => handleConvertQuotationToPO(quotation)}
                                        title="Convert to Purchase Order"
                                        className="p-2 rounded-md text-amber-400 hover:bg-amber-500/20 transition"
                                      >
                                        <ShoppingCart className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (quotation._id && quotation.quotationId) {
                                            handleDeleteQuotation(quotation._id, quotation.quotationId);
                                          }
                                        }}
                                        title="Delete"
                                        className="p-2 rounded-md text-red-400 hover:bg-red-500/20 transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {filteredTotalPages > 1 && (
                        <div className="flex items-center justify-between m-2">
                          <div className="text-sm text-gray-400">Showing {startIndex + 1} to {Math.min(endIndex, filteredQuotations.length)} of {filteredQuotations.length} quotations</div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-[#0f172a] border border-[#334155] hover:bg-[#1e293b] transition disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4 text-gray-300" /></button>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: filteredTotalPages }, (_, i) => i + 1).map((page) => {
                                const showPage = page === 1 || page === filteredTotalPages || (page >= currentPage - 1 && page <= currentPage + 1);
                                const showEllipsis = (page === 2 && currentPage > 3) || (page === filteredTotalPages - 1 && currentPage < filteredTotalPages - 2);
                                if (!showPage && !showEllipsis) return null;
                                if (showEllipsis) return <span key={page} className="px-2 text-gray-500">...</span>;
                                return (
                                  <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-lg text-sm font-medium transition ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-[#0f172a] text-gray-300 border border-[#334155] hover:bg-[#1e293b]'}`}>
                                    {page}
                                  </button>
                                );
                              })}
                            </div>
                            <button onClick={() => setCurrentPage(prev => Math.min(filteredTotalPages, prev + 1))} disabled={currentPage === filteredTotalPages} className="p-2 rounded-lg bg-[#0f172a] border border-[#334155] hover:bg-[#1e293b] transition disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4 text-gray-300" /></button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Clean Full-Width Form View */
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <ErrorBoundary>
                    <QuotationForm
                      quotationData={quotationData}
                      onFieldChange={handleFieldChange}
                      onCustomerIdChange={handleCustomerIdChange}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onUpdateItem={handleUpdateItem}
                      inventoryItems={inventoryItems}
                    />
                  </ErrorBoundary>
                )}

                {/* Form Footer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-lg sticky bottom-4 z-20">
                  <div className="text-xs text-gray-400">
                    {quotationData.items.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span>Items: <strong className="text-white">{quotationData.items.length}</strong></span>
                        <span className="text-gray-600">•</span>
                        <span>Total: <span className="text-emerald-400 font-mono font-bold text-sm">LKR {quotationData.totalAmount.toFixed(2)}</span></span>
                      </div>
                    ) : (
                      <span>Add products to generate quotation</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isDirty && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isLoading || isSaving}
                        className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleConvertQuotationToPO(quotationData)}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Convert Quotation to Purchase Order"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Convert to PO</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShareQuotation}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Share Quotation"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Download PDF via Preview"
                    >
                      <Download className="w-4 h-4" />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Print Quotation via Preview"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title="Preview Quotation"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isLoading || isSaving || quotationData.items.length === 0}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Quotation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dedicated Quotation Preview Modal */}
        <QuotationViewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          quotationData={quotationData}
          onConvertToPO={(q) => handleConvertQuotationToPO(q)}
          onShareSuccess={(msg) => setAlert({ type: 'success', message: msg })}
        />
      </div>
    </div>
  );
};

export default Quotation;