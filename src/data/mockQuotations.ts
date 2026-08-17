import type { QuotationResponse } from "../types/quotation";

const d = (offset: number) => {
  const base = new Date("2026-08-17T00:00:00.000Z");
  base.setDate(base.getDate() + offset);
  return base.toISOString();
};

export const mockQuotationsList: QuotationResponse[] = [
  {
    _id: "quo-001",
    quotationId: "QUO-2026-001",
    customer: {
      _id: "c-001", fullName: "Kandy Construction Supplies", email: "pradeep@kandycon.lk",
      phone: "081-234-5678", vatNumber: "KAD-7800-001", customerCode: "CUST-00104",
      address: { street: "23, Peradeniya Road", city: "Kandy", country: "Sri Lanka", zip: "20000" },
    },
    items: [
      { _id: "qi-001a", item: "inv-010", quantity: 200, unitPrice: 2950, total: 590000 },
      { _id: "qi-001b", item: "inv-009", quantity: 100, unitPrice: 1950, total: 195000 },
    ],
    subTotal: 785000, discount: 39250, totalAmount: 745750,
    paymentMethod: "Bank Transfer",
    issueDate: d(-45), validUntil: d(-15),
    status: "Accepted",
    notes: "Customer requested 5% discount — approved.",
    createdAt: d(-45), updatedAt: d(-40),
  },
  {
    _id: "quo-002",
    quotationId: "QUO-2026-002",
    customer: {
      _id: "c-002", fullName: "Lanka Hardware Traders", email: "info@lankahardware.lk",
      phone: "011-255-4321", vatNumber: "COL-9920-003", customerCode: "CUST-00101",
      address: { street: "45, Main Street, Pettah", city: "Colombo", country: "Sri Lanka", zip: "01100" },
    },
    items: [
      { _id: "qi-002a", item: "inv-008", quantity: 20, unitPrice: 16500, total: 330000 },
      { _id: "qi-002b", item: "inv-001", quantity: 100, unitPrice: 2450, total: 245000 },
    ],
    subTotal: 575000, discount: 28750, totalAmount: 546250,
    paymentMethod: "Bank Transfer",
    issueDate: d(-38), validUntil: d(-8),
    status: "Accepted",
    notes: "Bulk order from regular distributor.",
    createdAt: d(-38), updatedAt: d(-35),
  },
  {
    _id: "quo-003",
    quotationId: "QUO-2026-003",
    customer: {
      _id: "c-003", fullName: "Modern Build Solutions", email: "chamara@modernbuild.lk",
      phone: "033-456-7890", vatNumber: "GAM-5560-010", customerCode: "CUST-00103",
      address: { street: "45, Kandy Road", city: "Gampaha", country: "Sri Lanka", zip: "11000" },
    },
    items: [
      { _id: "qi-003a", item: "inv-009", quantity: 500, unitPrice: 1950, total: 975000 },
      { _id: "qi-003b", item: "inv-007", quantity: 80, unitPrice: 1950, total: 156000 },
    ],
    subTotal: 1131000, discount: 56550, totalAmount: 1074450,
    paymentMethod: "Bank Transfer",
    issueDate: d(-30), validUntil: d(0),
    status: "Pending",
    notes: "Quotation valid 30 days. Awaiting client approval.",
    createdAt: d(-30), updatedAt: d(-30),
  },
  {
    _id: "quo-004",
    quotationId: "QUO-2026-004",
    customer: {
      _id: "c-004", fullName: "Jayantha Hardware & Paint", email: "jayantha@jayhw.lk",
      phone: "033-234-5678", vatNumber: "GAM-3310-004", customerCode: "CUST-00109",
      address: { street: "12, New Kandy Road", city: "Kadawatha", country: "Sri Lanka", zip: "11850" },
    },
    items: [
      { _id: "qi-004a", item: "inv-001", quantity: 80, unitPrice: 2450, total: 196000 },
      { _id: "qi-004b", item: "inv-006", quantity: 60, unitPrice: 680, total: 40800 },
    ],
    subTotal: 236800, discount: 11840, totalAmount: 224960,
    paymentMethod: "Cash",
    issueDate: d(-28), validUntil: d(2),
    status: "Pending",
    notes: "Customer comparing with another supplier.",
    createdAt: d(-28), updatedAt: d(-28),
  },
  {
    _id: "quo-005",
    quotationId: "QUO-2026-005",
    customer: {
      _id: "c-005", fullName: "Galle Hardware Palace", email: "suresh@gallehw.lk",
      phone: "091-234-5678", vatNumber: "GAL-2210-008", customerCode: "CUST-00102",
      address: { street: "23, Colombo Road", city: "Galle", country: "Sri Lanka", zip: "80000" },
    },
    items: [
      { _id: "qi-005a", item: "inv-001", quantity: 100, unitPrice: 2450, total: 245000 },
      { _id: "qi-005b", item: "inv-004", quantity: 50, unitPrice: 3100, total: 155000 },
    ],
    subTotal: 400000, discount: 20000, totalAmount: 380000,
    paymentMethod: "Bank Deposit",
    issueDate: d(-60), validUntil: d(-30),
    status: "Expired",
    notes: "Quotation expired. Customer to request renewal.",
    createdAt: d(-60), updatedAt: d(-60),
  },
  {
    _id: "quo-006",
    quotationId: "QUO-2026-006",
    customer: {
      _id: "c-006", fullName: "City Plumbing & Electrical", email: "nalika@cityplumb.lk",
      phone: "011-567-8901", vatNumber: "COL-8840-008", customerCode: "CUST-00108",
      address: { street: "34, Deans Road", city: "Colombo 10", country: "Sri Lanka", zip: "01000" },
    },
    items: [
      { _id: "qi-006a", item: "inv-003", quantity: 120, unitPrice: 950, total: 114000 },
      { _id: "qi-006b", item: "inv-005", quantity: 30, unitPrice: 2600, total: 78000 },
    ],
    subTotal: 192000, discount: 9600, totalAmount: 182400,
    paymentMethod: "Cash",
    issueDate: d(-12), validUntil: d(18),
    status: "Accepted",
    notes: "Plumbing fittings bundle. Accepted verbally.",
    createdAt: d(-12), updatedAt: d(-9),
  },
  {
    _id: "quo-007",
    quotationId: "QUO-2026-007",
    customer: {
      _id: "c-007", fullName: "Ravi Plumbing & Hardware", email: "ravi@raviplumb.lk",
      phone: "011-678-9012", vatNumber: "COL-6630-007", customerCode: "CUST-00110",
      address: { street: "89, Stanley Thilakaratne Mawatha", city: "Nugegoda", country: "Sri Lanka", zip: "10250" },
    },
    items: [
      { _id: "qi-007a", item: "inv-003", quantity: 150, unitPrice: 950, total: 142500 },
      { _id: "qi-007b", item: "inv-005", quantity: 60, unitPrice: 2600, total: 156000 },
    ],
    subTotal: 298500, discount: 14925, totalAmount: 283575,
    paymentMethod: "Bank Transfer",
    issueDate: d(-20), validUntil: d(10),
    status: "Rejected",
    notes: "Customer rejected — price higher than competitor.",
    createdAt: d(-20), updatedAt: d(-17),
  },
  {
    _id: "quo-008",
    quotationId: "QUO-2026-008",
    customer: {
      _id: "c-008", fullName: "Up Country Hardware", email: "priyantha@upcohw.lk",
      phone: "081-345-6789", vatNumber: "NUW-8840-009", customerCode: "CUST-00106",
      address: { street: "67, Clock Tower Road", city: "Nuwara Eliya", country: "Sri Lanka", zip: "22200" },
    },
    items: [
      { _id: "qi-008a", item: "inv-007", quantity: 50, unitPrice: 1950, total: 97500 },
      { _id: "qi-008b", item: "inv-006", quantity: 30, unitPrice: 680, total: 20400 },
    ],
    subTotal: 117900, discount: 5895, totalAmount: 112005,
    paymentMethod: "Cash",
    issueDate: d(-5), validUntil: d(25),
    status: "Pending",
    notes: "30-day validity.",
    createdAt: d(-5), updatedAt: d(-5),
  },
  {
    _id: "quo-009",
    quotationId: "QUO-2026-009",
    customer: {
      _id: "c-009", fullName: "Saman Building Materials", email: "saman@samanbm.lk",
      phone: "011-456-7890", vatNumber: "COL-5510-002", customerCode: "CUST-00107",
      address: { street: "78, High Level Road", city: "Maharagama", country: "Sri Lanka", zip: "10280" },
    },
    items: [
      { _id: "qi-009a", item: "inv-009", quantity: 200, unitPrice: 1950, total: 390000 },
      { _id: "qi-009b", item: "inv-002", quantity: 100, unitPrice: 1650, total: 165000 },
    ],
    subTotal: 555000, discount: 27750, totalAmount: 527250,
    paymentMethod: "Bank Transfer",
    issueDate: d(-3), validUntil: d(27),
    status: "Pending",
    notes: "Quotation for new site supply. Under review.",
    createdAt: d(-3), updatedAt: d(-3),
  },
  {
    _id: "quo-010",
    quotationId: "QUO-2026-010",
    customer: {
      _id: "c-010", fullName: "Nirosha Hardware Mart", email: "nirosha@nirhw.lk",
      phone: "011-234-5678", vatNumber: "COL-1120-011", customerCode: "CUST-00105",
      address: { street: "145, Baseline Road", city: "Colombo 09", country: "Sri Lanka", zip: "00900" },
    },
    items: [
      { _id: "qi-010a", item: "inv-001", quantity: 30, unitPrice: 2450, total: 73500 },
      { _id: "qi-010b", item: "inv-006", quantity: 50, unitPrice: 680, total: 34000 },
    ],
    subTotal: 107500, discount: 5375, totalAmount: 102125,
    paymentMethod: "Cash",
    issueDate: d(-1), validUntil: d(29),
    status: "Pending",
    notes: "Small hardware order. Customer reviewing.",
    createdAt: d(-1), updatedAt: d(-1),
  },
];
