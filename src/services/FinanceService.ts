import type { FinanceTransaction, FinancePaymentData } from "../types/finance";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface NextTransactionIdResponse {
  nextTransactionId: string;
}

export interface DeleteTransactionResponse {
  message: string;
}

export const financeService = {
  // Get all transactions
  async getAll(): Promise<FinanceTransaction[]> {
    const res = await fetch(`${API_BASE}/finance`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch transactions`);
    return res.json();
  },

  // Get next transaction ID
  async getNextId(): Promise<string> {
    const res = await fetch(`${API_BASE}/finance/next-id`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch next transaction ID`);
    const data = await res.json();
    return data.nextTransactionId || `TXN-${Date.now()}`;
  },

  // Get transaction by ID
  async getById(id: string): Promise<FinanceTransaction> {
    const res = await fetch(`${API_BASE}/finance/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Transaction ${id} not found`);
    return res.json();
  },

  // Create new transaction
  async create(transactionData: FinancePaymentData): Promise<FinanceTransaction> {
    const res = await fetch(`${API_BASE}/finance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(transactionData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to create transaction`);
    }
    return res.json();
  },

  // Update transaction
  async update(id: string, updateData: Partial<FinancePaymentData>): Promise<FinanceTransaction> {
    const res = await fetch(`${API_BASE}/finance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update transaction`);
    }
    return res.json();
  },

  // Delete transaction
  async delete(id: string): Promise<DeleteTransactionResponse> {
    const res = await fetch(`${API_BASE}/finance/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to delete transaction`);
    }
    return { message: "Transaction deleted successfully" };
  },
};