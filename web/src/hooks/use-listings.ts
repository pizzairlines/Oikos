"use client";

import { useEffect, useState, useCallback } from "react";
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

export function useListings(): UseListingsReturn {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFiltersState] = useState<Filters>(DEFAULT_FILTERS);
  const [sortBy, setSortByState] = useState<SortField>("opportunity_score");

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const load = useCallback(async () => {
    const key = getCacheKey(filters, sortBy, page);
    const cached = cache.get(key);

    // Use cache if fresh (< 30s old)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setListings(cached.data);
      setTotalCount(cached.count);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, count } = await fetchListings(filters, sortBy, page, PAGE_SIZE);
      setListings(data);
      setTotalCount(count);
      cache.set(key, { data, count, ts: Date.now() });
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      setListings([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilters = useCallback((f: Filters) => {
    setFiltersState(f);
    setPage(0); // Reset to first page on filter change
  }, []);

  const setSortBy = useCallback((s: SortField) => {
    setSortByState(s);
    setPage(0); // Reset to first page on sort change
  }, []);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  return {
    listings,
    loading,
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
