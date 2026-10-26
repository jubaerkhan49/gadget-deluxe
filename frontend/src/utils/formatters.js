/**
 * Formats numbers using South Asian (Indian / Bangladeshi) numbering system (Lakhs / Crores)
 * e.g., 1380660 -> "13,80,660"
 */
export const formatNumber = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '0';
  return Math.round(Number(val)).toLocaleString('en-IN');
};

export const formatBDT = (val) => {
  if (val === null || val === undefined || val === '' || isNaN(Number(val))) return '—';
  return `${formatNumber(val)} BDT`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Universal Date Formatter
 * Formats all dates to: <day> <month_name>, <year>
 * e.g., "20 October, 2026"
 */
export const formatDate = (val) => {
  if (!val) return '—';
  try {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      // YYYY-MM-DD or YYYY/MM/DD (preserves exact date without timezone shifting)
      const isoDateOnlyMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed);
      if (isoDateOnlyMatch) {
        const year = parseInt(isoDateOnlyMatch[1], 10);
        const monthIdx = parseInt(isoDateOnlyMatch[2], 10) - 1;
        const day = parseInt(isoDateOnlyMatch[3], 10);
        if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day) && !isNaN(year)) {
          return `${day} ${MONTH_NAMES[monthIdx]}, ${year}`;
        }
      }
      // DD-MM-YYYY or DD/MM/YYYY
      const dmyMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(trimmed);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const monthIdx = parseInt(dmyMatch[2], 10) - 1;
        const year = parseInt(dmyMatch[3], 10);
        if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day) && !isNaN(year)) {
          return `${day} ${MONTH_NAMES[monthIdx]}, ${year}`;
        }
      }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch (e) {
    return String(val).slice(0, 10);
  }
};

export const formatDateTime = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const datePart = formatDate(d);
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart}, ${timePart}`;
  } catch (e) {
    return String(val);
  }
};

export const downloadCSVBlob = (blobData, filename = 'inventory_devices.csv') => {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const exportDevicesToCSV = (devices, filename = 'inventory_devices.csv') => {
  if (!devices || devices.length === 0) {
    throw new Error('No devices available to export');
  }

  const headers = [
    'IMEI',
    'IMEI2',
    'MEID',
    'Serial Number',
    'Model',
    'Capacity',
    'Color',
    'Variant',
    'Status',
    'Battery Health',
    'Assigned To',
    'Buying Price',
    'Selling Price',
    'Created Date'
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = devices.map((d) => [
    escapeCSV(d.imei),
    escapeCSV(d.imei2),
    escapeCSV(d.meid),
    escapeCSV(d.serial_number),
    escapeCSV(d.model),
    escapeCSV(d.capacity),
    escapeCSV(d.color),
    escapeCSV(d.variant),
    escapeCSV(d.current_status_display || d.current_status),
    escapeCSV(d.battery_health),
    escapeCSV(d.current_owner_name || d.current_owner?.username || 'Unassigned'),
    escapeCSV(d.buying_price),
    escapeCSV(d.selling_price),
    escapeCSV(d.created_at ? new Date(d.created_at).toLocaleString() : '')
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadCSVBlob(csvContent, filename);
};
