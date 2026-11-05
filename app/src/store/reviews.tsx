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
export type NewReview = Omit<Review, 'id' | 'createdAt' | 'authorName'>;
export type AddResult = { ok: true } | { ok: false; error: 'alreadyReviewed' | 'notSignedIn' | 'saveFailed'; detail?: string };

type ReviewsStore = {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addReview: (review: NewReview, authorName: string) => Promise<AddResult>;
};

const ReviewsContext = createContext<ReviewsStore | null>(null);

type ReviewRow = {
  id: string;
  car_id: string;
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
  review_photos: { storage_path: string; caption: string | null; sentiment: ReviewPhoto['sentiment']; position: number }[];
};

const SELECT = '*, profiles(display_name), review_photos(storage_path, caption, sentiment, position)';

function fromRow(r: ReviewRow): Review {
  return {
    id: r.id,
    carId: r.car_id,
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
      .map((p) => ({ uri: photoUrl(p.storage_path), caption: p.caption ?? '', sentiment: p.sentiment })),
    createdAt: r.created_at.slice(0, 10),
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

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
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
      const review: Review = { ...input, authorName, id: `local-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
      setReviews((prev) => [review, ...prev]);
      return { ok: true };
    }
    if (!userId) return { ok: false, error: 'notSignedIn' };

    const { data, error: err } = await supabase
      .from('reviews')
      .insert({
        car_id: input.carId,
        user_id: userId,
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
      })
      .select('id')
      .single();

    if (err) {
      // 23505 = unique violation: this user already reviewed this car.
      return { ok: false, error: err.code === '23505' ? 'alreadyReviewed' : 'saveFailed', detail: err.message };
    }

    // The review text is saved even if a photo fails; the owner can add photos again later.
    let photoError: string | undefined;
    for (const [i, p] of input.photos.entries()) {
      try {
        const path = await uploadPhoto(userId, data.id, i, p.uri);
        const { error: rowErr } = await supabase
          .from('review_photos')
          .insert({ review_id: data.id, storage_path: path, caption: p.caption || null, sentiment: p.sentiment, position: i });
        if (rowErr) throw rowErr;
      } catch (e) {
        photoError = e instanceof Error ? e.message : String(e);
      }
    }

    await reload();
    return photoError ? { ok: false, error: 'saveFailed', detail: photoError } : { ok: true };
  };

  return <ReviewsContext.Provider value={{ reviews, loading, error, reload, addReview }}>{children}</ReviewsContext.Provider>;
}

export function useReviews(): ReviewsStore {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used inside <ReviewsProvider>');
  return ctx;
}

export function useCarReviews(carId: string | undefined): Review[] {
  return useReviews().reviews.filter((r) => r.carId === carId);
}
