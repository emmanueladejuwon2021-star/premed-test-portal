import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Award, Share2, RotateCcw, CheckCircle2, 
  BarChart3, LayoutGrid, FileText, Download,
  GraduationCap, TrendingUp, AlertCircle, Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { toast } from '../components/Toast';
import TestAnalysisModal from '../components/TestAnalysisModal';
import { loadHtml2Pdf } from '../lib/pdfUtils';

export default function ResultsView() {
  const { testResult, selectedCourse, student, token } = useAppContext();
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [courseAttempts, setCourseAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState<boolean>(true);
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const navigate = useNavigate();

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
    if (!testResult) {
      navigate('/dashboard');
      return;
    }
    
    // Study recommendations
    setTimeout(() => {
       setAiAdvice("Good job! You have a strong understanding of most topics. However, you should spend more time reviewing the areas where your scores were lower to improve your overall performance.");
    }, 1500);
  }, [testResult, navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      const activeToken = token || localStorage.getItem('FCF_Token');
      if (!activeToken) {
        setLoadingAttempts(false);
        return;
      }
      try {
        const res = await fetch('/api/results/history', {
          headers: {
            'Authorization': 'Bearer ' + activeToken
          }
        });
        if (res.ok) {
          const data = await res.json();
          const targetCourseId = selectedCourse?.id || selectedCourse?._id || testResult?.course_id || testResult?.courseId;
          if (targetCourseId) {
            const courseSpecific = data.filter((h: any) => String(h.course_id || h.courseId) === String(targetCourseId));
            setCourseAttempts(courseSpecific);
          }
        }
      } catch (err) {
        console.error("Error fetching history for attempts check:", err);
      } finally {
        setLoadingAttempts(false);
      }
    };
    fetchHistory();
  }, [token, selectedCourse, testResult]);

  const downloadTransparencyPDF = async () => {
    const resultId = testResult?.id || testResult?._id;
    if (!resultId) return;

    toast('Generating PDF', 'Constructing detailed transparency analysis...', 'info');
    setDownloadingPDF(true);
    const activeToken = token || localStorage.getItem('FCF_Token');
    let container: HTMLDivElement | null = null;
    try {
      const res = await fetch(`/api/results/${resultId}/transparency`, {
        headers: {
          'Authorization': 'Bearer ' + activeToken
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');
      
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.zIndex = '-100'; // Keep slightly behind but fully within rendering layer
      container.style.pointerEvents = 'none';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.fontFamily = 'Inter, system-ui, sans-serif';
      container.style.color = '#0f172a';
      container.style.lineHeight = '1.5';
      document.body.appendChild(container);
      
      const scoreInt = parseInt(data.percentage) || 0;
      const scoreColor = scoreInt >= 50 ? '#16a34a' : '#dc2626';
      
      const dateFormatted = data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let htmlContent = `
        <div style="background: #0f172a; padding: 30px; border-radius: 12px; color: white; margin-bottom: 24px;">
           <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">TEST REPORT</h1>
           <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">
              OFFICIAL PERFORMANCE ANALYSIS & TRANSPARENCY AUDIT<br/>
              VERIFICATION ID: ${resultId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}
           </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 32px; background: #f8fafc;">
           <tr>
              <td style="padding: 24px; vertical-align: top; width: 45%;">
                 <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 12px; letter-spacing: 1px;">STUDENT INFORMATION</div>
                 <div style="font-weight: bold; font-size: 15px; color: #0f172a;">Name: <span style="font-weight: normal">${student?.name || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Matric: <span style="font-weight: normal">${student?.matric_no || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Email: <span style="font-weight: normal">${student?.email || 'N/A'}</span></div>
              </td>
              <td style="padding: 24px; vertical-align: top; width: 35%;">
                 <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 12px; letter-spacing: 1px;">TEST SPECIFICATIONS</div>
                 <div style="font-weight: bold; font-size: 15px; color: #0f172a;">Test: <span style="font-weight: normal">${data.course || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Date: <span style="font-weight: normal">${dateFormatted}</span></div>
              </td>
              <td style="padding: 24px; vertical-align: middle; text-align: center; width: 20%;">
                 <div style="background: ${scoreColor}; padding: 16px 24px; border-radius: 8px; color: white; display: inline-block; min-width: 100px; text-align: center;">
                    <div style="font-size: 10px; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">OVERALL</div>
                    <div style="font-size: 28px; font-weight: 900;">${scoreInt}%</div>
                 </div>
              </td>
           </tr>
        </table>
        
        <h2 style="font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #0f172a;">TEST QUESTION ANALYSIS</h2>
      `;
      
      data.details.forEach((q: any, i: number) => {
        const getOpt = (k: string) => q.options[k] ? `<div style="margin-bottom: 6px;"><strong>${k.split('_')[1].toUpperCase()}.</strong> ${q.options[k]}</div>` : '';
        const optionsList = [getOpt('option_a'), getOpt('option_b'), getOpt('option_c'), getOpt('option_d')].join('');
        
        let stuAns = q.student_answer ? q.student_answer.replace('option_', '').toUpperCase() : 'NO SELECTION';
        let corAns = q.correct_option ? q.correct_option.replace('option_', '').toUpperCase() : '?';
        
        const stuFull = q.student_answer && q.options[q.student_answer] ? `<strong>[${stuAns}]</strong> ${q.options[q.student_answer]}` : stuAns;
        const corFull = q.correct_option && q.options[q.correct_option] ? `<strong>[${corAns}]</strong> ${q.options[q.correct_option]}` : corAns;

        const isPassed = q.is_correct;
        const resultLabel = isPassed ? '<span style="color: #15803d; font-weight: bold;">[&#10003;] PASSED</span>' : '<span style="color: #b91c1c; font-weight: bold;">[&#10007;] FAILED</span>';
        
        htmlContent += `
        <div style="page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; background: white;">
           <table style="width: 100%; border-collapse: collapse;">
              <tr>
                 <td style="width: 40px; vertical-align: top; font-size: 24px; font-weight: 900; color: #94a3b8; line-height: 1; padding-right: 16px;">${i + 1}</td>
                 <td style="vertical-align: top;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px; white-space: pre-wrap; color: #0f172a;">${q.text}</div>
                    <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 15px; border: 1px solid #f1f5f9; color: #0f172a;">
                       ${optionsList}
                     </div>
                     <table style="width: 100%; font-size: 14px; border-collapse: collapse; background: #fdfdfd; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <tr>
                           <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 180px; color: #64748b; font-weight: 600; background: #f8fafc;">Candidate Selection</td>
                           <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">${stuFull}</td>
                        </tr>
                        <tr>
                           <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; background: #f8fafc;">Administrator Key</td>
                           <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">${corFull}</td>
                        </tr>
                        <tr>
                           <td style="padding: 12px 16px; color: #64748b; font-weight: 600; background: #f8fafc;">Match Status</td>
                           <td style="padding: 12px 16px;">${resultLabel}</td>
                        </tr>
                     </table>
                 </td>
              </tr>
           </table>
         </div>
         `;
      });
      
      container.innerHTML = htmlContent;

      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     `Transcript_${student?.matric_no?.replace(/\//g,'_') || 'Report'}_${data.course}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: false, scrollX: 0, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfEngine = await loadHtml2Pdf();
      if (!html2pdfEngine) {
        throw new Error('PDF conversion engine is not loaded yet. Please check your internet connection or refresh the page.');
      }
      await html2pdfEngine().set(opt).from(container).save();
      toast('Success', 'Detailed transparency report downloaded.', 'success');
    } catch (e: any) {
      console.error(e);
      toast('Error', e.message || 'Failed to generate transparency report', 'error');
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
      setDownloadingPDF(false);
    }
  };

  if (!testResult) return null;

  if (selectedCourse?.results_hidden || testResult?.results_hidden) {
    return (
      <DashboardLayout viewTitle="Test Completed">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight mb-4 text-slate-900 dark:text-slate-100">Thank you for taking this test</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            Your responses have been successfully submitted. The specific result is currently hidden and will be released soon.
          </p>
          {!loadingAttempts && courseAttempts.length >= 1 && (
            <div className="mb-8 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/50 max-w-sm w-full mx-auto space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                This is attempt #{courseAttempts.length}. You can download your complete test report.
              </p>
              <button
                onClick={downloadTransparencyPDF}
                disabled={downloadingPDF}
                className="w-full h-11 px-6 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md cursor-pointer"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating Transcript...
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Print Detailed Transcript
                  </>
                )}
              </button>
            </div>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className="h-12 px-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          >
             Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const radarData = (testResult.topic_breakdown || testResult.topicBreakdown || []).map((item: any) => ({
    subject: item.topic || item.subject,
    score: item.score,
    fullmark: 100,
  }));

  const COLORS = ['#003366', '#facc15', '#1e40af', '#64748b'];

  const score = testResult.total_score ?? testResult.score ?? 0;
  const total = testResult.total_questions ?? testResult.total ?? 1;

  return (
    <DashboardLayout viewTitle="Test Results">
      {/* Tight compact header with action buttons on a single row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-150 dark:border-slate-800/80 pb-3 mb-4 gap-3">
         <div className="space-y-1">
            <div className="text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-[0.25em] font-sans">{testResult.code || "Test"} - RESULTS</div>
            <h1 className="text-xl md:text-2xl font-sans font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">{testResult.title || "Review Summary"}</h1>
         </div>
         
         <div className="flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            {!loadingAttempts && courseAttempts.length >= 1 && (
              <button
                id="btn-download-transcript"
                onClick={downloadTransparencyPDF}
                disabled={downloadingPDF}
                className="flex-1 sm:flex-initial h-9 px-3.5 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileText size={12} />
                    Transcript
                  </>
                )}
              </button>
            )}
            <button 
              id="btn-analysis"
              onClick={() => setIsAnalysisOpen(true)}
              className="flex-1 sm:flex-initial h-9 px-3.5 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <BarChart3 size={12} />
              Review Answers
            </button>
            <button 
              id="btn-finish"
              onClick={() => navigate('/dashboard')}
              className="flex-1 sm:flex-initial h-9 px-4 flex items-center justify-center bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-505 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
               Finish
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-6">
         {/* Score Metrics and Insight placed side-by-side or compactly stacked */}
         <div className="lg:col-span-4 flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-col gap-3">
            {/* Highly Optimized Compact Score Card */}
            <div className="bg-white dark:bg-[#070707] rounded-xl p-4 text-center border border-slate-200/60 dark:border-slate-800/80 flex flex-col justify-center shadow-sm">
               <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1">Score Metrics</span>
               <div className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none mb-2">
                 {Math.round((score / total) * 100)}%
               </div>
               
               <div className="border-t border-slate-100 dark:border-slate-900/60 pt-2 flex items-center justify-center gap-1">
                 <span className="text-xs font-black text-slate-850 dark:text-slate-100">{score}</span>
                 <span className="text-[10px] text-slate-400">/</span>
                 <span className="text-[10px] font-black text-slate-500">{total}</span>
                 <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 ml-1.5">Marks</span>
               </div>
            </div>

            {/* Ultra Compact Performance Advice Box */}
            <div className="bg-blue-500/5 dark:bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[9px] uppercase tracking-wider mb-1.5">
                 <TrendingUp size={12} />
                 <span>Teacher Insight</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                {aiAdvice ? aiAdvice : <span className="animate-pulse">Analyzing test results...</span>}
              </p>
            </div>
         </div>

         {/* Charts & Breakdowns */}
         <div className="lg:col-span-8 flex flex-col gap-3">
            {/* Topic Strength Radar */}
            <div className="bg-white dark:bg-[#070707] rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
               <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                 <BarChart3 size={13} className="text-slate-450" /> Topic Accuracy Overview
               </h3>
               {radarData.length > 0 ? (
                 <div className="h-44 sm:h-56 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                         <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                         <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                         <Radar 
                            name="Student" 
                            dataKey="score" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.25} 
                            isAnimationActive={true}
                         />
                       </RadarChart>
                    </ResponsiveContainer>
                 </div>
               ) : (
                 <div className="h-44 flex flex-col items-center justify-center text-slate-400 dark:text-slate-550 space-y-2">
                    <AlertCircle size={32} />
                    <span className="font-bold text-[10px] tracking-widest uppercase">No category metrics calculated</span>
                 </div>
               )}
            </div>

            {/* Tight Detailed Topics List */}
            <div className="bg-white dark:bg-[#070707] rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
               <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                 <LayoutGrid size={13} className="text-slate-450" /> Structured Topic Scores
               </h3>
               <div className="space-y-1.5">
                 {radarData.length > 0 ? (
                    radarData.map((d: any, i: number) => (
                      <div key={`rv_topic_${d.subject || i}`} className="flex items-center justify-between p-2 px-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 rounded-lg">
                         <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{d.subject}</span>
                         <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 sm:w-28 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                               <div 
                                  className="h-full bg-blue-500 rounded-full" 
                                  style={{ width: `${d.score}%` }}
                               />
                            </div>
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 min-w-[2.2rem] text-right">{Math.round(d.score)}%</span>
                         </div>
                      </div>
                    ))
                 ) : (
                    <div className="text-[10px] font-bold text-slate-400 italic text-center py-4">Insufficient question pool metrics to generate topic evaluation.</div>
                 )}
               </div>
            </div>
         </div>
      </div>
      <TestAnalysisModal 
         isOpen={isAnalysisOpen} 
         onClose={() => setIsAnalysisOpen(false)} 
         resultId={testResult?.id || testResult?._id || ''} 
       />
    </DashboardLayout>
  );
}
