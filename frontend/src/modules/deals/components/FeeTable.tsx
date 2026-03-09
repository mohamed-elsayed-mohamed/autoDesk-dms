import { useState } from 'react';
import {
  Checkbox,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { DealFee, CreateDealFeeRequest, UpdateDealFeeRequest } from '../types/deal.types';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface FeeTableProps {
  fees: DealFee[];
  dealId: string;
  onAdd: (fee: CreateDealFeeRequest) => Promise<void>;
  onUpdate: (feeId: string, fee: UpdateDealFeeRequest) => Promise<void>;
  onRemove: (feeId: string) => Promise<void>;
  readOnly?: boolean;
}

export default function FeeTable({ fees, onAdd, onRemove, readOnly = false }: FeeTableProps) {
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTaxable, setNewTaxable] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount)) return;
    setAdding(true);
    try {
      await onAdd({ name: newName.trim(), amount, taxable: newTaxable });
      setNewName('');
      setNewAmount('');
      setNewTaxable(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Fee Name</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
            <TableCell sx={{ fontWeight: 600 }} align="center">Taxable</TableCell>
            {!readOnly && <TableCell sx={{ width: 48 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {fees.length === 0 && readOnly && (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                  No fees added.
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {fees.map((fee) => (
            <TableRow key={fee.id}>
              <TableCell>{fee.name}</TableCell>
              <TableCell align="right">{fmt.format(parseFloat(fee.amount))}</TableCell>
              <TableCell align="center">
                <Checkbox checked={fee.taxable} disabled size="small" />
              </TableCell>
              {!readOnly && (
                <TableCell align="center" padding="none">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onRemove(fee.id)}
                    aria-label="Delete fee"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {!readOnly && (
            <TableRow>
              <TableCell>
                <TextField
                  size="small"
                  placeholder="Fee name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  fullWidth
                  variant="standard"
                />
              </TableCell>
              <TableCell align="right">
                <TextField
                  size="small"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  variant="standard"
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell align="center">
                <Checkbox
                  checked={newTaxable}
                  onChange={(e) => setNewTaxable(e.target.checked)}
                  size="small"
                />
              </TableCell>
              <TableCell align="center" padding="none">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleAdd}
                  disabled={adding || !newName.trim() || !newAmount}
                  aria-label="Add fee"
                >
                  <AddCircleIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
