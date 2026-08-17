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
} from "lucide-react";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceCanvas from "../components/InvoiceCanvas";
import PaymentModal from "../components/PaymentModal";
import type {
  InvoiceData,
  InvoiceItem,
  BackendInvoiceData,
  InvoiceCustomer,
  InvoiceResponse
} from "../types/invoice";
import type { InventoryItem as InvoiceInventoryItem } from "../types/inventory";
import { PaymentStatus, PaymentMethod, type PaymentMethodType } from "../types/invoice";
import { invoiceService } from "../services/InvoiceService";
import { financeService } from "../services/FinanceService";
import type { FinancePaymentData } from "../types/finance";
import { inventoryService } from "../services/InventoryService";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import CustomAlert from "../components/CustomAlert";
import type { AlertType } from "../components/CustomAlert";
import ErrorBoundary from "../components/ErrorBoundary";
import CustomConfirm from "../components/CustomConfirm";
import UserProfileDropdown from "../components/UserProfileDropdown";

const Invoice: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [activePanel, setActivePanel] = useState<'form' | 'preview'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InvoiceInventoryItem[]>([]);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

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

  // Add state for share dropdown
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  const getInitialInvoiceData = (): InvoiceData => ({
    invoiceId: "",
    customer: "",
    customerDetails: undefined,
    items: [],
    subTotal: 0,
    discount: 0,
    discountPercentage: 0,
    totalAmount: 0,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CASH,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vehicleNumber: "",
    notes: "",
    applyVat: true,
    vatAmount: 0,
    taxRate: 0.18,
  });

  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialInvoiceData());

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobileView(width < 1024);
      if (width < 1024) {
        setActivePanel('form');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const calculateInitialScale = () => {
      if (rightPanelRef.current && !isMobileView) {
        const panelWidth = rightPanelRef.current.clientWidth;
        const panelHeight = rightPanelRef.current.clientHeight;
        const a4Width = 210 * 3.78;
        const a4Height = 297 * 3.78;

        const availableWidth = panelWidth - (isMobileView ? 24 : 48);
        const availableHeight = panelHeight - (isMobileView ? 100 : 120);

        const widthScale = availableWidth / a4Width;
        const heightScale = availableHeight / a4Height;

        const calculatedScale = Math.min(widthScale, heightScale);
        setScale(Math.max(calculatedScale, isMobileView ? 0.3 : 0.5));
      }
    };

    calculateInitialScale();
    const resizeObserver = new ResizeObserver(calculateInitialScale);
    if (rightPanelRef.current) {
      resizeObserver.observe(rightPanelRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [isMobileView]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      const items = await inventoryService.getAll();
      setInventoryItems(items as InvoiceInventoryItem[]);

      const nextId = await invoiceService.getNextId();
      const initialInvoiceData = {
        ...getInitialInvoiceData(),
        invoiceId: nextId
      };
      setInvoiceData(initialInvoiceData);
      lastSavedRef.current = null;
      setIsDirty(false);
      lastSavedAtRef.current = null;

      // Update paymentDetails
      setPaymentDetails(prev => ({
        ...prev,
        method: initialInvoiceData.paymentMethod
      }));

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

  const handleAddItem = (item: Omit<InvoiceItem, 'id' | 'total'>) => {
    const total = item.quantity * item.unitPrice;

    const existingItemIndex = invoiceData.items.findIndex(
      existing => existing.item === item.item
    );

    let newItems;

    if (existingItemIndex !== -1) {
      newItems = [...invoiceData.items];
      const existingItem = newItems[existingItemIndex];
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + item.quantity,
        total: (existingItem.quantity + item.quantity) * existingItem.unitPrice
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
    const discountAmount = subTotal * (invoiceData.discountPercentage / 100);
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = subTotal + taxAmount - discountAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
      totalAmount: totalAmount > 0 ? totalAmount : 0,
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
    }
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
    const discountAmount = subTotal * (invoiceData.discountPercentage / 100);
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = subTotal + taxAmount - discountAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
      totalAmount: totalAmount > 0 ? totalAmount : 0,
      vatAmount: taxAmount
    }));
    setIsDirty(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    const newItems = invoiceData.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    });

    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subTotal * (invoiceData.discountPercentage / 100);
    const taxAmount = invoiceData.applyVat ? subTotal * invoiceData.taxRate : 0;
    const totalAmount = subTotal + taxAmount - discountAmount;

    setInvoiceData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
      totalAmount: totalAmount > 0 ? totalAmount : 0,
      vatAmount: taxAmount
    }));
    setIsDirty(true);
  };

  const handleFieldChange = (field: keyof InvoiceData, value: string | number | boolean | Date) => {
    setInvoiceData(prev => {
      const updated = { ...prev, [field]: value };

      if (field === 'discountPercentage') {
        const discountAmount = prev.subTotal * (Number(value) / 100);
        const taxAmount = prev.applyVat ? prev.subTotal * prev.taxRate : 0;
        const totalAmount = prev.subTotal + taxAmount - discountAmount;
        return {
          ...updated,
          discount: discountAmount,
          totalAmount: totalAmount > 0 ? totalAmount : 0,
          vatAmount: taxAmount
        };
      }

      if (field === 'applyVat') {
        const taxAmount = value ? prev.subTotal * prev.taxRate : 0;
        const totalAmount = prev.subTotal + taxAmount - prev.discount;
        return {
          ...updated,
          vatAmount: taxAmount,
          totalAmount: totalAmount > 0 ? totalAmount : 0
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

    if (!invoiceData.vehicleNumber || invoiceData.vehicleNumber.trim() === '') {
      setAlert({
        type: 'error',
        message: 'Please enter a vehicle number'
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

      // Map invoices with customer details
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

        return {
          _id: invoice._id,
          invoiceId: invoice.invoiceId,
          customer: customer,
          customerName: customerName,
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
        } as BackendInvoiceData & { customerName: string };
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

      const loadedData: InvoiceData = {
        _id: fullInvoiceData._id,
        invoiceId: fullInvoiceData.invoiceId,
        customer: typeof fullInvoiceData.customer === 'object'
          ? (fullInvoiceData.customer as any)?._id || ''
          : fullInvoiceData.customer || '',
        customerDetails: customerDetails,
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
      setActivePanel('form');

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

  // Handle share invoice link
  const handleShareInvoice = async () => {
    if (!invoiceData._id) {
      setAlert({
        type: 'error',
        message: 'Please save the invoice first before sharing'
      });
      return;
    }

    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    
    // copy the link to clipboard automatically
    try {
      await navigator.clipboard.writeText(invoiceLink);
    } catch (err) {
      // Silent fail for clipboard copy
    }

    // using Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceData.invoiceId}`,
          text: `Check out Invoice ${invoiceData.invoiceId}`,
          url: invoiceLink,
        });
        setAlert({
          type: 'success',
          message: 'Link also copied to clipboard.'
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setShowShareDropdown(true);
        } else {
          setAlert({
            type: 'info',
            message: 'Invoice link copied to clipboard!'
          });
        }
      }
    } else {
      // Web Share API not supported
      setShowShareDropdown(true);
      setAlert({
        type: 'success',
        message: 'Invoice link copied to clipboard! Select sharing option below.'
      });
    }
  };

  // Share via apps
  const shareViaWhatsApp = () => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    const shareText = `Invoice ${invoiceData.invoiceId} - View online: ${invoiceLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaEmail = () => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    const subject = `Invoice ${invoiceData.invoiceId}`;
    const body = `Please find the invoice here: ${invoiceLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaMessenger = () => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(invoiceLink)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.origin)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaSMS = () => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    const shareText = `Invoice ${invoiceData.invoiceId}: ${invoiceLink}`;
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaTelegram = () => {
    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
    const shareText = `Invoice ${invoiceData.invoiceId} - View online: ${invoiceLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(invoiceLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
  };

  const handleOpenManageModal = () => {
    setViewMode('manage');
    setCurrentPage(1);
    fetchAllInvoices();
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
      return idMatch || customerMatch;
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

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { cls: string; icon?: React.ReactNode }> = {
      'Pending': { cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: <Clock className="w-3 h-3 mr-1" /> },
      'Completed': { cls: 'bg-green-500/10 text-green-400 border-green-500/20', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      'Rejected': { cls: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <XCircle className="w-3 h-3 mr-1" /> },
    };
    return colors[status] || colors['Pending'];
  };

  const downloadPDF = async () => {
    if (!invoiceRef.current) {
      setAlert({
        type: 'error',
        message: "Invoice content not available for PDF generation."
      });
      return;
    }

    const proceedWithDownload = async () => {
      try {
        setIsGeneratingPDF(true);
        setAlert({
          type: 'info',
          message: 'Generating PDF... Please wait.'
        });

        const invoiceContainer = invoiceRef.current!;

        const originalTransform = invoiceContainer.style.transform;
        const originalTransformOrigin = invoiceContainer.style.transformOrigin;
        const originalWidth = invoiceContainer.style.width;
        const originalHeight = invoiceContainer.style.height;

        invoiceContainer.style.transform = 'none';
        invoiceContainer.style.transformOrigin = 'top left';
        invoiceContainer.style.width = '210mm';
        invoiceContainer.style.height = '297mm';
        invoiceContainer.style.position = 'fixed';
        invoiceContainer.style.left = '0';
        invoiceContainer.style.top = '0';
        invoiceContainer.style.zIndex = '9999';

        void invoiceContainer.offsetHeight;

        const images = invoiceContainer.getElementsByTagName('img');
        const imageLoadPromises = Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });

        await Promise.all(imageLoadPromises);

        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(invoiceContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          onclone: (clonedDoc: Document) => {
            const clonedContainer = clonedDoc.querySelector('[data-invoice-container]');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'none';
              (clonedContainer as HTMLElement).style.transformOrigin = 'top left';
              (clonedContainer as HTMLElement).style.width = '210mm';
              (clonedContainer as HTMLElement).style.height = '297mm';
            }
          }
        });

        invoiceContainer.style.transform = originalTransform;
        invoiceContainer.style.transformOrigin = originalTransformOrigin;
        invoiceContainer.style.width = originalWidth;
        invoiceContainer.style.height = originalHeight;
        invoiceContainer.style.position = '';
        invoiceContainer.style.left = '';
        invoiceContainer.style.top = '';
        invoiceContainer.style.zIndex = '';

        const jpegData = canvas.toDataURL('image/jpeg', 1.0);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = 210;
        const pdfHeight = 297;

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        const finalHeight = imgHeight > pdfHeight ? pdfHeight : imgHeight;

        const xPos = 0;
        const yPos = 0;

        pdf.addImage(jpegData, 'JPEG', xPos, yPos, imgWidth, finalHeight);
        pdf.save(`invoice-${invoiceData.invoiceId}.pdf`);

        setAlert({
          type: 'success',
          message: 'PDF downloaded successfully!'
        });
      } catch (error) {
        setAlert({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
        });
      } finally {
        setIsGeneratingPDF(false);
      }
    };

    if (!invoiceData._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Save Invoice",
        message: "This invoice has not been saved yet. Do you want to save it now and then download?",
        confirmText: "Save & Download",
        onConfirm: async () => {
          const saved = await handleSave();
          if (saved) {
            await proceedWithDownload();
          }
        }
      });
      return;
    }

    await proceedWithDownload();
  };

  const handlePrint = async () => {
    if (!invoiceRef.current) return;

    const proceedWithPrint = async () => {
      try {
        setIsGeneratingPDF(true);
        setAlert({
          type: 'info',
          message: 'Preparing print... Please wait.'
        });

        const canvas = await html2canvas(invoiceRef.current!, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          onclone: (clonedDoc: Document) => {
            const clonedContainer = clonedDoc.querySelector('[data-invoice-container]');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'none';
              (clonedContainer as HTMLElement).style.transformOrigin = 'top left';
              (clonedContainer as HTMLElement).style.width = '210mm';
              (clonedContainer as HTMLElement).style.height = '297mm';
            }
          }
        });

        const imageData = canvas.toDataURL('image/png', 1.0);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          setAlert({
            type: 'error',
            message: "Popup blocked! Please allow popups for this site to print."
          });
          setIsGeneratingPDF(false);
          return;
        }

        const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoiceData.invoiceId}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              
              body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 297mm;
              }
              
              .print-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              
              .invoice-image {
                width: 210mm;
                height: 297mm;
                object-fit: contain;
              }
              
              @media print {
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                .print-container {
                  page-break-inside: avoid;
                  page-break-after: avoid;
                }
                
                .invoice-image {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <img src="${imageData}" alt="Invoice ${invoiceData.invoiceId}" class="invoice-image" />
            </div>
            <script>
              // Wait for image to load then print
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  // Close window after print dialog closes
                  setTimeout(function() {
                    window.close();
                  }, 1000);
                }, 500);
              };
              
              // Fallback if window.onload doesn't fire
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 2000);
            </script>
          </body>
        </html>
      `;

        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();

        printWindow.focus();

        setIsGeneratingPDF(false);

      } catch (error) {
        setAlert({
          type: 'error',
          message: 'Failed to prepare print. Please try again.'
        });
        setIsGeneratingPDF(false);
      }
    };

    if (!invoiceData._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Save Invoice",
        message: "This invoice has not been saved yet. Do you want to save it now and then print?",
        confirmText: "Save & Print",
        onConfirm: async () => {
          const saved = await handleSave();
          if (saved) {
            await proceedWithPrint();
          }
        }
      });
      return;
    }

    await proceedWithPrint();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showShareDropdown && !(event.target as Element).closest('.share-dropdown-container')) {
        setShowShareDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareDropdown]);

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
          onPaymentDetailsChange={setPaymentDetails}
          onSubmit={handlePaymentSubmit}
          isProcessing={isProcessingPayment}
        />

        {/* Share Dropdown */}
        {showShareDropdown && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e293b] rounded-lg p-4 w-64 share-dropdown-container">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Share Invoice</h3>
                <button
                  onClick={() => setShowShareDropdown(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={shareViaWhatsApp}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">WA</span>
                  </div>
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={shareViaEmail}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">@</span>
                  </div>
                  <span>Email</span>
                </button>
                <button
                  onClick={shareViaMessenger}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 transition"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">f</span>
                  </div>
                  <span>Messenger</span>
                </button>
                <button
                  onClick={shareViaSMS}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-500 transition"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">SMS</span>
                  </div>
                  <span>SMS</span>
                </button>
                <button
                  onClick={shareViaTelegram}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-400/20 hover:bg-blue-400/30 text-blue-300 transition"
                >
                  <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">TG</span>
                  </div>
                  <span>Telegram</span>
                </button>
                <button
                  onClick={() => {
                    const invoiceLink = `${window.location.origin}/invoice/view/${invoiceData._id}`;
                    navigator.clipboard.writeText(invoiceLink);
                    setAlert({
                      type: 'success',
                      message: 'Invoice link copied to clipboard again!'
                    });
                    setShowShareDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 transition"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <Copy className="w-4 h-4 text-white" />
                  </div>
                  <span>Copy Link Again</span>
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-400 text-center">
                Link is already copied to clipboard
              </div>
            </div>
          </div>
        )}

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
              <h1 className="text-lg md:text-xl font-semibold text-gray-200">Invoice Management</h1>
              <div className="text-sm text-gray-400">
                {viewMode === 'manage'
                  ? 'View Invoices'
                  : invoiceData._id
                    ? `Edit Invoice – ${invoiceData.invoiceId}`
                    : 'Create New Invoice'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {viewMode === "manage" && (
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
            )}

            {viewMode === "edit" && (
              <button
                onClick={handleOpenManageModal}
                title="Manage invoices"
                className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-md text-sm"
              >
                <List className="w-4 h-4" />
                <span>Manage Invoices</span>
              </button>
            )}

            <div className="flex items-center gap-4">
              <UserProfileDropdown />
            </div>
          </div>
        </div>

        {viewMode === 'edit' && isMobileView && (
          <div className="flex border-b border-[#334155] bg-[#1e293b]">
            <button
              onClick={() => setActivePanel('form')}
              className={`flex-1 py-3 text-center font-medium ${activePanel === 'form' ? 'bg-[#0f172a] text-blue-400' : 'text-gray-300 hover:text-white'}`}
            >
              Form
            </button>
            <button
              onClick={() => setActivePanel('preview')}
              className={`flex-1 py-3 text-center font-medium ${activePanel === 'preview' ? 'bg-[#0f172a] text-blue-400' : 'text-gray-300 hover:text-white'}`}
            >
              Preview
            </button>
          </div>
        )}

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
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">

                          <thead className="sticky top-0 z-10">
                            <tr className="bg-[#0b1220] border-b border-[#243244]">
                              <th className="text-left px-4 py-3 font-semibold text-gray-300">
                                Invoice ID
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-300">
                                Customer
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-300">
                                Issue Date
                              </th>
                              <th className="text-left px-4 py-3 font-semibold text-gray-300">
                                Status
                              </th>
                              <th className="text-right px-4 py-3 font-semibold text-gray-300">
                                Total
                              </th>
                              <th className="text-center px-4 py-3 font-semibold text-gray-300">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {currentInvoices.map((invoice, idx) => {
                              const stripe =
                                idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#08121d]';

                              const badge = getStatusBadge(invoice.paymentStatus);
                              const customerDisplay = getCustomerDisplay(invoice);

                              return (
                                <tr
                                  key={invoice._id}
                                  className={`${stripe} border-b border-[#162235] hover:bg-[#0b2a3a]/60 transition-colors`}
                                >
                                  {/* Invoice ID */}
                                  <td className="px-4 py-3 font-medium text-gray-200">
                                    {invoice.invoiceId}
                                  </td>

                                  {/* Customer */}
                                  <td
                                    className="px-4 py-3 text-gray-300 truncate max-w-[260px]"
                                    title={customerDisplay}
                                  >
                                    {customerDisplay}
                                  </td>

                                  {/* Date */}
                                  <td className="px-4 py-3 text-gray-400">
                                    {formatDate(invoice.issueDate)}
                                  </td>

                                  {/* Status */}
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.cls}`}
                                    >
                                      {badge.icon}
                                      {invoice.paymentStatus}
                                    </span>
                                  </td>

                                  {/* Amount */}
                                  <td className="px-4 py-3 text-right font-semibold text-green-400">
                                    LKR {invoice.totalAmount.toFixed(2)}
                                  </td>

                                  {/* Actions - Copy button */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleLoadInvoice(invoice)}
                                        title="View"
                                        className="p-2 rounded-md text-blue-400 hover:bg-blue-500/20 transition"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleLoadInvoice(invoice)}
                                        title="Edit"
                                        className="p-2 rounded-md text-green-400 hover:bg-green-500/20 transition"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleCopyInvoiceLink(invoice._id!, invoice.invoiceId)}
                                        title="Copy Invoice Link"
                                        className={`p-2 rounded-md transition ${copiedInvoiceId === invoice._id 
                                          ? 'text-green-400 bg-green-500/20' 
                                          : 'text-purple-400 hover:bg-purple-500/20'}`}
                                      >
                                        {copiedInvoiceId === invoice._id ? (
                                          <Check className="w-4 h-4" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (invoice._id && invoice.invoiceId) {
                                            handleDeleteInvoice(invoice._id, invoice.invoiceId);
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
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#334155]">
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
            <>
              {/* Left Panel - Form */}
              <div className={`${isMobileView
                ? (activePanel === 'form' ? 'w-full' : 'hidden')
                : 'w-full lg:w-1/2'} overflow-y-auto p-4`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
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
                      inventoryItems={inventoryItems}
                      onPaymentStatusChange={handlePaymentStatusChange}
                      onPaymentComplete={handlePaymentComplete}
                      isProcessingPayment={isProcessingPayment}
                    />
                  </ErrorBoundary>
                )}
              </div>

              {/* Right Panel - Canvas */}
              <div
                ref={rightPanelRef}
                className={`${isMobileView
                  ? (activePanel === 'preview' ? 'w-full' : 'hidden')
                  : 'hidden lg:flex lg:w-1/2'}
                  flex flex-col overflow-hidden`}
              >

                {/* Canvas Container */}
                <div
                  ref={containerRef}
                  className="flex-1 overflow-hidden bg-[#0F172A] flex items-center justify-center p-1 md:p-2"
                >
                  <div
                    ref={invoiceRef}
                    data-invoice-container="true"
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: 'center',
                      width: '210mm',
                      minHeight: '297mm',
                      transition: 'transform 0.15s ease-out',
                      boxShadow: isMobileView
                        ? '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)'
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      backgroundColor: 'white'
                    }}
                  >
                    <ErrorBoundary>
                      <InvoiceCanvas invoiceData={invoiceData} />
                    </ErrorBoundary>
                  </div>
                </div>

                <div className="bg-[#0F172A] p-3 md:p-4 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-2">
                    <div className="flex items-center mb-3 me-3 justify-end gap-2">
                      {isDirty && (
                        <button
                          onClick={handleCancelEdit}
                          disabled={isLoading || isGeneratingPDF || isSaving}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      )}
                      <button
                        onClick={handleSaveChanges}
                        disabled={isLoading || isGeneratingPDF || isSaving}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                          </>
                        )}
                      </button>

                      <div className="relative share-dropdown-container">
                        <button
                          onClick={handleShareInvoice}
                          disabled={!invoiceData._id || isLoading || isGeneratingPDF || isSaving}
                          className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Share Invoice Link"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      <button
                        onClick={downloadPDF}
                        disabled={!invoiceData._id || isLoading || isGeneratingPDF || isSaving}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingPDF ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">PDF</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handlePrint}
                        disabled={!invoiceData._id || isLoading || isGeneratingPDF || isSaving}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Print</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Invoice;