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
  | 'Paid' | 'Unpaid' | 'Partial'
  | 'Pending' | 'Completed' | 'Accepted' | 'Rejected' | 'Expired' | 'Converted'
  | string;

const STATUS_MAP: Record<string, string> = {
  // Success Badges
  'Approved':         'badge badge-approved',
  'Completed':        'badge badge-completed',
  'Active':           'badge badge-active',
  'Paid':             'badge badge-paid',
  'Accepted':         'badge badge-accepted',
  'In Stock':         'badge badge-in-stock',

  // Warning Badges
  'Pending':          'badge badge-pending',
  'Pending Approval': 'badge badge-pending',
  'Reviewing':        'badge badge-reviewing',
  'Low Stock':        'badge badge-low-stock',
  'Partially Received':'badge badge-partial',
  'Partially Delivered':'badge badge-partial',
  'Partial':          'badge badge-partial-pay',

  // Danger Badges
  'Rejected':         'badge badge-rejected',
  'Cancelled':        'badge badge-cancelled',
  'Expired':          'badge badge-cancelled',
  'Unpaid':           'badge badge-unpaid',
  'Out of Stock':     'badge badge-out-of-stock',
  'Overdue':          'badge badge-overdue',

  // Info Badges
  'Converted to PO':  'badge badge-converted',
  'Converted':        'badge badge-converted',
  'Processing':       'badge badge-processing',
  'Sent':             'badge badge-sent',
  'Viewed':           'badge badge-viewed',

  // Neutral / Draft
  'Draft':            'badge badge-draft',
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
