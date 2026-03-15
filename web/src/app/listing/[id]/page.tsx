"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, ExternalLink, Heart, MapPin, Building, Zap,
  ArrowUpRight, Ruler, DoorOpen, Loader2,
} from "lucide-react";
import { Listing, SOURCE_LABELS } from "@/lib/types";
import { fetchListingById, fetchFavoriteIds, toggleFavorite } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatPrice, formatPriceSqm, formatArrondissement, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ListingPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchListingById(params.id as string);
      setListing(data);
      const favIds = await fetchFavoriteIds();
      setIsFavorite(favIds.has(params.id as string));
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handleToggleFavorite = async () => {
    if (!listing) return;
    const nowFav = await toggleFavorite(listing.id, isFavorite);
    setIsFavorite(nowFav);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-20 text-muted-foreground text-sm">Annonce introuvable.</div>;
  }

  const details = listing.score_details;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="mb-5">
        <a href="/">
          <ArrowLeft className="h-3.5 w-3.5" />
          Annonces
        </a>
      </Button>

      {/* Photos */}
      {listing.photos && listing.photos.length > 0 && (
        <Card className="mb-4 overflow-hidden py-0">
          <img src={listing.photos[0]} alt={listing.title} className="w-full h-64 object-cover" />
          {listing.photos.length > 1 && (
            <div className="flex gap-px bg-border overflow-x-auto">
              {listing.photos.slice(1, 5).map((photo, i) => (
                <img key={i} src={photo} alt="" className="h-16 w-24 object-cover flex-shrink-0" />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Header card */}
      <Card className="mb-4">
        <CardContent>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-base font-semibold text-foreground">{listing.title}</h1>
            <ScoreBadge score={listing.opportunity_score} size="lg" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
            <MapPin className="h-3 w-3" />
            {formatArrondissement(listing.arrondissement)}
            <span>&middot;</span>
            {SOURCE_LABELS[listing.source] || listing.source}
            {listing.seller_type && (
              <>
                <span>&middot;</span>
                {listing.seller_type}
              </>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Prix", value: formatPrice(listing.price) },
              { label: "Surface", value: listing.surface ? `${listing.surface} m\u00b2` : "\u2014" },
              { label: "Prix/m\u00b2", value: formatPriceSqm(listing.price_per_sqm) },
            ].map((m) => (
              <div key={m.label} className="bg-muted rounded-lg p-3 text-center">
                <div className="text-[15px] font-semibold text-foreground tabular-nums">{m.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <Button asChild className="flex-1">
              <a href={listing.url} target="_blank" rel="noopener noreferrer">
                Voir l&apos;annonce
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="outline" onClick={handleToggleFavorite}>
              <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              {isFavorite ? "Favori" : "Ajouter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-2.5 text-sm">
            {listing.rooms && (
              <DetailRow icon={DoorOpen} label="Pieces" value={String(listing.rooms)} />
            )}
            {listing.floor !== null && listing.floor !== undefined && (
              <DetailRow icon={Building} label="Etage" value={listing.floor === 0 ? "RDC" : `${listing.floor}e`} />
            )}
            {listing.has_elevator !== null && (
              <DetailRow icon={ArrowUpRight} label="Ascenseur" value={listing.has_elevator ? "Oui" : "Non"} />
            )}
            {listing.dpe && (
              <DetailRow icon={Zap} label="DPE" value={listing.dpe} warn={listing.dpe >= "E"} />
            )}
            {listing.charges && (
              <DetailRow icon={Ruler} label="Charges" value={`${listing.charges} \u20ac/mois`} />
            )}
            {listing.published_at && (
              <DetailRow
                icon={Building}
                label="Publication"
                value={new Date(listing.published_at).toLocaleDateString("fr-FR")}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score breakdown */}
      {details && details.total > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Score d&apos;opportunite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Prix", weight: "40%", value: details.price },
                { label: "Localisation", weight: "20%", value: details.location },
                { label: "Surface", weight: "15%", value: details.size },
                { label: "Condition", weight: "15%", value: details.condition },
                { label: "Liquidite", weight: "10%", value: details.liquidity },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {item.label} <span className="opacity-70">({item.weight})</span>
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/25 rounded-full transition-all"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {listing.description && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {listing.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon, label, value, warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={cn("text-foreground", warn && "font-medium text-destructive")}>
        {value}
      </span>
    </>
  );
}
