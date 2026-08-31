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
    const payload = {
      ...itemData,
      product_name: itemData.productName,
      product_code: itemData.productCode,
      sold_count: itemData.soldCount,
      purchase_price: moneyToApi(itemData.purchasePrice),
      sell_price: moneyToApi(itemData.sellPrice),
      discount_rate: moneyToApi(itemData.discountRate),
      actual_sold_price: moneyToApi(itemData.actualSoldPrice),
      shipment_code: itemData.shipmentCode,
    };
    
    const res = await fetch(`${API_BASE}/inventory-items`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create item`);
    }
    return mapInventoryItem(await res.json());
  },

  async update(id: string, updateData: UpdateInventoryItemData): Promise<InventoryItem> {
    const payload: any = { ...updateData };
    if (updateData.productName !== undefined) payload.product_name = updateData.productName;
    if (updateData.productCode !== undefined) payload.product_code = updateData.productCode;
    if (updateData.soldCount !== undefined) payload.sold_count = updateData.soldCount;
    if (updateData.purchasePrice !== undefined) payload.purchase_price = moneyToApi(updateData.purchasePrice);
    if (updateData.sellPrice !== undefined) payload.sell_price = moneyToApi(updateData.sellPrice);
    if (updateData.discountRate !== undefined) payload.discount_rate = moneyToApi(updateData.discountRate);
    if (updateData.actualSoldPrice !== undefined) payload.actual_sold_price = moneyToApi(updateData.actualSoldPrice);
    if (updateData.shipmentCode !== undefined) payload.shipment_code = updateData.shipmentCode;

    const res = await fetch(`${API_BASE}/inventory-items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
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
