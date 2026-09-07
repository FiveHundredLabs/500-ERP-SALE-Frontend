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
  Plus,
  RotateCcw,
  MessageCircle,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceViewModal from "../components/invoice/InvoiceViewModal";
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
import { quotationService } from "../services/QuotationService";
import { orderService } from "../services/OrderService";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";
import CustomConfirm from "../components/CustomConfirm";
import { useLocation } from "react-router-dom";
import type { PurchaseOrder } from "../types/purchaseOrders";

const Invoice: React.FC = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InvoiceInventoryItem[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<InvoiceData | null>(null);
  const lastSavedAtRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<'edit' | 'manage'>('manage');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [allInvoices, setAllInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Filter and pagination states matching Orders page
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortColumn, setSortColumn] = useState('issueDate');
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

  const handleNewInvoice = async () => {
    try {
      setIsLoading(true);
      const nextId = await invoiceService.getNextId();
      const freshData: InvoiceData = {
        ...getInitialInvoiceData(),
        invoiceNumber: nextId,
      };
      setInvoiceData(freshData);
      lastSavedRef.current = null;
      setIsDirty(false);
      lastSavedAtRef.current = null;
      setIsCreateDrawerOpen(true);
    } catch {
      setInvoiceData(getInitialInvoiceData());
      setIsCreateDrawerOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

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

      const [items, nextId, allCustomers] = await Promise.all([
        inventoryService.getAll(),
        invoiceService.getNextId(),
        quotationService.getAllCustomers().catch(() => []),
      ]);
      setInventoryItems(items as InvoiceInventoryItem[]);

      const convertFromPO = location.state?.convertFromPO as PurchaseOrder | undefined;
      // salesman can be explicitly passed in location.state, e.g. from an order conversion
      const convertFromSalesman = location.state?.salesman as { id: string; name: string } | undefined;
      // convertFromOrder: direct Order → Invoice conversion
      const convertFromOrder = location.state?.convertFromOrder as import('../types/orders').Order | undefined;

      let resolvedSourceOrder: any = convertFromOrder || convertFromPO?.sourceOrder || null;
      const orderIdToFetch = resolvedSourceOrder?.id || convertFromPO?.sourceOrderId || (convertFromPO?.sourceOrder as any)?.id;
      if (orderIdToFetch && (!resolvedSourceOrder || !resolvedSourceOrder.items || resolvedSourceOrder.items.length === 0)) {
        try {
          const fullOrder = await orderService.getById(orderIdToFetch);
          if (fullOrder) {
            resolvedSourceOrder = fullOrder;
          }
        } catch {
          // fall back
        }
      }

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
          initialSourceOrderId = convertFromOrder?.id || convertFromPO.sourceOrderId || resolvedSourceOrder?.id || null;
        }
      }

      if (convertFromOrder && !convertFromPO && convertFromOrder.items && convertFromOrder.items.length > 0) {
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
          const discVal = p.discountValue !== undefined && p.discountValue !== null ? Number(p.discountValue) : (Number(p.discount) || 0);

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

          const normalizedScope = (discScope === 'total' || discScope === 'total_qty') ? 'total_qty' : 'per_unit';

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
        const orderDiscountVal = convertFromOrder.totalDiscountValue !== undefined && convertFromOrder.totalDiscountValue !== null
          ? Number(convertFromOrder.totalDiscountValue)
          : (Number(convertFromOrder.totalDiscount) || 0);
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
        const orderItems = resolvedSourceOrder?.items || [];
        initialInvoiceItems = convertFromPO.items.map((p, idx) => {
          const matchedOrderItem = orderItems.find(
            (oi: any) =>
              (oi.inventoryItemId && p.inventoryItemId && oi.inventoryItemId === p.inventoryItemId) ||
              (oi.sku && p.sku && oi.sku.trim().toLowerCase() === p.sku.trim().toLowerCase()) ||
              (oi.productName && p.productName && oi.productName.trim().toLowerCase() === p.productName.trim().toLowerCase())
          ) || (orderItems.length === convertFromPO.items.length ? orderItems[idx] : undefined);

          const qty = p.quantityOrdered || (p as any).quantity || 1;
          const unitPrice = matchedOrderItem?.unitPrice !== undefined ? Number(matchedOrderItem.unitPrice) : ((p as any).sellingPrice || p.unitPrice || 0);
          const discType = (matchedOrderItem?.discountType || 'percentage') as 'percentage' | 'amount';
          const rawScope = matchedOrderItem?.discountScope || 'per_unit';
          const discScope = (rawScope === 'total' || rawScope === 'total_qty') ? 'total_qty' : 'per_unit';
          const discVal = matchedOrderItem?.discountValue !== undefined && matchedOrderItem?.discountValue !== null
            ? Number(matchedOrderItem.discountValue)
            : (Number(matchedOrderItem?.discount) || 0);

          let calculatedDiscountAmount = 0;
          if (discVal > 0 && unitPrice > 0 && qty > 0) {
            if (discType === 'percentage') {
              const pct = Math.min(100, Math.max(0, discVal));
              calculatedDiscountAmount = discScope === 'per_unit'
                ? unitPrice * (pct / 100) * qty
                : (unitPrice * qty) * (pct / 100);
            } else {
              calculatedDiscountAmount = discScope === 'per_unit'
                ? Math.min(unitPrice, discVal) * qty
                : Math.min(unitPrice * qty, discVal);
            }
          }

          const lineTotal = matchedOrderItem?.total !== undefined && matchedOrderItem?.quantity === qty
            ? Number(matchedOrderItem.total)
            : Math.max(0, (qty * unitPrice) - calculatedDiscountAmount);

          return {
            id: `inv-item-${Date.now()}-${idx}`,
            inventoryItemId: p.inventoryItemId || p.id,
            itemName: p.productName,
            itemCode: p.sku,
            productCode: p.sku,
            quantity: qty,
            unitPrice: unitPrice,
            costPrice: p.unitPrice,
            discountType: discType,
            discountScope: discScope,
            discountValue: discVal,
            discountAmount: calculatedDiscountAmount,
            discount: calculatedDiscountAmount,
            total: lineTotal,
          };
        });

        const itemsSubtotal = initialInvoiceItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
        const lineDiscountTotal = initialInvoiceItems.reduce((s, i) => s + (i.discountAmount || 0), 0);
        const subTotalAfterLineDiscounts = Math.max(0, itemsSubtotal - lineDiscountTotal);

        let orderDiscount = 0;
        const orderDiscountType = (resolvedSourceOrder?.totalDiscountType || 'percentage') as 'percentage' | 'amount';
        const orderDiscountVal = resolvedSourceOrder?.totalDiscountValue !== undefined && resolvedSourceOrder?.totalDiscountValue !== null
          ? Number(resolvedSourceOrder.totalDiscountValue)
          : (Number(resolvedSourceOrder?.totalDiscount) || 0);

        if (orderDiscountVal > 0) {
          if (orderDiscountType === 'percentage') {
            orderDiscount = subTotalAfterLineDiscounts * (Math.min(100, orderDiscountVal) / 100);
          } else {
            orderDiscount = Math.min(subTotalAfterLineDiscounts, orderDiscountVal);
          }
        }

        initialNotes = `Converted from Purchase Order #${convertFromPO.poNumber}`;
        initialSubTotal = subTotalAfterLineDiscounts;
        initialDiscount = orderDiscount;
        initialTotalAmount = Math.max(0, subTotalAfterLineDiscounts - orderDiscount);

        // Auto-fill customer and salesman from source order or PO
        const linkedOrder = resolvedSourceOrder;
        if (linkedOrder && (linkedOrder.customerId || linkedOrder.customerName)) {
          const matched = allCustomers.find((c: any) => c.id === linkedOrder.customerId) ||
            allCustomers.find((c: any) => c.fullName?.toLowerCase() === linkedOrder.customerName?.toLowerCase() || c.shopName?.toLowerCase() === linkedOrder.customerName?.toLowerCase());
          if (matched) {
            initialCustomer = matched;
          } else {
            initialCustomer = {
              id: linkedOrder.customerId || '',
              customerCode: linkedOrder.customerId || '',
              shopName: linkedOrder.customerName || '',
              fullName: linkedOrder.customerName || '',
              contactPerson: linkedOrder.contactPerson || '',
              phone: linkedOrder.contactPhone || '',
              address: (linkedOrder as any).customerAddress || '',
              city: (linkedOrder as any).customerCity || '',
            };
          }

          if (!initialSalesman && (linkedOrder.salesmanId || (linkedOrder as any).salesmanName)) {
            initialSalesman = {
              id: linkedOrder.salesmanId || (linkedOrder as any).salesman?.id || '',
              name: (linkedOrder as any).salesmanName || (linkedOrder as any).salesman?.fullName || '',
            };
          }
        } else if (convertFromPO.customerName) {
          const matched = allCustomers.find((c: any) => 
            c.fullName?.toLowerCase() === convertFromPO.customerName?.toLowerCase() || 
            c.shopName?.toLowerCase() === convertFromPO.customerName?.toLowerCase()
          );
          if (matched) {
            initialCustomer = matched;
          }
        }

        if (!initialSalesman && typeof initialCustomer === 'object' && initialCustomer) {
          const repId = (initialCustomer as any).salesRepId;
          const repName = (initialCustomer as any).salesRepName;
          if (repId || repName) {
            initialSalesman = {
              id: repId || '',
              name: repName || '',
            };
          }
        }
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
        totalDiscountType: (resolvedSourceOrder?.totalDiscountType || convertFromOrder?.totalDiscountType || 'percentage') as any,
        totalDiscountValue: resolvedSourceOrder?.totalDiscountValue !== undefined && resolvedSourceOrder?.totalDiscountValue !== null
          ? Number(resolvedSourceOrder.totalDiscountValue)
          : (convertFromOrder?.totalDiscountValue !== undefined && convertFromOrder?.totalDiscountValue !== null
              ? Number(convertFromOrder.totalDiscountValue)
              : (Number(resolvedSourceOrder?.totalDiscount) || Number(convertFromOrder?.totalDiscount) || 0)),
        discountPercentage: (resolvedSourceOrder?.totalDiscountType || convertFromOrder?.totalDiscountType) === 'percentage'
          ? Number(resolvedSourceOrder?.totalDiscountValue ?? convertFromOrder?.totalDiscountValue ?? resolvedSourceOrder?.totalDiscount ?? convertFromOrder?.totalDiscount ?? 0)
          : 0,
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
        setIsCreateDrawerOpen(true);
        setViewMode('edit');
        if (convertFromOrder) {
          setAlert({
            type: 'info',
            message: `Converted from Order #${convertFromOrder.orderNumber}: ${initialInvoiceItems.length} products loaded. Customer, quantities and discounts pre-filled. Review and save the invoice.`,
          });
        } else if (convertFromPO) {
          const custName = typeof initialCustomer === 'object' && initialCustomer ? (initialCustomer.fullName || initialCustomer.shopName) : '';
          const custNote = custName ? ` Customer: ${custName} pre-filled.` : ' Please select customer.';
          const salesmanNote = initialSalesman ? ` Salesman: ${initialSalesman.name}.` : '';
          setAlert({
            type: 'info',
            message: `Converted from PO #${convertFromPO?.poNumber}: ${initialInvoiceItems.length} products loaded.${custNote}${salesmanNote}`,
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
    fetchAllInvoices();
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
        transactionType: 'payment',
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
          setIsCreateDrawerOpen(false);
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
      fetchAllInvoices();
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
        discountType: item.discountType,
        discountScope: item.discountScope,
        discountValue: item.discountValue,
        discountAmount: item.discountAmount,
        total: item.total
      })),
      totalDiscountType: data.totalDiscountType,
      totalDiscountValue: data.totalDiscountValue,
      subTotal: data.subTotal,
      discount: data.discount,
      totalAmount: data.totalAmount,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      issueDate: formatDateToISO(data.issueDate),
      dueDate: (() => {
        let d = data.dueDate;
        if ((data.paymentMethod as any) === PaymentMethod.CREDIT || (data.paymentMethod as any) === 'credit') {
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
        updatedItem.discount = discAmount;
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

  const handleSave = async (skipPriceWarning = false): Promise<boolean> => {
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

    if (!invoiceData.salesman?.id && !invoiceData.salesmanName) {
      setAlert({
        type: 'error',
        message: 'Please select a Sales Officer (Sales Ref) before saving'
      });
      return false;
    }

    // Check line item discounts & overall discount for below-cost warnings
    if (!skipPriceWarning) {
      const priceWarnings: string[] = [];
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
        if (!lineCheck.isValid && lineCheck.error) {
          priceWarnings.push(lineCheck.error);
        }
      }

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
      if (!overallCheck.isValid && overallCheck.error) {
        priceWarnings.push(overallCheck.error);
      }

      if (priceWarnings.length > 0) {
        setConfirmConfig({
          isOpen: true,
          title: 'Price Below Cost Warning',
          message: `The following item(s) are priced below cost / minimum allowed price:\n\n${priceWarnings.map(w => '• ' + w).join('\n')}\n\nDo you want to proceed and save this invoice anyway?`,
          confirmText: 'Proceed & Save',
          cancelText: 'Review Invoice',
          type: 'warning',
          onConfirm: async () => {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            const saved = await handleSave(true);
            if (saved) {
              lastSavedRef.current = { ...invoiceData };
              fetchAllInvoices();
              setShowPreviewModal(true);
            }
          }
        });
        return false;
      }
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
      setIsCreateDrawerOpen(false);
      setViewMode('manage');
      fetchAllInvoices();

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

  const handleLoadInvoice = async (invoiceData: InvoiceResponse, switchToEdit: boolean = false) => {
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
          discountType: item.discountType,
          discountScope: item.discountScope,
          discountValue: item.discountValue !== undefined ? item.discountValue : item.discount,
          discountAmount: item.discountAmount !== undefined ? item.discountAmount : item.discount,
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
        totalDiscountType: (fullInvoiceData as any).totalDiscountType || 'percentage',
        totalDiscountValue: (fullInvoiceData as any).totalDiscountValue !== undefined ? (fullInvoiceData as any).totalDiscountValue : (fullInvoiceData.discount || 0),
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

      if (switchToEdit) {
        lastSavedRef.current = loadedData;
        setIsDirty(false);
        lastSavedAtRef.current = new Date().toISOString();
        setIsCreateDrawerOpen(true);
        setViewMode('edit');

        setAlert({
          type: 'success',
          message: `Invoice ${fullInvoiceData.invoiceNumber} loaded successfully`
        });
      }
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
      message: `Are you sure you want to delete Invoice "${invoiceNumber}"? This will permanently remove the invoice, any associated returns, and payment records. This action cannot be undone.`,
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


  const handleShareInvoice = () => {
    setShowPreviewModal(true);
  };

  useEffect(() => {
    if (viewMode === 'manage') {
      fetchAllInvoices();
    }
  }, [viewMode]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(val);

  const salesmenOptions = useMemo(() => {
    const names = Array.from(new Set(allInvoices.map((inv) => getSalesmanDisplay(inv)).filter(Boolean))) as string[];
    return names.map((name) => ({ value: name, label: name }));
  }, [allInvoices]);

  const statusOptions = [
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'due_soon', label: 'Due Soon' },
    { value: 'outstanding', label: 'Outstanding' },
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

    allInvoices.forEach(inv => {
      const name = getCustomerDisplay(inv);
      if (name && name !== 'Unknown Customer' && !seenCustomers.has(name)) {
        seenCustomers.add(name);
        suggestions.push({
          id: `cust-${inv.customer?.id || name}`,
          title: name,
          subtitle: inv.customer?.city || inv.customer?.phone || '',
          category: 'Customer',
          value: name,
        });
      }
    });

    return suggestions;
  }, [allInvoices]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const custName = getCustomerDisplay(inv).toLowerCase();
      const invNum = (inv.invoiceNumber || '').toLowerCase();
      const smName = getSalesmanDisplay(inv).toLowerCase();
      const matchesSearch = q === '' || custName.includes(q) || invNum.includes(q) || smName.includes(q);

      const calc = getInvoiceCalculatedStatus(inv);
      const matchesStatus = statusFilter === '' || calc.status === statusFilter || (inv as any).status === statusFilter;
      const matchesPayment = paymentFilter === '' || (inv.paymentMethod || '').toLowerCase() === paymentFilter.toLowerCase();
      const matchesSalesman = salesmanFilter === '' || getSalesmanDisplay(inv) === salesmanFilter;

      const issueDate = inv.issueDate ? String(inv.issueDate).split('T')[0] : '';
      const matchesDateFrom = dateFrom === '' || issueDate >= dateFrom;
      const matchesDateTo = dateTo === '' || issueDate <= dateTo;

      return matchesSearch && matchesStatus && matchesPayment && matchesSalesman && matchesDateFrom && matchesDateTo;
    });
  }, [allInvoices, searchQuery, statusFilter, paymentFilter, salesmanFilter, dateFrom, dateTo]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: any = (a as any)[sortColumn];
      let valB: any = (b as any)[sortColumn];
      if (sortColumn === 'customer') {
        valA = getCustomerDisplay(a);
        valB = getCustomerDisplay(b);
      } else if (sortColumn === 'salesman') {
        valA = getSalesmanDisplay(a);
        valB = getSalesmanDisplay(b);
      } else if (sortColumn === 'status') {
        valA = getInvoiceCalculatedStatus(a).status;
        valB = getInvoiceCalculatedStatus(b).status;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedInvoices.slice(start, start + itemsPerPage);
  }, [sortedInvoices, currentPage]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
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
    const headers = ['Invoice ID', 'Date', 'Customer', 'Salesman', 'Items', 'Total Amount', 'Paid Amount', 'Remaining', 'Status'];
    const rows = sortedInvoices.map((inv) => {
      const calc = getInvoiceCalculatedStatus(inv);
      const custName = getCustomerDisplay(inv);
      const smName = getSalesmanDisplay(inv);
      return [
        inv.invoiceNumber,
        inv.issueDate ? String(inv.issueDate).split('T')[0] : '',
        `"${custName}"`,
        `"${smName || 'Unassigned'}"`,
        inv.items?.length || 0,
        inv.totalAmount || 0,
        calc.paidAmount,
        calc.remainingAmount,
        calc.status,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<InvoiceResponse>[] = [
    {
      key: 'invoiceNumber',
      header: 'INVOICE ID',
      sortable: true,
      minWidth: '110px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleLoadInvoice(row, false);
            setShowPreviewModal(true);
          }}
          className="font-mono text-blue-400 hover:text-blue-300 font-bold text-xs hover:underline cursor-pointer text-left"
          title="Preview Invoice"
        >
          {row.invoiceNumber}
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
        const area = (row.salesman as any)?.area || 'All Regions';
        return (
          <div>
            <p className="text-xs font-semibold text-gray-300">{salesmanName || '—'}</p>
            {salesmanName && <p className="text-[11px] text-gray-400">{area}</p>}
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
      render: (row) => {
        const calc = getInvoiceCalculatedStatus(row);
        return (
          <PaymentBreakdownTooltip
            totalAmount={row.totalAmount || 0}
            paidAmount={calc.paidAmount}
            remainingAmount={calc.remainingAmount}
            statusText={calc.status}
          >
            <span className="font-bold text-white text-sm font-mono cursor-help">
              {formatCurrency(row.totalAmount)}
            </span>
          </PaymentBreakdownTooltip>
        );
      },
    },
    {
      key: 'status',
      header: 'STATUS',
      sortable: true,
      minWidth: '110px',
      render: (row) => {
        const calc = getInvoiceCalculatedStatus(row);
        return (
          <PaymentBreakdownTooltip
            totalAmount={row.totalAmount || 0}
            paidAmount={calc.paidAmount}
            remainingAmount={calc.remainingAmount}
            statusText={calc.status}
          >
            <span className="cursor-help">
              <StatusBadge status={calc.status} />
            </span>
          </PaymentBreakdownTooltip>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      minWidth: '160px',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={async () => {
              await handleLoadInvoice(row, false);
              setShowPreviewModal(true);
            }}
            className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageCircle size={15} />
          </button>

          {isInvoiceEditable(row.paymentStatus, (row as any).status) ? (
            <button
              type="button"
              onClick={() => handleLoadInvoice(row, true)}
              className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
              title="Edit Invoice"
            >
              <Edit size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="p-1.5 text-gray-600 rounded-lg inline-flex items-center gap-1 text-xs cursor-not-allowed opacity-40"
              title="Invoice cannot be edited"
            >
              <Edit size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={async () => {
              await handleLoadInvoice(row, false);
              setShowPreviewModal(true);
            }}
            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Preview & PDF"
          >
            <Eye size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleCopyInvoiceLink(row.id, row.invoiceNumber)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title={copiedInvoiceId === row.id ? "Link Copied!" : "Copy Link"}
          >
            {copiedInvoiceId === row.id ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>

          <button
            type="button"
            onClick={async () => {
              await handleLoadInvoice(row, false);
              setShowReturnModal(true);
            }}
            className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Return Invoice"
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            onClick={() => handleDeleteInvoice(row.id, row.invoiceNumber)}
            className="p-1.5 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs cursor-pointer"
            title="Delete Invoice"
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
        headerTitle="Invoice Management"
        headerSubtitle="Invoices and customer billing"
      >
        {alert && (
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            duration={3000}
          />
        )}

        <PageHeader
          title="Customer Invoices"
          description="Manage and review customer invoices, payments, and billing."
          breadcrumbs={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Sales' },
            { label: 'Invoices' },
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
                onClick={() => setShowReturnModal(true)}
                className="px-4 py-2 border border-amber-500/30 bg-amber-600/10 hover:bg-amber-600/20 text-amber-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw size={15} /> Return Invoice
              </button>
              <button
                type="button"
                onClick={handleNewInvoice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                <Plus size={15} /> New Invoice
              </button>
            </div>
          }
        />

        <div className="bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-lg overflow-hidden">
          <FilterBar
            searchPlaceholder="Search invoice ID, customer name..."
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
              data={paginatedInvoices}
              loading={isLoadingInvoices}
              keyExtractor={(item) => item.id || item.invoiceNumber}
              onRowClick={(item) => {
                handleLoadInvoice(item, false);
                setShowPreviewModal(true);
              }}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              emptyMessage="No invoices found matching the criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedInvoices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </AppLayout>

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

        {/* Slide-in Drawer for New/Edit Invoice */}
        {isCreateDrawerOpen && (
          <div className="fixed inset-0 z-[900] flex items-start justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleCloseDrawer}
            />

            {/* Slide-in panel - 70% width on md+ screens */}
            <div className="relative w-full md:w-[70vw] lg:w-[70vw] xl:w-[70vw] max-w-none h-screen bg-[#0f172a] border-l border-[#334155] shadow-2xl flex flex-col overflow-hidden animate-slideIn">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#1e293b]/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {invoiceData.id ? `Edit Invoice — ${invoiceData.invoiceNumber}` : 'Create New Invoice'}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {invoiceData.id ? 'Modify products, quantities, and discounts for this invoice' : 'Fill in the details below to generate a new sales invoice'}
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

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto bg-[#0f172a] p-4 sm:p-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
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
                      title="Clear invoice"
                      className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Clear</span>
                    </button>

                    {(() => {
                      const isInvoiceSaved = Boolean(invoiceData.id);
                      return (
                        <>
                          <button
                            type="button"
                            onClick={handleShareInvoice}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Share Invoice"}
                          >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Download PDF via Preview"}
                          >
                            <Download className="w-4 h-4" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title={!isInvoiceSaved ? "Please save invoice first" : "Print Invoice via Preview"}
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenPreview}
                            disabled={!isInvoiceSaved || isLoading || isSaving}
                            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition shadow-md cursor-pointer"
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
          </div>
        )}

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

        {/* Custom Confirm Modal */}
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
    </>
  );
};

export default Invoice;
