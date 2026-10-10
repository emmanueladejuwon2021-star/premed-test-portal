import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext, Course } from '../context/AppContext';
import { Award, Trophy, Medal, Loader2, BookMarked, BarChart3, Users, ChevronRight, GraduationCap, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface LeaderboardEntry {
  matric_no: string;
  department: string;
  percentage: number;
  grade: string;
  attempts?: number;
}

import DashboardLayout from '../components/DashboardLayout';

export default function LeaderboardView() {
  const { student } = useAppContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'rankings' | 'departments' | 'analytics'>('rankings');

  useEffect(() => {
    fetch('/api/courses')
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      })
      .then(data => {
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(data[0].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      setLoading(true);
      fetch(`/api/leaderboard/${selectedCourseId}`)
        .then(res => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
            return [];
          }
          return res.json().catch(() => []);
        })
        .then(data => {
          if (!Array.isArray(data)) {
            setLeaderboard([]);
            setLoading(false);
            return;
          }
          const aggregated = data.reduce((acc, current) => {
            if (!acc[current.matric_no]) {
              acc[current.matric_no] = { ...current, sumPercentage: current.percentage, count: 1 };
            } else {
              acc[current.matric_no].sumPercentage += current.percentage;
              acc[current.matric_no].count += 1;
            }
            return acc;
          }, {} as Record<string, any>);

          const finalLeaderboard = Object.values(aggregated).map((e: any) => ({
            ...e,
            percentage: e.sumPercentage / e.count,
            attempts: e.count
          })).sort((a, b) => b.percentage - a.percentage);

          setLeaderboard(finalLeaderboard);
          setLoading(false);
        })
        .catch(() => {
          setLeaderboard([]);
          setLoading(false);
        });
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const distributionData = [
    { range: '0-40%', count: leaderboard.filter(e => e.percentage < 40).length },
    { range: '40-60%', count: leaderboard.filter(e => e.percentage >= 40 && e.percentage < 60).length },
    { range: '60-80%', count: leaderboard.filter(e => e.percentage >= 60 && e.percentage < 80).length },
    { range: '80-100%', count: leaderboard.filter(e => e.percentage >= 80).length },
  ];

  const averageScore = leaderboard.length > 0 
    ? Math.round(leaderboard.reduce((acc, curr) => acc + curr.percentage, 0) / leaderboard.length)
    : 0;

  const myRank = leaderboard.findIndex(e => e.matric_no === student?.matric_no);

  return (
    <DashboardLayout viewTitle="Leaderboard">
      <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto pb-20 px-2 sm:px-0">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/50 dark:border-slate-800/50 relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-tight flex items-center gap-3">
              <Award className="text-blue-600 dark:text-blue-400" /> Leaderboard
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">
              Cohort standings and performance distribution matrix.
            </p>
          </div>
          
          {/* Internal Tabs */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
             {(['rankings', 'departments', 'analytics'] as const).map(tab => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === tab ? 'bg-white dark:bg-[#050505] text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent'}`}
               >
                 {tab}
               </button>
             ))}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 2xl:gap-10">
          
          {/* Modules Filter - Compact Side List */}
          <div className="lg:col-span-4 shrink-0 space-y-4">
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1 flex items-center gap-1.5">
               <BookMarked size={12} /> Assessed Modules
             </div>
             <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible custom-scrollbar pb-2 lg:pb-0">
               {courses.length === 0 && (
                 <div className="text-[10px] text-slate-400 italic">No modules available</div>
               )}
               {courses.map((course) => (
                 <button
                   key={`ld_course_opt_${course.id || course._id}`}
                   onClick={() => setSelectedCourseId(course.id)}
                   className={`p-4 rounded-[1.2rem] flex items-center justify-between gap-3 transition-all shrink-0 lg:shrink w-[220px] lg:w-full border text-left group ${
                     selectedCourseId === course.id
                       ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-transparent text-white shadow-lg shadow-blue-500/20'
                       : 'bg-white dark:bg-[#070707] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-sm'
                   }`}
                 >
                   <div className="flex-1 min-w-0">
                      <div className={`font-black text-xs uppercase tracking-tight truncate mb-0.5 ${selectedCourseId === course.id ? 'opacity-100' : 'text-slate-900 dark:text-white'}`}>{course.code}</div>
                      <div className={`text-[9px] uppercase tracking-widest font-bold truncate ${selectedCourseId === course.id ? 'text-blue-200' : 'text-slate-500 dark:text-slate-500'}`}>{course.title}</div>
                   </div>
                   <ChevronRight size={14} className={selectedCourseId === course.id ? 'opacity-100' : 'opacity-30 group-hover:opacity-100 group-hover:text-blue-500'} />
                 </button>
               ))}
             </div>
          </div>

          <div className="lg:col-span-8 flex flex-col min-w-0">
             <div className="bg-white dark:bg-[#030303] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4 sm:p-8 shadow-sm flex-1 overflow-hidden relative">
                
                <AnimatePresence mode="wait">
                  {selectedCourse?.results_hidden ? (
                     <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center p-8 bg-slate-50/80 dark:bg-slate-900/30 backdrop-blur-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-center space-y-4 h-full min-h-[400px]">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                          <Trophy size={32} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Rankings Withheld</div>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 max-w-xs mt-1 uppercase tracking-widest">Results are currently locked by the administrator.</p>
                        </div>
                     </motion.div>
                  ) : loading ? (
                     <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full min-h-[400px] text-blue-500 space-y-4">
                       <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}><Loader2 size={28} /></motion.div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white dark:bg-[#030303] px-2">Aggregating Data</div>
                     </motion.div>
                  ) : activeTab === 'rankings' ? (
                     <motion.div key="rankings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full space-y-6">
                       {leaderboard.length === 0 ? (
                            <div className="bg-slate-50/80 dark:bg-[#070707] border border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                             <Award size={32} className="text-slate-300 dark:text-slate-600 opacity-50" />
                             <div className="text-center">
                               <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">No Ranks Available</div>
                               <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Be the first to finish this test.</p>
                             </div>
                         </div>
                       ) : (
                         <>
                           {/* Highlight Current User Position */}
                           <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 rounded-[1.5rem] p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
                              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/10 to-transparent blur-xl" />
                              <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 <div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5"><Users size={12} /> Your Position</div>
                                    {myRank > -1 ? (
                                      <div className="flex items-baseline gap-2">
                                         <div className="text-3xl font-black italic tracking-tighter text-blue-700 dark:text-blue-300 leading-none">
                                           <span className="text-lg font-medium opacity-50 mr-0.5">#</span>{myRank + 1}
                                         </div>
                                         <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/70">/ {leaderboard.length} Peers</span>
                                      </div>
                                    ) : (
                                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Unranked</div>
                                    )}
                                 </div>
                                 <div className="flex gap-6 sm:border-l sm:border-blue-200/50 dark:sm:border-blue-800/50 sm:pl-6">
                                    <div>
                                       <div className="text-[8px] font-black uppercase tracking-widest text-blue-500/70 dark:text-blue-400/60 mb-1">Cohort Mean</div>
                                       <div className="text-lg font-black italic tracking-tighter text-slate-800 dark:text-slate-200 leading-none">{Math.round(averageScore)}<span className="text-[10px] opacity-70">%</span></div>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Staggered Podium Block for Top 3 candidates */}
                           <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-1 pb-1">
                             {/* 2nd Place */}
                             {leaderboard[1] ? (
                               <motion.div 
                                 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                 className="bg-slate-50/50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center text-center relative h-[105px] sm:h-[130px] justify-end shadow-sm"
                               >
                                 <div className="absolute -top-3 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-350 dark:border-slate-700 flex items-center justify-center shadow-md">
                                   <Medal size={12} className="text-slate-400" />
                                 </div>
                                 <div className="font-mono text-[9px] sm:text-xs font-black text-slate-800 dark:text-slate-200 truncate w-full">{leaderboard[1].matric_no}</div>
                                 <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest truncate w-full mt-0.5 select-none opacity-40 font-mono">
                                   {leaderboard[1].matric_no === student?.matric_no ? student?.department : 'Candidate'}
                                 </div>
                                 <div className="text-xs sm:text-base font-black italic tracking-tighter text-slate-700 dark:text-slate-300 mt-1">
                                   {Math.round(leaderboard[1].percentage)}%
                                 </div>
                                 <div className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mt-0.5">Silver</div>
                               </motion.div>
                             ) : (
                               <div className="bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-[105px] flex items-center justify-center text-[9px] text-slate-400 uppercase font-black">Open</div>
                             )}

                             {/* 1st Place */}
                             {leaderboard[0] ? (
                               <motion.div 
                                 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                 className="bg-gradient-to-b from-amber-500/5 to-amber-500/10 dark:from-yellow-500/5 dark:to-yellow-500/10 border-2 border-amber-500/30 dark:border-yellow-500/20 rounded-2xl p-2 flex flex-col items-center text-center relative h-[120px] sm:h-[150px] justify-end shadow-lg shadow-yellow-500/5"
                               >
                                 <div className="absolute -top-4 w-8 h-8 rounded-full bg-amber-500 dark:bg-yellow-500 text-white flex items-center justify-center shadow-lg ring-4 ring-amber-500/10 dark:ring-yellow-500/10">
                                   <Trophy size={14} className="text-white animate-bounce" />
                                 </div>
                                 <div className="font-mono text-[10px] font-black text-amber-700 dark:text-yellow-400 truncate w-full">{leaderboard[0].matric_no}</div>
                                 <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest truncate w-full mt-0.5 select-none opacity-40 font-mono">
                                   {leaderboard[0].matric_no === student?.matric_no ? student?.department : 'Champion'}
                                 </div>
                                 <div className="text-sm sm:text-xl font-black italic tracking-tighter text-amber-600 dark:text-yellow-400 mt-1">
                                   {Math.round(leaderboard[0].percentage)}%
                                 </div>
                                 <div className="text-[8px] font-extrabold uppercase tracking-wider text-amber-500 dark:text-yellow-500 mt-0.5 animate-pulse">Gold</div>
                               </motion.div>
                             ) : (
                               <div className="bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-[120px] flex items-center justify-center text-[9px] text-slate-400 uppercase font-black">Open</div>
                             )}

                             {/* 3rd Place */}
                             {leaderboard[2] ? (
                               <motion.div 
                                 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                 className="bg-slate-50/50 dark:bg-[#0c0c0c] border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex flex-col items-center text-center relative h-[95px] sm:h-[120px] justify-end shadow-sm"
                               >
                                 <div className="absolute -top-3 w-6 h-6 rounded-full bg-amber-800/10 text-amber-700 dark:text-amber-500 border border-amber-800/30 flex items-center justify-center shadow-md">
                                   <Medal size={12} className="text-amber-700 dark:text-amber-500" />
                                 </div>
                                 <div className="font-mono text-[9px] sm:text-xs font-black text-slate-800 dark:text-slate-200 truncate w-full">{leaderboard[2].matric_no}</div>
                                 <div className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest truncate w-full mt-0.5 select-none opacity-40 font-mono">
                                   {leaderboard[2].matric_no === student?.matric_no ? student?.department : 'Candidate'}
                                 </div>
                                 <div className="text-xs sm:text-base font-black italic tracking-tighter text-slate-705 dark:text-slate-300 mt-1">
                                   {Math.round(leaderboard[2].percentage)}%
                                 </div>
                                 <div className="text-[8px] font-extrabold uppercase tracking-wider text-amber-700 mt-0.5">Bronze</div>
                               </motion.div>
                             ) : (
                               <div className="bg-slate-50/20 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-[95px] flex items-center justify-center text-[9px] text-slate-400 uppercase font-black">Open</div>
                             )}
                           </div>

                           <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm flex-1 flex flex-col overflow-hidden">
                              <div className="flex items-center px-6 py-3 text-[9px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-black/50">
                                <div className="w-12 shrink-0">Rank</div>
                                <div className="flex-grow pl-2">Candidate</div>
                                <div className="w-20 text-right">Score</div>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                {leaderboard.map((entry, index) => {
                                  const isMe = entry.matric_no === student?.matric_no;
                                  let rankIcon: any = null;
                                  let rankStyle = '';
                                  if (index === 0) { rankIcon = <Trophy size={14}/>; rankStyle = 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'; }
                                  else if (index === 1) { rankIcon = <Medal size={14}/>; rankStyle = 'text-slate-500 bg-slate-200 dark:text-slate-300 dark:bg-slate-800'; }
                                  else if (index === 2) { rankIcon = <Medal size={14}/>; rankStyle = 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30'; }
                                  else { rankIcon = <span className="font-black italic text-[11px] w-full text-center">{index + 1}</span>; rankStyle = 'text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'; }

                                  return (
                                    <motion.div 
                                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                                      key={`ld_rank_${entry.matric_no || index}_${index}`} 
                                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all mb-1 ${isMe ? 'bg-blue-50/80 dark:bg-blue-900/20 shadow-sm ring-1 ring-blue-500/50' : 'hover:bg-slate-50 dark:hover:bg-[#0a0a0a] border border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                                    >
                                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${rankStyle}`}>
                                          {rankIcon}
                                       </div>
                                       <div className="flex-grow min-w-0">
                                          <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2 text-xs">
                                            <span className="font-mono truncate">{entry.matric_no || 'Unknown'}</span>
                                            {isMe && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase tracking-widest font-black shrink-0">You</span>}
                                          </div>
                                          <div className={`text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1 lg:mt-0.5 truncate ${!isMe ? 'blur-[4px] select-none opacity-40' : ''}`}>
                                            {entry.department || 'Hidden'}
                                          </div>
                                       </div>
                                       <div className="text-right shrink-0">
                                          <div className={`text-base font-black italic tracking-tighter leading-none ${isMe ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                            {Math.round(entry.percentage)}<span className="text-[10px] opacity-50 ml-0.5">%</span>
                                          </div>
                                       </div>
                                    </motion.div>
                                  )
                                })}
                              </div>
                           </div>
                         </>
                       )}
                   </motion.div>
                ) : activeTab === 'departments' ? (
                    <motion.div key="departments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full space-y-6">
                      {leaderboard.length === 0 ? (
                        <div className="bg-slate-50/80 dark:bg-[#070707] border border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
                           <Award size={32} className="text-slate-300 dark:text-slate-600 opacity-50" />
                           <div className="text-center">
                             <div className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">No Department Data</div>
                             <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Not enough participants to show departmental statistics.</p>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm flex-1 flex flex-col p-6">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                             <Building2 size={12} /> Departmental Rankings
                           </h3>
                           <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                             {Object.entries(leaderboard.reduce((acc, curr) => {
                               const dept = curr.department || 'Unknown';
                               if (!acc[dept]) acc[dept] = { total: 0, count: 0 };
                               acc[dept].total += curr.percentage;
                               acc[dept].count += 1;
                               return acc;
                             }, {} as Record<string, { total: number; count: number }>))
                             .map(([dept, data]) => ({ department: dept, average: data.total / data.count, participants: data.count }))
                             .sort((a, b) => b.average - a.average)
                             .map((entry, index, arr) => {
                               const maxAvg = Math.max(...arr.map(a => a.average), 1);
                               const percentageOfMax = (entry.average / maxAvg) * 100;

                               return (
                                 <motion.div 
                                   initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
                                   key={`ld_dept_${entry.department || index}`} 
                                   className="bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden"
                                 >
                                    <div className="flex justify-between items-end mb-4 relative z-10 w-full">
                                       <div className="pr-4">
                                          <div className="flex items-center gap-2 mb-1.5">
                                             <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center text-[9px] font-black">
                                               #{index + 1}
                                             </div>
                                             <h4 className="font-black uppercase text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate leading-none">{entry.department}</h4>
                                          </div>
                                          <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                                             {entry.participants} participant{entry.participants !== 1 ? 's' : ''}
                                          </div>
                                       </div>
                                       <div className="text-right shrink-0">
                                          <div className="text-2xl font-black italic tracking-tighter text-blue-600 dark:text-blue-400 leading-none">
                                            {Math.round(entry.average)}<span className="text-[10px] opacity-50 ml-0.5">%</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full h-1.5 overflow-hidden relative z-10 mt-auto">
                                       <motion.div 
                                         initial={{ width: 0 }} 
                                         animate={{ width: `${percentageOfMax}%` }}
                                         transition={{ duration: 1, delay: index * 0.1 }}
                                         className="bg-blue-500 dark:bg-blue-400 h-full rounded-full"
                                       />
                                    </div>
                                 </motion.div>
                               );
                             })}
                           </div>
                        </div>
                      )}
                    </motion.div>
                ) : (
                   <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-[500px] lg:h-full space-y-4">
                      
                      <div className="grid grid-cols-2 gap-4 h-28 shrink-0">
                         <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 p-5 rounded-[1.5rem] flex flex-col justify-center items-center shadow-sm relative overflow-hidden">
                            <Trophy size={40} className="text-amber-500/10 absolute -left-2 -bottom-2" />
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">Peak Score</div>
                            <div className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-slate-100 leading-none relative z-10">{leaderboard.length > 0 ? Math.round(leaderboard[0].percentage) : 0}<span className="text-sm opacity-50">%</span></div>
                         </div>
                         <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 p-5 rounded-[1.5rem] flex flex-col justify-center items-center shadow-sm relative overflow-hidden">
                            <BarChart3 size={40} className="text-blue-500/10 absolute -right-2 -top-2" />
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">Median Score</div>
                            <div className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-slate-100 leading-none relative z-10">
                              {leaderboard.length > 0 ? Math.round(leaderboard[Math.floor(leaderboard.length / 2)].percentage) : 0}<span className="text-sm opacity-50">%</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 p-6 rounded-[1.5rem] shadow-sm flex-1 flex flex-col min-h-0 relative">
                         <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6 shrink-0 flex items-center gap-2">
                           <BarChart3 size={12} /> Score Distribution Mapping
                         </h3>
                         <div className="flex-1 w-full min-h-0 relative -ml-4">
                           {leaderboard.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                  <XAxis dataKey="range" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                  <Tooltip 
                                    cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                  />
                                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                           ) : (
                             <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                               <BarChart3 size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                               <div className="text-xs font-black uppercase tracking-tight text-slate-400">Insufficient Data</div>
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statistical charting requires more participants.</div>
                             </div>
                           )}
                         </div>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
