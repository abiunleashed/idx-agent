import { supabase } from '@/lib/supabase';

export const REPORT_REASONS = ['fake', 'abusive', 'personal_data', 'spam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportResult = 'sent' | 'alreadyReported' | 'failed';

/** Any signed-in user can report a review once. Only moderators can read the reports. */
export async function reportReview(reviewId: string, reporterId: string, reason: ReportReason): Promise<ReportResult> {
  if (!supabase) return 'sent';
  const { error } = await supabase.from('review_reports').insert({ review_id: reviewId, reporter_id: reporterId, reason });
  if (!error) return 'sent';
  return error.code === '23505' ? 'alreadyReported' : 'failed';
}

export type PendingReview = {
  reviewId: string;
  carId: string;
  authorName: string;
  body: string;
  status: 'published' | 'hidden';
  reasons: Partial<Record<ReportReason, number>>;
  total: number;
  reportIds: string[];
};

type ReportRow = {
  id: string;
  reason: ReportReason;
  review_id: string;
  reviews: { car_id: string; body: string; status: 'published' | 'hidden'; profiles: { display_name: string } | null } | null;
};

/** Unresolved reports grouped by review, most-reported first. Moderators only (enforced by the database). */
export async function fetchPendingReports(): Promise<{ items: PendingReview[]; error?: string }> {
  if (!supabase) return { items: [] };
  const { data, error } = await supabase
    .from('review_reports')
    .select('id, reason, review_id, reviews(car_id, body, status, profiles(display_name))')
    .eq('resolved', false)
    .order('created_at');
  if (error) return { items: [], error: error.message };

  const byReview = new Map<string, PendingReview>();
  for (const r of data as unknown as ReportRow[]) {
    if (!r.reviews) continue;
    const item =
      byReview.get(r.review_id) ??
      ({
        reviewId: r.review_id,
        carId: r.reviews.car_id,
        authorName: r.reviews.profiles?.display_name ?? '—',
        body: r.reviews.body,
        status: r.reviews.status,
        reasons: {},
        total: 0,
        reportIds: [],
      } satisfies PendingReview);
    item.reasons[r.reason] = (item.reasons[r.reason] ?? 0) + 1;
    item.total += 1;
    item.reportIds.push(r.id);
    byReview.set(r.review_id, item);
  }
  return { items: [...byReview.values()].sort((a, b) => b.total - a.total) };
}

/** Hide the review from everyone (the author still sees it) and close its reports. */
export async function hideReview(item: PendingReview): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from('reviews').update({ status: 'hidden' }).eq('id', item.reviewId);
  if (error) return error.message;
  return resolveReports(item);
}

/** Close the reports and leave the review as it is. */
export async function resolveReports(item: PendingReview): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.from('review_reports').update({ resolved: true }).in('id', item.reportIds);
  return error?.message ?? null;
}
