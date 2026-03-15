export interface Listing {
  id: string;
  source: string;
  source_id: string;
  url: string;
  title: string;
  price: number | null;
  surface: number | null;
  price_per_sqm: number | null;
  rooms: number | null;
  arrondissement: string | null;
  description: string | null;
  floor: number | null;
  has_elevator: boolean | null;
  dpe: string | null;
  charges: number | null;
  seller_type: string | null;
  photos: string[];
  published_at: string | null;
  opportunity_score: number;
  score_details: ScoreDetails;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoreDetails {
  price: number;
  location: number;
  size: number;
  condition: number;
  liquidity: number;
  total: number;
}

export interface Favorite {
  id: string;
  listing_id: string;
  note: string | null;
  created_at: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  max_price_per_sqm: number | null;
  min_score: number | null;
  min_surface: number | null;
  max_price: number | null;
  arrondissements: string[];
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
}

export type SortField = "opportunity_score" | "price_per_sqm" | "created_at" | "surface" | "price";

export interface Filters {
  minPriceSqm: number | null;
  maxPriceSqm: number | null;
  minSurface: number | null;
  maxSurface: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  rooms: number | null;
  arrondissements: string[];
  source: string | null;
}

export const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => {
  const num = i + 1;
  return {
    value: `750${num.toString().padStart(2, "0")}`,
    label: `Paris ${num}${num === 1 ? "er" : "e"}`,
  };
});

export const SOURCE_LABELS: Record<string, string> = {
  bienici: "BienIci",
  pap: "PAP",
  leboncoin: "LeBonCoin",
};
