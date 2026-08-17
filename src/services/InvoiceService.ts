import type { 
  InvoiceResponse,
  BackendInvoiceData,
  PaymentStatusType,
  InvoiceCustomer 
} from "../types/invoice";
import type { InventoryItem } from "../types/inventory"; 
import { mockInvoicesList } from "../data/mockInvoices";
import { mockCustomers } from "../data/mockCustomers";
import { mockInventoryItems } from "../data/mockInventory";

export interface NextInvoiceIdResponse {
  nextInvoiceId: string;
}

export interface DeleteInvoiceResponse {
  message: string;
}

export interface SalesOverviewResponse {
  period: string;
  totalSales: number;
  totalProducts: number;
  weeklyData: Array<{
    week: string;
    sales: number;
    products: number;
  }>;
}

export const invoiceService = {
  // Get all invoices
  async getAll(): Promise<InvoiceResponse[]> {
    return [...mockInvoicesList];
  },

  // Get all customers
  async getAllCustomers(): Promise<InvoiceCustomer[]> {
    return mockCustomers.map((c, idx) => ({
      _id: c.id,
      fullName: c.businessName || c.contactPerson,
      email: c.email || '',
      phone: c.phone || '',
      vatNumber: `LKR-${(100000000 + (idx + 1) * 98765).toString().substring(0, 9)}-VAT`,
      customerCode: c.customerId,
      address: {
        street: c.address,
        city: c.city,
        country: 'Sri Lanka',
        zip: '00100'
      }
    }));
  },

  // Get next invoice ID
  async getNextId(): Promise<string> {
    const nextNum = mockInvoicesList.length + 1;
    return `INV-2026-${nextNum.toString().padStart(3, '0')}`;
  },

  // Get invoice by ID - Public
  async getById(id: string): Promise<InvoiceResponse> {
    const found = mockInvoicesList.find(i => i._id === id || i.invoiceId === id);
    if (found) return found;
    return mockInvoicesList[0];
  },

  // Get invoice by invoiceId
  async getByInvoiceId(invoiceId: string): Promise<InvoiceResponse> {
    const found = mockInvoicesList.find(i => i.invoiceId === invoiceId || i._id === invoiceId);
    if (found) return found;
    return mockInvoicesList[0];
  },

  // Create new invoice
  async create(invoiceData: BackendInvoiceData): Promise<InvoiceResponse> {
    const nextIdStr = `INV-2026-${(mockInvoicesList.length + 1).toString().padStart(3, '0')}`;
    const newInv: InvoiceResponse = {
      _id: `inv-${Date.now()}`,
      invoiceId: invoiceData.invoiceId || nextIdStr,
      customer: typeof invoiceData.customer === 'string' ? {
        _id: invoiceData.customer,
        fullName: 'Customer ' + invoiceData.customer,
        email: '',
        phone: '',
        vatNumber: '',
        customerCode: 'CUST-001'
      } : (invoiceData.customer as any),
      items: invoiceData.items || [],
      subTotal: invoiceData.subTotal || 0,
      discount: invoiceData.discount || 0,
      totalAmount: invoiceData.totalAmount || 0,
      paymentStatus: invoiceData.paymentStatus || 'Pending',
      paymentMethod: invoiceData.paymentMethod || 'Cash',
      issueDate: invoiceData.issueDate || new Date().toISOString(),
      dueDate: invoiceData.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleNumber: invoiceData.vehicleNumber || '',
      notes: invoiceData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockInvoicesList.unshift(newInv);
    return newInv;
  },

  // Update invoice
  async update(invoiceId: string, updateData: Partial<BackendInvoiceData>): Promise<InvoiceResponse> {
    const found = mockInvoicesList.find(i => i._id === invoiceId || i.invoiceId === invoiceId);
    if (found) {
      Object.assign(found, updateData, { updated_at: new Date().toISOString() });
      return found;
    }
    return mockInvoicesList[0];
  },

  // Update status
  async updatePaymentStatus(invoiceId: string, paymentStatus: PaymentStatusType): Promise<InvoiceResponse> {
    const found = mockInvoicesList.find(i => i._id === invoiceId || i.invoiceId === invoiceId);
    if (found) {
      found.paymentStatus = paymentStatus;
      return found;
    }
    return mockInvoicesList[0];
  },

  // Delete invoice
  async delete(invoiceId: string): Promise<DeleteInvoiceResponse> {
    const index = mockInvoicesList.findIndex(i => i._id === invoiceId || i.invoiceId === invoiceId);
    if (index !== -1) {
      mockInvoicesList.splice(index, 1);
    }
    return { message: "Invoice deleted successfully" };
  },

  // Get inventory items for dropdown
  async getInventoryItems(): Promise<InventoryItem[]> {
    return mockInventoryItems;
  },

  // Create new customer
  async createCustomer(customerData: Omit<InvoiceCustomer, '_id' | 'customerCode'>) {
    const newCust: InvoiceCustomer = {
      ...customerData,
      _id: `cust-${Date.now()}`,
      customerCode: `CUST-${Math.floor(100 + Math.random() * 900)}`
    };
    return newCust;
  },

  // Update customer
  async updateCustomer(customerId: string, customerData: Omit<InvoiceCustomer, '_id' | 'customerCode'>) {
    return {
      ...customerData,
      _id: customerId,
      customerCode: 'CUST-001'
    };
  }
};