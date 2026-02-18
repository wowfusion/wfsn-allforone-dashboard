import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "All for One – Gildendashboard",
  description: "Gildendashboard - All for One (Festung der Stürme)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <TooltipProvider>{children}</TooltipProvider>
        {/* Wowhead Tooltips für Item-Links */}
        <script dangerouslySetInnerHTML={{ __html: `const whTooltips = { colorLinks: true, iconizeLinks: true, renameLinks: false, iconSize: 'small' };` }} />
        <script src="https://wow.zamimg.com/js/tooltips.js" async />
      </body>
    </html>
  );
}
