import React, { useState, useRef, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { PageHeader, FilterBar, DataTable, StatusBadge } from "../components/erp";
import type { Column } from "../components/erp/DataTable";
import {
  FileText,
  Download,
  Printer,
  X,
  Save,
  Eye,
  Edit,
  Trash2,
  Copy,
  Check,
  ShoppingCart,
  ShoppingBag,
  MessageCircle,
  RotateCcw,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import {
  validateLineDiscount,
  validateOverallDiscount,
  resolveMinPrice,
} from "../utils/discountValidator";
import { quotationService } from "../services/QuotationService";
import { inventoryService } from "../services/InventoryService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";
import CustomConfirm from "../components/CustomConfirm";
import { purchaseOrderService } from "../services/PurchaseOrderService";
import { orderService } from "../services/OrderService";
import type { PurchaseOrder } from "../types/purchaseOrders";
import type { Order } from "../types/orders";
import CreatePOModal, { type POInitialData, type POConversionItem } from "../components/orders/CreatePOModal";
import CreateOrderModal from "../components/orders/CreateOrderModal";
import { generateQuotationWhatsAppMessage, getWhatsAppUrl } from "../utils/whatsapp";

const Quotation: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<QuotationInventoryItem[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<QuotationData | null>(null);
  const lastSavedAtRef = useRef<string | null>(null);

  const navigate = useNavigate();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderModalInitialData, setOrderModalInitialData] = useState<Order | null>(null);
  const [showPOModal, setShowPOModal] = useState(false);
  const [poModalInitialData, setPoModalInitialData] = useState<POInitialData | null>(null);

  const [viewMode, setViewMode] = useState<'edit' | 'manage'>('manage');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [allQuotations, setAllQuotations] = useState<QuotationResponse[]>([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  // Filter and pagination states matching Orders page
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortColumn, setSortColumn] = useState('quotationNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleCloseDrawer = () => {
    setIsDirty(false);
    setIsCreateDrawerOpen(false);
  };

  useEffect(() => {
    if (!isCreateDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateDrawerOpen]);

  const handleNewQuotation = async () => {
    try {
      setIsLoading(true);
      const nextId = await quotationService.getNextId();
      const freshData: QuotationData = {
        ...getInitialQuotationData(),
        quotationNumber: nextId,
      };
      setQuotationData(freshData);
      lastSavedRef.current = null;
      setIsDirty(false);
      lastSavedAtRef.current = null;
      setIsCreateDrawerOpen(true);
    } catch {
      setQuotationData(getInitialQuotationData());
      setIsCreateDrawerOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

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
    quotationNumber: "",
    customer: "",
    customerDetails: undefined,
    items: [],
    subTotal: 0,
    discount: 0,
    discountPercentage: 0,
    totalDiscountType: 'percentage',
    totalDiscountValue: 0,
    totalAmount: 0,
    paymentMethod: PaymentMethod.CASH,
    status: QuotationStatus.PENDING,
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
  });

  const [quotationData, setQuotationData] = useState<QuotationData>(getInitialQuotationData());


  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const items = await inventoryService.getAll();
      setInventoryItems(items as QuotationInventoryItem[]);

      const nextId = await quotationService.getNextId();
      setQuotationData({
        ...getInitialQuotationData(),
        quotationNumber: nextId
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
    fetchAllQuotations();
  }, []);

  const handleAddItem = (item: Omit<QuotationItem, 'id' | 'total'> & { total?: number }) => {
    const existingItemIndex = quotationData.items.findIndex(existing => {
      const sameProduct =
        (existing.inventoryItemId && item.inventoryItemId && existing.inventoryItemId === item.inventoryItemId) ||
        (existing.itemName && item.itemName && existing.itemName.trim().toLowerCase() === item.itemName.trim().toLowerCase());
      const samePrice = Number(existing.unitPrice) === Number(item.unitPrice);
      const sameDiscType = (existing.discountType || 'percentage') === (item.discountType || 'percentage');
      const sameDiscScope = (existing.discountScope || 'per_unit') === (item.discountScope || 'per_unit');
      const existingDiscVal = Number(existing.discountValue !== undefined ? existing.discountValue : ((existing as any).discount || 0));
      const itemDiscVal = Number(item.discountValue !== undefined ? item.discountValue : ((item as any).discount || 0));
      const sameDiscVal = Math.abs(existingDiscVal - itemDiscVal) < 0.0001;
      return sameProduct && samePrice && sameDiscType && sameDiscScope && sameDiscVal;
    });

    let newItems: QuotationItem[];
    const total = item.total !== undefined ? item.total : (item.quantity * item.unitPrice);

    if (existingItemIndex !== -1) {
      newItems = [...quotationData.items];
      const existingItem = newItems[existingItemIndex];
      const newQty = existingItem.quantity + item.quantity;
      let newDiscount = 0;
      if (item.discountValue !== undefined) {
        if (item.discountType === 'percentage') {
          const pct = Math.min(100, Math.max(0, Number(item.discountValue)));
          newDiscount = (newQty * item.unitPrice) * (pct / 100);
        } else {
          newDiscount = item.discountScope === 'total_qty'
            ? Math.min(newQty * item.unitPrice, Number(item.discountValue))
            : Math.min(item.unitPrice, Number(item.discountValue)) * newQty;
        }
      }
      const newTotal = Math.max(0, (newQty * item.unitPrice) - newDiscount);

      const updatedItem: QuotationItem = {
        ...existingItem,
        ...item,
        quantity: newQty,
        discountAmount: newDiscount,
        total: newTotal
      };
      newItems[existingItemIndex] = updatedItem;
    } else {
      const newItem: QuotationItem = {
        ...item,
        id: Date.now().toString(),
        total
      };
      newItems = [...quotationData.items, newItem];
    }

    const subTotal = newItems.reduce((sum, it) => sum + it.total, 0);
    const discType = quotationData.totalDiscountType || 'percentage';
    const discVal = quotationData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const totalAmount = Math.max(0, subTotal - totalDiscount);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount
    }));
    setIsDirty(true);
  };

  const handleCancelEdit = async () => {
    if (quotationData.id) {
      setConfirmConfig({
        isOpen: true,
        title: "Discard Changes",
        message: "Are you sure you want to discard changes? You will lose any unsaved modifications.",
        confirmText: "Discard",
        type: "danger",
        onConfirm: async () => {
          await loadInitialData();
          setIsCreateDrawerOpen(false);
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
      fetchAllQuotations();
    }
  };

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
      quotationNumber: data.quotationNumber,
      customerId: data.customer,
      items: data.items.map(item => ({
        inventoryItemId: item.inventoryItemId,
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
    const subTotal = newItems.reduce((sum, it) => sum + it.total, 0);
    const discType = quotationData.totalDiscountType || 'percentage';
    const discVal = quotationData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const totalAmount = Math.max(0, subTotal - totalDiscount);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount
    }));
    setIsDirty(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuotationItem>) => {
    const newItems = quotationData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        if (
          updates.quantity !== undefined ||
          updates.unitPrice !== undefined ||
          updates.discountValue !== undefined ||
          updates.discountType !== undefined ||
          updates.discountScope !== undefined
        ) {
          const qty = updatedItem.quantity;
          const baseSub = qty * updatedItem.unitPrice;
          let discAmount = 0;
          const discVal = Number(updatedItem.discountValue) || 0;

          if (discVal > 0) {
            if (updatedItem.discountType === 'percentage') {
              const pct = Math.min(100, Math.max(0, discVal));
              discAmount = (baseSub * pct) / 100;
            } else {
              discAmount = updatedItem.discountScope === 'total_qty'
                ? Math.min(baseSub, discVal)
                : Math.min(updatedItem.unitPrice, discVal) * qty;
            }
          }

          updatedItem.discountAmount = discAmount;
          updatedItem.total = Math.max(0, baseSub - discAmount);
        }
        return updatedItem;
      }
      return item;
    });

    const subTotal = newItems.reduce((sum, it) => sum + it.total, 0);
    const discType = quotationData.totalDiscountType || 'percentage';
    const discVal = quotationData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const totalAmount = Math.max(0, subTotal - totalDiscount);

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount
    }));
    setIsDirty(true);
  };

  const handleTotalDiscountChange = (discountType: 'percentage' | 'amount', discountValue: number) => {
    const subTotal = quotationData.items.reduce((sum, item) => sum + item.total, 0);
    let totalDiscount = 0;

    if (discountValue > 0) {
      if (discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discountValue));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discountValue);
      }
    }

    const totalAmount = Math.max(0, subTotal - totalDiscount);

    setQuotationData(prev => ({
      ...prev,
      totalDiscountType: discountType,
      totalDiscountValue: discountValue,
      discount: totalDiscount,
      discountPercentage: discountType === 'percentage' ? discountValue : (subTotal > 0 ? (totalDiscount / subTotal) * 100 : 0),
      totalAmount,
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

  const handleSave = async (skipPriceWarning = false): Promise<boolean> => {
    if (!quotationData.customer || quotationData.items.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please add customer and at least one item before saving'
      });
      return false;
    }

    // Check line item discounts & overall discount for below-cost warnings
    if (!skipPriceWarning) {
      const priceWarnings: string[] = [];
      for (const item of quotationData.items) {
        const inv = inventoryItems.find(i => i.id === item.inventoryItemId || i.productCode === item.productCode);
        const minPrice = resolveMinPrice(inv || { costPrice: (item as any).costPrice });
        const lineCheck = validateLineDiscount({
          productName: item.itemName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discountType: item.discountType || 'percentage',
          discountScope: item.discountScope || 'per_unit',
          discountValue: item.discountValue,
          minPrice,
        });
        if (!lineCheck.isValid && lineCheck.error) {
          priceWarnings.push(lineCheck.error);
        }
      }

      const overallCheck = validateOverallDiscount({
        items: quotationData.items.map(it => {
          const inv = inventoryItems.find(i => i.id === it.inventoryItemId || i.productCode === it.productCode);
          return {
            productName: it.itemName,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            discountAmount: it.discountAmount,
            minPrice: resolveMinPrice(inv || { costPrice: (it as any).costPrice }),
          };
        }),
        totalDiscountType: quotationData.totalDiscountType,
        totalDiscountValue: quotationData.totalDiscountValue,
      });
      if (!overallCheck.isValid && overallCheck.error) {
        priceWarnings.push(overallCheck.error);
      }

      if (priceWarnings.length > 0) {
        setConfirmConfig({
          isOpen: true,
          title: 'Price Below Cost Warning',
          message: `The following item(s) are priced below cost / minimum allowed price:\n\n${priceWarnings.map(w => '• ' + w).join('\n')}\n\nDo you want to proceed and save this quotation anyway?`,
          confirmText: 'Proceed & Save',
          cancelText: 'Review Quotation',
          type: 'warning',
          onConfirm: async () => {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            await handleSave(true);
          }
        });
        return false;
      }
    }

    try {
      setIsSaving(true);

      const backendData = prepareQuotationForSave(quotationData);
      if (quotationData.id) {
        setAlert({
          type: 'info',
          message: 'Updating quotation...'
        });

        await quotationService.update(quotationData.id, backendData);

        setAlert({
          type: 'success',
          message: 'Quotation updated successfully!'
        });
        lastSavedRef.current = { ...quotationData };
        setIsDirty(false);
        lastSavedAtRef.current = new Date().toISOString();
        fetchAllQuotations();
      } else {
        setAlert({
          type: 'info',
          message: 'Saving quotation...'
        });

        const response = await quotationService.create(backendData);

        setQuotationData(prev => ({
          ...prev,
          id: response.id,
          quotationNumber: (response as any).quotationNumber || prev.quotationNumber,
        }));

        setAlert({
          type: 'success',
          message: 'Quotation saved successfully!'
        });
        lastSavedRef.current = { ...quotationData, id: response.id } as QuotationData;
        setIsDirty(false);
        lastSavedAtRef.current = new Date().toISOString();
        fetchAllQuotations();
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

  const handleShareWhatsAppDirect = () => {
    if (!quotationData.customer && quotationData.items.length === 0) {
      setAlert({ type: 'error', message: 'Please add customer and items to share' });
      return;
    }
    const customerObj = typeof quotationData.customer === 'object' ? quotationData.customer : quotationData.customerDetails;
    const phone = customerObj?.phone || '';
    const custName = customerObj?.fullName || customerObj?.shopName || 'Valued Customer';
    const text = generateQuotationWhatsAppMessage({
      quotationNumber: quotationData.quotationNumber || `QUO-${quotationData.id || ''}`,
      customerName: custName,
      totalAmount: quotationData.totalAmount,
      issueDate: quotationData.issueDate ? String(quotationData.issueDate).split('T')[0] : '',
      itemsCount: quotationData.items.length,
      remarks: quotationData.notes || '',
    });
    const url = getWhatsAppUrl(phone, text);
    window.open(url, '_blank');
  };

  const fetchAllQuotations = async () => {
    try {
      setIsLoadingQuotations(true);
      const quotations = await quotationService.getAll();
      const sortedQuotations = (quotations || []).sort((a, b) =>
        (b.quotationNumber || '').localeCompare(a.quotationNumber || '', undefined, { numeric: true, sensitivity: 'base' })
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
      inventoryItemId: item.inventoryItemId,
      inventoryItem: item.inventoryItem,
      itemName: item.itemName || item.inventoryItem?.productName || 'Unknown Item',
      productCode: item.productCode || item.inventoryItem?.productCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));

    const discountPercentage = quotation.subTotal > 0
      ? (quotation.discount / quotation.subTotal) * 100
      : 0;

    const loadedSalesman = quotation.salesman || (quotation.customer as any)?.salesRep
      ? { id: quotation.salesman?.id || (quotation.customer as any)?.salesRep?.id || (quotation.customer as any)?.salesRepId || '', fullName: quotation.salesman?.fullName || (quotation.customer as any)?.salesRep?.fullName || (quotation.customer as any)?.salesRepName || '', name: quotation.salesman?.fullName || (quotation.customer as any)?.salesRepName || '' }
      : (quotation.customer as any)?.salesRepName
        ? { id: (quotation.customer as any)?.salesRepId || '', fullName: (quotation.customer as any)?.salesRepName, name: (quotation.customer as any)?.salesRepName }
        : undefined;

    const quotationToSet: QuotationData = {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      customer: quotation.customer.id || quotation.customer,
      customerDetails: quotation.customer,
      salesman: loadedSalesman,
      salesmanName: quotation.salesmanName || loadedSalesman?.fullName,
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
    };

    setQuotationData(quotationToSet);
    lastSavedRef.current = { ...quotationToSet };
    setIsDirty(false);
    lastSavedAtRef.current = new Date().toISOString();

    if (mode === 'view') {
      setShowPreviewModal(true);
    } else {
      setIsCreateDrawerOpen(true);
      setViewMode('edit');
    }
  };

  const handleDeleteQuotation = async (id: string, quotationNumber: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Quotation",
      message: `Are you sure you want to delete quotation ${quotationNumber}? This action cannot be undone.`,
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        try {
          await quotationService.delete(id);
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


  const handleConvertQuotationToPO = (quotation: QuotationResponse | QuotationData) => {
    const customerObj = 'customerDetails' in quotation ? quotation.customerDetails : undefined;
    const customerName = customerObj
      ? customerObj.fullName
      : typeof quotation.customer === 'object'
        ? (quotation.customer as any)?.fullName || (quotation.customer as any)?.name || 'Unknown'
        : String(quotation.customer || 'Unknown');

    const conversionItems: POConversionItem[] = (quotation.items || []).map((it: any) => ({
      sku: it.productCode || it.inventoryItem?.productCode || it.inventoryItemId,
      productName: it.itemName || it.inventoryItem?.productName || 'Item',
      quantity: it.quantity,
      sellingPrice: it.unitPrice,
    }));

    setPoModalInitialData({
      sourceOrderNumber: quotation.quotationNumber,
      customerName,
      notes: quotation.notes || '',
      items: conversionItems,
    });
    setShowPOModal(true);
  };

  const handleConvertQuotationToOrder = (quotation: QuotationResponse | QuotationData) => {
    const cust = typeof quotation.customer === 'object' && quotation.customer ? quotation.customer : undefined;
    const items = (quotation.items || []).map((it: any) => ({
      id: it.inventoryItemId || it.id || Date.now().toString(),
      inventoryItemId: it.inventoryItemId || it.id,
      sku: it.productCode || it.inventoryItem?.productCode || 'ITEM',
      productName: it.itemName || it.inventoryItem?.productName || 'Product',
      quantity: it.quantity || 1,
      unit: 'PCS',
      unitPrice: it.unitPrice || 0,
      discount: it.discount || 0,
      discountType: 'percentage' as const,
      discountScope: 'per_unit' as const,
      discountValue: 0,
      discountAmount: it.discount || 0,
      tax: 0,
      subTotal: (it.quantity || 1) * (it.unitPrice || 0),
      total: it.total || ((it.quantity || 1) * (it.unitPrice || 0) - (it.discount || 0)),
    }));

    const draftOrder: Order = {
      id: Date.now().toString(),
      orderNumber: `ORD-${10025 + Math.floor(Math.random() * 9000)}`,
      orderDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerId: cust?.id || String(quotation.customer || ''),
      customerName: cust?.shopName || cust?.fullName || 'Customer',
      contactPerson: cust?.contactPerson || '',
      contactPhone: cust?.phone || '',
      customerAddress: cust?.address || '',
      customerCity: cust?.city || '',
      items,
      numberOfProducts: items.length,
      subTotal: quotation.subTotal || items.reduce((s: number, i: any) => s + i.total, 0),
      totalDiscount: quotation.discount || 0,
      totalTax: 0,
      grandTotal: quotation.totalAmount || quotation.subTotal || 0,
      status: 'pending',
      paymentStatus: 'unpaid',
      notes: quotation.notes || '',
      timeline: [],
    };

    setOrderModalInitialData(draftOrder);
    setShowOrderModal(true);
  };

  const handleConvertQuotationToInvoice = (quotation: QuotationResponse | QuotationData) => {
    navigate('/invoice', {
      state: {
        convertFromQuotation: quotation,
      },
    });
  };

  const handlePOSubmit = async (newPO: PurchaseOrder) => {
    try {
      await purchaseOrderService.create(newPO);
    } catch {
      // ignore
    }
    setShowPOModal(false);
    setPoModalInitialData(null);
    setAlert({
      type: 'success',
      message: `Purchase Order ${newPO.poNumber} created from Quotation!`,
    });
  };

  const handleCopyQuotationLink = (id: string, quotationNumber: string) => {
    const link = `${window.location.origin}/quotation/view/${id}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedQuotationId(id);
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

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchAllQuotations();
    }
  }, [viewMode]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val || 0);

  const getCustomerDisplay = (q: QuotationResponse) =>
    q.customer?.shopName || q.customer?.fullName || 'Walk-in Customer';

  const getSalesmanDisplay = (q: QuotationResponse) =>
    q.salesman?.fullName || q.salesman?.name || q.salesmanName || '';

  const salesmenOptions = useMemo(() => {
    const names = Array.from(new Set(allQuotations.map((q) => getSalesmanDisplay(q)).filter(Boolean))) as string[];
    return names.map((name) => ({ value: name, label: name }));
  }, [allQuotations]);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'credit', label: 'Credit' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
  ];

  const searchSuggestions = useMemo(() => {
    const suggestions: Array<{ id: string; title: string; subtitle?: string; category: string; value: string }> = [];
    const seenCustomers = new Set<string>();

    allQuotations.forEach(q => {
      const name = getCustomerDisplay(q);
      if (name && name !== 'Walk-in Customer' && !seenCustomers.has(name)) {
        seenCustomers.add(name);
        suggestions.push({
          id: `cust-${q.customer?.id || name}`,
          title: name,
          subtitle: q.customer?.city || q.customer?.phone || '',
          category: 'Customer',
          value: name,
        });
      }
    });

    return suggestions;
  }, [allQuotations]);

  const filteredQuotations = useMemo(() => {
    return allQuotations.filter((q) => {
      const term = searchQuery.toLowerCase().trim();
      const custName = getCustomerDisplay(q).toLowerCase();
      const qNum = (q.quotationNumber || '').toLowerCase();
      const smName = getSalesmanDisplay(q).toLowerCase();
      const matchesSearch = term === '' || custName.includes(term) || qNum.includes(term) || smName.includes(term);

      const matchesStatus = statusFilter === '' || q.status === statusFilter;
      const matchesPayment = paymentFilter === '' || (q.paymentMethod || '').toLowerCase() === paymentFilter.toLowerCase();
      const matchesSalesman = salesmanFilter === '' || getSalesmanDisplay(q) === salesmanFilter;

      const issueDate = q.issueDate ? String(q.issueDate).split('T')[0] : '';
      const matchesDateFrom = dateFrom === '' || issueDate >= dateFrom;
      const matchesDateTo = dateTo === '' || issueDate <= dateTo;

      return matchesSearch && matchesStatus && matchesPayment && matchesSalesman && matchesDateFrom && matchesDateTo;
    });
  }, [allQuotations, searchQuery, statusFilter, paymentFilter, salesmanFilter, dateFrom, dateTo]);

  const sortedQuotations = useMemo(() => {
    return [...filteredQuotations].sort((a, b) => {
      if (sortColumn === 'quotationNumber') {
        const cmp = (a.quotationNumber || '').localeCompare(b.quotationNumber || '', undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];
      if (sortColumn === 'customer') {
        valA = getCustomerDisplay(a);
        valB = getCustomerDisplay(b);
      } else if (sortColumn === 'salesman') {
        valA = getSalesmanDisplay(a);
        valB = getSalesmanDisplay(b);
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return (b.quotationNumber || '').localeCompare(a.quotationNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredQuotations, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedQuotations.length / itemsPerPage));
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedQuotations.slice(start, start + itemsPerPage);
  }, [sortedQuotations, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection(colKey === 'quotationNumber' ? 'desc' : 'asc');
    }
  };

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== '' || paymentFilter !== '' ||
    salesmanFilter !== '' || dateFrom !== '' || dateTo !== '';

  const clearAllFilters = () => {
    setSearchQuery(''); setStatusFilter(''); setPaymentFilter('');
    setSalesmanFilter(''); setDateFrom(''); setDateTo('');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = ['Quotation ID', 'Date', 'Customer', 'Salesman', 'Items', 'Total Amount', 'Status'];
    const rows = sortedQuotations.map((q) => {
      const custName = getCustomerDisplay(q);
      const smName = getSalesmanDisplay(q);
      return [
        q.quotationNumber,
        q.issueDate ? String(q.issueDate).split('T')[0] : '',
        `"${custName}"`,
        `"${smName || 'Unassigned'}"`,
        q.items?.length || 0,
        q.totalAmount || 0,
        q.status,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `quotations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<QuotationResponse>[] = [
    {
      key: 'quotationNumber',
      header: 'QUOTATION ID',
      sortable: true,
      minWidth: '120px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLoadQuotation(row, 'view');
          }}
          className="font-mono text-blue-400 hover:text-blue-300 font-bold text-xs hover:underline cursor-pointer text-left"
          title="Preview Quotation"
        >
          {row.quotationNumber}
        </button>
      ),
    },
    {
      key: 'issueDate',
      header: 'DATE',
      sortable: true,
      minWidth: '105px',
      render: (row) => {
        const cleanDate = row.issueDate ? String(row.issueDate).split('T')[0] : '—';
        return <span className="text-gray-300 text-xs font-mono font-medium">{cleanDate}</span>;
      },
    },
    {
      key: 'customer',
      header: 'CUSTOMER',
      sortable: true,
      minWidth: '180px',
      render: (row) => {
        const custName = getCustomerDisplay(row);
        const fullAddress = row.customer?.address
          ? `${row.customer.address}, ${row.customer.city || ''}`
          : row.customer?.city || 'N/A';
        const tooltip = `Full Name: ${custName}\nPhone: ${row.customer?.phone || 'N/A'}\nAddress: ${fullAddress}`;
        return (
          <div className="min-w-0 cursor-help" title={tooltip}>
            <p className="font-semibold text-gray-200 text-sm leading-tight truncate max-w-[200px]">{custName}</p>
            <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{fullAddress}</p>
          </div>
        );
      },
    },
    {
      key: 'salesman',
      header: 'SALESMAN',
      sortable: true,
      minWidth: '140px',
      render: (row) => {
        const salesmanName = getSalesmanDisplay(row);
        return (
          <div>
            <p className="text-xs font-semibold text-gray-300">{salesmanName || '—'}</p>
          </div>
        );
      },
    },
    {
      key: 'items',
      header: 'ITEMS',
      align: 'center',
      minWidth: '60px',
      render: (row) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-[#1e293b] text-gray-200 border border-[#334155]">
          {row.items?.length || 0}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'AMOUNT',
      sortable: true,
      align: 'right',
      minWidth: '120px',
      render: (row) => (
        <span className="font-bold text-white text-sm font-mono">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      minWidth: '110px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '220px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => {
              const custPhone = row.customer?.phone || '';
              const custName = getCustomerDisplay(row);
              const link = `${window.location.origin}/quotation/view/${row.id}`;
              const cleanPhone = custPhone.replace(/[^0-9]/g, '');
              const text = encodeURIComponent(
                `Hello ${custName},\n\nHere is your quotation ${row.quotationNumber} from S & K Enterprises.\n\nTotal: LKR ${Math.round(row.totalAmount).toLocaleString()}/=\n\nView quotation online:\n${link}\n\nThank you for your business!`
              );
              const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
              window.open(url, '_blank');
            }}
            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleLoadQuotation(row, 'edit')}
            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Edit Quotation"
          >
            <Edit size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleLoadQuotation(row, 'view')}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Preview Quotation"
          >
            <Eye size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleCopyQuotationLink(row.id, row.quotationNumber)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title={copiedQuotationId === row.id ? "Link Copied!" : "Copy Quotation Link"}
          >
            {copiedQuotationId === row.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>

          <button
            type="button"
            onClick={() => handleConvertQuotationToOrder(row)}
            className="p-1.5 text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Convert to Sales Order"
          >
            <ShoppingBag size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleConvertQuotationToInvoice(row)}
            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Convert to Invoice"
          >
            <FileText size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleConvertQuotationToPO(row)}
            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Convert to Purchase Order"
          >
            <ShoppingCart size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleDeleteQuotation(row.id, row.quotationNumber)}
            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Delete Quotation"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AppLayout
        headerIcon={<FileText size={20} className="text-blue-400" />}
        headerTitle="Quotation Management"
        headerSubtitle="Sales quotations and customer estimates"
      >
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

        <PageHeader
          title="Customer Quotations"
          description="Manage and review quotations sent to customers."
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Sales' },
            { label: 'Quotations' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 border border-[#334155] bg-[#1e293b] hover:bg-[#334155] text-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                type="button"
                onClick={handleNewQuotation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <Plus size={15} /> New Quotation
              </button>
            </div>
          }
        />

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <FilterBar
            searchPlaceholder="Search quotation ID, customer name..."
            searchValue={searchQuery}
            onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
            suggestions={searchSuggestions}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={(val) => { setDateFrom(val); setCurrentPage(1); }}
            onDateToChange={(val) => { setDateTo(val); setCurrentPage(1); }}
            selects={[
              {
                value: statusFilter,
                onChange: (val) => { setStatusFilter(val); setCurrentPage(1); },
                options: statusOptions,
                placeholder: 'All Statuses',
                width: 'w-36',
              },
              {
                value: paymentFilter,
                onChange: (val) => { setPaymentFilter(val); setCurrentPage(1); },
                options: paymentOptions,
                placeholder: 'All Payments',
                width: 'w-32',
              },
              {
                value: salesmanFilter,
                onChange: (val) => { setSalesmanFilter(val); setCurrentPage(1); },
                options: salesmenOptions,
                placeholder: 'All Salesmen',
                width: 'w-36',
              },
            ]}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
          />

          <div className="p-4">
            <DataTable
              columns={columns}
              data={paginatedQuotations}
              loading={isLoadingQuotations}
              keyExtractor={(item) => item.id || item.quotationNumber}
              onRowClick={(item) => {
                handleLoadQuotation(item, 'view');
              }}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage="No quotations found matching the criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedQuotations.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </AppLayout>

      {/* Create / Edit Quotation Drawer */}
        {isCreateDrawerOpen && (
          <div className="fixed inset-0 z-[900] flex items-start justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCloseDrawer}
            />
            <div className="relative w-full md:w-[70vw] lg:w-[70vw] xl:w-[70vw] max-w-none h-screen bg-[#0f172a] border-l border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-slideIn">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {quotationData.id ? `Edit Quotation — ${quotationData.quotationNumber}` : 'Create New Quotation'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {quotationData.id ? 'Modify products, quantities, and discounts for this quotation' : 'Fill in the details below to generate a new quotation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-[#334155] rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[#0f172a] p-4 md:p-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
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
                      onTotalDiscountChange={handleTotalDiscountChange}
                      inventoryItems={inventoryItems}
                    />
                  </ErrorBoundary>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-lg sticky bottom-4 z-20">
                  <div className="text-xs text-gray-400">
                    {quotationData.items.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span>Items: <strong className="text-white">{quotationData.items.length}</strong></span>
                        <span className="text-gray-600">•</span>
                        <span>Total: <span className="text-emerald-400 font-mono font-bold text-sm">LKR {Math.round(quotationData.totalAmount).toLocaleString()}/=</span></span>
                      </div>
                    ) : (
                      <span>Add products to generate quotation</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloseDrawer}
                      disabled={isLoading || isSaving}
                      className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Close</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      title="Clear quotation"
                      className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Clear</span>
                    </button>

                    {(() => {
                      const isQuotationSaved = Boolean(quotationData.id);
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConvertQuotationToOrder(quotationData)}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Convert Quotation to Sales Order"}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Convert to Order</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConvertQuotationToPO(quotationData)}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Convert Quotation to Purchase Order"}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span>Convert to PO</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleConvertQuotationToInvoice(quotationData)}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Convert Quotation to Invoice"}
                          >
                            <FileText className="w-4 h-4" />
                            <span>Convert to Invoice</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleShareWhatsAppDirect}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Share Quotation on WhatsApp"}
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Share on WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Print Quotation via Preview"}
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isQuotationSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isQuotationSaved ? "Please save quotation first" : "Preview Quotation"}
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </button>
                        </>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isLoading || isSaving}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition shadow-md cursor-pointer"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{quotationData.id ? 'Update Quotation' : 'Create Quotation'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <QuotationViewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          quotationData={quotationData}
          onConvertToPO={(q) => handleConvertQuotationToPO(q)}
          onShareSuccess={(msg) => setAlert({ type: 'success', message: msg })}
        />

        {/* Convert to PO Modal */}
        {showPOModal && poModalInitialData && (
          <CreatePOModal
            isOpen={showPOModal}
            onClose={() => {
              setShowPOModal(false);
              setPoModalInitialData(null);
            }}
            onSubmit={handlePOSubmit}
            initialData={poModalInitialData}
          />
        )}

        {/* Convert to Order Modal */}
        {showOrderModal && (
          <CreateOrderModal
            isOpen={showOrderModal}
            onClose={() => {
              setShowOrderModal(false);
              setOrderModalInitialData(null);
            }}
            onSubmit={async (orderPayload) => {
              try {
                const res = await orderService.create(orderPayload);
                setShowOrderModal(false);
                setOrderModalInitialData(null);
                setAlert({
                  type: 'success',
                  message: `Order ${res.orderNumber} created successfully from Quotation!`,
                });
                return res;
              } catch (err: any) {
                setAlert({
                  type: 'error',
                  message: err?.message || 'Failed to create order from quotation',
                });
              }
            }}
            initialOrder={orderModalInitialData}
          />
        )}
    </>
  );
};

export default Quotation;
