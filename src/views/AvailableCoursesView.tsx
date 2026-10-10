import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookMarked, ChevronRight, FileText, Search, AlertTriangle, Folder, FolderOpen, Database, X, 
  CheckCircle2, Loader2, Lock, Calendar, Clipboard, Plus, Check, RotateCcw, Download, BookOpen,
  Award, Terminal, ArrowLeft, ArrowRight, Sparkles, Settings2, Trash2, ShieldAlert
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';
import StudyGuideRenderer from '../components/StudyGuideRenderer';

// Visual pairing matching the course list exactly
const Icons = { BookMarked, Folder, Database, FileText };

// Pure-CSS illustrations built like professional vector artwork
function CourseIllustration({ title }: { title: string }) {
  const lowercaseTitle = title?.toLowerCase() || '';

  if (lowercaseTitle.includes('english')) {
    return (
      <div className="relative w-[180px] h-[140px] mx-auto flex items-center justify-center bg-sky-50 dark:bg-sky-950/25 rounded-3xl border border-sky-100/50 dark:border-sky-900/30 p-2 shadow-sm">
        {/* Notebook representation */}
        <div className="relative w-28 h-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md flex overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-slate-250 dark:bg-zinc-800" />
          <div className="flex-1 p-2 flex flex-col gap-1 text-left">
            <div className="w-7 h-1 bg-sky-400 rounded-full" />
            <div className="w-10 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full" />
            <div className="w-5 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full" />
          </div>
          <div className="flex-1 p-2 flex flex-col gap-1 items-end text-right">
            <div className="w-5 h-1 bg-indigo-400 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full" />
            <div className="w-6 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
        {/* Bookmark ribbon */}
        <div className="absolute top-[48px] left-[calc(50%-2px)] w-1 h-7 bg-rose-500 rounded-b" />
        {/* Pencil */}
        <div className="absolute bottom-[20px] right-[20px] w-12 h-3 bg-amber-400 border border-amber-500 rounded flex items-center justify-end px-0.5 shadow-md rotate-[-30deg]">
          <div className="w-1 h-full bg-slate-500 rounded-l" />
          <div className="flex-1 bg-amber-300 h-0.5" />
          <div className="w-1.5 h-full bg-[#E2E8F0] rotate-180 flex items-center justify-center font-black text-[3px]" />
        </div>
      </div>
    );
  }

  if (lowercaseTitle.includes('account') || lowercaseTitle.includes('finance')) {
    return (
      <div className="relative w-[180px] h-[140px] mx-auto flex items-center justify-center bg-orange-50 dark:bg-orange-950/25 rounded-3xl border border-orange-100/50 dark:border-orange-900/30 p-2 shadow-sm">
        {/* Folder folder tab */}
        <div className="relative w-28 h-20 bg-amber-400 dark:bg-amber-600 border border-amber-500 dark:border-amber-700 rounded-lg shadow-md flex flex-col pt-2.5">
          <div className="absolute -top-[7px] left-3.5 w-10 h-2 bg-amber-400 dark:bg-amber-600 border-t border-x border-amber-500 dark:border-amber-700 rounded-t-md" />
          <div className="flex-1 bg-white dark:bg-zinc-950 p-2 flex flex-col gap-1 rounded-md border-t border-slate-100 dark:border-slate-900">
            <div className="w-10 h-1.5 bg-sky-200 dark:bg-sky-950 rounded" />
            <div className="w-12 h-1 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="w-8 h-1 bg-slate-100 dark:bg-zinc-900 rounded" />
          </div>
        </div>
        {/* Calculator */}
        <div className="absolute bottom-[16px] right-[18px] w-[50px] h-[64px] bg-slate-700 dark:bg-zinc-800 border-2 border-slate-600 rounded-xl shadow-lg p-1.5 flex flex-col gap-1 rotate-[6deg]">
          <div className="w-full h-3 bg-teal-100 dark:bg-teal-950 rounded flex items-center justify-end px-1 border border-teal-200/50">
            <span className="font-mono text-[6px] text-teal-800 dark:text-teal-400 font-bold">1834.00</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5 flex-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <div key={num} className="bg-slate-500 dark:bg-zinc-700 rounded-[2px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (lowercaseTitle.includes('agric') || lowercaseTitle.includes('farming') || lowercaseTitle.includes('plant')) {
    return (
      <div className="relative w-[180px] h-[140px] mx-auto flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/25 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30 p-2 shadow-sm">
        <div className="relative w-28 h-20 flex items-end justify-center">
          {/* Farm Grass ground */}
          <div className="absolute bottom-5 inset-x-2 h-2.5 bg-emerald-600 dark:bg-emerald-700 rounded-full" />
          {/* Tractor Wheels */}
          <div className="absolute bottom-1 left-4 w-9 h-9 bg-zinc-800 dark:bg-zinc-900 border-4 border-slate-400 dark:border-slate-600 rounded-full flex items-center justify-center shadow-md animate-spin-slow">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
          </div>
          <div className="absolute bottom-1 right-6 w-5 h-5 bg-zinc-800 dark:bg-zinc-900 border-2 border-slate-400 dark:border-slate-600 rounded-full flex items-center justify-center shadow-md z-10">
            <div className="w-1 h-1 bg-slate-400 rounded-full" />
          </div>
          {/* Cabin Cabin body */}
          <div className="absolute bottom-4 left-[30px] w-10 h-8 bg-rose-600 dark:bg-rose-500 rounded border border-rose-700" />
          <div className="absolute bottom-8 left-[36px] w-7 h-6 bg-slate-100 dark:bg-zinc-900 border-2 border-rose-700 rounded-t" />
          <div className="absolute bottom-[24px] right-7 w-7 h-4 bg-rose-600 dark:bg-rose-500 rounded" />
          <div className="absolute bottom-4 left-6 w-1 h-7 bg-zinc-600 rounded-full" /> {/* exhaust stack */}
        </div>
      </div>
    );
  }

  // Biology
  return (
    <div className="relative w-[180px] h-[140px] mx-auto flex items-center justify-center bg-purple-50 dark:bg-purple-950/25 rounded-3xl border border-purple-100/50 dark:border-purple-900/30 p-2 shadow-sm">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Soft magical brain background bubble */}
        <div className="absolute w-16 h-12 bg-pink-300 dark:bg-purple-900/40 rounded-[50%] blur-sm opacity-60 bg-gradient-to-r from-pink-400 to-indigo-400" />
        <svg viewBox="0 0 100 100" className="w-16 h-16 text-pink-500 fill-pink-100/30 dark:text-purple-400 dark:fill-purple-950/40 drop-shadow">
          <path d="M 50,25 C 37,25 25,33 25,50 C 25,62 33,75 50,75 C 48,67 46,63 50,55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 50,25 C 63,25 75,33 75,50 C 75,62 67,75 50,75 C 52,67 54,63 50,55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 35,38 C 30,46 38,50 34,58" stroke="currentColor" strokeWidth="2.5" />
          <path d="M 65,38 C 70,46 62,50 66,58" stroke="currentColor" strokeWidth="2.5" />
          <path d="M 42,50 C 37,55 45,63 42,70" stroke="currentColor" strokeWidth="2" />
          <path d="M 58,50 C 63,55 55,63 58,70" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

export default function AvailableCoursesView() {
  const { setSelectedCourse, setTestResult, setSelectedTopics } = useAppContext();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Completed Topics & Study Plan States
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [studyPlan, setStudyPlan] = useState<any | null>(null);
  const [isStudyPlanOpen, setIsStudyPlanOpen] = useState(false);
  
  // Custom Wizard for creating notes study plan
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [wizardSubjects, setWizardSubjects] = useState<string[]>([]);
  const [wizardDuration, setWizardDuration] = useState<number>(4); // Weeks
  const [wizardDailyHours, setWizardDailyHours] = useState<number>(2); // Hours
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Active Studying state (Textbook Reading mode)
  const [readingTopic, setReadingTopic] = useState<any | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState<string>('');
  
  // Topic selection (for standard CBT practice config)
  const [selectedCourseForTopics, setSelectedCourseForTopics] = useState<any>(null);
  const [topicsForCourse, setTopicsForCourse] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  
  const navigate = useNavigate();

  // Load basic data
  const handleLoadState = () => {
    // Synchronize completed topics
    try {
      const saved = localStorage.getItem('FCF_CompletedSyllabusTopics');
      if (saved) setCompletedTopicIds(JSON.parse(saved));
    } catch (e) {
      console.warn("Could not read completed topics", e);
    }

    // Synchronize study plan timetable
    try {
      const plan = localStorage.getItem('FCF_StudyPlan_Configs');
      if (plan) setStudyPlan(JSON.parse(plan));
    } catch (e) {
      console.warn("Could not read active study plan", e);
    }
  };

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
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    setSelectedCourse(null);
    setTestResult(null);
    setSelectedTopics([]);
    handleLoadState();
  }, [setSelectedCourse, setTestResult, setSelectedTopics]);

  // Handle standard CBT toggle parameter selection
  const handleCourseCatalogClick = (course: any) => {
    const isCombat = course.title?.toLowerCase().includes('combat') || course.code?.toLowerCase().includes('combat');
    if (isCombat) {
      toast('Combat Protocol Offline', 'Med Combat will be Opened 09/06/26', 'info');
      return;
    }

    if ((course.topicsCount || 0) === 0 && (course.questionsCount || 0) === 0) {
      toast('Test Unavailable', 'There are no questions attached to this course.', 'error');
      return;
    }
    
    if (course.is_locked) {
      toast('Test Locked', 'This assessment is currently locked by the instructor.', 'error');
      return;
    }
    
    setSelectedCourseForTopics(course);
    setLoadingTopics(true);
    setSelectedTopicIds([]);
    
    fetch(`/api/courses/${course.id || course._id}/topics`)
      .then(res => res.json())
      .then(data => {
        setTopicsForCourse(data);
        setLoadingTopics(false);
      })
      .catch(() => {
        setLoadingTopics(false);
        toast('Error', 'Failed to fetch topics.', 'error');
      });
  };

  // Toggle topics completed
  const toggleTopicCompletedLocal = (topicId: string) => {
    setCompletedTopicIds(prev => {
      const updated = prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId];
      localStorage.setItem('FCF_CompletedSyllabusTopics', JSON.stringify(updated));
      return updated;
    });
    toast('Progress Logged', 'Active syllabus completed status updated.', 'success');
  };

  // Open clinical study notes for a topic
  const openTextbookGuide = (topic: any) => {
    setReadingTopic(topic);
    setNotesContent(topic.notes || '');
  };

  // Dynamic generate textbook note guide using backend Gemini route
  const generateTextbookGuideAI = async () => {
    if (!readingTopic) return;
    setIsGeneratingNotes(true);
    toast('Assembling AI Textbook', 'Qwen is fetching first-principles clinical textbook notes...', 'info');

    try {
      const res = await fetch(`/api/courses/topics/${readingTopic.id || readingTopic._id}/generate-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setNotesContent(data.notes || '');
        if (readingTopic) {
          readingTopic.notes = data.notes;
        }
        toast('Active Guide Loaded', 'Textbook summary guide updated with high-yield annotations.', 'success');
        
        // Re-sync catalog to populate local notes cache
        fetch('/api/courses')
          .then(res => res.json())
          .then(data => setCourses(data))
          .catch(() => {});
      } else {
        toast('Syllabus Hub Exhausted', 'Notes compilation failed or timed out.', 'error');
      }
    } catch (err) {
      toast('Network Exception', 'Notes service busy. Please try again.', 'error');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Study Timetable generator algorithm
  const generateTimetableAndPlan = async () => {
    if (wizardSubjects.length === 0) {
      toast('Required', 'Please select at least one course module to schedule.', 'error');
      return;
    }
    setIsGeneratingPlan(true);
    toast('Formulating Timetable', 'Synthesizing schedule patterns for textbook mastery...', 'info');

    try {
      // Fetch topics of all selected subjects
      const list: any[] = [];
      for (const cid of wizardSubjects) {
        try {
          const res = await fetch(`/api/courses/${cid}/topics`);
          if (res.ok) {
            const tData = await res.json();
            tData.forEach((t: any) => {
              const crs = courses.find(c => (c.id || c._id) === cid);
              list.push({
                id: t.id || t._id,
                name: t.name,
                courseName: crs ? crs.title : 'General',
                courseId: cid,
                notes: t.notes || '',
                questionsCount: t.questionsCount || 0
              });
            });
          }
        } catch {}
      }

      const totalDays = wizardDuration * 7;
      const scheduledDays: Record<string, any[]> = {};

      for (let day = 1; day <= totalDays; day++) {
        scheduledDays[`Day ${day}`] = [];
      }

      if (list.length > 0) {
        // Distribute nicely
        list.forEach((topic, idx) => {
          const targetDayNum = (idx % totalDays) + 1;
          scheduledDays[`Day ${targetDayNum}`].push(topic);
        });

        // For any days left empty, fill with rest reviews
        Object.keys(scheduledDays).forEach(dayKey => {
          if (scheduledDays[dayKey].length === 0) {
            scheduledDays[dayKey].push({
              id: 'review-box',
              name: 'Syllabus Review & High-Yield CBT MCQ Practice',
              courseName: 'System Integration',
              isReview: true
            });
          }
        });
      } else {
        // Fallback placeholder schedule if no database topics exist
        for (let day = 1; day <= totalDays; day++) {
          scheduledDays[`Day ${day}`].push({
            id: `fb-${day}`,
            name: `Diagnostic Review of Selected Coursework`,
            courseName: 'General Study Plan',
            isReview: true
          });
        }
      }

      const generatedPlan = {
        subjects: wizardSubjects,
        durationWeeks: wizardDuration,
        hours: wizardDailyHours,
        days: scheduledDays,
        created_at: new Date().toISOString()
      };

      localStorage.setItem('FCF_StudyPlan_Configs', JSON.stringify(generatedPlan));
      setStudyPlan(generatedPlan);
      toast('Timetable Live', 'Your customized active study timetable is now active!', 'success');
      setWizardStep(3); // Success Screen
    } catch (e: any) {
      toast('Formulation Failure', 'Error constructing schedule profile.', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Clear Study Plan and restart config
  const wipeStudyPlanLocal = () => {
    if (confirm('Are you sure you want to delete your active study plan? You will need to configure a new subject combination timetable.')) {
      localStorage.removeItem('FCF_StudyPlan_Configs');
      setStudyPlan(null);
      setWizardStep(0);
      toast('Plan Purged', 'Timetable and active planner erased.', 'info');
    }
  };

  // Standard proceeds for CBT Exam from modal setup
  const handleTopicToggle = (topic: any) => {
    if (topic.questionsCount === 0) return;
    setSelectedTopicIds(prev => 
      prev.includes(topic.id) ? prev.filter(t => t !== topic.id) : [...prev, topic.id]
    );
  };

  const handleProceedWithTopics = () => {
    if (selectedTopicIds.length === 0) {
      toast('Required', 'Please select at least one topic to proceed', 'error');
      return;
    }
    if (selectedCourseForTopics) {
        setSelectedCourse(selectedCourseForTopics);
        setSelectedTopics(selectedTopicIds as any);
        localStorage.setItem('FCF_SelectedTopics', JSON.stringify(selectedTopicIds)); 
        navigate('/config');
    }
  };

  const filteredCourses = courses.filter(course => course.is_master).filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute stats for Active timetable
  const totalTopicsInPlan = studyPlan ? Object.values(studyPlan.days).flatMap((arr: any) => arr).filter((t: any) => !t.isReview).length : 0;
  const completedTopicsInPlanCount = studyPlan ? Object.values(studyPlan.days).flatMap((arr: any) => arr).filter((t: any) => !t.isReview && completedTopicIds.includes(t.id)).length : 0;
  const overallTimetablePercent = totalTopicsInPlan > 0 ? Math.round((completedTopicsInPlanCount / totalTopicsInPlan) * 100) : 0;

  return (
    <DashboardLayout viewTitle="Classroom">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto w-full flex flex-col h-full overflow-hidden px-1 sm:px-4 py-2"
      >
        {/* Compact Title bar & Global Interactive Study Plan Toggle Button at top */}
        <div className="flex items-center justify-between gap-3 mb-6 shrink-0 bg-slate-100/50 dark:bg-zinc-950 p-2.5 sm:p-4 rounded-3xl border border-slate-205/60 dark:border-slate-800/60 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Database size={16} className="animate-pulse" />
              </div>
              <div className="text-left">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Classroom Syllabi</h2>
                <p className="text-[9px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-extrabold hidden sm:block">Explore active study notes and customized daily planners</p>
              </div>
            </div>
            
            <button
              id="study_plan_top_btn"
              onClick={() => {
                setIsStudyPlanOpen(true);
                setWizardStep(studyPlan ? 3 : 0);
              }}
              className="py-2 px-3 sm:py-2.5 sm:px-5 bg-emerald-850 hover:bg-emerald-900 text-white rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-900/10 active:scale-95 transition-all text-center shrink-0 cursor-pointer"
            >
              <Calendar size={13} className="shrink-0" />
              <span>Study Plan</span>
              {studyPlan && (
                <span className="bg-emerald-500 text-white font-extrabold text-[8px] rounded-full px-1.5 py-0.5 leading-none">
                  {overallTimetablePercent}%
                </span>
              )}
            </button>
        </div>

        {/* Small Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 shrink-0 px-1">
          <div className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
            Active courses matching directory: {filteredCourses.length}
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter syllabus modules..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-white dark:bg-[#050505] border border-slate-205 dark:border-slate-800 shadow-sm rounded-2xl text-xs focus:outline-none focus:border-blue-500 hover:border-slate-350 dark:hover:border-slate-700 transition-all text-slate-900 dark:text-white font-bold"
            />
          </div>
        </div>

        {/* Courses Cards Layout - Styled like the Classroom Screenshot */}
        <div className="flex-1 pb-16 overflow-y-auto custom-scrollbar px-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-200/50 dark:bg-slate-850/50 rounded-3xl animate-pulse" />)}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-slate-450 bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-850 border-dashed rounded-3xl p-6">
               <Database size={28} className="opacity-40 mb-2 text-slate-500" />
               <h4 className="text-xs font-black uppercase tracking-widest text-slate-650 dark:text-white">Directory Empty</h4>
               <p className="text-[10px] mt-1 max-w-xs text-center">No catalog courses match this specified filter query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCourses.map((course, idx) => {
                const iconTag = course.title?.toLowerCase() || '';
                
                // Completed progression percentage check
                const courseTopicIds = course.selected_topic_id ? [String(course.selected_topic_id)] : [];
                // Compute progression
                const completedForC = completedTopicIds.filter(id => courseTopicIds.includes(id)).length;
                const progressC = courseTopicIds.length > 0 ? Math.round((completedForC / courseTopicIds.length) * 100) : 0;

                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ delay: idx * 0.03 }}
                    key={`classroom_${course.id || course._id}`}
                    className="relative bg-white dark:bg-zinc-950/40 border border-slate-200/60 dark:border-slate-800 rounded-[2rem] p-5 flex flex-col justify-between hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(20,83,45,0.05)] transition-all overflow-hidden"
                  >
                    {/* Index Badge Tag (#1, #2...) top-left */}
                    <div className="absolute top-4 left-4 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-slate-200/40 dark:border-slate-800">
                      #{idx + 1}
                    </div>

                    {/* Progression Badge top-right */}
                    <div className="absolute top-4 right-4 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-[9px] text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-950">
                        {progressC}%
                      </div>
                    </div>

                    {/* Vector / Pure CSS Illustration Center */}
                    <div className="mt-8 mb-5 select-none">
                      <CourseIllustration title={course.title} />
                    </div>

                    {/* Text Details & Buttons */}
                    <div className="text-center space-y-4">
                      <div>
                        <span className="text-[8px] tracking-widest uppercase font-black text-slate-450 dark:text-slate-500">
                          {course.code || 'Syllabus Module'}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 mt-0.5">
                          {course.title}
                        </h3>
                      </div>

                      {/* Download Materials & Study button */}
                      <button 
                        onClick={() => handleCourseCatalogClick(course)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download size={12} className="shrink-0" />
                        <span>Download Syllabus</span>
                      </button>
                    </div>

                    {/* Subtle status bottom margin */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900/40 flex items-center justify-between text-[9px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-wider">
                      <span>{course.topicsCount || 0} Topics loaded</span>
                      <span>{course.questionsCount || 0} QCBT Exam Items</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Course Topics details modal with Practice Mock exam and active notes guides */}
      <AnimatePresence>
        {selectedCourseForTopics && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedCourseForTopics(null)}
            />
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#070707] w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative flex flex-col pointer-events-auto max-h-[90vh]"
              >
                {/* Header detail */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100/80 dark:border-slate-850 bg-slate-50/50 dark:bg-black/50 flex items-center justify-between shrink-0 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                      <FolderOpen size={16} />
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-450">Active Syllabus Topics</span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedCourseForTopics.title}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCourseForTopics(null)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-full text-slate-500 dark:text-slate-450 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Body lists */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-left space-y-4">
                  {loadingTopics ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 size={24} className="animate-spin mb-2 text-emerald-500" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">Compiling active topics...</p>
                    </div>
                  ) : topicsForCourse.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-slate-250 dark:border-slate-850 rounded-2xl">
                      <AlertTriangle size={24} className="mx-auto mb-2 text-slate-400" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Syllabus Guide Pending</h4>
                      <p className="text-[10px] text-slate-450 mt-1">This course does not have structured topics detailed under it yet.</p>
                      <button 
                         onClick={() => {
                           setSelectedCourse(selectedCourseForTopics);
                           setSelectedTopics([]);
                           localStorage.setItem('FCF_SelectedTopics', JSON.stringify([])); 
                           navigate('/config');
                         }}
                         className="mt-4 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                      >
                        Proceed with General Pool
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">1. Study textbook notes & active concepts</label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {topicsForCourse.map(topic => {
                          const isCompleted = completedTopicIds.includes(topic.id || topic._id);
                          return (
                            <div
                               key={topic.id || topic._id}
                               className="p-4 rounded-2xl border border-slate-201 dark:border-slate-850 bg-slate-50/30 dark:bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-800 transition-all text-left"
                            >
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <button
                                  onClick={() => toggleTopicCompletedLocal(topic.id || topic._id)}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    isCompleted 
                                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                                      : 'border-slate-201 hover:border-emerald-500 bg-white dark:bg-zinc-950'
                                  }`}
                                  title="Mark syllabus complete"
                                >
                                  {isCompleted && <Check size={12} />}
                                </button>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 tracking-tight leading-normal uppercase">
                                    {topic.name}
                                  </h4>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 mt-1 block">
                                    {topic.questionsCount || 0} MCQs Configured
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                <button
                                  onClick={() => openTextbookGuide(topic)}
                                  className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <BookOpen size={10} />
                                  <span>Textbook Notes</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="h-px bg-slate-100 dark:bg-slate-900 my-4" />

                      {/* Standalone CBT practice exam configuration checkbox */}
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">2. Or Select topics for MCQ Exam Practice</label>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {topicsForCourse.filter(t => t.questionsCount > 0).map(topic => {
                          const isSelected = selectedTopicIds.includes(topic.id || topic._id);
                          return (
                            <button
                              key={`sel-${topic.id || topic._id}`}
                              onClick={() => handleTopicToggle(topic)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl border flex items-center gap-3 text-xs transition-all ${
                                isSelected 
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400' 
                                  : 'border-slate-200 dark:border-slate-850 hover:border-slate-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check size={10} />}
                              </div>
                              <span className="font-bold truncate text-[11px] leading-none uppercase">{topic.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-black/50 flex gap-2.5 shrink-0">
                  <button 
                    disabled={selectedTopicIds.length === 0}
                    onClick={handleProceedWithTopics}
                    className={`w-full py-3.5 rounded-full flex items-center justify-center gap-1.5 font-black text-[10px] uppercase tracking-wider transition-all border ${
                      selectedTopicIds.length > 0 
                        ? 'bg-emerald-800 text-white border-emerald-800 hover:bg-emerald-900 shadow shadow-emerald-900/10 cursor-pointer' 
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Award size={13} className="shrink-0" />
                    <span>Launch CBT Practice</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* FULL PRE-MED STUDY TIMETABLE PLANNER DIALOG */}
      <AnimatePresence>
        {isStudyPlanOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsStudyPlanOpen(false)}
            />
            <div className="fixed inset-0 z-[230] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#070707] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative flex flex-col pointer-events-auto max-h-[85vh]"
              >
                {/* Header details */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-black/40 flex items-center justify-between shrink-0 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/10">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-450">Clinical Active Desk</span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">CBT Study Planner</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsStudyPlanOpen(false)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-150 dark:bg-slate-900 rounded-full text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Main body of Planner Modal */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-left">
                  {wizardStep === 0 && !studyPlan && (
                    <div className="space-y-6 text-center py-6">
                      <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 bg-emerald-500/15 blur-xl rounded-full" />
                        <div className="relative w-full h-full bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center justify-center text-emerald-500">
                          <Calendar size={28} />
                        </div>
                      </div>

                      <div className="space-y-2 max-w-md mx-auto">
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#15803D]">Create Study Plan</h4>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                          You haven't created a study plan yet! A study plan helps you stay organized and focused. With the Study Planner, you can:
                        </p>
                      </div>

                      <div className="max-w-md mx-auto border border-dashed border-slate-201 dark:border-slate-850 p-4 rounded-2xl bg-slate-50/30 dark:bg-black/30 text-left space-y-3.5">
                        <div className="flex items-start gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span className="text-emerald-500 font-extrabold">•</span>
                          <span>Select your subject combinations (English, Biology, Accounts etc.).</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span className="text-emerald-500 font-extrabold">•</span>
                          <span>Set your target preparation study duration.</span>
                        </div>
                        <div className="flex items-start gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span className="text-emerald-500 font-extrabold">•</span>
                          <span>Get an active, personalized daily timetable with topics.</span>
                        </div>
                      </div>

                      <p className="text-[10px] leading-relaxed max-w-xs mx-auto text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wide">
                        This plan ensures you know how many hours to dedicate to cover the syllabus effectively. Take control of your preparation — create your study plan now!
                      </p>

                      <div className="pt-4 flex gap-3 justify-center">
                        <button 
                          onClick={() => setIsStudyPlanOpen(false)}
                          className="py-3 px-6 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Close
                        </button>
                        <button 
                          onClick={() => setWizardStep(1)}
                          className="py-3 px-8 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 1: Subjects Selector */}
                  {wizardStep === 1 && (
                    <div className="space-y-5 py-2">
                      <div>
                        <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">Setup Step 1 of 2</span>
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-805 dark:text-white mt-2">Select Course Combinations</h4>
                        <p className="text-[10px] text-slate-450 leading-relaxed mt-1 uppercase font-bold">Pick the active study modules you want scheduled in your preparation plan</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        {courses.filter(c => c.is_master).map(course => {
                          const isSelected = wizardSubjects.includes(course.id || course._id);
                          return (
                            <button
                              key={`wiz-${course.id || course._id}`}
                              onClick={() => {
                                setWizardSubjects(prev => 
                                  prev.includes(course.id || course._id) 
                                    ? prev.filter(c => c !== (course.id || course._id)) 
                                    : [...prev, course.id || course._id]
                                );
                              }}
                              className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                                isSelected 
                                  ? 'bg-[#EBF7EE]/40 dark:bg-emerald-950/15 border-emerald-500 text-emerald-900 dark:text-emerald-400' 
                                  : 'border-slate-201 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-855'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-widest block text-slate-405">{course.code}</span>
                                <span className="font-extrabold text-xs block leading-tight truncate uppercase">{course.title}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check size={12} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-900 flex justify-between">
                        <button 
                          onClick={() => setWizardStep(0)}
                          className="py-2 px-4 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold uppercase transition-colors"
                        >
                          Back
                        </button>
                        <button 
                          disabled={wizardSubjects.length === 0}
                          onClick={() => setWizardStep(2)}
                          className={`py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            wizardSubjects.length > 0 
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md' 
                              : 'bg-slate-100 text-slate-405 dark:bg-slate-900 cursor-not-allowed'
                          }`}
                        >
                          Next Step
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Set Duration & Generates */}
                  {wizardStep === 2 && (
                    <div className="space-y-6 py-2">
                      <div>
                        <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">Setup Step 2 of 2</span>
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-805 dark:text-white mt-2">Study Intensity & Period</h4>
                        <p className="text-[10px] text-slate-450 leading-relaxed mt-1 uppercase font-bold">Tell us your preparation details to construct your day-by-day study grid</p>
                      </div>

                      <div className="space-y-5">
                        {/* Target window weeks */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">Preparation window length</label>
                          <div className="grid grid-cols-3 gap-2.5">
                            {[2, 4, 8].map(weeks => (
                              <button
                                key={weeks}
                                onClick={() => setWizardDuration(weeks)}
                                className={`py-3 rounded-xl border text-center font-bold text-xs transition-all ${
                                  wizardDuration === weeks 
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/15' 
                                    : 'border-slate-200 hover:border-slate-350 dark:border-slate-850'
                                }`}
                              >
                                {weeks} Weeks
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Daily target commitment hours */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[#166534]">Committed hours per day</label>
                          <div className="grid grid-cols-4 gap-2.5">
                            {[1, 2, 3, 4].map(hours => (
                              <button
                                key={hours}
                                onClick={() => setWizardDailyHours(hours)}
                                className={`py-3 rounded-xl border text-center font-bold text-xs transition-all ${
                                  wizardDailyHours === hours 
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10' 
                                    : 'border-slate-201 hover:border-slate-350 dark:border-slate-850'
                                }`}
                              >
                                {hours} {hours === 1 ? 'Hour' : 'Hours'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-900 flex justify-between">
                        <button 
                          onClick={() => setWizardStep(1)}
                          className="py-2 px-4 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold uppercase transition-colors"
                        >
                          Back
                        </button>
                        <button 
                          onClick={generateTimetableAndPlan}
                          disabled={isGeneratingPlan}
                          className="py-3 px-6 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
                        >
                          {isGeneratingPlan ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Mapping topics...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} />
                              <span>Assemble Plan</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE STUDY PLAN PLAN TIMETABLE SCHEDULE GRID (Step 3 or direct open) */}
                  {wizardStep === 3 && studyPlan && (
                    <div className="space-y-5 py-2">
                      {/* Interactive timing progress */}
                      <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-101 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase tracking-tight text-slate-850 dark:text-white">Mastery Timetable is Live!</h4>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className="bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                              {studyPlan.durationWeeks} Weeks Target
                            </span>
                            <span className="bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                              {studyPlan.hours} Hours comprometido/day
                            </span>
                          </div>
                        </div>

                        {/* Slide progress track bar */}
                        <div className="sm:text-right space-y-1 shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#15803D]">Preparation Goal progression</span>
                          <div className="flex items-center gap-2.5">
                            <div className="w-28 h-1.5 bg-slate-201 dark:bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-505 to-teal-500 transition-all duration-300"
                                style={{ width: `${overallTimetablePercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-850 dark:text-white leading-none">{overallTimetablePercent}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Day-by-Day Topics List */}
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-450">Active Timetable Topics Planner</label>
                          <button
                            onClick={wipeStudyPlanLocal}
                            className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 cursor-pointer flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded"
                          >
                            <Trash2 size={10} />
                            <span>Purge Plan</span>
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {Object.keys(studyPlan.days).map((dayKey) => {
                            const topicsForDay = studyPlan.days[dayKey];
                            return (
                              <div key={dayKey} className="p-3 border border-slate-202/60 dark:border-slate-850 bg-white dark:bg-zinc-950/10 rounded-2xl space-y-2">
                                <span className="text-[8px] tracking-widest font-black uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                                  {dayKey} study session
                                </span>
                                
                                <div className="space-y-2 pl-1.5 pt-1">
                                  {topicsForDay.map((topic: any) => {
                                    const isCompleted = completedTopicIds.includes(topic.id);
                                    if (topic.isReview) {
                                      return (
                                        <div key={topic.id} className="text-slate-405 dark:text-slate-500 text-[10px] italic font-bold">
                                          {topic.name}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={topic.id} className="flex items-center justify-between gap-3 text-left">
                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                          <button
                                            onClick={() => toggleTopicCompletedLocal(topic.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                              isCompleted 
                                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                                : 'border-slate-300 hover:border-emerald-500 bg-white'
                                            }`}
                                          >
                                            {isCompleted && <Check size={10} />}
                                          </button>
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-extrabold text-slate-805 dark:text-slate-205 leading-tight truncate uppercase">
                                              {topic.name}
                                            </p>
                                            <span className="text-[7.5px] font-black uppercase text-slate-450 tracking-wider">
                                              {topic.courseName}
                                            </span>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => {
                                            setIsStudyPlanOpen(false);
                                            openTextbookGuide(topic);
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-650 dark:text-slate-300 text-[8px] uppercase tracking-wider font-extrabold rounded-md transition-all cursor-pointer"
                                        >
                                          Read Notes
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-black/50 flex justify-end">
                  <button 
                    onClick={() => setIsStudyPlanOpen(false)}
                    className="py-2.5 px-6 bg-slate-850 hover:bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Exit Plan Desk
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* DETAILED ACTIVE TEXTBOOK guide notes READER */}
      <AnimatePresence>
        {readingTopic && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[240] bg-slate-900/70 backdrop-blur-md"
              onClick={() => setReadingTopic(null)}
            />
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-5 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white dark:bg-[#070707] w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative flex flex-col pointer-events-auto max-h-[92vh]"
              >
                {/* Header detail info */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/30 dark:bg-black/40 flex items-center justify-between shrink-0 text-left">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setReadingTopic(null)}
                      className="p-1.5 hover:bg-slate-150 dark:hover:bg-zinc-900 rounded-full text-slate-500 cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <span className="text-[8px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider block w-max">
                        Syllabus Textbook Desk
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mt-1 truncate max-w-[280px] sm:max-w-[450px]">
                        {readingTopic.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mastery Toggle */}
                    <button
                      onClick={() => toggleTopicCompletedLocal(readingTopic.id || readingTopic._id)}
                      className={`py-1.5 px-3 rounded-full text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                        completedTopicIds.includes(readingTopic.id || readingTopic._id)
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-slate-100 border border-slate-201 text-slate-600 hover:bg-emerald-650 hover:text-white hover:border-emerald-650'
                      }`}
                    >
                      {completedTopicIds.includes(readingTopic.id || readingTopic._id) ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Plus size={10} />}
                      <span>{completedTopicIds.includes(readingTopic.id || readingTopic._id) ? 'Mastered' : 'Master Topic'}</span>
                    </button>

                    <button 
                      onClick={() => setReadingTopic(null)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-full text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* notes markdown rendered body */}
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar text-left bg-[#FFFFFF] dark:bg-black/20">
                  {isGeneratingNotes ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                      <Loader2 size={36} className="animate-spin text-blue-500 mb-4" />
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#2563EB]">Piping Academic Material</h4>
                      <p className="text-[10px] text-slate-450 mt-1 max-w-xs text-center font-bold uppercase tracking-widest">
                        Qwen is performing dynamic textbooks expansion and rendering high-contrast clinical schemas...
                      </p>
                    </div>
                  ) : notesContent ? (
                    <div className="space-y-6 max-w-3xl mx-auto">
                      <div className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
                        <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">Active study guide standard</span>
                        <h2 className="text-lg font-black text-slate-805 dark:text-white uppercase tracking-tight mt-1">{readingTopic.name}</h2>
                      </div>
                      <StudyGuideRenderer content={notesContent} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 max-w-md mx-auto text-center space-y-5">
                      <div className="p-3.5 bg-blue-500/10 text-blue-600 rounded-full border border-blue-500/20">
                        <Sparkles size={28} className="animate-pulse" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Dynamic Active Study compile</h4>
                        <p className="text-[11px] font-bold text-slate-655 dark:text-slate-405 leading-relaxed">
                          This syllabus topic textbook notes haven't been compiled by the academic tutors yet. Ask Qwen AI to dynamically construct premium study materials for you instantly!
                        </p>
                      </div>

                      <button
                        onClick={generateTextbookGuideAI}
                        disabled={isGeneratingNotes}
                        className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={12} className="text-white" />
                        <span>Generate Active Textbook with AI</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer status bar */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-black/50 flex items-center justify-between shrink-0">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-450">Active desk study room</span>
                  <button 
                    onClick={() => setReadingTopic(null)}
                    className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Conclude Reading
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
