"use client";

import { usePathname } from "next/navigation";
import { Search, BarChart3, Heart, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Annonces", icon: Search },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/settings", label: "Alertes", icon: Bell },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/70"
              )}
            >
              <item.icon className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.5]")} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
