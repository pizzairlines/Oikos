import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ToastProvider } from "@/components/Toast";
import { BottomNav } from "@/components/BottomNav";

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
        <ToastProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 pb-20 md:pb-8">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
