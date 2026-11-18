import React, { useState, useEffect } from 'react';
import StudentHeader from './components/StudentHeader';
import JoinQuiz from './components/JoinQuiz';
import QuizRunner from './components/QuizRunner';
import QuizResults from './components/QuizResults';
import { getStudentQuizDefinition } from './supabase';
import { STUDENT_QUIZ_DATA } from './data/ragQuestions';

export default function StudentApp() {
  const [quizId, setQuizId] = useState('');
  const [quizState, setQuizState] = useState('join'); // 'join' | 'taking' | 'completed'
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);
  const [quizData, setQuizData] = useState(STUDENT_QUIZ_DATA);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Parse URL query params on load (e.g. ?pin=849201 or ?quiz=rag-mastery-2025)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get('pin') || urlParams.get('quiz');
      if (urlPin) {
        setQuizId(urlPin.trim());
      }
    } catch (e) {
      console.warn('URL parsing error:', e);
    }
  }, []);

  // Fetch dynamic customized quiz from cloud database
  useEffect(() => {
    async function loadQuizFromCloud() {
      if (!quizId) return;
      setIsLoadingQuiz(true);
      try {
        const cloudQuiz = await getStudentQuizDefinition(quizId);
        if (cloudQuiz && cloudQuiz.questions && cloudQuiz.questions.length > 0) {
          setQuizData(cloudQuiz);
        }
      } catch (err) {
        console.warn('Fallback to local quiz data:', err);
      } finally {
        setIsLoadingQuiz(false);
      }
    }

    loadQuizFromCloud();
  }, [quizId]);

  const handleStartQuiz = async (data) => {
    setIsLoadingQuiz(true);
    try {
      const targetId = (data.quizId || quizId).trim();
      const cloudQuiz = await getStudentQuizDefinition(targetId);
      if (cloudQuiz && cloudQuiz.questions && cloudQuiz.questions.length > 0) {
        setQuizData(cloudQuiz);
        setSessionData({
          ...data,
          quizId: targetId,
          gameMode: cloudQuiz.gameMode || 'classic',
          perQuestionSeconds: cloudQuiz.perQuestionSeconds || 30
        });
        setQuizId(targetId);
        setQuizState('taking');
      } else {
        alert(`Quiz Session with PIN "${targetId}" not found. Please verify the PIN with your instructor.`);
      }
    } catch (err) {
      alert(`Could not load session "${data.quizId}": ${err.message}`);
    } finally {
      setIsLoadingQuiz(false);
    }
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
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col selection:bg-[#0071e3] selection:text-white font-sans">
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
            quizData={quizData}
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

      {/* Student Apple-Style Light Footer */}
      <footer className="border-t border-[#d2d2d7]/60 bg-white/80 py-6 text-center text-xs text-[#86868b]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="tracking-tight">
            Oxvane Assessment Platform • High-Concurrency Real-Time Sync
          </div>
          <div className="font-mono text-[#86868b] text-[11px] flex items-center space-x-1.5">
            <span>Engine</span>
            <span className="text-[#1d1d1f] font-medium">Supabase Realtime PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
