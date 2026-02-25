// 저장된 AI 분석 리포트 목록 컴포넌트
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { History, ChevronDown, Trash2, FileText, Loader2 } from 'lucide-react';
import { SavedReport } from '@/app/hooks/useAIAnalysis';

interface AIReportHistoryProps {
    reports: SavedReport[];
    loading: boolean;
    onDelete: (id: string) => void;
}

// 마크다운 커스텀 컴포넌트 (AIReportCard와 공유)
export const markdownComponents = {
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2
            className="flex items-center gap-2 text-base font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10"
            {...props}
        >
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3
            className="text-sm font-bold text-white/90 mt-4 mb-2"
            {...props}
        >
            {children}
        </h3>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="text-sm text-white/60 leading-relaxed mb-3" {...props}>
            {children}
        </p>
    ),
    ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="space-y-2 mb-4 ml-1" {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className="space-y-2 mb-4 ml-1 list-decimal list-inside" {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="text-sm text-white/60 leading-relaxed pl-2 border-l-2 border-white/10 ml-2" {...props}>
            {children}
        </li>
    ),
    strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <strong className="text-white/90 font-bold" {...props}>
            {children}
        </strong>
    ),
    blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote className="border-l-3 border-indigo-500/40 pl-4 py-2 my-3 bg-indigo-500/5 rounded-r-lg" {...props}>
            {children}
        </blockquote>
    ),
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
        <hr className="border-white/5 my-4" {...props} />
    ),
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ReportTypeLabel({ type }: { type: string }) {
    if (type === 'weekly_report') {
        return (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                종합 분석
            </span>
        );
    }
    return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400">
            거래 리뷰
        </span>
    );
}

export function AIReportHistory({ reports, loading, onDelete }: AIReportHistoryProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="p-5 rounded-2xl border border-white/8 bg-white/3 flex items-center justify-center gap-2 text-white/30 text-sm">
                <Loader2 size={16} className="animate-spin" />
                리포트 목록 불러오는 중...
            </div>
        );
    }

    if (reports.length === 0) return null;

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        await onDelete(id);
        setDeletingId(null);
        if (expandedId === id) setExpandedId(null);
    };

    return (
        <div className="p-5 rounded-2xl border border-white/8 bg-white/3">
            <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">저장된 AI 분석 리포트</h3>
                <span className="text-xs text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                    {reports.length}건
                </span>
            </div>

            <div className="space-y-2">
                {reports.map((report) => {
                    const isExpanded = expandedId === report.id;
                    const isDeleting = deletingId === report.id;

                    return (
                        <div
                            key={report.id}
                            className={`rounded-xl border transition-all ${isExpanded
                                    ? 'border-indigo-500/20 bg-indigo-500/5'
                                    : 'border-white/5 bg-white/3 hover:bg-white/5'
                                }`}
                        >
                            {/* 리포트 헤더 */}
                            <div
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-none">
                                    <FileText size={14} className="text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <ReportTypeLabel type={report.report_type} />
                                        <span className="text-xs text-white/20">{formatDate(report.created_at)}</span>
                                    </div>
                                    <div className="text-xs font-medium text-white/70 truncate">
                                        {report.title}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 flex-none">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(report.id);
                                        }}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="삭제"
                                    >
                                        {isDeleting ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={12} />
                                        )}
                                    </button>
                                    <ChevronDown
                                        size={14}
                                        className={`text-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* 리포트 내용 */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-white/5">
                                    <div className="pt-3">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownComponents}
                                        >
                                            {report.report}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
