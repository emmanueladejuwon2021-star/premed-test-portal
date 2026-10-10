import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookMarked, ChevronRight, FileText, Search, Info, AlertTriangle, Clock,
  FlaskConical, Microscope, Zap, Ruler, PawPrint, Calculator, Brain, Database,
  TrendingUp, Target, Award, PlayCircle, Folder, FolderOpen, ChevronLeft, Calendar, Lock, Sword
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';
import { formatToWAT } from '../lib/dateUtils';

const Icons = {
  FlaskConical, Microscope, Zap, Ruler, PawPrint, Calculator, Brain, BookMarked, Database
};

const getCourseCreationDate = (course: any) => {
  if (course.created_at) return new Date(course.created_at);
  if (course.createdAt) return new Date(course.createdAt);
  
  const idStr = String(course.id || course._id || '');
  if (idStr.length === 24) {
    const timestampSec = parseInt(idStr.substring(0, 8), 16);
    if (!isNaN(timestampSec)) {
      return new Date(timestampSec * 1000);
    }
  }
  if (course.scheduled_date) {
    return new Date(course.scheduled_date);
  }
  return new Date();
};

const getWeekForCourse = (course: any) => {
  const date = getCourseCreationDate(course);
  const time = date.getTime();
  
  const wk1Start = new Date("2026-05-10T00:00:00").getTime();
  const wk1End = new Date("2026-05-17T23:59:59").getTime();
  
  const wk2Start = new Date("2026-05-18T00:00:00").getTime();
  const wk2End = new Date("2026-05-24T23:59:59").getTime();
  
  const wk3Start = new Date("2026-05-25T00:00:00").getTime();
  const wk3End = new Date("2026-05-31T23:59:59").getTime();
  
  if (time >= wk1Start && time <= wk1End) {
    return { number: 1, label: "Week 1", range: "May 10 to May 17" };
  }
  if (time >= wk2Start && time <= wk2End) {
    return { number: 2, label: "Week 2", range: "May 18 to May 24" };
  }
  if (time >= wk3Start && time <= wk3End) {
    return { number: 3, label: "Week 3", range: "May 25 to May 31" };
  }
  
  if (time < wk1Start) {
    return { number: 1, label: "Week 1", range: "May 10 to May 17" };
  }
  
  const anchorTime = new Date("2026-06-01T00:00:00").getTime();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  
  const diffMs = time - anchorTime;
  const index = Math.floor(diffMs / msPerWeek);
  const wkNumber = 4 + index;
  
  const wkStart = new Date(anchorTime + index * msPerWeek);
  const wkEnd = new Date(anchorTime + (index + 1) * msPerWeek - 1);
  
  const formatOption: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const rangeStr = `${wkStart.toLocaleDateString('en-US', formatOption)} to ${wkEnd.toLocaleDateString('en-US', formatOption)}`;
  
  return { number: wkNumber, label: `Week ${wkNumber}`, range: rangeStr };
};

