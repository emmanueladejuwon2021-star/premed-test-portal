import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Clock, 
  Database, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Cpu,
  GraduationCap
} from 'lucide-react';

export default function MaintenanceView() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ minutes: 34, seconds: 12 });
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState(42);

  // Simulated countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        } else {
          return { minutes: 30, seconds: 0 }; // Loop simulation
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulated progress bar and active step updates
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 88) {
          return prev + 1;
        }
        return prev;
      });
    }, 5000);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev % 3) + 1);
    }, 15000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const systemChecks = [
    { name: 'Core Engine Platform', status: 'online', code: 'V2.4.1', detail: 'Primary simulation loops functional' },
    { name: 'Medical Question Bank Indexing', status: 'maintenance', code: 'RE-INDEXING', detail: 'Compiling high-yield curriculum files' },
    { name: 'Real-time Analytics Nodes', status: 'queued', code: 'INACTIVE', detail: 'Awaiting data schema migration completion' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-6 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Decorative ambient background glowing orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-950/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center py-4 z-10">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <GraduationCap className="h-6 w-6 text-indigo-400" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white">Premed<span className="text-indigo-400">TestPortal</span></span>
            <span className="block text-[10px] text-slate-400 tracking-widest uppercase">Academic Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 font-medium">
          <Activity className="h-3 h-3 animate-pulse" />
          <span>Scheduled Systems Upgrade</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl flex flex-col items-center justify-center text-center my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          <div className="p-5 bg-gradient-to-b from-indigo-500/10 to-indigo-950/5 text-indigo-400 rounded-3xl border border-indigo-500/20 inline-block shadow-lg">
            <Wrench className="h-12 w-12 stroke-[1.5] animate-wiggle" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4"
        >
          Medical Portal Upgrades Underway
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-slate-400 leading-relaxed max-w-xl text-base sm:text-lg mb-6"
        >
          Premed Test Portal is currently performing major system enhancements. We are compiling updated high-yield MCQ bundles and optimizing simulation latency to elevate your test-taking experience.
        </motion.p>

        {/* Administration Access Action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="flex justify-center gap-4 mb-8"
        >
          <button
            id="maintenance-admin-bypass-btn"
            type="button"
            onClick={() => navigate('/admin/login')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold font-sans text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2 border border-indigo-500 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-indigo-200" />
            <span>Admin Portal Override</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Dynamic Upgrade Status Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 mb-8 text-left"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Estimated Completion</span>
              <div className="flex items-center gap-2 text-2xl font-mono text-indigo-400 font-bold mt-1">
                <Clock className="h-5 w-5 text-indigo-500" />
                <span>
                  {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                <span>Migration Progress</span>
                <span className="font-mono text-indigo-400">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Live Node Status</span>
            
            {systemChecks.map((check, idx) => (
              <div key={idx} className="flex items-start justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-850/60 hover:border-slate-850 transition">
                <div className="flex gap-3">
                  <div className="mt-1">
                    {check.status === 'online' && (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}
                    {check.status === 'maintenance' && (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse" />
                    )}
                    {check.status === 'queued' && (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{check.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wider ${
                    check.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                    check.status === 'maintenance' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {check.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Informative Help Alert footer */}
        <div className="flex items-center gap-3 p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-left max-w-lg">
          <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-slate-400">
            <strong>Admins & Faculty:</strong> Live databases remain secure. Simulated examinations already in progress have been cached and will sync automatically upon system restoration.
          </p>
        </div>
      </main>

      {/* Footer / Hidden Administrator bypass link */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center py-6 border-t border-slate-900 text-xs text-slate-500 gap-4 z-10">
        <div>
          <span>© {new Date().getFullYear()} Premed Test Portal. All credentials secured.</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/admin/login')}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:text-indigo-400 border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-lg transition font-medium"
          >
            <span>Faculty & Admin Access</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
