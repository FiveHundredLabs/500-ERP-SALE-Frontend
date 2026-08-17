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
import { ClipboardList } from "lucide-react";

interface InvoiceFormProps {
  invoiceData: InvoiceData;
  onFieldChange: (field: keyof InvoiceData, value: string | number | boolean | Date) => void;
  onCustomerIdChange: (customerId: string, customerDetails?: Customer) => void;
  onAddItem: (item: Omit<InvoiceItem, 'id' | 'total'>) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<InvoiceItem>) => void;
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
  inventoryItems,
  onPaymentStatusChange,
  onPaymentComplete,
  isProcessingPayment = false,
}) => {
  const {
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
    item: string;
    quantity: string;
    unitPrice: string;
    itemName: string;
    product_code?: string;
    costPrice?: number;
    discountType?: 'percentage' | 'amount';
    discountScope?: 'per_unit' | 'total_qty';
    discountValue?: string;
  }

  const [newItem, setNewItem] = useState<NewItemState>({
    item: "",
    quantity: "1",
    unitPrice: "0",
    itemName: "",
    product_code: undefined,
    costPrice: 0,
    discountType: 'percentage',
    discountScope: 'per_unit',
    discountValue: '0',
  });

  const [discountInput, setDiscountInput] = useState(invoiceData.discountPercentage.toString());
  const [creditPeriod, setCreditPeriod] = useState<string>('custom');
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [importedOrderId, setImportedOrderId] = useState<string | null>(null);

  const handleOrderImport = useCallback((po: PurchaseOrder) => {
    // Map PO items to invoice line items
    po.items.forEach(p => {
      const lineItem: Omit<InvoiceItem, 'id' | 'total'> = {
        item: p.id || p.sku,
        itemName: `${p.productName} (${p.sku})`,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
      };
      onAddItem(lineItem);
    });

    // Store imported PO reference
    setImportedOrderId(po.poNumber);
    onFieldChange('notes', po.notes ? `Ref PO: ${po.poNumber} — ${po.notes}` : `Ref PO: ${po.poNumber}`);
  }, [onFieldChange, onAddItem]);

  // When credit period preset is selected, auto-calculate dueDate from issueDate
  const handleCreditPeriodChange = (period: string) => {
    setCreditPeriod(period);
    if (period !== 'custom' && invoiceData.issueDate) {
      const days = parseInt(period);
      const issue = new Date(invoiceData.issueDate);
      issue.setDate(issue.getDate() + days);
      const due = issue.toISOString().split('T')[0];
      onFieldChange('dueDate', due);
    }
  };

  // When issueDate changes, recalculate dueDate if a preset is active
  const handleIssueDateChange = (value: string) => {
    onFieldChange('issueDate', value);
    if (creditPeriod !== 'custom' && value) {
      const days = parseInt(creditPeriod);
      const issue = new Date(value);
      issue.setDate(issue.getDate() + days);
      const due = issue.toISOString().split('T')[0];
      onFieldChange('dueDate', due);
    }
  };

  useEffect(() => {
    setDiscountInput(invoiceData.discountPercentage.toString());
  }, [invoiceData.discountPercentage]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalMode, setCustomerModalMode] = useState<'view' | 'create' | 'edit' | null>(null);

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

  const [paymentModalTriggered, setPaymentModalTriggered] = useState(false);

  const itemTotal = useMemo(() => {
    const qty = parseInt(newItem.quantity) || 0;
    const price = parseFloat(newItem.unitPrice) || 0;
    return qty * price;
  }, [newItem.quantity, newItem.unitPrice]);

  const stockWarning = useMemo(() => {
    if (!newItem.item) return null;
    const selectedItem = inventoryItems.find(item => item._id === newItem.item);
    if (!selectedItem) return null;
    
    const qty = parseInt(newItem.quantity) || 0;
    const existingQuantity = invoiceData.items
      .filter(item => item.item === newItem.item)
      .reduce((sum, it) => sum + it.quantity, 0);
    
    const remaining = selectedItem.quantity - existingQuantity;
    if (qty + existingQuantity > selectedItem.quantity) {
      return `Only ${remaining} items available (${existingQuantity} already in cart)`;
    }
    return null;
  }, [newItem.item, newItem.quantity, inventoryItems, invoiceData.items]);

  const handlePaymentStatusChange = useCallback((value: string) => {
    const newStatus = value as PaymentStatusType;
   
    onFieldChange('paymentStatus', newStatus);
    
    if (newStatus === PaymentStatus.COMPLETED && !paymentModalTriggered && !isProcessingPayment) {
      setPaymentDetails(prev => ({
        ...prev,
        method: invoiceData.paymentMethod,
        amount: (invoiceData.totalAmount > 0 ? invoiceData.totalAmount : 0).toFixed(2)
      }));
      
      // Show payment modal
      setShowPaymentModal(true);
      setPaymentModalTriggered(true);
      if (onPaymentStatusChange) {
        onPaymentStatusChange(newStatus, invoiceData);
      }
    } else if (newStatus !== PaymentStatus.COMPLETED) {
      setPaymentModalTriggered(false);
    }
  }, [invoiceData, onFieldChange, onPaymentStatusChange, paymentModalTriggered, isProcessingPayment]);

  useEffect(() => {
    if (invoiceData.paymentStatus !== PaymentStatus.COMPLETED) {
      setPaymentModalTriggered(false);
    }
  }, [invoiceData.paymentStatus]);

  useEffect(() => {
    if (isProcessingPayment && showPaymentModal) {
      setShowPaymentModal(false);
    }
  }, [isProcessingPayment, showPaymentModal]);

  const handleItemSelect = useCallback((inventoryItem: InventoryItem) => {
    setNewItem(prev => ({
      ...prev,
      item: inventoryItem._id,
      itemName: inventoryItem.product_name,
      product_code: inventoryItem.product_code,
      quantity: "1",
      unitPrice: inventoryItem.sell_price.toString(),
      costPrice: inventoryItem.purchase_price || 0,
      discountValue: '0',
    }));
    setItemSearchTerm(`${inventoryItem.product_name} (${inventoryItem.product_code})`);
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

  // When payment method changes, show or reset credit period
  const handlePaymentMethodChange = (method: string) => {
    onFieldChange('paymentMethod', method);
    if (method === PaymentMethod.CREDIT || method === 'Credit') {
      const periodToUse = creditPeriod === 'custom' ? '30' : creditPeriod;
      handleCreditPeriodChange(periodToUse);
    } else {
      setCreditPeriod('custom');
    }
  };

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    onCustomerIdChange(customer._id, customer);
    setCustomerSearchTerm(`${customer.fullName} (${customer.phone})`);
    setShowCustomerSuggestions(false);
    setCustomerModalMode(null);

    const terms = (customer as any).paymentTerms || '';
    if (terms && !terms.toLowerCase().includes('cash')) {
      onFieldChange('paymentMethod', PaymentMethod.CREDIT);
      if (terms.includes('15')) {
        handleCreditPeriodChange('15');
      } else if (terms.includes('45')) {
        handleCreditPeriodChange('45');
      } else if (terms.includes('60')) {
        handleCreditPeriodChange('60');
      } else if (terms.includes('7')) {
        handleCreditPeriodChange('7');
      } else {
        handleCreditPeriodChange('30');
      }
    }
  }, [onCustomerIdChange, setCustomerSearchTerm, setShowCustomerSuggestions, onFieldChange, invoiceData.issueDate]);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    onCustomerIdChange("");
    setCustomerSearchTerm("");
    setCustomerModalMode(null);
  }, [onCustomerIdChange, setCustomerSearchTerm]);

  const handleClearItemSelection = useCallback(() => {
    setNewItem({ item: "", quantity: "1", unitPrice: "0", itemName: "", product_code: undefined, costPrice: 0, discountType: 'percentage', discountScope: 'per_unit', discountValue: '0' });
    setItemSearchTerm("");
  }, [setItemSearchTerm]);

  const handleAddItem = useCallback((itemData?: {
    item: string;
    itemName: string;
    product_code?: string;
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

    const { item, itemName, product_code, quantity, unitPrice, costPrice, discountType, discountScope, discountValue, discountAmount, total } = itemData;

    const inventoryItem = inventoryItems.find(inv => inv._id === item);
    const existingItem = invoiceData.items.find(inv => inv.item === item);

    if (existingItem) {
      if (inventoryItem) {
        const newTotalQuantity = existingItem.quantity + quantity;
        if (newTotalQuantity > inventoryItem.quantity) {
          alert(`Cannot add ${quantity} items. Only ${inventoryItem.quantity - existingItem.quantity} more available.`);
          return;
        }
      }
      // Update existing: recalculate total with new qty+discount
      const updatedQty = existingItem.quantity + quantity;
      const newTotal = updatedQty * unitPrice - discountAmount;
      onUpdateItem(existingItem.id, {
        quantity: updatedQty,
        unitPrice,
        total: Math.max(0, newTotal),
        product_code,
        costPrice,
        discountType,
        discountScope,
        discountValue,
        discountAmount,
      });
    } else {
      if (inventoryItem && quantity > inventoryItem.quantity) {
        alert(`Cannot add ${quantity} items. Only ${inventoryItem.quantity} in stock.`);
        return;
      }
      onAddItem({
        item,
        itemName,
        product_code,
        quantity,
        unitPrice,
        costPrice,
        discountType,
        discountScope,
        discountValue,
        discountAmount,
        total,
      });
    }

    handleClearItemSelection();
  }, [newItem, invoiceData.items, inventoryItems, onAddItem, onUpdateItem, handleClearItemSelection]);

  const handleUpdateItemQuantity = useCallback((id: string, newQuantity: number) => {
    const item = invoiceData.items.find(item => item.id === id);
    if (!item) return;
    
    onUpdateItem(id, { quantity: newQuantity });
  }, [invoiceData.items, onUpdateItem]);

  type CustomerFormData = Omit<Customer, '_id'> | Partial<Customer>;
  const handleCustomerFormSubmit = useCallback(async (formData: CustomerFormData) => {
    if (customerModalMode === 'edit' && selectedCustomer) {
      const updated = await updateCustomer(selectedCustomer._id, formData as Partial<Customer>);
      setSelectedCustomer(updated);
      onCustomerIdChange(updated._id, updated);
      setCustomerSearchTerm(`${updated.fullName} (${updated.phone})`);
      alert("Customer updated successfully!");
    } else {
      const created = await createCustomer(formData as Omit<Customer, '_id'>);
      setSelectedCustomer(created);
      onCustomerIdChange(created._id, created);
      setCustomerSearchTerm(`${created.fullName} (${created.phone})`);
      alert("Customer created successfully!");
    }
    setCustomerModalMode(null);
  }, [customerModalMode, selectedCustomer, updateCustomer, createCustomer, onCustomerIdChange, setCustomerSearchTerm]);

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

  const handleDiscountPercentageChange = (value: string) => {
    setDiscountInput(value);
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      onFieldChange('discountPercentage', percentage);
    }
  };

  const handleDiscountBlur = () => {
    let percentage = parseFloat(discountInput);
    if (isNaN(percentage)) percentage = 0;
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
    setDiscountInput(clampedPercentage.toString());
    onFieldChange('discountPercentage', clampedPercentage);
  };

  const handleVatToggle = () => {
    const newVatState = !invoiceData.applyVat;
    onFieldChange('applyVat', newVatState);
  };

  useEffect(() => {
    if (invoiceData.customerDetails && !selectedCustomer) {
      setSelectedCustomer(invoiceData.customerDetails as Customer);
      setCustomerSearchTerm(`${invoiceData.customerDetails.fullName} (${invoiceData.customerDetails.phone})`);
    }
  }, [invoiceData.customerDetails, selectedCustomer, setCustomerSearchTerm]);

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false);
    setPaymentModalTriggered(false);
    
    if (!isProcessingPayment && invoiceData.paymentStatus === PaymentStatus.COMPLETED) {
      onFieldChange('paymentStatus', PaymentStatus.PENDING);
    }
  };

  const handlePaymentCompleteInternal = async () => {
    setShowPaymentModal(false);
    setPaymentModalTriggered(true);
    
    if (onPaymentComplete) {
      await onPaymentComplete();
    }
  };

  const convertToInvoiceCustomer = (customer: Customer | null): InvoiceCustomer => {
    if (!customer) {
      return {
        _id: '',
        fullName: '',
        phone: '',
        email: '',
        vatNumber: '',
        address: undefined,
        customerCode: '',
        vehicle_number: '',
        vehicle_model: '',
        year_of_manufacture: undefined
      };
    }
    
    return {
      _id: customer._id,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email || '',
      vatNumber: customer.vatNumber || '',
      address: typeof customer.address === 'string' ? undefined : customer.address,
      customerCode: customer.customerCode || '',
      vehicle_number: customer.vehicle_number,
      vehicle_model: customer.vehicle_model,
      year_of_manufacture: customer.year_of_manufacture
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
          invoiceId: invoiceData.invoiceId,
          _id: invoiceData._id || '',
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
          created_at: invoiceData.created_at || '',
          updated_at: invoiceData.updated_at || ''
        }}
        paymentDetails={paymentDetails}
        onPaymentDetailsChange={setPaymentDetails}
        onSubmit={handlePaymentCompleteInternal}
        isProcessing={isProcessingPayment}
      />

      {/* PO Picker Modal */}
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method*
            </label>
            <select
              value={invoiceData.paymentMethod}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.values(PaymentMethod).map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Issue Date / Credit Period / Due Date */}
          <div className={`grid grid-cols-1 ${invoiceData.paymentMethod === PaymentMethod.CREDIT ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Issue Date*
              </label>
              <input
                type="date"
                value={invoiceData.issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Credit Period Selector - Appears ONLY when Payment Method is Credit */}
            {invoiceData.paymentMethod === PaymentMethod.CREDIT && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Credit Period
                </label>
                <div className="flex flex-col gap-1.5">
                  <select
                    value={creditPeriod}
                    onChange={(e) => handleCreditPeriodChange(e.target.value)}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="custom">Custom (manual)</option>
                    <option value="0">Immediate (0 days)</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                  {creditPeriod !== 'custom' && (
                    <p className="text-[11px] text-blue-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      Due date auto-calculated
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Due Date*
              </label>
              <input
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => onFieldChange('dueDate', e.target.value)}
                readOnly={invoiceData.paymentMethod === PaymentMethod.CREDIT && creditPeriod !== 'custom'}
                className={`w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  invoiceData.paymentMethod === PaymentMethod.CREDIT && creditPeriod !== 'custom' ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>
          </div>

          {invoiceData.paymentMethod === PaymentMethod.BANK_DEPOSIT && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bank Deposit Date
              </label>
              <input
                type="date"
                value={invoiceData.bankDepositDate || ''}
                onChange={(e) => onFieldChange('bankDepositDate', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={invoiceData.notes || ''}
              onChange={(e) => onFieldChange('notes', e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
        <div className="bg-[#1e293b] rounded-lg border border-[#334155]">
          <div className="p-6">
            <InvoiceItemsList
              items={invoiceData.items}
              inventoryItems={inventoryItems}
              onUpdateQuantity={handleUpdateItemQuantity}
              onRemoveItem={onRemoveItem}
            />

            <InvoiceSummary
              subTotal={subTotal}
              discountPercentage={invoiceData.discountPercentage}
              discountAmount={discountAmount}
              taxAmount={taxAmount}
              totalAmount={totalAmount}
              applyVat={invoiceData.applyVat}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;