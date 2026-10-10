import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewState = 'splash' | 'login' | 'dashboard' | 'topic_selection' | 'test_config' | 'readiness_check' | 'test_countdown' | 'test_active' | 'chill_first' | 'results' | 'admin_login' | 'admin_dashboard';

export type Student = {
  id: string;
  name: string;
  matric_no: string;
  email?: string;
  phone?: string;
  department: string;
  strength: string;
};

export type Course = {
  id: string;
  _id?: string;
  code: string;
  title: string;
  icon: string;
  topicsCount: number;
  questionsCount: number;
  scheduled_date?: string;
  end_date?: string;
  is_mock?: boolean;
  is_master?: boolean;
  results_hidden?: boolean;
  force_start?: boolean;
  is_locked?: boolean;
  results_locked?: boolean;
  selected_topic_id?: string;
  duration?: number;
  question_limit?: number;
};

export type TestSession = {
  sessionId: string;
  courseId: string;
  expectedDuration: number;
  questions: any[];
  startTime: number;
  answers: Record<number, string | null>;
  questionTimerLimit?: number;
};

export type AdminStatus = {
  token: string | null;
  isAdmin: boolean;
};

type Theme = 'light' | 'dark';

type AppContextType = {
  student: Student | null;
  setStudent: (s: Student | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  admin: AdminStatus;
  setAdmin: (a: AdminStatus) => void;
  selectedCourse: Course | null;
  setSelectedCourse: (c: Course | null) => void;
  selectedTopics: number[];
  setSelectedTopics: (t: number[]) => void;
  testSession: TestSession | null;
  setTestSession: (ts: TestSession | null) => void;
  testResult: any | null;
  setTestResult: (tr: any | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(() => {
    const s = localStorage.getItem('FCF_Student');
    return s ? JSON.parse(s) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('FCF_Token'));
  const [admin, setAdmin] = useState<AdminStatus>(() => {
    try {
      const a = localStorage.getItem('FCF_Admin');
      const parsed = a ? JSON.parse(a) : null;
      return parsed && typeof parsed === 'object' ? parsed : { token: null, isAdmin: false };
    } catch {
      return { token: null, isAdmin: false };
    }
  });

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('FCF_Theme') as Theme;
      if (stored) return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('FCF_Theme', theme);
  }, [theme]);

  useEffect(() => {
    if (student) localStorage.setItem('FCF_Student', JSON.stringify(student));
    else localStorage.removeItem('FCF_Student');
  }, [student]);

  useEffect(() => {
    if (token) localStorage.setItem('FCF_Token', token);
    else localStorage.removeItem('FCF_Token');
  }, [token]);

  useEffect(() => {
    if (admin?.token) localStorage.setItem('FCF_Admin', JSON.stringify(admin));
    else localStorage.removeItem('FCF_Admin');
  }, [admin]);

  const value = {
    student, setStudent,
    token, setToken,
    admin, setAdmin,
    selectedCourse, setSelectedCourse,
    selectedTopics, setSelectedTopics,
    testSession, setTestSession,
    testResult, setTestResult,
    theme, setTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
