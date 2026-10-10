import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';
import { 
  UploadCloud, FileText, Sparkles, Brain, MessageSquare, 
  BookOpen, HelpCircle, CheckCircle2, XCircle, ArrowRight, 
  Loader2, RefreshCw, ArrowLeft, Trash2, Copy, 
  BookMarked, Award, Check, Play
} from 'lucide-react';

// Formatted rendering component for textbook-grade clinical AI outputs
function StandardStudyTextRenderer({ text }: { text: string }) {
  if (!text) return null;

  const rawLines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listCounter = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-list-${listCounter++}`} className="list-disc pl-5 my-3 space-y-2 text-slate-705 dark:text-slate-350">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const cleanInlineMarkdown = (str: string) => {
    if (!str) return str;
    
    // Clean raw headings left over or markers
    let cleanStr = str
      .replace(/^(###|##|#)\s+/, '')
      .replace(/^\s*[-*•]\s+/, '')
      .trim();

    const boldRegex = /(\*\*|__)(.*?)\1/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(cleanStr)) !== null) {
      const matchIdx = match.index;
      if (matchIdx > lastIndex) {
        parts.push(cleanStr.substring(lastIndex, matchIdx));
      }
      parts.push(
        <strong key={`inline-bold-${matchIdx}`} className="font-extrabold text-slate-900 dark:text-white">
          {match[2]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < cleanStr.length) {
      parts.push(cleanStr.substring(lastIndex));
    }

    return parts.length > 0 ? parts : cleanStr;
  };

  rawLines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      flushList();
      renderedElements.push(
        <hr key={`hr-line-${index}`} className="my-4 border-slate-200 dark:border-zinc-800" />
      );
      return;
    }

    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];

      const sizeStyle = level === 1 
        ? "text-sm font-black uppercase tracking-widest text-[#10B981] mb-2 mt-4 block"
        : level === 2 
          ? "text-[12px] font-black uppercase text-slate-800 dark:text-slate-100 mb-1.5 mt-3 block"
          : "text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 mt-2.5 block";

      renderedElements.push(
        <span key={`heading-el-${index}`} className={sizeStyle}>
          {cleanInlineMarkdown(headingContent)}
        </span>
      );
      return;
    }

    const listMatch = trimmedLine.match(/^([\*\-\+•])\s+(.*)$/);
    if (listMatch) {
      const itemContent = listMatch[2];
      if (itemContent.trim() !== '') {
        listItems.push(
          <li key={`list-item-${index}`} className="leading-relaxed hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            {cleanInlineMarkdown(itemContent)}
          </li>
        );
        return;
      }
    }

    if (trimmedLine.match(/^[A-D]\)\s+(.*)$/) || trimmedLine.match(/^\d+\)\s+(.*)$/)) {
      flushList();
      renderedElements.push(
        <div key={`opt-item-${index}`} className="my-1.5 pl-3 border-l-2 border-[#10B981] text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-zinc-900/10 p-2 rounded-r font-medium">
          {cleanInlineMarkdown(trimmedLine)}
        </div>
      );
      return;
    }

    const orderMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (orderMatch) {
      flushList();
      const orderNum = orderMatch[1];
      const orderContent = orderMatch[2];
      renderedElements.push(
        <div key={`order-item-${index}`} className="flex gap-2 items-start my-2.5 text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
          <span className="font-extrabold text-[#10B981] text-[11px] shrink-0 mt-0.5 min-w-[14px] text-right">{orderNum}.</span>
          <div className="flex-1 text-[11px]">{cleanInlineMarkdown(orderContent)}</div>
        </div>
      );
      return;
    }

    if (trimmedLine === '') {
      flushList();
      renderedElements.push(<div key={`empty-sp-${index}`} className="h-2" />);
      return;
    }

    flushList();
    renderedElements.push(
      <p key={`p-text-${index}`} className="mb-2 leading-relaxed text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
        {cleanInlineMarkdown(trimmedLine)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 text-[11px] leading-relaxed text-left">{renderedElements}</div>;
}

export default function ActiveStudyView() {
  const { token } = useAppContext();
  
  // Persistence cache for active study documents
  const [docName, setDocName] = useState<string>(() => localStorage.getItem('FCF_StudyDocName') || '');
  const [docContent, setDocContent] = useState<string>(() => localStorage.getItem('FCF_StudyDocContent') || '');
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);

  // Lab Tab Navigation
  const [activeTab, setActiveTab] = useState<'chat' | 'quiz' | 'guide'>('chat');

  // AI Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: "Hello! Space-level document parsing complete. I have successfully digitized your notes. Ask me any inquiry, and I'll extract it instantly with clinical accuracy!" }
  ]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // CBT Quiz States
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Textbook Guide States
  const [studyGuide, setStudyGuide] = useState<string>('');
  const [isCompilingGuide, setIsCompilingGuide] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Scroll Chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatTyping]);

  // Load PDF parser from CDN dynamically
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
              script.onerror = () => rej(new Error('Failed to load PDF extraction module.'));
              document.head.appendChild(script);
            });
          }
          
          const pdfjs = (window as any).pdfjsLib;
          const pdf = await pdfjs.getDocument({ data: typedarray }).promise;
          let text = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            setParsingProgress(Math.round((i / pdf.numPages) * 100));
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
      reader.onerror = () => reject(new Error('FileReader error.'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Upload/Change handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 14 * 1024 * 1024) {
      toast('File Oversized', 'Maximum document size allowed is 14MB.', 'error');
      return;
    }

    setIsParsing(true);
    setParsingProgress(10);
    try {
      let text = "";
      if (file.name.endsWith('.pdf')) {
        text = await extractTextFromPdf(file);
      } else if (file.name.endsWith('.txt')) {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('TXT file read error.'));
          reader.readAsText(file);
        });
        setParsingProgress(100);
      } else {
        toast('Format Refused', 'Please provide a valid PDF or standard Text document.', 'error');
        setIsParsing(false);
        return;
      }

      if (!text || text.trim().length === 0) {
        throw new Error('Study materials appear empty or non-scannable.');
      }

      // Save to React & Local states
      setDocName(file.name);
      setDocContent(text);
      localStorage.setItem('FCF_StudyDocName', file.name);
      localStorage.setItem('FCF_StudyDocContent', text);

      // Reset nested views
      setChatHistory([
        { role: 'model', text: `Digitation successful! I have actively studied your notes: "${file.name}" (${Math.round(text.length / 1000)}k characters parsed). Feel free to ask queries, request an instant CBT practice exam, or compile a 10x clinical guidebook!` }
      ]);
      setQuizQuestions([]);
      setStudyGuide('');
      setCurrentIdx(0);
      setCorrectAnswers(0);
      setQuizCompleted(false);
      setSelectedOption(null);
      setActiveTab('chat');

      toast('Activation Complete', `Digitized "${file.name}" into your Active Study Studio context!`, 'success');
    } catch (err: any) {
      console.error(err);
      toast('Capture Failure', err.message || 'Verification relay failed to parse document.', 'error');
    } finally {
      setIsParsing(false);
      setParsingProgress(0);
    }
  };

  // Chat with active PDF notes
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatInput.trim();
    if (!query || isChatTyping || !docContent) return;

    setChatInput('');
    const updatedHistory = [...chatHistory, { role: 'user' as const, text: query }];
    setChatHistory(updatedHistory);
    setIsChatTyping(true);

    try {
      const res = await fetch('/api/tutor/active-study/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('FCF_Token')}`
        },
        body: JSON.stringify({
          documentText: docContent,
          message: query,
          history: updatedHistory.slice(-6)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setChatHistory(prev => [...prev, { role: 'model', text: data.response }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'model', text: "Fail safe: The model encountered an active study processing difficulty. Please rephrase." }]);
      }
    } catch {
      setChatHistory(prev => [...prev, { role: 'model', text: "Synchronization failure. Please test your network configuration." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // Compile unique CBT quiz
  const handleGenerateQuiz = async () => {
    if (isGeneratingQuiz || !docContent) return;
    setIsGeneratingQuiz(true);
    setQuizQuestions([]);
    setCurrentIdx(0);
    setCorrectAnswers(0);
    setQuizCompleted(false);
    setSelectedOption(null);

    try {
      const res = await fetch('/api/tutor/active-study/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('FCF_Token')}`
        },
        body: JSON.stringify({ documentText: docContent })
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        toast('Quiz Compiled', 'AI actively researched your notes to create 5 challenging board-level MCQs!', 'success');
      } else {
        toast('Generation Fault', data.error || 'Failed to extract premium multi-choice questions.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Service Interrupted', 'Failed to generate quiz. Try making the document shorter of refreshing.', 'error');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle MCQ selection
  const handleSelectOption = (opt: 'option_a' | 'option_b' | 'option_c' | 'option_d') => {
    if (selectedOption !== null || quizCompleted) return;
    setSelectedOption(opt);

    const question = quizQuestions[currentIdx];
    if (opt === question.correct_option) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  // Next Question MCQ
  const handleNextQuestion = () => {
    if (currentIdx === quizQuestions.length - 1) {
      setQuizCompleted(true);
    } else {
      setSelectedOption(null);
      setCurrentIdx(prev => prev + 1);
    }
  };

  // Compile textbook study guide
  const handleCompileGuide = async () => {
    if (isCompilingGuide || !docContent) return;
    setIsCompilingGuide(true);
    setStudyGuide('');

    try {
      const res = await fetch('/api/tutor/active-study/generate-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('FCF_Token')}`
        },
        body: JSON.stringify({ documentText: docContent })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStudyGuide(data.guide);
        toast('Study Guide Compiled', 'Generated a 10x textbook clinical study guide with detailed mechanism sections!', 'success');
      } else {
        toast('Compilation Failed', data.error || 'Failed to generate textbook guide.', 'error');
      }
    } catch (e) {
      console.error(e);
      toast('Relay Fault', 'Connection dropped during extraction.', 'error');
    } finally {
      setIsCompilingGuide(false);
    }
  };

  const copyGuideToClipboard = () => {
    if (!studyGuide) return;
    navigator.clipboard.writeText(studyGuide.replace(/[^\x00-\x7F]/g, "")); // Sanitizes standard chars if needed
    setIsCopied(true);
    toast('Copied', 'Study guide extracted to clip buffer!', 'success');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const deleteActiveSession = () => {
    if (window.confirm("Are you sure you want to exit the current Active Study session? The document memory will be cleared.")) {
      setDocName('');
      setDocContent('');
      localStorage.removeItem('FCF_StudyDocName');
      localStorage.removeItem('FCF_StudyDocContent');
      toast('Session Cleared', 'Ready for new study material.', 'info');
    }
  };

  return (
    <DashboardLayout viewTitle="HQ | AI Active Study">
      <div className="max-w-4xl mx-auto w-full p-2 sm:p-4 md:p-6 space-y-6">
        
        {/* Main Pitch Card */}
        <div className="bg-gradient-to-r from-blue-700/80 to-indigo-800 p-6 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-400/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white/10 dark:bg-black/20 rounded-2xl flex items-center justify-center border border-white/20 shrink-0 text-cyan-300">
              <Brain size={36} className="animate-pulse" />
            </div>
            <div className="text-left space-y-1">
              <span className="text-[9px] bg-cyan-400 text-[#0f172a] px-2 py-0.5 rounded font-black uppercase tracking-wider">Intelligence Lab</span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none uppercase shrink-0">Active Study Room</h1>
              <p className="text-slate-200 text-xs font-semibold leading-relaxed max-w-xl">
                Upload raw research PDFs, custom lecture PowerPoints, or clinical handouts.
                Your personal AI Assistant reads, studies, and retains the material to act as your expert study companion.
              </p>
            </div>
          </div>
        </div>

        {/* Outer State Controller Check */}
        {!docContent ? (
          /* SECTION 1: UPLOAD & DIGITALIZATION STUDIO */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 rounded-[2.5rem] shadow-sm text-center space-y-8"
          >
            <div className="max-w-md mx-auto space-y-3">
              <p className="text-[10px] font-black tracking-widest uppercase text-blue-500">Step 1: Feed Study Materials</p>
              <h2 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-wide leading-tight">No Document studying currently</h2>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Provide any academic handout. We use fast client-side decoders to parse every single syllable without routing files to external file storage servers.
              </p>
            </div>

            {/* Interactive File Drop / Click Zone */}
            <div className="max-w-lg mx-auto">
              {isParsing ? (
                /* Scanning Progress Screen */
                <div className="border-2 border-dashed border-blue-500 rounded-3xl p-12 bg-blue-500/5 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <Sparkles className="absolute -top-1 -right-1 text-yellow-500 w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-black text-slate-850 dark:text-blue-300 uppercase tracking-widest">Active Study Decoding</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Mapping physiological formulas & notes... {parsingProgress}%</p>
                  </div>
                  <div className="w-48 bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${parsingProgress}%` }} />
                  </div>
                </div>
              ) : (
                /* Native File Input Trigger card */
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-700 rounded-3xl p-10 cursor-pointer block bg-slate-50/20 dark:bg-[#040404]/40 hover:bg-slate-50 dark:hover:bg-zinc-900/10 transition-all group">
                  <input 
                    type="file" 
                    accept=".pdf,.txt" 
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:scale-110 group-hover:bg-blue-500/15 group-hover:text-blue-500 transition-all">
                      <UploadCloud size={28} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Browse PDF or Text File</span>
                      <p className="text-[10px] text-slate-400 font-bold">Drag and drop file directly here (Max size 14MB)</p>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      Supports: .pdf / .txt
                    </div>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 max-w-sm mx-auto text-left text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-zinc-900/10 p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-900">
              <FileText className="text-slate-400 shrink-0" size={18} />
              <p className="leading-snug">Note parses securely in the browser. No login required or files cached indefinitely on servers.</p>
            </div>
          </motion.div>
        ) : (
          /* SECTION 2: STUDY PILOT STATION */
          <div className="space-y-6">
            
            {/* Active Document Meta Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-[#070707] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3.5 max-w-lg">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="text-left min-w-0">
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">Actively Studied</span>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-250 truncate mt-0.5 max-w-[200px] sm:max-w-sm">{docName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{Math.round(docContent.length / 1024)} KB digitized notes</p>
                </div>
              </div>

              {/* Reset Control Session */}
              <button 
                onClick={deleteActiveSession}
                className="py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
              >
                <Trash2 size={12} />
                <span>Erase Note</span>
              </button>
            </div>

            {/* Smart Study Switcher Tabs */}
            <div className="flex border border-slate-200/60 dark:border-slate-800 p-1 bg-white dark:bg-[#070707] rounded-2xl shadow-sm">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-[10px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0c0c0c]'
                }`}
              >
                <MessageSquare size={13} />
                <span>Note Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex-1 py-3 text-[10px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'quiz' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0c0c0c]'
                }`}
              >
                <HelpCircle size={13} />
                <span>CBT Quiz</span>
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-3 text-[10px] uppercase font-black tracking-widest transition-all rounded-xl cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'guide' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-[#0c0c0c]'
                }`}
              >
                <BookOpen size={13} />
                <span>10x Guide</span>
              </button>
            </div>

            {/* Tab content area with transition */}
            <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                /* CHAT CORE PANEL */
                <motion.div
                  key="chat-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 rounded-[2rem] shadow-sm flex flex-col h-[500px] overflow-hidden"
                >
                  {/* Chat logs */}
                  <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 select-text">
                    {chatHistory.map((msg, i) => (
                      <div 
                        key={i} 
                        className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                          msg.role === 'user' 
                            ? 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300' 
                            : 'bg-blue-500 text-white shadow-sm shadow-blue-500/10'
                        }`}>
                          {msg.role === 'user' ? 'S' : 'M'}
                        </div>
                        <div className={`px-4 py-3 rounded-2xl border text-[11px] leading-relaxed text-left ${
                          msg.role === 'user' 
                            ? 'bg-slate-50 dark:bg-zinc-900/20 border-slate-100 dark:border-zinc-900 rounded-tr-none text-slate-800 dark:text-slate-200 font-semibold' 
                            : 'bg-white dark:bg-[#0b0b0b]/60 border-slate-200/40 dark:border-zinc-800/80 rounded-tl-none shadow-sm'
                        }`}>
                          {msg.role === 'model' ? (
                            <StandardStudyTextRenderer text={msg.text} />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isChatTyping && (
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-black animate-pulse">M</div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-slate-50 dark:bg-zinc-900/10 border border-slate-100 dark:border-zinc-900/60 text-slate-400 dark:text-slate-500 text-[10px] font-semibold flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin text-blue-550" />
                          <span>AI studying materials...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Form */}
                  <form 
                    onSubmit={handleChatSubmit} 
                    className="p-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-[#040404]/60 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Ask anything about the pathways outlined in your PDF..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={isChatTyping}
                      className="flex-1 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-slate-850 outline-none p-3.5 rounded-xl text-[11px] font-semibold text-slate-850 dark:text-slate-250 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatInput.trim() || isChatTyping}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all shadow-md cursor-pointer ${
                        chatInput.trim() && !isChatTyping 
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/15' 
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed'
                      }`}
                    >
                      <ArrowRight size={16} />
                    </button>
                  </form>
                </motion.div>
              )}

              {activeTab === 'quiz' && (
                /* CBT PRACTICE EXAM TAB */
                <motion.div
                  key="quiz-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 p-5 sm:p-8 rounded-[2rem] shadow-sm space-y-6 min-h-[400px] flex flex-col justify-center"
                >
                  {quizQuestions.length === 0 ? (
                    /* Initial prompt compile quiz */
                    <div className="text-center py-10 space-y-5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                        <HelpCircle size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">CBT Practice compilation</h3>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                          Click compile below to analyze clinical terms and generate 5 randomized board-style questions from your notes.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-350"
                      >
                        {isGeneratingQuiz ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Reconstructing board exams...</span>
                          </>
                        ) : (
                          <>
                            <Play size={10} strokeWidth={3} />
                            <span>Compile CBT Board Quiz</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : !quizCompleted ? (
                    /* Active MCQ playing loop */
                    <div className="space-y-6 text-left">
                      {/* CBT Exam Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15">
                          Question {currentIdx + 1} of {quizQuestions.length}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">Score Progress: {correctAnswers} correct</div>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-2">
                        <p className="text-xs font-black text-slate-850 dark:text-slate-100 leading-snug">
                          {quizQuestions[currentIdx]?.text}
                        </p>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {['a', 'b', 'c', 'd'].map(optKey => {
                          const optionField = optKey; // matches 'a','b','c','d'
                          const optionValue = quizQuestions[currentIdx]?.[optionField];
                          const optKeyword = `option_${optKey}`;
                          const isSelected = selectedOption === optKeyword;
                          const isCorrectVal = quizQuestions[currentIdx]?.correct_option === optKeyword;
                          
                          // Custom responsive feedback colors
                          let buttonStyle = "bg-slate-50 dark:bg-zinc-900/10 border-slate-200/60 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900/30 text-slate-700 dark:text-slate-300";
                          if (selectedOption !== null) {
                            if (isCorrectVal) {
                              buttonStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400";
                            } else if (isSelected) {
                              buttonStyle = "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400";
                            } else {
                              buttonStyle = "bg-slate-100/50 dark:bg-zinc-900/5 border-slate-200/20 text-slate-400 dark:text-slate-600";
                            }
                          }

                          return (
                            <button
                              key={optKey}
                              onClick={() => handleSelectOption(optKeyword as any)}
                              disabled={selectedOption !== null}
                              className={`w-full flex items-center justify-between p-4 border rounded-xl text-[11px] font-bold text-left transition-all ${buttonStyle} ${selectedOption === null ? 'cursor-pointer active:translate-y-0.5' : 'cursor-not-allowed'}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 uppercase text-[10px] font-black ${
                                  selectedOption !== null && isCorrectVal 
                                    ? 'bg-emerald-500 text-white' 
                                    : selectedOption !== null && isSelected 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-slate-200/50 dark:bg-zinc-800 dark:text-slate-400'
                                }`}>
                                  {optKey}
                                </span>
                                <span className="pt-0.5">{optionValue}</span>
                              </div>
                              
                              {/* Visual icons indication */}
                              {selectedOption !== null && (
                                isCorrectVal ? (
                                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                ) : isSelected ? (
                                  <XCircle size={15} className="text-red-500 shrink-0" />
                                ) : null
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Display Clinical Explanation Card */}
                      {selectedOption !== null && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 rounded-xl space-y-1"
                        >
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 dark:text-cyan-400">Clinical Explanation:</span>
                          <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-350 font-semibold select-text">
                            {quizQuestions[currentIdx]?.explanation}
                          </p>
                        </motion.div>
                      )}

                      {/* Controller Next Button */}
                      {selectedOption !== null && (
                        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-850">
                          <button
                            onClick={handleNextQuestion}
                            className="px-5 py-3 bg-slate-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{currentIdx === quizQuestions.length - 1 ? 'End Quiz Session' : 'Next Question'}</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Final scorecard screen */
                    <motion.div 
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="text-center py-6 space-y-6 max-w-sm mx-auto"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-xl">
                        <Award size={36} />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">CBT Session Completed</h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug font-semibold">
                          You answered <strong className="text-emerald-500">{correctAnswers} out of {quizQuestions.length}</strong> questions correctly!
                        </p>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                          {Math.round((correctAnswers / quizQuestions.length) * 100)}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleGenerateQuiz}
                          className="py-3 px-4 bg-slate-900 hover:bg-black dark:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RefreshCw size={11} />
                          <span>Retry Exam</span>
                        </button>
                        <button
                          onClick={() => { setQuizQuestions([]); setQuizCompleted(false); }}
                          className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <HelpCircle size={11} />
                          <span>Close Quiz</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === 'guide' && (
                /* TEXTBOOK GUIDE TAB */
                <motion.div
                  key="guide-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-[#070707] border border-slate-200/60 dark:border-slate-800 p-5 sm:p-8 rounded-[2rem] shadow-sm space-y-6 min-h-[400px] flex flex-col justify-center"
                >
                  {!studyGuide ? (
                    /* Prompt compile guide */
                    <div className="text-center py-10 space-y-5 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                        <BookOpen size={24} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">10x textbook summaries</h3>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                          Click compilation below to analyze raw notes and output an extensively detailed clinical clinical textbooks study guide.
                        </p>
                      </div>
                      <button
                        onClick={handleCompileGuide}
                        disabled={isCompilingGuide}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-350"
                      >
                        {isCompilingGuide ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Studying mechanisms & compiling textbook...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={11} />
                            <span>Compile Textbook Guide</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Display Compiled Guide */
                    <div className="space-y-5 text-left flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#10B981]">Clinical Reference Guide</span>
                        <button
                          onClick={copyGuideToClipboard}
                          className="py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/20 dark:hover:bg-zinc-900 text-slate-650 dark:text-slate-305 border border-slate-200/50 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          <span>{isCopied ? 'Copied Guide' : 'Extract Guide'}</span>
                        </button>
                      </div>

                      {/* Display Markdown parsed text */}
                      <div className="bg-slate-50/25 dark:bg-[#040404]/30 border border-slate-100 dark:border-zinc-900/60 p-5 sm:p-7 rounded-2xl select-text max-h-[420px] overflow-y-auto font-medium">
                        <StandardStudyTextRenderer text={studyGuide} />
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-850 shrink-0">
                        <button
                          onClick={handleCompileGuide}
                          disabled={isCompilingGuide}
                          className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/10 dark:hover:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw size={12} className={isCompilingGuide ? 'animate-spin' : ''} />
                          <span>Recompile Guide</span>
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
