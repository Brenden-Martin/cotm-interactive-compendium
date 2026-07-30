import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const description = "An interactive cabinet of music, visual studies, private research, and collected fragments.";

  return {
    metadataBase: base,
    title: {
      default: "COTM — An Interactive Compendium",
      template: "%s · COTM",
    },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "COTM — An Interactive Compendium",
      description,
      type: "website",
      images: [{ url: new URL("/og.png", base), width: 1735, height: 907, alt: "COTM, an interactive compendium" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "COTM — An Interactive Compendium",
      description,
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
