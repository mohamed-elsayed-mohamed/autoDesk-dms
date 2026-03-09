import { Box, Chip, Paper, Typography } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import StoreIcon from '@mui/icons-material/Store';
import NoteIcon from '@mui/icons-material/Note';
import type { Activity } from '../../../../types';
import { ActivityType, ActivityDirection } from '../../../../types';

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  [ActivityType.Call]: <PhoneIcon fontSize="small" />,
  [ActivityType.Email]: <EmailIcon fontSize="small" />,
  [ActivityType.Text]: <SmsIcon fontSize="small" />,
  [ActivityType.Visit]: <StoreIcon fontSize="small" />,
  [ActivityType.Note]: <NoteIcon fontSize="small" />,
};

const TYPE_COLORS: Record<ActivityType, string> = {
  [ActivityType.Call]: '#e3f2fd',
  [ActivityType.Email]: '#f3e5f5',
  [ActivityType.Text]: '#e8f5e9',
  [ActivityType.Visit]: '#fff3e0',
  [ActivityType.Note]: '#fafafa',
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ActivityTimelineItemProps {
  activity: Activity;
}

export default function ActivityTimelineItem({ activity }: ActivityTimelineItemProps) {
  const icon = TYPE_ICONS[activity.type] ?? <NoteIcon fontSize="small" />;
  const bgColor = TYPE_COLORS[activity.type] ?? '#fafafa';

  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'text.secondary',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {activity.type}
          </Typography>
          {activity.direction === ActivityDirection.Inbound && (
            <Chip label="Inbound" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 600 }} />
          )}
          {activity.direction === ActivityDirection.Outbound && (
            <Chip label="Outbound" size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 600 }} />
          )}
          {activity.lead && (
            <Chip
              label={`Lead: ${activity.lead.source}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        {activity.content && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
            {activity.content}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {activity.performer.firstName} {activity.performer.lastName}
          {' · '}
          {formatRelativeTime(activity.performedAt)}
        </Typography>
      </Box>
    </Paper>
  );
}
