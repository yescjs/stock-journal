import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  robots: 'index, follow',
};

export default async function ToolsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <main className="pt-14 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
