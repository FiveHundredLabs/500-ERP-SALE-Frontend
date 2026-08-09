import type { InvoiceResponse } from "../types/invoice";

const today = new Date();

// Helper to format ISO date relative to today
const relativeDate = (daysOffset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
};

export const mockInvoicesList: InvoiceResponse[] = [
  {
    _id: "inv-001",
    invoiceId: "INV-2026-001",
    customer: {
      _id: "cust-001",
      fullName: "Lanka Hardware Traders",
      email: "info@lankahardware.lk",
      phone: "011-255-4321",
      vatNumber: "119283401-7000",
      customerCode: "CUST-001",
      address: {
        street: "45 Main Street",
        city: "Colombo",
        country: "Sri Lanka",
        zip: "00100"
      }
    },
    items: [
      {
        _id: "invitem-1",
        item: "P-PIPE-50",
        quantity: 10,
        unitPrice: 2450,
        total: 24500
      }
    ],
    subTotal: 24500,
    discount: 1225,
    totalAmount: 23275,
    paymentStatus: "Completed",
    paymentMethod: "Cash",
    issueDate: relativeDate(-20),
    dueDate: relativeDate(-5),
    vehicleNumber: "WP CAB-1234",
    notes: "Paid in cash on delivery.",
    created_at: relativeDate(-20),
    updated_at: relativeDate(-5)
  },
  {
    _id: "inv-002",
    invoiceId: "INV-2026-002",
    customer: {
      _id: "cust-002",
      fullName: "City Plumbing Works",
      email: "contact@cityplumbing.lk",
      phone: "077-123-9876",
      vatNumber: "229104820-7000",
      customerCode: "CUST-002",
      address: {
        street: "12 Station Road",
        city: "Gampaha",
        country: "Sri Lanka",
        zip: "11000"
      }
    },
    items: [
      {
        _id: "invitem-2",
        item: "B-ELBOW-90",
        quantity: 30,
        unitPrice: 950,
        total: 28500
      }
    ],
    subTotal: 28500,
    discount: 1425,
    totalAmount: 27075,
    paymentStatus: "Pending",
    paymentMethod: "Bank Transfer",
    issueDate: relativeDate(-12),
    dueDate: relativeDate(2), // Near credit period end (Due in 2 days!)
    vehicleNumber: "WP GA-5678",
    notes: "Near credit period expiry (due in 2 days).",
    created_at: relativeDate(-12),
    updated_at: relativeDate(-12)
  },
  {
    _id: "inv-003",
    invoiceId: "INV-2026-003",
    customer: {
      _id: "cust-003",
      fullName: "Apex Building Supplies",
      email: "sales@apexbuilding.lk",
      phone: "033-987-6543",
      vatNumber: "338192031-7000",
      customerCode: "CUST-003",
      address: {
        street: "88 Kandy Road",
        city: "Kelaniya",
        country: "Sri Lanka",
        zip: "11600"
      }
    },
    items: [
      {
        _id: "invitem-3",
        item: "V-BALL-15",
        quantity: 25,
        unitPrice: 3100,
        total: 77500
      }
    ],
    subTotal: 77500,
    discount: 3875,
    totalAmount: 73625,
    paymentStatus: "Pending",
    paymentMethod: "Bank Deposit",
    issueDate: relativeDate(-25),
    dueDate: relativeDate(-8), // OVERDUE by 8 days!
    vehicleNumber: "WP CBO-9988",
    notes: "Credit period exceeded by 8 days.",
    created_at: relativeDate(-25),
    updated_at: relativeDate(-25)
  },
  {
    _id: "inv-004",
    invoiceId: "INV-2026-004",
    customer: {
      _id: "cust-004",
      fullName: "Southern Electro-Hardware",
      email: "info@southernelectro.lk",
      phone: "091-444-3322",
      vatNumber: "449102938-7000",
      customerCode: "CUST-004",
      address: {
        street: "104 Galle Road",
        city: "Matara",
        country: "Sri Lanka",
        zip: "81000"
      }
    },
    items: [
      {
        _id: "invitem-4",
        item: "T-SOLVENT-500",
        quantity: 100,
        unitPrice: 680,
        total: 68000
      }
    ],
    subTotal: 68000,
    discount: 3400,
    totalAmount: 64600,
    paymentStatus: "Pending",
    paymentMethod: "Cheque",
    issueDate: relativeDate(-5),
    dueDate: relativeDate(5), // Near credit period end (Due in 5 days!)
    vehicleNumber: "SP MA-3321",
    notes: "Cheque due in 5 days.",
    created_at: relativeDate(-5),
    updated_at: relativeDate(-5)
  }
];
