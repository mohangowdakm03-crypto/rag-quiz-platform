import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import JoinQuiz from './components/JoinQuiz';
import QuizRunner from './components/QuizRunner';
import QuizResults from './components/QuizResults';
import TeacherDashboard from './components/TeacherDashboard';
import { RAG_QUIZ_DATA } from './data/ragQuestions';

export default function App() {
  const [mode, setMode] = useState('student'); // 'student' | 'teacher'
  const [quizId, setQuizId] = useState('rag-mastery-2025');
  const [quizState, setQuizState] = useState('join'); // 'join' | 'taking' | 'completed'
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);

  // Parse URL query params on load (e.g. ?quiz=rag-mastery-2025&mode=teacher)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuiz = urlParams.get('quiz');
      const urlMode = urlParams.get('mode');

      if (urlQuiz) {
        setQuizId(urlQuiz);
      }
      if (urlMode === 'teacher') {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Header 
        currentMode={mode} 
        setMode={setMode} 
        quizId={quizId} 
      />

      {/* Main Container */}
      <main className="flex-1">
        {mode === 'teacher' ? (
          <TeacherDashboard 
            quizId={quizId}
            onSwitchToStudent={() => setMode('student')}
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
                quizData={RAG_QUIZ_DATA}
                onCompleteQuiz={handleCompleteQuiz}
              />
            )}

            {quizState === 'completed' && results && (
              <QuizResults
                results={results}
                onRetake={handleRetakeQuiz}
                onSwitchToTeacher={() => setMode('teacher')}
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
          <div className="font-mono text-slate-600 text-[11px]">
            Powered by Google Cloud Firestore & React
          </div>
        </div>
      </footer>
    </div>
  );
}
