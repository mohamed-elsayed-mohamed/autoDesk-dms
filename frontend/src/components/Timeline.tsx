import { Box, Button, Skeleton, Typography } from '@mui/material';
import type { Activity } from '../types';
import ActivityTimelineItem from '../modules/crm/activities/components/ActivityTimelineItem';

interface TimelineProps {
  activities: Activity[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export default function Timeline({ activities, loading, hasMore, onLoadMore }: TimelineProps) {
  if (loading && activities.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} />
        ))}
      </Box>
    );
  }

  if (!loading && activities.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
        No activities yet. Log the first interaction.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {activities.map((a) => (
          <ActivityTimelineItem key={a.id} activity={a} />
        ))}
      </Box>
      {loading && activities.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Skeleton variant="rounded" height={72} />
        </Box>
      )}
      {hasMore && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="outlined" size="small" onClick={onLoadMore}>
            Load more
          </Button>
        </Box>
      )}
    </Box>
  );
}
