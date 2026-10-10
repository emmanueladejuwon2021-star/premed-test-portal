import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Loader2, FileText, ShieldAlert, Activity, BookOpen, AlertCircle, 
  ChevronRight, X, Calendar, SlidersHorizontal, Filter, Grid, BarChart2, List, 
  Award, TrendingUp, DollarSign, Download, RefreshCw, UserCheck, CheckCircle2, Building 
} from 'lucide-react';
import { toast } from '../Toast';
import { formatToWAT } from '../../lib/dateUtils';

interface User {
  id: string;
  _id?: string;
  name?: string;
  matric_no?: string;
  department?: string;
  avg_score?: number;
  tests_taken?: number;
  role?: string;
}

interface Course {
  id: string;
  _id?: string;
  code: string;
  title: string;
}

interface StudentResultsViewProps {
  adminToken: string;
  courses: Course[];
  users: User[];
  downloadLeaderboardPDF: (anonymous: boolean) => void;
  selectedPdfCourse: string;
  setSelectedPdfCourse: (val: string) => void;
  fetchData: () => Promise<void>;
}

export default function StudentResultsView({
  adminToken,
  courses,
  users,
  downloadLeaderboardPDF,
  selectedPdfCourse,
  setSelectedPdfCourse,
  fetchData
}: StudentResultsViewProps) {
  // Local active window tab
  const [activeWindow, setActiveWindow] = useState<'feed' | 'insights' | 'bell-curve' | 'action-panel' | 'analysis'>('feed');

  // Interactive Candidate Test Analysis States
  const [selectedAnalysisStudentId, setSelectedAnalysisStudentId] = useState<string>('');
  const [selectedAnalysisResultId, setSelectedAnalysisResultId] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  
  // Fetch transparency analysis details for selected result ID
  useEffect(() => {
    if (!selectedAnalysisResultId) {
      setAnalysisData(null);
      return;
    }
    const fetchAnalysisData = async () => {
      setLoadingAnalysis(true);
      setAnalysisError(null);
      try {
        const res = await fetch(`/api/admin/results/${selectedAnalysisResultId}/transparency`, {
          headers: { 'Authorization': 'Bearer ' + adminToken }
        });
        if (!res.ok) throw new Error('Failed to retrieve transparency analysis data.');
        const data = await res.json();
        setAnalysisData(data);
        setActiveQuestionIndex(0);
      } catch (err: any) {
        setAnalysisError(err.message || 'Error occurred while loading analysis.');
      } finally {
        setLoadingAnalysis(false);
      }
    };
    fetchAnalysisData();
  }, [selectedAnalysisResultId, adminToken]);
  
  // Real database results containing fully populated fields
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [recalculatingSingleId, setRecalculatingSingleId] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  
  // Specific Score States
  const [scoreFilterMode, setScoreFilterMode] = useState<'all' | 'exact' | 'gte' | 'lte' | 'range'>('all');
  const [targetScore, setTargetScore] = useState<number>(50);
  const [targetScoreMax, setTargetScoreMax] = useState<number>(100);
  
  // Topic specific filters
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  
  // Selected single submission details for inspection modal/pane
  const [inspectedSubmission, setInspectedSubmission] = useState<any | null>(null);

  const fetchGlobalResults = async () => {
    setLoadingResults(true);
    try {
      const res = await fetch('/api/admin/results/all', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalResults(data);
      } else {
        toast('Fetch Failed', 'Could not refresh global result transactions.', 'error');
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchGlobalResults();
  }, [adminToken]);

  // Bulk recalculate
  const handleRecalculateAll = async () => {
    setRecalculatingAll(true);
    try {
      toast('Recalculating', 'Re-evaluating all student performance reports...', 'info');
      const res = await fetch('/api/admin/results/recalculate-all', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recalculate all scores.');
      toast('Success', `Successfully recalculated ${data.count} student performance reports!`, 'success');
      await fetchGlobalResults();
      await fetchData();
    } catch (e: any) {
      toast('Error', e.message || 'Bulk recalculation failed.', 'error');
    } finally {
      setRecalculatingAll(false);
    }
  };

  // Single recalculate
  const handleRecalculateSingle = async (resultId: string) => {
    setRecalculatingSingleId(resultId);
    try {
      toast('Recalculating', 'Re-evaluating submission...', 'info');
      const res = await fetch(`/api/admin/results/${resultId}/recalculate`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recalculate.');
      toast('Success', `Score updated to ${data.percentage.toFixed(1)}% (${data.grade})`, 'success');
      
      // Update selected submission local state if currently inspected
      if (inspectedSubmission && (inspectedSubmission._id === resultId || inspectedSubmission.id === resultId)) {
        setInspectedSubmission((prev: any) => ({
          ...prev,
          percentage: data.percentage,
          total_score: data.total_score,
          grade: data.grade
        }));
      }

      await fetchGlobalResults();
      await fetchData();
    } catch (e: any) {
      toast('Error', e.message || 'Recalculation failed.', 'error');
    } finally {
      setRecalculatingSingleId(null);
    }
  };

  // Delete result safely
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this CBT transcript record?')) return;
    try {
      const res = await fetch(`/api/admin/results/${resultId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        toast('Record Deleted', 'CBT test submission deleted successfully.', 'success');
        setInspectedSubmission(null);
        await fetchGlobalResults();
        await fetchData();
      } else {
        const errorData = await res.json();
        toast('Delete Failed', errorData.error || 'Attempt failed', 'error');
      }
    } catch (e: any) {
      toast('Error', e.message, 'error');
    }
  };

  // Extract all unique topics or topic headings present inside results topic_breakdowns
  const uniqueTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    globalResults.forEach(r => {
      if (r.topic_breakdown) {
        try {
          const bd = JSON.parse(r.topic_breakdown);
          Object.keys(bd).forEach(k => {
            if (k) topicsSet.add(k);
          });
        } catch {}
      }
    });
    return Array.from(topicsSet);
  }, [globalResults]);

  // Extract unique departments from users list for filtering
  const uniqueDepts = useMemo(() => {
    const depts = new Set<string>();
    if (Array.isArray(users)) {
      users.forEach(u => {
        if (u.department) depts.add(u.department.toUpperCase());
      });
    }
    return Array.from(depts);
  }, [users]);

  // Extract unique students who have submitted results for the diagnostic visualizer
  const studentsWithSubmissions = useMemo(() => {
    const studentMap = new Map<string, any>();
    globalResults.forEach(r => {
      const student = r.student_id;
      if (student) {
        const id = student._id || student.id;
        if (id && !studentMap.has(id)) {
          studentMap.set(id, student);
        }
      }
    });
    return Array.from(studentMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [globalResults]);

  // Extract tests / courses taken by the selected student for the diagnostic visualizer
  const studentTests = useMemo(() => {
    if (!selectedAnalysisStudentId) return [];
    return globalResults
      .filter(r => {
        const id = r.student_id?._id || r.student_id?.id;
        return id === selectedAnalysisStudentId;
      })
      .map(r => ({
        resultId: r._id || r.id,
        course: r.course_id,
        percentage: r.percentage,
        created_at: r.created_at || r.createdAt
      }));
  }, [globalResults, selectedAnalysisStudentId]);

  // Filtered list of detailed transparency questions
  const filteredAnalysisQuestions = useMemo(() => {
    if (!analysisData || !analysisData.details) return [];
    return analysisData.details.filter((q: any) => {
      if (analysisFilter === 'correct') return q.is_correct;
      if (analysisFilter === 'incorrect') return !q.is_correct;
      return true;
    });
  }, [analysisData, analysisFilter]);

  // When selected student changes, auto-select their first test
  useEffect(() => {
    if (selectedAnalysisStudentId) {
      const tests = studentTests;
      if (tests.length > 0) {
        const hasCurrent = tests.some(t => t.resultId === selectedAnalysisResultId);
        if (!hasCurrent) {
          setSelectedAnalysisResultId(tests[0].resultId);
        }
      } else {
        setSelectedAnalysisResultId('');
      }
    } else {
      setSelectedAnalysisResultId('');
    }
  }, [selectedAnalysisStudentId, studentTests]);

  // Comprehensive Pipeline of Filters (Score, Topic, Course, Names)
  const filteredSubmissions = useMemo(() => {
    return globalResults.filter(r => {
      // 1. Candidate Search query filter
      const studentName = r.student_id?.name || '';
      const studentMatric = r.student_id?.matric_no || '';
      const studentDept = r.student_id?.department || '';
      const q = searchTerm.toLowerCase();
      
      const matchesSearch = studentName.toLowerCase().includes(q) || 
                            studentMatric.toLowerCase().includes(q) ||
                            studentDept.toLowerCase().includes(q);
      
      if (!matchesSearch) return false;

      // 2. Department filter
      if (deptFilter !== 'all' && studentDept.toUpperCase() !== deptFilter.toUpperCase()) {
        return false;
      }

      // 3. Course filter
      const courseIdStr = r.course_id?._id || r.course_id?.id || '';
      if (selectedCourseId !== 'all' && courseIdStr !== selectedCourseId) {
        return false;
      }

      // 4. Specific Score filters
      const score = Math.round(r.percentage || 0);
      if (scoreFilterMode === 'exact' && score !== targetScore) {
        return false;
      }
      if (scoreFilterMode === 'gte' && score < targetScore) {
        return false;
      }
      if (scoreFilterMode === 'lte' && score > targetScore) {
        return false;
      }
      if (scoreFilterMode === 'range' && (score < targetScore || score > targetScoreMax)) {
        return false;
      }

      // 5. Topic-level breakdown filter
      if (selectedTopic !== 'all' && r.topic_breakdown) {
        try {
          const parsedBreakdown = JSON.parse(r.topic_breakdown);
          if (!parsedBreakdown[selectedTopic]) {
            return false;
          }
        } catch {
          return false;
        }
      }

      return true;
    });
  }, [globalResults, searchTerm, deptFilter, selectedCourseId, scoreFilterMode, targetScore, targetScoreMax, selectedTopic]);

  // Calculated average stats of the filtered segment
  const statsSummary = useMemo(() => {
    if (filteredSubmissions.length === 0) return { avg: 0, highest: 0, lowest: 0, count: 0 };
    let total = 0;
    let maxS = 0;
    let minS = 100;
    filteredSubmissions.forEach(r => {
      const p = r.percentage || 0;
      total += p;
      if (p > maxS) maxS = p;
      if (p < minS) minS = p;
    });
    return {
      avg: Math.round(total / filteredSubmissions.length),
      highest: Math.round(maxS),
      lowest: Math.round(minS),
      count: filteredSubmissions.length
    };
  }, [filteredSubmissions]);

  // Aggregate stats per topic for Insights Window
  const topicBreakdownInsights = useMemo(() => {
    const topicStats: Record<string, { totalScore: number; count: number; maxScore: number }> = {};
    
    globalResults.forEach(r => {
      if (r.topic_breakdown) {
        try {
          const breakdown = JSON.parse(r.topic_breakdown);
          Object.entries(breakdown).forEach(([topicName, data]: [string, any]) => {
            const topicPercentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            if (!topicStats[topicName]) {
              topicStats[topicName] = { totalScore: 0, count: 0, maxScore: 0 };
            }
            topicStats[topicName].totalScore += topicPercentage;
            topicStats[topicName].count += 1;
            if (topicPercentage > topicStats[topicName].maxScore) {
              topicStats[topicName].maxScore = topicPercentage;
            }
          });
        } catch {}
      }
    });

    return Object.entries(topicStats).map(([name, stat]) => ({
      name,
      avg: Math.round(stat.totalScore / stat.count),
      count: stat.count,
      max: Math.round(stat.maxScore)
    })).sort((a,b) => b.avg - a.avg);
  }, [globalResults]);

  // Bell Curve Dispersion Buckets (Candidate distribution inside scores)
  const scoreDispersionBuckets = useMemo(() => {
    const buckets = [
      { range: '90 - 100%', label: 'Outstanding (A)', count: 0, min: 90, max: 100, color: 'bg-emerald-500' },
      { range: '75 - 89%', label: 'Excellent (B)', count: 0, min: 75, max: 89, color: 'bg-emerald-400' },
      { range: '60 - 74%', label: 'Very Good (C)', count: 0, min: 60, max: 74, color: 'bg-teal-500' },
      { range: '50 - 59%', label: 'Satisfactory (D)', count: 0, min: 50, max: 59, color: 'bg-blue-500' },
      { range: '40 - 49%', label: 'Pass (E)', count: 0, min: 40, max: 49, color: 'bg-amber-500' },
      { range: '0 - 39%', label: 'Retake Needed (F)', count: 0, min: 0, max: 39, color: 'bg-red-500' },
    ];

    globalResults.forEach(r => {
      const score = Math.round(r.percentage || 0);
      for (const bucket of buckets) {
        if (score >= bucket.min && score <= bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    return buckets.map(b => ({
      ...b,
      percentageOfMax: (b.count / maxCount) * 100
    }));
  }, [globalResults]);

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Fast Actions Center */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
           <h2 className="text-xl font-black uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
             <SlidersHorizontal size={20} className="text-blue-400 animate-pulse" /> 
             <span>Result Analytics & Controls</span>
           </h2>
           <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">
             Filter specific scores, evaluate topic breakdowns, and regenerate PDF reports.
           </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap justify-center items-center gap-2">
           <button 
             onClick={handleRecalculateAll} 
             disabled={recalculatingAll || loadingResults}
             className="flex items-center gap-2 bg-slate-800 text-emerald-400 border border-emerald-500/20 hover:border-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
             title="Loop through all database evaluations to verify and adjust results"
           >
             {recalculatingAll ? <Loader2 size={12} className="animate-spin text-emerald-400" /> : <RefreshCw size={12} />}
             <span>Recalculate All Scores</span>
           </button>
           <button 
             onClick={() => fetchGlobalResults()}
             disabled={loadingResults}
             className="p-2.5 bg-slate-800 text-slate-300 border border-slate-700/50 hover:text-white rounded-xl transition-all"
             title="Reload fresh data from database"
           >
              <Loader2 size={13} className={loadingResults ? "animate-spin text-blue-400" : "hidden"} />
              {!loadingResults && <Activity size={13} />}
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        
        {/* Left Side: Modular Filter Matrix Window */}
        <div className="w-full lg:w-[320px] bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col gap-4 self-start shadow-sm">
           
           <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Filter size={14} className="text-blue-500" /> Filter Criteria
              </span>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setDeptFilter('all');
                  setSelectedCourseId('all');
                  setScoreFilterMode('all');
                  setTargetScore(50);
                  setTargetScoreMax(100);
                  setSelectedTopic('all');
                }}
                className="text-[9px] font-black uppercase tracking-wider text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded"
              >
                Clear Filters
              </button>
           </div>

           {/* 1. Candidate Full-Text query */}
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Candidate search</label>
              <div className="relative">
                 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                 <input 
                   type="text" 
                   placeholder="Enter Name, Matric or Department" 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-xl pl-8 pr-3 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-200"
                 />
              </div>
           </div>

           {/* 2. Specific Score Range Panel (Dynamic Slider Matrix) */}
           <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Award size={10} className="text-amber-500" /> Specific Score Window
              </label>
              
              {/* Filter mode select */}
              <div className="grid grid-cols-2 gap-1.5">
                 {([
                   { id: 'all', label: 'All Scores' },
                   { id: 'exact', label: 'Exactly' },
                   { id: 'gte', label: 'At Least (≥)' },
                   { id: 'lte', label: 'Under (≤)' },
                   { id: 'range', label: 'Range' }
                 ] as const).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setScoreFilterMode(m.id)}
                      className={`py-1.5 text-[8.5px] font-black uppercase tracking-wider rounded-lg border text-center transition-all ${
                         scoreFilterMode === m.id 
                           ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                           : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                 ))}
              </div>

              {/* Slider Inputs based on mode selection */}
              {scoreFilterMode !== 'all' && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl space-y-3 border border-slate-150 dark:border-slate-900">
                   {scoreFilterMode === 'range' ? (
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-600 dark:text-slate-400">
                           <span>Min: {targetScore}%</span>
                           <span>Max: {targetScoreMax}%</span>
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="range" min="0" max={targetScoreMax} 
                            value={targetScore} 
                            onChange={e => setTargetScore(Number(e.target.value))}
                            className="w-full accent-blue-500 h-1 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-full"
                          />
                          <input 
                            type="range" min={targetScore} max="100" 
                            value={targetScoreMax} 
                            onChange={e => setTargetScoreMax(Number(e.target.value))}
                            className="w-full accent-blue-500 h-1 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-full"
                          />
                        </div>
                     </div>
                   ) : (
                     <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black text-slate-600 dark:text-slate-400 mb-1">
                           <span>Score filter size:</span>
                           <span className="text-blue-500">{targetScore}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" 
                          value={targetScore} 
                          onChange={e => setTargetScore(Number(e.target.value))}
                          className="w-full accent-blue-500 h-1 cursor-pointer bg-slate-200 dark:bg-slate-800 rounded-full"
                        />
                     </div>
                   )}
                </div>
              )}
           </div>

           {/* 3. Course / Module selection */}
           <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Test / Module</label>
              <select 
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="all">All Modules (Aggregated)</option>
                {courses.map((c, idx) => <option key={`res_course_${c._id || c.id || idx}_${idx}`} value={c._id || c.id}>{c.code} - {c.title}</option>)}
              </select>
           </div>

           {/* 4. Topic Specific Selection */}
           <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scientific Topic</label>
              <select 
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                 <option value="all">All Topics (Aggregated)</option>
                 {uniqueTopics.map((t, idx) => <option key={`res_topic_${t || idx}_${idx}`} value={t}>{t}</option>)}
              </select>
           </div>

           {/* 5. Department filter */}
           <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student Department</label>
              <select 
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                 <option value="all">All Departments</option>
                 {uniqueDepts.map((d, idx) => <option key={`res_dept_${d || idx}_${idx}`} value={d}>{d}</option>)}
              </select>
           </div>

           {/* Summary Stats Badge */}
           <div className="bg-blue-500/10 border border-blue-500/10 rounded-2xl p-3.5 space-y-1.5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 rounded-full bg-blue-500/10 blur-xl" />
              <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Live Segment stats</div>
              <div className="flex items-baseline gap-1.5">
                 <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{statsSummary.count}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase">Submissions</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[8.5px] font-bold text-slate-500">
                 <div>Avg Score: <span className="font-mono font-black text-slate-800 dark:text-slate-200">{statsSummary.avg}%</span></div>
                 <div>Highest: <span className="font-mono font-black text-slate-800 dark:text-slate-200">{statsSummary.highest}%</span></div>
              </div>
           </div>

        </div>

        {/* Right Side: The Interactive Multi-Window Interface */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
           
           {/* Navigation tabs for primary windows */}
           <div className="bg-slate-100 dark:bg-[#070707] p-1 rounded-2xl flex flex-wrap gap-1 border border-slate-200 dark:border-slate-800 self-start shrink-0">
              {([
                { id: 'feed', label: 'Candidate Submissions List', icon: List },
                { id: 'analysis', label: 'Test Analysis', icon: BookOpen },
                { id: 'insights', label: 'Topic Performance Analytics', icon: BarChart2 },
                { id: 'bell-curve', label: 'Score Distribution Curve', icon: TrendingUp },
                { id: 'action-panel', label: 'Print Dossiers', icon: FileText }
              ] as const).map(w => (
                 <button
                   key={w.id}
                   onClick={() => setActiveWindow(w.id)}
                   className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                     activeWindow === w.id 
                       ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200/50 dark:border-slate-800 shadow-sm' 
                       : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                   }`}
                 >
                   <w.icon size={13} />
                   <span className="hidden xs:inline">{w.label}</span>
                 </button>
              ))}
           </div>

           {/* Main Display Windows Switcher */}
           <div className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 min-h-[500px] flex flex-col shadow-sm relative overflow-hidden">
               
               <AnimatePresence mode="wait">
                 
                 {/* WINDOW 1: Global Submissions Feed */}
                 {activeWindow === 'feed' && (
                   <motion.div 
                     key="wind_feed"
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                     className="flex-1 flex flex-col h-full space-y-4"
                   >
                     <div className="flex items-center justify-between">
                        <div>
                           <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Evaluations Feed ({filteredSubmissions.length} records)</h3>
                           <p className="text-[9px] text-slate-400 uppercase tracking-wider">Click any candidate item to review breakdown, delete, or recalculate.</p>
                        </div>
                     </div>

                     {/* Premium Preset Quick Filter Row */}
                     <div className="flex flex-wrap gap-1.5 border-y border-slate-100 dark:border-slate-800/80 py-2.5 my-1">
                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider flex items-center pr-1 select-none">Quick Segments:</span>
                       {[
                         { id: 'all', label: 'All Results', config: () => { setScoreFilterMode('all'); setSelectedTopic('all'); } },
                         { id: 'top', label: 'High Scores (≥70%)', config: () => { setScoreFilterMode('gte'); setTargetScore(70); } },
                         { id: 'avg', label: 'Comp Pass (50%-69%)', config: () => { setScoreFilterMode('range'); setTargetScore(50); setTargetScoreMax(69); } },
                         { id: 'fail', label: 'Needs Remedial (<50%)', config: () => { setScoreFilterMode('lte'); setTargetScore(49); } },
                       ].map(preset => {
                         const isSelected = preset.id === 'all' 
                           ? (scoreFilterMode === 'all')
                           : preset.id === 'top' 
                           ? (scoreFilterMode === 'gte' && targetScore === 70)
                           : preset.id === 'avg'
                           ? (scoreFilterMode === 'range' && targetScore === 50 && targetScoreMax === 69)
                           : (scoreFilterMode === 'lte' && targetScore === 49);

                         return (
                           <button
                             key={preset.id}
                             type="button"
                             onClick={preset.config}
                             className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                               isSelected
                                 ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                                 : 'bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-805 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                             }`}
                           >
                             {preset.label}
                           </button>
                         );
                       })}
                     </div>

                     <div className="hidden">
                        <div>
                        </div>
                     </div>

                     {loadingResults ? (
                       <div className="flex-1 flex flex-col items-center justify-center py-20 text-blue-500">
                          <Loader2 size={32} className="animate-spin mb-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Syncing with Mongo Transactions...</span>
                       </div>
                     ) : filteredSubmissions.length === 0 ? (
                       <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                          <AlertCircle size={40} className="text-slate-200 dark:text-slate-800 mb-3" />
                          <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300">No Matching CBT Records</h4>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest max-w-xs mt-1">Adjust your sliders, scientific topics, or query values to broad search.</p>
                       </div>
                     ) : (
                       <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                             <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Candidate</th>
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Matric / Identifier</th>
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Assessment / Module</th>
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Transmission</th>
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">Score</th>
                                   <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Inspect</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                                {filteredSubmissions.map(r => {
                                   const scoreVal = Math.round(r.percentage || 0);
                                   return (
                                     <tr 
                                       key={`row_${r._id || r.id || 'res'}_${r.created_at || ''}_${r.percentage || ''}`}
                                       onClick={() => setInspectedSubmission(r)}
                                       className="hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl cursor-pointer transition-colors"
                                     >
                                        <td className="py-3 px-3">
                                           <div className="flex items-center gap-2">
                                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-[10px]">
                                                 {String(r.student_id?.name || 'C').charAt(0).toUpperCase()}
                                              </div>
                                              <div>
                                                 <div className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">{r.student_id?.name || 'Non-enrolled student'}</div>
                                                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{r.student_id?.department || 'Medical Sciences'}</div>
                                              </div>
                                           </div>
                                        </td>
                                        <td className="py-3 px-3 font-mono font-black text-[11px] text-slate-500">{r.student_id?.matric_no || 'MANUAL-ENTRY'}</td>
                                        <td className="py-3 px-3">
                                           <div className="font-bold text-slate-800 dark:text-slate-200">{r.course_id?.code || 'GEN'}</div>
                                           <div className="text-[8.5px] text-slate-400 truncate w-32 uppercase tracking-tight">{r.course_id?.title || 'Comprehensive Board exam'}</div>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{formatToWAT(r.created_at || r.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="py-3 px-3 text-center">
                                           <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black italic tracking-tight ${
                                             scoreVal >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                                             scoreVal >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                                             'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                           }`}>
                                              {scoreVal}%
                                           </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                           <div className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all">
                                              <ChevronRight size={13} />
                                           </div>
                                        </td>
                                     </tr>
                                   );
                                })}
                             </tbody>
                          </table>
                       </div>
                     )}
                   </motion.div>
                 )}

                 {/* WINDOW 2: Topic Performance Breakdown */}
                 {activeWindow === 'insights' && (
                   <motion.div 
                     key="wind_insights"
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                     className="flex-1 flex flex-col space-y-4"
                   >
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Topic-Level Assessment Distribution</h3>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Historical aggregation of student mastery grouped by scientific topics.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topicBreakdownInsights.map(topic => (
                           <button
                             key={topic.name}
                             onClick={() => {
                               setSelectedTopic(topic.name);
                               setActiveWindow('feed');
                             }}
                             className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-150 dark:border-slate-900 hover:border-blue-400 dark:hover:border-blue-800 transition-all text-left group"
                           >
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Topic Field</div>
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{topic.name}</h4>
                                 </div>
                                 <div className="text-right">
                                    <span className={`text-sm font-bold font-mono ${
                                      topic.avg >= 70 ? 'text-green-500' :
                                      topic.avg >= 50 ? 'text-blue-500' : 'text-red-500'
                                    }`}>
                                      {topic.avg}%
                                    </span>
                                    <span className="text-[8px] text-slate-400 block font-bold uppercase tracking-widest ml-1">avg</span>
                                 </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                 <div 
                                   className={`h-full rounded-full transition-all duration-500 ${
                                     topic.avg >= 70 ? 'bg-green-500' :
                                     topic.avg >= 50 ? 'bg-blue-500' : 'bg-red-500'
                                   }`}
                                   style={{ width: `${topic.avg}%` }}
                                 />
                              </div>

                              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <span>{topic.count} Submissions evaluated</span>
                                 <span className="text-blue-500 group-hover:translate-x-1.5 transition-transform flex items-center gap-1">Filter list <ChevronRight size={10} /></span>
                              </div>
                           </button>
                        ))}

                        {topicBreakdownInsights.length === 0 && (
                          <div className="col-span-2 text-center py-20 text-slate-400 italic text-xs">
                             No explicit topics or topic levels breakdown currently cataloged in student records.
                          </div>
                        )}
                     </div>
                   </motion.div>
                 )}

                 {/* WINDOW 3: Bell Curve Dispersion */}
                 {activeWindow === 'bell-curve' && (
                   <motion.div 
                     key="wind_curve"
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                     className="flex-1 flex flex-col space-y-4"
                   >
                     <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Performance Density Distribution</h3>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">Visual analytics depicting class grading intervals and participant count.</p>
                     </div>

                     <div className="space-y-3 pt-4">
                        {scoreDispersionBuckets.map(bucket => (
                           <button
                             key={bucket.range}
                             onClick={() => {
                               setScoreFilterMode('range');
                               setTargetScore(bucket.min);
                               setTargetScoreMax(bucket.max);
                               setActiveWindow('feed');
                             }}
                             className="w-full flex items-center gap-4 text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-xl transition-all group"
                           >
                              <div className="w-24 shrink-0 font-bold text-xs text-slate-600 dark:text-slate-300 font-mono">
                                 {bucket.range}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>{bucket.label}</span>
                                    <span className="font-mono text-slate-800 dark:text-slate-200">{bucket.count} candidates</span>
                                 </div>
                                 <div className="w-full h-2 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }} animate={{ width: `${bucket.percentageOfMax}%` }}
                                      className={`h-full rounded-full ${bucket.color}`}
                                    />
                                 </div>
                              </div>
                              <div className="w-6 h-6 rounded bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
                                 <ChevronRight size={12} />
                              </div>
                           </button>
                        ))}
                     </div>
                   </motion.div>
                 )}

                 {/* WINDOW 4: Dossier Export Center */}
                 {activeWindow === 'action-panel' && (
                   <motion.div 
                     key="wind_action"
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                     className="flex-1 flex flex-col space-y-6 max-w-xl mx-auto py-6"
                   >
                     <div className="text-center">
                        <FileText size={36} className="text-blue-500 mx-auto mb-3" />
                        <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Official Document Dossier Center</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest max-w-sm mx-auto mt-1 leading-relaxed">
                          Secure compilation of test transcripts and score rankings, exported directly as formal PDF reporting documents.
                        </p>
                     </div>

                     <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-150 dark:border-slate-900 space-y-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Scope for Dossier Release</label>
                           <select 
                              value={selectedPdfCourse} 
                              onChange={e => setSelectedPdfCourse(e.target.value)} 
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold shadow-sm outline-none cursor-pointer"
                           >
                              <option value="all">All Courses / Modules (Aggregated Index)</option>
                              {courses.map(c => <option key={`pdf_opt_${c.id || c._id}`} value={c.id || c._id}>{c.code} - {c.title}</option>)}
                           </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                           <button 
                             onClick={() => downloadLeaderboardPDF(false)} 
                             className="flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-905 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-400 hover:text-white dark:hover:text-black transition-all shadow-md active:scale-95"
                           >
                             <Download size={14} /> 
                             <span>Generate General Dossier</span>
                           </button>
                           <button 
                             onClick={() => downloadLeaderboardPDF(true)} 
                             className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all border border-slate-300 dark:border-slate-700 active:scale-95"
                           >
                             <ShieldAlert size={14} /> 
                             <span>Anonymized Dossier</span>
                           </button>
                        </div>
                     </div>
                   </motion.div>
                 )}

                 {/* WINDOW 5: Interactive Candidate Test Analysis */}
                 {activeWindow === 'analysis' && (
                   <motion.div 
                     key="wind_analysis"
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                     className="flex-1 flex flex-col space-y-4 text-left"
                   >
                     <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                           <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 font-sans">CBT Question-by-Question Transparency Analysis</h3>
                           <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Inspect candidate responses, shuffle alignments, and correct option key mappings.</p>
                        </div>
                     </div>

                     {/* Selector Matrix */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-150 dark:border-slate-900">
                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">1. Select Candidate</label>
                         <select 
                           value={selectedAnalysisStudentId}
                           onChange={e => {
                             setSelectedAnalysisStudentId(e.target.value);
                             setActiveQuestionIndex(0);
                           }}
                           className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer text-slate-800 dark:text-slate-200"
                         >
                           <option value="">-- Choose student with submissions --</option>
                           {studentsWithSubmissions.map((s, idx) => (
                             <option key={`sub_student_${s._id || s.id || idx}_${idx}`} value={s._id || s.id}>
                               {s.name} ({s.department || s.matric_no || 'Non-enrolled'})
                             </option>
                           ))}
                         </select>
                       </div>

                       <div className="space-y-1">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">2. Select Attempt</label>
                         <select 
                           value={selectedAnalysisResultId}
                           disabled={!selectedAnalysisStudentId || studentTests.length === 0}
                           onChange={e => {
                             setSelectedAnalysisResultId(e.target.value);
                             setActiveQuestionIndex(0);
                           }}
                           className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer text-slate-800 dark:text-slate-200 disabled:opacity-50"
                         >
                           {!selectedAnalysisStudentId ? (
                             <option value="">Select a student first...</option>
                           ) : studentTests.length === 0 ? (
                             <option value="">No submission history found</option>
                           ) : (
                             <>
                               <option value="">-- Select test submission --</option>
                               {studentTests.map((t, idx) => (
                                 <option key={`sub_test_${t.resultId || idx}_${idx}`} value={t.resultId}>
                                   {t.course?.code || 'CBT'} — {Math.round(t.percentage)}% ({formatToWAT(t.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Recent'})
                                 </option>
                               ))}
                             </>
                           )}
                         </select>
                       </div>
                     </div>

                     {/* Display Data */}
                     {!selectedAnalysisStudentId ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                         <BookOpen size={36} className="text-blue-500 mb-2" />
                         <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 font-sans">No Student Selected</h4>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 max-w-xs leading-relaxed">Pick a candidate above to load their interactive CBT evaluation record.</p>
                       </div>
                     ) : !selectedAnalysisResultId ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                         <Activity size={36} className="text-blue-500 mb-2" />
                         <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 font-sans">No Attempt Selected</h4>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 max-w-xs leading-relaxed">Please select a specific test submission from the second menu to inspect candidate answers.</p>
                       </div>
                     ) : loadingAnalysis ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-20 text-blue-500">
                         <Loader2 size={32} className="animate-spin mb-3" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">Loading transparency details...</span>
                       </div>
                     ) : analysisError ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-red-500/5 rounded-3xl border border-red-500/10">
                         <AlertCircle size={32} className="text-red-500 mb-2" />
                         <h4 className="text-xs font-black uppercase text-red-600 font-sans">Error Loading Transparency</h4>
                         <p className="text-[10px] text-slate-400 mt-1">{analysisError}</p>
                       </div>
                     ) : !analysisData || !analysisData.details || analysisData.details.length === 0 ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl font-sans">
                         <AlertCircle size={36} className="text-slate-400 mb-2" />
                         <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 font-sans">Data Empty</h4>
                         <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">This result has no questions list stored or parsed inside the CBT records.</p>
                       </div>
                     ) : (
                       <div className="flex-1 flex flex-col space-y-4">
                          {/* Score Card overview */}
                          <div className="flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-blue-500/20 p-4 rounded-2xl">
                            <div>
                              <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Active Report</div>
                              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{analysisData.course || 'CBT Assessment'}</h4>
                            </div>
                            <div className="text-right font-sans">
                              <span className={`text-xl font-black italic tracking-tighter ${analysisData.percentage >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {Math.round(analysisData.percentage)}%
                              </span>
                              <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Attempt Score</span>
                            </div>
                          </div>

                          {/* Filter questions by correctness */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1 flex-wrap">
                              {(['all', 'correct', 'incorrect'] as const).map(f => {
                                const count = f === 'all' 
                                  ? analysisData.details.length 
                                  : f === 'correct' 
                                  ? analysisData.details.filter((q: any) => q.is_correct).length 
                                  : analysisData.details.filter((q: any) => !q.is_correct).length;
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => {
                                      setAnalysisFilter(f);
                                      setActiveQuestionIndex(0);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                      analysisFilter === f 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                                  >
                                    {f === 'all' ? 'All' : f === 'correct' ? 'Correct' : 'Incorrect'} ({count})
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">
                              Showing {filteredAnalysisQuestions.length} Questions
                            </span>
                          </div>

                          {filteredAnalysisQuestions.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-150 dark:border-slate-900">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-sans">No questions match this filter criteria.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              {/* Left component: list of numbers (col-span-4) */}
                              <div className="md:col-span-4 max-h-[300px] overflow-y-auto pr-1 flex flex-row md:flex-col gap-1.5 flex-wrap md:flex-nowrap custom-scrollbar border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-3 md:pb-0 md:pr-3">
                                {filteredAnalysisQuestions.map((q: any, idx: number) => {
                                  const isSelected = activeQuestionIndex === idx;
                                  return (
                                    <button
                                      key={q.id || idx}
                                      type="button"
                                      onClick={() => setActiveQuestionIndex(idx)}
                                      className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer w-[120px] md:w-full shrink-0 ${
                                        isSelected 
                                          ? 'bg-blue-500/10 border-blue-500 text-slate-900 dark:text-white' 
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-900 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-black text-white shrink-0 ${
                                        q.is_correct ? 'bg-emerald-500' : 'bg-red-500'
                                      }`}>
                                        {q.is_correct ? '✓' : '✗'}
                                      </div>
                                      <div className="truncate text-[10px] font-black uppercase tracking-tight font-sans">Question {idx + 1}</div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Right component: precise details (col-span-8) */}
                              <div className="md:col-span-8 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-4">
                                {(() => {
                                  const activeQ = filteredAnalysisQuestions[activeQuestionIndex] || filteredAnalysisQuestions[0];
                                  if (!activeQ) return <div className="text-center text-xs text-slate-400">Select a question to view details.</div>;
                                  
                                  // Map original option keys (option_a, option_b) safely
                                  const correctOpt = activeQ.correct_option;
                                  const studentAns = activeQ.student_answer;
                                  
                                  return (
                                    <div className="space-y-4 text-left font-sans">
                                      {/* Text */}
                                      <div className="space-y-1">
                                         <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                           activeQ.is_correct ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                                         }`}>
                                           {activeQ.is_correct ? 'Correct Selection' : 'Correct option was missed'}
                                         </span>
                                         <h4 className="text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-100 font-sans">{activeQ.text}</h4>
                                      </div>

                                      {/* List of Options */}
                                      <div className="space-y-2">
                                        {Object.entries(activeQ.options || {}).map(([key, label]: [string, any]) => {
                                          const isCorrect = key === correctOpt || key.replace('option_', '') === correctOpt;
                                          const isStudent = key === studentAns || key.replace('option_', '') === studentAns;
                                          
                                          // Select color styles
                                          let optionStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                                          if (isCorrect) {
                                            optionStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300";
                                          } else if (isStudent) {
                                            optionStyle = "bg-red-500/10 border-red-500 text-red-900 dark:text-red-300";
                                          }

                                          return (
                                            <div key={key} className={`p-2.5 rounded-xl border text-[10px] font-semibold leading-relaxed transition-all flex justify-between items-center ${optionStyle}`}>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono font-black uppercase text-[9px] bg-slate-100 dark:bg-slate-800 w-4 h-4 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                                  {key.replace('option_', '').toUpperCase()}
                                                </span>
                                                <span>{label}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {isCorrect && (
                                                  <span className="bg-emerald-500 text-white text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest leading-none shrink-0 font-sans">
                                                    Correct
                                                  </span>
                                                )}
                                                {isStudent && (
                                                  <span className="bg-blue-500 text-white text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest leading-none shrink-0 font-sans">
                                                    Choice
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                       </div>
                     )}
                   </motion.div>
                 )}

               </AnimatePresence>

           </div>

        </div>

      </div>

      {/* INSPECTION DETAILED WINDOW / TRANSCRIPT POPUP MODAL */}
      <AnimatePresence>
        {inspectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             {/* Backdrop */}
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setInspectedSubmission(null)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />

             {/* Panel Container */}
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
               className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[500px] shadow-2xl relative overflow-hidden flex flex-col z-10"
             >
                {/* Header background decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500" />
                
                <div className="p-5 flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80">
                   <div>
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/10 px-2 py-0.5 rounded">Submission review</span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 truncate w-64">{inspectedSubmission.student_id?.name || 'Candidate Name'}</h3>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">{inspectedSubmission.student_id?.matric_no}</div>
                   </div>
                   <button 
                     onClick={() => setInspectedSubmission(null)}
                     className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-150 dark:border-slate-900"
                   >
                      <X size={14} />
                   </button>
                </div>

                <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                   
                   {/* Modules description */}
                   <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-slate-150 dark:border-slate-900">
                      <div>
                         <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active CBT assessment</div>
                         <div className="font-bold text-xs text-slate-900 dark:text-white">{inspectedSubmission.course_id?.code || 'CBT'} - {inspectedSubmission.course_id?.title || 'Comprehensive Medical Assessment'}</div>
                         <div className="text-[8.5px] text-slate-400 font-mono mt-1">{formatToWAT(inspectedSubmission.created_at || inspectedSubmission.createdAt)}</div>
                      </div>
                      <div className="text-right shrink-0">
                         <span className={`text-2xl font-black italic tracking-tighter ${
                           Math.round(inspectedSubmission.percentage || 0) >= 50 ? 'text-emerald-500' : 'text-red-500'
                         }`}>
                           {Math.round(inspectedSubmission.percentage || 0)}%
                         </span>
                         <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Grade {inspectedSubmission.grade || 'F'}</span>
                      </div>
                   </div>

                   {/* Raw stats breakdown */}
                   <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-900 text-center">
                         <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total questions</div>
                         <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{inspectedSubmission.total_questions} items</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-900 text-center">
                         <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Raw score obtained</div>
                         <div className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{inspectedSubmission.total_score} correct</div>
                      </div>
                   </div>

                   {/* Topics-specific breakdown parsed if any */}
                   {inspectedSubmission.topic_breakdown && (() => {
                      try {
                         const parsed = JSON.parse(inspectedSubmission.topic_breakdown);
                         if (Object.keys(parsed).length === 0) return null;
                         return (
                           <div className="space-y-2 border-t border-slate-150 dark:border-slate-800/80 pt-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scientific Area breakdowns</label>
                              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-900">
                                 {Object.entries(parsed).map(([topic, stat]: [string, any]) => {
                                    const percent = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                                    return (
                                      <div key={topic} className="flex justify-between items-center text-xs">
                                         <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight text-[10px]">{topic}</span>
                                         <span className="font-mono text-slate-500 font-bold">{stat.correct}/{stat.total} <span className="text-[9.5px] font-black italic">({percent}%)</span></span>
                                      </div>
                                    );
                                 })}
                              </div>
                           </div>
                         );
                      } catch {
                         return null;
                      }
                   })()}

                </div>

                {/* Single admin action list of modal */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-2 shrink-0">
                   <button 
                     onClick={() => handleDeleteResult(inspectedSubmission._id || inspectedSubmission.id)}
                     className="px-3.5 py-2 hover:bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-500 transition-all flex items-center gap-1.5 border border-transparent"
                   >
                      Remove record
                   </button>
                   <button 
                     onClick={() => handleRecalculateSingle(inspectedSubmission._id || inspectedSubmission.id)}
                     disabled={recalculatingSingleId !== null}
                     className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all outline-none"
                   >
                     {recalculatingSingleId === (inspectedSubmission._id || inspectedSubmission.id) ? (
                        <Loader2 size={11} className="animate-spin text-blue-500" />
                     ) : (
                        <Activity size={11} className="text-emerald-500" />
                     )}
                     <span>Force Recalculate</span>
                   </button>
                </div>
                
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
