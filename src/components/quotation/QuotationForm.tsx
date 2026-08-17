import React, { useState, useMemo, useCallback } from "react";
import type { QuotationData, QuotationItem } from "../../types/quotation";
import type { InventoryItem } from "../../types/inventory";
import { PaymentMethod } from "../../types/invoice";
import { QuotationStatus } from "../../types/quotation";
import { useCustomerSearch, type Customer } from "../../hooks/useCustomerSearch";
import { useItemSearch } from "../../hooks/useItemSearch";
import { CustomerSearchAndManagement } from "./CustomerSearchAndManagement";
import { CustomerViewModal } from "./CustomerViewModal";
import { CustomerFormModal } from "./CustomerFormModal";
import { ItemSearchAndAdd } from "./ItemSearchAndAdd";
import { QuotationItemsList } from "./QuotationItemsList";
import { QuotationSummary } from "./QuotationSummary";
import POPickerModal from "../common/POPickerModal";
import type { PurchaseOrder } from "../../types/purchaseOrders";
import { ClipboardList } from "lucide-react";

interface QuotationFormProps {
  quotationData: QuotationData;
  onFieldChange: (field: keyof QuotationData, value: string | number | boolean | Date) => void;
  onCustomerIdChange: (customerId: string, customerDetails?: unknown) => void;
  onAddItem: (item: Omit<QuotationItem, 'id' | 'total'>) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<QuotationItem>) => void;
  inventoryItems: InventoryItem[];
}

