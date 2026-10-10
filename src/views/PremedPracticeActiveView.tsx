import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { 
  ChevronLeft, ChevronRight, Bookmark, AlertCircle, Timer, Check, Send, 
  BookOpen, Calculator, Volume2, Award, Info, X, CheckCircle2, Bot,
  ShieldAlert, Monitor
} from 'lucide-react';
import { toast } from '../components/Toast';
import { MathRenderer } from '../components/MathRenderer';

interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  diagram_url?: string;
  explanation?: string;
  correct_option?: string;
}

interface CourseComp {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  sessionId: string;
  questions: Question[];
}

interface MulticourseSession {
  startTime: number;
  expectedDuration: number;
  courses: CourseComp[];
  answers: Record<string, string>; // maps question.id -> selected option name
  flags: Record<string, boolean>; // maps question.id -> flag state
  currentTabCourseId: string;
  currentIdxByCourse: Record<string, number>; // maps courseId -> index parameter
  testMode: 'practice' | 'mock' | 'study';
}

export default function PremedPracticeActiveView() {
  const navigate = useNavigate();
  const [session, setSession] = useState<MulticourseSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Active indices and state
  const [activeCourseId, setActiveCourseId] = useState<string>('');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  // Auxiliary UI controls
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcHist, setCalcHist] = useState<string[]>([]);
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentSolution, setShowCurrentSolution] = useState(false);

  // Security and copy-cheating countermeasures
  const [isBlurred, setIsBlurred] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenBypassed, setFullscreenBypassed] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const violationCountRef = useRef(0);
  const submitRef = useRef<() => void>(undefined);

  // Live high-speed visual proctoring components
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const activeCourseIdRef = useRef<string>('');
  const sessionRef = useRef<MulticourseSession | null>(null);

  // Dynamically inject user-selection blocking style on mount
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  useEffect(() => {
    setShowCurrentSolution(false);
  }, [currentIdx, activeCourseId]);
  
  // TTS Speecher
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize and load from localstorage
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    const raw = localStorage.getItem('FCF_MulticourseSession');
    if (!raw) {
      toast('No Active Practice', 'Please configure and launch a practice session first.', 'error');
      navigate('/practice');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as MulticourseSession;
      setSession(parsed);
      
      // Select the active subject context
      const actId = parsed.currentTabCourseId || parsed.courses[0]?.courseId || '';
      setActiveCourseId(actId);
      
      // Determine individual subject index
      const subjIdx = parsed.currentIdxByCourse?.[actId] ?? 0;
      setCurrentIdx(subjIdx);

      // Align remaining clock tick
      const elapsedSeconds = Math.floor((Date.now() - parsed.startTime) / 1000);
      const remaining = Math.max(0, parsed.expectedDuration - elapsedSeconds);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        toast('Time Elapsed', 'Standard practice session countdown has finished.', 'info');
      }

      setLoading(false);
    } catch (e) {
      toast('Corrupted Session State', 'Please regenerate practice parameters.', 'error');
      navigate('/practice');
    }

    return () => {
      if (synthRef.current && isSpeaking) {
        synthRef.current.cancel();
      }
    };
  }, [navigate]);

  useEffect(() => {
    sessionRef.current = session;
    if (session) {
      answersRef.current = session.answers || {};
    }
  }, [session]);

  useEffect(() => {
    activeCourseIdRef.current = activeCourseId;
  }, [activeCourseId]);

  // General Tick timer countdown
  useEffect(() => {
    if (loading || !session || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, session, timeLeft]);

  // Persist answers/flags state back to localStorage occasionally
  const updateSessionState = (updated: Partial<MulticourseSession>) => {
    if (!session) return;
    const next = { ...session, ...updated };
    setSession(next);
    localStorage.setItem('FCF_MulticourseSession', JSON.stringify(next));
  };

  const handleSelectOption = (optionKey: string) => {
    if (!session || !activeCourseId) return;
    
    const activeSubObj = session.courses.find(c => c.courseId === activeCourseId);
    if (!activeSubObj) return;
    
    const question = activeSubObj.questions[currentIdx];
    if (!question) return;

    const nextAnswers = { ...session.answers, [question.id]: optionKey };
    updateSessionState({ answers: nextAnswers });
  };

  const toggleBookmark = () => {
    if (!session || !activeCourseId) return;

    const activeSubObj = session.courses.find(c => c.courseId === activeCourseId);
    if (!activeSubObj) return;

    const question = activeSubObj.questions[currentIdx];
    if (!question) return;

    const nextFlags = { ...session.flags, [question.id]: !session.flags[question.id] };
    updateSessionState({ flags: nextFlags });
  };

  const handleSwitchSubject = (id: string) => {
    if (!session) return;
    
    // Save current index
    const nextIdxByCourse = { 
      ...(session.currentIdxByCourse || {}), 
      [activeCourseId]: currentIdx 
    };

    setActiveCourseId(id);
    const savedSubjIdx = nextIdxByCourse[id] ?? 0;
    setCurrentIdx(savedSubjIdx);

    updateSessionState({
      currentTabCourseId: id,
      currentIdxByCourse: nextIdxByCourse
    });

    if (synthRef.current && isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Speaks aloud the text of the custom question using Web Speech Synthesis API
  const speakQuestion = () => {
    if (!synthRef.current || !session) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const activeSubObj = session.courses.find(c => c.courseId === activeCourseId);
    const activeQ = activeSubObj?.questions[currentIdx];
    if (!activeQ) return;

    const plainText = activeQ.question_text
      .replace(/<\/?[^>]+(>|$)/g, "") // remove any html tags
      .trim();

    const textToSpeak = `Question ${currentIdx + 1}: ${plainText}. Options are: Option A: ${activeQ.option_a || 'Not specified'}. Option B: ${activeQ.option_b || 'Not specified'}. Option C: ${activeQ.option_c || 'Not specified'}. Option D: ${activeQ.option_d || 'Not specified'}.`;

    utteranceRef.current = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current.onend = () => setIsSpeaking(false);
    utteranceRef.current.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    synthRef.current.speak(utteranceRef.current);
  };

  // Auto Submission handler when timer runs out
  const handleAutoSubmit = () => {
    toast('Session Complete', 'Time limit elapsed. Generating grading outcomes...', 'info');
    performSubmit();
  };

  const handleManuallySubmit = () => {
    performSubmit();
  };

  const performSubmit = () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);

    const submissionsPayload = session.courses.map(c => {
      const subjectAnswers: Record<string, string> = {};
      c.questions.forEach(q => {
        if (session.answers[q.id]) {
          subjectAnswers[q.id] = session.answers[q.id];
        }
      });

      return {
        sessionId: c.sessionId,
        courseId: c.courseId,
        answers: subjectAnswers
      };
    });

    fetch('/api/simulation/submit-multicourse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}`
      },
      body: JSON.stringify({
        submissions: submissionsPayload
      })
    })
    .then(async (res) => {
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Clear multi course session
      localStorage.removeItem('FCF_MulticourseSession');
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      // Save results inside localStorage temporarily to retrieve on compilation
      localStorage.setItem('FCF_PracticeResults', JSON.stringify({
        results: data.results,
        testMode: session.testMode,
        courses: session.courses.map(c => ({
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          courseCode: c.courseCode,
          questions: c.questions
        })),
        studentAnswers: session.answers
      }));

      toast('Combined Results Calculated', 'CBT graded successfully.', 'success');
      navigate('/practice-results');
    })
    .catch(err => {
      setIsSubmitting(false);
      toast('Submission Interrupted', err.message || 'Trouble grading CBT.', 'error');
    });
  };

  useEffect(() => {
    submitRef.current = performSubmit;
  }, [performSubmit]);

  // Capture active camera snapshot + parameters
  const captureSnapshot = useCallback(() => {
    let webcam = null;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        webcam = canvas.toDataURL('image/jpeg', 0.5);
      }
    }

    const activeCourseAnswers: Record<string, string> = {};
    const actCourse = sessionRef.current?.courses?.find(c => c && c.courseId === activeCourseIdRef.current);
    if (actCourse) {
      actCourse.questions.forEach(q => {
        if (answersRef.current[q.id]) {
          activeCourseAnswers[q.id] = answersRef.current[q.id];
        }
      });
    }

    return {
      webcam,
      currentIdx,
      answeredCount: Object.keys(activeCourseAnswers).length,
      answers: activeCourseAnswers
    };
  }, [currentIdx]);

  // Connect to realtime server using websocket for millisecond framing updates
  useEffect(() => {
    const activeSubj = session?.courses?.find(c => c && c.courseId === activeCourseId);
    const sId = activeSubj?.sessionId;
    if (!sId) return;

    try {
      const socket = io();
      socketRef.current = socket;
      
      socket.on('connect', () => {
        socket.emit('proctor-join', { sessionId: sId });
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Socket.io connectivity disabled or blocked:", err);
    }
  }, [session, activeCourseId]);

  // Emit live framing to Socket.io at a high-speed ~750ms interval
  useEffect(() => {
    const activeSubj = session?.courses?.find(c => c && c.courseId === activeCourseId);
    const sId = activeSubj?.sessionId;
    if (!sId) return;

    const interval = setInterval(() => {
      const snap = captureSnapshot();
      if (snap && snap.webcam) {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('proctor-snapshot', {
            sessionId: sId,
            snapshot: snap
          });
        }
      }
    }, 750);

    return () => clearInterval(interval);
  }, [session, activeCourseId, captureSnapshot]);

  // Fetch administrator interventions (overrides, warnings, terminations)
  useEffect(() => {
    const activeSubj = session?.courses?.find(c => c && c.courseId === activeCourseId);
    const sId = activeSubj?.sessionId;
    if (!sId) return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/check-overrides/${sId}`, {
           headers: { 'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` }
        });
        const data = await res.json();
        if (data.status === 'terminated_by_admin') {
           toast('Session Terminated', 'School administration has terminated this testing asset stream safely.', 'error');
           navigate('/');
           return;
        }
        if (data.warnings && data.warnings.length > 0) {
           const lastWarning = data.warnings[data.warnings.length - 1];
           toast('Official warning', `Proctor: ${lastWarning}`, 'error');
        }
        if (data.answer_overrides) {
          const overrides = data.answer_overrides;
          let changed = false;
          const updatedAnswers = { ...(sessionRef.current?.answers || {}) };
          
          Object.keys(overrides).forEach(qId => {
            if (updatedAnswers[qId] !== overrides[qId]) {
              updatedAnswers[qId] = overrides[qId];
              changed = true;
            }
          });
          if (changed) {
            updateSessionState({ answers: updatedAnswers });
            toast('Sync Incident', 'Answer matrices overridden securely by school admin.', 'info');
          }
        }
      } catch (e) {}

      // Keep DB snapshot updated as fallback backup
      const currentSnapshot = captureSnapshot();
      if (currentSnapshot) {
        fetch('/api/security/snapshot', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` 
          },
          body: JSON.stringify({ snapshot: JSON.stringify(currentSnapshot), sessionId: sId })
        }).catch(() => {});
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [session, activeCourseId, captureSnapshot, navigate]);

  const logViolation = useCallback((violation: string) => {
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    
    // Find active course session details for the database log
    const activeSubj = sessionRef.current?.courses?.find(c => c && c.courseId === activeCourseIdRef.current);
    const activeSessId = activeSubj?.sessionId || null;
    
    const snap = captureSnapshot();

    fetch('/api/security/incident', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` 
      },
      body: JSON.stringify({ 
        violation: `${violation} (Multicourse Test)`, 
        sessionId: activeSessId,
        snapshot: snap 
      })
    }).catch(() => {});

    if (violationCountRef.current > 3) {
      toast('Integrity Lockdown', 'Cheating policy exceeded 3 allowed warnings. Automatically submitting assessment.', 'error');
      setTimeout(() => {
        if (submitRef.current) {
          submitRef.current();
        }
      }, 500);
    } else {
      toast('Security Alert', `Cheating warning ${violationCountRef.current} of 3. Please refrain from copying, screenshotting, or changing screens/tabs.`, 'error');
    }
  }, [captureSnapshot]);

  // Hardware webcam stream monitoring rules
  useEffect(() => {
    let isMounted = true;
    let monitorInterval: NodeJS.Timeout;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          stream.getTracks().forEach(track => {
            track.onended = () => logViolation(`Hardware disconnected: ${track.kind}`);
          });

          monitorInterval = setInterval(() => {
            if (streamRef.current && !streamRef.current.active) {
              logViolation('Proctoring stream suspended');
            }
            if (videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            }
          }, 3000);
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      })
      .catch(() => console.warn('Webcam/Mic hardware absent or blocked - running in compatibility mode'));

    return () => {
      isMounted = false;
      if (monitorInterval) clearInterval(monitorInterval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [logViolation]);

  // Comprehensive secure sandbox rules & listeners for multicourse exam
  useEffect(() => {
    if (loading || !session) return;

    const blockInteraction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleCopy = (e: ClipboardEvent) => { blockInteraction(e); logViolation('Text copying detected'); };
    const handlePaste = (e: ClipboardEvent) => { blockInteraction(e); logViolation('Clipboard injection paste'); };
    const handleCut = (e: ClipboardEvent) => { blockInteraction(e); logViolation('Text clipping cut action'); };
    const handleRightClick = (e: MouseEvent) => { blockInteraction(e); };
    
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
        logViolation('Tab switch, multitasking, or window minimization');
      } else {
        setIsBlurred(false);
      }
    };

    const handleBlur = () => {
      setIsBlurred(true);
    };

    const handleFocus = () => {
      setIsBlurred(false);
    };

    const handleTouchStart = () => {
      if (!document.hasFocus()) {
        setIsBlurred(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
         blockInteraction(e);
         logViolation('Screenshot trigger intercepted');
      }

      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'C' || e.key === 'c' || e.key === 'V' || e.key === 'v' || e.key === 'S' || e.key === 's')) ||
        e.key === 'Meta' || e.key === 'OS'
      ) {
        blockInteraction(e);
        logViolation(`Forbidden platform control utility key: ${e.key}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
         blockInteraction(e);
         logViolation('Screenshot release trigger');
      }
    };
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        logViolation('Exited forced exam viewport mode');
      } else {
        setIsFullscreen(true);
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleRightClick);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [loading, session, logViolation]);

  const formatClock = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hStr = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
    return `${hStr}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Safe Calculator Evaluation helper
  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
    } else if (val === '=') {
      try {
        const sanitized = calcInput
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/log\(/g, 'Math.log(10')
          .replace(/√\(/g, 'Math.sqrt(');
        
        if (/^[0-9+\-*/().\s|Math\.PI|Math\.sin|Math\.cos|Math\.tan|Math\.log|Math\.log10|Math\.sqrt]+$/.test(sanitized)) {
          const res = Function(`"use strict"; return (${sanitized})`)();
          const calculationString = `${calcInput} = ${Number(res).toFixed(4).replace(/\.?0+$/, '')}`;
          setCalcInput(String(res));
          setCalcHist(prev => [calculationString, ...prev.slice(0, 5)]);
        } else {
          setCalcInput('Syntax Error');
        }
      } catch {
        setCalcInput('Syntax Error');
      }
    } else if (val === 'sin' || val === 'cos' || val === 'tan' || val === 'ln' || val === 'log' || val === '√') {
      setCalcInput(prev => `${prev}${val}(`);
    } else {
      setCalcInput(prev => prev + val);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4 text-slate-800 dark:text-zinc-100">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Configuring Environment...</p>
      </div>
    );
  }

  const courses = session.courses || [];
  const activeSubObj = courses.find(c => c && c.courseId === activeCourseId);
  const questionsList = activeSubObj?.questions || [];
  const currentQuestion = questionsList[currentIdx];

  const calculateCompletions = () => {
    return courses.map(c => {
      const qs = c?.questions || [];
      const answers = session.answers || {};
      const count = qs.filter(q => q && answers[q.id]).length;
      return {
        title: c?.courseTitle || 'Subject',
        code: c?.courseCode || 'SUB',
        answered: count,
        total: qs.length
      };
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden text-slate-900 dark:text-zinc-100 bg-[#f8fafc] dark:bg-[#0c0c0e] select-none font-sans relative">
      
      {/* Beautiful, High-Polish Dynamic Picture-In-Picture Live Proctor feed - draggable and placed on bottom-left to not block calculator */}
      <motion.div 
        drag 
        dragMomentum={false} 
        className="fixed bottom-4 left-4 z-[90] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 flex flex-col gap-1.5 w-32 sm:w-36 transition-all hover:bg-white dark:hover:bg-zinc-950 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-100 dark:border-zinc-900 pointer-events-none">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute top-1 left-1.5 flex items-center gap-1 bg-black/60 px-1 py-0.5 rounded-full text-[8px] text-emerald-400 font-bold uppercase tracking-widest leading-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            LIVE
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-left px-1 pointer-events-none">
          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            <span>PROCTOR FEED</span>
            <span className="text-emerald-500">ACTIVE</span>
          </div>
          <p className="text-[7px] text-slate-400 font-bold tracking-tight">FACE DETECTION ON</p>
        </div>
      </motion.div>
      
      {/* Focus Violation Block Glass */}
      <AnimatePresence>
        {isBlurred && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6"
          >
             <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20 animate-bounce">
                <ShieldAlert size={36} />
             </div>
             <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-2">Attention Key Stolen</h2>
             <p className="text-zinc-400 text-xs font-mono max-w-sm mb-6 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                Platform control was compromised due to a window blur session transition. System rules require instant focus.
             </p>
             <button 
                onClick={() => setIsBlurred(false)}
                className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer border-0"
             >
                Return To Environment
             </button>
          </motion.div>
        )}

        {/* Forced Exam Viewport Lock */}
        {!isFullscreen && !isBlurred && !fullscreenBypassed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center text-center p-6"
          >
             <div className="w-16 h-16 bg-emerald-600/10 text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 animate-pulse">
                <Monitor size={36} />
             </div>
             <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-2">Forced Viewport Lock</h2>
             <p className="text-zinc-400 text-xs font-mono max-w-sm mb-6 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                Active syllabus evaluations are locked inside dynamic physical fullscreen to prevent unauthorized reference lookups.
             </p>
             <button 
                onClick={() => {
                  document.documentElement.requestFullscreen()
                    .then(() => {
                      setIsFullscreen(true);
                    })
                    .catch(() => {
                      toast('Fatal viewport setup', 'Fullscreen entry was rejected by client frame. Activating compatibility bypass...', 'error');
                      setFullscreenBypassed(true);
                    });
                }}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/15 border-0"
              >
                Initialize Secure Viewport
             </button>
             <button 
                onClick={() => {
                  toast('Compatibility Mode Active', 'Locked proctor rules running in sandboxed page.', 'info');
                  setFullscreenBypassed(true);
                }}
                className="mt-4 text-[10px] font-mono font-bold tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors uppercase cursor-pointer border-0 bg-transparent underline"
             >
                Proceed in Compatibility Mode (IFrame / Mobile)
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header ribbon containing CBT status clock and utilities matching mockup icons */}
      <header className="flex items-center justify-between px-3 py-1.5 sm:py-2 bg-white dark:bg-[#121215] border-b border-slate-200 dark:border-slate-800/80 shrink-0 z-30 shadow-sm gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Back button icon */}
          <button 
            onClick={() => setShowExitModal(true)}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a1a20] flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Exit Session Methods"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Bookmark utility */}
          <button 
            onClick={toggleBookmark}
            className={`w-8 h-8 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 ${
              currentQuestion && session.flags[currentQuestion.id]
                ? 'border-amber-400 bg-amber-50/40 text-amber-500 dark:border-amber-550/20 dark:bg-amber-950/20'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a1a20] text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Bookmark Item"
          >
            <Bookmark size={13} fill={currentQuestion && session.flags[currentQuestion.id] ? "currentColor" : "none"} />
          </button>

          {/* Explain / Chat Robot face */}
          <button 
            onClick={() => {
              if (currentQuestion?.explanation) {
                toast('AI Explanation Engine', 'Turn study mode on and click "SHOW" at the bottom to see master answers instantly!', 'success');
              } else {
                toast('CBT Companion Agent', 'Interactive mode advice will reveal correct choices upon request.', 'info');
              }
            }}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a1a20] flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Explain Model Advice"
          >
            <Bot size={13.5} />
          </button>

          {/* Report Alert indicate utility */}
          <button 
            onClick={() => {
              toast('Question Flagged', 'This item has been flagged for professional syllabus moderators review.', 'success');
            }}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a1a20] flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            title="Report Error"
          >
            <AlertCircle size={13.5} />
          </button>

          {/* Calculator Tool Toggle */}
          <button 
            onClick={() => setShowCalculator(!showCalculator)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm shrink-0 ${
              showCalculator 
                ? 'border-indigo-400 bg-indigo-50/50 text-indigo-500 dark:border-indigo-550/20 dark:bg-indigo-950/20' 
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#1a1a20] text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white'
            }`}
            title="Pocket Calculator"
          >
            <Calculator size={13.5} />
          </button>
        </div>

        {/* Right side status indicators (Timer, Submit button) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`h-8 px-2.5 rounded-full border flex items-center justify-center shadow-sm select-none transition-all ${
            timeLeft < 300 
              ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-600 dark:text-red-400 animate-pulse' 
              : 'bg-indigo-50/50 border-slate-200 dark:bg-[#1a1a20] dark:border-slate-850 text-indigo-650 dark:text-indigo-300'
          }`}>
            <span className="font-mono text-[10.5px] font-black tracking-tight flex items-center gap-1">
              <Timer size={11} className="shrink-0" />
              {formatClock(timeLeft)}
            </span>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="h-8 px-3 rounded-full bg-gradient-to-r from-emerald-600 to-indigo-600 hover:brightness-105 text-white text-[10px] font-black tracking-wide shadow-md active:scale-95 transition-all cursor-pointer border-0"
          >
            SUBMIT
          </button>
        </div>
      </header>

      {/* 2. CBT Course Tabs formatted like mockup (minimal line indicator) */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#0a0a0c] border-b border-slate-200 dark:border-slate-800/60 flex items-center shrink-0 z-10 overflow-x-auto gap-4 custom-scrollbar select-none">
        {courses.map(c => {
          if (!c) return null;
          const isActive = c.courseId === activeCourseId;
          const questions = c.questions || [];
          const answers = session.answers || {};
          const answeredCount = questions.filter(q => q && answers[q.id]).length;
          
          return (
            <button
              key={`tab_${c.courseId}`}
              onClick={() => handleSwitchSubject(c.courseId)}
              className={`pb-0.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-zinc-200 border-b-2 border-transparent'
              }`}
            >
              <span>{c.courseCode || (c.courseTitle ? c.courseTitle.split('—')[0] : '')}</span>
              <span className="ml-1 text-[9px] text-slate-450 dark:text-slate-550 font-normal">
                ({answeredCount}/{questions.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Container for active CBT */}
      <div className="flex-1 overflow-hidden flex flex-col relative w-full bg-[#fcfcfd] dark:bg-[#08080a]">
        
        {/* Scrollable Container covering Question, choices, and map */}
        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar flex flex-col">
          
          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-start space-y-3 pb-24">
            
            {/* Centered Question index indicator oval pill matching screenshot exactly */}
            <div className="flex items-center justify-center gap-2.5 w-full shrink-0 my-1">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className="w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#1a1a20] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-white disabled:opacity-25 active:scale-90 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex-1 max-w-[260px] h-8 rounded-full border border-slate-300 dark:border-slate-800 bg-[#e5e7eb]/10 dark:bg-[#15151a] flex items-center justify-center gap-2 px-4 shadow-sm">
                <span className="text-[10.5px] font-black tracking-widest text-slate-700 dark:text-zinc-300 uppercase font-mono">
                  Question {currentIdx + 1}/{questionsList.length}
                </span>
                <button
                  onClick={speakQuestion}
                  className={`w-6 h-6 rounded-full border transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                    isSpeaking 
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500 animate-pulse' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-450 hover:text-slate-700'
                  }`}
                  title="TTS voice"
                >
                  <Volume2 size={11} />
                </button>
              </div>

              <button
                disabled={currentIdx === questionsList.length - 1}
                onClick={() => setCurrentIdx(prev => prev + 1)}
                className="w-8 h-8 rounded-full bg-[#10b981] hover:bg-emerald-600 text-white flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all cursor-pointer shadow shrink-0"
              >
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>

            {/* Assessment Item Display block */}
            {currentQuestion ? (
              <div className="space-y-3 text-left w-full select-none">
                
                {/* Question Paragraph with zero massive cards bloating layout */}
                <div className="text-[13.5px] sm:text-[14px] font-semibold text-slate-800 dark:text-zinc-150 leading-relaxed whitespace-pre-wrap format-question-text">
                  <MathRenderer text={currentQuestion.question_text || (currentQuestion as any).text || 'Question missing content.'} />
                </div>

                {/* Question Diagram if any */}
                {currentQuestion.diagram_url && (
                  <div className="my-1.5 p-1 bg-slate-100 dark:bg-black/30 border border-slate-205 dark:border-slate-800 rounded-xl max-w-sm mx-auto flex items-center justify-center overflow-hidden">
                    <img 
                      src={currentQuestion.diagram_url} 
                      alt="Ref Diagram" 
                      className="max-h-[110px] max-w-full object-contain rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Choices stack - extremely compact, letters format exactly like screenshot */}
                <div className="space-y-1 pt-1">
                  {(['a', 'b', 'c', 'd'] as const).map((key) => {
                    const optVal = currentQuestion[`option_${key}` as keyof Question];
                    if (!optVal) return null;

                    const isSelected = (session.answers || {})[currentQuestion.id] === `option_${key}`;
                    const isCorrectOption = `option_${key}` === currentQuestion.correct_option || (optVal && String(optVal).includes('\u200E\u200F\u200E'));
                    const shouldShowCorrectCheck = session.testMode === 'study' && showCurrentSolution && isCorrectOption;

                    let btnClass = isSelected
                      ? 'bg-slate-100/50 dark:bg-[#1a1a22] border-indigo-350 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400'
                      : 'hover:bg-slate-50 dark:hover:bg-[#101014] border-slate-150 dark:border-slate-800 text-slate-700 dark:text-zinc-350 bg-white dark:bg-[#101013]';

                    if (shouldShowCorrectCheck) {
                      btnClass = 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400';
                    }

                    return (
                      <button
                        key={`opt_${key}`}
                        onClick={() => handleSelectOption(`option_${key}`)}
                        className={`w-full py-2 px-3 rounded-xl border text-left transition-all relative flex items-center justify-between gap-2.5 group select-none cursor-pointer outline-none ${btnClass}`}
                      >
                        <div className="flex items-center gap-3">
                          
                          {/* Letter status representation (A, B, C, D) inside matching the mockup */}
                          <div className="flex items-center gap-1 shrink-0 font-mono text-xs sm:text-[13px] font-black text-slate-550 dark:text-zinc-450 uppercase">
                            <span>{key.toUpperCase()}</span>
                            {shouldShowCorrectCheck && (
                              <span className="text-emerald-500 dark:text-emerald-400 font-bold ml-0.5">✔</span>
                            )}
                          </div>

                          {/* Matching circles selectors */}
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500'
                              : shouldShowCorrectCheck
                                ? 'border-emerald-500 bg-emerald-500 dark:border-emerald-500'
                                : 'border-slate-400 dark:border-zinc-700'
                          }`}>
                            {isSelected && (
                              <div className="w-1 h-1 rounded-full bg-white" />
                            )}
                            {shouldShowCorrectCheck && !isSelected && (
                              <div className="w-1 h-1 rounded-full bg-white" />
                            )}
                          </div>

                          <span className="text-[12.5px] sm:text-[13px] font-semibold leading-snug format-question-text">
                            <MathRenderer text={String(optVal)} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Study Mode: In-depth dynamic Explanation Box matches Image 2 layout */}
                {session.testMode === 'study' && showCurrentSolution && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-slate-100 dark:bg-[#121215] border border-slate-200 dark:border-slate-800/80 rounded-xl text-left mt-3 space-y-2 shadow-sm"
                  >
                    <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">
                      Explanation
                    </h3>
                    <div className="space-y-1 text-slate-650 dark:text-zinc-350">
                      <div className="text-[9.5px] font-mono leading-relaxed space-y-0.5 text-slate-400 uppercase">
                        <div>
                          Topic: <span className="text-slate-700 dark:text-slate-300 font-bold">{activeSubObj?.courseCode || 'GENERAL ADVISORY'} : {(activeSubObj?.courseTitle || '').split('—')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          Difficulty Level: <span className="text-[#f97316] font-bold">INTERMEDIATE</span>
                        </div>
                      </div>
                      <p className="text-[12px] leading-relaxed font-semibold whitespace-pre-wrap select-none pt-0.5 border-t border-slate-200/50 dark:border-slate-800/50 text-slate-600 dark:text-zinc-400">
                        <MathRenderer text={currentQuestion.explanation} />
                      </p>
                    </div>
                  </motion.div>
                )}

              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-1">
                <AlertCircle size={20} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Subject diagnostic set formulated empty.</p>
              </div>
            )}

            {/* Question matrix quick grid helper formatted compact */}
             {questionsList.length > 0 && (
              <div className="p-2 sm:p-3 bg-white dark:bg-[#121215] border border-slate-150 dark:border-slate-800 rounded-xl space-y-1.5 shadow-sm mt-3.5">
                <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                  <span className="flex items-center gap-1">
                    <BookOpen size={10} /> QUESTIONS PANEL (CLICK TO RETRIEVE)
                  </span>
                  <span>{questionsList.filter(q => q && (session.answers || {})[q.id]).length}/{questionsList.length} done</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {questionsList.map((q, idx) => {
                    if (!q) return null;
                    const answers = session.answers || {};
                    const flags = session.flags || {};
                    const isAns = !!answers[q.id];
                    const isFlag = !!flags[q.id];
                    const isActive = idx === currentIdx;

                    let btnClass = 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800';
                    if (isAns) {
                      btnClass = 'bg-indigo-650 border-indigo-600 text-white';
                    }
                    if (isFlag) {
                      btnClass = isAns 
                        ? 'bg-indigo-650 border-amber-400 dark:border-amber-500 text-white border'
                        : 'bg-amber-50 text-amber-600 border-amber-350 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60';
                    }
                    if (isActive) {
                      btnClass = 'ring-2 ring-emerald-500 border-emerald-500 font-extrabold text-[#111] dark:text-white bg-slate-100 dark:bg-slate-800';
                      if (isAns) btnClass = 'ring-2 ring-emerald-500 bg-indigo-600 text-white';
                    }

                    return (
                      <button
                        key={`jump_${q.id}`}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-6.5 h-6.5 rounded-lg border flex items-center justify-center font-mono text-[9.5px] font-bold transition-all cursor-pointer hover:brightness-105 active:scale-90 select-none ${btnClass}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Dynamic Pocket Calculator popup */}
        <AnimatePresence>
          {showCalculator && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="absolute right-4 bottom-4 w-[250px] bg-white dark:bg-[#15151a] border border-slate-200 dark:border-slate-850 shadow-2xl rounded-3xl p-3 z-50 flex flex-col select-none"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-[#4f46e5] dark:text-[#818cf8] flex items-center gap-1">
                  <Calculator size={10} /> SCIENTIFIC CALC
                </span>
                <button 
                  onClick={() => setShowCalculator(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Readout screen */}
              <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-2 px-2.5 text-right font-mono mb-2 space-y-0.5 overflow-hidden min-h-[48px] flex flex-col justify-end">
                {calcHist.length > 0 && (
                  <div className="text-[9px] text-slate-400 truncate select-none leading-none">
                    {calcHist[0]}
                  </div>
                )}
                <div className="text-xs font-black tracking-tight select-all truncate text-slate-800 dark:text-zinc-100">
                  {calcInput || '0'}
                </div>
              </div>

              {/* Pad buttons */}
              <div className="grid grid-cols-4 gap-1">
                {['sin', 'cos', 'tan', 'C', '√', 'ln', 'log', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '(', ')', '=']
                  .map((key) => {
                    const isCol = key === '=';
                    const isFunc = ['sin', 'cos', 'tan', 'C', '√', 'ln', 'log', '÷', '×', '-', '+', '(', ')'].includes(key);
                    
                    let cls = 'h-7 rounded-md font-mono text-[10px] font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center border ';
                    if (isCol) {
                      cls += 'col-span-2 bg-emerald-650 border-emerald-600 hover:bg-emerald-600 text-white';
                    } else if (isFunc) {
                      cls += key === 'C'
                        ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:border-red-900/40 text-xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-205 dark:border-slate-800/80';
                    } else {
                      cls += 'bg-slate-50/50 dark:bg-black/10 text-slate-800 dark:text-zinc-200 border-slate-150 dark:border-slate-850';
                    }

                    return (
                      <button
                        key={`calc_${key}`}
                        onClick={() => handleCalcPress(key)}
                        className={cls}
                      >
                        {key}
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 4. Sticky Bottom Action Controls for Study Mode matches Image 1 and 2 exactly */}
      {session.testMode === 'study' && (
        <footer className="shrink-0 bg-white dark:bg-[#121215] border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 flex items-center justify-between shadow-lg z-30 select-none">
          {/* Answered progress pill matching screenshot */}
          <button
            onClick={() => {
              toast('Navigation Guide', 'Tap the green arrow to advance, or jump instantly using the grid mapper.', 'info');
            }}
            className="h-10 px-4.5 rounded-full bg-[#e5e7eb]/10 dark:bg-[#121215] border border-slate-250 dark:border-slate-800 flex items-center gap-1.5 font-mono text-xs font-black text-slate-500 dark:text-zinc-400 hover:bg-slate-50 cursor-pointer shadow-sm active:scale-95 transition-all outline-none"
          >
            <span className="text-[10px] text-zinc-400">▲</span>
            <span>{questionsList.filter(q => q && (session.answers || {})[q.id]).length}/{questionsList.length}</span>
          </button>

          {/* Solution button toggle with Orange Pill theme matching mockup completely */}
          <button
            onClick={() => setShowCurrentSolution(!showCurrentSolution)}
            className="px-8.5 py-2.5 rounded-full bg-[#f97316] hover:bg-orange-700 text-white text-xs font-black tracking-wider shadow-md hover:shadow-orange-500/10 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border-0"
          >
            {showCurrentSolution ? (
              <>
                <span className="text-sm">👁️</span>
                <span>Hide</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full bg-white text-orange-600 flex items-center justify-center font-black text-[10px] shadow-sm">✓</div>
                <span>Show</span>
              </>
            )}
          </button>
        </footer>
      )}

      {/* CBT Submissions Confirmation dialog */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => {
                if (!isSubmitting) setShowSubmitModal(false);
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-2xl select-none text-center"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-[#4f46e5]/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3.5 border border-indigo-150/10">
                <CheckCircle2 size={20} />
              </div>

              <h3 className="text-base font-black uppercase tracking-tight text-slate-850 dark:text-white leading-tight">
                Submit Practice Assessment?
              </h3>
              <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 font-medium select-none mb-4 max-w-xs mx-auto">
                Once submitted, standard performance analytics matrices will evaluate your scoring outcomes instantly.
              </p>

              {/* Completions lists */}
              <div className="space-y-2 text-left bg-slate-50 dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800 shadow-inner p-3 rounded-2xl max-h-[140px] overflow-y-auto custom-scrollbar mb-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-200 dark:border-slate-800 mb-1.5">
                  Completion Analytics
                </span>
                {calculateCompletions().map((item, idx) => (
                  <div key={`compl_${idx}`} className="flex items-center justify-between text-xs py-0.5 font-semibold">
                    <span className="text-slate-700 dark:text-zinc-350">{item.code} {item.title ? item.title.split('—')[0] : ''}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.answered === item.total 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {item.answered}/{item.total} Done
                    </span>
                  </div>
                ))}
              </div>

              {/* Action panels buttons */}
              <div className="flex gap-2">
                <button
                  disabled={isSubmitting}
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 border border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-350 text-xs font-bold uppercase rounded-xl cursor-pointer select-none disabled:opacity-20 transition-all"
                >
                  Return
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={handleManuallySubmit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:brightness-105 text-white text-xs font-extrabold uppercase rounded-xl cursor-pointer select-none disabled:opacity-20 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Grading...</span>
                    </>
                  ) : (
                    <>
                      <Check size={12} strokeWidth={3} />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit & End Test Options Modal */}
      <AnimatePresence>
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowExitModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121215] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl select-none text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <AlertCircle size={24} />
              </div>

              <h3 className="text-base font-black uppercase tracking-tight text-slate-850 dark:text-white leading-tight mb-2">
                Exit Practice Session?
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium select-none mb-6 max-w-xs mx-auto leading-relaxed">
                Choose how you would like to terminate or pause this multi-course assessment:
              </p>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setShowExitModal(false);
                    setShowSubmitModal(true);
                  }}
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Award size={14} />
                  <span>End & Grade Test Early</span>
                </button>

                <button
                  onClick={() => {
                    fetch('/api/telemetry/log', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}`
                      },
                      body: JSON.stringify({
                        event: "Paused Multicourse Test",
                        details: "Student manually paused a test to resume later"
                      })
                    }).catch(e => console.error(e));
                    toast('Syllabus Paused', 'Your current answers have been successfully locked in locally.', 'info');
                    navigate('/practice');
                  }}
                  className="w-full h-11 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-zinc-300 text-xs font-bold uppercase rounded-xl cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <ChevronRight size={14} className="rotate-90 text-slate-400" />
                  <span>Pause & Exit Temporarily</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("WARNING: This will completely void this practice attempt. No score will be saved in your academic grades file. Proceed?")) {
                      localStorage.removeItem('FCF_MulticourseSession');
                      fetch('/api/telemetry/log', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}`
                        },
                        body: JSON.stringify({
                          event: "Aborted Multicourse Test",
                          details: "Student manually aborted a multicourse test and discarded progress"
                        })
                      }).catch(e => console.error(e));
                      toast('Syllabus Aborted', 'Practice session discarded successfully.', 'info');
                      navigate('/practice');
                    }
                  }}
                  className="w-full h-10 border border-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-xl cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-1"
                >
                  <X size={12} />
                  <span>Abort Test (Discard Progress)</span>
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-900">
                  <button
                    onClick={() => setShowExitModal(false)}
                    className="w-full h-9 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 text-xs font-black uppercase tracking-wider cursor-pointer active:scale-98 transition-all"
                  >
                    Resume Test
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
