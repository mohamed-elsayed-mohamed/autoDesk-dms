import { useState, useEffect, useCallback } from 'react';
import { FIProduct, ProductCatalogItem } from '../types/fi.types';
import Decimal from 'decimal.js';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface AddProductData {
  productType: string;
  providerName: string;
  cost: number;
  sellingPrice: number;
  termMonths: number;
  deductible?: number;
  contractNumber?: string;
}

export function useFiProducts(dealId: string) {
  const [products, setProducts] = useState<FIProduct[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // Optimistic gross calculation
  const totalFiGross = products
    .filter((p) => p.status === 'Active' && !p.deletedAt)
    .reduce(
      (sum, p) => sum.plus(new Decimal(p.sellingPrice).minus(new Decimal(p.cost))),
      new Decimal(0),
    )
    .toString();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${BASE_URL}/api/deals/${dealId}/fi-products`, { headers: authHeaders() }),
      fetch(`${BASE_URL}/api/fi/product-catalog`, { headers: authHeaders() }),
    ])
      .then(async ([prodRes, catRes]) => {
        if (!prodRes.ok || !catRes.ok) throw new Error('Failed to load product data');
        const [prods, cat] = await Promise.all([prodRes.json(), catRes.json()]);
        if (!cancelled) {
          setProducts(prods.data ?? []);
          setCatalog((cat.data ?? []).filter((c: ProductCatalogItem) => c.isActive));
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dealId, tick]);

  const addProduct = useCallback(
    async (data: AddProductData) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/fi-products`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      refetch();
      return (await res.json()).data as FIProduct;
    },
    [dealId, refetch],
  );

  const editProduct = useCallback(
    async (productId: string, data: Partial<AddProductData>) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/fi-products/${productId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      refetch();
      return (await res.json()).data as FIProduct;
    },
    [dealId, refetch],
  );

  const removeProduct = useCallback(
    async (productId: string) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/fi-products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      refetch();
    },
    [dealId, refetch],
  );

  const recordChargeback = useCallback(
    async (productId: string, chargebackAmount: number, chargebackDate: string) => {
      const res = await fetch(`${BASE_URL}/api/deals/${dealId}/fi-products/${productId}/chargeback`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ chargebackAmount, chargebackDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Request failed: ${res.status}`);
      }
      refetch();
    },
    [dealId, refetch],
  );

  return { products, catalog, totalFiGross, loading, error, refetch, addProduct, editProduct, removeProduct, recordChargeback };
}
