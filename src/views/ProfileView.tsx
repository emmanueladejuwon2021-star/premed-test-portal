import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';
import { User, Fingerprint, Building2, LogOut, FileCheck, Calendar, GraduationCap, ChevronRight, Calculator, ShieldAlert, Award, Hash, Phone, Mail, Sparkles, Check, Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { formatToWAT } from '../lib/dateUtils';

export default function ProfileView() {
  const { student, setStudent, setToken, setAdmin } = useAppContext();
  
  // Form states initialized with student data or fallbacks
  const [name, setName] = useState(student?.name || '');
  const [department, setDepartment] = useState(student?.department || 'MBBS');
  const [phone, setPhone] = useState(student?.phone || '');
  const [email, setEmail] = useState(student?.email || '');
  const [strength, setStrength] = useState(student?.strength || 'Biology');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (student) {
      fetch('/api/telemetry/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: "Student Logout",
          details: `Student logged out from profile page`,
          studentId: student.id
        })
      }).catch(e => console.error(e));
    }
    setStudent(null);
    setToken(null);
    setAdmin({ token: null, isAdmin: false });
    localStorage.removeItem('FCF_Token');
    navigate('/');
  };

  useEffect(() => {
    fetch('/api/results/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}` }
    })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        setTranscripts(data);
      }
    })
    .catch(() => console.error("failed grabbing transcripts rip"))
    .finally(() => setLoadingTranscripts(false));
  }, []);

  const totalAverage = transcripts.length > 0 
    ? transcripts.reduce((acc, curr) => acc + curr.percentage, 0) / transcripts.length
    : 0;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Empty Name', 'Display name cannot be blank.', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/student/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('FCF_Token')}`
        },
        body: JSON.stringify({
          name: name.trim(),
          department,
          phone: phone.trim(),
          email: email.trim(),
          strength
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile details.');
      }
      
      setStudent(data.student);
      toast('Sync Completed', 'Your profile details have been synchronized successfully with the test records database!', 'success');
      setIsEditing(false);
    } catch (err: any) {
      toast('Sync Failed', err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(student?.name || '');
    setDepartment(student?.department || 'MBBS');
    setPhone(student?.phone || '');
    setEmail(student?.email || '');
    setStrength(student?.strength || 'Biology');
    setIsEditing(false);
  };

  return (
    <DashboardLayout viewTitle="Identity & Records">
      <div className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto pb-20 px-2 sm:px-0">
        
        <header className="mb-6 space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-50 uppercase tracking-tight flex items-center gap-2">
            <User className="text-blue-600 dark:text-blue-400" /> Identity verification
          </h1>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Manage your credentials and review assessment transcripts.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main profile card side (Compact ID Badge Style) */}
          <div className="w-full lg:w-[355px] shrink-0 flex flex-col gap-5">
            {/* physical SECURE PREMED CREDENTIAL ID BADGE CARD MOCK */}
            <motion.div 
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-slate-900 dark:bg-[#070707] text-white rounded-[2rem] p-6 shadow-xl border border-slate-850 dark:border-slate-800 relative overflow-hidden group min-h-[210px] flex flex-col justify-between"
            >
              {/* Background abstract watermarks */}
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/10 to-transparent blur-xl pointer-events-none" />
              <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full border border-blue-500/5 mix-blend-screen pointer-events-none" />
              <div className="absolute top-4 right-4 text-[7px] font-black uppercase tracking-[0.25em] text-slate-500/40 select-none">
                VERIFIED ACCREDITATION
              </div>

              {/* ID Card Top Section */}
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#00E5FF] font-mono">ACTIVE SYSTEM LINKED</span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-white leading-none">
                    {student?.name || 'STUDENT CREDENTIAL'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    {student?.department || 'MEDICINE & SURGERY'}
                  </p>
                </div>

                {/* Holographic Sec Chip */}
                <div className="w-9 h-7 rounded bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 p-0.5 shadow-md relative overflow-hidden shrink-0 flex flex-col gap-[3px] justify-center px-1.5">
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#00000022_1px,transparent_1px)] bg-[size:100%_4px]" />
                  <div className="h-[2px] w-full bg-slate-900/30 rounded-full" />
                  <div className="h-[2px] w-full bg-slate-900/30 rounded-full" />
                  <div className="h-[2px] w-full bg-slate-900/30 rounded-full" />
                </div>
              </div>

              {/* ID Card Mid Details */}
              <div className="grid grid-cols-2 gap-4 mt-4 border-t border-slate-800 pt-4">
                <div>
                  <div className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider">Candidate ID</div>
                  <div className="text-[12px] font-mono font-black tracking-wider text-slate-205 mt-0.5">{student?.matric_no}</div>
                </div>
                <div>
                  <div className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider">Strength Area</div>
                  <div className="text-[11px] font-bold text-blue-400 mt-0.5 uppercase tracking-wide">{student?.strength || 'Biology'}</div>
                </div>
              </div>

              {/* ID Card Bottom Section - Barcode */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-end gap-[1.5px] h-6 opacity-80 mix-blend-screen bg-slate-800/20 p-1.5 rounded">
                  <div className="w-[1.5px] h-full bg-white rounded-full" />
                  <div className="w-[0.5px] h-full bg-white rounded-full" />
                  <div className="w-2.5 h-full bg-white rounded-full" />
                  <div className="w-[1px] h-full bg-white rounded-full" />
                  <div className="w-[0.5px] h-full bg-white rounded-full" />
                  <div className="w-1.5 h-full bg-white rounded-full" />
                  <div className="w-[1px] h-full bg-white rounded-full" />
                  <div className="w-2.5 h-full bg-white rounded-full" />
                  <div className="w-[0.5px] h-full bg-white rounded-full" />
                  <div className="w-[1.5px] h-full bg-white rounded-full" />
                </div>
                <div className="text-right">
                  <div className="text-[7px] font-black uppercase tracking-widest text-[#00E5FF] font-mono leading-none">CBT CREDENTIAL</div>
                  <div className="text-[6.5px] text-slate-450 uppercase font-bold tracking-widest mt-1">First Class Freshers™</div>
                </div>
              </div>
            </motion.div>

            {/* Editing / Updating Panel */}
            <div className="bg-white dark:bg-black rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-805 flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Settings console</h3>
                </div>
                <button 
                  onClick={() => { if (isEditing) handleCancel(); else setIsEditing(true); }}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isEditing 
                      ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                  }`}
                >
                   {isEditing ? <X size={10} /> : <Edit2 size={10} />}
                   <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveChanges} className="p-5 space-y-4">
                <div className="space-y-3">
                  
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                      <User size={10} /> Candidate Name
                    </label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        placeholder="Your official display name"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <div className="w-full bg-slate-50/70 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                        {student?.name}
                      </div>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                      <Building2 size={10} /> Academic Dept
                    </label>
                    {isEditing ? (
                      <select 
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                      >
                        {['MBBS', 'BDS', 'NURSING', 'PHARMACY', 'PHYSIOTHERAPY', 'ANATOMY', 'PHYSIOLOGY', 'MEDICAL REHABILITATION', 'OTHER'].map(deptOption => (
                          <option key={deptOption} value={deptOption}>{deptOption}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-slate-50/70 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        {student?.department}
                      </div>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                      <Phone size={10} /> Contact Phone
                    </label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Contact phone"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <div className="w-full bg-slate-50/70 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {student?.phone || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                      <Mail size={10} /> Email Address
                    </label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Your email address"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                      />
                    ) : (
                      <div className="w-full bg-slate-50/70 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {student?.email || 'Not provided'}
                      </div>
                    )}
                  </div>

                  {/* Strength subject */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400">
                      <Sparkles size={10} /> Focus Strength
                    </label>
                    {isEditing ? (
                      <select 
                        value={strength}
                        onChange={e => setStrength(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                      >
                        {['Biology', 'Chemistry', 'Physics', 'Mathematical Reasoning', 'Clinical Thinking', 'Critical Reading'].map(strOption => (
                          <option key={strOption} value={strOption}>{strOption}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-slate-50/70 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                        {student?.strength || 'Biology'}
                      </div>
                    )}
                  </div>

                </div>

                {isEditing && (
                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all border border-transparent disabled:opacity-50 disabled:scale-100 active:scale-95"
                    >
                      {isSaving ? 'Synchronizing Sync...' : <> <Check size={12} /> Sync & Save ID </>}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Quick Stats Widget */}
            <div className="grid grid-cols-2 gap-3 h-20">
               <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                 <Award size={24} className="text-amber-500/20 absolute -right-2 -bottom-2" />
                 <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 relative z-10">Average</div>
                 <div className="text-lg font-black italic text-slate-900 dark:text-white leading-none relative z-10">{Math.round(totalAverage)}<span className="text-[9px] opacity-50">%</span></div>
               </div>
               <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                 <FileCheck size={24} className="text-emerald-500/20 absolute -right-2 -bottom-2" />
                 <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 relative z-10">Evaluations</div>
                 <div className="text-lg font-black italic text-slate-900 dark:text-white leading-none relative z-10">{transcripts.length}</div>
               </div>
            </div>
          </div>

          {/* Transcripts (Records) */}
          <div className="flex-1 flex flex-col min-w-0">
             <div className="bg-white dark:bg-[length:40px_40px] dark:bg-[#030303] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 sm:p-8 shadow-sm flex-1">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight uppercase flex items-center gap-2 bg-white dark:bg-[#030303] px-2 -ml-2">
                    <GraduationCap className="text-blue-600 dark:text-blue-400" /> Assessment History
                  </h2>
                </div>

                <div className="space-y-4">
                  {loadingTranscripts ? (
                    <div className="flex flex-col items-center justify-center py-20 text-blue-500 space-y-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}><Calculator size={28} /></motion.div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-[#030303] px-2">Retrieving Secure Records</span>
                    </div>
                  ) : transcripts.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-slate-50/80 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 mx-2">
                       <ShieldAlert size={40} className="text-slate-300 dark:text-slate-700" />
                       <div>
                         <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">No Encrypted Records Found</div>
                         <div className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Complete a CBT session to generate academic transcripts.</div>
                       </div>
                     </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                      <AnimatePresence>
                      {transcripts.map((t, idx) => (
                         <motion.button 
                           onClick={() => navigate(`/results`, { state: { resultId: t.id || t._id } })}
                           initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                           key={t.id || t._id} 
                           className="flex flex-col bg-white dark:bg-[#070707] rounded-[1.5rem] p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all group overflow-hidden relative text-left"
                         >
                           {/* Status Indicator Bar */}
                           <div className={`absolute top-0 right-0 w-16 h-16 blur-2xl opacity-20 -mr-6 -mt-6 rounded-full group-hover:opacity-40 transition-opacity ${t.percentage >= 70 ? 'bg-emerald-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                           
                           <div className="flex justify-between items-start w-full relative z-10">
                             <div className="pr-4 mb-4">
                               <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-[11px] leading-tight line-clamp-2 min-h-[2.5rem]">{t.course_id?.code || t.course_code || 'MODULE'} - {t.course_id?.title || t.course_title || 'General Test'}</h4>
                               <div className="text-[8px] font-bold text-slate-500 tracking-widest uppercase mt-1 flex items-center gap-1 font-mono">
                                 <Calendar size={8} /> {formatToWAT(t.created_at || t.createdAt, { month: 'short', day:'numeric', year: 'numeric'})}
                               </div>
                             </div>
                             <div className="shrink-0 flex flex-col items-end">
                                 <span className={`text-xl font-black italic tracking-tighter leading-none ${t.percentage >= 70 ? 'text-emerald-500' : t.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                   {Math.round(t.percentage || 0)}<span className="text-[10px] opacity-70">%</span>
                                 </span>
                             </div>
                           </div>
                           
                           <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 relative z-10">
                               <motion.div 
                                 initial={{ width: 0 }} viewport={{ once:true }} whileInView={{ width:`${t.percentage}%` }}
                                 transition={{ duration: 1, ease: 'easeOut' }}
                                 className={`h-full rounded-full ${t.percentage >= 70 ? 'bg-emerald-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                               />
                           </div>

                           <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full mt-auto relative z-10">
                             <div className="flex gap-4">
                               <div>
                                  <div className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest">Questions</div>
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{t.total_questions}</div>
                               </div>
                               <div>
                                  <div className="text-[7.5px] font-black uppercase text-slate-400 tracking-widest">Raw Score</div>
                                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{t.total_score}</div>
                               </div>
                             </div>
                             <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:border-blue-200 dark:group-hover:border-blue-800/50 group-hover:text-blue-500 transition-all text-slate-400">
                                <ChevronRight size={12} />
                             </div>
                           </div>
                         </motion.button>
                      ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
