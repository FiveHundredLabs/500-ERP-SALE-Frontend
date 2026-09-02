import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { InvoiceData, InvoiceItem, InvoiceCustomer } from "../types/invoice";
import type { InventoryItem } from "../types/inventory";
import { PaymentMethod, PaymentStatus, type PaymentStatusType, type PaymentMethodType } from "../types/invoice";
import { useCustomerSearch, type Customer } from "../hooks/useCustomerSearch";
import { useItemSearch } from "../hooks/useItemSearch";
import { CustomerSearchAndManagement } from "./invoice/CustomerSearchAndManagement";
import { CustomerViewModal } from "./invoice/CustomerViewModal";
import { CustomerFormModal } from "./invoice/CustomerFormModal";
import { ItemSearchAndAdd } from "./invoice/ItemSearchAndAdd";
import { InvoiceItemsList } from "./invoice/InvoiceItemsList";
import { InvoiceSummary } from "./invoice/InvoiceSummary";
import PaymentModal from "../components/PaymentModal";
import POPickerModal from "./common/POPickerModal";
import type { PurchaseOrder } from "../types/purchaseOrders";
import { ClipboardList, UserCheck } from "lucide-react";
import userService from "../services/UserService";
import type { User } from "../types/users";

interface InvoiceFormProps {
  invoiceData: InvoiceData;
  onFieldChange: (field: keyof InvoiceData, value: string | number | boolean | Date) => void;
  onCustomerIdChange: (customerId: string, customerDetails?: Customer) => void;
  onAddItem: (item: Omit<InvoiceItem, 'id' | 'total'>) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  onTotalDiscountChange?: (discountType: 'percentage' | 'amount', discountValue: number) => void;
  inventoryItems: InventoryItem[];
  onPaymentStatusChange?: (status: PaymentStatusType, invoice: InvoiceData) => void;
  onPaymentComplete?: () => Promise<void>;
  isProcessingPayment?: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoiceData,
  onFieldChange,
  onCustomerIdChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onTotalDiscountChange,
  inventoryItems,
  onPaymentComplete,
  isProcessingPayment = false,
}) => {
  const {
    allCustomers,
    filteredCustomers,
    searchTerm: customerSearchTerm,
    setSearchTerm: setCustomerSearchTerm,
    showSuggestions: showCustomerSuggestions,
    setShowSuggestions: setShowCustomerSuggestions,
    createCustomer,
    updateCustomer,
  } = useCustomerSearch();

  const {
    searchTerm: itemSearchTerm,
    setSearchTerm: setItemSearchTerm,
    filteredItems,
    showSuggestions: showItemSuggestions,
    setShowSuggestions: setShowItemSuggestions,
  } = useItemSearch(inventoryItems);

  interface NewItemState {
    inventoryItemId: string;
    quantity: string;
    unitPrice: string;
    itemName: string;
    productCode?: string;
    costPrice?: number;
    discountType?: 'percentage' | 'amount';
    discountScope?: 'per_unit' | 'total_qty';
    discountValue?: string;
  }

  const [newItem, setNewItem] = useState<NewItemState>({
    inventoryItemId: "",
    quantity: "0",
    unitPrice: "0",
    itemName: "",
    productCode: undefined,
    costPrice: 0,
    discountType: 'percentage',
    discountScope: 'per_unit',
    discountValue: '0',
  });

  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [importedOrderId, setImportedOrderId] = useState<string | null>(null);

  // Sales Officer list (users with role === 'salesman')
  const [salesmen, setSalesmen] = useState<User[]>([]);
  useEffect(() => {
    userService.getUsers().then(users => {
      const activeSalesmen = users.filter(u => u.role === 'salesman');
      setSalesmen(activeSalesmen);
      if (!invoiceData.salesman?.id && activeSalesmen.length > 0) {
        const defaultOfficer = activeSalesmen[0];
        onFieldChange('salesman', { id: defaultOfficer.id, fullName: defaultOfficer.fullName, name: defaultOfficer.fullName } as any);
      }
    });
  }, []);

  const handleOrderImport = useCallback((po: PurchaseOrder) => {
    po.items.forEach(p => {
      const lineItem: Omit<InvoiceItem, 'id' | 'total'> = {
        inventoryItemId: p.inventoryItemId || p.id,
        itemName: `${p.productName} (${p.sku})`,
        quantity: p.quantityOrdered,
        discount: p.discount || 0,
        unitPrice: p.unitPrice,
      };
      onAddItem(lineItem);
    });

    setImportedOrderId(po.poNumber);
    onFieldChange('notes', po.notes ? `Ref PO: ${po.poNumber} — ${po.notes}` : `Ref PO: ${po.poNumber}`);
  }, [onFieldChange, onAddItem]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalMode, setCustomerModalMode] = useState<'view' | 'create' | 'edit' | null>(null);

  // Sync customer from invoiceData prop (e.g. when converted from Order or loaded from PO)
  useEffect(() => {
    if (invoiceData.customerDetails) {
      const cust = invoiceData.customerDetails as unknown as Customer;
      setSelectedCustomer(cust);
      const name = cust.fullName || cust.shopName || '';
      const phone = cust.phone ? ` (${cust.phone})` : '';
      setCustomerSearchTerm(`${name}${phone}`);
    } else if (typeof invoiceData.customer === 'object' && invoiceData.customer !== null) {
      const cust = invoiceData.customer as unknown as Customer;
      setSelectedCustomer(cust);
      const name = cust.fullName || cust.shopName || '';
      const phone = cust.phone ? ` (${cust.phone})` : '';
      setCustomerSearchTerm(`${name}${phone}`);
    } else if (typeof invoiceData.customer === 'string' && invoiceData.customer && allCustomers.length > 0) {
      const matched = allCustomers.find(c => c.id === invoiceData.customer);
      if (matched) {
        setSelectedCustomer(matched);
        const name = matched.fullName || matched.shopName || '';
        const phone = matched.phone ? ` (${matched.phone})` : '';
        setCustomerSearchTerm(`${name}${phone}`);
      }
    }
  }, [invoiceData.customer, invoiceData.customerDetails, allCustomers, setCustomerSearchTerm]);

  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    method: invoiceData.paymentMethod as PaymentMethodType,
    bankName: "",
    accountNumber: "",
    transactionRef: "",
    amount: "",
    transactionDate: new Date().toISOString().split('T')[0]
  });

  const stockWarning = null;

  useEffect(() => {
    if (isProcessingPayment && showPaymentModal) {
      setShowPaymentModal(false);
    }
  }, [isProcessingPayment, showPaymentModal]);

  const handleItemSelect = useCallback((inventoryItem: InventoryItem) => {
    setNewItem(prev => ({
      ...prev,
      inventoryItemId: inventoryItem.id,
      itemName: inventoryItem.productName,
      productCode: inventoryItem.productCode,
      quantity: "0",
      unitPrice: inventoryItem.sellPrice.toString(),
      costPrice: inventoryItem.purchasePrice || 0,
      discountValue: '0',
    }));
    setItemSearchTerm(`${inventoryItem.productName} (${inventoryItem.productCode})`);
    setShowItemSuggestions(false);
  }, [setItemSearchTerm, setShowItemSuggestions]);

  const handleDiscountChange = useCallback((discountData: {
    discountType: 'percentage' | 'amount';
    discountScope: 'per_unit' | 'total_qty';
    discountValue: string;
  }) => {
    setNewItem(prev => ({
      ...prev,
      discountType: discountData.discountType,
      discountScope: discountData.discountScope,
      discountValue: discountData.discountValue,
    }));
  }, []);

  // Credit period state in days (e.g. 30, 60, custom)
  const [creditPeriod, setCreditPeriod] = useState<string>('30');

  const handleCreditPeriodChange = useCallback((days: string) => {
    setCreditPeriod(days);
    if (days !== 'custom') {
      const numDays = parseInt(days, 10);
      const baseDate = invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date();
      if (!isNaN(baseDate.getTime())) {
        const dueDate = new Date(baseDate.getTime() + numDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        onFieldChange('dueDate', dueDate);
        onFieldChange('creditPeriod', numDays);
      }
    }
  }, [invoiceData.issueDate, onFieldChange]);

  // Sync creditPeriod state when invoiceData is loaded or updated
  useEffect(() => {
    if (invoiceData.creditPeriod !== undefined && invoiceData.creditPeriod !== null) {
      setCreditPeriod(String(invoiceData.creditPeriod));
    } else if (invoiceData.dueDate && invoiceData.issueDate) {
      const issueTime = new Date(invoiceData.issueDate).getTime();
      const dueTime = new Date(invoiceData.dueDate).getTime();
      if (!isNaN(issueTime) && !isNaN(dueTime) && dueTime > issueTime) {
        const diff = Math.round((dueTime - issueTime) / 86400000);
        setCreditPeriod(String(diff));
      }
    }
  }, [invoiceData.creditPeriod, invoiceData.dueDate, invoiceData.issueDate]);

  // Auto-correct: If invoice is Credit and dueDate is missing or identical to issueDate, auto-set to credit period (default 30d)
  useEffect(() => {
    if (
      (invoiceData.paymentMethod === PaymentMethod.CREDIT || invoiceData.paymentMethod === 'credit') &&
      invoiceData.issueDate &&
      (!invoiceData.dueDate || invoiceData.dueDate === invoiceData.issueDate)
    ) {
      const days = parseInt(creditPeriod === 'custom' ? '30' : creditPeriod, 10) || 30;
      const baseDate = new Date(invoiceData.issueDate);
      if (!isNaN(baseDate.getTime())) {
        const newDueDate = new Date(baseDate.getTime() + days * 86400000).toISOString().split('T')[0];
        onFieldChange('dueDate', newDueDate);
        onFieldChange('creditPeriod', days);
      }
    }
  }, [invoiceData.paymentMethod, invoiceData.issueDate, invoiceData.dueDate, creditPeriod, onFieldChange]);

  const handleBillingDateChange = (newDate: string) => {
    onFieldChange('issueDate', newDate);
    if (creditPeriod !== 'custom') {
      const numDays = parseInt(creditPeriod, 10) || 0;
      const baseDate = new Date(newDate);
      if (!isNaN(baseDate.getTime())) {
        const dueDate = new Date(baseDate.getTime() + numDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        onFieldChange('dueDate', dueDate);
      }
    }
  };

  // When payment method changes: If Credit -> Pending, else -> Completed
  const handlePaymentMethodChange = (method: string) => {
    onFieldChange('paymentMethod', method);
    if (method === PaymentMethod.CREDIT || method === 'credit') {
      onFieldChange('paymentStatus', PaymentStatus.PENDING);
      const periodToUse = creditPeriod === 'custom' ? '30' : creditPeriod;
      handleCreditPeriodChange(periodToUse);
    } else {
      onFieldChange('paymentStatus', PaymentStatus.COMPLETED);
    }
  };

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerIdChange(customer.id, customer);
    setCustomerSearchTerm(`${customer.fullName} (${customer.phone})`);
    setShowCustomerSuggestions(false);
    setCustomerModalMode(null);

    // Auto-set payment method to Credit and credit period to customer's default period
    const defaultPeriod = (customer as any).creditPeriod ?? 30;
    onFieldChange('paymentMethod', PaymentMethod.CREDIT);
    onFieldChange('paymentStatus', PaymentStatus.PENDING);
    handleCreditPeriodChange(String(defaultPeriod));

    // Auto-assign Sales Officer if customer has one assigned or if none selected yet
    const custSalesRepId = (customer as any).salesRepId;
    const custSalesRepName = (customer as any).salesRepName;
    if (custSalesRepId) {
      const rep = salesmen.find(s => s.id === custSalesRepId);
      if (rep) {
        onFieldChange('salesman', { id: rep.id, fullName: rep.fullName, name: rep.fullName } as any);
      }
    } else if (custSalesRepName) {
      const rep = salesmen.find(s => s.fullName?.toLowerCase() === custSalesRepName.toLowerCase());
      if (rep) {
        onFieldChange('salesman', { id: rep.id, fullName: rep.fullName, name: rep.fullName } as any);
      }
    } else if (!invoiceData.salesman?.id && salesmen.length > 0) {
      const defaultOfficer = salesmen[0];
      onFieldChange('salesman', { id: defaultOfficer.id, fullName: defaultOfficer.fullName, name: defaultOfficer.fullName } as any);
    }
  }, [onCustomerIdChange, setCustomerSearchTerm, setShowCustomerSuggestions, onFieldChange, handleCreditPeriodChange, salesmen, invoiceData.salesman?.id]);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    onCustomerIdChange("");
    setCustomerSearchTerm("");
    setCustomerModalMode(null);
  }, [onCustomerIdChange, setCustomerSearchTerm]);

  const handleClearItemSelection = useCallback(() => {
    setNewItem({ inventoryItemId: "", quantity: "0", unitPrice: "0", itemName: "", productCode: undefined, costPrice: 0, discountType: 'percentage', discountScope: 'per_unit', discountValue: '0' });
    setItemSearchTerm("");
  }, [setItemSearchTerm]);

  const handleAddItem = useCallback((itemData?: {
    inventoryItemId: string;
    itemName: string;
    productCode?: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    discountType: 'percentage' | 'amount';
    discountScope: 'per_unit' | 'total_qty';
    discountValue: number;
    discountAmount: number;
    total: number;
  }) => {
    if (!itemData) return;

    const { inventoryItemId, itemName, productCode, quantity, unitPrice, costPrice, discountType, discountScope, discountValue, discountAmount } = itemData;

    const existingItem = invoiceData.items.find(inv => inv.inventoryItemId === inventoryItemId);

    if (existingItem) {
      const updatedQty = existingItem.quantity + quantity;
      const newTotal = updatedQty * unitPrice - discountAmount;
      onUpdateItem(existingItem.id, {
        quantity: updatedQty,
        unitPrice,
        total: Math.max(0, newTotal),
        productCode,
        itemCode: productCode,
        costPrice,
        discountType,
        discountScope,
        discountValue,
        discountAmount,
      });
    } else {
      onAddItem({
        inventoryItemId,
        itemName,
        itemCode: productCode,
        discount: 0,
        productCode,
        quantity,
        unitPrice,
        costPrice,
        discountType,
        discountScope,
        discountValue,
        discountAmount,
      });
    }

    handleClearItemSelection();
  }, [invoiceData.items, onAddItem, onUpdateItem, handleClearItemSelection]);

  const handleUpdateItemQuantity = useCallback((id: string, newQuantity: number) => {
    const item = invoiceData.items.find(item => item.id === id);
    if (!item) return;
    onUpdateItem(id, { quantity: newQuantity });
  }, [invoiceData.items, onUpdateItem]);

  type CustomerFormData = Omit<Customer, 'id'> | Partial<Customer>;
  const handleCustomerFormSubmit = useCallback(async (formData: CustomerFormData) => {
    if (customerModalMode === 'edit' && selectedCustomer) {
      const updated = await updateCustomer(selectedCustomer.id, formData as Partial<Customer>);
      setSelectedCustomer(updated);
      onCustomerIdChange(updated.id, updated);
      setCustomerSearchTerm(`${updated.fullName} (${updated.phone})`);
      const defaultPeriod = (updated as any).creditPeriod ?? 30;
      handleCreditPeriodChange(String(defaultPeriod));
    } else {
      const created = await createCustomer(formData as Omit<Customer, 'id'>);
      setSelectedCustomer(created);
      onCustomerIdChange(created.id, created);
      setCustomerSearchTerm(`${created.fullName} (${created.phone})`);
      const defaultPeriod = (created as any).creditPeriod ?? 30;
      onFieldChange('paymentMethod', PaymentMethod.CREDIT);
      onFieldChange('paymentStatus', PaymentStatus.PENDING);
      handleCreditPeriodChange(String(defaultPeriod));
    }
    setCustomerModalMode(null);
  }, [customerModalMode, selectedCustomer, updateCustomer, createCustomer, onCustomerIdChange, setCustomerSearchTerm, handleCreditPeriodChange, onFieldChange]);

  const getCustomerPrefillData = useCallback(() => {
    if (!customerSearchTerm) return undefined;
    if (/^\d+$/.test(customerSearchTerm) && customerSearchTerm.length >= 2) return { phone: customerSearchTerm };
    if (customerSearchTerm.includes(' ')) return { fullName: customerSearchTerm };
    if (customerSearchTerm.includes('@')) return { email: customerSearchTerm };
    return undefined;
  }, [customerSearchTerm]);

  const { subTotal, discountAmount, taxAmount, totalAmount } = useMemo(() => {
    const subTotal = invoiceData.subTotal;
    const discountAmount = invoiceData.discount;
    const taxAmount = invoiceData.applyVat ? invoiceData.vatAmount : 0;
    const totalAmount = invoiceData.totalAmount;
    
    return { subTotal, discountAmount, taxAmount, totalAmount };
  }, [invoiceData.subTotal, invoiceData.discount, invoiceData.totalAmount, invoiceData.applyVat, invoiceData.vatAmount]);

  useEffect(() => {
    if (invoiceData.customerDetails && !selectedCustomer) {
      setSelectedCustomer(invoiceData.customerDetails as Customer);
      setCustomerSearchTerm(`${invoiceData.customerDetails.fullName} (${invoiceData.customerDetails.phone})`);
    }
  }, [invoiceData.customerDetails, selectedCustomer, setCustomerSearchTerm]);

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    if (!isProcessingPayment && invoiceData.paymentStatus === PaymentStatus.COMPLETED) {
      onFieldChange('paymentStatus', PaymentStatus.PENDING);
    }
  };

  const handlePaymentCompleteInternal = async () => {
    setShowPaymentModal(false);
    if (onPaymentComplete) {
      await onPaymentComplete();
    }
  };

  const convertToInvoiceCustomer = (customer: Customer | null): InvoiceCustomer => {
    if (!customer) {
      return {
        id: '',
        shopName: '',
        fullName: '',
        phone: '',
        customerCode: '',
      };
    }
    
    return {
      id: customer.id,
      shopName: customer.shopName || customer.fullName,
      fullName: customer.shopName || customer.fullName,
      contactPerson: customer.contactPerson,
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city,
      customerCode: customer.customerCode || '',
    };
  };

  return (
    <div className="space-y-6">
      {customerModalMode === 'view' && selectedCustomer && (
        <CustomerViewModal
          customer={selectedCustomer}
          isOpen={true}
          onClose={() => setCustomerModalMode(null)}
          onEdit={() => setCustomerModalMode('edit')}
        />
      )}

      {(customerModalMode === 'create' || customerModalMode === 'edit') && (
        <CustomerFormModal
          isOpen={true}
          mode={customerModalMode}
          initialData={customerModalMode === 'edit' ? selectedCustomer || undefined : undefined}
          prefillData={customerModalMode === 'create' ? getCustomerPrefillData() : undefined}
          onClose={() => setCustomerModalMode(null)}
          onSubmit={handleCustomerFormSubmit}
        />
      )}

      {/* Payment Modal */}
      <PaymentModal
        key={`payment-modal-${showPaymentModal}`}
        isOpen={showPaymentModal}
        onClose={handlePaymentModalClose}
        selectedInvoice={{
          invoiceNumber: invoiceData.invoiceNumber,
          id: invoiceData.id || '',
          totalAmount: invoiceData.totalAmount,
          customer: convertToInvoiceCustomer(selectedCustomer),
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
        onSubmit={handlePaymentCompleteInternal}
        isProcessing={isProcessingPayment}
      />

      {/* POPickerModal */}
      <POPickerModal
        isOpen={showOrderPicker}
        onClose={() => setShowOrderPicker(false)}
        onSelect={handleOrderImport}
      />

      <div className="bg-[#1e293b] rounded-lg p-5 border border-[#334155]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Create Invoice</h2>
          <div className="flex items-center gap-2">
            {importedOrderId && (
              <span className="text-xs text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ClipboardList size={11} />
                Ref: {importedOrderId}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowOrderPicker(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              <ClipboardList size={14} />
              Import from PO
            </button>
          </div>
        </div>
        
        <CustomerSearchAndManagement
          searchTerm={customerSearchTerm}
          onSearchChange={setCustomerSearchTerm}
          showSuggestions={showCustomerSuggestions}
          onShowSuggestionsChange={setShowCustomerSuggestions}
          filteredCustomers={filteredCustomers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={handleCustomerSelect}
          onClearCustomer={handleClearCustomer}
          onOpenCreateCustomer={() => setCustomerModalMode('create')}
          onViewCustomer={() => setCustomerModalMode('view')}
          onEditCustomer={() => setCustomerModalMode('edit')}
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Officer Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><UserCheck size={14} className="text-purple-400" /> Sales Officer*</span>
              </label>
              <select
                value={invoiceData.salesman?.id || (typeof invoiceData.salesman === 'object' ? (invoiceData.salesman as any)?.id : '') || ''}
                onChange={(e) => {
                  const selected = salesmen.find(s => s.id === e.target.value);
                  onFieldChange('salesman', selected ? { id: selected.id, fullName: selected.fullName, name: selected.fullName } as any : null as any);
                }}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
              >
                <option value="">— Select Sales Officer —</option>
                {salesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Payment Method*
              </label>
              <select
                value={invoiceData.paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
                required
              >
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Billing Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Billing Date*
              </label>
              <input
                type="date"
                value={invoiceData.issueDate}
                onChange={(e) => handleBillingDateChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium font-mono"
                required
              />
            </div>

            {/* Credit Period & Due Date (Visible and editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Credit Period
              </label>
              <select
                value={creditPeriod}
                onChange={(e) => handleCreditPeriodChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
              >
                <option value="custom">Custom Due Date</option>
                <option value="0">Immediate (0 Days)</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="45">45 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Due Date (Always editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={invoiceData.dueDate || ''}
                  onChange={(e) => {
                    setCreditPeriod('custom');
                    onFieldChange('dueDate', e.target.value);
                  }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium font-mono"
                />
              </div>
            </div>

            {invoiceData.paymentMethod === PaymentMethod.BANK_DEPOSIT && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Bank Deposit Date
                </label>
                <input
                  type="date"
                  value={invoiceData.bankDepositDate || ''}
                  onChange={(e) => onFieldChange('bankDepositDate', e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ItemSearchAndAdd
        searchTerm={itemSearchTerm}
        onSearchChange={setItemSearchTerm}
        showSuggestions={showItemSuggestions}
        onShowSuggestionsChange={setShowItemSuggestions}
        filteredItems={filteredItems}
        newItem={newItem}
        onItemSelect={handleItemSelect}
        onQuantityChange={(quantity: string) => setNewItem(prev => ({ ...prev, quantity }))}
        onDiscountChange={handleDiscountChange}
        onAddItem={handleAddItem}
        onClearSelection={handleClearItemSelection}
        stockWarning={stockWarning}
        invoiceItems={invoiceData.items}
      />

      {invoiceData.items.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5 space-y-4">
          <InvoiceItemsList
            items={invoiceData.items}
            inventoryItems={inventoryItems}
            onUpdateQuantity={handleUpdateItemQuantity}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
          />

          <InvoiceSummary
            subTotal={subTotal}
            totalDiscountType={invoiceData.totalDiscountType}
            totalDiscountValue={invoiceData.totalDiscountValue}
            discountPercentage={invoiceData.discountPercentage || 0}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            totalAmount={totalAmount}
            applyVat={invoiceData.applyVat}
            items={invoiceData.items}
            inventoryItems={inventoryItems}
            onTotalDiscountChange={onTotalDiscountChange}
          />
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
