import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { SEED_REVIEWS } from '@/data/seed-reviews';
import { photoUrl, PHOTO_BUCKET, supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import type { Review, ReviewPhoto } from '@/types';

/**
 * Owner reviews.
 * - Supabase configured: read from / written to the database, photos uploaded to storage.
 * - Not configured (demo mode): sample reviews kept in memory, lost on restart.
 */
export type NewReview = Omit<Review, 'id' | 'createdAt' | 'authorName' | 'userId'>;
export type SaveResult = { ok: true } | { ok: false; error: 'alreadyReviewed' | 'notSignedIn' | 'saveFailed'; detail?: string };

/** In demo mode there are no accounts; reviews written on this device belong to this id. */
export const LOCAL_USER = 'local-user';

type ReviewsStore = {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  /** The id that owns reviews written by the person using the app (null when signed out). */
  myUserId: string | null;
  reload: () => Promise<void>;
  addReview: (review: NewReview, authorName: string) => Promise<SaveResult>;
  updateReview: (id: string, review: NewReview) => Promise<SaveResult>;
  deleteReview: (id: string) => Promise<SaveResult>;
};

const ReviewsContext = createContext<ReviewsStore | null>(null);

type PhotoRow = { id: string; storage_path: string; caption: string | null; sentiment: ReviewPhoto['sentiment']; position: number };
type ReviewRow = {
  id: string;
  car_id: string;
  user_id: string;
  model_year: number;
  variant: string | null;
  price_paid_idr: number;
  condition: 'new' | 'used';
  city: string | null;
  months_owned: number;
  overall: number;
  build_quality: number;
  comfort: number;
  fuel: number;
  after_sales: number;
  worth_it: Review['worthIt'];
  would_buy_again: boolean;
  pros: string[];
  cons: string[];
  body: string;
  created_at: string;
  profiles: { display_name: string } | null;
  review_photos: PhotoRow[];
};

const SELECT = '*, profiles(display_name), review_photos(id, storage_path, caption, sentiment, position)';

function fromRow(r: ReviewRow): Review {
  return {
    id: r.id,
    carId: r.car_id,
    userId: r.user_id,
    authorName: r.profiles?.display_name ?? '—',
    modelYear: r.model_year,
    variant: r.variant ?? undefined,
    pricePaidIDR: Number(r.price_paid_idr),
    condition: r.condition,
    city: r.city ?? '—',
    monthsOwned: r.months_owned,
    overall: r.overall,
    aspects: { buildQuality: r.build_quality, comfort: r.comfort, fuel: r.fuel, afterSales: r.after_sales },
    worthIt: r.worth_it,
    wouldBuyAgain: r.would_buy_again,
    pros: r.pros,
    cons: r.cons,
    body: r.body,
    photos: [...r.review_photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        id: p.id,
        storagePath: p.storage_path,
        uri: photoUrl(p.storage_path),
        caption: p.caption ?? '',
        sentiment: p.sentiment,
      })),
    createdAt: r.created_at.slice(0, 10),
  };
}

function toRow(input: NewReview) {
  return {
    car_id: input.carId,
    model_year: input.modelYear,
    variant: input.variant ?? null,
    price_paid_idr: input.pricePaidIDR,
    condition: input.condition,
    city: input.city,
    months_owned: input.monthsOwned,
    overall: input.overall,
    build_quality: input.aspects.buildQuality,
    comfort: input.aspects.comfort,
    fuel: input.aspects.fuel,
    after_sales: input.aspects.afterSales,
    worth_it: input.worthIt,
    would_buy_again: input.wouldBuyAgain,
    pros: input.pros,
    cons: input.cons,
    body: input.body,
  };
}

