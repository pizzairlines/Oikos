"use client";

import { usePathname } from "next/navigation";
import { Building2, Home, Heart, Bell, Search, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/settings", label: "Alertes", icon: Bell },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-4 pb-3">
        <a href="/" className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="text-[15px] font-semibold tracking-tight">Oikos</span>
        </a>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <a href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
