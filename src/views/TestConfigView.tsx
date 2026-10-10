import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { 
  X, Timer, ShieldCheck, FileType, Play, Sliders
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function TestConfigView() {
  const { selectedCourse } = useAppContext();
  const [questionCount, setQuestionCount] = useState<number | string>(selectedCourse?.question_limit || 20);
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/dashboard');
  };
  
  const isEnforced = !!selectedCourse?.question_limit;
  const maxQuestions = selectedCourse?.questionsCount || Infinity;
  const options = [10, 20, 50, 100].filter(o => o <= maxQuestions);
  if (options.length === 0 || maxQuestions < 10) {
    if (maxQuestions > 0 && !options.includes(maxQuestions)) options.push(maxQuestions);
  }
  const safeCount = typeof questionCount === 'number' ? questionCount : (parseInt(questionCount as string) || 1);
  
  const totalSeconds = selectedCourse?.duration ? selectedCourse.duration * 60 : safeCount * 30;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const handleProceed = () => {
    if (selectedCourse) {
      const now = new Date();
      if (selectedCourse.end_date) {
        const end = new Date(selectedCourse.end_date);
        if (now > end) {
          toast('Expired', `This test has already ended.`, 'error');
          navigate('/dashboard');
          return;
        }
      }
    }
    localStorage.setItem('FCF_QCount', safeCount.toString());
    navigate('/readiness');
  };

  return (
    <DashboardLayout viewTitle="Test Configuration">
      <AnimatePresence>
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190] bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4 pb-0">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) {
                  handleClose();
                }
              }}
              className="bg-white dark:bg-[#060606] w-full max-w-sm rounded-t-[2rem] sm:rounded-2xl shadow-[0_-12px_36px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-855 overflow-hidden relative flex flex-col pointer-events-auto max-h-[85vh]"
            >
               {/* Header */}
               <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/55 dark:bg-[#0a0a0a] flex items-start justify-between relative shrink-0">
                  <div className="sm:hidden absolute top-2 inset-x-0 flex justify-center pointer-events-none">
                     <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-805" />
                  </div>
                  <div className="pr-3 mt-1.5 sm:mt-0">
                     <div className="flex items-center gap-1.5 opacity-70">
                        <Sliders size={11} className="text-blue-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Test Setup</span>
                     </div>
                     <h2 className="text-base font-sans font-black text-slate-900 dark:text-white leading-tight uppercase line-clamp-1 pr-3">
                       {selectedCourse?.title || "Test Configuration"}
                     </h2>
                  </div>
                  <button 
                    onClick={handleClose}
                    className="w-7 h-7 rounded-full bg-slate-150 dark:bg-slate-800 flex items-center justify-center text-slate-505 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 -mr-1 sm:mr-0 z-10 relative cursor-pointer"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
               </div>

             {/* Content */}
             <div 
                className="p-4 space-y-4 flex-1 overflow-y-auto"
                onPointerDown={(e) => e.stopPropagation()}
             >
                {/* Length Configuration */}
                <div className="space-y-2">
                   <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                     <FileType size={11} className="text-slate-400" /> {isEnforced ? 'Fixed Length' : 'Select Volume'}
                   </h3>
                   
                   {isEnforced ? (
                      <div className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-[#0c0c0c]/60 rounded-xl border border-slate-150 dark:border-slate-800/80">
                         <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Total Questions</span>
                         <span className="text-xl font-black text-blue-600 dark:text-blue-400">{selectedCourse?.question_limit}</span>
                      </div>
                   ) : (
                      <div className="space-y-2">
                         <div className="grid grid-cols-4 gap-1.5">
                           {options.map(opt => (
                             <button
                               key={opt}
                               onClick={() => setQuestionCount(opt)}
                               className={`h-9 rounded-lg flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                                 questionCount === opt 
                                   ? 'bg-blue-600 text-white shadow-sm' 
                                   : 'bg-slate-50 dark:bg-[#0c0c0c] border border-slate-150 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                               }`}
                             >
                               {opt}
                             </button>
                           ))}
                         </div>
                         
                         <div className="flex items-center gap-2">
                            <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Or Custom:</label>
                            <input 
                              type="number"
                              min="1"
                              value={questionCount || ''}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '') {
                                  setQuestionCount('');
                                } else {
                                  setQuestionCount(Math.max(1, parseInt(val) || 1));
                                }
                              }}
                              className="w-full h-9 bg-slate-50 dark:bg-[#0c0c0c] border border-slate-150 dark:border-slate-800/85 rounded-lg px-3 text-center font-black text-xs text-slate-800 dark:text-slate-205 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                         </div>
                      </div>
                   )}
                </div>

                {/* Specs: Double horizontal banner layout */}
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-slate-50/50 dark:bg-[#0c0c0c]/40 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                        <Timer size={13} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">Duration</span>
                        <span className="text-xs font-black text-slate-850 dark:text-slate-100">
                          {minutes}m {seconds > 0 ? `${seconds}s` : ''}
                        </span>
                      </div>
                   </div>

                   <div className="bg-slate-50/50 dark:bg-[#0c0c0c]/40 rounded-xl p-3 border border-slate-150 dark:border-slate-800/80 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                        <ShieldCheck size={13} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase font-black tracking-wider text-slate-400">Security</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Active</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Action */}
             <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#050505]">
                <button 
                  onClick={handleProceed}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-505 text-white rounded-lg font-black uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  Start Initialization <Play size={11} fill="currentColor" />
                </button>
             </div>
          </motion.div>
        </div>
        </>
      </AnimatePresence>
    </DashboardLayout>
  );
}
