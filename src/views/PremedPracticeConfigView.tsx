import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  ArrowLeft, Check, Play, BookOpen, Clock, Settings, Filter, Edit, Search, SlidersHorizontal, Info, Sparkles, X
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';

export default function PremedPracticeConfigView() {
  const { setSelectedCourse, setSelectedTopics, setTestResult, token } = useAppContext();
  const navigate = useNavigate();

  // Modals Visibility
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false);

  // Master Courses and loading states
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Selected configuration state
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  // Map of courseId -> array of selected specific topic ids
  const [selectedTopicsMap, setSelectedTopicsMap] = useState<Record<string, string[]>>({});
  
  // Map of courseId -> array of all fetched topic objects
  const [courseTopicsMap, setCourseTopicsMap] = useState<Record<string, any[]>>({});
  const [loadingTopicsMap, setLoadingTopicsMap] = useState<Record<string, boolean>>({});

  // Active Subject tab for topic configuration
  const [activeTabCourseId, setActiveTabCourseId] = useState<string>('');
  
  // Test Options
  const [questionCountPerSubject, setQuestionCountPerSubject] = useState<number>(30);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('');
  const [testMode, setTestMode] = useState<'practice' | 'mock' | 'study'>('practice');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);

  // Search filter for topics
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');

  // Fetch all Master Courses (subjects)
  useEffect(() => {
    setLoadingCourses(true);
    fetch('/api/courses')
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      })
      .then(data => {
        // Filter master courses (e.g. subjects like Physics, Biology, Chemistry, English, etc.)
        const masterCourses = data.filter((course: any) => course.is_master);
        setCourses(masterCourses);
        setLoadingCourses(false);

        // Pre-select first 3 or 4 courses if available to welcome the student
        if (masterCourses.length > 0) {
          const initialIds = masterCourses.slice(0, 4).map((c: any) => c.id || c._id);
          setSelectedCourseIds(initialIds);
          if (initialIds.length > 0) {
            setActiveTabCourseId(initialIds[0]);
          }
          
          // Load topics for these pre-selected courses
          initialIds.forEach(id => {
            fetchCourseTopics(id);
          });
        }
      })
      .catch(() => {
        setLoadingCourses(false);
        toast('Connection Error', 'Unable to retrieve subject listing. Check connection.', 'error');
      });

    // Reset standard outcomes
    setSelectedCourse(null);
    setTestResult(null);
    setSelectedTopics([]);
  }, [setSelectedCourse, setTestResult, setSelectedTopics]);

  // Fetch Topics specifically for a Course ID
  const fetchCourseTopics = (courseId: string) => {
    if (courseTopicsMap[courseId]) return; // already loaded

    setLoadingTopicsMap(prev => ({ ...prev, [courseId]: true }));
    fetch(`/api/courses/${courseId}/topics`)
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      })
      .then(data => {
        setCourseTopicsMap(prev => ({ ...prev, [courseId]: data }));
        // By default, select all topics in this course
        const allIds = data.map((t: any) => t.id || t._id);
        setSelectedTopicsMap(prev => ({ ...prev, [courseId]: allIds }));
        setLoadingTopicsMap(prev => ({ ...prev, [courseId]: false }));
      })
      .catch(() => {
        setLoadingTopicsMap(prev => ({ ...prev, [courseId]: false }));
        toast('Error', 'Unable to load topics for this subject.', 'error');
      });
  };

  // Handle ticking of a subject
  const toggleCourseSelect = (courseId: string) => {
    const isAlreadySelected = selectedCourseIds.includes(courseId);
    
    if (isAlreadySelected) {
      const next = selectedCourseIds.filter(id => id !== courseId);
      setSelectedCourseIds(next);
      // adjust active config tab if we removed the active tab item
      if (activeTabCourseId === courseId) {
        setActiveTabCourseId(next[0] || '');
      }
    } else {
      if (selectedCourseIds.length >= 4) {
        toast('Limit Reached', 'You can select a maximum of 4 subjects for a multi-course practice session.', 'info');
        return;
      }
      const next = [...selectedCourseIds, courseId];
      setSelectedCourseIds(next);
      setActiveTabCourseId(courseId);
      fetchCourseTopics(courseId);
    }
  };

  // Align custom timeframe preset values
  useEffect(() => {
    // Provide a good recommended time: 1.2 minutes per question per subject
    const selectedCount = selectedCourseIds.length || 1;
    const finalCount = customQuestionCount !== '' ? parseInt(customQuestionCount, 10) : questionCountPerSubject;
    const totalQuestions = finalCount * selectedCount;
    const recommendedMinutes = Math.max(15, Math.round(totalQuestions * 1.2));
    setDurationMinutes(recommendedMinutes);
  }, [questionCountPerSubject, selectedCourseIds.length, customQuestionCount]);

  // Sub-Topic Selection Actions for active tab
  const toggleTopic = (courseId: string, topicId: string) => {
    setSelectedTopicsMap(prev => {
      const current = prev[courseId] || [];
      const next = current.includes(topicId)
        ? current.filter(id => id !== topicId)
        : [...current, topicId];
      return { ...prev, [courseId]: next };
    });
  };

  const handleSelectAllTopics = (courseId: string) => {
    const topics = courseTopicsMap[courseId] || [];
    const currentSelected = selectedTopicsMap[courseId] || [];
    const visibleTopicIds = topics
      .filter(t => t.name && t.name.toLowerCase().includes(topicSearchQuery.toLowerCase()))
      .map(t => t.id || t._id);

    const allAreSelected = visibleTopicIds.every(id => currentSelected.includes(id));

    setSelectedTopicsMap(prev => {
      const current = prev[courseId] || [];
      let next;
      if (allAreSelected) {
        // Deselect only the currently visible filtered ones
        next = current.filter(id => !visibleTopicIds.includes(id));
      } else {
        // Union visible topics with currently selected
        next = Array.from(new Set([...current, ...visibleTopicIds]));
      }
      return { ...prev, [courseId]: next };
    });
  };

  const getActiveTopicCountDesc = (courseId: string, isCompact: boolean = false) => {
    const selected = selectedTopicsMap[courseId] || [];
    const total = (courseTopicsMap[courseId] || []).length;
    if (total === 0) return 'Loading...';
    if (selected.length === total) return isCompact ? 'ALL' : 'All Topics';
    if (selected.length === 0) return isCompact ? 'NONE' : 'No Topics Selected';
    return isCompact ? `${selected.length}/${total}` : `${selected.length}/${total} Topics`;
  };

  const getModeDescription = () => {
    switch (testMode) {
      case 'practice':
        return 'Standard module with immediate explanations upon submitting responses. Untimed option available.';
      case 'mock':
        return 'Fully strict simulated proctored exam. Time limits enforced, proctor check enabled, and results released at submission.';
      case 'study':
        return 'Relaxed learning loop with diagnostic assistance, hints, and inline materials to master subjects.';
    }
  };

  // Launch Action Handlers
  const handleStartPractice = () => {
    if (selectedCourseIds.length === 0) {
      toast('Required Selection', 'Please select at least one subject to practice.', 'error');
      return;
    }

    if (selectedCourseIds.length < 3) {
      toast('Suggestion', 'Selecting 3 or 4 subjects provides the most realistic multi-course review experience!', 'info');
    }

    // Ensure they have designated at least one topic for each selected course
    for (const courseId of selectedCourseIds) {
      const topicsSelected = selectedTopicsMap[courseId] || [];
      if (topicsSelected.length === 0) {
        const matchedCourse = courses.find(c => (c.id || c._id) === courseId);
        toast('Configuration Incomplete', `Please select at least one topic for ${matchedCourse?.title || 'each course'}.`, 'error');
        return;
      }
    }

    const finalQuestionCount = customQuestionCount !== '' 
      ? parseInt(customQuestionCount, 10) 
      : questionCountPerSubject;

    if (isNaN(finalQuestionCount) || finalQuestionCount <= 0) {
      toast('Invalid Input', 'Please enter a valid count of questions.', 'error');
      return;
    }

    const finalDurationMinutes = customDuration !== ''
      ? parseInt(customDuration, 10)
      : durationMinutes;

    if (isNaN(finalDurationMinutes) || finalDurationMinutes <= 0) {
      toast('Invalid Duration', 'Please enter a valid practice duration.', 'error');
      return;
    }

    // Build the request configurations for combined launch
    const configPayload = selectedCourseIds.map(id => ({
      courseId: id,
      topics: selectedTopicsMap[id] || []
    }));

    toast('Preparing Multi-Course CBT', 'Assembling random assessment item configurations...', 'info');

    // POST Request
    fetch('/api/simulation/start-multicourse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        configs: configPayload,
        limit: finalQuestionCount,
        expectedDuration: finalDurationMinutes * 60,
        deviceId: localStorage.getItem('FCF_DeviceID') || Math.random().toString(36).substring(2),
        testMode,
        shuffleQuestions,
        shuffleOptions
      })
    })
    .then(async (res) => {
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Save the multi-course session block cleanly inside LocalStorage
      const multiSession = {
        startTime: Date.now(),
        expectedDuration: finalDurationMinutes * 60,
        courses: data.courses, // array of { courseId, courseTitle, courseCode, sessionId, questions }
        answers: {}, // map of qId -> student option selection text
        flags: {}, // map of qId -> boolean flag state
        currentTabCourseId: data.courses[0]?.courseId || '',
        currentIdxByCourse: {}, // map of courseId -> integer index offset
        shuffleQuestions,
        shuffleOptions,
        testMode
      };

      localStorage.setItem('FCF_MulticourseSession', JSON.stringify(multiSession));
      toast('CBT Generated Successfully', `Assembled ${data.courses.length} course components. Starting now!`, 'success');

      // Go directly to our beautiful dedicated multi-course test interface
      navigate('/practice-session');
    })
    .catch(err => {
      toast('Generation Failed', err.message || 'Server encountered an error while starting combined test.', 'error');
    });
  };

  // Find currently active course object for rendering sub-topics filter
  const activeTabCourseObj = courses.find(c => (c.id || c._id) === activeTabCourseId);
  const activeTabTopics = courseTopicsMap[activeTabCourseId] || [];
  const filteredTopics = activeTabTopics.filter(t => 
    t.name && t.name.toLowerCase().includes(topicSearchQuery.toLowerCase())
  );

  return (
    <DashboardLayout viewTitle="Practice Studio">
      <div className="max-w-5xl mx-auto w-full px-2 sm:px-6 py-2 flex flex-col text-slate-800 dark:text-slate-100">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              aria-label="Back button"
              className="p-2 ml-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-600 dark:text-slate-350"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest bg-indigo-120 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 rounded flex items-center gap-1">
                  <Sparkles size={8} /> Multi-Course CBT Prep
                </span>
                <span className="text-[10px] font-bold text-slate-400">• High IQ practice session</span>
              </div>
              <h1 className="text-lg sm:text-xl font-serif font-black tracking-tight uppercase">
                Interactive Multi-Course Studio
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartPractice}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-550 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play size={12} fill="currentColor" />
              <span>LAUNCH CBT</span>
            </button>
          </div>
        </div>

        {/* Content Workspace Splitter */}
        <div className="py-4 space-y-4">
          
          {/* COMPACT SETUP OVERVIEW (SUBJECTS & SYLLABUS TOPICS MODAL LAUNCHERS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Subject Selector Mini Module */}
            <div className="p-3.5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-md relative overflow-hidden group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-indigo-500 shrink-0" />
                    Step 1: Subjects selected
                  </span>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                    {selectedCourseIds.length} of 4 Selected
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedCourseIds.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No master subjects chosen yet. Tap adjust below!</span>
                  ) : (
                    selectedCourseIds.map(id => {
                      const matched = courses.find(c => (c.id || c._id) === id);
                      return (
                        <div 
                          key={`badge_${id}`} 
                          className="px-2 py-1 text-[10.5px] font-extrabold uppercase bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-lg flex items-center gap-1.5 font-mono"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>{matched?.code || 'Subject'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(true)}
                className="w-full py-2 bg-slate-50 hover:bg-indigo-50/20 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Edit size={12} />
                <span>Choose Subjects ({selectedCourseIds.length}/4)</span>
              </button>
            </div>

            {/* Syllabus Topics Config Mini Module */}
            <div className="p-3.5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-md relative overflow-hidden group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Filter size={12} className="text-indigo-500 shrink-0" />
                    Step 2: Syllabus Modules
                  </span>
                  <span className="text-[9px] font-bold text-slate-405 dark:text-zinc-400 uppercase tracking-wide">
                    Topic Configuration
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-zinc-350 font-medium max-h-[85px] overflow-y-auto custom-scrollbar">
                  {selectedCourseIds.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Select subjects first to modify included syllabus modules.</span>
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      {selectedCourseIds.map(id => {
                        const matched = courses.find(c => (c.id || c._id) === id);
                        return (
                          <button 
                            key={`summary_topic_${id}`} 
                            onClick={() => {
                              setActiveTabCourseId(id);
                              fetchCourseTopics(id);
                              setIsTopicsModalOpen(true);
                            }}
                            className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850/45 pb-1.5 pt-0.5 last:border-b-0 last:pb-0 text-left hover:bg-indigo-500/5 dark:hover:bg-indigo-400/5 px-1.5 rounded-lg transition-all group/item cursor-pointer w-full select-none"
                          >
                            <span className="truncate max-w-[150px] font-black text-[10.5px] text-slate-700 dark:text-zinc-200 uppercase group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                              {matched?.code || 'Subject'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-slate-400 group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400 transition-colors opacity-0 group-hover/item:opacity-100 hidden sm:inline-block">
                                Edit ✎
                              </span>
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded leading-none shrink-0 group-hover/item:bg-indigo-150 dark:group-hover/item:bg-indigo-950 transition-all">
                                {getActiveTopicCountDesc(id)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={selectedCourseIds.length === 0}
                onClick={() => {
                  // Ensure active tab matches one of selected if it doesn't currently
                  if (!selectedCourseIds.includes(activeTabCourseId) && selectedCourseIds.length > 0) {
                    setActiveTabCourseId(selectedCourseIds[0]);
                    fetchCourseTopics(selectedCourseIds[0]);
                  }
                  setIsTopicsModalOpen(true);
                }}
                className={`w-full py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 border ${
                  selectedCourseIds.length === 0 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900/10 dark:border-slate-850 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-slate-50 hover:bg-indigo-50/20 dark:bg-slate-900/50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>Customize Sub-Topics</span>
              </button>
            </div>

          </div>

          {/* MODAL 1: SUBJECT SELECTION */}
          <AnimatePresence>
            {isSubjectModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative w-full max-w-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 shrink-0">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                        <BookOpen size={14} className="text-indigo-500" /> Choose Practice Subjects
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                        Select 3 or 4 combined for optimal exam setup (max 4)
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsSubjectModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Grid listing */}
                  <div className="flex-1 overflow-y-auto py-4 pr-1 custom-scrollbar space-y-3">
                    {loadingCourses ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                        <span className="text-[11px] text-slate-400 font-medium">Downloading available subjects catalogue...</span>
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <p className="text-xs font-medium text-slate-400">No master subjects listed currently.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                        {courses.map(course => {
                          const courseId = course.id || course._id;
                          const isSelected = selectedCourseIds.includes(courseId);
                          return (
                            <button
                              key={`modal_card_${courseId}`}
                              onClick={() => toggleCourseSelect(courseId)}
                              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group select-none cursor-pointer ${
                                isSelected 
                                  ? 'bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:from-slate-900/60 dark:to-indigo-950/20 border-indigo-200 dark:border-indigo-950/80 shadow shadow-indigo-150/10' 
                                  : 'bg-white dark:bg-slate-900/10 border-slate-200 dark:border-slate-850 hover:bg-slate-50/80 dark:hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="space-y-0.5">
                                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                    {course.code || 'MASTER'}
                                  </span>
                                  <h3 className="text-xs sm:text-[13px] font-bold uppercase tracking-tight text-slate-800 dark:text-zinc-100 leading-tight">
                                    {course.title}
                                  </h3>
                                </div>

                                <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-black/20'
                                }`}>
                                  {isSelected && <Check size={10} strokeWidth={3.5} />}
                                </div>
                              </div>

                              <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-850/60 flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 leading-none">
                                <span>{course.questionsCount || 0} Questions Available</span>
                                {isSelected && (
                                  <span className="text-[8px] text-[#4f46e5] dark:text-[#818cf8] uppercase tracking-wider font-black bg-[#4f46e5]/10 dark:bg-[#818cf8]/15 px-1.5 py-0.5 rounded leading-none shrink-0 animate-pulse">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer confirm */}
                  <div className="pt-3 border-t border-slate-150 dark:border-slate-800 shrink-0 flex justify-end">
                    <button
                      onClick={() => setIsSubjectModalOpen(false)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Confirm Selection ({selectedCourseIds.length})
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MODAL 2: SYLLABUS TOPICS CONFIG */}
          <AnimatePresence>
            {isTopicsModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsTopicsModalOpen(false)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative w-full max-w-4xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-155 dark:border-slate-800 shrink-0">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Filter size={14} className="text-indigo-500" /> Syllabus Modules Customizer
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                        Refine which specific sub-topics are loaded into each CBT component
                      </p>
                    </div>
                    <button 
                      onClick={() => setIsTopicsModalOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-all"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-[350px] my-4 bg-slate-50/50 dark:bg-[#09090b] rounded-2xl border border-slate-200 dark:border-slate-850">
                    {/* Left side Tab subject column */}
                    <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-850 p-2 md:p-3 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto md:overflow-x-visible gap-1.5 md:gap-1.5 items-center md:items-stretch custom-scrollbar select-none bg-slate-100/30 dark:bg-black/10">
                      {selectedCourseIds.map(id => {
                        const matched = courses.find(c => (c.id || c._id) === id);
                        const isActive = activeTabCourseId === id;
                        if (!matched) return null;
                        return (
                          <button
                            key={`modal_tab_${id}`}
                            onClick={() => {
                              setActiveTabCourseId(id);
                              setTopicSearchQuery('');
                              fetchCourseTopics(id);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-left text-xs uppercase tracking-tight transition-all shrink-0 flex items-center justify-between gap-2.5 cursor-pointer w-auto md:w-full whitespace-nowrap min-w-[130px] md:min-w-0 font-extrabold select-none ${
                              isActive 
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm border border-indigo-600 dark:border-indigo-400 font-black' 
                                : 'bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                              <span className={`truncate text-[10.5px] md:text-xs font-black select-none ${isActive ? 'text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                                {matched.code || matched.title}
                              </span>
                            </div>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 select-none ${
                              isActive 
                                ? 'bg-indigo-700/80 dark:bg-indigo-650 text-white' 
                                : 'bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500'
                            }`}>
                              {getActiveTopicCountDesc(id, true)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sub Topics List panel */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-transparent overflow-hidden">
                      {activeTabCourseObj ? (
                        <>
                          {/* Search Filter Header */}
                          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/20 dark:bg-black/30">
                            <div className="relative w-full sm:w-60">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                              <input
                                type="text"
                                placeholder="Search sub-topics..."
                                value={topicSearchQuery}
                                onChange={(e) => setTopicSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-850 rounded-lg focus:outline-none focus:border-indigo-505 font-bold"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectAllTopics(activeTabCourseId)}
                              className="px-2.5 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded uppercase tracking-wider transition-all"
                            >
                              {(selectedTopicsMap[activeTabCourseId] || []).length === activeTabTopics.length ? 'Deselect All' : 'Select All Topics'}
                            </button>
                          </div>

                          {/* Topics Selection Grid */}
                          <div className="p-3 overflow-y-auto custom-scrollbar flex-1 text-left">
                            {loadingTopicsMap[activeTabCourseId] ? (
                              <div className="py-12 text-center text-slate-400 space-y-2 flex flex-col items-center justify-center">
                                <div className="w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider">Syncing topics...</span>
                              </div>
                            ) : filteredTopics.length === 0 ? (
                              <div className="py-12 text-center text-slate-400">
                                <p className="text-xs">No topics matching search query.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {filteredTopics.map(topic => {
                                  const tId = topic.id || topic._id;
                                  const isSelected = (selectedTopicsMap[activeTabCourseId] || []).includes(tId);
                                  return (
                                    <button
                                      key={`modal_topic_${tId}`}
                                      onClick={() => toggleTopic(activeTabCourseId, tId)}
                                      className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between gap-2.5 cursor-pointer ${
                                        isSelected 
                                          ? 'bg-indigo-50/40 border-indigo-200 dark:bg-indigo-950/10 dark:border-indigo-900/40' 
                                          : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-850'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 overflow-hidden">
                                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                          isSelected
                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                            : 'border-slate-350 dark:border-slate-700'
                                        }`}>
                                          {isSelected && <Check size={11} strokeWidth={3.5} />}
                                        </div>
                                        <span className="truncate font-black text-slate-700 dark:text-slate-250 uppercase tracking-tight text-[10.5px]">
                                          {topic.name}
                                        </span>
                                      </div>
                                      
                                      {topic.questionsCount !== undefined && (
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded shrink-0">
                                          {topic.questionsCount} Qs
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400">
                          <p className="text-xs font-semibold">Select at least one subject to configure syllabus elements.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer confirm */}
                  <div className="pt-2 border-t border-slate-150 dark:border-slate-800 shrink-0 flex justify-end">
                    <button
                      onClick={() => setIsTopicsModalOpen(false)}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:brightness-105 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* STEP 3: Test Options, Volume and Duration Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Volume Picker */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Settings size={13} className="text-slate-400" /> Questions Per Subject
                </h3>
                {customQuestionCount !== '' && (
                  <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded uppercase">
                    Custom Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[10, 20, 30, 40].map((num) => (
                  <button
                    key={`qcnt_${num}`}
                    onClick={() => {
                      setQuestionCountPerSubject(num);
                      setCustomQuestionCount('');
                    }}
                    className={`h-11 rounded-xl flex flex-col justify-center items-center font-black text-xs transition-all cursor-pointer border ${
                      questionCountPerSubject === num && customQuestionCount === ''
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350'
                    }`}
                  >
                    <span>{num}</span>
                    <span className="text-[8px] opacity-60 font-medium">Items</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom:</span>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  min="1"
                  max="100"
                  value={customQuestionCount}
                  onChange={(e) => {
                    setCustomQuestionCount(e.target.value);
                  }}
                  className="flex-1 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 rounded-lg text-xs font-black text-center focus:outline-none focus:border-indigo-505 transition-all"
                />
              </div>
            </div>

            {/* Timed Frame */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400" /> Combined Practice Time Limit
                </h3>
                <span className="text-[10px] font-bold text-slate-800 dark:text-indigo-200 py-0.5 bg-slate-100 dark:bg-indigo-950/40 rounded px-1.5 border border-indigo-150/10">
                  {customDuration !== '' ? `${customDuration} mins` : `${durationMinutes} mins`}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[60, 90, 120, 180].map((mins) => (
                  <button
                    key={`dcnt_${mins}`}
                    onClick={() => {
                      setDurationMinutes(mins);
                      setCustomDuration('');
                    }}
                    className={`h-11 rounded-xl flex flex-col justify-center items-center font-black text-xs transition-all cursor-pointer border ${
                      durationMinutes === mins && customDuration === ''
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm shadow-indigo-500/10'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350'
                    }`}
                  >
                    <span>{mins}</span>
                    <span className="text-[8px] opacity-60 font-medium">Mins</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom:</span>
                <input
                  type="number"
                  placeholder="Minutes"
                  min="1"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                  }}
                  className="flex-1 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 rounded-lg text-xs font-black text-center focus:outline-none focus:border-indigo-505 transition-all"
                />
              </div>
            </div>

          </div>

          {/* Test Diagnosis Mode Block */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-slate-400" /> Mode Tuning
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {(['practice', 'mock', 'study'] as const).map((mode) => (
                <button
                  key={`mode_${mode}`}
                  onClick={() => setTestMode(mode)}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    testMode === mode 
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/60 rounded-xl relative flex items-start gap-2.5">
              <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#4f46e5] dark:text-[#818cf8] leading-none block mb-1">
                  {testMode} mode info
                </span>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium select-none text-left">
                  {getModeDescription()}
                </p>
              </div>
            </div>
          </div>

          {/* Core Randomizers & Options */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-[1.5rem] space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-2">
              <Settings size={13} className="text-slate-400" /> Session Options
            </h3>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-900">
              <div className="text-left">
                <span className="text-xs font-bold block text-slate-850 dark:text-slate-200">Shuffle Questions</span>
                <span className="text-[10px] text-slate-400 font-medium">Reorders assessment items randomly.</span>
              </div>
              <button
                aria-label="shuffle questions toggle"
                onClick={() => setShuffleQuestions(!shuffleQuestions)}
                className={`w-11 h-6 rounded-full p-0.5 flex transition-colors cursor-pointer ${shuffleQuestions ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-800 justify-start'}`}
              >
                <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div className="text-left">
                <span className="text-xs font-bold block text-slate-855 dark:text-slate-200">Shuffle Choice Options</span>
                <span className="text-[10px] text-slate-400 font-medium">Reorders test question answers randomly.</span>
              </div>
              <button
                aria-label="shuffle choice options toggle"
                onClick={() => setShuffleOptions(!shuffleOptions)}
                className={`w-11 h-6 rounded-full p-0.5 flex transition-colors cursor-pointer ${shuffleOptions ? 'bg-emerald-500 justify-end' : 'bg-slate-300 dark:bg-slate-800 justify-start'}`}
              >
                <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>

          {/* Launch Action */}
          <div className="pt-4 shrink-0">
            <button
              onClick={handleStartPractice}
              className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-550 hover:to-emerald-555 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              <span>Launch Combined CBT Session</span>
            </button>
          </div>

        </div>

      </div>

    </DashboardLayout>
  );
}
