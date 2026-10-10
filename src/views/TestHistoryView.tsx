import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { 
  ChevronLeft, History, Calendar, Award, 
  ChevronRight, BookOpen, Clock, Loader2, TrendingUp, BarChart3, Target
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { formatToWAT } from '../lib/dateUtils';
import TestAnalysisModal from '../components/TestAnalysisModal';

export default function TestHistoryView() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'30days' | 'all'>('30days');
  const { token, setTestResult } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/results/history', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      setHistory(data);
    })
    .catch(err => {
      toast('Error', 'Failed to load history', 'error');
    })
    .finally(() => setLoading(false));
  }, [token]);

  const viewResult = (result: any) => {
    setTestResult(result);
    navigate('/results');
  };

  // Determine date cutoff for the last 30 days
  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  };
  
  const thirtyDaysLimit = getThirtyDaysAgo();

  // Filter for tests within the last 30 days
  const last30DaysRecords = history.filter(record => {
    const recordDate = new Date(record.created_at);
    return recordDate >= thirtyDaysLimit;
  });

  // Compile individual trajectory data arrays chronologically (oldest on left, newest on right)
  const chartDataAll = history.slice().reverse().map((record, i) => ({
    name: `T${i + 1}`,
    score: record.percentage || Math.round((record.score / record.total) * 100),
    date: formatToWAT(record.created_at, { month: 'short', day: 'numeric' }),
    course: record.course_code || 'Test'
  }));

  const chartData30 = last30DaysRecords.slice().reverse().map((record, i) => ({
    name: `T${i + 1}`,
    score: record.percentage || Math.round((record.score / record.total) * 100),
    date: formatToWAT(record.created_at, { month: 'short', day: 'numeric' }),
    course: record.course_code || 'Test'
  }));

  // Select appropriate payload for chart rendering
  const activeChartData = timeframe === '30days' ? chartData30 : chartDataAll;

  // Compute context-aware analytical milestones
  const bestScoreAll = history.length > 0 ? Math.max(...history.map(r => r.percentage || Math.round((r.score / r.total) * 100))) : 0;
  const avgScoreAll = history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + (curr.percentage || Math.round((curr.score / curr.total) * 100)), 0) / history.length) : 0;

  const bestScore30 = last30DaysRecords.length > 0 ? Math.max(...last30DaysRecords.map(r => r.percentage || Math.round((r.score / r.total) * 100))) : 0;
  const avgScore30 = last30DaysRecords.length > 0 ? Math.round(last30DaysRecords.reduce((acc, curr) => acc + (curr.percentage || Math.round((curr.score / curr.total) * 100)), 0) / last30DaysRecords.length) : 0;

  const displayBestScore = timeframe === '30days' ? bestScore30 : bestScoreAll;
  const displayAvgScore = timeframe === '30days' ? avgScore30 : avgScoreAll;

  // Calculate high-yield trend indicator status
  let trendIndicator = "Stable";
  let trendColor = "text-slate-400";
  if (last30DaysRecords.length >= 2) {
    const scores = last30DaysRecords.slice().reverse().map(r => r.percentage || Math.round((r.score / r.total) * 100));
    const mid = Math.floor(scores.length / 2);
    const firstHalfAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalfAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    const diff = Math.round(secondHalfAvg - firstHalfAvg);
    if (diff > 0) {
      trendIndicator = `Upward (+${diff}%)`;
      trendColor = "text-emerald-400";
    } else if (diff < 0) {
      trendIndicator = `Downward (${diff}%)`;
      trendColor = "text-rose-400";
    } else {
      trendIndicator = "Consistent (0%)";
      trendColor = "text-blue-400";
    }
  } else if (last30DaysRecords.length === 1) {
    trendIndicator = "Baseline Set";
    trendColor = "text-amber-400";
  } else {
    trendIndicator = "No Data";
    trendColor = "text-slate-500";
  }

  return (
    <DashboardLayout viewTitle="Test History">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-8 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
            <History size={16} /> My Journey
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-slate-900 dark:text-slate-100">
            Performance Ledger
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Review your previous practice tests and track your growth.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-blue-500">
           <Loader2 size={48} className="animate-spin mb-4" />
           <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Retrieving Vault Records</div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-[#050505] rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
             <History size={32} />
           </div>
           <div className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">No Records Available</div>
           <p className="text-sm font-medium text-slate-500 dark:text-slate-400">You haven't completed any tests yet.</p>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-8 pb-12">
          
          <div className="xl:w-1/3 flex flex-col gap-6 shrink-0 relative z-10">
             <div className="bg-gradient-to-br from-slate-900 to-black border border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-white flex flex-col justify-between min-h-[460px]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                {/* Header with Switcher Tabs */}
                <div className="flex items-center justify-between gap-2 mb-6 relative z-15 shrink-0">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1">
                      <TrendingUp size={11} /> Score Analytics
                    </span>
                    <h3 className="text-base font-serif font-black tracking-tight text-white leading-tight uppercase">
                      {timeframe === '30days' ? '30-Day Trend' : 'All-Time Path'}
                    </h3>
                  </div>
                  
                  {/* Visual timeframe selector pills */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-0.5 flex gap-0.5 text-[8px] font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setTimeframe('30days')}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        timeframe === '30days' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-405 hover:text-white'
                      }`}
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe('all')}
                      className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                        timeframe === 'all' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-slate-405 hover:text-white'
                      }`}
                    >
                      All-Time
                    </button>
                  </div>
                </div>
                
                {/* Recharts Trend Line Rendering with Graceful Empty States */}
                <div className="flex-1 flex flex-col justify-center min-h-[190px] relative z-20 my-2">
                  {timeframe === '30days' && last30DaysRecords.length === 0 ? (
                    <div className="w-full h-44 flex flex-col items-center justify-center p-5 border border-dashed border-white/10 rounded-2.5xl bg-white/5 text-center my-auto">
                      <History size={26} className="text-blue-500/50 mb-3 animate-pulse" />
                      <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">No 30-Day Trial Found</p>
                      <p className="text-[9px] text-slate-500 mt-1 uppercase max-w-[190px] leading-relaxed font-bold">
                        Take a classroom assessment to start plotting your 30-day scores.
                      </p>
                    </div>
                  ) : activeChartData.length === 0 ? (
                    <div className="w-full h-44 flex flex-col items-center justify-center p-5 border border-dashed border-white/10 rounded-2.5xl bg-white/5 text-center my-auto">
                      <History size={26} className="text-slate-500 mb-2 animate-pulse" />
                      <p className="text-[10px] font-black uppercase text-slate-300 tracking-wider">No Scores Logged</p>
                    </div>
                  ) : (
                    <div className="h-44 w-full -ml-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeChartData}>
                          <defs>
                            <linearGradient id="colorTrajectory" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={8} 
                            tickLine={false} 
                            axisLine={false}
                            dy={6}
                          />
                          <YAxis 
                            domain={[0, 100]} 
                            stroke="#64748b" 
                            fontSize={8} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#050505', 
                              border: '1px solid #1e293b', 
                              borderRadius: '14px', 
                              color: '#fff', 
                              fontSize: '11px', 
                              fontWeight: 'bold',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#3b82f6' }}
                            cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorTrajectory)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Performance Context-Aware Statistics Grid */}
                <div className="space-y-4 pt-4 border-t border-white/5 shrink-0 relative z-15">
                  <div className="grid grid-cols-2 gap-3.5">
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 transition-all">
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                          <Award size={11} className="text-blue-500" /> Best score
                        </div>
                        <div className="text-xl font-black text-white">
                          {displayBestScore}
                          <span className="text-xs text-slate-500 font-extrabold ml-0.5">%</span>
                        </div>
                     </div>
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 transition-all">
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                          <Target size={11} className="text-emerald-500" /> Avg score
                        </div>
                        <div className="text-xl font-black text-white">
                          {displayAvgScore}
                          <span className="text-xs text-slate-500 font-extrabold ml-0.5">%</span>
                        </div>
                     </div>
                  </div>

                  {/* Dynamic Progress Trend Badge */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                     <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                       Momentum Trend
                     </div>
                     <div className={`text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full bg-slate-900 border border-white/10 ${trendColor}`}>
                       {trendIndicator}
                     </div>
                  </div>
                </div>
             </div>
          </div>

          <div className="xl:w-2/3 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2 mb-4 px-2">
              <History size={16} className="text-blue-500" /> Historical Logs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((record, i) => {
                const scorePercent = record.percentage || Math.round((record.score / record.total) * 100);
                const date = formatToWAT(record.created_at, { 
                  year: 'numeric', month: 'short', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit'
                });
                
                let scoreColor = "text-blue-600 dark:text-blue-400";
                let bgGlow = "hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]";
                let barColor = "bg-blue-500";
                
                if (scorePercent >= 70) {
                   scoreColor = "text-emerald-600 dark:text-emerald-400";
                   bgGlow = "hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                   barColor = "bg-emerald-500";
                } else if (scorePercent < 50) {
                   scoreColor = "text-red-500 dark:text-red-400";
                   bgGlow = "hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]";
                   barColor = "bg-red-500";
                }

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    onClick={() => viewResult(record)}
                    className={`group bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] cursor-pointer transition-all duration-300 hover:border-blue-500/50 hover:-translate-y-1 shadow-sm ${bgGlow} flex flex-col relative overflow-hidden`}
                  >
                     <div className={`absolute top-0 right-0 w-24 h-24 ${barColor} opacity-5 blur-2xl rounded-full`} />
                     
                     <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                              <Award size={18} className={scoreColor} />
                           </div>
                           <div className="space-y-0.5">
                              <div className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1">
                                {record.course_code || 'Test'}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                <Calendar size={10} /> {date}
                              </div>
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Final Score</div>
                           <div className={`text-xl font-black italic tracking-tight ${record.results_hidden ? 'text-slate-400' : scoreColor}`}>
                             {record.results_hidden ? 'HIDDEN' : <>{scorePercent}<span className="text-[11px] opacity-50">%</span></>}
                           </div>
                        </div>
                     </div>

                     <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden mb-4 relative z-10">
                        <motion.div 
                           initial={{ width: 0 }}
                           whileInView={{ width: `${scorePercent}%` }}
                           viewport={{ once: true }}
                           transition={{ duration: 1, delay: i * 0.1 }}
                           className={`h-full rounded-full ${barColor}`} 
                        />
                     </div>

                     <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 relative z-10">
                        <div className="flex gap-4">
                           <div>
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Items</div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{record.total}</div>
                           </div>
                           <div>
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Grade</div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{record.grade || 'N/A'}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {!record.results_hidden && (
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedResultId(record.id || record._id);
                                 setIsAnalysisOpen(true);
                               }}
                               className="px-3 py-1.5 h-8 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all border border-blue-200/50 dark:border-blue-800/40 font-mono flex items-center gap-1 hover:scale-105 active:scale-95 duration-200 shrink-0"
                             >
                               <BarChart3 size={12} />
                               View Analysis
                             </button>
                           )}
                           <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 shadow-sm transition-all group-active:scale-95">
                              <ChevronRight size={14} strokeWidth={3} />
                           </div>
                        </div>
                     </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    
      <TestAnalysisModal 
        isOpen={isAnalysisOpen} 
        onClose={() => setIsAnalysisOpen(false)} 
        resultId={selectedResultId} 
      />
    </DashboardLayout>
  );
}