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
  CameraAlt as CameraIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi } from '../../api/client';

const PHOTO_TYPE_OPTIONS = [
  { value: 'ABOUT', label: 'About' },
  { value: 'BATTERY', label: 'Battery' },
  { value: 'LEFT', label: 'Left' },
  { value: 'RIGHT', label: 'Right' },
  { value: 'TOP', label: 'Top' },
  { value: 'BOTTOM', label: 'Bottom' },
  { value: 'FRONT', label: 'Front' },
  { value: 'REAR', label: 'Rear' },
  { value: 'HOME', label: 'Home' },
  { value: 'CAMERA', label: 'Camera' },
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
  const [selectedPhotoType, setSelectedPhotoType] = useState('ABOUT');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Deleting state
  const [deletingId, setDeletingId] = useState(null);

  // Open / Close Lightbox with browser history integration (handles Android back navigation)
  const openLightbox = (index) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
    setDragOffset(0);
    setIsDragging(false);
    try {
      window.history.pushState({ devicePhotoLightbox: true }, '');
    } catch (e) {
      // ignore
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setDragOffset(0);
    setIsDragging(false);
    if (window.history.state?.devicePhotoLightbox) {
      window.history.back();
    }
  };

  // Android back button / swipe back gesture closes the lightbox
  useEffect(() => {
    const handlePopState = () => {
      if (lightboxOpen) {
        setLightboxOpen(false);
        setDragOffset(0);
        setIsDragging(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [lightboxOpen]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => Math.min(photos.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, photos.length]);

  // Touch swipe with animated dragging for mobile Lightbox
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const isHorizontalSwipeRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (touchStartXRef.current === null || !e.touches || e.touches.length === 0) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Detect direction
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(diffX) >= Math.abs(diffY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Rubber-band resistance at boundaries
      let offset = diffX;
      if (
        (activePhotoIndex === 0 && diffX > 0) ||
        (activePhotoIndex === photos.length - 1 && diffX < 0)
      ) {
        offset = diffX * 0.25;
      }
      setDragOffset(offset);
    }
  };

  const handleTouchEnd = () => {
    const finalOffset = dragOffset;
    setIsDragging(false);

    if (isHorizontalSwipeRef.current && Math.abs(finalOffset) > 40) {
      if (finalOffset < -40 && activePhotoIndex < photos.length - 1) {
        // Swiped Left -> Next photo
        setActivePhotoIndex((prev) => prev + 1);
      } else if (finalOffset > 40 && activePhotoIndex > 0) {
        // Swiped Right -> Previous photo
        setActivePhotoIndex((prev) => prev - 1);
      }
    }

    setDragOffset(0);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  // Direct download photo to device
  const handleDownloadPhoto = async (e) => {
    e?.stopPropagation?.();
    if (!currentPhoto?.url) return;
    try {
      const res = await fetch(currentPhoto.url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = currentPhoto.url.split('.').pop()?.split('?')[0] || 'jpg';
      const cleanModel = (device?.model || 'device').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanType = (currentPhoto.photo_type || 'photo').toLowerCase();
      link.download = `${cleanModel}_${cleanType}_${activePhotoIndex + 1}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      enqueueSnackbar('Photo download started', { variant: 'success' });
    } catch (err) {
      // Fallback: open image in new tab if CORS prevents direct blob
      window.open(currentPhoto.url, '_blank', 'noopener,noreferrer');
    }
  };

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

  const currentPhoto = photos[activePhotoIndex] || photos[0];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        mb: 1.5,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFCFF',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : '#DBEAFE',
      }}
    >
      {/* Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: 1.5,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <GalleryIcon sx={{ fontSize: 15 }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Typography variant="subtitle2" fontWeight={800} fontSize="0.84rem">
              {title}
            </Typography>
            {photos.length > 0 && (
              <Chip
                label={`${photos.length} photo${photos.length === 1 ? '' : 's'}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF',
                  color: 'primary.main'
                }}
              />
            )}
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
              startIcon={uploading ? <CircularProgress size={13} color="inherit" /> : <AddPhotoIcon sx={{ fontSize: 15 }} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.74rem',
                py: 0.3,
                px: 1.2
              }}
            >
              {uploading ? 'Uploading...' : 'Add Photos'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Admin Quick Upload Tag Selector */}
      {isAdmin && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.68rem' }}>
            Tag:
          </Typography>
          {PHOTO_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              size="small"
              clickable
              onClick={() => setSelectedPhotoType(opt.value)}
              color={selectedPhotoType === opt.value ? 'primary' : 'default'}
              variant={selectedPhotoType === opt.value ? 'filled' : 'outlined'}
              sx={{
                fontSize: '0.66rem',
                fontWeight: selectedPhotoType === opt.value ? 800 : 600,
                height: 20,
                borderRadius: '5px'
              }}
            />
          ))}
        </Box>
      )}

      {/* Photo Gallery Grid */}
      {photos.length === 0 ? (
        // Admin Empty State Dropzone (Compact)
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            py: 1.5,
            px: 2,
            borderRadius: 1.5,
            border: '1.5px dashed',
            borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(241, 245, 249, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.2,
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF'
            }
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 22, color: 'primary.main' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Click here to upload device photos (front, back, screen, defects)
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center'
          }}
        >
          {photos.map((photo, index) => (
            <Box
              key={photo.id || index}
              onClick={() => openLightbox(index)}
              sx={{
                position: 'relative',
                width: { xs: 80, sm: 94 },
                height: { xs: 80, sm: 94 },
                borderRadius: '6px',
                overflow: 'hidden',
                bgcolor: '#000',
                cursor: 'pointer',
                border: photo.is_primary ? '2px solid' : '1px solid',
                borderColor: photo.is_primary ? 'primary.main' : 'divider',
                boxShadow: photo.is_primary ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                flexShrink: 0,
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
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
                  top: 4,
                  left: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.3,
                  zIndex: 2,
                  maxWidth: '90%'
                }}
              >
                {photo.photo_type_display && (
                  <Chip
                    label={photo.photo_type_display}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(0, 0, 0, 0.65)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.58rem',
                      height: 16,
                      px: 0.2,
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
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  zIndex: 3
                }}
              >
                {/* View Zoom */}
                <IconButton
                  size="small"
                  sx={{ p: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '&:hover': { bgcolor: 'primary.main' } }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(index);
                  }}
                >
                  <ZoomInIcon sx={{ fontSize: 15 }} />
                </IconButton>

                {/* Admin Set Primary */}
                {isAdmin && !photo.is_primary && (
                  <Tooltip title="Set primary">
                    <IconButton
                      size="small"
                      sx={{ p: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#FBBF24', '&:hover': { bgcolor: 'rgba(251, 191, 36, 0.4)' } }}
                      onClick={(e) => handleSetPrimary(photo.id, e)}
                    >
                      <StarOutlineIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Admin Delete */}
                {isAdmin && (
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      sx={{ p: 0.5, bgcolor: 'rgba(255,255,255,0.2)', color: '#EF4444', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                      onClick={(e) => handleDeletePhoto(photo.id, e)}
                      disabled={deletingId === photo.id}
                    >
                      {deletingId === photo.id ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <DeleteIcon sx={{ fontSize: 15 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          ))}

          {/* Quick Add Photo Button for Admin at end of list */}
          {isAdmin && (
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                width: { xs: 80, sm: 94 },
                height: { xs: 80, sm: 94 },
                borderRadius: '6px',
                border: '1.5px dashed',
                borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#93C5FD',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F0F9FF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE'
                }
              }}
            >
              <AddPhotoIcon sx={{ fontSize: 18, color: 'primary.main', mb: 0.2 }} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'primary.main' }}>
                Add More
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* FULLSCREEN LIGHTBOX DIALOG */}
      <Dialog
        open={lightboxOpen}
        onClose={closeLightbox}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(10, 15, 30, 0.96)',
            backgroundImage: 'none',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            m: { xs: 1, sm: 2 }
          }
        }}
      >
        {/* Lightbox Topbar (Redesigned for Mobile & Desktop) */}
        <Box
          sx={{
            py: 1.25,
            px: { xs: 1.5, sm: 2 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            bgcolor: 'rgba(10, 15, 30, 0.98)'
          }}
        >
          {/* Left: Title + Counter below it */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0, pr: 1 }}>
            <Typography
              sx={{
                fontSize: { xs: '0.85rem', sm: '1rem' },
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={device?.model}
            >
              {device?.model}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                component="span"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  px: 0.7,
                  py: 0.15,
                  borderRadius: '3px',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.85)',
                  letterSpacing: '0.2px'
                }}
              >
                {activePhotoIndex + 1} of {photos.length}
              </Box>
            </Box>
          </Box>

          {/* Right: Tag Chip + Download Icon + Close Button (Hidden on mobile, visible on laptop/desktop) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.75, sm: 1.2 }, flexShrink: 0 }}>
            {currentPhoto?.photo_type_display && (
              <Chip
                label={currentPhoto.photo_type_display}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: { xs: '0.68rem', sm: '0.75rem' },
                  height: { xs: 22, sm: 24 },
                  borderRadius: '4px'
                }}
              />
            )}

            {/* Download Photo Button */}
            <Tooltip title="Download Photo">
              <IconButton
                onClick={handleDownloadPhoto}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  p: { xs: 0.6, sm: 0.8 },
                  borderRadius: '6px',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.18)',
                    color: '#fff'
                  }
                }}
              >
                <DownloadIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
              </IconButton>
            </Tooltip>

            {/* Close Button: Hidden on mobile (Android back gesture closes), visible on laptop/desktop */}
            <IconButton
              onClick={closeLightbox}
              size="small"
              sx={{
                display: { xs: 'none', md: 'inline-flex' },
                color: 'rgba(255,255,255,0.85)',
                bgcolor: 'rgba(255,255,255,0.08)',
                p: { xs: 0.6, sm: 0.8 },
                borderRadius: '6px',
                '&:hover': {
                  bgcolor: 'rgba(239, 68, 68, 0.25)',
                  color: '#EF4444'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
            </IconButton>
          </Box>
        </Box>

        {/* Lightbox Main Stage with Animated Sliding Track */}
        <DialogContent
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          sx={{
            p: 0,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            minHeight: { xs: 350, sm: 550 },
            maxHeight: '80vh',
            bgcolor: '#030712',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {/* Animated Carousel Sliding Track */}
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              height: '100%',
              transform: `translateX(calc(-${activePhotoIndex * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'transform'
            }}
          >
            {photos.map((photo, idx) => (
              <Box
                key={photo.id || idx}
                sx={{
                  minWidth: '100%',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  p: { xs: 1, sm: 2 }
                }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt={photo.caption || device?.model}
                  draggable={false}
                  loading={Math.abs(idx - activePhotoIndex) <= 1 ? 'eager' : 'lazy'}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    objectFit: 'contain',
                    display: 'block',
                    userSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>

        {/* Lightbox Bottom Thumbnails Strip */}
        {photos.length > 1 && (
          <Box
            sx={{
              p: 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: photos.length > 5 ? 'flex-start' : 'center',
              gap: 1,
              overflowX: 'auto',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              bgcolor: 'rgba(0,0,0,0.5)',
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 1 }
            }}
          >
            {photos.map((p, idx) => (
              <Box
                key={p.id || idx}
                onClick={() => setActivePhotoIndex(idx)}
                sx={{
                  width: { xs: 46, sm: 54 },
                  height: { xs: 46, sm: 54 },
                  borderRadius: '4px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: idx === activePhotoIndex ? '2px solid' : '1px solid',
                  borderColor: idx === activePhotoIndex ? 'primary.main' : 'rgba(255,255,255,0.25)',
                  opacity: idx === activePhotoIndex ? 1 : 0.6,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
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
