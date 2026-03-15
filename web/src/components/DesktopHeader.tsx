"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";

const BREADCRUMBS: Record<string, string[]> = {
  "/": ["Annonces", "Explorer"],
  "/stats": ["Statistiques"],
  "/favorites": ["Favoris"],
  "/settings": ["Alertes"],
};

export function DesktopHeader() {
  const pathname = usePathname();

  // Build breadcrumb — dynamic routes like /listing/[id]
  const isDetail = pathname.startsWith("/listing/");
  const crumbs = isDetail
    ? ["Annonces", "Detail"]
    : BREADCRUMBS[pathname] || ["Oikos"];

  return (
    <header className="hidden md:flex items-center h-12 px-4 border-b border-border/40 shrink-0 bg-background">
      <SidebarTrigger className="h-7 w-7 text-muted-foreground" />
      <nav className="flex items-center gap-1.5 text-sm ml-3">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/50">&rsaquo;</span>}
            <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>
    </header>
  );
}
