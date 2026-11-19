import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import QuizCreator from './components/QuizCreator';
import TeacherAuthModal from './components/TeacherAuthModal';
import OxvaneLogo from './components/OxvaneLogo';
import AppleSupportModal from './components/AppleSupportModal';
import { subscribeToTeacherAuth } from './services/authService';
import { Sparkles } from 'lucide-react';

function CreatePage() {
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [passcode, setPasscode] = useState('authenticated_user');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Apple Support Modal State
  const [supportModal, setSupportModal] = useState({
    isOpen: false,
    category: 'support'
  });

  useEffect(() => {
    const unsubscribe = subscribeToTeacherAuth((teacher) => {
      if (teacher) {
        setCurrentTeacher(teacher);
        setIsAuthenticated(true);
        setPasscode('authenticated_user');
      } else {
        sessionStorage.removeItem('oxvane_teacher_auth');
        sessionStorage.removeItem('rag_instructor_passcode');
        sessionStorage.removeItem('rag_instructor_passcode_hash');
        setCurrentTeacher(null);
        setIsAuthenticated(false);
        setPasscode('');
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen apple-bg-ambient flex flex-col items-center justify-center p-4">
        <div className="w-9 h-9 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs text-[#86868b] font-medium tracking-tight">Verifying instructor security credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <TeacherAuthModal
        onAuthenticated={(teacher) => {
          setCurrentTeacher(teacher);
          setIsAuthenticated(true);
          const code = teacher.provider === 'passcode' 
            ? (sessionStorage.getItem('rag_instructor_passcode') || '') 
            : 'authenticated_user';
          setPasscode(code);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col selection:bg-[#0071e3] selection:text-white font-sans">
      <header className="apple-glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <OxvaneLogo size="md" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-lg tracking-tight text-[#1d1d1f]">
                  Oxvane
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071e3] border border-blue-200">
                  Quiz Creator
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] tracking-tight hidden sm:block">Build and launch isolated sessions</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentTeacher && (
              <div className="hidden sm:flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-full bg-white/90 border border-[#d2d2d7]/70 shadow-sm">
                {currentTeacher.photoURL ? (
                  <img
                    src={currentTeacher.photoURL}
                    alt={currentTeacher.displayName}
                    className="w-5 h-5 rounded-full object-cover border border-[#d2d2d7]"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-[#0071e3] flex items-center justify-center text-[10px] font-bold">
                    {currentTeacher.displayName?.charAt(0).toUpperCase() || 'T'}
                  </div>
                )}
                <span className="text-xs font-semibold text-[#1d1d1f] max-w-[120px] truncate">
                  {currentTeacher.displayName || 'Instructor'}
                </span>
              </div>
            )}
            <a
              href="/teacher"
              className="apple-btn-secondary px-4 py-1.5 text-xs font-medium cursor-pointer"
            >
              ← View All Sessions
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <QuizCreator
          teacherPasscode={passcode}
          currentTeacher={currentTeacher}
          onBackToHub={() => {
            window.location.href = '/teacher';
          }}
          onSessionCreated={(pin) => {
            window.location.href = `/teacher?session=${encodeURIComponent(pin)}`;
          }}
        />
      </main>

      {/* Apple-Grade Support & Compliance Footer */}
      <footer className="border-t border-[#d2d2d7]/60 bg-white/80 py-6 text-xs text-[#86868b]">
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CreatePage />
  </React.StrictMode>
);
