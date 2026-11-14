import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { MaintenanceProvider } from "@/components/layout/MaintenanceProvider";

// Force every route under this layout to be server-rendered per request.
// Required for CSP nonce injection: static pages are built once and cannot
// carry a per-request nonce, which causes 'strict-dynamic' to block all
// inline scripts and leaves the app non-interactive.
export const dynamic = "force-dynamic";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://uoh.ealif.com"),
  title: {
    default: "HAWLHAYE - Institutional Task Management",
    template: "%s | HAWLHAYE",
  },
  description:
    "Assign. Track. Review. One clear direction for institutional work at University of Hargeisa and beyond.",
  keywords: ["HAWLHAYE", "University of Hargeisa", "CECIT", "task management", "workflow"],
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }, { url: "/favicon.ico" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "HAWLHAYE - Institutional Task Management",
    description: "One clear direction for institutional work.",
    url: "https://uoh.ealif.com",
    siteName: "HAWLHAYE",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HAWLHAYE",
    description: "One clear direction for institutional work.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#080810",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans antialiased min-h-screen`}>
        <MaintenanceProvider>{children}</MaintenanceProvider>
      </body>
    </html>
  );
}
