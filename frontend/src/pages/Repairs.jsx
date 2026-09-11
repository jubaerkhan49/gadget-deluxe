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
  Build as RepairIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CheckCircleOutline as CompletedIcon,
  FlightTakeoff as ChinaIcon,
  Schedule as InProgressIcon,
  DeleteOutline as DeleteIcon,
  Check as CheckIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { repairApi, deviceApi } from '../api/client';
import CopyableText from '../components/common/CopyableText';
import AddRepairDialog from '../dialogs/AddRepairDialog';

export default function Repairs() {
  const { enqueueSnackbar } = useSnackbar();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addRepairOpen, setAddRepairOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchRepairs();
  }, []);

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const res = await repairApi.getAll();
      setRepairs(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load repairs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (repair) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await repairApi.update(repair.id, {
        status: 'COMPLETED',
        returned_date: today
      });
      if (repair.device) {
        await deviceApi.update(repair.device, {
          current_status: 'IN_STOCK'
        });
      }
      enqueueSnackbar('Repair marked as Completed and device returned to In Stock!', { variant: 'success' });
      fetchRepairs();
    } catch (err) {
      enqueueSnackbar('Failed to update repair status', { variant: 'error' });
    }
  };

  const handleDeleteRepair = async (id) => {
    try {
      await repairApi.delete(id);
      enqueueSnackbar('Repair log deleted', { variant: 'success' });
      fetchRepairs();
    } catch (err) {
      enqueueSnackbar('Failed to delete repair log', { variant: 'error' });
    }
  };

  const activeCount = repairs.filter(
    (r) => r.status === 'IN_PROGRESS' || r.status === 'SENT_TO_CHINA'
  ).length;
  const chinaCount = repairs.filter((r) => r.status === 'SENT_TO_CHINA').length;
  const completedCount = repairs.filter((r) => r.status === 'COMPLETED').length;

  const filteredRepairs = repairs.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.device_imei?.toLowerCase().includes(q) ||
      r.issue_description?.toLowerCase().includes(q) ||
      r.repair_center?.toLowerCase().includes(q)
    );
  });

  const paginatedRepairs = filteredRepairs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusChip = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Chip size="small" label="In Progress" color="warning" variant="filled" sx={{ fontWeight: 700 }} />;
      case 'SENT_TO_CHINA':
        return <Chip size="small" label="Sent to China" color="info" variant="filled" sx={{ fontWeight: 700 }} />;
      case 'COMPLETED':
        return <Chip size="small" label="Completed" color="success" variant="filled" sx={{ fontWeight: 700 }} />;
      case 'UNREPAIRABLE':
        return <Chip size="small" label="Unrepairable" color="error" variant="filled" sx={{ fontWeight: 700 }} />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

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
            Device Repairs & Maintenance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track faulty units, China shipments, service lab updates, and returned stock
          </Typography>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddRepairOpen(true)}
        >
          Log Device For Repair
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <InProgressIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  ACTIVE REPAIRS
                </Typography>
                <Typography variant="h5" fontWeight={800} color="warning.main">
                  {activeCount}
                </Typography>
              </div>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
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
                <ChinaIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  SENT TO CHINA
                </Typography>
                <Typography variant="h5" fontWeight={800} color="info.main">
                  {chinaCount}
                </Typography>
              </div>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
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
                <CompletedIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  COMPLETED REPAIRS
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main">
                  {completedCount}
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
          placeholder="Search by Device IMEI, Hardware Issue, or Service Center..."
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

      {/* Repairs Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device IMEI</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Issue Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Center / Country</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sent Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Returned Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cost (BDT)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
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
              ) : filteredRepairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No repair logs found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRepairs.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <CopyableText text={r.device_imei} />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.issue_description}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {r.repair_center}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.country || 'China'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {r.sent_date || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {r.returned_date || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.repair_cost ? Math.round(Number(r.repair_cost)).toLocaleString() : '0'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {getStatusChip(r.status)}
                    </TableCell>

                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {r.status !== 'COMPLETED' && (
                          <Tooltip title="Mark Completed & Move to In Stock">
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<CheckIcon />}
                              onClick={() => handleMarkCompleted(r)}
                              sx={{ textTransform: 'none', py: 0.3 }}
                            >
                              Complete
                            </Button>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete Log">
                          <IconButton size="small" color="error" onClick={() => handleDeleteRepair(r.id)}>
                            <DeleteIcon fontSize="small" />
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
          count={filteredRepairs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Add Repair Dialog */}
      <AddRepairDialog
        open={addRepairOpen}
        onClose={() => setAddRepairOpen(false)}
        onRepairCreated={() => fetchRepairs()}
      />
    </Box>
  );
}
