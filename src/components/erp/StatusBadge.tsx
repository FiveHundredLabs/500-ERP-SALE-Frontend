import React from 'react';
import type { OrderStatusType } from '../../types/orders';
import type { POStatusType } from '../../types/purchaseOrders';
import type { CustomerStatusValue } from '../../types/customers';
import type { SupplierStatusValue } from '../../types/suppliers';

type StatusValue =
  | OrderStatusType
  | POStatusType
  | CustomerStatusValue
  | SupplierStatusValue
  | 'paid' | 'unpaid' | 'partial'
  | 'pending' | 'completed' | 'accepted' | 'rejected' | 'expired' | 'Converted'
  | string;

const STATUS_MAP: Record<string, string> = {
  // Success Badges
  'approved':         'badge badge-approved',
  'completed':        'badge badge-completed',
  'Active':           'badge badge-active',
  'paid':             'badge badge-paid',
  'accepted':         'badge badge-accepted',
  'In Stock':         'badge badge-in-stock',

  // Warning Badges
  'pending':          'badge badge-pending',
  'pending_approval': 'badge badge-pending',
  'reviewing':        'badge badge-reviewing',
  'Low Stock':        'badge badge-low-stock',
  'partially_received':'badge badge-partial',
  'Partially Delivered':'badge badge-partial',
  'partial':          'badge badge-partial-pay',

  // Danger Badges
  'rejected':         'badge badge-rejected',
  'cancelled':        'badge badge-cancelled',
  'expired':          'badge badge-cancelled',
  'unpaid':           'badge badge-unpaid',
  'Out of Stock':     'badge badge-out-of-stock',
  'overdue':          'badge badge-overdue',

  // Info Badges
  'converted_to_po':  'badge badge-converted',
  'Converted':        'badge badge-converted',
  'processing':       'badge badge-processing',
  'Sent':             'badge badge-sent',
  'Viewed':           'badge badge-viewed',

  // Neutral / Draft
  'draft':            'badge badge-draft',
  'Inactive':         'badge badge-inactive',
};

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const cls = STATUS_MAP[status] || 'badge badge-draft';
  return (
    <span className={`${cls} ${className}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
