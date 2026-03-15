"use client";

import Image from "next/image";
import { Heart, MapPin, Layers } from "lucide-react";
import { Listing, SOURCE_LABELS } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { formatPrice, formatPriceSqm, formatArrondissement, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ListingCardProps {
  listing: Listing;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
}

export function ListingCard({ listing, isFavorite, onToggleFavorite, index = 0 }: ListingCardProps) {
  return (
    <Card
      className="group overflow-hidden py-0 transition-shadow hover:shadow-md animate-card-enter"
      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {listing.photos && listing.photos.length > 0 ? (
          <Image
            src={listing.photos[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-2.5 left-2.5">
          <Badge variant="secondary" className="bg-white/90 text-foreground text-[10px] uppercase tracking-wide border-0 hover:bg-white/90">
            {SOURCE_LABELS[listing.source] || listing.source}
          </Badge>
        </div>
        <div className="absolute top-2.5 right-2.5">
          <ScoreBadge score={listing.opportunity_score} />
        </div>
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "absolute bottom-2.5 right-2.5 rounded-full",
              isFavorite
                ? "bg-white text-foreground hover:bg-white/90"
                : "bg-black/40 text-white hover:bg-black/60 hover:text-white"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(listing.id);
            }}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </Button>
        )}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-sm font-semibold text-white">
            {formatPrice(listing.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <a href={`/listing/${listing.id}`} className="block">
        <CardContent className="p-3 sm:p-4">
          <h3 className="text-sm font-medium text-foreground line-clamp-1 mb-1">
            {listing.title}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground mb-2.5 sm:mb-3">
            <MapPin className="h-3 w-3" />
            <span className="text-xs">{formatArrondissement(listing.arrondissement)}</span>
            {listing.seller_type === "particulier" && (
              <span className="text-xs opacity-70 ml-1">&middot; Particulier</span>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Surface </span>
              <span className="font-medium text-foreground tabular-nums">
                {listing.surface ? `${listing.surface} m\u00b2` : "\u2014"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Prix/m\u00b2 </span>
              <span className="font-medium text-foreground tabular-nums">
                {formatPriceSqm(listing.price_per_sqm)}
              </span>
            </div>
            {listing.rooms && (
              <div className="text-muted-foreground">{listing.rooms}p</div>
            )}
          </div>
        </CardContent>
      </a>
    </Card>
  );
}
