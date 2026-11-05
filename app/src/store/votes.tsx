import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Quick like / dislike on a car, open to anyone (owner or not).
 *
 * Kept separate from owner reviews on purpose: a tap from someone who has never
 * driven the car says "I like how it looks", not "it was worth the money".
 * Mixing the two would dilute the owner data the app is built on.
 *
 * With Supabase: one vote per account per car (enforced by the database).
 * Demo mode: in memory only.
 */
export type Vote = 'up' | 'down';

type CarVotes = { up: number; down: number; mine: Vote | null };
type VoteRow = { user_id: string; car_id: string; vote: Vote };

type VotesStore = {
  get: (carId: string) => CarVotes;
  /** Tapping the same vote again removes it; tapping the other one switches. */
  toggle: (carId: string, vote: Vote) => void;
};

const EMPTY: CarVotes = { up: 0, down: 0, mine: null };
const VotesContext = createContext<VotesStore | null>(null);

function applyToggle(cur: CarVotes, vote: Vote): CarVotes {
  const next = { ...cur };
  if (cur.mine) next[cur.mine] -= 1;
  next.mine = cur.mine === vote ? null : vote;
  if (next.mine) next[next.mine] += 1;
  return next;
}

export function VotesProvider({ children }: { children: ReactNode }) {
  const { userId, enabled: authEnabled } = useAuth();
  const [votes, setVotes] = useState<Record<string, CarVotes>>({});

  const load = useCallback(async () => {
    if (!supabase) return;
    // Fine for the beta. Later: read the counts from the car_stats view instead of every row.
    const { data, error } = await supabase.from('car_votes').select('user_id, car_id, vote');
    if (error) return;
    const next: Record<string, CarVotes> = {};
    for (const row of data as VoteRow[]) {
      const v = (next[row.car_id] ??= { ...EMPTY });
      v[row.vote] += 1;
      if (row.user_id === userId) v.mine = row.vote;
    }
    setVotes(next);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle: VotesStore['toggle'] = (carId, vote) => {
    if (authEnabled && !userId) {
      router.push('/sign-in');
      return;
    }
    const cur = votes[carId] ?? EMPTY;
    const next = applyToggle(cur, vote);
    setVotes((prev) => ({ ...prev, [carId]: next })); // update the screen immediately

    if (!supabase || !userId) return;
    const request = next.mine
      ? supabase.from('car_votes').upsert({ user_id: userId, car_id: carId, vote: next.mine })
      : supabase.from('car_votes').delete().match({ user_id: userId, car_id: carId });
    request.then(({ error }) => {
      if (error) setVotes((prev) => ({ ...prev, [carId]: cur })); // undo if the server refused
    });
  };

  return <VotesContext.Provider value={{ get: (id) => votes[id] ?? EMPTY, toggle }}>{children}</VotesContext.Provider>;
}

export function useCarVotes(carId: string) {
  const ctx = useContext(VotesContext);
  if (!ctx) throw new Error('useCarVotes must be used inside <VotesProvider>');
  return { ...ctx.get(carId), toggle: (v: Vote) => ctx.toggle(carId, v) };
}
