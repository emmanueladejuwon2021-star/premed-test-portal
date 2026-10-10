const fs = require('fs');
let code = fs.readFileSync('src/views/QuestionBankView.tsx', 'utf8');

const newEmptyState = `<div className="py-20 md:py-32 flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
                    <div className="w-32 h-32 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-black rounded-[3rem] flex items-center justify-center text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10 rotate-3 hover:rotate-0 transition-transform duration-500">
                       <Database size={48} className="text-blue-600" />
                    </div>
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white absolute -bottom-4 -right-4 shadow-xl shadow-emerald-500/30 z-20 -rotate-6 hover:rotate-0 transition-transform">
                       <Layers size={28} />
                    </div>
                 </motion.div>
                 
                 <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
                   Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Knowledge</span> Vault
                 </h3>
                 <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-16 leading-relaxed">
                   Orchestrate the academic foundation. Map your modules, define rigorous knowledge threads, and deploy comprehensive assessment units.
                 </p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
                    <div className={\`group p-8 rounded-[2.5rem] flex flex-col justify-between transition-all duration-500 relative overflow-hidden \${selectedCourseId ? 'bg-white dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/5' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl'}\`}>
                       \${selectedCourseId ? '<div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />' : '<div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />'}
                       <div className="relative z-10">
                         <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-xl transition-all \${selectedCourseId ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}\`}>
                            {selectedCourseId ? <Check size={28} /> : <Globe size={28} />}
                         </div>
                         <div className={\`text-[10px] font-black uppercase tracking-widest mb-2 \${selectedCourseId ? 'text-emerald-500' : 'text-blue-600'}\`}>Phase 1 \${selectedCourseId ? '• Configured' : '• Pending'}</div>
                         <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2 leading-none">Module Definition</div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-[90%]">Every question in the vault must belong to a top-level academic module or test deployed in the system.</p>
                       </div>
                       
                       <div className="space-y-4 relative z-10 mt-auto">
                          {courses.length > 0 && (
                            <div className="relative group/select">
                              <select 
                                 value={selectedCourseId || ''} 
                                 onChange={e => setSelectedCourseId(e.target.value || null)}
                                 className={\`w-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white border \${selectedCourseId ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer appearance-none\`}
                              >
                                 <option value="">Choose Existing Module...</option>
                                 {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                              </select>
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 py-2">
                             <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">or</span>
                             <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                          </div>

                          <button 
                             onClick={() => setShowCourseModal(true)}
                             className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group/btn hover:shadow-2xl"
                          >
                             <div className="w-6 h-6 rounded-lg bg-white/20 dark:bg-black/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform"><Plus size={14} /></div>
                             Initialize Module
                          </button>
                       </div>
                    </div>

                    {!selectedCourseId ? (
                       <div className="p-8 bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-70 cursor-not-allowed">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-600">
                             <Layers size={28} />
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Phase 2 • Locked</div>
                          <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Knowledge Threads</div>
                          <p className="text-xs text-slate-400 font-medium max-w-[80%]">First configure the module definition, then define specific syllabus topics here.</p>
                       </div>
                    ) : (
                       <div className="group p-8 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 shadow-2xl shadow-blue-500/10 rounded-[2.5rem] flex flex-col justify-between transition-all relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                          <div className="relative z-10">
                            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-600/30">
                               <Layers size={28} />
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-2 text-blue-600 dark:text-blue-400 animate-pulse">Phase 2 • Action Required</div>
                            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2 leading-none">Knowledge Threads</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-[90%]">Break down the module into sub-topics or threads. Questions are safely bound to these precise threads.</p>
                          </div>
                          
                          <div className="space-y-4 relative z-10 mt-auto">
                             {topics.length > 0 && (
                               <div className="relative group/select">
                                 <select 
                                    value={selectedTopicId || ''} 
                                    onChange={e => setSelectedTopicId(e.target.value || null)}
                                    className="w-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer appearance-none"
                                 >
                                    <option value="">Choose Existing Thread...</option>
                                    {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                 </select>
                                 <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
                               </div>
                             )}

                             {topics.length > 0 && (
                                <div className="flex items-center gap-4 py-2">
                                   <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300 dark:text-slate-600">or</span>
                                   <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                                </div>
                             )}

                             <div className="flex bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-2 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <input
                                  id="new-topic-input-main"
                                  value={newTopicName}
                                  onChange={e => setNewTopicName(e.target.value)}
                                  placeholder="New Thread Name..."
                                  className="w-full bg-transparent text-slate-900 dark:text-white px-4 py-3 text-sm font-bold outline-none"
                                />
                                <button
                                  onClick={handleAddTopic}
                                  className="px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] shrink-0"
                                >
                                  Instantiate
                                </button>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>`;

const searchStr = `<div className="py-20 md:py-40 flex flex-col items-center justify-center text-center max-w-2xl mx-auto">`;

const oldEnd = `                  </div>
              </div>`;

const startIndex = code.indexOf(searchStr);
if (startIndex !== -1) {
  const endIndexStr = code.indexOf(oldEnd, startIndex) + oldEnd.length;
  code = code.slice(0, startIndex) + newEmptyState + code.slice(endIndexStr);
}

fs.writeFileSync('src/views/QuestionBankView.tsx', code);
console.log('QuestionBankView patched empty state');
