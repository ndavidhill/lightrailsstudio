import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Light Rails — pattern studio",
  description: "A generative light-rail pattern studio: 24 shapes, live mockups and a showreel, rendered in WebGL.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='16' y='24' font-size='24' text-anchor='middle'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E",
  },
  openGraph: {
    type: "website",
    siteName: "Light Rails",
    title: "Light Rails — pattern studio",
    description: "Draw with light, then brand with it: 24 shapes, live mockups and showreels.",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#eef0f3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
