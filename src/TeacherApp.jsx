import React, { useState, useEffect, useCallback } from 'react';
import SessionsHub from './components/SessionsHub';
import ConductedSessionView from './components/ConductedSessionView';
import QuizCreator from './components/QuizCreator';
import { 
  verifyInstructorPasscode, 
  fetchTeacherSessions, 
  deleteTeacherSession,
  rehostQuizSession,
  getQuizDefinition
} from './supabase';
import { ShieldCheck, Sparkles, Lock, Key, AlertTriangle } from 'lucide-react';

export default function TeacherApp() {
  const [teacherPasscode, setTeacherPasscode] = useState(() => {
    try {
      return sessionStorage.getItem('rag_instructor_passcode') || '';
    } catch {
      return '';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem('rag_instructor_passcode'));
    } catch {
      return false;
    }
  });

  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Multi-page navigation state: 'hub' | 'session' | 'create'
  const [view, setView] = useState('hub');
  const [selectedSessionPin, setSelectedSessionPin] = useState('');
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [rehostingPin, setRehostingPin] = useState(null);

  // Quiz Creator configuration state
  const [creatorState, setCreatorState] = useState({
    mode: 'create', // 'create' | 'edit' | 'duplicate'
    pin: null,
    data: null
  });

  // Load all sessions
  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const list = await fetchTeacherSessions();
      setSessions(list);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Parse initial route from URL
  useEffect(() => {
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

  // Load sessions when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, loadSessions]);

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

  // Passcode authentication
  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    setIsVerifying(true);

    const code = enteredPasscode.trim();
    if (!code) {
      setPasscodeError('Please enter the instructor passcode.');
      setIsVerifying(false);
      return;
    }

    try {
      const auth = await verifyInstructorPasscode('master', code);
      if (auth.valid) {
        setTeacherPasscode(code);
        setIsAuthenticated(true);
        sessionStorage.setItem('rag_instructor_passcode', code);
        sessionStorage.setItem('rag_instructor_passcode_hash', auth.hash);
      } else {
        setPasscodeError('Invalid instructor passcode. Verification failed.');
      }
    } catch (err) {
      setPasscodeError('Authentication error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setTeacherPasscode('');
    sessionStorage.removeItem('rag_instructor_passcode');
    sessionStorage.removeItem('rag_instructor_passcode_hash');
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

  // IF NOT AUTHENTICATED: RENDER SHA-256 PASSCODE GATE (APPLE STYLE)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen apple-bg-ambient flex items-center justify-center p-4">
        <div className="max-w-md w-full apple-glass rounded-[32px] p-8 sm:p-10 shadow-xl relative border border-[#d2d2d7]/70">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0071e3] mb-6 mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] apple-title-gradient">Instructor Portal</h2>
            <p className="text-xs text-[#86868b] mt-2 leading-relaxed">
              Protected administrative area. Enter your instructor passcode to manage conducted quiz sessions, review live student USNs, and launch new tests.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-5">
            {passcodeError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] uppercase tracking-[0.14em] mb-2 text-center">
                Instructor Passcode (SHA-256 Verified)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value)}
                  className="apple-input w-full px-4 py-3 text-center text-[#1d1d1f] placeholder-[#86868b] text-sm tracking-[0.2em] font-mono"
                />
              </div>
              <p className="text-[11px] text-[#86868b] mt-2 flex items-center justify-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Client-side SHA-256 hashed verification</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="apple-btn-primary w-full py-3.5 px-6 font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Console'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e5e5ea] text-center">
            <a
              href="/"
              className="text-xs text-[#0071e3] hover:underline transition-colors duration-200"
            >
              ← Return to Student Quiz View
            </a>
          </div>
        </div>
      </div>
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
            <div className="w-9 h-9 rounded-2xl bg-[#0071e3] flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
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

          {/* Navigation Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center p-1 rounded-full bg-[#e5e5ea] border border-[#d2d2d7]/60">
              <button
                onClick={navigateToHub}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition cursor-pointer ${
                  view === 'hub' ? 'bg-[#0071e3] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                All Sessions
              </button>

              <button
                onClick={navigateToCreate}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition cursor-pointer ${
                  view === 'create' ? 'bg-[#0071e3] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                + New Quiz
              </button>
            </div>

            <button
              onClick={handleLock}
              className="apple-btn-secondary p-2 rounded-full text-[#6e6e73] hover:text-[#ff3b30] cursor-pointer"
              title="Lock Console"
            >
              <Lock className="w-4 h-4" />
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
            onOpenSession={navigateToSession}
            onCreateNewQuiz={navigateToCreate}
            onEditSession={handleEditSession}
            onDuplicateSession={handleDuplicateSession}
            onRehostSession={handleRehostSession}
            onDeleteSession={handleDeleteSession}
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
            creatorMode={creatorState.mode}
            editingSessionPin={creatorState.pin}
            initialQuizConfig={creatorState.data}
          />
        )}
      </main>

      <footer className="border-t border-[#d2d2d7]/60 bg-white/80 py-5 text-center text-xs text-[#86868b]">
        Oxvane Platform • Multi-Session Architecture • Supabase Cloud PG
      </footer>
    </div>
  );
}
