import React, { useState } from 'react';
import { X, BookOpen, ChevronRight, PenTool, BarChart2, Calendar, Settings } from 'lucide-react';

interface UserGuideProps {
    isOpen: boolean;
    onClose: () => void;
    darkMode: boolean;
}

export function UserGuide({ isOpen, onClose, darkMode }: UserGuideProps) {
    const [step, setStep] = useState(0);

    if (!isOpen) return null;

    const steps = [
        {
            title: "환영합니다! 👋",
            desc: "주식 매매 일지를 쉽고 예쁘게 기록해보세요. 이 앱이 어떻게 도와드리는지 잠깐 설명해드릴게요.",
            icon: <BookOpen size={48} className="text-indigo-500" />,
            image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80"
        },
        {
            title: "1. 기록하기",
            desc: "매매한 종목, 가격, 그리고 '진입 근거'와 '감정'을 기록하세요. 뇌동매매를 줄이는 첫 걸음입니다.",
            icon: <PenTool size={48} className="text-rose-500" />,
            image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80"
        },
        {
            title: "2. 캘린더",
            desc: "나의 매매 활동을 한눈에 보세요. 수익은 초록색, 손실은 빨간색으로 표시되어 흐름을 파악하기 좋습니다.",
            icon: <Calendar size={48} className="text-blue-500" />,
            image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=400&q=80"
        },
        {
            title: "3. 통계 분석",
            desc: "나의 승률, 손익비, 그리고 어떤 전략이 잘 통했는지 분석해줍니다. 데이터 기반으로 성장하세요!",
            icon: <BarChart2 size={48} className="text-emerald-500" />,
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80"
        }
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
        >
            <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transition-all ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>

                {/* Image Area */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                    <img src={currentStep.image} alt="Guide" className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700" />
                    <button
                        onClick={onClose}
                        aria-label="닫기"
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute top-4 left-4 p-2 rounded-xl bg-white/90 shadow-lg backdrop-blur-md">
                        {currentStep.icon}
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-2">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-200'}`} />
                        ))}
                    </div>

                    <h3 id="guide-title" className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {currentStep.title}
                    </h3>
                    <p className={`text-sm leading-relaxed mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {currentStep.desc}
                    </p>

                    <div className="flex gap-3">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${darkMode
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                            >
                                이전
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`flex-[2] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${darkMode
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200'
                                }`}
                        >
                            {step === steps.length - 1 ? '시작하기' : '다음'}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
