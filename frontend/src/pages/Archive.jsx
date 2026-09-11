import React, { useState, useEffect } from 'react';
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
import { formatNumber } from '../utils/formatters';
import { deviceApi, saleApi } from '../api/client';
import CopyableText from '../components/common/CopyableText';
import VariantBadge from '../components/common/VariantBadge';
import StatusBadge from '../components/common/StatusBadge';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';
import EditDeviceDialog from '../dialogs/EditDeviceDialog';

export default function Archive() {
  const { enqueueSnackbar } = useSnackbar();

  const [devices, setDevices] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
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
    fetchArchivedData();
  }, []);

  const fetchArchivedData = async () => {
    try {
      setLoading(true);
      const [devsRes, salesRes] = await Promise.all([
        deviceApi.getAll(),
        saleApi.getAll()
      ]);
      const allDevs = devsRes.data.results || devsRes.data || [];
      const soldDevs = allDevs.filter((d) => d.current_status === 'SOLD');
      setDevices(soldDevs);
      setSales(salesRes.data.results || salesRes.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load archived sold devices', { variant: 'error' });
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

  const handleExportCSV = () => {
    window.open('/api/devices/export-csv/', '_blank');
  };

  // Map sale info to devices
  const salesMap = {};
  sales.forEach((s) => {
    if (s.device) {
      salesMap[s.device] = s;
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

  const paginatedDevices = filteredDevices.slice(
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
          startIcon={<ExportIcon />}
          onClick={handleExportCSV}
        >
          Export CSV
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

      {/* Archive Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No archived sold devices found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((dev) => {
                  const sale = salesMap[dev.id];
                  const sellPrice = sale?.selling_price || dev.selling_price || null;

                  return (
                    <TableRow key={dev.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {dev.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dev.capacity ? `${dev.capacity} • ` : ''}{dev.color || 'Standard'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <VariantBadge variant={dev.variant} />
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
