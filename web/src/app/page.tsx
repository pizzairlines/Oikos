"use client";

import { Loader2, SearchX } from "lucide-react";
import { useListings } from "@/hooks/use-listings";
import { useFavoriteIds } from "@/hooks/use-favorites";
import { ListingCard } from "@/components/ListingCard";
import { Filters } from "@/components/Filters";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const {
    listings, loading, totalCount, page, totalPages,
    filters, sortBy, setFilters, setSortBy, nextPage, prevPage,
  } = useListings();

  const { favoriteIds, toggle } = useFavoriteIds();

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
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucune annonce ne correspond a vos criteres.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorite={favoriteIds.has(listing.id)}
                onToggleFavorite={toggle}
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
