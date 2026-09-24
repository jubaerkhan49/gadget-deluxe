import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Typography,
  Box,
  InputAdornment,
  Avatar,
  Stack,
  Chip,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  CheckCircle as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/client';

export default function UpdateProfileDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const { user, fetchUserProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [open, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const res = await userApi.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone
      });

      enqueueSnackbar(res.data?.message || 'Profile updated successfully!', { variant: 'success' });
      if (fetchUserProfile) {
        await fetchUserProfile();
      }
      onClose();
    } catch (err) {
      console.error('Failed to update profile', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update profile.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 0,
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ position: 'relative', pt: 3.5, pb: 1, px: 3, textAlign: 'center' }}>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          size="small"
          sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Stack alignItems="center" spacing={1.2}>
          <Avatar
            sx={{
              width: 58,
              height: 58,
              bgcolor: 'primary.main',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)'
            }}
          >
            {firstName ? firstName.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px">
              Update Profile Info
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manage your personal contact details & display name
            </Typography>
          </Box>
          <Chip
            label={`@${user?.username || 'user'} • ${user?.role || 'Employee'}`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24, mt: 0.5 }}
          />
        </Stack>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.2}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gadgetdeluxe.store"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" fontSize="small" />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              size="small"
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'space-between' }}>
          <Button
            onClick={onClose}
            disabled={submitting}
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
            }}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
