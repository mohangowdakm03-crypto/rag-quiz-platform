import React, { useState, useEffect, useCallback } from 'react';
import SessionsHub from './components/SessionsHub';
import ConductedSessionView from './components/ConductedSessionView';
import QuizCreator from './components/QuizCreator';
import HostProjectorView from './components/HostProjectorView';
import GoogleSheetsSetupModal from './components/GoogleSheetsSetupModal';
import TeacherAuthModal from './components/TeacherAuthModal';
import OxvaneLogo from './components/OxvaneLogo';
import AppleSupportModal from './components/AppleSupportModal';
import { subscribeToTeacherAuth, logoutTeacher } from './services/authService';
import { 
  verifyInstructorPasscode, 
  fetchTeacherSessions, 
  deleteTeacherSession,
  rehostQuizSession,
  getQuizDefinition,
  saveQuizDefinition
} from './supabase';
import { ShieldCheck, Sparkles, Lock, Key, AlertTriangle, Tv, LogOut, User } from 'lucide-react';

export default function TeacherApp() {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [teacherPasscode, setTeacherPasscode] = useState('authenticated_user');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Apple Support Modal State
  const [supportModal, setSupportModal] = useState({
    isOpen: false,
    category: 'support'
  });

  // Subscribe to real-time teacher authentication state with strict cryptographic verification
  useEffect(() => {
    const unsubscribe = subscribeToTeacherAuth(async (teacher) => {
      if (teacher) {
        setCurrentTeacher(teacher);
        setIsAuthenticated(true);
        setTeacherPasscode('authenticated_user');
      } else {
        sessionStorage.removeItem('oxvane_teacher_auth');
        sessionStorage.removeItem('rag_instructor_passcode');
        sessionStorage.removeItem('rag_instructor_passcode_hash');
        setCurrentTeacher(null);
        setIsAuthenticated(false);
        setTeacherPasscode('');
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Multi-page navigation state: 'hub' | 'session' | 'create'
  const [view, setView] = useState('hub');
  const [selectedSessionPin, setSelectedSessionPin] = useState('');
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [rehostingPin, setRehostingPin] = useState(null);

  // Classroom Projector & Google Sheets Live Modal State
  const [projectorSessionPin, setProjectorSessionPin] = useState(null);
  const [sheetsModalData, setSheetsModalData] = useState(null); // { sessionPin, sessionTitle, initialUrl }

  // Quiz Creator configuration state
  const [creatorState, setCreatorState] = useState({
    mode: 'create', // 'create' | 'edit' | 'duplicate'
    pin: null,
    data: null
  });

  // Load all sessions (Strictly authenticated)
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await fetchTeacherSessions(teacherPasscode);
      setSessions(list);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [teacherPasscode]);

  // Parse initial route from URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionParam = params.get('session') || params.get('quiz');
      const actionParam = params.get('action');
      const projectorParam = params.get('projector');

      if (projectorParam) {
        setProjectorSessionPin(projectorParam);
      }

      if (sessionParam) {
        setSelectedSessionPin(sessionParam);
        setView('session');
      } else if (actionParam === 'create') {
        setView('create');
      } else {
        setView('hub');
      }
    } catch (e) {
      console.warn('URL parse error:', e);
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionParam = params.get('session') || params.get('quiz');
        const actionParam = params.get('action');

        if (sessionParam) {
          setSelectedSessionPin(sessionParam);
          setView('session');
        } else if (actionParam === 'create') {
          setView('create');
        } else {
          setView('hub');
        }
      } catch (e) {
        console.warn('Popstate error:', e);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load sessions when authenticated (re-loads when teacher account switches)
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, currentTeacher?.uid, loadSessions]);

  // Navigation helpers
  const navigateToHub = () => {
    setView('hub');
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);
    loadSessions();
  };

  const navigateToSession = (pin) => {
    setSelectedSessionPin(pin);
    setView('session');
    const url = new URL(window.location);
    url.searchParams.set('session', pin);
    url.searchParams.delete('action');
    url.searchParams.delete('quiz');
    window.history.pushState({}, '', url);
  };

  const navigateToCreate = () => {
    setCreatorState({
      mode: 'create',
      pin: null,
      data: null
    });
    setView('create');
    const url = new URL(window.location);
    url.searchParams.set('action', 'create');
    url.searchParams.delete('session');
    url.searchParams.delete('quiz');
    window.history.pushState({}, '', url);
  };

  const handleEditSession = async (pin) => {
    try {
      const def = await getQuizDefinition(pin);
      if (!def) {
        alert(`Unable to load quiz details for session ${pin}.`);
        return;
      }
      setCreatorState({
        mode: 'edit',
        pin: pin,
        data: def
      });
      setView('create');
      const url = new URL(window.location);
      url.searchParams.set('action', 'edit');
      url.searchParams.set('session', pin);
      window.history.pushState({}, '', url);
    } catch (err) {
      alert(`Error opening quiz for edit: ${err.message}`);
    }
  };

  const handleDuplicateSession = async (pin) => {
    try {
      const def = await getQuizDefinition(pin);
      if (!def) {
        alert(`Unable to load quiz details for session ${pin}.`);
        return;
      }
      setCreatorState({
        mode: 'duplicate',
        pin: null,
        data: {
          ...def,
          title: def.title?.startsWith('Copy of ') ? def.title : `Copy of ${def.title || 'Quiz'}`
        }
      });
      setView('create');
      const url = new URL(window.location);
      url.searchParams.set('action', 'duplicate');
      window.history.pushState({}, '', url);
    } catch (err) {
      alert(`Error duplicating quiz: ${err.message}`);
    }
  };

  const handleRehostSession = async (pin) => {
    if (rehostingPin) return;
    setRehostingPin(pin);
    try {
      const res = await rehostQuizSession(pin, teacherPasscode);
      await loadSessions();
      navigateToSession(res.sessionPin);
    } catch (err) {
      alert(`Error re-hosting session: ${err.message}`);
    } finally {
      setRehostingPin(null);
    }
  };

  const handleSessionUpdated = async (pin) => {
    await loadSessions();
    navigateToSession(pin);
  };

  const handleLock = async () => {
    await logoutTeacher();
    setCurrentTeacher(null);
    setIsAuthenticated(false);
    setTeacherPasscode('');
    setView('hub');
  };

  const handleDeleteSession = async (pin) => {
    const target = sessions.find(s => s.sessionPin === pin);
    const title = target?.title ? `"${target.title}"` : pin;
    if (!window.confirm(`Are you sure you want to permanently delete session ${pin} (${title}) and all its student submissions? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteTeacherSession(pin, teacherPasscode);
      await loadSessions();
      if (selectedSessionPin === pin) {
        navigateToHub();
      }
    } catch (err) {
      alert(`Error deleting session: ${err.message}`);
    }
  };

  // 1. IF AUTHENTICATION CHECK IS IN PROGRESS: RENDER APPLE SPINNER
  if (isAuthChecking) {
    return (
      <div className="min-h-screen apple-bg-ambient flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-[#86868b] font-medium tracking-tight">Verifying instructor security credentials...</p>
      </div>
    );
  }

  // 2. IF NOT AUTHENTICATED: RENDER APPLE MULTI-PROVIDER AUTH MODAL
  if (!isAuthenticated) {
    return (
      <TeacherAuthModal
        onAuthenticated={(teacher) => {
          setCurrentTeacher(teacher);
          setIsAuthenticated(true);
          const code = teacher.provider === 'passcode' 
            ? (sessionStorage.getItem('rag_instructor_passcode') || '') 
            : 'authenticated_user';
          setTeacherPasscode(code);
        }}
      />
    );
  }

  // AUTHENTICATED: MULTI-PAGE NAVIGATION (APPLE STYLE)
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col selection:bg-[#0071e3] selection:text-white font-sans">
      {/* Top Header */}
      <header className="apple-glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onClick={navigateToHub}
            className="flex items-center space-x-3.5 cursor-pointer group"
          >
            <OxvaneLogo size="md" className="group-hover:scale-105 transition-transform duration-200" />
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-semibold text-lg tracking-tight text-[#1d1d1f]">
                  Oxvane
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071e3] border border-blue-200 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#0071e3]" />
                  <span>Instructor Console</span>
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] tracking-tight hidden sm:block">Administrative & Multi-Session Portal</p>
            </div>
          </div>

          {/* Navigation Controls & Educator Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex items-center p-1 rounded-full bg-[#e5e5ea] border border-[#d2d2d7]/60">
              <button
                onClick={navigateToHub}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                  view === 'hub' ? 'bg-[#0071e3] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                All Sessions
              </button>

              <button
                onClick={navigateToCreate}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition cursor-pointer ${
                  view === 'create' ? 'bg-[#0071e3] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                + New Quiz
              </button>
            </div>

            {/* Educator Identity Badge */}
            {currentTeacher && (
              <div className="flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-full bg-white/90 border border-[#d2d2d7]/70 shadow-sm">
                {currentTeacher.photoURL ? (
                  <img
                    src={currentTeacher.photoURL}
                    alt={currentTeacher.displayName}
                    className="w-6 h-6 rounded-full object-cover border border-[#d2d2d7]"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0071e3] flex items-center justify-center text-[10px] font-bold">
                    {currentTeacher.displayName?.charAt(0).toUpperCase() || 'T'}
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-[#1d1d1f] leading-none max-w-[120px] truncate">
                    {currentTeacher.displayName || 'Instructor'}
                  </p>
                  <p className="text-[10px] text-[#86868b] leading-none mt-0.5 max-w-[120px] truncate">
                    {currentTeacher.email || currentTeacher.phoneNumber || 'Passcode'}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleLock}
              className="apple-btn-secondary p-2 rounded-full text-[#6e6e73] hover:text-[#ff3b30] cursor-pointer flex items-center justify-center"
              title="Sign Out / Lock Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Multi-Page Body */}
      <main className="flex-1">
        {/* VIEW 1: SESSIONS HUB (BOXES / CARDS) */}
        {view === 'hub' && (
          <SessionsHub
            sessions={sessions}
            isLoading={isLoadingSessions}
            currentTeacher={currentTeacher}
            onOpenSession={navigateToSession}
            onCreateNewQuiz={navigateToCreate}
            onEditSession={handleEditSession}
            onDuplicateSession={handleDuplicateSession}
            onRehostSession={handleRehostSession}
            onDeleteSession={handleDeleteSession}
            onOpenProjector={(pin) => setProjectorSessionPin(pin)}
            onLock={handleLock}
            rehostingPin={rehostingPin}
          />
        )}

        {/* VIEW 2: CONDUCTED SESSION DETAILS */}
        {view === 'session' && (
          <ConductedSessionView
            sessionPin={selectedSessionPin}
            onBackToHub={navigateToHub}
            teacherPasscode={teacherPasscode}
            onEditSession={handleEditSession}
            onDuplicateSession={handleDuplicateSession}
            onRehostSession={handleRehostSession}
            onDeleteSession={handleDeleteSession}
            onOpenProjector={(pin) => setProjectorSessionPin(pin)}
            onLock={handleLock}
          />
        )}

        {/* VIEW 3: DEDICATED QUIZ CREATOR */}
        {view === 'create' && (
          <QuizCreator
            onBackToHub={navigateToHub}
            onSessionCreated={navigateToSession}
            onSessionUpdated={handleSessionUpdated}
            teacherPasscode={teacherPasscode}
            currentTeacher={currentTeacher}
            creatorMode={creatorState.mode}
            editingSessionPin={creatorState.pin}
            initialQuizConfig={creatorState.data}
            onOpenProjector={(pin) => setProjectorSessionPin(pin)}
          />
        )}
      </main>

      {/* BIG SCREEN HOST PRESENTATION VIEW (CLASSROOM PROJECTOR WITH QR & LIVE COUNT) */}
      {projectorSessionPin && (
        <HostProjectorView
          sessionPin={projectorSessionPin}
          teacherPasscode={teacherPasscode}
          onClose={() => setProjectorSessionPin(null)}
          onOpenSheetsModal={() => {
            setSheetsModalData({
              sessionPin: projectorSessionPin,
              sessionTitle: 'Quiz Session',
              initialUrl: localStorage.getItem(`sheets_webhook_${projectorSessionPin}`) || ''
            });
          }}
        />
      )}

      {/* AUTOMATED GOOGLE SHEETS SETUP MODAL */}
      {sheetsModalData && (
        <GoogleSheetsSetupModal
          isOpen={true}
          onClose={() => setSheetsModalData(null)}
          initialUrl={sheetsModalData.initialUrl}
          sessionPin={sheetsModalData.sessionPin}
          sessionTitle={sheetsModalData.sessionTitle}
          onSaveUrl={(url) => {
            localStorage.setItem(`sheets_webhook_${sheetsModalData.sessionPin}`, url);
            setSheetsModalData(null);
            loadSessions();
          }}
        />
      )}

      {/* Apple-Grade Support & Compliance Footer */}
      <footer className="border-t border-[#d2d2d7]/60 bg-white/80 backdrop-blur-md py-6 text-xs text-[#86868b]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <OxvaneLogo size="sm" />
            <span className="text-[#1d1d1f] font-medium">Oxvane</span>
            <span className="text-[#86868b]">• Copyright © 2026 Oxvane Inc. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#6e6e73]">
            <button
              type="button"
              onClick={() => setSupportModal({ isOpen: true, category: 'privacy' })}
              className="hover:text-[#1d1d1f] hover:underline cursor-pointer transition"
            >
              Privacy Policy
            </button>
            <span className="text-[#d2d2d7]">|</span>
            <button
              type="button"
              onClick={() => setSupportModal({ isOpen: true, category: 'terms' })}
              className="hover:text-[#1d1d1f] hover:underline cursor-pointer transition"
            >
              Terms of Use
            </button>
            <span className="text-[#d2d2d7]">|</span>
            <button
              type="button"
              onClick={() => setSupportModal({ isOpen: true, category: 'issue' })}
              className="hover:text-[#1d1d1f] hover:underline cursor-pointer transition"
            >
              Report an Issue
            </button>
            <span className="text-[#d2d2d7]">|</span>
            <button
              type="button"
              onClick={() => setSupportModal({ isOpen: true, category: 'support' })}
              className="hover:text-[#1d1d1f] hover:underline cursor-pointer transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </footer>

      {/* Support & Incident Reporting Modal */}
      <AppleSupportModal
        isOpen={supportModal.isOpen}
        onClose={() => setSupportModal({ ...supportModal, isOpen: false })}
        defaultCategory={supportModal.category}
      />
    </div>
  );
}
