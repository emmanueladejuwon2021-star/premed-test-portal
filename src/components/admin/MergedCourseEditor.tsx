import React, { useState, useEffect } from 'react';
import { Course } from '../../context/AppContext';
import { toast } from '../Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, Lock, Unlock, PlayCircle, Eye, EyeOff, BookOpen, 
  Layers, Zap, Calendar, Clock, Sparkles, CheckCircle2, ChevronRight, RefreshCw, 
  X, Plus, Trash2, Award, FileText, Edit2, ArrowLeft, Info, Database, Trash,
  Microscope, Brain, Calculator, Target, Activity, Book, Ruler
} from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  question_count?: number;
  questionsCount?: number;
}

interface MergedCourseEditorProps {
  course: Course;
  adminToken: string;
  onBack: () => void;
  onRefreshDashboard: () => void;
}

const availableHubIcons = [
  { id: 'FlaskConical', icon: BookOpen },
  { id: 'Microscope', icon: Microscope },
  { id: 'Zap', icon: Zap },
  { id: 'Brain', icon: Brain },
  { id: 'Calculator', icon: Calculator },
  { id: 'Database', icon: Database },
  { id: 'Layers', icon: Layers },
  { id: 'ShieldAlert', icon: Target }, // fallback or use target
  { id: 'Target', icon: Target },
  { id: 'Activity', icon: Activity }
];

const IconComponent = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const iconsMap: Record<string, any> = {
    FlaskConical: BookOpen,
    Microscope: Microscope,
    Zap: Zap,
    Brain: Brain,
    Calculator: Calculator,
    Database: Database,
    Layers: Layers,
    Target: Target,
    Activity: Activity,
    Book: Book,
    BookOpen: BookOpen,
    Ruler: Ruler,
  };
  
  const Icon = iconsMap[name] || BookOpen;
  return <Icon size={size} className={className} />;
};

