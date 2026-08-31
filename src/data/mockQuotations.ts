import type { QuotationResponse } from "../types/quotation";
import { mapQuotation } from '../services/apiMappers';

const d = (offset: number) => {
  const base = new Date("2026-08-17T00:00:00.000Z");
  base.setDate(base.getDate() + offset);
  return base.toISOString();
};

const rawMockQuotations: any[] = [
  {
    id: "quo-001",
    quotationNumber: "QUO-2026-001",
    customer: {
      id: "c-001", fullName: "Kandy Construction Supplies", email: "pradeep@kandycon.lk",
      phone: "+94705787818", phone2: "081-234-5678", phone3: "070-456-7890",
      vatNumber: "KAD-7800-001", customerCode: "CUST-00104",
      address: { street: "23, Peradeniya Road", city: "Kandy", country: "Sri Lanka", zip: "20000" },
    },
    items: [
      { id: "qi-001a", inventoryItemId: "inv-010", quantity: 200, unitPrice: 2950, total: 590000 },
      { id: "qi-001b", inventoryItemId: "inv-009", quantity: 100, unitPrice: 1950, total: 195000 },
    ],
    subTotal: 785000, discount: 39250, totalAmount: 745750,
    paymentMethod: "bank_transfer",
    issueDate: d(-45), validUntil: d(-15),
    status: "accepted",
    notes: "Customer requested 5% discount — approved.",
    createdAt: d(-45), updatedAt: d(-40),
  },
  {
    id: "quo-002",
    quotationNumber: "QUO-2026-002",
    customer: {
      id: "c-002", fullName: "Lanka Hardware Traders", email: "info@lankahardware.lk",
      phone: "+94705787818", phone2: "011-255-4321", phone3: "077-123-4567",
      vatNumber: "COL-9920-003", customerCode: "CUST-00101",
      address: { street: "45, Main Street, Pettah", city: "Colombo", country: "Sri Lanka", zip: "01100" },
    },
    items: [
      { id: "qi-002a", inventoryItemId: "inv-008", quantity: 20, unitPrice: 16500, total: 330000 },
      { id: "qi-002b", inventoryItemId: "inv-001", quantity: 100, unitPrice: 2450, total: 245000 },
    ],
    subTotal: 575000, discount: 28750, totalAmount: 546250,
    paymentMethod: "bank_transfer",
    issueDate: d(-38), validUntil: d(-8),
    status: "accepted",
    notes: "Bulk order from regular distributor.",
    createdAt: d(-38), updatedAt: d(-35),
  },
  {
    id: "quo-003",
    quotationNumber: "QUO-2026-003",
    customer: {
      id: "c-003", fullName: "Modern Build Solutions", email: "chamara@modernbuild.lk",
      phone: "+94705787818", phone2: "033-456-7890", phone3: "071-345-6789",
      vatNumber: "GAM-5560-010", customerCode: "CUST-00103",
      address: { street: "45, Kandy Road", city: "Gampaha", country: "Sri Lanka", zip: "11000" },
    },
    items: [
      { id: "qi-003a", inventoryItemId: "inv-009", quantity: 500, unitPrice: 1950, total: 975000 },
      { id: "qi-003b", inventoryItemId: "inv-007", quantity: 80, unitPrice: 1950, total: 156000 },
    ],
    subTotal: 1131000, discount: 56550, totalAmount: 1074450,
    paymentMethod: "bank_transfer",
    issueDate: d(-30), validUntil: d(0),
    status: "pending",
    notes: "Quotation valid 30 days. Awaiting client approval.",
    createdAt: d(-30), updatedAt: d(-30),
  },
  {
    id: "quo-004",
    quotationNumber: "QUO-2026-004",
    customer: {
      id: "c-004", fullName: "Jayantha Hardware & Paint", email: "jayantha@jayhw.lk",
      phone: "+94705787818", phone2: "033-234-5678", phone3: "075-123-9876",
      vatNumber: "GAM-3310-004", customerCode: "CUST-00109",
      address: { street: "12, New Kandy Road", city: "Kadawatha", country: "Sri Lanka", zip: "11850" },
    },
    items: [
      { id: "qi-004a", inventoryItemId: "inv-001", quantity: 80, unitPrice: 2450, total: 196000 },
      { id: "qi-004b", inventoryItemId: "inv-006", quantity: 60, unitPrice: 680, total: 40800 },
    ],
    subTotal: 236800, discount: 11840, totalAmount: 224960,
    paymentMethod: "cash",
    issueDate: d(-28), validUntil: d(2),
    status: "pending",
    notes: "Customer comparing with another supplier.",
    createdAt: d(-28), updatedAt: d(-28),
  },
  {
    id: "quo-005",
    quotationNumber: "QUO-2026-005",
    customer: {
      id: "c-005", fullName: "Galle Hardware Palace", email: "suresh@gallehw.lk",
      phone: "+94705787818", phone2: "091-234-5678", phone3: "076-234-5678",
      vatNumber: "GAL-2210-008", customerCode: "CUST-00102",
      address: { street: "23, Colombo Road", city: "Galle", country: "Sri Lanka", zip: "80000" },
    },
    items: [
      { id: "qi-005a", inventoryItemId: "inv-001", quantity: 100, unitPrice: 2450, total: 245000 },
      { id: "qi-005b", inventoryItemId: "inv-004", quantity: 50, unitPrice: 3100, total: 155000 },
    ],
    subTotal: 400000, discount: 20000, totalAmount: 380000,
    paymentMethod: "bank_deposit",
    issueDate: d(-60), validUntil: d(-30),
    status: "expired",
    notes: "Quotation expired. Customer to request renewal.",
    createdAt: d(-60), updatedAt: d(-60),
  },
  {
    id: "quo-006",
    quotationNumber: "QUO-2026-006",
    customer: {
      id: "c-006", fullName: "City Plumbing & Electrical", email: "nalika@cityplumb.lk",
      phone: "+94705787818", phone2: "011-567-8901",
      vatNumber: "COL-8840-008", customerCode: "CUST-00108",
      address: { street: "34, Deans Road", city: "Colombo 10", country: "Sri Lanka", zip: "01000" },
    },
    items: [
      { id: "qi-006a", inventoryItemId: "inv-003", quantity: 120, unitPrice: 950, total: 114000 },
      { id: "qi-006b", inventoryItemId: "inv-005", quantity: 30, unitPrice: 2600, total: 78000 },
    ],
    subTotal: 192000, discount: 9600, totalAmount: 182400,
    paymentMethod: "cash",
    issueDate: d(-12), validUntil: d(18),
    status: "accepted",
    notes: "Plumbing fittings bundle. Accepted verbally.",
    createdAt: d(-12), updatedAt: d(-9),
  },
  {
    id: "quo-007",
    quotationNumber: "QUO-2026-007",
    customer: {
      id: "c-007", fullName: "Ravi Plumbing & Hardware", email: "ravi@raviplumb.lk",
      phone: "+94705787818", phone2: "011-678-9012", phone3: "071-876-5432",
      vatNumber: "COL-6630-007", customerCode: "CUST-00110",
      address: { street: "89, Stanley Thilakaratne Mawatha", city: "Nugegoda", country: "Sri Lanka", zip: "10250" },
    },
    items: [
      { id: "qi-007a", inventoryItemId: "inv-003", quantity: 150, unitPrice: 950, total: 142500 },
      { id: "qi-007b", inventoryItemId: "inv-005", quantity: 60, unitPrice: 2600, total: 156000 },
    ],
    subTotal: 298500, discount: 14925, totalAmount: 283575,
    paymentMethod: "bank_transfer",
    issueDate: d(-20), validUntil: d(10),
    status: "rejected",
    notes: "Customer rejected — price higher than competitor.",
    createdAt: d(-20), updatedAt: d(-17),
  },
  {
    id: "quo-008",
    quotationNumber: "QUO-2026-008",
    customer: {
      id: "c-008", fullName: "Up Country Hardware", email: "priyantha@upcohw.lk",
      phone: "+94705787818", phone2: "081-345-6789",
      vatNumber: "NUW-8840-009", customerCode: "CUST-00106",
      address: { street: "67, Clock Tower Road", city: "Nuwara Eliya", country: "Sri Lanka", zip: "22200" },
    },
    items: [
      { id: "qi-008a", inventoryItemId: "inv-007", quantity: 50, unitPrice: 1950, total: 97500 },
      { id: "qi-008b", inventoryItemId: "inv-006", quantity: 30, unitPrice: 680, total: 20400 },
    ],
    subTotal: 117900, discount: 5895, totalAmount: 112005,
    paymentMethod: "cash",
    issueDate: d(-5), validUntil: d(25),
    status: "pending",
    notes: "30-day validity.",
    createdAt: d(-5), updatedAt: d(-5),
  },
  {
    id: "quo-009",
    quotationNumber: "QUO-2026-009",
    customer: {
      id: "c-009", fullName: "Saman Building Materials", email: "saman@samanbm.lk",
      phone: "+94705787818", phone2: "011-456-7890", phone3: "077-987-6543",
      vatNumber: "COL-5510-002", customerCode: "CUST-00107",
      address: { street: "78, High Level Road", city: "Maharagama", country: "Sri Lanka", zip: "10280" },
    },
    items: [
      { id: "qi-009a", inventoryItemId: "inv-009", quantity: 200, unitPrice: 1950, total: 390000 },
      { id: "qi-009b", inventoryItemId: "inv-002", quantity: 100, unitPrice: 1650, total: 165000 },
    ],
    subTotal: 555000, discount: 27750, totalAmount: 527250,
    paymentMethod: "bank_transfer",
    issueDate: d(-3), validUntil: d(27),
    status: "pending",
    notes: "Quotation for new site supply. Under review.",
    createdAt: d(-3), updatedAt: d(-3),
  },
  {
    id: "quo-010",
    quotationNumber: "QUO-2026-010",
    customer: {
      id: "c-010", fullName: "Nirosha Hardware Mart", email: "nirosha@nirhw.lk",
      phone: "+94705787818", phone2: "011-234-5678", phone3: "078-567-8901",
      vatNumber: "COL-1120-011", customerCode: "CUST-00105",
      address: { street: "145, Baseline Road", city: "Colombo 09", country: "Sri Lanka", zip: "00900" },
    },
    items: [
      { id: "qi-010a", inventoryItemId: "inv-001", quantity: 30, unitPrice: 2450, total: 73500 },
      { id: "qi-010b", inventoryItemId: "inv-006", quantity: 50, unitPrice: 680, total: 34000 },
    ],
    subTotal: 107500, discount: 5375, totalAmount: 102125,
    paymentMethod: "cash",
    issueDate: d(-1), validUntil: d(29),
    status: "pending",
    notes: "Small hardware order. Customer reviewing.",
    createdAt: d(-1), updatedAt: d(-1),
  },
];

export const mockQuotationsList: QuotationResponse[] = rawMockQuotations.map(mapQuotation);
