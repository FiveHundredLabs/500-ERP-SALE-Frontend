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

  // Goods Received — distinct teal/amber treatment
  'goods_received':   'badge badge-processing',

  // Danger Badges
  'rejected':         'badge badge-rejected',
  'cancelled':        'badge badge-cancelled',
  'expired':          'badge badge-cancelled',
  'unpaid':           'badge badge-unpaid',
  'Out of Stock':     'badge badge-out-of-stock',
  'overdue':          'badge badge-overdue',

  // Info Badges
  'converted_to_po':  'badge badge-converted',
  'converted_to_invoice': 'badge badge-completed',
  'Converted':        'badge badge-converted',
  'processing':       'badge badge-processing',
  'Sent':             'badge badge-sent',
  'Viewed':           'badge badge-viewed',

  // Neutral / Draft
  'draft':            'badge badge-draft',
  'Inactive':         'badge badge-inactive',
};

// Human-friendly labels for raw enum values
const STATUS_LABELS: Record<string, string> = {
  pending_approval:    'Pending Approval',
  partially_received:  'Partially Received',
  goods_received:      'Goods Received',
  converted_to_po:     'Converted to PO',
  converted_to_invoice:'Converted to Invoice',
};

interface StatusBadgeProps {
  status: StatusValue;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const cls = STATUS_MAP[status] || 'badge badge-draft';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`${cls} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
