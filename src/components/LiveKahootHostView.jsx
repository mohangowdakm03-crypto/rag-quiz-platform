import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  ArrowRight, 
  Trophy, 
  Flame, 
  Users, 
  Check, 
  X, 
  RotateCcw, 
  Clock, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Medal,
  ChevronRight,
  Tv
} from 'lucide-react';
import { 
  broadcastLiveGameState, 
  subscribeToLiveGame, 
  updateLiveRoomState,
  clearLiveRoomState,
  submitStudentQuizUniversal
} from '../supabase';
import { 
  playStartChime, 
  playTickSound, 
  playTimeUpSound, 
  playCorrectSound, 
  playPodiumFanfare, 
  triggerPodiumConfetti 
} from '../utils/soundEffects';

const COLOR_TILES = [
  {
    bg: 'bg-gradient-to-br from-[#ff3b30] to-[#ff453a]',
    border: 'border-[#ff3b30]',
    text: 'text-white',
    symbol: '▲',
    label: 'Red'
  },
  {
    bg: 'bg-gradient-to-br from-[#0071e3] to-[#0a84ff]',
    border: 'border-[#0071e3]',
    text: 'text-white',
    symbol: '◆',
    label: 'Blue'
  },
  {
    bg: 'bg-gradient-to-br from-[#ff9500] to-[#ffcc00]',
    border: 'border-[#ff9500]',
    text: 'text-white',
    symbol: '●',
    label: 'Amber'
  },
  {
    bg: 'bg-gradient-to-br from-[#34c759] to-[#30d158]',
    border: 'border-[#34c759]',
    text: 'text-white',
    symbol: '■',
    label: 'Green'
  }
];

