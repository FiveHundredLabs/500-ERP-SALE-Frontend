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
  UserCheck,
  MoreVertical
} from "lucide-react";
import { mockSystemUsers } from "../data/mockSystemUsers";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceViewModal from "../components/invoice/InvoiceViewModal";
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
  const [allInvoices, setAllInvoices] = useState<BackendInvoiceData[]>([]);
  const [allCustomers, setAllCustomers] = useState<InvoiceCustomer[]>([]);
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
  const [activeInvoiceMenuId, setActiveInvoiceMenuId] = useState<string | null>(null);
  const invoiceMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (invoiceMenuRef.current && !invoiceMenuRef.current.contains(e.target as Node)) {
        setActiveInvoiceMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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


  const getInitialInvoiceData = (): InvoiceData => ({
    invoiceId: "",
    customer: "",
    customerDetails: undefined,
    items: [],
    subTotal: 0,
    discount: 0,
    discountPercentage: 0,
    totalDiscountType: 'percentage',
    totalDiscountValue: 0,
    totalAmount: 0,
    paymentStatus: PaymentStatus.COMPLETED,
    paymentMethod: PaymentMethod.CASH,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    vehicleNumber: "",
    notes: "",
    applyVat: false,
    vatAmount: 0,
    taxRate: 0,
  });

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialInvoiceData());


  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const items = await inventoryService.getAll();
      setInventoryItems(items as InvoiceInventoryItem[]);

      const nextId = await invoiceService.getNextId();

      const convertFromPO = location.state?.convertFromPO as PurchaseOrder | undefined;
      // salesman can be explicitly passed in location.state, e.g. from an order conversion
      const convertFromSalesman = location.state?.salesman as { _id: string; name: string } | undefined;

      let initialInvoiceItems: InvoiceItem[] = [];
      let initialNotes = "";

      if (convertFromPO && convertFromPO.items && convertFromPO.items.length > 0) {
        initialInvoiceItems = convertFromPO.items.map((p, idx) => ({
          id: `inv-item-${Date.now()}-${idx}`,
          item: p.sku || p.id || `item-${idx}`,
          itemName: p.productName,
          product_code: p.sku,
          quantity: p.quantity,
          unitPrice: p.unitPrice, // PO Cost Price automatically becomes Invoice Selling Price!
          costPrice: p.unitPrice,
          discountType: 'percentage',
          discountScope: 'per_unit',
          discountValue: 0,
          discountAmount: 0,
          total: p.quantity * p.unitPrice,
        }));
        initialNotes = `Converted from Purchase Order #${convertFromPO.poNumber}`;
      }

      const subTotal = initialInvoiceItems.reduce((sum, item) => sum + item.total, 0);

      const initialInvoiceData: InvoiceData = {
        ...getInitialInvoiceData(),
        invoiceId: nextId,
        items: initialInvoiceItems,
        subTotal,
        totalAmount: subTotal,
        notes: initialNotes,
        salesman: convertFromSalesman || null,
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
        const salesmanNote = convertFromSalesman ? ` Salesman: ${convertFromSalesman.name}.` : '';
        setAlert({
          type: 'info',
          message: `Converted from PO #${convertFromPO?.poNumber}: ${initialInvoiceItems.length} products loaded with PO cost as selling price. Please select customer and payment details.${salesmanNote}`,
        });
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
    if (!invoiceData._id) {
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
        transactionId: transactionId,
        transactionDate: new Date(paymentDetails.transactionDate).toISOString(),
        paymentMethod: {
          type: paymentMethod,
          bankName: paymentDetails.bankName || 'N/A',
          accountNumber: paymentDetails.accountNumber || 'N/A',
          transactionRef: paymentDetails.transactionRef || 'PAY-' + Date.now(),
        },
        invoice: {
          invoiceId: invoiceData.invoiceId,
        },
        amount: 'LKR ' + parseFloat(paymentDetails.amount).toFixed(2),
      };

      // Create finance transaction
      await financeService.create(paymentData);
      await invoiceService.updatePaymentStatus(invoiceData._id, 'Completed');
      setInvoiceData(prev => ({
        ...prev,
        paymentStatus: PaymentStatus.COMPLETED
      }));

      setAlert({
        type: 'success',
        message: 'Payment successfully recorded for invoice ' + invoiceData.invoiceId
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
      existing => existing.item === item.item
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
    if (invoiceData._id) {
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
      invoiceId: data.invoiceId,
      customer: data.customer,
      salesman: data.salesman?._id || null,
      items: data.items.map(item => ({
        item: item.item,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subTotal: data.subTotal,
      discount: data.discount,
      totalAmount: data.totalAmount,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      issueDate: formatDateToISO(data.issueDate),
      dueDate: formatDateToISO(data.dueDate),
      vehicleNumber: data.vehicleNumber,
      applyVat: data.applyVat,
      vatAmount: data.vatAmount,
      taxRate: data.taxRate,
    };

    // Add optional fields only if they exist
    if (data.notes && data.notes.trim()) {
      backendData.notes = data.notes;
    }

    if (data.bankDepositDate && data.bankDepositDate.trim()) {
      backendData.bankDepositDate = formatDateToISO(data.bankDepositDate);
    }

    if (data._id) {
      backendData._id = data._id;
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

    try {
      setIsSaving(true);

      const backendData = prepareInvoiceForSave(invoiceData);
      let response: InvoiceResponse;

      if (invoiceData._id) {
        setAlert({
          type: 'info',
          message: 'Updating invoice...'
        });

        response = await invoiceService.update(invoiceData._id, backendData);

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
          _id: response._id
        }));

        setAlert({
          type: 'success',
          message: 'Invoice saved successfully!'
        });
      }

      lastSavedRef.current = { ...invoiceData, _id: response._id } as InvoiceData;
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

      // Fetch all customers
      try {
        const customers = await invoiceService.getAllCustomers();
        setAllCustomers(customers);
      } catch (customerError) {
        // Silent fail for customer fetch
      }

      // Fetch all invoices
      const invoices = await invoiceService.getAll();

      // Sort invoices
      const sortedInvoices = [...invoices].sort((a, b) => {
        const dateA = new Date(a.created_at || a.issueDate).getTime();
        const dateB = new Date(b.created_at || b.issueDate).getTime();
        return dateB - dateA;
      });

      // Map invoices with customer & salesman details
      const normalized = sortedInvoices.map((invoice: any) => {
        let customer = invoice.customer;
        let customerName = '';

        if (typeof customer === 'object' && customer !== null) {
          customerName = customer.fullName || customer.name || '';
        } else if (typeof customer === 'string') {
          const foundCustomer = allCustomers.find(c => c._id === customer);
          if (foundCustomer) {
            customerName = foundCustomer.fullName || '';
          }
        }

        let salesmanName = '';
        if (invoice.salesman) {
          if (typeof invoice.salesman === 'object') {
            salesmanName = invoice.salesman.name || invoice.salesman.fullName || '';
          } else if (typeof invoice.salesman === 'string') {
            const foundUser = mockSystemUsers.find(u => u._id === invoice.salesman || u.fullName === invoice.salesman);
            salesmanName = foundUser ? foundUser.fullName : invoice.salesman;
          }
        }
        if (!salesmanName && invoice.salesmanName) {
          salesmanName = invoice.salesmanName;
        }

        return {
          _id: invoice._id,
          invoiceId: invoice.invoiceId,
          customer: customer,
          customerName: customerName,
          salesman: invoice.salesman || null,
          salesmanName: salesmanName,
          items: invoice.items.map((item: any) => ({
            item: item.item?._id || item.item || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })),
          subTotal: invoice.subTotal,
          discount: invoice.discount,
          totalAmount: invoice.totalAmount,
          paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod,
          bankDepositDate: invoice.bankDepositDate,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          vehicleNumber: invoice.vehicleNumber,
          notes: invoice.notes,
          applyVat: invoice.applyVat ?? true,
          vatAmount: invoice.vatAmount || 0,
          taxRate: invoice.taxRate || 0.18,
          created_at: invoice.created_at,
          updated_at: invoice.updated_at
        } as BackendInvoiceData & { customerName: string; salesmanName?: string };
      });

      setAllInvoices(normalized);
    } catch (error) {
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to load invoices'
      });
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const getSalesmanDisplay = (invoice: any): string => {
    if (!invoice) return '';
    if (invoice.salesmanName) return invoice.salesmanName;
    if (typeof invoice.salesman === 'object' && invoice.salesman !== null) {
      return invoice.salesman.name || invoice.salesman.fullName || '';
    }
    if (typeof invoice.salesman === 'string' && invoice.salesman.trim()) {
      const foundUser = mockSystemUsers.find(u => u._id === invoice.salesman || u.fullName === invoice.salesman);
      return foundUser ? foundUser.fullName : invoice.salesman;
    }
    return '';
  };

  const getCustomerDisplay = (invoice: any): string => {
    if (!invoice) return 'Unknown Customer';

    if (invoice.customerName) {
      return invoice.customerName;
    }

    if (typeof invoice.customer === 'object' && invoice.customer !== null) {
      return invoice.customer.fullName || invoice.customer.name || 'Unknown Customer';
    }

    if (typeof invoice.customer === 'string' && allCustomers.length > 0) {
      const foundCustomer = allCustomers.find(c => c._id === invoice.customer);
      if (foundCustomer) {
        return foundCustomer.fullName || 'Unknown Customer';
      }
    }

    return 'Unknown Customer';
  };

  const handleLoadInvoice = async (invoiceData: any) => {
    try {
      // Fetch full invoice details
      let fullInvoiceData = invoiceData;
      if (invoiceData._id) {
        try {
          const response = await invoiceService.getById(invoiceData._id);
          fullInvoiceData = response as any;
        } catch (fetchError) {
          // Use summary data if full fetch fails
        }
      }

      // Map items from backend response
      const mappedItems: InvoiceItem[] = fullInvoiceData.items.map((item: any, index: number) => {
        const itemData = item.item;
        return {
          id: (Date.now() + index).toString(),
          item: itemData?._id || item.item || '',
          itemName: itemData?.product_name || 'Unknown Item',
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
      let customerDetails = undefined;
      if (typeof fullInvoiceData.customer === 'object' && fullInvoiceData.customer !== null) {
        customerDetails = fullInvoiceData.customer;
      } else if (typeof fullInvoiceData.customer === 'string') {
        const foundCustomer = allCustomers.find(c => c._id === fullInvoiceData.customer);
        if (foundCustomer) {
          customerDetails = foundCustomer;
        }
      }

      let loadedSalesman = undefined;
      if (fullInvoiceData.salesman) {
        if (typeof fullInvoiceData.salesman === 'object') {
          loadedSalesman = {
            _id: fullInvoiceData.salesman._id || fullInvoiceData.salesman.id || '',
            name: fullInvoiceData.salesman.name || fullInvoiceData.salesman.fullName || ''
          };
        } else if (typeof fullInvoiceData.salesman === 'string') {
          const found = mockSystemUsers.find(u => u._id === fullInvoiceData.salesman || u.fullName === fullInvoiceData.salesman);
          loadedSalesman = {
            _id: fullInvoiceData.salesman,
            name: found ? found.fullName : fullInvoiceData.salesman
          };
        }
      }

      const loadedData: InvoiceData = {
        _id: fullInvoiceData._id,
        invoiceId: fullInvoiceData.invoiceId,
        customer: typeof fullInvoiceData.customer === 'object'
          ? (fullInvoiceData.customer as any)?._id || ''
          : fullInvoiceData.customer || '',
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
        applyVat: fullInvoiceData.applyVat ?? true,
        vatAmount: fullInvoiceData.vatAmount || 0,
        taxRate: fullInvoiceData.taxRate || 0.18,
        created_at: fullInvoiceData.created_at,
        updated_at: fullInvoiceData.updated_at
      };

      setInvoiceData(loadedData);

      lastSavedRef.current = loadedData;
      setIsDirty(false);
      lastSavedAtRef.current = new Date().toISOString();

      setViewMode('edit');

      setAlert({
        type: 'success',
        message: `Invoice ${fullInvoiceData.invoiceId} loaded successfully`
      });
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to load invoice data'
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Invoice",
      message: `Are you sure you want to delete invoice ${invoiceNumber}? This action cannot be undone.`,
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        try {
          await invoiceService.delete(invoiceId);
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
  const handleCopyInvoiceLink = (invoiceId: string, invoiceNumber: string) => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceId}`;

    navigator.clipboard.writeText(invoiceLink)
      .then(() => {
        setCopiedInvoiceId(invoiceId);
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
      const idMatch = String(q.invoiceId).toLowerCase().includes(manageSearch.toLowerCase());
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
            invoiceId: invoiceData.invoiceId,
            _id: invoiceData._id || '',
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
            created_at: invoiceData.created_at || '',
            updated_at: invoiceData.updated_at || ''
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
                  : invoiceData._id
                    ? `Edit Invoice – ${invoiceData.invoiceId}`
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
              </>
            ) : (
              <>
                {(() => {
                  const isInvoiceSaved = Boolean(invoiceData._id);
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
                      <span>Save</span>
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
                              const isMenuOpen = activeInvoiceMenuId === (inv._id || inv.invoiceId);
                              const salesmanName = getSalesmanDisplay(inv);

                              return (
                                <tr key={inv._id || inv.invoiceId} className="hover:bg-[#0f172a]/50 transition">
                                  <td className="p-3 font-mono font-bold text-blue-400 text-xs">
                                    {inv.invoiceId}
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
                                      {calc.status === 'Paid' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                          <CheckCircle className="w-3 h-3" /> Paid
                                        </span>
                                      )}
                                      {calc.status === 'Partially Paid' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                          <Clock className="w-3 h-3" /> Partially Paid
                                        </span>
                                      )}
                                      {calc.status === 'Overdue' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                          <XCircle className="w-3 h-3" /> Overdue
                                        </span>
                                      )}
                                      {calc.status === 'Due Soon' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                          <Clock className="w-3 h-3" /> Due Soon
                                        </span>
                                      )}
                                      {calc.status === 'Outstanding' && (
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
                                    <div className="relative flex justify-end">
                                      <button
                                        onClick={() => setActiveInvoiceMenuId(isMenuOpen ? null : (inv._id || inv.invoiceId))}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                        title="Actions"
                                      >
                                        <MoreVertical size={16} />
                                      </button>

                                      {isMenuOpen && (
                                        <div 
                                          ref={invoiceMenuRef}
                                          className="absolute right-0 top-8 z-50 w-48 bg-[#0b132b] border border-slate-700/90 rounded-xl shadow-2xl py-1 text-xs text-slate-200 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100"
                                        >
                                          <div className="p-1">
                                            <button
                                              onClick={() => {
                                                setActiveInvoiceMenuId(null);
                                                handleLoadInvoice(inv);
                                                setShowPreviewModal(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-600/20 text-slate-200 hover:text-blue-300 transition text-left"
                                            >
                                              <Eye size={13} className="text-blue-400" />
                                              <span>Preview & PDF</span>
                                            </button>

                                            <button
                                              onClick={() => {
                                                setActiveInvoiceMenuId(null);
                                                handleLoadInvoice(inv);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-600/20 text-slate-200 hover:text-purple-300 transition text-left"
                                            >
                                              <Edit size={13} className="text-purple-400" />
                                              <span>Edit Invoice</span>
                                            </button>

                                            <button
                                              onClick={() => {
                                                setActiveInvoiceMenuId(null);
                                                handleLoadInvoice(inv);
                                                setShowPreviewModal(true);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 transition text-left"
                                            >
                                              <MessageCircle size={13} className="text-emerald-400" />
                                              <span>Share on WhatsApp</span>
                                            </button>
                                          </div>

                                          <div className="p-1">
                                            <button
                                              onClick={() => {
                                                setActiveInvoiceMenuId(null);
                                                handleCopyInvoiceLink(inv._id || '', inv.invoiceId);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition text-left"
                                            >
                                              {copiedInvoiceId === inv._id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                              <span>Copy Link</span>
                                            </button>

                                            <button
                                              onClick={() => {
                                                setActiveInvoiceMenuId(null);
                                                handleDeleteInvoice(inv._id || '', inv.invoiceId);
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition text-left"
                                            >
                                              <Trash2 size={13} className="text-red-400" />
                                              <span>Delete Invoice</span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
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
                      const isInvoiceSaved = Boolean(invoiceData._id);
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
                          <span>Save Invoice</span>
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
        />
      </div>
    </div>
  );
};

export default Invoice;