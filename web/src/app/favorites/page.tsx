"use client";

import { Heart, Loader2 } from "lucide-react";
import { useFavoriteListings } from "@/hooks/use-favorites";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { listings, favoriteIds, loading, remove } = useFavoriteListings();

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-6">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Favoris</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground tabular-nums">{listings.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Heart className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun favori pour le moment.</p>
          <Button variant="link" asChild>
            <a href="/">Parcourir les annonces</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoriteIds.has(listing.id)}
              onToggleFavorite={remove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
