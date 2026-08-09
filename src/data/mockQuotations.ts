import type { QuotationResponse } from "../types/quotation";

export const mockQuotationsList: QuotationResponse[] = [
  {
    _id: "quo-001",
    quotationId: "QUO-2026-001",
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
        _id: "qitem-1",
        item: "P-PIPE-50",
        quantity: 20,
        unitPrice: 2450,
        total: 49000
      },
      {
        _id: "qitem-2",
        item: "V-BALL-15",
        quantity: 10,
        unitPrice: 3100,
        total: 31000
      }
    ],
    subTotal: 80000,
    discount: 4000,
    totalAmount: 76000,
    paymentMethod: "Bank Transfer",
    issueDate: "2026-02-01T00:00:00.000Z",
    validUntil: "2026-03-01T00:00:00.000Z",
    status: "Accepted",
    notes: "Quotation valid for 30 days.",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z"
  },
  {
    _id: "quo-002",
    quotationId: "QUO-2026-002",
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
        _id: "qitem-3",
        item: "B-ELBOW-90",
        quantity: 50,
        unitPrice: 950,
        total: 47500
      }
    ],
    subTotal: 47500,
    discount: 2375,
    totalAmount: 45125,
    paymentMethod: "Cash",
    issueDate: "2026-02-05T00:00:00.000Z",
    validUntil: "2026-03-05T00:00:00.000Z",
    status: "Pending",
    notes: "Direct retail quotation.",
    createdAt: "2026-02-05T00:00:00.000Z",
    updatedAt: "2026-02-05T00:00:00.000Z"
  }
];
