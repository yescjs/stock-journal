'use client';

import { motion } from 'framer-motion';
import React, { ReactNode } from 'react';

interface MotionWrapperProps {
    children: ReactNode;
    delay?: number;
    className?: string;
}

export function MotionWrapper({ children, delay = 0, className = '' }: MotionWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function FadeIn({ children, delay = 0, className = '' }: MotionWrapperProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
