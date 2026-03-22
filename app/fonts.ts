import { Inter, Noto_Sans_KR, JetBrains_Mono, Orbitron } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
export const notoSansKR = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-kr", display: "swap", weight: ["300", "400", "500", "600", "700", "800", "900"] });
export const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
export const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-logo", display: "swap", weight: ["400", "500", "600", "700", "800", "900"] });

export const fontVariables = `${inter.variable} ${notoSansKR.variable} ${jetbrainsMono.variable} ${orbitron.variable}`;
