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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{
        background: "oklch(0.98 0.005 250 / 0.65)",
        backdropFilter: "blur(40px) saturate(2)",
        WebkitBackdropFilter: "blur(40px) saturate(2)",
        borderTop: "1px solid oklch(1 0 0 / 0.2)",
        boxShadow: "0 -2px 20px oklch(0 0 0 / 0.05), inset 0 1px 0 oklch(1 0 0 / 0.4)",
      }}
    >
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
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 active:text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-[22px] w-[22px]", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[11px]", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