export default function LiveKahootHostView({
  quizDef,
  sessionPin,
  participants = [],
  isDark = false,
  soundEnabled = true,
  onExitLiveGame
}) {
  const questions = quizDef?.questions || [];
  const totalQuestions = questions.length;
  const questionSeconds = Number(quizDef?.perQuestionSeconds || 20);

  // Phases: 'get_ready' | 'question' | 'reveal' | 'leaderboard' | 'podium'
  const [phase, setPhase] = useState('get_ready');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(3); // 3s for get_ready, then questionSeconds
  const [answersMap, setAnswersMap] = useState({}); // studentId -> { selectedIndex, answerTimeMs, pointsEarned, isCorrect }
  const [leaderboard, setLeaderboard] = useState([]); // array of { studentId, studentName, totalScore, streak, lastDelta }
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const currentQ = questions[currentQIndex] || null;

  // Broadcast current state to all mobile players & persist catch-up state
  const broadcastCurrentState = useCallback((newPhase, extra = {}) => {
    const q = questions[currentQIndex];
    const payload = {
      status: 'live',
      phase: newPhase,
      questionIndex: currentQIndex,
      totalQuestions,
      timeLimit: questionSeconds,
      timeRemaining: extra.timeRemaining ?? (newPhase === 'get_ready' ? 3 : questionSeconds),
      questionText: q?.question || '',
      optionsCount: q?.options?.length || 4,
      ...extra
    };
    broadcastLiveGameState(sessionPin, payload);
    updateLiveRoomState(sessionPin, payload);
  }, [sessionPin, currentQIndex, questions, totalQuestions, questionSeconds]);

  // Handle incoming live answer from a student's phone
  const handlePlayerAnswer = useCallback((data) => {
    if (phase !== 'question' || !currentQ) return;
    const { studentId, studentName, selectedIndex, answerTimeMs } = data;
    if (!studentId || selectedIndex === undefined) return;

    setAnswersMap(prev => {
      if (prev[studentId]) return prev; // already answered
      const isCorrect = Number(selectedIndex) === Number(currentQ.correctIndex);
      
      // Calculate speed points: up to 1000 base pts
      let points = 0;
      if (isCorrect) {
        const timeFraction = Math.min(1, Math.max(0, answerTimeMs / (questionSeconds * 1000)));
        points = Math.round(500 + 500 * (1 - timeFraction));
      }

      const updated = {
        ...prev,
        [studentId]: {
          studentName: studentName || 'Student',
          selectedIndex,
          answerTimeMs,
          isCorrect,
          points
        }
      };

      // If all participants have answered, auto-reveal!
      const totalJoined = participants.length;
      if (totalJoined > 0 && Object.keys(updated).length >= totalJoined) {
        setTimeout(() => {
          handleRevealAnswer();
        }, 300);
      }

      return updated;
    });
  }, [phase, currentQ, questionSeconds, participants.length]);

  // Real-time channel listener for student answers
  useEffect(() => {
    const unsubscribe = subscribeToLiveGame(sessionPin, {
      onPlayerAnswer: handlePlayerAnswer
    });
    return () => unsubscribe();
  }, [sessionPin, handlePlayerAnswer]);

  // Phase transition: GET READY (3 seconds countdown)
  const startGetReady = useCallback((qIdx) => {
    setCurrentQIndex(qIdx);
    setAnswersMap({});
    setPhase('get_ready');
    setTimeRemaining(3);

    broadcastCurrentState('get_ready', {
      questionIndex: qIdx,
      timeRemaining: 3
    });

    let count = 3;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      count -= 1;
      setTimeRemaining(count);
      if (soundEnabled) playTickSound();
      if (count <= 0) {
        clearInterval(timerRef.current);
        startQuestion(qIdx);
      }
    }, 1000);
  }, [broadcastCurrentState, soundEnabled]);

  // Phase transition: QUESTION (Active Timer)
  const startQuestion = useCallback((qIdx) => {
    setPhase('question');
    setTimeRemaining(questionSeconds);
    startTimeRef.current = Date.now();
    if (soundEnabled) playStartChime();

    broadcastCurrentState('question', {
      questionIndex: qIdx,
      timeRemaining: questionSeconds
    });

    let count = questionSeconds;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      count -= 1;
      setTimeRemaining(count);

      // Play tick on final 5 seconds
      if (count <= 5 && count > 0 && soundEnabled) {
        playTickSound();
      }

      if (count <= 0) {
        clearInterval(timerRef.current);
        handleRevealAnswer();
      }
    }, 1000);
  }, [questionSeconds, soundEnabled, broadcastCurrentState]);

  // Phase transition: REVEAL (Show correct answer + bar chart)
  const handleRevealAnswer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('reveal');
    if (soundEnabled) playTimeUpSound();

    const q = questions[currentQIndex];
    broadcastCurrentState('reveal', {
      correctIndex: q?.correctIndex ?? 0
    });
  }, [currentQIndex, questions, soundEnabled, broadcastCurrentState]);

  // Phase transition: LEADERBOARD
  const handleShowLeaderboard = useCallback(() => {
    setPhase('leaderboard');
    if (soundEnabled) playCorrectSound();

    // Compute updated leaderboard scores
    setLeaderboard(prevList => {
      const scoreMap = {};
      prevList.forEach(item => {
        scoreMap[item.studentId] = { ...item, lastDelta: 0 };
      });

      // Update with answers from this question
      Object.entries(answersMap).forEach(([sId, record]) => {
        if (!scoreMap[sId]) {
          scoreMap[sId] = {
            studentId: sId,
            studentName: record.studentName,
            totalScore: 0,
            streak: 0,
            lastDelta: 0
          };
        }
        if (record.isCorrect) {
          scoreMap[sId].totalScore += record.points;
          scoreMap[sId].streak = (scoreMap[sId].streak || 0) + 1;
          scoreMap[sId].lastDelta = record.points;
        } else {
          scoreMap[sId].streak = 0;
          scoreMap[sId].lastDelta = 0;
        }
      });

      // Also ensure any student who didn't answer resets streak
      participants.forEach(p => {
        if (!scoreMap[p.studentId]) {
          scoreMap[p.studentId] = {
            studentId: p.studentId,
            studentName: p.studentName,
            totalScore: 0,
            streak: 0,
            lastDelta: 0
          };
        }
      });

      const sorted = Object.values(scoreMap).sort((a, b) => b.totalScore - a.totalScore);
      broadcastCurrentState('leaderboard', { leaderboard: sorted.slice(0, 5) });
      return sorted;
    });
  }, [answersMap, participants, soundEnabled, broadcastCurrentState]);

  // Phase transition: ADVANCE TO NEXT QUESTION OR PODIUM
  const handleNextStep = useCallback(() => {
    if (currentQIndex + 1 < totalQuestions) {
      startGetReady(currentQIndex + 1);
    } else {
      // Game Finished: Trigger Podium!
      setPhase('podium');
      if (soundEnabled) playPodiumFanfare();
      triggerPodiumConfetti();

      broadcastCurrentState('podium', { leaderboard });

      // Save student submissions to Supabase so teacher analytics & Google Sheets sync
      leaderboard.forEach(student => {
        submitStudentQuizUniversal(sessionPin, {
          studentName: student.studentName,
          studentId: student.studentId,
          timeTakenSeconds: totalQuestions * questionSeconds,
          answers: {},
          answeredCount: totalQuestions
        }).catch(() => {});
      });
    }
  }, [currentQIndex, totalQuestions, startGetReady, broadcastCurrentState, leaderboard, sessionPin, soundEnabled]);

  // Initial trigger: Start first question countdown on mount
  useEffect(() => {
    startGetReady(0);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearLiveRoomState(sessionPin);
    };
  }, []);

  // Calculate option answer count distribution for reveal phase
  const answerCounts = [0, 0, 0, 0];
  Object.values(answersMap).forEach(ans => {
    if (ans.selectedIndex !== undefined && answerCounts[ans.selectedIndex] !== undefined) {
      answerCounts[ans.selectedIndex] += 1;
    }
  });
  const maxAnswerCount = Math.max(1, ...answerCounts);
  const totalAnswers = Object.keys(answersMap).length;

  return (
    <div className={`flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-6 transition-colors duration-300 ${
      isDark ? 'text-white' : 'text-[#1d1d1f]'
    }`}>
      
      {/* Live Header Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#d2d2d7]/50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-[#0071e3] text-white flex items-center justify-center shadow-md">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-widest text-[#0071e3]">
                Live Kahoot Mode
              </span>
              <span className="text-xs text-[#86868b]">• PIN {sessionPin}</span>
            </div>
            <h3 className="text-sm sm:text-base font-semibold line-clamp-1">
              {quizDef?.title || 'Interactive Assessment'}
            </h3>
          </div>
        </div>

        {/* Question Counter Pill & Answers Count */}
        <div className="flex items-center space-x-2">
          <div className="px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold">
            Question {currentQIndex + 1} of {totalQuestions}
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-xs font-semibold flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{totalAnswers} / {participants.length || 0} Answers</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PHASE 1: GET READY (3, 2, 1)
         ========================================================================= */}
      {phase === 'get_ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 fade-in">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#86868b] mb-4">
            Next Up: Question {currentQIndex + 1}
          </span>
          <div className="w-32 h-32 rounded-full border-4 border-[#0071e3] flex items-center justify-center text-6xl font-bold font-mono text-[#0071e3] shadow-2xl mb-6 animate-pulse">
            {timeRemaining}
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold max-w-xl mx-auto leading-snug">
            {currentQ?.question}
          </h2>
        </div>
      )}

      {/* =========================================================================
          PHASE 2 & 3: QUESTION & REVEAL
         ========================================================================= */}
      {(phase === 'question' || phase === 'reveal') && (
        <div className="flex-1 flex flex-col justify-between space-y-6 fade-in">
          
          {/* Question Banner & Countdown Ring */}
          <div className="flex items-center justify-between gap-4 p-6 rounded-[28px] apple-glass border border-[#d2d2d7]/70 shadow-sm relative overflow-hidden">
            <div className="flex-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-[#86868b] block mb-1">
                Question {currentQIndex + 1} of {totalQuestions}
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight leading-snug">
                {currentQ?.question}
              </h2>
            </div>

            {/* Circular Countdown Ring */}
            <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 border-[#0071e3] bg-white/50 dark:bg-black/40 shadow-inner">
              <span className={`text-2xl font-mono font-bold ${
                timeRemaining <= 5 ? 'text-[#ff3b30] animate-bounce' : 'text-[#0071e3]'
              }`}>
                {phase === 'reveal' ? 0 : timeRemaining}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-[#86868b]">sec</span>
            </div>
          </div>

          {/* 4 Answer Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {(currentQ?.options || []).map((opt, idx) => {
              const tile = COLOR_TILES[idx % COLOR_TILES.length];
              const isCorrect = idx === Number(currentQ.correctIndex);
              const count = answerCounts[idx] || 0;
              const barHeightPct = Math.round((count / maxAnswerCount) * 100);

              let cardStyle = `${tile.bg} text-white shadow-md`;
              if (phase === 'reveal') {
                if (isCorrect) {
                  cardStyle = `${tile.bg} ring-4 ring-[#34c759] shadow-2xl scale-[1.02]`;
                } else {
                  cardStyle = 'bg-[#8e8e93]/30 text-[#8e8e93] opacity-40';
                }
              }

              return (
                <div
                  key={idx}
                  className={`p-6 sm:p-7 rounded-[24px] flex items-center justify-between relative overflow-hidden transition-all duration-300 ${cardStyle}`}
                >
                  <div className="flex items-center space-x-4 z-10">
                    <span className="text-2xl sm:text-3xl font-bold opacity-90">{tile.symbol}</span>
                    <span className="text-base sm:text-xl font-semibold leading-snug">{opt}</span>
                  </div>

                  {/* Reveal Checkmark or Stats */}
                  {phase === 'reveal' && (
                    <div className="z-10 flex items-center space-x-3 shrink-0">
                      {isCorrect && (
                        <div className="w-8 h-8 rounded-full bg-white text-[#34c759] flex items-center justify-center shadow-lg font-bold">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      )}
                      <div className="px-3 py-1 rounded-full bg-black/40 text-white font-mono text-xs font-semibold backdrop-blur-md">
                        {count} answers
                      </div>
                    </div>
                  )}

                  {/* Visual Response Bar Chart on Reveal */}
                  {phase === 'reveal' && count > 0 && (
                    <div 
                      className="absolute left-0 bottom-0 h-1.5 bg-white/80 rounded-full transition-all duration-500"
                      style={{ width: `${barHeightPct}%` }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Host Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onExitLiveGame}
              className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Exit Live Round
            </button>

            {phase === 'question' ? (
              <button
                onClick={handleRevealAnswer}
                className="apple-btn-primary px-6 py-2.5 text-xs font-semibold flex items-center space-x-2 cursor-pointer"
              >
                <span>Reveal Answers</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleShowLeaderboard}
                className="apple-btn-primary px-6 py-2.5 text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <span>View Leaderboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 4: LIVE LEADERBOARD (Top 5 Players)
         ========================================================================= */}
      {phase === 'leaderboard' && (
        <div className="flex-1 flex flex-col justify-between py-6 max-w-3xl mx-auto w-full fade-in">
          <div className="text-center mb-6">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#86868b]">
              After Question {currentQIndex + 1} of {totalQuestions}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold apple-title-gradient mt-1">
              Classroom Leaderboard
            </h2>
          </div>

          <div className="space-y-3 flex-1">
            {leaderboard.slice(0, 5).map((player, rank) => {
              const isFirst = rank === 0;
              const isSecond = rank === 1;
              const isThird = rank === 2;

              let rankBadge = `${rank + 1}`;
              let rankBg = 'bg-[#e5e5ea] text-[#1d1d1f]';
              if (isFirst) rankBg = 'bg-amber-400 text-white shadow-md shadow-amber-400/30';
              if (isSecond) rankBg = 'bg-slate-300 text-slate-800';
              if (isThird) rankBg = 'bg-amber-700 text-white';

              return (
                <div 
                  key={player.studentId}
                  className="p-4 sm:p-5 rounded-2xl apple-glass border border-[#d2d2d7]/70 flex items-center justify-between shadow-sm transition hover:scale-[1.01]"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankBg}`}>
                      {rankBadge}
                    </div>
                    <div>
                      <strong className="block text-base font-semibold text-[#1d1d1f] dark:text-white">
                        {player.studentName}
                      </strong>
                      {player.streak >= 2 && (
                        <span className="text-[11px] font-semibold text-[#ff9500] flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5 fill-[#ff9500]" />
                          <span>{player.streak} In A Row!</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-[#0071e3]">
                      {player.totalScore}
                    </span>
                    {player.lastDelta > 0 && (
                      <span className="block text-xs font-semibold text-[#34c759]">
                        +{player.lastDelta}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 flex justify-end">
            <button
              onClick={handleNextStep}
              className="apple-btn-primary px-8 py-3 text-sm font-semibold flex items-center space-x-2 cursor-pointer shadow-xl shadow-blue-500/25"
            >
              <span>{currentQIndex + 1 < totalQuestions ? 'Next Question' : 'Reveal Final Podium'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 5: GRAND APPLE 3D-STYLE PODIUM
         ========================================================================= */}
      {phase === 'podium' && (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center fade-in">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-600 text-xs font-semibold mb-6">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Grand Assessment Championship</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold apple-title-gradient mb-8">
            The Podium
          </h2>

          {/* 3 Pillars: 2nd (Silver, Left), 1st (Gold, Center), 3rd (Bronze, Right) */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-2xl px-4 mb-10">
            
            {/* 2nd Place Pillar */}
            {leaderboard[1] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-lg mb-2 shadow-md">
                  🥈
                </div>
                <strong className="text-sm font-semibold truncate max-w-[120px] block mb-1">
                  {leaderboard[1].studentName}
                </strong>
                <span className="text-xs font-mono font-bold text-[#0071e3] mb-2">
                  {leaderboard[1].totalScore} pts
                </span>
                <div className="w-full h-36 rounded-t-2xl bg-gradient-to-t from-slate-300 to-slate-100 dark:from-slate-700 dark:to-slate-600 border border-slate-300/80 shadow-md flex items-center justify-center text-3xl font-bold text-slate-600">
                  2
                </div>
              </div>
            )}

            {/* 1st Place Pillar (Tallest) */}
            {leaderboard[0] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold text-2xl mb-2 shadow-xl shadow-amber-400/40 animate-bounce">
                  👑
                </div>
                <strong className="text-base font-bold truncate max-w-[150px] block mb-1 text-amber-600">
                  {leaderboard[0].studentName}
                </strong>
                <span className="text-sm font-mono font-bold text-[#0071e3] mb-2">
                  {leaderboard[0].totalScore} pts
                </span>
                <div className="w-full h-52 rounded-t-2xl bg-gradient-to-t from-amber-400 to-amber-200 dark:from-amber-600 dark:to-amber-400 border border-amber-400/80 shadow-xl flex items-center justify-center text-4xl font-bold text-amber-800">
                  1
                </div>
              </div>
            )}

            {/* 3rd Place Pillar */}
            {leaderboard[2] && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-700 text-white flex items-center justify-center font-bold text-lg mb-2 shadow-md">
                  🥉
                </div>
                <strong className="text-sm font-semibold truncate max-w-[120px] block mb-1">
                  {leaderboard[2].studentName}
                </strong>
                <span className="text-xs font-mono font-bold text-[#0071e3] mb-2">
                  {leaderboard[2].totalScore} pts
                </span>
                <div className="w-full h-28 rounded-t-2xl bg-gradient-to-t from-amber-700/60 to-amber-600/40 dark:from-amber-800 dark:to-amber-700 border border-amber-700/80 shadow-md flex items-center justify-center text-2xl font-bold text-amber-900">
                  3
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => startGetReady(0)}
              className="apple-btn-secondary px-5 py-2.5 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>

            <button
              onClick={onExitLiveGame}
              className="apple-btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer"
            >
              Return to Session Lobby
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
