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
  Badge
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import RefreshIcon from '@mui/icons-material/Refresh';
import BadgeIcon from '@mui/icons-material/Badge';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import api from '../api/client';

export default function ManageEmployeesDialog({ open, onClose, onEmployeeUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [tabIndex, setTabIndex] = useState(0);
  const [applications, setApplications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/employee-applications/');
      setApplications(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load employee applications', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users/');
      setEmployees(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchApplications();
      fetchEmployees();
    }
  }, [open]);

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

  const pendingApps = applications.filter((a) => a.status === 'PENDING');
  const pastApps = applications.filter((a) => a.status !== 'PENDING');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, minHeight: 520 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
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
            <Typography variant="h6" fontWeight={700}>
              Employee Management
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review join applications, manage staff members and view assigned devices
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => {
              fetchApplications();
              fetchEmployees();
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
        <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)}>
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
                <span>Active Staff & Team</span>
                <Chip
                  label={employees.length}
                  size="small"
                  color="default"
                  sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                />
              </Box>
            }
          />
          <Tab label="Application History" />
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

        {/* Tab 1: Active Staff & Employees */}
        {!loading && tabIndex === 1 && (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Assigned Devices</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                          {emp.first_name ? emp.first_name.charAt(0) : emp.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {emp.first_name ? `${emp.first_name} ${emp.last_name || ''}` : emp.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {emp.email || 'No email registered'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        @{emp.username}
                      </Typography>
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

        {/* Tab 2: Application History */}
        {!loading && tabIndex === 2 && (
          <Box>
            {pastApps.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No reviewed applications yet.
                </Typography>
              </Box>
            ) : (
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
    </Dialog>
  );
}
