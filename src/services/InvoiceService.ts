import type { 
  InvoiceResponse,
  BackendInvoiceData,
  PaymentStatusType,
  InvoiceCustomer,
  InvoicePaymentRecord 
} from "../types/invoice";
import type { InventoryItem } from "../types/inventory"; 
import { mockInvoicesList } from "../data/mockInvoices";
import { mockCustomers } from "../data/mockCustomers";
import { mockInventoryItems } from "../data/mockInventory";
import { extractCityFromAddress } from "../types/customers";

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
    return mockCustomers.map((c) => ({
      _id: c.id,
      shopName: c.shopName || c.businessName,
      fullName: c.shopName || c.businessName || 'Customer',
      contactPerson: c.contactPerson || '',
      phone: c.phone || '+94705787818',
      phone2: c.phone2 || '',
      phone3: c.phone3 || '',
      customerCode: c.customerId,
      creditLimit: c.creditLimit || 1000000,
      salesRep: c.salesRep,
      salesRepName: c.salesRepName,
      address: c.address,
      city: c.city || extractCityFromAddress(c.address),
    }));
  },

  // Get next invoice ID
  async getNextId(): Promise<string> {
    const nextNum = mockInvoicesList.length + 1;
    return `INV-2026-${nextNum.toString().padStart(3, '0')}`;
  },

  // Get invoice by ID
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
    const totalAmount = invoiceData.totalAmount || 0;
    const paidAmount = invoiceData.paidAmount || (invoiceData.paymentStatus === 'Completed' ? totalAmount : 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const newInv: InvoiceResponse = {
      _id: `inv-${Date.now()}`,
      invoiceId: invoiceData.invoiceId || nextIdStr,
      customer: typeof invoiceData.customer === 'string' ? {
        _id: invoiceData.customer,
        shopName: 'Customer ' + invoiceData.customer,
        fullName: 'Customer ' + invoiceData.customer,
        phone: '',
        customerCode: 'CUST-001'
      } : (invoiceData.customer as any),
      items: invoiceData.items || [],
      subTotal: invoiceData.subTotal || 0,
      discount: invoiceData.discount || 0,
      totalAmount,
      paidAmount,
      remainingAmount,
      payments: invoiceData.payments || [],
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
      if (updateData.paidAmount !== undefined) {
        found.remainingAmount = Math.max(0, found.totalAmount - updateData.paidAmount);
      }
      return found;
    }
    return mockInvoicesList[0];
  },

  // Update status and payment amount
  async updatePaymentStatus(
    invoiceId: string, 
    paymentStatus: PaymentStatusType, 
    paymentRecord?: InvoicePaymentRecord
  ): Promise<InvoiceResponse> {
    const found = mockInvoicesList.find(i => i._id === invoiceId || i.invoiceId === invoiceId);
    if (found) {
      found.paymentStatus = paymentStatus;
      if (paymentRecord) {
        if (!found.payments) found.payments = [];
        found.payments.unshift(paymentRecord);
        found.paidAmount = (found.paidAmount || 0) + paymentRecord.amount;
        found.remainingAmount = Math.max(0, found.totalAmount - found.paidAmount);
      } else if (paymentStatus === 'Completed' || paymentStatus === 'Paid') {
        found.paidAmount = found.totalAmount;
        found.remainingAmount = 0;
      }
      found.updated_at = new Date().toISOString();
      return found;
    }
    return mockInvoicesList[0];
  },

  // Record bulk payment against multiple invoices
  async recordBulkPayment(
    allocations: Array<{ invoiceId: string; amount: number }>,
    paymentDetails: {
      transactionId: string;
      paymentMethod: string;
      reference?: string;
      bankName?: string;
      date?: string;
      notes?: string;
    }
  ): Promise<InvoiceResponse[]> {
    const updatedInvoices: InvoiceResponse[] = [];
    const date = paymentDetails.date || new Date().toISOString();

    for (const alloc of allocations) {
      if (alloc.amount <= 0) continue;
      const invoice = mockInvoicesList.find(i => i._id === alloc.invoiceId || i.invoiceId === alloc.invoiceId);
      if (invoice) {
        if (!invoice.payments) invoice.payments = [];
        const record: InvoicePaymentRecord = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          transactionId: paymentDetails.transactionId,
          amount: alloc.amount,
          date: date,
          paymentMethod: paymentDetails.paymentMethod,
          reference: paymentDetails.reference,
          bankName: paymentDetails.bankName,
          notes: paymentDetails.notes,
        };
        invoice.payments.unshift(record);
        invoice.paidAmount = (invoice.paidAmount || 0) + alloc.amount;
        invoice.remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
        
        if (invoice.remainingAmount <= 0) {
          invoice.paymentStatus = 'Completed';
        } else {
          invoice.paymentStatus = 'Partially Paid';
        }
        invoice.updated_at = new Date().toISOString();
        updatedInvoices.push(invoice);
      }
    }
    return updatedInvoices;
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