import React, { useRef } from 'react';
import { Search, UserPlus, User, X, Edit, Eye } from 'lucide-react';
import type { Customer } from '../../hooks/useCustomerSearch';
import { useClickOutside } from '../../hooks/useClickOutside';

interface CustomerSearchAndManagementProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  filteredCustomers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onClearCustomer: () => void;
  onOpenCreateCustomer: () => void;
  onViewCustomer: () => void;
  onEditCustomer: () => void;
}

export const CustomerSearchAndManagement: React.FC<CustomerSearchAndManagementProps> = ({
  searchTerm,
  onSearchChange,
  showSuggestions,
  onShowSuggestionsChange,
  filteredCustomers,
  selectedCustomer,
  onCustomerSelect,
  onClearCustomer,
  onOpenCreateCustomer,
  onViewCustomer,
  onEditCustomer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useClickOutside([containerRef], () => {
    onShowSuggestionsChange(false);
  });

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-semibold text-gray-200">Customer Information</h3>
        {selectedCustomer && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <User className="w-4 h-4" />
            <span>Customer: {selectedCustomer.fullName}</span>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={onViewCustomer}
                className="p-1 hover:bg-[#0f172a] rounded transition text-green-400"
                title="View Customer Details"
                aria-label="View customer details"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={onEditCustomer}
                className="p-1 hover:bg-[#0f172a] rounded transition text-green-400"
                title="Edit Customer Details"
                aria-label="Edit customer details"
              >
                <Edit className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Search Customer*
          </label>
          <button
            onClick={onOpenCreateCustomer}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition"
          >
            <UserPlus className="w-3 h-3" />
            Add New Customer
          </button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value;
              onSearchChange(value);
              onShowSuggestionsChange(true);
            }}
            onFocus={() => onShowSuggestionsChange(true)}
            onClick={() => onShowSuggestionsChange(true)}
            placeholder="Search by customer name..."
            className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-10 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search by customer name"
          />
          {searchTerm && (
            <button
              onClick={onClearCustomer}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              aria-label="Clear customer selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {/* Customer Search Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute z-20 w-full mt-1 bg-[#0f172a] border border-[#334155] rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase bg-[#1e293b]/60 flex justify-between">
                <span>{searchTerm ? `Matching customers (${filteredCustomers.length})` : `All available customers (${filteredCustomers.length})`}</span>
                <span className="text-[10px] text-gray-500">Customer Name</span>
              </div>
              {filteredCustomers.length === 0 ? (
                <div className="px-3 py-3 text-gray-400 text-sm italic border-b border-[#334155]">
                  No customers found matching "{searchTerm}"
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer._id}
                    className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer border-b border-[#334155] last:border-b-0 transition-colors duration-150"
                    onClick={() => onCustomerSelect(customer)}
                  >
                    <div className="font-medium text-white">{customer.shopName || customer.fullName || 'Unnamed Customer'}</div>
                    <div className="text-sm text-gray-400 flex justify-between mt-1">
                      <span>Phone: {customer.phone || 'N/A'}</span>
                      <span className="text-cyan-400 font-mono text-xs">{customer.customerCode || ''}</span>
                    </div>
                    {customer.address && (
                      <div className="text-xs text-gray-400 mt-1">
                        Address: {typeof customer.address === 'string' 
                          ? customer.address 
                          : `${customer.address.street || ''} ${customer.address.city || ''}`}
                      </div>
                    )}
                    {customer.vehicle_number && (
                      <div className="text-xs text-gray-500 mt-1">
                        Vehicle: {customer.vehicle_number} {customer.vehicle_model && `(${customer.vehicle_model})`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Search by phone number, name, or email.
        </div>
      </div>
    </div>
  );
};
