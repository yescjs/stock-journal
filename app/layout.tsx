import type { Metadata } from "next";
import { Inter, Noto_Sans_KR, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { SharedTopNav } from "./components/ui/SharedTopNav";
import { AppBottomNav } from "./components/ui/AppBottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-kr",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
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
    <html lang="ko" dir="ltr" className={`${inter.variable} ${notoSansKR.variable} ${jetbrainsMono.variable} ${orbitron.variable}`} suppressHydrationWarning>
      <body
        className="antialiased tracking-tight bg-background text-foreground min-h-screen"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <SharedTopNav />
          {children}
          <AppBottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
