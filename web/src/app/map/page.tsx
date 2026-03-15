"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Map as MapIcon } from "lucide-react";
import { fetchMapListings, MapListing } from "@/lib/data";
import { formatArrondissement } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchMapListings();
      setListings(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return;
    if (listings.length === 0) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        attributionControl: true,
      }).setView([48.8566, 2.3522], 12); // Center on Paris

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Score-based colors
      function getColor(score: number): string {
        if (score >= 70) return "#16a34a"; // green
        if (score >= 50) return "#ca8a04"; // yellow
        if (score >= 30) return "#ea580c"; // orange
        return "#dc2626"; // red
      }

      // Add markers
      for (const listing of listings) {
        const color = getColor(listing.opportunity_score);
        const price = listing.price
          ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(listing.price) + " €"
          : "—";
        const priceSqm = listing.price_per_sqm
          ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(listing.price_per_sqm) + " €/m²"
          : "";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:700;color:white;
          ">${listing.opportunity_score}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const popup = `
          <div style="min-width:200px;font-family:system-ui,sans-serif;">
            <div style="font-weight:600;font-size:13px;margin-bottom:4px;line-height:1.3;">
              ${listing.title.length > 50 ? listing.title.slice(0, 50) + "…" : listing.title}
            </div>
            <div style="font-size:12px;color:#666;margin-bottom:6px;">
              ${formatArrondissement(listing.arrondissement)}
              ${listing.surface ? ` · ${listing.surface} m²` : ""}
              ${listing.rooms ? ` · ${listing.rooms}p` : ""}
            </div>
            <div style="font-size:14px;font-weight:600;margin-bottom:2px;">${price}</div>
            <div style="font-size:11px;color:#888;">${priceSqm}</div>
            <a href="/listing/${listing.id}" style="
              display:inline-block;margin-top:8px;padding:4px 12px;
              background:#111;color:white;border-radius:6px;
              font-size:11px;text-decoration:none;
            ">Voir l'annonce</a>
          </div>
        `;

        L.marker([listing.latitude, listing.longitude], { icon })
          .bindPopup(popup)
          .addTo(map);
      }

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, listings]);

  if (loading) {
    return (
      <div className="-mx-6 -my-8">
        <Skeleton className="w-full h-[calc(100vh-3rem)] md:h-screen rounded-none" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Impossible de charger la carte."
        onRetry={load}
      />
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <MapIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground mb-1">Aucune annonce sur la carte</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Les coordonnees GPS seront disponibles apres le prochain scan.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/">Voir les annonces</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-8">
      {/* Legend */}
      <div className="absolute top-14 md:top-4 right-4 z-[1000] bg-white/95 rounded-lg shadow-md px-3 py-2 flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#16a34a]" /> 70+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#ca8a04]" /> 50+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#ea580c]" /> 30+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-[#dc2626]" /> &lt;30
        </span>
        <span className="text-muted-foreground ml-1">{listings.length} annonces</span>
      </div>

      <div ref={mapRef} className="w-full h-[calc(100vh-3rem)] md:h-screen" />
    </div>
  );
}
