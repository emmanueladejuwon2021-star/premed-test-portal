import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, GraduationCap, BookOpen, Search, ClipboardCheck, 
  TrendingUp, Gamepad2, Trophy, Bot, X, Send, ChevronRight, HelpCircle, 
  Loader2, Sparkles, Star, Award, Heart, CheckCircle2, AlertCircle, Brain
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAppContext } from '../context/AppContext';
import { toast } from '../components/Toast';

function FormattedResponseText({ text }: { text: string }) {
  if (!text) return null;

  // Split text by lines to extract rich structural components (lists, headings, spacing)
  const rawLines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listCounter = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-list-${listCounter++}`} className="list-disc pl-4 my-2.5 space-y-1.5 text-slate-700 dark:text-slate-350">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const cleanInlineMarkdown = (str: string) => {
    if (!str) return str;
    
    // Clean raw markdown headers left over or unparsed markers
    let cleanStr = str
      .replace(/^(###|##|#)\s+/, '') // Remove #, ##, ### prefix
      .replace(/^\s*[-*•]\s+/, '')    // Remove bullet characters if needed
      .trim();

    // Replace **text** or __text__ with custom HTML / JSX elements
    const boldRegex = /(\*\*|__)(.*?)\1/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(cleanStr)) !== null) {
      const matchIdx = match.index;
      if (matchIdx > lastIndex) {
        parts.push(cleanStr.substring(lastIndex, matchIdx));
      }
      parts.push(
        <strong key={`inline-bold-${matchIdx}`} className="font-extrabold text-slate-900 dark:text-white">
          {match[2]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < cleanStr.length) {
      parts.push(cleanStr.substring(lastIndex));
    }

    return parts.length > 0 ? parts : cleanStr;
  };

  rawLines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // 1. Horizontal rulers (e.g. ---, ***, ___, --, ==)
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___' || trimmedLine === '==' || trimmedLine === '--') {
      flushList();
      renderedElements.push(
        <hr key={`hr-line-${index}`} className="my-3 border-slate-100 dark:border-zinc-800" />
      );
      return;
    }

    // 2. Clear Markdown Title Headings (e.g. ###, ##, #)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];

      const sizeStyle = level === 1 
        ? "text-xs font-black uppercase tracking-widest text-[#10B981] mb-1.5 mt-3 block"
        : level === 2 
          ? "text-[11px] font-black uppercase text-slate-800 dark:text-slate-100 mb-1 mt-2.5 block"
          : "text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 mt-2 block";

      renderedElements.push(
        <span key={`heading-el-${index}`} className={sizeStyle}>
          {cleanInlineMarkdown(headingContent)}
        </span>
      );
      return;
    }

    // 3. Bullet Point Unordered lists (e.g. * Item, - Item, • Item)
    const listMatch = trimmedLine.match(/^([\*\-\+•])\s+(.*)$/);
    if (listMatch) {
      const itemContent = listMatch[2];
      // Skip empty or decorative hyphens
      if (itemContent.trim() !== '') {
        listItems.push(
          <li key={`list-item-${index}`} className="leading-relaxed hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            {cleanInlineMarkdown(itemContent)}
          </li>
        );
        return;
      }
    }

    // 4. Manual index-based lines that start with (A), (B) or bold option options
    if (trimmedLine.match(/^[A-D]\)\s+(.*)$/) || trimmedLine.match(/^\d+\)\s+(.*)$/)) {
      flushList();
      renderedElements.push(
        <div key={`opt-item-${index}`} className="my-1 pl-2 border-l-2 border-emerald-500/30 text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-zinc-900/10 p-1.5 rounded-r">
          {cleanInlineMarkdown(trimmedLine)}
        </div>
      );
      return;
    }

    // 5. Numeric ordered list items (e.g. 1. Item)
    const orderMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (orderMatch) {
      flushList();
      const orderNum = orderMatch[1];
      const orderContent = orderMatch[2];
      renderedElements.push(
        <div key={`order-item-${index}`} className="flex gap-2 items-start my-2 text-slate-705 dark:text-slate-305 leading-relaxed">
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0 mt-0.5 min-w-[12px] text-right">{orderNum}.</span>
          <div className="flex-1">{cleanInlineMarkdown(orderContent)}</div>
        </div>
      );
      return;
    }

    // 6. Split spaces and custom empty breaks
    if (trimmedLine === '') {
      flushList();
      renderedElements.push(<div key={`empty-sp-${index}`} className="h-2" />);
      return;
    }

    // 7. General plain clinical text paragraphs
    flushList();
    renderedElements.push(
      <p key={`p-text-${index}`} className="mb-2 leading-relaxed text-slate-700 dark:text-slate-250 font-medium">
        {cleanInlineMarkdown(trimmedLine)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 text-[11px] leading-relaxed select-text">{renderedElements}</div>;
}

export default function HomeHubView() {
  const { student, token, setSelectedCourse } = useAppContext();
  const navigate = useNavigate();

  // Newly uploaded exam state from admin
  const [newestExam, setNewestExam] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    const fetchNewestExam = () => {
      fetch('/api/courses')
        .then(res => {
          if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
            return [];
          }
          return res.json().catch(() => []);
        })
        .then(data => {
          if (!active) return;
          if (Array.isArray(data)) {
            // Filter non-master courses (actual deployed test/exam instances)
            const exams = data.filter((c: any) => !c.is_master);
            if (exams.length > 0) {
              // Sort by created_at descending, fallback to id/_id comparison
              exams.sort((a: any, b: any) => {
                if (a.created_at && b.created_at) {
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                const idA = String(a.id || a._id || '');
                const idB = String(b.id || b._id || '');
                return idB.localeCompare(idA);
              });
              setNewestExam(exams[0]);
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch newest exams on home:", err);
        });
    };

    fetchNewestExam();
    // Refresh every 5 seconds for live real-time updates when admin deploys
    const interval = setInterval(fetchNewestExam, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Dialog & Modal Control States
  const [activeNoteTab, setActiveNoteTab] = useState<'bio' | 'chem' | 'phys'>('bio');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  
  // Question Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Educational Game State
  const [gameStep, setGameStep] = useState<'start' | 'playing' | 'ended'>('start');
  const [gameScore, setGameScore] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [gameTimer, setGameTimer] = useState(10);
  const timerRef = useRef<any>(null);

  // Floating AI Tutor States
  const [isTutorOpen, setIsTutorOpen] = useState(false);
  const [tutorMessage, setTutorMessage] = useState('');
  const [tutorConversation, setTutorConversation] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    { role: 'model', text: "Hello! I am your Premed AI Tutor. Ask me any anatomy, pharmacology, chemistry, physics, or test-taking questions and I'll explain it instantly!" }
  ]);
  const [isTutorTyping, setIsTutorTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mock Question Database for question search
  const localQuestions = [
    { subject: 'Biology', code: 'BIO-101', text: 'Which organelle is known as the powerhouse of the cell?', optA: 'Nucleus', optB: 'Ribosome', optC: 'Mitochondria', optD: 'Lysosome', ans: 'C', explanation: 'Mitochondria generate most of the chemical energy needed to power the cells biochemical reactions.' },
    { subject: 'Biology', code: 'BIO-202', text: 'What is the primary site of nutrient absorption in the human body?', optA: 'Stomach', optB: 'Small Intestine', optC: 'Large Intestine', optD: 'Esophagus', ans: 'B', explanation: 'The small intestine is highly adapted for absorption due to its microscopic villi and microvilli.' },
    { subject: 'Chemistry', code: 'CHM-101', text: 'What is the pH level of pure water at 25 degrees Celsius?', optA: '5', optB: '7', optC: '9', optD: '14', ans: 'B', explanation: 'Pure water is neutral and has a pH of 7 at standard room temperature.' },
    { subject: 'Chemistry', code: 'CHM-302', text: 'Which element is present in all organic compounds?', optA: 'Oxygen', optB: 'Nitrogen', optC: 'Carbon', optD: 'Hydrogen', ans: 'C', explanation: 'Carbon forms stable covalent bonds with other elements and constitutes the backbone of organic chemistry.' },
    { subject: 'Physics', code: 'PHY-101', text: 'What is the unit of electrical resistance?', optA: 'Ampere', optB: 'Volt', optC: 'Ohm', optD: 'Watt', ans: 'C', explanation: 'Electrical resistance is measured in Ohms, symbolized by the Greek letter Omega.' },
    { subject: 'Physics', code: 'PHY-203', text: 'In the equation E=mc^2, what does the letter "c" represent?', optA: 'Charge', optB: 'Constant velocity', optC: 'Speed of Light', optD: 'Calorific value', ans: 'C', explanation: 'The constant "c" represents the speed of light in a vacuum, which is approximately 300,000 kilometers per second.' }
  ];

  // Educational Game questions
  const gameQuestions = [
    { question: "Which hormone lowers blood glucose levels?", options: ["A) Glucagon", "B) Insulin", "C) Adrenaline", "D) Cortisol"], correctIdx: 1, explanation: "Insulin promotes cells to absorb glucose from the bloodstream." },
    { question: "What is the study of tissues called?", options: ["A) Cytology", "B) Cardiology", "C) Histology", "D) Nephrology"], correctIdx: 2, explanation: "Histology is the study of the microscopic structure of tissues." },
    { question: "Which gas has the highest affinity for hemoglobin?", options: ["A) Oxygen", "B) Carbon Dioxide", "C) Nitrogen", "D) Carbon Monoxide"], correctIdx: 3, explanation: "Carbon Monoxide binds to hemoglobin over 200 times more tightly than oxygen." },
    { question: "How many chambers does the adult human heart have?", options: ["A) 2", "B) 3", "C) 4", "D) 5"], correctIdx: 2, explanation: "The adult human heart possesses four chambers: two atria and two ventricles." }
  ];

  // Scroll tutor chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tutorConversation, isTutorTyping]);

  // Handle local question search list
  const handleQuestionSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const filtered = localQuestions.filter(q => 
        q.text.toLowerCase().includes(query.toLowerCase()) || 
        q.subject.toLowerCase().includes(query.toLowerCase()) ||
        q.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setIsSearching(false);
    }, 300);
  };

  // Educational Game Loop & Timer
  useEffect(() => {
    if (gameStep === 'playing') {
      setGameTimer(10);
      timerRef.current = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 1) {
            handleAnswerSelect(-1); // Timeout
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStep, currentQuestionIdx]);

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return; // Answered already
    if (timerRef.current) clearInterval(timerRef.current);
    
    const correctIndex = gameQuestions[currentQuestionIdx].correctIdx;
    if (index === correctIndex) {
      setGameScore(prev => prev + 10);
      setSelectedAnswer('correct');
      toast('Correct!', '+10 Score points!', 'success');
    } else {
      setSelectedAnswer('incorrect');
      toast('Incorrect Answer', gameQuestions[currentQuestionIdx].explanation, 'error');
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentQuestionIdx < gameQuestions.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
      } else {
        setGameStep('ended');
      }
    }, 3000);
  };

  const resetGame = () => {
    setGameScore(0);
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setGameStep('playing');
  };

  // Send message to AI Tutor server route
  const handleSendTutorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = tutorMessage.trim();
    if (!query || isTutorTyping) return;

    setTutorMessage('');
    const newHistory = [...tutorConversation, { role: 'user' as const, text: query }];
    setTutorConversation(newHistory);
    setIsTutorTyping(true);

    try {
      const res = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('FCF_Token')}`
        },
        body: JSON.stringify({
          message: query,
          history: newHistory.slice(-5) // Send last few exchange messages to keep context
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTutorConversation(prev => [...prev, { role: 'model', text: data.response }]);
      } else {
        setTutorConversation(prev => [...prev, { role: 'model', text: "I encountered a processing issue. Please ask again!" }]);
      }
    } catch {
      setTutorConversation(prev => [...prev, { role: 'model', text: "Connectivity issue. Let's make sure we are connected to the server and retry." }]);
    } finally {
      setIsTutorTyping(false);
    }
  };

  // Medical science summaries
  const scienceNotes = {
    bio: [
      { topic: "The Cardiovascular System", content: "The heart pumps oxygenated blood via arteries and extracts waste/CO2 via veins. Coronary arteries supply fresh blood directly to the myocardium. Blocks here can produce myocardial infarctions." },
      { topic: "Endocrine Regulation Enzymes", content: "Hormone secretion is controlled by feedback loops. The hypothalamus produces ADH and oxytocin, stored and released by the posterior pituitary." },
      { topic: "Cellular Cellular Respiration", content: "Glycolysis occurs in the cytosol producing 2 NADH and 2 Net ATP. The Krebs cycle and Oxidative Phosphorylation occur within matrix surfaces of mitochondria." }
    ],
    chem: [
      { topic: "Le Chatelier's Principle", content: "If a dynamic equilibrium is disturbed by changing conditions, the position of equilibrium moves to counteract the change." },
      { topic: "Acid-Base Buffers", content: "Blood is buffered by the carbonic acid-bicarbonate system to stay within the key physiological pH range (7.35 - 7.45)." },
      { topic: "Organic Hybridization", content: "Alkanes feature sp3 hybridization with tetrahedral geometry (109.5 degrees). Alkenes feature sp2 (120 degrees) and alkynes feature sp (180 degrees)." }
    ],
    phys: [
      { topic: "Newtonian Classical Mechanics", content: "Force equals mass times acceleration (F=ma). Action and reaction are always equal and opposite (Third Law)." },
      { topic: "Optics and Refractive Index", content: "Snell's Law dictates n1*sin(theta1) = n2*sin(theta2). Convex lenses focus light to correct hyperopia, concave lenses correct myopia." },
      { topic: "Thermodynamic Laws", content: "Energy cannot be destroyed or created (First Law). Thermal entropy always increases in closed systems (Second Law)." }
    ]
  };

  interface DashboardCard {
    title: string;
    subtitle: string;
    icon: any;
    bgColor: string;
    textColor: string;
    iconColor: string;
    onClick: () => void;
    isNewExam?: boolean;
  }

  // Grid Configuration strictly styled like the uploaded mobile dashboard
  // Matching titles, pastel visual cards, correct icons and descriptions
  // The colors are inspired exactly by the soft pastels in the screenshot.
  const baseCards: DashboardCard[] = [
    {
      title: "Practice For Premed",
      subtitle: "With exactly 33,400 questions offline",
      icon: Rocket,
      bgColor: "bg-indigo-100 dark:bg-indigo-950/20",
      textColor: "text-indigo-900 dark:text-indigo-200",
      iconColor: "bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
      onClick: () => navigate('/practice')
    },
    {
      title: "Classroom",
      subtitle: "Study Materials, Exercises and AI Tutor",
      icon: GraduationCap,
      bgColor: "bg-pink-100 dark:bg-pink-950/20",
      textColor: "text-pink-900 dark:text-pink-200",
      iconColor: "bg-pink-200 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
      onClick: () => navigate('/courses')
    },
    {
      title: "Science Note",
      subtitle: "Intelligent Digital Note For Maths And Science",
      icon: BookOpen,
      bgColor: "bg-teal-100 dark:bg-teal-950/20",
      textColor: "text-teal-900 dark:text-teal-200",
      iconColor: "bg-teal-200 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
      onClick: () => setIsNotesOpen(true)
    },
    {
      title: "AI Active Study",
      subtitle: "Upload notes & AI actively studies to chat & quiz you",
      icon: Brain,
      bgColor: "bg-cyan-100 dark:bg-cyan-950/20",
      textColor: "text-cyan-900 dark:text-cyan-200",
      iconColor: "bg-cyan-200 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
      onClick: () => navigate('/active-study')
    },
    {
      title: "Question Search",
      subtitle: "Search past questions quickly and easily",
      icon: Search,
      bgColor: "bg-slate-200 dark:bg-slate-800/30",
      textColor: "text-slate-900 dark:text-slate-200",
      iconColor: "bg-slate-300 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300",
      onClick: () => navigate('/question-search')
    },
    {
      title: "Result History",
      subtitle: "Track your performance",
      icon: ClipboardCheck,
      bgColor: "bg-[#dcedc8] dark:bg-lime-950/10",
      textColor: "text-[#33691e] dark:text-lime-200",
      iconColor: "bg-[#c5e1a5] dark:bg-lime-900/30 text-lime-800 dark:text-lime-300",
      onClick: () => navigate('/history')
    },
    {
      title: "Performance Analysis",
      subtitle: "Insightful analysis on your result",
      icon: TrendingUp,
      bgColor: "bg-orange-100 dark:bg-amber-950/20",
      textColor: "text-amber-900 dark:text-amber-200",
      iconColor: "bg-orange-200 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
      onClick: () => setIsAnalyticsOpen(true)
    },
    {
      title: "Educational Games",
      subtitle: "Have fun while learning",
      icon: Gamepad2,
      bgColor: "bg-purple-100 dark:bg-purple-950/20",
      textColor: "text-purple-900 dark:text-purple-200",
      iconColor: "bg-purple-200 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
      onClick: () => setIsGameOpen(true)
    },
    {
      title: "CBT Challenge",
      subtitle: "Compete in real time with your peers and win",
      icon: Trophy,
      bgColor: "bg-violet-100 dark:bg-violet-950/20",
      textColor: "text-violet-900 dark:text-violet-200",
      iconColor: "bg-violet-200 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
      onClick: () => navigate('/med-combat')
    }
  ];

  // If there is a newly uploaded exam from admin, show it as the VERY FIRST card
  const examCard = newestExam ? {
    title: `📝 ACTIVE EXAM: ${newestExam.code || 'CBT'}`,
    subtitle: `${newestExam.title} (${newestExam.activeTopicName || "Click to Start Assessment"})`,
    icon: Award,
    bgColor: "bg-rose-100 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50 relative overflow-hidden",
    textColor: "text-rose-950 dark:text-rose-100 font-extrabold",
    iconColor: "bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 ring-4 ring-rose-500/10",
    isNewExam: true,
    onClick: () => {
      const isCombat = newestExam.title?.toLowerCase().includes('combat') || newestExam.code?.toLowerCase().includes('combat');
      if (isCombat) {
        toast('Combat Protocol Offline', 'Med Combat will be Opened 09/06/26', 'info');
        return;
      }

      if ((newestExam.questionsCount || 0) === 0) {
        toast('Test Unavailable', 'There are no questions assigned to this test yet.', 'error');
        return;
      }
      
      if (newestExam.is_locked) {
        toast('Test Locked', 'This assessment is currently locked by the instructor.', 'error');
        return;
      }
      
      if (!newestExam.force_start) {
        const now = new Date();
        if (newestExam.scheduled_date) {
           const start = new Date(newestExam.scheduled_date);
           if (now < start) {
             toast('Not Started', `This test starts at ${new Date(start).toLocaleString()}.`, 'error');
             return;
           }
        }
        if (newestExam.end_date) {
           const end = new Date(newestExam.end_date);
           if (now > end) {
             toast('Expired', `This test ended at ${new Date(end).toLocaleString()}. You can no longer participate.`, 'error');
             return;
           }
        }
      }

      setSelectedCourse(newestExam);
      localStorage.setItem('FCF_SelectedTopics', JSON.stringify([])); 
      navigate('/config');
    }
  } : null;

  const cards = examCard ? [examCard, ...baseCards] : baseCards;

  return (
    <DashboardLayout viewTitle="Premed Hub Dashboard">
      <div className="flex-1 flex flex-col space-y-6 pt-1 md:pt-4 max-w-5xl mx-auto w-full relative">
        
        {/* Concise welcome badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#070707] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <Sparkles size={13} /> Pre-Med Hub Standard
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mt-1">Hello, {student?.name?.split(' ')[0] || 'Candidate'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
              {student?.matric_no || 'Portal ID'}
            </span>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse">
              Active Session
            </span>
          </div>
        </div>

        {/* Compact Categories Card Grid designed specifically for mobile-first views */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
          {cards.map((card, idx) => {
            const isExam = card.isNewExam;
            return (
              <motion.button
                key={idx}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={card.onClick}
                className={`
                  ${isExam 
                    ? 'col-span-2 sm:col-span-3 flex flex-row items-center gap-3 p-4 sm:p-5 h-20 sm:h-28' 
                    : 'col-span-1 flex flex-col justify-between items-start p-3 sm:p-4 h-[115px] sm:h-36'
                  }
                  ${card.bgColor} ${card.textColor}
                  transition-all rounded-2xl border border-slate-200/20 dark:border-slate-800/10 hover:shadow-sm cursor-pointer text-left relative overflow-hidden group 
                  ${isExam ? 'ring-2 ring-rose-500/50 dark:ring-rose-500/30' : ''}
                `}
              >
                {/* Special Pulsing Outer Ring / Halo for Newly Uploaded Exams */}
                {isExam ? (
                  <div className="absolute -inset-1 bg-rose-500/10 dark:bg-rose-500/5 blur-md rounded-2xl pointer-events-none animate-pulse" />
                ) : (
                  <div className="absolute right-0 bottom-0 w-16 h-16 bg-white/10 dark:bg-slate-900/10 rounded-full translate-x-4 translate-y-4 group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
                )}

                {/* Special Badge for New Exam */}
                {isExam && (
                  <span className="absolute top-2.5 right-2.5 bg-gradient-to-r from-rose-600 to-red-500 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full animate-pulse shadow-sm z-10">
                    NEW ASSESSMENT
                  </span>
                )}
                
                {/* Card visual status / icon circle inside */}
                <div className={`
                  rounded-xl flex items-center justify-center shrink-0 shadow-sm z-10
                  ${isExam 
                    ? 'w-10 h-10 sm:w-12 sm:h-12' 
                    : 'w-7.5 h-7.5 sm:w-10 sm:h-10'
                  }
                  ${card.iconColor}
                `}>
                  <card.icon size={isExam ? 18 : 15} />
                </div>

                <div className={`flex-1 flex flex-col z-10 ${isExam ? 'ml-3 space-y-0.5' : 'mt-auto w-full'}`}>
                  <h3 className={`font-black tracking-tight leading-none uppercase ${isExam ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'}`}>
                    {card.title}
                  </h3>
                  <p className={`font-semibold opacity-75 leading-tight line-clamp-2 ${isExam ? 'text-[9px] sm:text-xs max-w-xl' : 'text-[8.5px] sm:text-[10px]'}`}>
                    {card.subtitle}
                  </p>
                </div>

                {isExam && (
                  <div className="shrink-0 p-1 bg-white/30 dark:bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden sm:block">
                    <ChevronRight size={14} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Floating action button (Tutor Bot chat) */}
        <div className="fixed bottom-6 right-6 z-55 flex items-center gap-2">
          {/* Animated pulsing hint pill */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
            className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg border border-emerald-500 hidden md:block"
          >
            Need Help? Ask AI Tutor!
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsTutorOpen(prev => !prev)}
            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center transition-colors border-2 border-white dark:border-zinc-900 cursor-pointer relative"
            id="tutor-fab"
          >
            <Bot size={26} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-ping" />
          </motion.button>
        </div>

        {/* Floating Tutor Chat Drawer Panel */}
        <AnimatePresence>
          {isTutorOpen && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="fixed bottom-24 right-6 z-[200] max-w-sm w-[90vw] h-[480px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Tutor Header */}
              <div className="bg-emerald-600 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">Medical AI Tutor</h3>
                    <div className="text-[9px] text-emerald-100 font-medium">Equipped with 33,000 Questions</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTutorOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-all text-emerald-100 hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-black/40">
                {tutorConversation.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 max-w-[85%] rounded-2xl text-xs font-medium leading-relaxed shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-zinc-700'
                      }`}
                    >
                      {msg.role === 'model' ? (
                        <FormattedResponseText text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                
                {isTutorTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-zinc-800 text-slate-500 rounded-2xl p-3 text-xs flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> AI Tutor is synthesizing...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Reply Form */}
              <form onSubmit={handleSendTutorMessage} className="p-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2 bg-white dark:bg-zinc-900 shrink-0">
                <input
                  type="text"
                  placeholder="Ask a medical/exam category question..."
                  value={tutorMessage}
                  onChange={e => setTutorMessage(e.target.value)}
                  className="flex-1 pl-3.5 pr-2 py-2 bg-slate-100 dark:bg-black border-none rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                />
                <button
                  type="submit"
                  disabled={!tutorMessage.trim() || isTutorTyping}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Science Notes Reader Modal */}
        <AnimatePresence>
          {isNotesOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="text-teal-600 dark:text-teal-400" size={20} />
                    <h3 className="font-extrabold uppercase text-slate-800 dark:text-white text-sm">Medical Science Summary Notes</h3>
                  </div>
                  <button onClick={() => setIsNotesOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={16} />
                  </button>
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 shrink-0 bg-slate-50/20 dark:bg-slate-900/10">
                  {['bio', 'chem', 'phys'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveNoteTab(tab as any)}
                      className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer
                        ${activeNoteTab === tab 
                          ? 'border-teal-500 text-teal-600 dark:text-teal-400' 
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {tab === 'bio' ? 'Biology' : tab === 'chem' ? 'Chemistry' : 'Physics'}
                    </button>
                  ))}
                </div>

                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                  {scienceNotes[activeNoteTab].map((note, index) => (
                    <motion.div 
                      key={index} 
                      className="p-5 border border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-black/20 rounded-2xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <h4 className="font-black text-xs text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2">{note.topic}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">{note.content}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2. Question Search Engine Modal */}
        <AnimatePresence>
          {isSearchOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2">
                    <Search className="text-slate-600 dark:text-slate-400" size={18} />
                    <h3 className="font-extrabold uppercase text-slate-800 dark:text-white text-sm">Exam Question Search Engine</h3>
                  </div>
                  <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter keywords (e.g. powerhouse, vascular, pH, speed, light, carbonic)..."
                    value={searchQuery}
                    onChange={(e) => handleQuestionSearch(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-250"
                  />
                </div>

                <div className="flex-grow p-5 overflow-y-auto space-y-4">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-medium text-xs gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> Searching database...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center p-12 text-slate-400 text-xs font-semibold">
                      {searchQuery ? "No matched questions found. Try general scientific keywords." : "Begin typing a keyword to search from Premed CBT banks."}
                    </div>
                  ) : (
                    searchResults.map((q, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-900/30 font-semibold"
                      >
                        <div className="flex justify-between text-[10px] text-slate-400 uppercase font-black mb-1.5">
                          <span>{q.subject}</span>
                          <span>{q.code}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100 text-xs leading-relaxed mb-3 font-semibold">{q.text}</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                          <div className="text-slate-500">A) {q.optA}</div>
                          <div className="text-slate-500">B) {q.optB}</div>
                          <div className="text-slate-500">C) {q.optC}</div>
                          <div className="text-slate-500">D) {q.optD}</div>
                        </div>
                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase">Correct Answer: {q.ans}</span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{q.explanation}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 3. Analytics Insight Modal */}
        <AnimatePresence>
          {isAnalyticsOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="text-orange-500" size={18} />
                    <h3 className="font-extrabold uppercase text-slate-800 dark:text-white text-sm">Performance Analysis</h3>
                  </div>
                  <button onClick={() => setIsAnalyticsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <div className="text-slate-400 text-[10px] uppercase font-black">Target Accuracy</div>
                      <div className="text-xl font-black text-slate-700 dark:text-white mt-1">85.4%</div>
                    </div>
                    <div className="p-3 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                      <div className="text-slate-400 text-[10px] uppercase font-black">Standing</div>
                      <div className="text-xl font-black text-slate-700 dark:text-white mt-1">Excellent</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Anatomy & Physiology</span>
                      <span className="text-slate-700 dark:text-white">92%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }} />
                    </div>

                    <div className="flex justify-between items-center text-slate-500">
                      <span>General Chemistry</span>
                      <span className="text-slate-700 dark:text-white">78%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '78%' }} />
                    </div>

                    <div className="flex justify-between items-center text-slate-500">
                      <span>Classical Physics</span>
                      <span className="text-slate-700 dark:text-white">65%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>

                  <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10 flex items-start gap-2 text-yellow-800 dark:text-yellow-300">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="text-[10px]">Your performance in Physics has advanced by 12% this week. Keep up the high effort!</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 4. Educational Game Arena Modal */}
        <AnimatePresence>
          {isGameOpen && (
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="text-purple-600" size={18} />
                    <h3 className="font-extrabold uppercase text-slate-800 dark:text-white text-sm">Premed Speed Quiz Game</h3>
                  </div>
                  <button onClick={() => { setIsGameOpen(false); setGameStep('start'); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 py-4 flex flex-col justify-center">
                  {gameStep === 'start' && (
                    <div className="text-center space-y-4">
                      <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-600 mx-auto">
                        <Gamepad2 size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase text-slate-800 dark:text-white tracking-widest">Medical Speed Challenge</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-semibold">Answer as many clinical questions as possible. You have only 10 seconds per question!</p>
                      </div>
                      <button 
                        onClick={() => setGameStep('playing')}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] cursor-pointer shadow-md shadow-purple-500/20"
                      >
                        Start Game
                      </button>
                    </div>
                  )}

                  {gameStep === 'playing' && (
                    <div className="space-y-4">
                      {/* Timer Bar */}
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span className="text-purple-600">Question {currentQuestionIdx + 1}/{gameQuestions.length}</span>
                        <span className={gameTimer <= 3 ? 'text-red-500 animate-pulse' : 'text-slate-500'}>{gameTimer}s Left</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${gameTimer <= 3 ? 'bg-red-500' : 'bg-purple-600'}`} 
                          style={{ width: `${(gameTimer / 10) * 100}%` }}
                        />
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <p className="text-xs text-slate-800 dark:text-white leading-relaxed font-semibold">{gameQuestions[currentQuestionIdx].question}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {gameQuestions[currentQuestionIdx].options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswerSelect(oIdx)}
                            disabled={selectedAnswer !== null}
                            className={`w-full py-3 px-4 border text-[11px] font-semibold text-left rounded-xl transition-all cursor-pointer
                              ${selectedAnswer === null 
                                ? 'border-slate-200/80 hover:border-purple-500 dark:border-zinc-800 text-slate-700 dark:text-slate-300' 
                                : oIdx === gameQuestions[currentQuestionIdx].correctIdx 
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' 
                                  : 'border-slate-200/50 opacity-50 text-slate-400'
                              }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {selectedAnswer !== null && (
                        <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                          <strong className="text-purple-600 block mb-0.5">Clinical Concept Breakdown:</strong>
                          {gameQuestions[currentQuestionIdx].explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {gameStep === 'ended' && (
                    <div className="text-center space-y-4">
                      <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                        <Award size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase text-slate-800 dark:text-white tracking-widest">Challenge Cleared!</h4>
                        <div className="text-3xl font-black text-purple-600 mt-2">{gameScore} pts</div>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-semibold">Tutor metrics reported in your daily activity index.</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={resetGame}
                          className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold uppercase tracking-widest text-[9px] cursor-pointer"
                        >
                          Play Again
                        </button>
                        <button 
                          onClick={() => { setIsGameOpen(false); setGameStep('start'); }}
                          className="flex-1 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-[9px] cursor-pointer"
                        >
                          Back to Hub
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
