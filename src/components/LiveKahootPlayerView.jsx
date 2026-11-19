import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  Flame, 
  Trophy, 
  Clock, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import OxvaneLogo from './OxvaneLogo';
import { 
  subscribeToLiveGame, 
  broadcastLivePlayerAnswer,
  fetchLiveRoomState 
} from '../supabase';
import { 
  playCorrectSound, 
  playIncorrectSound, 
  triggerConfetti 
} from '../utils/soundEffects';

const PLAYER_TILES = [
  {
    bg: 'from-[#ff3b30] to-[#ff453a]',
    activeBg: 'bg-[#ff3b30]',
    border: 'border-[#ff3b30]',
    symbol: '▲',
    label: 'Red'
  },
  {
    bg: 'from-[#0071e3] to-[#0a84ff]',
    activeBg: 'bg-[#0071e3]',
    border: 'border-[#0071e3]',
    symbol: '◆',
    label: 'Blue'
  },
  {
    bg: 'from-[#ff9500] to-[#ffcc00]',
    activeBg: 'bg-[#ff9500]',
    border: 'border-[#ff9500]',
    symbol: '●',
    label: 'Amber'
  },
  {
    bg: 'from-[#34c759] to-[#30d158]',
    activeBg: 'bg-[#34c759]',
    border: 'border-[#34c759]',
    symbol: '■',
    label: 'Green'
  }
];

