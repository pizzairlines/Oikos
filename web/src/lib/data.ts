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
    .select("id,source,source_id,url,title,price,surface,price_per_sqm,rooms,arrondissement,dpe,seller_type,opportunity_score,score_details,created_at,photos", { count: "exact" })
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
    .select("*")
    .in("id", Array.from(ids))
    .order("opportunity_score", { ascending: false });

  return { listings: data || [], ids };
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
