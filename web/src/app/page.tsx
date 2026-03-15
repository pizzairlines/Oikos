"use client";

import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { useListings } from "@/hooks/use-listings";
import { useFavoriteIds } from "@/hooks/use-favorites";
import { useToast } from "@/components/Toast";
import { ListingCard } from "@/components/ListingCard";
import { Filters } from "@/components/Filters";
import { ListingGridSkeleton } from "@/components/ListingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";

function HomeContent() {
  const {
    listings, loading, error, totalCount, page, totalPages,
    filters, sortBy, setFilters, setSortBy, nextPage, prevPage, refresh,
  } = useListings();

  const { favoriteIds, toggle } = useFavoriteIds();
  const { toast } = useToast();

  const handleToggleFavorite = async (id: string) => {
    const wasFav = favoriteIds.has(id);
    await toggle(id);
    toast(wasFav ? "Retire des favoris" : "Ajoute aux favoris");
  };

  return (
    <div>
      <Filters
        filters={filters}
        sortBy={sortBy}
        onFiltersChange={setFilters}
        onSortChange={setSortBy}
        totalCount={totalCount}
      />

      {loading ? (
        <ListingGridSkeleton />
      ) : error ? (
        <ErrorState
          message="Impossible de charger les annonces. Verifiez votre connexion."
          onRetry={refresh}
        />
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune annonce ne correspond a vos criteres.</p>
          <Button variant="link" size="sm" onClick={() => setFilters({
            minPriceSqm: null, maxPriceSqm: null,
            minSurface: null, maxSurface: null,
            minPrice: null, maxPrice: null,
            rooms: null, arrondissements: [], source: null,
          })}>
            Reinitialiser les filtres
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={page === 0}
              >
                Precedent
              </Button>
              <span className="px-4 py-1.5 text-sm text-muted-foreground tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={page >= totalPages - 1}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<ListingGridSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
