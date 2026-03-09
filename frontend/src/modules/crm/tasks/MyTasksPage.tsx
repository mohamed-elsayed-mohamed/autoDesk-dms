import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Skeleton,
  Paper,
  Chip,
} from '@mui/material';
import { getMyTasks, updateTaskStatus } from '../../../api/tasks';
import type { Task } from '../../../types';
import { TaskStatus } from '../../../types';
import TaskCard from './components/TaskCard';

interface MyTasksPageProps {
  teamView?: boolean;
}

export default function MyTasksPage({ teamView }: MyTasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    getMyTasks()
      .then((result) => {
        setTasks(result.data);
        setTodayCount(result.meta.todayCount);
        setOverdueCount(result.meta.overdueCount);
      })
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, []);

  const handleComplete = async (id: string) => {
    try {
      const updated = await updateTaskStatus(id, TaskStatus.Completed);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setError('Failed to complete task.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await updateTaskStatus(id, TaskStatus.Cancelled);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setError('Failed to cancel task.');
    }
  };

  const overdueTasks = tasks.filter((t) => t.isOverdue && t.status === TaskStatus.Pending);
  const todayTasks = tasks.filter((t) => !t.isOverdue && t.status === TaskStatus.Pending);
  const otherTasks = tasks.filter((t) => t.status !== TaskStatus.Pending);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4">{teamView ? 'Team Tasks' : 'My Tasks'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${todayCount} today`}
            size="small"
            color="primary"
            variant="outlined"
          />
          {overdueCount > 0 && (
            <Chip
              label={`${overdueCount} overdue`}
              size="small"
              sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600 }}
            />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} />
          ))}
        </Box>
      ) : tasks.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">No tasks assigned to you.</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You're all caught up!
          </Typography>
        </Paper>
      ) : (
        <>
          {overdueTasks.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="h6" sx={{ color: '#b71c1c' }}>Overdue</Typography>
                <Chip
                  label={overdueTasks.length}
                  size="small"
                  sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600 }}
                />
              </Box>
              <Box sx={{ bgcolor: '#fff5f5', borderRadius: 2, p: 2 }}>
                {overdueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                  />
                ))}
              </Box>
            </Box>
          )}

          {todayTasks.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography variant="h6">Today</Typography>
                <Chip label={todayTasks.length} size="small" color="primary" variant="outlined" />
              </Box>
              {todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                />
              ))}
            </Box>
          )}

          {otherTasks.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1.5, color: 'text.secondary' }}>
                Completed / Cancelled
              </Typography>
              {otherTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                />
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
