import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function TestCountdownView() {
  const { selectedCourse, selectedTopics, setTestSession, token } = useAppContext();
  const [count, setCount] = useState<number | string>(3);
  const [isReady, setIsReady] = useState(false);
  const [isMulticourse, setIsMulticourse] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const qCount = parseInt(localStorage.getItem('FCF_QCount') || '20', 10);
    
    let deviceId = localStorage.getItem('FCF_DeviceID');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('FCF_DeviceID', deviceId);
    }
    
    console.log('[DEBUG] Start Test - Token:', token);
    fetch('/api/simulation/start', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        topics: selectedTopics,
        limit: qCount,
        courseId: selectedCourse?.id,
        deviceId
      })
    })
    .then(async (res) => {
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('[DEBUG] Failed to parse JSON:', text);
        throw new Error('Server returned invalid response');
      }
    })
    .then(data => {
      if (data.error) throw new Error(data.error);
      if (data.isMulticourse) {
        // Multi-course CBT Exam deployed by Admin!
        const coursesList = data.courses || [];
        const multiSession = {
          startTime: Date.now(),
          expectedDuration: data.expectedDuration,
          courses: coursesList, // array of { courseId, courseTitle, courseCode, sessionId, questions }
          answers: {},
          flags: {},
          currentTabCourseId: (coursesList && coursesList[0]) ? coursesList[0].courseId : '',
          currentIdxByCourse: {},
          shuffleQuestions: false,
          shuffleOptions: false,
          testMode: 'mock' // treat admin deployed exams as official mock proctored sessions
        };
        localStorage.setItem('FCF_MulticourseSession', JSON.stringify(multiSession));
        setIsMulticourse(true);
      } else {
        setTestSession({
          sessionId: data.sessionId,
          courseId: selectedCourse?.id || "",
          expectedDuration: data.expectedDuration,
          questions: data.questions,
          questionTimerLimit: data.questionTimerLimit || 0,
          startTime: Date.now(),
          answers: {}
        });
      }
      setIsReady(true);
    })
    .catch(err => {
      toast('Cannot Start Test', err.message, 'error');
      navigate('/dashboard');
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    
    if (count === 'BEGIN') {
      const timer = setTimeout(() => {
        if (isMulticourse) {
          navigate('/practice-session');
        } else {
          navigate('/examination');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCount(c => {
        if (c === 3) return 2;
        if (c === 2) return 1;
        if (c === 1) return 'BEGIN';
        return c;
      });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isReady, count, navigate]);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Formal Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-full h-full max-w-4xl opacity-10 dark:opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 to-transparent blur-3xl mix-blend-multiply dark:mix-blend-lighten" />
      </div>
      
      {isReady ? (
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={count}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative z-10 flex flex-col items-center justify-center absolute inset-0"
          >
            <div className={`font-serif font-black tracking-tight text-slate-800 dark:text-slate-100 ${count === 'BEGIN' ? 'text-7xl md:text-9xl tracking-widest' : 'text-[12rem] md:text-[20rem] leading-none'} select-none drop-shadow-sm`}>
              {count}
            </div>
            {count !== 'BEGIN' && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] mt-8"
              >
                Preparing Test
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 size={48} className="text-blue-700 dark:text-blue-500 animate-spin" />
            <ShieldCheck size={20} className="text-blue-700 dark:text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2 text-center">
             <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.3em] animate-pulse">
               Authorizing Session...
             </div>
             <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
               {selectedCourse?.code || 'Test'} - Secure Engine
             </p>
          </div>
        </div>
      )}
    </div>
  );
}

