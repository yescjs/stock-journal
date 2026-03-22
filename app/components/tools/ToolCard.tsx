import { Link } from '@/i18n/navigation';
import type { LucideIcon } from 'lucide-react';

interface ToolCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ToolCard({ href, title, description, icon: Icon }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/8 bg-white/3 p-6 transition-colors hover:bg-white/5"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-1 font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-white/40">{description}</p>
    </Link>
  );
}
