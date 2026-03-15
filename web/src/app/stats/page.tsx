"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, TrendingUp, MapPin } from "lucide-react";
import { fetchStats, StatsData } from "@/lib/data";
import { formatArrondissement } from "@/lib/utils";
import { ScoreBadge } from "@/components/ScoreBadge";
import { StatsSkeleton } from "@/components/ListingSkeleton";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <StatsSkeleton />;

  if (error) {
    return (
      <ErrorState
        message="Impossible de charger les statistiques."
        onRetry={load}
      />
    );
  }

  if (!stats || stats.totalListings === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Pas encore de donnees</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Les statistiques apparaitront apres le premier scan d&apos;annonces.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" asChild>
          <a href="/">Voir les annonces</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-8">
        <h1 className="text-xl font-bold text-foreground">Statistiques</h1>
        <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
          {stats.totalListings.toLocaleString("fr-FR")} annonces
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <KpiCard label="Annonces" value={stats.totalListings.toLocaleString("fr-FR")} />
        <KpiCard label="Prix/m² moyen" value={`${stats.avgPriceSqm.toLocaleString("fr-FR")} €`} />
        <KpiCard label="Prix/m² median" value={`${stats.medianPriceSqm.toLocaleString("fr-FR")} €`} />
        <KpiCard label="Score moyen" value={String(stats.avgScore)} suffix="/ 100" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Distribution prix/m²
            </h3>
          </div>
          <div className="px-5 pb-5">
            <BarChartCSS
              data={stats.priceDistribution}
              labelKey="range"
              valueKey="count"
              color="bg-primary/25"
              activeColor="bg-primary/50"
            />
          </div>
        </div>

        <div className="glass rounded-2xl">
          <div className="px-5 pt-5 pb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribution scores
            </h3>
          </div>
          <div className="px-5 pb-5">
            <BarChartCSS
              data={stats.scoreDistribution}
              labelKey="range"
              valueKey="count"
              color="bg-emerald-200"
              activeColor="bg-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* By arrondissement */}
      <div className="glass rounded-2xl mb-8">
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Par arrondissement
          </h3>
        </div>
        <div className="px-5 pb-5">
          {stats.byArrondissement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnee.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.byArrondissement.map((a) => {
                const maxCount = Math.max(...stats.byArrondissement.map((x) => x.count));
                const pct = maxCount > 0 ? (a.count / maxCount) * 100 : 0;
                return (
                  <div key={a.arr} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-xs font-medium text-foreground shrink-0">
                      {formatArrondissement(a.arr)}
                    </span>
                    <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                      <div
                        className="h-full bg-primary/15 rounded-lg transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs text-foreground/70 tabular-nums">
                        {a.count} — {a.avgPriceSqm.toLocaleString("fr-FR")} €/m²
                      </span>
                    </div>
                    <span className="w-10 text-right">
                      <ScoreBadge score={a.avgScore} />
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2">
                <span className="w-20" />
                <span className="flex-1">Nb annonces — Prix/m² moyen</span>
                <span className="w-10 text-right">Score</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top 5 */}
      <div className="glass rounded-2xl mb-8">
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold">Top 5 opportunites</h3>
        </div>
        <div className="px-5 pb-5">
          <div className="space-y-1">
            {stats.topOpportunities.map((l, i) => (
              <a
                key={l.id}
                href={`/listing/${l.id}`}
                className="flex items-center gap-3 py-3 rounded-xl hover:bg-muted/50 px-3 -mx-3 transition-colors"
              >
                <span className="text-sm font-bold text-muted-foreground w-6 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground line-clamp-1">{l.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatArrondissement(l.arrondissement)} — {l.price_per_sqm?.toLocaleString("fr-FR")} €/m²
                    {l.surface ? ` — ${l.surface} m²` : ""}
                  </div>
                </div>
                <ScoreBadge score={l.opportunity_score} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="glass rounded-2xl">
      <div className="py-5 px-4">
        <div className="text-xl font-bold text-foreground tabular-nums">
          {value}
          {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function BarChartCSS({
  data,
  labelKey,
  valueKey,
  color,
  activeColor,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color: string;
  activeColor: string;
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const maxIdx = values.indexOf(max);

  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d, i) => {
        const val = values[i];
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{val}</span>
            <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div className={`absolute inset-0 ${i === maxIdx ? activeColor : color} transition-all duration-500`} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}
