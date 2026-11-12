import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Supplier Register", template: "%s · Supplier Register" },
  description: "Supplier, RFQ and quotation register for civil construction.",
  applicationName: "Supplier Register",
  appleWebApp: { capable: true, title: "Suppliers", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false }, // private app — keep it out of search engines
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh font-sans antialiased`}>{children}</body>
    </html>
  );
}
