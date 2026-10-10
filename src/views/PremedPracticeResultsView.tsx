import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, RotateCcw, CheckCircle2, ChevronRight, BookOpen, Clock, 
  HelpCircle, ArrowLeft, BarChart3, ChevronDown, Check, X, ShieldAlert, 
  FileText, Brain, Sparkles, AlertTriangle, TrendingUp, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';
import { MathRenderer } from '../components/MathRenderer';

interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  diagram_url?: string;
  explanation?: string;
}

interface CourseComp {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  questions: Question[];
}

interface SubjectResult {
  courseId: string;
  sessionId: string;
  resultId: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  topicBreakdown: Array<{ topic: string; score: number }>;
  correctOptionsMap: Record<string, string>;
}

// Custom simple client-side markdown formatter for AI advice box
function FormattedMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-3.5 text-xs sm:text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 font-medium select-text">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        
        // Headers
        if (trimmed.startsWith('####')) {
          return (
            <h5 key={idx} className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-4 mb-2">
              {trimmed.replace(/^####\s*/, '')}
            </h5>
          );
        }
        if (trimmed.startsWith('###')) {
          return (
            <h4 key={idx} className="text-sm font-black uppercase tracking-tight text-slate-905 dark:text-white mt-5 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-500" />
              {trimmed.replace(/^###\s*/, '')}
            </h4>
          );
        }
        if (trimmed.startsWith('##')) {
          return (
            <h3 key={idx} className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white mt-6 mb-3">
              {trimmed.replace(/^##\s*/, '')}
            </h3>
          );
        }

        // List items
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const content = trimmed.substring(1).trim();
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-500 font-bold shrink-0 mt-1">•</span>
              <span>{parseBoldText(content)}</span>
            </div>
          );
        }
        
        // Ordered lists
        if (/^\d+\./.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s*/, '');
          const match = trimmed.match(/^\d+/);
          const num = match ? match[0] : '1';
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0 font-black mt-0.5">
                {num}
              </span>
              <span>{parseBoldText(content)}</span>
            </div>
          );
        }

        return <p key={idx}>{parseBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

// Function to handle bold items like **text**
function parseBoldText(content: string) {
  const parts = content.split('**');
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} className="font-bold text-slate-950 dark:text-white">{part}</strong>;
    }
    return part;
  });
}

