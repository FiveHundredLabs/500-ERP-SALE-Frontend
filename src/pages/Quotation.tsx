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
import QuotationCanvas from "../components/quotation/QuotationCanvas";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
  const [activePanel, setActivePanel] = useState<'form' | 'preview'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);
  const [inventoryItems, setInventoryItems] = useState<QuotationInventoryItem[]>([]);
  const quotationRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

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

  // Add state for share dropdown
  const [showShareDropdown, setShowShareDropdown] = useState(false);

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

  const handleAddItem = (item: Omit<QuotationItem, 'id' | 'total'>) => {
    const total = item.quantity * item.unitPrice;

    const existingItemIndex = quotationData.items.findIndex(
      existing => existing.item === item.item
    );

    let newItems;

    if (existingItemIndex !== -1) {
      newItems = [...quotationData.items];
      const existingItem = newItems[existingItemIndex];
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + item.quantity,
        total: (existingItem.quantity + item.quantity) * existingItem.unitPrice
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

    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subTotal * (quotationData.discountPercentage / 100);
    const totalAmount = subTotal - discountAmount;

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
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
  const handleShareQuotation = async () => {
    if (!quotationData._id) {
      setAlert({
        type: 'error',
        message: 'Please save the quotation first before sharing'
      });
      return;
    }

    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    
    // copy the link to clipboard
    try {
      await navigator.clipboard.writeText(quotationLink);
    } catch (err) {
      // Silent fail for clipboard copy
    }

    // using Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quotation ${quotationData.quotationId}`,
          text: `Check out Quotation ${quotationData.quotationId}`,
          url: quotationLink,
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
            message: 'Quotation link copied to clipboard!'
          });
        }
      }
    } else {
      // Web Share API not supported
      setShowShareDropdown(true);
      setAlert({
        type: 'success',
        message: 'Quotation link copied to clipboard! Select sharing option below.'
      });
    }
  };

  // Share via apps
  const shareViaWhatsApp = () => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    const shareText = `Quotation ${quotationData.quotationId} - View online: ${quotationLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaEmail = () => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    const subject = `Quotation ${quotationData.quotationId}`;
    const body = `Please find the quotation here: ${quotationLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaMessenger = () => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(quotationLink)}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(window.location.origin)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaSMS = () => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    const shareText = `Quotation ${quotationData.quotationId}: ${quotationLink}`;
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
  };

  const shareViaTelegram = () => {
    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
    const shareText = `Quotation ${quotationData.quotationId} - View online: ${quotationLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(quotationLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
    setShowShareDropdown(false);
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
    const subTotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = subTotal * (quotationData.discountPercentage / 100);
    const totalAmount = subTotal - discountAmount;

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
      totalAmount: totalAmount > 0 ? totalAmount : 0
    }));
    setIsDirty(true);
  };

  const handleUpdateItem = (id: string, updates: Partial<QuotationItem>) => {
    const newItems = quotationData.items.map(item => {
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
    const discountAmount = subTotal * (quotationData.discountPercentage / 100);
    const totalAmount = subTotal - discountAmount;

    setQuotationData(prev => ({
      ...prev,
      items: newItems,
      subTotal,
      discount: discountAmount,
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

    setViewMode('edit');
    setActivePanel(mode === 'view' ? 'preview' : 'form');
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
        const customerName = quotation.customerDetails
          ? quotation.customerDetails.fullName
          : typeof quotation.customer === 'object'
            ? (quotation.customer as any).fullName || (quotation.customer as any).name || 'Unknown'
            : String(quotation.customer);

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

  const downloadPDF = async () => {
    if (!quotationRef.current) {
      setAlert({
        type: 'error',
        message: "Quotation content not available for PDF generation."
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

        const quotationContainer = quotationRef.current!;

        const originalTransform = quotationContainer.style.transform;
        const originalTransformOrigin = quotationContainer.style.transformOrigin;
        const originalWidth = quotationContainer.style.width;
        const originalHeight = quotationContainer.style.height;

        quotationContainer.style.transform = 'none';
        quotationContainer.style.transformOrigin = 'top left';
        quotationContainer.style.width = '210mm';
        quotationContainer.style.height = '297mm';
        quotationContainer.style.position = 'fixed';
        quotationContainer.style.left = '0';
        quotationContainer.style.top = '0';
        quotationContainer.style.zIndex = '9999';

        void quotationContainer.offsetHeight;

        const images = quotationContainer.getElementsByTagName('img');
        const imageLoadPromises = Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });

        await Promise.all(imageLoadPromises);

        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(quotationContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          onclone: (clonedDoc: Document) => {
            const clonedContainer = clonedDoc.querySelector('[data-quotation-container]');
            if (clonedContainer) {
              (clonedContainer as HTMLElement).style.transform = 'none';
              (clonedContainer as HTMLElement).style.transformOrigin = 'top left';
              (clonedContainer as HTMLElement).style.width = '210mm';
              (clonedContainer as HTMLElement).style.height = '297mm';
            }
          }
        });

        quotationContainer.style.transform = originalTransform;
        quotationContainer.style.transformOrigin = originalTransformOrigin;
        quotationContainer.style.width = originalWidth;
        quotationContainer.style.height = originalHeight;
        quotationContainer.style.position = '';
        quotationContainer.style.left = '';
        quotationContainer.style.top = '';
        quotationContainer.style.zIndex = '';

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
        pdf.save(`quotation-${quotationData.quotationId}.pdf`);

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

    if (!quotationData._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Save Quotation",
        message: "This quotation has not been saved yet. Do you want to save it now and then download?",
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
    if (!quotationRef.current) return;

    const proceedWithPrint = async () => {
      try {
        setIsGeneratingPDF(true);
        setAlert({
          type: 'info',
          message: 'Preparing print... Please wait.'
        });

        const canvas = await html2canvas(quotationRef.current!, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          onclone: (clonedDoc: Document) => {
            const clonedContainer = clonedDoc.querySelector('[data-quotation-container]');
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
            <title>Quotation ${quotationData.quotationId}</title>
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
              
              .quotation-image {
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
                
                .quotation-image {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <img src="${imageData}" alt="Quotation ${quotationData.quotationId}" class="quotation-image" />
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

    if (!quotationData._id) {
      setConfirmConfig({
        isOpen: true,
        title: "Save Quotation",
        message: "This quotation has not been saved yet. Do you want to save it now and then print?",
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

        {/* Share Dropdown */}
        {showShareDropdown && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1e293b] rounded-lg p-4 w-64 share-dropdown-container">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Share Quotation</h3>
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
                    const quotationLink = `${window.location.origin}/quotation/view/${quotationData._id}`;
                    navigator.clipboard.writeText(quotationLink);
                    setAlert({
                      type: 'success',
                      message: 'Quotation link copied to clipboard again!'
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
              <h1 className="text-lg md:text-xl font-semibold text-gray-200">Quotation Management</h1>
              <div className="text-sm text-gray-400">
                {viewMode === 'manage'
                  ? 'View Quotations'
                  : quotationData._id
                    ? `Edit Quotation – ${quotationData.quotationId}`
                    : 'Create New Quotation'}
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
                title="Manage quotations"
                className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-md text-sm"
              >
                <List className="w-4 h-4" />
                <span>Manage Quotations</span>
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

                          <tbody>
                            {currentQuotations.map((quotation, idx) => {
                              const stripe =
                                idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#08121d]';

                              const customerDisplay = getCustomerDisplay(quotation.customer);

                              return (
                                <tr
                                  key={quotation._id}
                                  className={`${stripe} border-b border-[#162235] hover:bg-[#0b2a3a]/60 transition-colors`}
                                >
                                  {/* Quotation ID */}
                                  <td className="px-2 md:px-4 py-3 font-medium text-gray-200">
                                    {quotation.quotationId}
                                  </td>

                                  {/* Customer */}
                                  <td
                                    className="px-2 md:px-4 py-3 text-gray-300 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[260px]"
                                    title={customerDisplay}
                                  >
                                    {customerDisplay || 'Unknown Customer'}
                                  </td>

                                  {/* Date */}
                                  <td className="hidden md:table-cell px-2 md:px-4 py-3 text-gray-400">
                                    {formatDate(quotation.issueDate)}
                                  </td>

                                  {/* Status */}
                                  <td className="hidden sm:table-cell px-2 md:px-4 py-3">
                                    {statusBadgeMap[quotation.status] && (
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusBadgeMap[quotation.status].cls}`}
                                      >
                                        {statusBadgeMap[quotation.status].icon}
                                        {quotation.status}
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount */}
                                  <td className="px-2 md:px-4 py-3 text-right font-semibold text-white">
                                    LKR {quotation.totalAmount.toFixed(2)}
                                  </td>

                                  {/* Actions - Copy button */}
                                  <td className="px-2 md:px-4 py-3">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleLoadQuotation(quotation, 'view')}
                                        title="View"
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
                    ref={quotationRef}
                    data-quotation-container="true"
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
                      <QuotationCanvas quotationData={quotationData} />
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
                          onClick={handleShareQuotation}
                          disabled={!quotationData._id || isLoading || isGeneratingPDF || isSaving}
                          className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Share Quotation Link"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleConvertQuotationToPO(quotationData)}
                        disabled={!quotationData._id || isLoading || isGeneratingPDF || isSaving}
                        className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Convert Quotation to Purchase Order"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Convert to PO</span>
                      </button>

                      <button
                        onClick={downloadPDF}
                        disabled={!quotationData._id || isLoading || isGeneratingPDF || isSaving}
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
                        disabled={!quotationData._id || isLoading || isGeneratingPDF || isSaving}
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

export default Quotation;