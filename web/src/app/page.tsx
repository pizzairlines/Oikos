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
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Aucun resultat</p>
            <p className="text-sm text-muted-foreground">Essayez d&apos;elargir vos criteres de recherche.</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setFilters({
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {listings.map((listing, i) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onToggleFavorite={handleToggleFavorite}
                index={i}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 mb-4">
              <Button
                variant="outline"
                size="default"
                className="h-10 rounded-xl min-w-[100px]"
                onClick={prevPage}
                disabled={page === 0}
              >
                Precedent
              </Button>
              <span className="px-5 py-2 text-sm text-muted-foreground tabular-nums font-medium">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="default"
                className="h-10 rounded-xl min-w-[100px]"
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
