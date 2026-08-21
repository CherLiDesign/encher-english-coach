import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Encher — Personal English Coach",
  description: "Turn your real work conversations into personalized English practice.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
