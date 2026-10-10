import React, { useEffect, useState, useRef } from 'react';
import { useAppContext, Course } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, ShieldAlert, ShieldCheck, Flame, Cpu, Activity, Plus, Trash2, 
  UploadCloud, FileText, Database, ChevronRight, 
  Trash, MoreVertical, Layers, LayoutGrid, Users,
  BarChart, ArrowLeft, LogOut, Edit, X, ChevronLeft, Menu, Megaphone, Info, Monitor,
  Award, Search, BookOpen, Microscope, Brain, Calculator, Target, Book, Ruler, Send, Clock, FileCheck, Zap,
  AlertCircle, Folder, FolderOpen, MessageSquare
} from 'lucide-react';
import TextExtractionTool from '../components/TextExtractionTool';
import NotesMcqConverter from '../components/admin/NotesMcqConverter';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart as RechartsBarChart, Bar } from 'recharts';

import ThemeToggle from '../components/ThemeToggle';
import { formatToWAT, getWeekForCourse, getCourseCreationDate } from '../lib/dateUtils';
import { loadHtml2Pdf } from '../lib/pdfUtils';

import CourseManagement from '../components/admin/CourseManagement';
import DeploymentHub from '../components/admin/DeploymentHub';
import QuestionManagement from '../components/admin/QuestionManagement';
import StudentResultsView from '../components/admin/StudentResultsView';
import MergedCourseEditor from '../components/admin/MergedCourseEditor';
import AdminChatView from '../components/admin/AdminChatView';

const loadPDFLibraries = async (): Promise<{ jsPDFClass: any; autoTableFn: any }> => {
  const loadScript = (url: string, globalName: string): Promise<any> => {
    return new Promise((resolve) => {
      if ((window as any)[globalName]) {
        resolve((window as any)[globalName]);
        return;
      }
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any)[globalName]));
        existing.addEventListener('error', () => resolve(null));
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve((window as any)[globalName] || true);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  };

  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js', 'jspdfAutoTable');

  const jspdfGlobal = (window as any).jspdf;
  if (!jspdfGlobal || !jspdfGlobal.jsPDF) {
    throw new Error('Failed to load jsPDF library dynamically');
  }

  return {
    jsPDFClass: jspdfGlobal.jsPDF,
    autoTableFn: (doc: any, options: any) => {
      if (typeof doc.autoTable === 'function') {
        doc.autoTable(options);
      } else {
        const globalAutoTable = (window as any).jspdfAutoTable || (window as any).default;
        if (typeof globalAutoTable === 'function') {
          globalAutoTable(doc, options);
        } else {
          console.error("autoTable function not available either on doc or window");
        }
      }
    }
  };
};

