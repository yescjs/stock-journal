import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ko" dir="ltr">
      <body
        className="antialiased tracking-tight bg-background text-foreground min-h-screen"
      >
        <div className="mx-auto max-w-screen-xl min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
