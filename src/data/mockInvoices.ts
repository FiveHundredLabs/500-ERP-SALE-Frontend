import type { InvoiceResponse } from "../types/invoice";
import { mapInvoice } from '../services/apiMappers';

const d = (offset: number) => {
  const dt = new Date("2026-08-17T00:00:00.000Z");
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

const rawMockInvoices: any[] = [
  // 1. Kasun Perera (SO-001) - Kandy Construction Supplies (c-001) - Paid
  {
    id: "inv-001",
    invoiceNumber: "INV-2026-001",
    customer: {
      id: "c-001", shopName: "Kandy Construction Supplies", fullName: "Kandy Construction Supplies",
      contactPerson: "Pradeep Wickramasinghe",
      phone: "+94705787818", phone2: "081-234-5678", phone3: "070-456-7890",
      customerCode: "CUST-00104",
      address: "23, Peradeniya Road, Kandy", city: "Kandy",
      creditLimit: 1500000,
    },
    salesman: { id: "so-001", fullName: "Kasun Perera" },
    salesmanName: "Kasun Perera",
    items: [
      { id: "ii-001a", inventoryItemId: "inv-010", quantity: 200, unitPrice: 2950, total: 590000 },
      { id: "ii-001b", inventoryItemId: "inv-009", quantity: 100, unitPrice: 1950, total: 195000 },
    ],
    subTotal: 785000, discount: 39250, totalAmount: 745750,
    paidAmount: 745750, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-001",
        amount: 745750,
        paidAt: d(-5),
        paymentMethod: "bank_transfer",
        reference: "BOC-TR-99882",
        bankName: "Bank of Ceylon",
      }
    ],
    paymentStatus: "completed", paymentMethod: "bank_transfer",
    issueDate: d(-35), dueDate: d(-5),
    vehicleNumber: "CP-KDY-2234",
    notes: "Delivery to Kandy site confirmed. Settled in full.",
    createdAt: d(-35), updatedAt: d(-5),
  },

  // 2. Lanka Hardware Traders (c-003) - SCENARIO INVOICES 1 to 5 (5 x 10,000 = 50,000 Total)
  {
    id: "inv-101",
    invoiceNumber: "INV-2026-101",
    customer: {
      id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-101a", inventoryItemId: "inv-001", quantity: 4, unitPrice: 2500, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-25), dueDate: d(-10), // OVERDUE
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 1 — Overdue payment follow up.",
    createdAt: d(-25), updatedAt: d(-25),
  },
  {
    id: "inv-102",
    invoiceNumber: "INV-2026-102",
    customer: {
      id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-102a", inventoryItemId: "inv-002", quantity: 5, unitPrice: 2000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-15), dueDate: d(2), // DUE SOON
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 2 — Due soon.",
    createdAt: d(-15), updatedAt: d(-15),
  },
  {
    id: "inv-103",
    invoiceNumber: "INV-2026-103",
    customer: {
      id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-103a", inventoryItemId: "inv-003", quantity: 10, unitPrice: 1000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-10), dueDate: d(5), // DUE SOON
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 3 — Close to becoming overdue.",
    createdAt: d(-10), updatedAt: d(-10),
  },
  {
    id: "inv-104",
    invoiceNumber: "INV-2026-104",
    customer: {
      id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-104a", inventoryItemId: "inv-004", quantity: 4, unitPrice: 2500, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-5), dueDate: d(15), // OUTSTANDING
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 4 — Regular trade credit.",
    createdAt: d(-5), updatedAt: d(-5),
  },
  {
    id: "inv-105",
    invoiceNumber: "INV-2026-105",
    customer: {
      id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-105a", inventoryItemId: "inv-005", quantity: 2, unitPrice: 5000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-1), dueDate: d(20), // OUTSTANDING
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 5 — New stock shipment.",
    createdAt: d(-1), updatedAt: d(-1),
  },

  // 3. Nirosha Hardware Mart (c-010)
  {
    id: "inv-010",
    invoiceNumber: "INV-2026-010",
    customer: {
      id: "c-010", shopName: "Nirosha Hardware Mart", fullName: "Nirosha Hardware Mart",
      contactPerson: "Nirosha Bandara",
      phone: "+94705787818", phone2: "011-234-5678", phone3: "078-567-8901",
      customerCode: "CUST-00105",
      address: "145, Baseline Road, Colombo 09", city: "Colombo 09",
      creditLimit: 1000000,
    },
    salesman: { id: "so-001", fullName: "Kasun Perera" },
    salesmanName: "Kasun Perera",
    items: [
      { id: "ii-010a", inventoryItemId: "inv-001", quantity: 20, unitPrice: 2450, total: 49000 },
      { id: "ii-010b", inventoryItemId: "inv-006", quantity: 25, unitPrice: 680, total: 17000 },
    ],
    subTotal: 66000, discount: 3300, totalAmount: 62700,
    paidAmount: 0, remainingAmount: 62700,
    payments: [],
    paymentStatus: "pending", paymentMethod: "bank_deposit",
    issueDate: d(-2), dueDate: d(13),
    vehicleNumber: "WP-COL-2244",
    notes: "Customer requested 15-day credit.",
    createdAt: d(-2), updatedAt: d(-2),
  },

  // 4. Saman Building Materials (c-002) - Paid
  {
    id: "inv-002",
    invoiceNumber: "INV-2026-002",
    customer: {
      id: "c-002", shopName: "Saman Building Materials", fullName: "Saman Building Materials",
      contactPerson: "Saman Kumara",
      phone: "+94705787818", phone2: "011-456-7890", phone3: "077-987-6543",
      customerCode: "CUST-00107",
      address: "78, High Level Road, Maharagama", city: "Maharagama",
      creditLimit: 800000,
    },
    salesman: { id: "so-002", fullName: "Nuwan Silva" },
    salesmanName: "Nuwan Silva",
    items: [
      { id: "ii-002a", inventoryItemId: "inv-007", quantity: 40, unitPrice: 1950, total: 78000 },
    ],
    subTotal: 78000, discount: 3900, totalAmount: 74100,
    paidAmount: 74100, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-002",
        amount: 74100,
        paidAt: d(-13),
        paymentMethod: "cheque",
        reference: "CHQ-778812",
        bankName: "Commercial Bank",
      }
    ],
    paymentStatus: "completed", paymentMethod: "cheque",
    issueDate: d(-28), dueDate: d(-13),
    vehicleNumber: "WP-MAH-4567",
    notes: "Cheque cleared on due date.",
    createdAt: d(-28), updatedAt: d(-13),
  },

  // 5. Ravi Plumbing & Hardware (c-007) - Due Soon
  {
    id: "inv-007",
    invoiceNumber: "INV-2026-007",
    customer: {
      id: "c-007", shopName: "Ravi Plumbing & Hardware", fullName: "Ravi Plumbing & Hardware",
      contactPerson: "Ravi Gunaratne",
      phone: "+94705787818", phone2: "011-678-9012", phone3: "071-876-5432",
      customerCode: "CUST-00110",
      address: "89, Stanley Thilakaratne Mawatha, Nugegoda", city: "Nugegoda",
      creditLimit: 1200000,
    },
    salesman: { id: "so-002", fullName: "Nuwan Silva" },
    salesmanName: "Nuwan Silva",
    items: [
      { id: "ii-007a", inventoryItemId: "inv-003", quantity: 80, unitPrice: 950, total: 76000 },
      { id: "ii-007b", inventoryItemId: "inv-005", quantity: 40, unitPrice: 2600, total: 104000 },
      { id: "ii-007c", inventoryItemId: "inv-002", quantity: 60, unitPrice: 1650, total: 99000 },
    ],
    subTotal: 279000, discount: 13950, totalAmount: 265050,
    paidAmount: 0, remainingAmount: 265050,
    payments: [],
    paymentStatus: "pending", paymentMethod: "cheque",
    issueDate: d(-8), dueDate: d(7),
    vehicleNumber: "WP-NUG-7765",
    notes: "Cheque post-dated for 2026-08-24.",
    createdAt: d(-8), updatedAt: d(-8),
  },

  // 6. City Plumbing & Electrical (c-008) - Paid
  {
    id: "inv-008",
    invoiceNumber: "INV-2026-008",
    customer: {
      id: "c-008", shopName: "City Plumbing & Electrical", fullName: "City Plumbing & Electrical",
      contactPerson: "",
      phone: "+94705787818", phone2: "011-567-8901",
      customerCode: "CUST-00108",
      address: "34, Deans Road, Colombo 10", city: "Colombo 10",
      creditLimit: 600000,
    },
    salesman: { id: "so-003", fullName: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { id: "ii-008a", inventoryItemId: "inv-004", quantity: 20, unitPrice: 3100, total: 62000 },
      { id: "ii-008b", inventoryItemId: "inv-005", quantity: 25, unitPrice: 2600, total: 65000 },
    ],
    subTotal: 127000, discount: 6350, totalAmount: 120650,
    paidAmount: 120650, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-003",
        amount: 120650,
        paidAt: d(-6),
        paymentMethod: "cash",
        reference: "CASH-REC-102",
      }
    ],
    paymentStatus: "completed", paymentMethod: "cash",
    issueDate: d(-6), dueDate: d(-6),
    vehicleNumber: "WP-COL-9988",
    notes: "Cash on delivery.",
    createdAt: d(-6), updatedAt: d(-6),
  },

  // 7. Jayantha Hardware & Paint (c-004) - Partially Paid (Total: 102,125 | Paid: 50,000 | Remaining: 52,125)
  {
    id: "inv-004",
    invoiceNumber: "INV-2026-004",
    customer: {
      id: "c-004", shopName: "Jayantha Hardware & Paint", fullName: "Jayantha Hardware & Paint",
      contactPerson: "Jayantha Alwis",
      phone: "+94705787818", phone2: "033-234-5678", phone3: "075-123-9876",
      customerCode: "CUST-00109",
      address: "12, New Kandy Road, Kadawatha", city: "Kadawatha",
      creditLimit: 1000000,
    },
    salesman: { id: "so-004", fullName: "Ruwan Jayasinghe" },
    salesmanName: "Ruwan Jayasinghe",
    items: [
      { id: "ii-004a", inventoryItemId: "inv-006", quantity: 50, unitPrice: 680, total: 34000 },
      { id: "ii-004b", inventoryItemId: "inv-001", quantity: 30, unitPrice: 2450, total: 73500 },
    ],
    subTotal: 107500, discount: 5375, totalAmount: 102125,
    paidAmount: 50000, remainingAmount: 52125,
    payments: [
      {
        transactionId: "TXN-2026-004",
        amount: 50000,
        paidAt: d(-7),
        paymentMethod: "bank_deposit",
        reference: "DEP-HNB-5541",
        bankName: "Hatton National Bank",
      }
    ],
    paymentStatus: "partially_paid", paymentMethod: "bank_deposit",
    issueDate: d(-15), dueDate: d(0), // Due Today
    vehicleNumber: "WP-GAM-5512",
    notes: "Partially paid LKR 50,000. Balance LKR 52,125 due.",
    createdAt: d(-15), updatedAt: d(-7),
  },

  // 8. Modern Build Solutions (c-005) - Overdue
  {
    id: "inv-005",
    invoiceNumber: "INV-2026-005",
    customer: {
      id: "c-005", shopName: "Modern Build Solutions", fullName: "Modern Build Solutions",
      contactPerson: "Chamara Weerasinghe",
      phone: "+94705787818", phone2: "033-456-7890", phone3: "071-345-6789",
      customerCode: "CUST-00103",
      address: "45, Kandy Road, Gampaha", city: "Gampaha",
      creditLimit: 1500000,
    },
    salesman: { id: "so-005", fullName: "Sachith Kumara" },
    salesmanName: "Sachith Kumara",
    items: [
      { id: "ii-005a", inventoryItemId: "inv-009", quantity: 300, unitPrice: 1950, total: 585000 },
      { id: "ii-005b", inventoryItemId: "inv-010", quantity: 100, unitPrice: 2950, total: 295000 },
    ],
    subTotal: 880000, discount: 44000, totalAmount: 836000,
    paidAmount: 0, remainingAmount: 836000,
    payments: [],
    paymentStatus: "pending", paymentMethod: "bank_transfer",
    issueDate: d(-45), dueDate: d(-15),
    vehicleNumber: "WP-GAM-1122",
    notes: "⚠ OVERDUE: Credit period exceeded by 15 days.",
    createdAt: d(-45), updatedAt: d(-45),
  },

  // 9. Up Country Hardware (c-009)
  {
    id: "inv-009",
    invoiceNumber: "INV-2026-009",
    customer: {
      id: "c-009", shopName: "Up Country Hardware", fullName: "Up Country Hardware",
      contactPerson: "Priyantha Rathnayake",
      phone: "+94705787818", phone2: "081-345-6789",
      customerCode: "CUST-00106",
      address: "67, Clock Tower Road, Nuwara Eliya", city: "Nuwara Eliya",
      creditLimit: 900000,
    },
    salesman: { id: "so-004", fullName: "Ruwan Jayasinghe" },
    salesmanName: "Ruwan Jayasinghe",
    items: [
      { id: "ii-009a", inventoryItemId: "inv-007", quantity: 30, unitPrice: 1950, total: 58500 },
      { id: "ii-009b", inventoryItemId: "inv-006", quantity: 40, unitPrice: 680, total: 27200 },
    ],
    subTotal: 85700, discount: 4285, totalAmount: 81415,
    paidAmount: 0, remainingAmount: 81415,
    payments: [],
    paymentStatus: "pending", paymentMethod: "bank_transfer",
    issueDate: d(-4), dueDate: d(11),
    vehicleNumber: "CP-NUW-4421",
    notes: "Net 15 credit terms.",
    createdAt: d(-4), updatedAt: d(-4),
  },

  // 10. Galle Hardware Palace (c-006) - Paid
  {
    id: "inv-006",
    invoiceNumber: "INV-2026-006",
    customer: {
      id: "c-006", shopName: "Galle Hardware Palace", fullName: "Galle Hardware Palace",
      contactPerson: "Suresh Mendis",
      phone: "+94705787818", phone2: "091-234-5678", phone3: "076-234-5678",
      customerCode: "CUST-00102",
      address: "23, Colombo Road, Galle", city: "Galle",
      creditLimit: 1200000,
    },
    salesman: { id: "so-006", fullName: "Chaminda Bandara" },
    salesmanName: "Chaminda Bandara",
    items: [
      { id: "ii-006a", inventoryItemId: "inv-003", quantity: 100, unitPrice: 950, total: 95000 },
      { id: "ii-006b", inventoryItemId: "inv-004", quantity: 30, unitPrice: 3100, total: 93000 },
    ],
    subTotal: 188000, discount: 9400, totalAmount: 178600,
    paidAmount: 178600, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-005",
        amount: 178600,
        paidAt: d(-10),
        paymentMethod: "cash",
        reference: "CASH-REC-105",
      }
    ],
    paymentStatus: "completed", paymentMethod: "cash",
    issueDate: d(-10), dueDate: d(0),
    vehicleNumber: "SP-GAL-3344",
    notes: "Cash payment collected on delivery.",
    createdAt: d(-10), updatedAt: d(-10),
  },
];

export const mockInvoicesList: InvoiceResponse[] = rawMockInvoices.map(mapInvoice);
