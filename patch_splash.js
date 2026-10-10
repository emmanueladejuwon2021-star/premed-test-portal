const fs = require('fs');

const splashCode = `import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Globe, Fingerprint, Activity, Terminal } from 'lucide-react';

export default function SplashView() {
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => navigate('/login'), 800);
    }
  }, [countdown, navigate]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 overflow-hidden">
       {/* Intensive Background Elements */}
       <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950"></div>
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <motion.div 
             animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }} 
             transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" 
          />
       </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full text-center space-y-16 relative z-10"
      >
        <div className="space-y-6">
           {/* High-tech Icon */}
           <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="relative mx-auto w-32 h-32"
           >
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
                 <Terminal size={48} className="text-blue-500" />
                 <Fingerprint size={24} className="absolute bottom-4 right-4 text-slate-500 opacity-50" />
              </div>
           </motion.div>
           
           <div className="space-y-4">
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500"
             >
                <Activity size={12} className="animate-pulse" /> Pre-med Access Protocol
             </motion.div>
             <h1 className="text-white text-5xl md:text-6xl font-serif font-black tracking-tight leading-none drop-shadow-2xl">
               Premed Tutorials
             </h1>
             <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
               Secure examination terminal and active assessment deployment architecture v1.0.4.
             </p>
           </div>
        </div>

        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
           className="space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
             <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                <motion.div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  initial={{ width: '0%' }}
                  animate={{ width: \`\${(3 - countdown) / 3 * 100}%\` }}
                  transition={{ ease: "linear", duration: 1 }}
                />
             </div>
             <p className="text-blue-400/80 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2">
               <Loader2 size={12} className="animate-spin" /> 
               {countdown > 1 ? 'Synchronizing Knowledge Vault...' : countdown > 0 ? 'Verifying Neural Links...' : 'Establishing Secure Session...'}
             </p>
          </div>

          <div className="text-slate-600 text-[8px] font-mono tracking-widest uppercase max-w-sm mx-auto flex items-center justify-center gap-1.5 opacity-60">
             <Globe size={10} /> 
             System Verification: 0x99283 - Secure Routing Active
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
`;

fs.writeFileSync('src/views/SplashView.tsx', splashCode);
console.log('Splash written');
