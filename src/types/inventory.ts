export type InventoryStatus = 'in_stock' | 'out_of_stock' | 'discontinued';

export interface InventoryItem {
  id: string;
  inventoryCode: string;
  productName: string;
  productCode: string;
  quantity: number;
  soldCount: number;
  status: InventoryStatus;
  brand: string;
  model: string;
  chassisNo: string;
  year: number;
  purchasePrice: number;
  sellPrice: number;
  discountRate: number;
  actualSoldPrice: number;
  shipmentCode: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateInventoryItemData = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'soldCount' | 'actualSoldPrice'> & {
  soldCount?: number;
  actualSoldPrice?: number;
};

export type UpdateInventoryItemData = Partial<CreateInventoryItemData>;

export interface InventoryStats {
  totalItems: number;
  inStock: number;
  outOfStock: number;
  discontinued: number;
}

export interface NextInventoryIdRes {
  nextInventoryId: string;
}

export interface DeleteInventoryRes {
  message: string;
}
