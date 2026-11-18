import React, { useState, useEffect, useCallback } from 'react';
import SessionsHub from './components/SessionsHub';
import ConductedSessionView from './components/ConductedSessionView';
import QuizCreator from './components/QuizCreator';
import { 
  verifyInstructorPasscode, 
  fetchTeacherSessions, 
  deleteTeacherSession 
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
    setView('create');
    const url = new URL(window.location);
    url.searchParams.set('action', 'create');
    url.searchParams.delete('session');
    url.searchParams.delete('quiz');
    window.history.pushState({}, '', url);
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
      const auth = await verifyInstructorPasscode('rag-mastery-2025', code);
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
    if (pin === 'rag-mastery-2025') {
      alert('The default template session cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete session "${pin}" and all its student submissions?`)) {
      return;
    }
    try {
      await deleteTeacherSession(pin, teacherPasscode);
      await loadSessions();
      alert(`Session ${pin} deleted.`);
    } catch (err) {
      alert(`Error deleting session: ${err.message}`);
    }
  };

  // IF NOT AUTHENTICATED: RENDER SHA-256 PASSCODE GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white">Instructor Security Portal</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Protected administrative area. Enter your instructor passcode to manage conducted quiz sessions, view live student USNs, and launch new tests.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            {passcodeError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Instructor Passcode (SHA-256 Verified)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter instructor passcode..."
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Client-side SHA-256 hashed verification</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Instructor Console'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <a
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <span>← Switch to Student Quiz View</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED: MULTI-PAGE NAVIGATION
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            onClick={navigateToHub}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 p-[1px] shadow-lg shadow-teal-500/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-300 bg-clip-text text-transparent">
                  Oxvane
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 inline" />
                  <span>Instructor Restricted</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Administrative & Multi-Session Console</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-3">
            <button
              onClick={navigateToHub}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                view === 'hub' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Sessions
            </button>

            <button
              onClick={navigateToCreate}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition ${
                view === 'create' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              + New Quiz
            </button>

            <button
              onClick={handleLock}
              className="text-xs text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition"
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
            onDeleteSession={handleDeleteSession}
            onLock={handleLock}
          />
        )}

        {/* VIEW 2: CONDUCTED SESSION DETAILS */}
        {view === 'session' && (
          <ConductedSessionView
            sessionPin={selectedSessionPin}
            onBackToHub={navigateToHub}
            teacherPasscode={teacherPasscode}
            onLock={handleLock}
          />
        )}

        {/* VIEW 3: DEDICATED QUIZ CREATOR */}
        {view === 'create' && (
          <QuizCreator
            onBackToHub={navigateToHub}
            onSessionCreated={navigateToSession}
            teacherPasscode={teacherPasscode}
          />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Oxvane Platform • Multi-Session Architecture • Supabase Cloud PG
      </footer>
    </div>
  );
}
