import type { SalesOfficer, SalesOfficerPerformanceSummary, SalesOfficerFilterPeriod } from '../types/salesOfficer';
import type { InvoiceResponse } from '../types/invoice';
import type { Order } from '../types/orders';
import { mockSalesOfficers } from '../data/mockSalesOfficers';

const STORAGE_KEY = 'erp_sales_officers_list';

export class SalesOfficerService {
  private getStored(): SalesOfficer[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSalesOfficers));
      return mockSalesOfficers;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return mockSalesOfficers;
    }
  }

  private saveStored(data: SalesOfficer[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async getAll(): Promise<SalesOfficer[]> {
    return this.getStored();
  }

  async getById(id: string): Promise<SalesOfficer | undefined> {
    const all = this.getStored();
    return all.find(so => so.id === id || so.officerId === id);
  }

  private syncCustomerAssignments(officerName: string, assignedIds: string[]): void {
    try {
      const custRaw = localStorage.getItem("erp_customers");
      if (!custRaw) return;
      const customers = JSON.parse(custRaw);
      if (!Array.isArray(customers)) return;

      const updated = customers.map((c: any) => {
        const cId = c.id || c._id;
        if (assignedIds.includes(cId)) {
          return {
            ...c,
            salesRep: officerName,
            salesRepName: officerName,
          };
        } else if (c.salesRep === officerName || c.salesRepName === officerName) {
          return {
            ...c,
            salesRep: undefined,
            salesRepName: undefined,
          };
        }
        return c;
      });

      localStorage.setItem("erp_customers", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  async create(data: Omit<SalesOfficer, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesOfficer> {
    const all = this.getStored();
    const newOfficer: SalesOfficer = {
      ...data,
      id: `so-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.unshift(newOfficer);
    this.saveStored(all);

    if (data.assignedCustomerIds && data.assignedCustomerIds.length > 0) {
      this.syncCustomerAssignments(data.fullName, data.assignedCustomerIds);
    }

    return newOfficer;
  }

  async update(id: string, data: Partial<SalesOfficer>): Promise<SalesOfficer> {
    const all = this.getStored();
    const index = all.findIndex(so => so.id === id || so.officerId === id);
    if (index === -1) {
      throw new Error(`Sales Officer with ID ${id} not found`);
    }
    const updated = {
      ...all[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    this.saveStored(all);

    if (data.assignedCustomerIds !== undefined) {
      this.syncCustomerAssignments(updated.fullName, data.assignedCustomerIds);
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const all = this.getStored();
    const filtered = all.filter(so => so.id !== id && so.officerId !== id);
    this.saveStored(filtered);
  }

  // Filter invoices and orders within a specific date timeframe
  filterRecordsByPeriod<T extends { issueDate?: string; orderDate?: string; created_at?: string; createdAt?: string }>(
    items: T[],
    period: SalesOfficerFilterPeriod
  ): T[] {
    if (period.type === 'all') return items;

    const now = new Date();
    
    // Determine start & end boundaries
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period.type === 'week') {
      // Start of current week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (period.type === 'month') {
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (period.type === 'last_month') {
      // Start and end of previous month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period.type === 'last_6_months') {
      // 6 months ago
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1, 0, 0, 0, 0);
    } else if (period.type === 'custom' && period.startDate) {
      startDate = new Date(period.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (period.endDate) {
        endDate = new Date(period.endDate);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      return items;
    }

    return items.filter(item => {
      const dateStr = item.issueDate || item.orderDate || item.created_at || item.createdAt;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      return d >= startDate && d <= endDate;
    });
  }

  // Calculate comprehensive performance breakdown for an officer or entire team
  calculateOfficerPerformance(
    officer: SalesOfficer | 'ALL',
    invoices: InvoiceResponse[],
    orders: Order[] = []
  ): SalesOfficerPerformanceSummary {
    const isAll = officer === 'ALL';
    const officerName = isAll ? 'Entire Sales Team' : officer.fullName;
    const officerCode = isAll ? 'ALL' : (officer.officerId || officer.id);
    const territory = isAll ? 'Island-wide Network' : (officer.assignedTerritory || 'General Area');
    const status = isAll ? 'Active' : officer.status;

    // Filter invoices by officer
    const officerInvoices = isAll
      ? invoices
      : invoices.filter(inv => {
          if (typeof inv.salesman === 'object' && inv.salesman !== null) {
            return inv.salesman.name === officer.fullName || (inv.salesman as any)._id === officer.id || (inv.salesman as any)._id === officer.officerId;
          }
          if (inv.salesmanName) return inv.salesmanName === officer.fullName;
          if (typeof inv.salesman === 'string') {
            return inv.salesman === officer.fullName || inv.salesman === officer.id || inv.salesman === officer.officerId;
          }
          return false;
        });

    // Filter orders by officer
    const officerOrders = isAll
      ? orders
      : orders.filter(ord => {
          if (!ord.salesman) return false;
          return ord.salesman.name === officer.fullName || ord.salesman.employeeId === officer.officerId || ord.salesman.id === officer.id;
        });

    const now = new Date();

    let totalSalesValue = 0;
    let collectedAmount = 0;
    let pendingCreditAmount = 0;
    let overdueAmount = 0;

    let completedInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let overdueInvoicesCount = 0;

    officerInvoices.forEach(inv => {
      const amount = inv.totalAmount || 0;
      totalSalesValue += amount;

      const isCompleted = inv.paymentStatus === 'Completed';
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
      const isOverdue = !isCompleted && dueDate && dueDate < now;

      if (isCompleted) {
        collectedAmount += amount;
        completedInvoicesCount++;
      } else if (isOverdue) {
        overdueAmount += amount;
        pendingCreditAmount += amount;
        overdueInvoicesCount++;
      } else {
        pendingCreditAmount += amount;
        pendingInvoicesCount++;
      }
    });

    const collectionRate = totalSalesValue > 0 ? Math.round((collectedAmount / totalSalesValue) * 100) : 0;

    return {
      officerId: isAll ? 'all' : officer.id,
      officerName,
      officerCode,
      territory,
      status,
      totalSalesValue,
      completedSalesValue: collectedAmount,
      collectedAmount,
      pendingCreditAmount,
      overdueAmount,
      totalInvoicesCount: officerInvoices.length,
      completedInvoicesCount,
      pendingInvoicesCount,
      overdueInvoicesCount,
      totalOrdersCount: officerOrders.length,
      collectionRate,
    };
  }
}

export const salesOfficerService = new SalesOfficerService();
