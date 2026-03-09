import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { SalesReport } from '../types/deal.types';

function fmtMoney(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface SalesReportTableProps {
  report: SalesReport;
}

export default function SalesReportTable({ report }: SalesReportTableProps) {
  return (
    <Box>
      {/* Summary totals */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Summary
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Units
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {report.totalUnits}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Front-End Gross
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmtMoney(report.totalFrontEndGross)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Front-End Gross / Unit
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmtMoney(report.avgFrontEndGross)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Back-End Gross
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmtMoney(report.totalBackEndGross)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Avg Back-End Gross / Unit
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {fmtMoney(report.avgBackEndGross)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Per-salesperson breakdown */}
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        By Salesperson
      </Typography>

      {report.bySalesperson.length === 0 ? (
        <Box
          sx={{
            p: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No funded deals in this date range.
          </Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Salesperson</TableCell>
              <TableCell align="right">Units</TableCell>
              <TableCell align="right">Total Front Gross</TableCell>
              <TableCell align="right">Avg Front Gross</TableCell>
              <TableCell align="right">Total Back Gross</TableCell>
              <TableCell align="right">Avg Back Gross</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.bySalesperson.map((row) => (
              <TableRow key={row.userId} hover>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.totalUnits}</TableCell>
                <TableCell align="right">{fmtMoney(row.totalFrontEndGross)}</TableCell>
                <TableCell align="right">{fmtMoney(row.avgFrontEndGross)}</TableCell>
                <TableCell align="right">{fmtMoney(row.totalBackEndGross)}</TableCell>
                <TableCell align="right">{fmtMoney(row.avgBackEndGross)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
