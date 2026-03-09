import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Skeleton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import RestoreIcon from '@mui/icons-material/RestoreFromTrash';
import { getCustomer, archiveCustomer, restoreCustomer } from '../../../api/customers';
import { getCustomerTimeline } from '../../../api/activities';
import type { CustomerDetail, Activity, PaginationMeta } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../../types';
import StatusBadge from '../../../components/StatusBadge';
import Timeline from '../../../components/Timeline';
import ActivityLogDialog from '../activities/ActivityLogDialog';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesMeta, setActivitiesMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0 });
  const [activityPage, setActivityPage] = useState(1);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const isManager = user?.role === UserRole.SalesManager;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getCustomer(id)
      .then(setCustomer)
      .catch(() => setError('Customer not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchActivities = useCallback(async (page: number) => {
    if (!id) return;
    setActivitiesLoading(true);
    try {
      const result = await getCustomerTimeline(id, { page, limit: 10 });
      if (page === 1) {
        setActivities(result.data);
      } else {
        setActivities((prev) => [...prev, ...result.data]);
      }
      setActivitiesMeta(result.meta);
    } catch {
      // Silently ignore
    } finally {
      setActivitiesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  const handleLoadMoreActivities = () => {
    const next = activityPage + 1;
    setActivityPage(next);
    fetchActivities(next);
  };

  const handleArchive = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await archiveCustomer(id);
      setCustomer((prev) => prev ? { ...prev, archivedAt: new Date().toISOString() } : prev);
    } catch {
      setError('Failed to archive customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await restoreCustomer(id);
      setCustomer((prev) => prev ? { ...prev, archivedAt: null } : prev);
    } catch {
      setError('Failed to restore customer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error || !customer) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{error || 'Customer not found'}</Typography>
        <Button onClick={() => navigate('/customers')} sx={{ mt: 2 }}>Back to Customers</Button>
      </Box>
    );
  }

  const isArchived = !!customer.archivedAt;
  const hasMore = activitiesMeta.total > activities.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4">
            {customer.firstName} {customer.lastName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {isArchived && <Chip label="Archived" size="small" color="default" />}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/leads/new?customerId=${id}`)}
          >
            New Lead
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/customers/${id}/edit`)}
          >
            Edit
          </Button>
          {isManager && (
            isArchived ? (
              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={handleRestore}
                disabled={actionLoading}
              >
                Restore
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ArchiveIcon />}
                onClick={handleArchive}
                disabled={actionLoading}
              >
                Archive
              </Button>
            )
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contact Information</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 150 }}>Phone</TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell>{customer.email || '—'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Preferred Contact</TableCell>
                    <TableCell>{customer.preferredContact}</TableCell>
                  </TableRow>
                  {(customer.street || customer.city) && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
                      <TableCell>
                        {[customer.street, customer.city, customer.state, customer.zip]
                          .filter(Boolean)
                          .join(', ')}
                      </TableCell>
                    </TableRow>
                  )}
                  {customer.notes && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                      <TableCell>{customer.notes}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Customer Since</TableCell>
                    <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Leads ({customer.leads.length})</Typography>
              {customer.leads.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No leads yet.{' '}
                  <RouterLink to={`/leads/new?customerId=${id}`} style={{ color: 'inherit' }}>
                    Create the first lead.
                  </RouterLink>
                </Typography>
              ) : (
                <Table size="small">
                  <TableBody>
                    {customer.leads.map((lead) => (
                      <TableRow key={lead.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead.id}`)}>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>{lead.source}</TableCell>
                        <TableCell>
                          {lead.assignee
                            ? `${lead.assignee.firstName} ${lead.assignee.lastName}`
                            : 'Unassigned'}
                        </TableCell>
                        <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Activity Timeline</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setActivityDialogOpen(true)}
              >
                Log Activity
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Timeline
              activities={activities}
              loading={activitiesLoading}
              hasMore={hasMore}
              onLoadMore={handleLoadMoreActivities}
            />
          </CardContent>
        </Card>
      </Box>

      {id && (
        <ActivityLogDialog
          open={activityDialogOpen}
          customerId={id}
          onClose={() => setActivityDialogOpen(false)}
          onCreated={(a) => {
            setActivities((prev) => [a, ...prev]);
            setActivityDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
}
