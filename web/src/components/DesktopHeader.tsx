"use client";

import { usePathname } from "next/navigation";
import { Search, BarChart3, Heart, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const PAGE_META: Record<string, { title: string; icon: React.ElementType }> = {
  "/": { title: "Annonces", icon: Search },
  "/stats": { title: "Statistiques", icon: BarChart3 },
  "/favorites": { title: "Favoris", icon: Heart },
  "/settings": { title: "Alertes", icon: Bell },
};

export function DesktopHeader() {
  const pathname = usePathname();

  // Match page or fall back for dynamic routes like /listing/[id]
  const meta = PAGE_META[pathname];

  // Don't render on detail pages — they have their own back button
  if (!meta) return null;

  const Icon = meta.icon;

  return (
    <header className="hidden md:flex items-center gap-3 h-14 px-6 border-b border-border/50 shrink-0">
      <SidebarTrigger className="h-7 w-7" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium text-foreground">{meta.title}</h1>
      </div>
    </header>
  );
}
