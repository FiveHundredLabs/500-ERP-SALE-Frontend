import type { FinanceTransaction } from "../types/finance";

export const mockFinanceTransactions: FinanceTransaction[] = [
  {
    _id: "tx-001",
    transactionId: "TXN-2026-001",
    type: "Income",
    category: "Invoice Payment",
    amount: 76000,
    paymentMethod: "Bank Transfer",
    referenceId: "INV-2026-001",
    description: "Full payment received for Invoice INV-2026-001",
    transactionDate: "2026-02-01T00:00:00.000Z",
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: "2026-02-01T00:00:00.000Z"
  },
  {
    _id: "tx-002",
    transactionId: "TXN-2026-002",
    type: "Expense",
    category: "Procurement Payment",
    amount: 145000,
    paymentMethod: "Bank Transfer",
    referenceId: "PO-2026-001",
    description: "Payment to Petrotec Pipes Pvt Ltd for PO-2026-001",
    transactionDate: "2026-02-03T00:00:00.000Z",
    created_at: "2026-02-03T00:00:00.000Z",
    updated_at: "2026-02-03T00:00:00.000Z"
  }
];
