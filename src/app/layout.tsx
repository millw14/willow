import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Playfair_Display, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { FilmGrain } from "@/components/scene/FilmGrain";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const siteUrl = "https://onewishwillow.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "One Wish Willow — Everyone Gets One Wish",
  description:
    "A mysterious digital ritual where every connected soul receives exactly one wish.",
  keywords: ["one wish willow", "wish", "ritual", "solana", "oracle"],
  openGraph: {
    title: "One Wish Willow — Everyone Gets One Wish",
    description:
      "A mysterious digital ritual where every connected soul receives exactly one wish.",
    url: siteUrl,
    siteName: "One Wish Willow",
    images: [{ url: "/willow-hero.png", width: 1024, height: 576 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "One Wish Willow — Everyone Gets One Wish",
    description:
      "A mysterious digital ritual where every connected soul receives exactly one wish.",
    images: ["/willow-hero.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#080706",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${playfair.variable} ${inter.variable} ${grotesk.variable} font-body antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
        <div className="vignette" aria-hidden />
        <FilmGrain />
      </body>
    </html>
  );
}
