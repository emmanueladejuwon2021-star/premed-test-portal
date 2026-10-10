/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastContainer } from './components/Toast';

import SplashView from './views/SplashView';
import LoginRegistrationView from './views/LoginRegistrationView';
import AdminLoginView from './views/AdminLoginView';

const StudentDashboard = lazy(() => import('./views/StudentDashboard'));
const HomeHubView = lazy(() => import('./views/HomeHubView'));
const TestConfigView = lazy(() => import('./views/TestConfigView'));
const ReadinessCheckView = lazy(() => import('./views/ReadinessCheckView'));
const TestCountdownView = lazy(() => import('./views/TestCountdownView'));
const TestActiveView = lazy(() => import('./views/TestActiveView'));
const ChillFirstView = lazy(() => import('./views/ChillFirstView'));
const ResultsView = lazy(() => import('./views/ResultsView'));
const TestHistoryView = lazy(() => import('./views/TestHistoryView'));
const AdminDashboard = lazy(() => import('./views/AdminDashboard'));
const QuestionBankView = lazy(() => import('./views/QuestionBankView'));
const LeaderboardView = lazy(() => import('./views/LeaderboardView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const AvailableCoursesView = lazy(() => import('./views/AvailableCoursesView'));
const PremedPracticeConfigView = lazy(() => import('./views/PremedPracticeConfigView'));
const PremedPracticeActiveView = lazy(() => import('./views/PremedPracticeActiveView'));
const PremedPracticeResultsView = lazy(() => import('./views/PremedPracticeResultsView'));
const MedCombatView = lazy(() => import('./views/MedCombatView'));
const MedCombatAdminView = lazy(() => import('./views/MedCombatAdminView'));
const ChatView = lazy(() => import('./views/ChatView'));
const ActiveStudyView = lazy(() => import('./views/ActiveStudyView'));
const MaintenanceView = lazy(() => import('./views/MaintenanceView'));
const QuestionSearchView = lazy(() => import('./views/QuestionSearchView'));

const ProtectedRoute = ({ children, role = 'student' }: { children: React.ReactNode, role?: 'student' | 'admin' }) => {
  const { token, admin } = useAppContext();
  if (role === 'admin' && !admin?.token) return <Navigate to="/admin/login" replace />;
  if (role === 'student' && !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Routes>
        <Route path="/" element={<SplashView />} />
        <Route path="/login" element={<LoginRegistrationView />} />
        <Route path="/admin/login" element={<AdminLoginView />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><HomeHubView /></ProtectedRoute>} />
        <Route path="/tests" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><AvailableCoursesView /></ProtectedRoute>} />
        <Route path="/practice" element={<ProtectedRoute><PremedPracticeConfigView /></ProtectedRoute>} />
        <Route path="/practice-session" element={<ProtectedRoute><PremedPracticeActiveView /></ProtectedRoute>} />
        <Route path="/practice-results" element={<ProtectedRoute><PremedPracticeResultsView /></ProtectedRoute>} />
        <Route path="/config" element={<ProtectedRoute><TestConfigView /></ProtectedRoute>} />
        <Route path="/readiness" element={<ProtectedRoute><ReadinessCheckView /></ProtectedRoute>} />
        <Route path="/countdown" element={<ProtectedRoute><TestCountdownView /></ProtectedRoute>} />
        <Route path="/examination" element={<ProtectedRoute><TestActiveView /></ProtectedRoute>} />
        <Route path="/cooldown" element={<ProtectedRoute><ChillFirstView /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><ResultsView /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><TestHistoryView /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardView /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
        <Route path="/med-combat" element={<ProtectedRoute><MedCombatView /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />
        <Route path="/active-study" element={<ProtectedRoute><ActiveStudyView /></ProtectedRoute>} />
        <Route path="/question-search" element={<ProtectedRoute><QuestionSearchView /></ProtectedRoute>} />
        
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/question-bank" element={<ProtectedRoute role="admin"><QuestionBankView /></ProtectedRoute>} />
        <Route path="/med-combat/admin" element={<ProtectedRoute role="admin"><MedCombatAdminView /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

const LayoutWrapper = () => {
  const location = useLocation();
  const [dynamicMaintenance, setDynamicMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const checkMaintenance = async () => {
      try {
        const response = await fetch('/api/maintenance-status');
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setDynamicMaintenance(!!data.maintenance);
          }
        }
      } catch (err: any) {
        console.warn('Maintenance status check temporarily offline:', err.message || err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    checkMaintenance();
    
    // Poll maintenance status every 10 seconds
    const interval = setInterval(checkMaintenance, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const envMaintenance = (import.meta as any).env?.VITE_MAINTENANCE_MODE === 'true';
  const isMaintenanceActive = envMaintenance || dynamicMaintenance;

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/med-combat/admin');
  const isAdminLoggedIn = (() => {
    try {
      const a = localStorage.getItem('FCF_Admin');
      const parsed = a ? JSON.parse(a) : null;
      return !!(parsed && parsed.isAdmin);
    } catch {
      return false;
    }
  })();

  const bypassMaintenance = isAdminRoute || isAdminLoggedIn;

  if (isMaintenanceActive && !bypassMaintenance) {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 font-sans gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Verifying system status...</p>
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100">Loading...</div>}>
        <MaintenanceView />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-grow flex flex-col relative w-full">
        <AppRoutes />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <LayoutWrapper />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}

