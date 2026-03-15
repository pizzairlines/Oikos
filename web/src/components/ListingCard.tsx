"use client";

import Image from "next/image";
import { Heart, MapPin, Layers } from "lucide-react";
import { Listing, SOURCE_LABELS } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { formatPrice, formatPriceSqm, formatArrondissement, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite, index = 0 }: ListingCardProps) {
  return (
    <Card
      className="group overflow-hidden py-0 border-0 shadow-sm hover:shadow-lg transition-all duration-300 animate-card-enter bg-card rounded-2xl"
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
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Layers className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

        {/* Source + Score badges */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/95 text-foreground text-[10px] font-semibold uppercase tracking-wider border-0 shadow-sm backdrop-blur-sm hover:bg-white/95">
            {SOURCE_LABELS[listing.source] || listing.source}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <ScoreBadge score={listing.opportunity_score} />
        </div>

        {/* Favorite button — larger touch target on mobile */}
        {onToggleFavorite && (
          <button
            className={cn(
              "absolute bottom-3 right-3 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90",
              isFavorite
                ? "bg-white text-red-500 shadow-md"
                : "bg-black/30 text-white/90 backdrop-blur-sm hover:bg-black/50"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
          >
            <Heart className={cn("h-[18px] w-[18px]", isFavorite && "fill-current")} />
          </button>
        )}

        {/* Price overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[17px] font-bold text-white drop-shadow-md">
            {formatPrice(listing.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <a href={`/listing/${listing.id}`} className="block">
        <CardContent className="px-4 py-3.5">
          <h3 className="text-[15px] font-semibold text-foreground line-clamp-1 mb-1.5">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[13px]">{formatArrondissement(listing.arrondissement)}</span>
            {listing.seller_type === "particulier" && (
              <Badge variant="outline" className="text-[10px] font-normal ml-1 py-0 px-1.5 h-4 border-primary/30 text-primary">
                Particulier
              </Badge>
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
        </CardContent>
      </a>
    </Card>
  );
}
