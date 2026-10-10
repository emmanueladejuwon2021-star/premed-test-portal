import React, { useState, useEffect } from 'react';
import { X, Calendar, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatToWAT } from '../lib/dateUtils';

interface Announcement {
    id: number;
    title: string;
    content: string;
    created_at: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AnnouncementsModal({ isOpen, onClose }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/announcements')
        .then(res => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
            return [];
          }
          return res.json().catch(() => []);
        })
        .then(data => {
            setAnnouncements(Array.isArray(data) ? data : []);
            setLoading(false);
        })
        .catch(() => {
            setAnnouncements([]);
            setLoading(false);
        });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 backdrop-blur-md rounded-t-3xl sticky top-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                  <Megaphone size={20} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {loading ? (
                <div className="text-center py-10 text-slate-500 animate-pulse">Loading announcements...</div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-medium">No new announcements.</div>
              ) : (
                announcements.map((ann, index) => (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    key={ann.id} 
                    className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
                  >
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{ann.title}</h3>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-line">{ann.content}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 px-3 py-1 rounded-full w-fit">
                      <Calendar size={12} />
                      <span>{formatToWAT(ann.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
