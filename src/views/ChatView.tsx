import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import DashboardLayout from '../components/DashboardLayout';
import { toast } from '../components/Toast';
import { 
  Send, Image, Paperclip, Check, CheckCheck, Loader2, MessageSquare, 
  ArrowLeft, X, Trash2, Smartphone, ShieldCheck
} from 'lucide-react';

export default function ChatView() {
  const { student, token } = useAppContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const lastMsgCount = useRef(0);

  // Sync / mark messages as read in backend
  const markRead = async () => {
    if (!token) return;
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (e) {
      console.warn('Failed marking thread as read', e);
    }
  };

  // Fetch student chat history
  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chat/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // If there are unread messages from admin, sync read status
        const hasUnread = data.some((m: any) => m.sender_id === 'admin' && !m.is_read);
        if (hasUnread) {
          markRead();
        }
      }
    } catch (e) {
      console.warn('Failed fetching messages (handled gracefully)', e);
    }
  };

  // Initial load and backup polling + Socket.io
  useEffect(() => {
    fetchMessages();

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
        // If the message is related to this student, push to list
        if (
          (msg.sender_id === 'admin' && msg.receiver_id === student?.id) ||
          (msg.sender_id === student?.id && msg.receiver_id === 'admin')
        ) {
          setMessages(prev => {
            // Prevent duplicates
            const exists = prev.some(m => m._id === msg._id);
            if (exists) return prev;
            return [...prev, msg];
          });

          // If the message came from admin, clear it immediately since we're viewing this chat
          if (msg.sender_id === 'admin') {
            markRead();
          }
        }
      });

      // Listen for when admin reads our sent messages
      socket.on('chat-read-status', (status: any) => {
        if (status.reader === 'admin' && status.student_id === student?.id) {
          setMessages(prev => prev.map(m => {
            if (m.sender_id !== 'admin' && !m.is_read) {
              return { ...m, is_read: true };
            }
            return m;
          }));
        }
      });

      // Quick fallback connection check
      if (socket.connected) {
        setIsSocketConnected(true);
      }
    } catch (err) {
      console.error("Socket.io registration exception caught inside ChatView:", err);
    }

    // Polling backup every 3.5 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3500);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, student]);

  // Smooth scroll to bottom handler
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  // Track manual scrolls to check if user is near bottom
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShouldAutoScroll(isNearBottom);
    }
  };

  // Scroll to bottom on messages updates
  useEffect(() => {
    if (messages.length === 0) {
      lastMsgCount.current = 0;
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const sentByMe = lastMsg && lastMsg.sender_id !== 'admin';

    if (lastMsgCount.current === 0) {
      // First load: instantly snap
      scrollToBottom('auto');
    } else if (sentByMe || shouldAutoScroll) {
      // User sent it or is near bottom: smooth scroll
      scrollToBottom('smooth');
    }
    lastMsgCount.current = messages.length;
  }, [messages]);

  // Convert uploaded image to base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast('File Too Large', 'Maximum image size allowed is 8MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !imagePreview) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: inputText,
          image_url: imagePreview || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistically add/replace incoming from socket
        setMessages(prev => {
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setInputText('');
        setImagePreview(null);
      } else {
        toast('Sending Failed', 'Failed to transmit message as required.', 'error');
      }
    } catch {
      toast('Sync Error', 'Network error. Attempting sync back.', 'error');
    } finally {
      setSending(false);
    }
  };

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
    <DashboardLayout viewTitle="Portal Support Chat">
      <div className="flex-1 flex flex-col h-[calc(100vh-140px)] max-h-[720px] bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden max-w-lg mx-auto w-full">
        {/* Support Header in Telegram visual style */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-zinc-900 dark:to-zinc-800 px-4 py-3 border-b border-blue-500/10 dark:border-zinc-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-white flex items-center justify-center font-bold tracking-tight uppercase shadow-inner border border-white/10 text-sm">
                AD
              </div>
              <span 
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-100 dark:border-zinc-900 rounded-full animate-pulse ${isSocketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                title={isSocketConnected ? 'Connected to live support gateway' : 'Fallback polling active'}
              />
            </div>
            <div>
              <div className="font-bold text-xs text-white tracking-wide">Premed Support Admin</div>
              <div className="text-[10px] text-blue-100 dark:text-zinc-400 font-medium tracking-normal">
                {isSocketConnected ? 'Online • Instant Help Center' : 'Live Gateway Reconnecting...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 bg-white/10 dark:bg-zinc-800 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
              Student Mode
            </span>
          </div>
        </div>

        {/* Message Panel Area */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-[#070707] flex flex-col"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.015) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
        >
          {messages.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-400 dark:text-zinc-500">
                <MessageSquare size={24} />
              </div>
              <div>
                <h4 className="font-serif font-black text-xs text-slate-800 dark:text-slate-200">Start a Thread with Admin</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal max-w-xs mt-1">
                  Have inquiries, technical diagnostic issues, or question disputes? Send a chat instantly. You can upload relevant screenshots up to 8MB.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {Object.keys(groupedMessages).map((dateKey) => (
                <div key={dateKey} className="space-y-3">
                  <div className="flex justify-center my-2.5">
                    <span className="bg-slate-200/60 dark:bg-zinc-800/80 text-slate-500 dark:text-zinc-400 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm select-none">
                      {dateKey}
                    </span>
                  </div>
                  {groupedMessages[dateKey].map((msg, index) => {
                    const isSelf = msg.sender_id !== 'admin';
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
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-500/10 rounded-tr-none' 
                              : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-zinc-800 rounded-tl-none'
                            }
                          `}
                        >
                          {/* Optional Sender Tag for Admin inside students' screen */}
                          {!isSelf && (
                            <span className="text-[9px] font-black tracking-normal text-blue-600 dark:text-blue-400 mb-0.5">
                              Support Staff
                            </span>
                          )}

                          {/* Render base64 screenshot if attached */}
                          {msg.image_url && (
                            <div className="rounded-lg overflow-hidden border border-slate-200/20 max-w-full my-1">
                              <img 
                                src={msg.image_url} 
                                alt="Uploaded visual payload" 
                                className="object-cover max-h-56 w-full rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Text details if provided */}
                          {msg.text && (
                            <p className="leading-snug break-words whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {/* Time and unread indicators */}
                          <div className="flex items-center gap-1 justify-end shrink-0 select-none self-end text-[9px] opacity-70 mt-0.5">
                            <span>{time}</span>
                            {isSelf && (
                              msg.is_read ? (
                                <CheckCheck size={11} className="text-emerald-300" />
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

        {/* Dynamic Media Preview Ribbon */}
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
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Selected Attachment Preview" referrerPolicy="no-referrer" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">Screenshot Ready</div>
                  <div className="text-[8px] text-slate-400">Payload will submit inline</div>
                </div>
              </div>
              <button 
                onClick={() => setImagePreview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all"
                title="Cancel Image"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Chat Message Form Wrapper */}
        <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-1.5 shrink-0">
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
            className="p-2 text-slate-400 hover:text-blue-500 dark:text-zinc-500 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 shrink-0 transition-all cursor-pointer"
            title="Upload Image"
          >
            <Image size={18} />
          </button>
          
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a support request message..."
            disabled={sending}
            className="flex-grow bg-slate-100 dark:bg-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all border border-transparent dark:border-zinc-700"
          />

          <button 
            type="submit"
            disabled={sending || (!inputText.trim() && !imagePreview)}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-45 text-white rounded-xl shrink-0 transition-all shadow-md focus:scale-95 cursor-pointer flex items-center justify-center inline-flex h-9 w-9"
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
    </DashboardLayout>
  );
}
