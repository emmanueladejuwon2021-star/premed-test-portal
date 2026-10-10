import React, { useState, useEffect } from 'react';
import { Course } from '../../context/AppContext';
import { toast } from '../Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Save, Lock, Unlock, PlayCircle, Eye, EyeOff, BookOpen, 
  Layers, Zap, Calendar, Clock, Sparkles, CheckCircle2, ChevronRight, RefreshCw, 
  X, Plus, Trash2, Award, FileText, LockKeyhole, Edit2, Search, Filter, 
  AlertTriangle, Check, Sliders, Hash, FolderOpen, AlertCircle
} from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  question_count?: number;
  questionsCount?: number;
}

interface DeploymentHubProps {
  courses: Course[];
  adminToken: string;
  onRefreshDashboard?: () => void;
}

export default function DeploymentHub({ courses, adminToken, onRefreshDashboard }: DeploymentHubProps) {
  // Course/Topic selection states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [allCoursesList, setAllCoursesList] = useState<Course[]>(courses);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // inline editing states
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestData, setEditingTestData] = useState<any>(null);

  // Tab-state indicator for split-registry vs configure
  const [rightActiveTab, setRightActiveTab] = useState<'registry' | 'deploy'>('registry');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'live' | 'mock'>('all');
  const [lockFilter, setLockFilter] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');

  // New Test Instance Creation State
  const [newTest, setNewTest] = useState({
    title: '',
    duration: 30,
    question_limit: 20,
    attempts_allowed: 1,
    question_timer_limit: 0,
    is_mock: true,
    scheduled_date: '',
    end_date: '',
    is_locked: true,
    results_locked: true,
    force_start: false
  });

  // Multi-Course Deployment States
  const [deploymentMode, setDeploymentMode] = useState<'single' | 'multi'>('single');
  const [multicourseConfig, setMulticourseConfig] = useState<any[]>([]);
  const [cachedTopicsMap, setCachedTopicsMap] = useState<Record<string, Topic[]>>({});
  const [loadingTopicsMap, setLoadingTopicsMap] = useState<Record<string, boolean>>({});
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);

  // Unique canonical/syllabus modules based on unique course code (Academic Master registries only)
  const uniqueLessonModules = React.useMemo(() => {
    return allCoursesList.filter(c => c.is_master);
  }, [allCoursesList]);

  // Pre-populate multicourse configuration
  useEffect(() => {
    if (uniqueLessonModules.length > 0 && multicourseConfig.length === 0) {
      setMulticourseConfig(
        uniqueLessonModules.map(c => ({
          courseId: c.id || (c as any)._id || '',
          code: c.code,
          title: c.title,
          enabled: false,
          topics: [], // selected sub-topic IDs
          question_limit: 15
        }))
      );
    }
  }, [uniqueLessonModules, multicourseConfig.length]);

  // Lazy-fetch topics for enabled courses
  const fetchTopicsForCourse = async (courseId: string) => {
    if (cachedTopicsMap[courseId] || !courseId) return;
    setLoadingTopicsMap(prev => ({ ...prev, [courseId]: true }));
    try {
      const res = await fetch(`/api/courses/${courseId}/topics`);
      if (res.ok) {
        const data = await res.json();
        setCachedTopicsMap(prev => ({ ...prev, [courseId]: data }));
      }
    } catch {
      toast('Error', 'Unable to fetch topics for subject.', 'error');
    } finally {
      setLoadingTopicsMap(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleMulticourseSubject = (courseId: string) => {
    setMulticourseConfig(prev =>
      prev.map(c => {
        if (c.courseId === courseId) {
          const isEnabling = !c.enabled;
          if (isEnabling) {
            fetchTopicsForCourse(courseId);
            setExpandedCourseId(courseId);
          }
          return { ...c, enabled: isEnabling };
        }
        return c;
      })
    );
  };

  const handleMulticourseTopicToggle = (courseId: string, topicId: string) => {
    setMulticourseConfig(prev =>
      prev.map(c => {
        if (c.courseId === courseId) {
          const currentTopics = c.topics || [];
          const nextTopics = currentTopics.includes(topicId)
            ? currentTopics.filter((id: string) => id !== topicId)
            : [...currentTopics, topicId];
          return { ...c, topics: nextTopics };
        }
        return c;
      })
    );
  };

  const handleUpdateMulticourseLimit = (courseId: string, limit: number) => {
    setMulticourseConfig(prev =>
      prev.map(c => {
        if (c.courseId === courseId) {
          return { ...c, question_limit: limit };
        }
        return c;
      })
    );
  };

  // Fetch updated list of all courses (deployed tests)
  const refreshCourses = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setAllCoursesList(data);
        onRefreshDashboard?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // On mount and when parent courses update
  useEffect(() => {
    setAllCoursesList(courses);
    if (courses.length > 0) {
      if (!selectedCourse) {
        const firstMaster = courses.find(c => c.is_master);
        setSelectedCourse(firstMaster || courses[0]);
      } else {
        const liveCid = selectedCourse.id || (selectedCourse as any)._id;
        const updated = courses.find(c => (c.id || (c as any)._id) === liveCid);
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedCourse)) {
          setSelectedCourse(updated);
        }
      }
    }
  }, [courses]);

  // Sync selectedCourse with updated data in allCoursesList
  useEffect(() => {
    if (selectedCourse) {
      const liveCid = selectedCourse.id || (selectedCourse as any)._id;
      const refreshed = allCoursesList.find(c => (c.id || (c as any)._id) === liveCid);
      if (refreshed && JSON.stringify(refreshed) !== JSON.stringify(selectedCourse)) {
        setSelectedCourse(refreshed);
      }
    }
  }, [allCoursesList]);

  // Handle active course change - pull topics & config
  useEffect(() => {
    if (selectedCourse) {
      const cid = selectedCourse.id || (selectedCourse as any)._id;
      fetchTopics(cid);
    } else {
      setTopics([]);
      setSelectedTopic(null);
    }
  }, [selectedCourse]);

  // Set default dynamic title when selecting a new topic
  useEffect(() => {
    if (selectedCourse && selectedTopic) {
      const suffix = newTest.is_mock ? 'Practice Mock' : 'Official Exam';
      const topicNameClean = selectedTopic.id === 'general' ? 'Comprehensive' : selectedTopic.name;
      setNewTest(prev => ({
        ...prev,
        title: `${selectedCourse.code} — ${topicNameClean} ${suffix}`
      }));
    }
  }, [selectedTopic, selectedCourse, newTest.is_mock]);

  const fetchTopics = async (courseId: string) => {
    setLoadingTopics(true);
    try {
      const topicsRes = await fetch(`/api/courses/${courseId}/topics`);
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData);
        
        // Auto-select general pool as default selected topic
        setSelectedTopic({
          id: 'general',
          name: 'General Comprehensive Pool',
          question_count: topicsData.reduce((acc: number, t: any) => acc + (t.questionsCount ?? t.question_count ?? 0), 0)
        });
      }
    } catch {
      toast('Error', 'Unable to retrieve syllabus topics.', 'error');
    } finally {
      setLoadingTopics(false);
    }
  };

  // Format timestamp for datetime-local input fields
  const toLocalISO = (d: string) => {
    if (!d) return '';
    try {
       const dt = new Date(d);
       if (isNaN(dt.getTime())) return d;
       return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch(e) { return ''; }
  };

  // Toggle individual settings for a specific test instance directly
  const handleToggleTestConfig = async (testId: string, field: string, currentValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/courses/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify({ [field]: !currentValue })
      });

      if (res.ok) {
        toast('Updated Successfully', 'Parameter toggle adjusted.', 'success');
        refreshCourses();
      } else {
        toast('Error', 'Failed to synchronize layout update.', 'error');
      }
    } catch {
      toast('Network Error', 'Check database connection status.', 'error');
    }
  };

  // Delete/Purge a specific test instance entirely
  const handleDeleteTestInstance = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to completely de-register and undeploy the test: "${testTitle}"?\nThis is a destructive action and will clear candidate scores/attempts.`)) return;
    try {
      const res = await fetch(`/api/admin/courses/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + adminToken
        }
      });
      if (res.ok) {
        toast('Test Purged', 'Test instance has been deleted.', 'success');
        refreshCourses();
      } else {
        toast('Action Failed', 'Failed to remove target exam records.', 'error');
      }
    } catch {
      toast('Network Timeout', 'Database connection timed out during purge.', 'error');
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestId || !editingTestData) return;

    if (editingTestData.scheduled_date && editingTestData.end_date && new Date(editingTestData.scheduled_date) >= new Date(editingTestData.end_date)) {
      toast('Date Range Conflict', 'The scheduled launch date cannot be after or equal to the closing date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/courses/${editingTestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify(editingTestData)
      });
      if (res.ok) {
        toast('Update Success', 'Successfully updated deployed test parameters.', 'success');
        setEditingTestId(null);
        setEditingTestData(null);
        refreshCourses();
      } else {
        toast('Update Failed', 'Could not save test configuration.', 'error');
      }
    } catch {
      toast('Error', 'Network request failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit and Deploy a new independent Test instance mapping to course/topic
  const handleDeployNewTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deploymentMode === 'single' && (!selectedCourse || !selectedTopic)) return;
    
    if (newTest.scheduled_date && newTest.end_date && new Date(newTest.scheduled_date) >= new Date(newTest.end_date)) {
      toast('Date Range Conflict', 'The scheduled launch date cannot be after or equal to the closing date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let payload: any = {};
      
      if (deploymentMode === 'multi') {
        const enabledConfigs = multicourseConfig.filter(c => c.enabled);
        if (enabledConfigs.length === 0) {
          toast('Required Selection', 'Please enable at least one course for multi-course configuration.', 'error');
          setIsSubmitting(false);
          return;
        }
        
        const finalCode = enabledConfigs.map(c => c.code.substring(0, 3).toUpperCase()).join('+') || 'MULTI';
        const calcLimit = enabledConfigs.reduce((acc, c) => acc + (parseInt(c.question_limit) || 15), 0);
        
        payload = {
          code: finalCode,
          title: newTest.title.trim() || `${finalCode} Consolidated CBT Mock`,
          icon: 'Layers',
          is_mock: newTest.is_mock,
          duration: newTest.duration || 60,
          question_limit: calcLimit,
          attempts_allowed: newTest.attempts_allowed || 1,
          question_timer_limit: newTest.question_timer_limit || 0,
          scheduled_date: newTest.scheduled_date ? new Date(newTest.scheduled_date).toISOString() : '',
          end_date: newTest.end_date ? new Date(newTest.end_date).toISOString() : '',
          is_locked: newTest.is_locked,
          results_locked: newTest.results_locked,
          is_master: false,
          multicourse_config: JSON.stringify(
            enabledConfigs.map(c => ({
              courseId: c.courseId,
              code: c.code,
              topics: c.topics,
              question_limit: parseInt(c.question_limit) || 15
            }))
          )
        };
      } else {
        payload = {
          code: selectedCourse!.code,
          title: newTest.title.trim(),
          icon: selectedCourse!.icon || 'BookOpen',
          is_mock: newTest.is_mock,
          duration: newTest.duration || 30,
          question_limit: newTest.question_limit || 20,
          attempts_allowed: newTest.attempts_allowed || 1,
          question_timer_limit: newTest.question_timer_limit || 0,
          scheduled_date: newTest.scheduled_date ? new Date(newTest.scheduled_date).toISOString() : '',
          end_date: newTest.end_date ? new Date(newTest.end_date).toISOString() : '',
          is_locked: newTest.is_locked,
          results_locked: newTest.results_locked,
          selected_topic_id: selectedTopic!.id === 'general' ? null : selectedTopic!.id,
          is_master: false
        };
      }

      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast('Deployment Success', `Successfully deployed "${payload.title}"!`, 'success');
        // Reset creating properties slightly or prepare for next run
        setNewTest(prev => ({
          ...prev,
          title: '',
          duration: 30,
          question_limit: 20,
          attempts_allowed: 1,
          question_timer_limit: 0,
          scheduled_date: '',
          end_date: '',
          is_locked: true,
          results_locked: true
        }));
        // Reset multicourse configurations to default disabled status
        setMulticourseConfig(prev => prev.map(c => ({ ...c, enabled: false, topics: [], question_limit: 15 })));
        refreshCourses();
      } else {
        const err = await res.json().catch(() => ({}));
        toast('Failed', err.error || 'Server rejected course configuration.', 'error');
      }
    } catch {
      toast('Error', 'Unable to reach the admin node.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Total available pool questions matching selected scope (single or multi-course)
  const getDeploymentPoolStock = () => {
    if (deploymentMode === 'multi') {
      const enabledConfigs = multicourseConfig.filter(c => c.enabled);
      let total = 0;
      for (const config of enabledConfigs) {
        const pTopics = cachedTopicsMap[config.courseId] || [];
        const chosenTopicIds = config.topics || [];
        if (chosenTopicIds.length > 0) {
          total += pTopics
            .filter((t: any) => chosenTopicIds.includes(t.id || t._id))
            .reduce((acc: number, t: any) => acc + (t.questionsCount ?? t.question_count ?? 0), 0);
        } else {
          total += pTopics.reduce((acc: number, t: any) => acc + (t.questionsCount ?? t.question_count ?? 0), 0);
        }
      }
      return total;
    } else {
      if (!selectedTopic) return 0;
      if (selectedTopic.id === 'general') {
        return topics.reduce((acc: number, t: any) => acc + (t.questionsCount ?? t.question_count ?? 0), 0);
      } else {
        return selectedTopic.questionsCount ?? selectedTopic.question_count ?? 0;
      }
    }
  };

  const poolStock = getDeploymentPoolStock();
  const computedLimit = deploymentMode === 'multi'
    ? multicourseConfig.filter(c => c.enabled).reduce((acc: number, c: any) => acc + (parseInt(c.question_limit) || 15), 0)
    : newTest.question_limit;

  const showSafetyWarning = computedLimit > poolStock && poolStock > 0;
  const showCriticalZeroWarning = poolStock === 0;

  // Filter deployed tests dynamically based on chosen filters
  const getFilteredDeployments = () => {
    return allCoursesList.filter((c: any) => {
      // Must not be a master course
      if (c.is_master) return false;

      // General title check
      const queryClean = searchQuery.trim().toLowerCase();
      if (queryClean) {
        const matchTitle = String(c.title).toLowerCase().includes(queryClean);
        const matchCode = String(c.code).toLowerCase().includes(queryClean);
        if (!matchTitle && !matchCode) return false;
      }

      // Type Filter
      if (typeFilter === 'live' && c.is_mock) return false;
      if (typeFilter === 'mock' && !c.is_mock) return false;

      // Lock status Filter
      if (lockFilter === 'locked' && !c.is_locked) return false;
      if (lockFilter === 'unlocked' && c.is_locked) return false;

      // Time Scheduling Filter
      const now = new Date();
      if (scheduleFilter === 'upcoming') {
        if (!c.scheduled_date) return false;
        if (new Date(c.scheduled_date) <= now) return false;
      } else if (scheduleFilter === 'expired') {
        if (!c.end_date) return false;
        if (new Date(c.end_date) >= now) return false;
      } else if (scheduleFilter === 'active') {
        const afterStart = !c.scheduled_date || new Date(c.scheduled_date) <= now;
        const beforeEnd = !c.end_date || new Date(c.end_date) >= now;
        if (!afterStart || !beforeEnd) return false;
      }

      return true;
    });
  };

  const filteredMatches = getFilteredDeployments();

  // Dynamic statistics calculations
  const totalCount = allCoursesList.length;
  const liveExamsCount = allCoursesList.filter(c => !c.is_mock).length;
  const mockHubsCount = allCoursesList.filter(c => c.is_mock).length;
  const lockedCount = allCoursesList.filter(c => c.is_locked).length;
  const overridesCount = allCoursesList.filter(c => c.force_start).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-900 dark:text-slate-100">
      
      {/* 1. Header Hero Console */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 dark:bg-slate-900/40 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3.5 shadow-inner">
            <Sparkles size={11} className="text-blue-400" />
            Academic Portal System
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Zap className="text-amber-400 fill-amber-400/10" size={26} strokeWidth={2.5} />
            Exam Management Center
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mt-2 max-w-xl">
            Configure lesson modules, deploy independent mock directories, set timer limits, and toggle exam portal gate lockdowns in real-time.
          </p>
        </div>

        <button
          onClick={refreshCourses}
          disabled={isRefreshing}
          className="relative group overflow-hidden flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-100 text-slate-950 border border-white/20 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
        >
          <RefreshCw size={12} className={`text-slate-950 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Synchronize State</span>
        </button>
      </div>

      {/* 2. Interactive KPI Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Deployments', value: totalCount, icon: Layers, border: 'border-slate-200 dark:border-slate-800', text: 'text-blue-500 bg-blue-500/10' },
          { label: 'Live Official Exams', value: liveExamsCount, icon: Award, border: 'border-blue-200/50 dark:border-blue-900/30', text: 'text-sky-500 bg-sky-500/10' },
          { label: 'Practice Mocks', value: mockHubsCount, icon: BookOpen, border: 'border-orange-200/50 dark:border-orange-900/30', text: 'text-orange-500 bg-orange-500/10' },
          { label: 'Active Lockdowns', value: lockedCount, icon: LockKeyhole, border: 'border-red-250/50 dark:border-red-900/30', text: 'text-red-500 bg-red-500/10' },
          { label: 'Force Overrides', value: overridesCount, icon: PlayCircle, border: 'border-purple-250/50 dark:border-purple-900/30', text: 'text-purple-500 bg-purple-500/10' }
        ].map((stat, i) => (
          <div 
            key={i} 
            className={`bg-white dark:bg-slate-950 border ${stat.border} p-4.5 rounded-2xl shadow-sm flex items-center justify-between transition-all hover:scale-[1.02] hover:shadow-md`}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-450 dark:text-slate-500 tracking-wider block leading-tight">{stat.label}</span>
              <span className="text-2xl font-black font-mono leading-none tracking-tight block">{stat.value}</span>
            </div>
            <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${stat.text}`}>
              <stat.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Workspace Area System Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Setup context parameter widgets (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Bento Step 1: Lesson Modules Finder */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-205 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-505" />
                       <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-105 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-black">1</div>
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Lesson Modules</h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{uniqueLessonModules.length} cataloged</span>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {uniqueLessonModules.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  No courses registered.
                </div>
              ) : (
                uniqueLessonModules.map(c => {
                  const isSelected = selectedCourse?.code === c.code;
                  return (
                    <button
                      key={c.id || (c as any)._id}
                      onClick={() => {
                        setSelectedCourse(c);
                        setSelectedTopic(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between group active:scale-[0.99] cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10' 
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate max-w-[65%] flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/10 text-white' : 'bg-white dark:bg-slate-950 text-blue-650'}`}>
                          <FolderOpen size={13} />
                        </div>
                        <div className="truncate leading-tight">
                          <span className={`text-[8px] font-mono font-black tracking-widest block ${isSelected ? 'text-white/85' : 'text-slate-450 dark:text-slate-500'}`}>{c.code}</span>
                          <h4 className="font-bold text-xs truncate mt-0.5">{c.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border leading-none ${
                          (c.questionsCount || 0) === 0 
                            ? isSelected ? 'bg-red-500/30 text-white border-red-550/40 animate-pulse font-black' : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-550/25 animate-pulse font-black' 
                            : isSelected ? 'bg-white/20 border-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-205 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {c.questionsCount || 0} Qs
                        </span>
                        <ChevronRight size={12} className={`shrink-0 transition-transform ${isSelected ? 'text-white' : 'text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5'}`} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Bento Step 2: Syllabus Target (Topic selector) */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-205 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-505" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-105 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] flex items-center justify-center font-black">2</div>
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider">Target Syllabus Pool</h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Select target matrix</span>
            </div>

            {selectedCourse ? (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {/* General Universal Scope */}
                <button
                  type="button"
                  onClick={() => setSelectedTopic({
                    id: 'general',
                    name: 'General Comprehensive Pool',
                    question_count: topics.reduce((acc, t) => acc + (t.questionsCount ?? t.question_count ?? 0), 0)
                  })}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedTopic?.id === 'general'
                      ? 'bg-emerald-600 border-emerald-605 text-white shadow'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-300'
                  }`}
                >
                  <div className="truncate max-w-[80%] leading-tight">
                    <h4 className="font-bold text-xs truncate">Comprehensive Pool (All Topics)</h4>
                    <span className={`text-[8px] font-mono uppercase tracking-wider ${selectedTopic?.id === 'general' ? 'text-white/80' : 'text-slate-450'}`}>
                      Pool Total: {topics.reduce((acc, t) => acc + (t.questionsCount ?? t.question_count ?? 0), 0)} Questions
                    </span>
                  </div>
                  <Check size={12} className={selectedTopic?.id === 'general' ? 'opacity-100 shrink-0 text-white' : 'opacity-0 shrink-0'} />
                </button>

                {loadingTopics ? (
                  <div className="p-8 text-center text-xs text-slate-400 animate-pulse font-bold uppercase tracking-wider">Scanning question stock...</div>
                ) : topics.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No topic matrices defined nested inside this module catalog yet.
                  </div>
                ) : (
                  topics.map(t => {
                    const isSelected = selectedTopic?.id === t.id;
                    const qCount = t.questionsCount ?? t.question_count ?? 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTopic(t)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-605 text-white shadow'
                            : qCount === 0
                              ? 'bg-red-50/20 dark:bg-red-950/5 border-red-200 dark:border-red-900/40 hover:bg-red-50/40 dark:hover:bg-red-950/10 text-slate-850 dark:text-slate-300'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-300'
                        }`}
                      >
                        <div className="truncate max-w-[80%] leading-tight">
                          <h4 className="font-bold text-xs truncate uppercase tracking-tight">{t.name}</h4>
                          <span className={`text-[8px] font-mono uppercase tracking-wider ${
                            isSelected 
                              ? 'text-white/85' 
                              : qCount === 0 
                                ? 'text-red-500 font-extrabold select-none animate-pulse' 
                                : 'text-slate-450'
                          }`}>
                            {qCount === 0 ? '🚨 Pool Capacity: 0 Qs (EMPTY!)' : `Pool Capacity: ${qCount} Qs`}
                          </span>
                        </div>
                        {qCount === 0 && !isSelected ? (
                          <AlertCircle size={11} className="text-red-500 shrink-0" />
                        ) : (
                          <Check size={12} className={isSelected ? 'text-white shrink-0' : 'opacity-0 shrink-0'} />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Choose a parent module folder in step 1 to expose available targets.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Deployment controllers, filters, and exam directories list (col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Elegant tab bar */}
          <div className="bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5 p-0.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <button
                type="button"
                onClick={() => setRightActiveTab('registry')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  rightActiveTab === 'registry'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Award size={14} />
                Deployed Registry
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                  rightActiveTab === 'registry' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {filteredMatches.length}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => setRightActiveTab('deploy')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  rightActiveTab === 'deploy'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles size={14} />
                Deploy Studio
                {selectedCourse && selectedTopic && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                )}
              </button>
            </div>

            <div className="pr-1.5">
              {selectedCourse ? (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-mono font-bold">
                  <span className="text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-extrabold">{selectedCourse.code}</span>
                  {selectedTopic && (
                    <>
                      <ChevronRight size={10} className="text-slate-300" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold truncate max-w-[120px]">
                        {selectedTopic.id === 'general' ? 'Comprehensive' : selectedTopic.name}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">No active scope</span>
              )}
            </div>
          </div>

          {/* Tab 1: Current Deployed Sessions Registry */}
          {rightActiveTab === 'registry' && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-205 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                  <Award size={18} className="text-blue-500" /> Currently Deployed Exam Registry
                </h3>
                <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5">Manage live configurations and locks on existing sessions</p>
              </div>
              <span className="inline-flex self-start sm:self-auto text-[9px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded-md">
                {filteredMatches.length} Deployed Views shown
              </span>
            </div>

            {/* Sub-Filters Deck */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3.5 mb-6">
              
              <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <Sliders size={12} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase text-slate-450 dark:text-slate-550 tracking-wider">Search & Search Filter Rail</span>
              </div>

              {/* Layout grid filter row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search query input */}
                <div className="relative sm:col-span-5">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by label or course code..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold placeholder-slate-400 transition-all outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Switcher Filter 1: Categories */}
                <div className="sm:col-span-7 flex flex-wrap gap-1.5">
                  <div className="flex border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden p-0.5 bg-white dark:bg-slate-950 select-none">
                    {['all', 'live', 'mock'].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTypeFilter(f as any)}
                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${typeFilter === f ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Lock Switcher */}
                  <div className="flex border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden p-0.5 bg-white dark:bg-slate-950 select-none">
                    {[
                      { key: 'all', label: 'Locks' },
                      { key: 'locked', label: 'Locked' },
                      { key: 'unlocked', label: 'Unlocked' }
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setLockFilter(f.key as any)}
                        className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${lockFilter === f.key ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Calendar Scope Switcher */}
                  <div className="flex border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden p-0.5 bg-white dark:bg-slate-950 select-none">
                    {[
                      { key: 'all', label: 'Schedules' },
                      { key: 'active', label: 'Active Now' },
                      { key: 'upcoming', label: 'Upcoming' },
                      { key: 'expired', label: 'Closed' }
                    ].map(f => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setScheduleFilter(f.key as any)}
                        className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${scheduleFilter === f.key ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Deployed nodes listing catalog */}
            <div className="space-y-4">
              {filteredMatches.length === 0 ? (
                <div className="py-14 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-[2rem] flex flex-col items-center justify-center text-center px-4 bg-slate-50/20 dark:bg-transparent">
                  <div className="w-12 h-12 bg-slate-105 dark:bg-slate-900 rounded-2xl flex items-center justify-center mb-3 text-slate-300 dark:text-slate-700">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-600 dark:text-slate-450 uppercase tracking-widest leading-none">No assessment deployments match criteria</h4>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 max-w-sm uppercase tracking-wider mt-3.5 leading-relaxed">
                    Try wiping search queries or filter constraints. If no tests exist under this parameters list, trigger an exam deployment down below.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredMatches.map((test: any) => {
                      const isEditingActiveInstance = editingTestId === (test.id || test._id);
                      
                      if (isEditingActiveInstance) {
                        return (
                          <motion.div 
                            key={`edit-${test.id || test._id || Math.random().toString(36).substr(2, 9)}`} 
                            className="relative p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-900 dark:border-white shadow-xl col-span-1 md:col-span-2 space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <h4 className="text-xs font-black uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200 font-mono">
                                <Edit2 size={12} className="text-blue-500"/> Update Test Parameters Matrix
                              </h4>
                              <button type="button" onClick={() => setEditingTestId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                            
                            <form onSubmit={handleUpdateTest} className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Test Label Title</label>
                                    <input type="text" value={editingTestData?.title || ''} onChange={(e) => setEditingTestData({...editingTestData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4.5 py-3 text-xs font-bold outline-none font-mono" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Category Category</label>
                                    <select value={editingTestData?.is_mock ? 'mock' : 'live'} onChange={(e) => setEditingTestData({...editingTestData, is_mock: e.target.value === 'mock'})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer" required>
                                      <option value="mock">Practice Mock</option>
                                      <option value="live">Official Live Exam</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Duration Limit (Min)</label>
                                    <input type="number" min="1" value={editingTestData?.duration || ''} onChange={(e) => setEditingTestData({...editingTestData, duration: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono font-black" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Items Cap Pool</label>
                                    <input type="number" min="1" value={editingTestData?.question_limit || ''} onChange={(e) => setEditingTestData({...editingTestData, question_limit: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono font-black" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Attempt Cap (Limit)</label>
                                    <input type="number" min="1" value={editingTestData?.attempts_allowed || 1} onChange={(e) => setEditingTestData({...editingTestData, attempts_allowed: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono font-black" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Per-Q Strict Timer (Sec)</label>
                                    <input type="number" min="0" value={editingTestData?.question_timer_limit ?? 0} onChange={(e) => setEditingTestData({...editingTestData, question_timer_limit: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono font-black" placeholder="0 = Disabled" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Scheduled Launch</label>
                                    <input type="datetime-local" value={editingTestData?.scheduled_date ? toLocalISO(editingTestData.scheduled_date) : ''} onChange={(e) => setEditingTestData({...editingTestData, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold outline-none font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Scheduled Close</label>
                                    <input type="datetime-local" value={editingTestData?.end_date ? toLocalISO(editingTestData.end_date) : ''} onChange={(e) => setEditingTestData({...editingTestData, end_date: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold outline-none font-mono" />
                                </div>
                                <div className="space-y-1 pt-1.5 col-span-1 sm:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={editingTestData?.results_locked ?? true} 
                                        onChange={(e) => setEditingTestData({...editingTestData, results_locked: e.target.checked})}
                                        className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                                      />
                                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Lock grades scorecard display on submission</span>
                                    </label>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
                                <button type="button" onClick={() => setEditingTestId(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer">Discard</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                                  <Save size={13} /> {isSubmitting ? 'Syncing...' : 'Save Parameters'}
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        );
                      }

                      return (
                        <div 
                          key={`test-${test.id || test._id}`} 
                          className="relative p-5 rounded-3xl bg-slate-50 dark:bg-[#080808] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-sm min-h-[190px]"
                        >
                          <div className={`absolute top-0 inset-x-0 h-1 rounded-t-3xl ${test.is_mock ? 'bg-orange-550' : 'bg-blue-650'}`} />
                          
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                  test.is_mock 
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10' 
                                    : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/10'
                                }`}>
                                  {test.is_mock ? 'Mock Practice' : 'Official EXAM'}
                                </span>
                                <span className="text-[8px] font-black font-mono text-slate-400 bg-slate-200/50 dark:bg-slate-900 px-1.5 py-0.5 rounded uppercase">
                                  {test.code}
                                </span>
                                {(() => {
                                  const qCount = test.questionsCount ?? 0;
                                  const qLimit = test.question_limit ?? 0;
                                  if (qCount === 0) {
                                    return (
                                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-red-650 bg-red-500/10 dark:bg-red-950/30 border border-red-200/20 px-1.5 py-0.5 rounded-md animate-pulse">
                                        <AlertCircle size={9} /> Broken (0 Qs)
                                      </span>
                                    );
                                  } else if (qCount < qLimit) {
                                    return (
                                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 bg-amber-500/10 dark:bg-amber-950/25 border border-amber-200/20 px-1.5 py-0.5 rounded-md">
                                        <AlertTriangle size={9} /> Capped ({qCount} Qs)
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/15 px-1.5 py-0.5 rounded-md">
                                        <Check size={9} strokeWidth={2.5} /> Healthy ({qCount} Qs)
                                      </span>
                                    );
                                  }
                                })()}
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTestId(test.id || test._id);
                                    setEditingTestData({...test});
                                  }}
                                  title="Edit parameters"
                                  className="w-7 h-7 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-750 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTestInstance(test.id || test._id, test.title)}
                                  title="Undeploy Exam"
                                  className="w-7 h-7 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/10 rounded-lg flex items-center justify-center text-red-605 hover:text-red-700 dark:text-red-400 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white leading-snug uppercase font-mono line-clamp-2 max-h-[2.5rem]">
                              {test.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest font-mono">
                              <span className="flex items-center gap-0.5 bg-slate-200/40 dark:bg-slate-900 px-1.5 py-0.5 rounded"><Clock size={9} /> {test.duration}m</span>
                              <span className="flex items-center gap-0.5 bg-slate-200/40 dark:bg-slate-900 px-1.5 py-0.5 rounded"><RefreshCw size={8} /> {test.attempts_allowed || 1} Atts</span>
                              <span className="flex items-center gap-0.5 bg-slate-200/40 dark:bg-slate-900 px-1.5 py-0.5 rounded"><Hash size={9} /> {test.question_limit} Qs</span>
                            </div>
                          </div>

                          {/* Quick Admin Toggles Decker */}
                          <div className="space-y-1.5 pt-3 border-t border-slate-200 dark:border-slate-850 mt-4 text-[9px] font-mono font-semibold">
                            
                            {/* Lockdown Gate */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <Lock size={9} /> gate Lockdown
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'is_locked', test.is_locked)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.is_locked 
                                    ? 'bg-red-500/10 border-red-500/15 text-red-600 dark:text-red-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {test.is_locked ? 'Closed lock' : 'Open Entry'}
                              </button>
                            </div>

                            {/* Release Scores hidden view */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <EyeOff size={9} /> Reveals scores
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'results_locked', test.results_locked)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.results_locked 
                                    ? 'bg-amber-550/10 border-amber-500/15 text-amber-600 dark:text-amber-500' 
                                    : 'bg-indigo-505/10 border-indigo-500/15 text-indigo-650 dark:text-indigo-400'
                                }`}
                              >
                                {test.results_locked ? 'Score Secret' : 'Grades Live'}
                              </button>
                            </div>

                            {/* Live override scheduler */}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-455 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                <PlayCircle size={9} /> Live Override
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'force_start', test.force_start)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.force_start 
                                    ? 'bg-red-600 text-white border-red-700 shadow-sm' 
                                    : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-500'
                                }`}
                              >
                                {test.force_start ? 'BYPASS LIVE' : 'Schedule Timer'}
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                  })}
                </div>
              )}
            </div>
          </div>
          )}          {/* Tab 2: Deploy ASSESSMENT INSTANCE Form */}
          {rightActiveTab === 'deploy' && (deploymentMode === 'multi' || (selectedCourse && selectedTopic)) ? (
            <div className="bg-white dark:bg-slate-950 p-5 rounded-[2rem] border border-slate-205 dark:border-slate-800 shadow-sm relative overflow-hidden animate-fadeIn">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-905 dark:text-white leading-none">
                    Configure & Deploy CBT Assessment
                  </h3>
                </div>

                {/* Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800 select-none">
                  <button
                    type="button"
                    onClick={() => setDeploymentMode('single')}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      deploymentMode === 'single'
                        ? 'bg-purple-600 text-white shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Single-Course
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeploymentMode('multi');
                      // set default title
                      if (!newTest.title) {
                        setNewTest(prev => ({ ...prev, title: 'Consolidated Pre-Med Grand CBT Mock Exam' }));
                      }
                    }}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      deploymentMode === 'multi'
                        ? 'bg-purple-600 text-white shadow-sm font-black'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Multi-Course
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleDeployNewTest} className="space-y-4">
                {/* Custom Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1 font-mono">CBT Assessment Title</label>
                  <input
                    type="text"
                    required
                    value={newTest.title}
                    onChange={e => setNewTest({ ...newTest, title: e.target.value })}
                    placeholder={deploymentMode === 'multi' ? "Consolidated Pre-Med Grand CBT Mock Exam" : "Enter exam title..."}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-mono"
                  />
                </div>

                {/* MULTI-COURSE CONFIGURATOR SECTION */}
                {deploymentMode === 'multi' && (
                  <div className="space-y-3 bg-slate-25/40 dark:bg-[#0c0c0e] p-4 rounded-2xl border border-slate-150 dark:border-slate-900/60 transition-all select-none">
                    <div className="flex items-center justify-between pb-1.5 border-b border-dashed border-slate-200 dark:border-slate-850">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Layers size={11} className="text-purple-500" />
                        Choose Consolidated Syllabus Subjects & Lesson Topics
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase font-mono">
                        {multicourseConfig.filter(c => c.enabled).length} subjects active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 max-h-[170px] overflow-y-auto custom-scrollbar pr-1">
                      {multicourseConfig.map(subItem => {
                        const isEnabled = subItem.enabled;
                        const subjectTopics = cachedTopicsMap[subItem.courseId] || [];
                        const isExpanded = expandedCourseId === subItem.courseId;
                        const selectedTopicsCount = (subItem.topics || []).length;
                        const subCourseQStock = subjectTopics.reduce(
                          (acc: number, t: any) => acc + (t.questionsCount ?? t.question_count ?? 0),
                          0
                        );

                        return (
                          <div 
                            key={`mconfig_${subItem.courseId}`} 
                            className={`p-2.5 rounded-xl border transition-all ${
                              isEnabled 
                                ? 'bg-white dark:bg-slate-950 border-purple-200 dark:border-purple-950/60 shadow-sm' 
                                : 'bg-slate-50/55 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-850/60 opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 text-left">
                              {/* Left Checkbox */}
                              <div className="flex items-center gap-2.5 cursor-pointer max-w-[50%]" onClick={() => toggleMulticourseSubject(subItem.courseId)}>
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                  isEnabled ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-350 dark:border-slate-700 bg-white dark:bg-slate-950'
                                }`}>
                                  {isEnabled && <Check size={11} strokeWidth={3} />}
                                </div>
                                <div className="leading-tight">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block uppercase tracking-tight leading-none">{subItem.code}</span>
                                    {loadingTopicsMap[subItem.courseId] ? (
                                      <RefreshCw size={8} className="animate-spin text-purple-400 leading-none" />
                                    ) : (
                                      <span className={`text-[8.5px] font-mono font-black px-1 py-0.2 rounded border leading-none shrink-0 ${
                                        subCourseQStock === 0 
                                          ? 'text-red-500 bg-red-500/10 border-red-500/15 animate-pulse' 
                                          : 'text-slate-500 bg-slate-100 dark:bg-slate-850 dark:text-slate-405 border-slate-205 dark:border-slate-805'
                                      }`}>
                                        {subCourseQStock} Qs
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[8.5px] text-slate-400 font-medium truncate uppercase block mt-0.5">{subItem.title}</span>
                                </div>
                              </div>

                              {/* Right Parameters if Enabled */}
                              {isEnabled && (
                                <div className="flex items-center gap-2">
                                  {/* Target Topics Count Badge */}
                                  <button
                                    type="button"
                                    onClick={() => setExpandedCourseId(isExpanded ? null : subItem.courseId)}
                                    className="px-2 py-1 bg-slate-100 dark:bg-slate-900 text-[9px] font-black text-purple-600 dark:text-purple-400 hover:bg-slate-150 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-800 cursor-pointer uppercase transition-all"
                                  >
                                    <Filter size={9} />
                                    <span>
                                      {selectedTopicsCount === 0 || selectedTopicsCount === subjectTopics.length 
                                        ? 'All Topics' 
                                        : `${selectedTopicsCount}/${subjectTopics.length} selected`
                                      }
                                    </span>
                                  </button>

                                  {/* Limit Input */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">Limit:</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="80"
                                      value={subItem.question_limit}
                                      onChange={(e) => handleUpdateMulticourseLimit(subItem.courseId, parseInt(e.target.value) || 0)}
                                      className="w-11 h-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-center text-[10px] font-bold focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Topics Selection Subsection */}
                            {isEnabled && isExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-850/80 animate-fadeIn">
                                {loadingTopicsMap[subItem.courseId] ? (
                                  <div className="py-2.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5 col-span-2">
                                    <RefreshCw size={10} className="animate-spin text-purple-500" />
                                    <span>Fetching syllabus targets...</span>
                                  </div>
                                ) : subjectTopics.length === 0 ? (
                                  <div className="text-center text-[9px] text-slate-400 italic">No topics found for this course.</div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase mb-1">
                                      <span>Choose syllabus sub-topics (Empty = All)</span>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const allSelected = (subItem.topics || []).length === subjectTopics.length;
                                          setMulticourseConfig(prev => prev.map(c => {
                                            if (c.courseId === subItem.courseId) {
                                              return { ...c, topics: allSelected ? [] : subjectTopics.map((t: any) => t.id || t._id) };
                                            }
                                            return c;
                                          }));
                                        }}
                                        className="text-purple-600 dark:text-purple-400 hover:underline"
                                      >
                                        {(subItem.topics || []).length === subjectTopics.length ? 'Clear Selection' : 'Select All'}
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 max-h-[100px] overflow-y-auto custom-scrollbar p-0.5">
                                      {subjectTopics.map((t: any) => {
                                        const tid = t.id || t._id;
                                        const isTopicChecked = (subItem.topics || []).includes(tid);
                                        return (
                                          <label
                                            key={`topic_chk_${tid}`}
                                            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/40 border border-slate-100 dark:border-slate-850/40 cursor-pointer select-none truncate"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isTopicChecked}
                                              onChange={() => handleMulticourseTopicToggle(subItem.courseId, tid)}
                                              className="w-3 h-3 accent-purple-600 shrink-0"
                                            />
                                            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350 truncate">{t.name}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Parameters block: type category, limits, counters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Category Toggle option */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Type Category</label>
                    <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[38px] bg-slate-50 dark:bg-slate-900 p-0.5 select-none">
                      <button 
                        type="button" 
                        onClick={() => setNewTest({...newTest, is_mock: false})}
                        className={`flex-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${!newTest.is_mock ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'}`}
                      >Live Exam</button>
                      <button 
                        type="button" 
                        onClick={() => setNewTest({...newTest, is_mock: true})}
                        className={`flex-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${newTest.is_mock ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'}`}
                      >Mock Practice</button>
                    </div>
                  </div>

                  {/* Allowed duration time */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Timer Limit</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-purple-500/10">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTest.duration}
                        onChange={e => setNewTest({ ...newTest, duration: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black animate-none"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Mins</span>
                    </div>
                  </div>

                  {/* Items maximum pool */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">{deploymentMode === 'multi' ? 'Auto Cap (Items)' : 'Question Cap'}</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-purple-500/10 opacity-100">
                      <input
                        type="number"
                        min="1"
                        required
                        disabled={deploymentMode === 'multi'}
                        value={deploymentMode === 'multi' 
                          ? multicourseConfig.filter(c => c.enabled).reduce((acc, c) => acc + (parseInt(c.question_limit) || 15), 0)
                          : newTest.question_limit
                        }
                        onChange={e => setNewTest({ ...newTest, question_limit: parseInt(e.target.value) || 0 })}
                        className={`w-full bg-transparent focus:outline-none text-xs font-mono font-black ${deploymentMode === 'multi' ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : ''}`}
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Items</span>
                    </div>
                  </div>

                  {/* Attempts Cap settings */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Attempt Cap</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-purple-500/10">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTest.attempts_allowed || 1}
                        onChange={e => setNewTest({ ...newTest, attempts_allowed: parseInt(e.target.value) || 1 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Plays</span>
                    </div>
                  </div>

                  {/* Strict Timer per question */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Per-Q Timer</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner focus-within:ring-2 focus-within:ring-purple-500/10">
                      <input
                        type="number"
                        min="0"
                        required
                        value={newTest.question_timer_limit}
                        onChange={e => setNewTest({ ...newTest, question_timer_limit: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black"
                        placeholder="0 = None"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Secs</span>
                    </div>
                  </div>
                </div>

                {/* Warnings Decker & Prompts */}
                <AnimatePresence>
                  {showCriticalZeroWarning && (
                    <motion.div 
                      key="zero-warning"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-3.5 flex gap-2.5 items-start text-red-800 dark:text-red-300 shadow-sm overflow-hidden"
                    >
                      <AlertCircle size={15} className="shrink-0 text-red-650 dark:text-red-400 mt-0.5 animate-bounce" />
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-extrabold uppercase tracking-wide block">🚨 CRITICAL DEPLOYMENT BLOCKER</span>
                        The selected syllabus target pool has exactly <span className="font-mono font-extrabold text-red-650 dark:text-red-400">0 questions</span> in the database. 
                        Deploying this assessment in this current state will trigger immediate "Test Unavailable" crashes/empty slides for your candidates. 
                        <ul className="list-disc pl-4 mt-1.5 space-y-1">
                          <li>Please select a subject or topic with populated question banks.</li>
                          <li>In multi-course mode, ensure you checked/enabled at least one subject and that its cache contains questions.</li>
                          <li>Import and configure questions for this topic first via the <a href="/admin/question-bank" className="underline font-bold text-red-700 hover:text-red-800 dark:text-red-400">Question Bank</a> dashboard.</li>
                        </ul>
                      </div>
                    </motion.div>
                  )}

                  {!showCriticalZeroWarning && showSafetyWarning && (
                    <motion.div 
                      key="safety-warning"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 flex gap-2.5 items-start text-amber-800 dark:text-amber-300 shadow-sm overflow-hidden"
                    >
                      <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-extrabold uppercase tracking-wide block">⚠️ QUESTION CAPACITY CAP ALERT</span>
                        Your requested Question Cap (<span className="font-extrabold font-mono text-amber-655 dark:text-amber-400">{computedLimit} Questions</span>) is larger than the actual active question stock in this chosen syllabus target (<span className="font-extrabold font-mono text-amber-655 dark:text-amber-400">{poolStock} Questions</span>). 
                        Candidates checking into this assessment will only receive the maximum pool available. Adjust the limits or populate more questions to support your full cap!
                      </div>
                    </motion.div>
                  )}

                  {!showCriticalZeroWarning && !showSafetyWarning && poolStock > 0 && (
                    <motion.div 
                      key="optimal-warning"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-emerald-55/15 dark:bg-emerald-950/10 border border-emerald-250/50 dark:border-emerald-900/40 rounded-xl p-3 flex gap-2.5 items-start text-emerald-800 dark:text-emerald-400 shadow-sm overflow-hidden"
                    >
                      <Check size={14} strokeWidth={2.5} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-extrabold uppercase tracking-wide block text-emerald-700 dark:text-emerald-400">✓ HEALTHY ASSESSMENT CONFIGURATION</span>
                        Syllabus target pool database validates successfully. Deployed assessments will safely compile and randomize up to <span className="font-extrabold font-mono text-emerald-705 dark:text-emerald-300">{computedLimit} MCQs</span> from a highly active stock of <span className="font-mono font-extrabold text-emerald-705 dark:text-emerald-300">{poolStock} questions</span>.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Timestamp windows constraints */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 ml-1"><Calendar size={9} /> Optional Timed Start Window</label>
                    <input
                      type="datetime-local"
                      value={toLocalISO(newTest.scheduled_date)}
                      onChange={e => setNewTest({ ...newTest, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-[9px] font-black outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 ml-1"><Calendar size={9} /> Optional timed Deadline Window</label>
                    <input
                      type="datetime-local"
                      value={toLocalISO(newTest.end_date)}
                      onChange={e => setNewTest({ ...newTest, end_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-[9px] font-black outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Initial parameters checklist checkbox options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTest.is_locked}
                      onChange={e => setNewTest({ ...newTest, is_locked: e.target.checked })}
                      className="w-3.5 h-3.5 accent-purple-600 rounded bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />
                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none font-mono">Deploy locked with key gate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTest.results_locked}
                      onChange={e => setNewTest({ ...newTest, results_locked: e.target.checked })}
                      className="w-3.5 h-3.5 accent-purple-600 rounded bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    />
                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider leading-none font-mono">Hide candidate scorecard</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || showCriticalZeroWarning}
                  className="w-full bg-slate-950 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  id="admin_hub_deploy_button"
                >
                  <Plus size={14} strokeWidth={3} />
                  {isSubmitting ? 'Spawning Exam Node...' : 'Deploy CBT Assessment Node'}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-12 p-8 text-center bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-850 rounded-[2rem] text-xs font-black uppercase tracking-wider text-slate-450 space-y-3 animate-fadeIn select-none">
              <AlertCircle className="mx-auto text-amber-500 animate-bounce" size={24} />
              <p>Step 1 & 2 Workspace configurations needed</p>
              <p className="text-[10px] text-slate-400 normal-case select-none">Please select a Lesson Module and Target Pool in the left pane, or toggle the "Deploy Studio" tab to construct a comprehensive Multi-Course Consolidated CBT configuration.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