export default function StudentDashboard() {
  const { student, setSelectedCourse, setTestResult } = useAppContext();
  const [courses, setCourses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hasSeen = localStorage.getItem('FCF_HasSeenOnboarding');
    if (!hasSeen) {
      setShowOnboarding(true);
    }

    Promise.all([
      fetch('/api/courses').then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      }),
      fetch('/api/results/history', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` }
      }).then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      })
    ]).then(([coursesData, historyData]) => {
      setCourses(coursesData);
      setHistory(historyData);
      setLoading(false);
      setLoadingHistory(false);
    }).catch(() => {
      setLoading(false);
      setLoadingHistory(false);
    });

    setSelectedCourse(null);
    setTestResult(null);

    // Background polling interface for live, instant updates with active admin nodes
    const pollInterval = setInterval(() => {
      Promise.all([
        fetch('/api/courses').then(res => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
          return res.json().catch(() => null);
        }),
        fetch('/api/results/history', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` }
        }).then(res => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
          return res.json().catch(() => null);
        })
      ]).then(([coursesData, historyData]) => {
        if (coursesData) setCourses(coursesData);
        if (historyData) setHistory(historyData);
      }).catch(() => {});
    }, 4000); // 4-second instant-sync frequency

    return () => clearInterval(pollInterval);
  }, [setSelectedCourse, setTestResult]);

  const handleSelectCourse = (course: any) => {
    const isCombat = course.title?.toLowerCase().includes('combat') || course.code?.toLowerCase().includes('combat');
    if (isCombat) {
      toast('Combat Protocol Offline', 'Med Combat will be Opened 09/06/26', 'info');
      return;
    }

    if ((course.questionsCount || 0) === 0) {
      toast('Test Unavailable', 'There are no questions assigned to this test yet.', 'error');
      return;
    }
    
    if (course.is_locked) {
      toast('Test Locked', 'This assessment is currently locked by the instructor.', 'error');
      return;
    }
    
    if (!course.force_start) {
      const now = new Date();
      if (course.scheduled_date) {
         const start = new Date(course.scheduled_date);
         if (now < start) {
           toast('Not Started', `This test starts on ${formatToWAT(start)}.`, 'error');
           return;
         }
      }
      if (course.end_date) {
         const end = new Date(course.end_date);
         if (now > end) {
           toast('Expired', `This test ended on ${formatToWAT(end)}. You can no longer participate.`, 'error');
           return;
         }
      }
    }

    setSelectedCourse(course);
    localStorage.setItem('FCF_SelectedTopics', JSON.stringify([])); 
    navigate('/config');
  };

  const filteredCourses = courses
    .filter(course => !course.is_master)
    .filter(course => 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const idA = String(a.id || a._id || '');
      const idB = String(b.id || b._id || '');
      return idB.localeCompare(idA);
    });

  // Compute stats
  const averageScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.percentage, 0) / history.length) 
    : 0;
  
  const chartData = history.slice(-7).map((h, i) => ({
    name: `Test ${i + 1}`,
    score: h.percentage,
    date: new Date(h.created_at).toLocaleDateString()
  }));

  return (
    <DashboardLayout viewTitle="Student Hub">
      <motion.div key="dashboard-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full flex flex-col pt-2 md:pt-4">
        
        {/* Condensed Welcome Section */}
        <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-black dark:from-black dark:to-slate-950 border border-slate-800 relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
           <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                 <h1 className="text-2xl md:text-3xl font-serif font-black text-white tracking-tight leading-tight">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{student?.name?.split(' ')[0] || 'Scholar'}</span>
                 </h1>
                 <p className="text-slate-400 text-xs md:text-sm leading-relaxed mix-blend-plus-lighter line-clamp-2">
                    Access your practice tests and view your results below.
                 </p>
              </div>

              {/* Ultra Compact Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 shrink-0 w-full xl:w-auto">
                 <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Taken</div>
                    <div className="text-lg font-black text-white">{history.length}</div>
                 </div>
                 <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
                    <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">Average</div>
                    <div className="text-lg font-black text-white">{averageScore}%</div>
                 </div>
                 <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm flex flex-col justify-center md:col-span-1 col-span-2">
                    <div className="text-[9px] uppercase tracking-widest text-blue-300 font-bold mb-0.5">Standing</div>
                    <div className="text-[11px] font-black text-blue-100 uppercase tracking-tight">
                      {averageScore >= 70 ? 'Excellent' : averageScore >= 50 ? 'On Track' : 'Initializing'}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Med Combat Call to Action */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
             <motion.button 
                whileHover={{ y: -5 }}
                onClick={() => (() => { toast('Combat Protocol Offline', 'Med Combat will be Opened 09/06/26', 'info'); })()}
                className="group relative h-48 rounded-[2.5rem] bg-slate-950/80 border border-slate-900/50 shadow-2xl overflow-hidden text-left cursor-not-allowed"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-600/10 transition-all duration-500" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-600 to-amber-500 opacity-40" />
                
                <div className="p-8 flex flex-col h-full justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Sword size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-[0.3em] text-amber-500 uppercase leading-none">Live Ops</span>
                            <h3 className="text-2xl font-black text-slate-300 leading-tight flex items-center gap-2">Med Combat <span className="flex items-center gap-1 text-[8px] font-black tracking-widest bg-amber-400 text-black px-1.2 py-0.5 rounded-md uppercase"><Lock size={8} strokeWidth={3} /> Locked</span></h3>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <p className="text-slate-400 text-xs font-medium max-w-[200px]">Engage in collaborative real-time medical knowledge battles.</p>
                        <div className="flex items-center gap-1.5 text-amber-500 font-black text-xs uppercase tracking-widest">
                            <span>Combat Locked</span> <Lock size={12} className="shrink-0 text-amber-500" />
                        </div>
                    </div>
                </div>
             </motion.button>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#050505] p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center text-purple-600">
                            <Target size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Score</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">85.4%</div>
                        <p className="text-[10px] font-bold text-slate-400">Average accuracy this week</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-[#050505] p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-600">
                            <Award size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rank</span>
                    </div>
                    <div className="mt-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">#12</div>
                        <p className="text-[10px] font-bold text-slate-400">Out of 450 active students</p>
                    </div>
                </div>
             </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <PlayCircle size={14} className="text-emerald-500" />
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Tests</div>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight">Available Tests</h2>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 

                type="text" 
                placeholder="Filter by code or title..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setSelectedWeekNum(null);
                  }
                }}
                className="pl-10 pr-4 py-3 w-full bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
              />
            </div>
        </div>

        <div className="flex-1 pb-12 animate-fade-in">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-40 bg-slate-200/50 dark:bg-slate-800/50 rounded-3xl animate-pulse" />)}
              </div>
            ) : (
              <div>
                <div className="mb-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Showing {filteredCourses.length} available {filteredCourses.length === 1 ? 'test' : 'tests'}
                </div>
                {filteredCourses.length === 0 ? (
                  <div className="flex flex-col justify-center items-center h-64 text-slate-400 dark:text-slate-500 bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 border-dashed rounded-[2.5rem] space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                       <FileText size={24} className="opacity-50" />
                    </div>
                    <div className="text-center">
                       <h4 className="text-sm font-black text-slate-700 dark:text-white uppercase tracking-widest">No Matches</h4>
                       <p className="text-xs font-medium mt-1 max-w-xs px-2">No tests match your filter query.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredCourses.map((course, idx) => {
                      const isEnded = course.end_date && new Date(course.end_date) < currentTime;
                      const Icon = (Icons as any)[course.icon] || BookMarked;
                      const courseWeek = getWeekForCourse(course);
                      const isCombat = course.title?.toLowerCase().includes('combat') || course.code?.toLowerCase().includes('combat');
                      const isLocked = course.is_locked || isCombat;
                      
                      return (
                          <motion.button 
                              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                              layout
                              key={`course_search_${course.id || course._id}_${idx}`}
                              onClick={() => handleSelectCourse(course)}
                              className={`group relative flex flex-col bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 text-left transition-all duration-300 hover:shadow-lg overflow-hidden ${isEnded ? 'opacity-60 saturate-50' : ''} ${isLocked ? 'opacity-70 saturate-50 hover:border-amber-500/50' : ''}`}
                          >
                              {isLocked ? (
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                              ) : (
                                <>
                                  {course.is_mock && !isEnded && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />}
                                  {!course.is_mock && !isEnded && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />}
                                </>
                              )}

                              <div className="flex justify-between items-start mb-3 relative z-10 w-full">
                                <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isLocked ? 'bg-amber-50 dark:bg-amber-600/5 border-amber-100 dark:border-amber-500/20 text-amber-600' : isEnded ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600' : 'bg-blue-50 dark:bg-blue-600/5 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 shadow-sm'}`}>
                                   <Icon size={18} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                   <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded">{courseWeek.label}</span>
                                   {isLocked ? (
                                     <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-0.5"><Lock size={8} /> Locked</span>
                                   ) : course.is_mock ? (
                                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-[9px] font-bold uppercase tracking-widest rounded">Mock</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded">Primary</span>
                                   )}
                                </div>
                              </div>

                              <div className="flex-1 relative z-10 w-full mb-3">
                                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{course.code}</div>
                                 <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2">{course.title}</h3>
                                 <div className="mt-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border border-slate-200 dark:border-slate-700 text-slate-500 bg-slate-50 dark:bg-slate-800 truncate max-w-full">
                                    {course.activeTopicName || "General Test"}
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 relative z-10 w-full mb-2">
                                 <div className="flex items-center gap-1.5">
                                    <Clock size={12} className={isLocked || isEnded ? 'text-slate-400' : 'text-emerald-500'} />
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Limit</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none mt-0.5">{course.duration} min</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <FileText size={12} className={isLocked || isEnded ? 'text-slate-400' : 'text-blue-500'} />
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Items</span>
                                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none mt-0.5">{course.question_limit || course.questionsCount || 0} Qs</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="pt-2 border-t border-slate-100 border-dashed dark:border-slate-800 relative z-10 w-full flex justify-between items-center">
                                 <div className="flex flex-col">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Timeline</span>
                                     <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                       {course.scheduled_date ? formatToWAT(course.scheduled_date, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Anytime'}
                                       {' - '}
                                       {course.end_date ? formatToWAT(course.end_date, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Open'}
                                     </span>
                                 </div>
                                 {isLocked ? (
                                    <Lock size={12} className="text-amber-500" />
                                 ) : isEnded ? (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                                       <ChevronRight size={12} className="text-slate-400" />
                                    </div>
                                 ) : (
                                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0 shadow-sm text-blue-500">
                                       <ChevronRight size={12} />
                                    </div>
                                 )}
                              </div>
                          </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#050505] rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0 shadow-inner">
                       <Info size={28} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black font-serif text-slate-900 dark:text-white tracking-tight uppercase">Platform Conduct</h2>
                      <div className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-1">Pre-med CBT Architecture</div>
                    </div>
                 </div>

                 <div className="space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                   <p className="text-base text-slate-800 dark:text-slate-200">
                     Welcome. This advanced testing environment requires your absolute compliance with academic integrity standards.
                   </p>
                   
                   <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border border-red-200 dark:border-red-900/50 rounded-3xl p-6 shadow-sm">
                       <h3 className="font-black text-red-700 dark:text-red-400 mb-4 flex items-center gap-2 uppercase tracking-tight text-base">
                           <AlertTriangle size={18} /> Zero-Tolerance Policy
                       </h3>
                       <ul className="space-y-3 text-red-800 dark:text-red-300 text-sm font-medium">
                           <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"/> Continuous AI Proctoring will analyze your camera feed.</li>
                           <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"/> Window switching, minimizing, or opening new tabs is strictly blocked.</li>
                           <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"/> Copy, paste, right-click, and specific keyboard shortcuts are locked.</li>
                           <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0"/> 3 verified security violations will permanently revoke your session.</li>
                       </ul>
                   </div>

                   <p>
                     Prepare well. Treat this practice test seriously. Your performance will be recorded when you finish.
                   </p>

                   <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                     <p className="text-xs italic text-slate-500 dark:text-slate-400">
                       Platform conceptualised and developed under the academic directive of <strong>Maximus, Director of Studies, Premed Tutorials</strong>.
                     </p>
                   </div>
                 </div>
              </div>
              
              <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                 <button 
                   onClick={() => {
                     localStorage.setItem('FCF_HasSeenOnboarding', 'true');
                     setShowOnboarding(false);
                   }}
                   className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 dark:shadow-white/10 active:scale-[0.98] transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                 >
                   I Accept and Authenticate <ChevronRight size={18} />
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

