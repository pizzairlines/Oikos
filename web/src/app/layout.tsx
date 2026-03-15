import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oikos",
  description: "Detection d'opportunites immobilieres a Paris",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-sm font-semibold">Oikos</span>
            </header>
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
