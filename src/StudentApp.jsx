import React, { useState, useEffect } from 'react';
import StudentHeader from './components/StudentHeader';
import JoinQuiz from './components/JoinQuiz';
import QuizRunner from './components/QuizRunner';
import QuizResults from './components/QuizResults';
import OxvaneLogo from './components/OxvaneLogo';
import AppleSupportModal from './components/AppleSupportModal';
import LiveKahootPlayerView from './components/LiveKahootPlayerView';
import { 
  getStudentQuizDefinition, 
  fetchLiveRoomState, 
  subscribeToLiveGame 
} from './supabase';

export default function StudentApp() {
  const [quizId, setQuizId] = useState('');
  const [quizState, setQuizState] = useState('join'); // 'join' | 'taking' | 'completed'
  const [sessionData, setSessionData] = useState(null);
  const [results, setResults] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Apple Support Modal State
  const [supportModal, setSupportModal] = useState({
    isOpen: false,
    category: 'support'
  });

  // Parse URL query params on load (e.g. ?pin=849201)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get('pin') || urlParams.get('quiz');
      if (urlPin) {
        const cleanPin = urlPin.replace(/\D/g, '').slice(0, 6);
        if (cleanPin) setQuizId(cleanPin);
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
        const sData = {
          ...data,
          quizId: targetId,
          gameMode: cloudQuiz.gameMode || 'classic',
          perQuestionSeconds: cloudQuiz.perQuestionSeconds || 30
        };
        setSessionData(sData);
        setQuizId(targetId);

        // Check answering mode:
        // If mode is 'live_kahoot', join the live synchronous game
        // Otherwise ('classic' or 'assessment'), proceed to standard self-paced QuizRunner
        if (cloudQuiz.gameMode === 'live_kahoot') {
          setQuizState('live_kahoot');
        } else {
          setQuizState('taking');
        }
      } else {
        alert(`Quiz Session with PIN "${targetId}" not found. Please verify the PIN with your instructor.`);
      }
    } catch (err) {
      alert(`Could not load session "${data.quizId}": ${err.message}`);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Real-time synchronization: ONLY for Live Kahoot sessions, sync rounds
  useEffect(() => {
    if (!sessionData?.quizId || sessionData?.gameMode !== 'live_kahoot') return;
    const unsubscribe = subscribeToLiveGame(sessionData.quizId, {
      onGameState: (payload) => {
        if (payload?.status === 'live') {
          setQuizState('live_kahoot');
        }
      }
    });
    return () => unsubscribe();
  }, [sessionData?.quizId, sessionData?.gameMode]);

  const handleCompleteQuiz = (submissionResults) => {
    setResults(submissionResults);
    setQuizState('completed');
  };

  const handleRetakeQuiz = () => {
    setQuizState('join');
    setResults(null);
  };

  // Render Fullscreen Live Kahoot Mobile Player View
  if (quizState === 'live_kahoot' && sessionData) {
    return (
      <LiveKahootPlayerView
        sessionData={sessionData}
        onExit={() => setQuizState('join')}
      />
    );
  }

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

      {/* Student Apple-Style Light Footer with Support & Reporting */}
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
