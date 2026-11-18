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
      <div className="min-h-screen apple-bg-ambient flex items-center justify-center p-4">
        <div className="max-w-md w-full apple-glass rounded-[32px] p-8 sm:p-10 shadow-2xl relative border border-white/[0.1]">
          <div className="w-14 h-14 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-[#2997ff] mb-6 mx-auto shadow-inner">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] apple-title-gradient">Instructor Authorization</h2>
            <p className="text-xs text-[#86868b] mt-2 leading-relaxed tracking-tight">
              Enter your instructor passcode to create and launch new quiz sessions.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {passcodeError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#a1a1a6] uppercase tracking-[0.14em] mb-2 text-center">
                Instructor Passcode (SHA-256 Verified)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value)}
                  className="apple-input w-full px-4 py-3 text-center text-white placeholder-[#6e6e73] text-sm tracking-[0.2em] font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="apple-btn-primary w-full py-3.5 px-6 font-medium text-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Quiz Creator'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.08] text-center">
            <a
              href="/teacher"
              className="text-xs text-[#86868b] hover:text-[#f5f5f7] transition-colors"
            >
              ← Go to Sessions Hub
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7] flex flex-col selection:bg-[#0071e3] selection:text-white font-sans">
      <header className="apple-glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-lg tracking-tight apple-title-gradient">
                  Oxvane
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#a1a1a6] border border-white/[0.1]">
                  Quiz Creator
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] tracking-tight hidden sm:block">Build and launch isolated sessions</p>
            </div>
          </div>

          <a
            href="/teacher"
            className="apple-btn-secondary px-4 py-1.5 text-xs font-medium cursor-pointer"
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

      <footer className="border-t border-white/[0.06] bg-black/60 py-5 text-center text-xs text-[#86868b]">
        Oxvane Platform • Quiz Creator
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CreatePage />
  </React.StrictMode>
);
