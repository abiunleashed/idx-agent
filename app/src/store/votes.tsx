import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Quick like / dislike on a car, open to anyone (owner or not).
 *
 * Kept separate from owner reviews on purpose: a tap from someone who has never
 * driven the car says "I like how it looks", not "it was worth the money".
 * Mixing the two would dilute the owner data the app is built on.
 *
 * Prototype only: in memory, no accounts, so one vote per car per app session.
 */
export type Vote = 'up' | 'down';

type CarVotes = { up: number; down: number; mine: Vote | null };

type VotesStore = {
  get: (carId: string) => CarVotes;
  /** Tapping the same vote again removes it; tapping the other one switches. */
  toggle: (carId: string, vote: Vote) => void;
};

const EMPTY: CarVotes = { up: 0, down: 0, mine: null };
const VotesContext = createContext<VotesStore | null>(null);

export function VotesProvider({ children }: { children: ReactNode }) {
  const [votes, setVotes] = useState<Record<string, CarVotes>>({});

  const toggle: VotesStore['toggle'] = (carId, vote) => {
    setVotes((prev) => {
      const cur = prev[carId] ?? EMPTY;
      const next = { ...cur };
      if (cur.mine) next[cur.mine] -= 1;
      next.mine = cur.mine === vote ? null : vote;
      if (next.mine) next[next.mine] += 1;
      return { ...prev, [carId]: next };
    });
  };

  return <VotesContext.Provider value={{ get: (id) => votes[id] ?? EMPTY, toggle }}>{children}</VotesContext.Provider>;
}

export function useCarVotes(carId: string) {
  const ctx = useContext(VotesContext);
  if (!ctx) throw new Error('useCarVotes must be used inside <VotesProvider>');
  return { ...ctx.get(carId), toggle: (v: Vote) => ctx.toggle(carId, v) };
}
