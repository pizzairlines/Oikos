"use client";

import { usePathname } from "next/navigation";
import { Building2, Heart, Bell, Search, BarChart3, Compass } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV_MAIN = [
  { href: "/", label: "Annonces", icon: Search },
  { href: "/stats", label: "Statistiques", icon: BarChart3 },
];

const NAV_PERSONAL = [
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/settings", label: "Alertes", icon: Bell },
];

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-5 pb-2">
        <a href="/" className="flex items-center gap-3 group/logo">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight leading-none">Oikos</span>
            <span className="text-[11px] text-muted-foreground leading-none mt-1">Paris immobilier</span>
          </div>
        </a>
      </SidebarHeader>

      <SidebarSeparator className="my-2" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Explorer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_MAIN.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Personnel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_PERSONAL.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label}>
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

      <SidebarFooter className="px-4 py-4">
        <SidebarSeparator className="mb-3 -mx-2" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground leading-none">Paris</span>
            <span className="text-[11px] text-muted-foreground leading-none mt-0.5">Appartements</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
