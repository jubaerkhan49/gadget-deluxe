import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Divider,
  Menu
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, userApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import AddDeviceDialog from '../dialogs/AddDeviceDialog';
import EditDeviceDialog from '../dialogs/EditDeviceDialog';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';

const VARIANTS = [
  'All',
  'Modified',
  'USA eSim',
  'Canada',
  'Mexican',
  'Korea',
  'Singapore',
  'Bypass'
];

const STATUS_CHOICES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'LOST', label: 'Lost' }
];

export default function Inventory() {
  const { enqueueSnackbar } = useSnackbar();

  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedOwner, setSelectedOwner] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Modals / Drawers
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchUsers();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await deviceApi.getAll();
      setDevices(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load inventory', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll();
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/devices/export-csv/', '_blank');
  };

  // Filter devices in memory for instant responsiveness
  const filteredDevices = devices.filter((dev) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchImei = dev.imei?.toLowerCase().includes(q);
      const matchImei2 = dev.imei2?.toLowerCase().includes(q);
      const matchSerial = dev.serial_number?.toLowerCase().includes(q);
      const matchModel = dev.model?.toLowerCase().includes(q);
      const matchColor = dev.color?.toLowerCase().includes(q);
      if (!matchImei && !matchImei2 && !matchSerial && !matchModel && !matchColor) {
        return false;
      }
    }

    // Variant Filter
    if (selectedVariant !== 'All' && dev.variant !== selectedVariant) {
      return false;
    }

    // Status Filter
    if (selectedStatus !== 'ALL' && dev.current_status !== selectedStatus) {
      return false;
    }

    // Owner Filter
    if (selectedOwner === 'UNASSIGNED' && dev.current_owner) {
      return false;
    } else if (selectedOwner !== 'ALL' && selectedOwner !== 'UNASSIGNED' && String(dev.current_owner) !== String(selectedOwner)) {
      return false;
    }

    return true;
  });

  const paginatedDevices = filteredDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ pb: 4 }}>
      {/* Top Header & Actions */}
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
            Device Inventory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, filter and audit all mobile phone assets ({filteredDevices.length} matching)
          </Typography>
        </div>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDeviceOpen(true)}
          >
            Add Device
          </Button>
        </Stack>
      </Box>

      {/* Filter Control Box */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          {/* Top Filter Bar: Search, Status & Owner Selectors */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
              alignItems: 'center'
            }}
          >
            <TextField
              size="small"
              placeholder="Search by Model, IMEI, Serial, Color..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{ flex: 1, width: { xs: '100%', md: 'auto' } }}
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

            <FormControl size="small" sx={{ minWidth: 160, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(0);
                }}
              >
                {STATUS_CHOICES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 170, width: { xs: '100%', md: 'auto' } }}>
              <InputLabel>Assigned Owner</InputLabel>
              <Select
                value={selectedOwner}
                label="Assigned Owner"
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="ALL">All Owners</MenuItem>
                <MenuItem value="UNASSIGNED">Unassigned</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider />

          {/* 7 Variant Filter Chips */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mr: 1, textTransform: 'uppercase' }}>
              Variants:
            </Typography>
            {VARIANTS.map((variant) => {
              const isSelected = selectedVariant === variant;
              return (
                <Chip
                  key={variant}
                  label={variant}
                  size="small"
                  clickable
                  onClick={() => {
                    setSelectedVariant(variant);
                    setPage(0);
                  }}
                  color={isSelected ? "primary" : "default"}
                  variant={isSelected ? "filled" : "outlined"}
                  sx={{
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '8px'
                  }}
                />
              );
            })}
          </Box>
        </Stack>
      </Paper>

      {/* Inventory Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IMEI / Serial</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Battery</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Buying Cost</TableCell>
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
                    No devices match your current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((dev) => (
                  <TableRow
                    key={dev.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedDevice(dev);
                      setDrawerOpen(true);
                    }}
                  >
                    {/* Device Model & Specs */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {dev.model}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                      </Typography>
                    </TableCell>

                    {/* Variant Badge */}
                    <TableCell>
                      <VariantBadge variant={dev.variant} />
                    </TableCell>

                    {/* IMEI / Serial */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <CopyableText text={dev.imei} />
                      {dev.serial_number && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                          SN: {dev.serial_number}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={dev.current_status} />
                    </TableCell>

                    {/* Battery Health */}
                    <TableCell>
                      {dev.battery_health ? (
                        <Typography variant="body2" fontWeight={600}>
                          {dev.battery_health}%
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Assigned Owner */}
                    <TableCell>
                      {dev.current_owner_name ? (
                        <Chip
                          size="small"
                          label={dev.current_owner_name}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>

                    {/* Buying Cost */}
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {dev.buying_price !== null && dev.buying_price !== undefined
                          ? Math.round(Number(dev.buying_price)).toLocaleString()
                          : '—'}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Details">
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
                        <Tooltip title="Edit Device">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setEditDevice(dev);
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
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

      {/* Modals & Drawers */}
      <AddDeviceDialog
        open={addDeviceOpen}
        onClose={() => setAddDeviceOpen(false)}
        onDeviceCreated={() => fetchInventory()}
      />

      <EditDeviceDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditDevice(null);
        }}
        device={editDevice}
        onDeviceUpdated={() => fetchInventory()}
      />

      <DeviceDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedDevice(null);
        }}
        device={selectedDevice}
        onDeviceUpdated={(updated) => {
          setSelectedDevice(updated);
          fetchInventory();
        }}
        onEditRequested={(dev) => {
          setEditDevice(dev);
          setEditDialogOpen(true);
        }}
        onDeviceDeleted={() => fetchInventory()}
      />
    </Box>
  );
}
