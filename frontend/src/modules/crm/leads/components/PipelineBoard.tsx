import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import { LeadStatus } from '../../../../types';
import type { LeadListItem } from '../../../../types';

const PIPELINE_COLUMNS: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.AppointmentSet,
  LeadStatus.Showed,
  LeadStatus.Negotiating,
  LeadStatus.Sold,
  LeadStatus.Lost,
];

const COLUMN_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'New',
  [LeadStatus.Contacted]: 'Contacted',
  [LeadStatus.AppointmentSet]: 'Appt Set',
  [LeadStatus.Showed]: 'Showed',
  [LeadStatus.Negotiating]: 'Negotiating',
  [LeadStatus.Sold]: 'Sold',
  [LeadStatus.Lost]: 'Lost',
};

const COLUMN_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.New]: '#e3f2fd',
  [LeadStatus.Contacted]: '#e8f5e9',
  [LeadStatus.AppointmentSet]: '#f3e5f5',
  [LeadStatus.Showed]: '#fff8e1',
  [LeadStatus.Negotiating]: '#fff3e0',
  [LeadStatus.Sold]: '#e8f5e9',
  [LeadStatus.Lost]: '#ffebee',
};


interface PipelineBoardProps {
  leads: LeadListItem[];
}

export default function PipelineBoard({ leads }: PipelineBoardProps) {
  const navigate = useNavigate();

  const byStatus = (status: LeadStatus) => leads.filter((l) => l.status === status);

  return (
    <Box sx={{ overflowX: 'auto', pb: 2 }}>
      <Grid container spacing={2} sx={{ flexWrap: 'nowrap', minWidth: 900 }}>
        {PIPELINE_COLUMNS.map((status) => {
          const columnLeads = byStatus(status);
          return (
            <Grid item key={status} sx={{ minWidth: 200, flex: 1 }}>
              <Paper
                sx={{
                  bgcolor: COLUMN_COLORS[status],
                  p: 1.5,
                  minHeight: 200,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {COLUMN_LABELS[status]}
                  </Typography>
                  <Chip label={columnLeads.length} size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {columnLeads.map((lead) => (
                    <Paper
                      key={lead.id}
                      elevation={2}
                      sx={{ p: 1.5, cursor: 'pointer', '&:hover': { elevation: 4, transform: 'translateY(-1px)' } }}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {lead.customer.firstName} {lead.customer.lastName}
                      </Typography>
                      {lead.customer.phone && (
                        <Typography variant="caption" color="text.secondary">
                          {lead.customer.phone}
                        </Typography>
                      )}
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={lead.source}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      {lead.assignee && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {lead.assignee.firstName} {lead.assignee.lastName}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </Typography>
                    </Paper>
                  ))}
                  {columnLeads.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block', py: 2 }}>
                      No leads
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
