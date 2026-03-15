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
      <div className="flex items-center gap-2.5 mb-6">
        <Heart className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Favoris</h1>
        {!loading && (
          <span className="text-sm text-muted-foreground tabular-nums">{listings.length}</span>
        )}
      </div>

      {loading ? (
        <ListingGridSkeleton count={3} />
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Aucun favori</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ajoutez des annonces a vos favoris en cliquant sur le coeur pour les retrouver ici.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
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
              onToggleFavorite={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
