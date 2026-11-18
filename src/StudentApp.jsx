import React, { useState, useEffect } from 'react';
import StudentHeader from './components/StudentHeader';
import JoinQuiz from './components/JoinQuiz';
import QuizRunner from './components/QuizRunner';
import QuizResults from './components/QuizResults';
import { STUDENT_QUIZ_DATA } from './data/ragQuestions';

export default function StudentApp() {
  const [quizId, setQuizId] = useState('rag-mastery-2025');
  const [quizState, setQuizState] = useState('join'); // 'join' | 'taking' | 'completed'
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);

  // Parse URL query params on load (e.g. ?quiz=rag-mastery-2025)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlQuiz = urlParams.get('quiz');
      if (urlQuiz) {
        setQuizId(urlQuiz);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-600 selection:text-white">
      {/* Student Top Navigation */}
      <StudentHeader quizId={quizId} />

      {/* Main Container */}
      <main className="flex-1">
        {quizState === 'join' && (
          <JoinQuiz
            defaultQuizId={quizId}
            onStartQuiz={handleStartQuiz}
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
      </main>

      {/* Student Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            RAG Master Assessment Platform • Real-time Cloud Sync for 60+ Concurrent Students
          </div>
          <div className="font-mono text-slate-500 text-[11px] flex items-center space-x-1">
            <span>Powered by</span>
            <span className="text-emerald-400 font-semibold">Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
