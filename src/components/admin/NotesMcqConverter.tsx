import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, FileText, Check, Trash2, HelpCircle, 
  ArrowRight, Sparkles, BookOpen, AlertCircle, Loader2 
} from 'lucide-react';
import { toast } from '../Toast';
import StudyGuideRenderer from '../StudyGuideRenderer';

interface NotesMcqConverterProps {
  adminToken: string;
}

export default function NotesMcqConverter({ adminToken }: NotesMcqConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [rawTextLength, setRawTextLength] = useState(0);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [savedCollections, setSavedCollections] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [expandedNote, setExpandedNote] = useState('');
  const [previewTab, setPreviewTab] = useState<'mcqs' | 'notes'>('mcqs');

  // Input source mode & Paste text state variables
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');

  // Course, Topic & Customization state
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topicMode, setTopicMode] = useState<'existing' | 'new'>('existing');
  const [newTopicName, setNewTopicName] = useState('');
  const [customCount, setCustomCount] = useState<number>(15);
  const [exportMode, setExportMode] = useState<'cbt_challenge' | 'course_topic'>('cbt_challenge');
  const [isFetchingCourses, setIsFetchingCourses] = useState(false);

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      setIsFetchingCourses(true);
      try {
        const res = await fetch('/api/courses');
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourseId(data[0].id || data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setIsFetchingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // Fetch topics when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setTopics([]);
      setSelectedTopicId('');
      return;
    }

    const fetchTopics = async () => {
      try {
        const res = await fetch(`/api/courses/${selectedCourseId}/topics`);
        if (res.ok) {
          const data = await res.json();
          setTopics(data);
          if (data.length > 0) {
            setSelectedTopicId(data[0].id || data[0]._id);
            setTopicMode('existing');
          } else {
            setTopicMode('new');
            setSelectedTopicId('');
          }
        }
      } catch (err) {
        console.error('Failed to load course topics', err);
      }
    };
    fetchTopics();
  }, [selectedCourseId]);

  // Load existing collections
  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const res = await fetch('/api/admin/notes-extractions', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedCollections(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Synchronize pasted values to main compiler states reactively
  useEffect(() => {
    if (inputMode === 'paste') {
      setExtractedText(pastedText);
      setRawTextLength(pastedText.length);
    }
  }, [pastedText, inputMode]);

  useEffect(() => {
    if (inputMode === 'paste') {
      setCollectionTitle(pastedTitle);
    }
  }, [pastedTitle, inputMode]);

  useEffect(() => {
    if (inputMode === 'upload') {
      if (file) {
        // preserve already uploaded and parsed file content
      } else {
        setExtractedText('');
        setCollectionTitle('');
      }
    } else {
      setExtractedText(pastedText);
      setCollectionTitle(pastedTitle);
    }
  }, [inputMode]);

  // PDF Text Extractor Helper
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          
          // Load PDF.js dynamically if not already loaded on window object
          if (!(window as any).pdfjsLib) {
            await new Promise<void>((res, rej) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
              script.onload = () => {
                (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                res();
              };
              script.onerror = () => rej(new Error('Failed to load PDF parsing library.'));
              document.head.appendChild(script);
            });
          }
          
          const pdfjs = (window as any).pdfjsLib;
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
          let text = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            text += strings.join(" ") + "\n";
          }
          resolve(text);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setCollectionTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    setIsReadingFile(true);
    setExtractedText('');
    setExtractedQuestions([]);

    try {
      let text = '';
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        toast('Parsing PDF', 'Extracting notes data client-side using PDF.js...', 'info');
        text = await extractTextFromPdf(selectedFile);
      } else {
        // Assume text file
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(selectedFile);
        });
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Parsed notes file in the browser but it returned empty.');
      }

      setExtractedText(text);
      setRawTextLength(text.length);
      toast('Success', `Parsed notes successfully (${text.length} characters).`, 'success');
    } catch (err: any) {
      console.error(err);
      toast('Extraction Error', err.message || 'Failed to read notes content.', 'error');
      setFile(null);
    } finally {
      setIsReadingFile(false);
    }
  };

  const startExtraction = async () => {
    if (!extractedText) return;
    setIsExtracting(true);
    setExpandedNote('');
    setExtractedQuestions([]);
    
    let sampleText = extractedText;
    if (extractedText.length > 20000) {
      toast('Large Notes File', 'Piping the first 20,000 characters for optimal contextual processing...', 'info');
      sampleText = extractedText.substring(0, 20000);
    }

    toast('Step 1 of 2: MCQs', 'Formulating exam-style multiple-choice questions...', 'info');
 
    let mcqSuccess = false;
    try {
      const mcqRes = await fetch('/api/admin/extract-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ 
          text: sampleText,
          custom_count: customCount
        })
      });

      if (mcqRes.ok) {
        const questions = await mcqRes.json();
        if (Array.isArray(questions)) {
          const mapped = questions.map(q => ({
            text: q.text,
            a: q.a,
            b: q.b,
            c: q.c || '',
            d: q.d || '',
            correct_option: q.correct_option || q.correct || 'option_a',
            explanation: q.explanation || 'No step-by-step solution provided.'
          }));
          setExtractedQuestions(mapped);
          mcqSuccess = true;
          toast('MCQ Step Completed', `Successfully formulated ${mapped.length} high-quality questions.`, 'success');
        } else {
          toast('MCQ Format Error', 'Invalid MCQ format returned by server. Attemping note expansion anyway...', 'info');
        }
      } else {
        const err = await mcqRes.json();
        toast('MCQ Generation Error', err.error || 'Server rejected MCQ extraction. Proceeding to notes...', 'info');
      }
    } catch (err: any) {
      console.error('MCQ formulation failed:', err);
      toast('MCQ Formulation Failed', 'Network or timeout exception during MCQ generation. Attempting notes expansion...', 'info');
    }

    toast('Step 2 of 2: Study Guide', 'Qwen is performing a 10x textbook level concept expansion and designing medical image visual references...', 'info');

    let notesSuccess = false;
    try {
      const expansionRes = await fetch('/api/admin/expand-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ text: sampleText })
      });

      if (expansionRes.ok) {
        const expandData = await expansionRes.json();
        setExpandedNote(expandData.expanded_note || '');
        notesSuccess = true;
        toast('Study Guide Expanded', 'Successfully constructed 10x textbook notes with AI medical artwork!', 'success');
      } else {
        const err = await expansionRes.json().catch(() => ({}));
        console.error('Note expansion rejected by server:', err);
        toast('Notes Fallback', err.error || 'Study notes did not expand successfully.', 'info');
      }
    } catch (err: any) {
      console.error('Note expansion failed:', err);
      toast('Notes Expansion Failed', 'Network or timeout exception during notes expansion.', 'info');
    }

    if (mcqSuccess || notesSuccess) {
      toast('Process Concluded', 'Workspace has been compiled successfully!', 'success');
    } else {
      toast('Extraction Failure', 'Both MCQ generation and study guide expansion timed out or failed. Please try with smaller text.', 'error');
    }
    setIsExtracting(false);
  };
 
  const saveCollection = async () => {
    if (!collectionTitle.trim()) {
      toast('Missing Input', 'Please enter a title for this CBT MCQ set.', 'info');
      return;
    }
    if (extractedQuestions.length === 0) return;
 
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/notes-extractions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: collectionTitle,
          questions: extractedQuestions,
          expanded_note: expandedNote
        })
      });
 
      if (res.ok) {
        toast('Deployed Successfully', 'Collection has been published for students inside CBT Challenge!', 'success');
        setExtractedQuestions([]);
        setExpandedNote('');
        setFile(null);
        setExtractedText('');
        fetchCollections();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save extraction');
      }
    } catch (e: any) {
      toast('Failed to Save', e.message || 'Network fault.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveToCourseTopic = async () => {
    if (extractedQuestions.length === 0) return;

    if (!selectedCourseId) {
      toast('Selection Required', 'Please choose a target course first.', 'info');
      return;
    }
    if (topicMode === 'new' && !newTopicName.trim()) {
      toast('Topic Name Required', 'Please enter a name for the new topic.', 'info');
      return;
    }
    if (topicMode === 'existing' && !selectedTopicId) {
      toast('Selection Required', 'Please select a topic or switch to "Create New".', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        course_id: selectedCourseId,
        topic_mode: topicMode,
        topic_id: topicMode === 'existing' ? selectedTopicId : undefined,
        topic_name: topicMode === 'new' ? newTopicName : undefined,
        questions: extractedQuestions,
        notes: expandedNote
      };

      const res = await fetch('/api/admin/save-to-course-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast('Syllabus Updated', 'Successfully imported generated MCQs directly into CBT Syllabus Topic!', 'success');
        setExtractedQuestions([]);
        setExpandedNote('');
        setFile(null);
        setExtractedText('');
        fetchCollections();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update syllabus.');
      }
    } catch (e: any) {
      toast('Failed to Save', e.message || 'Network fault.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notes collection? This will immediately remove it from the student CBT list.')) return;

    try {
      const res = await fetch(`/api/admin/notes-extractions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        toast('Purged', 'Notes MCQ challenge has been deleted.', 'success');
        fetchCollections();
      } else {
        toast('Error', 'Deletion rejected by server.', 'error');
      }
    } catch {
      toast('Error', 'Network connection issue.', 'error');
    }
  };

  const updateExtractedQuestion = (index: number, field: string, value: string) => {
    setExtractedQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="text-blue-500 shrink-0" size={20} />
            Notes MCQ Compiler
          </h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-loose">
            Generate Mock Practice MCQs with comprehensive explanations directly from PDF/TXT medical syllabus notes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Upload and convert area */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-900 p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-880 dark:text-slate-250 flex items-center justify-between">
                <span>Step 1: Input Notes Source</span>
                <span className="text-[9px] text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full lowercase">active study tools</span>
              </h3>
              
              {/* Premium Input Selector Tabs toggled dynamically */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-900 select-none">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                    inputMode === 'upload'
                      ? 'bg-blue-600 text-white shadow-md font-black'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
                    inputMode === 'paste'
                      ? 'bg-blue-600 text-white shadow-md font-black'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Paste Notes
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl transition-all cursor-pointer group bg-slate-50/50 dark:bg-black/40">
                <input 
                  type="file" 
                  accept=".pdf,.txt" 
                  onChange={handleFileChange} 
                  className="hidden" 
                  disabled={isReadingFile || isExtracting}
                />
                {isReadingFile ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="animate-spin text-blue-500 mx-auto" size={24} />
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Loading & Parsing Document...</p>
                  </div>
                ) : file ? (
                  <div className="text-center space-y-3">
                    <FileText className="text-emerald-500 mx-auto" size={32} />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
                      {(file.size / 1024).toFixed(1)} KB • {file.name.endsWith('.pdf') ? 'PDF' : 'Text'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <UploadCloud className="text-slate-400 group-hover:text-blue-500 transition-colors mx-auto" size={36} />
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Drag & drop notes
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-loose">
                        PDF, TXT up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </label>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1 font-mono">
                    Notes Title / Topic Name
                  </label>
                  <input
                    type="text"
                    value={pastedTitle}
                    onChange={(e) => setPastedTitle(e.target.value)}
                    placeholder="e.g. Action Potentials & Neural Coding"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block ml-1 font-mono">
                    Notes Text Content
                  </label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste clinical guides, medical transcripts, or course textbook paragraphs directly here..."
                    className="w-full h-44 bg-slate-50 dark:bg-slate-955 border border-slate-200/80 dark:border-slate-850 rounded-xl p-3 text-xs font-mono text-slate-700 dark:text-slate-350 focus:outline-none focus:border-blue-500 resize-none font-bold placeholder-slate-400"
                  />
                  <div className="flex justify-between items-center px-1 text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    <span>Characters: {pastedText.length.toLocaleString()}</span>
                    <span>Words: {pastedText.trim() ? pastedText.trim().split(/\s+/).length : 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Destination panel */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-900">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Destination Mode
              </label>
              <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-black/30 rounded-xl">
                <button
                  type="button"
                  onClick={() => setExportMode('cbt_challenge')}
                  className={`flex-1 py-1.5 text-[9px] uppercase font-bold tracking-wider rounded-lg transition-all ${
                    exportMode === 'cbt_challenge'
                      ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border border-slate-200/60 dark:border-slate-905'
                      : 'text-slate-450 hover:text-slate-500'
                  }`}
                >
                  CBT Challenge
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode('course_topic')}
                  className={`flex-1 py-1.5 text-[9px] uppercase font-bold tracking-wider rounded-lg transition-all ${
                    exportMode === 'course_topic'
                      ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm border border-slate-200/60 dark:border-slate-905'
                      : 'text-slate-450 hover:text-slate-550'
                  }`}
                >
                  Course Syllabus
                </button>
              </div>
            </div>

            {/* Course and Topic Selection fields */}
            {exportMode === 'course_topic' && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-900 transition-all">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    1. Target Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                  >
                    {courses.length === 0 ? (
                      <option value="">Loading courses...</option>
                    ) : (
                      courses.map((c) => (
                        <option key={c.id || c._id} value={c.id || c._id}>
                          {c.code} — {c.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      2. Target Topic
                    </label>
                    <div className="flex gap-1 bg-slate-100/50 dark:bg-black/20 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
                      <button
                        type="button"
                        disabled={topics.length === 0}
                        onClick={() => setTopicMode('existing')}
                        className={`px-1.5 py-0.5 text-[8px] uppercase font-black rounded-md disabled:opacity-40 transition-all ${
                          topicMode === 'existing'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 border border-slate-100/50 dark:border-slate-800'
                            : 'text-slate-400 hover:text-slate-500'
                        }`}
                      >
                        Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopicMode('new')}
                        className={`px-1.5 py-0.5 text-[8px] uppercase font-black rounded-md transition-all ${
                          topicMode === 'new'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 border border-slate-100/50 dark:border-slate-800'
                            : 'text-slate-400 hover:text-slate-500'
                        }`}
                      >
                        + Create New
                      </button>
                    </div>
                  </div>

                  {topicMode === 'existing' && topics.length > 0 ? (
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500"
                    >
                      {topics.map((t) => (
                        <option key={t._id || t.id} value={t._id || t.id}>
                          {t.name} ({t.questionsCount || 0} Ex. MCQs)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="e.g., Action Potentials & Neural Coding"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 transition-colors"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Custom Question Count Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Question count ({customCount})
                </label>
                <span className="text-[8px] font-black leading-none text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase">
                  limit selector
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input 
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={customCount}
                  onChange={(e) => setCustomCount(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <select
                  value={customCount}
                  onChange={(e) => setCustomCount(parseInt(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] font-bold px-2 py-1 rounded-lg outline-none"
                >
                  {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(cnt => (
                    <option key={cnt} value={cnt}>{cnt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick helper when text is extracted but MCQs not run */}
            {extractedText && (
              <div className="pt-2">
                <div className="p-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-500/10 rounded-xl space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <AlertCircle size={14} className="shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Ready for compiling</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                    Parsed {rawTextLength.toLocaleString()} characters. Click below to pipe into the Gemini MCQ Generator.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startExtraction}
                  disabled={isExtracting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={14} />
                      <span className="uppercase tracking-wide">Compiling Solutions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span className="uppercase tracking-wide">Extract MCQs & Explanations</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Extracted preview & Save area */}
        <div className="lg:col-span-8 space-y-4">
          <AnimatePresence mode="wait">
            {extractedQuestions.length > 0 ? (
              <motion.div
                key="preview-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-900 p-6 rounded-3xl shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
                        {exportMode === 'course_topic' ? 'Step 2: Deploy to CBT Syllabus Practice' : 'Step 2: Save Extracted MCQs'}
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">
                        {exportMode === 'course_topic' ? 'Import generated MCQs directly into the active course study materials' : 'Verify and label before deploying to active student practice'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">
                        {extractedQuestions.length} MCQs Formulated
                      </span>
                    </div>
                  </div>

                  {exportMode === 'course_topic' ? (
                    <div className="p-4 bg-blue-50/10 dark:bg-[#0c0c16] border border-blue-500/10 rounded-2xl space-y-2 text-left">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#2563EB]">Destination Syllabus Metadata</h4>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350">
                        <span className="text-slate-400">Syllabus Course:</span> {courses.find(c => (c.id || c._id) === selectedCourseId)?.title || 'Selected Course'}
                      </p>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350">
                        <span className="text-slate-400">Syllabus Topic:</span> {topicMode === 'existing' ? (topics.find(t => (t._id || t.id) === selectedTopicId)?.name || 'Selected Topic') : `${newTopicName || 'Untitled Topic'} [New Topic]`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        The {extractedQuestions.length} multiple choice questions and detailed clinical explanations parsed above will be appended directly into the active syllabus.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Notes Collection Title</label>
                      <input 
                        type="text" 
                        value={collectionTitle}
                        onChange={(e) => setCollectionTitle(e.target.value)}
                        placeholder="e.g., Physiology Challenge - Nerve Action Potentials"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* Tab Switcher */}
                  <div className="flex border border-slate-100 dark:border-slate-900 p-1 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('mcqs')}
                      className={`flex-1 py-2.5 text-[9px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer ${
                        previewTab === 'mcqs' 
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800' 
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      Formulated MCQs ({extractedQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('notes')}
                      className={`flex-1 py-2.5 text-[9px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer ${
                        previewTab === 'notes' 
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-800' 
                          : 'text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      10x Textbook Guide & Figures
                    </button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                    {previewTab === 'mcqs' ? (
                      extractedQuestions.map((q, idx) => (
                        <div key={idx} className="p-4 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/40 dark:bg-[#050505] space-y-3 text-left">
                          <div className="flex gap-2">
                            <span className="text-xs font-black text-blue-500 pt-1.5">Q{idx+1}</span>
                            <textarea
                              value={q.text}
                              onChange={(e) => updateExtractedQuestion(idx, 'text', e.target.value)}
                              placeholder="Assessment stem question..."
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-blue-500 outline-none resize-none"
                              rows={2}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                            {['a', 'b', 'c', 'd'].map(opt => {
                              const isCorrect = q.correct_option === `option_${opt}`;
                              return (
                                <div 
                                  key={opt} 
                                  className={`p-2 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${
                                    isCorrect 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
                                      : 'border-slate-100 dark:border-slate-900 text-slate-500'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateExtractedQuestion(idx, 'correct_option', `option_${opt}`)}
                                    className={`uppercase font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                                      isCorrect 
                                        ? 'bg-emerald-500 text-white shadow' 
                                        : 'bg-slate-200 dark:bg-slate-850 text-slate-600 hover:bg-amber-400 hover:text-slate-905'
                                    }`}
                                    title="Set as Correct Answer"
                                  >
                                    {opt}
                                  </button>
                                  <input
                                    value={q[opt]}
                                    onChange={(e) => updateExtractedQuestion(idx, opt, e.target.value)}
                                    placeholder={`Option ${opt.toUpperCase()}...`}
                                    className="bg-transparent border-0 focus:ring-0 focus:outline-none outline-none w-full text-slate-705 dark:text-slate-350 p-0 text-xs font-bold"
                                  />
                                  {isCorrect && <Check size={12} className="ml-auto text-emerald-500 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation !== undefined && (
                            <div className="mt-2 text-[10px] bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl space-y-1.5 pl-6">
                              <span className="font-extrabold uppercase text-amber-600 dark:text-amber-500 tracking-wider">Detailed Explanation & Distractor Guide:</span>
                              <textarea
                                value={q.explanation}
                                onChange={(e) => updateExtractedQuestion(idx, 'explanation', e.target.value)}
                                placeholder="Detailed solution explaining each distractor thoroughly without mentioning their option letters explicitly..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl p-2 text-xs font-semibold text-slate-705 dark:text-slate-350 focus:border-blue-500 outline-none resize-none leading-relaxed"
                                rows={3}
                              />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 border border-slate-150 dark:border-slate-900 rounded-2xl bg-slate-50/15 dark:bg-black/30">
                        {expandedNote ? (
                          <StudyGuideRenderer content={expandedNote} />
                        ) : (
                          <div className="py-16 text-center text-slate-400">
                            <Loader2 className="animate-spin text-blue-500 mx-auto mb-2" size={20} />
                            <p className="text-[10px] uppercase font-black tracking-widest">Qwen is 10x expanding your syllabus notes & crafting diagrams...</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100 dark:border-slate-900" />

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setExtractedQuestions([])}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                    >
                      Clear Preview
                    </button>
                    <button
                      type="button"
                      onClick={exportMode === 'course_topic' ? saveToCourseTopic : saveCollection}
                      disabled={isSaving}
                      className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md shadow-emerald-500/15 cursor-pointer flex items-center gap-1.5"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="animate-spin text-white" size={14} />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>{exportMode === 'course_topic' ? 'Import to Course Topic' : 'Publish to Student Portal'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="existing-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-900 p-6 rounded-3xl shadow-sm space-y-5"
              >
                <div className="border-b border-slate-100 dark:border-slate-900 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
                    Deployed Notes MCQs Challenge Database
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest leading-loose">
                    View active collections that students can access inside their CBT Challenge card
                  </p>
                </div>

                {isLoadingCollections ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                    <p className="text-[10px] uppercase font-bold tracking-wider">Loading saved collections...</p>
                  </div>
                ) : savedCollections.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-600 space-y-2">
                    <BookOpen className="mx-auto text-slate-300 dark:text-slate-800" size={36} />
                    <p className="text-[10px] uppercase font-black tracking-widest">No Notes MCQs deployed yet</p>
                    <p className="text-[10px] text-slate-400/80 max-w-sm mx-auto">
                      Upload and extract a notes pdf/txt above to publish a fully persistent CBT mock series with detailed interactive feedback.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedCollections.map((col) => (
                      <div 
                        key={col._id} 
                        className="p-4 border border-slate-100 dark:border-slate-900 rounded-2xl bg-slate-50/50 dark:bg-black/50 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-800 transition-all text-left relative overflow-hidden group"
                      >
                        <div className="space-y-1 z-10">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500 transition-colors line-clamp-1">
                            {col.title}
                          </h4>
                          <p className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                            {col.questions?.length || 0} Questions deployed
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-600 font-medium pt-1">
                            Published {new Date(col.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 mt-4 pt-3 z-10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-550 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase">
                              Practice Mock
                            </span>
                            {col.expanded_note && (
                              <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-extrabold uppercase flex items-center gap-0.5">
                                <Sparkles size={8} />
                                <span>10x Note</span>
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCollection(col._id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Purge MCQ Set"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
