'use client';

import { useState, useEffect } from 'react';

const TAG_COLORS_KEY = 'stock-journal-tag-colors-v1';

// Preset colors
export const TAG_PRESETS = [
    '#64748b', // Slate (Default)
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
];

export function useTagColors() {
    const [tagColors, setTagColors] = useState<Record<string, string>>({});

    useEffect(() => {
        const saved = localStorage.getItem(TAG_COLORS_KEY);
        if (saved) {
            try {
                setTagColors(JSON.parse(saved));
            } catch {}
        }
    }, []);

    const setTagColor = (tag: string, color: string) => {
        setTagColors(prev => {
            const next = { ...prev, [tag]: color };
            localStorage.setItem(TAG_COLORS_KEY, JSON.stringify(next));
            return next;
        });
    };

    const getTagColor = (tag: string) => {
        return tagColors[tag] || '#64748b'; // Default Slate
    };

    return { tagColors, setTagColor, getTagColor };
}
