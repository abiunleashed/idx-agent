import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { CARS } from '@/data/cars';
import { supabase } from '@/lib/supabase';
import type { BodyType, Car } from '@/types';

/**
 * The car catalog. Comes from the `cars` table when Supabase is configured,
 * otherwise from the built-in list in data/cars.ts.
 */
type CatalogStore = {
  cars: Car[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  getCar: (id: string | undefined) => Car | undefined;
};

const CatalogContext = createContext<CatalogStore | null>(null);

type CarRow = {
  id: string;
  brand: string;
  model: string;
  body_type: BodyType;
  generation: string;
  price_min_idr: number;
  price_max_idr: number;
  tint: string;
};

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [cars, setCars] = useState<Car[]>(supabase ? [] : CARS);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cars')
      .select('id, brand, model, body_type, generation, price_min_idr, price_max_idr, tint')
      .order('brand');
    setError(err?.message ?? null);
    if (data)
      setCars(
        (data as CarRow[]).map((r) => ({
          id: r.id,
          brand: r.brand,
          model: r.model,
          bodyType: r.body_type,
          generation: r.generation,
          priceMinIDR: Number(r.price_min_idr),
          priceMaxIDR: Number(r.price_max_idr),
          tint: r.tint,
        })),
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const getCar = (id: string | undefined) => cars.find((c) => c.id === id);
  return <CatalogContext.Provider value={{ cars, loading, error, reload, getCar }}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogStore {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
