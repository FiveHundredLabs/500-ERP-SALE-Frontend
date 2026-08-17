import type { 
  QuotationResponse,
  BackendQuotationData,
  QuotationStatusType,
  QuotationCustomer 
} from "../types/quotation";
import type { InventoryItem } from "../types/inventory"; 
import { mockQuotationsList } from "../data/mockQuotations";
import { mockCustomers } from "../data/mockCustomers";
import { mockInventoryItems } from "../data/mockInventory";

export interface NextQuotationIdResponse {
  nextQuotationId: string;
}

export interface DeleteQuotationResponse {
  message: string;
}

export const quotationService = {
  // Get all quotations
  async getAll(): Promise<QuotationResponse[]> {
    return [...mockQuotationsList];
  },

  // Get all customers
  async getAllCustomers(): Promise<QuotationCustomer[]> {
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

  // Get next quotation ID
  async getNextId(): Promise<string> {
    const nextNum = mockQuotationsList.length + 1;
    const pad = nextNum.toString().padStart(3, '0');
    return `QUO-2026-${pad}`;
  },

  // Get quotation by ID - Public
  async getById(id: string): Promise<QuotationResponse> {
    const found = mockQuotationsList.find(q => q._id === id || q.quotationId === id);
    if (found) return found;
    return mockQuotationsList[0];
  },

  // Get quotation by quotationId
  async getByQuotationId(quotationId: string): Promise<QuotationResponse> {
    const found = mockQuotationsList.find(q => q.quotationId === quotationId || q._id === quotationId);
    if (found) return found;
    return mockQuotationsList[0];
  },

  // Create new quotation
  async create(quotationData: BackendQuotationData): Promise<QuotationResponse> {
    const nextIdStr = `QUO-2026-${(mockQuotationsList.length + 1).toString().padStart(3, '0')}`;
    const newQuo: QuotationResponse = {
      _id: `quo-${Date.now()}`,
      quotationId: quotationData.quotationId || nextIdStr,
      customer: typeof quotationData.customer === 'string' ? {
        _id: quotationData.customer,
        fullName: 'Customer ' + quotationData.customer,
        email: '',
        phone: '',
        vatNumber: '',
        customerCode: 'CUST-001'
      } : (quotationData.customer as any),
      items: quotationData.items || [],
      subTotal: quotationData.subTotal || 0,
      discount: quotationData.discount || 0,
      totalAmount: quotationData.totalAmount || 0,
      paymentMethod: quotationData.paymentMethod || 'Cash',
      issueDate: quotationData.issueDate || new Date().toISOString(),
      validUntil: quotationData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: quotationData.status || 'Pending',
      notes: quotationData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockQuotationsList.unshift(newQuo);
    return newQuo;
  },

  // Update quotation
  async update(quotationId: string, updateData: Partial<BackendQuotationData>): Promise<QuotationResponse> {
    const found = mockQuotationsList.find(q => q._id === quotationId || q.quotationId === quotationId);
    if (found) {
      Object.assign(found, updateData, { updatedAt: new Date().toISOString() });
      return found;
    }
    return mockQuotationsList[0];
  },

  // Update status
  async updateStatus(quotationId: string, status: QuotationStatusType): Promise<QuotationResponse> {
    const found = mockQuotationsList.find(q => q._id === quotationId || q.quotationId === quotationId);
    if (found) {
      found.status = status;
      return found;
    }
    return mockQuotationsList[0];
  },

  // Delete quotation
  async delete(quotationId: string): Promise<DeleteQuotationResponse> {
    const index = mockQuotationsList.findIndex(q => q._id === quotationId || q.quotationId === quotationId);
    if (index !== -1) {
      mockQuotationsList.splice(index, 1);
    }
    return { message: "Quotation deleted successfully" };
  },

  // Get inventory items for dropdown
  async getInventoryItems(): Promise<InventoryItem[]> {
    return mockInventoryItems;
  },

  // Create new customer
  async createCustomer(customerData: Omit<QuotationCustomer, '_id' | 'customerCode'>) {
    const newCust: QuotationCustomer = {
      ...customerData,
      _id: `cust-${Date.now()}`,
      customerCode: `CUST-${Math.floor(100 + Math.random() * 900)}`
    };
    return newCust;
  },

  // Update customer
  async updateCustomer(customerId: string, customerData: Omit<QuotationCustomer, '_id' | 'customerCode'>) {
    return {
      ...customerData,
      _id: customerId,
      customerCode: 'CUST-001'
    };
  }
};