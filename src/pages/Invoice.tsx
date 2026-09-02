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
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Share2,
  MessageCircle,
  RotateCcw,
  UserCheck
} from "lucide-react";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceViewModal from "../components/invoice/InvoiceViewModal";
import { ActionMenu } from "../components/erp";
import { CreateReturnModal } from "../components/invoice/CreateReturnModal";
import PaymentModal from "../components/PaymentModal";
import PaymentBreakdownTooltip from "../components/invoice/PaymentBreakdownTooltip";
import type {
  InvoiceData,
  InvoiceItem,
  BackendInvoiceData,
  InvoiceCustomer,
  InvoiceResponse
} from "../types/invoice";
import type { InventoryItem as InvoiceInventoryItem } from "../types/inventory";
import { PaymentStatus, PaymentMethod, type PaymentMethodType, getInvoiceCalculatedStatus } from "../types/invoice";
import {
  validateLineDiscount,
  validateOverallDiscount,
  resolveMinPrice,
} from "../utils/discountValidator";
import { invoiceService } from "../services/InvoiceService";
import { financeService } from "../services/FinanceService";
import type { FinancePaymentData } from "../types/finance";
import { inventoryService } from "../services/InventoryService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";
import CustomConfirm from "../components/CustomConfirm";
import UserProfileDropdown from "../components/UserProfileDropdown";
import ThemeToggle from "../components/ThemeToggle";
import { useLocation } from "react-router-dom";
import type { PurchaseOrder } from "../types/purchaseOrders";

