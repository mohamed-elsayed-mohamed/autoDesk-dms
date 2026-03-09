import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  getLead,
  updateLeadStatus,
  addLeadVehicle,
  removeLeadVehicle,
  reassignLead,
} from '../../../api/leads';
import { getLeadActivities } from '../../../api/activities';
import { getLeadTasks } from '../../../api/tasks';
import { updateTaskStatus } from '../../../api/tasks';
import apiClient from '../../../api/client';
import type { Lead, Activity, Task, PaginationMeta } from '../../../types';
import { LeadStatus, UserRole, TaskStatus } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import StatusBadge from '../../../components/StatusBadge';
import LeadStatusStepper from './components/LeadStatusStepper';
import VehicleInterestPicker from './components/VehicleInterestPicker';
import Timeline from '../../../components/Timeline';
import ActivityLogDialog from '../activities/ActivityLogDialog';
import TaskCard from '../tasks/components/TaskCard';
import TaskFormDialog from '../tasks/TaskFormDialog';

interface Salesperson {
  id: string;
  firstName: string;
  lastName: string;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Activities
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesMeta, setActivitiesMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0 });
  const [activityPage, setActivityPage] = useState(1);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Reassign dialog
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [reassignTo, setReassignTo] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);

  // Vehicle picker dialog
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [pendingVehicleIds, setPendingVehicleIds] = useState<string[]>([]);
  const [vehicleActionLoading, setVehicleActionLoading] = useState(false);

  const isManager = user?.role === UserRole.SalesManager;
  const isSoldOrLost = lead?.status === LeadStatus.Sold || lead?.status === LeadStatus.Lost;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getLead(id)
      .then(setLead)
      .catch(() => setError('Lead not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchActivities = useCallback(async (page: number) => {
    if (!id) return;
    setActivitiesLoading(true);
    try {
      const result = await getLeadActivities(id, { page, limit: 10 });
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

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    setTasksLoading(true);
    try {
      const result = await getLeadTasks(id, { limit: 50 });
      setTasks(result.data);
    } catch {
      // Silently ignore
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchActivities(1);
    fetchTasks();
  }, [fetchActivities, fetchTasks]);

  useEffect(() => {
    if (isManager) {
      apiClient.get('/api/users', { params: { role: 'SalesConsultant' } })
        .then((r) => setSalespeople(r.data.data || r.data))
        .catch(() => {});
    }
  }, [isManager]);

  const handleStatusChange = async (newStatus: LeadStatus, lostReason?: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await updateLeadStatus(id, newStatus, lostReason);
      setLead(updated);
    } catch {
      setError('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddVehicles = async () => {
    if (!id) return;
    setVehicleActionLoading(true);
    try {
      const existingIds = lead?.vehicles.map((v) => v.vehicleId) || [];
      const newIds = pendingVehicleIds.filter((vid) => !existingIds.includes(vid));
      for (const vid of newIds) {
        await addLeadVehicle(id, vid);
      }
      const updated = await getLead(id);
      setLead(updated);
      setVehiclePickerOpen(false);
      setPendingVehicleIds([]);
    } catch {
      setError('Failed to add vehicle');
    } finally {
      setVehicleActionLoading(false);
    }
  };

  const handleRemoveVehicle = async (vehicleId: string) => {
    if (!id) return;
    setVehicleActionLoading(true);
    try {
      await removeLeadVehicle(id, vehicleId);
      setLead((prev) =>
        prev ? { ...prev, vehicles: prev.vehicles.filter((v) => v.vehicleId !== vehicleId) } : prev
      );
    } catch {
      setError('Failed to remove vehicle');
    } finally {
      setVehicleActionLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!id || !reassignTo) return;
    setReassignLoading(true);
    try {
      const updated = await reassignLead(id, reassignTo);
      setLead(updated);
      setReassignDialogOpen(false);
      setReassignTo('');
    } catch {
      setError('Failed to reassign lead');
    } finally {
      setReassignLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      const updated = await updateTaskStatus(taskId, TaskStatus.Completed);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      setError('Failed to complete task');
    }
  };

  const handleTaskCancel = async (taskId: string) => {
    try {
      const updated = await updateTaskStatus(taskId, TaskStatus.Cancelled);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      setError('Failed to cancel task');
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={100} sx={{ mt: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error && !lead) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">{error}</Typography>
        <Button onClick={() => navigate('/leads')} sx={{ mt: 2 }}>Back to Leads</Button>
      </Box>
    );
  }

  if (!lead) return null;

  const activitiesHasMore = activitiesMeta.total > activities.length;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="h4"
              component="span"
              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() => navigate(`/customers/${lead.customerId}`)}
            >
              {lead.customer.firstName} {lead.customer.lastName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={lead.source} size="small" variant="outlined" />
            {lead.sourceOther && <Chip label={lead.sourceOther} size="small" />}
            <StatusBadge status={lead.status} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isManager && (
            <Button
              variant="outlined"
              startIcon={<SwapHorizIcon />}
              onClick={() => { setReassignTo(''); setReassignDialogOpen(true); }}
            >
              Reassign
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Status Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Pipeline Status</Typography>
          <LeadStatusStepper
            status={lead.status}
            onStatusChange={handleStatusChange}
            disabled={actionLoading}
          />
          {lead.lostReason && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Lost reason: {lead.lostReason}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {/* Customer info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Customer</Typography>
                <Button
                  size="small"
                  startIcon={<PersonIcon />}
                  onClick={() => navigate(`/customers/${lead.customerId}`)}
                >
                  View Profile
                </Button>
              </Box>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 120 }}>Name</TableCell>
                    <TableCell>{lead.customer.firstName} {lead.customer.lastName}</TableCell>
                  </TableRow>
                  {lead.customer.phone && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                      <TableCell>{lead.customer.phone}</TableCell>
                    </TableRow>
                  )}
                  {lead.customer.email && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell>{lead.customer.email}</TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Pref. Contact</TableCell>
                    <TableCell>{lead.customer.preferredContact}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Assignee */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assignee</Typography>
              {lead.assignee ? (
                <Typography>{lead.assignee.firstName} {lead.assignee.lastName}</Typography>
              ) : (
                <Typography color="text.secondary">Unassigned</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {/* Vehicles */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Vehicles of Interest</Typography>
                {!isSoldOrLost && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => { setPendingVehicleIds(lead.vehicles.map((v) => v.vehicleId)); setVehiclePickerOpen(true); }}
                  >
                    Add Vehicle
                  </Button>
                )}
              </Box>
              {lead.vehicles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No vehicles added yet.</Typography>
              ) : (
                lead.vehicles.map((lv) => (
                  <Box
                    key={lv.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {lv.vehicle.year} {lv.vehicle.make} {lv.vehicle.model}
                        {lv.vehicle.trim ? ` ${lv.vehicle.trim}` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Stock #{lv.vehicle.stockNumber}
                        </Typography>
                        <StatusBadge status={lv.vehicle.status} size="small" />
                        {lv.vehicle.internetPrice && (
                          <Typography variant="caption" color="text.secondary">
                            ${parseFloat(lv.vehicle.internetPrice).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {!isSoldOrLost && (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleRemoveVehicle(lv.vehicleId)}
                        disabled={vehicleActionLoading}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tasks */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Tasks ({tasks.filter((t) => t.status === TaskStatus.Pending).length} pending)</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setTaskDialogOpen(true)}
            >
              Add Task
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          {tasksLoading ? (
            <Skeleton variant="rounded" height={80} />
          ) : tasks.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No tasks yet.</Typography>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleTaskComplete}
                onCancel={handleTaskCancel}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card sx={{ mb: 3 }}>
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
            hasMore={activitiesHasMore}
            onLoadMore={() => {
              const next = activityPage + 1;
              setActivityPage(next);
              fetchActivities(next);
            }}
          />
        </CardContent>
      </Card>

      {/* Status History */}
      {lead.statusHistory.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Status History</Typography>
            <Table size="small">
              <TableBody>
                {lead.statusHistory.map((h, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <StatusBadge status={h.fromStatus} />
                      {' → '}
                      <StatusBadge status={h.toStatus} />
                    </TableCell>
                    {h.lostReason && <TableCell color="text.secondary">{h.lostReason}</TableCell>}
                    <TableCell>{h.changedBy}</TableCell>
                    <TableCell>{new Date(h.changedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {lead.notes && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Notes</Typography>
              <Button size="small" startIcon={<EditIcon />} onClick={() => navigate(`/leads/${id}/edit`)}>
                Edit
              </Button>
            </Box>
            <Typography variant="body2">{lead.notes}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reassign Lead</DialogTitle>
        <DialogContent>
          <TextField
            label="Salesperson"
            select
            fullWidth
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            sx={{ mt: 1 }}
          >
            {salespeople.map((sp) => (
              <MenuItem key={sp.id} value={sp.id}>
                {sp.firstName} {sp.lastName}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleReassign}
            disabled={!reassignTo || reassignLoading}
          >
            {reassignLoading ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vehicle picker dialog */}
      <Dialog open={vehiclePickerOpen} onClose={() => setVehiclePickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Vehicle of Interest</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <VehicleInterestPicker selectedIds={pendingVehicleIds} onChange={setPendingVehicleIds} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehiclePickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddVehicles}
            disabled={vehicleActionLoading}
          >
            {vehicleActionLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity log dialog */}
      {id && (
        <ActivityLogDialog
          open={activityDialogOpen}
          customerId={lead.customerId}
          leadId={id}
          onClose={() => setActivityDialogOpen(false)}
          onCreated={(a) => {
            setActivities((prev) => [a, ...prev]);
            setActivityDialogOpen(false);
          }}
        />
      )}

      {/* Task form dialog */}
      {id && (
        <TaskFormDialog
          open={taskDialogOpen}
          leadId={id}
          onClose={() => setTaskDialogOpen(false)}
          onCreated={(t) => {
            setTasks((prev) => [t, ...prev]);
            setTaskDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
}
