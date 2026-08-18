import type { InvoiceResponse } from "../types/invoice";

const d = (offset: number) => {
  const dt = new Date("2026-08-17T00:00:00.000Z");
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

export const mockInvoicesList: InvoiceResponse[] = [
  // 1. Kasun Perera (SO-001) - Kandy Construction Supplies (c-001) - Paid
  {
    _id: "inv-001",
    invoiceId: "INV-2026-001",
    customer: {
      _id: "c-001", shopName: "Kandy Construction Supplies", fullName: "Kandy Construction Supplies",
      contactPerson: "Pradeep Wickramasinghe",
      phone: "+94705787818", phone2: "081-234-5678", phone3: "070-456-7890",
      customerCode: "CUST-00104",
      address: "23, Peradeniya Road, Kandy", city: "Kandy",
      creditLimit: 1500000,
    },
    salesman: { _id: "so-001", name: "Kasun Perera" },
    salesmanName: "Kasun Perera",
    items: [
      { _id: "ii-001a", item: "inv-010", quantity: 200, unitPrice: 2950, total: 590000 },
      { _id: "ii-001b", item: "inv-009", quantity: 100, unitPrice: 1950, total: 195000 },
    ],
    subTotal: 785000, discount: 39250, totalAmount: 745750,
    paidAmount: 745750, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-001",
        amount: 745750,
        date: d(-5),
        paymentMethod: "Bank Transfer",
        reference: "BOC-TR-99882",
        bankName: "Bank of Ceylon",
      }
    ],
    paymentStatus: "Completed", paymentMethod: "Bank Transfer",
    issueDate: d(-35), dueDate: d(-5),
    vehicleNumber: "CP-KDY-2234",
    notes: "Delivery to Kandy site confirmed. Settled in full.",
    created_at: d(-35), updated_at: d(-5),
  },

  // 2. Lanka Hardware Traders (c-003) - SCENARIO INVOICES 1 to 5 (5 x 10,000 = 50,000 Total)
  {
    _id: "inv-101",
    invoiceId: "INV-2026-101",
    customer: {
      _id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-101a", item: "inv-001", quantity: 4, unitPrice: 2500, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-25), dueDate: d(-10), // OVERDUE
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 1 — Overdue payment follow up.",
    created_at: d(-25), updated_at: d(-25),
  },
  {
    _id: "inv-102",
    invoiceId: "INV-2026-102",
    customer: {
      _id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-102a", item: "inv-002", quantity: 5, unitPrice: 2000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-15), dueDate: d(2), // DUE SOON
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 2 — Due soon.",
    created_at: d(-15), updated_at: d(-15),
  },
  {
    _id: "inv-103",
    invoiceId: "INV-2026-103",
    customer: {
      _id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-103a", item: "inv-003", quantity: 10, unitPrice: 1000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-10), dueDate: d(5), // DUE SOON
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 3 — Close to becoming overdue.",
    created_at: d(-10), updated_at: d(-10),
  },
  {
    _id: "inv-104",
    invoiceId: "INV-2026-104",
    customer: {
      _id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-104a", item: "inv-004", quantity: 4, unitPrice: 2500, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-5), dueDate: d(15), // OUTSTANDING
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 4 — Regular trade credit.",
    created_at: d(-5), updated_at: d(-5),
  },
  {
    _id: "inv-105",
    invoiceId: "INV-2026-105",
    customer: {
      _id: "c-003", shopName: "Lanka Hardware Traders", fullName: "Lanka Hardware Traders",
      contactPerson: "Dinesh Perera",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      customerCode: "CUST-00101",
      address: "45, Main Street, Pettah, Colombo", city: "Colombo",
      creditLimit: 2500000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-105a", item: "inv-005", quantity: 2, unitPrice: 5000, total: 10000 },
    ],
    subTotal: 10000, discount: 0, totalAmount: 10000,
    paidAmount: 0, remainingAmount: 10000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-1), dueDate: d(20), // OUTSTANDING
    vehicleNumber: "WP-COL-8821",
    notes: "Invoice 5 — New stock shipment.",
    created_at: d(-1), updated_at: d(-1),
  },

  // 3. Nirosha Hardware Mart (c-010)
  {
    _id: "inv-010",
    invoiceId: "INV-2026-010",
    customer: {
      _id: "c-010", shopName: "Nirosha Hardware Mart", fullName: "Nirosha Hardware Mart",
      contactPerson: "Nirosha Bandara",
      phone: "+94705787818", phone2: "011-234-5678", phone3: "078-567-8901",
      customerCode: "CUST-00105",
      address: "145, Baseline Road, Colombo 09", city: "Colombo 09",
      creditLimit: 1000000,
    },
    salesman: { _id: "so-001", name: "Kasun Perera" },
    salesmanName: "Kasun Perera",
    items: [
      { _id: "ii-010a", item: "inv-001", quantity: 20, unitPrice: 2450, total: 49000 },
      { _id: "ii-010b", item: "inv-006", quantity: 25, unitPrice: 680, total: 17000 },
    ],
    subTotal: 66000, discount: 3300, totalAmount: 62700,
    paidAmount: 0, remainingAmount: 62700,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Bank Deposit",
    issueDate: d(-2), dueDate: d(13),
    vehicleNumber: "WP-COL-2244",
    notes: "Customer requested 15-day credit.",
    created_at: d(-2), updated_at: d(-2),
  },

  // 4. Saman Building Materials (c-002) - Paid
  {
    _id: "inv-002",
    invoiceId: "INV-2026-002",
    customer: {
      _id: "c-002", shopName: "Saman Building Materials", fullName: "Saman Building Materials",
      contactPerson: "Saman Kumara",
      phone: "+94705787818", phone2: "011-456-7890", phone3: "077-987-6543",
      customerCode: "CUST-00107",
      address: "78, High Level Road, Maharagama", city: "Maharagama",
      creditLimit: 800000,
    },
    salesman: { _id: "so-002", name: "Nuwan Silva" },
    salesmanName: "Nuwan Silva",
    items: [
      { _id: "ii-002a", item: "inv-007", quantity: 40, unitPrice: 1950, total: 78000 },
    ],
    subTotal: 78000, discount: 3900, totalAmount: 74100,
    paidAmount: 74100, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-002",
        amount: 74100,
        date: d(-13),
        paymentMethod: "Cheque",
        reference: "CHQ-778812",
        bankName: "Commercial Bank",
      }
    ],
    paymentStatus: "Completed", paymentMethod: "Cheque",
    issueDate: d(-28), dueDate: d(-13),
    vehicleNumber: "WP-MAH-4567",
    notes: "Cheque cleared on due date.",
    created_at: d(-28), updated_at: d(-13),
  },

  // 5. Ravi Plumbing & Hardware (c-007) - Due Soon
  {
    _id: "inv-007",
    invoiceId: "INV-2026-007",
    customer: {
      _id: "c-007", shopName: "Ravi Plumbing & Hardware", fullName: "Ravi Plumbing & Hardware",
      contactPerson: "Ravi Gunaratne",
      phone: "+94705787818", phone2: "011-678-9012", phone3: "071-876-5432",
      customerCode: "CUST-00110",
      address: "89, Stanley Thilakaratne Mawatha, Nugegoda", city: "Nugegoda",
      creditLimit: 1200000,
    },
    salesman: { _id: "so-002", name: "Nuwan Silva" },
    salesmanName: "Nuwan Silva",
    items: [
      { _id: "ii-007a", item: "inv-003", quantity: 80, unitPrice: 950, total: 76000 },
      { _id: "ii-007b", item: "inv-005", quantity: 40, unitPrice: 2600, total: 104000 },
      { _id: "ii-007c", item: "inv-002", quantity: 60, unitPrice: 1650, total: 99000 },
    ],
    subTotal: 279000, discount: 13950, totalAmount: 265050,
    paidAmount: 0, remainingAmount: 265050,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-8), dueDate: d(7),
    vehicleNumber: "WP-NUG-7765",
    notes: "Cheque post-dated for 2026-08-24.",
    created_at: d(-8), updated_at: d(-8),
  },

  // 6. City Plumbing & Electrical (c-008) - Paid
  {
    _id: "inv-008",
    invoiceId: "INV-2026-008",
    customer: {
      _id: "c-008", shopName: "City Plumbing & Electrical", fullName: "City Plumbing & Electrical",
      contactPerson: "",
      phone: "+94705787818", phone2: "011-567-8901",
      customerCode: "CUST-00108",
      address: "34, Deans Road, Colombo 10", city: "Colombo 10",
      creditLimit: 600000,
    },
    salesman: { _id: "so-003", name: "Dinesh Fernando" },
    salesmanName: "Dinesh Fernando",
    items: [
      { _id: "ii-008a", item: "inv-004", quantity: 20, unitPrice: 3100, total: 62000 },
      { _id: "ii-008b", item: "inv-005", quantity: 25, unitPrice: 2600, total: 65000 },
    ],
    subTotal: 127000, discount: 6350, totalAmount: 120650,
    paidAmount: 120650, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-003",
        amount: 120650,
        date: d(-6),
        paymentMethod: "Cash",
        reference: "CASH-REC-102",
      }
    ],
    paymentStatus: "Completed", paymentMethod: "Cash",
    issueDate: d(-6), dueDate: d(-6),
    vehicleNumber: "WP-COL-9988",
    notes: "Cash on delivery.",
    created_at: d(-6), updated_at: d(-6),
  },

  // 7. Jayantha Hardware & Paint (c-004) - Partially Paid (Total: 102,125 | Paid: 50,000 | Remaining: 52,125)
  {
    _id: "inv-004",
    invoiceId: "INV-2026-004",
    customer: {
      _id: "c-004", shopName: "Jayantha Hardware & Paint", fullName: "Jayantha Hardware & Paint",
      contactPerson: "Jayantha Alwis",
      phone: "+94705787818", phone2: "033-234-5678", phone3: "075-123-9876",
      customerCode: "CUST-00109",
      address: "12, New Kandy Road, Kadawatha", city: "Kadawatha",
      creditLimit: 1000000,
    },
    salesman: { _id: "so-004", name: "Ruwan Jayasinghe" },
    salesmanName: "Ruwan Jayasinghe",
    items: [
      { _id: "ii-004a", item: "inv-006", quantity: 50, unitPrice: 680, total: 34000 },
      { _id: "ii-004b", item: "inv-001", quantity: 30, unitPrice: 2450, total: 73500 },
    ],
    subTotal: 107500, discount: 5375, totalAmount: 102125,
    paidAmount: 50000, remainingAmount: 52125,
    payments: [
      {
        transactionId: "TXN-2026-004",
        amount: 50000,
        date: d(-7),
        paymentMethod: "Bank Deposit",
        reference: "DEP-HNB-5541",
        bankName: "Hatton National Bank",
      }
    ],
    paymentStatus: "Partially Paid", paymentMethod: "Bank Deposit",
    issueDate: d(-15), dueDate: d(0), // Due Today
    vehicleNumber: "WP-GAM-5512",
    notes: "Partially paid LKR 50,000. Balance LKR 52,125 due.",
    created_at: d(-15), updated_at: d(-7),
  },

  // 8. Modern Build Solutions (c-005) - Overdue
  {
    _id: "inv-005",
    invoiceId: "INV-2026-005",
    customer: {
      _id: "c-005", shopName: "Modern Build Solutions", fullName: "Modern Build Solutions",
      contactPerson: "Chamara Weerasinghe",
      phone: "+94705787818", phone2: "033-456-7890", phone3: "071-345-6789",
      customerCode: "CUST-00103",
      address: "45, Kandy Road, Gampaha", city: "Gampaha",
      creditLimit: 1500000,
    },
    salesman: { _id: "so-005", name: "Sachith Kumara" },
    salesmanName: "Sachith Kumara",
    items: [
      { _id: "ii-005a", item: "inv-009", quantity: 300, unitPrice: 1950, total: 585000 },
      { _id: "ii-005b", item: "inv-010", quantity: 100, unitPrice: 2950, total: 295000 },
    ],
    subTotal: 880000, discount: 44000, totalAmount: 836000,
    paidAmount: 0, remainingAmount: 836000,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Bank Transfer",
    issueDate: d(-45), dueDate: d(-15),
    vehicleNumber: "WP-GAM-1122",
    notes: "⚠ OVERDUE: Credit period exceeded by 15 days.",
    created_at: d(-45), updated_at: d(-45),
  },

  // 9. Up Country Hardware (c-009)
  {
    _id: "inv-009",
    invoiceId: "INV-2026-009",
    customer: {
      _id: "c-009", shopName: "Up Country Hardware", fullName: "Up Country Hardware",
      contactPerson: "Priyantha Rathnayake",
      phone: "+94705787818", phone2: "081-345-6789",
      customerCode: "CUST-00106",
      address: "67, Clock Tower Road, Nuwara Eliya", city: "Nuwara Eliya",
      creditLimit: 900000,
    },
    salesman: { _id: "so-004", name: "Ruwan Jayasinghe" },
    salesmanName: "Ruwan Jayasinghe",
    items: [
      { _id: "ii-009a", item: "inv-007", quantity: 30, unitPrice: 1950, total: 58500 },
      { _id: "ii-009b", item: "inv-006", quantity: 40, unitPrice: 680, total: 27200 },
    ],
    subTotal: 85700, discount: 4285, totalAmount: 81415,
    paidAmount: 0, remainingAmount: 81415,
    payments: [],
    paymentStatus: "Pending", paymentMethod: "Bank Transfer",
    issueDate: d(-4), dueDate: d(11),
    vehicleNumber: "CP-NUW-4421",
    notes: "Net 15 credit terms.",
    created_at: d(-4), updated_at: d(-4),
  },

  // 10. Galle Hardware Palace (c-006) - Paid
  {
    _id: "inv-006",
    invoiceId: "INV-2026-006",
    customer: {
      _id: "c-006", shopName: "Galle Hardware Palace", fullName: "Galle Hardware Palace",
      contactPerson: "Suresh Mendis",
      phone: "+94705787818", phone2: "091-234-5678", phone3: "076-234-5678",
      customerCode: "CUST-00102",
      address: "23, Colombo Road, Galle", city: "Galle",
      creditLimit: 1200000,
    },
    salesman: { _id: "so-006", name: "Chaminda Bandara" },
    salesmanName: "Chaminda Bandara",
    items: [
      { _id: "ii-006a", item: "inv-003", quantity: 100, unitPrice: 950, total: 95000 },
      { _id: "ii-006b", item: "inv-004", quantity: 30, unitPrice: 3100, total: 93000 },
    ],
    subTotal: 188000, discount: 9400, totalAmount: 178600,
    paidAmount: 178600, remainingAmount: 0,
    payments: [
      {
        transactionId: "TXN-2026-005",
        amount: 178600,
        date: d(-10),
        paymentMethod: "Cash",
        reference: "CASH-REC-105",
      }
    ],
    paymentStatus: "Completed", paymentMethod: "Cash",
    issueDate: d(-10), dueDate: d(0),
    vehicleNumber: "SP-GAL-3344",
    notes: "Cash payment collected on delivery.",
    created_at: d(-10), updated_at: d(-10),
  },
];
