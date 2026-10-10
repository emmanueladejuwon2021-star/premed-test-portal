import React, { useEffect, useState, useRef } from 'react';
import { useAppContext, Course } from '../context/AppContext';
import { toast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, 
  UploadCloud, FileText, Database, 
  Trash, ArrowLeft, Edit, X, Info, Search, Filter, Layers,
  ChevronRight, LayoutGrid, Users, ShieldAlert, Terminal, LogOut, Activity,
  Globe, Check, AlertCircle, Image as ImageIcon, MoreVertical, Send, Settings, Eye, Zap
} from 'lucide-react';
import TextExtractionTool from '../components/TextExtractionTool';
import ThemeToggle from '../components/ThemeToggle';
import { formatToWAT } from '../lib/dateUtils';
import { loadHtml2Pdf } from '../lib/pdfUtils';

export default function QuestionBankView() {
  const { admin, setAdmin, theme } = useAppContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicQuestions, setTopicQuestions] = useState<any[]>([]);
  const [editQuestion, setEditQuestion] = useState<any>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [editTopicMode, setEditTopicMode] = useState(false);
  const [editTopicName, setEditTopicName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [extractionVisible, setExtractionVisible] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: '', title: '' });
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isTopicsLoading, setIsTopicsLoading] = useState(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [tempDiagramFile, setTempDiagramFile] = useState<File | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  function formatQuestionText(text?: string) {
    if (!text) return '';
    // Standard HTML escape to secure overall document structure layout
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Restore safe scientific & layout tags (e.g. sub, sup, b, strong, i, em, u, br)
    formatted = formatted
      .replace(/&lt;sub&gt;/gi, '<sub>')
      .replace(/&lt;\/sub&gt;/gi, '</sub>')
      .replace(/&lt;sup&gt;/gi, '<sup>')
      .replace(/&lt;\/sup&gt;/gi, '</sup>')
      .replace(/&lt;b&gt;/gi, '<b>')
      .replace(/&lt;\/b&gt;/gi, '</b>')
      .replace(/&lt;strong&gt;/gi, '<strong>')
      .replace(/&lt;\/strong&gt;/gi, '</strong>')
      .replace(/&lt;i&gt;/gi, '<i>')
      .replace(/&lt;\/i&gt;/gi, '</i>')
      .replace(/&lt;em&gt;/gi, '<em>')
      .replace(/&lt;\/em&gt;/gi, '</em>')
      .replace(/&lt;u&gt;/gi, '<u>')
      .replace(/&lt;\/u&gt;/gi, '</u>')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br />');

    return formatted;
  }

  const downloadTopicPdf = async () => {
    if (!selectedTopicId) return;
    const currentTopic = topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId));
    if (!currentTopic) return;
    
    if (topicQuestions.length === 0) {
      toast('Empty Result', 'No questions to export for this thread.', 'error');
      return;
    }

    setIsDownloadingPdf(true);
    toast('Generating PDF', 'Preparing high-definition document with exact symbols...', 'info');

    try {
      const activeCourse = courses.find(c => (c.id === selectedCourseId || c._id === selectedCourseId));
      const courseCode = activeCourse?.code || 'Premed';
      const courseTitle = activeCourse?.title || 'Subject';
      const topicName = currentTopic.name;

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.zIndex = '-999999';
      container.style.pointerEvents = 'none';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      let questionsHtml = '';
      topicQuestions.forEach((q, index) => {
        const correctOptLetter = q.correct_option?.replace('option_', '').toUpperCase() || 'A';
        questionsHtml += `
        <div style="page-break-inside: avoid; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 22px; margin-bottom: 25px; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
            <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e40af; letter-spacing: 0.8px;">QUESTION ${index + 1}</span>
            <span style="font-weight: 700; font-size: 9px; color: #047857; background-color: #ecfdf5; padding: 5px 10px; border: 1px solid #a7f3d0; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px; display: inline-flex; align-items: center; gap: 4px;">
              ● SET KEY: OPTION ${correctOptLetter}
            </span>
          </div>
          
          <div style="font-size: 14px; font-weight: 700; line-height: 1.6; color: #0f172a; margin-bottom: 18px; white-space: pre-wrap; word-break: break-word;">${formatQuestionText(q.question_text)}</div>
          
          ${q.diagram_url ? `
          <div style="display: flex; justify-content: center; align-items: center; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 18px; background: #fafafa; max-width: 100%;">
            <img src="${q.diagram_url}" style="max-height: 180px; max-width: 100%; object-fit: contain;" />
          </div>
          ` : ''}
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
             ${['a', 'b', 'c', 'd']
                .filter(opt => {
                  const optionKey = `option_${opt}`;
                  return !!q[optionKey];
                })
                .map(opt => {
                  const optionKey = `option_${opt}`;
                  const optionText = q[optionKey];
                  const isCorrect = q.correct_option === optionKey;
                  
                  return `
                  <div style="display: flex; align-items: center; padding: 11px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 600; line-height: 1.5; word-break: break-word; transition: all 0.2s ease-in-out;
                              ${isCorrect ? 'background-color: #f0fdf4; border: 1.5px solid #86efac; color: #14532d;' : 'background-color: #f8fafc; border: 1.2px solid #f1f5f9; color: #334155;'}">
                    <div style="width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; margin-right: 14px; flex-shrink: 0;
                                ${isCorrect ? 'background-color: #16a34a; color: #ffffff;' : 'background-color: #cbd5e1; color: #475569;'}">
                       ${opt.toUpperCase()}
                    </div>
                    <div style="flex: 1; font-weight: 600;">${formatQuestionText(optionText)}</div>
                    ${isCorrect ? '<span style="color: #16a34a; font-weight: 900; font-size: 15px; margin-left: 12px;">✓</span>' : ''}
                  </div>
                  `;
               }).join('')}
          </div>
        </div>
        `;
      });

      const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif; color: #1e293b; padding: 30px; background-color: #ffffff; min-height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3.5px solid #1e3a8a; padding-bottom: 18px; margin-bottom: 28px;">
          <div>
            <h1 style="font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.8px; color: #1e3a8a; margin: 0; line-height: 1.1;">PREMED ASSESSMENT BANK</h1>
            <p style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2.2px; margin: 6px 0 0 0;">OFFICIAL QUALITY EVALUATION MANUAL</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 10px; font-weight: 800; background-color: #eff6ff; color: #1e40af; padding: 6px 12px; border-radius: 6px; border: 1px dashed #3b82f6; letter-spacing: 0.5px;">AUTHORIZED PERSONNEL ONLY</span>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 24px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 24px; justify-content: space-between; margin-bottom: 35px;">
          <div style="flex: 1.5; min-width: 140px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Course Module</span>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${formatQuestionText(courseCode)} — ${formatQuestionText(courseTitle)}</div>
          </div>
          <div style="flex: 1.2; min-width: 130px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Syllabus Section</span>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${formatQuestionText(topicName)}</div>
          </div>
          <div style="width: 100px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Total Items</span>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${topicQuestions.length} Items</div>
          </div>
          <div style="width: 130px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Date Compiled</span>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 25px;">
          ${questionsHtml}
        </div>
      </div>
      `;

      container.innerHTML = htmlContent;

      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `Syllabus_Bank_${courseCode.replace(/\s+/g, '_')}_${topicName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
          scale: 2.5, 
          useCORS: true, 
          letterRendering: false,
          textRendering: 'geometricPrecision',
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfEngine = await loadHtml2Pdf();
      if (!html2pdfEngine) {
        throw new Error('PDF conversion engine is not loaded yet. Please check your internet connection or refresh the page.');
      }
      await html2pdfEngine().set(opt).from(container).save();
      document.body.removeChild(container);
      toast('Success', 'Beautiful high-fidelity PDF successfully exported.', 'success');
    } catch (e: any) {
      toast('Error', e.message || 'Operation failed.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const downloadCoursePdf = async () => {
    if (!selectedCourseId) return;
    const activeCourse = courses.find(c => (c.id === selectedCourseId || c._id === selectedCourseId));
    if (!activeCourse) return;

    if (topics.length === 0) {
      toast('Syllabus Empty', 'This course contains no threads.', 'error');
      return;
    }

    setIsDownloadingPdf(true);
    toast('Compiling Library', 'Building consolidated PDF from all syllabus sections...', 'info');

    try {
      const courseCode = activeCourse.code || 'Premed';
      const courseTitle = activeCourse.title || 'Subject';

      // Fetch questions for each topic sequentially or in parallel
      const fetchPromises = topics.map(async (t) => {
        try {
          const res = await fetch('/api/admin/questions/' + (t.id || t._id), {
            headers: { 'Authorization': 'Bearer ' + admin.token }
          });
          if (res.ok) {
            const list = await res.json();
            return {
              topicName: t.name,
              questions: Array.isArray(list) ? list : []
            };
          }
        } catch (err) {
          console.error(`Failed to fetch questions for topic: ${t.name}`, err);
        }
        return { topicName: t.name, questions: [] };
      });

      const results = await Promise.all(fetchPromises);
      const totalQuestionsCount = results.reduce((sum, r) => sum + r.questions.length, 0);

      if (totalQuestionsCount === 0) {
        toast('Library Empty', 'None of the threads have active questions.', 'error');
        setIsDownloadingPdf(false);
        return;
      }

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.zIndex = '-999999';
      container.style.pointerEvents = 'none';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      let fullBankHtml = '';

      results.forEach((r, topicIdx) => {
        if (r.questions.length === 0) return;
        
        fullBankHtml += `
          <!-- Topic Divider Header -->
          <div style="page-break-before: ${topicIdx > 0 ? 'always' : 'auto'}; margin-top: 30px; margin-bottom: 25px; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 10px; font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;">
            <h2 style="font-size: 18px; font-weight: 950; text-transform: uppercase; color: #1e3a8a; margin: 0; letter-spacing: 0.5px;">SECTION ${topicIdx + 1}: ${formatQuestionText(r.topicName)}</h2>
            <p style="font-size: 10px; font-weight: 800; color: #475569; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Section Database — ${r.questions.length} Items Indexed</p>
          </div>
        `;

        r.questions.forEach((q, index) => {
          const correctOptLetter = q.correct_option?.replace('option_', '').toUpperCase() || 'A';
          fullBankHtml += `
          <div style="page-break-inside: avoid; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 22px; margin-bottom: 25px; background-color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
              <span style="font-weight: 800; font-size: 11px; text-transform: uppercase; color: #1e40af; letter-spacing: 0.8px;">QUESTION ${index + 1}</span>
              <span style="font-weight: 700; font-size: 9px; color: #047857; background-color: #ecfdf5; padding: 5px 10px; border: 1px solid #a7f3d0; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.8px; display: inline-flex; align-items: center; gap: 4px;">
                ● SET KEY: OPTION ${correctOptLetter}
              </span>
            </div>
            
            <div style="font-size: 14px; font-weight: 700; line-height: 1.6; color: #0f172a; margin-bottom: 18px; white-space: pre-wrap; word-break: break-word;">${formatQuestionText(q.question_text)}</div>
            
            ${q.diagram_url ? `
            <div style="display: flex; justify-content: center; align-items: center; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 18px; background: #fafafa; max-width: 100%;">
              <img src="${q.diagram_url}" style="max-height: 180px; max-width: 100%; object-fit: contain;" />
            </div>
            ` : ''}
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
               ${['a', 'b', 'c', 'd']
                  .filter(opt => {
                    const optionKey = `option_${opt}`;
                    return !!q[optionKey];
                  })
                  .map(opt => {
                    const optionKey = `option_${opt}`;
                    const optionText = q[optionKey];
                    const isCorrect = q.correct_option === optionKey;
                    
                    return `
                    <div style="display: flex; align-items: center; padding: 11px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 600; line-height: 1.5; word-break: break-word; transition: all 0.2s ease-in-out;
                                ${isCorrect ? 'background-color: #f0fdf4; border: 1.5px solid #86efac; color: #14532d;' : 'background-color: #f8fafc; border: 1.2px solid #f1f5f9; color: #334155;'}">
                      <div style="width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; margin-right: 14px; flex-shrink: 0;
                                  ${isCorrect ? 'background-color: #16a34a; color: #ffffff;' : 'background-color: #cbd5e1; color: #475569;'}">
                         ${opt.toUpperCase()}
                      </div>
                      <div style="flex: 1; font-weight: 600;">${formatQuestionText(optionText)}</div>
                      ${isCorrect ? '<span style="color: #16a34a; font-weight: 900; font-size: 15px; margin-left: 12px;">✓</span>' : ''}
                    </div>
                    `;
                 }).join('')}
            </div>
          </div>
          `;
        });
      });

      const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif; color: #1e293b; padding: 30px; background-color: #ffffff; min-height: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3.5px solid #1e3a8a; padding-bottom: 18px; margin-bottom: 28px;">
          <div>
            <h1 style="font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.8px; color: #1e3a8a; margin: 0; line-height: 1.1;">PREMED ASSESSMENT BANK</h1>
            <p style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2.2px; margin: 6px 0 0 0;">OFFICIAL QUALITY EVALUATION MANUAL</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 10px; font-weight: 800; background-color: #eff6ff; color: #1e40af; padding: 6px 12px; border-radius: 6px; border: 1px dashed #3b82f6; letter-spacing: 0.5px;">AUTHORIZED PERSONNEL ONLY</span>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 24px; display: flex; flex-direction: row; flex-wrap: wrap; gap: 24px; justify-content: space-between; margin-bottom: 35px;">
          <div style="flex: 1.5; min-width: 140px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Course Module</span>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${formatQuestionText(courseCode)} — ${formatQuestionText(courseTitle)}</div>
          </div>
          <div style="flex: 1.2; min-width: 130px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Scope</span>
            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">Full Consolidated Syllabus Bank</div>
          </div>
          <div style="width: 100px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Total Items</span>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${totalQuestionsCount} Items</div>
          </div>
          <div style="width: 130px;">
            <span style="font-size: 9.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 5px; letter-spacing: 0.5px;">Date Compiled</span>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${fullBankHtml}
        </div>
      </div>
      `;

      container.innerHTML = htmlContent;

      const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `Full_Compiled_Bank_${courseCode.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { 
          scale: 2.5, 
          useCORS: true, 
          letterRendering: false,
          textRendering: 'geometricPrecision',
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const html2pdfEngine = await loadHtml2Pdf();
      if (!html2pdfEngine) {
        throw new Error('PDF conversion engine is not loaded yet. Please check your internet connection or refresh the page.');
      }
      await html2pdfEngine().set(opt).from(container).save();
      document.body.removeChild(container);
      toast('Success', 'Full Question Bank PDF successfully compiled and downloaded.', 'success');
    } catch (e: any) {
      toast('Error', e.message || 'Operation failed.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const navigate = useNavigate();

  const navItems = [
    { id: 'overview', label: 'Platform Stats', icon: Activity, path: '/admin/dashboard' },
    { id: 'identities', label: 'Student Registry', icon: Users, path: '/admin/dashboard' },
    { id: 'courses', label: 'Test Deployment Hub', icon: Zap, path: '/admin/dashboard' },
    { id: 'question-bank', label: 'Question Bank', icon: Database, path: '/admin/question-bank' },
    { id: 'proctoring', label: 'Live Proctoring', icon: ShieldAlert, path: '/admin/dashboard' },
  ] as const;

  useEffect(() => {
    if (!admin.isAdmin) {
      navigate('/admin/login');
      return;
    }
    setIsInitializing(false);
  }, [admin, navigate]);

  useEffect(() => {
    if (!isInitializing) {
      fetchCourses();
    }
  }, [isInitializing]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchTopics(selectedCourseId);
      setSelectedTopicId(null);
    } else {
      setTopics([]);
      setSelectedTopicId(null);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedTopicId) {
      fetchTopicQuestions(selectedTopicId);
    } else {
      setTopicQuestions([]);
    }
  }, [selectedTopicId]);

  const fetchCourses = async () => {
    setIsCoursesLoading(true);
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Error', 'Failed to fetch courses', 'error');
    } finally {
      setIsCoursesLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.title) {
      toast('Incomplete', 'Please provide both code and title.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + admin?.token
        },
        body: JSON.stringify({
          ...newCourse,
          icon: 'Book',
          duration: 30,
          question_limit: 20
        })
      });
      const data = await res.json();
      if (data.success) {
        toast('Registry Success', 'Module instantiated successfully.', 'success');
        setShowCourseModal(false);
        setNewCourse({ code: '', title: '' });
        fetchCourses();
        if (data.id) {
           setSelectedCourseId(data.id);
        }
      } else {
        toast('Registry Error', data.error || 'Failed to instantiate.', 'error');
      }
    } catch (e) {
      toast('Error', 'Fatal sync fault.', 'error');
    }
  };

  const fetchTopics = async (courseId: string) => {
    setIsTopicsLoading(true);
    try {
      const res = await fetch('/api/courses/' + courseId + '/topics');
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : []);
    } catch (e) {
      toast('Error', 'Failed to fetch topics', 'error');
    } finally {
      setIsTopicsLoading(false);
    }
  };

  const fetchTopicQuestions = async (topicId: string) => {
    setIsQuestionsLoading(true);
    try {
      const res = await fetch('/api/admin/questions/' + topicId, {
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      const data = await res.json();
      setTopicQuestions(Array.isArray(data) ? data : []);
    } catch(e) {
      setTopicQuestions([]);
    } finally {
      setIsQuestionsLoading(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion) return;
    try {
      const isNew = !editQuestion.id;
      const url = isNew ? '/api/admin/questions' : '/api/admin/questions/' + editQuestion.id;
      const method = isNew ? 'POST' : 'PUT';
      
      // Strip base64 diagram_url for new questions to prevent oversized payloads
      // It will be uploaded separately via tempDiagramFile logic
      const payload = isNew 
        ? { ...editQuestion, topic_id: selectedTopicId, diagram_url: null } 
        : editQuestion;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      // If it was a new question and we have a temp diagram, upload it now
      if (isNew && tempDiagramFile && data.id) {
        const formData = new FormData();
        formData.append('diagram', tempDiagramFile);
        await fetch(`/api/admin/questions/${data.id}/diagram`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + admin.token },
          body: formData
        });
      }

      toast('Success', isNew ? 'Question created.' : 'Question updated.', 'success');
      setEditQuestion(null);
      setTempDiagramFile(null);
      if (selectedTopicId) fetchTopicQuestions(selectedTopicId);
    } catch(e: any) {
      toast('Error', e.message || 'Mutation failed.', 'error');
    }
  };

  const handleAddNewQuestion = () => {
    if (!selectedTopicId) {
      toast('Topic Error', 'Please select a topic first.', 'error');
      return;
    }
    setTempDiagramFile(null);
    setEditQuestion({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'option_a',
      diagram_url: null
    });
  };

  const handleDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editQuestion) return;
    
    if (!editQuestion.id) {
       // New question: store locally for upload after creation
       setTempDiagramFile(file);
       const reader = new FileReader();
       reader.onloadend = () => {
         setEditQuestion({ ...editQuestion, diagram_url: reader.result as string });
       };
       reader.readAsDataURL(file);
       toast('Image Stage', 'Diagram staged for deployment.', 'info');
       return;
    }
    
    const formData = new FormData();
    formData.append('diagram', file);

    try {
      const url = `/api/admin/questions/${editQuestion.id}/diagram`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + admin.token },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success) {
        setEditQuestion({ ...editQuestion, diagram_url: data.diagram_url });
        // Also update in list if present
        setTopicQuestions(prev => prev.map(q => q.id === editQuestion.id ? { ...q, diagram_url: data.diagram_url } : q));
        toast('Success', 'Diagram integrated into registry.', 'success');
      } else {
        throw new Error(data.error || 'Diagnostic failure.');
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast('Upload Failed', err.message || 'System error during binary deployment.', 'error');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedTopicId) return;
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${qId}/${selectedTopicId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + admin.token }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Deletion failed');
      }
      toast('Deleted', 'Question deleted.', 'success');
      fetchTopicQuestions(selectedTopicId);
      if (editQuestion && editQuestion.id === qId) {
        setEditQuestion(null);
      }
    } catch(e: any) {
      toast('Error', e.message || 'Deletion failed.', 'error');
    }
  };

  const handleAddTopic = async () => {
    if (!selectedCourseId || !newTopicName.trim()) return;
    const addedName = newTopicName.trim();
    try {
      const res = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ course_id: selectedCourseId, names: [addedName] })
      });
      if (res.ok) {
        toast('Success', 'Topic created successfully.', 'success');
        setNewTopicName('');
        const resList = await fetch('/api/courses/' + selectedCourseId + '/topics');
        const data = await resList.json();
        const nextTopics = Array.isArray(data) ? data : [];
        setTopics(nextTopics);
        const addedOne = nextTopics.find((t: any) => (t.id === addedName || t._id === addedName || t.name === addedName));
        if (addedOne) setSelectedTopicId(addedOne.id || addedOne._id);
      }
    } catch (e) {
      toast('Error', 'Topic insertion failed.', 'error');
    }
  };

  const handleUpdateTopic = async () => {
    if (!selectedTopicId || !editTopicName) return;
    try {
      const res = await fetch('/api/admin/topics/' + selectedTopicId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ name: editTopicName })
      });
      if (res.ok) {
        toast('Success', 'Topic updated', 'success');
        setEditTopicMode(false);
        const updatedTopics = topics.map(t => (t.id === selectedTopicId || t._id === selectedTopicId) ? { ...t, name: editTopicName } : t);
        setTopics(updatedTopics);
      }
    } catch {}
  };

  const handleClearTopic = async () => {
    if (!selectedTopicId) return;
    if (!confirm('Are you sure you want to clear ALL questions in this topic? This action is irreversible.')) return;
    
    try {
        const res = await fetch('/api/admin/clear-topic/' + selectedTopicId, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + admin.token }
        });
        if (res.ok) {
          toast('Registry Purged', 'Partition data has been cleared.', 'success');
          fetchTopicQuestions(selectedTopicId);
        } else {
          toast('Error', 'Failed to clear registry.', 'error');
        }
    } catch {
        toast('Error', 'Fatal sync fault.', 'error');
    }
  };

  const handleToolDeploy = async (questions: any[]) => {
    if (!selectedTopicId) return;

    try {
      const res = await fetch('/api/admin/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + admin.token },
        body: JSON.stringify({ topic_id: selectedTopicId, questions })
      });
      if (res.ok) {
        toast('Success', 'Questions uploaded successfully.', 'success');
        fetchTopicQuestions(selectedTopicId);
        setExtractionVisible(false);
      }
    } catch (e) {
      toast('Error', 'Network error.', 'error');
    }
  };

  const handleLogout = () => {
    setAdmin({ token: null, isAdmin: false });
    navigate('/admin/login');
  };

    const filteredQuestions = Array.isArray(topicQuestions) ? topicQuestions.filter(q => q && (
    (q.question_text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.option_a || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.option_b || '').toLowerCase().includes(searchQuery.toLowerCase())
  )) : [];

  if (isCoursesLoading || isInitializing) {
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
                   <Database size={40} className="text-blue-600 animate-bounce" />
                </div>
             </div>
             <div className="text-center space-y-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">Syncing Vault</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">{isInitializing ? 'Establishing secure connection...' : 'Establishing secure connection to the central testing repository...'}</p>
             </div>
          </motion.div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Mobile Header Adaptor */}
      <div className="md:hidden sticky top-0 z-50 flex items-center justify-between bg-white dark:bg-[#050505] border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Database size={16} />
          </div>
          <span className="font-black text-xs uppercase tracking-widest">Question Bank</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500">
          <Filter size={20} />
        </button>
      </div>

      {/* Shared Dashboard Sidebar */}
      <aside className={`fixed md:relative top-0 left-0 z-50 h-full md:h-screen bg-white dark:bg-black border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 w-72 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 md:p-8 border-b border-slate-200 dark:border-slate-800">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h1 className="font-black text-sm uppercase tracking-tight">Admin OS</h1>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Intelligence Unit</span>
              </div>
           </div>

           <div className="space-y-1">
              {navItems.map(item => (
                 <button 
                  key={`qnav_${item.id}`} 
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${item.id === 'question-bank' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={16} />
                    {item.label}
                  </div>
                  {item.id === 'question-bank' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                </button>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 custom-scrollbar">
           <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contextual Scope</h3>
                 <button 
                  onClick={() => setShowCourseModal(true)}
                  className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 transition-colors"
                  title="Add New Module"
                >
                  <Plus size={14}/>
                </button>
              </div>
              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Module Mapping</label>
                 <select 
                   value={selectedCourseId || ''} 
                   onChange={e => setSelectedCourseId(e.target.value || null)}
                   className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-black focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                 >
                   <option value="">Choose Course</option>
                   {courses.map((c, i) => c && <option key={`qcourse_${c.id || c._id || i}`} value={c.id || c._id}>{c.code}</option>)}
                 </select>
              </div>

              {selectedCourseId && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <div className="flex items-center justify-between px-1">
                      <h3 className="text-[9px] font-black uppercase text-slate-400">Knowledge Threads</h3>
                      <button 
                        onClick={() => setNewTopicName('New Thread ' + (topics.length + 1))} 
                        className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 transition-colors"
                      >
                        <Plus size={14}/>
                      </button>
                   </div>
                   <div className="space-y-1">
                      {isTopicsLoading ? (
                         <div className="py-8 flex flex-col items-center gap-2">
                            <Activity size={24} className="text-blue-500 animate-spin" />
                            <span className="text-[10px] font-black uppercase text-slate-400 animate-pulse">Syncing Threads</span>
                         </div>
                      ) : (
                        <>
                         {topics.length === 0 && !newTopicName && (
                           <div className="px-4 py-8 text-center border border-dashed border-slate-100 dark:border-slate-900 rounded-2xl">
                              <p className="text-[9px] font-black uppercase text-slate-400 leading-relaxed">No threads found.<br/>Instantiate a new one.</p>
                           </div>
                         )}
                         {topics.map((t, i) => t && (
                           <button 
                             key={`qtopic_${t.id || t._id || i}`} 
                             onClick={() => setSelectedTopicId(t.id || t._id)}
                             className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTopicId === (t.id || t._id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'}`}
                           >
                              {t.name}
                           </button>
                         ))}
                        </>
                      )}
                   </div>

                   {newTopicName !== '' && (
                     <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
                        <div className="space-y-1">
                           <label className="text-[8px] font-black uppercase text-blue-500 ml-1">Thread Identifier</label>
                           <input 
                             id="new-topic-input"
                             value={newTopicName} 
                             onChange={e => setNewTopicName(e.target.value)} 
                             className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
                             placeholder="E.g. Cell Biology"
                             autoFocus 
                           />
                        </div>
                        <div className="flex gap-2">
                           <button onClick={handleAddTopic} className="flex-1 py-3 bg-blue-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all">Consolidate</button>
                           <button onClick={() => setNewTopicName('')} className="px-4 py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 text-[9px] font-black rounded-xl uppercase tracking-widest transition-all">Cancel</button>
                        </div>
                     </div>
                   )}
                </div>
              )}

              {selectedCourseId && (
                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-900">
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-900 border-b-4 border-b-blue-600/20">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">
                        <Activity size={14} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Module Density</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-slate-400">Total Items</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{courses.find(c => (c.id === selectedCourseId || c._id === selectedCourseId))?.questionsCount || 0}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-slate-400">Knowledge Threads</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{topics.length}</span>
                       </div>
                       <div className="h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, ((courses.find(c => c.id === selectedCourseId)?.questionsCount || 0) / 100) * 100)}%` }}
                          />
                       </div>
                    </div>
                  </div>
                </div>
              )}
           </div>
        </div>

        <div className="p-5 md:p-8 border-t border-slate-100 dark:border-slate-800 space-y-3">
           <ThemeToggle />
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all">
              <LogOut size={16} /> Terminate
           </button>
        </div>
      </aside>

      {/* Primary Registry View */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#020202] relative h-screen custom-scrollbar">
        
        {/* Navigation Breadcrumbs & Master Control */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#020202]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900 px-4 md:px-8 py-4 md:py-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    <span>Registry</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-600 italic">Questions</span>
                    {selectedCourseId && (
                      <>
                        <ChevronRight size={10} />
                        <span>{courses.find(c => (c.id === selectedCourseId || c._id === selectedCourseId))?.code || '...'}</span>
                      </>
                    )}
                    {selectedTopicId && (
                      <>
                        <ChevronRight size={10} />
                        <span className="text-slate-900 dark:text-white">{topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name || '...'}</span>
                      </>
                    )}
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {selectedTopicId ? (topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name || 'Knowledge Thread') : 'Question Bank'}
                 </h2>
              </div>

              <div className="flex items-center gap-3">
                 {selectedTopicId && (
                   <>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Search items..." 
                          className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-3.5 text-xs font-bold w-full md:w-80 shadow-inner focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                    </div>
                    <button onClick={() => setExtractionVisible(!extractionVisible)} className={`p-4 rounded-2xl border transition-all ${extractionVisible ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-500'}`}>
                        <UploadCloud size={20} />
                    </button>
                    <button onClick={handleAddNewQuestion} className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                        <Plus size={16} /> Add Essential
                    </button>
                   </>
                 )}
              </div>
           </div>
        </div>

        <div className="p-5 md:p-8 md:p-12 space-y-12 pb-32">
           
           {isQuestionsLoading && (
              <div className="fixed top-24 right-8 z-50 flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl animate-in slide-in-from-right-10">
                 <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Syncing Intelligence Database</span>
              </div>
           )}
           
           <AnimatePresence>
              {extractionVisible && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                   <div className="bg-slate-900 text-white rounded-[2rem] md:rounded-[3rem] p-10 shadow-2xl relative overflow-hidden mb-12">
                      <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none"><UploadCloud size={160} /></div>
                      <div className="relative z-10">
                         <div className="flex items-center justify-between mb-8">
                            <div>
                               <h3 className="text-2xl font-black uppercase tracking-tight mb-1">AI Injection Engine</h3>
                               <p className="text-xs text-white/40 uppercase tracking-widest font-black">Bulk extraction from documentation & transcipts</p>
                            </div>
                            <button onClick={() => setExtractionVisible(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
                         </div>
                         <TextExtractionTool 
                            token={admin.token} 
                            onDeploy={handleToolDeploy} 
                            courseContext={courses.find(c => (c.id === selectedCourseId || c._id === selectedCourseId))?.code || ''}
                            topicContext={topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name || ''}
                         />
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>

           {!selectedTopicId ? (
              <div className="py-12 md:py-32 flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                 <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
                    <div className="w-32 h-32 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-black rounded-[2rem] md:rounded-[3rem] flex items-center justify-center text-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10 rotate-3 hover:rotate-0 transition-transform duration-500">
                       <Database size={48} className="text-blue-600" />
                    </div>
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white absolute -bottom-4 -right-4 shadow-xl shadow-emerald-500/30 z-20 -rotate-6 hover:rotate-0 transition-transform">
                       <Layers size={28} />
                    </div>
                 </motion.div>
                 
                 <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
                   Central <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">Knowledge</span> Vault
                 </h3>
                 <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-16 leading-relaxed">
                   Orchestrate the academic foundation. Map your modules, define rigorous knowledge threads, and deploy comprehensive assessment units.
                 </p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:p-8 w-full text-left">
                    <div className={`group p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${selectedCourseId ? 'bg-white dark:bg-slate-900/50 border border-emerald-200 dark:border-emerald-800/30 shadow-lg shadow-emerald-500/5' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl'}`}>
                       {selectedCourseId ? <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" /> : <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />}
                       <div className="relative z-10">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-xl transition-all ${selectedCourseId ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                            {selectedCourseId ? <Check size={28} /> : <Globe size={28} />}
                         </div>
                         <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedCourseId ? 'text-emerald-500' : 'text-blue-600'}`}>Phase 1 {selectedCourseId ? '• Configured' : '• Pending'}</div>
                         <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2 leading-none">Module Definition</div>
                         <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed max-w-[90%]">Every question in the vault must belong to a top-level academic module or test deployed in the system.</p>
                       </div>
                       
                       <div className="space-y-4 relative z-10 mt-auto">
                          {courses.length > 0 && (
                            <div className="relative group/select">
                              <select 
                                 value={selectedCourseId || ''} 
                                 onChange={e => setSelectedCourseId(e.target.value || null)}
                                 className={`w-full bg-slate-50 dark:bg-black text-slate-900 dark:text-white border ${selectedCourseId ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-slate-200 dark:border-slate-800'} rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none cursor-pointer appearance-none`}
                              >
                                 <option value="">Choose Existing Module...</option>
                                 {courses.map(c => c && <option key={`qmain_course_${c.id || c._id}`} value={c.id || c._id}>{c.code} — {c.title}</option>)}
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
                       <div className="p-5 md:p-8 bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-70 cursor-not-allowed">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-400 dark:text-slate-600">
                             <Layers size={28} />
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">Phase 2 • Locked</div>
                          <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Knowledge Threads</div>
                          <p className="text-xs text-slate-400 font-medium max-w-[80%]">First configure the module definition, then define specific syllabus topics here.</p>
                       </div>
                    ) : (
                       <div className="group p-5 md:p-8 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 shadow-2xl shadow-blue-500/10 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col justify-between transition-all relative overflow-hidden">
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
                                    {topics.map(t => t && <option key={`qmain_topic_${t.id || t._id}`} value={t.id || t._id}>{t.name}</option>)}
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
              </div>
           ) : (
           <div className="flex flex-col space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                 <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                       <Layers size={24} />
                    </div>
                    <div>
                       {editTopicMode ? (
                          <div className="flex items-center gap-2 mb-1">
                             <input 
                               value={editTopicName}
                               onChange={e => setEditTopicName(e.target.value)}
                               autoFocus
                               onKeyDown={e => {
                                 if (e.key === 'Enter') handleUpdateTopic();
                                 if (e.key === 'Escape') setEditTopicMode(false);
                               }}
                               className="bg-slate-50 dark:bg-slate-900 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/50"
                             />
                             <button onClick={handleUpdateTopic} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"><Check size={14}/></button>
                             <button onClick={() => setEditTopicMode(false)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><X size={14}/></button>
                          </div>
                       ) : (
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                               {topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name}
                             </h3>
                             <button onClick={() => {
                                setEditTopicName(topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name || '');
                                setEditTopicMode(true);
                             }} className="p-1.5 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                                <Edit size={12} />
                             </button>
                             <button onClick={handleClearTopic} title="Clear Topic" className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                                <Trash2 size={12} />
                             </button>
                          </div>
                       )}
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                         {topicQuestions.length} Register Elements
                       </p>
                    </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <button onClick={handleAddNewQuestion} className="px-6 py-3 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200">
                       <Plus size={14} /> Add Entry
                    </button>
                    <button onClick={() => setExtractionVisible(true)} className="px-6 py-3 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center gap-2">
                       <UploadCloud size={14} /> Auto-Extract
                    </button>
                    <button 
                       onClick={downloadTopicPdf} 
                       disabled={isDownloadingPdf}
                       className="px-6 py-3 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 animate-fade-in"
                    >
                       <FileText size={14} /> 
                       {isDownloadingPdf ? 'Compiling...' : 'Syllabus PDF'}
                    </button>
                    <button 
                       onClick={downloadCoursePdf} 
                       disabled={isDownloadingPdf}
                       className="px-6 py-3 bg-indigo-50 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center gap-2 animate-fade-in"
                    >
                       <Database size={14} /> 
                       {isDownloadingPdf ? 'Compiling...' : 'Module PDF'}
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 md:p-8">
                 {filteredQuestions.length === 0 ? (
                    <div className="col-span-full py-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[3rem] text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/20">
                       <div className="w-20 h-20 bg-white dark:bg-slate-950 rounded-3xl shadow-sm flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
                          <Layers size={32} />
                       </div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Thread Initialized</h3>
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm mb-8 leading-relaxed">
                          This thread currently contains no challenges. Add some to get started.
                       </p>
                    </div>
                 ) : (
                    filteredQuestions.map((q, idx) => (
                       <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={`question_${q.id || q._id || idx}`}
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-transparent hover:border-b-blue-600 relative overflow-hidden h-fit"
                       >
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.8rem] p-6 mb-4 relative z-10 border border-slate-100 dark:border-slate-800/50 min-h-[140px] flex flex-col justify-between">
                             <div className="flex items-center justify-between mb-4">
                                <span className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Entry #{idx + 1}</span>
                                <div className="flex gap-2">
                                   <button onClick={() => setEditQuestion(q)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><Edit size={14} /></button>
                                   <button onClick={() => handleDeleteQuestion(q.id || q._id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800"><Trash size={14}/></button>
                                </div>
                             </div>
                             <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-relaxed line-clamp-3">
                                {q.question_text}
                             </p>
                          </div>

                          {q.diagram_url && (
                             <div className="px-4 mb-4">
                                <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-32 flex items-center justify-center p-2 group-hover:rotate-1 transition-transform">
                                   <img src={q.diagram_url} alt="Schematic" className="h-full w-full object-contain" />
                                </div>
                             </div>
                          )}

                          <div className="px-2 space-y-2 mb-2">
                             {['a','b','c','d'].map(opt => (
                                <div key={opt} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${q.correct_option === `option_${opt}` ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/30' : 'bg-transparent border-slate-100 dark:border-slate-900'}`}>
                                   <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase ${q.correct_option === `option_${opt}` ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                                      {opt}
                                   </div>
                                   <span className={`text-[11px] font-bold truncate ${q.correct_option === `option_${opt}` ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                                      {q[`option_${opt}`]}
                                   </span>
                                   {q.correct_option === `option_${opt}` && <Check size={14} className="ml-auto text-emerald-500" />}
                                </div>
                             ))}
                          </div>
                       </motion.div>
                    ))
                 )}
              </div>
           </div>
           )}
        </div>
      </main>

      {/* Slide-Over Professional Editor */}
      <AnimatePresence>
        {editQuestion && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditQuestion(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-xl bg-white dark:bg-black h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
               <div className="p-5 md:p-8 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-slate-50/50 dark:bg-[#050505]">
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-tight">{editQuestion.id || editQuestion._id ? 'Modify Registry Item' : 'New Knowledge Entry'}</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Topic: {topics.find(t => (t.id === selectedTopicId || t._id === selectedTopicId))?.name || 'Generic'}</p>
                  </div>
                  <button onClick={() => setEditQuestion(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl transition-all">
                     <X size={24} />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-10 custom-scrollbar">
                  <form id="q-form" onSubmit={handleUpdateQuestion} className="space-y-10">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Question Statement</label>
                        <textarea 
                          value={editQuestion.question_text || ''} 
                          onChange={e => setEditQuestion({...editQuestion, question_text: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none min-h-[160px] resize-none leading-relaxed"
                          placeholder="What is the physiological response to..."
                          required
                        />
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Diagram Schematic</label>
                        <div className="flex flex-col gap-4">
                           {editQuestion.diagram_url && (
                             <div className="relative rounded-[2rem] overflow-hidden border-2 border-slate-100 dark:border-slate-900 p-2 bg-slate-50 dark:bg-[#020202]">
                                <img src={editQuestion.diagram_url} alt="Preview" className="max-h-48 w-full object-contain" />
                                <button type="button" onClick={() => setEditQuestion({...editQuestion, diagram_url: null})} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg shadow-xl hover:scale-110 transiton-all"><Trash2 size={14}/></button>
                             </div>
                           )}
                           <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all group">
                              <div className="flex flex-col items-center">
                                 <Plus size={24} className="text-slate-300 group-hover:text-blue-500 transition-colors mb-2" />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deploy Image Binary</span>
                              </div>
                              <input type="file" className="hidden" accept="image/*" onChange={handleDiagramUpload} />
                           </label>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valid Response Mapping</label>
                        <div className="grid grid-cols-1 gap-4">
                           {['a','b','c','d'].map(opt => (
                              <div key={opt} className={`p-4 rounded-[2rem] border transition-all ${editQuestion.correct_option === `option_${opt}` ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 ring-2 ring-emerald-500/20' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900'}`}>
                                 <div className="flex items-center justify-between mb-3 px-2">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase ${editQuestion.correct_option === `option_${opt}` ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{opt}</div>
                                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option {opt}</span>
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={() => setEditQuestion({...editQuestion, correct_option: `option_${opt}`})}
                                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${editQuestion.correct_option === `option_${opt}` ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white dark:bg-black text-slate-400 border border-slate-200 dark:border-slate-800'}`}
                                    >
                                       {editQuestion.correct_option === `option_${opt}` ? 'Primary Correct' : 'Mark Correct'}
                                    </button>
                                 </div>
                                 <input 
                                   value={editQuestion[`option_${opt}`] || ''} 
                                   onChange={e => setEditQuestion({...editQuestion, [`option_${opt}`]: e.target.value})}
                                   className="w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/50"
                                   required
                                 />
                              </div>
                           ))}
                        </div>
                     </div>
                  </form>
               </div>

               <div className="p-5 md:p-8 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-black flex gap-4">
                  <button onClick={() => setEditQuestion(null)} className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">Discard Changes</button>
                  <button form="q-form" type="submit" className="flex-1 bg-slate-950 dark:bg-white text-white dark:text-slate-950 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Commit Registry Entry</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Course Creation Overlay */}
      <AnimatePresence>
        {showCourseModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCourseModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-[#050505] rounded-[2rem] md:rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Instantiate Module</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Registering new academic block into the main index</p>
              
              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Module Code</label>
                  <input 
                    value={newCourse.code}
                    onChange={e => setNewCourse({...newCourse, code: e.target.value.toUpperCase()})}
                    placeholder="E.g. BIO101"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Module Full Title</label>
                  <input 
                    value={newCourse.title}
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                    placeholder="E.g. Introduction to Biology"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCourseModal(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Abort</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30">Commit</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  function overviewAggregate(questions: any[]) {
     return Array.isArray(questions) ? questions.length : 0;
  }
}