const QuotationForm: React.FC<QuotationFormProps> = ({
  quotationData,
  onFieldChange,
  onCustomerIdChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  inventoryItems,
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

  const [newItem, setNewItem] = useState({ 
    item: "", 
    quantity: "1", 
    unitPrice: "0", 
    itemName: "" 
  });

  const [discountInput, setDiscountInput] = useState(quotationData.discountPercentage.toString());
  const [creditPeriod, setCreditPeriod] = useState<string>('custom');

  // When credit period preset is selected, auto-calculate validUntil from issueDate
  const handleCreditPeriodChange = useCallback((period: string) => {
    setCreditPeriod(period);
    if (period !== 'custom' && quotationData.issueDate) {
      const days = parseInt(period);
      const issue = new Date(quotationData.issueDate);
      issue.setDate(issue.getDate() + days);
      const due = issue.toISOString().split('T')[0];
      onFieldChange('validUntil', due);
    }
  }, [quotationData.issueDate, onFieldChange]);

  // When issueDate changes, recalculate validUntil if a preset is active
  const handleIssueDateChange = (value: string) => {
    onFieldChange('issueDate', value);
    if (creditPeriod !== 'custom' && value) {
      const days = parseInt(creditPeriod);
      const issue = new Date(value);
      issue.setDate(issue.getDate() + days);
      const due = issue.toISOString().split('T')[0];
      onFieldChange('validUntil', due);
    }
  };

  React.useEffect(() => {
    setDiscountInput(quotationData.discountPercentage.toString());
  }, [quotationData.discountPercentage]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalMode, setCustomerModalMode] = useState<'view' | 'create' | 'edit' | null>(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [importedOrderId, setImportedOrderId] = useState<string | null>(null);

  const handleOrderImport = useCallback((po: PurchaseOrder) => {
    // Map PO items to quotation line items
    po.items.forEach(p => {
      const lineItem: Omit<QuotationItem, 'id' | 'total'> = {
        item: p.id || p.sku,
        itemName: `${p.productName} (${p.sku})`,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
      };
      onAddItem(lineItem);
    });
    setImportedOrderId(po.poNumber);
    onFieldChange('notes', po.notes ? `Ref PO: ${po.poNumber} — ${po.notes}` : `Ref PO: ${po.poNumber}`);
  }, [onAddItem, onFieldChange]);

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
    const existingQuantity = quotationData.items
      .filter(item => item.item === newItem.item)
      .reduce((sum, it) => sum + it.quantity, 0);
    
    const remaining = selectedItem.quantity - existingQuantity;
    if (qty + existingQuantity > selectedItem.quantity) {
      return `Only ${remaining} items available (${existingQuantity} already in cart)`;
    }
    return null;
  }, [newItem.item, newItem.quantity, inventoryItems, quotationData.items]);

  const handleItemSelect = useCallback((inventoryItem: InventoryItem) => {
    setNewItem({ 
      item: inventoryItem._id, 
      itemName: inventoryItem.product_name, 
      quantity: "1", 
      unitPrice: inventoryItem.sell_price.toString() 
    });
    setItemSearchTerm(`${inventoryItem.product_name} (${inventoryItem.product_code})`);
    setShowItemSuggestions(false);
  }, [setItemSearchTerm, setShowItemSuggestions]);

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

    // Auto-detect customer's agreed credit payment terms (e.g. Net 30, Net 15)
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
  }, [onCustomerIdChange, setCustomerSearchTerm, setShowCustomerSuggestions, handleCreditPeriodChange, onFieldChange]);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    onCustomerIdChange("");
    setCustomerSearchTerm("");
    setCustomerModalMode(null);
  }, [onCustomerIdChange, setCustomerSearchTerm]);

  const handleClearItemSelection = useCallback(() => {
    setNewItem({ item: "", quantity: "1", unitPrice: "0", itemName: "" });
    setItemSearchTerm("");
  }, [setItemSearchTerm]);

  const handleAddItem = useCallback(() => {
    const qty = parseInt(newItem.quantity);
    const price = parseFloat(newItem.unitPrice);

    if (!newItem.item || isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
      alert("Please select an item and enter valid quantity and price");
      return;
    }

    const existingItem = quotationData.items.find(item => item.item === newItem.item);
    const inventoryItem = inventoryItems.find(item => item._id === newItem.item);

    if (existingItem) {
      if (inventoryItem) {
        const newTotalQuantity = existingItem.quantity + qty;
        if (newTotalQuantity > inventoryItem.quantity) {
          alert(`Cannot add ${qty} items. Only ${inventoryItem.quantity - existingItem.quantity} more available.`);
          return;
        }

        const updatedQuantity = existingItem.quantity + qty;
        const updatedTotal = updatedQuantity * price; // Use the price from the form
        onUpdateItem(existingItem.id, { 
          quantity: updatedQuantity, 
          unitPrice: price,
          total: updatedTotal 
        });
      }
    } else {
      if (inventoryItem && qty > inventoryItem.quantity) {
        alert(`Cannot add ${qty} items. Only ${inventoryItem.quantity} in stock.`);
        return;
      }
      onAddItem({
        item: newItem.item,
        itemName: newItem.itemName,
        quantity: qty,
        unitPrice: price
      });
    }

    handleClearItemSelection();
  }, [newItem, quotationData.items, inventoryItems, onAddItem, onUpdateItem, handleClearItemSelection]);

  const handleUpdateItemQuantity = useCallback((id: string, newQuantity: number) => {
    const item = quotationData.items.find(item => item.id === id);
    if (!item) return;
    
    // We allow the update but the UI will show a warning if stock is insufficient
    onUpdateItem(id, { quantity: newQuantity });
  }, [quotationData.items, onUpdateItem]);

  type CustomerFormData = Omit<Customer, '_id'> | Partial<Customer>;
  const handleCustomerFormSubmit = useCallback(async (formData: CustomerFormData) => {
    try {
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
    } catch (error) {
      throw error;
    }
  }, [customerModalMode, selectedCustomer, updateCustomer, createCustomer, onCustomerIdChange, setCustomerSearchTerm]);

  const getCustomerPrefillData = useCallback(() => {
    if (!customerSearchTerm) return undefined;
    if (/^\d+$/.test(customerSearchTerm) && customerSearchTerm.length >= 2) return { phone: customerSearchTerm };
    if (customerSearchTerm.includes(' ')) return { fullName: customerSearchTerm };
    if (customerSearchTerm.includes('@')) return { email: customerSearchTerm };
    return undefined;
  }, [customerSearchTerm]);

  const { subTotal, discountAmount, totalAmount } = useMemo(() => ({
    subTotal: quotationData.subTotal,
    discountAmount: quotationData.discount,
    totalAmount: quotationData.totalAmount,
  }), [quotationData.subTotal, quotationData.discount, quotationData.totalAmount]);

  const handleDiscountPercentageChange = (value: string) => {
    setDiscountInput(value);
    const percentage = parseFloat(value);
    if (!isNaN(percentage)) {
      // Live update parent but don't clamp yet
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

      {/* PO Picker Modal */}
      <POPickerModal
        isOpen={showOrderPicker}
        onClose={() => setShowOrderPicker(false)}
        onSelect={handleOrderImport}
      />

      <div className="bg-[#1e293b] rounded-lg p-5 border border-[#334155]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Create Quotation</h2>
          <div className="flex items-center gap-2">
            {importedOrderId && (
              <span className="text-xs text-purple-400 bg-purple-400/10 border border-purple-400/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ClipboardList size={11} />
                Ref: {importedOrderId}
              </span>
            )}
            {/* <button
              type="button"
              onClick={() => setShowOrderPicker(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              <ClipboardList size={14} />
              Import from PO
            </button> */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method*
              </label>
              <select
                value={quotationData.paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status*
              </label>
              <select
                value={quotationData.status}
                onChange={(e) => onFieldChange('status', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.values(QuotationStatus).map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date / Credit Period / Valid Until */}
          <div className={`grid grid-cols-1 ${quotationData.paymentMethod === PaymentMethod.CREDIT || quotationData.paymentMethod === 'Credit' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Issue Date*
              </label>
              <input
                type="date"
                value={quotationData.issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Credit Period Selector - Appears ONLY when Payment Method is Credit */}
            {(quotationData.paymentMethod === PaymentMethod.CREDIT || quotationData.paymentMethod === 'Credit') && (
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
                      Valid until auto-calculated
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valid Until*
              </label>
              <input
                type="date"
                value={quotationData.validUntil}
                onChange={(e) => onFieldChange('validUntil', e.target.value)}
                readOnly={(quotationData.paymentMethod === PaymentMethod.CREDIT || quotationData.paymentMethod === 'Credit') && creditPeriod !== 'custom'}
                className={`w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  (quotationData.paymentMethod === PaymentMethod.CREDIT || quotationData.paymentMethod === 'Credit') && creditPeriod !== 'custom' ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Discount (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountInput}
                onChange={(e) => handleDiscountPercentageChange(e.target.value)}
                onBlur={handleDiscountBlur}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                %
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Discount Amount: <span className="text-green-400">LKR {discountAmount.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={quotationData.notes || ''}
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
        onQuantityChange={(quantity) => setNewItem(prev => ({ ...prev, quantity }))}
        onUnitPriceChange={(unitPrice) => setNewItem(prev => ({ ...prev, unitPrice }))}
        onAddItem={handleAddItem}
        onClearSelection={handleClearItemSelection}
        itemTotal={itemTotal}
        stockWarning={stockWarning}
        quotationItems={quotationData.items}
      />

      {quotationData.items.length > 0 && (
        <div className="bg-[#1e293b] rounded-lg border border-[#334155]">
          <div className="p-6">
            <QuotationItemsList
              items={quotationData.items}
              inventoryItems={inventoryItems}
              onUpdateQuantity={handleUpdateItemQuantity}
              onRemoveItem={onRemoveItem}
            />

            <QuotationSummary
              subTotal={subTotal}
              discountPercentage={quotationData.discountPercentage}
              discountAmount={discountAmount}
              totalAmount={totalAmount}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationForm;
