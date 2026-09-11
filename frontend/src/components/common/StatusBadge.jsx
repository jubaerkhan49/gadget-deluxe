import React from 'react';
import { Chip } from '@mui/material';

const STATUS_CONFIG = {
  IN_STOCK: { label: 'In Stock', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  WAITING_SHIPMENT: { label: 'Waiting Shipment', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  UNDER_REPAIR: { label: 'Under Repair', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  SOLD: { label: 'Sold', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  RETURNED: { label: 'Returned', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const StatusBadge = ({ status, displayLabel, size = 'small' }) => {
  const config = STATUS_CONFIG[status] || {
    label: displayLabel || status || 'Unknown',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
  };

  return (
    <Chip
      size={size}
      label={displayLabel || config.label}
      sx={{
        color: config.color,
        backgroundColor: config.bg,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        border: `1px solid ${config.color}33`,
      }}
    />
  );
};

export default StatusBadge;
