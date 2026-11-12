import "@/lib/env"; // Fail loudly if configuration is missing.
import "@/app/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { ThemeScript } from "@/app/_components/theme-script";

export const metadata: Metadata = {
  title: "Cartograph",
  description: "Cartograph - Explore the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before first paint to prevent theme flash. */}
        <ThemeScript />
      </head>
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
