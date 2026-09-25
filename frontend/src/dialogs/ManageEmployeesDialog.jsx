import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Card,
  CardContent,
  Stack,
  Badge,
  Grid,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';
import BadgeIcon from '@mui/icons-material/Badge';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { useSnackbar } from 'notistack';
import api, { deviceSaleRequestApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import { formatNumber } from '../utils/formatters';
import ConfirmSaleApprovalDialog from './ConfirmSaleApprovalDialog';

export default function ManageEmployeesDialog({ open, onClose, onEmployeeUpdated, initialTab = 0 }) {
  const { enqueueSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(initialTab);
  const [applications, setApplications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [saleRequests, setSaleRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSaleForApproval, setSelectedSaleForApproval] = useState(null);
  const [confirmSaleModalOpen, setConfirmSaleModalOpen] = useState(false);
  const [commissions, setCommissions] = useState({});

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/employee-applications/');
      const data = res.data?.results || res.data || [];
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employee applications', err);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/');
      const data = res.data?.results || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load employees', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileUpdates = async () => {
    try {
      const res = await api.get('/api/profile-update-requests/');
      const data = res.data?.results || res.data || [];
      setProfileUpdates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load profile update requests', err);
      setProfileUpdates([]);
    }
  };

  const fetchSaleRequests = async () => {
    try {
      const res = await deviceSaleRequestApi.getAll();
      const data = res.data?.results || res.data || [];
      setSaleRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load sale requests', err);
      setSaleRequests([]);
    }
  };

  useEffect(() => {
    if (open) {
      setTabIndex(initialTab);
      fetchApplications();
      fetchEmployees();
      fetchProfileUpdates();
      fetchSaleRequests();
    }
  }, [open, initialTab]);

  const handleApprove = async (appId, name) => {
    setActionLoadingId(appId);
    try {
      const res = await api.post(`/api/employee-applications/${appId}/approve/`);
      enqueueSnackbar(res.data.message || `Approved ${name} as Employee!`, { variant: 'success' });
      fetchApplications();
      fetchEmployees();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to approve application';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (appId, name) => {
    setActionLoadingId(appId);
    try {
      await api.post(`/api/employee-applications/${appId}/reject/`);
      enqueueSnackbar(`Application for ${name} rejected.`, { variant: 'info' });
      fetchApplications();
    } catch (err) {
      enqueueSnackbar('Failed to reject application', { variant: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveProfileUpdate = async (updateId, username) => {
    setActionLoadingId(`update_${updateId}`);
    try {
      const res = await api.post(`/api/profile-update-requests/${updateId}/approve/`);
      enqueueSnackbar(res.data?.message || `Approved profile update for @${username}!`, { variant: 'success' });
      fetchProfileUpdates();
      fetchEmployees();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to approve profile update';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectProfileUpdate = async (updateId, username) => {
    setActionLoadingId(`update_${updateId}`);
    try {
      await api.post(`/api/profile-update-requests/${updateId}/reject/`);
      enqueueSnackbar(`Profile update request for @${username} rejected.`, { variant: 'info' });
      fetchProfileUpdates();
    } catch (err) {
      enqueueSnackbar('Failed to reject profile update', { variant: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      if (deleteTarget.type === 'user') {
        await api.delete(`/api/users/${deleteTarget.id}/`);
        enqueueSnackbar(`Employee @${deleteTarget.username} deleted and image storage wiped.`, { variant: 'success' });
        fetchEmployees();
        fetchApplications();
        if (onEmployeeUpdated) onEmployeeUpdated();
      } else if (deleteTarget.type === 'application') {
        await api.delete(`/api/employee-applications/${deleteTarget.id}/`);
        enqueueSnackbar(`Application record for ${deleteTarget.name} deleted.`, { variant: 'success' });
        fetchApplications();
      }
      setDeleteTarget(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete record';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const pendingApps = Array.isArray(applications) ? applications.filter((a) => a && a.status === 'PENDING') : [];
  const pastApps = Array.isArray(applications) ? applications.filter((a) => a && a.status !== 'PENDING') : [];
  const pendingUpdates = Array.isArray(profileUpdates) ? profileUpdates.filter((u) => u && u.status === 'PENDING') : [];
  const pastUpdates = Array.isArray(profileUpdates) ? profileUpdates.filter((u) => u && u.status !== 'PENDING') : [];
  const pendingSaleRequests = Array.isArray(saleRequests) ? saleRequests.filter((s) => s && s.status === 'PENDING') : [];
  const pastSaleRequests = Array.isArray(saleRequests) ? saleRequests.filter((s) => s && s.status !== 'PENDING') : [];

  const handleRejectSaleRequest = async (saleReqId, deviceModel) => {
    setActionLoadingId(`salereq_${saleReqId}`);
    try {
      await deviceSaleRequestApi.reject(saleReqId);
      enqueueSnackbar(`Sale request for ${deviceModel || 'device'} rejected. Device returned to In Stock.`, { variant: 'info' });
      fetchSaleRequests();
      if (onEmployeeUpdated) onEmployeeUpdated();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reject sale request';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeEmployees = (Array.isArray(employees) ? employees : [])
    .filter((emp) => emp && emp.username?.toLowerCase() !== 'admin')
    .sort((a, b) => {
      const aUser = a?.username?.toLowerCase() || '';
      const bUser = b?.username?.toLowerCase() || '';
      if (aUser === 'jubaer') return -1;
      if (bUser === 'jubaer') return 1;
      return (a?.first_name || a?.username || '').localeCompare(b?.first_name || b?.username || '');
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 980, minHeight: 520 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, px: 3, pt: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PeopleIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px">
              Employee Management
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review join applications, staff profile updates, device sale approvals, and active team
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => {
              fetchApplications();
              fetchEmployees();
              fetchProfileUpdates();
              fetchSaleRequests();
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto">
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Pending Applications</span>
                {pendingApps.length > 0 && (
                  <Chip
                    label={pendingApps.length}
                    size="small"
                    color="error"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Profile Updates</span>
                {pendingUpdates.length > 0 && (
                  <Chip
                    label={pendingUpdates.length}
                    size="small"
                    color="warning"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Sale Requests</span>
                {pendingSaleRequests.length > 0 && (
                  <Chip
                    label={pendingSaleRequests.length}
                    size="small"
                    color="warning"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      bgcolor: '#F59E0B',
                      color: '#FFF'
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Active Staff & Team</span>
                <Chip
                  label={activeEmployees.length}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF'),
                    color: (theme) => (theme.palette.mode === 'dark' ? '#93C5FD' : '#2563EB'),
                    border: '1px solid',
                    borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE')
                  }}
                />
              </Box>
            }
          />
          <Tab label="History & Logs" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {/* Tab 0: Pending Applications */}
        {!loading && tabIndex === 0 && (
          <Box>
            {pendingApps.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <PersonAddAlt1Icon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  No Pending Applications
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When prospective employees apply from the landing portal, their requests will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {pendingApps.map((app) => (
                  <Card
                    key={app.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 2.5,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar
                        src={app.photo || undefined}
                        sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.light' }}
                      >
                        {app.full_name?.charAt(0) || 'E'}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {app.full_name}
                          </Typography>
                          {app.nickname && (
                            <Chip label={app.nickname} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.75rem' }} />
                          )}
                          <Chip label="Pending" size="small" color="warning" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }} />
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          <strong>Email:</strong> {app.email} &nbsp;|&nbsp; <strong>Phone:</strong> {app.phone}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>NID:</strong> {app.nid_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          <strong>Address:</strong> {app.address}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                          Applied on: {new Date(app.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={actionLoadingId === app.id}
                        onClick={() => handleReject(app.id, app.full_name)}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        disabled={actionLoadingId === app.id}
                        onClick={() => handleApprove(app.id, app.full_name)}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 2.5 }}
                      >
                        {actionLoadingId === app.id ? <CircularProgress size={18} color="inherit" /> : 'Accept & Approve'}
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* Tab 1: Pending Profile Updates */}
        {!loading && tabIndex === 1 && (
          <Box>
            {pendingUpdates.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <ManageAccountsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  No Pending Profile Updates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When employees submit changes to their name, email, or phone, their approval requests will appear here.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {pendingUpdates.map((updateReq) => {
                  const currentName = `${updateReq.current_first_name || ''} ${updateReq.current_last_name || ''}`.trim() || '—';
                  const requestedName = `${updateReq.first_name || ''} ${updateReq.last_name || ''}`.trim() || '—';
                  const nameChanged = currentName !== requestedName;
                  const emailChanged = (updateReq.current_email || '') !== (updateReq.email || '');
                  const phoneChanged = (updateReq.current_phone || '') !== (updateReq.phone || '');

                  return (
                    <Card
                      key={updateReq.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        p: 2.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 42, height: 42, bgcolor: 'primary.main', fontWeight: 800, fontSize: '1rem' }}>
                            {updateReq.username?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              @{updateReq.username}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Requested on: {new Date(updateReq.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>

                        <Chip
                          label="Pending Admin Approval"
                          size="small"
                          color="warning"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, height: '100%' }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing="0.5px" display="block" mb={1.2}>
                              Current Profile
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.8 }}>
                              <strong>Name:</strong> {currentName}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.8 }}>
                              <strong>Email:</strong> {updateReq.current_email || '—'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Phone:</strong> {updateReq.current_phone || '—'}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(239, 246, 255, 0.9)',
                              border: 1,
                              borderColor: 'primary.light',
                              borderRadius: 2,
                              height: '100%'
                            }}
                          >
                            <Typography variant="caption" fontWeight={800} color="primary.main" textTransform="uppercase" letterSpacing="0.5px" display="block" mb={1.2}>
                              Requested Changes
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.8, color: nameChanged ? 'primary.main' : 'text.primary', fontWeight: nameChanged ? 700 : 400 }}>
                              <strong>Name:</strong> {requestedName}
                              {nameChanged && <Chip label="New" size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.8, color: emailChanged ? 'primary.main' : 'text.primary', fontWeight: emailChanged ? 700 : 400 }}>
                              <strong>Email:</strong> {updateReq.email || '—'}
                              {emailChanged && <Chip label="New" size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                            </Typography>
                            <Typography variant="body2" sx={{ color: phoneChanged ? 'primary.main' : 'text.primary', fontWeight: phoneChanged ? 700 : 400 }}>
                              <strong>Phone:</strong> {updateReq.phone || '—'}
                              {phoneChanged && <Chip label="New" size="small" color="primary" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'flex-end', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          disabled={actionLoadingId === `update_${updateReq.id}`}
                          onClick={() => handleRejectProfileUpdate(updateReq.id, updateReq.username)}
                          sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                          Reject Request
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          disabled={actionLoadingId === `update_${updateReq.id}`}
                          onClick={() => handleApproveProfileUpdate(updateReq.id, updateReq.username)}
                          sx={{ borderRadius: 2, textTransform: 'none', px: 2.5 }}
                        >
                          {actionLoadingId === `update_${updateReq.id}` ? <CircularProgress size={18} color="inherit" /> : 'Approve & Apply Changes'}
                        </Button>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {/* Tab 2: Sale Requests Pending Review */}
        {!loading && tabIndex === 2 && (
          <Box>
            {pendingSaleRequests.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <PointOfSaleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  No Pending Sale Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  When employees mark devices as sold in custody mode, their sale requests will appear here for pricing confirmation.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2.5}>
                {pendingSaleRequests.map((saleReq) => {
                  if (!saleReq) return null;
                  const reqId = saleReq.id;
                  const proposedNum = parseFloat(saleReq.proposed_price || 0);
                  const currentComm = commissions?.[reqId] !== undefined ? commissions[reqId] : '';
                  const commNum = parseFloat(currentComm || 0);
                  const netDbPrice = Math.max(0, proposedNum - commNum);
                  const costNum = parseFloat(saleReq.device_buying_price || 0);

                  return (
                    <Card
                      key={reqId || Math.random()}
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        p: { xs: 2, sm: 2.5 },
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        borderColor: 'warning.light',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.02)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              bgcolor: 'warning.main',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <SmartphoneIcon fontSize="medium" />
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={800}>
                                {saleReq.device_model || 'Unknown Model'}
                              </Typography>
                              {saleReq.device_variant && <VariantBadge variant={saleReq.device_variant} />}
                              <Chip
                                label="Pending Approval"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                                  color: '#D97706',
                                  border: '1px solid rgba(245, 158, 11, 0.3)'
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}>
                              IMEI: {saleReq.device_imei || '—'}
                            </Typography>
                            {(saleReq.device_capacity || saleReq.device_color) && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • {saleReq.device_capacity || ''} {saleReq.device_color ? `• ${saleReq.device_color}` : ''}
                              </Typography>
                            )}
                            {saleReq.device_battery_health ? (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • BH {saleReq.device_battery_health}%
                                {saleReq.device_battery_cycle ? ` (CC ${saleReq.device_battery_cycle})` : ''}
                              </Typography>
                            ) : null}
                          </Box>
                        </Box>

                        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Sold by Staff:
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {saleReq.employee_name || `@${saleReq.employee_username || 'staff'}`}
                            {saleReq.employee_username ? (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                (@{saleReq.employee_username})
                              </Typography>
                            ) : null}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {saleReq.created_at ? new Date(saleReq.created_at).toLocaleString() : '—'}
                          </Typography>
                        </Box>
                      </Box>

                      <Divider />

                      <Grid container spacing={1.5} alignItems="stretch">
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2, height: '100%', bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff') }}
                          >
                            <Typography variant="caption" color="text.secondary" display="block">
                              Proposed Sale Price:
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="warning.main">
                              {proposedNum > 0 ? `BDT ${formatNumber(proposedNum)}` : 'Not specified'}
                            </Typography>
                            {costNum > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                Device Cost: BDT {formatNumber(costNum)}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              height: '100%',
                              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff'),
                              borderColor: commNum > 0 ? 'primary.main' : 'divider'
                            }}
                          >
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                              Staff Commission (BDT):
                            </Typography>
                            <TextField
                              size="small"
                              fullWidth
                              type="number"
                              placeholder="0"
                              value={currentComm}
                              onChange={(e) => setCommissions((prev) => ({ ...prev, [reqId]: e.target.value }))}
                              inputProps={{ min: 0, step: 'any' }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 1.5,
                                  fontSize: '0.85rem'
                                }
                              }}
                            />
                            <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">Net Sale:</Typography>
                              <Typography variant="caption" fontWeight={800} color="success.main">
                                BDT {formatNumber(netDbPrice)}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2, height: '100%', bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff') }}
                          >
                            <Typography variant="caption" color="text.secondary" display="block">
                              Customer Info:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {saleReq.customer_name || 'Walk-in Customer'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {saleReq.customer_phone || 'No phone provided'}
                            </Typography>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Paper
                            variant="outlined"
                            sx={{ p: 1.5, borderRadius: 2, height: '100%', bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff') }}
                          >
                            <Typography variant="caption" color="text.secondary" display="block">
                              Payment & Notes:
                            </Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {saleReq.payment_method || 'CASH'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {saleReq.notes ? `"${saleReq.notes}"` : 'No remarks'}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: { xs: 'stretch', sm: 'center' },
                          pt: 1.2,
                          borderTop: 1,
                          borderColor: 'divider'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            DB Selling Price (Proposed - Commission):
                          </Typography>
                          <Chip
                            size="small"
                            color="success"
                            variant="filled"
                            label={`BDT ${formatNumber(netDbPrice)}`}
                            sx={{ fontWeight: 800, fontSize: '0.78rem' }}
                          />
                        </Box>

                        <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={actionLoadingId === `salereq_${reqId}`}
                            onClick={() => handleRejectSaleRequest(reqId, saleReq.device_model)}
                            sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}
                          >
                            Reject Sale
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircleIcon />}
                            disabled={actionLoadingId === `salereq_${reqId}`}
                            onClick={() => {
                              setSelectedSaleForApproval({
                                ...saleReq,
                                initialCommission: commissions?.[reqId] !== undefined ? commissions[reqId] : '0'
                              });
                              setConfirmSaleModalOpen(true);
                            }}
                            sx={{ borderRadius: 2, textTransform: 'none', px: 2.5, fontWeight: 700 }}
                          >
                            Confirm Sold Amount & Approve
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {/* Tab 3: Active Staff & Employees */}
        {!loading && tabIndex === 3 && (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.2, px: 1.5 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Assigned Devices</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeEmployees.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                          {emp.first_name ? emp.first_name.charAt(0).toUpperCase() : emp.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.8, fontFamily: 'monospace' }}>
                              @{emp.username}
                            </Typography>
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {emp.email || 'No email registered'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={emp.role || 'EMPLOYEE'}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: 1.5,
                          ...(emp.role === 'ADMIN' || emp.username?.toLowerCase() === 'jubaer' || emp.username?.toLowerCase() === 'admin'
                            ? {
                                bgcolor: '#2563EB',
                                color: '#FFFFFF'
                              }
                            : emp.role === 'MANAGER'
                            ? {
                                bgcolor: '#7C3AED',
                                color: '#FFFFFF'
                              }
                            : {
                                bgcolor: (theme) =>
                                   theme.palette.mode === 'dark' ? 'rgba(51, 65, 85, 0.7)' : '#E2E8F0',
                                color: (theme) =>
                                   theme.palette.mode === 'dark' ? '#E2E8F0' : '#334155',
                                border: 1,
                                borderColor: (theme) =>
                                   theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.2)' : '#CBD5E1'
                              })
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{emp.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<PhoneAndroidIcon fontSize="small" />}
                        label={`${emp.assigned_devices_count || 0} in custody`}
                        size="small"
                        color={emp.assigned_devices_count > 0 ? 'info' : 'default'}
                        variant={emp.assigned_devices_count > 0 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {emp.date_joined ? new Date(emp.date_joined).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {emp.username?.toLowerCase() !== 'jubaer' && emp.username?.toLowerCase() !== 'admin' && (
                        <Tooltip title="Delete Employee & Wipe Image Storage">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'user',
                                id: emp.id,
                                name: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username,
                                username: emp.username
                              })
                            }
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Tab 4: History & Logs */}
        {!loading && tabIndex === 4 && (
          <Box>
            {pastApps.length === 0 && pastUpdates.length === 0 && pastSaleRequests.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No reviewed applications, profile updates, or sale approval history yet.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {pastSaleRequests.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Device Sale Approvals History ({pastSaleRequests.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Device</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Confirmed Price</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reviewed By</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pastSaleRequests.map((s) => (
                            <TableRow key={s.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>
                                  {s.device_model || 'Device'}
                                </Typography>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                  {s.device_imei}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {s.employee_name || `@${s.employee_username}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{s.employee_username}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{s.customer_name || 'Walk-in'}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.customer_phone || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} color={s.status === 'APPROVED' ? 'success.main' : 'text.secondary'}>
                                  {s.confirmed_price ? `BDT ${formatNumber(s.confirmed_price)}` : s.proposed_price ? `BDT ${formatNumber(s.proposed_price)}` : '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={s.status_display || s.status}
                                  size="small"
                                  color={s.status === 'APPROVED' ? 'success' : 'error'}
                                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {s.reviewed_by_username ? `@${s.reviewed_by_username}` : 'Admin'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(s.updated_at || s.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {pastUpdates.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Profile Update Requests ({pastUpdates.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Requested Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Requested Contact</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reviewed By</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pastUpdates.map((u) => (
                            <TableRow key={u.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700}>
                                  @{u.username}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{u.email || '—'}</Typography>
                                <Typography variant="caption" color="text.secondary">{u.phone || '—'}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={u.status}
                                  size="small"
                                  color={u.status === 'APPROVED' ? 'success' : 'error'}
                                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {u.reviewed_by_username ? `@${u.reviewed_by_username}` : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(u.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}

                {pastApps.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Recruitment Applications ({pastApps.length})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Applicant</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>NID</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Reviewed By</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pastApps.map((app) => (
                            <TableRow key={app.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {app.full_name}
                                </Typography>
                                {app.nickname && (
                                  <Typography variant="caption" color="text.secondary">
                                    ({app.nickname})
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{app.email}</Typography>
                                <Typography variant="caption" color="text.secondary">{app.phone}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{app.nid_number}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={app.status}
                                  size="small"
                                  color={app.status === 'APPROVED' ? 'success' : 'error'}
                                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {app.reviewed_by_username ? `@${app.reviewed_by_username}` : '-'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(app.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Delete Application Record & Wipe Photo">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      setDeleteTarget({
                                        type: 'application',
                                        id: app.id,
                                        name: app.full_name
                                      })
                                    }
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 460 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', pb: 1 }}>
          {deleteTarget?.type === 'user' ? 'Delete Employee Account?' : 'Delete Application Record?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5, color: 'text.primary' }}>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteTarget?.name}</strong>{' '}
            {deleteTarget?.username ? `(@${deleteTarget.username})` : ''}?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This will permanently delete the employee account, unassign any devices in custody, and wipe all application image data and personal information from database storage.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={deleting}
            variant="contained"
            color="error"
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Permanently Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Price Confirmation & Finalize Sale Dialog */}
      <ConfirmSaleApprovalDialog
        open={confirmSaleModalOpen}
        onClose={() => {
          setConfirmSaleModalOpen(false);
          setSelectedSaleForApproval(null);
        }}
        saleRequest={selectedSaleForApproval}
        onApproved={() => {
          fetchSaleRequests();
          if (onEmployeeUpdated) onEmployeeUpdated();
        }}
      />
    </Dialog>
  );
}
