import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, XCircle, AlertCircle, HelpCircle, 
  Loader2, Target, BookOpen, ChevronDown, ChevronUp, ChevronRight,
  Maximize2, Minimize2, Activity, Filter, Layers
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface QuestionDetails {
  id: string;
  text: string;
  options: {
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
  };
  correct_option: string;
  student_answer: string | null;
  is_correct: boolean;
  explanation: string | null;
}

interface AnalysisData {
  course: string;
  percentage: number;
  created_at: string;
  details: QuestionDetails[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
}

export default function TestAnalysisModal({ isOpen, onClose, resultId }: Props) {
  const { token } = useAppContext();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAnalysis = async () => {
      setLoading(true); setError(null);
      if (!resultId || resultId === 'undefined' || resultId === 'null') {
        setError('Invalid assessment record.');
        setLoading(false); return;
      }
      const activeToken = token || localStorage.getItem('FCF_Token');
      try {
        const isAdminLogged = !!localStorage.getItem('FCF_Admin');
        const primaryUrl = isAdminLogged ? `/api/admin/results/${resultId}/transparency` : `/api/results/${resultId}/transparency`;
        const backupUrl = isAdminLogged ? `/api/results/${resultId}/transparency` : `/api/admin/results/${resultId}/transparency`;
        let response: Response;
        try { response = await fetch(primaryUrl, { headers: { 'Authorization': 'Bearer ' + activeToken } }); } 
        catch (e) {
          response = await fetch(backupUrl, { headers: { 'Authorization': 'Bearer ' + activeToken } });
        }
        if (!response.ok) {
          try {
            const backupResponse = await fetch(backupUrl, { headers: { 'Authorization': 'Bearer ' + activeToken } });
            if (backupResponse.ok) response = backupResponse;
          } catch (e) {}
        }
        if (!response.ok) throw new Error('Failed to retrieve analysis.');
        const resData = await response.json();
        setData(resData);
        setActiveQuestionIndex(0);
      } catch (err: any) {
        setError(err.message || 'Unable to connect to service.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [isOpen, resultId, token]);

  const normalizeKey = (key: string | null | undefined): string => {
    if (!key) return '';
    const lower = key.toLowerCase().trim();
    if (['a', 'option_a'].includes(lower)) return 'option_a';
    if (['b', 'option_b'].includes(lower)) return 'option_b';
    if (['c', 'option_c'].includes(lower)) return 'option_c';
    if (['d', 'option_d'].includes(lower)) return 'option_d';
    return lower;
  };

  useEffect(() => {
    setShowExplanation(false);
    setIsSolutionModalOpen(false);
  }, [activeQuestionIndex]);

  if (!isOpen) return null;

  const totalQuestions = data?.details?.length || 0;
  const correctCount = data?.details?.filter(q => q.is_correct).length || 0;
  const incorrectCount = data?.details?.filter(q => q.student_answer && !q.is_correct).length || 0;

  const filteredQuestions = data?.details ? data.details.map((q, idx) => ({ ...q, originalIndex: idx })).filter(q => {
    if (filter === 'correct') return q.is_correct;
    if (filter === 'incorrect') return q.student_answer && !q.is_correct;
    return true;
  }) : [];

  const activeQuestion = filteredQuestions.length > 0 && activeQuestionIndex < filteredQuestions.length
    ? filteredQuestions[activeQuestionIndex] 
    : (filteredQuestions[0] || null);
    
  if (filteredQuestions.length > 0 && activeQuestionIndex >= filteredQuestions.length) {
     setActiveQuestionIndex(0);
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1550] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-1 sm:p-3 overflow-hidden"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 15 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          exit={{ scale: 0.98, opacity: 0, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className={`bg-slate-50 dark:bg-[#0c0c0c] rounded-2xl flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800/80 pointer-events-auto transition-all ${
            isMaximized ? 'w-full h-full p-0' : 'w-full max-w-4xl h-[85vh] sm:h-[78vh]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* OS-Style Window Header Bar */}
          <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-150/55 dark:bg-[#040404] rounded-t-2xl flex justify-between items-center shrink-0 select-none">
            {/* Left Traffic Lights Control Group */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button 
                onClick={onClose} 
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-650 transition-colors flex items-center justify-center text-[7px] text-red-950 font-bold group"
                title="Close Window"
              >
                <X size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button 
                onClick={onClose} 
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center text-[7px] text-yellow-950 font-bold group"
                title="Minimize"
              >
                <Minimize2 size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button 
                onClick={() => setIsMaximized(!isMaximized)} 
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-650 transition-colors flex items-center justify-center text-[7px] text-green-950 font-bold group"
                title={isMaximized ? "Restore Window" : "Maximize Window"}
              >
                <Maximize2 size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Middle Drag Strip Info */}
            <div className="flex-1 text-center px-2 truncate flex items-center justify-start sm:justify-center gap-1.5 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono truncate">
                <span className="hidden sm:inline">Security Sandbox Window (Read-Only Review)</span>
                <span className="inline sm:hidden">Assessment Review</span>
              </span>
              <span className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[8px] font-black text-blue-700 dark:text-blue-400 tracking-wider shrink-0">
                {loading ? 'PINNING...' : `STRENGTH: ${data?.percentage}%`}
              </span>
            </div>

            {/* Right Action Button */}
            <button 
              onClick={onClose} 
              className="px-2 py-1 bg-slate-205 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-705 rounded-lg text-[8px] sm:text-[9px] font-black uppercase text-slate-500 hover:text-slate-700 dark:text-slate-350 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              Exit
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-blue-500 py-12">
                <Loader2 size={24} className="animate-spin mb-2" />
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">Retrieving official sequence mapping...</div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-6">
                 <div className="text-center max-w-sm">
                   <AlertCircle size={24} className="text-red-505 mx-auto mb-2" />
                   <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{error}</div>
                 </div>
              </div>
            ) : (
              <>
                {/* Master Grid Control Pane (Left Column) */}
                <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-[#fafafa] dark:bg-[#050505] flex flex-col shrink-0 overflow-hidden">
                   
                   {/* Compact Metric Bar */}
                   <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#020202] grid grid-cols-2 gap-1.5 shrink-0">
                      <div className="rounded-lg py-1 px-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                         <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Pass</span>
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{correctCount}</span>
                      </div>
                      <div className="rounded-lg py-1 px-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                         <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">Fail</span>
                         <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{incorrectCount}</span>
                      </div>
                   </div>
                   
                   {/* Density Quick Filters */}
                   <div className="p-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#060606] flex gap-1 shrink-0">
                     {[
                       { key: 'all', label: `ALL (${totalQuestions})` },
                       { key: 'correct', label: `PASS (${correctCount})` },
                       { key: 'incorrect', label: `FAIL (${incorrectCount})` },
                     ].map((btn) => (
                       <button
                         key={btn.key} 
                         onClick={() => { setFilter(btn.key as any); setActiveQuestionIndex(0); }}
                         className={`px-1.5 py-1 rounded text-[8px] font-black uppercase tracking-wider flex-1 transition-all cursor-pointer ${
                           filter === btn.key 
                             ? 'bg-blue-600 text-white shadow-sm' 
                             : 'bg-transparent text-slate-400 hover:text-slate-850 hover:bg-slate-200 dark:hover:bg-slate-850'
                         }`}
                       >
                         {btn.label}
                       </button>
                     ))}
                   </div>

                   {/* Super-Compact Number Grid/Strip */}
                   <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar bg-slate-50 dark:bg-transparent">
                      <div className="flex flex-row md:grid md:grid-cols-5 gap-1 md:flex-wrap pb-1 overflow-x-auto md:overflow-x-visible items-center shrink-0">
                         {filteredQuestions.map((q, idx) => {
                           const isSelected = activeQuestionIndex === idx;
                           let statusColor = "bg-slate-100 dark:bg-slate-900 text-slate-505 border border-slate-200 dark:border-slate-800"; 
                           if (q.is_correct) statusColor = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
                           else if (q.student_answer && !q.is_correct) statusColor = "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-250 dark:border-red-800/40";

                           return (
                             <button
                               key={q.id}
                               onClick={() => setActiveQuestionIndex(idx)}
                               className={`w-8 h-8 shrink-0 md:w-9 md:h-9 rounded-lg font-mono text-[10px] font-bold transition-all relative flex items-center justify-center ${statusColor} ${
                                 isSelected 
                                   ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950 font-black text-blue-700 dark:text-blue-200' 
                                   : 'hover:opacity-85 cursor-pointer'
                               }`}
                             >
                               {q.originalIndex + 1}
                             </button>
                           );
                         })}
                      </div>
                      {filteredQuestions.length === 0 && (
                         <div className="text-[8px] text-center text-slate-400 p-4 font-black uppercase tracking-widest leading-normal">
                           No segment items exist.
                         </div>
                      )}
                   </div>
                </div>

                {/* Question Detail Panel (Right Column: Dense scroll) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-white dark:bg-[#020202] flex flex-col min-h-0">
                  {activeQuestion ? (
                     <div className="max-w-xl mx-auto w-full flex flex-col space-y-4 pb-4">
                        {/* Compact Progress Label */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-900">
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                              <Layers size={11} /> RECORD {activeQuestion.originalIndex + 1} OF {totalQuestions}
                           </div>
                           <div className="flex items-center gap-1 shrink-0">
                              {activeQuestion.is_correct ? (
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded text-[8px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/30">
                                  COMPLIANT VERIFY
                                </span>
                              ) : !activeQuestion.student_answer ? (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                  UNANSWERED (0)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded text-[8px] font-black uppercase tracking-wider border border-red-100 dark:border-red-900/30">
                                  SEQUENCE ERROR
                                </span>
                              )}
                           </div>
                        </div>

                        {/* Question Narrative Card */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                           {activeQuestion.text}
                        </div>

                        {/* Answer Choices Matrix Grid (Compact side-by-side or stacked dense block) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                           {[
                              { code: 'option_a', text: activeQuestion.options.option_a, lbl: 'A' },
                              { code: 'option_b', text: activeQuestion.options.option_b, lbl: 'B' },
                              { code: 'option_c', text: activeQuestion.options.option_c, lbl: 'C' },
                              { code: 'option_d', text: activeQuestion.options.option_d, lbl: 'D' },
                           ].map((opt) => {
                             const ansKey = normalizeKey(activeQuestion.student_answer);
                             const corKey = normalizeKey(activeQuestion.correct_option);
                             const isSelected = ansKey === opt.code;
                             const isCorrect = corKey === opt.code;
                             
                             let optStyle = "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/50";
                             let badgeColor = "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-350";

                             if (isCorrect) {
                               optStyle = "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500 text-emerald-955 dark:text-emerald-200 font-bold border-2";
                               badgeColor = "bg-emerald-600 text-white";
                             } else if (isSelected) {
                               optStyle = "bg-red-500/10 dark:bg-red-500/10 border-red-500 text-red-955 dark:text-red-200 border-2 font-bold";
                               badgeColor = "bg-red-500 text-white";
                             }

                             if (!opt.text || opt.text === 'N/A') return null;

                             return (
                               <div key={opt.code} className={`p-2.5 rounded-xl border flex gap-2.5 items-start transition-all ${optStyle}`}>
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[9px] font-black shrink-0 ${badgeColor}`}>
                                     {opt.lbl}
                                  </div>
                                  <div className="text-[11px] leading-snug flex-1 pt-0.5">{opt.text}</div>
                                  {isCorrect && (
                                    <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                  )}
                                  {isSelected && !isCorrect && (
                                    <XCircle size={13} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                  )}
                               </div>
                             );
                           })}
                        </div>
                        
                        {/* Premium View Solution Button */}
                        {activeQuestion.explanation ? (
                           <div className="mt-1">
                             <button
                               id="btn-view-solution"
                               type="button"
                               onClick={() => setIsSolutionModalOpen(true)}
                               className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                             >
                               <BookOpen size={13} />
                               View Solution
                             </button>
                           </div>
                        ) : (
                           <div className="rounded-lg border border-slate-200 dark:border-slate-850 p-2 text-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-900/40">
                             No auxiliary reference logic documented for sequence.
                           </div>
                        )}
                        
                        {/* Micro Navigation Control Bar */}
                        <div className="flex justify-between items-center pt-2 mt-auto">
                           <button 
                             disabled={activeQuestionIndex === 0}
                             onClick={() => { setActiveQuestionIndex(activeQuestionIndex - 1); }}
                             className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${
                               activeQuestionIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                             }`}
                           >
                             &larr; Prev
                           </button>
                           
                           <span className="text-[10px] font-mono text-slate-400 font-bold">
                             {activeQuestionIndex + 1} / {filteredQuestions.length}
                           </span>

                           <button 
                             disabled={activeQuestionIndex === filteredQuestions.length - 1}
                             onClick={() => { setActiveQuestionIndex(activeQuestionIndex + 1); }}
                             className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${
                               activeQuestionIndex === filteredQuestions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                             }`}
                           >
                             Next &rarr;
                           </button>
                        </div>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                        <AlertCircle size={24} className="mb-2 text-slate-300" />
                        <span className="text-[9px] font-black uppercase tracking-wider">No matching assessments for current segment.</span>
                     </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Solution Modal Overlay */}
          <AnimatePresence>
            {isSolutionModalOpen && activeQuestion && activeQuestion.explanation && (
              <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="max-w-lg w-full bg-slate-50 dark:bg-[#0c0c0c] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-150/55 dark:bg-[#040404] flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1.5">
                      <BookOpen size={14} />
                      Solution Explanatory Guide
                    </span>
                    <button 
                      onClick={() => setIsSolutionModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 bg-slate-105 dark:bg-[#111] border border-slate-200/40 dark:border-slate-800/60 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* The Question context info to assist candidate */}
                    <div className="p-3.5 bg-slate-105 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest block font-mono">
                        Question Ref {activeQuestion.originalIndex + 1}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                        "{activeQuestion.text}"
                      </p>
                    </div>

                    {/* Explanatory Core Text */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-mono">
                        💡 Explanatory Core
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold bg-white dark:bg-[#060606] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 whitespace-pre-wrap">
                        {activeQuestion.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-105 dark:bg-[#040404] flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setIsSolutionModalOpen(false)}
                      className="px-5 py-2 bg-slate-950 text-white dark:bg-white dark:text-slate-950 font-black uppercase tracking-widest text-[9px] rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-md"
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
