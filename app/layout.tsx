import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stock Journal",
  description: "Your personal trading journal",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" dir="ltr" className={`${jetbrainsMono.variable}`}>
      <body
        className="antialiased tracking-tight bg-background text-foreground min-h-screen"
      >
        <div className="mx-auto max-w-screen-xl p-3 sm:p-6 lg:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
