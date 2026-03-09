import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import DescriptionIcon from '@mui/icons-material/Description';
import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import type { Task } from '../../../../types';
import { TaskStatus, TaskType } from '../../../../types';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  [TaskType.Call]: <PhoneIcon fontSize="small" />,
  [TaskType.Email]: <EmailIcon fontSize="small" />,
  [TaskType.Text]: <SmsIcon fontSize="small" />,
  [TaskType.Quote]: <DescriptionIcon fontSize="small" />,
  [TaskType.FollowUp]: <FollowTheSignsIcon fontSize="small" />,
  [TaskType.Other]: <DescriptionIcon fontSize="small" />,
};

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function TaskCard({ task, onComplete, onCancel }: TaskCardProps) {
  const isPending = task.status === TaskStatus.Pending;
  const icon = task.type ? (TYPE_ICONS[task.type] ?? <DescriptionIcon fontSize="small" />) : <DescriptionIcon fontSize="small" />;

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flex: 1 }}>
            <Box sx={{ color: 'text.secondary', mt: 0.25 }}>{icon}</Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                {task.type && (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{task.type}</Typography>
                )}
                {task.isOverdue && isPending && (
                  <Chip
                    label="Overdue"
                    size="small"
                    sx={{ bgcolor: '#ffebee', color: '#b71c1c', fontWeight: 600 }}
                  />
                )}
                {!isPending && (
                  <Chip
                    label={task.status}
                    size="small"
                    sx={{
                      bgcolor: task.status === TaskStatus.Completed ? '#e8f5e9' : '#f5f5f5',
                      color: task.status === TaskStatus.Completed ? '#2e7d32' : '#616161',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
              {task.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {task.description}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Due: {new Date(task.dueAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {task.lead.customer.firstName} {task.lead.customer.lastName}
                {' · '}
                Lead: {task.lead.source} / {task.lead.status}
              </Typography>
            </Box>
          </Box>
          {isPending && (
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => onComplete(task.id)}
              >
                Complete
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => onCancel(task.id)}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
