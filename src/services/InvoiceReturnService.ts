import type { InvoiceReturn, CreateInvoiceReturnDto } from '../types/invoice-return';
import { ReturnStatus } from '../types/invoice-return';
import { mapInvoiceReturn } from './apiMappers';
import { moneyToApi } from '../utils/money';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/invoice-returns`;

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const invoiceReturnService = {
  async getAll(): Promise<InvoiceReturn[]> {
    const response = await fetch(ENDPOINT, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice returns: ${response.statusText}`);
    }
    return ((await response.json()) as unknown[]).map(mapInvoiceReturn);
  },

  async getById(id: string): Promise<InvoiceReturn> {
    const response = await fetch(`${ENDPOINT}/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch invoice return: ${response.statusText}`);
    }
    return mapInvoiceReturn(await response.json());
  },

  async getByInvoiceId(invoiceId: string): Promise<InvoiceReturn[]> {
    const response = await fetch(`${ENDPOINT}/invoice/${encodeURIComponent(invoiceId)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch returns for invoice: ${response.statusText}`);
    }
    return ((await response.json()) as unknown[]).map(mapInvoiceReturn);
  },

  async create(data: CreateInvoiceReturnDto): Promise<InvoiceReturn> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ ...data, returnTotal: data.returnTotal === undefined ? undefined : moneyToApi(data.returnTotal), items: data.items.map(item => ({ ...item, unitPrice: item.unitPrice === undefined ? undefined : moneyToApi(item.unitPrice), total: item.total === undefined ? undefined : moneyToApi(item.total) })) }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create invoice return: ${response.statusText}`);
    }
    return mapInvoiceReturn(await response.json());
  },

  async updateStatus(id: string, status: ReturnStatus): Promise<InvoiceReturn> {
    const response = await fetch(`${ENDPOINT}/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update status: ${response.statusText}`);
    }
    return mapInvoiceReturn(await response.json());
  },
};
