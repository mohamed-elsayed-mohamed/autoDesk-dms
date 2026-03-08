import { Table, TableBody, TableCell, TableRow, Skeleton, Paper, TableHead } from '@mui/material';

export default function VehicleListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Paper>
      <Table>
        <TableHead>
          <TableRow>
            {['', 'Stock #', 'Year', 'Make', 'Model', 'Mileage', 'Price', 'Status', 'Days'].map((_, i) => (
              <TableCell key={i}><Skeleton width={60} /></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {[...Array(rows)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton variant="rounded" width={48} height={36} /></TableCell>
              {[...Array(8)].map((_, j) => (
                <TableCell key={j}><Skeleton width={Math.random() * 40 + 40} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
