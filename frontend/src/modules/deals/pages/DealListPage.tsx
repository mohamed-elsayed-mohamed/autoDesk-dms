import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Typography } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useDeals } from '../hooks/useDeals';
import DealTable from '../components/DealTable';

const PAGE_SIZE = 25;

export default function DealListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { deals, total, loading, error, refetch } = useDeals({ page, pageSize: PAGE_SIZE });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Deals</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleIcon />}
          onClick={() => navigate('/deals/new')}
        >
          New Deal
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && deals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <ListAltIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No deals yet
          </Typography>
          <Button variant="contained" onClick={() => navigate('/deals/new')}>
            Create your first deal
          </Button>
        </Box>
      ) : (
        <DealTable
          deals={deals}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={loading}
        />
      )}
    </Box>
  );
}
