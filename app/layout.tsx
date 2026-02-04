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
          {/* 하이브리드 레이아웃: 데스크탑 중앙 컨테이너, 모바일 전체 너비 */}
          <div className="min-h-screen bg-background flex justify-center">
            {/* 메인 모바일 컨테이너 (데스크탑에서는 600px 고정) */}
            <div className="w-full max-w-[600px] min-h-screen bg-background flex flex-col relative shadow-toss-lg lg:shadow-none lg:border-x lg:border-border/50">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
