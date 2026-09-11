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

export const formatDate = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(val).slice(0, 10);
  }
};
