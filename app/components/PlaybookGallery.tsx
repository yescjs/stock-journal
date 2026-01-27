import React from 'react';
import { Trade } from '@/app/types/trade';
import { Image as ImageIcon, Tag, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PlaybookGalleryProps {
  trades: Trade[];
  darkMode: boolean;
  onSelectTrade: (trade: Trade) => void;
}

export function PlaybookGallery({ trades, darkMode, onSelectTrade }: PlaybookGalleryProps) {
  const tradesWithImages = trades.filter(trade => trade.image && trade.image.trim() !== '');

  if (tradesWithImages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 p-8 rounded-3xl border text-center ${
        darkMode 
          ? 'bg-slate-900/40 border-slate-700/50 text-slate-400' 
          : 'bg-white/60 border-white/60 text-slate-500 shadow-lg'
      }`}>
        <div className={`p-4 rounded-full mb-4 ${darkMode ? 'bg-slate-800' : 'bg-indigo-50'}`}>
          <ImageIcon size={32} className={darkMode ? 'text-slate-500' : 'text-indigo-400'} />
        </div>
        <h3 className="text-lg font-bold mb-2">플레이북 이미지가 없습니다</h3>
        <p className="text-sm opacity-80 max-w-xs">
          매매 일지에 차트나 스크린샷을 추가하여 나만의 플레이북을 만들어보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 pb-20">
      {tradesWithImages.map((trade) => {
        const pnl = (trade.side === 'SELL' ? 1 : -1) * (trade.price * trade.quantity);
        const isWin = pnl > 0;
        
        return (
          <div 
            key={trade.id}
            onClick={() => onSelectTrade(trade)}
            className={`
              break-inside-avoid relative group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
              ${darkMode 
                ? 'bg-slate-800/40 border-slate-700/50 hover:border-indigo-500/50' 
                : 'bg-white border-indigo-50 hover:border-indigo-200 shadow-md'}
            `}
          >
            <div className="relative">
              <img 
                src={trade.image} 
                alt={`${trade.symbol} chart`}
                className="w-full h-auto object-cover min-h-[200px]"
                loading="lazy"
              />
              
              <div className={`
                absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity
              `} />

              <div className="absolute top-3 left-3 flex gap-2">
                <span className={`
                  px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md shadow-sm
                  ${trade.side === 'BUY' 
                    ? 'bg-rose-500/80 text-white' 
                    : 'bg-blue-500/80 text-white'}
                `}>
                  {trade.side === 'BUY' ? 'LONG' : 'SHORT'}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-lg font-black tracking-tight leading-none mb-1">
                      {trade.symbol}
                    </h3>
                    <p className="text-xs text-white/70 font-medium">
                      {trade.date}
                    </p>
                  </div>
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md
                    ${isWin ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'}
                  `}>
                    {isWin ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="text-sm font-bold">
                      {Math.abs(pnl).toLocaleString()}
                    </span>
                  </div>
                </div>

                {trade.tags && trade.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/10">
                    {trade.tags.slice(0, 3).map((tag, i) => (
                      <span 
                        key={i} 
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/90 backdrop-blur-sm"
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                    {trade.tags.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/90 backdrop-blur-sm">
                        +{trade.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
