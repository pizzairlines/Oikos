"use client";

import { useState } from "react";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Filters as FiltersType, ARRONDISSEMENTS, SortField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  filters: FiltersType;
  sortBy: SortField;
  onFiltersChange: (filters: FiltersType) => void;
  onSortChange: (sort: SortField) => void;
  totalCount: number;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "opportunity_score", label: "Score" },
  { value: "price_per_sqm", label: "Prix/m\u00b2" },
  { value: "price", label: "Prix" },
  { value: "surface", label: "Surface" },
  { value: "created_at", label: "Date" },
];

export function Filters({ filters, sortBy, onFiltersChange, onSortChange, totalCount }: FiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (partial: Partial<FiltersType>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const hasActiveFilters =
    filters.minPriceSqm !== null ||
    filters.maxPriceSqm !== null ||
    filters.minSurface !== null ||
    filters.maxSurface !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.rooms !== null ||
    filters.arrondissements.length > 0 ||
    filters.source !== null;

  const resetFilters = () => {
    onFiltersChange({
      minPriceSqm: null, maxPriceSqm: null,
      minSurface: null, maxSurface: null,
      minPrice: null, maxPrice: null,
      rooms: null, arrondissements: [], source: null,
    });
  };

  return (
    <div className="mb-6 sm:mb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Button
            variant={expanded ? "default" : "outline"}
            size="default"
            className="h-10 rounded-xl px-4"
            onClick={() => setExpanded(!expanded)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1.5 h-2 w-2 rounded-full bg-background" />
            )}
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {totalCount.toLocaleString("fr-FR")} annonce{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortField)}>
            <SelectTrigger className="h-10 w-[130px] rounded-xl border-0 shadow-none text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expandable filter panel */}
      {expanded && (
        <div className="glass-strong rounded-2xl animate-fade-in-up">
          <div className="space-y-5 p-5">
            {/* Numeric filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FilterInput label="Prix/m² min" placeholder="5 000" value={filters.minPriceSqm} onChange={(v) => update({ minPriceSqm: v })} />
              <FilterInput label="Prix/m² max" placeholder="7 500" value={filters.maxPriceSqm} onChange={(v) => update({ maxPriceSqm: v })} />
              <FilterInput label="Surface min" placeholder="20 m²" value={filters.minSurface} onChange={(v) => update({ minSurface: v })} />
              <FilterInput label="Surface max" placeholder="100 m²" value={filters.maxSurface} onChange={(v) => update({ maxSurface: v })} />
              <FilterInput label="Budget min" placeholder="100 000" value={filters.minPrice} onChange={(v) => update({ minPrice: v })} />
              <FilterInput label="Budget max" placeholder="500 000" value={filters.maxPrice} onChange={(v) => update({ maxPrice: v })} />

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Pieces</label>
                <Select
                  value={filters.rooms ? String(filters.rooms) : "all"}
                  onValueChange={(v) => update({ rooms: v === "all" ? null : Number(v) })}
                >
                  <SelectTrigger className="h-11 text-sm rounded-xl">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="1">Studio / 1p</SelectItem>
                    <SelectItem value="2">2 pieces</SelectItem>
                    <SelectItem value="3">3 pieces</SelectItem>
                    <SelectItem value="4">4+ pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">Source</label>
                <Select
                  value={filters.source ?? "all"}
                  onValueChange={(v) => update({ source: v === "all" ? null : v })}
                >
                  <SelectTrigger className="h-11 text-sm rounded-xl">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="bienici">BienIci</SelectItem>
                    <SelectItem value="pap">PAP</SelectItem>
                    <SelectItem value="leboncoin">LeBonCoin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Arrondissements */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2.5">Arrondissements</label>
              <div className="flex flex-wrap gap-2">
                {ARRONDISSEMENTS.map((arr) => {
                  const isSelected = filters.arrondissements.includes(arr.value);
                  return (
                    <button
                      key={arr.value}
                      className={`h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-all duration-150 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => {
                        const next = isSelected
                          ? filters.arrondissements.filter((a) => a !== arr.value)
                          : [...filters.arrondissements, arr.value];
                        update({ arrondissements: next });
                      }}
                    >
                      {arr.label.replace("Paris ", "")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-destructive hover:text-destructive">
                <X className="h-3.5 w-3.5" />
                Reinitialiser les filtres
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterInput({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-2">{label}</label>
      <Input
        type="number"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="h-11 text-sm rounded-xl"
      />
    </div>
  );
}
