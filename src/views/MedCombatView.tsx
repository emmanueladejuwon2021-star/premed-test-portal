import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import DashboardLayout from '../components/DashboardLayout';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Zap, ChevronLeft } from 'lucide-react';
import StudentNotesCbt from '../components/StudentNotesCbt';

let socket: Socket;
try {
  socket = io();
} catch (e) {
  console.error("Socket.io connection initialization failed globally inside MedCombatView:", e);
  socket = {
    on: () => {},
    off: () => {},
    emit: () => {},
    disconnect: () => {}
  } as any;
}

export default function MedCombatView() {
  const { student, token } = useAppContext();
  const [gameState, setGameState] = useState<'home' | 'lobby' | 'playing' | 'results'>('home');
  const [subTab, setSubTab] = useState<'combat' | 'worksheets'>('combat');
  const [homeStep, setHomeStep] = useState<'setup' | 'mode' | 'create-team' | 'create-course' | 'join-team' | 'join-code'>('setup');
  const [tempTeam, setTempTeam] = useState<'A' | 'B' | null>(null);
  const [preferredTeamName, setPreferredTeamName] = useState('');
  
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [memberName, setMemberName] = useState(student?.name || '');
  const [team, setTeam] = useState<'A' | 'B' | null>(null);
  const [roomData, setRoomData] = useState<any>(null);

  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    fetch('/api/courses').then(res => res.json()).then(setCourses);
    
    if (student?.name) {
      socket.emit('register-student', student.name);
    }

    socket.on('online-students-update', setOnlineStudents);
    socket.on('active-rooms-update', setActiveRooms);
    socket.on('pair-invite', (data) => setInvite(data));
    socket.on('room-update', (data) => setRoomData(data));
    socket.on('game-update', (data) => {
        setRoomData(data);
        if (data.winner) setGameState('results');
        else if (data.gameStarted) setGameState('playing');
    });
    socket.on('room-created', (code) => {
      setRoomCode(code);
      // Auto-join the team the creator picked
      if (tempTeam && student?.name) {
          socket.emit('join-team', { roomCode: code, team: tempTeam, memberName: student.name });
          setTeam(tempTeam);
          setGameState('lobby');
      } else {
          setGameState('lobby');
      }
    });

    return () => {
      socket.off('room-update');
      socket.off('game-update');
      socket.off('room-created');
      socket.off('online-students-update');
      socket.off('pair-invite');
    };
  }, [tempTeam, student]);

  const createRoom = () => {
    if (!selectedCourseId) return;
    socket.emit('request-create-room', selectedCourseId);
  };

  const joinTeam = (t: 'A' | 'B') => {
    if (!memberName.trim()) return;
    socket.emit('join-team', { roomCode, team: t, memberName, teamName: preferredTeamName });
    setTeam(t);
    setGameState('lobby');
  };

  const startMatch = () => {
    socket.emit('start-match', roomCode);
    document.documentElement.requestFullscreen().catch(err => console.log(err));
  };

  const agreeAnswer = () => {
    socket.emit('agree-answer', { roomCode, team, memberId: socket.id });
  };

  const selectAnswer = (answer: string) => {
    if (team !== roomData.turn) return;
    socket.emit('select-answer', { roomCode, team, memberId: socket.id, answer });
  };

  const sendInvite = (targetSocketId: string) => {
    if (!roomCode) return;
    socket.emit('invite-player', { targetSocketId, fromName: student?.name, roomCode });
  };

  if (gameState === 'home') return (
    <DashboardLayout viewTitle="HQ | Med Combat">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Compact Sub-Tab Navigation Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-1 rounded-xl max-w-sm mb-6">
          <button 
            onClick={() => setSubTab('combat')}
            className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              subTab === 'combat' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Peer Battle Royale
          </button>
          <button 
            onClick={() => setSubTab('worksheets')}
            className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              subTab === 'worksheets' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Notes MCQ Practice
          </button>
        </div>

        {subTab === 'worksheets' ? (
          <StudentNotesCbt token={token || ''} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Profile & Deployment */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Med Combat</h1>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-8 bg-slate-900" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Readiness Level: High</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {homeStep === 'setup' ? (
                <motion.div 
                  key="setup" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-6 rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                >
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">01. OPERATOR IDENTIFICATION</div>
                  <div className="space-y-5">
                    <div className="group">
                      <label className="text-[8px] font-black text-slate-900 uppercase ml-1 block mb-1.5 transition-colors group-focus-within:text-blue-600">Callsign / Name</label>
                      <input 
                        value={memberName} onChange={e => setMemberName(e.target.value)} 
                        placeholder="MAVERICK_01" 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-slate-900 transition-all font-mono" 
                      />
                    </div>
                    <div className="group">
                      <label className="text-[8px] font-black text-slate-900 uppercase ml-1 block mb-1.5">Sector / Team</label>
                      <input 
                        value={preferredTeamName} onChange={e => setPreferredTeamName(e.target.value)} 
                        placeholder="ALPHA_STRIKER" 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:bg-white focus:border-slate-900 transition-all font-mono" 
                      />
                    </div>
                    <button 
                      disabled={!memberName || !preferredTeamName} 
                      onClick={() => setHomeStep('mode')}
                      className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${memberName && preferredTeamName ? 'bg-slate-900 text-white hover:bg-black active:translate-y-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                      Authenticate Access
                    </button>
                  </div>
                </motion.div>
              ) : homeStep === 'mode' ? (
                <motion.div 
                  key="mode" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Zap size={120} /></div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Authenticated: {memberName}</span>
                    </div>
                    <button 
                      onClick={() => setHomeStep('create-team')}
                      className="w-full bg-white text-slate-950 p-5 rounded-2xl flex items-center justify-between group hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-xs font-black uppercase leading-none">Establish HQ</div>
                        <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Start new combat hub</div>
                      </div>
                      <Sword size={18} className="group-hover:rotate-12 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setHomeStep('join-team')}
                      className="w-full bg-slate-800 text-white p-5 rounded-2xl flex items-center justify-between group hover:bg-slate-700 transition-colors"
                    >
                      <div className="text-left">
                        <div className="text-xs font-black uppercase leading-none">Direct Ingress</div>
                        <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Manual code entry</div>
                      </div>
                      <Zap size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button onClick={() => setHomeStep('setup')} className="w-full py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Revision Identification</button>
                  </div>
                </motion.div>
              ) : (homeStep === 'create-team' || homeStep === 'join-team') ? (
                <motion.div 
                    key="team-select" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                >
                    <button onClick={() => setHomeStep('mode')} className="text-slate-400 hover:text-slate-900 transition flex items-center gap-1 text-[8px] font-black uppercase tracking-widest mb-6">
                        <ChevronLeft size={10} /> Back
                    </button>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">SQUAD ASSIGNMENT</div>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => { setTempTeam('A'); setHomeStep(homeStep === 'create-team' ? 'create-course' : 'join-code'); }}
                            className="h-32 bg-blue-600 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-700 transition"
                        >
                            <span className="text-2xl font-black text-white">A</span>
                            <span className="text-[8px] font-black text-blue-200 tracking-widest uppercase">BLUE</span>
                        </button>
                        <button 
                            onClick={() => { setTempTeam('B'); setHomeStep(homeStep === 'create-team' ? 'create-course' : 'join-code'); }}
                            className="h-32 bg-red-600 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-700 transition"
                        >
                            <span className="text-2xl font-black text-white">B</span>
                            <span className="text-[8px] font-black text-red-200 tracking-widest uppercase">RED</span>
                        </button>
                    </div>
                </motion.div>
              ) : homeStep === 'create-course' ? (
                <motion.div 
                    key="course-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                >
                    <button onClick={() => setHomeStep('create-team')} className="text-slate-400 hover:text-slate-900 transition flex items-center gap-1 text-[8px] font-black uppercase tracking-widest mb-6">
                        <ChevronLeft size={10} /> Back
                    </button>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">MISSION DOMAIN</div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {courses.map(course => (
                            <button 
                                key={course.id} onClick={() => setSelectedCourseId(course.id)}
                                className={`w-full p-4 rounded-xl border text-left transition-all ${selectedCourseId === course.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50'}`}
                            >
                                <div className="font-black text-[10px] uppercase">{course.code}</div>
                            </button>
                        ))}
                    </div>
                    <button 
                        disabled={!selectedCourseId} onClick={createRoom}
                        className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100"
                    >
                        Initialize Signal
                    </button>
                </motion.div>
              ) : homeStep === 'join-code' ? (
                <motion.div 
                  key="join-code" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]"
                >
                    <button onClick={() => setHomeStep('join-team')} className="text-slate-400 hover:text-slate-900 transition flex items-center gap-1 text-[8px] font-black uppercase tracking-widest mb-6">
                        <ChevronLeft size={10} /> Back
                    </button>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4">SIGNAL INTERCEPT</div>
                    <input 
                        value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="CODE_X" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xl font-black uppercase tracking-widest outline-none focus:border-slate-900"
                    />
                    <button 
                        onClick={() => joinTeam(tempTeam!)} disabled={!roomCode}
                        className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-50"
                    >
                        Establish Uplink
                    </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Invite Alert - Compact Internal */}
            {invite && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-600 p-4 rounded-2xl text-white flex items-center justify-between shadow-xl shadow-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center"><Zap size={14} /></div>
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-widest leading-none">Signal From</div>
                    <div className="text-[10px] font-black uppercase">{invite.fromName}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setRoomCode(invite.roomCode); setHomeStep('join-team'); setTempTeam('A'); setInvite(null); }} className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-[9px] font-black uppercase">Intercept</button>
                  <button onClick={() => setInvite(null)} className="p-1 px-2 hover:bg-blue-500 rounded-lg transition-colors"><Zap size={12} className="rotate-45" /></button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Panel: Live Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Hubs Grid */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Engagement Signals</h4>
                </div>
                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{activeRooms.length} FOUND</span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {activeRooms.filter(r => !r.gameStarted).map(r => (
                  <button 
                    key={r.code} onClick={() => { setRoomCode(r.code); setHomeStep('join-team'); }} 
                    className="w-full group bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:bg-white hover:border-blue-600 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex flex-col items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <span className="text-[8px] font-black opacity-50 mb-0.5">HUB</span>
                        <span className="text-sm font-black tracking-tighter">{r.code.substring(0, 3)}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{r.code}</div>
                        <div className="flex gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500" />
                            <span className="text-[7px] font-black text-slate-400 uppercase">SQUAD A: {r.teamA}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-red-500" />
                            <span className="text-[7px] font-black text-slate-400 uppercase">SQUAD B: {r.teamB}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-600 group-hover:border-blue-100">
                      <Zap size={14} />
                    </div>
                  </button>
                ))}
                {activeRooms.filter(r => !r.gameStarted).length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-3xl opacity-30">
                    <div className="text-2xl mb-2">📡</div>
                    <div className="text-[10px] font-black uppercase tracking-widest">No Active Channels</div>
                  </div>
                )}
              </div>
            </div>

            {/* Operatives & Comms */}
            <div className="flex flex-col gap-6">
              {/* Online Operatives */}
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Available Ops</h4>
                  <div className="flex -space-x-2">
                    {onlineStudents.slice(0, 3).map(s => (
                      <div key={s.id} className="w-6 h-6 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[8px] font-black text-slate-400">{s.name[0]}</div>
                    ))}
                    {onlineStudents.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-950 text-white text-[7px] flex items-center justify-center font-black">+{onlineStudents.length - 3}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {onlineStudents.map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-2 group">
                      <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-colors">{s.name[0]}</div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-slate-900 uppercase truncate leading-none">{s.name}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className={`w-1 h-1 rounded-full ${s.status === 'available' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                          <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">{s.status === 'available' ? 'STANDBY' : 'ENGAGED'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tactical Quick Start */}
              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col justify-between relative overflow-hidden h-48 group">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-1">SYSTEM_INFO</div>
                  <h3 className="text-lg font-black leading-tight uppercase italic group-hover:scale-105 transition-transform origin-left">Launch Direct<br />Combat Protocols</h3>
                </div>
                <button onClick={() => setHomeStep('create-team')} className="relative z-10 bg-white text-slate-950 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-blue-400 transition-colors shadow-2xl">Initialize Now</button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  if (gameState === 'lobby') return (
    <DashboardLayout viewTitle="Combat Readiness">
      <div className="flex flex-col gap-4 max-w-5xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-4">
            {/* Left: Hub Intel */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="bg-slate-950 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform"><Sword size={60} /></div>
                    <div className="relative z-10">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Hub Code</span>
                        <div className="text-4xl font-black tracking-widest mt-1 group-hover:text-blue-400 transition-colors">{roomCode}</div>
                        
                        <div className="mt-6 flex gap-2">
                             <div className="flex -space-x-1.5 overflow-hidden">
                                {[...roomData?.teamA, ...roomData?.teamB].map((m: any) => (
                                    <div key={m.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-950 bg-slate-800 flex items-center justify-center text-[8px] font-black uppercase text-slate-400">
                                        {m.name[0]}
                                    </div>
                                ))}
                             </div>
                             <div className="text-[9px] font-black self-center text-slate-500 uppercase tracking-widest">
                                {roomData?.teamA.length + roomData?.teamB.length} / 4 Ops
                             </div>
                        </div>
                    </div>
                </div>

                {/* Reinforcements - Compact */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Reinforcements</h4>
                        </div>
                    </div>
                    
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                        {onlineStudents.filter(s => s.id !== socket.id).map(s => (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[9px] font-black text-slate-400 relative">
                                        <div className={`absolute w-2 h-2 rounded-full border-2 border-white -top-0.5 -right-0.5 ${s.status === 'available' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                        {s.name[0]}
                                    </div>
                                    <div className="text-[9px] font-black text-slate-800 uppercase truncate max-w-[80px]">{s.name}</div>
                                </div>
                                <button disabled={s.status !== 'available'} onClick={() => sendInvite(s.id)} className="p-1.5 rounded-lg bg-white shadow hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30">
                                    <Zap size={10} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Squads - Compact */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden flex flex-col min-h-[220px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">A</div>
                                <h3 className="text-base font-black text-slate-900 truncate max-w-[120px]">{roomData?.teamNames.A}</h3>
                            </div>
                        </div>
                        <div className="space-y-2 flex-1">
                            {roomData?.teamA.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100/30">
                                    <span className="font-black text-[10px] text-blue-900 uppercase tracking-tighter truncate">{m.name} {m.id === socket.id && ' (HQ)'}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden flex flex-col min-h-[220px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-sm shadow-md">B</div>
                                <h3 className="text-base font-black text-slate-900 truncate max-w-[120px]">{roomData?.teamNames.B}</h3>
                            </div>
                        </div>
                        <div className="space-y-2 flex-1">
                            {roomData?.teamB.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100/30">
                                    <span className="font-black text-[10px] text-red-900 uppercase tracking-tighter truncate">{m.name} {m.id === socket.id && ' (HQ)'}</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

                 <button 
                    onClick={startMatch} disabled={!roomData?.teamA.length || !roomData?.teamB.length}
                    className={`w-full p-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl transition overflow-hidden ${(!roomData?.teamA.length || !roomData?.teamB.length) ? 'bg-slate-100 text-slate-300' : 'bg-slate-950 text-white hover:bg-black active:scale-98'}`}
                >
                    INITIATE ENGAGEMENT
                </button>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );

  if (gameState === 'results') return (
    <DashboardLayout viewTitle="Mission Complete">
        <div className="max-w-md mx-auto text-center py-12">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
                <div className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-2">Combat Verdict</div>
                <h2 className={`text-6xl font-black mb-6 ${roomData.winner === 'A' ? 'text-blue-600' : 'text-red-600'}`}>
                    TEAM {roomData.winner} WINS
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                        <div className="text-xs font-bold text-blue-400 uppercase">Blue Score</div>
                        <div className="text-3xl font-black text-blue-900">{roomData.scores.A}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl">
                        <div className="text-xs font-bold text-red-400 uppercase">Red Score</div>
                        <div className="text-3xl font-black text-red-900">{roomData.scores.B}</div>
                    </div>
                </div>

                <button onClick={() => setGameState('home')} className="w-full p-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition active:scale-95">
                    RETURN TO HQ
                </button>
            </motion.div>
        </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout viewTitle="Live Ops">
      <div className="flex flex-col gap-4 max-w-6xl mx-auto px-4 pb-12">
        {/* Battle Header - Ultra Compact */}
        <header className="px-6 py-3 bg-white rounded-[1.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500" />
          <div className="flex justify-between items-center relative z-10">
            {/* Team A */}
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shadow-md ${roomData?.turn === 'A' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}>A</div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{roomData?.teamNames.A}</span>
                        <span className="text-[10px] font-black text-slate-800">{roomData?.health.A}%</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-50 rounded-full overflow-hidden mt-1"><motion.div animate={{ width: `${roomData?.health.A}%` }} className="h-full bg-blue-500" /></div>
                    <div className="text-[8px] font-black text-slate-400 mt-1 uppercase text-left">PTS: {roomData?.scores.A}</div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="px-2 py-0.5 bg-slate-900 rounded text-[7px] font-black text-white uppercase tracking-widest animate-pulse">COMBAT</div>
                <div className="text-[7px] font-black text-slate-300 uppercase mt-1 text-center">TARGET: {roomData?.targetScore}</div>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-4 flex-row-reverse text-right">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shadow-md ${roomData?.turn === 'B' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-300'}`}>B</div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-row-reverse">
                        <span className="text-[9px] font-black text-red-500 uppercase">{roomData?.teamNames.B}</span>
                        <span className="text-[10px] font-black text-slate-800">{roomData?.health.B}%</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-50 rounded-full overflow-hidden mt-1 self-end"><motion.div animate={{ width: `${roomData?.health.B}%` }} className="h-full bg-red-500" /></div>
                    <div className="text-[8px] font-black text-slate-400 mt-1 uppercase">PTS: {roomData?.scores.B}</div>
                </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Sidebars - Compact */}
          <div className="col-span-3 flex flex-col gap-3 sticky top-4">
            <div className={`p-4 rounded-3xl border transition-all ${roomData?.turn === 'A' ? 'border-blue-500 bg-blue-50/10 shadow-lg shadow-blue-50' : 'border-slate-50 bg-slate-50/20 opacity-40'}`}>
                <h3 className="text-[8px] font-black text-blue-600 uppercase mb-3">SQUAD A</h3>
                <div className="space-y-1.5">
                    {roomData?.teamA.map((m: any) => (
                        <div key={m.id} className="text-[8px] p-2 bg-white rounded-lg border border-slate-100 flex justify-between items-center">
                            <span className="font-bold uppercase truncate max-w-[50px]">{m.name}</span>
                            <div className="flex gap-1 items-center">
                                {roomData.teamAPicks[m.id] && <span className="text-[7px] font-black text-blue-600">{roomData.teamAPicks[m.id].answer.toUpperCase()}</span>}
                                <span>{roomData.teamAPicks[m.id] ? (roomData.teamAPicks[m.id].agreed ? '✅' : '⏳') : '💤'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl flex flex-col h-[280px]">
                <h4 className="text-[8px] font-black text-slate-300 uppercase mb-3 text-left">COMBAT LOG</h4>
                <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                    {roomData?.logs.slice().reverse().map((log: any) => (
                        <div key={log.id} className={`text-[8px] p-2 rounded-lg font-bold border-l-2 leading-tight text-left ${log.type === 'success' ? 'bg-green-50 text-green-700 border-green-400' : 'bg-rose-50 text-rose-700 border-rose-400'}`}>
                            {log.msg}
                        </div>
                    ))}
                </div>
            </div>
          </div>
          
          {/* Question Hub - Compact */}
          <div className="col-span-6 relative">
            <AnimatePresence>
                {roomData?.lastFeedback && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-50 flex items-center justify-center rounded-[2rem] ${roomData.lastFeedback.correct ? 'bg-green-500/90' : 'bg-rose-500/90'} backdrop-blur-sm shadow-2xl`}>
                        <div className="text-center text-white px-6">
                            <div className="text-5xl mb-2">{roomData.lastFeedback.correct ? '🎯' : '⚠️'}</div>
                            <h2 className="text-xl font-black uppercase tracking-tight">{roomData.lastFeedback.correct ? 'CONFIRMED' : 'FAILURE'}</h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-2xl relative min-h-[400px]">
                {roomData?.question && (
                    <motion.div key={roomData.question.text} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex justify-between mb-4">
                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em]">ENGAGEMENT MODULE</span>
                        </div>
                        <p className="text-lg font-black mb-6 text-slate-900 leading-tight tracking-tight text-left">{roomData.question.text}</p>
                        <div className="grid grid-cols-1 gap-2">
                            {['a', 'b', 'c', 'd'].map(opt => {
                                const picks = team === 'A' ? roomData.teamAPicks : roomData.teamBPicks;
                                const myPick = picks[socket.id];
                                const isMyPick = myPick?.answer === opt;
                                const isAgreed = myPick?.agreed;
                                return (
                                <button key={opt} onClick={() => selectAnswer(opt)} disabled={team !== roomData.turn || isAgreed || roomData.lastFeedback} className={`w-full p-3.5 rounded-xl border flex items-center justify-between transition-all group ${isMyPick ? 'border-purple-600 bg-purple-50 shadow-sm' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'}`}>
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px] ${isMyPick ? 'bg-purple-600 text-white' : 'bg-white text-slate-400 group-hover:bg-slate-100'} shadow-sm`}>{opt.toUpperCase()}</span>
                                        <span className="text-[11px] font-bold text-slate-700 leading-tight text-left">{roomData.question[opt]}</span>
                                    </div>
                                    {isMyPick && !isAgreed && (
                                        <div onClick={(e) => { e.stopPropagation(); agreeAnswer(); }} className="px-3 py-1 bg-green-500 text-white font-black rounded-lg text-[8px] uppercase hover:bg-green-600 transition-colors shadow-lg">Confirm</div>
                                    )}
                                    {isMyPick && isAgreed && <div className="p-1 px-2 bg-slate-900 text-white rounded text-[7px] font-black animate-pulse">WAIT</div>}
                                </button>
                            )})}
                        </div>
                    </motion.div>
                )}
            </div>
          </div>

          {/* Team B sidebar */}
          <div className="col-span-3 sticky top-4">
            <div className={`p-4 rounded-3xl border transition-all ${roomData?.turn === 'B' ? 'border-red-500 bg-red-50/10 shadow-lg shadow-red-50' : 'border-slate-50 bg-slate-50/20 opacity-40'}`}>
                <h3 className="text-[8px] font-black text-red-600 uppercase mb-3 text-right">SQUAD B</h3>
                <div className="space-y-1.5">
                    {roomData?.teamB.map((m: any) => (
                        <div key={m.id} className="text-[8px] p-2 bg-white rounded-lg border border-slate-100 flex flex-row-reverse justify-between items-center">
                            <span className="font-bold uppercase truncate max-w-[50px] text-right">{m.name}</span>
                            <div className="flex flex-row-reverse gap-1 items-center">
                                {roomData.teamBPicks[m.id] && <span className="text-[7px] font-black text-red-600">{roomData.teamBPicks[m.id].answer.toUpperCase()}</span>}
                                <span>{roomData.teamBPicks[m.id] ? (roomData.teamBPicks[m.id].agreed ? '✅' : '⏳') : '💤'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
