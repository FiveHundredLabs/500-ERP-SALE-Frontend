import type { InvoiceResponse } from "../types/invoice";

const d = (offset: number) => {
  const dt = new Date("2026-08-17T00:00:00.000Z");
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString();
};

export const mockInvoicesList: InvoiceResponse[] = [
  {
    _id: "inv-001",
    invoiceId: "INV-2026-001",
    customer: {
      _id: "c-001", fullName: "Kandy Construction Supplies", email: "pradeep@kandycon.lk",
      phone: "081-234-5678", vatNumber: "KAD-7800-001", customerCode: "CUST-00104",
      address: { street: "23, Peradeniya Road", city: "Kandy", country: "Sri Lanka", zip: "20000" },
    },
    items: [
      { _id: "ii-001a", item: "inv-010", quantity: 200, unitPrice: 2950, total: 590000 },
      { _id: "ii-001b", item: "inv-009", quantity: 100, unitPrice: 1950, total: 195000 },
    ],
    subTotal: 785000, discount: 39250, totalAmount: 745750,
    paymentStatus: "Completed", paymentMethod: "Bank Transfer",
    issueDate: d(-35), dueDate: d(-5),
    vehicleNumber: "CP-KDY-2234",
    notes: "Delivery to Kandy site confirmed.",
    created_at: d(-35), updated_at: d(-5),
  },
  {
    _id: "inv-002",
    invoiceId: "INV-2026-002",
    customer: {
      _id: "c-002", fullName: "Saman Building Materials", email: "saman@samanbm.lk",
      phone: "011-456-7890", vatNumber: "COL-5510-002", customerCode: "CUST-00107",
      address: { street: "78, High Level Road", city: "Maharagama", country: "Sri Lanka", zip: "10280" },
    },
    items: [
      { _id: "ii-002a", item: "inv-007", quantity: 40, unitPrice: 1950, total: 78000 },
    ],
    subTotal: 78000, discount: 3900, totalAmount: 74100,
    paymentStatus: "Completed", paymentMethod: "Cheque",
    issueDate: d(-28), dueDate: d(-13),
    vehicleNumber: "WP-MAH-4567",
    notes: "Cheque cleared on due date.",
    created_at: d(-28), updated_at: d(-13),
  },
  {
    _id: "inv-003",
    invoiceId: "INV-2026-003",
    customer: {
      _id: "c-003", fullName: "Lanka Hardware Traders", email: "info@lankahardware.lk",
      phone: "011-255-4321", vatNumber: "COL-9920-003", customerCode: "CUST-00101",
      address: { street: "45, Main Street, Pettah", city: "Colombo", country: "Sri Lanka", zip: "01100" },
    },
    items: [
      { _id: "ii-003a", item: "inv-008", quantity: 15, unitPrice: 16500, total: 247500 },
      { _id: "ii-003b", item: "inv-001", quantity: 50, unitPrice: 2450, total: 122500 },
    ],
    subTotal: 370000, discount: 18500, totalAmount: 351500,
    paymentStatus: "Pending", paymentMethod: "Bank Transfer",
    issueDate: d(-22), dueDate: d(8),
    vehicleNumber: "WP-COL-8821",
    notes: "Net 30 terms. Awaiting transfer.",
    created_at: d(-22), updated_at: d(-22),
  },
  {
    _id: "inv-004",
    invoiceId: "INV-2026-004",
    customer: {
      _id: "c-004", fullName: "Jayantha Hardware & Paint", email: "jayantha@jayhw.lk",
      phone: "033-234-5678", vatNumber: "GAM-3310-004", customerCode: "CUST-00109",
      address: { street: "12, New Kandy Road", city: "Kadawatha", country: "Sri Lanka", zip: "11850" },
    },
    items: [
      { _id: "ii-004a", item: "inv-006", quantity: 50, unitPrice: 680, total: 34000 },
      { _id: "ii-004b", item: "inv-001", quantity: 30, unitPrice: 2450, total: 73500 },
    ],
    subTotal: 107500, discount: 5375, totalAmount: 102125,
    paymentStatus: "Pending", paymentMethod: "Bank Deposit",
    issueDate: d(-15), dueDate: d(0),
    vehicleNumber: "WP-GAM-5512",
    notes: "Due today — follow up with customer.",
    created_at: d(-15), updated_at: d(-15),
  },
  {
    _id: "inv-005",
    invoiceId: "INV-2026-005",
    customer: {
      _id: "c-005", fullName: "Modern Build Solutions", email: "chamara@modernbuild.lk",
      phone: "033-456-7890", vatNumber: "GAM-5560-010", customerCode: "CUST-00103",
      address: { street: "45, Kandy Road", city: "Gampaha", country: "Sri Lanka", zip: "11000" },
    },
    items: [
      { _id: "ii-005a", item: "inv-009", quantity: 300, unitPrice: 1950, total: 585000 },
      { _id: "ii-005b", item: "inv-010", quantity: 100, unitPrice: 2950, total: 295000 },
    ],
    subTotal: 880000, discount: 44000, totalAmount: 836000,
    paymentStatus: "Pending", paymentMethod: "Bank Transfer",
    issueDate: d(-45), dueDate: d(-15),
    vehicleNumber: "WP-GAM-1122",
    notes: "⚠ OVERDUE: Credit period exceeded by 15 days.",
    created_at: d(-45), updated_at: d(-45),
  },
  {
    _id: "inv-006",
    invoiceId: "INV-2026-006",
    customer: {
      _id: "c-006", fullName: "Galle Hardware Palace", email: "suresh@gallehw.lk",
      phone: "091-234-5678", vatNumber: "GAL-2210-008", customerCode: "CUST-00102",
      address: { street: "23, Colombo Road", city: "Galle", country: "Sri Lanka", zip: "80000" },
    },
    items: [
      { _id: "ii-006a", item: "inv-003", quantity: 100, unitPrice: 950, total: 95000 },
      { _id: "ii-006b", item: "inv-004", quantity: 30, unitPrice: 3100, total: 93000 },
    ],
    subTotal: 188000, discount: 9400, totalAmount: 178600,
    paymentStatus: "Completed", paymentMethod: "Cash",
    issueDate: d(-10), dueDate: d(0),
    vehicleNumber: "SP-GAL-3344",
    notes: "Cash payment collected on delivery.",
    created_at: d(-10), updated_at: d(-10),
  },
  {
    _id: "inv-007",
    invoiceId: "INV-2026-007",
    customer: {
      _id: "c-007", fullName: "Ravi Plumbing & Hardware", email: "ravi@raviplumb.lk",
      phone: "011-678-9012", vatNumber: "COL-6630-007", customerCode: "CUST-00110",
      address: { street: "89, Stanley Thilakaratne Mawatha", city: "Nugegoda", country: "Sri Lanka", zip: "10250" },
    },
    items: [
      { _id: "ii-007a", item: "inv-003", quantity: 80, unitPrice: 950, total: 76000 },
      { _id: "ii-007b", item: "inv-005", quantity: 40, unitPrice: 2600, total: 104000 },
      { _id: "ii-007c", item: "inv-002", quantity: 60, unitPrice: 1650, total: 99000 },
    ],
    subTotal: 279000, discount: 13950, totalAmount: 265050,
    paymentStatus: "Pending", paymentMethod: "Cheque",
    issueDate: d(-8), dueDate: d(7),
    vehicleNumber: "WP-NUG-7765",
    notes: "Cheque post-dated for 2026-08-24.",
    created_at: d(-8), updated_at: d(-8),
  },
  {
    _id: "inv-008",
    invoiceId: "INV-2026-008",
    customer: {
      _id: "c-008", fullName: "City Plumbing & Electrical", email: "nalika@cityplumb.lk",
      phone: "011-567-8901", vatNumber: "COL-8840-008", customerCode: "CUST-00108",
      address: { street: "34, Deans Road", city: "Colombo 10", country: "Sri Lanka", zip: "01000" },
    },
    items: [
      { _id: "ii-008a", item: "inv-004", quantity: 20, unitPrice: 3100, total: 62000 },
      { _id: "ii-008b", item: "inv-005", quantity: 25, unitPrice: 2600, total: 65000 },
    ],
    subTotal: 127000, discount: 6350, totalAmount: 120650,
    paymentStatus: "Completed", paymentMethod: "Cash",
    issueDate: d(-6), dueDate: d(-6),
    vehicleNumber: "WP-COL-9988",
    notes: "Cash on delivery.",
    created_at: d(-6), updated_at: d(-6),
  },
  {
    _id: "inv-009",
    invoiceId: "INV-2026-009",
    customer: {
      _id: "c-009", fullName: "Up Country Hardware", email: "priyantha@upcohw.lk",
      phone: "081-345-6789", vatNumber: "NUW-8840-009", customerCode: "CUST-00106",
      address: { street: "67, Clock Tower Road", city: "Nuwara Eliya", country: "Sri Lanka", zip: "22200" },
    },
    items: [
      { _id: "ii-009a", item: "inv-007", quantity: 30, unitPrice: 1950, total: 58500 },
      { _id: "ii-009b", item: "inv-006", quantity: 40, unitPrice: 680, total: 27200 },
    ],
    subTotal: 85700, discount: 4285, totalAmount: 81415,
    paymentStatus: "Pending", paymentMethod: "Bank Transfer",
    issueDate: d(-4), dueDate: d(11),
    vehicleNumber: "CP-NUW-4421",
    notes: "Net 15 credit terms.",
    created_at: d(-4), updated_at: d(-4),
  },
  {
    _id: "inv-010",
    invoiceId: "INV-2026-010",
    customer: {
      _id: "c-010", fullName: "Nirosha Hardware Mart", email: "nirosha@nirhw.lk",
      phone: "011-234-5678", vatNumber: "COL-1120-011", customerCode: "CUST-00105",
      address: { street: "145, Baseline Road", city: "Colombo 09", country: "Sri Lanka", zip: "00900" },
    },
    items: [
      { _id: "ii-010a", item: "inv-001", quantity: 20, unitPrice: 2450, total: 49000 },
      { _id: "ii-010b", item: "inv-006", quantity: 25, unitPrice: 680, total: 17000 },
    ],
    subTotal: 66000, discount: 3300, totalAmount: 62700,
    paymentStatus: "Pending", paymentMethod: "Bank Deposit",
    issueDate: d(-2), dueDate: d(13),
    vehicleNumber: "WP-COL-2244",
    notes: "Customer requested 15-day credit.",
    created_at: d(-2), updated_at: d(-2),
  },
];
