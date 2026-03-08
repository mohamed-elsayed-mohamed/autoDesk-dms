import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Skeleton,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import { getDashboard } from '../../api/vehicles';
import type { DashboardData } from '../../types';

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ bgcolor: `${color}15`, borderRadius: 2, p: 1.5, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    getDashboard(page, 25)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={300} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">Failed to load dashboard</Typography>
      </Box>
    );
  }

  const totalPages = Math.ceil((data.agingList.meta.total) / data.agingList.meta.limit);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Inventory Dashboard</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard
            icon={<InventoryIcon sx={{ fontSize: 32, color: '#1565c0' }} />}
            label="Active Vehicles"
            value={data.totalCount.toLocaleString()}
            color="#1565c0"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            icon={<AttachMoneyIcon sx={{ fontSize: 32, color: '#2e7d32' }} />}
            label="Total Inventory Value"
            value={`$${parseFloat(data.totalValue).toLocaleString()}`}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard
            icon={<AccessTimeIcon sx={{ fontSize: 32, color: '#f57c00' }} />}
            label="Avg Days in Stock"
            value={`${data.averageDaysInStock} days`}
            color="#f57c00"
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Aging Vehicles (60+ days)</Typography>
          </Box>

          {data.agingList.data.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No aging vehicles</Typography>
              <Typography variant="body2" color="text.secondary">
                All vehicles have been in stock for less than 60 days
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Stock #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Make / Model</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Days in Stock</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Internet Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.agingList.data.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>{v.stockNumber}</TableCell>
                        <TableCell>{v.make} {v.model}</TableCell>
                        <TableCell>
                          <Typography color={v.daysInStock > 90 ? 'error.main' : 'warning.main'} fontWeight={600}>
                            {v.daysInStock} days
                          </Typography>
                        </TableCell>
                        <TableCell>${parseFloat(v.internetPrice).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
