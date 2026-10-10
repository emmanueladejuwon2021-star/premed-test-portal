import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  HelpCircle, 
  X, 
  CheckCircle2, 
  ChevronDown, 
  Loader2, 
  Database, 
  BookOpen, 
  BookMarked,
  Sparkles
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MathRenderer } from '../components/MathRenderer';

interface Course {
  id: string;
  code: string;
  title: string;
  questionsCount?: number;
}

interface QuestionResult {
  id: string;
  text: string;
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  ans: string;
  explanation: string;
  subject: string;
  code: string;
}

export default function QuestionSearchView() {
  const navigate = useNavigate();
  const { token } = useAppContext();

  // state variables
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const [searchScope, setSearchScope] = useState<'all' | 'question' | 'explanation' | 'topic'>('all');
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<QuestionResult | null>(null);
  const [errorText, setErrorText] = useState('');

  // load courses on mount
  useEffect(() => {
    let active = true;
    const loadCourses = async () => {
      try {
        const response = await fetch('/api/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (active) {
            // Filter unique master courses or group by course title to present a clean selection
            const uniqueCoursesMap = new Map<string, Course>();
            data.forEach((item: any) => {
              const displayTitle = item.title?.split('—')[0]?.trim() || item.title || '';
              const key = (item.code || '').toLowerCase() || displayTitle.toLowerCase();
              if (key && !uniqueCoursesMap.has(key)) {
                uniqueCoursesMap.set(key, {
                  id: item.id || item._id,
                  code: item.code || 'BIO',
                  title: displayTitle,
                  questionsCount: item.questionsCount || 0
                });
              }
            });
            const uniqueCourses = Array.from(uniqueCoursesMap.values());
            setCourses(uniqueCourses);
            if (uniqueCourses.length > 0) {
              setSelectedCourse(uniqueCourses[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load courses for search', err);
      }
    };
    loadCourses();
    return () => {
      active = false;
    };
  }, [token]);

  // handle execution of question search on demand
  const triggerSearch = async (overrideQuery?: string) => {
    const activeQuery = overrideQuery !== undefined ? overrideQuery : query;
    if (!selectedCourse) {
      setErrorText('Please select a syllabus course model before searching.');
      return;
    }

    setLoading(true);
    setErrorText('');

    try {
      const targetQuery = encodeURIComponent(activeQuery);
      const url = `/api/courses/${selectedCourse.id}/search-questions?q=${targetQuery}&scope=${searchScope}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      } else {
        setErrorText('CBT query lookup encountered a server issue.');
      }
    } catch (err) {
      console.error(err);
      setErrorText('Failed to query questions from offline pool.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on query submit or key enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      triggerSearch();
    }
  };

  const scopeLabels: Record<string, string> = {
    all: 'Search Everywhere',
    question: 'Search Question',
    explanation: 'Search Explanation',
    topic: 'Search Topic'
  };

  return (
    <DashboardLayout viewTitle="Question Search">
      <div className="flex-1 bg-[#121212] text-zinc-100 min-h-[calc(100vh-80px)] font-sans flex flex-col items-center">
        
        {/* Compact, mobile-first design wrapper */}
        <div className="w-full max-w-md px-4 py-6 flex flex-col flex-grow">
          
          {/* Custom Header Bar with Back Switch */}
          <div className="flex items-center gap-3 mb-8">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
              title="Return to Hub Dashboard"
            >
              <ArrowLeft size={16} className="text-zinc-300" />
            </button>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase font-sans">
                Question Search
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Course Selector Dropdown component */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 px-1">
                Select Course Area
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCourseDropdownOpen(!isCourseDropdownOpen);
                  setIsScopeDropdownOpen(false);
                }}
                className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-emerald-500" />
                  <span>{selectedCourse ? selectedCourse.title : 'No Course Selected'}</span>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isCourseDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-[900]"
                  >
                    <div className="max-h-60 overflow-y-auto divide-y divide-zinc-900">
                      {courses.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourse(c);
                            setIsCourseDropdownOpen(false);
                            // auto-retrigger search for the new course if query already typed
                            setTimeout(() => triggerSearch(), 100);
                          }}
                          className={`w-full text-left px-4 py-3 text-xs font-semibold flex justify-between items-center transition-colors cursor-pointer ${
                            selectedCourse?.id === c.id 
                              ? 'bg-zinc-900 text-emerald-400' 
                              : 'text-zinc-300 hover:bg-zinc-900/50'
                          }`}
                        >
                          <span className="truncate">{c.title}</span>
                          <span className="text-[10px] font-bold text-zinc-505 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg shrink-0">
                            {c.code}
                          </span>
                        </button>
                      ))}
                      {courses.length === 0 && (
                        <div className="p-4 text-center text-xs text-zinc-500 font-bold uppercase">
                          No available courses loaded
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Scope / Filter Selector Dropdown */}
            <div className="relative">
              <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1.5 px-1">
                Filter Scope
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsScopeDropdownOpen(!isScopeDropdownOpen);
                  setIsCourseDropdownOpen(false);
                }}
                className="w-full px-4 py-3 bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl flex items-center justify-between text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Filter size={14} className="text-zinc-400" />
                  <span>{scopeLabels[searchScope]}</span>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isScopeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isScopeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-[900]"
                  >
                    <div className="divide-y divide-zinc-900">
                      {(Object.keys(scopeLabels) as Array<'all' | 'question' | 'explanation' | 'topic'>).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setSearchScope(s);
                            setIsScopeDropdownOpen(false);
                            // auto-retrigger with new scope
                            setTimeout(() => triggerSearch(), 100);
                          }}
                          className={`w-full text-left px-5 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                            searchScope === s 
                              ? 'bg-zinc-900 text-blue-400' 
                              : 'text-zinc-300 hover:bg-zinc-900/50'
                          }`}
                        >
                          {scopeLabels[s]}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Premium Under-lined Search Query Box exactly like Mockup screenshot */}
            <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 shadow-sm relative z-10">
              <div className="flex items-center gap-3 relative pb-2 border-b border-zinc-800">
                <input
                  type="text"
                  placeholder="Type your question"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none text-xs font-semibold text-white placeholder-zinc-500 focus:outline-none focus:ring-0 pr-10"
                />
                <button
                  onClick={() => triggerSearch()}
                  className="absolute right-0 p-1 bg-transparent border-none hover:text-white transition-colors cursor-pointer"
                >
                  <Search size={16} className="text-zinc-400" />
                </button>
              </div>
            </div>

          </div>

          {/* Results List Area */}
          <div className="mt-6 flex-grow flex flex-col">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3.5 px-1 flex items-center justify-between">
              <span>CBT MATCHES</span>
              <span>{results.length} found</span>
            </h3>

            {errorText && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold p-4 rounded-2xl flex items-center gap-2 mb-4">
                <span>{errorText}</span>
              </div>
            )}

            <div className="space-y-3 flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 text-xs font-bold uppercase tracking-wider gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span>Searching past questions...</span>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 p-6 border border-dashed border-zinc-800 bg-zinc-900/30 rounded-2xl text-center">
                  <BookMarked size={32} className="text-zinc-700 mb-3" />
                  <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">No matched questions</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[240px] leading-relaxed font-semibold">
                    Select a course, type key clinical terms or question pieces, and click Search.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {results.slice(0, 100).map((q) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setActiveQuestion(q)}
                      className="p-4 bg-zinc-900/80 border border-zinc-800/60 rounded-2xl hover:border-zinc-700 active:bg-zinc-900 cursor-pointer select-none transition-all"
                    >
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                        <span className="text-emerald-500 font-extrabold max-w-[150px] truncate">{q.subject}</span>
                        <span>{q.code}</span>
                      </div>
                      <p className="text-xs text-white leading-relaxed font-semibold line-clamp-3">
                        <MathRenderer text={q.text} />
                      </p>
                      
                      {/* Interactive hint */}
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-900 text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        <span className="flex items-center gap-1"><Sparkles size={10} className="text-blue-500" /> Tap for Options & Solutions</span>
                        <span className="text-zinc-650 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[8px]">
                          Ans: {q.ans?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {results.length > 100 && (
                    <div className="text-center py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                      Showing top 100 matches
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Question Solutions Modal Overlay exactly as requested */}
        <AnimatePresence>
          {activeQuestion && (
            <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm flex flex-col max-h-[90vh] shadow-2xl overflow-hidden text-zinc-100"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-zinc-900 bg-zinc-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="text-blue-500" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      {activeQuestion.code} • Option & Solution
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveQuestion(null)}
                    className="p-1 rounded-full hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Modal Scroll content */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  
                  {/* Subject Tag */}
                  <div className="inline-block px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                    {activeQuestion.subject}
                  </div>

                  {/* Question Title */}
                  <p className="text-xs text-white leading-relaxed font-semibold">
                    <MathRenderer text={activeQuestion.text} />
                  </p>

                  {/* Question Options */}
                  <div className="space-y-2 mt-2">
                    {[
                      { key: 'A', value: activeQuestion.optA },
                      { key: 'B', value: activeQuestion.optB },
                      { key: 'C', value: activeQuestion.optC },
                      { key: 'D', value: activeQuestion.optD }
                    ].map((opt) => {
                      const isCorrect = activeQuestion.ans?.toUpperCase() === opt.key;
                      return (
                        <div 
                          key={opt.key}
                          className={`p-3 border rounded-xl text-xs font-semibold flex items-start gap-2.5 transition-all ${
                            isCorrect 
                              ? 'bg-blue-900/20 border-blue-500/40 text-blue-200 shadow-sm' 
                              : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
                          }`}
                        >
                          <span className={`w-5 h-5 flex items-center justify-center border text-[9px] font-black rounded-md shrink-0 ${
                            isCorrect 
                              ? 'bg-blue-600 border-transparent text-white' 
                              : 'bg-zinc-950 border-zinc-850 text-zinc-520'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="leading-tight"><MathRenderer text={opt.value || 'N/A'} /></span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanatory Solution Section */}
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl relative overflow-hidden mt-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full" />
                    
                    <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-black uppercase tracking-wider mb-2 relative z-10">
                      <CheckCircle2 size={12} /> Solution Explanation
                    </div>
                    
                    <p className="text-[11px] text-zinc-350 leading-relaxed font-semibold relative z-10 select-text">
                      <MathRenderer text={activeQuestion.explanation || 'No pedagogical breakdown available for this model.'} />
                    </p>
                  </div>

                </div>

                {/* Modal Footer Dismiss button */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-900/20">
                  <button
                    onClick={() => setActiveQuestion(null)}
                    type="button"
                    className="w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all text-[10px] font-black uppercase text-white tracking-wider rounded-xl cursor-pointer"
                  >
                    Close Solution
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
