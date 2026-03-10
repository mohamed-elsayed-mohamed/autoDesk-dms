import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DocumentType, GeneratedDocument } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDocType(type: DocumentType): string {
  return type === DocumentType.BuyersOrder ? "Buyer's Order" : 'Bill of Sale';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface DocumentsListProps {
  dealId: string;
  documents: GeneratedDocument[];
  onGenerated: () => void;
  /** Roles allowed to generate docs: SalesConsultant, FniManager */
  canGenerate: boolean;
}

export default function DocumentsList({
  dealId,
  documents,
  onGenerated,
  canGenerate,
}: DocumentsListProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>(DocumentType.BuyersOrder);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const sorted = [...documents].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getToken() },
        body: JSON.stringify({ documentType: selectedType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Failed to generate document (${res.status})`);
      }
      onGenerated();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Box>
      {/* Generate action */}
      {canGenerate && (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="doc-type-label">Document Type</InputLabel>
            <Select
              labelId="doc-type-label"
              value={selectedType}
              label="Document Type"
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              disabled={generating}
            >
              <MenuItem value={DocumentType.BuyersOrder}>Buyer's Order</MenuItem>
              <MenuItem value={DocumentType.BillOfSale}>Bill of Sale</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={handleGenerate}
            disabled={generating}
            startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </Stack>
      )}

      {genError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGenError(null)}>
          {genError}
        </Alert>
      )}

      <Divider sx={{ mb: 1.5 }} />

      {sorted.length === 0 ? (
        <Box
          sx={{
            p: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No documents generated yet.
          </Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell align="right">Download</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((doc) => (
              <TableRow key={doc.id} hover>
                <TableCell>{formatDocType(doc.documentType)}</TableCell>
                <TableCell>{formatDate(doc.generatedAt)}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
