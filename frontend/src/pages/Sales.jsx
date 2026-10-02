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
  CardContent,
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
  IconButton
} from '@mui/material';
import {
  PointOfSale as SaleIcon,
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp as ProfitIcon,
  Receipt as InvoiceIcon,
  AttachMoney as RevenueIcon,
  Clear as ClearIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { formatNumber, formatDate } from '../utils/formatters';
import { useSnackbar } from 'notistack';
import { saleApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import CopyableText from '../components/common/CopyableText';
import VariantBadge from '../components/common/VariantBadge';
import RecordSaleDialog from '../dialogs/RecordSaleDialog';

export default function Sales() {
  const { enqueueSnackbar } = useSnackbar();

  const cachedSales = apiCache.get('/api/sales/');

  const [sales, setSales] = useState(() => cachedSales?.results || cachedSales || []);
  const [loading, setLoading] = useState(() => !cachedSales);
  const [searchQuery, setSearchQuery] = useState('');
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchSales(Boolean(cachedSales));
  }, []);

  // Live smart polling every 30s (pauses automatically when tab is minimized/hidden)
  useSmartPolling(() => {
    fetchSales(true);
  }, 30000);

  const fetchSales = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await saleApi.getAll();
      const freshSales = res.data.results || res.data || [];
      apiCache.set('/api/sales/', freshSales);
      setSales(freshSales);
    } catch (err) {
      console.error(err);
      if (!silent) {
        enqueueSnackbar('Failed to load sales history', { variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = sales.reduce((acc, s) => acc + (parseFloat(s.selling_price) || 0), 0);
  const totalProfit = sales.reduce((acc, s) => acc + (parseFloat(s.profit) || 0), 0);

  const filteredSales = sales.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.device_model?.toLowerCase().includes(q) ||
      s.device_color?.toLowerCase().includes(q) ||
      s.device_variant?.toLowerCase().includes(q) ||
      s.device_imei?.toLowerCase().includes(q) ||
      s.invoice_number?.toLowerCase().includes(q) ||
      s.seller_name?.toLowerCase().includes(q) ||
      s.sold_by?.toLowerCase().includes(q)
    );
  });

  const paginatedSales = filteredSales.slice(
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
            Sales & Invoicing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Financial transactions, gross profits, and sold unit records
          </Typography>
        </div>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon sx={{ color: '#ffffff !important' }} />}
          onClick={() => setRecordSaleOpen(true)}
          sx={{
            color: '#ffffff !important',
            fontWeight: 600,
            bgcolor: '#10B981',
            '&:hover': { bgcolor: '#059669' },
            '& .MuiButton-startIcon': { color: '#ffffff !important' }
          }}
        >
          Record Sale
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
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <InvoiceIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL INVOICES
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {sales.length}
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
                <RevenueIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL REVENUE
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary">
                  {formatNumber(totalRevenue)}
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
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: '#6366F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ProfitIcon />
              </Box>
              <div>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL REALIZED PROFIT
                </Typography>
                <Typography variant="h5" fontWeight={800} color="success.main">
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
          placeholder="Search by Model, Color, Variant, IMEI, or Seller..."
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

      {/* Mobile Sales Cards View (xs to md) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : filteredSales.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No sales records found.
            </Typography>
          </Paper>
        ) : (
          paginatedSales.map((sale) => (
            <Card
              key={`mob-sale-${sale.id}`}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}
            >
              {/* Top: Model & Profit */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800} noWrap>
                    {sale.device_model || 'Device Unit'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.2 }}>
                    {(sale.device_capacity || sale.device_color) && (
                      <Typography variant="caption" color="text.secondary">
                        {sale.device_capacity || ''} {sale.device_color ? `• ${sale.device_color}` : ''}
                      </Typography>
                    )}
                    {sale.device_variant && <VariantBadge variant={sale.device_variant} size="small" />}
                  </Box>
                </Box>

                <Chip
                  label={`Profit: ${sale.profit !== null && sale.profit !== undefined ? formatNumber(sale.profit) : '—'}`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    height: 22,
                    bgcolor: Number(sale.profit || 0) >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: Number(sale.profit || 0) >= 0 ? '#059669' : '#DC2626'
                  }}
                />
              </Box>

              {/* IMEI */}
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
              >
                <CopyableText text={sale.device_imei || '—'} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(sale.sale_date || sale.created_at)}
                </Typography>
              </Box>

              {/* Bottom: Sold By & Prices */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.3, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  size="small"
                  icon={<PersonIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                  label={sale.sold_by || sale.seller_name || 'Store'}
                  sx={{
                    bgcolor: 'rgba(2, 132, 199, 0.1)',
                    color: '#0284c7',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    height: 22
                  }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sold: <strong style={{ color: '#2563EB' }}>{sale.selling_price ? formatNumber(sale.selling_price) : '—'}</strong>
                  </Typography>
                </Box>
              </Box>
            </Card>
          ))
        )}
      </Box>

      {/* Sales Desktop Table (md+) */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Device</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Device IMEI</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Buying Cost</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Profit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No sales records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {sale.device_model || 'Device Unit'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.4, flexWrap: 'wrap' }}>
                        {sale.device_variant && (
                          <VariantBadge variant={sale.device_variant} />
                        )}
                        {(sale.device_capacity || sale.device_color) && (
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {sale.device_capacity || ''} {sale.device_color ? `• ${sale.device_color}` : ''}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(sale.sale_date || sale.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <CopyableText text={sale.device_imei || '—'} />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        icon={<PersonIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
                        label={sale.sold_by || sale.seller_name || 'Store'}
                        sx={{
                          bgcolor: 'rgba(2, 132, 199, 0.1)',
                          color: '#0284c7',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {sale.buying_price !== null && sale.buying_price !== undefined
                          ? formatNumber(sale.buying_price)
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {sale.selling_price !== null && sale.selling_price !== undefined
                          ? formatNumber(sale.selling_price)
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={Number(sale.profit || 0) >= 0 ? "success.main" : "error.main"}
                      >
                        {sale.profit !== null && sale.profit !== undefined
                          ? formatNumber(sale.profit)
                          : '—'}
                      </Typography>
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
          count={filteredSales.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Record Sale Dialog */}
      <RecordSaleDialog
        open={recordSaleOpen}
        onClose={() => setRecordSaleOpen(false)}
        onSaleRecorded={() => fetchSales()}
      />
    </Box>
  );
}
