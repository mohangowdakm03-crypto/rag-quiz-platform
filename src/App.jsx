import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import JoinQuiz from './components/JoinQuiz';
import QuizRunner from './components/QuizRunner';
import QuizResults from './components/QuizResults';
import TeacherDashboard from './components/TeacherDashboard';
import { STUDENT_QUIZ_DATA } from './data/ragQuestions';

export default function App() {
  const [mode, setMode] = useState('student'); // 'student' | 'teacher'
  const [quizId, setQuizId] = useState('rag-mastery-2025');
  const [quizState, setQuizState] = useState('join'); // 'join' | 'taking' | 'completed'
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);

  // Instructor security authentication state
  const [teacherPasscode, setTeacherPasscode] = useState(() => {
    try {
      return sessionStorage.getItem('rag_instructor_passcode') || '';
    } catch {
      return '';
    }
  });

  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(() => {
    try {
      return Boolean(sessionStorage.getItem('rag_instructor_passcode'));
    } catch {
      return false;
    }
  });

  // Parse URL query params on load (e.g. ?quiz=rag-mastery-2025&mode=teacher)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuiz = urlParams.get('quiz');
      const urlMode = urlParams.get('mode');

      if (urlQuiz) {
        setQuizId(urlQuiz);
      }
      if (urlMode === 'teacher' || urlMode === 'instructor' || urlMode === 'admin') {
        setMode('teacher');
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }
  }, []);

  const handleStartQuiz = (data) => {
    setSessionData(data);
    setQuizId(data.quizId);
    setQuizState('taking');
  };

  const handleCompleteQuiz = (submissionResults) => {
    setResults(submissionResults);
    setQuizState('completed');
  };

  const handleRetakeQuiz = () => {
    setQuizState('join');
    setResults(null);
  };

  const handleLockTeacher = () => {
    setIsTeacherAuthenticated(false);
    setTeacherPasscode('');
    try {
      sessionStorage.removeItem('rag_instructor_passcode');
    } catch {
      // ignore
    }
    setMode('student');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Top Navigation */}
      <Header 
        currentMode={mode} 
        onLockTeacher={handleLockTeacher}
        quizId={quizId} 
      />

      {/* Main Container */}
      <main className="flex-1">
        {mode === 'teacher' ? (
          <TeacherDashboard 
            quizId={quizId}
            onSwitchToStudent={() => setMode('student')}
            teacherPasscode={teacherPasscode}
            setTeacherPasscode={setTeacherPasscode}
            isAuthenticated={isTeacherAuthenticated}
            setIsAuthenticated={setIsTeacherAuthenticated}
          />
        ) : (
          <>
            {quizState === 'join' && (
              <JoinQuiz
                defaultQuizId={quizId}
                onStartQuiz={handleStartQuiz}
                onSwitchToTeacher={() => setMode('teacher')}
              />
            )}

            {quizState === 'taking' && sessionData && (
              <QuizRunner
                sessionData={sessionData}
                quizData={STUDENT_QUIZ_DATA}
                onCompleteQuiz={handleCompleteQuiz}
              />
            )}

            {quizState === 'completed' && results && (
              <QuizResults
                results={results}
                onRetake={handleRetakeQuiz}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            RAG Master Assessment Platform • Real-time Cloud Sync for 60+ Concurrent Students
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setMode(mode === 'teacher' ? 'student' : 'teacher')}
              className="text-slate-500 hover:text-slate-400 transition"
            >
              {mode === 'teacher' ? 'Student View' : 'Instructor Access'}
            </button>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-500 font-semibold">Supabase PostgreSQL Encrypted</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
