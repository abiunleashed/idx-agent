import { createContext, useContext, useState, type ReactNode } from 'react';

import { SEED_REVIEWS } from '@/data/seed-reviews';
import type { Review } from '@/types';

/**
 * In-memory review store. Prototype only: reviews disappear when the app restarts.
 * Next step is replacing this with a backend (accounts, database, photo storage)
 * while keeping the same `useReviews()` interface for the screens.
 */
type ReviewsStore = {
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Review;
};

const ReviewsContext = createContext<ReviewsStore | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);

  const addReview: ReviewsStore['addReview'] = (input) => {
    const review: Review = {
      ...input,
      id: `local-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setReviews((prev) => [review, ...prev]);
    return review;
  };

  return <ReviewsContext.Provider value={{ reviews, addReview }}>{children}</ReviewsContext.Provider>;
}

export function useReviews(): ReviewsStore {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error('useReviews must be used inside <ReviewsProvider>');
  return ctx;
}

export function useCarReviews(carId: string | undefined): Review[] {
  return useReviews().reviews.filter((r) => r.carId === carId);
}