async function uploadPhoto(userId: string, reviewId: string, index: number, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/${reviewId}/${index}-${Date.now()}.${ext}`;
  const { error } = await supabase!.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType });
  if (error) throw error;
  return path;
}

/**
 * Makes the review's photos on the server match `photos`:
 * removes the ones that were taken out, updates kept ones, uploads new ones.
 * Returns an error message if any photo failed (the review text is saved either way).
 */
async function syncPhotos(userId: string, reviewId: string, photos: ReviewPhoto[], previous: ReviewPhoto[]): Promise<string | undefined> {
  const db = supabase!;
  let problem: string | undefined;
  const keptIds = new Set(photos.filter((p) => p.id).map((p) => p.id));
  const removed = previous.filter((p) => p.id && !keptIds.has(p.id));
  if (removed.length) {
    const { error } = await db
      .from('review_photos')
      .delete()
      .in(
        'id',
        removed.map((p) => p.id!),
      );
    if (error) problem = error.message;
    else await db.storage.from(PHOTO_BUCKET).remove(removed.map((p) => p.storagePath!).filter(Boolean));
  }
  for (const [i, p] of photos.entries()) {
    try {
      if (p.id) {
        const { error } = await db
          .from('review_photos')
          .update({ caption: p.caption || null, sentiment: p.sentiment, position: i })
          .eq('id', p.id);
        if (error) throw error;
      } else {
        const path = await uploadPhoto(userId, reviewId, i, p.uri);
        const { error } = await db
          .from('review_photos')
          .insert({ review_id: reviewId, storage_path: path, caption: p.caption || null, sentiment: p.sentiment, position: i });
        if (error) throw error;
      }
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    }
  }
  return problem;
}

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const { userId, enabled: authEnabled } = useAuth();
  const myUserId = authEnabled ? userId : LOCAL_USER;
  const [reviews, setReviews] = useState<Review[]>(supabase ? [] : SEED_REVIEWS);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) return;
    // Fine for the beta (a few thousand reviews). Later: paginate and use the car_stats view.
    const { data, error: err } = await supabase
      .from('reviews')
      .select(SELECT)
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else {
      setError(null);
      setReviews((data as ReviewRow[]).map(fromRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addReview: ReviewsStore['addReview'] = async (input, authorName) => {
    if (!supabase) {
      const review: Review = {
        ...input,
        userId: LOCAL_USER,
        authorName,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setReviews((prev) => [review, ...prev]);
      return { ok: true };
    }
    if (!userId) return { ok: false, error: 'notSignedIn' };

    const { data, error: err } = await supabase
      .from('reviews')
      .insert({ ...toRow(input), user_id: userId })
      .select('id')
      .single();
    if (err) {
      // 23505 = unique violation: this user already reviewed this car.
      return { ok: false, error: err.code === '23505' ? 'alreadyReviewed' : 'saveFailed', detail: err.message };
    }
    const photoProblem = await syncPhotos(userId, data.id, input.photos, []);
    await reload();
    return photoProblem ? { ok: false, error: 'saveFailed', detail: photoProblem } : { ok: true };
  };

  const updateReview: ReviewsStore['updateReview'] = async (id, input) => {
    const previous = reviews.find((r) => r.id === id);
    if (!supabase) {
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)));
      return { ok: true };
    }
    if (!userId) return { ok: false, error: 'notSignedIn' };
    const { error: err } = await supabase.from('reviews').update(toRow(input)).eq('id', id).eq('user_id', userId);
    if (err) return { ok: false, error: 'saveFailed', detail: err.message };
    const photoProblem = await syncPhotos(userId, id, input.photos, previous?.photos ?? []);
    await reload();
    return photoProblem ? { ok: false, error: 'saveFailed', detail: photoProblem } : { ok: true };
  };

  const deleteReview: ReviewsStore['deleteReview'] = async (id) => {
    const previous = reviews.find((r) => r.id === id);
    if (!supabase) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
      return { ok: true };
    }
    if (!userId) return { ok: false, error: 'notSignedIn' };
    // Photo rows go with the review (on delete cascade); the image files must be removed separately.
    const paths = (previous?.photos ?? []).map((p) => p.storagePath).filter((p): p is string => !!p);
    const { error: err } = await supabase.from('reviews').delete().eq('id', id).eq('user_id', userId);
    if (err) return { ok: false, error: 'saveFailed', detail: err.message };
    if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    await reload();
    return { ok: true };
  };

  return (
    <ReviewsContext.Provider value={{ reviews, loading, error, myUserId, reload, addReview, updateReview, deleteReview }}>
      {children}
    </ReviewsContext.Provider>
  );
}

export function useReviews(): ReviewsStore {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used inside <ReviewsProvider>');
  return ctx;
}

export function useCarReviews(carId: string | undefined): Review[] {
  return useReviews().reviews.filter((r) => r.carId === carId);
}