export default function LiveKahootPlayerView({
  sessionData,
  onExit
}) {
  const { studentName, studentId, quizId } = sessionData || {};

  // Phases: 'lobby' | 'get_ready' | 'question' | 'reveal' | 'leaderboard' | 'podium'
  const [liveState, setLiveState] = useState({
    phase: 'lobby',
    questionIndex: 0,
    totalQuestions: 1,
    timeLimit: 20,
    timeRemaining: 20,
    correctIndex: null,
    leaderboard: []
  });

  const [selectedOption, setSelectedOption] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const questionStartTimeRef = useRef(Date.now());

  // 1. Initial State Catch-up & Realtime Subscription
  useEffect(() => {
    // Check if live room is already in progress
    fetchLiveRoomState(quizId).then(initialState => {
      if (initialState) {
        setLiveState(initialState);
      }
    });

    const unsubscribe = subscribeToLiveGame(quizId, {
      onGameState: (payload) => {
        setLiveState(payload);

        // Reset answer selection on new question
        if (payload.phase === 'question') {
          setSelectedOption(null);
          setAnswerSubmitted(false);
          questionStartTimeRef.current = Date.now();
        }

        // Sound & Confetti feedback on reveal
        if (payload.phase === 'reveal') {
          // Will be handled in reveal view
        }
      }
    });

    return () => unsubscribe();
  }, [quizId]);

  // Handle student tapping an answer button on their mobile screen
  const handleSelectOption = (idx) => {
    if (liveState.phase !== 'question' || answerSubmitted) return;

    const answerTimeMs = Math.max(100, Date.now() - questionStartTimeRef.current);
    setSelectedOption(idx);
    setAnswerSubmitted(true);

    // Haptic vibration feedback on supported mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    // Broadcast answer to host
    broadcastLivePlayerAnswer(quizId, {
      studentId: studentId || studentName,
      studentName: studentName || 'Student',
      selectedIndex: idx,
      answerTimeMs
    });
  };

  const isCorrect = selectedOption !== null && 
                    liveState.correctIndex !== null && 
                    selectedOption === liveState.correctIndex;

  // Find player's rank in the leaderboard
  const myLeaderboardEntry = (liveState.leaderboard || []).find(
    p => p.studentId === studentId || p.studentName === studentName
  );
  const myRank = (liveState.leaderboard || []).findIndex(
    p => p.studentId === studentId || p.studentName === studentName
  ) + 1;

  // Trigger confetti if correct on reveal
  useEffect(() => {
    if (liveState.phase === 'reveal' && answerSubmitted) {
      if (isCorrect) {
        playCorrectSound();
        triggerConfetti();
      } else {
        playIncorrectSound();
      }
    }
  }, [liveState.phase, isCorrect, answerSubmitted]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex flex-col p-4 sm:p-6 select-none font-sans">
      
      {/* Top Mobile Status Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#d2d2d7]/60 mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <OxvaneLogo size="sm" />
          <strong className="text-xs font-semibold text-[#1d1d1f] truncate max-w-[140px]">
            {studentName}
          </strong>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] font-semibold">
            PIN {quizId}
          </span>
          {myLeaderboardEntry && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-[#34c759] font-bold border border-emerald-200">
              {myLeaderboardEntry.totalScore} pts
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: LOBBY (WAITING FOR TEACHER TO START)
         ========================================================================= */}
      {liveState.phase === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 fade-in">
          <div className="w-20 h-20 rounded-[22%] bg-gradient-to-tr from-[#0071e3] to-[#42a5f5] flex items-center justify-center shadow-xl shadow-blue-500/25 mb-6 text-white text-3xl font-bold animate-pulse">
            <Sparkles className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold apple-title-gradient mb-2">
            You're In, {studentName}!
          </h2>
          <p className="text-xs text-[#86868b] max-w-xs mx-auto leading-relaxed mb-6">
            See your name on the classroom projector screen. The teacher will launch the live round shortly.
          </p>

          <div className="p-4 rounded-2xl apple-glass border border-[#d2d2d7]/70 text-xs text-[#6e6e73] flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#34c759] animate-ping"></span>
            <span>Connected & Synchronized in Real-Time</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: GET READY (3, 2, 1)
         ========================================================================= */}
      {liveState.phase === 'get_ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 fade-in">
          <span className="text-xs uppercase font-semibold tracking-[0.2em] text-[#86868b] mb-4">
            Question {Number(liveState.questionIndex || 0) + 1}
          </span>
          <div className="w-28 h-28 rounded-full border-4 border-[#0071e3] flex items-center justify-center text-5xl font-bold font-mono text-[#0071e3] shadow-xl mb-4 animate-bounce">
            {liveState.timeRemaining || 3}
          </div>
          <h3 className="text-lg font-semibold text-[#1d1d1f]">
            Get Ready to Tap!
          </h3>
          <p className="text-xs text-[#86868b] mt-1">Look at the projector screen for the question.</p>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: QUESTION - 4 LARGE TOUCH BUTTONS
         ========================================================================= */}
      {liveState.phase === 'question' && (
        <div className="flex-1 flex flex-col justify-between py-2 fade-in">
          
          {/* Status Subtitle */}
          <div className="text-center py-1 mb-2">
            {!answerSubmitted ? (
              <span className="text-xs font-semibold text-[#0071e3] animate-pulse">
                Tap your answer as fast as you can!
              </span>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#34c759] text-xs font-medium border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>Answer Locked In! Look at the big screen</span>
              </div>
            )}
          </div>

          {/* 4 Apple Squircle Touch Tiles Grid (2x2) */}
          <div className="grid grid-cols-2 gap-3.5 flex-1 min-h-[360px]">
            {PLAYER_TILES.map((tile, idx) => {
              const isSelected = selectedOption === idx;
              let btnClass = `bg-gradient-to-br ${tile.bg} text-white shadow-lg active:scale-[0.96]`;

              if (answerSubmitted) {
                if (isSelected) {
                  btnClass = `${tile.activeBg} text-white ring-4 ring-white shadow-2xl scale-[1.03]`;
                } else {
                  btnClass = 'bg-[#8e8e93]/30 text-white/40 opacity-30';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answerSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={`rounded-[28px] flex flex-col items-center justify-center p-6 transition-all duration-150 cursor-pointer relative overflow-hidden ${btnClass}`}
                >
                  <span className="text-5xl sm:text-6xl font-bold leading-none mb-1">
                    {tile.symbol}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
                    {tile.label}
                  </span>

                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white text-[#1d1d1f] flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Status Banner */}
          {answerSubmitted && (
            <div className="mt-3 text-center text-xs text-[#86868b] animate-pulse">
              Waiting for countdown to finish...
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 4: REVEAL (CORRECT OR INCORRECT WITH SPEED BONUS)
         ========================================================================= */}
      {liveState.phase === 'reveal' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 fade-in">
          {selectedOption === null ? (
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-[#ff9500] border border-amber-200 flex items-center justify-center mx-auto text-2xl font-bold shadow-md">
                ⏳
              </div>
              <h3 className="text-xl font-bold text-[#1d1d1f]">Time Ran Out!</h3>
              <p className="text-xs text-[#86868b]">You didn't submit an answer in time for this question.</p>
            </div>
          ) : isCorrect ? (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-[#34c759] border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#34c759] tracking-tight">
                  Brilliant! Correct
                </h3>
                <p className="text-xs text-[#86868b] mt-1">
                  Speed bonus secured. Points added to your total score!
                </p>
              </div>
              {myLeaderboardEntry?.streak >= 2 && (
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-[#ff9500] border border-amber-200 text-xs font-semibold">
                  <Flame className="w-4 h-4 fill-[#ff9500]" />
                  <span>{myLeaderboardEntry.streak} Question Streak!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-rose-50 text-[#ff3b30] border-2 border-rose-300 flex items-center justify-center mx-auto shadow-lg">
                <X className="w-10 h-10 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#ff3b30] tracking-tight">
                  Not Quite!
                </h3>
                <p className="text-xs text-[#86868b] mt-1">
                  Keep going! Next question is your opportunity to bounce back.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 5: LEADERBOARD
         ========================================================================= */}
      {liveState.phase === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 fade-in">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0071e3] border border-blue-200 flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
            📊
          </div>

          <h3 className="text-xl font-bold apple-title-gradient mb-1">
            Leaderboard Updated
          </h3>
          <p className="text-xs text-[#86868b] mb-6">
            Look at the classroom projector screen for the top ranks!
          </p>

          {myRank > 0 && (
            <div className="w-full max-w-xs p-5 rounded-2xl apple-glass border border-[#d2d2d7]/70 shadow-sm text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b]">
                Your Current Standing
              </span>
              <div className="text-3xl font-extrabold text-[#0071e3] font-mono my-1">
                Rank #{myRank}
              </div>
              <span className="text-xs font-semibold text-[#1d1d1f]">
                {myLeaderboardEntry?.totalScore || 0} Total Points
              </span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 6: PODIUM CHAMPIONSHIP
         ========================================================================= */}
      {liveState.phase === 'podium' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 fade-in">
          <div className="w-20 h-20 rounded-full bg-amber-400 text-white flex items-center justify-center text-3xl shadow-xl shadow-amber-400/40 mb-4 animate-bounce">
            🏆
          </div>

          <h3 className="text-2xl font-bold apple-title-gradient mb-1">
            Game Completed!
          </h3>
          <p className="text-xs text-[#86868b] max-w-xs mx-auto mb-6">
            Great job! Your submission has been securely recorded.
          </p>

          <div className="w-full max-w-xs p-6 rounded-[28px] apple-glass border border-[#d2d2d7]/80 shadow-md text-center space-y-2 mb-6">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868b]">
              Final Scorecard
            </span>
            <div className="text-4xl font-extrabold text-[#0071e3] font-mono">
              {myLeaderboardEntry?.totalScore || 0}
            </div>
            <p className="text-xs font-semibold text-[#1d1d1f]">
              {myRank > 0 ? `Finished in Rank #${myRank}` : 'Participant'}
            </p>
          </div>

          <button
            onClick={onExit}
            className="apple-btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

    </div>
  );
}
