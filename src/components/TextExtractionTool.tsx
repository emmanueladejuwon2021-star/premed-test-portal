import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Save, Trash2, Database } from 'lucide-react';
import { toast } from './Toast';

interface Question {
  text: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: string;
  explanation?: string;
}

interface TextExtractionToolProps {
  onDeploy: (questions: Question[]) => void;
  token: string;
  courseContext?: string;
  topicContext?: string;
}

export default function TextExtractionTool({ onDeploy, token, courseContext, topicContext }: TextExtractionToolProps) {
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const handleParseText = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const res = await fetch('/api/admin/extract-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ text: rawText })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract questions');
      
      if (Array.isArray(data)) {
        setParsedQuestions(data);
        if (data.length > 0) {
           toast('AI Extraction Success', `Identified ${data.length} questions using intelligence engine.`, 'success');
        } else {
           toast('No Patterns Found', 'The AI could not identify any valid MCQs in the provided text.', 'error');
        }
      }
    } catch (e: any) {
      console.error('Gemini Extraction Error:', e);
      toast('AI Sync Fault', 'Intelligence relay dropped: ' + (e.message || 'Unknown error'), 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFallbackParse = () => {
    if (!rawText.trim()) return;
    
    try {
        const questions: Question[] = [];
        
        // Pre-process raw text to ensure newlines before options and question numbers 
        // to handle cases where they are pasted on the same line.
        let processedText = rawText
            // ensure newline before A) b. etc if there's a space before it
            .replace(/(\s+|\t+)(?=[a-d][\.\)]\s)/gi, '\n')
            // ensure newline before 1. Q1) if there's a space before it
            .replace(/(\s+|\t+)(?=(?:Q\s*)?\d+[\.\)]\s)/gi, '\n');

        const lines = processedText.split('\n');
        let currentQ: Partial<Question> | null = null;
        let currentOpt = '';
        
        // Match lines starting with a number followed by a dot, parenthesis or dash
        const isQuestionStart = /^(?:Q|\s*)?(\d+)[\.\)\-]\s*(.*)/i;
        // Match options starting with a, b, c, or d followed by a dot or parenthesis, with optional checkmarks
        const isOptRegex = /^[\s✓✔☑\*✅✔️]*\(?(?:\[x\]\s*)?([a-d])[\.\)\]][\s✓✔☑\*✅✔️]*(.*)/i;
        // Checkmarks to detect correct answer anywhere in the line
        const isCheckmark = /[✓✔☑\*✅✔️]|\[x\]/i;
        const isAnswer = /^(?:Ans|Answer|Correct)[\s:]*([a-d])/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const qMatch = line.match(isQuestionStart);
            if (qMatch) {
                if (currentQ && (currentQ.a || currentQ.b)) {
                    currentQ.a = currentQ.a || '';
                    currentQ.b = currentQ.b || '';
                    currentQ.c = currentQ.c || '';
                    currentQ.d = currentQ.d || '';
                    questions.push(currentQ as Question);
                }
                currentQ = {
                    text: qMatch[2].trim(),
                    a: '', b: '', c: '', d: '',
                    correct: 'option_a' // default
                };
                currentOpt = '';
                continue;
            }

            const optMatch = line.match(isOptRegex);
            if (optMatch) {
                if (!currentQ) {
                    currentQ = {
                        text: 'Untitled Question',
                        a: '', b: '', c: '', d: '',
                        correct: 'option_a'
                    };
                }
                const optLetter = optMatch[1].toLowerCase() as 'a'|'b'|'c'|'d';
                let optText = optMatch[2];
                // Check if this option line contains a checkmark
                if (isCheckmark.test(line)) {
                    currentQ.correct = `option_${optLetter}`;
                    optText = optText.replace(new RegExp(isCheckmark.source, 'ig'), '').trim();
                }
                currentQ[optLetter] = optText;
                currentOpt = optLetter;
                continue;
            }

            const ansMatch = line.match(isAnswer);
            if (ansMatch) {
                if (currentQ) {
                    currentQ.correct = `option_${ansMatch[1].toLowerCase()}`;
                }
                continue;
            }

            if (!currentQ) {
                currentQ = {
                    text: line,
                    a: '', b: '', c: '', d: '',
                    correct: 'option_a'
                };
                currentOpt = '';
                continue;
            }

            // Append to current question text or current option
            if (currentOpt) {
                const optLetter = currentOpt as 'a'|'b'|'c'|'d';
                if (isCheckmark.test(line)) {
                    currentQ.correct = `option_${optLetter}`;
                    let cleaned = line.replace(new RegExp(isCheckmark.source, 'ig'), '').trim();
                    currentQ[optLetter] += (currentQ[optLetter] ? ' ' : '') + cleaned;
                } else {
                    currentQ[optLetter] += (currentQ[optLetter] ? ' ' : '') + line;
                }
            } else {
                currentQ.text += (currentQ.text ? '\n' : '') + line;
            }
        }

        if (currentQ && (currentQ.a || currentQ.b || currentQ.c || currentQ.d)) {
            currentQ.a = currentQ.a || '';
            currentQ.b = currentQ.b || '';
            currentQ.c = currentQ.c || '';
            currentQ.d = currentQ.d || '';
            questions.push(currentQ as Question);
        }

        setParsedQuestions(questions);
        
        if (questions.length > 0) {
            toast('Basic Parse Success', `Extracted ${questions.length} questions using offline algorithms.`, 'success');
        } else {
            toast('No Patterns Found', 'Could not identify structured options. Ensure format implies numbers and A) B) C) D).', 'error');
        }
    } catch (e) {
        console.error("Regex parsing error", e);
        toast('Parse Error', 'Fallback parsing failed.', 'error');
    }
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Target Destination Indicator */}
      <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
          <Database size={20} />
        </div>
        <div>
           <div className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-0.5">Deployment Target</div>
           <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-tight">
              <span className="text-blue-400">{courseContext || 'No Course'}</span>
              <ChevronRight size={12} className="text-white/20" />
              <span>{topicContext || 'No Topic Selected'}</span>
           </div>
        </div>
      </div>

      {parsedQuestions.length === 0 && (
        <section className="space-y-4">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-2">
               <FileText size={14} className="text-primary" /> Paste Raw Payload
            </label>
            <textarea 
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              className="w-full h-48 bg-muted/30 border border-border rounded-xl p-4 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-all resize-none"
              placeholder="Paste raw data here... e.g. 1. What is...? a) Opt 1 b) Opt 2 Ans: A"
            />
            <div className="flex justify-end gap-3 flex-wrap">
              <button 
                onClick={handleFallbackParse}
                disabled={isParsing || !rawText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-all disabled:opacity-50"
              >
                <FileText size={16} /> Basic Parse (Offline)
              </button>
              <button 
                onClick={handleParseText}
                disabled={isParsing || !rawText.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {isParsing ? <><Sparkles size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> AI Parse (Smart)</>}
              </button>
            </div>
          </div>
        </section>
      )}

      <AnimatePresence>
        {parsedQuestions.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-200">Pre-Deployment Review</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mt-1">{parsedQuestions.length} Data Vectors Identified</p>
              </div>
              <div className="flex gap-3 w-full lg:w-auto">
                <button 
                  onClick={() => setParsedQuestions([])}
                  className="flex-1 lg:flex-none px-6 py-2.5 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 rounded-xl text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Discard Batch
                </button>
                <button 
                  onClick={() => {
                    onDeploy(parsedQuestions);
                    setParsedQuestions([]);
                    setRawText('');
                  }}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Save size={14} /> Commit to Vault
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl relative group hover:border-slate-700 transition-colors">
                  <button 
                    onClick={() => removeQuestion(idx)}
                    className="absolute top-4 right-4 p-2 bg-slate-900 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 rounded transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="space-y-3 mb-6 pr-10">
                    <span className="inline-flex text-[9px] px-2 py-1 bg-slate-900 font-black uppercase text-slate-400 tracking-widest rounded">Target {idx + 1}</span>
                    <textarea 
                       value={q.text}
                       onChange={e => updateQuestion(idx, 'text', e.target.value)}
                       className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-slate-200 font-bold text-sm focus:outline-none focus:border-blue-500/50 resize-y"
                       rows={2}
                    />
                  </div>

                  <div className="mb-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Options (Click letter to mark as correct)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['a', 'b', 'c', 'd'].map(opt => (
                      <div key={opt} className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${q.correct === `option_${opt}` ? 'bg-green-500/10 border-green-500/50 shadow-[inset_0_0_15px_rgba(34,197,94,0.05)]' : 'bg-slate-900 border-slate-800'}`}>
                        <button 
                          onClick={() => updateQuestion(idx, 'correct', `option_${opt}`)}
                          className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${q.correct === `option_${opt}` ? 'bg-green-600 border-green-500 text-white shadow-md shadow-green-500/20' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-green-500 hover:text-green-400'}`}
                          title={`Set ${opt.toUpperCase()} as correct`}
                        >
                          {q.correct === `option_${opt}` ? <CheckCircle2 size={16} /> : <span className="text-[10px] font-black">{opt.toUpperCase()}</span>}
                        </button>
                        <input 
                           value={q[opt as keyof Question]}
                           onChange={e => updateQuestion(idx, opt as any, e.target.value)}
                           className="flex-grow bg-transparent border-none text-xs text-slate-300 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Detailed solution edit section matching requirements */}
                  <div className="mt-4 pt-4 border-t border-slate-900 space-y-2">
                     <label className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider">Detailed Solution & Option Teaching Guide</label>
                     <textarea
                        value={q.explanation || ''}
                        onChange={e => updateQuestion(idx, 'explanation', e.target.value)}
                        placeholder="Detailed explanation on why the correct option is right and others are wrong..."
                        className="w-full bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/40 resize-y"
                        rows={3}
                     />
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
