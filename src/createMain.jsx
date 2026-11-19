import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import QuizCreator from './components/QuizCreator';
import TeacherAuthModal from './components/TeacherAuthModal';
import { subscribeToTeacherAuth } from './services/authService';
import { Sparkles } from 'lucide-react';

function CreatePage() {
  const [currentTeacher, setCurrentTeacher] = useState(() => {
    try {
      const saved = sessionStorage.getItem('oxvane_teacher_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [passcode, setPasscode] = useState(() => {
    try {
      return sessionStorage.getItem('rag_instructor_passcode') || '';
    } catch {
      return '';
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem('rag_instructor_passcode') || sessionStorage.getItem('oxvane_teacher_auth'));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeToTeacherAuth((teacher) => {
      if (teacher) {
        setCurrentTeacher(teacher);
        setIsAuthenticated(true);
        setPasscode(sessionStorage.getItem('rag_instructor_passcode') || 'authenticated_user');
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthenticated) {
    return (
      <TeacherAuthModal
        onAuthenticated={(teacher) => {
          setCurrentTeacher(teacher);
          setIsAuthenticated(true);
          setPasscode(sessionStorage.getItem('rag_instructor_passcode') || 'authenticated_user');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col selection:bg-[#0071e3] selection:text-white font-sans">
      <header className="apple-glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0071e3] flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
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

      <footer className="border-t border-[#d2d2d7]/60 bg-white/80 py-5 text-center text-xs text-[#86868b]">
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
