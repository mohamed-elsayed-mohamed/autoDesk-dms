import { useState, useEffect, useCallback } from 'react';
import { Deal } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface UseDealReturn {
  deal: Deal | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeal(id: string): UseDealReturn {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const fetchDeal = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      try {
        const res = await fetch(`${BASE_URL}/api/deals/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json: Deal = await res.json();
        if (!cancelled) setDeal(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deal');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeal();
    return () => { cancelled = true; };
  }, [id, tick]);

  return { deal, loading, error, refetch };
}
