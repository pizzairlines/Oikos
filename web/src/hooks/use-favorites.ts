"use client";

import { useEffect, useState, useCallback } from "react";
import { Listing } from "@/lib/types";
import {
  fetchFavoriteIds,
  fetchFavoriteListings,
  toggleFavorite,
} from "@/lib/data";

interface UseFavoriteIdsReturn {
  favoriteIds: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (listingId: string) => Promise<void>;
}

/**
 * Lightweight hook for tracking favorite IDs only (used on listing pages).
 */
export function useFavoriteIds(): UseFavoriteIdsReturn {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFavoriteIds()
      .then(setFavoriteIds)
      .catch(() => setFavoriteIds(new Set()));
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const toggle = useCallback(async (listingId: string) => {
    const isFav = favoriteIds.has(listingId);
    const nowFav = await toggleFavorite(listingId, isFav);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (nowFav) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
  }, [favoriteIds]);

  return { favoriteIds, isFavorite, toggle };
}

interface UseFavoriteListingsReturn {
  listings: Listing[];
  favoriteIds: Set<string>;
  loading: boolean;
  remove: (listingId: string) => Promise<void>;
}

/**
 * Full hook for the favorites page (loads listings + IDs).
 */
export function useFavoriteListings(): UseFavoriteListingsReturn {
  const [listings, setListings] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchFavoriteListings()
      .then(({ listings: data, ids }) => {
        setListings(data);
        setFavoriteIds(ids);
      })
      .catch(() => {
        setListings([]);
        setFavoriteIds(new Set());
      })
      .finally(() => setLoading(false));
  }, []);

  const remove = useCallback(async (listingId: string) => {
    if (!favoriteIds.has(listingId)) return;
    await toggleFavorite(listingId, true);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(listingId);
      return next;
    });
    setListings((prev) => prev.filter((l) => l.id !== listingId));
  }, [favoriteIds]);

  return { listings, favoriteIds, loading, remove };
}
