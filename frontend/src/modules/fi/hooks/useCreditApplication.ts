import { useState, useEffect, useCallback } from 'react';
import { CreditApplication } from '../types/fi.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface CreditApplicationFormData {
  annualIncome: number;
  employerName: string;
  employmentLengthMonths: number;
  housingType: 'Own' | 'Rent' | 'Other';
  monthlyHousingPayment: number;
  ssn: string;
  dateOfBirth: string;
}

export function useCreditApplication(dealId: string) {
  const [creditApp, setCreditApp] = useState<CreditApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${BASE_URL}/api/deals/${dealId}/credit-application`, {
      headers: authHeaders(),
    })
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setCreditApp(json?.data ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dealId, tick]);

  const saveDraft = useCallback(
    async (data: CreditApplicationFormData & { supersede?: boolean }) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/credit-application`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      const json = await res.json();
      setCreditApp(json.data);
      return json.data as CreditApplication;
    },
    [dealId],
  );

  const updateDraft = useCallback(
    async (data: Partial<Omit<CreditApplicationFormData, 'ssn'>>) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/credit-application`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      const json = await res.json();
      setCreditApp(json.data);
      return json.data as CreditApplication;
    },
    [dealId],
  );

  const submitApplication = useCallback(async () => {
    const res = await fetch(`${BASE_URL}/api/deals/${dealId}/credit-application/submit`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Request failed: ${res.status}`);
    }
    const json = await res.json();
    setCreditApp(json.data);
    return json.data as CreditApplication;
  }, [dealId]);

  const supersede = useCallback(
    async (data: CreditApplicationFormData) => {
      return saveDraft({ ...data, supersede: true });
    },
    [saveDraft],
  );

  return { creditApp, loading, error, refetch, saveDraft, updateDraft, submitApplication, supersede };
}
