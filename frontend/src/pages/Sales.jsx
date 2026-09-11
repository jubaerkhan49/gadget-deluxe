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
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { saleApi } from '../api/client';
import CopyableText from '../components/common/CopyableText';
import RecordSaleDialog from '../dialogs/RecordSaleDialog';

export default function Sales() {
  const { enqueueSnackbar } = useSnackbar();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recordSaleOpen, setRecordSaleOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await saleApi.getAll();
      setSales(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load sales history', { variant: 'error' });
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
      s.invoice_number?.toLowerCase().includes(q) ||
      s.device_imei?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.seller_name?.toLowerCase().includes(q)
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
          startIcon={<AddIcon />}
          onClick={() => setRecordSaleOpen(true)}
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
                  {Math.round(totalRevenue).toLocaleString()}
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
                  {Math.round(totalProfit).toLocaleString()}
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
          placeholder="Search by Invoice #, IMEI, Customer, or Seller..."
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

      {/* Sales Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Device IMEI</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Buying Cost</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Selling Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Profit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No sales records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {sale.invoice_number}
                      </Typography>
                      <Chip
                        size="small"
                        label={sale.payment_method || 'CASH'}
                        variant="outlined"
                        sx={{ fontSize: '0.68rem', mt: 0.3 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <CopyableText text={sale.device_imei || '—'} />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {sale.customer_name || 'Walk-in'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {sale.seller_name || 'System'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {sale.buying_price !== null && sale.buying_price !== undefined
                          ? Math.round(Number(sale.buying_price)).toLocaleString()
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {sale.selling_price !== null && sale.selling_price !== undefined
                          ? Math.round(Number(sale.selling_price)).toLocaleString()
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
                          ? Math.round(Number(sale.profit)).toLocaleString()
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
