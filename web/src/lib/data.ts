import { supabase } from "./supabase";
import { Listing, AlertConfig, Filters, SortField } from "./types";
import { MOCK_LISTINGS, MOCK_ALERT_CONFIGS } from "./mock-data";

const isMock =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder");

// ── In-memory state for mock mode ──

let mockFavoriteIds = new Set<string>();
let mockAlerts = [...MOCK_ALERT_CONFIGS];
let mockAlertCounter = 0;

// ── Lightweight listing type for cards (no description, limited photos) ──

// Select only the fields needed for listing cards — excludes description,
// floor, has_elevator, charges, published_at, updated_at, is_active
const CARD_FIELDS = "id,source,source_id,url,title,price,surface,price_per_sqm,rooms,arrondissement,dpe,seller_type,opportunity_score,score_details,created_at,photos";

// ── Listings ──

export async function fetchListings(
  filters: Filters,
  sortBy: SortField,
  page: number,
  pageSize: number,
): Promise<{ data: Listing[]; count: number }> {
  if (isMock) {
    let items = MOCK_LISTINGS.filter((l) => l.is_active);

    if (filters.minPriceSqm)
      items = items.filter((l) => (l.price_per_sqm ?? 0) >= filters.minPriceSqm!);
    if (filters.maxPriceSqm)
      items = items.filter((l) => (l.price_per_sqm ?? Infinity) <= filters.maxPriceSqm!);
    if (filters.minSurface)
      items = items.filter((l) => (l.surface ?? 0) >= filters.minSurface!);
    if (filters.maxSurface)
      items = items.filter((l) => (l.surface ?? Infinity) <= filters.maxSurface!);
    if (filters.minPrice)
      items = items.filter((l) => (l.price ?? 0) >= filters.minPrice!);
    if (filters.maxPrice)
      items = items.filter((l) => (l.price ?? Infinity) <= filters.maxPrice!);
    if (filters.rooms) {
      items = filters.rooms >= 4
        ? items.filter((l) => (l.rooms ?? 0) >= 4)
        : items.filter((l) => l.rooms === filters.rooms);
    }
    if (filters.arrondissements.length > 0)
      items = items.filter((l) => l.arrondissement && filters.arrondissements.includes(l.arrondissement));
    if (filters.source)
      items = items.filter((l) => l.source === filters.source);

    const ascending = sortBy === "price_per_sqm" || sortBy === "price";
    items.sort((a, b) => {
      const va = (a[sortBy as keyof Listing] as number) ?? 0;
      const vb = (b[sortBy as keyof Listing] as number) ?? 0;
      return ascending ? va - vb : vb - va;
    });

    const count = items.length;
    const from = page * pageSize;
    return { data: items.slice(from, from + pageSize), count };
  }

  let query = supabase
    .from("listings")
    .select(CARD_FIELDS, { count: "planned" })
    .eq("is_active", true);

  if (filters.minPriceSqm) query = query.gte("price_per_sqm", filters.minPriceSqm);
  if (filters.maxPriceSqm) query = query.lte("price_per_sqm", filters.maxPriceSqm);
  if (filters.minSurface) query = query.gte("surface", filters.minSurface);
  if (filters.maxSurface) query = query.lte("surface", filters.maxSurface);
  if (filters.minPrice) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  if (filters.rooms) {
    query = filters.rooms >= 4 ? query.gte("rooms", 4) : query.eq("rooms", filters.rooms);
  }
  if (filters.arrondissements.length > 0) query = query.in("arrondissement", filters.arrondissements);
  if (filters.source) query = query.eq("source", filters.source);

  const ascending = sortBy === "price_per_sqm" || sortBy === "price";
  query = query.order(sortBy, { ascending });

  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return { data: [], count: 0 };
  return { data: (data as unknown as Listing[]) || [], count: count || 0 };
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (isMock) {
    return MOCK_LISTINGS.find((l) => l.id === id) || null;
  }
  const { data } = await supabase.from("listings").select("*").eq("id", id).single();
  return data;
}

// ── Favorites ──

export async function fetchFavoriteIds(): Promise<Set<string>> {
  if (isMock) return new Set(mockFavoriteIds);
  const { data } = await supabase.from("favorites").select("listing_id");
  return new Set((data || []).map((f) => f.listing_id));
}

