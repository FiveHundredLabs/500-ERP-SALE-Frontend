import type { InventoryItem } from "../types/inventory";

export const mockInventoryItems: InventoryItem[] = [
  {
    _id: "inv-001",
    id: "inv-001",
    product_code: "P-PIPE-50",
    product_name: "PVC Pressure Pipe 50mm (6m)",
    quantity: 120,
    sold_count: 450,
    status: "in_stock",
    vehicle: {
      brand: "Universal",
      model: "All Models",
      chassis_no: "N/A",
      year: 2026
    },
    purchase_price: 1850,
    sell_price: 2450,
    shipment_code: "SHP-001",
    created_at: "2026-01-10T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z"
  },
  {
    _id: "inv-002",
    id: "inv-002",
    product_code: "B-ELBOW-90",
    product_name: "Brass Threaded Elbow 3/4 inch",
    quantity: 85,
    sold_count: 210,
    status: "in_stock",
    vehicle: {
      brand: "Universal",
      model: "All Models",
      chassis_no: "N/A",
      year: 2026
    },
    purchase_price: 620,
    sell_price: 950,
    shipment_code: "SHP-002",
    created_at: "2026-01-12T00:00:00.000Z",
    updated_at: "2026-02-02T00:00:00.000Z"
  },
  {
    _id: "inv-003",
    id: "inv-003",
    product_code: "V-BALL-15",
    product_name: "Stainless Steel Ball Valve 15mm",
    quantity: 40,
    sold_count: 95,
    status: "in_stock",
    vehicle: {
      brand: "Universal",
      model: "All Models",
      chassis_no: "N/A",
      year: 2026
    },
    purchase_price: 2100,
    sell_price: 3100,
    shipment_code: "SHP-003",
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: "2026-02-03T00:00:00.000Z"
  },
  {
    _id: "inv-004",
    id: "inv-004",
    product_code: "C-GALV-40",
    product_name: "Galvanized Steel Conduit 40mm",
    quantity: 0,
    sold_count: 320,
    status: "out_of_stock",
    vehicle: {
      brand: "Universal",
      model: "All Models",
      chassis_no: "N/A",
      year: 2026
    },
    purchase_price: 3400,
    sell_price: 4600,
    shipment_code: "SHP-004",
    created_at: "2026-01-18T00:00:00.000Z",
    updated_at: "2026-02-04T00:00:00.000Z"
  },
  {
    _id: "inv-005",
    id: "inv-005",
    product_code: "T-SOLVENT-500",
    product_name: "PVC Solvent Cement Glue 500ml",
    quantity: 200,
    sold_count: 600,
    status: "in_stock",
    vehicle: {
      brand: "Universal",
      model: "All Models",
      chassis_no: "N/A",
      year: 2026
    },
    purchase_price: 450,
    sell_price: 680,
    shipment_code: "SHP-005",
    created_at: "2026-01-20T00:00:00.000Z",
    updated_at: "2026-02-05T00:00:00.000Z"
  }
];
