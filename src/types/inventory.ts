export type InventoryStatus = 'in_stock' | 'out_of_stock' | 'discontinued';

export interface InventoryItem {
  id: string;
  inventoryCode?: string;
  productName: string;
  productCode: string;
  quantity: number;
  soldCount: number;
  status: InventoryStatus;
  purchasePrice: number;
  sellPrice: number;
  discountRate?: number;
  actualSoldPrice?: number;
  createdAt?: string;
  updatedAt?: string;
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

export interface ExcelProductRow {
  rowNumber: number;
  productCode: string;
  productName: string;
  purchasePrice: number | string;
  sellPrice: number | string;
  isValid: boolean;
  error?: string;
  isDuplicateInFile?: boolean;
  isDuplicateInDb?: boolean;
}

export interface BulkImportResponse {
  total: number;
  created: number;
  failed: number;
  duplicates: number;
  errors: Array<{ row?: number; code?: string; message: string }>;
}

