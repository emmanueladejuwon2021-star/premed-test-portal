import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Layers, FolderPlus, Compass, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { Course } from '../../context/AppContext';
import { toast } from '../Toast';

interface Topic {
  id: string;
  name: string;
  question_count?: number;
  questionsCount?: number;
}

export default function CourseManagement({ courses, adminToken, onRefresh }: { courses: Course[], adminToken: string, onRefresh: () => void }) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  const masterCourses = React.useMemo(() => {
    return courses.filter(c => c.is_master);
  }, [courses]);
  const [newCourse, setNewCourse] = useState({ code: '', title: '' });
  const [newTopicsText, setNewTopicsText] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'course' | 'topic'>('course');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('');

  const handleDeleteTopic = async (topicId: string) => {
    if (!adminToken) {
      toast('Error', 'Unauthorized action.', 'error');
      return;
    }
    if (!confirm('Are you absolutely sure you want to delete this topic and ALL of its associated questions?')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/topics/${topicId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        toast('Success', 'Topic and its questions removed.', 'success');
        if (selectedCourseId) {
          fetchTopics(selectedCourseId);
        }
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast('Error', err.error || 'Failed to delete topic', 'error');
      }
    } catch {
      toast('Error', 'Network error during topic deletion', 'error');
    }
  };

  // Fetch topics when selected course changes for the list
  useEffect(() => {
    if (selectedCourseId) {
      fetchTopics(selectedCourseId);
    } else {
      setTopics([]);
    }
  }, [selectedCourseId]);

  const fetchTopics = async (courseId: string) => {
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/topics`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch {
      toast('Error', 'Failed to load topics', 'error');
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({
          code: newCourse.code.toUpperCase().trim(),
          title: newCourse.title.trim(),
          icon: 'BookOpen',
          is_master: true
        })
      });
      if (res.ok) {
        toast('Success', 'Course created in master registry.', 'success');
        setNewCourse({ code: '', title: '' });
        onRefresh();
      } else {
        const errData = await res.json();
        toast('Failed', errData.error || 'Check registration parameters.', 'error');
      }
    } catch {
      toast('Error', 'Communication with server disrupted.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTopics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast('Warning', 'Select a course first to attach topics.', 'info');
      return;
    }
    const names = newTopicsText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (names.length === 0) {
      toast('Warning', 'Specify at least one topic name.', 'info');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
        body: JSON.stringify({
          course_id: selectedCourseId,
          names
        })
      });
      if (res.ok) {
        toast('Success', `Attached ${names.length} topics.`, 'success');
        setNewTopicsText('');
        fetchTopics(selectedCourseId);
        onRefresh();
      } else {
        toast('Error', 'Could not register topics.', 'error');
      }
    } catch {
      toast('Error', 'Network error registering topics.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    if (!adminToken) {
      toast('Error', 'Unauthorized: No token provided.', 'error');
      return;
    }
    
    setConfirmDeleteId(''); // clear confirm state

    try {
      const url = `/api/admin/courses/${id}`;
      console.log(`Fetching: DELETE ${url} with token: ${adminToken.substring(0, 5)}...`);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        toast('Deleted', 'Course removed safely.', 'success');
        if (selectedCourseId === id) setSelectedCourseId('');
        onRefresh();
      } else {
        const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Delete failed:', errData);
        toast('Error', errData.error || `Could not purge course data. Status: ${res.status}`, 'error');
      }
    } catch (e) {
      console.error('Network error', e);
      toast('Error', 'Server connection failure.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 md:p-3">
      {/* Creation and Config Studio (Left Pane) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Section Banner Header */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950 dark:to-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderPlus size={18} className="text-blue-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-tight">Academic Architect</h3>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveSubTab('course')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase transition-all border-b-2 flex items-center justify-center gap-2 ${activeSubTab === 'course' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Compass size={14} /> Course Studio
            </button>
            <button
              onClick={() => setActiveSubTab('topic')}
              className={`flex-1 py-3 text-center text-xs font-bold uppercase transition-all border-b-2 flex items-center justify-center gap-2 ${activeSubTab === 'topic' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-350'}`}
            >
              <Layers size={14} /> Topic Builder
            </button>
          </div>

          <div className="p-5">
            {activeSubTab === 'course' ? (
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Identifier Code</label>
                  <input
                    placeholder="e.g. GST101, CHM211"
                    maxLength={12}
                    value={newCourse.code}
                    onChange={e => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-medium transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Course Master Title</label>
                  <input
                    placeholder="e.g. Quantitative Chemistry I"
                    value={newCourse.title}
                    onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-medium transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/10"
                >
                  <Plus size={16} /> Establish Course Registry
                </button>
              </form>
            ) : (
              <form onSubmit={handleAddTopics} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Select Owner Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-bold transition-all"
                    required
                  >
                    <option value="">-- Click to Target Course --</option>
                    {masterCourses.map(c => (
                      <option key={`opt_${c.id || c._id}`} value={c.id || c._id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>Topic Names list</span>
                    <span className="text-slate-400 font-normal normal-case">One topic per line</span>
                  </label>
                  <textarea
                    placeholder="First Semester Chemistry Basics&#15;Introduction to Organic Systems&#15;Chemical Equilibria"
                    rows={4}
                    value={newTopicsText}
                    onChange={e => setNewTopicsText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-medium transition-all font-mono placeholder-slate-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCourseId}
                  className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs py-3 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
                >
                  <Plus size={16} /> Attach Topics to Course
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Catalog & Structural Directory (Right Pane) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 h-full">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Course Catalog Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Courses Established: {masterCourses.length}</p>
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all text-slate-600 dark:text-slate-300"
              title="Refresh Registry"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {masterCourses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-505">
                <BookOpen className="mx-auto mb-2 opacity-30" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">No active courses listed.</p>
                <p className="text-xs mt-1">Setup your first course on the left layout pane to begin.</p>
              </div>
            ) : (
              masterCourses.map(c => {
                const isSelected = selectedCourseId === (c.id || (c as any)._id);
                return (
                  <div
                    key={`course_${c.id || (c as any)._id}`}
                    className={`border rounded-xl transition-all duration-300 overflow-hidden ${isSelected ? 'bg-blue-50/10 dark:bg-blue-900/5 border-blue-400 shadow-sm' : 'bg-slate-50/30 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div
                        className="flex-1 cursor-pointer flex items-center gap-3"
                        onClick={() => setSelectedCourseId(isSelected ? '' : (c.id || (c as any)._id))}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-black tracking-tight ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                          {c.code || 'DOC'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight leading-snug">{c.title}</h4>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-400">
                            {c.code} • Topics Attached: {c.topicsCount || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedCourseId(isSelected ? '' : (c.id || (c as any)._id))}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:border-blue-400 transition-all shadow-sm"
                        >
                          {isSelected ? 'Collapse' : 'Expand topics'}
                        </button>
                        {confirmDeleteId === (c.id || (c as any)._id) ? (
                          <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 p-1 rounded-lg border border-red-200 dark:border-red-800">
                            <span className="text-[9px] font-bold text-red-600 px-1 uppercase tracking-wider">Sure?</span>
                            <button
                              onClick={() => {
                                const courseId = c.id || (c as any)._id;
                                if (courseId) {
                                  handleDeleteCourse(courseId, c.title);
                                } else {
                                  toast('Error', 'Could not identify course for deletion', 'error');
                                }
                              }}
                              className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-all shadow-sm"
                              title="Yes, delete it"
                            >
                              <CheckCircle2 size={12} />
                            </button>
                            <button
                               onClick={() => setConfirmDeleteId('')}
                               className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all text-slate-700 dark:text-slate-300"
                               title="Cancel"
                            >
                               <Trash2 size={12} className="opacity-50 line-through" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(c.id || (c as any)._id)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/20"
                            title="Purge Course"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Topic Details Segment */}
                    {isSelected && (
                      <div className="bg-white/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 p-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                          <Layers size={11} className="text-blue-500" /> Structure mapping
                        </h5>

                        {loadingTopics ? (
                          <div className="py-4 text-center text-xs text-slate-500 animate-pulse">Scanning database schemas...</div>
                        ) : topics.length === 0 ? (
                          <div className="py-2 text-slate-400 dark:text-slate-500 text-xs">
                            No topics established under this catalog classification. Use the "Topic Builder" to map components out.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {topics.map(t => (
                              <div
                                key={`topic_${t.id}`}
                                className="flex items-center justify-between p-2.5 bg-slate-100/50 dark:bg-slate-950/40 rounded-lg border border-slate-150 dark:border-slate-850 group/item hover:border-blue-200 transition-all"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={t.name}>{t.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                                    {t.question_count || t.questionsCount || 0} Qs
                                  </span>
                                  <button
                                    onClick={() => handleDeleteTopic(t.id)}
                                    className="p-1 rounded bg-red-50 hover:bg-red-500 hover:text-white dark:bg-red-950/20 text-red-500 transition-all border border-red-100 dark:border-red-900/20 cursor-pointer"
                                    title="Delete Topic"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
