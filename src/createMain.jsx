import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import QuizCreator from './components/QuizCreator';
import { verifyInstructorPasscode } from './supabase';
import { Lock, Key, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';

function CreatePage() {
  const [passcode, setPasscode] = useState(() => {
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

  const handleVerify = async (e) => {
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
        setPasscode(code);
        setIsAuthenticated(true);
        sessionStorage.setItem('rag_instructor_passcode', code);
        sessionStorage.setItem('rag_instructor_passcode_hash', auth.hash);
      } else {
        setPasscodeError('Invalid instructor passcode.');
      }
    } catch (err) {
      setPasscodeError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white">Instructor Authorization</h2>
            <p className="text-xs text-slate-400 mt-2">
              Enter your instructor passcode to create and launch new quiz sessions.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
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
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Quiz Creator'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <a
              href="/teacher"
              className="text-xs text-slate-400 hover:text-white transition"
            >
              ← Go to Sessions Hub
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-teal-600 selection:text-white">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 p-[1px] shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                RAG Master • Quiz Creator
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">Build and launch isolated sessions</p>
            </div>
          </div>

          <a
            href="/teacher"
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
          >
            ← View All Sessions
          </a>
        </div>
      </header>

      <main className="flex-1">
        <QuizCreator
          teacherPasscode={passcode}
          onBackToHub={() => {
            window.location.href = '/teacher';
          }}
          onSessionCreated={(pin) => {
            window.location.href = `/teacher?session=${encodeURIComponent(pin)}`;
          }}
        />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        RAG Master Platform • Quiz Creator
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CreatePage />
  </React.StrictMode>
);
