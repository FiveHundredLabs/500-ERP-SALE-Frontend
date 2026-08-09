import type { 
  InventoryItem, 
  InventoryStats,
  DeleteInventoryRes 
} from "../types/inventory";
import { mockInventoryItems } from "../data/mockInventory";

export const inventoryService = {

  async getAll(): Promise<InventoryItem[]> {
    return [...mockInventoryItems];
  },

  async getNextId(): Promise<string> {
    return `INV-${mockInventoryItems.length + 10001}`;
  },

  async getById(id: string): Promise<InventoryItem> {
    const item = mockInventoryItems.find(i => i._id === id || i.id === id || i.product_code === id);
    if (item) return item;
    return mockInventoryItems[0];
  },

  async create(itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'sold_count'>): Promise<InventoryItem> {
    const newId = `inv-${Date.now()}`;
    const newItem: InventoryItem = {
      ...itemData,
      _id: newId,
      id: newId,
      sold_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockInventoryItems.unshift(newItem);
    return newItem;
  },

  async update(id: string, updateData: Partial<InventoryItem>): Promise<InventoryItem> {
    const item = mockInventoryItems.find(i => i._id === id || i.id === id || i.product_code === id);
    if (item) {
      Object.assign(item, updateData, { updated_at: new Date().toISOString() });
      return item;
    }
    return updateData as InventoryItem;
  },

  async delete(id: string): Promise<DeleteInventoryRes> {
    const index = mockInventoryItems.findIndex(i => i._id === id || i.id === id || i.product_code === id);
    if (index !== -1) {
      mockInventoryItems.splice(index, 1);
    }
    return { message: "Item deleted successfully" };
  },

  async getStats(): Promise<InventoryStats> {
    const items = mockInventoryItems;
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