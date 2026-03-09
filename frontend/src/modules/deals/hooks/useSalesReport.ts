import { useCallback, useState } from 'react';
import { SalesReport, SalesReportQuery } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface UseSalesReportResult {
  report: SalesReport | null;
  loading: boolean;
  error: string | null;
  fetch: (query: SalesReportQuery) => Promise<void>;
  exportCsv: (query: SalesReportQuery) => Promise<void>;
  exporting: boolean;
}

export function useSalesReport(): UseSalesReportResult {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetch = useCallback(async (query: SalesReportQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate: query.startDate, endDate: query.endDate });
      const res = await globalThis.fetch(`${BASE_URL}/api/reports/sales?${params}`, {
        headers: { ...getToken() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }
      setReport(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  const exportCsv = useCallback(async (query: SalesReportQuery) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ startDate: query.startDate, endDate: query.endDate });
      const res = await globalThis.fetch(`${BASE_URL}/api/reports/sales/export?${params}`, {
        headers: { ...getToken() },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sales-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // surface error to console; the page can show a generic message
      console.error('CSV export error:', err);
    } finally {
      setExporting(false);
    }
  }, []);

  return { report, loading, error, fetch, exportCsv, exporting };
}
