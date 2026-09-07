import type { PurchaseOrderReturn, CreatePOReturnDto, POReturnStatus } from '../types/po-return';
import { mapPOReturn } from './apiMappers';
import { moneyToApi } from '../utils/money';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/purchase-order-returns`;

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const poReturnService = {
  async getAll(): Promise<PurchaseOrderReturn[]> {
    const response = await fetch(ENDPOINT, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch PO returns: ${response.statusText}`);
    }
    return ((await response.json()) as unknown[]).map(mapPOReturn);
  },

  async getById(id: string): Promise<PurchaseOrderReturn> {
    const response = await fetch(`${ENDPOINT}/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch PO return: ${response.statusText}`);
    }
    return mapPOReturn(await response.json());
  },

  async getByPurchaseOrderId(poId: string): Promise<PurchaseOrderReturn[]> {
    const response = await fetch(`${ENDPOINT}/by-po/${encodeURIComponent(poId)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch returns for PO: ${response.statusText}`);
    }
    return ((await response.json()) as unknown[]).map(mapPOReturn);
  },

  async create(data: CreatePOReturnDto): Promise<PurchaseOrderReturn> {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({
        ...data,
        returnTotal: data.returnTotal === undefined ? undefined : moneyToApi(data.returnTotal),
        items: data.items.map(item => ({
          ...item,
          unitPrice: item.unitPrice === undefined ? undefined : moneyToApi(item.unitPrice),
          total: item.total === undefined ? undefined : moneyToApi(item.total),
        })),
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to create PO return: ${response.statusText}`);
    }
    return mapPOReturn(await response.json());
  },

  async updateStatus(id: string, status: POReturnStatus): Promise<PurchaseOrderReturn> {
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
    return mapPOReturn(await response.json());
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await fetch(`${ENDPOINT}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete PO return: ${response.statusText}`);
    }
    return response.json();
  },
};
