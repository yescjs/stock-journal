import React, { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { MarketDiary } from '@/app/types/diary';
import { useDiary } from '@/app/hooks/useDiary';
import { BookOpen, Edit2, Trash2, Save, X, Smile, Frown, Meh, Activity } from 'lucide-react';

interface MarketDiaryViewProps {
  darkMode: boolean;
  currentUser: User | null;
  diaryData: ReturnType<typeof useDiary>;
}

export function MarketDiaryView({
  darkMode,
  currentUser,
  diaryData
}: MarketDiaryViewProps) {
  const { diaries, saveDiary, deleteDiary, loading } = diaryData;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Find diary for selected date
  const currentDiary = diaries.find(d => d.date === selectedDate);
  
  const [formData, setFormData] = useState<Partial<MarketDiary>>({
      market_sentiment: 'neutral',
      my_condition: 3
  });

  const handleEdit = () => {
    if (currentDiary) {
        setFormData(currentDiary);
    } else {
        setFormData({
            date: selectedDate,
            market_sentiment: 'neutral',
            my_condition: 3,
            market_issue: '',
            my_emotion: '',
            good_points: '',
            bad_points: '',
            improvement: ''
        });
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
      if (!formData.date) return;
      try {
          await saveDiary({ 
              ...formData, 
              date: formData.date,
              market_sentiment: formData.market_sentiment || 'neutral',
              my_condition: formData.my_condition || 3
          } as any);
          setIsEditing(false);
      } catch (e: any) {
          alert(`저장 실패: ${e.message || '알 수 없는 오류'}`);
          console.error(e);
      }
  };

  const handleDelete = async () => {
      if (!currentDiary || !confirm('삭제하시겠습니까?')) return;
      await deleteDiary(currentDiary.id);
      setIsEditing(false);
      setFormData({ market_sentiment: 'neutral', my_condition: 3 });
  };

  const sentimentColors = {
      bullish: 'text-rose-500 bg-rose-500/10',
      bearish: 'text-blue-500 bg-blue-500/10',
      neutral: 'text-slate-500 bg-slate-500/10',
      volatile: 'text-amber-500 bg-amber-500/10'
  };

  const sentimentLabels = {
      bullish: '🔥 강세장',
      bearish: '💧 약세장',
      neutral: '☁️ 횡보장',
      volatile: '⚡ 변동성'
  };

  const cardClass = `rounded-2xl border p-6 transition-all ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`;
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none ${
      darkMode 
      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500' 
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
  }`;
  const labelClass = `block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="w-full pb-20 animate-in fade-in duration-500">
      
      {/* Header & Date Picker */}
      <div className="flex items-center justify-between mb-8">
          <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  <span className="text-3xl">📖</span>
                  시장 복기 (Market Diary)
              </h2>
              <p className={`mt-1 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  하루의 시장 흐름과 나의 심리를 기록하고 반성합니다.
              </p>
          </div>
          <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsEditing(false);
              }}
              className={`px-4 py-2 rounded-xl font-mono font-bold text-lg outline-none cursor-pointer ${
                  darkMode ? 'bg-slate-800 text-white' : 'bg-white border text-slate-900 shadow-sm'
              }`}
          />
      </div>

      {isEditing ? (
          // EDIT FORM
          <div className={cardClass}>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-dashed border-slate-700">
                  <h3 className="font-bold text-lg">📝 {selectedDate} 일지 작성</h3>
                  <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-slate-800">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="space-y-6">
                  {/* Row 1: Condition & Sentiment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className={labelClass}>시장 분위기</label>
                          <div className="grid grid-cols-4 gap-2">
                              {(['bullish', 'bearish', 'neutral', 'volatile'] as const).map(s => (
                                  <button
                                      key={s}
                                      onClick={() => setFormData({...formData, market_sentiment: s})}
                                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                                          formData.market_sentiment === s
                                          ? 'border-transparent ring-2 ring-indigo-500 ' + sentimentColors[s]
                                          : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')
                                      }`}
                                  >
                                      {sentimentLabels[s]}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div>
                           <label className={labelClass}>나의 컨디션 (1~5)</label>
                           <input 
                              type="range" 
                              min="1" max="5" 
                              value={formData.my_condition || 3}
                              onChange={(e) => setFormData({...formData, my_condition: Number(e.target.value)})}
                              className="w-full accent-indigo-500"
                           />
                           <div className="flex justify-between text-xs text-slate-500 mt-1 font-bold">
                               <span>🤢 최악</span>
                               <span>😐 보통</span>
                               <span>🤩 최상</span>
                           </div>
                      </div>
                  </div>

                  {/* Row 2: Market Issue */}
                  <div>
                      <label className={labelClass}>오늘의 시장 이슈 / 주도 테마</label>
                      <input 
                          type="text"
                          value={formData.market_issue || ''}
                          onChange={(e) => setFormData({...formData, market_issue: e.target.value})}
                          placeholder="예: 반도체 섹터 강세, 금리 인상 발표..."
                          className={inputClass}
                      />
                  </div>

                  {/* Row 3: Emotion */}
                  <div>
                      <label className={labelClass}>나의 심리 상태</label>
                      <input 
                          type="text"
                          value={formData.my_emotion || ''}
                          onChange={(e) => setFormData({...formData, my_emotion: e.target.value})}
                          placeholder="예: 뇌동매매 참음, 손실로 인한 분노..."
                          className={inputClass}
                      />
                  </div>

                  {/* Row 4: Review (Good/Bad/Improvement) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className={labelClass + " text-emerald-500"}>잘한 점 (Good)</label>
                          <textarea 
                              value={formData.good_points || ''}
                              onChange={(e) => setFormData({...formData, good_points: e.target.value})}
                              className={inputClass + " min-h-[120px] resize-none"}
                              placeholder="원칙을 지킨 매매는?"
                          />
                      </div>
                      <div>
                          <label className={labelClass + " text-rose-500"}>잘못한 점 (Bad)</label>
                          <textarea 
                              value={formData.bad_points || ''}
                              onChange={(e) => setFormData({...formData, bad_points: e.target.value})}
                              className={inputClass + " min-h-[120px] resize-none"}
                              placeholder="어인/감정적 매매는?"
                          />
                      </div>
                      <div>
                          <label className={labelClass + " text-blue-500"}>개선할 점 (Improvement)</label>
                          <textarea 
                              value={formData.improvement || ''}
                              onChange={(e) => setFormData({...formData, improvement: e.target.value})}
                              className={inputClass + " min-h-[120px] resize-none"}
                              placeholder="내일의 다짐"
                          />
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-dashed border-slate-700">
                      <button 
                          onClick={() => setIsEditing(false)}
                          className={`px-5 py-2.5 rounded-xl font-bold text-sm ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                      >
                          취소
                      </button>
                      <button 
                          onClick={handleSave}
                          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 transition-all"
                      >
                          저장하기
                      </button>
                  </div>
              </div>
          </div>
      ) : (
          // VIEW MODE
          <div className={cardClass + " min-h-[400px] flex flex-col justify-center items-center text-center relative"}>
              {currentDiary ? (
                 <div className="w-full h-full p-2 text-left">
                     {/* Toolbar */}
                     <div className="absolute top-6 right-6 flex gap-2">
                        <button 
                            onClick={handleEdit}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={handleDelete}
                            className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-rose-900/30 text-rose-500' : 'hover:bg-rose-50 text-rose-500'}`}
                        >
                            <Trash2 size={18} />
                        </button>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                         {/* Left Column: Summary */}
                         <div className="lg:col-span-4 space-y-6">
                            <div>
                                <div className={labelClass}>시장 분위기</div>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${sentimentColors[currentDiary.market_sentiment]}`}>
                                    {sentimentLabels[currentDiary.market_sentiment]}
                                </div>
                            </div>
                            
                            <div>
                                <div className={labelClass}>나의 컨디션</div>
                                <div className="flex items-center gap-1">
                                    {Array.from({length: 5}).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={`w-8 h-2 rounded-full ${
                                                i < currentDiary.my_condition 
                                                ? (currentDiary.my_condition >= 4 ? 'bg-emerald-500' : currentDiary.my_condition <= 2 ? 'bg-rose-500' : 'bg-amber-400')
                                                : (darkMode ? 'bg-slate-800' : 'bg-slate-200')
                                            }`} 
                                        />
                                    ))}
                                    <span className="ml-2 font-bold text-lg">{currentDiary.my_condition}/5</span>
                                </div>
                            </div>

                            <div>
                                 <div className={labelClass}>오늘의 감정</div>
                                 <p className={`text-lg font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                     "{currentDiary.my_emotion || '기록 없음'}"
                                 </p>
                            </div>
                         </div>

                         {/* Right Column: Issue & Review */}
                         <div className="lg:col-span-8 space-y-6">
                             <div>
                                 <div className={labelClass}>시장 이슈</div>
                                 <div className={`p-4 rounded-xl text-lg font-bold ${darkMode ? 'bg-slate-800/50 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                     {currentDiary.market_issue || '-'}
                                 </div>
                             </div>
                         </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-800/50">
                          <div className={`p-5 rounded-2xl ${darkMode ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                              <h4 className="font-bold text-emerald-500 mb-3 flex items-center gap-2">
                                  <Smile size={18} /> 잘한 점
                              </h4>
                              <p className="whitespace-pre-wrap leading-relaxed opacity-90">{currentDiary.good_points || '-'}</p>
                          </div>
                          <div className={`p-5 rounded-2xl ${darkMode ? 'bg-rose-500/5 border border-rose-500/20' : 'bg-rose-50 border border-rose-100'}`}>
                              <h4 className="font-bold text-rose-500 mb-3 flex items-center gap-2">
                                  <Frown size={18} /> 잘못한 점
                              </h4>
                              <p className="whitespace-pre-wrap leading-relaxed opacity-90">{currentDiary.bad_points || '-'}</p>
                          </div>
                          <div className={`p-5 rounded-2xl ${darkMode ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                              <h4 className="font-bold text-blue-500 mb-3 flex items-center gap-2">
                                  <Activity size={18} /> 개선점
                              </h4>
                              <p className="whitespace-pre-wrap leading-relaxed opacity-90">{currentDiary.improvement || '-'}</p>
                          </div>
                     </div>
                 </div>
              ) : (
                  // Empty State
                  <div className="py-12">
                      <div className="mx-auto w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 text-3xl">
                          📝
                      </div>
                      <h3 className="text-xl font-bold mb-2">작성된 일지가 없습니다</h3>
                      <p className="text-slate-500 mb-6">오늘 매매는 어떠셨나요? 복기를 남겨보세요.</p>
                      <button 
                          onClick={handleEdit}
                          className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-105"
                      >
                          일지 작성하기
                      </button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
}
