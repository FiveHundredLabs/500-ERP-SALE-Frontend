import type { SalesOfficer, SalesOfficerPerformanceSummary, SalesOfficerFilterPeriod } from '../types/salesOfficer';
import type { InvoiceResponse } from '../types/invoice';
import type { Order } from '../types/orders';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export class SalesOfficerService {
  private getAuthHeaders(extraHeaders: Record<string, string> = {}) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers: Record<string, string> = { ...extraHeaders };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getAll(): Promise<SalesOfficer[]> {
    try {
      const res = await fetch(`${API_BASE}/users`, { 
        headers: this.getAuthHeaders(),
        credentials: 'include' 
      });
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users)) {
          const salesmen = users.filter((u: any) => u.role === 'salesman');
          return salesmen.map((u: any, idx: number) => ({
            id: u._id || u.id,
            officerId: u.officerId || `SO-${String(idx + 1).padStart(3, '0')}`,
            fullName: u.fullName || u.email,
            contactNumber: u.contactNumber || u.phone || '+94705787818',
            phone: u.phone || '+94705787818',
            joiningDate: u.joiningDate ? u.joiningDate.split('T')[0] : (u.createdAt ? u.createdAt.split('T')[0] : '2026-01-01'),
            username: u.username || (u.email ? u.email.split('@')[0] : `user${idx + 1}`),
            email: u.email,
            status: u.status || 'Active',
            assignedTerritory: u.assignedTerritory || u.assignedArea || 'All Regions',
            assignedArea: u.assignedArea || u.assignedTerritory || 'All Regions',
            monthlyTarget: 1000000,
            commissionRate: 5,
            assignedCustomerIds: u.assignedCustomerIds || [],
            createdAt: u.createdAt || new Date().toISOString(),
            updatedAt: u.updatedAt || new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load sales officers", e);
    }
    return [];
  }

  async getById(id: string): Promise<SalesOfficer | undefined> {
    const all = await this.getAll();
    return all.find(so => so.id === id || so.officerId === id);
  }

  async create(data: Omit<SalesOfficer, 'id' | 'createdAt' | 'updatedAt'> & { password?: string; assignedCustomers?: string[] }): Promise<SalesOfficer> {
    const all = await this.getAll();
    const payload = {
      fullName: data.fullName,
      email: data.email || `${data.username || Date.now()}@erp.local`,
      password: data.password || '123456',
      role: 'salesman',
      phone: data.contactNumber,
      contactNumber: data.contactNumber,
      joiningDate: data.joiningDate,
      status: data.status,
      assignedCustomerIds: data.assignedCustomerIds,
      assignedCustomers: data.assignedCustomers,
      assignedTerritory: data.assignedTerritory,
      assignedArea: data.assignedArea,
      username: data.username,
      officerId: data.officerId || `SO-${String(all.length + 1).padStart(3, '0')}`,
    };

    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create sales officer');
    }

    const created = await res.json();
    return {
      ...data,
      id: created._id || created.id,
      officerId: payload.officerId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    } as SalesOfficer;
  }

  async update(id: string, data: Partial<SalesOfficer> & { password?: string; assignedCustomers?: string[] }): Promise<SalesOfficer> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to update sales officer ${id}`);
    }

    const updated = await res.json();
    return {
      ...data,
      id: updated._id || updated.id,
      updatedAt: updated.updatedAt,
    } as SalesOfficer;
  }

  async delete(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to delete sales officer ${id}`);
    }
    return true;
  }

  filterRecordsByPeriod<T extends { issueDate?: string; createdAt?: string; orderDate?: string }>(
    records: T[],
    period: SalesOfficerFilterPeriod
  ): T[] {
    const now = new Date();
    return records.filter((r) => {
      const dateStr = r.issueDate || r.orderDate || r.createdAt;
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
          ? inv.salesman.fullName
          : inv.salesmanName || (typeof inv.salesman === 'string' ? inv.salesman : '');
      return sName === officer.fullName || inv.salesman?.id === officer.id;
    });

    const officerOrders = orders.filter((ord) => {
      if (officer === 'ALL') return true;
      return (
        ord.salesman?.fullName === officer.fullName ||
        ord.salesman?.id === officer.id ||
        ord.salesman?.id === officer.officerId
      );
    });

    const totalSalesValue = officerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const completedInvoices = officerInvoices.filter(
      (inv) => inv.paymentStatus === 'completed' || inv.paymentStatus === 'paid'
    );
    const completedSalesValue = completedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const collectedAmount = completedSalesValue;
    const pendingCreditAmount = totalSalesValue - completedSalesValue;

    const overdueInvoices = officerInvoices.filter((inv) => {
      if (inv.paymentStatus === 'completed' || inv.paymentStatus === 'paid') return false;
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
