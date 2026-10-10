import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Info, CheckCircle2, ArrowRight, Camera, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';

export default function ReadinessCheckView() {
  const [confirmed, setConfirmed] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [bypassNeeded, setBypassNeeded] = useState(false);
  const [browserValid, setBrowserValid] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();
  
  const rules = [
    "This test must be finished before time runs out.",
    "Leaving this page during the test may end your session.",
    "Your answers are saved automatically when you submit.",
    "Please make sure your internet connection is stable.",
    "Do your own work and don't cheat.",
    "Your camera and microphone must stay on while you take the test."
  ];

  useEffect(() => {
    let isMounted = true;
    
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (isMounted) {
          setCameraEnabled(true);
          setMediaError(null);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        if (isMounted) {
          setCameraEnabled(false);
          setMediaError("Camera requirement failed. Camera/microphone access denied or unavailable.");
          toast('Camera Required', 'Please allow camera and mic permissions to continue.', 'error');
        }
      }
    };

    initMedia();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleStart = () => {
    if (!confirmed || (!cameraEnabled && !bypassNeeded)) return;
    navigate('/countdown');
  };

  return (
    <DashboardLayout viewTitle="Pre-Flight Verification">
      <div className="flex flex-col gap-2 mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full w-fit">
          <ShieldCheck size={12} /> Test Rules
        </div>
        <h1 className="text-xl md:text-3xl font-serif font-black tracking-tight text-slate-900 dark:text-slate-100">
          Readiness Check
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start py-2 w-full overflow-y-auto custom-scrollbar">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white dark:bg-black shadow-sm rounded-2xl p-4 md:p-8 space-y-4 border border-slate-200 dark:border-slate-800 max-w-4xl w-full"
         >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               <div className="text-left space-y-3 bg-slate-50 dark:bg-[#050505] rounded-xl p-4">
                  <div className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-1 flex items-center gap-2">
                     <Info size={12} /> Guidelines
                  </div>
                  <ul className="space-y-1.5">
                     {rules.map((rule, i) => (
                       <li key={i} className="flex gap-2 text-[10px] text-slate-700 dark:text-slate-300 font-medium leading-tight">
                          <div className="mt-1 w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                          {rule}
                       </li>
                     ))}
                  </ul>
               </div>

               <div className="space-y-4">
                 <div className="bg-slate-100 dark:bg-black rounded-xl p-1 border border-slate-200 dark:border-slate-800 overflow-hidden relative aspect-video flex flex-col items-center justify-center max-w-sm mx-auto w-full shadow-inner">
                    {!cameraEnabled ? (
                      <div className="text-center space-y-2 px-3">
                        <AlertTriangle className="mx-auto text-orange-500" size={24} />
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
                          {mediaError || "Waiting for camera..."}
                        </p>
                        {mediaError && (
                          <button 
                            onClick={() => window.location.reload()}
                            className="text-[9px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-widest"
                          >
                            Retry Request
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <video 
                          ref={videoRef}
                          autoPlay 
                          playsInline 
                          muted 
                          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Recording Active
                        </div>
                      </>
                    )}
                 </div>

                 <label className="flex items-center gap-3 cursor-pointer group p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-[#050505] transition-colors">
                    <div 
                      onClick={() => setConfirmed(!confirmed)}
                      className={`w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all ${confirmed ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-black'}`}
                    >
                       {confirmed && <CheckCircle2 size={10} />}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest text-left leading-tight">
                      I agree to the test rules and allow camera recording.
                    </span>
                 </label>

                 {!cameraEnabled && (
                   <label className="flex items-center gap-3 cursor-pointer group p-2.5 border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 rounded-xl hover:bg-amber-50/50 transition-colors">
                      <div 
                        onClick={() => setBypassNeeded(!bypassNeeded)}
                        className={`w-4 h-4 shrink-0 rounded flex items-center justify-center transition-all ${bypassNeeded ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-black'}`}
                      >
                         {bypassNeeded && <CheckCircle2 size={10} />}
                      </div>
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest text-left leading-tight">
                        No Webcam detected? Enable hardware compatibility bypass.
                      </span>
                   </label>
                 )}

                 <button 
                   disabled={!confirmed || (!cameraEnabled && !bypassNeeded)}
                   onClick={handleStart}
                   className="w-full h-11 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95"
                 >
                   Start Test <ArrowRight size={14} />
                 </button>
               </div>
            </div>
         </motion.div>
      </div>
    </DashboardLayout>
  );
}
