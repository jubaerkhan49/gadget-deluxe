import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  IconButton,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  Tooltip
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Business as SupplierIcon,
  LocalShipping as AgentIcon,
  Smartphone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, shipmentApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import { formatDate } from '../utils/formatters';

export default function DailyReceivedReportDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [dateType, setDateType] = useState('BD'); // 'BD' (received_date_bd) | 'CN' (shipment_receive_date_cn)
  const [devices, setDevices] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devRes, shipRes] = await Promise.all([
        deviceApi.getAll(),
        shipmentApi.getAll()
      ]);
      setDevices(devRes.data?.results || devRes.data || []);
      setShipments(shipRes.data?.results || shipRes.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load reception data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Map shipments by ID for quick lookup if device attributes are missing
  const shipmentMap = {};
  shipments.forEach((s) => {
    shipmentMap[s.id] = s;
  });

  // Filter devices received on the selected date
  const matchingDevices = devices.filter((d) => {
    const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
    if (dateType === 'BD') {
      const bdDate = d.received_date_bd ? d.received_date_bd.split('T')[0] : null;
      return bdDate === selectedDate;
    } else {
      const cnDate = (d.shipment_receive_date_cn || s?.receive_date) ? (d.shipment_receive_date_cn || s?.receive_date).split('T')[0] : null;
      return cnDate === selectedDate;
    }
  });

  // Group matching devices by Agent -> Supplier -> devices
  const agentGroups = {};
  matchingDevices.forEach((d) => {
    const s = d.current_shipment ? shipmentMap[d.current_shipment] : null;
    const agentName = d.shipment_agent || s?.shipping_company || 'Unassigned / Direct';
    const supplierName = d.shipment_supplier || s?.supplier_name || s?.supplier?.name || 'Direct / Unknown';

    if (!agentGroups[agentName]) {
      agentGroups[agentName] = {
        agent: agentName,
        total: 0,
        suppliers: {}
      };
    }
    agentGroups[agentName].total += 1;

    if (!agentGroups[agentName].suppliers[supplierName]) {
      agentGroups[agentName].suppliers[supplierName] = [];
    }
    agentGroups[agentName].suppliers[supplierName].push(d);
  });

  const agentList = Object.values(agentGroups);

  // Copy structured summary to clipboard
  const handleCopySummary = () => {
    if (matchingDevices.length === 0) {
      enqueueSnackbar('No devices received on this date to copy', { variant: 'info' });
      return;
    }

    const typeLabel = dateType === 'BD' ? 'Received from Agent (BD)' : 'Received at China Warehouse (CN)';
    let text = `📦 Daily Reception Report (${formatDate(selectedDate)})\n`;
    text += `Type: ${typeLabel}\n`;
    text += `Total Devices: ${matchingDevices.length}\n\n`;

    agentList.forEach((ag) => {
      text += `🚚 Agent: ${ag.agent} (${ag.total} ${ag.total === 1 ? 'device' : 'devices'})\n`;
      Object.entries(ag.suppliers).forEach(([sup, devs]) => {
        text += `  • ${sup}: ${devs.length} ${devs.length === 1 ? 'device' : 'devices'}\n`;
        devs.forEach((dev) => {
          text += `     - ${dev.model} [${dev.variant || 'Std'}] (${dev.capacity || ''} ${dev.color || ''}) - IMEI: ${dev.imei}\n`;
        });
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      enqueueSnackbar('Reception report copied to clipboard!', { variant: 'success' });
    }).catch(() => {
      enqueueSnackbar('Failed to copy to clipboard', { variant: 'error' });
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          overflow: 'hidden',
          maxWidth: { lg: '1080px' },
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18)'
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ReportIcon sx={{ fontSize: 24 }} />
          </Box>
          <div>
            <Typography variant="h6" fontWeight={800} letterSpacing={-0.3} lineHeight={1.2}>
              Daily Reception Report
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Audit devices received by agent and supplier for any selected date
            </Typography>
          </div>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover', color: 'text.primary' }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Date Filter & Preset Controls */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(248, 250, 252, 0.75)'
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Date Input */}
            <Grid item xs={12} sm={4}>
              <TextField
                type="date"
                label="Selected Date"
                size="small"
                fullWidth
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* Date Type Selector */}
            <Grid item xs={12} sm={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>Date Type</InputLabel>
                <Select
                  value={dateType}
                  label="Date Type"
                  onChange={(e) => setDateType(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="BD">BD Received Date (From Agent)</MenuItem>
                  <MenuItem value="CN">CN Receive Date (China Warehouse)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Quick Preset Buttons */}
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant={selectedDate === getTodayStr() ? 'contained' : 'outlined'}
                  onClick={() => setSelectedDate(getTodayStr())}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flex: 1, py: 0.8 }}
                >
                  Today
                </Button>
                <Button
                  size="small"
                  variant={selectedDate === getYesterdayStr() ? 'contained' : 'outlined'}
                  onClick={() => setSelectedDate(getYesterdayStr())}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flex: 1, py: 0.8 }}
                >
                  Yesterday
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : matchingDevices.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
            <CalendarIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={700}>
              No Devices Received on {formatDate(selectedDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              No devices match the {dateType === 'BD' ? 'BD Received Date' : 'CN Receive Date'} filter for this day. Try selecting another date above.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2.5}>
            {/* Top Summary Banner */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
                border: '1px solid',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1.5
              }}
            >
              <div>
                <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                  {matchingDevices.length} {matchingDevices.length === 1 ? 'Device' : 'Devices'} Received on {formatDate(selectedDate)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {agentList.length} shipping {agentList.length === 1 ? 'agent' : 'agents'} • Filtered by {dateType === 'BD' ? 'BD store delivery date' : 'CN warehouse date'}
                </Typography>
              </div>

              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<CopyIcon />}
                onClick={handleCopySummary}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: 'background.paper' }}
              >
                Copy Report
              </Button>
            </Box>

            {/* Agent & Supplier Group Cards */}
            <Grid container spacing={2}>
              {agentList.map((ag) => (
                <Grid item xs={12} md={agentList.length === 1 ? 12 : 6} key={ag.agent}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      height: '100%',
                      borderColor: 'divider',
                      boxShadow: 'none'
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Agent Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AgentIcon color="primary" fontSize="small" />
                          <Typography variant="subtitle2" fontWeight={800}>
                            {ag.agent}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${ag.total} ${ag.total === 1 ? 'Device' : 'Devices'}`}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700, borderRadius: '8px' }}
                        />
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Suppliers Under This Agent */}
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}>
                        Supplier Breakdown:
                      </Typography>

                      <Stack spacing={1}>
                        {Object.entries(ag.suppliers).map(([sup, devs]) => (
                          <Box
                            key={sup}
                            sx={{
                              p: 1.25,
                              borderRadius: 2,
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(241, 245, 249, 0.6)',
                              border: 1,
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SupplierIcon fontSize="small" color="action" />
                              <Typography variant="body2" fontWeight={600}>
                                {sup}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={700} color="primary.main">
                              {devs.length} {devs.length === 1 ? 'device' : 'devices'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Detailed Device Table */}
            <div>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
                Individual Devices Received ({matchingDevices.length})
              </Typography>

              <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 380 }}>
                  <Table size="small" stickyHeader sx={{ tableLayout: 'auto' }}>
                    <TableHead>
                      <TableRow sx={{ '& th': { bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1E293B' : '#F8FAFC', fontWeight: 700, py: 1.5, px: 2 } }}>
                        <TableCell sx={{ minWidth: 200 }}>Device Model</TableCell>
                        <TableCell sx={{ minWidth: 110 }}>Variant</TableCell>
                        <TableCell sx={{ minWidth: 170 }}>IMEI / Serial</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Supplier</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>Agent</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Tracking #</TableCell>
                        <TableCell align="right" sx={{ minWidth: 100 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matchingDevices.map((dev) => {
                        const s = dev.current_shipment ? shipmentMap[dev.current_shipment] : null;
                        const supplierName = dev.shipment_supplier || s?.supplier_name || s?.supplier?.name || 'Direct';
                        const agentName = dev.shipment_agent || s?.shipping_company || '—';
                        const trackingNum = dev.shipment_tracking || s?.tracking_number || '—';

                        return (
                          <TableRow key={dev.id} hover sx={{ '& td': { py: 1.25, px: 2, whiteSpace: 'nowrap' } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                {dev.model}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <VariantBadge variant={dev.variant} />
                            </TableCell>

                            <TableCell>
                              <CopyableText text={dev.imei} />
                              {dev.serial_number && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                                  SN: {dev.serial_number}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {supplierName}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {agentName}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                #{trackingNum}
                              </Typography>
                            </TableCell>

                            <TableCell align="right">
                              <StatusBadge status={dev.current_status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </div>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={handleCopySummary}
          disabled={matchingDevices.length === 0}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
        >
          Copy Report to Clipboard
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
