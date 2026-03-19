import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'index, follow',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      <main className="pt-14 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
