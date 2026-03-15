"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, TrendingUp, MapPin } from "lucide-react";
import { fetchStats, StatsData } from "@/lib/data";
import { formatArrondissement } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Pas encore de donnees</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Les statistiques apparaitront apres le premier scan d&apos;annonces.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/">Voir les annonces</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Statistiques</h1>
        <span className="text-sm text-muted-foreground">{stats.totalListings} annonces</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Annonces" value={String(stats.totalListings)} />
        <KpiCard label="Prix/m² moyen" value={`${stats.avgPriceSqm.toLocaleString("fr-FR")} €`} />
        <KpiCard label="Prix/m² median" value={`${stats.medianPriceSqm.toLocaleString("fr-FR")} €`} />
        <KpiCard label="Score moyen" value={String(stats.avgScore)} suffix="/ 100" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Price distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Distribution prix/m²
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartCSS
              data={stats.priceDistribution}
              labelKey="range"
              valueKey="count"
              color="bg-foreground/20"
            />
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Distribution scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartCSS
              data={stats.scoreDistribution}
              labelKey="range"
              valueKey="count"
              color="bg-foreground/25"
            />
          </CardContent>
        </Card>
      </div>

      {/* By arrondissement */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Par arrondissement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.byArrondissement.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnee.</p>
          ) : (
            <div className="space-y-2">
              {stats.byArrondissement.map((a) => {
                const maxCount = Math.max(...stats.byArrondissement.map((x) => x.count));
                const pct = maxCount > 0 ? (a.count / maxCount) * 100 : 0;
                return (
                  <div key={a.arr} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-xs text-muted-foreground shrink-0">
                      {formatArrondissement(a.arr)}
                    </span>
                    <div className="flex-1 h-5 bg-muted rounded overflow-hidden relative">
                      <div
                        className="h-full bg-foreground/15 rounded transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs text-foreground tabular-nums">
                        {a.count} — {a.avgPriceSqm.toLocaleString("fr-FR")} €/m²
                      </span>
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {a.avgScore}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                <span className="w-20" />
                <span className="flex-1">Nombre d&apos;annonces — Prix/m² moyen</span>
                <span className="w-10 text-right">Score</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 5 */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 5 opportunites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topOpportunities.map((l, i) => (
              <a
                key={l.id}
                href={`/listing/${l.id}`}
                className="flex items-center gap-3 py-2 rounded-md hover:bg-muted/50 px-2 -mx-2 transition-colors"
              >
                <span className="text-xs text-muted-foreground w-5 tabular-nums">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground line-clamp-1">{l.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatArrondissement(l.arrondissement)} — {l.price_per_sqm?.toLocaleString("fr-FR")} €/m²
                    {l.surface ? ` — ${l.surface} m²` : ""}
                  </div>
                </div>
                <ScoreBadge score={l.opportunity_score} />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-lg font-semibold text-foreground tabular-nums">
          {value}
          {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function BarChartCSS({
  data,
  labelKey,
  valueKey,
  color,
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color: string;
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const val = values[i];
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground tabular-nums">{val}</span>
            <div className="w-full relative" style={{ height: `${Math.max(pct, 2)}%` }}>
              <div className={`absolute inset-0 ${color} rounded-t transition-all duration-500`} />
            </div>
            <span className="text-[10px] text-muted-foreground">{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}
