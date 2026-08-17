import type { Customer } from '../types/customers';

export const mockCustomers: Customer[] = [
  {
    id: '1', customerId: 'CUST-00101', businessName: 'Lanka Hardware Traders', contactPerson: 'Mahinda Rajapaksha',
    phone: '011-255-4321', email: 'info@lankahardware.lk', address: '45, Main Street, Pettah', city: 'Colombo', district: 'Colombo',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 5000000, paymentTerms: 'Net 30',
    totalOrders: 28, totalSales: 18500000, outstandingBalance: 320000,
    createdAt: '2024-03-15T00:00:00Z', updatedAt: '2026-08-10T00:00:00Z',
  },
  {
    id: '2', customerId: 'CUST-00102', businessName: 'Galle Hardware Palace', contactPerson: 'Suresh Mendis',
    phone: '091-234-5678', email: 'suresh@gallehw.lk', address: '23, Colombo Road', city: 'Galle', district: 'Galle',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 2000000, paymentTerms: 'Cash on Delivery',
    totalOrders: 18, totalSales: 12400000, outstandingBalance: 0,
    createdAt: '2024-05-20T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z',
  },
  {
    id: '3', customerId: 'CUST-00103', businessName: 'Modern Build Solutions', contactPerson: 'Chamara Wickramasinghe',
    phone: '033-456-7890', email: 'chamara@modernbuild.lk', address: '45, Kandy Road', city: 'Gampaha', district: 'Gampaha',
    customerType: 'Contractor', status: 'Active', creditLimit: 3000000, paymentTerms: 'Net 15',
    totalOrders: 15, totalSales: 5600000, outstandingBalance: 77700,
    createdAt: '2024-07-10T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z',
  },
  {
    id: '4', customerId: 'CUST-00104', businessName: 'Kandy Construction Supplies', contactPerson: 'Pradeep Weerasekara',
    phone: '081-234-5678', email: 'pradeep@kandycon.lk', address: '23, Peradeniya Road', city: 'Kandy', district: 'Kandy',
    customerType: 'Distributor', status: 'Active', creditLimit: 8000000, paymentTerms: 'Net 45',
    totalOrders: 42, totalSales: 35000000, outstandingBalance: 585000,
    createdAt: '2023-11-05T00:00:00Z', updatedAt: '2026-08-11T00:00:00Z',
  },
  {
    id: '5', customerId: 'CUST-00105', businessName: 'Nirosha Hardware Mart', contactPerson: 'Nirosha Bandara',
    phone: '011-234-5678', email: 'nirosha@nirhw.lk', address: '145, Baseline Road', city: 'Colombo 09', district: 'Colombo',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 1000000, paymentTerms: 'Cash on Delivery',
    totalOrders: 12, totalSales: 1650000, outstandingBalance: 8885,
    createdAt: '2025-01-12T00:00:00Z', updatedAt: '2026-08-12T00:00:00Z',
  },
  {
    id: '6', customerId: 'CUST-00106', businessName: 'Up Country Hardware', contactPerson: 'Priyantha Hewage',
    phone: '081-345-6789', email: 'priyantha@upcohw.lk', address: '67, Clock Tower Road', city: 'Nuwara Eliya', district: 'Nuwara Eliya',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 1500000, paymentTerms: 'Net 15',
    totalOrders: 19, totalSales: 4200000, outstandingBalance: 39025,
    createdAt: '2024-02-28T00:00:00Z', updatedAt: '2026-08-10T00:00:00Z',
  },
  {
    id: '7', customerId: 'CUST-00107', businessName: 'Saman Building Materials', contactPerson: 'Saman Rathnayake',
    phone: '011-456-7890', email: 'saman@samanbm.lk', address: '78, High Level Road', city: 'Maharagama', district: 'Colombo',
    customerType: 'Retailer', status: 'Active', creditLimit: 4000000, paymentTerms: 'Net 30',
    totalOrders: 35, totalSales: 29500000, outstandingBalance: 243850,
    createdAt: '2023-09-18T00:00:00Z', updatedAt: '2026-08-12T00:00:00Z',
  },
  {
    id: '8', customerId: 'CUST-00108', businessName: 'City Plumbing & Electrical', contactPerson: 'Nalika Perera',
    phone: '011-567-8901', email: 'nalika@cityplumb.lk', address: '34, Deans Road', city: 'Colombo 10', district: 'Colombo',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 1500000, paymentTerms: 'Cash on Delivery',
    totalOrders: 8, totalSales: 1200000, outstandingBalance: 0,
    createdAt: '2025-03-01T00:00:00Z', updatedAt: '2026-08-05T00:00:00Z',
  },
  {
    id: '9', customerId: 'CUST-00109', businessName: 'Jayantha Hardware & Paint', contactPerson: 'Jayantha Dissanayake',
    phone: '033-234-5678', email: 'jayantha@jayhw.lk', address: '12, New Kandy Road', city: 'Kadawatha', district: 'Gampaha',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 2500000, paymentTerms: 'Net 30',
    totalOrders: 26, totalSales: 11200000, outstandingBalance: 278310,
    createdAt: '2024-04-10T00:00:00Z', updatedAt: '2026-08-11T00:00:00Z',
  },
  {
    id: '10', customerId: 'CUST-00110', businessName: 'Ravi Plumbing & Hardware', contactPerson: 'Ravi Kumar',
    phone: '011-678-9012', email: 'ravi@raviplumb.lk', address: '89, Stanley Thilakaratne Mawatha', city: 'Nugegoda', district: 'Colombo',
    customerType: 'Hardware Shop', status: 'Active', creditLimit: 1500000, paymentTerms: 'Net 15',
    totalOrders: 16, totalSales: 3400000, outstandingBalance: 53815,
    createdAt: '2024-06-22T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z',
  },
];
