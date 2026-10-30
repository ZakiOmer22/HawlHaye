import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hawlhay.cecit.edu.so"),
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
    url: "https://hawlhay.cecit.edu.so",
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
      <body className={`${jakarta.variable} font-sans antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
