"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Listing, Filters, SortField } from "@/lib/types";
import { fetchListings } from "@/lib/data";

const PAGE_SIZE = 20;

export const DEFAULT_FILTERS: Filters = {
  minPriceSqm: null,
  maxPriceSqm: null,
  minSurface: null,
  maxSurface: null,
  minPrice: null,
  maxPrice: null,
  rooms: null,
  arrondissements: [],
  source: null,
};

interface UseListingsReturn {
  listings: Listing[];
  loading: boolean;
  error: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  filters: Filters;
  sortBy: SortField;
  setFilters: (filters: Filters) => void;
  setSortBy: (sort: SortField) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => void;
}

// Simple in-memory cache to avoid refetching on navigation
const cache = new Map<string, { data: Listing[]; count: number; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCacheKey(filters: Filters, sortBy: SortField, page: number) {
  return JSON.stringify({ filters, sortBy, page });
}

// Parse filters from URL search params
function parseFiltersFromParams(params: URLSearchParams): { filters: Filters; sortBy: SortField; page: number } {
  const filters: Filters = {
    minPriceSqm: params.get("minPriceSqm") ? Number(params.get("minPriceSqm")) : null,
    maxPriceSqm: params.get("maxPriceSqm") ? Number(params.get("maxPriceSqm")) : null,
    minSurface: params.get("minSurface") ? Number(params.get("minSurface")) : null,
    maxSurface: params.get("maxSurface") ? Number(params.get("maxSurface")) : null,
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : null,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : null,
    rooms: params.get("rooms") ? Number(params.get("rooms")) : null,
    arrondissements: params.get("arr") ? params.get("arr")!.split(",") : [],
    source: params.get("source") || null,
  };
  const sortBy = (params.get("sort") as SortField) || "opportunity_score";
  const page = params.get("page") ? Number(params.get("page")) : 0;
  return { filters, sortBy, page };
}

// Serialize filters to URL search params
function filtersToParams(filters: Filters, sortBy: SortField, page: number): string {
  const params = new URLSearchParams();
  if (filters.minPriceSqm) params.set("minPriceSqm", String(filters.minPriceSqm));
  if (filters.maxPriceSqm) params.set("maxPriceSqm", String(filters.maxPriceSqm));
  if (filters.minSurface) params.set("minSurface", String(filters.minSurface));
  if (filters.maxSurface) params.set("maxSurface", String(filters.maxSurface));
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.rooms) params.set("rooms", String(filters.rooms));
  if (filters.arrondissements.length > 0) params.set("arr", filters.arrondissements.join(","));
  if (filters.source) params.set("source", filters.source);
  if (sortBy !== "opportunity_score") params.set("sort", sortBy);
  if (page > 0) params.set("page", String(page));
  return params.toString();
}

export function useListings(): UseListingsReturn {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL params
  const initial = parseFiltersFromParams(searchParams);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPageState] = useState(initial.page);
  const [filters, setFiltersState] = useState<Filters>(initial.filters);
  const [sortBy, setSortByState] = useState<SortField>(initial.sortBy);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Sync state to URL (without full page reload)
  const syncUrl = useCallback((f: Filters, s: SortField, p: number) => {
    const qs = filtersToParams(f, s, p);
    const path = qs ? `/?${qs}` : "/";
    router.replace(path, { scroll: false });
  }, [router]);

  const load = useCallback(async () => {
    const key = getCacheKey(filters, sortBy, page);
    const cached = cache.get(key);

    // Use cache if fresh (< 30s old)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setListings(cached.data);
      setTotalCount(cached.count);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const { data, count } = await fetchListings(filters, sortBy, page, PAGE_SIZE);
      setListings(data);
      setTotalCount(count);
      cache.set(key, { data, count, ts: Date.now() });
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setListings([]);
      setTotalCount(0);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilters = useCallback((f: Filters) => {
    setFiltersState(f);
    setPageState(0);
    syncUrl(f, sortBy, 0);
  }, [sortBy, syncUrl]);

  const setSortBy = useCallback((s: SortField) => {
    setSortByState(s);
    setPageState(0);
    syncUrl(filters, s, 0);
  }, [filters, syncUrl]);

  const setPage = useCallback((p: number) => {
    setPageState(p);
    syncUrl(filters, sortBy, p);
  }, [filters, sortBy, syncUrl]);

  const nextPage = useCallback(() => {
    const next = Math.min(totalPages - 1, page + 1);
    setPageState(next);
    syncUrl(filters, sortBy, next);
  }, [totalPages, page, filters, sortBy, syncUrl]);

  const prevPage = useCallback(() => {
    const prev = Math.max(0, page - 1);
    setPageState(prev);
    syncUrl(filters, sortBy, prev);
  }, [page, filters, sortBy, syncUrl]);

  return {
    listings,
    loading,
    error,
    totalCount,
    page,
    totalPages,
    filters,
    sortBy,
    setFilters,
    setSortBy,
    setPage,
    nextPage,
    prevPage,
    refresh: load,
  };
}