export default function PremedPracticeResultsView() {
  const navigate = useNavigate();
  const [resultsData, setResultsData] = useState<{
    results: SubjectResult[];
    testMode: 'practice' | 'mock' | 'study';
    courses: CourseComp[];
    studentAnswers: Record<string, string>;
  } | null>(null);

  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Question review filters and states
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [questionFilter, setQuestionFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  // AI Diagnostic Coaching Panel States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    // Intercept back navigation and take them straight to dashboard (home page)
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      navigate('/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    const raw = localStorage.getItem('FCF_PracticeResults');
    if (!raw) {
      toast('Oops', 'No available result was found for the current practice session.', 'info');
      navigate('/practice');
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setResultsData(parsed);
      
      if (parsed.results?.length > 0) {
        setActiveCourseId(parsed.results[0].courseId);
      }
      setLoading(false);
    } catch (e) {
      toast('Corrupted Data', 'Trouble displaying grading breakdown.', 'error');
      navigate('/practice');
    }
  }, [navigate]);

  const toggleExpandQuestion = (id: string) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConsultAI = async () => {
    if (!resultsData || generatingAI) return;
    setGeneratingAI(true);
    setAiReport(null);

    const activeToken = localStorage.getItem('FCF_Token');
    try {
      const res = await fetch('/api/simulation/multicourse-ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          results: resultsData.results,
          testMode: resultsData.testMode,
          courses: resultsData.courses.map(c => ({
            courseId: c.courseId,
            courseTitle: c.courseTitle,
            courseCode: c.courseCode
          }))
        })
      });

      if (!res.ok) {
        throw new Error('Analyst response error');
      }

      const data = await res.json();
      setAiReport(data.advice || "No advice formulated by clinical coach system.");
      toast('Advisor Ready', 'Dynamic clinical board prep diagnosis assembled!', 'success');
    } catch (err: any) {
      console.error(err);
      toast('Consultation Failed', 'Trouble connecting to clinical diagnostic server. Try again.', 'error');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading || !resultsData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tabulating composite assessment metrics...</span>
      </div>
    );
  }

  // Calculate sum average metrics
  const totalCorrect = resultsData.results.reduce((acc, r) => acc + r.score, 0);
  const totalQuestionsSum = resultsData.results.reduce((acc, r) => acc + r.total, 0);
  const compositePercentage = Math.round((totalCorrect / (totalQuestionsSum || 1)) * 100);

  // Parse strengths and weaknesses
  const strongZones = resultsData.results.filter(r => r.percentage >= 70);
  const weakZones = resultsData.results.filter(r => r.percentage < 55);

  // Build chart format
  const chartData = resultsData.results.map(r => {
    const meta = resultsData.courses.find(c => c.courseId === r.courseId);
    return {
      name: meta?.courseCode || 'Syllabus',
      score: r.percentage,
      title: meta?.courseTitle ? meta.courseTitle.split('—')[0] : 'Subject',
      correct: r.score,
      total: r.total
    };
  });

  // Active course context
  const activeResultObj = resultsData.results.find(r => r.courseId === activeCourseId);
  const activeCourseMeta = resultsData.courses.find(c => c.courseId === activeCourseId);
  const questionsList = activeCourseMeta?.questions || [];

  // Filter questions dynamically
  const filteredQuestions = questionsList.filter((q) => {
    const studentAns = resultsData.studentAnswers[q.id];
    const correctAns = activeResultObj?.correctOptionsMap[q.id];
    const isCorrect = studentAns === correctAns;

    if (questionFilter === 'correct') return isCorrect;
    if (questionFilter === 'incorrect') return !isCorrect;
    return true;
  });

  return (
    <DashboardLayout viewTitle="Multi-Course Evaluation report">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-full overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80 shrink-0 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-zinc-350 cursor-pointer active:scale-95 transition-all"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 tracking-widest font-mono">
                Combined Diagnostic Analysis
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight uppercase leading-none mt-1">
                Multi-Course Performance Report
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                localStorage.removeItem('FCF_PracticeResults');
                navigate('/dashboard');
              }}
              className="px-5 py-3 h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10 active:scale-98"
            >
              <CheckCircle2 size={13} />
              <span>FINISH REVIEW</span>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('FCF_PracticeResults');
                navigate('/practice');
              }}
              className="px-5 py-3 h-11 bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-200 dark:border-slate-800 hover:from-slate-750 hover:to-slate-850 text-white dark:text-zinc-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
            >
              <RotateCcw size={13} />
              <span>CONFIGURE NEW TRIAL</span>
            </button>
          </div>
        </div>

        {/* Outer scrolling workspace grid */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar pb-20">
          
          {/* Main Scoring Overview Card */}
          <div className="p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Ambient effects */}
            <div className="absolute -right-20 -top-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-[100px]" />
            <div className="absolute -left-20 -bottom-20 w-56 h-56 bg-indigo-500/10 rounded-full blur-[100px]" />

            <div className="space-y-3.5 text-center md:text-left relative z-10 max-w-lg">
              <span className="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                Multicourse CBT Synthesis Complete
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight uppercase leading-tight">
                Evaluation Diagnostic Generated
              </h2>
              <p className="text-xs text-slate-350 font-medium leading-relaxed">
                Assembled feedback indexes are generated and certified. Use the dynamic subject breakdowns and AI Coach module to isolate remaining clinical knowledge gaps.
              </p>

              {/* Status capsule grid */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {strongZones.length > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    {strongZones.length} Mastery blocks
                  </span>
                )}
                {weakZones.length > 0 ? (
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={10} />
                    {weakZones.length} Gap blocks
                  </span>
                ) : (
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    All blocks competent
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0 relative z-10 w-full md:w-auto justify-center">
              {/* Composite score circular layout */}
              <div className="relative w-28 h-28 rounded-full border-4 border-slate-800 bg-slate-950/60 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black font-mono tracking-tighter">{compositePercentage}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">Accuracy</span>
                
                {/* Visual border layout based on percentage */}
                <div 
                  className={`absolute inset-0 rounded-full border-4 scale-[1.04] pointer-events-none ${
                    compositePercentage >= 70 ? 'border-emerald-500 border-t-transparent' : compositePercentage >= 50 ? 'border-indigo-500 border-t-transparent' : 'border-rose-500 border-t-transparent'
                  }`} 
                />
              </div>

              <div className="flex flex-col items-center sm:items-start justify-center space-y-2 font-semibold text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-450" />
                  <span>{totalCorrect} / {totalQuestionsSum} Correct Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-indigo-400" />
                  <span>Evaluation Mode: {resultsData.testMode.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-cyan-400" />
                  <span>{resultsData.results.length} Syllabus Subject blocks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid: Charts on Left, AI Coach on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Recharts Performance Overview */}
            <div className="lg:col-span-7 bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-805 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <dt className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <BarChart3 size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Interactive Block Analytics</span>
                </dt>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium max-w-md pt-1 pb-4">
                  Comparative analysis of your percentage scores across the simulated courses. The horizontal line represents the standard clinical competency threshold (60%).
                </p>
              </div>

              <div className="h-56 w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={10} 
                      fontWeight="bold"
                      fontFamily="monospace"
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={9} 
                      fontWeight="bold"
                      fontFamily="monospace"
                      tickLine={false} 
                      axisLine={false} 
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 60, 75, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 text-xs shadow-xl select-none">
                              <span className="font-mono text-[9px] text-indigo-400 uppercase tracking-wider block font-black">{data.name}</span>
                              <span className="font-serif font-black uppercase text-xs block py-0.5 leading-tight">{data.title}</span>
                              <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between gap-6 text-[10px] text-slate-400 font-medium">
                                <span>Correct: <strong className="text-white font-black">{data.correct}/{data.total}</strong></span>
                                <span>Score: <strong className="text-emerald-400 font-black font-mono">{data.score}%</strong></span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => {
                        const color = entry.score >= 70 ? '#10b981' : entry.score >= 50 ? '#6366f1' : '#f43f5e';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-around gap-2 pt-4 border-t border-slate-100 dark:border-slate-850">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Mastery (&ge;70%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Competent (50-69%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Gap Category (&lt;50%)</span>
                </div>
              </div>
            </div>

            {/* Right: AI Clinical Diagnostic Coach */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900/10 via-slate-950/20 to-indigo-950/20 dark:from-[#4f46e5]/5 dark:to-slate-950 border border-slate-250 dark:border-indigo-950/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black font-mono bg-indigo-650 text-white rounded-full px-2.5 py-0.5 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={9} />
                    <span>Clinical Assistant</span>
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-indigo-400/80 font-black">
                    <Brain size={12} />
                    <span>USMLE Coach</span>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-zinc-300">
                    AI Clinical Diagnostics
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                    Consult our medical intelligence engine to analyze your topic stats, track pathophysiologic mastery profiles, and generate an exact USMLE study guide.
                  </p>
                </div>

                {/* AI Advice Output Container */}
                <div className="pt-2">
                  <AnimatePresence mode="wait">
                    {generatingAI ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="py-12 flex flex-col items-center justify-center text-center space-y-3"
                      >
                        <div className="relative">
                          <div className="w-9 h-9 border-3 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin" />
                          <Sparkles size={14} className="text-indigo-500 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 animate-pulse block">Assembling exam diagnostics...</span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block">Isolating micro-physiological failure modes</span>
                        </div>
                      </motion.div>
                    ) : aiReport ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-white/70 dark:bg-slate-950/40 border border-slate-150/40 dark:border-indigo-950/30 rounded-2xl h-64 overflow-y-auto custom-scrollbar text-left text-xs space-y-3.5 text-slate-600 dark:text-slate-350"
                      >
                        <FormattedMarkdown text={aiReport} />
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800/80 flex items-center justify-center text-indigo-500">
                          <Brain size={18} />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-black uppercase text-slate-600 dark:text-zinc-400 block">Report Coaching Available</span>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-normal max-w-[220px]">
                            Assembles complete subject profiles and compiles remediation advice.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {!aiReport && !generatingAI && (
                <button
                  onClick={handleConsultAI}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-850 dark:bg-indigo-600 dark:hover:bg-indigo-550 text-white font-black text-xs uppercase rounded-xl tracking-wider cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 mt-4"
                >
                  <Sparkles size={12} className="animate-spin duration-3000" />
                  <span>CONSULT CLINICAL COACH</span>
                </button>
              )}
            </div>

          </div>

          {/* Subject switcher tabs row */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-0.5">
              <FileText size={14} className="text-indigo-500" /> 
              <span>Review Performance by Course Block</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {resultsData.results.map((r) => {
                const isActive = r.courseId === activeCourseId;
                const meta = resultsData.courses.find(c => c.courseId === r.courseId);
                
                return (
                  <button
                    key={`res_tab_${r.courseId}`}
                    onClick={() => {
                      setActiveCourseId(r.courseId);
                      setExpandedQuestions({});
                    }}
                    className={`p-3.5 rounded-2xl text-left border flex flex-col justify-between transition-all relative overflow-hidden group select-none cursor-pointer h-24 ${
                      isActive
                        ? 'bg-gradient-to-br from-indigo-50/40 to-indigo-100/10 dark:from-slate-900/80 dark:to-indigo-950/15 border-indigo-300 dark:border-indigo-950 shadow-md shadow-indigo-950/5'
                        : 'bg-white dark:bg-slate-950/20 border-slate-205 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wider text-slate-400">
                        {meta?.courseCode}
                      </span>
                      <span className={`text-xs font-mono font-black ${
                        r.percentage >= 70 ? 'text-emerald-500' : r.percentage >= 50 ? 'text-indigo-500 dark:text-indigo-400' : 'text-rose-500'
                      }`}>
                        {r.percentage}%
                      </span>
                    </div>

                    <div className="space-y-0.5 max-w-full">
                      <span className="truncate block text-[11px] font-black text-slate-750 dark:text-white uppercase tracking-tight leading-tight">
                        {meta?.courseTitle ? meta.courseTitle.split('—')[0] : 'Subject'}
                      </span>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-450">
                        <span>{r.score} / {r.total} Items</span>
                        <span className={`px-1.5 py-0.5 rounded leading-none font-bold uppercase ${
                          r.percentage >= 70 
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300' 
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                        }`}>
                          Grade {r.grade}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Course Breakdown Details */}
          {activeResultObj && activeCourseMeta && (
            <div className="space-y-5">
              
              {/* Syllabus topic breakdown progresses */}
              <div className="p-5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-805 rounded-3xl space-y-4 text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-450 flex items-center gap-1.5 font-mono">
                  <Activity size={13} className="text-indigo-550 dark:text-indigo-400" /> 
                  <span>Topic Confidence Spectrum ({activeCourseMeta.courseCode})</span>
                </h3>

                {activeResultObj.topicBreakdown?.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-450 font-medium">
                    No individual topic breakdowns recorded for this course context.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeResultObj.topicBreakdown.map((tBreak, idx) => {
                      const isStrong = tBreak.score >= 70;
                      const isWeak = tBreak.score < 50;

                      return (
                        <div key={`tbreak_${idx}`} className="space-y-1 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                          <div className="flex items-center justify-between text-[11px] font-bold gap-3">
                            <span className="truncate uppercase text-slate-600 dark:text-slate-300 font-mono tracking-tight leading-none">
                              {tBreak.topic}
                            </span>
                            <span className={`font-mono font-black text-[10px] uppercase tracking-wider ${
                              isStrong ? 'text-emerald-550' : isWeak ? 'text-rose-550' : 'text-indigo-500 dark:text-indigo-400'
                            }`}>
                              {tBreak.score}% Accuracy
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-1.5 rounded-full bg-slate-150 dark:bg-slate-900 overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isStrong ? 'bg-emerald-500' : isWeak ? 'bg-rose-500' : 'bg-indigo-500 dark:bg-indigo-400'
                              }`}
                              style={{ width: `${tBreak.score}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step Question Review audit tools */}
              <div className="space-y-4">
                
                {/* Audit Toolbar with filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5 font-mono">
                    <HelpCircle size={14} className="text-indigo-550 dark:text-indigo-400" /> 
                    <span>CBT Item Audit Feed ({filteredQuestions.length} Questions)</span>
                  </h3>

                  {/* Filter pills tray */}
                  <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl flex items-center border border-slate-150 dark:border-slate-800">
                    <button
                      onClick={() => setQuestionFilter('all')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        questionFilter === 'all'
                          ? 'bg-white dark:bg-[#1a1a20] text-indigo-600 dark:text-indigo-400 shadow'
                          : 'text-slate-450 hover:text-slate-700 dark:hover:text-zinc-305'
                      }`}
                    >
                      All Items
                    </button>
                    <button
                      onClick={() => setQuestionFilter('correct')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        questionFilter === 'correct'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-450 hover:text-slate-705'
                      }`}
                    >
                      PASSED ({questionsList.filter(q => resultsData.studentAnswers[q.id] === activeResultObj.correctOptionsMap[q.id]).length})
                    </button>
                    <button
                      onClick={() => setQuestionFilter('incorrect')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        questionFilter === 'incorrect'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-450 hover:text-slate-705'
                      }`}
                    >
                      FAILED ({questionsList.filter(q => resultsData.studentAnswers[q.id] !== activeResultObj.correctOptionsMap[q.id]).length})
                    </button>
                  </div>
                </div>

                {filteredQuestions.length === 0 ? (
                  <div className="py-12 bg-white dark:bg-slate-950/10 border border-slate-200 dark:border-slate-805 rounded-3xl text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center mx-auto">
                      <HelpCircle size={18} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide text-slate-450 block">No matching simulated questions</span>
                    <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto leading-normal">
                      Try resetting your audit filters (e.g., choosing "All Items" to recover the master set).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQuestions.map((q, idx) => {
                      const studentAns = resultsData.studentAnswers[q.id];
                      const correctAns = activeResultObj.correctOptionsMap[q.id];
                      const isCorrect = studentAns === correctAns;
                      const isExpanded = !!expandedQuestions[q.id];

                      return (
                        <div 
                          key={`qrev_${q.id}`}
                          className="bg-white dark:bg-[#121215] border border-slate-205 dark:border-slate-805/90 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-750 transition-all text-left"
                        >
                          {/* Item Tab Collapsible Header Button */}
                          <button
                            onClick={() => toggleExpandQuestion(q.id)}
                            className="w-full p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 flex items-start justify-between gap-4 cursor-pointer select-none"
                          >
                            <div className="flex items-start gap-3">
                              {/* Index tag */}
                              <span className="font-mono text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                              
                              <div>
                                <h4 className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-150 leading-relaxed pr-1 select-text">
                                  <MathRenderer text={q.question_text.length > 140 && !isExpanded 
                                    ? `${q.question_text.substring(0, 140)}...` 
                                    : q.question_text} />
                                </h4>
                                
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    isCorrect 
                                      ? 'bg-emerald-50 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                      : 'bg-rose-50 text-rose-850 dark:bg-rose-950/40 dark:text-rose-300'
                                  }`}>
                                    {isCorrect ? <Check size={8} strokeWidth={4} /> : <X size={8} strokeWidth={4} />}
                                    {isCorrect ? 'PASSED' : 'FAILED'}
                                  </span>

                                  <span className="text-[10px] font-black text-slate-400 font-mono">
                                    Your Submission: <strong className="uppercase font-bold text-slate-650 dark:text-zinc-300 bg-slate-100 dark:bg-slate-850 px-1 py-px rounded">{studentAns ? studentAns.replace('option_', '').toUpperCase() : 'Empty'}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <ChevronDown size={14} className={`text-slate-400 shrink-0 mt-1 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Expanded detail box */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-850/60 pt-4 space-y-4">
                              
                              {/* Clinical diagrams if referenced in content */}
                              {q.diagram_url && (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden p-2.5 flex justify-center bg-slate-50/50 dark:bg-slate-900/45 max-w-sm mx-auto">
                                  <img 
                                    src={q.diagram_url} 
                                    alt="Clinical reference diagram" 
                                    className="max-h-[160px] object-contain rounded-xl" 
                                    referrerPolicy="no-referrer" 
                                  />
                                </div>
                              )}

                              {/* Candidate Key vs Answer Key mapping */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                                  const optKey = `option_${letter}` as const;
                                  const text = q[optKey];
                                  if (!text) return null;

                                  const isUserAns = optKey === studentAns;
                                  const isCorAns = optKey === correctAns;

                                  let borderStyle = 'border-slate-200 bg-slate-50/20 dark:border-slate-850 dark:bg-slate-950/5 text-slate-600 dark:text-slate-400';
                                  if (isCorAns) {
                                    borderStyle = 'border-emerald-305 bg-emerald-500/5 text-emerald-805 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300';
                                  } else if (isUserAns) {
                                    borderStyle = 'border-rose-300 bg-rose-500/5 text-rose-805 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300';
                                  }

                                  return (
                                    <div 
                                      key={`rev_opt_${letter}`}
                                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 font-medium ${borderStyle}`}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden select-text">
                                        <span className="font-mono font-black uppercase text-[10px] shrink-0 text-slate-400">({letter})</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-100"><MathRenderer text={text || ""} /></span>
                                      </div>

                                      <div className="flex gap-1.5 shrink-0 select-none">
                                        {isCorAns && (
                                          <span className="px-2 py-0.5 text-[8px] font-mono leading-none bg-emerald-600 text-white rounded font-bold uppercase tracking-widest">
                                            CORRECT KEY
                                          </span>
                                        )}
                                        {!isCorAns && isUserAns && (
                                          <span className="px-2 py-0.5 text-[8px] font-mono leading-none bg-rose-600 text-white rounded font-bold uppercase tracking-widest">
                                            SUBMITTED
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Clinical Rational / Rationale textbook cytation block */}
                              {q.explanation && (
                                <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-950/35 rounded-2xl flex items-start gap-3">
                                  <FileText size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                  <div className="text-left text-xs">
                                    <span className="font-black text-indigo-700 dark:text-indigo-450 uppercase tracking-widest block mb-1 font-mono text-[9px]">
                                      Physiologic & Clinical Explanation
                                    </span>
                                    <p className="leading-relaxed text-slate-600 dark:text-slate-350 font-medium whitespace-pre-wrap select-text">
                                      <MathRenderer text={q.explanation} />
                                    </p>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </DashboardLayout>
  );
}
