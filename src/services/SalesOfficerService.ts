import type { SalesOfficer, SalesOfficerPerformanceSummary, SalesOfficerFilterPeriod } from '../types/salesOfficer';
import type { InvoiceResponse } from '../types/invoice';
import type { Order } from '../types/orders';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'erp_sales_officers_list';

export class SalesOfficerService {
  private getStored(): SalesOfficer[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveStored(data: SalesOfficer[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async getAll(): Promise<SalesOfficer[]> {
    try {
      const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users)) {
          const salesmen = users.filter((u: any) => u.role === 'salesman');
          if (salesmen.length > 0) {
            return salesmen.map((u: any, idx: number) => ({
              id: u._id || u.id,
              officerId: `SO-${String(idx + 1).padStart(3, '0')}`,
              fullName: u.fullName || u.email,
              contactNumber: u.phone || '+94705787818',
              phone: u.phone || '+94705787818',
              joiningDate: u.created_at ? u.created_at.split('T')[0] : '2026-01-01',
              username: u.email ? u.email.split('@')[0] : `user${idx + 1}`,
              email: u.email,
              status: 'Active' as const,
              assignedTerritory: u.area || 'All Regions',
              assignedArea: u.area || 'All Regions',
              monthlyTarget: 1000000,
              commissionRate: 5,
              assignedCustomerIds: [],
              createdAt: u.created_at || u.createdAt || new Date().toISOString(),
              updatedAt: u.updated_at || u.updatedAt || new Date().toISOString(),
            }));
          }
        }
      }
    } catch {
      // fallback to stored
    }
    return this.getStored();
  }

  async getById(id: string): Promise<SalesOfficer | undefined> {
    const all = await this.getAll();
    return all.find(so => so.id === id || so.officerId === id);
  }

  async create(data: Omit<SalesOfficer, 'id' | 'createdAt' | 'updatedAt'>): Promise<SalesOfficer> {
    const all = await this.getAll();
    const newOfficer: SalesOfficer = {
      ...data,
      id: `so-${Date.now()}`,
      officerId: data.officerId || `SO-${String(all.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedCustomerIds: data.assignedCustomerIds || [],
    };
    all.unshift(newOfficer);
    this.saveStored(all);
    return newOfficer;
  }

  async update(id: string, data: Partial<SalesOfficer>): Promise<SalesOfficer> {
    const all = await this.getAll();
    const index = all.findIndex(so => so.id === id || so.officerId === id);
    if (index === -1) {
      throw new Error(`Sales officer with ID ${id} not found`);
    }
    const updated = {
      ...all[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    all[index] = updated;
    this.saveStored(all);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const all = await this.getAll();
    const filtered = all.filter(so => so.id !== id && so.officerId !== id);
    this.saveStored(filtered);
    return true;
  }

  filterRecordsByPeriod<T extends { issueDate?: string; created_at?: string; orderDate?: string; createdAt?: string }>(
    records: T[],
    period: SalesOfficerFilterPeriod
  ): T[] {
    const now = new Date();
    return records.filter((r) => {
      const dateStr = r.issueDate || r.orderDate || r.created_at || r.createdAt;
      if (!dateStr) return true;
      const d = new Date(dateStr);

      switch (period.type) {
        case 'week': {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= oneWeekAgo && d <= now;
        }
        case 'month':
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'last_month': {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
        }
        case 'last_6_months': {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
          return d >= sixMonthsAgo && d <= now;
        }
        case 'custom':
          if (period.startDate && period.endDate) {
            return d >= new Date(period.startDate) && d <= new Date(period.endDate);
          }
          return true;
        case 'all':
        default:
          return true;
      }
    });
  }

  calculateOfficerPerformance(
    officer: SalesOfficer | 'ALL',
    invoices: InvoiceResponse[],
    orders: Order[]
  ): SalesOfficerPerformanceSummary {
    const now = new Date();

    const officerInvoices = invoices.filter((inv) => {
      if (officer === 'ALL') return true;
      const sName =
        typeof inv.salesman === 'object' && inv.salesman !== null
          ? inv.salesman.name || (inv.salesman as any).fullName
          : inv.salesmanName || (typeof inv.salesman === 'string' ? inv.salesman : '');
      return sName === officer.fullName || (inv.salesman as any)?._id === officer.id;
    });

    const officerOrders = orders.filter((ord) => {
      if (officer === 'ALL') return true;
      return (
        ord.salesman?.name === officer.fullName ||
        ord.salesman?.id === officer.id ||
        ord.salesman?.id === officer.officerId
      );
    });

    const totalSalesValue = officerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const completedInvoices = officerInvoices.filter(
      (inv) => inv.paymentStatus === 'Completed' || inv.paymentStatus === 'Paid'
    );
    const completedSalesValue = completedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const collectedAmount = completedSalesValue;
    const pendingCreditAmount = totalSalesValue - completedSalesValue;

    const overdueInvoices = officerInvoices.filter((inv) => {
      if (inv.paymentStatus === 'Completed' || inv.paymentStatus === 'Paid') return false;
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
      return dueDate && dueDate < now;
    });
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const collectionRate = totalSalesValue > 0 ? Math.round((collectedAmount / totalSalesValue) * 100) : 0;

    return {
      officerId: officer === 'ALL' ? 'ALL' : officer.id,
      officerName: officer === 'ALL' ? 'All Sales Officers' : officer.fullName,
      officerCode: officer === 'ALL' ? 'ALL' : (officer.officerId || officer.id),
      territory: officer === 'ALL' ? 'All Island' : (officer.assignedTerritory || officer.assignedArea || 'Region'),
      status: officer === 'ALL' ? 'Active' : officer.status,
      totalSalesValue,
      completedSalesValue,
      collectedAmount,
      pendingCreditAmount,
      overdueAmount,
      totalInvoicesCount: officerInvoices.length,
      completedInvoicesCount: completedInvoices.length,
      pendingInvoicesCount: officerInvoices.length - completedInvoices.length,
      overdueInvoicesCount: overdueInvoices.length,
      totalOrdersCount: officerOrders.length,
      collectionRate,
    };
  }
}

export const salesOfficerService = new SalesOfficerService();
