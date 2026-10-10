import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Sparkles, ChevronRight, CheckCircle2, 
  XCircle, ArrowRight, RefreshCw, BookMarked, 
  Loader2, Award, ArrowLeft, HelpCircle
} from 'lucide-react';
import { toast } from './Toast';
import StudyGuideRenderer from './StudyGuideRenderer';

interface StudentNotesCbtProps {
  token: string;
}

export default function StudentNotesCbt({ token }: StudentNotesCbtProps) {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCollection, setActiveCollection] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [studentTab, setStudentTab] = useState<'study' | 'quiz'>('study');

  // Fetch student access notes collections
  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/student/notes-extractions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const startQuiz = (col: any) => {
    if (!col.questions || col.questions.length === 0) {
      toast('Oops', 'This notes set has no compiled questions yet.', 'info');
      return;
    }
    setActiveCollection(col);
    setStudentTab(col.expanded_note ? 'study' : 'quiz');
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setCorrectAnswersCount(0);
    setQuizFinished(false);
  };

  const selectOption = (optKeyword: string) => {
    if (selectedOption !== null) return; // Answered already
    setSelectedOption(optKeyword);
    
    const correctVal = activeCollection.questions[currentQuestionIdx].correct_option;
    if (optKeyword === correctVal) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    const isLast = currentQuestionIdx === activeCollection.questions.length - 1;
    if (isLast) {
      setQuizFinished(true);
    } else {
      setSelectedOption(null);
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    }
  };

  const backToList = () => {
    setActiveCollection(null);
  };

  if (activeCollection) {
    const currentQ = activeCollection.questions[currentQuestionIdx];
    const totalQs = activeCollection.questions.length;
    const progressPercent = ((currentQuestionIdx + 1) / totalQs) * 100;

    return (
      <div className="max-w-2xl mx-auto p-1.5 sm:p-3">
        {/* Back Button */}
        <button 
          onClick={backToList} 
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-850 dark:hover:text-slate-250 transition-colors text-[10px] uppercase font-black tracking-widest mb-4 cursor-pointer"
        >
          <ArrowLeft size={12} />
          <span>Exit Practice</span>
        </button>

        {activeCollection.expanded_note && (
          <div className="flex border border-slate-200/60 dark:border-slate-800 p-1 bg-white dark:bg-[#070707] rounded-2xl mb-5 shadow-sm">
            <button
              onClick={() => setStudentTab('study')}
              className={`flex-1 py-3 text-[10px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                studentTab === 'study' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0c0c0c]'
              }`}
            >
              <BookOpen size={12} />
              <span>10x Study Guide</span>
            </button>
            <button
              onClick={() => setStudentTab('quiz')}
              className={`flex-1 py-3 text-[10px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                studentTab === 'quiz' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0c0c0c]'
              }`}
            >
              <HelpCircle size={12} />
              <span>CBT Practice Exam</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {studentTab === 'study' && activeCollection.expanded_note ? (
            <motion.div
              key="study-mode"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 p-5 sm:p-7 rounded-2xl shadow-sm space-y-6"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4 text-left">
                <span className="text-[8px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                  Qwen Classroom study series
                </span>
                <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide mt-2 line-clamp-2">
                  {activeCollection.title}
                </h3>
              </div>

              <StudyGuideRenderer content={activeCollection.expanded_note} />

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex justify-end">
                <button
                  onClick={() => setStudentTab('quiz')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/15 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Begin CBT Practice</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ) : !quizFinished ? (
            <motion.div
              key="active-question-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Header Info */}
              <div className="border-b border-slate-100 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  <span className="truncate max-w-[200px]">{activeCollection.title}</span>
                  <span>Question {currentQuestionIdx + 1} of {totalQs}</span>
                </div>
                {/* Horizontal progress bar */}
                <div className="h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="p-5 sm:p-6 space-y-5 text-left">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 leading-relaxed">
                  {currentQ.text}
                </h4>

                {/* Option Blocks */}
                <div className="space-y-2.5">
                  {['a', 'b', 'c', 'd'].map(opt => {
                    const optKey = `option_${opt}`;
                    const isSelected = selectedOption === optKey;
                    const isCorrectOption = currentQ.correct_option === optKey;
                    
                    let blockStyle = "border-slate-100 dark:border-slate-900 bg-slate-50/40 dark:bg-black/30 hover:border-slate-200 dark:hover:border-slate-800";
                    let optionCircleStyle = "bg-slate-100 dark:bg-slate-900 text-slate-400";

                    if (selectedOption !== null) {
                      if (isCorrectOption) {
                        blockStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400";
                        optionCircleStyle = "bg-emerald-500 text-white";
                      } else if (isSelected) {
                        blockStyle = "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-400";
                        optionCircleStyle = "bg-red-500 text-white";
                      } else {
                        blockStyle = "opacity-50 border-slate-100 dark:border-slate-950 bg-transparent text-slate-400";
                      }
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => selectOption(optKey)}
                        disabled={selectedOption !== null}
                        className={`w-full p-3.5 sm:p-4 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-3 cursor-pointer ${blockStyle}`}
                      >
                        <div className={`w-6 h-6 rounded-lg text-[9px] font-black uppercase flex items-center justify-center shrink-0 ${optionCircleStyle}`}>
                          {opt}
                        </div>
                        <div className="flex-1 min-w-0">{currentQ[opt]}</div>
                        {selectedOption !== null && isCorrectOption && <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />}
                        {selectedOption !== null && isSelected && !isCorrectOption && <XCircle size={15} className="text-red-550 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Detailed Solution Explanation Reveal */}
                <AnimatePresence>
                  {selectedOption !== null && currentQ.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/5 rounded-2xl flex gap-3 text-left"
                    >
                      <HelpCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500">Step-by-step Solution Key</span>
                        <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                          {currentQ.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Button */}
                {selectedOption !== null && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleNext}
                      className="px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>
                        {currentQuestionIdx === totalQs - 1 ? 'Finish Challenge' : 'Next Question'}
                      </span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 p-8 rounded-3xl shadow-sm text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                <div className="relative w-full h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center">
                  <Award size={36} className="text-blue-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-800 dark:text-slate-200">
                  Practice Round Concluded
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">
                  {activeCollection.title}
                </p>
              </div>

              {/* Score breakdown bar */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-black/30">
                <div className="text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Score</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {Math.round((correctAnswersCount / totalQs) * 100)}%
                  </p>
                </div>
                <div className="text-center border-l border-slate-100 dark:border-slate-900">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Correct Answers</span>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {correctAnswersCount} / {totalQs}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={backToList}
                  className="flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Return to List
                </button>
                <button
                  onClick={() => startQuiz(activeCollection)}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={13} />
                  <span>Retry Practice</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-1.5">
      <div className="border border-blue-500/15 bg-blue-500/5 p-4 rounded-2xl flex gap-3.5 text-left">
        <Sparkles className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-400">Notes MCQ Hub</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-medium">
            Review detailed medical syllabus topics uploaded and compiled by your instructors. These practice mock quizzes offer interactive instant feedback and comprehensive step-by-step guides for reinforcing exam materials.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left mb-3">
          Available Notes Mock Worksheets
        </h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
            <p className="text-[10px] uppercase font-bold tracking-wider">Syncing database collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-[#070707] space-y-2">
            <BookMarked className="mx-auto text-slate-350 dark:text-slate-800" size={32} />
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">No syllabus worksheets uploaded yet</p>
            <p className="text-[9px] text-slate-400/80 max-w-xs mx-auto">
              Tell your admin or tutors to compile notes materials into MCQs via their dashboard workspace!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map(col => (
              <div 
                key={col._id}
                className="p-4 bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-850 rounded-2xl flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-750 transition-all text-left relative overflow-hidden group shadow-sm"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500 transition-colors">
                    {col.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider font-extrabold text-slate-450">
                      <BookOpen size={9} className="text-slate-400 shrink-0" />
                      <span>{col.questions?.length || 0} MCQs</span>
                    </div>
                    {col.expanded_note && (
                      <div className="flex items-center gap-0.5 text-[8px] uppercase tracking-wider font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                        <Sparkles size={8} />
                        <span>10x Notes + Diagrams</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => startQuiz(col)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-sm shadow-slate-100 dark:shadow-none"
                >
                  <span>Practice</span>
                  <ChevronRight size={11} className="shrink-0" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
