import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress,
  Stack,
  Chip,
  Tooltip,
  Paper,
  Fade,
  Menu,
  MenuItem
} from '@mui/material';
import {
  AddPhotoAlternate as AddPhotoIcon,
  DeleteOutline as DeleteIcon,
  Star as StarFilledIcon,
  StarBorder as StarOutlineIcon,
  Close as CloseIcon,
  ArrowBackIosNew as PrevIcon,
  ArrowForwardIos as NextIcon,
  ZoomIn as ZoomInIcon,
  CloudUpload as CloudUploadIcon,
  Collections as GalleryIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi } from '../../api/client';

const PHOTO_TYPE_OPTIONS = [
  { value: 'FRONT', label: 'Front' },
  { value: 'BACK', label: 'Back' },
  { value: 'DISPLAY', label: 'Display' },
  { value: 'BATTERY', label: 'Battery' },
  { value: 'IMEI_STICKER', label: 'IMEI Sticker' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'PACKAGING', label: 'Box / Accs' },
  { value: 'OTHER', label: 'Other' },
];

export default function DevicePhotoGallery({
  device,
  isAdmin = false,
  onPhotosUpdated,
  title = "Device Condition Photos"
}) {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  const photos = (device?.photos || device?.images || []).filter(p => Boolean(p.url));

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState('FRONT');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Deleting state
  const [deletingId, setDeletingId] = useState(null);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, photos.length]);

  // If not admin and no photos, render nothing (Zero Clutter Rule)
  if (!isAdmin && photos.length === 0) {
    return null;
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate size (max 15MB per file)
    const oversized = files.find(f => f.size > 15 * 1024 * 1024);
    if (oversized) {
      enqueueSnackbar(`File "${oversized.name}" exceeds 15MB limit.`, { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('photo_type', selectedPhotoType);
    if (photos.length === 0) {
      formData.append('is_primary', 'true');
    }

    try {
      setUploading(true);
      const res = await deviceApi.uploadPhoto(device.id, formData);
      enqueueSnackbar(res.data?.message || `Uploaded ${files.length} photo(s) to Cloudinary.`, { variant: 'success' });
      if (onPhotosUpdated && res.data?.device) {
        onPhotosUpdated(res.data.device);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to upload photo to Cloudinary.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this photo from Cloudinary and device record?')) return;

    try {
      setDeletingId(photoId);
      const res = await deviceApi.deletePhoto(device.id, photoId);
      enqueueSnackbar('Photo deleted.', { variant: 'info' });
      if (onPhotosUpdated && res.data?.device) {
        onPhotosUpdated(res.data.device);
      }
    } catch (err) {
      console.error('Delete photo failed:', err);
      enqueueSnackbar('Failed to delete photo.', { variant: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (photoId, e) => {
    e.stopPropagation();
    try {
      const res = await deviceApi.setPrimaryPhoto(device.id, photoId);
      enqueueSnackbar('Primary display photo updated.', { variant: 'success' });
      if (onPhotosUpdated && res.data?.device) {
        onPhotosUpdated(res.data.device);
      }
    } catch (err) {
      console.error('Set primary failed:', err);
      enqueueSnackbar('Failed to update primary photo.', { variant: 'error' });
    }
  };

  const openLightbox = (index) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const currentPhoto = photos[activePhotoIndex] || photos[0];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        mb: 2.5,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFCFF',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : '#DBEAFE',
      }}
    >
      {/* Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GalleryIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={800} letterSpacing={-0.2}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {photos.length === 0
                ? 'No photos uploaded yet.'
                : `${photos.length} verified physical ${photos.length === 1 ? 'photo' : 'photos'} attached`}
            </Typography>
          </Box>
        </Box>

        {/* Admin Upload Trigger */}
        {isAdmin && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <AddPhotoIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                px: 1.75
              }}
            >
              {uploading ? 'Uploading to Cloudinary...' : 'Add Photos'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Admin Quick Upload Tag Selector */}
      {isAdmin && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Next Upload Tag:
          </Typography>
          {PHOTO_TYPE_OPTIONS.slice(0, 5).map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              clickable
              onClick={() => setSelectedPhotoType(opt.value)}
              color={selectedPhotoType === opt.value ? 'primary' : 'default'}
              variant={selectedPhotoType === opt.value ? 'filled' : 'outlined'}
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                height: 22,
                borderRadius: '6px'
              }}
            />
          ))}
        </Box>
      )}

      {/* Photo Gallery Grid */}
      {photos.length === 0 ? (
        // Admin Empty State Dropzone
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            py: 3,
            px: 2,
            textAlign: 'center',
            borderRadius: 2,
            border: '2px dashed',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(241, 245, 249, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF'
            }
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 0.8 }} />
          <Typography variant="body2" fontWeight={700}>
            Click to upload device photos (front, back, screen, defects)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supports multiple JPG, PNG, WEBP files. Stored securely on Cloudinary.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 1.5
          }}
        >
          {photos.map((photo, index) => (
            <Box
              key={photo.id || index}
              onClick={() => openLightbox(index)}
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                bgcolor: '#000',
                cursor: 'pointer',
                border: photo.is_primary ? '2px solid' : '1px solid',
                borderColor: photo.is_primary ? 'primary.main' : 'divider',
                boxShadow: photo.is_primary ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                  '& .photo-overlay': { opacity: 1 }
                }
              }}
            >
              {/* Image */}
              <Box
                component="img"
                src={photo.url}
                alt={photo.caption || `Device photo ${index + 1}`}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {/* Badges Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  zIndex: 2
                }}
              >
                {photo.is_primary && (
                  <Chip
                    icon={<StarFilledIcon sx={{ fontSize: '12px !important', color: '#F59E0B !important' }} />}
                    label="Primary"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.75)',
                      color: '#FBBF24',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                      backdropFilter: 'blur(4px)'
                    }}
                  />
                )}
                {photo.photo_type_display && (
                  <Chip
                    label={photo.photo_type_display}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.65)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      height: 18,
                      backdropFilter: 'blur(4px)'
                    }}
                  />
                )}
              </Box>

              {/* Hover / Action Overlay */}
              <Box
                className="photo-overlay"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  opacity: { xs: 1, sm: 0 },
                  transition: 'opacity 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  zIndex: 3
                }}
              >
                {/* View Zoom */}
                <IconButton
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { bgcolor: 'primary.main' } }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(index);
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>

                {/* Admin Set Primary */}
                {isAdmin && !photo.is_primary && (
                  <Tooltip title="Set as primary photo">
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FBBF24', '&:hover': { bgcolor: 'rgba(251, 191, 36, 0.4)' } }}
                      onClick={(e) => handleSetPrimary(photo.id, e)}
                    >
                      <StarOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Admin Delete */}
                {isAdmin && (
                  <Tooltip title="Delete photo">
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#EF4444', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                      onClick={(e) => handleDeletePhoto(photo.id, e)}
                      disabled={deletingId === photo.id}
                    >
                      {deletingId === photo.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* FULLSCREEN LIGHTBOX DIALOG */}
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10, 15, 30, 0.96)',
            backgroundImage: 'none',
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        {/* Lightbox Topbar */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            color: '#fff'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>
              {device?.model}
            </Typography>
            <Chip
              label={`${activePhotoIndex + 1} of ${photos.length}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700 }}
            />
            {currentPhoto?.photo_type_display && (
              <Chip
                label={currentPhoto.photo_type_display}
                size="small"
                sx={{ bgcolor: 'primary.main', color: '#fff', fontWeight: 700 }}
              />
            )}
            {currentPhoto?.is_primary && (
              <Chip
                icon={<StarFilledIcon sx={{ fontSize: '13px !important', color: '#F59E0B !important' }} />}
                label="Primary Photo"
                size="small"
                sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', fontWeight: 800 }}
              />
            )}
          </Box>

          <IconButton onClick={() => setLightboxOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Lightbox Main Stage */}
        <DialogContent
          sx={{
            p: 0,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: { xs: 350, sm: 550 },
            maxHeight: '80vh',
            bgcolor: '#030712'
          }}
        >
          {/* Previous Arrow */}
          {photos.length > 1 && (
            <IconButton
              onClick={() => setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
              sx={{
                position: 'absolute',
                left: 16,
                zIndex: 10,
                bgcolor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'primary.main' }
              }}
            >
              <PrevIcon />
            </IconButton>
          )}

          {/* Active Image */}
          {currentPhoto && (
            <Box
              component="img"
              src={currentPhoto.url}
              alt={currentPhoto.caption || device?.model}
              sx={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: 'block',
                transition: 'opacity 0.2s ease'
              }}
            />
          )}

          {/* Next Arrow */}
          {photos.length > 1 && (
            <IconButton
              onClick={() => setActivePhotoIndex((prev) => (prev + 1) % photos.length)}
              sx={{
                position: 'absolute',
                right: 16,
                zIndex: 10,
                bgcolor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'primary.main' }
              }}
            >
              <NextIcon />
            </IconButton>
          )}
        </DialogContent>

        {/* Lightbox Bottom Thumbnails Strip */}
        {photos.length > 1 && (
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              overflowX: 'auto',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(0,0,0,0.4)'
            }}
          >
            {photos.map((p, idx) => (
              <Box
                key={p.id || idx}
                onClick={() => setActivePhotoIndex(idx)}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: idx === activePhotoIndex ? '2px solid' : '1px solid',
                  borderColor: idx === activePhotoIndex ? 'primary.main' : 'rgba(255,255,255,0.2)',
                  opacity: idx === activePhotoIndex ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                  '&:hover': { opacity: 1 }
                }}
              >
                <Box
                  component="img"
                  src={p.url}
                  alt={`Thumbnail ${idx + 1}`}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Dialog>
    </Paper>
  );
}
