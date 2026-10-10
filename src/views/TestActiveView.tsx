import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';
import Calculator from '../components/Calculator';
import { MathRenderer } from '../components/MathRenderer';
import { 
  ChevronLeft, ChevronRight, Timer, Bookmark, AlertCircle, 
  Volume2, VolumeX, Check, ChevronUp, Monitor, X, Play, ShieldAlert, BookOpen, Award
} from 'lucide-react';

export default function TestActiveView() {
  const { student, selectedCourse, selectedTopics, setTestResult, setTestSession, testSession, token, theme } = useAppContext();
  const [questions, setQuestions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [shuffledKeys, setShuffledKeys] = useState<Record<number, string[]>>({});
  const [enlargedDiagram, setEnlargedDiagram] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenBypassed, setFullscreenBypassed] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showQuestionsGrid, setShowQuestionsGrid] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  
  const violationCountRef = React.useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const sessionIdRef = useRef<string | null>(null);

  const [currentQuestionTimeLeft, setCurrentQuestionTimeLeft] = useState<number | null>(null);
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<any[]>([]);
  const selectedAnswersRef = useRef<Record<number, string>>({});
  const submitRef = useRef<(() => Promise<void> | void) | undefined>(undefined);

  // Sync references
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  // Establish real-time communications
  useEffect(() => {
    if (!sessionId) return;
    try {
      const socket = io();
      socketRef.current = socket;
      
      socket.on('connect', () => {
        socket.emit('proctor-join', { sessionId });
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Socket.io connectivity disabled or blocked:", err);
    }
  }, [sessionId]);

  // Captures current camera snapshot + proctoring state parameters (fully ref-backed for interval stability)
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
    
    return {
      webcam,
      currentIdx: currentIdxRef.current,
      answeredCount: Object.keys(selectedAnswersRef.current).length,
      answers: selectedAnswersRef.current
    };
  }, []);

  // Fluid 750ms visual monitoring interval for high-frequency admin feedback
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      const snap = captureSnapshot();
      if (snap && snap.webcam) {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('proctor-snapshot', {
            sessionId,
            snapshot: snap
          });
        }
      }
    }, 750);

    return () => clearInterval(interval);
  }, [sessionId, captureSnapshot]);

  // Logs a proctor violation to server in real-time
  const logViolation = useCallback((violation: string) => {
    const currentQuestionDetail = questionsRef.current && questionsRef.current[currentIdxRef.current];
    const questionText = currentQuestionDetail 
      ? (currentQuestionDetail.question_text || currentQuestionDetail.text || '') 
      : 'Unknown';
    const indexStr = currentIdxRef.current !== undefined ? `Question ${currentIdxRef.current + 1}` : 'Unknown';
    
    const enrichedViolation = `${violation} (Flagged on ${indexStr}: "${questionText.substring(0, 50)}")`;

    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    
    const snapshot = captureSnapshot();
    
    fetch('/api/security/incident', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` 
      },
      body: JSON.stringify({ 
        violation: enrichedViolation, 
        snapshot, 
        sessionId: sessionIdRef.current 
      })
    });

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

  // Setup webcam stream for AI-less background compliance logs
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
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [logViolation]);

  // Handle SpeechSynthesis reading
  const speakQuestion = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const q = questions[currentIdx];
        if (!q) return;
        const stemText = q.question_text || '';
        const passageText = q.passage_ref || '';
        const speechStr = `${passageText ? passageText + '. ' : ''}${stemText}. Option A: ${q.option_a || ''}. Option B: ${q.option_b || ''}. Option C: ${q.option_c || ''}. Option D: ${q.option_d || ''}`;
        
        const utterance = new SpeechSynthesisUtterance(speechStr);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      toast('Not Supported', 'Speech synthesizer is absent on this browser environment.', 'error');
    }
  };

  // Terminate speech on question changes
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentIdx]);

  // Comprehensive secure sandbox rules & listeners
  useEffect(() => {
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
      // Remonitored: Visual blur warning is shown, but logViolation is disabled to prevent accidental auto-submissions in iframe preview/desktop multi-view environments.
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
  }, [logViolation]);

  // Load and formulate test matrices from test session context
  useEffect(() => {
    if (isSubmitting) return;
    if (!selectedCourse || !testSession) {
      toast('Session Lost', 'No target course test record found. Please launch from catalog.', 'error');
      navigate('/dashboard');
      return;
    }

    let maxSeconds = testSession.expectedDuration;
    
    if (selectedCourse?.end_date) {
        const courseEndTime = new Date(selectedCourse.end_date).getTime();
        const now = Date.now();
        const secondsUntilEnd = Math.max(0, Math.floor((courseEndTime - now) / 1000));
        maxSeconds = Math.min(maxSeconds, secondsUntilEnd);
    }
    
    setEndTime(Date.now() + maxSeconds * 1000);
    setTimeLeft(maxSeconds);

    if (!testSession.questions || testSession.questions.length === 0) {
      toast('Structure Blocked', 'Questions count for this syllabus target is empty.', 'error');
      navigate('/dashboard');
      return;
    }

    setQuestions(testSession.questions);
    setSessionId(testSession.sessionId);
    
    const shuffled: Record<number, string[]> = {};
    testSession.questions.forEach((q: any, i: number) => {
      shuffled[i] = ['option_a', 'option_b', 'option_c', 'option_d'];
    });
    setShuffledKeys(shuffled);
    setLoading(false);
  }, [selectedCourse, testSession, navigate, isSubmitting]);

  // Real-time record synchronizer & submit logic
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const formattedAnswers = questions.reduce((acc: any, q, i) => {
      acc[q.id] = selectedAnswers[i] || null;
      return acc;
    }, {});

    try {
      const res = await fetch('/api/simulation/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` 
        },
        body: JSON.stringify({ 
          sessionId,
          answers: formattedAnswers, 
          courseId: selectedCourse.id,
          totalQuestions: questions.length,
          timeSpent: (questions.length * 30) - timeLeft
        })
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || 'Unknown error');
      setTestResult(result);
      setTestSession(null);
      
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      navigate('/results');
    } catch (e) {
      toast('Sync Failure', 'Answer synchronization interrupted. Retrying...', 'error');
      setIsSubmitting(false);
    }
  }, [questions, selectedAnswers, selectedCourse, navigate, setTestResult, sessionId, timeLeft, isSubmitting, setTestSession]);

  // Sync submit function to its ref
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Strict question timer advancement callback ref
  const advanceQuestionOnTimeoutRef = useRef<() => void>(undefined);
  useEffect(() => {
    advanceQuestionOnTimeoutRef.current = () => {
      if (currentIdxRef.current < questionsRef.current.length - 1) {
        toast('Time Elapsed', 'Strict timer elapsed for this question. Moving forward.', 'info');
        setCurrentIdx(prev => prev + 1);
      } else {
        toast('Time Elapsed', 'Strict timer elapsed for the final question. Submitting exam.', 'info');
        if (submitRef.current) {
          submitRef.current();
        }
      }
    };
  });

  // Strict question timer countdown runner
  useEffect(() => {
    const limit = testSession?.questionTimerLimit;
    if (!limit || limit <= 0 || loading) {
      setCurrentQuestionTimeLeft(null);
      return;
    }
    
    setCurrentQuestionTimeLeft(limit);
    
    let timeLeftLocal = limit;
    
    const qInterval = setInterval(() => {
      timeLeftLocal -= 1;
      setCurrentQuestionTimeLeft(timeLeftLocal);
      
      if (timeLeftLocal <= 0) {
        clearInterval(qInterval);
        if (advanceQuestionOnTimeoutRef.current) {
          advanceQuestionOnTimeoutRef.current();
        }
      }
    }, 1000);
    
    return () => clearInterval(qInterval);
  }, [currentIdx, testSession?.questionTimerLimit, loading]);

  // Timed tick ticker
  useEffect(() => {
    if (loading) return;
    if (timeLeft <= 0 || violationCount > 3) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
       if (endTime) {
         const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
         setTimeLeft(remaining);
       }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, violationCount, handleSubmit, endTime]);

  // Polling for administrative remote proctor instructions & safety override logs
  const lastWarningTimeRef = useRef<number | null>(null);
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    if (sessionId) {
      syncInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/simulation/session-status/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` }
          });
          const data = await res.json();
          if (data.status === 'terminated_by_admin') {
            toast('Session Canceled', 'Your exam session was terminated remotely by the instructor.', 'error');
            navigate('/dashboard');
            return;
          }
          if (data.warningMessage && data.warningTime !== lastWarningTimeRef.current) {
            lastWarningTimeRef.current = data.warningTime;
            toast('Proctor Direct Override', data.warningMessage, 'error');
          }
          if (data.answerOverrides) {
             const overrides = data.answerOverrides;
             let changed = false;
             Object.keys(overrides).forEach(qIdStr => {
               const qId = parseInt(qIdStr);
               const qIdx = questions.findIndex(q => q.id === qId);
               if (qIdx !== -1 && selectedAnswers[qIdx] !== overrides[qIdStr]) {
                  setSelectedAnswers(prev => ({ ...prev, [qIdx]: overrides[qIdStr] }));
                  changed = true;
               }
             });
             if (changed) {
               toast('Sync Incident', 'Answer matrices overridden securely by school admin.', 'info');
             }
          }
        } catch (e) {}

        const currentSnapshot = captureSnapshot();
        if (currentSnapshot) {
          fetch('/api/security/snapshot', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` 
            },
            body: JSON.stringify({ snapshot: JSON.stringify(currentSnapshot), sessionId })
          }).catch(() => {});
        }
      }, 5000);
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [sessionId, captureSnapshot, navigate, questions, selectedAnswers]);

  // Formats remaining time gracefully
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / (60 * 60));
    const m = Math.floor((seconds % (60 * 60)) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: option }));
  };

  const toggleFlag = () => {
    const next = new Set(flags);
    if (next.has(currentIdx)) {
      next.delete(currentIdx);
    } else {
      next.add(currentIdx);
    }
    setFlags(next);
  };

  const forceExit = () => {
    fetch('/api/telemetry/log', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        event: "Aborted Official Test",
        details: "Student aborted the exam midway and discarded the attempt",
        studentId: student?.id,
        courseId: selectedCourse?.id
      })
    }).catch(e => {});
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setTestSession(null);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-8 space-y-4">
        <Monitor className="text-emerald-500 animate-pulse" size={44} />
         <p className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Synchronizing Secure Session Assets...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden text-slate-900 dark:text-zinc-100 bg-slate-50 dark:bg-[#121212] select-none font-sans relative">
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
             <p className="text-zinc-400 text-xs font-mono max-w-sm mb-6 leading-relaxed">
                Platform control was compromised due to a window blur session transition. System rules require instant focus.
             </p>
             <button 
                onClick={() => setIsBlurred(false)}
                className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer"
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
             <p className="text-zinc-400 text-xs font-mono max-w-sm mb-6 leading-relaxed">
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
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-full transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/15"
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

      {/* 1. Header of Circular Buttons (Perfect layout replication, AI assistant icon excluded) */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 z-30">
        <div className="flex items-center gap-2">
          {/* Circular exit confirmation */}
          <button 
            id="back_confirm_btn"
            onClick={() => setShowExitConfirm(true)}
            className="w-11 h-11 rounded-full border border-slate-200 bg-white dark:border-zinc-800 dark:bg-[#161616]/60 flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:text-white dark:hover:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Terminate Exam Session"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Ribbon/Flag Bookmark Button */}
          <button 
            id="flag_current_btn"
            onClick={toggleFlag}
            className={`w-11 h-11 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm ${
              flags.has(currentIdx)
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 dark:text-amber-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#161616]/60 dark:text-zinc-300 dark:hover:text-white dark:hover:border-zinc-700'
            }`}
            title="Bookmark this Question"
          >
            <Bookmark size={18} fill={flags.has(currentIdx) ? "currentColor" : "none"} />
          </button>

          {/* Exclamation Status Icon Button */}
          <button 
            id="instructions_modal_btn"
            onClick={() => setShowInstructionsModal(true)}
            className="w-11 h-11 rounded-full border border-slate-200 bg-white dark:border-zinc-800 dark:bg-[#161616]/60 flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:text-white dark:hover:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Syllabus Directives & Guidelines"
          >
            <AlertCircle size={18} />
          </button>

          {/* Calculator Grid Toggle Button */}
          <button 
            id="calc_toggle_btn"
            onClick={() => setShowCalculator(!showCalculator)}
            className={`w-11 h-11 rounded-full border flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm ${
              showCalculator 
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#161616]/60 dark:text-zinc-300 dark:hover:text-white dark:hover:border-zinc-700'
            }`}
            title="Scientific Calculator Console"
          >
            <span className="font-bold text-xs uppercase tracking-tight">+/-</span>
          </button>
        </div>

        {/* Dynamic Timer Pill (Gradient color schema replication) */}
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          {currentQuestionTimeLeft !== null && testSession?.questionTimerLimit && (
            <div className="h-10 px-3 rounded-full bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/25 flex items-center justify-center select-none hover:brightness-110 active:scale-95 transition-all text-amber-600 dark:text-amber-400 font-mono text-xs font-black tracking-widest gap-1" title="Strict Question level countdown">
              <Timer size={13} className="animate-spin text-amber-500 shrink-0" />
              <span>Q: {currentQuestionTimeLeft}s</span>
            </div>
          )}
          <div className="h-10 px-4 rounded-full bg-gradient-to-r from-[#9c3202] to-[#b34200] border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-[#b34200]/15 select-none hover:brightness-110 active:scale-95 transition-all">
            <span className="font-mono text-xs font-black text-white tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Active Single Academic Course Category bar */}
      <div className="px-5 py-2 border-b border-slate-200 dark:border-zinc-900/60 flex items-center shrink-0 z-10 overflow-x-auto gap-4 custom-scrollbar">
        <span className="text-emerald-600 dark:text-emerald-500 text-sm font-black uppercase tracking-widest border-b-2 border-emerald-500 pb-1 shrink-0">
          {selectedCourse?.code || selectedCourse?.title?.split('—')[0] || "Subject syllabus"}
        </span>
      </div>

      {/* Main Container Core Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3 space-y-4 flex flex-col justify-start max-w-xl mx-auto w-full pb-24">
        
        {/* 3. Question Index Slider selector pill block */}
        <div className="flex items-center justify-between bg-slate-100/50 dark:bg-zinc-900/10 py-1 shrink-0 w-full gap-3">
          {/* Prev slide control */}
          <button
            id="prev_quest_btn"
            disabled={currentIdx === 0 || !!(testSession?.questionTimerLimit && testSession.questionTimerLimit > 0)}
            onClick={() => {
              if (testSession?.questionTimerLimit && testSession.questionTimerLimit > 0) {
                toast('Navigation Locked', 'Backward navigation is disabled under strict question timers.', 'info');
                return;
              }
              setCurrentIdx(prev => prev - 1);
            }}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-[#161616]/40 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white disabled:opacity-20 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Question Index volume pill */}
          <div className="flex-1 h-11 rounded-full border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#1c1c1c]/90 px-4 flex items-center justify-center gap-3 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700/60 transition-all max-w-xs">
            <span className="text-xs font-black tracking-widest text-slate-700 dark:text-[#e4e4e7] uppercase font-mono">
              Question {currentIdx + 1}/{questions.length}
            </span>
            <button
               id="speech_synth_trigger"
               onClick={speakQuestion}
               className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-90 cursor-pointer ${isSpeaking ? 'text-emerald-500 dark:text-emerald-400 animate-pulse' : 'text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
               title="Speak Question Text"
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          {/* Green active circular navigate button */}
          <button
            id="next_quest_btn"
            disabled={currentIdx === questions.length - 1}
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold flex items-center justify-center transition-all cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-30 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
             <ChevronRight size={22} className="stroke-[2.5]" />
          </button>
        </div>



        {/* 4. Question Stems Panel Area */}
        <div className="space-y-3 py-1 shrink-0">
          {/* Supportive Passage Text Reference, if present in data package */}
          {currentQuestion.passage_ref && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/40 text-[13px] font-medium text-slate-600 dark:text-zinc-400 leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar">
              {currentQuestion.passage_ref}
            </div>
          )}

          {/* Diagram render layout */}
          {currentQuestion.diagram_url && (
            <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-black/40 p-1 shrink-0 relative group">
              <img 
                src={currentQuestion.diagram_url} 
                alt="Diagram Exhibit Content" 
                className="w-full max-h-[120px] md:max-h-[160px] object-contain mx-auto rounded-xl cursor-pointer hover:brightness-105 dark:hover:brightness-115 transition-all"
                onClick={() => setEnlargedDiagram(currentQuestion.diagram_url)}
              />
              <span className="absolute bottom-2 right-2 text-[8px] bg-black/70 text-zinc-400 px-2 py-0.5 rounded uppercase font-black tracking-widest pointer-events-none">
                 Click to zoom
              </span>
            </div>
          )}

          {/* Main bold readable question prompt stem */}
          <div className="space-y-1">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-zinc-100 leading-normal font-sans pr-1">
              <MathRenderer text={currentQuestion.question_text || ""} />
            </h1>
          </div>
        </div>

        {/* 5. A, B, C, D Multiple Choice interactive elements with reduced spacing */}
        <div className="space-y-2 shrink-0">
          {shuffledKeys[currentIdx]?.map((optKey, index) => {
            const displayLetter = ['A', 'B', 'C', 'D'][index];
            const isSelected = selectedAnswers[currentIdx] === optKey;
            
            return (
              <button
                key={optKey}
                onClick={() => handleSelectAnswer(optKey)}
                className={`w-full p-3 md:p-3.5 rounded-xl text-left flex items-start gap-4 transition-all border outline-none cursor-pointer group ${
                  isSelected 
                    ? 'bg-blue-50/50 border-blue-400 text-blue-900 dark:bg-[#181d24]/60 dark:border-blue-500/50 dark:shadow-blue-500/5 shadow-blue-500/5' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 dark:bg-[#161616]/60 dark:border-zinc-900 dark:hover:border-zinc-800 dark:hover:bg-[#1a1a1a]/80 text-slate-700 dark:text-zinc-300'
                }`}
              >
                {/* Prefix Letter Block Label */}
                <span className={`text-[15px] font-black shrink-0 w-4 font-mono transition-colors ${
                  isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300'
                }`}>
                  {displayLetter}
                </span>

                {/* Aesthetic interactive radio circle tracker */}
                <div className="mt-0.5 shrink-0">
                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-500/10' 
                      : 'border-slate-300 dark:border-zinc-700/60 group-hover:border-slate-400 dark:group-hover:border-zinc-500'
                  }`}>
                    {isSelected && (
                      <div className="w-[8px] h-[8px] rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </div>
                </div>

                {/* Option descriptive text label */}
                <div className={`text-[13px] md:text-sm font-normal leading-relaxed break-words flex-1 transition-colors ${
                  isSelected ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-700 dark:text-zinc-300'
                }`}>
                  <MathRenderer text={currentQuestion[optKey] || ""} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Footer Sticky Navigation bar (Extremely mobile-first and compact) */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#161616]/95 backdrop-blur border-t border-slate-200 dark:border-zinc-900/60 p-3 z-35 shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between w-full h-11 px-2">
          
          {/* Progress pill - clicking opens beautiful navigation overlay index */}
          <button
            id="grid_pills_trigger"
            onClick={() => setShowQuestionsGrid(true)}
            className="flex items-center gap-2 h-11 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#111] dark:hover:bg-zinc-900/80 text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white rounded-full border border-slate-200 dark:border-zinc-800/85 text-xs font-black tracking-wider uppercase transition-all select-none cursor-pointer"
            title="Question Directory Map"
          >
            <ChevronUp size={15} className="text-slate-500 dark:text-zinc-500 group-hover:text-slate-800 dark:group-hover:text-zinc-300 animate-pulse shrink-0" />
            <span>
              {currentIdx + 1}/{questions.length}
            </span>
          </button>

          {/* Submission call to action rounded pill */}
          <button 
            id="active_test_submit_btn"
            onClick={() => setShowSubmitConfirm(true)}
            className="h-11 px-6 bg-gradient-to-r from-[#f95700] to-[#ff6a1a] hover:brightness-110 active:scale-95 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-md shadow-[#f95700]/15 flex items-center gap-2 transition-all select-none cursor-pointer"
          >
            <Check size={14} className="stroke-[3]" />
            <span>Submit</span>
          </button>
        </div>
      </footer>

      {/* Slideup Question Navigation Overlay Matrix */}
      <AnimatePresence>
        {showQuestionsGrid && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowQuestionsGrid(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white dark:bg-[#161616] border-t border-slate-250 dark:border-zinc-800 w-full max-w-xl rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-zinc-900">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Exam Blueprint Navigate</h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5">Jump directly to any modular question slide.</p>
                </div>
                <button 
                  onClick={() => setShowQuestionsGrid(false)}
                  className="p-1 px-3 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full text-[9px] uppercase tracking-wider text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 overflow-y-auto max-h-[50vh] pr-1 py-1 custom-scrollbar">
                {questions.map((_, idx) => {
                  const isAnswered = selectedAnswers[idx] !== undefined;
                  const isFlagged = flags.has(idx);
                  const isCurrent = currentIdx === idx;
                  
                  // Color codes
                  let bgClass = "bg-slate-50 border-slate-205 text-slate-400 hover:border-slate-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-500";
                  if (isAnswered) bgClass = "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60";
                  if (isFlagged) bgClass = "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-950/60";
                  if (isCurrent) bgClass = "bg-slate-900 text-white border-slate-950 ring-2 ring-blue-500/60 dark:bg-zinc-100 dark:text-black dark:border-white";

                  return (
                    <button
                      key={`grid_q_${idx}`}
                      onClick={() => {
                        if (testSession?.questionTimerLimit && testSession.questionTimerLimit > 0) {
                          if (idx < currentIdx) {
                            toast('Navigation Locked', 'Backward navigation is disabled under strict question timers.', 'error');
                            return;
                          }
                        }
                        setCurrentIdx(idx);
                        setShowQuestionsGrid(false);
                      }}
                      className={`h-10 rounded-xl border font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-90 ${bgClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status indices indicators */}
              <div className="mt-5 flex justify-center items-center gap-4 text-[9px] uppercase tracking-wider font-semibold text-slate-500 dark:text-zinc-500 shrink-0">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-900 dark:bg-zinc-100 inline-block" /> Active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-50 dark:bg-emerald-950 border border-emerald-305 dark:border-emerald-500/40 inline-block" /> Answered</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-50 dark:bg-amber-950 border border-amber-305 dark:border-amber-500/40 inline-block" /> Bookmarked</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-805 inline-block" /> Idle</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Syllabus / Instructions Guidelines Modal Dropdown */}
      <AnimatePresence>
        {showInstructionsModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-zinc-900">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Assigned Guidelines</h3>
                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">Academic assessment standards.</p>
                </div>
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-400 font-normal leading-relaxed list-disc list-inside">
                <li>Total Questions assigned is <span className="font-bold text-[#111] dark:text-white">{questions.length}</span> slides.</li>
                <li>Each candidate faces proctoring compliance. Exit constraints apply.</li>
                <li>Use the floating calculator for scientific operations if permitted.</li>
                <li>Click the speaker button inside the question bar to read audio stems.</li>
                <li>Tap on flagged bookmarked items to defer answering during active runs.</li>
              </ul>

              <button 
                onClick={() => setShowInstructionsModal(false)}
                className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
              >
                Acknowledge & Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enlarged Diagram Modal Overlay */}
      <AnimatePresence>
        {enlargedDiagram && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0d0d]/95 p-4"
             onClick={() => setEnlargedDiagram(null)}
           >
             <button 
                onClick={() => setEnlargedDiagram(null)}
                className="absolute top-6 right-6 p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all flex items-center gap-1 cursor-pointer"
             >
                <X size={18} />
             </button>
             <img src={enlargedDiagram} alt="Zoomed Diagram" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
           </motion.div>
        )}
      </AnimatePresence>

      {/* Scientifically calibrated desktop-docked calculator console element */}
      <Calculator open={showCalculator} onToggle={setShowCalculator} />

      {/* Confirmation drawer dialogue metrics: Submit Confirmation modal */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-xl"
            >
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/25">
                <Check size={24} className="stroke-[3]" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Finalize Assessment?</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono mb-6 leading-relaxed">
                You have marked {Object.keys(selectedAnswers).length} out of {questions.length} responses. System record will immediately commit.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowSubmitConfirm(false)}
                  className="h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white cursor-pointer active:scale-95 transition-all"
                >
                  Return
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white dark:text-black text-xs font-black uppercase tracking-wider hover:brightness-110 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isSubmitting ? 'Syncing...' : 'Submit Now'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation dialogue: Termination Exit Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-white dark:bg-[#151515] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center shadow-xl"
            >
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 dark:text-amber-450 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/25">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Exit Active Exam?</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-6 leading-relaxed">
                Choose how you would like to end or terminate this active syllabus evaluation:
              </p>
              
              <div className="space-y-2.5">
                <button 
                  onClick={() => {
                    setShowExitConfirm(false);
                    setShowSubmitConfirm(true);
                  }}
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-indigo-600 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Award size={14} />
                  <span>End & Grade Test early</span>
                </button>

                <button 
                  onClick={forceExit}
                  className="w-full h-11 border border-slate-200 hover:bg-rose-50 text-xs font-bold uppercase text-rose-650 dark:border-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <X size={12} />
                  <span>Abort Exam (Discard Attempt)</span>
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-900">
                  <button 
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full h-9 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-slate-400 text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                  >
                    Resume Exam
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
