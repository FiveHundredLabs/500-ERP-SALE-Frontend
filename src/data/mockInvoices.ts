import type { InvoiceResponse } from "../types/invoice";

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
    issueDate: "2026-02-01T00:00:00.000Z",
    dueDate: "2026-02-15T00:00:00.000Z",
    vehicleNumber: "WP CAB-1234",
    notes: "Paid in cash on delivery.",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z"
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
    issueDate: "2026-02-06T00:00:00.000Z",
    dueDate: "2026-02-20T00:00:00.000Z",
    vehicleNumber: "WP GA-5678",
    notes: "Payment expected by due date.",
    createdAt: "2026-02-06T00:00:00.000Z",
    updatedAt: "2026-02-06T00:00:00.000Z"
  }
];
