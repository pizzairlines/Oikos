"use client";

import { Heart } from "lucide-react";
import { useFavoriteListings } from "@/hooks/use-favorites";
import { useToast } from "@/components/Toast";
import { ListingCard } from "@/components/ListingCard";
import { ListingGridSkeleton } from "@/components/ListingSkeleton";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { listings, favoriteIds, loading, remove } = useFavoriteListings();
  const { toast } = useToast();

  const handleRemove = async (id: string) => {
    await remove(id);
    toast("Retire des favoris");
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-8">
        <h1 className="text-xl font-bold text-foreground">Favoris</h1>
        {!loading && listings.length > 0 && (
          <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full tabular-nums">
            {listings.length}
          </span>
        )}
      </div>

      {loading ? (
        <ListingGridSkeleton count={3} />
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Heart className="h-7 w-7 text-red-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Aucun favori</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ajoutez des annonces a vos favoris en cliquant sur le coeur pour les retrouver ici.
            </p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" asChild>
            <a href="/">Parcourir les annonces</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {listings.map((listing, i) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isFavorite={favoriteIds.has(listing.id)}
              onToggleFavorite={handleRemove}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
