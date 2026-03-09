import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import { SalesReportQuery } from '../types/deal.types';
import { useSalesReport } from '../hooks/useSalesReport';
import SalesReportTable from '../components/SalesReportTable';

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function defaultRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(1); // first of current month
  return {
    startDate: toDateInput(start.toISOString()),
    endDate: toDateInput(end.toISOString()),
  };
}

export default function SalesReportPage() {
  const defaults = defaultRange();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const { report, loading, error, fetch, exportCsv, exporting } = useSalesReport();

  const handleRun = () => {
    const query: SalesReportQuery = { startDate, endDate };
    fetch(query);
  };

  const handleExport = () => {
    exportCsv({ startDate, endDate });
  };

  return (
    <Box>
      {/* Header */}
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Sales Report
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
            onClick={handleRun}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? 'Loading…' : 'Run Report'}
          </Button>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || !report}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading skeleton */}
      {loading && !report && (
        <Box>
          <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      )}

      {/* Empty prompt (before first run) */}
      {!loading && !error && !report && (
        <Box
          sx={{
            p: 4,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Select a date range and click <strong>Run Report</strong> to view funded deal totals.
          </Typography>
        </Box>
      )}

      {/* Results */}
      {report && !loading && <SalesReportTable report={report} />}
    </Box>
  );
}
