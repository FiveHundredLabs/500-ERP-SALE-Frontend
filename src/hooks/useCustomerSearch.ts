import { useState, useEffect, useCallback } from 'react';
import { quotationService } from '../services/QuotationService';

export interface Customer {
  _id: string;
  shopName?: string;
  fullName: string;
  contactPerson?: string;
  phone: string;              // WhatsApp (Primary)
  phone2?: string;            // Secondary
  phone3?: string;            // Alternative
  address?: string | {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  city?: string;
  customerCode?: string;
  creditLimit?: number;
  salesRep?: { id: string; name: string } | string;
  salesRepName?: string;
  vehicle_number?: string;
  vehicle_model?: string;
  year_of_manufacture?: number;
}

export const useCustomerSearch = () => {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all customers on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const customers = await quotationService.getAllCustomers();
        setAllCustomers(customers as Customer[]);
      } catch (err) {
        console.error('Error loading customers:', err);
        setError('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomers();
  }, []);

  // Filter customers based on search term (Prefix / first-letter matches first, then alphabetical)
  useEffect(() => {
    if (!searchTerm.trim()) {
      const sorted = [...allCustomers].sort((a, b) => (a.fullName || a.shopName || '').localeCompare(b.fullName || b.shopName || ''));
      setFilteredCustomers(sorted);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const matching = allCustomers.filter(customer => {
      const name = (customer.shopName || customer.fullName || '').toLowerCase();
      const contact = (customer.contactPerson || '').toLowerCase();
      const code = (customer.customerCode || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      return name.includes(searchTermLower) || contact.includes(searchTermLower) || code.includes(searchTermLower) || phone.includes(searchTermLower);
    });

    const sorted = matching.sort((a, b) => {
      const aName = (a.shopName || a.fullName || '').toLowerCase();
      const bName = (b.shopName || b.fullName || '').toLowerCase();
      const aStarts = aName.startsWith(searchTermLower);
      const bStarts = bName.startsWith(searchTermLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });

    setFilteredCustomers(sorted);
  }, [searchTerm, allCustomers]);

  const refreshCustomers = useCallback(async () => {
    try {
      const customers = await quotationService.getAllCustomers();
      setAllCustomers(customers as Customer[]);
    } catch (err) {
      console.error('Error refreshing customers:', err);
    }
  }, []);

  const createCustomer = useCallback(async (customerData: Omit<Customer, '_id'>) => {
    try {
      const createdCustomer = await quotationService.createCustomer(customerData as any);
      await refreshCustomers();
      return createdCustomer;
    } catch (err) {
      console.error('Error creating customer:', err);
      throw err;
    }
  }, [refreshCustomers]);

  const updateCustomer = useCallback(async (customerId: string, customerData: Partial<Customer>) => {
    try {
      const updatedCustomer = await quotationService.updateCustomer(customerId, customerData as any);
      await refreshCustomers();
      return updatedCustomer;
    } catch (err) {
      console.error('Error updating customer:', err);
      throw err;
    }
  }, [refreshCustomers]);

  return {
    allCustomers,
    filteredCustomers,
    searchTerm,
    setSearchTerm,
    showSuggestions,
    setShowSuggestions,
    isLoading,
    error,
    refreshCustomers,
    createCustomer,
    updateCustomer,
  };
};
