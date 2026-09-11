import React from 'react';
import { Chip } from '@mui/material';

const VARIANT_CONFIG = {
  'Modified': { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  'USA eSim': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'Canada': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  'Mexican': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'Korea': { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  'Singapore': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  'Bypass': { color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
};

const VariantBadge = ({ variant, size = 'small' }) => {
  if (!variant) return null;

  const config = VARIANT_CONFIG[variant] || {
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
  };

  return (
    <Chip
      size={size}
      label={variant}
      sx={{
        color: config.color,
        backgroundColor: config.bg,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        border: `1px solid ${config.color}33`,
      }}
    />
  );
};

export default VariantBadge;
