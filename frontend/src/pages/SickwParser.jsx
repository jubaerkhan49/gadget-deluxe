import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AutoFixHigh as ParseIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Smartphone as PhoneIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { sickwApi, deviceApi } from '../api/client';
import CopyableText from '../components/common/CopyableText';
import AddDeviceDialog from '../dialogs/AddDeviceDialog';

export default function SickwParser() {
  const { enqueueSnackbar } = useSnackbar();

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);
  const [savingDirect, setSavingDirect] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);

  const handleParse = async () => {
    if (!rawText.trim()) {
      enqueueSnackbar('Please paste a Sickw report first', { variant: 'warning' });
      return;
    }

    try {
      setParsing(true);
      const res = await sickwApi.parseRaw(rawText.trim());
      setParsedResult(res.data.parsed);
      enqueueSnackbar('Report parsed successfully!', { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to parse Sickw report', { variant: 'error' });
    } finally {
      setParsing(false);
    }
  };

  const handleQuickSave = async () => {
    if (!parsedResult || !parsedResult.imei) {
      enqueueSnackbar('Parsed report is missing an IMEI', { variant: 'error' });
      return;
    }

    try {
      setSavingDirect(true);
      const payload = {
        imei: parsedResult.imei,
        imei2: parsedResult.imei2 || null,
        serial_number: parsedResult.serial_number || null,
        meid: parsedResult.meid || null,
        model: parsedResult.model || 'iPhone',
        model_description: parsedResult.model_description || null,
        capacity: parsedResult.capacity || null,
        color: parsedResult.color || null,
        sim_lock_status: parsedResult.sim_lock_status || null,
        carrier_policy: parsedResult.carrier_policy || null,
        icloud_status: parsedResult.icloud_status || null,
        purchase_country: parsedResult.purchase_country || null,
        demo_unit: parsedResult.demo_unit || false,
        loaner_device: parsedResult.loaner_device || false,
        replacement_device: parsedResult.replacement_device || false,
        refurbished: parsedResult.refurbished || false,
        current_status: 'IN_STOCK'
      };

      await deviceApi.create(payload);
      enqueueSnackbar('Device saved directly to inventory!', { variant: 'success' });
      setRawText('');
      setParsedResult(null);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.imei?.[0] || 'Failed to save device. IMEI may already exist.', {
        variant: 'error'
      });
    } finally {
      setSavingDirect(false);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
          Sickw IMEI Parser & Importer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Paste raw Sickw GSX / IMEI check reports to automatically extract hardware specs and import to stock
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Input Box */}
        <Grid item xs={12} lg={6}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1, textTransform: 'uppercase' }}>
              Paste Sickw Raw Report Text
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={14}
              placeholder="Model Description: iPhone 15 Pro Max 256GB Natural Titanium&#10;IMEI: 351234567890123&#10;Serial Number: F2LXXXXX&#10;Carrier: US T-Mobile&#10;SIM Lock: Locked&#10;iCloud Lock: OFF..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
              }}
            />

            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ClearIcon />}
                onClick={() => {
                  setRawText('');
                  setParsedResult(null);
                }}
                disabled={!rawText && !parsedResult}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={parsing ? <CircularProgress size={16} color="inherit" /> : <ParseIcon />}
                onClick={handleParse}
                disabled={parsing || !rawText.trim()}
              >
                Parse Report
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Parsed Preview Card */}
        <Grid item xs={12} lg={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5, textTransform: 'uppercase' }}>
              Parsed Device Specifications
            </Typography>

            {!parsedResult ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  textAlign: 'center'
                }}
              >
                <Typography color="text.secondary">
                  Paste report text on the left and click <strong>Parse Report</strong> to inspect extracted parameters.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Card sx={{ p: 2, mb: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {parsedResult.model || 'Unknown Model'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {parsedResult.model_description || ''}
                  </Typography>
                </Card>

                {/* Extracted Details Grid */}
                <Grid container spacing={1.5} sx={{ mb: 2, flex: 1 }}>
                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Primary IMEI</Typography>
                      <CopyableText text={parsedResult.imei || '—'} />
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                      <CopyableText text={parsedResult.serial_number || '—'} />
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Capacity & Color</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {parsedResult.capacity || '—'} {parsedResult.color ? `• ${parsedResult.color}` : ''}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">SIM Lock / Carrier</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {parsedResult.sim_lock_status || '—'}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">iCloud / FMI</Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={parsedResult.icloud_status?.toLowerCase().includes('off') ? 'success.main' : 'warning.main'}
                      >
                        {parsedResult.icloud_status || '—'}
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Country</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {parsedResult.purchase_country || '—'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Import Action Buttons */}
                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDeviceOpen(true)}
                  >
                    Open in Full Form
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={savingDirect ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                    onClick={handleQuickSave}
                    disabled={savingDirect}
                  >
                    Quick Add to Stock
                  </Button>
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Device Full Modal if requested */}
      <AddDeviceDialog
        open={addDeviceOpen}
        onClose={() => setAddDeviceOpen(false)}
        onDeviceCreated={() => {
          setRawText('');
          setParsedResult(null);
        }}
        initialData={parsedResult}
      />
    </Box>
  );
}
