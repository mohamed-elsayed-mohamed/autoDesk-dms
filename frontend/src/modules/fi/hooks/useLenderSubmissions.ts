import { useState, useEffect, useCallback } from 'react';
import { LenderSubmission, SelectedLenderDecision, Lender } from '../types/fi.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useLenderSubmissions(dealId: string) {
  const [submissions, setSubmissions] = useState<LenderSubmission[]>([]);
  const [activeLenders, setActiveLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${BASE_URL}/api/deals/${dealId}/lender-submissions`, { headers: authHeaders() }),
      fetch(`${BASE_URL}/api/fi/lenders`, { headers: authHeaders() }),
    ])
      .then(async ([subsRes, lendersRes]) => {
        if (!subsRes.ok || !lendersRes.ok) throw new Error('Failed to load lender data');
        const [subs, lenders] = await Promise.all([subsRes.json(), lendersRes.json()]);
        if (!cancelled) {
          setSubmissions(subs.data ?? []);
          setActiveLenders((lenders.data ?? []).filter((l: Lender) => l.isActive));
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealId, tick]);

  const submitToLenders = useCallback(
    async (lenderIds: string[]): Promise<{ data: LenderSubmission[]; warnings: string[] }> => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/lender-submissions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lenderIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      const json = await res.json();
      refetch();
      return json;
    },
    [dealId, refetch],
  );

  const selectDecision = useCallback(
    async (params: {
      lenderSubmissionId: string;
      rateMarkup: number;
      selectedTerm: number;
    }): Promise<{ data: SelectedLenderDecision; warnings: string[] }> => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/lender-submissions/select`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      const json = await res.json();
      refetch();
      return json;
    },
    [dealId, refetch],
  );

  return { submissions, activeLenders, loading, error, refetch, submitToLenders, selectDecision };
}
