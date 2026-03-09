import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import apiClient from '../../../api/client';
import type { ManagerDashboardData } from '../../../types';
import { LeadStatus } from '../../../types';
import StatusBadge from '../../../components/StatusBadge';

const STATUS_ORDER: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.AppointmentSet,
  LeadStatus.Showed,
  LeadStatus.Negotiating,
  LeadStatus.Sold,
  LeadStatus.Lost,
];

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    apiClient.get('/api/dashboard/manager')
      .then((r) => setData(r.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[...Array(7)].map((_, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Alert severity="error" action={<Button size="small" color="inherit" onClick={fetchData}>Retry</Button>}>
          {error || 'No data available'}
        </Alert>
      </Box>
    );
  }

  const totalActive = STATUS_ORDER
    .filter((s) => s !== LeadStatus.Sold && s !== LeadStatus.Lost)
    .reduce((sum, s) => sum + (data.pipeline[s] || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">CRM Dashboard</Typography>
        <Button variant="outlined" size="small" onClick={fetchData}>Refresh</Button>
      </Box>

      {/* Pipeline Summary */}
      <Typography variant="h6" sx={{ mb: 2 }}>Pipeline Summary</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {STATUS_ORDER.map((status) => {
          const count = data.pipeline[status] || 0;
          return (
            <Grid item xs={6} sm={4} md={2} key={status} sx={{ minWidth: 120 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <StatusBadge status={status} size="small" />
                  <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>{count}</Typography>
                  <Typography variant="caption" color="text.secondary">leads</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        <Grid item xs={6} sm={4} md={2} sx={{ minWidth: 120 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Total Active</Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 700 }}>{totalActive}</Typography>
              <Typography variant="caption">in pipeline</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Workload Table */}
      <Typography variant="h6" sx={{ mb: 2 }}>Salesperson Workload</Typography>
      <Card sx={{ mb: 4 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Salesperson</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Active Leads</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Pending Tasks</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">Overdue Tasks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.workload.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography color="text.secondary">No data available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.workload.map((w) => (
                  <TableRow key={w.userId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {w.firstName} {w.lastName}
                    </TableCell>
                    <TableCell align="center">{w.activeLeadCount}</TableCell>
                    <TableCell align="center">{w.pendingTaskCount}</TableCell>
                    <TableCell align="center">
                      {w.overdueTaskCount > 0 ? (
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: '#b71c1c' }}
                        >
                          {w.overdueTaskCount}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">0</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Task Compliance */}
      <Typography variant="h6" sx={{ mb: 1 }}>Task Compliance</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">Total Pending</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{data.taskCompliance.totalPending}</Typography>
        </Paper>
        <Paper sx={{ px: 2, py: 1, bgcolor: data.taskCompliance.totalOverdue > 0 ? '#fff5f5' : undefined }}>
          <Typography variant="body2" color="text.secondary">Total Overdue</Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: data.taskCompliance.totalOverdue > 0 ? '#b71c1c' : 'inherit' }}
          >
            {data.taskCompliance.totalOverdue}
          </Typography>
        </Paper>
      </Box>

      {data.taskCompliance.overdueByAssignee.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Overdue Tasks by Salesperson
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Salesperson</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Overdue Tasks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.taskCompliance.overdueByAssignee.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>{row.firstName} {row.lastName}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#b71c1c' }}>
                          {row.overdueCount}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
