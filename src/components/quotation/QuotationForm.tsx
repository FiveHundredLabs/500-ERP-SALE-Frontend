import React, { useState, useMemo, useCallback } from "react";
import type { QuotationData, QuotationItem } from "../../types/quotation";
import type { InventoryItem } from "../../types/inventory";
import { PaymentMethod } from "../../types/invoice";
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
import { ClipboardList, UserCheck } from "lucide-react";
import userService from "../../services/UserService";
import type { User } from "../../types/users";

interface QuotationFormProps {
  quotationData: QuotationData;
  onFieldChange: (field: keyof QuotationData, value: string | number | boolean | Date) => void;
  onCustomerIdChange: (customerId: string, customerDetails?: unknown) => void;
  onAddItem: (item: Omit<QuotationItem, 'id' | 'total'> & { total?: number }) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<QuotationItem>) => void;
  onTotalDiscountChange?: (discountType: 'percentage' | 'amount', discountValue: number) => void;
  inventoryItems: InventoryItem[];
}

const QuotationForm: React.FC<QuotationFormProps> = ({
  quotationData,
  onFieldChange,
  onCustomerIdChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onTotalDiscountChange,
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

  const [newItem, setNewItem] = useState<{
    inventoryItemId: string;
    itemName: string;
    productCode?: string;
    quantity: string | number;
    unitPrice: string | number;
    costPrice?: number;
    discountType: 'percentage' | 'amount';
    discountScope: 'per_unit' | 'total_qty';
    discountValue: string;
  }>({ 
    inventoryItemId: "",
    itemName: "",
    productCode: "",
    quantity: "0", 
    unitPrice: "0", 
    costPrice: 0,
    discountType: 'percentage',
    discountScope: 'per_unit',
    discountValue: "0"
  });

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

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerModalMode, setCustomerModalMode] = useState<'view' | 'create' | 'edit' | null>(null);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [importedOrderId, setImportedOrderId] = useState<string | null>(null);

  // Sales Officer list (users with role === 'salesman')
  const [salesmen, setSalesmen] = useState<User[]>([]);
  useEffect(() => {
    userService.getUsers().then(users => {
      const activeSalesmen = users.filter(u => u.role === 'salesman');
      setSalesmen(activeSalesmen);
      if (!quotationData.salesman?.id && activeSalesmen.length > 0) {
        const defaultOfficer = activeSalesmen[0];
        onFieldChange('salesman', { id: defaultOfficer.id, fullName: defaultOfficer.fullName, name: defaultOfficer.fullName } as any);
      }
    });
  }, []);

  const handleOrderImport = useCallback((po: PurchaseOrder) => {
    // Map PO items to quotation line items
    po.items.forEach(p => {
      const lineItem: Omit<QuotationItem, 'id' | 'total'> = {
        inventoryItemId: p.inventoryItemId || p.id,
        itemName: `${p.productName} (${p.sku})`,
        quantity: p.quantityOrdered,
        unitPrice: p.unitPrice,
      };
      onAddItem(lineItem);
    });
    setImportedOrderId(po.poNumber);
    onFieldChange('notes', po.notes ? `Ref PO: ${po.poNumber} — ${po.notes}` : `Ref PO: ${po.poNumber}`);
  }, [onAddItem, onFieldChange]);

  const stockWarning = null;

  const handleItemSelect = useCallback((inventoryItem: InventoryItem) => {
    setNewItem(prev => ({ 
      ...prev,
      inventoryItemId: inventoryItem.id,
      itemName: inventoryItem.productName,
      productCode: inventoryItem.productCode,
      quantity: "0", 
      unitPrice: (inventoryItem.sellPrice || 0).toString(),
      costPrice: inventoryItem.purchasePrice || 0,
      discountValue: "0"
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
      ...discountData
    }));
  }, []);

  const handlePaymentMethodChange = (method: string) => {
    onFieldChange('paymentMethod', method);
    if (method === PaymentMethod.CREDIT || method === 'credit') {
      const periodToUse = creditPeriod === 'custom' ? '30' : creditPeriod;
      handleCreditPeriodChange(periodToUse);
    } else {
      setCreditPeriod('custom');
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
    } else if (!quotationData.salesman?.id && salesmen.length > 0) {
      const defaultOfficer = salesmen[0];
      onFieldChange('salesman', { id: defaultOfficer.id, fullName: defaultOfficer.fullName, name: defaultOfficer.fullName } as any);
    }
  }, [onCustomerIdChange, setCustomerSearchTerm, setShowCustomerSuggestions, handleCreditPeriodChange, onFieldChange, salesmen, quotationData.salesman?.id]);

  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    onCustomerIdChange("");
    setCustomerSearchTerm("");
    setCustomerModalMode(null);
  }, [onCustomerIdChange, setCustomerSearchTerm]);

  const handleClearItemSelection = useCallback(() => {
    setNewItem({
      inventoryItemId: "",
      itemName: "",
      productCode: "",
      quantity: "0",
      unitPrice: "0",
      costPrice: 0,
      discountType: 'percentage',
      discountScope: 'per_unit',
      discountValue: "0"
    });
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
    if (itemData) {
      onAddItem(itemData);
    } else {
      const q = parseInt(newItem.quantity.toString()) || 1;
      const p = parseFloat(newItem.unitPrice.toString()) || 0;
      onAddItem({
        inventoryItemId: newItem.inventoryItemId,
        itemName: newItem.itemName,
        productCode: newItem.productCode,
        quantity: q,
        unitPrice: p,
        costPrice: newItem.costPrice || 0,
        discountType: newItem.discountType,
        discountScope: newItem.discountScope,
        discountValue: parseFloat(newItem.discountValue) || 0,
        discountAmount: 0,
        total: q * p
      });
    }

    handleClearItemSelection();
  }, [newItem, onAddItem, handleClearItemSelection]);

  const handleUpdateItemQuantity = useCallback((id: string, newQuantity: number) => {
    const item = quotationData.items.find(item => item.id === id);
    if (!item) return;
    
    // We allow the update but the UI will show a warning if stock is insufficient
    onUpdateItem(id, { quantity: newQuantity });
  }, [quotationData.items, onUpdateItem]);

  type CustomerFormData = Omit<Customer, 'id'> | Partial<Customer>;
  const handleCustomerFormSubmit = useCallback(async (formData: CustomerFormData) => {
    try {
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
        handleCreditPeriodChange(String(defaultPeriod));
      }
      setCustomerModalMode(null);
    } catch (error) {
      throw error;
    }
  }, [customerModalMode, selectedCustomer, updateCustomer, createCustomer, onCustomerIdChange, setCustomerSearchTerm, handleCreditPeriodChange, onFieldChange]);

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
            {/* Sales Officer Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <span className="flex items-center gap-1.5"><UserCheck size={16} className="text-purple-400" /> Sales Officer*</span>
              </label>
              <select
                value={quotationData.salesman?.id || (typeof quotationData.salesman === 'object' ? (quotationData.salesman as any)?.id : '') || ''}
                onChange={(e) => {
                  const selected = salesmen.find(s => s.id === e.target.value);
                  onFieldChange('salesman', selected ? { id: selected.id, fullName: selected.fullName, name: selected.fullName } as any : null as any);
                }}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
              >
                <option value="">— Select Sales Officer —</option>
                {salesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method*
              </label>
              <select
                value={quotationData.paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                required
              >
                {Object.values(PaymentMethod).map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date / Credit Period / Valid Until */}
          <div className={`grid grid-cols-1 ${quotationData.paymentMethod === PaymentMethod.CREDIT ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
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
            {quotationData.paymentMethod === PaymentMethod.CREDIT && (
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

            {/* Valid Until (Always editable) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valid Until*
              </label>
              <input
                type="date"
                value={quotationData.validUntil}
                onChange={(e) => {
                  setCreditPeriod('custom');
                  onFieldChange('validUntil', e.target.value);
                }}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                required
              />
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
        onDiscountChange={handleDiscountChange}
        onAddItem={handleAddItem}
        onClearSelection={handleClearItemSelection}
        stockWarning={stockWarning}
        quotationItems={quotationData.items}
      />

      {quotationData.items.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-5 space-y-4">
          <QuotationItemsList
            items={quotationData.items}
            inventoryItems={inventoryItems}
            onUpdateQuantity={handleUpdateItemQuantity}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
          />

          <QuotationSummary
            subTotal={subTotal}
            totalDiscountType={quotationData.totalDiscountType}
            totalDiscountValue={quotationData.totalDiscountValue}
            discountPercentage={quotationData.discountPercentage || 0}
            discountAmount={discountAmount}
            totalAmount={totalAmount}
            items={quotationData.items}
            inventoryItems={inventoryItems}
            onTotalDiscountChange={onTotalDiscountChange}
          />
        </div>
      )}
    </div>
  );
};

export default QuotationForm;
