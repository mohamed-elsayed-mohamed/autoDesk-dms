import { Box, Card, CardContent, Skeleton, Grid } from '@mui/material';

export default function VehicleDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={400} height={48} />
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" width={200} height={150} />
            ))}
          </Box>
        </CardContent>
      </Card>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={150} height={32} />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="text" height={32} />
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Skeleton variant="text" width={150} height={32} />
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="text" height={32} />
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