export async function fetchFavoriteListings(): Promise<{ listings: Listing[]; ids: Set<string> }> {
  if (isMock) {
    const ids = new Set(mockFavoriteIds);
    const listings = MOCK_LISTINGS.filter((l) => ids.has(l.id))
      .sort((a, b) => b.opportunity_score - a.opportunity_score);
    return { listings, ids };
  }

  const { data: favs } = await supabase
    .from("favorites")
    .select("listing_id")
    .order("created_at", { ascending: false });

  if (!favs || favs.length === 0) return { listings: [], ids: new Set() };

  const ids = new Set(favs.map((f) => f.listing_id));
  const { data } = await supabase
    .from("listings")
    .select(CARD_FIELDS)
    .in("id", Array.from(ids))
    .order("opportunity_score", { ascending: false });

  return { listings: (data as unknown as Listing[]) || [], ids };
}

export async function toggleFavorite(listingId: string, currentlyFavorite: boolean): Promise<boolean> {
  if (isMock) {
    if (currentlyFavorite) {
      mockFavoriteIds.delete(listingId);
      return false;
    } else {
      mockFavoriteIds.add(listingId);
      return true;
    }
  }

  if (currentlyFavorite) {
    await supabase.from("favorites").delete().eq("listing_id", listingId);
    return false;
  } else {
    await supabase.from("favorites").insert({ listing_id: listingId });
    return true;
  }
}

// ── Alert configs ──

