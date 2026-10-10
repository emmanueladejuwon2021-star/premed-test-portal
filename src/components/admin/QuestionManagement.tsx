import React, { useState, useEffect } from 'react';
import { toast } from '../Toast';
import { 
  Plus, Trash2, Database, HelpCircle, ArrowRight, Layers, LayoutGrid, 
  CheckCircle2, Image, UploadCloud, FileText, Sparkles, BookOpen, Loader2, Check 
} from 'lucide-react';
import { Course } from '../../context/AppContext';

interface Topic {
  id: string;
  name: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  diagram_url?: string;
}

export default function QuestionManagement({ adminToken }: { adminToken: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  
  const masterCourses = React.useMemo(() => {
    return courses.filter(c => c.is_master);
  }, [courses]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionText, setExtractionText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // New Question Form Model
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOption, setCorrectOption] = useState<'a' | 'b' | 'c' | 'd'>('a');
  const [diagramUrl, setDiagramUrl] = useState('');
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [explanation, setExplanation] = useState('');
  const [confirmDeleteQid, setConfirmDeleteQid] = useState<string>('');
  const [confirmTopicPurge, setConfirmTopicPurge] = useState(false);

  // --- AI Knowledge Bank (PDF to MCQ) States & Handlers ---
  const [creationTab, setCreationTab] = useState<'manual_bulk' | 'pdf_bank'>('manual_bulk');
  const [pdfInputMode, setPdfInputMode] = useState<'upload' | 'paste'>('upload');
  const [pdfPastedText, setPdfPastedText] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [pdfCharCount, setPdfCharCount] = useState<number>(0);
  const [pdfParsing, setPdfParsing] = useState<boolean>(false);
  const [aiMcqCount, setAiMcqCount] = useState<number>(15);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [importingQuestions, setImportingQuestions] = useState<boolean>(false);

  // PDF Text Extraction Helper using client-side PDF.js (matches NotesMcqConverter)
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const typedarray = new Uint8Array(reader.result as ArrayBuffer);
          
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

  // Sync pdfPastedText to pdfText on input source change
  useEffect(() => {
    if (pdfInputMode === 'paste') {
      setPdfText(pdfPastedText);
      setPdfCharCount(pdfPastedText.length);
    }
  }, [pdfPastedText, pdfInputMode]);

  useEffect(() => {
    if (pdfInputMode === 'upload') {
      if (pdfFile) {
        // preserve already uploaded file content
      } else {
        setPdfText('');
        setPdfCharCount(0);
      }
    } else {
      setPdfText(pdfPastedText);
      setPdfCharCount(pdfPastedText.length);
    }
  }, [pdfInputMode]);

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setPdfFile(selectedFile);
    setPdfParsing(true);
    setPdfText('');
    setGeneratedQuestions([]);

    try {
      let text = '';
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        toast('Parsing PDF', 'Reading and extracting textual tokens client-side using PDF.js...', 'info');
        text = await extractTextFromPdf(selectedFile);
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(selectedFile);
        });
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Parsed note file returned zero text tokens. Empty file.');
      }

      setPdfText(text);
      setPdfCharCount(text.length);
      toast('Success', `Parsed medical/scientific notes successfully (${text.length} chars).`, 'success');
    } catch (err: any) {
      console.error(err);
      toast('Parsing Failed', err.message || 'Failed to parse note content.', 'error');
      setPdfFile(null);
    } finally {
      setPdfParsing(false);
    }
  };

  const handlePdfGenerateMcqs = async () => {
    if (!pdfText) {
      toast('Warning', 'Please select or upload a valid PDF notes set first.', 'info');
      return;
    }
    setAiGenerating(true);
    setGeneratedQuestions([]);
    
    let sampleText = pdfText;
    if (pdfText.length > 20000) {
      toast('Large File Warning', 'Truncating parsing scope to first 20,000 characters for optimal contextual parsing.', 'info');
      sampleText = pdfText.substring(0, 20000);
    }

    toast('Studying PDF Notes', 'Analyzing clinical concepts & preparing detailed medical explanations...', 'info');

    try {
      const res = await fetch('/api/admin/extract-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify({ 
          text: sampleText,
          custom_count: aiMcqCount
        })
      });

      if (res.ok) {
        const questions = await res.json();
        if (Array.isArray(questions)) {
          const mapped = questions.map(q => ({
            text: q.text || q.question_text,
            a: q.a || q.option_a || 'Option A',
            b: q.b || q.option_b || 'Option B',
            c: q.c || q.option_c || 'Option C',
            d: q.d || q.option_d || 'Option D',
            correct: q.correct_option || q.correct || 'option_a',
            explanation: q.explanation || 'No step-by-step solution provided.'
          }));
          setGeneratedQuestions(mapped);
          toast('Study Complete', `Successfully completed deep notes study. Formulated ${mapped.length} deep clinical MCQs.`, 'success');
        } else {
          toast('Format Error', 'Parsed response from AI did not match required MCQ array signature.', 'error');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast('Generation Failure', err.error || 'Server rejected extraction request.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      toast('Communication Interrupted', err.message || 'Connection crashed during deep AI study.', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleImportGeneratedQuestions = async () => {
    if (generatedQuestions.length === 0) return;
    if (!selectedCourseId || !selectedTopicId) {
      toast('Designation Required', 'Course and Topic scope assignments are missing.', 'error');
      return;
    }

    setImportingQuestions(true);
    try {
      const res = await fetch('/api/admin/save-to-course-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify({
          course_id: selectedCourseId,
          topic_mode: 'existing',
          topic_id: selectedTopicId,
          questions: generatedQuestions
        })
      });

      if (res.ok) {
        toast('Success', `Imported ${generatedQuestions.length} AI clinical MCQs with comprehensive explanations directly to syllabus.`, 'success');
        setGeneratedQuestions([]);
        setPdfFile(null);
        setPdfText('');
        fetchQuestions(selectedTopicId);
      } else {
        const err = await res.json().catch(() => ({}));
        toast('Syllabus Update Rejected', err.error || 'Server rejected importation request.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      toast('Action Blocked', e.message || 'System encountered network fault.', 'error');
    } finally {
      setImportingQuestions(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOption('a');
    setDiagramUrl('');
    setDiagramFile(null);
    setExplanation('');
    setEditingQuestion(null);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionText(q.question_text);
    setOptA(q.option_a);
    setOptB(q.option_b);
    setOptC(q.option_c);
    setOptD(q.option_d);
    
    // Robustly set the correct option
    let co = q.correct_option.toLowerCase();
    if (co.startsWith('option_')) {
      co = co.slice(7); // remove 'option_'
    }
    setCorrectOption(['a', 'b', 'c', 'd'].includes(co) ? (co as 'a' | 'b' | 'c' | 'd') : 'a');
    
    setDiagramUrl(q.diagram_url || '');
    setExplanation((q as any).explanation || '');
  };

  // Fetch all courses on load
  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data);
      })
      .catch(() => toast('Error', 'Failed to retrieve active courses list.', 'error'));
  }, []);

  // Fetch topics when course changes
  const handleCourseChange = async (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedTopicId('');
    setTopics([]);
    setQuestions([]);
    if (!courseId) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/topics`);
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch {
      toast('Error', 'Communication with topics repository disrupted.', 'error');
    }
  };

  // Fetch questions when topic changes
  useEffect(() => {
    if (selectedTopicId) {
      fetchQuestions(selectedTopicId);
    } else {
      setQuestions([]);
    }
  }, [selectedTopicId]);

  const fetchQuestions = async (topicId: string) => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/admin/questions/${topicId}`, {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        setQuestions(await res.json());
      }
    } catch {
      toast('Error', 'Failed to poll question list.', 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) {
      toast('Warning', 'A specific topic must be designated.', 'info');
      return;
    }

    if (!questionText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      toast('Required', 'Please render all question details and response structures.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEditing = !!editingQuestion;
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/admin/questions/${editingQuestion.id}` : '/api/admin/questions';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + adminToken
        },
        body: JSON.stringify({
          topic_id: selectedTopicId,
          question_text: questionText.trim(),
          option_a: optA.trim(),
          option_b: optB.trim(),
          option_c: optC.trim(),
          option_d: optD.trim(),
          correct_option: `option_${correctOption}`,
          diagram_url: diagramUrl.trim(),
          explanation: explanation.trim()
        })
      });

      const result = await res.json();
      if (res.ok && (isEditing || result.success)) {
        const questionId = isEditing ? editingQuestion.id : result.id;

        // 2. If diagram file resides, send it to the upload endpoint
        if (diagramFile) {
          const formData = new FormData();
          formData.append('file', diagramFile);

          const fileRes = await fetch(`/api/admin/questions/${questionId}/diagram`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + adminToken },
            body: formData
          });
          if (!fileRes.ok) {
            toast('Diagram Error', 'Form saved but image attachment failed.', 'error');
          }
        }

        toast('Success', isEditing ? 'Question updated.' : 'Question committed to database.', 'success');
        
        resetForm();
        fetchQuestions(selectedTopicId);
      } else {
        toast('Failed', result.error || 'Server rejected request.', 'error');
      }
    } catch {
      toast('Error', 'Disrupted session.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtractAndUpload = async () => {
    if (!selectedTopicId) {
        toast('Warning', 'A specific topic must be designated.', 'info');
        return;
    }
    
    // Improved Manual Parsing Logic
    try {
        const text = extractionText.trim();
        const allLines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
        
        const parsedQuestionsRaw = [];
        let currentQuestion: any = null;

        for (const line of allLines) {
            const newQMatch = line.match(/^(?:question\s*\d+[\.\)\-:\,]*\s*|q\s*\d+[\.\)\-:\,]*\s*|\d+[\.\)\-]\s*)/i);
            // Check if line looks like start of a new question
            // (digits followed by dot/paren/dash, or "Question X" prefix)
            if (newQMatch) {
                // If we were building a question, save it
                if (currentQuestion) {
                    parsedQuestionsRaw.push(currentQuestion);
                }
                // Start a new question
                currentQuestion = {
                    question_text: line.substring(newQMatch[0].length).trim(),
                    options: [],
                    explanation: null // use null to know if we've seen Solution yet
                };
            } else if (currentQuestion && /^(?:Solution|Explanation|Answer)(?:\s*:)?/i.test(line)) {
                currentQuestion.explanation = line.replace(/^(?:Solution|Explanation|Answer)(?:\s*:)?\s*/i, '').trim();
            } else if (currentQuestion && currentQuestion.explanation !== null) {
                currentQuestion.explanation += (currentQuestion.explanation ? '\n' : '') + line;
            } else if (currentQuestion && currentQuestion.options.length < 4) {
                // This line is an option
                currentQuestion.options.push(line);
            } else if (currentQuestion && currentQuestion.explanation === null && currentQuestion.options.length === 4) {
                // If they add text after 4 options but before "Solution: ", maybe it's part of the last option? Or just skip
            }
        }
        // Push the last one
        if (currentQuestion) {
            parsedQuestionsRaw.push(currentQuestion);
        }

        // Map to final format
        const finalQuestions = parsedQuestionsRaw.map(q => {
            const opts = q.options.map((opt: string, idx: number) => {
                return opt.replace(/^[a-zA-Z][\.\)\-]\s+/, '').replace('✅', '').trim() || 'Option ' + (idx + 1);
            });
            
            let correct_option = 'a';
            q.options.forEach((opt: string, idx: number) => {
                if (opt.includes('✅')) {
                    correct_option = ['a', 'b', 'c', 'd'][idx];
                }
            });

            return {
                question_text: q.question_text,
                option_a: opts[0] || 'Option 1',
                option_b: opts[1] || 'Option 2',
                option_c: opts[2] || 'Option 3',
                option_d: opts[3] || 'Option 4',
                correct_option,
                explanation: q.explanation || ''
            };
        });

        if (finalQuestions.length === 0) throw new Error('No questions found');

        const resBulk = await fetch('/api/admin/bulk-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + adminToken },
            body: JSON.stringify({ topic_id: selectedTopicId, questions: finalQuestions })
        });
        if (!resBulk.ok) throw new Error('Bulk upload failed');
        
        toast('Success', `Uploaded ${finalQuestions.length} questions.`, 'success');
        setExtractionText('');
        fetchQuestions(selectedTopicId);
    } catch (e: any) {
        toast('Error', 'Failed to parse text. Each question needs a number like "1. Stem", 4 options (one with ✅), and optional Solution.', 'error');
        console.error(e);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    setConfirmDeleteQid('');
    try {
      const res = await fetch(`/api/admin/questions/${qId}/${selectedTopicId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      if (res.ok) {
        toast('Purged', 'Question discarded.', 'success');
        fetchQuestions(selectedTopicId);
      } else {
        toast('Error', 'Purge workflow blocked on server.', 'error');
      }
    } catch {
      toast('Error', 'Unable to reach backend.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 md:p-3">
      {/* Configuration Selection Context (Top / Left Hub) */}
      <div className="lg:col-span-4 space-y-4">
        {/* Core Scope Setup Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Database size={18} className="text-blue-500" />
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-150 uppercase tracking-tight">Scope Assignment</h3>
          </div>

          <div className="space-y-4">
            {/* Step 1: Course Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">1. Master Class Course</label>
              <select
                value={selectedCourseId}
                onChange={e => handleCourseChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-bold transition-all text-slate-950 dark:text-white"
              >
                <option value="">-- Click to Target Course --</option>
                {masterCourses.map((c, idx) => (
                  <option key={`m_course_${c.id || c._id || idx}_${idx}`} value={c.id || c._id}>{c.code} - {c.title}</option>
                ))}
              </select>
            </div>

            {/* Step 2: Topic Selection */}
            {selectedCourseId && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">2. Attributed Syllabus Topic</label>
                {topics.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-center text-slate-400 dark:text-slate-500 rounded-xl">
                    No active topics linked to this course.
                  </div>
                ) : (
                  <select
                    value={selectedTopicId}
                    onChange={e => setSelectedTopicId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm font-bold transition-all text-slate-950 dark:text-white"
                  >
                    <option value="">-- Targeted Topic Section --</option>
                    {topics.map((t, idx) => (
                      <option key={`m_topic_${t.id || idx}_${idx}`} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic List Pane: Shows existing questions for active scope */}
        {selectedTopicId && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-5 max-h-[400px] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5"><LayoutGrid size={11}/> Question Pool</span>
              <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/35 border border-blue-200 dark:border-blue-800/10 text-blue-650 px-2 py-0.5 rounded-full">{questions.length} Items</span>
            </div>

            {loadingQuestions ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Polling syllabus registry...</div>
            ) : questions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                Question registry is empty for this topic.
              </div>
            ) : (
              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div key={`m_question_${q.id || idx}_${idx}`} className="relative p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start gap-2 group hover:border-blue-200 transition-all">
                    <span className="text-xs font-mono font-bold text-slate-400 pt-0.5 select-none">{idx + 1}.</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-850 dark:text-slate-300 truncate leading-snug">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1 select-none">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-650 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">Ans {q.correct_option.replace('option_', '').toUpperCase()}</span>
                        {q.diagram_url && <span className="text-[9px] font-black uppercase tracking-wider text-blue-500 bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/20">Image Included</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditQuestion(q)}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-500 text-slate-400 cursor-pointer transition-colors"
                    >
                      <Layers size={12} />
                    </button>
                    {confirmDeleteQid === q.id ? (
                        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 p-1 rounded-lg border border-red-200 dark:border-red-800 absolute right-2 z-10">
                            <span className="text-[9px] font-bold text-red-600 px-1 uppercase tracking-wider">Sure?</span>
                            <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 rounded bg-red-500 text-white hover:bg-red-600 shadow-sm" title="Yes, purge it"><CheckCircle2 size={12} /></button>
                            <button onClick={() => setConfirmDeleteQid('')} className="p-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"><Trash2 size={12} className="opacity-50 line-through" /></button>
                        </div>
                    ) : (
                        <button
                          onClick={() => setConfirmDeleteQid(q.id)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 dark:hover:text-red-400 text-slate-400 cursor-pointer transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleQuestionSubmit} className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-blue-500" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Modify Question</h3>
                    <p className="text-xs text-slate-500">Updating existing syllabus item</p>
                  </div>
                </div>
                <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              </div>

              {/* [Form content here - identical to existing form] */}
              {/* Note: I'll just keep the form here - I need to make sure I don't duplicate code *excessively* but extracting it is better. For now, I will just duplicate the form content inside the modal for simplicity and to ensure it works correctly *immediately*. */}
              
              {/* Actually, let's just keep the original form as "Create" and make this only "Edit". */}
              
              {/* Wait, the existing form handles both Create (via state) AND Edit (via editingQuestion) */}
              
              {/* Okay, I will put the form inside here. */}
              
              {/* Question Text Prompt */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aesthetic Question Stem</label>
                <textarea
                  placeholder="Write the full assessment problem or question here clearly. Ensure proper terminology is followed."
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs font-medium transition-all"
                  rows={3}
                  required
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* [Opt A/B/C/D inputs as used before] */}
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Option [A]</label> <input placeholder="A..." value={optA} onChange={e => setOptA(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs" required /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">B</label> <input placeholder="B..." value={optB} onChange={e => setOptB(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs" required /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">C</label> <input placeholder="C..." value={optC} onChange={e => setOptC(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs" required /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">D</label> <input placeholder="D..." value={optD} onChange={e => setOptD(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs" required /></div>
              </div>

              {/* ... Keys ... */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Designated Master Key Option</label>
                <div className="flex gap-2">
                  {(['a', 'b', 'c', 'd'] as const).map(option => (
                    <button key={option} type="button" onClick={() => setCorrectOption(option)} className={`flex-1 h-9 rounded-lg text-xs font-black uppercase transition-all select-none border-2 flex items-center justify-center ${correctOption === option ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-350'}`}>{option}</button>
                  ))}
                </div>
              </div>

              {/* Explanation Field */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Solution / Explanation (Optional)</label>
                <textarea
                  placeholder="Explain why this option is correct or provide a detailed solution..."
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2 rounded-lg text-xs"
                  rows={2}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-4 rounded-lg uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 flex items-center gap-2">
                  <Plus size={16} /> {isSubmitting ? 'Syncing...' : 'Update Question Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          {/* Editor & Creation Area (Original Main Form with AI Knowledge Bank options) */}
      <div className="lg:col-span-8">
        {selectedTopicId ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
            
            {/* Elegant Tab Selection Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Compile New Question</h3>
              </div>
              
              {/* Sub-tab pills */}
              <div className="flex bg-slate-150 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCreationTab('manual_bulk')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    creationTab === 'manual_bulk'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-300'
                  }`}
                >
                  ✍️ Manual / Bulk Form
                </button>
                <button
                  type="button"
                  onClick={() => setCreationTab('pdf_bank')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    creationTab === 'pdf_bank'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-slate-300'
                  }`}
                >
                  📚 Knowledge Bank PDF
                </button>
              </div>
            </div>

            {creationTab === 'manual_bulk' ? (
              <form onSubmit={handleQuestionSubmit} className="space-y-5">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bulk Extraction</label>
                    <textarea
                      placeholder="Paste questions here (Example: 1. Stem\na) Op\nb) Op ✅\nc) Op\nd) Op\nSolution: This is why B is correct...)"
                      value={extractionText}
                      onChange={e => setExtractionText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 p-3 rounded-xl text-sm font-medium"
                      rows={4}
                    />
                    <button
                      type="button"
                      onClick={handleExtractAndUpload}
                      disabled={!extractionText.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Parse & Bulk Upload
                    </button>
                    
                    {confirmTopicPurge ? (
                      <div className="w-full mt-2 flex items-center justify-between bg-red-50 dark:bg-red-900/10 border border-red-500/30 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest pl-2">Are you sure?</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmTopicPurge(false)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-705 dark:text-slate-300 text-xs font-bold rounded-lg uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedTopicId) return;
                              setConfirmTopicPurge(false);
                              
                              try {
                                const res = await fetch(`/api/admin/clear-topic/${selectedTopicId}`, {
                                  method: 'POST',
                                  headers: { 'Authorization': 'Bearer ' + adminToken }
                                });
                                if (res.ok) {
                                  toast('Purged', 'All questions in this topic have been deleted.', 'success');
                                  fetchQuestions(selectedTopicId);
                                  setExtractionText('');
                                } else {
                                  throw new Error('Failed to purge topic');
                                }
                              } catch (e: any) {
                                toast('Error', e.message, 'error');
                              }
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-lg uppercase flex items-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                          >
                            <Trash2 size={12} /> Confirm Purge
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmTopicPurge(true)}
                        disabled={!selectedTopicId}
                        className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest transition-all border border-red-500/20 flex justify-center items-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={14} /> Purge All Questions in Topic
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 pt-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Or, Manual Entry</h3>
                </div>
                
                {/* Question Text Prompt */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aesthetic Question Stem</label>
                  <textarea
                    placeholder="Write the full assessment problem or question here clearly. Ensure proper terminology is followed."
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-3 rounded-xl text-sm font-medium transition-all"
                    rows={3}
                    required
                  />
                </div>
                
                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Option [A]</label>
                    <input
                      placeholder="Structure answer A..."
                      value={optA}
                      onChange={e => setOptA(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Option [B]</label>
                    <input
                      placeholder="Structure answer B..."
                      value={optB}
                      onChange={e => setOptB(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Option [C]</label>
                    <input
                      placeholder="Structure answer C..."
                      value={optC}
                      onChange={e => setOptC(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Option [D]</label>
                    <input
                      placeholder="Structure answer D..."
                      value={optD}
                      onChange={e => setOptD(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm"
                      required
                    />
                  </div>
                </div>
                
                {/* Correct Key Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Designated Master Key Option</label>
                  <div className="flex gap-2">
                    {(['a', 'b', 'c', 'd'] as const).map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCorrectOption(option)}
                        className={`flex-1 h-9 rounded-lg text-xs font-black uppercase transition-all select-none border-2 flex items-center justify-center cursor-pointer ${
                          correctOption === option 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-350'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Explanation Field */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Solution / Explanation (Optional)</label>
                  <textarea
                    placeholder="Explain why this option is correct or provide a detailed solution..."
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-2.5 rounded-xl text-sm transition-all"
                    rows={3}
                  />
                </div>

                {/* Diagram */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1"><Image size={13}/> Exhibit Diagram Annotation (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Reference URL path..."
                      value={diagramUrl}
                      onChange={e => setDiagramUrl(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 focus:outline-none focus:border-blue-500 p-2.5 rounded-xl text-xs"
                    />
                    <label className="h-[38px] px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-702 dark:text-slate-300 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold select-none border border-slate-250 dark:border-slate-750 shrink-0">
                      <UploadCloud size={14} className="text-slate-400" />
                      <span>Upload file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setDiagramFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {diagramFile && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12}/> File ready: {diagramFile.name}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl uppercase tracking-widest transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} /> {isSubmitting ? 'Syncing...' : 'Register Question Entry'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 pt-2">
                
                {/* Advanced Tabed Switcher for Source Input */}
                <div className="flex bg-slate-150 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setPdfInputMode('upload');
                    }}
                    className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                      pdfInputMode === 'upload'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-550 dark:text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    📂 Upload Notes File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfInputMode('paste');
                    }}
                    className={`flex-1 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                      pdfInputMode === 'paste'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-550 dark:text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    📝 Paste Notes Text
                  </button>
                </div>

                {pdfInputMode === 'upload' ? (
                  /* Knowledge Bank Upload Widget */
                  !pdfFile ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-8 text-center transition-all cursor-pointer bg-slate-50 dark:bg-slate-950 relative overflow-hidden group">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handlePdfChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-450 flex items-center justify-center mx-auto mb-3 border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <UploadCloud size={20} />
                      </div>
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        Upload PDF Notes or Lecture Material
                      </span>
                      <span className="block text-[10px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-widest mt-1">
                        Supported formats: .pdf, .txt (Max 5MB)
                      </span>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-505 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-905 dark:text-white truncate max-w-[280px]">
                            {pdfFile.name}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-black">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • {pdfCharCount || "parsing..."} chars
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setPdfText('');
                          setGeneratedQuestions([]);
                        }}
                        className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                      >
                        Remove file
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block ml-1 font-mono">
                      Paste Syllabus Text of Note
                    </label>
                    <textarea
                      value={pdfPastedText}
                      onChange={e => setPdfPastedText(e.target.value)}
                      placeholder="Paste your medical textbook paragraphs, course reference sheets, or lecture transcripts directly here to extract..."
                      className="w-full h-44 bg-slate-50 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-705 dark:text-slate-350 focus:outline-none focus:border-blue-500 resize-none font-bold placeholder-slate-400"
                    />
                    <div className="flex justify-between items-center px-1 text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                      <span>Parsed Characters: {pdfPastedText.length.toLocaleString()}</span>
                      <span>Words: {pdfPastedText.trim() ? pdfPastedText.trim().split(/\s+/).length : 0}</span>
                    </div>
                  </div>
                )}

                {/* Parsing indicator */}
                {pdfParsing && (
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    <span>Parsing structure & recovering raw syllabus characters... Please wait.</span>
                  </div>
                )}

                {/* MCQ Config Controls */}
                {pdfText && !pdfParsing && (
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Sparkles size={14} className="text-blue-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                        Configure Knowledge study targets
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <span>Target MCQs to generate</span>
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs">{aiMcqCount} MCQs</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={aiMcqCount}
                        onChange={e => setAiMcqCount(Number(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[8px] font-black text-slate-400 dark:text-slate-600">
                        <span>5 MCQS</span>
                        <span>15 MCQS</span>
                        <span>30 MCQS</span>
                        <span>50 MCQS</span>
                      </div>
                    </div>

                    {!aiGenerating && generatedQuestions.length === 0 && (
                      <button
                        type="button"
                        onClick={handlePdfGenerateMcqs}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-widest shadow-md shadow-blue-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer animate-fade-in"
                      >
                        <Sparkles size={14} /> Study PDF Note & Generate MCQs
                      </button>
                    )}
                  </div>
                )}

                {/* AI Processing Screen */}
                {aiGenerating && (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                     <Loader2 size={36} className="animate-spin text-blue-500" />
                     <div className="space-y-1">
                       <span className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                         Deep Note Comprehension in Progress
                       </span>
                       <span className="block text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-black leading-loose">
                         AI is reading biological landmarks, mapping pathways, and assembling step-by-step explanations...
                       </span>
                     </div>
                  </div>
                )}

                {/* Live MCQ drafting Board */}
                {generatedQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                        Review Crafted MCQs Blueprint ({generatedQuestions.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setGeneratedQuestions([])}
                        className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-widest cursor-pointer"
                      >
                        Discard draft
                      </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                      {generatedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800/80 p-3 rounded-xl space-y-2.5">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-450 uppercase tracking-wider">
                            Draft {idx + 1}
                          </span>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                            {q.text}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            {(['a', 'b', 'c', 'd'] as const).map(opt => {
                              const optKey = `option_${opt}`;
                              const isCorrect = q.correct === optKey || q.correct === opt;
                              return (
                                <div
                                  key={opt}
                                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-450 font-bold'
                                      : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 text-slate-505 dark:text-slate-400'
                                  }`}
                                >
                                  <span className="uppercase font-black mr-1">[{opt}]</span> {q[opt]}
                                </div>
                              );
                            })}
                          </div>

                          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-lg shadow-sm">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                              <BookOpen size={10} /> Step-by-Step Educational Solution:
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-serif whitespace-pre-line">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleImportGeneratedQuestions}
                      disabled={importingQuestions}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-widest shadow-md shadow-emerald-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {importingQuestions ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-white" />
                          Publishing clinical MCQs to syllabus...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} /> Commit All Drafted Questions into Topic Library
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 h-full flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
              <Database size={24} />
            </div>
            <h3 className="font-bold text-slate-850 dark:text-slate-200 text-lg">Define Assessment Context</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4 leading-normal">Specify the target academic course and syllabus topic first to release the Question compilation controls.</p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl">
              Course Assignments <ArrowRight size={12}/> Syllabus Topic Choice
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
