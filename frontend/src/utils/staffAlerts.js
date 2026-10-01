/**
 * Helper utility for Employee / Staff Notifications & Automated Alert Rules
 */

export function calculateDaysAgo(dateStr) {
  if (!dateStr) return null;
  try {
    const cleanStr = String(dateStr).trim();
    // Support YYYY-MM-DD strings directly without UTC timezone skew
    let date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [y, m, d] = cleanStr.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(cleanStr);
    }

    if (isNaN(date.getTime())) return null;

    const now = new Date();
    // Normalize both dates to start of day in local time
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const diffMs = startOfToday - startOfTarget;
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return null;
  }
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    let d;
    const cleanStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      const [year, month, day] = cleanStr.split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(cleanStr);
    }
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch (e) {
    return String(dateStr).slice(0, 10);
  }
}

export function getDeviceAssignedDateStr(dev, currentUser) {
  if (!dev) return null;

  if (Array.isArray(dev.assignments) && dev.assignments.length > 0) {
    const userAssignments = dev.assignments.filter((assign) => {
      const matchId = currentUser?.id && (assign.employee === currentUser.id || assign.employee_id === currentUser.id);
      const matchUsername =
        currentUser?.username &&
        (String(assign.employee_username || '').toLowerCase() === currentUser.username.toLowerCase() ||
          String(assign.employeeName || '').toLowerCase() === currentUser.username.toLowerCase());
      const matchDisplayName =
        currentUser?.display_name &&
        String(assign.employee_name || '').toLowerCase() === currentUser.display_name.toLowerCase();
      return matchId || matchUsername || matchDisplayName;
    });

    if (userAssignments.length > 0) {
      userAssignments.sort(
        (a, b) => new Date(b.assigned_date || b.created_at || 0) - new Date(a.assigned_date || a.created_at || 0)
      );
      if (userAssignments[0].assigned_date) {
        return userAssignments[0].assigned_date;
      }
    }
  }

  if (dev.assigned_date) return dev.assigned_date;
  return dev.received_date_bd || dev.created_at;
}

export function computeStaffAlerts(devices = [], sales = [], currentUser = null) {
  // 1. Filter staff custody devices (not SOLD, not B2B)
  const myCustodyDevices = devices.filter((dev) => {
    if (dev.current_status === 'SOLD' || dev.is_b2b || dev.isB2B) return false;
    if (!dev.current_owner && !dev.current_owner_name) return false;

    const ownerId = typeof dev.current_owner === 'object' ? dev.current_owner?.id : dev.current_owner;
    const ownerName = typeof dev.current_owner === 'object' ? dev.current_owner?.username : dev.current_owner_name;

    const matchId = currentUser?.id && ownerId === currentUser.id;
    const matchUsername =
      currentUser?.username &&
      (String(ownerId).toLowerCase() === currentUser.username.toLowerCase() ||
        String(ownerName).toLowerCase() === currentUser.username.toLowerCase());
    const matchDisplayName =
      currentUser?.display_name &&
      String(ownerName).toLowerCase() === currentUser.display_name.toLowerCase();

    return matchId || matchUsername || matchDisplayName;
  });

  // 2. Filter staff sales
  const mySales = sales.filter((sale) => {
    if (!currentUser) return false;
    const seller = sale.seller || sale.seller_name || sale.sold_by;
    const sellerId = typeof seller === 'object' ? seller?.id : null;
    const sellerName = typeof seller === 'object' ? seller?.username : String(seller || '');

    const matchId = currentUser?.id && (sale.seller_id === currentUser.id || sellerId === currentUser.id);
    const matchUsername =
      currentUser?.username &&
      sellerName.toLowerCase() === currentUser.username.toLowerCase();
    const matchDisplayName =
      currentUser?.display_name &&
      sellerName.toLowerCase() === currentUser.display_name.toLowerCase();

    return matchId || matchUsername || matchDisplayName;
  });

  // Rule 1: Devices held 7+ days
  const staleCustodyDevices = myCustodyDevices
    .map((dev) => {
      const assignDate = getDeviceAssignedDateStr(dev, currentUser);
      const days = calculateDaysAgo(assignDate) || 0;
      return { device: dev, days, assignedDate: assignDate };
    })
    .filter((item) => item.days >= 7)
    .sort((a, b) => b.days - a.days);

  // Rule 2: Sales Inactivity Alert (3+ days)
  const latestSale = mySales.length > 0
    ? [...mySales].sort(
        (a, b) =>
          new Date(b.sale_date || b.created_at || 0) - new Date(a.sale_date || a.created_at || 0)
      )[0]
    : null;

  const latestSaleDateStr = latestSale ? (latestSale.sale_date || latestSale.created_at) : null;
  const daysSinceLastSale = latestSaleDateStr ? calculateDaysAgo(latestSaleDateStr) : null;

  let showInactivityAlert = false;
  let inactivityDays = 0;

  if (daysSinceLastSale !== null && daysSinceLastSale >= 3) {
    showInactivityAlert = true;
    inactivityDays = daysSinceLastSale;
  } else if (mySales.length === 0 && myCustodyDevices.length > 0) {
    // If no sales yet, days inactive equals days since oldest assigned device
    const oldestDays = Math.max(
      0,
      ...myCustodyDevices.map((d) => calculateDaysAgo(getDeviceAssignedDateStr(d, currentUser)) || 0)
    );
    if (oldestDays >= 3) {
      showInactivityAlert = true;
      inactivityDays = oldestDays;
    }
  }

  // Rule 3: Monthly Sales Target
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const curDay = now.getDate();
  const lastDayOfMonth = new Date(curYear, curMonth + 1, 0).getDate();
  const daysLeftInMonth = Math.max(1, lastDayOfMonth - curDay + 1);

  const currentMonthSales = mySales.filter((s) => {
    const rawDate = s.sale_date || s.created_at;
    if (!rawDate) return false;
    const d = new Date(rawDate);
    return d.getFullYear() === curYear && d.getMonth() === curMonth;
  });

  const monthlyTarget = 15;
  const currentMonthSalesCount = currentMonthSales.length;
  const remainingForTarget = Math.max(0, monthlyTarget - currentMonthSalesCount);
  const targetProgress = Math.min(1, currentMonthSalesCount / monthlyTarget);

  const totalAlertCount =
    staleCustodyDevices.length +
    (showInactivityAlert ? 1 : 0);

  return {
    myCustodyDevices,
    mySales,
    staleCustodyDevices,
    showInactivityAlert,
    inactivityDays,
    monthlyTarget,
    currentMonthSalesCount,
    remainingForTarget,
    targetProgress,
    daysLeftInMonth,
    totalAlertCount
  };
}
