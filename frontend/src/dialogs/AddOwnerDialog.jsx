import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { userApi } from '../api/client';

export default function AddOwnerDialog({ open, onClose, onOwnerAdded }) {
  const { enqueueSnackbar } = useSnackbar();

  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setFirstName('');
    setLastName('');
    setRole('EMPLOYEE');
    setPhone('');
    setPassword('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      enqueueSnackbar('Username is required', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        username: username.trim().toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: role,
        phone: phone.trim() || undefined,
        password: password.trim() || undefined
      };

      const res = await userApi.create(payload);
      enqueueSnackbar(`Owner/Employee "${res.data.username}" created successfully!`, {
        variant: 'success'
      });

      resetForm();
      if (onOwnerAdded) onOwnerAdded(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.username?.[0] ||
        err.response?.data?.detail ||
        'Failed to create owner';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <PersonAddIcon color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Add Owner / Employee
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Register a new team owner for device assignment & store operations
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                size="small"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ochi, emon"
                helperText="Unique login & assignment handle"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <MenuItem value="EMPLOYEE">Employee</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="TECHNICIAN">Technician</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Optional"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Optional"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Default: GadgetDeluxe123!"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !username.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          >
            {loading ? 'Creating...' : 'Create Owner'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