export async function fetchAlertConfigs(): Promise<AlertConfig[]> {
  if (isMock) return [...mockAlerts];
  const { data } = await supabase
    .from("alert_configs")
    .select("*")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function saveAlertConfig(alert: Partial<AlertConfig>): Promise<void> {
  const payload = {
    name: alert.name || "Nouvelle alerte",
    max_price_per_sqm: alert.max_price_per_sqm || null,
    min_score: alert.min_score || null,
    min_surface: alert.min_surface || null,
    max_price: alert.max_price || null,
    arrondissements: alert.arrondissements || [],
    phone_number: alert.phone_number || null,
    is_active: alert.is_active ?? true,
  };

  if (isMock) {
    if (alert.id) {
      mockAlerts = mockAlerts.map((a) =>
        a.id === alert.id ? { ...a, ...payload } : a,
      );
    } else {
      mockAlerts.unshift({
        ...payload,
        id: `mock-alert-${++mockAlertCounter}`,
        created_at: new Date().toISOString(),
      });
    }
    return;
  }

  if (alert.id) {
    await supabase.from("alert_configs").update(payload).eq("id", alert.id);
  } else {
    await supabase.from("alert_configs").insert(payload);
  }
}

export async function deleteAlertConfig(id: string): Promise<void> {
  if (isMock) {
    mockAlerts = mockAlerts.filter((a) => a.id !== id);
    return;
  }
  await supabase.from("alert_configs").delete().eq("id", id);
}

export async function toggleAlertActive(alert: AlertConfig): Promise<void> {
  if (isMock) {
    mockAlerts = mockAlerts.map((a) =>
      a.id === alert.id ? { ...a, is_active: !a.is_active } : a,
    );
    return;
  }
  await supabase.from("alert_configs").update({ is_active: !alert.is_active }).eq("id", alert.id);
}

// ── Stats ──

export interface StatsData {
  totalListings: number;
  avgPriceSqm: number;
  medianPriceSqm: number;
  avgScore: number;
  byArrondissement: { arr: string; count: number; avgPriceSqm: number; avgScore: number }[];
  priceDistribution: { range: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  topOpportunities: { id: string; title: string; arrondissement: string | null; price_per_sqm: number | null; surface: number | null; opportunity_score: number }[];
}

// Only fetch the numeric fields needed for stats — NO photos, NO description, NO score_details
const STATS_FIELDS = "id,title,price,surface,price_per_sqm,rooms,arrondissement,opportunity_score";

export async function fetchStats(): Promise<StatsData> {
  if (isMock) {
    return buildStats(MOCK_LISTINGS.filter((l) => l.is_active));
  }

  const { data } = await supabase
    .from("listings")
    .select(STATS_FIELDS)
    .eq("is_active", true);

  return buildStats((data as unknown as StatsListing[]) || []);
}

// Lightweight type for stats computation
interface StatsListing {
  id: string;
  title: string;
  price: number | null;
  surface: number | null;
  price_per_sqm: number | null;
  rooms: number | null;
  arrondissement: string | null;
  opportunity_score: number;
}

function buildStats(listings: StatsListing[]): StatsData {
  const valid = listings.filter((l) => l.price_per_sqm && l.price_per_sqm > 0);

  // Averages
  const totalListings = valid.length;
  const avgPriceSqm = totalListings > 0
    ? Math.round(valid.reduce((s, l) => s + (l.price_per_sqm || 0), 0) / totalListings)
    : 0;
  const avgScore = totalListings > 0
    ? Math.round(valid.reduce((s, l) => s + l.opportunity_score, 0) / totalListings)
    : 0;

  // Median
  const sorted = [...valid].sort((a, b) => (a.price_per_sqm || 0) - (b.price_per_sqm || 0));
  const medianPriceSqm = totalListings > 0
    ? Math.round(sorted[Math.floor(totalListings / 2)].price_per_sqm || 0)
    : 0;

  // By arrondissement
  const arrMap = new Map<string, { count: number; totalPrice: number; totalScore: number }>();
  for (const l of valid) {
    if (!l.arrondissement) continue;
    const existing = arrMap.get(l.arrondissement) || { count: 0, totalPrice: 0, totalScore: 0 };
    existing.count++;
    existing.totalPrice += l.price_per_sqm || 0;
    existing.totalScore += l.opportunity_score;
    arrMap.set(l.arrondissement, existing);
  }
  const byArrondissement = Array.from(arrMap.entries())
    .map(([arr, d]) => ({
      arr,
      count: d.count,
      avgPriceSqm: Math.round(d.totalPrice / d.count),
      avgScore: Math.round(d.totalScore / d.count),
    }))
    .sort((a, b) => a.arr.localeCompare(b.arr));

  // Price distribution (€/m²)
  const priceRanges = [
    { label: "< 6k", min: 0, max: 6000 },
    { label: "6-7k", min: 6000, max: 7000 },
    { label: "7-8k", min: 7000, max: 8000 },
    { label: "8-9k", min: 8000, max: 9000 },
    { label: "9-10k", min: 9000, max: 10000 },
    { label: "10-12k", min: 10000, max: 12000 },
    { label: "> 12k", min: 12000, max: Infinity },
  ];
  const priceDistribution = priceRanges.map((r) => ({
    range: r.label,
    count: valid.filter((l) => (l.price_per_sqm || 0) >= r.min && (l.price_per_sqm || 0) < r.max).length,
  }));

  // Score distribution
  const scoreRanges = [
    { label: "0-20", min: 0, max: 20 },
    { label: "20-40", min: 20, max: 40 },
    { label: "40-60", min: 40, max: 60 },
    { label: "60-80", min: 60, max: 80 },
    { label: "80-100", min: 80, max: 101 },
  ];
  const scoreDistribution = scoreRanges.map((r) => ({
    range: r.label,
    count: valid.filter((l) => l.opportunity_score >= r.min && l.opportunity_score < r.max).length,
  }));

  // Top 5
  const topOpportunities = [...valid]
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      title: l.title,
      arrondissement: l.arrondissement,
      price_per_sqm: l.price_per_sqm,
      surface: l.surface,
      opportunity_score: l.opportunity_score,
    }));

  return {
    totalListings,
    avgPriceSqm,
    medianPriceSqm,
    avgScore,
    byArrondissement,
    priceDistribution,
    scoreDistribution,
    topOpportunities,
  };
}

// ── Map data ──

export interface MapListing {
  id: string;
  title: string;
  price: number | null;
  price_per_sqm: number | null;
  surface: number | null;
  rooms: number | null;
  arrondissement: string | null;
  opportunity_score: number;
  latitude: number;
  longitude: number;
}

export async function fetchMapListings(): Promise<MapListing[]> {
  if (isMock) {
    return []; // Mock data has no coordinates
  }

  const { data } = await supabase
    .from("listings")
    .select("id,title,price,price_per_sqm,surface,rooms,arrondissement,opportunity_score,latitude,longitude")
    .eq("is_active", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  return (data as unknown as MapListing[]) || [];
}

// ── Price history ──

export interface PricePoint {
  price: number;
  price_per_sqm: number | null;
  recorded_at: string;
}

export async function fetchPriceHistory(listingId: string): Promise<PricePoint[]> {
  if (isMock) return [];

  const { data } = await supabase
    .from("price_history")
    .select("price,price_per_sqm,recorded_at")
    .eq("listing_id", listingId)
    .order("recorded_at", { ascending: true });

  return (data as PricePoint[]) || [];
}
