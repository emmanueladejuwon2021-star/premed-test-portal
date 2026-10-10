import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator as CalcIcon, X, Divide, Minus, Plus, Equal, Hash } from 'lucide-react';

export default function Calculator({ open, onToggle }: { open?: boolean, onToggle?: (val: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (onToggle) onToggle(val);
    else setInternalOpen(val);
  };
  const [display, setDisplay] = useState('0');
  const [formula, setFormula] = useState('');

  const handleChar = (char: string) => {
    if (display === 'Error') {
      setDisplay(char);
      return;
    }
    if (display === '0' && char !== '.') {
      setDisplay(char);
    } else {
      if (char === '.' && display.includes('.')) return;
      setDisplay(prev => prev + char);
    }
  };

  const handleOp = (op: string) => {
    if (display === 'Error') return;
    
    // If double tapping operators, just replace the last one
    if (formula.endsWith(' ') && display === '0') {
      setFormula(prev => prev.slice(0, -3) + ' ' + op + ' ');
      return;
    }

    setFormula(prev => prev + display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      if (display === 'Error') return;
      const fullFormula = formula + display;
      if (!fullFormula) return;

      const sanitized = fullFormula.replace(/×/g, '*').replace(/÷/g, '/');
      
      let result;
      try {
        result = new Function('return ' + sanitized)();
      } catch {
        result = 'Error';
      }
      
      if (result === 'Error' || !isFinite(result)) throw new Error('Invalid Operation');
      
      const formattedResult = Number(result.toFixed(8)).toString();
      setDisplay(formattedResult);
      setFormula('');
    } catch {
      setDisplay('Error');
      setFormula('');
    }
  };

  const handleSpecial = (type: string) => {
    if (display === 'Error') return;
    const val = parseFloat(display);
    let res = 0;
    try {
      switch(type) {
        case 'sq': res = val * val; break;
        case 'sqrt': res = Math.sqrt(val); break;
        case 'sin': res = Math.sin(val * Math.PI / 180); break;
        case 'cos': res = Math.cos(val * Math.PI / 180); break;
        case 'tan': res = Math.tan(val * Math.PI / 180); break;
        case 'log': res = Math.log10(val); break;
        case 'ln': res = Math.log(val); break;
        case 'pi': res = Math.PI; break;
        case 'e': res = Math.E; break;
        case 'inv': res = 1 / val; break;
        default: return;
      }
      setDisplay(Number(res.toFixed(8)).toString());
    } catch {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setFormula('');
  };  return (
    <div className="fixed bottom-24 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white dark:bg-[#09090b] border-2 border-slate-200 dark:border-slate-800 shadow-[0_0_50px_rgba(37,99,235,0.15)] p-5 w-80 mb-4 overflow-hidden rounded-[2.5rem]"
          >
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <CalcIcon size={14} className="text-blue-650 dark:text-blue-500" />
                 </div>
                 <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Quantum_Kernel</h4>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Scientific V3</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-500 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5 text-right shadow-inner min-h-[90px] flex flex-col justify-end group transition-all hover:border-blue-500/30">
              <div className="text-[11px] font-mono font-bold text-blue-600/50 dark:text-blue-500/40 h-5 overflow-hidden tracking-tighter opacity-70 leading-none">{formula}</div>
              <div className="text-3xl font-mono font-black tracking-tighter truncate leading-tight text-slate-900 dark:text-white">{display}</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleSpecial('sin')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[9px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all uppercase tracking-widest border border-slate-205 dark:border-slate-800 cursor-pointer">Sin</button>
              <button onClick={() => handleSpecial('cos')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[9px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all uppercase tracking-widest border border-slate-205 dark:border-slate-800 cursor-pointer">Cos</button>
              <button onClick={() => handleSpecial('tan')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[9px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all uppercase tracking-widest border border-slate-205 dark:border-slate-800 cursor-pointer">Tan</button>
              <button onClick={clear} className="bg-red-600 text-white p-2.5 rounded-xl text-[10px] font-black hover:bg-red-700 transition-all uppercase tracking-widest shadow-lg shadow-red-600/20 cursor-pointer">AC</button>
              
              <button onClick={() => handleSpecial('pi')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[10px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-slate-205 dark:border-slate-800 cursor-pointer">π</button>
              <button onClick={() => handleSpecial('sqrt')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[10px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-slate-205 dark:border-slate-800 cursor-pointer">√</button>
              <button onClick={() => handleSpecial('log')} className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-[9px] font-black p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all uppercase tracking-widest border border-slate-205 dark:border-slate-800 cursor-pointer">Log</button>
              <button onClick={() => handleOp('/')} className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 p-2.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-blue-200 dark:border-blue-500/20 flex items-center justify-center cursor-pointer"><Divide size={18} /></button>
              
              {[7, 8, 9].map(n => (
                <button key={n} onClick={() => handleChar(String(n))} className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-xl text-lg font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 text-center cursor-pointer">{n}</button>
              ))}
              <button onClick={() => handleOp('*')} className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 p-3.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-blue-200 dark:border-blue-500/20 flex items-center justify-center cursor-pointer"><X size={18} /></button>
              
              {[4, 5, 6].map(n => (
                <button key={n} onClick={() => handleChar(String(n))} className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-xl text-lg font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 text-center cursor-pointer">{n}</button>
              ))}
              <button onClick={() => handleOp('-')} className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 p-3.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-blue-200 dark:border-blue-500/20 flex items-center justify-center cursor-pointer"><Minus size={18} /></button>
              
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => handleChar(String(n))} className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-xl text-lg font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 text-center cursor-pointer">{n}</button>
              ))}
              <button onClick={() => handleOp('+')} className="bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 p-3.5 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-650 hover:text-white transition-all border border-blue-200 dark:border-blue-500/20 flex items-center justify-center cursor-pointer"><Plus size={18} /></button>
              
              <button onClick={() => handleChar('0')} className="col-span-2 bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-xl text-lg font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 text-center cursor-pointer">0</button>
              <button onClick={() => handleChar('.')} className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-xl text-lg font-black transition-all active:scale-95 border border-slate-200 dark:border-slate-800 text-center cursor-pointer">.</button>
              <button onClick={calculate} className="bg-blue-600 text-white p-3.5 rounded-xl flex items-center justify-center hover:bg-blue-550 transition-all shadow-xl shadow-blue-600/40 active:scale-95 group text-center cursor-pointer"><Equal size={24} className="group-hover:translate-y-[-1px] transition-transform" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-white dark:bg-[#09090b] text-blue-600 dark:text-blue-500 rounded-2xl shadow-2xl shadow-blue-500/10 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-slate-200 dark:border-slate-800 group cursor-pointer"
      >
        <CalcIcon size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}
