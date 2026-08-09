import type { FinanceTransaction, FinancePaymentData } from "../types/finance";
import { mockFinanceTransactions } from "../data/mockFinance";

export interface NextTransactionIdResponse {
  nextTransactionId: string;
}

export interface DeleteTransactionResponse {
  message: string;
}

export const financeService = {
  // Get all transactions
  async getAll(): Promise<FinanceTransaction[]> {
    return [...mockFinanceTransactions];
  },

  // Get next transaction ID
  async getNextId(): Promise<string> {
    const nextNum = mockFinanceTransactions.length + 1;
    return `TXN-2026-${nextNum.toString().padStart(3, '0')}`;
  },

  // Get transaction by ID
  async getById(id: string): Promise<FinanceTransaction> {
    const found = mockFinanceTransactions.find(t => t._id === id || t.transactionId === id);
    if (found) return found;
    return mockFinanceTransactions[0];
  },

  // Create new transaction
  async create(transactionData: FinancePaymentData): Promise<FinanceTransaction> {
    const nextIdStr = `TXN-2026-${(mockFinanceTransactions.length + 1).toString().padStart(3, '0')}`;
    const newTx: FinanceTransaction = {
      _id: `tx-${Date.now()}`,
      transactionId: nextIdStr,
      type: transactionData.type as any || "Income",
      category: transactionData.category || "General",
      amount: Number(transactionData.amount) || 0,
      paymentMethod: transactionData.paymentMethod || "Cash",
      referenceId: transactionData.referenceId,
      description: transactionData.description,
      transactionDate: new Date(transactionData.transactionDate).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockFinanceTransactions.unshift(newTx);
    return newTx;
  },

  // Update transaction
  async update(id: string, updateData: Partial<FinancePaymentData>): Promise<FinanceTransaction> {
    const found = mockFinanceTransactions.find(t => t._id === id || t.transactionId === id);
    if (found) {
      Object.assign(found, updateData, { updated_at: new Date().toISOString() });
      return found;
    }
    return mockFinanceTransactions[0];
  },

  // Delete transaction
  async delete(id: string): Promise<DeleteTransactionResponse> {
    const index = mockFinanceTransactions.findIndex(t => t._id === id || t.transactionId === id);
    if (index !== -1) {
      mockFinanceTransactions.splice(index, 1);
    }
    return { message: "Transaction deleted successfully" };
  },
};