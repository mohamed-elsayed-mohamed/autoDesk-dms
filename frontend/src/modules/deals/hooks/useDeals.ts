import { useState, useEffect, useCallback } from 'react';
import { Deal, DealStatus } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

interface UseDealsOptions {
  status?: DealStatus;
  page?: number;
  pageSize?: number;
}

interface UseDealsReturn {
  deals: Deal[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeals(options?: UseDealsOptions): UseDealsReturn {
  const { status, page = 0, pageSize = 25 } = options ?? {};
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchDeals = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('pageSize', String(pageSize));
      if (status) params.set('status', status);

      const token = localStorage.getItem('accessToken');
      try {
        const res = await fetch(`${BASE_URL}/api/deals?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setDeals(json.data ?? []);
          setTotal(json.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load deals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeals();
    return () => { cancelled = true; };
  }, [status, page, pageSize, tick]);

  return { deals, total, loading, error, refetch };
}
