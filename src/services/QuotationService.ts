import type { 
  QuotationResponse,
  BackendQuotationData,
  QuotationStatusType,
  QuotationCustomer 
} from "../types/quotation";
import type { InventoryItem } from "../types/inventory"; 
import { moneyToApi } from '../utils/money';
import { mapCustomer, mapInventoryItem, mapQuotation } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function toQuotationPayload(data: Partial<BackendQuotationData>) {
  const encodeMoney = (value: number | undefined) => value === undefined ? undefined : moneyToApi(value);
  return {
    ...data,
    subTotal: encodeMoney(data.subTotal), discount: encodeMoney(data.discount), totalAmount: encodeMoney(data.totalAmount),
    items: data.items?.map(item => ({ ...item, unitPrice: encodeMoney(item.unitPrice), total: encodeMoney(item.total) })),
  };
}

export interface NextQuotationNumberResponse {
  nextQuotationNumber: string;
}

export interface DeleteQuotationResponse {
  message: string;
}

export const quotationService = {
  // Get all quotations
  async getAll(): Promise<QuotationResponse[]> {
    const res = await fetch(`${API_BASE}/quotations`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch quotations: ${res.statusText}`);
    return ((await res.json()) as unknown[]).map(mapQuotation);
  },

  // Get all customers
  async getAllCustomers(): Promise<QuotationCustomer[]> {
    const res = await fetch(`${API_BASE}/customers`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
    return ((await res.json()) as unknown[]).map(mapCustomer);
  },

  // Get next quotation ID
  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/quotations/next-id`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch next quotation ID: ${res.statusText}`);
    const data = await res.json();
    return data.nextQuotationNumber || `QUO-${Date.now()}`;
  },

  // Get quotation by ID
  async getById(id: string): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Quotation with ID "${id}" not found.`);
    return mapQuotation(await res.json());
  },

  // Get quotation by quotationNumber
  async getByQuotationId(quotationNumber: string): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/number/${encodeURIComponent(quotationNumber)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Quotation "${quotationNumber}" not found.`);
    return res.json();
  },

  // Create new quotation
  async create(quotationData: BackendQuotationData): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(toQuotationPayload(quotationData)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create quotation`);
    }
    return mapQuotation(await res.json());
  },

  // Update quotation
  async update(id: string, updateData: Partial<BackendQuotationData>): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(toQuotationPayload(updateData)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update quotation`);
    }
    return mapQuotation(await res.json());
  },

  // Update status
  async updateStatus(id: string, status: QuotationStatusType): Promise<QuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update status`);
    }
    return mapQuotation(await res.json());
  },

  // Delete quotation
  async delete(id: string): Promise<DeleteQuotationResponse> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to delete quotation`);
    }
    return res.json();
  },

  // Get inventory items for dropdown
  async getInventoryItems(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory-items`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to fetch inventory items`);
    return ((await res.json()) as unknown[]).map(mapInventoryItem);
  },

  // Create new customer
  async createCustomer(customerData: Omit<QuotationCustomer, 'id' | 'customerCode'>) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    if (!res.ok) throw new Error(`Failed to create customer`);
    return res.json();
  },

  // Update customer
  async updateCustomer(customerId: string, customerData: Omit<QuotationCustomer, 'id' | 'customerCode'>) {
    const res = await fetch(`${API_BASE}/customers/${customerId}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(customerData),
    });
    if (!res.ok) throw new Error(`Failed to update customer`);
    return res.json();
  }
};
