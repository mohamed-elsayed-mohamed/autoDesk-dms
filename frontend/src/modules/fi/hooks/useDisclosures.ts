import { useState, useEffect, useCallback } from 'react';
import { DisclosureStatus } from '../types/fi.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useDisclosures(dealId: string) {
  const [status, setStatus] = useState<DisclosureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${BASE_URL}/api/deals/${dealId}/disclosures`, { headers: authHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((json) => { if (!cancelled) setStatus(json); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealId, tick]);

  const confirmDisclosure = useCallback(
    async (disclosureRequirementId: string) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/disclosures/confirm`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ disclosureRequirementId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      refetch();
      return (await res.json()).data;
    },
    [dealId, refetch],
  );

  return { status, loading, error, refetch, confirmDisclosure };
}
