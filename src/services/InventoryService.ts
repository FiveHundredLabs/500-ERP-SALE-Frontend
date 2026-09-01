import type { 
  InventoryItem, 
  InventoryStats,
  DeleteInventoryRes,
  CreateInventoryItemData,
  UpdateInventoryItemData,
  BulkImportResponse,
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
      productName: itemData.productName,
      productCode: itemData.productCode,
      inventoryCode: itemData.inventoryCode,
      soldCount: itemData.soldCount,
      status: itemData.status,
      purchasePrice: moneyToApi(itemData.purchasePrice),
      sellPrice: moneyToApi(itemData.sellPrice),
      discountRate: moneyToApi(itemData.discountRate),
      actualSoldPrice: moneyToApi(itemData.actualSoldPrice),
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

  async createBulk(
    items: CreateInventoryItemData[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<BulkImportResponse> {
    const payload = items.map((item) => ({
      productName: item.productName,
      productCode: item.productCode,
      inventoryCode: item.inventoryCode || item.productCode,
      soldCount: item.soldCount ?? 0,
      status: item.status || 'in_stock',
      purchasePrice: moneyToApi(item.purchasePrice),
      sellPrice: moneyToApi(item.sellPrice),
      discountRate: moneyToApi(item.discountRate),
      actualSoldPrice: moneyToApi(item.actualSoldPrice),
    }));

    const BATCH_SIZE = 100;
    let totalCreated = 0;
    let totalFailed = 0;
    let totalDuplicates = 0;
    const allErrors: Array<{ row?: number; code?: string; message: string }> = [];

    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const chunk = payload.slice(i, i + BATCH_SIZE);
      const res = await fetch(`${API_BASE}/inventory-items/bulk`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ items: chunk }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to import products (batch starting at row ${i + 1})`);
      }

      const batchResult: BulkImportResponse = await res.json();
      totalCreated += batchResult.created || 0;
      totalFailed += batchResult.failed || 0;
      totalDuplicates += batchResult.duplicates || 0;
      if (batchResult.errors && Array.isArray(batchResult.errors)) {
        allErrors.push(...batchResult.errors);
      }

      if (onProgress) {
        onProgress(Math.min(i + chunk.length, payload.length), payload.length);
      }
    }

    return {
      total: items.length,
      created: totalCreated,
      failed: totalFailed,
      duplicates: totalDuplicates,
      errors: allErrors,
    };
  },

  async update(id: string, updateData: UpdateInventoryItemData): Promise<InventoryItem> {
    const payload: any = {};
    if (updateData.productName !== undefined) payload.productName = updateData.productName;
    if (updateData.productCode !== undefined) payload.productCode = updateData.productCode;
    if (updateData.inventoryCode !== undefined) payload.inventoryCode = updateData.inventoryCode;
    if (updateData.soldCount !== undefined) payload.soldCount = updateData.soldCount;
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.purchasePrice !== undefined) payload.purchasePrice = moneyToApi(updateData.purchasePrice);
    if (updateData.sellPrice !== undefined) payload.sellPrice = moneyToApi(updateData.sellPrice);
    if (updateData.discountRate !== undefined) payload.discountRate = moneyToApi(updateData.discountRate);
    if (updateData.actualSoldPrice !== undefined) payload.actualSoldPrice = moneyToApi(updateData.actualSoldPrice);

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
export const createBulkInventoryItems = inventoryService.createBulk;
export const updateInventoryItem = inventoryService.update;
export const deleteInventoryItem = inventoryService.delete;
export const getInventoryStats = inventoryService.getStats;

