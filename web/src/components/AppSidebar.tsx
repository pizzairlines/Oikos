"use client";

import { usePathname } from "next/navigation";
import { Building2, Heart, Bell, Search, BarChart3, Map } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Annonces", icon: Search },
  { href: "/map", label: "Carte", icon: Map },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/settings", label: "Alertes", icon: Bell },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <a href="/" className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-tight">Oikos</span>
        </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">Paris &middot; Appartements</p>
      </SidebarFooter>
    </Sidebar>
  );
}
