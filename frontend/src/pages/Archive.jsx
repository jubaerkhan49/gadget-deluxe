import React, { useState, useEffect } from 'react';
import { useSmartPolling } from '../utils/useSmartPolling';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Archive as ArchiveIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Visibility as ViewIcon,
  RestoreFromTrash as RestoreIcon,
  FileDownload as ExportIcon,
  MonetizationOn as ProfitIcon,
  PointOfSale as SalesIcon,
  PhoneAndroid as PhoneIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { formatNumber, downloadCSVBlob, exportDevicesToCSV } from '../utils/formatters';
import { deviceApi, saleApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import CopyableText from '../components/common/CopyableText';
import VariantBadge from '../components/common/VariantBadge';
import StatusBadge from '../components/common/StatusBadge';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';
import EditDeviceDialog from '../dialogs/EditDeviceDialog';

export default function Archive() {
  const { enqueueSnackbar } = useSnackbar();

  const cachedDevices = apiCache.get('/api/devices/');
  const cachedSales = apiCache.get('/api/sales/');

  const [devices, setDevices] = useState(() => {
    const all = cachedDevices?.results || cachedDevices || [];
    return all.filter((d) => d.current_status === 'SOLD');
  });
  const [sales, setSales] = useState(() => cachedSales?.results || cachedSales || []);
  const [loading, setLoading] = useState(() => !cachedDevices);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Modals & Drawers
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchArchivedData(Boolean(cachedDevices));
  }, []);

  // Live smart polling every 30s (pauses automatically when tab is minimized/hidden)
  useSmartPolling(() => {
    fetchArchivedData(true);
  }, 30000);

  const fetchArchivedData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [devsRes, salesRes] = await Promise.all([
        deviceApi.getAll(),
        saleApi.getAll()
      ]);
      const allDevs = devsRes.data.results || devsRes.data || [];
      const freshSales = salesRes.data.results || salesRes.data || [];
      const soldDevs = allDevs.filter((d) => d.current_status === 'SOLD');

      apiCache.set('/api/devices/', allDevs);
      apiCache.set('/api/sales/', freshSales);

      setDevices(soldDevs);
      setSales(freshSales);
    } catch (err) {
      console.error(err);
      if (!silent) {
        enqueueSnackbar('Failed to load archived sold devices', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreToStock = async (device) => {
    try {
      await deviceApi.update(device.id, {
        current_status: 'IN_STOCK'
      });
      enqueueSnackbar(`Device ${device.model} (${device.imei}) restored to In Stock!`, {
        variant: 'success'
      });
      fetchArchivedData();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to restore device to In Stock', { variant: 'error' });
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await deviceApi.exportCSV({ status: 'SOLD' });
      downloadCSVBlob(res.data, 'archived_sold_devices.csv');
      enqueueSnackbar('Archived devices CSV exported successfully', { variant: 'success' });
    } catch (err) {
      console.warn('Backend CSV export failed, using local export fallback:', err);
      try {
        exportDevicesToCSV(filteredDevices.length > 0 ? filteredDevices : devices, 'archived_sold_devices.csv');
        enqueueSnackbar('Archived devices CSV exported successfully', { variant: 'success' });
      } catch (fallbackErr) {
        enqueueSnackbar('Failed to export CSV', { variant: 'error' });
      }
    } finally {
      setExporting(false);
    }
  };

  // Map sale info to devices (latest sale takes priority)
  const salesMap = {};
  sales.forEach((s) => {
    if (s.device) {
      const existing = salesMap[s.device];
      if (!existing) {
        salesMap[s.device] = s;
      } else {
        const existingTime = new Date(existing.sale_date || existing.created_at || 0).getTime();
        const currentTime = new Date(s.sale_date || s.created_at || 0).getTime();
        if (currentTime > existingTime) {
          salesMap[s.device] = s;
        }
      }
    }
  });

  // Calculate metrics
  const totalArchived = devices.length;
  let totalRevenue = 0;
  let totalProfit = 0;

  devices.forEach((d) => {
    const s = salesMap[d.id];
    if (s) {
      totalRevenue += Number(s.selling_price || 0);
      totalProfit += Number(s.profit || 0);
    } else if (d.selling_price) {
      totalRevenue += Number(d.selling_price || 0);
      const cost = Number(d.buying_price || 0);
      totalProfit += Math.max(0, Number(d.selling_price) - cost);
    }
  });

  const filteredDevices = devices.filter((dev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const s = salesMap[dev.id];
    return (
      dev.imei?.toLowerCase().includes(q) ||
      dev.imei2?.toLowerCase().includes(q) ||
      dev.serial_number?.toLowerCase().includes(q) ||
      dev.model?.toLowerCase().includes(q) ||
      dev.color?.toLowerCase().includes(q) ||
      s?.customer_name?.toLowerCase().includes(q) ||
      s?.seller_username?.toLowerCase().includes(q) ||
      s?.invoice_number?.toLowerCase().includes(q)
    );
  });

  // Sort archived devices by latest sold date first
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    const saleA = salesMap[a.id];
    const saleB = salesMap[b.id];

    const timeA = saleA?.sale_date
      ? new Date(saleA.sale_date).getTime()
      : saleA?.created_at
      ? new Date(saleA.created_at).getTime()
      : new Date(a.updated_at || a.created_at || 0).getTime();

    const timeB = saleB?.sale_date
      ? new Date(saleB.sale_date).getTime()
      : saleB?.created_at
      ? new Date(saleB.created_at).getTime()
      : new Date(b.updated_at || b.created_at || 0).getTime();

    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return (b.id || 0) - (a.id || 0);
  });

  const paginatedDevices = sortedDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3
        }}
      >
        <div>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
            Archived Devices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Historical archive of sold units, customer invoices, and realized profits ({filteredDevices.length} archived)
          </Typography>
        </div>
        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <ExportIcon />}
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  color: '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PhoneIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL SOLD / ARCHIVED
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {totalArchived}
                </Typography>
              </div>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <SalesIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL REVENUE (BDT)
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main">
                  {formatNumber(totalRevenue)}
                </Typography>
              </div>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2.5, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#06B6D4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ProfitIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  REALIZED PROFIT (BDT)
                </Typography>
                <Typography variant="h5" fontWeight={800} color="info.main">
                  {formatNumber(totalProfit)}
                </Typography>
              </div>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Search Input */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by Model, IMEI, Serial, Customer Name, Invoice, or Seller..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
      </Paper>

      {/* Mobile Archive Cards View (xs to md) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredDevices.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No archived sold devices found.
            </Typography>
          </Paper>
        ) : (
          paginatedDevices.map((dev) => {
            const sale = salesMap[dev.id];
            const sellPrice = sale?.selling_price || dev.selling_price || null;
            const cleanCap = dev.capacity ? String(dev.capacity).replace(/gb/gi, '').trim() : '';
            const cleanCol = dev.color ? String(dev.color).trim().split(/\s+/)[0] : '';
            const specs = [cleanCap, cleanCol].filter(Boolean).join(' • ');

            return (
              <Card
                key={`mob-arch-${dev.id}`}
                variant="outlined"
                onClick={() => {
                  setSelectedDevice(dev);
                  setDrawerOpen(true);
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                {/* Top Row: Model, Specs & Status */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {dev.model}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.2 }}>
                      {specs && (
                        <Typography variant="caption" color="text.secondary">
                          {specs}
                        </Typography>
                      )}
                      {dev.variant && <VariantBadge variant={dev.variant} size="small" />}
                    </Box>
                  </Box>
                  <StatusBadge status={dev.current_status} />
                </Box>

                {/* IMEI & Price */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 0.8,
                    borderRadius: 1.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CopyableText text={dev.imei} />
                  <Typography variant="caption" fontWeight={800} color="success.main">
                    {sellPrice ? `${formatNumber(sellPrice)} ৳` : '—'}
                  </Typography>
                </Box>

                {/* Bottom Row: Customer / Seller & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.3 }} onClick={(e) => e.stopPropagation()}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem' }}>
                      Sold by: <strong>{sale?.seller_username || dev.current_owner_name || 'Store'}</strong>
                    </Typography>
                    {sale?.customer_name && (
                      <Typography variant="caption" color="text.secondary">
                        Customer: {sale.customer_name}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Restore to Active Stock">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRestoreToStock(dev)}
                        sx={{ p: 0.5 }}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Card>
            );
          })
        )}
      </Box>

      {/* Archive Desktop Table (md+) */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IMEI / Serial</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer / Invoice</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No archived sold devices found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((dev) => {
                  const sale = salesMap[dev.id];
                  const sellPrice = sale?.selling_price || dev.selling_price || null;
                  const cleanCap = dev.capacity ? String(dev.capacity).replace(/gb/gi, '').trim() : '';
                  const cleanCol = dev.color ? String(dev.color).trim().split(/\s+/)[0] : '';
                  const specs = [cleanCap, cleanCol].filter(Boolean).join(' • ');

                  return (
                    <TableRow key={dev.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {dev.model}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.3 }}>
                          {specs && (
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {specs}
                            </Typography>
                          )}
                          {specs && dev.variant && (
                            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                              •
                            </Typography>
                          )}
                          {dev.variant && <VariantBadge variant={dev.variant} size="small" />}
                        </Box>
                      </TableCell>

                      <TableCell>
                        <CopyableText text={dev.imei} />
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={dev.current_status} />
                      </TableCell>

                      <TableCell>
                        {sale ? (
                          <>
                            <Typography variant="body2" fontWeight={600}>
                              {sale.customer_name || 'Walk-in Customer'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              #{sale.invoice_number || 'N/A'} • {sale.sale_date?.split('T')[0] || '—'}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Marked as Sold
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {sale?.seller_username || dev.current_owner_name || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          {sellPrice ? `${formatNumber(sellPrice)} BDT` : '—'}
                        </Typography>
                        {dev.buying_price && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Cost: {formatNumber(dev.buying_price)}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="View Device Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDevice(dev);
                                setDrawerOpen(true);
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Restore to Active Stock (Un-Archive)">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleRestoreToStock(dev)}
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredDevices.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Device Detail Drawer */}
      <DeviceDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        device={selectedDevice}
        onDeviceUpdated={() => fetchArchivedData()}
        onDeviceDeleted={() => fetchArchivedData()}
        onEditRequested={(dev) => {
          setEditDevice(dev);
          setEditDialogOpen(true);
        }}
      />

      {/* Edit Device Modal */}
      {editDevice && (
        <EditDeviceDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditDevice(null);
          }}
          device={editDevice}
          onDeviceUpdated={() => fetchArchivedData()}
        />
      )}
    </Box>
  );
}
