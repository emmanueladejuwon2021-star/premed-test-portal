import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { Wind, Lock, Loader2 } from 'lucide-react';

export default function ChillFirstView() {
  const { testSession, token, setTestResult } = useAppContext();
  const [countdown, setCountdown] = useState(2);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const submitTest = async () => {
    if (!testSession) {
      navigate('/dashboard');
      return;
    }
    
    try {
      const res = await fetch('/api/simulation/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          sessionId: testSession.sessionId,
          courseId: testSession.courseId,
          answers: testSession.answers,
          totalQuestions: testSession.questions.length
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setTestResult(data);
      navigate('/results');
    } catch (err: any) {
      toast('Submit Fault', err.message, 'error');
      navigate('/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 z-[9999] overflow-hidden">
      {/* Intense Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20 bg-[length:200%_200%]"
        />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
      </div>
      
      <div className="relative z-10 text-center space-y-12 max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400 animate-pulse mb-8 leading-none">
            <Lock size={32} />
          </div>
          <h2 className="text-6xl md:text-9xl font-serif font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none">
            FINISHING <span className="text-blue-600 dark:text-blue-400 italic">UP</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs uppercase tracking-[0.5em] font-bold">
            Securing your answers • Finalizing results
          </p>
        </motion.div>
        
        <div className="relative inline-flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-full blur-3xl"
          />
          <div className="relative text-8xl md:text-[12rem] font-serif font-black text-slate-900 dark:text-slate-100 drop-shadow-2xl">
            {countdown}
          </div>
        </div>
        
        <div className="space-y-6 w-full max-w-sm mx-auto">
          <div className="h-1 bg-muted rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <motion.div 
              className="h-full bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-[0_0_15px_rgba(var(--primary),0.8)]"
              initial={{ width: '100%' }}
              animate={{ width: ((countdown / 2) * 100) + '%' }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
             <div className="flex items-center gap-2 italic">
               <Wind size={12} className="animate-bounce" /> Relax your mind
             </div>
             <div className="flex items-center gap-2">
               Submitting answers <Loader2 size={12} className="animate-spin" />
             </div>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em]">
        Test Environment: Secure
      </footer>
    </div>
  );
}

