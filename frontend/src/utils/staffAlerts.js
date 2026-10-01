/**
 * Helper utility for Employee / Staff Notifications & Automated Alert Rules
 */

export function calculateDaysAgo(dateStr) {
  if (!dateStr) return null;
  try {
    const cleanStr = String(dateStr).trim();
    const date = new Date(cleanStr);
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return null;
  }
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month}, ${year}`;
  } catch (e) {
    return String(dateStr).slice(0, 10);
  }
}

export function getDeviceAssignedDateStr(dev, currentUser) {
  if (!dev) return null;

  if (Array.isArray(dev.assignments) && dev.assignments.length > 0) {
    const userAssign = dev.assignments.find((assign) => {
      const matchId = currentUser?.id && assign.employee === currentUser.id;
      const matchUsername =
        currentUser?.username &&
        (assign.employee_username?.toLowerCase() === currentUser.username.toLowerCase() ||
          assign.employeeName?.toLowerCase() === currentUser.username.toLowerCase());
      const matchDisplayName =
        currentUser?.display_name &&
        assign.employee_name?.toLowerCase() === currentUser.display_name.toLowerCase();
      return matchId || matchUsername || matchDisplayName;
    });
    if (userAssign?.assigned_date) {
      return userAssign.assigned_date;
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
    ? [...mySales].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
    : null;

  const daysSinceLastSale = latestSale?.created_at ? calculateDaysAgo(latestSale.created_at) : null;

  let showInactivityAlert = false;
  let inactivityDays = 0;

  if (daysSinceLastSale !== null && daysSinceLastSale >= 3) {
    showInactivityAlert = true;
    inactivityDays = daysSinceLastSale;
  } else if (mySales.length === 0 && myCustodyDevices.length > 0) {
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
    if (!s.created_at) return false;
    const d = new Date(s.created_at);
    return d.getFullYear() === curYear && d.getMonth() === curMonth;
  });

  const monthlyTarget = 15;
  const currentMonthSalesCount = currentMonthSales.length;
  const remainingForTarget = Math.max(0, monthlyTarget - currentMonthSalesCount);
  const targetProgress = Math.min(1, currentMonthSalesCount / monthlyTarget);

  const totalAlertCount =
    staleCustodyDevices.length +
    (showInactivityAlert ? 1 : 0) +
    (remainingForTarget > 0 ? 1 : 0);

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
