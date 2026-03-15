"use client";

import Image from "next/image";
import { Heart, MapPin, Layers } from "lucide-react";
import { Listing, SOURCE_LABELS } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { formatPrice, formatPriceSqm, formatArrondissement, cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < DAY_MS;
}

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite, index = 0 }: ListingCardProps) {
  return (
    <div
      className="group glass rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.01] animate-card-enter"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {listing.photos && listing.photos.length > 0 ? (
          <Image
            src={listing.photos[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Layers className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        {/* Source + New badge — frosted glass */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white/95 bg-white/20 backdrop-blur-md border border-white/20">
            {SOURCE_LABELS[listing.source] || listing.source}
          </span>
          {isNew(listing.created_at) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white bg-emerald-500/90 backdrop-blur-md">
              Nouveau
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <ScoreBadge score={listing.opportunity_score} />
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            className={cn(
              "absolute bottom-3 right-3 h-11 w-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90",
              isFavorite
                ? "bg-white/95 text-red-500 shadow-lg backdrop-blur-sm"
                : "bg-white/15 text-white backdrop-blur-md border border-white/20 hover:bg-white/25"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </button>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="text-lg font-bold text-white drop-shadow-lg">
            {formatPrice(listing.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <a href={`/listing/${listing.id}`} className="block">
        <div className="px-4 py-4">
          <h3 className="text-[15px] font-semibold text-foreground line-clamp-1 mb-1.5">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px]">{formatArrondissement(listing.arrondissement)}</span>
            {listing.seller_type === "particulier" && (
              <span className="text-[10px] font-medium ml-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Particulier
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            {listing.surface && (
              <div>
                <span className="text-muted-foreground">Surface </span>
                <span className="font-semibold text-foreground tabular-nums">{listing.surface} m&sup2;</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Prix/m&sup2; </span>
              <span className="font-semibold text-foreground tabular-nums">{formatPriceSqm(listing.price_per_sqm)}</span>
            </div>
            {listing.rooms && (
              <div className="text-muted-foreground tabular-nums">{listing.rooms}p</div>
            )}
          </div>
        </div>
      </a>
    </div>
  );
}
