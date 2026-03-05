'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[70] bg-card rounded-t-[32px] shadow-toss-lg overflow-hidden flex flex-col max-h-[90vh] md:bottom-10 md:rounded-[32px]"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-10 h-1.5 rounded-full bg-grey-200" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 py-2 flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-grey-400 hover:text-foreground hover:bg-grey-100 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Content */}
            <div className="px-6 pb-10 pt-2 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
