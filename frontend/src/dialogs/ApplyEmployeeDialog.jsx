import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Grid,
  Alert,
  Avatar,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import api from '../api/client';

const MAX_PHOTO_BYTES = 100 * 1024; // 100 KB limit

export default function ApplyEmployeeDialog({ open, onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    nickname: '',
    phone: '',
    email: '',
    nidNumber: '',
    address: '',
    password: ''
  });

  const [photoBase64, setPhotoBase64] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleTextChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    setPhotoError('');

    if (!file) return;

    // Strict 100KB validation
    if (file.size > MAX_PHOTO_BYTES) {
      const sizeKB = (file.size / 1024).toFixed(1);
      setPhotoError(`Photo size is ${sizeKB} KB. Maximum allowed size is 100 KB. Please select a compressed image under 100 KB.`);
      setPhotoBase64('');
      setPhotoFileName('');
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result);
      setPhotoFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoBase64('');
    setPhotoFileName('');
    setPhotoError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!formData.nidNumber.trim()) {
      setError('Please enter your National ID / Passport number.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please enter your address.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Please enter a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/employee-applications/', {
        full_name: formData.fullName.trim(),
        nickname: formData.nickname.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        nid_number: formData.nidNumber.trim(),
        address: formData.address.trim(),
        photo: photoBase64,
        password: formData.password
      });

      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit application. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setFormData({
      fullName: '',
      nickname: '',
      phone: '',
      email: '',
      nidNumber: '',
      address: '',
      password: ''
    });
    setPhotoBase64('');
    setPhotoFileName('');
    setPhotoError('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <BadgeIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Join as Employee
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Submit your information to join the Gadget Deluxe team
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleDialogClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2.5 }}>
        {submitted ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Application Submitted
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: 3, lineHeight: 1.6 }}>
              Thank you for applying. Your application is now <strong>pending review</strong> by the system administrator. Once approved, you will be able to log in to the portal using your email and password.
            </Typography>
            <Button variant="contained" onClick={handleDialogClose} sx={{ px: 4, borderRadius: 2 }}>
              Close
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Full Name *"
                  value={formData.fullName}
                  onChange={handleTextChange('fullName')}
                  placeholder="e.g. Mohammad Rahman"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Nickname"
                  value={formData.nickname}
                  onChange={handleTextChange('nickname')}
                  placeholder="e.g. Rahman"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Phone Number *"
                  value={formData.phone}
                  onChange={handleTextChange('phone')}
                  placeholder="e.g. 01700000000"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  label="Email Address *"
                  value={formData.email}
                  onChange={handleTextChange('email')}
                  placeholder="name@example.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="National ID (NID) / Passport Number *"
                  value={formData.nidNumber}
                  onChange={handleTextChange('nidNumber')}
                  placeholder="e.g. 19951234567890"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  label="Present / Permanent Address *"
                  value={formData.address}
                  onChange={handleTextChange('address')}
                  placeholder="House, Road, Area, City..."
                />
              </Grid>

              {/* Photo Upload (Max 100KB) */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: photoError ? 'error.main' : 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={photoBase64 || undefined}
                      sx={{ width: 48, height: 48, bgcolor: 'action.selected' }}
                    >
                      {!photoBase64 && <BadgeIcon fontSize="small" color="action" />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Profile Photo <Typography component="span" variant="caption" color="text.secondary">(Max 100 KB)</Typography>
                      </Typography>
                      {photoFileName ? (
                        <Typography variant="caption" color="success.main" fontWeight={600}>
                          {photoFileName}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Upload passport-size image (under 100KB)
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <input
                      type="file"
                      accept="image/*"
                      id="employee-photo-upload"
                      style={{ display: 'none' }}
                      onChange={handlePhotoUpload}
                    />
                    {photoBase64 ? (
                      <Button size="small" color="error" onClick={handleRemovePhoto}>
                        Remove
                      </Button>
                    ) : (
                      <label htmlFor="employee-photo-upload">
                        <Button
                          component="span"
                          variant="outlined"
                          size="small"
                          startIcon={<CloudUploadIcon />}
                          sx={{ textTransform: 'none' }}
                        >
                          Choose File
                        </Button>
                      </label>
                    )}
                  </Box>
                </Box>
                {photoError && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.8, display: 'block' }}>
                    {photoError}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  label="Login Password *"
                  value={formData.password}
                  onChange={handleTextChange('password')}
                  helperText="Choose a password of at least 6 characters (used to log in once approved)."
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      {!submitted && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDialogClose} color="inherit" disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ px: 3, borderRadius: 2 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Application'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
