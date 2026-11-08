/**
 * Core domain model.
 *
 * A `Car` is a catalog entry (one model as sold in Indonesia).
 * A `Review` is one owner's experience with that car: what they paid,
 * whether it was worth it, and what they liked / disliked (with photos).
 */

export type BodyType = 'mpv' | 'suv' | 'lcgc' | 'hatchback' | 'sedan' | 'ev';

export type Car = {
  id: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  /** Years this generation has been sold, e.g. "2022–sekarang". */
  generation: string;
  /** Approximate new OTR (on-the-road) Jakarta price range, in rupiah. */
  priceMinIDR: number;
  priceMaxIDR: number;
  /** Card colour used until real photos exist. */
  tint: string;
};

export type WorthIt = 'yes' | 'unsure' | 'no';

export type Aspect = 'buildQuality' | 'comfort' | 'fuel' | 'afterSales';

export const ASPECTS: Aspect[] = ['buildQuality', 'comfort', 'fuel', 'afterSales'];

export type ReviewPhoto = {
  uri: string;
  caption: string;
  /** Did the owner attach this photo to show something good or something bad? */
  sentiment: 'positive' | 'negative';
  /** Set for photos already saved on the server (needed to edit or delete them). */
  id?: string;
  storagePath?: string;
};

export type Review = {
  id: string;
  carId: string;
  /** Account that wrote it; used to show edit/delete only to the author. */
  userId?: string;
  authorName: string;
  modelYear: number;
  variant?: string;
  pricePaidIDR: number;
  condition: 'new' | 'used';
  city: string;
  monthsOwned: number;
  /** 1–5 */
  overall: number;
  /** Each 1–5 */
  aspects: Record<Aspect, number>;
  worthIt: WorthIt;
  wouldBuyAgain: boolean;
  pros: string[];
  cons: string[];
  body: string;
  photos: ReviewPhoto[];
  createdAt: string;
  /** Sample content shipped with the prototype — never shown as a real review. */
  isDemo?: boolean;
};
