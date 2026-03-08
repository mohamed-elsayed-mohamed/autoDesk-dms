import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

export default function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={48} sx={{ mb: 3 }} />
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="rounded" width={56} height={56} />
                <Box>
                  <Skeleton variant="text" width={100} />
                  <Skeleton variant="text" width={80} height={36} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card>
        <CardContent>
          <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" height={40} />
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}
