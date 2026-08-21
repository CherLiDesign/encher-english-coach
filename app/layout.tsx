import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Encher — Personal English Coach";
const description = "Your work conversations become your English curriculum.";

export const viewport: Viewport = { themeColor: "#1f5b47", viewportFit: "cover" };

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "encher-english-coach.metacher-art.chatgpt.site";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return { metadataBase, title, description, manifest: "/manifest.webmanifest", appleWebApp: { capable: true, statusBarStyle: "default", title: "Encher" }, icons: { icon: "/encher-icon.svg", shortcut: "/encher-icon.svg", apple: "/icon-192.png" }, openGraph: { title, description, type: "website", images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Encher turns workplace conversations into personalized listening and speaking practice" }] }, twitter: { card: "summary_large_image", title, description, images: ["/og.png"] } };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}` }} /></body></html>;
}
