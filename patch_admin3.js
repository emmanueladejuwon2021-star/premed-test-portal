const fs = require('fs');
let code = fs.readFileSync('src/views/AdminDashboard.tsx', 'utf8');

const injection = `
        <AnimatePresence>
          {showAddCourse && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddCourse(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#050505] rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-900 shrink-0">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Deploy Module</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Establish a new test assessment instance</p>
                </div>
                
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                  <form id="add-course-form" onSubmit={handleAddCourse} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                           <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Module Title</label>
                           <input 
                               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                               value={newCourse.title} 
                               onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} 
                               required 
                           />
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Identifier Code</label>
                           <input 
                               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                               value={newCourse.code} 
                               placeholder="e.g., BIO101"
                               onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} 
                               required 
                           />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-2">
                           <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Duration (Min)</label>
                           <input 
                               type="number"
                               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                               value={newCourse.duration} 
                               onChange={e => setNewCourse({ ...newCourse, duration: Number(e.target.value) })} 
                               required 
                           />
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Item Limit</label>
                           <input 
                               type="number"
                               className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                               value={newCourse.question_limit} 
                               onChange={e => setNewCourse({ ...newCourse, question_limit: Number(e.target.value) })} 
                               required 
                           />
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Activation Mode</label>
                           <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[54px] bg-slate-50 dark:bg-slate-950 p-1">
                              <button 
                                type="button" 
                                onClick={() => setNewCourse({...newCourse, is_mock: false})}
                                className={\`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${!newCourse.is_mock ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
                              >Live</button>
                              <button 
                                type="button" 
                                onClick={() => setNewCourse({...newCourse, is_mock: true})}
                                className={\`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${newCourse.is_mock ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
                              >Mock</button>
                           </div>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Schedule Timing (Optional)</label>
                       <input 
                           type="datetime-local"
                           className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                           value={newCourse.scheduled_date} 
                           onChange={e => setNewCourse({ ...newCourse, scheduled_date: e.target.value })} 
                       />
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-loose text-center">
                          If omitted, the module activates immediately upon creation.
                       </p>
                    </div>
                  </form>
                </div>
                
                <div className="p-8 border-t border-slate-100 dark:border-slate-900 shrink-0 flex gap-4 bg-slate-50/50 dark:bg-[#050505]/50">
                    <button type="button" onClick={() => setShowAddCourse(false)} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Cancel</button>
                    <button type="submit" form="add-course-form" className="flex-1 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Deploy</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
`;

code = code.replace(
  '{selectedProctorSessionId && (', 
  injection + '\n        {selectedProctorSessionId && ('
);

fs.writeFileSync('src/views/AdminDashboard.tsx', code);
console.log('Injected Add Course Modal');
