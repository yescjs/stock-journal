import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

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
    <html lang="ko" dir="ltr" className={`${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body
        className="antialiased tracking-tight bg-background text-foreground min-h-screen"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 반응형 웹 레이아웃: 데스크탑 너비 확장 */}
          <div className="min-h-screen bg-background flex justify-center">
            <div className="w-full max-w-screen-xl min-h-screen bg-background flex flex-col relative">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
