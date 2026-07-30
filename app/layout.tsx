import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const description = "Child of the Machine: interactive exhibits exploring sound, motion, systems, and collected fragments.";

  return {
    metadataBase: base,
    title: {
      default: "Child of the Machine",
      template: "%s · Child of the Machine",
    },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Child of the Machine",
      description,
      type: "website",
      images: [{ url: new URL("/og-gravity.png", base), width: 1735, height: 907, alt: "Child of the Machine gravity study" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Child of the Machine",
      description,
      images: [new URL("/og-gravity.png", base)],
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
