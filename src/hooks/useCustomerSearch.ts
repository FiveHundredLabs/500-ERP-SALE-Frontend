import { useState, useEffect, useCallback } from 'react';
import { quotationService } from '../services/QuotationService';

export interface Customer {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  vatNumber: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
    zip?: string;
  };
  vehicle_number?: string;
  vehicle_model?: string;
  year_of_manufacture?: number;
  customerCode?: string;
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
        setAllCustomers(customers);
      } catch (err) {
        console.error('Error loading customers:', err);
        setError('Failed to load customers');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(allCustomers);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase().trim();
    const filtered = allCustomers.filter(customer => {
      const matchesName = customer.fullName?.toLowerCase().includes(searchTermLower);
      const matchesCode = customer.customerCode?.toLowerCase().includes(searchTermLower);
      return matchesName || matchesCode;
    });
    
    setFilteredCustomers(filtered);
  }, [searchTerm, allCustomers]);

  const refreshCustomers = useCallback(async () => {
    try {
      const customers = await quotationService.getAllCustomers();
      setAllCustomers(customers);
    } catch (err) {
      console.error('Error refreshing customers:', err);
    }
  }, []);

  const createCustomer = useCallback(async (customerData: Omit<Customer, '_id'>) => {
    try {
      const createdCustomer = await quotationService.createCustomer(customerData);
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
