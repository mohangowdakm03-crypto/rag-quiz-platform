import React, { useState, useEffect } from 'react';
import TeacherDashboard from './components/TeacherDashboard';
import { ShieldCheck, Sparkles } from 'lucide-react';

export default function TeacherApp() {
  const [quizId, setQuizId] = useState('rag-mastery-2025');
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

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuiz = urlParams.get('quiz');
      if (urlQuiz) {
        setQuizId(urlQuiz);
      }
    } catch (e) {
      console.warn('URL parse error:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-600 selection:text-white">
      {/* Instructor Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 p-[1px] shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-300 bg-clip-text text-transparent">
                  RAG Master
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 inline" />
                  <span>Instructor Restricted</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Administrative & Live Analytics Console</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Quiz ID: <span className="text-teal-300 font-bold">{quizId}</span>
          </div>
        </div>
      </header>

      {/* Main Dashboard / Passcode Screen */}
      <main className="flex-1">
        <TeacherDashboard
          quizId={quizId}
          onSwitchToStudent={() => {
            window.location.href = `/?quiz=${encodeURIComponent(quizId)}`;
          }}
          teacherPasscode={teacherPasscode}
          setTeacherPasscode={setTeacherPasscode}
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
        />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Instructor Administration Console • Supabase Realtime WebSocket Sync
      </footer>
    </div>
  );
}
