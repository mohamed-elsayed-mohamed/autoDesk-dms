import { useState, useCallback } from 'react';
import { FiPerformanceReport } from '../types/fi.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useFiPerformanceReport() {
  const [report, setReport] = useState<FiPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReport = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/api/fi/performance-report?from=${from}&to=${to}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json = await res.json();
      setReport(json.data);
      return json.data as FiPerformanceReport;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load report';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportCsv = useCallback(async (from: string, to: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(
      `${BASE_URL}/api/fi/performance-report/export?from=${from}&to=${to}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error(`Export failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fi-performance-${from}-to-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { report, loading, error, getReport, exportCsv };
}
