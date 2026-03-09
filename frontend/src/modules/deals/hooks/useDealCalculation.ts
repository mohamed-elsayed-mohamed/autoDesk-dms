import { useState, useRef, useCallback } from 'react';
import { Deal, DealType } from '../types/deal.types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface DeskingInputs {
  salePrice?: number;
  downPayment?: number;
  rebates?: number;
  apr?: number;
  term?: number;
  taxRate?: number;
  dealType?: DealType;
}

interface UseDealCalculationReturn {
  calculating: boolean;
  error: string | null;
  conflictDeal: Deal | null;
  clearConflict: () => void;
}

export function useDealCalculation(
  dealId: string,
  currentUpdatedAt: string,
  onSuccess: (deal: Deal) => void,
): { update: (inputs: DeskingInputs) => void } & UseDealCalculationReturn {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictDeal, setConflictDeal] = useState<Deal | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInputsRef = useRef<DeskingInputs>({});

  const clearConflict = useCallback(() => setConflictDeal(null), []);

  const update = useCallback(
    (inputs: DeskingInputs) => {
      latestInputsRef.current = inputs;
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        setCalculating(true);
        setError(null);

        const token = localStorage.getItem('accessToken');
        try {
          const res = await fetch(`${BASE_URL}/api/deals/${dealId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ...latestInputsRef.current, updatedAt: currentUpdatedAt }),
          });

          if (res.status === 409) {
            const conflictBody: Deal = await res.json();
            setConflictDeal(conflictBody);
            return;
          }

          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          const updated: Deal = await res.json();
          onSuccess(updated);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Calculation failed');
        } finally {
          setCalculating(false);
        }
      }, 300);
    },
    [dealId, currentUpdatedAt, onSuccess],
  );

  return { update, calculating, error, conflictDeal, clearConflict };
}