export default function MergedCourseEditor({ course, adminToken, onBack, onRefreshDashboard }: MergedCourseEditorProps) {
  // Base Course Module Edit State
  const [editCourseModule, setEditCourseModule] = useState({
    code: course.code || '',
    title: course.title || '',
    icon: course.icon || 'FlaskConical'
  });
  const [isSavingModule, setIsSavingModule] = useState(false);

  // Deployment Hub States
  const [allCoursesList, setAllCoursesList] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingTestData, setEditingTestData] = useState<any>(null);

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
  });

  // Fetch updated list of all courses (deployed tests)
  const refreshCourses = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setAllCoursesList(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  // Run on mount
  useEffect(() => {
    const cid = course.id || (course as any)._id;
    setEditCourseModule({
      code: course.code || '',
      title: course.title || '',
      icon: course.icon || 'FlaskConical'
    });
    if (cid) {
      fetchTopics(cid);
    }
    refreshCourses();
  }, [course]);

  // Handle dynamic dynamic titles
  useEffect(() => {
    if (selectedTopic) {
      const suffix = newTest.is_mock ? 'Practice Mock' : 'Official Exam';
      const topicNameClean = selectedTopic.id === 'general' ? 'Comprehensive' : selectedTopic.name;
      setNewTest(prev => ({
        ...prev,
        title: `${editCourseModule.code} — ${topicNameClean} ${suffix}`
      }));
    }
  }, [selectedTopic, editCourseModule.code, newTest.is_mock]);

  // Format timestamp for local datetime input
  const toLocalISO = (d: string) => {
    if (!d) return '';
    try {
       const dt = new Date(d);
       if (isNaN(dt.getTime())) return d;
       return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch(e) { return ''; }
  };

  // Save the master Module canonical details
  const handleSaveModuleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingModule(true);
    try {
      const res = await fetch(`/api/admin/courses/${course.id || (course as any)._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify(editCourseModule)
      });
      if (res.ok) {
        toast('Module Updated', 'Syllabus folder settings applied successfully.', 'success');
        onRefreshDashboard();
      } else {
        toast('Action Failed', 'Could not apply canonical changes.', 'error');
      }
    } catch {
      toast('Network Error', 'Check database connection status.', 'error');
    } finally {
      setIsSavingModule(false);
    }
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
        toast('Updated Successfully', `Parameter adjusted.`, 'success');
        refreshCourses();
        onRefreshDashboard();
      } else {
        toast('Error', 'Failed to synchronize update.', 'error');
      }
    } catch {
      toast('Network Error', 'Could not sync parameter.', 'error');
    }
  };

  // Delete/Purge a specific test instance entirely
  const handleDeleteTestInstance = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to completely de-register and delete the test: "${testTitle}"?\nThis is a destructive action and will clear student attempts.`)) return;
    try {
      const res = await fetch(`/api/admin/courses/${testId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + adminToken
        }
      });
      if (res.ok) {
        toast('Test Instance Purged', 'Test record has been destroyed.', 'success');
        refreshCourses();
        onRefreshDashboard();
      } else {
        toast('Action Failed', 'Could not identify course instance.', 'error');
      }
    } catch {
      toast('Network Timeout', 'Connection to admin module timed out.', 'error');
    }
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestId || !editingTestData) return;

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
        onRefreshDashboard();
      } else {
        toast('Update Failed', 'Could not save configuration.', 'error');
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
    if (!selectedTopic) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        code: editCourseModule.code.trim().toUpperCase(),
        title: newTest.title.trim(),
        icon: editCourseModule.icon,
        is_mock: newTest.is_mock,
        duration: newTest.duration || 30,
        question_limit: newTest.question_limit || 20,
        attempts_allowed: newTest.attempts_allowed || 1,
        question_timer_limit: newTest.question_timer_limit || 0,
        scheduled_date: newTest.scheduled_date ? new Date(newTest.scheduled_date).toISOString() : '',
        end_date: newTest.end_date ? new Date(newTest.end_date).toISOString() : '',
        is_locked: newTest.is_locked,
        results_locked: newTest.results_locked,
        selected_topic_id: selectedTopic.id === 'general' ? null : selectedTopic.id,
        is_master: false
      };

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
        // Reset creating fields
        setNewTest(prev => ({
          ...prev,
          duration: 30,
          question_limit: 20,
          attempts_allowed: 1,
          question_timer_limit: 0,
          scheduled_date: '',
          end_date: '',
          is_locked: true,
          results_locked: true
        }));
        refreshCourses();
        onRefreshDashboard();
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

  // Filter deployed tests by active course code and chosen topic matches
  const getDeployedInstancesMatchingTarget = () => {
    if (!selectedTopic) return [];
    return allCoursesList.filter((c: any) => {
      // Must not be a master course
      if (c.is_master) return false;

      // Must match active module code
      const sameCourseCode = String(c.code).trim().toLowerCase() === String(editCourseModule.code).trim().toLowerCase();
      if (!sameCourseCode) return false;
      
      // Check topic filters
      if (selectedTopic.id === 'general') {
        return !c.selected_topic_id;
      } else {
        return c.selected_topic_id && String(c.selected_topic_id) === String(selectedTopic.id);
      }
    });
  };

  const deployedMatches = getDeployedInstancesMatchingTarget();

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 pb-16">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-950 p-5 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all cursor-pointer"
          >
            <ArrowLeft size={12} strokeWidth={3} />
            Back to Hub
          </button>
          <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <IconComponent name={editCourseModule.icon} size={18} className="text-blue-500" />
              {editCourseModule.code} Module Center
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
              Configure Master Folder & Establish Timed Assessment Instances
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={refreshCourses}
            disabled={isRefreshing}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-250 dark:border-slate-805 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer w-full sm:w-auto"
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            Fetch Deployments
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Hand Section: Canonical Module Configuration & Topics (width 5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Master Module Settings */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/35 rounded-2xl flex items-center justify-center text-blue-600">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Canonical Identity</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Edit master syllabus catalog</p>
              </div>
            </div>

            <form onSubmit={handleSaveModuleDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Module Code</label>
                  <input 
                    type="text" 
                    value={editCourseModule.code} 
                    onChange={e => setEditCourseModule({...editCourseModule, code: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Icon Profile</label>
                  <div className="grid grid-cols-5 gap-1.5 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    {availableHubIcons.slice(0, 5).map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEditCourseModule({...editCourseModule, icon: item.id})}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${editCourseModule.icon === item.id ? 'bg-blue-600 text-white shadow' : 'bg-white dark:bg-slate-950 text-slate-400 hover:text-blue-500'}`}
                      >
                        <item.icon size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Master Lesson Title</label>
                <input 
                  type="text" 
                  value={editCourseModule.title} 
                  onChange={e => setEditCourseModule({...editCourseModule, title: e.target.value})} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSavingModule}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-blue-500/15 disabled:opacity-50 cursor-pointer mt-2"
              >
                <Save size={12} />
                {isSavingModule ? 'Saving Modifications...' : 'Save Folder Details'}
              </button>
            </form>
          </div>

          {/* Card 2: Syllabus Topics Filter Panel */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/35 rounded-2xl flex items-center justify-center text-emerald-600">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Question Matrices</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Filter/Deploy by sub-topic pool</p>
              </div>
            </div>

            <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {/* General Topic (Entire Pool) */}
              <button
                onClick={() => setSelectedTopic({
                  id: 'general',
                  name: 'General Comprehensive Pool',
                  question_count: topics.reduce((acc, t) => acc + (t.questionsCount ?? t.question_count ?? 0), 0)
                })}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedTopic?.id === 'general'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-105 text-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="truncate max-w-[80%]">
                  <h4 className="font-bold text-xs">General Comprehensive Syllabus</h4>
                  <span className={`text-[8px] font-mono uppercase font-black ${selectedTopic?.id === 'general' ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                    Active Pool: {topics.reduce((acc, t) => acc + (t.questionsCount ?? t.question_count ?? 0), 0)} Questions
                  </span>
                </div>
                <CheckCircle2 size={12} className={selectedTopic?.id === 'general' ? 'text-white shrink-0' : 'opacity-0 shrink-0'} />
              </button>

              {loadingTopics ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse font-bold uppercase tracking-wider">Scanning question banks...</div>
              ) : topics.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No sub-topics categorized under this course.
                </div>
              ) : (
                topics.map(t => {
                  const isSelected = selectedTopic?.id === t.id;
                  const qCount = t.questionsCount ?? t.question_count ?? 0;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopic(t)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-105 text-slate-850 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate max-w-[80%]">
                        <h4 className="font-bold text-xs truncate uppercase tracking-tight">{t.name}</h4>
                        <span className={`text-[8px] font-mono uppercase font-black ${isSelected ? 'text-white/80' : 'text-slate-450'}`}>
                          Topic Pool: {qCount} Questions
                        </span>
                      </div>
                      <CheckCircle2 size={12} className={isSelected ? 'text-white shrink-0' : 'opacity-0 shrink-0'} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Hand Section: Deployments listing and Creation Board (width 7 cols) */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          
          {/* Header context tracker badge */}
          {selectedTopic && (
            <div className="bg-slate-100/70 dark:bg-[#070707] border border-slate-250 dark:border-slate-850 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 self-start shadow-sm leading-none">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Workspace Scope:</span>
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 py-1 px-2.5 rounded-md font-mono">{editCourseModule.code}</span>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 py-1 px-2.5 rounded-md font-mono truncate max-w-[180px]">{selectedTopic.id === 'general' ? 'Comprehensive Module' : selectedTopic.name}</span>
            </div>
          )}

          {/* Card 3: Active Deployments List matching Topic */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award size={18} className="text-blue-500" /> Currently Deployed Tests
              </h3>
              <span className="text-[9px] font-black px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md font-mono">{deployedMatches.length} Deployed</span>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Instances currently online in testing portal</p>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
              {deployedMatches.length === 0 ? (
                <div className="py-14 border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-3xl flex flex-col items-center justify-center text-center px-4 bg-slate-50/20 dark:bg-transparent">
                  <div className="w-12 h-12 bg-slate-100/50 dark:bg-slate-900 flex items-center justify-center mb-3 text-slate-300 dark:text-slate-700 rounded-2xl">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">No active deployments</h4>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 max-w-xs uppercase tracking-wider mt-2.5 leading-relaxed">
                    Instantiate an exam parameter matrix or mock thread down below to go live.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deployedMatches.map((test: any) => {
                      if (editingTestId === (test.id || test._id)) {
                        return (
                          <motion.div 
                            key={`edit-${test.id || test._id || Math.random().toString(36).substr(2, 9)}`} 
                            className="relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-500 shadow-xl col-span-1 md:col-span-2 space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <h4 className="text-xs font-black uppercase flex items-center gap-2 text-slate-800 dark:text-slate-200 font-mono">
                                <Edit2 size={12} className="text-blue-500"/> Edit Parameters Matrix
                              </h4>
                              <button type="button" onClick={() => setEditingTestId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                            
                            <form onSubmit={handleUpdateTest} className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 col-span-1 sm:col-span-2">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Test Instance Label</label>
                                    <input type="text" value={editingTestData?.title || ''} onChange={(e) => setEditingTestData({...editingTestData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold outline-none font-mono" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Category</label>
                                    <select value={editingTestData?.is_mock ? 'mock' : 'live'} onChange={(e) => setEditingTestData({...editingTestData, is_mock: e.target.value === 'mock'})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer" required>
                                      <option value="mock">Practice Mock</option>
                                      <option value="live">Official Live Exam</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Duration (Min)</label>
                                    <input type="number" min="1" value={editingTestData?.duration || ''} onChange={(e) => setEditingTestData({...editingTestData, duration: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none font-mono" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Items Pool Limit</label>
                                    <input type="number" min="1" value={editingTestData?.question_limit || ''} onChange={(e) => setEditingTestData({...editingTestData, question_limit: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none font-mono" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Attempt Cap (Limit)</label>
                                    <input type="number" min="1" value={editingTestData?.attempts_allowed || 1} onChange={(e) => setEditingTestData({...editingTestData, attempts_allowed: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none font-mono" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Per-Q Strict Timer (Sec)</label>
                                    <input type="number" min="0" value={editingTestData?.question_timer_limit ?? 0} onChange={(e) => setEditingTestData({...editingTestData, question_timer_limit: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold outline-none font-mono" placeholder="0 = Disabled" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider">Launch Date</label>
                                    <input type="datetime-local" value={editingTestData?.scheduled_date ? toLocalISO(editingTestData.scheduled_date) : ''} onChange={(e) => setEditingTestData({...editingTestData, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[9px] font-bold outline-none font-mono" />
                                </div>
                                <div className="space-y-1 pt-1.5">
                                    <label className="text-[8px] font-black uppercase text-slate-455 tracking-wider block mb-1">Results View Status</label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                      <input 
                                        type="checkbox" 
                                        checked={editingTestData?.results_locked ?? true} 
                                        onChange={(e) => setEditingTestData({...editingTestData, results_locked: e.target.checked})}
                                        className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                                      />
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Hide scorecard grades</span>
                                    </label>
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                                <button type="button" onClick={() => setEditingTestId(null)} className="px-4 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                                  <Save size={13} /> {isSubmitting ? 'Saving...' : 'Apply Details'}
                                </button>
                              </div>
                            </form>
                          </motion.div>
                        );
                      }

                      return (
                        <div 
                          key={`test-${test.id || test._id}`} 
                          className="relative p-5 rounded-3xl bg-slate-50 dark:bg-[#090909] border border-slate-200 dark:border-slate-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between shadow-sm min-h-[175px]"
                        >
                          <div className={`absolute top-0 inset-x-0 h-1.5 rounded-t-3xl ${test.is_mock ? 'bg-orange-500' : 'bg-blue-600'}`} />
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                test.is_mock 
                                  ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10' 
                                  : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/10'
                              }`}>
                                {test.is_mock ? 'Mock Practice' : 'Official LIVE'}
                              </span>
                              
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingTestId(test.id || test._id);
                                    setEditingTestData({...test});
                                  }}
                                  title="Edit parameters"
                                  className="w-7 h-7 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-850 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTestInstance(test.id || test._id, test.title)}
                                  title="Purge deployment"
                                  className="w-7 h-7 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/10 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <h4 className="font-bold text-xs tracking-tight text-slate-905 dark:text-white leading-snug uppercase line-clamp-2 max-h-[2.5rem] font-mono">
                              {test.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-2 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest font-mono pt-1">
                              <span className="flex items-center gap-0.5"><Clock size={9} /> {test.duration}m</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><BookOpen size={9} /> {test.question_limit} Qs</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-4 border-t border-slate-200 dark:border-slate-850 mt-4">
                            {/* Locked Toggles */}
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-450 dark:text-slate-550 text-[9px] uppercase tracking-wide flex items-center gap-1 font-mono">
                                <Lock size={10} /> Gate lockdowns
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'is_locked', test.is_locked)}
                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.is_locked 
                                    ? 'bg-red-500/10 border-red-550/20 text-red-600 dark:text-red-400' 
                                    : 'bg-emerald-500/10 border-emerald-555/20 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {test.is_locked ? 'Closed Lock' : 'Open Entry'}
                              </button>
                            </div>

                            {/* Release toggles */}
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-450 dark:text-slate-550 text-[9px] uppercase tracking-wide flex items-center gap-1 font-mono">
                                <EyeOff size={10} /> Score reveals
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'results_locked', test.results_locked)}
                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.results_locked 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500' 
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-405'
                                }`}
                              >
                                {test.results_locked ? 'Score Secret' : 'Grades Live'}
                              </button>
                            </div>

                            {/* Force Start */}
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-450 dark:text-slate-550 text-[9px] uppercase tracking-wide flex items-center gap-1 font-mono">
                                <PlayCircle size={10} /> Force live activation
                              </span>
                              <button
                                onClick={() => handleToggleTestConfig(test.id || test._id, 'force_start', test.force_start)}
                                className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all cursor-pointer ${
                                  test.force_start 
                                    ? 'bg-red-600 text-white border-red-650' 
                                    : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 text-slate-500'
                                }`}
                              >
                                {test.force_start ? 'LIVE OVERRIDE' : 'Schedule Timer'}
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

          {/* Card 4: Deploy Another Test Instance Form */}
          {selectedTopic && (
            <div className="bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-1.5 leading-none">
                <Plus size={18} className="text-purple-500" /> Deploy Assessment Instance
              </h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-6">
                Establish Mock modules or Official exams matching {selectedTopic.id === 'general' ? 'Comprehensive Pool' : 'sub-topic pool'}
              </p>
              
              <form onSubmit={handleDeployNewTest} className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1 font-mono">Test Instance Title</label>
                  <input
                    type="text"
                    required
                    value={newTest.title}
                    onChange={e => setNewTest({ ...newTest, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Type Categories</label>
                    <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[38px] bg-slate-50 dark:bg-slate-905 p-0.5">
                      <button 
                        type="button" 
                        onClick={() => setNewTest({...newTest, is_mock: false})}
                        className={`flex-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${!newTest.is_mock ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'}`}
                      >Live Exam</button>
                      <button 
                        type="button" 
                        onClick={() => setNewTest({...newTest, is_mock: true})}
                        className={`flex-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${newTest.is_mock ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'}`}
                      >Practice Mock</button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Timer Limit</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTest.duration}
                        onChange={e => setNewTest({ ...newTest, duration: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Mins</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Items Pool limit</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTest.question_limit}
                        onChange={e => setNewTest({ ...newTest, question_limit: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Qs</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Attempt Cap</label>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 h-[38px] rounded-xl shadow-inner shadow-indigo-500/5 focus-within:ring-2 focus-within:ring-purple-500/10">
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTest.attempts_allowed || 1}
                        onChange={e => setNewTest({ ...newTest, attempts_allowed: parseInt(e.target.value) || 1 })}
                        className="w-full bg-transparent focus:outline-none text-xs font-mono font-black"
                      />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 shrink-0">Limit</span>
                    </div>
                  </div>

                  {/* Strict Timer per question */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider block ml-1">Per-Q Timer (Sec)</label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 ml-1"><Calendar size={9} /> Commencement Window (Optional)</label>
                    <input
                      type="datetime-local"
                      value={toLocalISO(newTest.scheduled_date)}
                      onChange={e => setNewTest({ ...newTest, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-[9px] font-black outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-450 tracking-wider flex items-center gap-1 ml-1"><Calendar size={9} /> Closure Expiry Window (Optional)</label>
                    <input
                      type="datetime-local"
                      value={toLocalISO(newTest.end_date)}
                      onChange={e => setNewTest({ ...newTest, end_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-[9px] font-black outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-[#070707] border border-slate-150 dark:border-slate-850 p-3 rounded-xl mt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTest.is_locked}
                      onChange={e => setNewTest({ ...newTest, is_locked: e.target.checked })}
                      className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-black uppercase text-slate-455 dark:text-slate-400 tracking-wider">Deploy as locked initially</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newTest.results_locked}
                      onChange={e => setNewTest({ ...newTest, results_locked: e.target.checked })}
                      className="w-3.5 h-3.5 accent-purple-600 rounded cursor-pointer"
                    />
                    <span className="text-[9px] font-black uppercase text-slate-455 dark:text-slate-400 tracking-wider">Hide scorecard grades</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} strokeWidth={3} />
                  {isSubmitting ? 'Instantiating Test Record...' : 'Deploy Exam Instance'}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* Info Notice Badge */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 p-5 rounded-[2rem] flex sm:flex-row flex-col gap-4 items-start shadow-sm mt-8">
        <div className="p-2.5 bg-blue-105 text-blue-600 rounded-xl">
          <Info size={18} />
        </div>
        <div>
          <h4 className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-tight text-xs mb-1">Administrative Protocols</h4>
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-semibold">
            All modifications, lockers, and instance scheduling applied inside this module take immediate effect on the student sandbox portal dynamically. To customize core syllabus content and actual items pool, visit the master <strong>Questions Pool</strong> or <strong>Manage Courses</strong> sections in the sidebar dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