const Invoice: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InvoiceInventoryItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<InvoiceData | null>(null);
  const lastSavedAtRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<'edit' | 'manage'>('edit');
  const [allInvoices, setAllInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [manageSearch, setManageSearch] = useState("");

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    method: PaymentMethod.CASH as PaymentMethodType,
    bankName: "",
    accountNumber: "",
    transactionRef: "",
    amount: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  const [paymentModalTriggeredByForm, setPaymentModalTriggeredByForm] = useState(false);

  // state for copy confirmation
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

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


  const isInvoiceEditable = (paymentStatus?: string, status?: string) => {
    const ps = (paymentStatus || '').toLowerCase();
    const s = (status || '').toLowerCase();
    return ps !== 'paid' && ps !== 'completed' && s !== 'rejected' && s !== 'returned' && s !== 'return_completed';
  };

  const getInitialInvoiceData = (): InvoiceData => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      invoiceNumber: "",
      customer: "",
      customerDetails: undefined,
      items: [],
      subTotal: 0,
      discount: 0,
      discountPercentage: 0,
      totalDiscountType: 'percentage',
      totalDiscountValue: 0,
      totalAmount: 0,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.CREDIT,
      creditPeriod: 30,
      issueDate: today,
      dueDate: defaultDueDate,
      vehicleNumber: "",
      notes: "",
      applyVat: false,
      vatAmount: 0,
      taxRate: 0,
    };
  };

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialInvoiceData());


  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const items = await inventoryService.getAll();
      setInventoryItems(items as InvoiceInventoryItem[]);

      const nextId = await invoiceService.getNextId();

      const convertFromPO = location.state?.convertFromPO as PurchaseOrder | undefined;
      // salesman can be explicitly passed in location.state, e.g. from an order conversion
      const convertFromSalesman = location.state?.salesman as { id: string; name: string } | undefined;
      // convertFromOrder: direct Order → Invoice conversion
      const convertFromOrder = location.state?.convertFromOrder as import('../types/orders').Order | undefined;

      let initialInvoiceItems: InvoiceItem[] = [];
      let initialNotes = "";
      let initialCustomer: string | import('../types/invoice').InvoiceCustomer = "";
      let initialSubTotal = 0;
      let initialDiscount = 0;
      let initialTotalAmount = 0;
      let initialSalesman = convertFromSalesman || null;
      let initialSourceOrderId: string | null = null;
      let initialSourcePoId: string | null = null;

      if (convertFromOrder) {
        initialSourceOrderId = convertFromOrder.id || null;
      }
      if (convertFromPO) {
        initialSourcePoId = convertFromPO.id || null;
        if (!initialSourceOrderId) {
          initialSourceOrderId = convertFromOrder?.id || convertFromPO.sourceOrderId || null;
        }
      }

      if (convertFromOrder && convertFromOrder.items && convertFromOrder.items.length > 0) {
        // Build customer object from order fields
        initialCustomer = {
          id: convertFromOrder.customerId,
          customerCode: convertFromOrder.customerId,
          shopName: convertFromOrder.customerName,
          fullName: convertFromOrder.customerName,
          contactPerson: convertFromOrder.contactPerson,
          phone: convertFromOrder.contactPhone,
          address: convertFromOrder.customerAddress,
          city: convertFromOrder.customerCity,
        };

        // Build items preserving exact discountType, discountScope, and discountValue
        initialInvoiceItems = convertFromOrder.items.map((p, idx) => {
          const qty = p.quantity || 0;
          const unitPrice = p.unitPrice || 0;
          const subtotalBeforeDiscount = qty * unitPrice;
          const discType = p.discountType || 'percentage';
          const discScope = p.discountScope || 'per_unit';
          const discVal = p.discountValue !== undefined ? Number(p.discountValue) : (Number(p.discount) || 0);

          let calculatedDiscountAmount = 0;
          if (discVal > 0 && unitPrice > 0 && qty > 0) {
            if (discType === 'percentage') {
              const pct = Math.min(100, Math.max(0, discVal));
              if (discScope === 'per_unit') {
                calculatedDiscountAmount = unitPrice * (pct / 100) * qty;
              } else {
                calculatedDiscountAmount = subtotalBeforeDiscount * (pct / 100);
              }
            } else {
              if (discScope === 'per_unit') {
                calculatedDiscountAmount = Math.min(unitPrice, discVal) * qty;
              } else {
                calculatedDiscountAmount = Math.min(subtotalBeforeDiscount, discVal);
              }
            }
          }

          const lineTotal = p.total !== undefined ? p.total : Math.max(0, subtotalBeforeDiscount - calculatedDiscountAmount);

          const normalizedScope = discScope === 'total' ? 'total_qty' : (discScope as 'per_unit' | 'total_qty');

          return {
            id: `inv-item-${Date.now()}-${idx}`,
            inventoryItemId: p.inventoryItemId || p.id,
            itemName: p.productName,
            itemCode: p.sku,
            productCode: p.sku,
            quantity: qty,
            unitPrice: unitPrice,
            discountType: discType as 'percentage' | 'amount',
            discountScope: normalizedScope,
            discountValue: discVal,
            discountAmount: calculatedDiscountAmount,
            discount: calculatedDiscountAmount,
            total: lineTotal,
          };
        });

        const itemsSubtotal = initialInvoiceItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
        const lineDiscountTotal = initialInvoiceItems.reduce((s, i) => s + (i.discountAmount || 0), 0);
        const subTotalAfterLineDiscounts = Math.max(0, itemsSubtotal - lineDiscountTotal);

        const orderDiscountType = convertFromOrder.totalDiscountType || 'percentage';
        const orderDiscountVal = convertFromOrder.totalDiscountValue !== undefined ? Number(convertFromOrder.totalDiscountValue) : 0;
        let calculatedOrderDiscount = 0;

        if (orderDiscountVal > 0) {
          if (orderDiscountType === 'percentage') {
            calculatedOrderDiscount = subTotalAfterLineDiscounts * (Math.min(100, orderDiscountVal) / 100);
          } else {
            calculatedOrderDiscount = Math.min(subTotalAfterLineDiscounts, orderDiscountVal);
          }
        }

        initialSubTotal = subTotalAfterLineDiscounts;
        initialDiscount = calculatedOrderDiscount;
        initialTotalAmount = Math.max(0, subTotalAfterLineDiscounts - calculatedOrderDiscount);
        initialNotes = `Converted from Order #${convertFromOrder.orderNumber}`;

        // Use salesman from order if available
        if (convertFromOrder.salesmanId || convertFromOrder.salesmanName) {
          initialSalesman = {
            id: convertFromOrder.salesmanId || '',
            name: convertFromOrder.salesmanName || '',
          };
        }

      } else if (convertFromPO && convertFromPO.items && convertFromPO.items.length > 0) {
        initialInvoiceItems = convertFromPO.items.map((p, idx) => ({
          id: `inv-item-${Date.now()}-${idx}`,
          inventoryItemId: p.inventoryItemId || p.id,
          itemName: p.productName,
          productCode: p.sku,
          quantity: p.quantityOrdered,
          unitPrice: p.unitPrice, // PO Cost Price automatically becomes Invoice Selling Price!
          costPrice: p.unitPrice,
          discountType: 'percentage' as const,
          discountScope: 'per_unit' as const,
          discountValue: 0,
          discountAmount: 0,
          discount: 0,
          total: p.quantityOrdered * p.unitPrice,
        }));
        initialNotes = `Converted from Purchase Order #${convertFromPO.poNumber}`;
        initialSubTotal = initialInvoiceItems.reduce((sum, item) => sum + item.total, 0);
        initialTotalAmount = initialSubTotal;
      } else if (location.state?.convertFromQuotation) {
        const quot = location.state.convertFromQuotation;
        initialCustomer = typeof quot.customer === 'object' && quot.customer ? quot.customer : (quot.customerDetails || '');
        initialInvoiceItems = (quot.items || []).map((it: any, idx: number) => ({
          id: `inv-item-${Date.now()}-${idx}`,
          inventoryItemId: it.inventoryItemId || it.id,
          itemName: it.itemName || it.inventoryItem?.productName || 'Item',
          itemCode: it.productCode || it.inventoryItem?.productCode || '',
          productCode: it.productCode || it.inventoryItem?.productCode || '',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
          discountType: 'percentage' as const,
          discountScope: 'per_unit' as const,
          discountValue: 0,
          discountAmount: it.discount || 0,
          discount: it.discount || 0,
          total: it.total || ((it.quantity || 1) * (it.unitPrice || 0) - (it.discount || 0)),
        }));
        initialSubTotal = quot.subTotal || initialInvoiceItems.reduce((s: number, i: any) => s + i.total, 0);
        initialDiscount = quot.discount || 0;
        initialTotalAmount = quot.totalAmount || Math.max(0, initialSubTotal - initialDiscount);
        initialNotes = `Converted from Quotation #${quot.quotationNumber}`;
      }

      const subTotal = initialInvoiceItems.reduce((sum, item) => sum + item.total, 0);
      const creditDays = (typeof initialCustomer === 'object' && initialCustomer ? (initialCustomer as any).creditPeriod : null) || 30;
      const calcDueDate = new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const initialInvoiceData: InvoiceData = {
        ...getInitialInvoiceData(),
        invoiceNumber: nextId,
        customer: initialCustomer,
        customerDetails: typeof initialCustomer === 'object' && initialCustomer ? initialCustomer : undefined,
        items: initialInvoiceItems,
        subTotal: initialSubTotal || subTotal,
        discount: initialDiscount,
        totalDiscountType: convertFromOrder?.totalDiscountType || 'percentage',
        totalDiscountValue: convertFromOrder?.totalDiscountValue !== undefined ? Number(convertFromOrder.totalDiscountValue) : 0,
        discountPercentage: convertFromOrder?.totalDiscountType === 'percentage' ? (convertFromOrder.totalDiscountValue || 0) : 0,
        totalAmount: initialTotalAmount || subTotal,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.CREDIT,
        creditPeriod: creditDays,
        dueDate: calcDueDate,
        notes: initialNotes,
        salesman: initialSalesman,
        sourceOrderId: initialSourceOrderId,
        sourcePoId: initialSourcePoId,
      };
      setInvoiceData(initialInvoiceData);
      lastSavedRef.current = null;
      setIsDirty(initialInvoiceItems.length > 0);
      lastSavedAtRef.current = null;

      // Update paymentDetails
      setPaymentDetails(prev => ({
        ...prev,
        method: initialInvoiceData.paymentMethod
      }));

      if (initialInvoiceItems.length > 0) {
        setViewMode('edit');
        if (convertFromOrder) {
          setAlert({
            type: 'info',
            message: `Converted from Order #${convertFromOrder.orderNumber}: ${initialInvoiceItems.length} products loaded. Customer, quantities and discounts pre-filled. Review and save the invoice.`,
          });
        } else if (convertFromPO) {
          const salesmanNote = convertFromSalesman ? ` Salesman: ${convertFromSalesman.name}.` : '';
          setAlert({
            type: 'info',
            message: `Converted from PO #${convertFromPO?.poNumber}: ${initialInvoiceItems.length} products loaded with PO cost as selling price. Please select customer and payment details.${salesmanNote}`,
          });
        }
      }

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

  // Update paymentDetails when invoiceData changes
  useEffect(() => {
    setPaymentDetails(prev => ({
      ...prev,
      method: invoiceData.paymentMethod
    }));
  }, [invoiceData.paymentMethod]);

  // payment submission from invoice form
  const handlePaymentSubmit = async () => {
    if (!invoiceData.id) {
      setAlert({
        type: 'error',
        message: 'Please save the invoice first before recording payment'
      });
      return;
    }

    try {
      setIsProcessingPayment(true);

      // First get the next transaction ID
      const transactionId = await financeService.getNextId();
      const paymentMethod = paymentDetails.method || invoiceData.paymentMethod;
      const paymentData: FinancePaymentData = {
        transactionNumber: transactionId,
        transactionDate: new Date(paymentDetails.transactionDate).toISOString(),
        paymentMethod,
        bankName: paymentDetails.bankName || undefined,
        accountNumber: paymentDetails.accountNumber || undefined,
        transactionRef: paymentDetails.transactionRef || 'PAY-' + Date.now(),
        invoiceId: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: parseFloat(paymentDetails.amount),
      };

      // Create finance transaction
      await financeService.create(paymentData);
      await invoiceService.updatePaymentStatus(invoiceData.id, 'completed');
      setInvoiceData(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.COMPLETED
      }));

      setAlert({
        type: 'success',
        message: 'Payment successfully recorded for invoice ' + invoiceData.invoiceNumber
      });

      // Reset payment modal state
      setShowPaymentModal(false);
      setPaymentModalTriggeredByForm(false);
      setPaymentDetails({
        method: invoiceData.paymentMethod,
        bankName: "",
        accountNumber: "",
        transactionRef: "",
        amount: "",
        transactionDate: new Date().toISOString().split('T')[0]
      });

      if (viewMode === 'manage') {
        fetchAllInvoices();
      }

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message ||
        error?.message ||
        'Failed to process payment. Please try again.';
      setAlert({
        type: 'error',
        message: errorMessage
      });
      
      setInvoiceData(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.PENDING
      }));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // payment status change from invoice form
  const handlePaymentStatusChange = (status: typeof PaymentStatus[keyof typeof PaymentStatus], invoice: InvoiceData) => {
    if (status === PaymentStatus.COMPLETED && !paymentModalTriggeredByForm && !isProcessingPayment) {
      setPaymentDetails(prev => ({
        ...prev,
        method: invoice.paymentMethod, 
        amount: (invoice.totalAmount > 0 ? invoice.totalAmount : 0).toFixed(2)
      }));
      setShowPaymentModal(true);
      setPaymentModalTriggeredByForm(true);
    }
  };

  // payment completion from form
  const handlePaymentComplete = async () => {
    await handlePaymentSubmit();
  };

  const handleAddItem = (item: Omit<InvoiceItem, 'id' | 'total'> & { total?: number }) => {
    const calculatedDiscount = item.discountAmount || 0;
    const baseSubtotal = item.quantity * item.unitPrice;
    const total = item.total !== undefined ? item.total : Math.max(0, baseSubtotal - calculatedDiscount);

    const existingItemIndex = invoiceData.items.findIndex(
      existing => existing.inventoryItemId === item.inventoryItemId
    );

    let newItems;

    if (existingItemIndex !== -1) {
      newItems = [...invoiceData.items];
      const existingItem = newItems[existingItemIndex];
      const newQty = existingItem.quantity + item.quantity;
      let newDiscount = item.discountAmount || existingItem.discountAmount || 0;
      if (item.discountScope === 'per_unit' && item.discountValue) {
        if (item.discountType === 'percentage') {
          newDiscount = (newQty * item.unitPrice) * (Number(item.discountValue) / 100);
        } else {
          newDiscount = Math.min(item.unitPrice, Number(item.discountValue)) * newQty;
        }
      }
      const newTotal = Math.max(0, (newQty * item.unitPrice) - newDiscount);

      const updatedItem: InvoiceItem = {
        ...existingItem,
        ...item,
        quantity: newQty,
        discountAmount: newDiscount,
        total: newTotal
      };
      newItems[existingItemIndex] = updatedItem;
    } else {
      const newItem: InvoiceItem = {
        ...item,
        id: Date.now().toString(),
        total
      };
      newItems = [...invoiceData.items, newItem];
    }

    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discType = invoiceData.totalDiscountType || 'percentage';
    const discVal = invoiceData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = Math.max(0, subTotal - totalDiscount + taxAmount);

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount,
      vatAmount: taxAmount
    }));
    setIsDirty(true);
  };

  const handleCancelEdit = async () => {
    if (invoiceData.id) {
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
        title: "Clear Invoice",
        message: "Are you sure you want to clear this invoice? All unsaved changes will be lost.",
        confirmText: "Clear",
        type: "danger",
        onConfirm: async () => {
          await loadInitialData();
          setAlert({ type: 'success', message: 'Invoice cleared' });
        }
      });
    }
  };

  const handleSaveChanges = async () => {
    const saved = await handleSave();
    if (saved) {
      lastSavedRef.current = { ...invoiceData };
      setShowPreviewModal(true);
    }
  };

  const handleOpenPreview = () => {
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

  const prepareInvoiceForSave = (data: InvoiceData): BackendInvoiceData => {
    const formatDateToISO = (dateString: string): string => {
      if (!dateString) return new Date().toISOString();

      if (!dateString.includes('T')) {
        return new Date(dateString + 'T00:00:00.000Z').toISOString();
      }
      return dateString;
    };

    const backendData: BackendInvoiceData = {
      invoiceNumber: data.invoiceNumber,
      customerId: typeof data.customer === 'object' ? (data.customer as any)?.id || '' : data.customer,
      salesmanId: data.salesman?._id || data.salesman?.id || (data.customerDetails as any)?.salesRepId || null,
      salesmanName: data.salesman?.fullName || data.salesman?.name || (data.customerDetails as any)?.salesRepName || undefined,
      items: data.items.map(item => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountAmount || item.discount || 0,
        total: item.total
      })),
      subTotal: data.subTotal,
      discount: data.discount,
      totalAmount: data.totalAmount,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      issueDate: formatDateToISO(data.issueDate),
      dueDate: (() => {
        let d = data.dueDate;
        if (data.paymentMethod === PaymentMethod.CREDIT || data.paymentMethod === 'credit') {
          const issueTime = data.issueDate ? new Date(data.issueDate).getTime() : Date.now();
          const dueTime = d ? new Date(d).getTime() : 0;
          if (!d || dueTime <= issueTime) {
            const days = Number(data.creditPeriod) || 30;
            d = new Date(issueTime + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }
        }
        return formatDateToISO(d);
      })(),
      vehicleNumber: data.vehicleNumber,
      applyVat: data.applyVat,
      vatAmount: data.vatAmount,
      taxRate: data.taxRate,
    };

    // Add optional fields only if they exist
    if (data.notes && data.notes.trim()) {
      backendData.notes = data.notes;
    }

    if (data.sourceOrderId) {
      backendData.sourceOrderId = data.sourceOrderId;
    }

    if (data.sourcePoId) {
      backendData.sourcePoId = data.sourcePoId;
    }

    if (data.bankDepositDate && data.bankDepositDate.trim()) {
      backendData.bankDepositDate = formatDateToISO(data.bankDepositDate);
    }

    if (data.id) {
      backendData.id = data.id;
    }

    return backendData;
  };

  const handleRemoveItem = (id: string) => {
    const newItems = invoiceData.items.filter(item => item.id !== id);
    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discType = invoiceData.totalDiscountType || 'percentage';
    const discVal = invoiceData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = Math.max(0, subTotal - totalDiscount + taxAmount);

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount,
      vatAmount: taxAmount
    }));
    setIsDirty(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    const newItems = invoiceData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        const qty = updatedItem.quantity;
        const price = updatedItem.unitPrice;
        const discVal = Number(updatedItem.discountValue) || 0;
        const discType = updatedItem.discountType || 'percentage';
        const discScope = updatedItem.discountScope || 'per_unit';

        let discAmount = 0;
        if (discVal > 0 && price > 0) {
          if (discType === 'percentage') {
            const pct = Math.min(100, Math.max(0, discVal));
            if (discScope === 'per_unit') {
              discAmount = price * (pct / 100) * qty;
            } else {
              discAmount = (qty * price) * (pct / 100);
            }
          } else {
            if (discScope === 'per_unit') {
              discAmount = Math.min(price, discVal) * qty;
            } else {
              discAmount = Math.min(qty * price, discVal);
            }
          }
        }

        updatedItem.discountAmount = discAmount;
        updatedItem.total = updates.total !== undefined ? updates.total : Math.max(0, (qty * price) - discAmount);
        return updatedItem;
      }
      return item;
    });

    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discType = invoiceData.totalDiscountType || 'percentage';
    const discVal = invoiceData.totalDiscountValue || 0;
    let totalDiscount = 0;
    if (discVal > 0) {
      if (discType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discVal));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discVal);
      }
    }
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = Math.max(0, subTotal - totalDiscount + taxAmount);

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: totalDiscount,
      totalAmount,
      vatAmount: taxAmount
    }));
    setIsDirty(true);
  };

  const handleTotalDiscountChange = (discountType: 'percentage' | 'amount', discountValue: number) => {
    const subTotal = invoiceData.subTotal;
    let totalDiscount = 0;
    if (discountValue > 0) {
      if (discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, discountValue));
        totalDiscount = subTotal * (pct / 100);
      } else {
        totalDiscount = Math.min(subTotal, discountValue);
      }
    }
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = Math.max(0, subTotal - totalDiscount + taxAmount);

    setInvoiceData(prev => ({
      ...prev,
      totalDiscountType: discountType,
      totalDiscountValue: discountValue,
      discount: totalDiscount,
      discountPercentage: discountType === 'percentage' ? discountValue : (subTotal > 0 ? (totalDiscount / subTotal) * 100 : 0),
      vatAmount: taxAmount,
      totalAmount,
    }));
    setIsDirty(true);
  };

  const handleFieldChange = (field: keyof InvoiceData, value: string | number | boolean | Date) => {
    setInvoiceData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'applyVat') {
        const taxAmount = value ? prev.subTotal * prev.taxRate : 0;
        const totalAmount = Math.max(0, prev.subTotal - prev.discount + taxAmount);
        return {
          ...updated,
          vatAmount: taxAmount,
          totalAmount
        };
      }

      return updated;
    });
    setIsDirty(true);
  };

  const handleCustomerIdChange = (customerId: string, customerDetails?: any) => {
    setInvoiceData(prev => ({
      ...prev,
      customer: customerId,
      customerDetails: customerDetails
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!invoiceData.customer) {
      setAlert({
        type: 'error',
        message: 'Please select a customer before saving'
      });
      return false;
    }

    if (invoiceData.items.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please add at least one item before saving'
      });
      return false;
    }

    // Validate each line item discount against minimum price
    for (const item of invoiceData.items) {
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
      if (!lineCheck.isValid) {
        setAlert({
          type: 'error',
          message: lineCheck.error || `Discount for item "${item.itemName}" exceeds allowed minimum price floor.`
        });
        return false;
      }
    }

    // Validate overall document discount
    const overallCheck = validateOverallDiscount({
      items: invoiceData.items.map(it => {
        const inv = inventoryItems.find(i => i.id === it.inventoryItemId || i.productCode === it.productCode);
        return {
          productName: it.itemName,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          discountAmount: it.discountAmount,
          minPrice: resolveMinPrice(inv || { costPrice: (it as any).costPrice }),
        };
      }),
      totalDiscountType: invoiceData.totalDiscountType,
      totalDiscountValue: invoiceData.totalDiscountValue,
    });
    if (!overallCheck.isValid) {
      setAlert({
        type: 'error',
        message: overallCheck.error || 'Overall discount reduces invoice total below allowed minimum price floor.'
      });
      return false;
    }

    try {
      setIsSaving(true);

      const backendData = prepareInvoiceForSave(invoiceData);
      let response: InvoiceResponse;

      if (invoiceData.id) {
        setAlert({
          type: 'info',
          message: 'Updating invoice...'
        });

        response = await invoiceService.update(invoiceData.id, backendData);

        setAlert({
          type: 'success',
          message: 'Invoice updated successfully!'
        });
      } else {
        setAlert({
          type: 'info',
          message: 'Saving invoice...'
        });

        response = await invoiceService.create(backendData);

        setInvoiceData(prev => ({
          ...prev,
          id: response.id
        }));

        setAlert({
          type: 'success',
          message: 'Invoice saved successfully!'
        });
      }

      lastSavedRef.current = { ...invoiceData, id: response.id } as InvoiceData;
      setIsDirty(false);
      lastSavedAtRef.current = new Date().toISOString();

      return true;
    } catch (error: any) {
      let errorMessage = 'Failed to save invoice';
      if (error.response) {
        // Server responded with error
        if (error.response.status === 400) {
          errorMessage = 'Invalid data. Please check all fields are filled correctly.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again or contact support.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Failed to save invoice';
      }

      setAlert({
        type: 'error',
        message: errorMessage
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAllInvoices = async () => {
    try {
      setIsLoadingInvoices(true);

      // Fetch all invoices
      const invoices = await invoiceService.getAll();

      // Sort invoices
      const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.issueDate).getTime();
        const dateB = new Date(b.createdAt || b.issueDate).getTime();
        return dateB - dateA;
      });

      setAllInvoices(sortedInvoices);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load invoices'
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const getSalesmanDisplay = (invoice: InvoiceResponse): string => {
    if (!invoice) return '';
    return invoice.salesman?.fullName || invoice.salesmanName || '';
  };

  const getCustomerDisplay = (invoice: InvoiceResponse): string => {
    if (!invoice) return 'Unknown Customer';
    return invoice.customer?.shopName || invoice.customer?.fullName || 'Unknown Customer';
  };

  const handleLoadInvoice = async (invoiceData: InvoiceResponse) => {
    try {
      // Fetch full invoice details
      let fullInvoiceData = invoiceData;
      if (invoiceData.id) {
        try {
          const response = await invoiceService.getById(invoiceData.id);
          fullInvoiceData = response;
        } catch (fetchError) {
          // Use summary data if full fetch fails
        }
      }

      // Map items from backend response
      const mappedItems: InvoiceItem[] = fullInvoiceData.items.map((item, index) => {
        const itemData = item.inventoryItem;
        return {
          id: (Date.now() + index).toString(),
          inventoryItemId: item.inventoryItemId,
          itemName: item.itemName || itemData?.productName || 'Unknown Item',
          itemCode: item.itemCode || itemData?.productCode || '',
          discount: item.discount || 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        };
      });

      // Calculate discount percentage
      const discountPercentage = fullInvoiceData.subTotal > 0
        ? (fullInvoiceData.discount / fullInvoiceData.subTotal) * 100
        : 0;

      // Format dates for input (YYYY-MM-DD format)
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
      };

      // Get customer details if available
      const customerDetails = fullInvoiceData.customer ?? undefined;

      const loadedSalesman = fullInvoiceData.salesman
        ? { id: fullInvoiceData.salesman.id, fullName: fullInvoiceData.salesman.fullName, name: fullInvoiceData.salesman.fullName || '' }
        : fullInvoiceData.salesmanName
          ? { id: fullInvoiceData.salesmanId || '', fullName: fullInvoiceData.salesmanName, name: fullInvoiceData.salesmanName }
          : undefined;

      const loadedData: InvoiceData = {
        id: fullInvoiceData.id,
        invoiceNumber: fullInvoiceData.invoiceNumber,
        customer: fullInvoiceData.customer?.id || '',
        customerDetails: customerDetails,
        salesman: loadedSalesman,
        items: mappedItems,
        subTotal: fullInvoiceData.subTotal,
        discount: fullInvoiceData.discount,
        discountPercentage: discountPercentage,
        totalAmount: fullInvoiceData.totalAmount,
        paymentMethod: fullInvoiceData.paymentMethod,
        paymentStatus: fullInvoiceData.paymentStatus,
        bankDepositDate: fullInvoiceData.bankDepositDate ? formatDateForInput(fullInvoiceData.bankDepositDate) : undefined,
        issueDate: formatDateForInput(fullInvoiceData.issueDate),
        dueDate: formatDateForInput(fullInvoiceData.dueDate),
        vehicleNumber: fullInvoiceData.vehicleNumber || '',
        notes: fullInvoiceData.notes || '',
        sourceOrderId: fullInvoiceData.sourceOrderId || null,
        sourcePoId: fullInvoiceData.sourcePoId || null,
        applyVat: fullInvoiceData.applyVat ?? false,
        vatAmount: fullInvoiceData.vatAmount || 0,
        taxRate: fullInvoiceData.taxRate || 0,
        createdAt: fullInvoiceData.createdAt,
        updatedAt: fullInvoiceData.updatedAt
      };

      setInvoiceData(loadedData);

      lastSavedRef.current = loadedData;
      setIsDirty(false);
      lastSavedAtRef.current = new Date().toISOString();

      setViewMode('edit');

      setAlert({
        type: 'success',
        message: `Invoice ${fullInvoiceData.invoiceNumber} loaded successfully`
      });
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to load invoice data'
      });
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Invoice?",
      message: `Are you sure you want to delete Invoice "${invoiceNumber}"? This will permanently remove the invoice and any associated payment records. This action cannot be undone.`,
      confirmText: "Delete Invoice",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        try {
          await invoiceService.delete(id);
          setAlert({
            type: 'success',
            message: `Invoice ${invoiceNumber} deleted successfully`
          });
          fetchAllInvoices();
        } catch (error) {
          setAlert({
            type: 'error',
            message: error instanceof Error ? error.message : 'Failed to delete invoice'
          });
        }
      }
    });
  };

  // copy invoice link to clipboard
  const handleCopyInvoiceLink = (id: string, invoiceNumber: string) => {
    const invoiceLink = `${window.location.origin}/invoice/view/${id}`;

    navigator.clipboard.writeText(invoiceLink)
      .then(() => {
        setCopiedInvoiceId(id);
        setAlert({
          type: 'success',
          message: `Invoice ${invoiceNumber} link copied to clipboard!`
        });

        setTimeout(() => {
          setCopiedInvoiceId(null);
        }, 2000);
      })
      .catch(() => {
        setAlert({
          type: 'error',
          message: 'Failed to copy link to clipboard'
        });
      });
  };

  const handleOpenManageModal = () => {
    setViewMode('manage');
    setCurrentPage(1);
  };

  const handleShareInvoice = () => {
    setShowPreviewModal(true);
  };

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchAllInvoices();
    }
  }, [viewMode]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const filteredInvoices = manageSearch.trim()
    ? allInvoices.filter(q => {
      const idMatch = String(q.invoiceNumber).toLowerCase().includes(manageSearch.toLowerCase());
      const customerName = getCustomerDisplay(q);
      const customerMatch = customerName.toLowerCase().includes(manageSearch.toLowerCase());
      const salesmanName = getSalesmanDisplay(q);
      const salesmanMatch = salesmanName.toLowerCase().includes(manageSearch.toLowerCase());
      return idMatch || customerMatch || salesmanMatch;
    })
    : allInvoices;

  const filteredTotalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const currentInvoices = filteredInvoices.slice(startIndex, Math.min(endIndex, filteredInvoices.length));

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
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

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentModalTriggeredByForm(false);
            
            if (!isProcessingPayment && invoiceData.paymentStatus === PaymentStatus.COMPLETED) {
              setInvoiceData(prev => ({
                ...prev,
                paymentStatus: PaymentStatus.PENDING
              }));
            }
          }}
          selectedInvoice={{
            invoiceNumber: invoiceData.invoiceNumber,
            id: invoiceData.id || '',
            totalAmount: invoiceData.totalAmount,
            customer: invoiceData.customerDetails as InvoiceCustomer,
            paymentStatus: invoiceData.paymentStatus,
            paymentMethod: invoiceData.paymentMethod,
            bankDepositDate: invoiceData.bankDepositDate,
            issueDate: invoiceData.issueDate,
            dueDate: invoiceData.dueDate,
            vehicleNumber: invoiceData.vehicleNumber,
            notes: invoiceData.notes,
            items: invoiceData.items,
            subTotal: invoiceData.subTotal,
            discount: invoiceData.discount,
            payments: invoiceData.payments || [],
            paidAmount: invoiceData.paidAmount || 0,
            remainingAmount: invoiceData.remainingAmount ?? invoiceData.totalAmount,
            applyVat: invoiceData.applyVat,
            vatAmount: invoiceData.vatAmount,
            taxRate: invoiceData.taxRate,
            createdAt: invoiceData.createdAt || '',
            updatedAt: invoiceData.updatedAt || ''
          }}
          paymentDetails={paymentDetails}
          onPaymentDetailsChange={(details) => setPaymentDetails(prev => ({
            ...prev,
            ...details,
            bankName: details.bankName || '',
            accountNumber: details.accountNumber || '',
            transactionRef: details.transactionRef || '',
            amount: details.amount || '',
            transactionDate: details.transactionDate || prev.transactionDate,
          }))}
          onSubmit={handlePaymentSubmit}
          isProcessing={isProcessingPayment}
        />

        {/* Top Header Bar */}
        <div className="h-[68px] bg-[#1e293b]/90 backdrop-blur-xl border-b border-[#334155] flex items-center justify-between px-4 md:px-6 shadow-lg relative z-40 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {viewMode === 'manage' ? (
              <button onClick={() => setViewMode('edit')} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#334155] transition-colors cursor-pointer flex-shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#334155] transition-colors cursor-pointer flex-shrink-0 lg:hidden">
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[1.15rem] font-bold text-gray-100 leading-tight truncate tracking-tight">
                Invoice Management
              </h1>
              <div className="text-[0.8rem] text-gray-400 truncate mt-0.5">
                {viewMode === 'manage'
                  ? 'View Invoices'
                  : invoiceData.id
                    ? `Edit Invoice – ${invoiceData.invoiceNumber}`
                    : 'Create New Invoice'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
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
                    className="pl-9 pr-3 py-2 rounded-lg bg-[#0f172a] text-sm placeholder:text-gray-400 text-gray-200 border border-[#334155] focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-48 sm:w-56"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={() => setViewMode('edit')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>+ New Invoice</span>
                </button>
                <button
                  onClick={() => {
                    setShowReturnModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Return Invoice</span>
                </button>
              </>
            ) : (
              <>
                {(() => {
                  const isInvoiceSaved = Boolean(invoiceData.id);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenPreview}
                        disabled={!isInvoiceSaved || isLoading || isSaving}
                        className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title={!isInvoiceSaved ? "Please save invoice first" : "Preview Invoice"}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareInvoice}
                        disabled={!isInvoiceSaved || isLoading || isSaving}
                        className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title={!isInvoiceSaved ? "Please save invoice first" : "Share Invoice"}
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isLoading || isSaving}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{invoiceData.id ? 'Update' : 'Save'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  title="Clear invoice"
                  className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Clear</span>
                </button>

                <button
                  onClick={handleOpenManageModal}
                  title="Manage invoices"
                  className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] text-gray-300 hover:text-white hover:bg-[#334155] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Manage</span>
                </button>
              </>
            )}

            <div className="flex items-center gap-2.5 ml-1">
              <ThemeToggle />
              <UserProfileDropdown />
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'manage' ? (
            <div className="w-full overflow-auto p-4">
              <div className="bg-[#1e293b] rounded-lg w-full h-full flex flex-col border border-[#334155] shadow-2xl">
                <div className="flex-1 overflow-auto rounded-lg">
                  {isLoadingInvoices ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  ) : filteredInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <FileText className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No invoices found</p>
                      <p className="text-sm mt-2">Try a different search or create a new invoice</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#0f172a] text-gray-400 text-xs uppercase sticky top-0 z-10 border-b border-[#334155]">
                            <tr>
                              <th className="p-3">Invoice ID</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Sales Officer</th>
                              <th className="p-3 text-right">Invoice Total</th>
                              <th className="p-3 text-right">Remaining</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3">Date</th>
                              <th className="p-3 text-right w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#334155] text-sm">
                            {currentInvoices.map((inv) => {
                              const calc = getInvoiceCalculatedStatus(inv);
                              const salesmanName = getSalesmanDisplay(inv);

                              return (
                                <tr key={inv.id || inv.invoiceNumber} className="hover:bg-[#0f172a]/50 transition">
                                  <td className="p-3 font-mono font-bold text-blue-400 text-xs">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="p-3 font-medium text-white text-xs">
                                    {getCustomerDisplay(inv)}
                                  </td>
                                  <td className="p-3">
                                    {salesmanName ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium truncate max-w-[130px]">
                                        <UserCheck size={11} className="text-purple-400 shrink-0" />
                                        <span className="truncate">{salesmanName}</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-500 text-xs font-mono">—</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <PaymentBreakdownTooltip
                                      totalAmount={inv.totalAmount || 0}
                                      paidAmount={calc.paidAmount}
                                      remainingAmount={calc.remainingAmount}
                                      statusText={calc.status}
                                    >
                                      <span className="font-mono text-emerald-400 font-bold text-xs cursor-help underline decoration-emerald-500/30 underline-offset-2">
                                        {Math.round(inv.totalAmount || 0).toLocaleString()}/=
                                      </span>
                                    </PaymentBreakdownTooltip>
                                  </td>
                                  <td className="p-3 text-right">
                                    <PaymentBreakdownTooltip
                                      totalAmount={inv.totalAmount || 0}
                                      paidAmount={calc.paidAmount}
                                      remainingAmount={calc.remainingAmount}
                                      statusText={calc.status}
                                    >
                                      <span className={`font-mono font-bold text-xs cursor-help ${calc.remainingAmount > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                                        {Math.round(calc.remainingAmount).toLocaleString()}/=
                                      </span>
                                    </PaymentBreakdownTooltip>
                                  </td>
                                  <td className="p-3 text-center">
                                    <PaymentBreakdownTooltip
                                      totalAmount={inv.totalAmount || 0}
                                      paidAmount={calc.paidAmount}
                                      remainingAmount={calc.remainingAmount}
                                      statusText={calc.status}
                                    >
                                      {calc.status === 'paid' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                          <CheckCircle className="w-3 h-3" /> Paid
                                        </span>
                                      )}
                                      {calc.status === 'partially_paid' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                          <Clock className="w-3 h-3" /> Partially Paid
                                        </span>
                                      )}
                                      {calc.status === 'overdue' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                          <XCircle className="w-3 h-3" /> Overdue
                                        </span>
                                      )}
                                      {calc.status === 'due_soon' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                          <Clock className="w-3 h-3" /> Due Soon
                                        </span>
                                      )}
                                      {calc.status === 'outstanding' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                          Outstanding
                                        </span>
                                      )}
                                    </PaymentBreakdownTooltip>
                                  </td>
                                  <td className="p-3 text-gray-400 text-xs font-mono">
                                    {formatDate(inv.issueDate)}
                                  </td>
                                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                     <div className="flex justify-end">
                                       <ActionMenu
                                         title="Actions"
                                         items={[
                                           {
                                             items: [
                                               {
                                                 label: 'Preview & PDF',
                                                 icon: <Eye size={13} />,
                                                 variant: 'blue',
                                                 onClick: () => {
                                                   handleLoadInvoice(inv);
                                                   setShowPreviewModal(true);
                                                 },
                                               },
                                               {
                                                 label: isInvoiceEditable(inv.paymentStatus, inv.status) ? 'Edit Invoice' : 'View Invoice',
                                                 icon: <Edit size={13} />,
                                                 variant: 'purple',
                                                 onClick: () => {
                                                   handleLoadInvoice(inv);
                                                 },
                                               },
                                               {
                                                 label: 'Share on WhatsApp',
                                                 icon: <MessageCircle size={13} />,
                                                 variant: 'emerald',
                                                 onClick: () => {
                                                   handleLoadInvoice(inv);
                                                   setShowPreviewModal(true);
                                                 },
                                               },
                                               {
                                                 label: 'Return Invoice',
                                                 icon: <RotateCcw size={13} />,
                                                 variant: 'amber',
                                                 onClick: () => {
                                                   handleLoadInvoice(inv);
                                                   setShowReturnModal(true);
                                                 },
                                               },
                                             ],
                                           },
                                           {
                                             items: [
                                               {
                                                 label: copiedInvoiceId === inv.id ? 'Copied!' : 'Copy Link',
                                                 icon: copiedInvoiceId === inv.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />,
                                                 variant: 'default',
                                                 onClick: () => {
                                                   handleCopyInvoiceLink(inv.id || '', inv.invoiceNumber);
                                                 },
                                               },
                                               {
                                                 label: 'Delete Invoice',
                                                 icon: <Trash2 size={13} />,
                                                 variant: 'danger',
                                                 onClick: () => {
                                                   handleDeleteInvoice(inv.id || '', inv.invoiceNumber);
                                                 },
                                               },
                                             ],
                                           },
                                         ]}
                                       />
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
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#334155] p-4">
                          <div className="text-sm text-gray-400">Showing {startIndex + 1} to {Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices</div>
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
            <div className="flex-1 overflow-y-auto bg-[#0f172a] p-4 sm:p-6">
              <div className="w-full space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <ErrorBoundary>
                    <InvoiceForm
                      invoiceData={invoiceData}
                      onFieldChange={handleFieldChange}
                      onCustomerIdChange={handleCustomerIdChange}
                      onAddItem={handleAddItem}
                      onRemoveItem={handleRemoveItem}
                      onUpdateItem={handleUpdateItem}
                      onTotalDiscountChange={handleTotalDiscountChange}
                      inventoryItems={inventoryItems}
                      onPaymentStatusChange={handlePaymentStatusChange}
                      onPaymentComplete={handlePaymentComplete}
                      isProcessingPayment={isProcessingPayment}
                    />
                  </ErrorBoundary>
                )}

                {/* Form Footer Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e293b] p-4 rounded-xl border border-[#334155] shadow-lg sticky bottom-4 z-20">
                  <div className="text-xs text-gray-400">
                    {invoiceData.items.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <span>Items: <strong className="text-white">{invoiceData.items.length}</strong></span>
                        <span className="text-gray-600">•</span>
                        <span>Total: <span className="text-emerald-400 font-mono font-bold text-sm">LKR {Math.round(invoiceData.totalAmount).toLocaleString()}/=</span></span>
                      </div>
                    ) : (
                      <span>Add products to generate invoice</span>
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

                    {(() => {
                      const isInvoiceSaved = Boolean(invoiceData.id);
                      return (
                        <>
                          <button
                            type="button"
                            onClick={handleShareInvoice}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Share Invoice"}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Download PDF via Preview"}
                          >
                            <Download className="w-4 h-4" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Print Invoice via Preview"}
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Preview Invoice"}
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
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{invoiceData.id ? 'Update Invoice' : 'Save Invoice'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Preview Modal */}
        <InvoiceViewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          invoiceData={invoiceData}
          onShareSuccess={(msg) => setAlert({ type: 'success', message: msg })}
          onReturnInvoice={() => {
            setShowPreviewModal(false);
            setShowReturnModal(true);
          }}
        />

        <CreateReturnModal
          isOpen={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          invoice={invoiceData.id ? (invoiceData as any) : null}
          onSuccess={() => {
            setAlert({ type: 'success', message: 'Return processed successfully.' });
            fetchAllInvoices();
          }}
        />
      </div>
    </div>
  );
};

export default Invoice;
