"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, ExternalLink, Heart, MapPin, Building, Zap,
  ArrowUpRight, Ruler, DoorOpen, Loader2, Calculator,
} from "lucide-react";
import { Listing, SOURCE_LABELS } from "@/lib/types";
import { fetchListingById, fetchFavoriteIds, toggleFavorite, fetchPriceHistory, PricePoint } from "@/lib/data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatPrice, formatPriceSqm, formatArrondissement, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ListingPage() {
  const params = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchListingById(params.id as string);
      setListing(data);
      const favIds = await fetchFavoriteIds();
      setIsFavorite(favIds.has(params.id as string));
      if (data) {
        const history = await fetchPriceHistory(data.id);
        setPriceHistory(history);
      }
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
          <div className="relative w-full h-64">
            <Image src={listing.photos[0]} alt={listing.title} fill sizes="672px" className="object-cover" priority />
          </div>
          {listing.photos.length > 1 && (
            <div className="flex gap-px bg-border overflow-x-auto">
              {listing.photos.slice(1, 5).map((photo, i) => (
                <div key={i} className="relative h-16 w-24 flex-shrink-0">
                  <Image src={photo} alt="" fill sizes="96px" className="object-cover" loading="lazy" />
                </div>
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

      {/* Price history */}
      {priceHistory.length > 1 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Historique des prix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priceHistory.map((p, i) => {
                const prev = i > 0 ? priceHistory[i - 1] : null;
                const diff = prev ? p.price - prev.price : 0;
                const pct = prev && prev.price ? ((diff / prev.price) * 100).toFixed(1) : null;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.recorded_at).toLocaleDateString("fr-FR")}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{formatPrice(p.price)}</span>
                      {diff !== 0 && (
                        <span className={cn(
                          "text-xs tabular-nums",
                          diff < 0 ? "text-green-600" : "text-destructive"
                        )}>
                          {diff > 0 ? "+" : ""}{new Intl.NumberFormat("fr-FR").format(diff)} € ({pct}%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {priceHistory.length >= 2 && (() => {
              const first = priceHistory[0].price;
              const last = priceHistory[priceHistory.length - 1].price;
              const totalDiff = last - first;
              const totalPct = first ? ((totalDiff / first) * 100).toFixed(1) : "0";
              return (
                <div className="mt-3 pt-3 border-t flex justify-between text-xs">
                  <span className="text-muted-foreground">Evolution totale</span>
                  <span className={cn("font-medium", totalDiff < 0 ? "text-green-600" : totalDiff > 0 ? "text-destructive" : "")}>
                    {totalDiff > 0 ? "+" : ""}{new Intl.NumberFormat("fr-FR").format(totalDiff)} € ({totalPct}%)
                  </span>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Profitability simulator */}
      {listing.price && listing.surface && (
        <RentabilitySimulator listing={listing} />
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

// Average rent per m² by arrondissement (monthly, furnished ~30€/m², unfurnished ~25€/m²)
const RENT_PER_SQM: Record<string, number> = {
  "75001": 35, "75002": 34, "75003": 35, "75004": 36,
  "75005": 33, "75006": 37, "75007": 36, "75008": 35,
  "75009": 31, "75010": 30, "75011": 30, "75012": 28,
  "75013": 27, "75014": 28, "75015": 28, "75016": 32,
  "75017": 30, "75018": 27, "75019": 26, "75020": 26,
};

function RentabilitySimulator({ listing }: { listing: Listing }) {
  const defaultRent = listing.arrondissement
    ? Math.round((RENT_PER_SQM[listing.arrondissement] || 28) * (listing.surface || 30))
    : Math.round(28 * (listing.surface || 30));

  const [monthlyRent, setMonthlyRent] = useState(defaultRent);
  const [notaryRate, setNotaryRate] = useState(8);
  const [worksPercent, setWorksPercent] = useState(10);
  const [monthlyCharges, setMonthlyCharges] = useState(listing.charges || 150);
  const [vacancyRate, setVacancyRate] = useState(5);

  const sim = useMemo(() => {
    const price = listing.price || 0;
    const notaryFees = price * (notaryRate / 100);
    const worksCost = price * (worksPercent / 100);
    const totalInvestment = price + notaryFees + worksCost;

    const annualRent = monthlyRent * 12;
    const effectiveRent = annualRent * (1 - vacancyRate / 100);
    const annualCharges = monthlyCharges * 12;

    const grossYield = totalInvestment > 0 ? (annualRent / totalInvestment) * 100 : 0;
    const netYield = totalInvestment > 0 ? ((effectiveRent - annualCharges) / totalInvestment) * 100 : 0;
    const monthlyCashflow = (effectiveRent - annualCharges) / 12;

    return {
      totalInvestment,
      notaryFees,
      worksCost,
      grossYield,
      netYield,
      monthlyCashflow,
      annualNet: effectiveRent - annualCharges,
    };
  }, [listing.price, monthlyRent, notaryRate, worksPercent, monthlyCharges, vacancyRate]);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Simulateur de rentabilite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SimInput label="Loyer mensuel" value={monthlyRent} onChange={setMonthlyRent} suffix="€" />
          <SimInput label="Frais de notaire" value={notaryRate} onChange={setNotaryRate} suffix="%" />
          <SimInput label="Travaux" value={worksPercent} onChange={setWorksPercent} suffix="%" />
          <SimInput label="Charges/mois" value={monthlyCharges} onChange={setMonthlyCharges} suffix="€" />
          <SimInput label="Vacance locative" value={vacancyRate} onChange={setVacancyRate} suffix="%" />
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <ResultCard label="Investissement total" value={`${fmt(sim.totalInvestment)} €`} />
          <ResultCard
            label="Rendement brut"
            value={`${sim.grossYield.toFixed(1)}%`}
            highlight={sim.grossYield >= 4}
          />
          <ResultCard
            label="Rendement net"
            value={`${sim.netYield.toFixed(1)}%`}
            highlight={sim.netYield >= 3}
          />
          <ResultCard
            label="Cashflow/mois"
            value={`${sim.monthlyCashflow >= 0 ? "+" : ""}${fmt(sim.monthlyCashflow)} €`}
            highlight={sim.monthlyCashflow >= 0}
            warn={sim.monthlyCashflow < 0}
          />
        </div>

        {/* Breakdown */}
        <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
          <p>Prix : {fmt(listing.price || 0)} € + Notaire : {fmt(sim.notaryFees)} € + Travaux : {fmt(sim.worksCost)} €</p>
          <p>Revenu net annuel : {fmt(sim.annualNet)} €</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SimInput({
  label, value, onChange, suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-8 text-sm pr-8"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ResultCard({
  label, value, highlight, warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg p-2.5 text-center",
      warn ? "bg-destructive/10" : highlight ? "bg-green-50" : "bg-muted",
    )}>
      <div className={cn(
        "text-sm font-semibold tabular-nums",
        warn ? "text-destructive" : highlight ? "text-green-700" : "text-foreground",
      )}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
