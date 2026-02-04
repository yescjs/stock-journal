'use client';

import React from 'react';
import { ActiveTab } from '@/app/types/ui';
import { TrendingUp, BookOpen, FileText, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/app/components/ui/Button'; // Assuming cn is exported from Button or use a util

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'journal', label: '일지', icon: <FileText size={20} /> },
    { id: 'diary', label: '복기', icon: <BookOpen size={20} /> },
    { id: 'reports', label: '일보', icon: <TrendingUp size={20} /> },
    { id: 'stats', label: '통계', icon: <BarChart3 size={20} /> },
    { id: 'settings', label: '설정', icon: <Settings size={20} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-background/80 backdrop-blur-lg border-t border-border/50 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 active:scale-90",
                isActive ? "text-primary" : "text-grey-400"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-colors",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
