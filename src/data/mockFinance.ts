import type { FinanceTransaction } from "../types/finance";

export const mockFinanceTransactions: FinanceTransaction[] = [
  {
    _id: "tx-001",
    transactionId: "TXN-2026-001",
    transactionDate: "2026-02-01T00:00:00.000Z",
    paymentMethod: {
      type: "Bank Transfer",
      bankName: "Commercial Bank",
      accountNumber: "8001234567",
      transactionRef: "CBL-REF-001"
    },
    invoice: {
      invoiceId: "INV-2026-001"
    },
    amount: "76000",
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z"
  },
  {
    _id: "tx-002",
    transactionId: "TXN-2026-002",
    transactionDate: "2026-02-03T00:00:00.000Z",
    paymentMethod: {
      type: "Bank Transfer",
      bankName: "Bank of Ceylon",
      accountNumber: "1234567890",
      transactionRef: "BOC-REF-002"
    },
    invoice: {
      invoiceId: "INV-2026-002"
    },
    amount: "145000",
    created_at: "2026-02-03T00:00:00.000Z",
    updated_at: "2026-02-03T00:00:00.000Z"
  }
];
