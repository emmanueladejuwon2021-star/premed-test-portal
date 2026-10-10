import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  GraduationCap, User, BookMarked, Award, Calendar, 
  LogOut, Menu, ChevronLeft, Layers, Megaphone, Database,
  Mail, Loader2, Sword, Lock, MessageSquare, Home, Bell, HelpCircle, Brain
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AnnouncementsModal from './AnnouncementsModal';
import { toast } from './Toast';

export default function DashboardLayout({ children, viewTitle = "Student Portal" }: { children: React.ReactNode, viewTitle?: string }) {
  const { student, setStudent, setToken, token } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [hasUnreadAnnouncements, setHasUnreadAnnouncements] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // One-time Emergency Recovery Email Configuration
  const [emailInput, setEmailInput] = useState('');
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  useEffect(() => {
    if (student && !student.email) {
      const timer = setTimeout(() => {
        setShowEmailPrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowEmailPrompt(false);
    }
  }, [student]);

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStr = emailInput.trim();
    if (!emailStr || !emailStr.includes('@') || !emailStr.includes('.')) {
      toast('Format Error', 'Please enter a valid email address.', 'error');
      return;
    }

    setIsLinkingEmail(true);
    try {
      const res = await fetch('/api/student/update', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ email: emailStr })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStudent({ ...student!, email: emailStr });
        toast('Recovery Linked', 'One-time recovery email registered successfully.', 'success');
        setShowEmailPrompt(false);
      } else {
        toast('Platform Notification', data.error || 'Failed to update email address.', 'error');
      }
    } catch {
      toast('Sync Error', 'Failed to register recovery details. Please check connection.', 'error');
    } finally {
      setIsLinkingEmail(false);
    }
  };

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => {
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return [];
        }
        return res.json().catch(() => []);
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const latestId = data[0].id;
          const lastReadId = localStorage.getItem('FCF_LastReadAnnouncementId');
          if (!lastReadId || String(lastReadId) !== String(latestId)) {
             setHasUnreadAnnouncements(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    if (!token) return;
    const fetchUnread = () => {
      fetch('/api/chat/unread-count', {
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(res => res.json())
      .then(data => {
        if (typeof data.unreadCount === 'number') {
          setUnreadChatCount(data.unreadCount);
        }
      })
      .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 4000); // 4 seconds backup polling
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    if (student) {
      fetch('/api/telemetry/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: "Student Logout",
          details: `Student logged out of the application`,
          studentId: student.id
        })
      }).catch(e => console.error("Failed to log logout", e));
    }
    setStudent(null);
    setToken(null);
    localStorage.removeItem('FCF_Token');
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Home Dashboard', icon: Home },
    { path: '/tests', label: 'Practice CBT', icon: BookMarked },
    { path: '/courses', label: 'Classroom Hub', icon: Database },
    { path: '/active-study', label: 'AI Active Study', icon: Brain },
    { path: '/history', label: 'My Results', icon: Award },
    { path: '/leaderboard', label: 'Rankings', icon: Layers },
    { path: '/chat', label: 'Support Chat', icon: MessageSquare },
    { path: '/profile', label: 'Profile Settings', icon: User },
  ];

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-black flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Mobile Top Bar is replaced by unified persistent header on main pane */}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             onClick={() => setIsMobileMenuOpen(false)}
             className="fixed md:hidden inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
           />
        )}
      </AnimatePresence>

      {/* Sidebar Navigator */}
      <aside 
        className={`fixed md:relative top-0 left-0 z-50 h-full md:h-screen border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-black flex flex-col items-stretch overflow-hidden transition-transform duration-300 ease-in-out w-[240px] shrink-0
          ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0 shadow-none md:shadow-none'}
        `}
      >
        <div className={`px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between`}>
          <div className="flex items-center gap-2.5 w-44 shrink-0">
             <div className="w-8 h-8 bg-blue-600 text-white border border-blue-500 shadow-sm rounded-lg flex items-center justify-center shrink-0">
               <img src="/logo.svg" className="w-full h-full p-1" alt="Logo" />
             </div>
             <div className="flex flex-col min-w-0">
               <h1 className="font-bold text-xs tracking-tight text-slate-900 dark:text-slate-100 truncate">{student?.matric_no || 'PremedTestPortal'}</h1>
               <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{student?.department || 'Candidate'}</div>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-900 p-1 rounded">
            <ChevronLeft size={14} />
          </button>
        </div>

         <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
           {navItems.map(item => {
             const isActive = location.pathname.startsWith(item.path);
             return (
               <button 
                 key={item.path}
                 onClick={() => { (() => {
                    if (item.path === '/med-combat') {
                      // toast('Combat Protocol Offline', 'Med Combat will be Opened 09/06/26', 'info');
                      // return;
                    }
                    navigate(item.path);
                    setIsMobileMenuOpen(false);
                  })() }}
                 className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all shrink-0
                   ${isActive 
                     ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                     : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#050505] hover:text-slate-900 dark:hover:text-slate-100'
                   } 
                 `}
                 title={item.label}
               >
                 <div className="flex items-center gap-2.5">
                   <item.icon size={15} className="shrink-0" />
                   <span className="whitespace-nowrap">{item.label}</span>
                 </div>
                 {item.path === '/chat' && unreadChatCount > 0 ? (
                    <span className="ml-auto bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none shrink-0 animate-pulse">
                      {unreadChatCount}
                    </span>
                  ) : item.path === '/med-combat' && <Lock size={11} className="text-amber-500 dark:text-amber-400 shrink-0 ml-auto mr-1" />}
               </button>
             )
           })}

           <button 
             onClick={() => { 
               setIsAnnouncementsOpen(true); 
               setIsMobileMenuOpen(false); 
               setHasUnreadAnnouncements(false);
               fetch('/api/announcements').then(res=>res.json()).then(data => {
                 if (Array.isArray(data) && data.length > 0) localStorage.setItem('FCF_LastReadAnnouncementId', String(data[0].id));
               });
             }}
             className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all shrink-0 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#050505] hover:text-slate-900 dark:hover:text-slate-100`}
             title="Announcements" style={{display: "none"}}
           >
             <div className="relative">
               <Megaphone size={15} className="shrink-0" />
               {hasUnreadAnnouncements && (
                 <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-950 animate-pulse"></span>
               )}
             </div>
             <span className="whitespace-nowrap">Announcements</span>
           </button>
        </nav>
        
        <footer className={`p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col gap-1.5`}>
           <div className={`flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800`}>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Theme</span>
              <ThemeToggle />
           </div>
           <button onClick={handleLogout} title="Disconnect" className={`w-full py-2 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all mb-1`}>
             <LogOut size={15} className="shrink-0" /> <span className="whitespace-nowrap">Disconnect</span>
           </button>
           <div className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium">
              Powered by <span className="font-bold text-slate-600 dark:text-slate-300">Premed Tutorials</span>
           </div>
        </footer>
      </aside>

      {/* Main Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden w-full bg-slate-50 dark:bg-black flex flex-col">
        <AnnouncementsModal isOpen={isAnnouncementsOpen} onClose={() => setIsAnnouncementsOpen(false)} />
        
        {/* Persistent Unified Responsive Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-white dark:bg-[#070707] border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-8 py-3.5 backdrop-blur-md bg-white/95 dark:bg-[#070707]/95 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Menu size={18} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">{viewTitle}</h2>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:inline-block leading-none mt-0.5">Premed CBT Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                toast('Portal Help Guide', 'Select any dashboard learning card to launch the exam simulation, study notes, question lookup engines, or peer challenges.', 'info');
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="Help"
            >
              <HelpCircle size={16} />
            </button>

            {/* Notification Bell Icon */}
            <button 
              onClick={() => {
                setIsAnnouncementsOpen(true);
                setHasUnreadAnnouncements(false);
                fetch('/api/announcements').then(res=>res.json()).then(data => {
                  if (Array.isArray(data) && data.length > 0) localStorage.setItem('FCF_LastReadAnnouncementId', String(data[0].id));
                });
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full transition-colors relative text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="Recent Notifications"
            >
              <Bell size={16} />
              {hasUnreadAnnouncements && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-black animate-pulse"></span>
              )}
            </button>

            <div className="hidden sm:block shrink-0 h-4 w-px bg-slate-200 dark:bg-slate-800" />
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] uppercase">
                {student?.name ? student.name[0] : 'C'}
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 max-w-[80px] truncate">{student?.name?.split(' ')[0] || 'Candidate'}</span>
            </div>
          </div>
        </header>

         <div className="max-w-7xl xl:max-w-7xl 2xl:max-w-[1536px] w-full mx-auto p-3 md:p-8 xl:p-10 2xl:p-12 pt-4 md:pt-6 flex-1 flex flex-col">
            {children}
         </div>
      </main>

      {/* One-Time Recovery Email Modal Overlay */}
      <AnimatePresence>
        {showEmailPrompt && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="max-w-md w-full bg-white dark:bg-[#070707] border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="space-y-5 text-center">
                {/* Visual Icon Header */}
                <div className="mx-auto w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Mail size={22} />
                </div>

                <div className="space-y-1.5Packed">
                  <h3 className="text-base font-serif font-black tracking-tight text-slate-900 dark:text-white">
                    Emergency Recovery Setup
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto font-medium">
                    To prevent losing access to your portal, please link your email address. If you ever forget your registration details, retrieve them instantly!
                  </p>
                </div>

                <form onSubmit={handleLinkEmail} className="space-y-4 pt-1">
                  <div className="relative text-left">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={15} />
                    </div>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. candidate@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      disabled={isLinkingEmail}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isLinkingEmail || !emailInput.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    {isLinkingEmail ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                      </span>
                    ) : (
                      "Set Recovery Email"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
