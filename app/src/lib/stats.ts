import { ASPECTS, type Aspect, type Review } from '@/types';

export type CarSummary = {
  count: number;
  avgOverall: number;
  /** Share of owners who said "worth the money" (0–1). */
  worthYes: number;
  worthNo: number;
  /** Share of owners who would buy the same car again (0–1). */
  buyAgain: number;
  avgPaidIDR: number;
  minPaidIDR: number;
  maxPaidIDR: number;
  aspects: Record<Aspect, number>;
  topPros: { text: string; count: number }[];
  topCons: { text: string; count: number }[];
};

export function summarize(reviews: Review[]): CarSummary | null {
  const n = reviews.length;
  if (n === 0) return null;

  const avg = (f: (r: Review) => number) => reviews.reduce((s, r) => s + f(r), 0) / n;
  const share = (f: (r: Review) => boolean) => reviews.filter(f).length / n;
  const paid = reviews.map((r) => r.pricePaidIDR);

  const aspects = {} as Record<Aspect, number>;
  for (const a of ASPECTS) aspects[a] = avg((r) => r.aspects[a]);

  return {
    count: n,
    avgOverall: avg((r) => r.overall),
    worthYes: share((r) => r.worthIt === 'yes'),
    worthNo: share((r) => r.worthIt === 'no'),
    buyAgain: share((r) => r.wouldBuyAgain),
    avgPaidIDR: avg((r) => r.pricePaidIDR),
    minPaidIDR: Math.min(...paid),
    maxPaidIDR: Math.max(...paid),
    aspects,
    topPros: topPhrases(reviews.flatMap((r) => r.pros)),
    topCons: topPhrases(reviews.flatMap((r) => r.cons)),
  };
}

/**
 * Counts identical phrases (case-insensitive). Deliberately naive: grouping
 * "pintu ringan" with "pintunya terlalu ringan" needs NLP and is a later step.
 */
function topPhrases(phrases: string[], limit = 5) {
  const counts = new Map<string, { text: string; count: number }>();
  for (const p of phrases) {
    const key = p.trim().toLowerCase();
    if (!key) continue;
    const entry = counts.get(key) ?? { text: p.trim(), count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
