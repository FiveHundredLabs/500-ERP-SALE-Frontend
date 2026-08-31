import type { 
  InventoryItem, 
  InventoryStats,
  DeleteInventoryRes,
  CreateInventoryItemData,
  UpdateInventoryItemData,
} from "../types/inventory";
import { moneyToApi } from '../utils/money';
import { mapInventoryItem } from './apiMappers';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAuthHeaders(extraHeaders: Record<string, string> = {}) {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const inventoryService = {

  async getAll(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE}/inventory-items`, { 
      headers: getAuthHeaders(),
      credentials: 'include' 
    });
    if (!res.ok) throw new Error(`Failed to fetch inventory items`);
    return ((await res.json()) as unknown[]).map(mapInventoryItem);
  },

  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/inventory-items/next-id`, { 
      headers: getAuthHeaders(),
      credentials: 'include' 
    });
    if (!res.ok) throw new Error(`Failed to fetch next inventory ID`);
    const data = await res.json();
    return data.nextInventoryId || `INV-${Date.now()}`;
  },

  async getById(id: string): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory-items/${id}`, { 
      headers: getAuthHeaders(),
      credentials: 'include' 
    });
    if (!res.ok) throw new Error(`Failed to fetch item ${id}`);
    return mapInventoryItem(await res.json());
  },

  async create(itemData: CreateInventoryItemData): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory-items`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ ...itemData, purchasePrice: moneyToApi(itemData.purchasePrice), sellPrice: moneyToApi(itemData.sellPrice), discountRate: moneyToApi(itemData.discountRate), actualSoldPrice: moneyToApi(itemData.actualSoldPrice) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create item`);
    }
    return mapInventoryItem(await res.json());
  },

  async update(id: string, updateData: UpdateInventoryItemData): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory-items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ ...updateData, purchasePrice: updateData.purchasePrice === undefined ? undefined : moneyToApi(updateData.purchasePrice), sellPrice: updateData.sellPrice === undefined ? undefined : moneyToApi(updateData.sellPrice), discountRate: updateData.discountRate === undefined ? undefined : moneyToApi(updateData.discountRate), actualSoldPrice: updateData.actualSoldPrice === undefined ? undefined : moneyToApi(updateData.actualSoldPrice) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update item`);
    }
    return mapInventoryItem(await res.json());
  },

  async delete(id: string): Promise<DeleteInventoryRes> {
    const res = await fetch(`${API_BASE}/inventory-items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to delete item`);
    return { message: "Item deleted successfully" };
  },

  async getStats(): Promise<InventoryStats> {
    const items = await this.getAll().catch(() => []);
    return {
      totalItems: items.length,
      inStock: items.filter(item => item.status === 'in_stock').length,
      outOfStock: items.filter(item => item.status === 'out_of_stock').length,
      discontinued: items.filter(item => item.status === 'discontinued').length,
    };
  }
};

export const getAllInventoryItems = inventoryService.getAll;
export const getNextInventoryId = inventoryService.getNextId;
export const getInventoryItemById = inventoryService.getById;
export const createInventoryItem = inventoryService.create;
export const updateInventoryItem = inventoryService.update;
export const deleteInventoryItem = inventoryService.delete;
export const getInventoryStats = inventoryService.getStats;
