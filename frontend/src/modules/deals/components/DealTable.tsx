import {
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { Deal } from '../types/deal.types';
import StatusBadge from './StatusBadge';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface DealTableProps {
  deals: Deal[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick?: (deal: Deal) => void;
  loading?: boolean;
}

const COLUMNS = [
  'Deal #', 'Customer', 'Vehicle', 'Status',
  'Sale Price', 'Monthly Payment', 'Front-End Gross',
  'Sales Consultant', 'Created',
];

export default function DealTable({
  deals,
  total,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  loading = false,
}: DealTableProps) {
  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(pageSize)].map((_, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              deals.map((deal) => {
                const customerName = deal.customer
                  ? `${deal.customer.firstName} ${deal.customer.lastName}`
                  : '—';
                const vehicle = deal.vehicle
                  ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
                  : '—';
                const consultant = deal.createdBy
                  ? `${deal.createdBy.firstName} ${deal.createdBy.lastName}`
                  : '—';

                return (
                  <TableRow key={deal.id} hover sx={{ cursor: 'pointer' }} onClick={() => onRowClick?.(deal)}>
                    <TableCell sx={{ fontWeight: 600 }}>{deal.dealNumber}</TableCell>
                    <TableCell>{customerName}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{vehicle}</TableCell>
                    <TableCell>
                      <StatusBadge status={deal.status} />
                    </TableCell>
                    <TableCell>{fmt.format(parseFloat(deal.salePrice))}</TableCell>
                    <TableCell>
                      {parseFloat(deal.monthlyPayment) > 0
                        ? fmt.format(parseFloat(deal.monthlyPayment))
                        : '—'}
                    </TableCell>
                    <TableCell>{fmt.format(parseFloat(deal.frontEndGross))}</TableCell>
                    <TableCell>{consultant}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(deal.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={pageSize}
        rowsPerPageOptions={[pageSize]}
      />
    </Paper>
  );
}
