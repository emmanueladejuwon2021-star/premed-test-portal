import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Send, Image, MessageSquare, Check, CheckCheck, X, Loader2, 
  ArrowLeft, BadgeCheck, Smartphone, CheckSquare, Sparkles, Phone, Mail
} from 'lucide-react';
import { toast } from '../Toast';

interface AdminChatViewProps {
  adminToken: string;
}

export default function AdminChatView({ adminToken }: AdminChatViewProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  // Mobile responsive helper: 'list' or 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastMsgCount = useRef(0);

  // Mark all messages as read for this candidate
  const markRead = async (studentId: string) => {
    if (!adminToken || !studentId) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ student_id: studentId })
      });

      // Reset count locally in students list to update sidebar immediately
      setStudents(prev => prev.map(s => {
        if (s._id === studentId) return { ...s, unreadCount: 0 };
        return s;
      }));
    } catch (e) {
      console.warn('Failed marking thread as read on admin', e);
    }
  };

  // 1. Fetch all students with unread message stats
  const fetchStudents = async (showLoading = false) => {
    if (showLoading) setLoadingList(true);
    try {
      const res = await fetch('/api/chat/admin/students', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (e) {
      console.warn('Failed fetching chat students list (handled gracefully)', e);
    } finally {
      if (showLoading) setLoadingList(false);
    }
  };

  // 2. Fetch thread messages for active candidate selection
  const fetchMessages = async (studentId: string) => {
    if (!studentId) return;
    try {
      const res = await fetch(`/api/chat/messages?student_id=${studentId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // If there are unread messages from student, sync read status
        const hasUnread = data.some((m: any) => m.sender_id !== 'admin' && !m.is_read);
        if (hasUnread) {
          markRead(studentId);
        }
      }
    } catch (e) {
      console.warn('Failed fetching active thread messages (handled gracefully)', e);
    }
  };

  // Initial loading, periodic polling and Socket wiring
  useEffect(() => {
    fetchStudents(true);

    // Hook up socket.io safely
    try {
      const socket: Socket = io();
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsSocketConnected(true);
      });

      socket.on('disconnect', () => {
        setIsSocketConnected(false);
      });

      socket.on('new-chat-message', (msg: any) => {
        // Whenever ANY new message is broadcasted, refresh totals in the left pane
        fetchStudents(false);

        // If active thread matches message's student, push and mark thread active
        if (
          (msg.sender_id === 'admin' && msg.receiver_id === selectedStudentId) ||
          (msg.sender_id === selectedStudentId && msg.receiver_id === 'admin')
        ) {
          setMessages(prev => {
            const exists = prev.some(m => m._id === msg._id);
            if (exists) return prev;
            return [...prev, msg];
          });

          // If message is from student and we are actively viewing this, mark as read immediately
          if (msg.sender_id !== 'admin' && selectedStudentId) {
            markRead(selectedStudentId);
          }
        }
      });

      // Listen for when student reads our replies
      socket.on('chat-read-status', (status: any) => {
        if (status.reader === 'student' && status.student_id === selectedStudentId) {
          setMessages(prev => prev.map(m => {
            if (m.sender_id === 'admin' && !m.is_read) {
              return { ...m, is_read: true };
            }
            return m;
          }));
        }
      });

      if (socket.connected) {
        setIsSocketConnected(true);
      }
    } catch (err) {
      console.error("Socket.io registration exception caught inside AdminChatView:", err);
    }

    // 3.5s background state refresh
    const interval = setInterval(() => {
      fetchStudents(false);
      if (selectedStudentId) {
        fetchMessages(selectedStudentId);
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [adminToken, selectedStudentId]);

  // Handle active candidate click
  const handleSelectStudent = (student: any) => {
    setSelectedStudentId(student._id);
    setSelectedStudentName(student.name);
    setMessages([]);
    fetchMessages(student._id);
    setMobileView('chat');
  };

  // Smooth scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Track manual scroll location
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShouldAutoScroll(isNearBottom);
    }
  };

  // Scroll on message state changes
  useEffect(() => {
    if (messages.length === 0) {
      lastMsgCount.current = 0;
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const sentByMe = lastMsg && lastMsg.sender_id === 'admin';

    if (lastMsgCount.current === 0) {
      scrollToBottom('auto');
    } else if (sentByMe || shouldAutoScroll) {
      scrollToBottom('smooth');
    }
    lastMsgCount.current = messages.length;
  }, [messages, shouldAutoScroll]);

  // Convert uploaded image to inline base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast('Size Limit', 'Maximum screenshot size is 8MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudentId || (!inputText.trim() && !imagePreview)) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          receiver_id: selectedStudentId,
          text: inputText,
          image_url: imagePreview || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setInputText('');
        setImagePreview(null);
        fetchStudents(false); // Update list overview after sending
      } else {
        toast('Sync Mismatch', 'Unresolved server error. Message aborted.', 'error');
      }
    } catch {
      toast('Sync Error', 'Network mismatch. Retrying packet.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Filter student list by Search input
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.matric_no || '').toLowerCase().includes(q) ||
        (s.department || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  // Group messages by date helper
  const groupMessagesByDate = (msgList: any[]) => {
    const groups: { [key: string]: any[] } = {};
    msgList.forEach(m => {
      if (!m.created_at) {
        const todayKey = 'Today';
        if (!groups[todayKey]) groups[todayKey] = [];
        groups[todayKey].push(m);
        return;
      }
      const d = new Date(m.created_at);
      const dateString = d.toDateString();
      
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      let key = dateString;
      if (dateString === today) {
        key = 'Today';
      } else if (dateString === yesterday) {
        key = 'Yesterday';
      } else {
        key = d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex h-[calc(100vh-190px)] max-h-[720px] w-full relative">
      
      {/* LEFT COLUMN: Student list pane (visible on desktop or on mobile when view is 'list') */}
      <div className={`w-full md:w-[320px] shrink-0 border-r border-slate-200 dark:border-zinc-800 flex flex-col bg-slate-50/50 dark:bg-zinc-950/40
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Search header container */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">Active Threads</h3>
            <span className="p-1 px-2.5 bg-blue-500/10 dark:bg-zinc-805 text-blue-600 dark:text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
              Live Support
            </span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Filter by Name, Matric, Dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Student list wrap */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-900 p-2 space-y-1 bg-slate-200/20 dark:bg-zinc-950">
          {loadingList && students.length === 0 ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 size={18} className="animate-spin text-blue-600" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-[11px] font-medium leading-normal">
              No registered candidates matched query.
            </div>
          ) : (
            filteredStudents.map((stud) => {
              const isSelected = selectedStudentId === stud._id;
              const hasUnread = stud.unreadCount > 0;
              const latest = stud.latestMessage;

              return (
                <button
                  key={stud._id}
                  onClick={() => handleSelectStudent(stud)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center justify-between gap-3 transition-all shrink-0 border border-transparent cursor-pointer
                    ${isSelected 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-900 border-slate-500/5'
                    }
                  `}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className={`text-xs font-serif font-black truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                        {stud.name || 'Anonymous'}
                      </h4>
                      {stud.department && (
                        <span className={`text-[8px] px-1 bg-slate-400/15 font-bold uppercase rounded ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {stud.department}
                        </span>
                      )}
                    </div>
                    
                    <div className={`text-[9px] font-mono leading-none mt-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {stud.matric_no}
                    </div>

                    {latest ? (
                      <p className={`text-[10px] truncate max-w-xs mt-1 font-medium ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-zinc-400'}`}>
                        {latest.sender_id === 'admin' ? 'You: ' : ''}
                        {latest.text || (latest.image_url ? '📷 Screenshot' : '')}
                      </p>
                    ) : (
                      <span className={`text-[9.5px] italic ${isSelected ? 'text-indigo-205' : 'text-slate-400'}`}>
                        No messages yet
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[8px] font-mono whitespace-nowrap ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {latest?.created_at ? new Date(latest.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>

                    {hasUnread && (
                      <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full animate-bounce shrink-0 shadow-sm border border-white dark:border-zinc-950">
                        {stud.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chat conversation viewport (visible on desktop or on mobile when view is 'chat') */}
      <div className={`flex-grow h-full flex flex-col bg-slate-50 dark:bg-zinc-950
        ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
      `}>
        {selectedStudentId ? (
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Conversations Active Header */}
            <div className="bg-gradient-to-r from-slate-900 to-zinc-900 dark:from-zinc-950 dark:to-zinc-90 w-full px-4 py-3 border-b border-slate-200 dark:border-zinc-850 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back button */}
                <button 
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded bg-zinc-900 transition-all shrink-0 cursor-pointer"
                  title="All Threads"
                >
                  <ArrowLeft size={14} />
                </button>
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold tracking-tight text-xs uppercase border border-indigo-500/25 shrink-0">
                    {selectedStudentName.substring(0, 2).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full animate-pulse shrink-0 ${isSocketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} title={isSocketConnected ? 'Connected to live support gateway' : 'Fallback polling active'}></span>
                </div>
                <div className="min-w-0">
                  <div className="font-serif font-black text-xs text-white truncate tracking-wide flex items-center gap-1">
                    {selectedStudentName}
                    <BadgeCheck size={12} className="text-blue-400 fill-blue-500/10 shrink-0" />
                  </div>
                  <div className="text-[9px] text-slate-300 font-medium truncate">
                    Candidate &bull; Diagnostic Terminal
                  </div>
                </div>
              </div>

              {/* View student properties quick card */}
              <div className="hidden lg:flex items-center gap-1 shrink-0">
                <span className="px-2 py-0.5 bg-zinc-800 text-slate-300 border border-zinc-700/50 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  Secure Socket
                </span>
                <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase tracking-wider ${isSocketConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  {isSocketConnected ? 'Live Connection' : 'Gateway Fallback'}
                </span>
              </div>
            </div>

            {/* Conversation Feed */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-zinc-950 flex flex-col"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.012) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            >
              {messages.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-center text-xs p-6 space-y-1">
                  <MessageSquare size={20} className="text-slate-300" />
                  <p className="font-medium">No previous logs found. Write first.</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  {Object.keys(groupedMessages).map((dateKey) => (
                    <div key={dateKey} className="space-y-3">
                      <div className="flex justify-center my-2.5">
                        <span className="bg-slate-200/60 dark:bg-zinc-800/85 text-slate-500 dark:text-zinc-400 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm select-none">
                          {dateKey}
                        </span>
                      </div>
                      {groupedMessages[dateKey].map((msg, index) => {
                        const isSelf = msg.sender_id === 'admin';
                        const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending';

                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={`msg_${msg._id || 'temp'}_${index}`} 
                            className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                          >
                            <div 
                              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-sm flex flex-col gap-1 border
                                ${isSelf 
                                  ? 'bg-indigo-600 text-white border-transparent rounded-tr-none' 
                                  : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border-slate-200/60 dark:border-zinc-800 rounded-tl-none'
                                }
                              `}
                            >
                              {/* Image Payload screenshot display */}
                              {msg.image_url && (
                                <div className="rounded-lg overflow-hidden border border-slate-200/20 max-w-full my-1">
                                  <img 
                                    src={msg.image_url} 
                                    alt="Diagnostic Inline Screenshot" 
                                    className="object-cover max-h-56 w-full rounded-lg"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}

                              {/* Text field */}
                              {msg.text && (
                                <p className="leading-snug break-words whitespace-pre-wrap">{msg.text}</p>
                              )}

                              {/* Details line */}
                              <div className="flex items-center gap-1 justify-end shrink-0 select-none self-end text-[9px] opacity-70 mt-0.5">
                                <span>{time}</span>
                                {isSelf && (
                                  msg.is_read ? (
                                    <CheckCheck size={11} className="text-indigo-200" />
                                  ) : (
                                    <Check size={11} className="text-slate-300" />
                                  )
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Base64 image attachment preview indicator */}
            <AnimatePresence>
              {imagePreview && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-100 dark:bg-zinc-900 p-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded overflow-hidden border border-slate-300 dark:border-zinc-700 shrink-0">
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Visual Attachment Preview" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">Screenshot Attached</div>
                      <div className="text-[8px] text-slate-400">Payload will dispatch to the student's terminal</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setImagePreview(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all"
                    title="Cancel Attachment"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input keyboard layout pane */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 flex items-center gap-1.5 shrink-0">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageChange}
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-indigo-500 dark:text-zinc-500 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 transition-all cursor-pointer"
                title="Attach Diagnostic Screenshot"
              >
                <Image size={18} />
              </button>
              
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type dynamic reply response text..."
                disabled={sending}
                className="flex-grow bg-slate-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all border border-transparent dark:border-zinc-700"
              />

              <button 
                type="submit"
                disabled={sending || (!inputText.trim() && !imagePreview)}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shrink-0 transition-all shadow-md focus:scale-95 cursor-pointer flex items-center justify-center inline-flex h-9 w-9"
                title="Send Message"
              >
                {sending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-[#070707] space-y-3">
            <div className="w-14 h-14 bg-slate-100 dark:bg-zinc-900/60 rounded-3xl flex items-center justify-center text-slate-400 dark:text-zinc-500 border border-slate-200/5 shadow-inner">
              <MessageSquare size={26} />
            </div>
            <div>
              <h4 className="font-serif font-black text-xs text-slate-850 dark:text-slate-200 uppercase tracking-tight">Support Terminal Idle</h4>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed mt-1">
                Select an active candidate stream from the thread sidebar list to start exchanging real-time inquiries, screenshot payloads, and diagnostic support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