export function AdminDashboard() {
  const { admin, setAdmin } = useAppContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [health, setHealth] = useState<any>({});
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const [overview, setOverview] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [registryError, setRegistryError] = useState<string | null>(null);
  
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedPdfCourse, setSelectedPdfCourse] = useState<string>('all');
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Memoized stats to prevent redundant calculations
  const departmentalStats = React.useMemo(() => {
    const userList = Array.isArray(users) ? users.filter(u => u) : [];
    const stats: Record<string, { total: number, count: number }> = {};
    
    userList.forEach(u => {
      const dept = u.department || 'General';
      if (!stats[dept]) stats[dept] = { total: 0, count: 0 };
      if (typeof u.avg_score === 'number') {
        stats[dept].total += u.avg_score;
        stats[dept].count += 1;
      }
    });

    return Object.entries(stats).map(([dept, data]) => ({
      department: dept,
      average: data.count > 0 ? data.total / data.count : 0,
      participants: data.count
    })).sort((a, b) => b.average - a.average);
  }, [users]);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'logs' | 'course-editor' | 'announcements' | 'proctoring' | 'identities' | 'students-results' | 'notifications' | 'management' | 'questions' | 'question-bank' | 'chat' | 'notes-converter'>('overview');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', title: '', icon: 'FlaskConical', scheduled_date: '', duration: 30, question_limit: 20, is_mock: false });

  // Edit Modal
  const [editUser, setEditUser] = useState<any>(null);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: '', matric_no: '', department: '', phone: '', email: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allowUnlimitedReattempts, setAllowUnlimitedReattempts] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceActionLoading, setMaintenanceActionLoading] = useState(false);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [courseListViewMode, setCourseListViewMode] = useState<'folders' | 'flat'>('folders');
  const [deploymentViewMode, setDeploymentViewMode] = useState<'board' | 'manager'>('board');

  const navigate = useNavigate();

  const handleLogout = () => {
    setAdmin({ token: null, isAdmin: false });
    localStorage.removeItem('FCF_Admin');
    navigate('/admin/login');
  };

  const handleToggleUnlimitedReattempts = async () => {
    try {
      const newValue = !allowUnlimitedReattempts;
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + admin.token
        },
        body: JSON.stringify({ allow_unlimited_reattempts: newValue })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAllowUnlimitedReattempts(data.allow_unlimited_reattempts);
        toast('Settings Updated', `Unlimited reattempts has been ${data.allow_unlimited_reattempts ? 'ENABLED' : 'DISABLED'} for all students.`, 'success');
      } else {
        throw new Error(data.error || 'Failed to update setting');
      }
    } catch (e: any) {
      toast('Update Failed', e.message || 'Operation failed.', 'error');
    }
  };

  const handleToggleMaintenanceMode = async () => {
    try {
      setMaintenanceActionLoading(true);
      const newValue = !maintenanceMode;
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + admin.token
        },
        body: JSON.stringify({ maintenance: newValue })
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenanceMode(!!data.maintenance);
        toast('Maintenance Hub', `System Maintenance Mode has been turned ${data.maintenance ? 'ON (Portal restricted)' : 'OFF (Portal fully open)'}.`, 'success');
      } else {
        const data = await res.json().catch(() => ({ error: 'Failed to update maintenance setting' }));
        toast('Action Failed', data.error || 'Request failed.', 'error');
      }
    } catch (e: any) {
      toast('Update Failed', e.message || 'Operation failed.', 'error');
    } finally {
      setMaintenanceActionLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setSyncing(true);
      const results = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/health'),
        fetch('/api/admin/telemetry', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/overview', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/announcements', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/notifications', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/maintenance-status')
      ]);

      const [coursesRes, healthRes, teleRes, overviewRes, usersRes, annRes, notifRes, settingsRes, maintRes] = results;
      
      if (results.slice(0, 8).some(r => r.status === 401 || r.status === 403)) {
        toast('Auth Expired', 'Session timed out. Please login again.', 'error');
        setAdmin({ token: null, isAdmin: false });
        navigate('/admin/login');
        return;
      }

      const decoded = await Promise.all(results.map(r => r.ok ? r.json().catch(() => null) : null));
      const [c, h, t, o, u, a, n, s, m] = decoded;
      
      if (!usersRes.ok) {
        setRegistryError("The server encountered an error while retrieving the candidate registry.");
        console.error("Registry Sync Failure status:", usersRes.status);
      } else {
        setRegistryError(null);
      }
      
      setCourses(Array.isArray(c) ? c : []);
      setHealth(h);
      setTelemetry(Array.isArray(t) ? t : []);
      setOverview(o && typeof o === 'object' && !Array.isArray(o) ? o : {});
      setUsers(Array.isArray(u) ? u : []);
      setAnnouncements(Array.isArray(a) ? a : []);
      setNotifications(Array.isArray(n) ? n : []);
      setAllowUnlimitedReattempts(s?.allow_unlimited_reattempts ?? false);
      setMaintenanceMode(m?.maintenance ?? false);
      
      if (selectedCourse) {
        const updated = (Array.isArray(c) ? c : []).find((course: any) => 
          course && selectedCourse && (course.id === (selectedCourse as any).id || course._id === (selectedCourse as any).id || course.id === (selectedCourse as any)._id)
        );
        if (updated) setSelectedCourse(updated);
      }
    } catch (e) {
      toast('Sync Fault', 'Error fetching data. System offline?', 'error');
    } finally {
      setSyncing(false);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!admin.isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchData();

    // Real-time synchronization to poll admin data context and telemetry updates instantly
    const pollTimer = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [admin.token, admin.isAdmin, navigate]);

  const availableHubIcons = [
    { id: 'FlaskConical', icon: BookOpen },
    { id: 'Microscope', icon: Microscope },
    { id: 'Zap', icon: Zap },
    { id: 'Brain', icon: Brain },
    { id: 'Calculator', icon: Calculator },
    { id: 'Database', icon: Database },
    { id: 'Layers', icon: Layers },
    { id: 'ShieldAlert', icon: ShieldAlert },
    { id: 'Target', icon: Target },
    { id: 'Activity', icon: Activity }
  ];

  const IconComponent = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
    const iconsMap: Record<string, any> = {
      FlaskConical: BookOpen,
      Microscope: Microscope,
      Zap: Zap,
      Brain: Brain,
      Calculator: Calculator,
      Database: Database,
      Layers: Layers,
      ShieldAlert: ShieldAlert,
      Target: Target,
      Activity: Activity,
      Book: Book,
      BookOpen: BookOpen,
      Ruler: Ruler,
      PawPrint: Award
    };
    
    const Icon = iconsMap[name] || BookOpen;
    return <Icon size={size} className={className} />;
  };

  const handleUploadAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      setAnnouncementLoading(true);
      try {
          const res = await fetch('/api/admin/announcements', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + admin.token
              },
              body: JSON.stringify({ title: announcementTitle, content: announcementContent })
          });
          if (res.ok) {
              toast('Success', 'Announcement created successfully.', 'success');
              setAnnouncementTitle('');
              setAnnouncementContent('');
              fetchData();
          } else {
              toast('Error', 'Failed to create announcement.', 'error');
          }
      } catch (e) {
          toast('Network Error', 'Check your connection.', 'error');
      }
      setAnnouncementLoading(false);
  };

  const handleDeleteAnnouncement = async (id: number) => {
      try {
          const res = await fetch(`/api/admin/announcements/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + admin.token }
          });
          if (res.ok) {
              toast('Deleted', 'Announcement removed', 'success');
              fetchData();
          } else {
              toast('Error', 'Failed to delete.', 'error');
          }
      } catch (e) {
          toast('Network Error', 'Check your connection.', 'error');
      }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify(newStudentData)
      });
      if (res.ok) {
        toast('Success', 'Student enrolled successfully.', 'success');
        setShowAddStudent(false);
        setNewStudentData({ name: '', matric_no: '', department: '', phone: '', email: '' });
        fetchData();
      } else {
        const data = await res.json();
        toast('Enrollment Error', data.error, 'error');
      }
    } catch (e) {
      toast('Communication Error', 'Failed to reach server.', 'error');
    }
  };

  const handlePurgeIrregularStudents = async () => {
    const irregularCount = (users || []).filter((u: any) => {
      if (!u) return false;
      const normalizedName = u.name ? String(u.name).trim() : '';
      const hasNoName = !normalizedName;

      const normalizedMatric = u.matric_no ? String(u.matric_no).trim() : '';
      const numericDigitsCount = normalizedMatric.replace(/[^0-9]/g, '').length;
      const isIrregularMatric = !normalizedMatric || (numericDigitsCount < 9);

      const normalizedDept = u.department ? String(u.department).trim().toUpperCase() : '';
      const isNursingNacon = normalizedDept === 'NURSING NACON';

      return hasNoName || (isIrregularMatric && !isNursingNacon);
    }).length;

    if (irregularCount === 0) {
      toast('Clean Registry', 'No irregular student profiles found in the registry.', 'info');
      return;
    }

    if (!confirm(`Are you sure you want to globally delete ALL ${irregularCount} student accounts with no name or irregular matriculation numbers? This will permanently erase their test results, histories, and device locks. This action is irreversible.`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users/purge-irregular', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + admin.token
        }
      });

      if (res.ok) {
        const data = await res.json();
        toast('Bulk Purge Complete', `Successfully removed ${data.count} irregular student profile(s).`, 'success');
        fetchData();
      } else {
        const data = await res.json();
        toast('Purge Failure', data.error || 'Server rejected the request.', 'error');
      }
    } catch {
      toast('Network Timeout', 'Could not establish connection to the admin server.', 'error');
    }
  };

  const [editCourseMode, setEditCourseMode] = useState(false);
  const [editCourseConfig, setEditCourseConfig] = useState<any>({});
  
  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course and all its data?')) return;
    try {
      const res = await fetch('/api/admin/courses/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + admin.token } });
      if (res.ok) {
        toast('Success', 'Course deleted', 'success');
        setSelectedCourse(null);
        setActiveTab('courses');
        fetchData();
      }
    } catch {}
  };

  const handleEndTest = async (id: string) => {
    if (!confirm('Are you sure you want to end this test immediately? Students will no longer be able to start it.')) return;
    try {
      const now = new Date();
      // Adjust to local time string that datetime-local expects: YYYY-MM-DDTHH:mm
      const end_date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      const res = await fetch('/api/admin/courses/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ ...selectedCourse, end_date })
      });
      if (res.ok) {
        toast('Success', 'Test ended successfully.', 'success');
        const updated = { ...selectedCourse, end_date } as any;
        setSelectedCourse(updated);
        setEditCourseConfig(updated);
        fetchData();
      }
    } catch {}
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/courses/' + editCourseConfig.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify(editCourseConfig)
      });
      if (res.ok) {
        toast('Success', 'Course updated', 'success');
        setEditCourseMode(false);
        const updated = { ...selectedCourse, ...editCourseConfig };
        setSelectedCourse(updated);
        fetchData();
      }
    } catch {}
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify(newCourse)
      });
      if (res.ok) {
        toast('Success', 'Course created successfully.', 'success');
        setShowAddCourse(false);
        setNewCourse({ code: '', title: '', icon: 'FlaskConical', scheduled_date: '', duration: 30, question_limit: 20, is_mock: false });
        fetchData();
      } else {
        const data = await res.json();
        toast('Error', data.error, 'error');
      }
    } catch (e) {
      toast('Error', 'Communication failure.', 'error');
    }
  };

  const openCourseEditor = (course: Course) => {
    setSelectedCourse(course);
    const formatDate = (ds: string | undefined | null) => {
        if (!ds) return '';
        return ds.substring(0, 16);
    };
    setEditCourseConfig({
        ...course,
        scheduled_date: formatDate((course as any).scheduled_date),
        end_date: formatDate((course as any).end_date)
    });
    setActiveTab('course-editor');
    setSidebarOpen(false);
  };

  const downloadLeaderboardPDF = async (isAnonymous: boolean = false) => {
    try {
      const { jsPDFClass, autoTableFn } = await loadPDFLibraries();
      const doc = new jsPDFClass();
      doc.setFontSize(16);
      doc.text(`PREMED TUTORIAL TEST RESULTS${isAnonymous ? ' (ANONYMIZED)' : ''}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Date of Release: ${formatToWAT(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 28);
      
      let tableData: any[] = [];
      let head: string[][] = [];

      if (selectedPdfCourse === 'all') {
        let usersList = Array.isArray(users) ? users.filter(u => u) : [];
        
        // If users list is empty, try to fetch it again
        if (usersList.length === 0) {
          try {
            const res = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + admin.token } });
            const uData = await res.json();
            usersList = Array.isArray(uData) ? uData : [];
          } catch (e) {
            console.error("Failed to re-fetch users for PDF:", e);
          }
        }

        const sortedUsers = [...usersList].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
        
        tableData = sortedUsers.map((user: any, index: number) => {
          const row = [
            index + 1,
            user.matric_no || 'Unknown',
            user.department || 'Unknown',
            Math.round(user.avg_score || 0) + '%',
            user.tests_taken || 0
          ];
          if (!isAnonymous) {
            row.splice(2, 0, user.name || 'Unknown'); // Insert name at index 2
          }
          return row;
        });
        
        head = [
          isAnonymous 
            ? ['Rank', 'Matric Number', 'Department', 'Average Score', 'Tests Taken'] 
            : ['Rank', 'Matric Number', 'Name', 'Department', 'Average Score', 'Tests Taken']
        ];
        doc.text(`Course: All Courses (Registry Summary)`, 14, 34);
      } else {
        const res = await fetch('/api/leaderboard/' + selectedPdfCourse);
        const data = await res.json();
        const dataList = Array.isArray(data) ? data : [];
        
        // Map of results by matric_no, grouping all attempts
        const resultsByMatric: Record<string, any[]> = {};
        dataList.forEach(r => {
          if (r.matric_no && r.matric_no !== 'Unknown') {
            if (!resultsByMatric[r.matric_no]) {
              resultsByMatric[r.matric_no] = [];
            }
            resultsByMatric[r.matric_no].push(r);
          }
        });

        let usersList = Array.isArray(users) ? users.filter(u => u) : [];
        
        // If users list is empty, try to fetch it again
        if (usersList.length === 0) {
          try {
            const uRes = await fetch('/api/admin/users', { headers: { 'Authorization': 'Bearer ' + admin.token } });
            const uData = await uRes.json();
            usersList = Array.isArray(uData) ? uData : [];
          } catch (e) {
            console.error("Failed to re-fetch users for PDF:", e);
          }
        }
        
        // Combine results with all students from registry, listing consolidated metrics for reattempts
        const combinedData: any[] = [];
        usersList.forEach((user: any) => {
          const userResults = resultsByMatric[user.matric_no] || [];
          if (userResults.length > 0) {
            // Sort attempts chronologically
            const sortedAttempts = [...userResults].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const latest = sortedAttempts[sortedAttempts.length - 1];
            const best = [...sortedAttempts].sort((a, b) => b.percentage - a.percentage)[0];
            
            combinedData.push({
              matric_no: user.matric_no,
              name: user.name,
              department: user.department,
              latest_percentage: latest.percentage,
              best_percentage: best.percentage,
              grade: latest.grade || 'F',
              created_at: latest.created_at,
              attempts_count: sortedAttempts.length
            });
          } else {
            combinedData.push({
              matric_no: user.matric_no,
              name: user.name,
              department: user.department,
              latest_percentage: 0,
              best_percentage: 0,
              grade: 'F',
              created_at: null,
              attempts_count: 0
            });
          }
        });

        // Sort by best score achieved descending
        combinedData.sort((a, b) => (b.best_percentage || 0) - (a.best_percentage || 0));

        tableData = combinedData.map((entry: any, index: number) => {
           let timeStr = '-';
           if (entry.created_at) {
              timeStr = formatToWAT(entry.created_at);
           }
           const row = [
             index + 1,
             entry.matric_no || 'Unknown',
             entry.department || 'Unknown',
             entry.attempts_count || 0,
             Math.round(entry.best_percentage || 0) + '%',
             Math.round(entry.latest_percentage || 0) + '%',
             entry.grade || 'F',
             timeStr
           ];
           if (!isAnonymous) {
             row.splice(2, 0, entry.name || 'Unknown'); // Insert name at index 2
           }
           return row;
        });
        
        head = [
          isAnonymous 
            ? ['Rank', 'Matric Number', 'Department', 'Attempts', 'Best Score', 'Latest Score', 'Grade', 'Latest Attempt Date'] 
            : ['Rank', 'Matric Number', 'Name', 'Department', 'Attempts', 'Best Score', 'Latest Score', 'Grade', 'Latest Attempt Date']
        ];

        const courseObj = courses.find(c => 
          (c.id && c.id.toString() === selectedPdfCourse) || 
          ((c as any)._id && (c as any)._id.toString() === selectedPdfCourse)
        );
        doc.text(`Course: ${courseObj ? courseObj.title : 'Unknown'} (${courseObj ? courseObj.code : ''})`, 14, 34);
      }

      autoTableFn(doc, {
        startY: 40,
        head: head,
        body: tableData,
      });
      
      doc.save(`Premed_Tutorial_Test_Results${isAnonymous ? '_Anonymized' : ''}.pdf`);
      toast('Success', 'PDF downloaded successfully', 'success');
    } catch (e: any) {
      console.error(e);
      toast('Error', 'Failed to generate PDF', 'error');
    }
  };

  const handleFetchUserResults = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/' + userId + '/results', {
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      const data = await res.json();
      setUserResults(data);
    } catch (e) {}
  };

  const handleEditUser = (student: any) => {
    setEditUser(student);
    const userId = student.id || student._id;
    if (userId) handleFetchUserResults(userId);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user identity and all their academic records? This action cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/users/' + userId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Deletion failed.');
      }
      toast('Deleted', 'User identity has been purged.', 'success');
      setEditUser(null);
      fetchData();
    } catch (e: any) {
      toast('Error', e.message || 'Deletion failed.', 'error');
    }
  };

  const downloadTransparencyPDF = async (resultId: string) => {
    toast('Generating PDF', 'Constructing detailed transparency analysis...', 'info');
    let container: HTMLDivElement | null = null;
    try {
      const res = await fetch('/api/admin/results/' + resultId + '/transparency', {
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');
      
      container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.zIndex = '-100'; // Keep slightly behind but fully within rendering layer
      container.style.pointerEvents = 'none';
      container.style.background = '#ffffff';
      container.style.padding = '40px';
      container.style.fontFamily = 'Inter, system-ui, sans-serif';
      container.style.color = '#0f172a';
      container.style.lineHeight = '1.5';
      document.body.appendChild(container);
      
      const scoreInt = parseInt(data.percentage) || 0;
      const scoreColor = scoreInt >= 50 ? '#16a34a' : '#dc2626';
      
      let htmlContent = `
        <div style="background: #0f172a; padding: 30px; border-radius: 12px; color: white; margin-bottom: 24px;">
           <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">EXAMINATION TRANSCRIPT</h1>
           <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">
              OFFICIAL PERFORMANCE ANALYSIS & TRANSPARENCY AUDIT<br/>
              VERIFICATION ID: ${resultId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}
           </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 32px; background: #f8fafc;">
           <tr>
              <td style="padding: 24px; vertical-align: top; width: 45%;">
                 <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 12px; letter-spacing: 1px;">STUDENT INFORMATION</div>
                 <div style="font-weight: bold; font-size: 15px; color: #0f172a;">Name: <span style="font-weight: normal">${editUser?.name || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Matric: <span style="font-weight: normal">${editUser?.matric_no || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Email: <span style="font-weight: normal">${editUser?.email || 'N/A'}</span></div>
              </td>
              <td style="padding: 24px; vertical-align: top; width: 35%;">
                 <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 12px; letter-spacing: 1px;">TEST SPECIFICATIONS</div>
                 <div style="font-weight: bold; font-size: 15px; color: #0f172a;">Module: <span style="font-weight: normal">${data.course || 'N/A'}</span></div>
                 <div style="font-weight: bold; font-size: 15px; margin-top: 4px; color: #0f172a;">Date: <span style="font-weight: normal">${formatToWAT(data.created_at || new Date(), { dateStyle: 'long' })}</span></div>
              </td>
              <td style="padding: 24px; vertical-align: middle; text-align: center; width: 20%;">
                 <div style="background: ${scoreColor}; padding: 16px 24px; border-radius: 8px; color: white; display: inline-block; min-width: 100px; text-align: center;">
                    <div style="font-size: 10px; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">OVERALL</div>
                    <div style="font-size: 28px; font-weight: 900;">${scoreInt}%</div>
                 </div>
              </td>
           </tr>
        </table>
        
        <h2 style="font-size: 18px; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; color: #0f172a;">EXAMINATION QUESTION & FIDELITY ANALYSIS</h2>
      `;
      
      data.details.forEach((q: any, i: number) => {
        const getOpt = (k: string) => q.options[k] ? `<div style="margin-bottom: 6px;"><strong>${k.split('_')[1].toUpperCase()}.</strong> ${q.options[k]}</div>` : '';
        const optionsList = [getOpt('option_a'), getOpt('option_b'), getOpt('option_c'), getOpt('option_d')].join('');
        
        let stuAns = q.student_answer ? q.student_answer.replace('option_', '').toUpperCase() : 'NO SELECTION';
        let corAns = q.correct_option ? q.correct_option.replace('option_', '').toUpperCase() : '?';
        
        const stuFull = q.student_answer && q.options[q.student_answer] ? `<strong>[${stuAns}]</strong> ${q.options[q.student_answer]}` : stuAns;
        const corFull = q.correct_option && q.options[q.correct_option] ? `<strong>[${corAns}]</strong> ${q.options[q.correct_option]}` : corAns;
 
        const isPassed = q.is_correct;
        const resultLabel = isPassed ? '<span style="color: #15803d; font-weight: bold;">[&#10003;] PASSED</span>' : '<span style="color: #b91c1c; font-weight: bold;">[&#10007;] FAILED</span>';
        
        htmlContent += `
        <div style="page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; background: white;">
           <table style="width: 100%; border-collapse: collapse;">
              <tr>
                 <td style="width: 40px; vertical-align: top; font-size: 24px; font-weight: 900; color: #94a3b8; line-height: 1; padding-right: 16px;">${i + 1}</td>
                 <td style="vertical-align: top;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px; white-space: pre-wrap; color: #0f172a;">${q.text}</div>
                    <div style="background: #f8fafc; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 15px; border: 1px solid #f1f5f9; color: #0f172a;">
                       ${optionsList}
                    </div>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse; background: #fdfdfd; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
                       <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 180px; color: #64748b; font-weight: 600; background: #f8fafc;">Candidate Selection</td>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">${stuFull}</td>
                       </tr>
                       <tr>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; background: #f8fafc;">Administrator Key</td>
                          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: #0f172a;">${corFull}</td>
                       </tr>
                       <tr>
                          <td style="padding: 12px 16px; color: #64748b; font-weight: 600; background: #f8fafc;">Match Status</td>
                          <td style="padding: 12px 16px;">${resultLabel}</td>
                       </tr>
                    </table>
                 </td>
              </tr>
           </table>
        </div>
        `;
      });
      
      container.innerHTML = htmlContent;
 
      const opt = {
        margin:       [5, 5, 5, 5],
        filename:     `Transcript_${editUser?.matric_no?.replace(/\//g,'_') || 'Report'}_${data.course}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: false, scrollX: 0, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfEngine = await loadHtml2Pdf();
      if (!html2pdfEngine) {
        throw new Error('PDF conversion engine is not loaded yet. Please check your internet connection or refresh the page.');
      }
      await html2pdfEngine().set(opt).from(container).save();
      toast('Success', 'Detailed transparency report downloaded.', 'success');

    } catch (e: any) {
      toast('Error', e.message || 'Failed to generate transparency report', 'error');
    } finally {
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDeleteResult = async (resultId: string, userId: string) => {
    try {
      const res = await fetch('/api/admin/results/' + resultId, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Deletion failed.');
      }
      handleFetchUserResults(userId);
      fetchData();
    } catch (e: any) {
      toast('Error', e.message || 'Deletion failed.', 'error');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const userId = editUser.id || editUser._id;
    if (!userId) {
        toast('Error', 'Invalid identity state.', 'error');
        return;
    }
    
    try {
      // Check for duplicate matric_no
      const isDuplicate = users.some(u => u.matric_no === editUser.matric_no && (u.id || u._id) !== userId);
      if (isDuplicate) {
          toast('Conflict Error', 'Matriculation number already assigned to another identity.', 'error');
          return;
      }

      const res = await fetch('/api/admin/users/' + userId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({
          name: editUser.name,
          matric_no: editUser.matric_no,
          department: editUser.department
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }
      toast('Success', 'User profile updated.', 'success');
      setEditUser(null);
      fetchData();
    } catch (e: any) {
      toast('Error', e.message || 'Mutation failed.', 'error');
    }
  };

  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedProctorSessionId, setSelectedProctorSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const prevSessionsCountRef = useRef<number>(0);

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const fetchProctoring = async () => {
    try {
      const [sessionsRes, incidentsRes] = await Promise.all([
        fetch('/api/admin/telemetry', { headers: { 'Authorization': 'Bearer ' + admin.token } }),
        fetch('/api/admin/incidents', { headers: { 'Authorization': 'Bearer ' + admin.token } })
      ]);
      const sessionsText = await sessionsRes.text();
      const incidentsText = await incidentsRes.text();
      setLastSyncTime(new Date());

      let newSessionsData;
      try {
        newSessionsData = JSON.parse(sessionsText);
      } catch (e) {
        console.error('Error parsing sessions JSON:', e);
        newSessionsData = [];
      }
      const newSessions = Array.isArray(newSessionsData) ? newSessionsData : [];
      
      let newIncidentsData;
      try {
        newIncidentsData = JSON.parse(incidentsText);
      } catch (e) {
        console.error('Error parsing incidents JSON:', e);
        newIncidentsData = [];
      }
      const newIncidents = Array.isArray(newIncidentsData) ? newIncidentsData : [];
      
      // Check for new sessions
      const activeCount = newSessions.filter((s:any) => s.status === 'active').length;
      if (prevSessionsCountRef.current !== 0 && activeCount > prevSessionsCountRef.current) {
         toast('New Session', 'A candidate has started a new test session.', 'success');
      }
      prevSessionsCountRef.current = activeCount;
      
      setActiveSessions(newSessions);
      setIncidents(newIncidents);
      
      if (!Array.isArray(newSessionsData) || !Array.isArray(newIncidentsData)) {
         console.error('Proctoring API returned invalid list', newSessionsData, newIncidentsData);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'proctoring') {
      fetchProctoring();
      const interval = setInterval(fetchProctoring, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Connect to live proctoring stream over socket for millisecond-level frame rendering
  useEffect(() => {
    let socket: Socket | null = null;
    if (activeTab === 'proctoring') {
      try {
        socket = io();
        socket.on('proctor-snapshot', ({ sessionId, snapshot }) => {
          // Instantly update active sessions table + grids
          setActiveSessions(prev => prev.map(s => {
            if (s.session_id === sessionId) {
              return { ...s, current_snapshot: snapshot };
            }
            return s;
          }));

          // Instantly update floating detailed inspector modal if open
          setSessionDetails(prev => {
            if (prev && (prev.id === sessionId || prev.session_id === sessionId)) {
              return { ...prev, current_snapshot: snapshot };
            }
            return prev;
          });
        });
      } catch (err) {
        console.warn("Real-time live proctoring socket listener skipped:", err);
      }
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [activeTab]);

  const handleTerminateSession = async (id: string) => {
    try {
      await fetch(`/api/admin/terminate-session/${id}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      toast('Success', 'Session terminated', 'success');
      fetchProctoring();
      if (selectedProctorSessionId === id) setSelectedProctorSessionId(null);
    } catch {
      toast('Error', 'Failed to terminate session', 'error');
    }
  };

  const handleWarnCandidate = async (id: string, message: string) => {
    try {
      await fetch(`/api/admin/warn-session/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ message })
      });
      toast('Success', 'Warning sent to candidate', 'success');
    } catch {
      toast('Error', 'Failed to send warning', 'error');
    }
  };

  const handlePruneLogs = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/prune-session-logs/${id}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      const data = await res.json();
      if (data.success) {
        toast('Smart Pruning Active', `Removed ${data.removed} redundant logs from this session.`, 'success');
        fetchSessionDetails(id);
      }
    } catch {
      toast('Error', 'Failed to prune redundant logs', 'error');
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/session-details/${sessionId}`, {
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response');
      }
      if (data.error) throw new Error(data.error);
      setSessionDetails(data);
    } catch (e: any) {
      console.error('Session details fetch error:', e);
      toast('Error', 'Failed to fetch session details', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOverrideAnswer = async (sessionId: string, questionId: number, option: string) => {
    try {
      const res = await fetch(`/api/admin/session/${sessionId}/override-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ questionId, option })
      });
      if (!res.ok) throw new Error('Update failed');
      
      setSessionDetails((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          answer_overrides: {
            ...prev.answer_overrides,
            [questionId]: option
          }
        };
      });
      toast('Success', 'Answer override pending synchronization', 'success');
    } catch (e: any) {
      toast('Error', 'Failed to override answer', 'error');
    }
  };

  useEffect(() => {
    if (selectedProctorSessionId) {
      fetchSessionDetails(selectedProctorSessionId);
      const interval = setInterval(() => fetchSessionDetails(selectedProctorSessionId), 2500);
      return () => clearInterval(interval);
    } else {
      setSessionDetails(null);
    }
  }, [selectedProctorSessionId]);

  const handleExportPDF = async () => {
    if (incidents.length === 0) {
      toast('No Data', 'No incidents to export.', 'error');
      return;
    }
    const { jsPDFClass, autoTableFn } = await loadPDFLibraries();
    const doc = new jsPDFClass();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Live Proctoring Violation Report", 14, 22);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${formatToWAT(new Date())}`, 14, 30);
    
    const groups: Record<string, typeof incidents> = {};
    incidents.forEach(inc => {
        const v = inc.violation || 'Unknown';
        if (!groups[v]) groups[v] = [];
        groups[v].push(inc);
    });

    let currentY = 40;
    
    Object.keys(groups).forEach(violationType => {
         doc.setFontSize(14);
         doc.setFont("helvetica", "bold");
         doc.setTextColor(220, 38, 38);
         doc.text(violationType.toUpperCase(), 14, currentY);
         doc.setTextColor(0, 0, 0);
         currentY += 8;

         const tableData = groups[violationType].map(i => [
             i.student_name || 'Unknown',
             i.matric_no,
             formatToWAT(i.created_at),
             i.ip_address || 'Unknown'
         ]);
         
         autoTableFn(doc, {
             startY: currentY,
             head: [['Name', 'Matric No', 'Time', 'IP Address']],
             body: tableData,
             theme: 'grid',
             headStyles: { fillColor: [41, 128, 185], textColor: 255 }
         });

         currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save("Proctoring_Report.pdf");
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleClearLogs = async () => {
    if (!confirm('CAUTION: This will permanently delete all security audit logs. Proceed?')) return;
    try {
      await fetch('/api/admin/logs/clear', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      setIncidents([]);
      toast('Success', 'Security logs cleared', 'success');
    } catch {}
  };

  const handleClearNotifications = async () => {
    if (!confirm('Clear all notifications?')) return;
    try {
      await fetch('/api/admin/notifications/clear', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      setNotifications([]);
      toast('Success', 'Notifications cleared', 'success');
    } catch {}
  };

  const navItems = [
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'overview', label: 'Dashboard Overview', icon: BarChart },
    { id: 'chat', label: 'Candidate Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Alerts', icon: Zap },
    { id: 'identities', label: 'Student List', icon: Users },
    { id: 'students-results', label: 'Exam Grades', icon: FileCheck },
    { id: 'courses', label: 'Test Deployment Hub', icon: Layers },
    { id: 'management', label: 'Manage Courses', icon: Folder },
    { id: 'questions', label: 'Questions Pool', icon: Database },
    { id: 'notes-converter', label: 'Notes MCQ Converter', icon: FileText },
    { id: 'proctoring', label: 'Live Status', icon: ShieldAlert },
    { id: 'logs', label: 'Event History', icon: Terminal },
  ] as const;

  
  if (isInitializing) {
     return (
       <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-[#020202] text-slate-900 dark:text-white p-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-8"
          >
             <div className="relative w-24 h-24">
                <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-full h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
                   <ShieldAlert size={40} className="text-blue-600 animate-bounce" />
                </div>
             </div>
             <div className="text-center space-y-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">Authenticating Access</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">Establishing secure connection to the central testing repository...</p>
             </div>
             <div className="flex flex-col gap-2 w-64">
                <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-full bg-blue-600"
                   />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                   <span>Syncing Vectors</span>
                   <span>99.9% Robust</span>
                </div>
             </div>
          </motion.div>
       </div>
     );
  }

  return (
    <div className="bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-white dark:bg-[#050505] border-b border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <LayoutGrid size={16} />
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-100">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
             <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-lg border border-blue-100 dark:border-blue-800 animate-pulse">
                <Activity size={10} /> Syncing
             </div>
          )}
          <ThemeToggle />
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
         {sidebarOpen && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed md:hidden inset-0 bg-slate-900/50 z-[100] backdrop-blur-sm"
             onClick={() => setSidebarOpen(false)}
           />
         )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 md:top-0 left-0 z-[110] h-screen bg-white dark:bg-black border-r border-slate-200 dark:border-slate-800 flex flex-col w-60 shrink-0 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="px-3.5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
              <img src="/logo.svg" className="w-full h-full p-1" alt="Logo" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs text-slate-900 dark:text-white leading-tight truncate">Platform Admin</h1>
              <div className="text-[9px] text-slate-400 font-medium leading-none mt-0.5">System Manager</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-slate-800">
             <ChevronLeft size={15} />
          </button>
        </div>

        <div className="p-3 overflow-y-auto flex-1 space-y-1">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</div>
          {navItems.map((item) => (
            <button 
              key={`nav_${item.id}`}
              onClick={() => { 
                setSelectedWeekNum(null);
                if ((item.id as string) === 'question-bank') {
                  navigate('/admin/question-bank');
                } else {
                  setActiveTab(item.id as any); 
                }
                setSidebarOpen(false); 
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors relative ${
                activeTab === item.id 
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={15} className={activeTab === item.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400"} />
              {item.label}
              {item.id === 'notifications' && notifications.some(n => !n.is_read) && (
                <span className="absolute right-3 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              )}
            </button>
          ))}
          {activeTab === 'course-editor' && selectedCourse && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Active Document</div>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                <Layers size={18} />
                <span className="truncate">{selectedCourse.code} Editor</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 shrink-0">
           {syncing && (
             <div className="mx-2 mb-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800 animate-pulse">
                <Activity size={12} className="shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider">Network Syncing</span>
             </div>
           )}
           <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theme</span>
              <ThemeToggle />
           </div>
           <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
             <LogOut size={15} /> Logout
           </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 bg-slate-50 dark:bg-black w-full relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex-1 w-full pb-24">
          <AnimatePresence mode="wait">
            
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6 pb-6 border-b border-slate-200/50 dark:border-slate-800/50 relative">
                   <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                   <div>
                     <div className="flex items-center gap-3 mb-2">
                       <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Global Intelligence</h2>
                       <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/> Live</span>
                       {syncing && (
                          <span className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse ml-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-900/30">
                             <Activity size={10} /> Syncing
                          </span>
                       )}
                     </div>
                     <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Holistic overview of platform telemetry, cohort performance, and academic standing.</p>
                   </div>
                </div>
                
                {/* Advanced Bento Grid Stats - Optimized Sizes */}
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4 dark:bg-black">
                  {[
                    { label: 'Candidates', brief: 'Total', value: overview?.totalStudents || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
                    { label: 'Evaluations', brief: 'Archived', value: overview?.totalTests || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
                    { label: 'Mean', brief: 'Global', value: overview?.platformAverage ? `${overview.platformAverage}%` : '0%', icon: BarChart, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-100 dark:border-violet-500/20' },
                    { label: 'Knowledge', brief: 'Items', value: overview?.totalQuestions || 0, icon: Database, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' }
                  ].map((stat, i) => (
                    <div key={i} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px]">
                      <div className={`absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500 ${stat.color}`}>
                         <stat.icon size={60} className="transform transition-all duration-700" />
                      </div>
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{stat.brief}</span>
                        <div className={`p-1.5 rounded-lg ${stat.bg} ${stat.border} border shadow-sm`}>
                           <stat.icon size={14} className={stat.color} />
                        </div>
                      </div>
                      <div className="relative z-10">
                         <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">{stat.value}</div>
                         <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                                  <div className="grid lg:grid-cols-3 gap-6 mt-6">
                   <div className="lg:col-span-2 bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col p-6 pb-2">
                       <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight mb-6">
                         <Activity size={18} className="text-blue-500" /> Platform Performance Trend
                       </h3>
                      <div className="h-[280px] w-full -ml-4 mt-auto">
                        {overview?.chartData ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={overview.chartData}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                itemStyle={{ color: '#3b82f6' }}
                              />
                              <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-400">Loading metrics...</div>
                        )}
                      </div>
                   </div>

                   <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col p-6">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                          <Award size={18} className="text-amber-500" /> Departmental Excellence
                        </h3>
                     </div>
                     
                     {departmentalStats.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 mt-4">
                           <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4">
                              <Info size={20} />
                           </div>
                           <p className="text-xs font-bold uppercase tracking-widest text-center">No benchmark data available</p>
                        </div>
                     ) : (
                        <div className="flex flex-col gap-4 overflow-y-auto max-h-[340px] custom-scrollbar pr-2 pb-2">
                          {departmentalStats.slice(0, 7).map((entry, index) => {
                             const maxAvg = Math.max(...departmentalStats.map(a => a.average), 1);
                             const percentageOfMax = (entry.average / maxAvg) * 100;
                             return (
                               <div key={index} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl relative overflow-hidden group">
                                 <div className="flex justify-between items-center mb-2 relative z-10">
                                    <div className="flex items-center gap-2">
                                       <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm">
                                         #{index + 1}
                                       </div>
                                       <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[150px] uppercase tracking-tight">{entry.department}</h4>
                                    </div>
                                    <div className="text-lg font-black italic tracking-tight text-blue-600 dark:text-blue-400">
                                      {Math.round(entry.average)}<span className="text-[10px] opacity-50">%</span>
                                    </div>
                                 </div>
                                 <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative z-10 shrink-0 mt-4">
                                    <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${percentageOfMax}%` }}
                                      transition={{ duration: 1, delay: index * 0.05 }}
                                      className="bg-blue-500 h-full rounded-full"
                                    />
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                     )}
                   </div>
                 </div>

                 <div className="bg-white dark:bg-[#050505] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col mt-6 p-6">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-tight">
                         <ShieldAlert size={18} className="text-red-500" /> Live Security Incidents
                       </h3>
                    </div>
                    {incidents.length === 0 ? (
                       <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                          <p className="text-xs font-bold uppercase tracking-widest">No recent security events</p>
                       </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                          {incidents.slice(0, 5).map((log, idx) => (
                             <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                      <ShieldAlert size={14} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">{log.student_name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{log.matric_no}</span>
                                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{log.course_code}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col sm:items-end">
                                   <p className="text-xs font-bold text-red-600 dark:text-red-400 truncate max-w-[200px]">{log.violation}</p>
                                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{formatToWAT(log.timestamp)}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>

                 </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <div>
                       <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Security & Alerts Panel</h2>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time telemetry, candidate audits, and intrusion detection logs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={fetchData}
                        className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Activity size={15} />
                      </button>
                      <button 
                        onClick={handleClearNotifications}
                        className="px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-105"
                      >
                        Clear All
                      </button>
                    </div>
                </div>

                {/* Cyber Intrusion Audits Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-black/30 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                   <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/10 text-amber-605 dark:text-amber-400 animate-pulse">
                         <ShieldAlert size={16} />
                      </div>
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Brute-Force Gates</p>
                         <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {notifications.filter(n => n.title && n.title.includes("Brute Force")).length} Incidents
                         </h3>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/10 text-rose-605 dark:text-rose-400">
                         <Terminal size={16} />
                      </div>
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Concurrent Decouple</p>
                         <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {notifications.filter(n => n.message && (n.message.includes("concurrent") || n.message.includes("Simultaneous"))).length} Prevented
                         </h3>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-605 dark:text-orange-400">
                         <Flame size={16} />
                      </div>
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">API Tamper Shield</p>
                         <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                            {notifications.filter(n => n.title && n.title.includes("Scripted")).length} Filtered
                         </h3>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                         <ShieldCheck size={16} />
                      </div>
                      <div>
                         <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Shield Index</p>
                         <h3 className="text-sm font-black text-emerald-600 mt-0.5">99.9% Nominal</h3>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  {notifications.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <ShieldCheck size={36} className="mx-auto mb-3 text-emerald-500" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">All Terminals Secure</h4>
                      <p className="text-[10px] text-slate-500 mt-1">No intrusion events or critical cyber warnings detected within current audit span.</p>
                    </div>
                  ) : (
                    notifications.map((n, idx) => {
                      const isWarning = n.type === 'warning';
                      return (
                        <div 
                          key={`notif_${n.id || idx}_${idx}`} 
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                            n.is_read 
                              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70' 
                              : isWarning 
                                ? 'bg-red-50/50 dark:bg-red-950/15 border-red-200/80 dark:border-red-900/40 shadow-sm' 
                                : 'bg-blue-50/50 dark:bg-blue-900/15 border-blue-200/80 dark:border-blue-900/40 shadow-sm'
                          }`}
                        >
                          {!n.is_read && (
                            <div className={`absolute top-0 left-0 w-1 h-full ${isWarning ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`} />
                          )}
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 ${
                                isWarning 
                                  ? 'bg-red-105/90 text-red-650 dark:bg-red-500/20 dark:text-red-400' 
                                  : n.type === 'success' 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                              }`}>
                                {isWarning ? <ShieldAlert size={14} /> : <Zap size={14} />}
                              </div>
                              <div>
                                <h4 className={`text-xs font-black uppercase tracking-tight ${isWarning ? 'text-red-655' : 'text-slate-900 dark:text-white'}`}>
                                  {n.title}
                                </h4>
                                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">{n.message}</p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                   <span className="text-[8px] font-bold text-slate-450 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{n.student_name}</span>
                                   <span className="text-[8px] font-bold text-blue-600 dark:text-blue-450 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-md">{n.course_code}</span>
                                   <span className="text-[8px] font-mono text-slate-450">{formatToWAT(n.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            {!n.is_read && (
                              <div className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-red-500' : 'bg-blue-600'} shrink-0`} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'management' && (
              <motion.div key="management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <CourseManagement courses={courses} adminToken={admin.token!} onRefresh={fetchData} />
              </motion.div>
            )}
            {activeTab === 'questions' && (
              <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <QuestionManagement adminToken={admin.token!} />
              </motion.div>
            )}
            {activeTab === 'courses' && (() => {
              const groupedCourses: Record<number, any[]> = {};
              groupedCourses[1] = [];
              groupedCourses[2] = [];
              groupedCourses[3] = [];

              courses.forEach(course => {
                const week = getWeekForCourse(course);
                if (!groupedCourses[week.number]) {
                  groupedCourses[week.number] = [];
                }
                groupedCourses[week.number].push(course);
              });

              const maxWeekNum = Math.max(3, ...Object.keys(groupedCourses).map(Number));
              
              const weeksList = [];
              for (let w = 1; w <= maxWeekNum; w++) {
                // Get range string for week w
                let range = "";
                if (w === 1) range = "May 10 to May 17, 2026";
                else if (w === 2) range = "May 18 to May 24, 2026";
                else if (w === 3) range = "May 25 to May 31, 2026";
                else {
                  const anchorTime = new Date("2026-06-01T00:00:00").getTime();
                  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                  const index = w - 4;
                  const wkStart = new Date(anchorTime + index * msPerWeek);
                  const wkEnd = new Date(anchorTime + (index + 1) * msPerWeek - 1);
                  const formatOption: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                  range = `${wkStart.toLocaleDateString('en-US', formatOption)} to ${wkEnd.toLocaleDateString('en-US', formatOption)}, 2026`;
                }

                const weekCourses = groupedCourses[w] || [];
                const sortedWeekCourses = [...weekCourses].sort((a, b) => {
                  const idA = String(a.id || a._id || '');
                  const idB = String(b.id || b._id || '');
                  return idB.localeCompare(idA);
                });

                weeksList.push({
                  number: w,
                  label: `Week ${w}`,
                  range,
                  courses: sortedWeekCourses,
                  totalCount: sortedWeekCourses.length,
                });
              }

              return (
                <motion.div key="courses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                  {/* Master Subtab Switcher */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 pb-0.5 mb-6">
                    <button
                      type="button"
                      onClick={() => setDeploymentViewMode('board')}
                      className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 px-1 relative flex items-center gap-2 ${
                        deploymentViewMode === 'board'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                          : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                      }`}
                    >
                      <Layers size={14} /> Weekly Board Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeploymentViewMode('manager')}
                      className={`pb-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 px-1 relative flex items-center gap-2 ${
                        deploymentViewMode === 'manager'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black' 
                          : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                      }`}
                    >
                      <Zap size={14} /> Exam Management & Deployer
                    </button>
                  </div>

                  {deploymentViewMode === 'manager' ? (
                    <DeploymentHub courses={courses} adminToken={admin.token!} onRefreshDashboard={fetchData} />
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                     <div>
                       <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Test Deployment Hub</h2>
                       <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Transform academic modules into active scheduled assessments. Manage parameters and live status.</p>
                       
                       <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 p-1 w-fit mt-4">
                         <button 
                           type="button" 
                           onClick={() => {
                             setCourseListViewMode('folders');
                             setSelectedWeekNum(null);
                           }}
                           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${courseListViewMode === 'folders' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                         >
                           Week Folders
                         </button>
                         <button 
                           type="button" 
                           onClick={() => setCourseListViewMode('flat')}
                           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${courseListViewMode === 'flat' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-950 dark:hover:text-white'}`}
                         >
                           Flat Grid View
                         </button>
                       </div>
                     </div>
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                        <button 
                          onClick={handleToggleUnlimitedReattempts} 
                          className={`px-6 py-4 rounded-[1rem] text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border shadow-inner ${
                            allowUnlimitedReattempts 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                           <Zap size={14} className={allowUnlimitedReattempts ? 'animate-pulse' : ''} />
                           {allowUnlimitedReattempts ? 'Unlimited Reattempts ON' : 'Unlimited Reattempts OFF'}
                        </button>

                        <button onClick={() => setShowAddCourse(true)} className="px-8 py-4 bg-blue-600 text-white rounded-[1rem] text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-blue-500">
                           <Plus size={16} /> Init Module
                        </button>
                     </div>
                  </div>

                  {courseListViewMode === 'folders' ? (
                     selectedWeekNum !== null ? (
                       <div className="space-y-6">
                         <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
                           <button
                             onClick={() => setSelectedWeekNum(null)}
                             className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all cursor-pointer"
                           >
                             <ChevronLeft size={14} strokeWidth={3} />
                             Back to Weeks
                           </button>
                           <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-xl">
                             {weeksList.find(w => w.number === selectedWeekNum)?.label} &bull; {weeksList.find(w => w.number === selectedWeekNum)?.range}
                           </span>
                         </div>

                         {weeksList.find(w => w.number === selectedWeekNum)?.courses.length === 0 ? (
                           <div className="flex flex-col justify-center items-center h-72 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-dashed rounded-[2.5rem] p-8 text-center shadow-sm">
                             <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400">
                                <FolderOpen size={24} className="opacity-50" />
                             </div>
                             <div>
                                <h4 className="text-sm font-black text-slate-700 dark:text-white uppercase tracking-widest">No Active Modules</h4>
                                <p className="text-xs font-medium mt-1.5 max-w-sm mx-auto leading-relaxed text-slate-500 dark:text-slate-400">
                                   There are no examination modules mapped to Week {selectedWeekNum} yet.
                                </p>
                             </div>
                           </div>
                         ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                             {weeksList.find(w => w.number === selectedWeekNum)?.courses.map((course, idx) => course && (
                                  <motion.div 
                                   layout
                                   key={`course_folder_${course.id || course._id}_${idx}`} 
                                   className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col hover:border-blue-500/50 dark:hover:border-blue-500/30 transition-all shadow-sm hover:shadow-md group relative overflow-hidden animate-fade-in"
                                 >
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${course.is_mock ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                    
                                    <div className="flex justify-between items-start mb-3">
                                       <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all shadow-inner group-hover:scale-110 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                                          <IconComponent name={course.icon} size={20} />
                                       </div>
                                       <div className="flex flex-col items-end">
                                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{course.code}</span>
                                          {course.is_mock && (
                                            <span className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-lg shadow-orange-500/30">Mock</span>
                                          )}
                                       </div>
                                    </div>

                                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">{course.title}</h3>
                                    
                                    <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-3">
                                       <div className="space-y-0.5">
                                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono">Items</span>
                                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{course.questionsCount || 0}</span>
                                       </div>
                                       <div className="space-y-0.5">
                                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono">Time</span>
                                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{course.duration}m</span>
                                       </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                       <div className="flex items-center gap-1.5">
                                          {(() => {
                                            const now = new Date();
                                            const sched = course.scheduled_date ? new Date(course.scheduled_date) : null;
                                            const end = (course as any).end_date ? new Date((course as any).end_date) : null;
                                            
                                            if (end && now > end) {
                                              return (
                                                <>
                                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ended</span>
                                                </>
                                              );
                                            }
                                            if (sched && now < sched) {
                                              return (
                                                <>
                                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                  <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Scheduled</span>
                                                </>
                                              );
                                            }
                                            return (
                                              <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                                              </>
                                            );
                                          })()}
                                       </div>
                                       <button 
                                         onClick={() => openCourseEditor(course)} 
                                         className="px-3 py-1.5 bg-slate-950 dark:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                       >
                                          Edit <ChevronRight size={10} />
                                       </button>
                                    </div>
                                 </motion.div>
                             ))}
                           </div>
                         )}
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                         {weeksList.map((week) => (
                           <motion.button
                             whileHover={{ y: -4, scale: 1.01 }}
                             whileTap={{ scale: 0.99 }}
                             key={`adm_week_card_${week.number}`}
                             onClick={() => setSelectedWeekNum(week.number)}
                             className="relative flex flex-col w-full text-left p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all duration-300 overflow-hidden group cursor-pointer"
                           >
                             <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${
                               week.totalCount === 0 
                                 ? 'from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800' 
                                 : 'from-blue-500 to-indigo-500'
                             }`} />

                             <div className="flex justify-between items-start mb-6 w-full">
                               <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                                 week.totalCount === 0
                                   ? 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-850 text-slate-400 dark:text-slate-600'
                                   : 'bg-blue-50 dark:bg-blue-600/5 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-500 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 shadow-sm'
                               }`}>
                                 <Folder size={24} />
                               </div>
                               
                               <span className="px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm">
                                 {week.range}
                               </span>
                             </div>

                             <div className="flex-1 w-full mt-2">
                               <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                 {week.label}
                               </h3>
                               <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                 {week.totalCount === 0 
                                   ? "No examination modules assigned to this week yet." 
                                   : `Contains ${week.totalCount} active examination ${week.totalCount === 1 ? 'module' : 'modules'}.`}
                               </p>
                             </div>

                             <div className="w-full mt-6 pt-4 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-slate-400">
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                 VIEW REGISTER
                               </span>
                               <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-600 group-hover:dark:bg-blue-600 group-hover:border-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 shrink-0">
                                 <ChevronRight size={16} strokeWidth={3} />
                               </div>
                             </div>
                           </motion.button>
                         ))}
                       </div>
                     )
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                      {courses.map((course, idx) => course && (
                           <motion.div 
                            layout
                            key={`course_flat_${course.id || course._id}_${idx}`} 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col hover:border-blue-500/50 dark:hover:border-blue-500/30 transition-all shadow-sm hover:shadow-md group relative overflow-hidden"
                          >
                             <div className={`absolute top-0 left-0 w-1.5 h-full ${course.is_mock ? 'bg-orange-500' : 'bg-blue-500'}`} />
                             
                             <div className="flex justify-between items-start mb-3">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all shadow-inner group-hover:scale-110 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                                   <IconComponent name={course.icon} size={20} />
                                </div>
                                <div className="flex flex-col items-end">
                                   <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{course.code}</span>
                                   {course.is_mock && (
                                     <span className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full shadow-lg shadow-orange-500/30">Mock</span>
                                   )}
                                </div>
                             </div>

                             <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2 min-h-[2.5rem]">{course.title}</h3>
                             
                             <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                   <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono">Items</span>
                                   <span className="text-xs font-black text-slate-700 dark:text-slate-200">{course.questionsCount || 0}</span>
                                </div>
                                <div className="space-y-0.5">
                                   <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono">Time</span>
                                   <span className="text-xs font-black text-slate-700 dark:text-slate-200">{course.duration}m</span>
                                </div>
                             </div>

                             <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                   {(() => {
                                     const now = new Date();
                                     const sched = course.scheduled_date ? new Date(course.scheduled_date) : null;
                                     const end = (course as any).end_date ? new Date((course as any).end_date) : null;
                                     
                                     if (end && now > end) {
                                       return (
                                         <>
                                           <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ended</span>
                                         </>
                                       );
                                     }
                                     if (sched && now < sched) {
                                       return (
                                         <>
                                           <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                           <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Scheduled</span>
                                         </>
                                       );
                                     }
                                     return (
                                       <>
                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                         <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                                       </>
                                     );
                                   })()}
                                </div>
                                <button 
                                  onClick={() => openCourseEditor(course)} 
                                  className="px-3 py-1.5 bg-slate-950 dark:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                >
                                   Edit <ChevronRight size={10} />
                                </button>
                             </div>
                          </motion.div>
                      ))}
                    </div>
                  )}
                    </>
                  )}
                </motion.div>
              );
            })()}


            {activeTab === 'proctoring' && (
              <motion.div key="proctoring" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm gap-2">
                  <div>
                     <h2 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">Live Proctoring Panel</h2>
                     <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Sync: {lastSyncTime.toLocaleTimeString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        handleExportPDF();
                        toast('Exporting', 'Generating violation report PDF...', 'info');
                      }} 
                      className="flex-grow sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-wider text-[9px] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                    >
                      <FileText size={12} /> Export violations
                    </button>
                    <button 
                      onClick={fetchProctoring}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Refresh"
                    >
                      <Activity size={13} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {/* Active Sessions */}
                  <div className="lg:col-span-2 space-y-3">
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse relative block" /> 
                       Recorded Sessions Audit ({activeSessions.filter(s => s.status === 'active' || s.status === 're-connected').length})
                    </h3>
                    {!activeSessions.some(s => s.status === 'active' || s.status === 're-connected') ? (
                       <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] shadow-inner">
                          <Activity size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">No Active Operations detected</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Proctoring assets will materialize when candidates engage the testing engine.</p>
                       </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-5 md:p-4">
                           {activeSessions
                             .filter(s => s && (s.status === 'active' || s.status === 're-connected' || s.status === 'terminated_by_admin' || s.status === 'completed'))
                             .sort((a, b) => {
                               const statusOrder = { 'active': 0, 're-connected': 1, 'terminated_by_admin': 2, 'completed': 3 };
                               const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
                               const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
                               if (aOrder !== bOrder) return aOrder - bOrder;
                               return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
                             })
                             .map((session, idx) => {
                             const getSnap = (session: any) => {
                               if (!session.current_snapshot) return null;
                               if (typeof session.current_snapshot === 'string') {
                                 if (session.current_snapshot.startsWith('{')) {
                                   try {
                                     return JSON.parse(session.current_snapshot);
                                   } catch (e) {
                                     return { webcam: session.current_snapshot };
                                   }
                                 }
                                 return { webcam: session.current_snapshot };
                               }
                               return session.current_snapshot;
                             };
                             const snap = getSnap(session);

                             const progress = session.questions_total ? Math.round(((snap?.answeredCount || 0) / session.questions_total) * 100) : 0;
                             const isTerminated = session.status === 'terminated_by_admin' || session.status === 'terminated';

                             return (
                             <div 
                                key={`proctor_${session.session_id || idx}_${idx}`} 
                                onClick={() => setSelectedProctorSessionId(session.session_id)}
                                 className={`bg-white dark:bg-slate-900 border ${isTerminated ? 'border-red-100 dark:border-red-950 opacity-90' : session.status === 'completed' ? 'border-emerald-100 dark:border-emerald-950' : 'border-slate-200 dark:border-slate-800'} rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col relative`}
                             >
                                <div className="aspect-video bg-slate-950 relative overflow-hidden">
                                   {snap?.webcam ? (
                                      <img src={snap.webcam} className="w-full h-full object-cover scale-x-[-1] opacity-70 group-hover:opacity-100 transition-opacity" alt="Feed" />
                                   ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-slate-800">
                                         <Monitor size={32} className="opacity-20" />
                                      </div>
                                   )}
                                   
                                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                                   <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' || session.status === 're-connected' ? 'bg-emerald-500 animate-pulse' : isTerminated ? 'bg-red-500' : 'bg-slate-500'}`} />
                                      <span className="text-[8px] font-black text-white uppercase tracking-widest">{session.status}</span>
                                   </div>

                                   <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/5">
                                      <span className="text-[7.5px] font-bold text-white/70 uppercase tracking-widest">Seen: {snap?.lastUpdate ? formatToWAT(snap.lastUpdate, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Syncing...'}</span>
                                   </div>

                                   {isTerminated && (
                                     <div className="absolute inset-0 bg-red-950/65 backdrop-blur-[1px] flex items-center justify-center z-10">
                                        <div className="bg-red-600 text-white px-2.5 py-1 font-black text-[8px] uppercase tracking-[0.2em] rounded-lg shadow-xl shrink-0">VOIDED</div>
                                     </div>
                                   )}

                                   {session.incident_count > 0 && (
                                     <div className="absolute top-2 right-2 bg-red-600/90 text-white px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-widest shadow-md">
                                        {session.incident_count} Alerts
                                     </div>
                                   )}
                                </div>

                                 <div className="p-2.5 flex-1 flex flex-col">
                                   <div className="flex justify-between items-start mb-1.5">
                                      <div>
                                         <h4 className="font-black text-slate-900 dark:text-white truncate uppercase tracking-tight text-[11px] leading-tight">{session.student_name}</h4>
                                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{session.course_code || 'EXAM CORE'}</p>
                                      </div>
                                      <div className="w-5 h-5 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                         <ChevronRight size={12} />
                                      </div>
                                   </div>
                                   
                                   <div className="mt-1 space-y-1">
                                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                         <span className="text-slate-400">Progression Path</span>
                                         <span className="text-blue-600 dark:text-blue-400">{progress}%</span>
                                      </div>
                                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                         <motion.div 
                                           initial={{ width: 0 }}
                                           animate={{ width: `${progress}%` }}
                                           className={`h-full transition-all duration-500 ${session.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                         />
                                      </div>
                                   </div>

                                   <div className="mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                         <Activity size={10} className="text-emerald-500" />
                                         <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">
                                            {formatToWAT(session.start_time, { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                      </div>
                                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider">{session.matric_no}</span>
                                   </div>
                                </div>
                             </div>
                             );
                           })}
                        </div>
                    )}
                  </div>

                  {/* Incident Feed */}
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-help" title="Recent security violations">
                           <ShieldAlert size={18} className="text-orange-500" />
                           Violation Feed
                        </h3>
                        <button onClick={handleExportPDF} className="text-[10px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl transition-all border border-blue-100 dark:border-blue-500/20 flex items-center gap-1.5 active:scale-95">
                          <FileText size={14} /> Download PDF
                        </button>
                     </div>
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 h-[600px] overflow-y-auto space-y-4">
                        {incidents.length === 0 ? (
                           <div className="text-center py-10 text-slate-500 text-sm">No incidents reported.</div>
                        ) : (
                           incidents.map((inc, idx) => (
                              <div key={`inc_${inc._id || idx}_${idx}`} className="text-sm p-3 border border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 rounded-xl">
                                 {inc.snapshot && (
                                    <div className="mb-3 rounded overflow-hidden shadow-sm aspect-video bg-black relative">
                                        <img src={inc.snapshot} className="w-full h-full object-cover scale-x-[-1]" alt="Violation Snapshot" />
                                    </div>
                                 )}
                                  <div className="font-bold text-slate-900 dark:text-orange-300 text-xs mb-1 uppercase tracking-tight">{inc.violation}</div>
                                 <div className="text-slate-600 dark:text-slate-400 font-medium">{inc.student_name}</div>
                                 <div className="text-slate-400 dark:text-slate-500 text-xs mt-1 font-mono">{formatToWAT(inc.created_at, { hour: '2-digit', minute: '2-digit', second: '2-digit' })} &bull; {inc.ip_address}</div>
                              </div>
                           ))
                        )}
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                   <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Activity Logs & Audit</h2>
                      <p className="text-[10px] text-slate-450 mt-0.5 uppercase tracking-widest font-bold">Live test event telemetry track.</p>
                   </div>
                   <div className="flex items-center gap-3">
                     <button 
                       onClick={handleClearLogs}
                       className="px-4 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 dark:border-red-900/30"
                     >
                       Clear All
                     </button>
                     <button 
                       onClick={fetchProctoring}
                       className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                     >
                       <Activity size={18} />
                     </button>
                   </div>
                </div>
                
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest font-black">
                        <tr>
                          <th className="px-4 py-2.5">Student Name</th>
                          <th className="px-4 py-2.5">Course Code</th>
                          <th className="px-4 py-2.5">Activity Log Report</th>
                          <th className="px-4 py-2.5">Time Logged</th>
                          <th className="px-4 py-2.5 text-right">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {incidents.length === 0 ? (
                           <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                              <div className="flex flex-col items-center gap-2">
                                 <ShieldAlert size={24} className="opacity-15 text-slate-400" />
                                 <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">No security violations recorded.</span>
                              </div>
                           </td></tr>
                        ) : incidents.map((t, idx) => (
                          <tr key={`adm_audit_${t._id || idx}_${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 group transition-colors">
                            <td className="px-4 py-2">
                               <div className="flex flex-col">
                                  <span className="text-slate-900 dark:text-slate-200 font-black text-[11px] uppercase tracking-tight">{t.student_name}</span>
                                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">{t.matric_no}</span>
                                </div>
                            </td>
                            <td className="px-4 py-2 text-slate-700 dark:text-slate-350 font-mono font-black text-[10px]">{t.course_code}</td>
                            <td className="px-4 py-2">
                              <span className="flex items-center gap-2 text-slate-805 dark:text-slate-300 font-semibold tracking-tight text-[11px]">
                                {t.violation && t.violation.toLowerCase().includes('tab') ? 
                                  <Monitor size={13} className="text-orange-500 shrink-0" /> : 
                                  <ShieldAlert size={13} className="text-red-500 shrink-0" />
                                }
                                {t.violation}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-[10px] text-slate-450 dark:text-slate-400 font-medium">
                               {formatToWAT(t.timestamp, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 text-[8px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">Audit</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'identities' && (
              <motion.div key="identities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm gap-2">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Identity Directory</h2>
                    <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mt-0.5">
                      {(users || []).length} Students Enrolled | {(users || []).filter(u => u && (u.avg_score || 0) >= 50).length} On Track
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setShowAddStudent(true)}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      <Plus size={12} /> Add Student
                    </button>
                    <button 
                      onClick={() => {
                        fetchData();
                        toast('Syncing', 'Refreshing student list...', 'info');
                      }}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Refresh List"
                    >
                      <Activity size={13} />
                    </button>
                    <div className="relative flex-grow md:flex-none">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input 
                        type="text" 
                        placeholder="Search student profile..." 
                        value={studentSearchTerm}
                        onChange={e => setStudentSearchTerm(e.target.value)}
                        className="w-full md:w-56 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-semibold shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const irregularProfiles = (users || []).filter((u: any) => {
                    if (!u) return false;
                    const normalizedName = u.name ? String(u.name).trim() : '';
                    const hasNoName = !normalizedName;

                    const normalizedMatric = u.matric_no ? String(u.matric_no).trim() : '';
                    const numericDigitsCount = normalizedMatric.replace(/[^0-9]/g, '').length;
                    const isIrregularMatric = !normalizedMatric || (numericDigitsCount < 9);

                    const normalizedDept = u.department ? String(u.department).trim().toUpperCase() : '';
                    const isNursingNacon = normalizedDept === 'NURSING NACON';

                    return hasNoName || (isIrregularMatric && !isNursingNacon);
                  });

                  if (irregularProfiles.length > 0) {
                    return (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            {irregularProfiles.length} Irregular student account(s) detected
                          </p>
                          <p className="text-[10px] opacity-80 leading-relaxed max-w-2xl">
                            These accounts have no name or have a matriculation number shorter than 9 characters. 
                            <strong> Nursing NACON</strong> students are exempted from irregular matriculation rules. Use the global delete button to purge them.
                          </p>
                        </div>
                        <button 
                          onClick={handlePurgeIrregularStudents}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                        >
                          <Trash2 size={14} /> Bulk Delete Irregular Accounts
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {(() => {
                      const filteredUsers = (users || []).filter(u => {
                         if (!u) return false;
                         const name = (u.name || '').toLowerCase();
                         const matric = (u.matric_no || '').toLowerCase();
                         const phone = (u.phone || '').toLowerCase();
                         const search = (studentSearchTerm || '').toLowerCase();
                         return name.includes(search) || matric.includes(search) || phone.includes(search);
                      });

                      if (users.length > 0 && filteredUsers.length === 0) {
                         return (
                           <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                              <Search size={48} className="mx-auto mb-4 text-slate-300" />
                              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">No Matches Found</h4>
                              <p className="text-xs text-slate-500 mt-2">Adjust your refinement filter for "{studentSearchTerm}"</p>
                              <button 
                                onClick={() => setStudentSearchTerm('')}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                              >
                                Clear Search
                              </button>
                           </div>
                         );
                      }

                      if (registryError) {
                         return (
                           <div className="col-span-full py-20 text-center bg-red-50 dark:bg-red-900/10 border border-dashed border-red-200 dark:border-red-900/30 rounded-2xl">
                              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600">
                                 <AlertCircle size={40} />
                              </div>
                              <h4 className="text-xl font-black text-red-900 dark:text-red-100 uppercase tracking-tight">Sync Obstruction Detected</h4>
                              <p className="text-xs text-red-600/70 mt-2 max-w-sm mx-auto">{registryError}</p>
                              <button 
                                onClick={fetchData}
                                className="mt-8 px-10 py-4 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-red-600/20 active:scale-95"
                              >
                                Re-Attempt Connection
                              </button>
                           </div>
                         );
                      }

                      if (users.length === 0) {
                         return (
                           <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl">
                              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                                 <Users size={40} />
                              </div>
                              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registry is Currently Empty</h4>
                              <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">No candidates have registered on the platform. Student identities will appear here automatically upon first access.</p>
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                                 <button 
                                   onClick={() => setShowAddStudent(true)}
                                   className="px-8 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
                                 >
                                   Enroll Student Manually
                                 </button>
                                 <button 
                                   onClick={fetchData}
                                   className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                 >
                                   Force Sync Registry
                                 </button>
                              </div>
                           </div>
                         );
                      }

                      return filteredUsers.map((student: any, index: number) => {
                         const normalizedName = student.name ? String(student.name).trim() : '';
                         const hasNoName = !normalizedName;

                         const normalizedMatric = student.matric_no ? String(student.matric_no).trim() : '';
                         const numericDigitsCount = normalizedMatric.replace(/[^0-9]/g, '').length;
                         const isIrregularMatric = !normalizedMatric || (numericDigitsCount < 9);

                         const normalizedDept = student.department ? String(student.department).trim().toUpperCase() : '';
                         const isNursingNacon = normalizedDept === 'NURSING NACON';
                         const isIrregular = hasNoName || (isIrregularMatric && !isNursingNacon);

                         return (
                           <motion.div 
                             whileHover={{ y: -3 }}
                             key={`std_${student.id || student._id || student.matric_no || index}_${index}`} 
                             className={`bg-white dark:bg-slate-950 border p-4 rounded-xl shadow-sm hover:shadow-xl transition-all relative overflow-hidden group border-b-4 ${
                               isIrregular 
                                 ? 'border-red-500/50 border-b-red-600 dark:border-red-950/50' 
                                 : 'border-slate-200 dark:border-slate-800 border-b-blue-600/20'
                             }`}
                           >
                              {isIrregular && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-bl-lg shadow-sm z-10 animate-pulse">
                                   Irregular
                                </div>
                              )}
                              <div className="flex justify-between items-start mb-3">
                                 <div className={`w-10 h-10 ${
                                   isIrregular 
                                     ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' 
                                     : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                 } rounded-xl flex items-center justify-center font-black text-base shadow-inner group-hover:scale-110 transition-transform`}>
                                    {(student.name || '?').charAt(0)}
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    {false && (
                                       <button 
                                           onClick={() => handleDeleteUser(student.id || student._id)}
                                           className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                           title="Globally Delete Irregular Account"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                    )}
                                    <button 
                                        onClick={() => handleEditUser(student)}
                                        className="p-1 bg-slate-50 dark:bg-slate-905 border border-slate-200/50 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                                        title="Edit student profile & scores"
                                    >
                                       <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteUser(student.id || student._id)}
                                        className="p-1 bg-slate-50 dark:bg-slate-905 border border-slate-200/50 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                                        title="Permanently delete student account"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                              </div>
                              <h3 className="text-base font-black text-slate-900 dark:text-white truncate uppercase tracking-tight mb-0.5">
                                 {student.name || <span className="text-red-500 italic font-bold">Missing Name</span>}
                              </h3>
                              <p className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">{student.matric_no}</p>
                              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{student.department}</div>
                              <div className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mb-3 truncate">
                                 {student.phone ? `📱 ${student.phone}` : <span className="text-amber-500/80 dark:text-amber-400/80 italic">📱 No Registered Phone</span>}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                 <div>
                                    <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Avg Score</div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">{(student.avg_score || 0).toFixed(1)}%</div>
                                 </div>
                                 <div>
                                    <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Assessments</div>
                                    <div className="text-xs font-black text-slate-900 dark:text-white">{student.tests_taken || 0}</div>
                                 </div>
                              </div>
                           </motion.div>
                         );
                      });
                   })()}
                </div>
              </motion.div>
            )}

            {activeTab === 'students-results' && (
              <motion.div key="students-results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                 <StudentResultsView 
                    adminToken={admin.token!} 
                    courses={courses} 
                    users={users} 
                    downloadLeaderboardPDF={downloadLeaderboardPDF} 
                    selectedPdfCourse={selectedPdfCourse} 
                    setSelectedPdfCourse={setSelectedPdfCourse} 
                    fetchData={fetchData} 
                 />
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                 <AdminChatView adminToken={admin.token!} />
              </motion.div>
            )}

            {activeTab === 'announcements' && (
              <motion.div key="announcements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Public Broadcast</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Push essential updates to the global candidate hub</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:p-8">
                  <div className="lg:col-span-4">
                    <form onSubmit={handleUploadAnnouncement} className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 space-y-6 sticky top-5 md:p-8">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                              <Megaphone size={18} />
                           </div>
                           <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">New Broadcast</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Subject Header</label>
                            <input 
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                                value={announcementTitle} 
                                placeholder="e.g. Schedule Update"
                                onChange={e => setAnnouncementTitle(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase ml-1">Transmission Content</label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                                value={announcementContent} 
                                placeholder="Message details..."
                                onChange={e => setAnnouncementContent(e.target.value)} 
                                rows={6} 
                                required 
                            />
                        </div>
                        <button disabled={announcementLoading} className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95 group">
                            {announcementLoading ? 'Transmitting...' : 'Initiate Broadcast'} <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </form>

                    {/* Maintenance Mode Control */}
                    <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 space-y-6 mt-5">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 ${maintenanceMode ? 'bg-amber-500 shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} rounded-2xl flex items-center justify-center shadow-lg transition-all`}>
                              <ShieldAlert size={18} className={maintenanceMode ? 'animate-pulse text-white' : ''} />
                           </div>
                           <div>
                              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Maintenance Portal</h3>
                              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase block">Global lockdown settings</span>
                           </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          Activating maintenance mode blocks candidate dashboard access and redirects them to the system upgrades screen. Administrator login remains accessible.
                        </p>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Portal Lockdown</span>
                              <span className={`text-xs font-black uppercase tracking-tight ${maintenanceMode ? 'text-amber-500' : 'text-emerald-500'}`}>
                                 {maintenanceMode ? 'Active / restricted' : 'Inactive / fully open'}
                              </span>
                           </div>
                           
                           {/* iOS Toggle Switch style */}
                           <button 
                             id="admin-maintenance-toggle-btn"
                             type="button"
                             onClick={handleToggleMaintenanceMode}
                             disabled={maintenanceActionLoading}
                             className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}
                           >
                             <span className="sr-only">Toggle Maintenance Mode</span>
                             <span 
                               className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenanceMode ? 'translate-x-5' : 'translate-x-0'}`} 
                             />
                           </button>
                        </div>

                        {maintenanceMode && (
                           <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              <span>Candidates will be routed to the medical portal maintenance screen instantly.</span>
                           </div>
                        )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-4">
                      <div className="flex items-center justify-between mb-4 px-2">
                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Archived Transmissions</h3>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{announcements.length} Total</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                          {announcements.length === 0 ? (
                              <div className="bg-slate-50/50 dark:bg-slate-800/10 border-2 border-dashed border-slate-200 dark:border-slate-800 p-10 md:p-20 rounded-2xl md:rounded-3xl text-center">
                                  <div className="text-slate-300 dark:text-slate-700 mb-4 flex justify-center"><Megaphone size={48} className="opacity-20" /></div>
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Transmissions</p>
                              </div>
                          ) : (
                              announcements.map((ann: any, idx: number) => ann && (
                                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={`ann_${ann.id || idx}_${idx}`} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4 hover:border-blue-500/50 transition-all group relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-500 transition-colors" />
                                      <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                             <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{ann.title}</h4>
                                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">{formatToWAT(ann.created_at)}</span>
                                          </div>
                                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{ann.content}</p>
                                      </div>
                                      <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-3 rounded-xl transition-all shrink-0 active:scale-90" title="Delete Announcement">
                                          <Trash2 size={18} />
                                      </button>
                                  </motion.div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
              </motion.div>
            )}

            {activeTab === 'course-editor' && selectedCourse && (
              <motion.div key="editor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <MergedCourseEditor 
                  course={selectedCourse} 
                  adminToken={admin.token!} 
                  onBack={() => { setSelectedCourse(null); setActiveTab('courses'); }} 
                  onRefreshDashboard={fetchData} 
                />
              </motion.div>
            )}

            {activeTab === 'notes-converter' && (
              <motion.div key="notes-converter" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <NotesMcqConverter adminToken={admin.token!} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddStudent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddStudent(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-5 md:p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Users size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Manual Enrollment</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register a new candidate profile</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAddStudent(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input required value={newStudentData.name} onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matric Number</label>
                      <input required value={newStudentData.matric_no} onChange={e => setNewStudentData({ ...newStudentData, matric_no: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="BNS/SET02/250/..." />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department / Faculty</label>
                    <select 
                      required 
                      value={newStudentData.department} 
                      onChange={e => setNewStudentData({ ...newStudentData, department: e.target.value })} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                    >
                      <option value="">Select Department</option>
                      <option value="MBBS">MBBS</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Pharmacology">Pharmacology</option>
                      <option value="Medical Lab Science">Medical Lab Science</option>
                      <option value="Nursing">Nursing</option>
                      <option value="Nursing NACON">Nursing NACON</option>
                      <option value="Physiotherapy">Physiotherapy</option>
                      <option value="Radiography">Radiography</option>
                      <option value="Anatomy">Anatomy</option>
                      <option value="Physiology">Physiology</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="Biomedical Engineering">Biomedical Engineering</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input value={newStudentData.phone} onChange={e => setNewStudentData({ ...newStudentData, phone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="080XXXXXXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input type="email" value={newStudentData.email} onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="john@example.com" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-xl active:scale-95 transition-all mt-4">
                    Create Identity
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/55">
                <div>
                   <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">Edit Student Identity</h3>
                   <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">Manage Profile & Verified Scores</p>
                </div>
                <button onClick={() => setEditUser(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={16} /></button>
              </div>
              <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/65">
                  <div className="flex items-center gap-2 mb-4">
                     <LayoutGrid className="text-blue-500" size={16} />
                     <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Core Profile Fields</h4>
                  </div>
                  <form onSubmit={handleUpdateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Student Name</label>
                       <input type="text" value={editUser.name || ''} onChange={e => setEditUser({...editUser, name: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" required />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Matric Number</label>
                       <input type="text" value={editUser.matric_no || ''} onChange={e => setEditUser({...editUser, matric_no: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-mono font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" placeholder="e.g. BNS/SET02/250/..." required />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">School Department</label>
                       <select 
                         value={editUser.department || ''} 
                         onChange={e => setEditUser({...editUser, department: e.target.value})} 
                         className="w-full bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all appearance-none" 
                         required
                       >
                         <option value="MBBS">MBBS</option>
                         <option value="Pharmacy">Pharmacy</option>
                         <option value="Pharmacology">Pharmacology</option>
                         <option value="Medical Lab Science">Medical Lab Science</option>
                         <option value="Nursing">Nursing</option>
                         <option value="Nursing NACON">Nursing NACON</option>
                         <option value="Physiotherapy">Physiotherapy</option>
                         <option value="Radiography">Radiography</option>
                         <option value="Anatomy">Anatomy</option>
                         <option value="Physiology">Physiology</option>
                         <option value="Dentistry">Dentistry</option>
                         <option value="Biomedical Engineering">Biomedical Engineering</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Phone Number</label>
                       <input type="text" value={editUser.phone || ''} onChange={e => setEditUser({...editUser, phone: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Academic Strength</label>
                       <input type="text" value={editUser.strength || ''} onChange={e => setEditUser({...editUser, strength: e.target.value})} className="w-full bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-semibold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Registration Date</label>
                       <input type="text" readOnly value={editUser.created_at ? formatToWAT(editUser.created_at) : 'N/A'} className="w-full bg-slate-100/70 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-semibold opacity-70 outline-none" />
                    </div>
                    <div className="col-span-full pt-3 flex items-center justify-between gap-3">
                       <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shadow-blue-500/15">Save Modifications</button>
                       <button type="button" onClick={() => handleDeleteUser(editUser.id || editUser._id)} className="px-4 py-2.5 text-red-650 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-red-100 dark:border-red-955">
                          <Trash2 size={12} /> Purge Student
                       </button>
                    </div>
                  </form>
                </div>
                
                <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2">
                     <Award className="text-blue-500" size={15} />
                     <h4 className="font-black text-[10px] text-slate-500 uppercase tracking-widest">Archived Assessments & Grades</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-50/55 dark:bg-slate-800/20 border-b border-slate-200/80 dark:border-slate-800/80">
                        <tr>
                           <th className="px-4 py-2.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">Vault / Module</th>
                           <th className="px-4 py-2.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">Performance</th>
                           <th className="px-4 py-2.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400">Transmission</th>
                           <th className="px-4 py-2.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                        {userResults.length > 0 ? userResults.map(r => (
                           <tr key={`adm_usr_res_${r.id || r._id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/10 transition-colors">
                              <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-200">{r.code}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black tracking-tight ${(r.percentage || 0) >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : (r.percentage || 0) >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                   {r.percentage}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-[10px] text-slate-500">{formatToWAT(r.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-4 py-2 text-right flex items-center justify-end gap-1.5">
                                 <button 
                                   onClick={async () => {
                                     try {
                                       toast('Recalculating', 'Re-evaluating score against exact randomized sequence...', 'info');
                                       const res = await fetch(`/api/admin/results/${r.id || r._id}/recalculate`, {
                                         method: 'POST',
                                         headers: { 'Authorization': 'Bearer ' + admin.token }
                                       });
                                       const data = await res.json();
                                       if (!res.ok) throw new Error(data.error || 'Failed to recalculate.');
                                       toast('Success', `Recalculated successfully! New score: ${data.percentage}% (Grade: ${data.grade})`, 'success');
                                       handleFetchUserResults(editUser.id || editUser._id);
                                       fetchData();
                                     } catch (e: any) {
                                       toast('Error', e.message || 'Recalculation failed.', 'error');
                                     }
                                   }} 
                                   title="Recalculate Score" 
                                   className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 p-1.5 rounded-lg transition-all"
                                 >
                                    <Activity size={14}/>
                                 </button>
                                 <button onClick={() => downloadTransparencyPDF(r.id || r._id)} title="Print Transparency Report" className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 p-1.5 rounded-lg transition-all">
                                    <FileText size={14}/>
                                 </button>
                                 <button onClick={() => handleDeleteResult(r.id || r._id, editUser.id || editUser._id)} title="Delete Result" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-all">
                                    <Trash size={14}/>
                                 </button>
                              </td>
                           </tr>
                        )) : (
                           <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-450 italic text-[10px]">No archived records found for this identity.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        

        
        <AnimatePresence>
          {showAddCourse && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddCourse(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-[#050505] rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 md:p-6 pb-2 border-b border-slate-100 dark:border-slate-900 shrink-0">
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-1">Deploy Module</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Establish a new test assessment instance</p>
                </div>
                
                <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
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
                                className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!newCourse.is_mock ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                              >Live</button>
                              <button 
                                type="button" 
                                onClick={() => setNewCourse({...newCourse, is_mock: true})}
                                className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${newCourse.is_mock ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
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
                       {(() => {
                         const tempCourse = { scheduled_date: newCourse.scheduled_date || new Date().toISOString() };
                         const week = getWeekForCourse(tempCourse);
                         return (
                           <div className="flex items-center gap-1.5 p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 text-blue-600 dark:text-blue-400">
                             <Info size={12} className="shrink-0" />
                             <span className="text-[9px] font-black uppercase tracking-widest leading-none">Map Folder: {week.label} ({week.range})</span>
                           </div>
                         );
                       })()}
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-loose text-center">
                          If omitted, the module activates immediately upon creation.
                       </p>
                    </div>
                  </form>
                </div>
                
                <div className="p-5 md:p-8 border-t border-slate-100 dark:border-slate-900 shrink-0 flex gap-4 bg-slate-50/50 dark:bg-[#050505]/50">
                    <button type="button" onClick={() => setShowAddCourse(false)} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">Cancel</button>
                    <button type="submit" form="add-course-form" className="flex-1 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Deploy</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {selectedProctorSessionId && (
          (() => {
            const warningReasons = [
              "Please look at the screen",
              "Multiple faces detected",
              "Audio violation / Talking",
              "Phone/Device detected",
              "Leaving the view",
              "Invalid background environment"
            ];
            
            let snapshotData: any = null;
            if (sessionDetails?.current_snapshot) {
              if (typeof sessionDetails.current_snapshot === 'string') {
                if (sessionDetails.current_snapshot.startsWith('{')) {
                  try {
                    snapshotData = JSON.parse(sessionDetails.current_snapshot);
                  } catch (e) {
                    snapshotData = { webcam: sessionDetails.current_snapshot };
                  }
                } else {
                  snapshotData = { webcam: sessionDetails.current_snapshot };
                }
              } else {
                snapshotData = sessionDetails.current_snapshot;
              }
            }
            const answers = snapshotData?.answers || {};
            const answeredCount = snapshotData?.answeredCount || 0;
            const currentIdx = snapshotData?.currentIdx || 0;

            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[95vh] relative text-xs">
                  
                  {loadingDetails && !sessionDetails && (
                     <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <Activity size={32} className="text-blue-600 animate-spin" />
                     </div>
                  )}

                  <button onClick={() => setSelectedProctorSessionId(null)} className="absolute top-4 right-4 z-50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-md hover:rotate-90 transition-all"><X size={16} /></button>

                  {/* Left: Video Feed & Realtime State */}
                  <div className="flex-grow bg-slate-950 flex flex-col min-h-[320px]">
                     <div className="p-4 sm:p-5 pb-0">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                           <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Live Stream Feed</h3>
                        </div>
                     </div>
                                      <div className="flex-1 flex items-center justify-center group relative p-4 sm:p-5">
                        {snapshotData?.webcam ? (
                           <div className="relative w-full max-w-xl aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                              <img src={snapshotData.webcam} className="w-full h-full object-cover scale-x-[-1]" alt="Candidate Feed" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                                 <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Candidate Identity</span>
                                    <span className="text-xs font-bold text-white">{sessionDetails?.student_name}</span>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center text-slate-450">
                              <Activity size={32} className="mb-2 animate-pulse" />
                              <span className="text-xs font-black uppercase tracking-widest">Initializing Secure Feed...</span>
                           </div>
                        )}

                        {sessionDetails?.status === 'terminated_by_admin' && (
                           <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md flex items-center justify-center z-20">
                              <div className="bg-red-600 text-white px-5 py-2 rounded-xl font-black uppercase tracking-[0.1em] text-xs shadow-2xl flex items-center gap-2">
                                  Session Terminated
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Progress & Current Question */}
                     <div className="p-4 sm:p-5 pt-0 bg-black/20 backdrop-blur-md">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
                           <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Items Answered</span>
                              <span className="text-sm font-black text-white">{answeredCount} <span className="text-white/40 text-[10px]">/ {sessionDetails?.questions?.length || 0}</span></span>
                           </div>
                           <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Focus Point</span>
                              <span className="text-sm font-black text-white">Item #{currentIdx + 1}</span>
                           </div>
                           <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Security Score</span>
                              <span className="text-sm font-black text-emerald-400">Stable</span>
                           </div>
                           <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-0.5">Time Elapsed</span>
                              <span className="text-sm font-black text-white">{Math.floor(((new Date()).getTime() - (new Date(sessionDetails?.start_time)).getTime()) / 60000)}m</span>
                           </div>
                        </div>

                        {sessionDetails?.questions && sessionDetails.questions[currentIdx] && (
                           <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">Currently Active Item</span>
                              <h4 className="text-xs font-bold text-white leading-relaxed">{sessionDetails.questions[currentIdx].question_text}</h4>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Right: Question Monitor & Interventions */}
                  <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                     <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center justify-between">
                           Item Audit Trail
                           <span className="bg-slate-900 dark:bg-slate-800 text-white px-1.5 py-0.5 rounded text-[7px]">Live</span>
                        </h3>
                        <div className="space-y-2 max-h-[22vh] overflow-y-auto pr-1.5 custom-scrollbar">
                           {sessionDetails?.questions?.map((q: any, i: number) => {
                              const picked = sessionDetails.answer_overrides?.[q.id] || answers[i];
                              return (
                                 <div key={`adm_p_audit_item_${q.id || i}_${i}`} className={`p-2.5 rounded-xl border transition-all ${picked ? 'bg-white dark:bg-slate-950 border-blue-100 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/30 border-transparent italic'}`}>
                                     <div className="flex justify-between items-start mb-1">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">Item {i + 1}</span>
                                        {picked ? (
                                           <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-0.5">
                                              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                              Log Input
                                           </span>
                                        ) : (
                                           <span className="text-[8px] font-black text-slate-400 uppercase">Awaiting</span>
                                        )}
                                     </div>
                                    <p className="text-[10px] font-bold text-slate-900 dark:text-slate-200 line-clamp-1 mb-2">{q.question_text}</p>
                                    <div className="grid grid-cols-4 gap-1">
                                       {['a', 'b', 'c', 'd'].map(opt => (
                                          <button 
                                             key={`adm_p_opt_${i}_${opt}`} 
                                             onClick={() => handleOverrideAnswer(sessionDetails.id, q.id, `option_${opt}`)}
                                             className={`py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${picked === `option_${opt}` ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'}`}
                                          >
                                             {opt}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                     <div className="p-4 border-t border-slate-250 dark:border-slate-800 overflow-y-auto max-h-[22vh]">
                        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Security Interventions</h3>
                        <div className="grid grid-cols-2 gap-1.5">
                           {warningReasons.map((reason, idx) => (
                             <button
                               key={`adm_warn_reason_${idx}`}
                               onClick={() => handleWarnCandidate(sessionDetails.id, reason)}
                               className="text-left px-2 py-1.5 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-950/40 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 rounded-lg"
                             >
                               {reason.replace("Please look at the screen", "Screen Lock").replace("Multiple faces detected", "Multi-Face").replace("Audio violation / Talking", "Audio Alert").replace("Phone/Device detected", "Phone Alert").replace("Leaving the view", "Left View").replace("Invalid background environment", "Wrong BG")}
                             </button>
                           ))}
                        </div>
                     </div>

                     <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2 mt-auto">
                        <button 
                          onClick={() => handlePruneLogs(sessionDetails.id)}
                          className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                        >
                           <Trash2 size={12} /> Prune Redundant Logs
                        </button>
                        <button 
                          onClick={() => handleTerminateSession(sessionDetails.id)}
                          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10 transition-all active:scale-95"
                        >
                           <ShieldAlert size={12} /> Total Revocation
                        </button>
                     </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminDashboard;
