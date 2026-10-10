const fs = require('fs');

const adminCode = `import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronLeft, Lock, UserCog, Loader2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminLoginView() {
  const { setAdmin, setToken } = useAppContext();
  const [adminKey, setAdminKey] = useState('');
  const [matric, setMatric] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey, matricNo: matric })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Failed to parse JSON response:', text);
        toast('Server Error', 'The server returned an invalid response.', 'error');
        setIsLoading(false);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        return;
      }

      if (res.ok) {
        toast('Access Granted', data.message, 'success');
        setAdmin({ token: data.token, isAdmin: true });
        setToken(data.token);
        navigate('/admin/dashboard');
      } else {
        toast('Access Denied', data.error, 'error');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
      }
    } catch (e) {
      console.error(e);
      toast('Network Error', 'Could not reach the server. Please check your internet connection.', 'error');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
      </div>

      <motion.button 
        onClick={() => navigate('/login')}
        className="absolute top-8 left-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors z-50"
      >
        <ChevronLeft size={14} /> Back to Portal
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={\`w-full max-w-md bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl relative z-10 \${isShake ? 'animate-shake ring-2 ring-red-500' : ''}\`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
        
        <div className="p-10 pb-6 text-center relative z-10">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/10" />
            <ShieldCheck size={36} className="text-red-500 transform rotate-12" />
          </div>
          <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight">Admin Override</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Elevated privileges required</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 pt-4 space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 ml-1">Administrator ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCog size={16} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  required
                  value={matric}
                  onChange={e => setMatric(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-bold tracking-widest focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-inner"
                  placeholder="Root Identity"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 ml-1">Security Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input 
                  type="password" 
                  required
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-black tracking-widest focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-inner"
                  placeholder="••••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Authenticate'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
`;

fs.writeFileSync('src/views/AdminLoginView.tsx', adminCode);
console.log('Admin login updated');
