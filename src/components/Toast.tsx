import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  title: string;
  message: string;
  type: ToastType;
};

let toastCount = 0;
let addToastFn: ((t: ToastItem) => void) | null = null;

export const toast = (title: string, message: string, type: ToastType = 'info') => {
  if (addToastFn) {
    addToastFn({ id: ++toastCount, title, message, type });
  }
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== t.id));
      }, 5000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={"p-4 rounded-lg shadow-xl border backdrop-blur-md min-w-[300px] " + (
              t.type === 'error' ? 'bg-red-900/80 border-red-500' :
              t.type === 'success' ? 'bg-green-900/80 border-green-500' :
              'bg-slate-900/80 border-cyan-500'
            )}
          >
            <h4 className="font-bold text-white mb-1">{t.title}</h4>
            <p className="text-sm text-slate-200">{t.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
