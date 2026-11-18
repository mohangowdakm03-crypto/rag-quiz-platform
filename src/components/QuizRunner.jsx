import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Check, 
  ShieldAlert, 
  X,
  Square,
  Triangle,
  Circle,
  Diamond,
  Zap,
  Timer,
  ArrowRight
} from 'lucide-react';
import { submitStudentQuizUniversal } from '../supabase';

// Apple-refined Shape & Color Palette for Options (White Theme)
const KAHOOT_STYLES = [
  {
    name: 'Red Triangle',
    icon: Triangle,
    cardBg: 'bg-rose-50/80 border-rose-200/90 hover:bg-rose-100/80 hover:border-rose-300',
    activeBg: 'bg-[#ff3b30] border-[#ff3b30] text-white shadow-[0_4px_20px_rgba(255,59,48,0.3)] ring-2 ring-[#ff3b30]/50',
    badgeBg: 'bg-[#ff3b30] text-white',
    symbolColor: 'text-[#ff3b30]'
  },
  {
    name: 'Blue Diamond',
    icon: Diamond,
    cardBg: 'bg-sky-50/80 border-sky-200/90 hover:bg-sky-100/80 hover:border-sky-300',
    activeBg: 'bg-[#0071e3] border-[#0071e3] text-white shadow-[0_4px_20px_rgba(0,113,227,0.3)] ring-2 ring-[#0071e3]/50',
    badgeBg: 'bg-[#0071e3] text-white',
    symbolColor: 'text-[#0071e3]'
  },
  {
    name: 'Yellow Circle',
    icon: Circle,
    cardBg: 'bg-amber-50/80 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300',
    activeBg: 'bg-[#ff9500] border-[#ff9500] text-white shadow-[0_4px_20px_rgba(255,149,0,0.3)] ring-2 ring-[#ff9500]/50',
    badgeBg: 'bg-[#ff9500] text-white',
    symbolColor: 'text-[#ff9500]'
  },
  {
    name: 'Green Square',
    icon: Square,
    cardBg: 'bg-emerald-50/80 border-emerald-200/90 hover:bg-emerald-100/80 hover:border-emerald-300',
    activeBg: 'bg-[#34c759] border-[#34c759] text-white shadow-[0_4px_20px_rgba(52,199,89,0.3)] ring-2 ring-[#34c759]/50',
    badgeBg: 'bg-[#34c759] text-white',
    symbolColor: 'text-[#34c759]'
  }
];

export default function QuizRunner({ sessionData, quizData, onCompleteQuiz }) {
  const { studentName, studentId, quizId } = sessionData;
  const { questions = [], timeLimitMinutes = 30 } = quizData;

  const isAssessmentMode = (quizData.gameMode === 'assessment' || sessionData.gameMode === 'assessment');
  const perQuestionSeconds = Number(quizData.perQuestionSeconds || sessionData.perQuestionSeconds || 30);

  const draftKey = `kahoot_quiz_draft_${quizId}_${studentName.replace(/\s+/g, '_')}`;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved).answers || {} : {};
    } catch {
      return {};
    }
  });

  const [flaggedQuestions, setFlaggedQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved).flagged || {} : {};
    } catch {
      return {};
    }
  });

  // Assessment Mode State: Per-question timer & instant lock
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(perQuestionSeconds);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [transitioningToNext, setTransitioningToNext] = useState(false);

  // Anti-cheat tab switch monitoring
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Overall timer in seconds (used primarily in Classical Mode)
  const [overallTimeLeft, setOverallTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.overallTimeLeft === 'number' && parsed.overallTimeLeft > 0) {
          return parsed.overallTimeLeft;
        }
      }
    } catch {
      // ignore
    }
    return timeLimitMinutes * 60;
  });

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const nextTransitionTimeoutRef = useRef(null);

  // Tab switch listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const next = prev + 1;
          setShowTabWarning(true);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Persist draft
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        answers: selectedAnswers,
        flagged: flaggedQuestions,
        overallTimeLeft,
        currentQuestionIndex
      }));
    } catch {
      // ignore
    }
  }, [selectedAnswers, flaggedQuestions, overallTimeLeft, currentQuestionIndex, draftKey]);

  // Handle final submission (Universal server-graded)
  const handleFinalSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    const timeTakenSeconds = (timeLimitMinutes * 60) - overallTimeLeft;

    try {
      const results = await submitStudentQuizUniversal(quizId, {
        studentName,
        studentId: studentId || 'N/A',
        timeTakenSeconds: Math.max(1, timeTakenSeconds),
        answers: selectedAnswers
      });

      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }

      onCompleteQuiz(results);
    } catch (err) {
      console.error('Final submit exception:', err);
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [timeLimitMinutes, overallTimeLeft, quizId, studentName, studentId, selectedAnswers, draftKey, onCompleteQuiz, isSubmitting]);

  // Advance to Next Question (used in Assessment Mode auto-transition)
  const advanceToNext = useCallback(() => {
    if (nextTransitionTimeoutRef.current) {
      clearTimeout(nextTransitionTimeoutRef.current);
      nextTransitionTimeoutRef.current = null;
    }
    setTransitioningToNext(false);
    setIsAnswerLocked(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionSecondsLeft(perQuestionSeconds);
    } else {
      handleFinalSubmit();
    }
  }, [currentQuestionIndex, questions.length, perQuestionSeconds, handleFinalSubmit]);

  // Assessment Mode: Per-Question countdown timer
  useEffect(() => {
    if (!isAssessmentMode) return;
    if (isAnswerLocked || transitioningToNext || isSubmitting) return;

    if (questionSecondsLeft <= 0) {
      // Time is up for this question: lock and schedule advance
      setIsAnswerLocked(true);
      setTransitioningToNext(true);
      nextTransitionTimeoutRef.current = setTimeout(() => {
        advanceToNext();
      }, 1200);
      return;
    }

    const timer = setInterval(() => {
      setQuestionSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAssessmentMode, questionSecondsLeft, isAnswerLocked, transitioningToNext, isSubmitting, advanceToNext]);

  // Reset per-question timer when question index changes in Assessment Mode
  useEffect(() => {
    if (isAssessmentMode) {
      setQuestionSecondsLeft(perQuestionSeconds);
      setIsAnswerLocked(false);
      setTransitioningToNext(false);
    }
  }, [currentQuestionIndex, isAssessmentMode, perQuestionSeconds]);

  // Classical Mode: Overall countdown timer
  useEffect(() => {
    if (isAssessmentMode) return; // Overall timer handles Assessment auto-submit through per-question logic

    if (overallTimeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setOverallTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAssessmentMode, overallTimeLeft, handleFinalSubmit]);

  // Option selection handlers
  const selectSingleOption = (questionId, optionIndex) => {
    if (isAnswerLocked) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));

    if (isAssessmentMode) {
      // In Assessment Mode: Lock answer immediately and auto-advance after brief feedback
      setIsAnswerLocked(true);
      setTransitioningToNext(true);
      nextTransitionTimeoutRef.current = setTimeout(() => {
        advanceToNext();
      }, 1200);
    }
  };

  const toggleMultiOption = (questionId, optionIndex) => {
    if (isAnswerLocked) return;
    setSelectedAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const exists = current.includes(optionIndex);
      const updated = exists ? current.filter(i => i !== optionIndex) : [...current, optionIndex];
      return {
        ...prev,
        [questionId]: updated.sort()
      };
    });
  };

  const handleTextAnswer = (questionId, text) => {
    if (isAnswerLocked) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: text
    }));
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQuestionIndex] || {};
  const currentType = currentQ.type || 'single';
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  // Per-question timer percentage for Assessment Mode progress bar
  const questionTimerPercent = isAssessmentMode 
    ? Math.max(0, Math.min(100, (questionSecondsLeft / perQuestionSeconds) * 100))
    : 100;

  return (
    <div 
      className="max-w-5xl mx-auto px-4 py-6 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Tab Switch Alert */}
      {showTabWarning && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white block">Academic Integrity Notice</strong>
              <span>Tab switch detected ({tabSwitches} time{tabSwitches > 1 ? 's' : ''}). Please stay on the exam page.</span>
            </div>
          </div>
          <button 
            onClick={() => setShowTabWarning(false)}
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Apple-styled Top Bar */}
      <div className="apple-glass rounded-2xl p-4 sm:p-5 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em]">Candidate</span>
            {isAssessmentMode && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Assessment ({perQuestionSeconds}s/Q)</span>
              </span>
            )}
            {!isAssessmentMode && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]/70 text-[#1d1d1f] text-[10px] font-semibold">
                <span>Standard Exam</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2.5 mt-1">
            <h2 className="text-base font-semibold text-[#1d1d1f] tracking-tight">{studentName}</h2>
            {studentId && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#f5f5f7] text-[#6e6e73] border border-[#d2d2d7]/70 font-medium">
                {studentId}
              </span>
            )}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="flex justify-between text-xs font-medium text-[#86868b] mb-1.5 tracking-tight">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span className="text-[#1d1d1f] font-medium">{answeredCount}/{questions.length} Answered</span>
          </div>
          <div className="w-full bg-[#e5e5ea] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#0071e3] h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(0,113,227,0.35)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer Display */}
        {isAssessmentMode ? (
          /* ASSESSMENT MODE PER-QUESTION TIMER */
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-mono text-sm font-semibold transition-all shadow-sm ${
              questionSecondsLeft <= 5 
                ? 'bg-rose-50 text-rose-600 border border-rose-300 animate-pulse' 
                : questionSecondsLeft <= 10
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-white text-[#1d1d1f] border border-[#d2d2d7]'
            }`}>
              <Timer className="w-4 h-4 text-[#0071e3]" />
              <span>{questionSecondsLeft}s</span>
            </div>
          </div>
        ) : (
          /* CLASSICAL MODE OVERALL TIMER */
          <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-mono text-sm font-semibold transition-all shadow-sm ${
            overallTimeLeft <= 300 
              ? 'bg-rose-50 text-rose-600 border border-rose-300 animate-pulse' 
              : overallTimeLeft <= 600
              ? 'bg-amber-50 text-amber-700 border border-amber-300'
              : 'bg-white text-[#1d1d1f] border border-[#d2d2d7]'
          }`}>
            <Clock className="w-4 h-4 text-[#0071e3]" />
            <span>{formatTimer(overallTimeLeft)}</span>
          </div>
        )}
      </div>

      {/* ASSESSMENT MODE: Per-Question Countdown Progress Bar */}
      {isAssessmentMode && (
        <div className="mb-6 apple-glass rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-[#86868b] mb-2 px-1 tracking-tight">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[#1d1d1f] font-medium">Question {currentQuestionIndex + 1} Limit</span>
            </span>
            <span className={`font-mono font-medium ${
              questionSecondsLeft <= 5 ? 'text-rose-600 animate-pulse' : questionSecondsLeft <= 10 ? 'text-amber-600' : 'text-[#1d1d1f]'
            }`}>
              {questionSecondsLeft}s / {perQuestionSeconds}s remaining
            </span>
          </div>
          <div className="w-full bg-[#e5e5ea] h-1.5 rounded-full overflow-hidden border border-[#d2d2d7]/40">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                questionSecondsLeft <= 5 
                  ? 'bg-[#ff3b30]' 
                  : questionSecondsLeft <= 10 
                  ? 'bg-[#ff9500]' 
                  : 'bg-[#0071e3]'
              }`}
              style={{ width: `${questionTimerPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isAssessmentMode ? 'lg:grid-cols-1 max-w-4xl mx-auto' : 'lg:grid-cols-4'} gap-6`}>
        {/* Main Question Card */}
        <div className={`${isAssessmentMode ? 'w-full' : 'lg:col-span-3'} space-y-6`}>
          <div className="apple-glass rounded-[28px] p-6 sm:p-10 shadow-sm relative">
            {/* Question Header & Points */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-5 border-b border-[#e5e5ea]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d2d2d7]">
                  Q{currentQuestionIndex + 1} / {questions.length}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#6e6e73] border border-[#d2d2d7]/70">
                  {currentQ.category || 'General'}
                </span>
                <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#86868b] border border-[#d2d2d7]/70">
                  {currentQ.points ? `${currentQ.points.toLocaleString()} pts` : '1,000 pts'}
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#6e6e73] uppercase tracking-wider border border-[#d2d2d7]/70">
                  {currentType === 'single' ? 'Multiple Choice' : currentType === 'boolean' ? 'True / False' : currentType === 'multi' ? 'Multi-Select' : 'Type Answer'}
                </span>

                {!isAssessmentMode && (
                  <button
                    type="button"
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      flaggedQuestions[currentQ.id]
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-[#d2d2d7] text-[#6e6e73] hover:text-[#1d1d1f] hover:border-[#86868b]'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] mb-8 leading-snug tracking-[-0.015em]">
              {currentQ.question}
            </h3>

            {/* ASSESSMENT MODE: Lock Notification Badge */}
            {isAssessmentMode && isAnswerLocked && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Answer Recorded. Advancing to next question...</span>
                </div>
                <button
                  type="button"
                  onClick={advanceToNext}
                  className="apple-btn-secondary px-3 py-1 text-xs text-[#1d1d1f]"
                >
                  <span>Skip Wait →</span>
                </button>
              </div>
            )}

            {/* DYNAMIC ANSWER INPUT BASED ON TYPE */}
            {/* TYPE 1: SINGLE CHOICE (KAHOOT 4 VIBRANT COLOR TILES) */}
            {currentType === 'single' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(currentQ.options || []).map((option, idx) => {
                  const style = KAHOOT_STYLES[idx % KAHOOT_STYLES.length];
                  const Icon = style.icon;
                  const isSelected = selectedAnswers[currentQ.id] === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswerLocked}
                      onClick={() => selectSingleOption(currentQ.id, idx)}
                      className={`text-left p-5 rounded-2xl border-2 transition-all flex items-start space-x-3.5 group relative overflow-hidden transform active:scale-[0.98] ${
                        isSelected 
                          ? style.activeBg 
                          : `${style.cardBg} text-[#1d1d1f]`
                      } ${isAnswerLocked ? 'opacity-90 cursor-default' : 'cursor-pointer hover:shadow-md'}`}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all font-bold shadow-sm ${
                        isSelected ? 'bg-white/30 text-white' : style.badgeBg
                      }`}>
                        <Icon className="w-4 h-4 fill-current" />
                      </span>
                      <span className="text-sm sm:text-base font-semibold leading-relaxed pt-1 flex-1">
                        {option}
                      </span>
                      {isSelected && (
                        <Check className="w-5 h-5 shrink-0 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TYPE 2: TRUE / FALSE (KAHOOT 2 BIG CARDS) */}
            {currentType === 'boolean' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  disabled={isAnswerLocked}
                  onClick={() => selectSingleOption(currentQ.id, 0)}
                  className={`p-8 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                    selectedAnswers[currentQ.id] === 0
                      ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-lg shadow-blue-500/20'
                      : 'bg-sky-50/80 border-sky-200 hover:bg-sky-100 text-[#0071e3]'
                  } ${isAnswerLocked ? 'opacity-90 cursor-default' : ''}`}
                >
                  <Diamond className="w-10 h-10 fill-current mb-1" />
                  <span className="text-2xl font-extrabold uppercase tracking-wider">True</span>
                </button>

                <button
                  type="button"
                  disabled={isAnswerLocked}
                  onClick={() => selectSingleOption(currentQ.id, 1)}
                  className={`p-8 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                    selectedAnswers[currentQ.id] === 1
                      ? 'bg-[#ff3b30] border-[#ff3b30] text-white shadow-lg shadow-rose-500/20'
                      : 'bg-rose-50/80 border-rose-200 hover:bg-rose-100 text-[#ff3b30]'
                  } ${isAnswerLocked ? 'opacity-90 cursor-default' : ''}`}
                >
                  <Triangle className="w-10 h-10 fill-current mb-1" />
                  <span className="text-2xl font-extrabold uppercase tracking-wider">False</span>
                </button>
              </div>
            )}

            {/* TYPE 3: MULTI-SELECT CHECKBOXES */}
            {currentType === 'multi' && (
              <div className="space-y-3">
                <div className="text-xs text-[#0071e3] font-semibold mb-2">
                  * Multi-Select: Choose all correct answers, then click {isAssessmentMode ? '"Lock Answer"' : '"Next"'}
                </div>
                {(currentQ.options || []).map((option, idx) => {
                  const currentSelection = Array.isArray(selectedAnswers[currentQ.id]) ? selectedAnswers[currentQ.id] : [];
                  const isChecked = currentSelection.includes(idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswerLocked}
                      onClick={() => toggleMultiOption(currentQ.id, idx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-blue-50/90 border-[#0071e3] text-[#1d1d1f] shadow-sm'
                          : 'bg-[#fbfbfd] border-[#d2d2d7] text-[#1d1d1f] hover:border-[#86868b]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'border-[#d2d2d7] bg-white'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium leading-relaxed pt-0.5 flex-1">{option}</span>
                    </button>
                  );
                })}

                {isAssessmentMode && (
                  <button
                    type="button"
                    disabled={isAnswerLocked}
                    onClick={() => {
                      setIsAnswerLocked(true);
                      setTransitioningToNext(true);
                      nextTransitionTimeoutRef.current = setTimeout(advanceToNext, 1200);
                    }}
                    className="apple-btn-primary w-full mt-4 py-3 font-semibold text-sm cursor-pointer"
                  >
                    Lock & Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* TYPE 4: SHORT ANSWER TEXT INPUT */}
            {currentType === 'text' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider">
                  Type Your Answer
                </label>
                <input
                  type="text"
                  disabled={isAnswerLocked}
                  placeholder=""
                  value={selectedAnswers[currentQ.id] || ''}
                  onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                  className="apple-input w-full px-5 py-4 text-base font-medium"
                />
                <p className="text-xs text-[#86868b]">Case-insensitive matching applies upon submission.</p>

                {isAssessmentMode && (
                  <button
                    type="button"
                    disabled={isAnswerLocked}
                    onClick={() => {
                      setIsAnswerLocked(true);
                      setTransitioningToNext(true);
                      nextTransitionTimeoutRef.current = setTimeout(advanceToNext, 1200);
                    }}
                    className="apple-btn-primary w-full mt-2 py-3 font-semibold text-sm cursor-pointer"
                  >
                    Lock & Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* Bottom Nav: Only in Classical Mode (Assessment Mode advances automatically!) */}
            {!isAssessmentMode && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#e5e5ea]">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="apple-btn-secondary flex items-center space-x-2 px-5 py-2.5 text-xs disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="apple-btn-primary flex items-center space-x-2 px-6 py-2.5 text-xs cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="apple-btn-primary flex items-center space-x-2 px-6 py-2.5 text-xs cursor-pointer shadow-[0_2px_14px_rgba(52,199,89,0.35)] !bg-[#34c759] hover:!bg-[#30d158] !text-white font-semibold"
                  >
                    <Send className="w-4 h-4" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Question Grid Sidebar: Only visible in Classical Mode */}
        {!isAssessmentMode && (
          <div className="space-y-6">
            <div className="apple-glass rounded-2xl p-5 shadow-sm">
              <h4 className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-4">
                Question Navigator
              </h4>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== '';
                  const isFlagged = flaggedQuestions[q.id];

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`relative w-full aspect-square rounded-xl text-xs font-mono font-medium flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white font-bold scale-105'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-[#0071e3] text-white shadow-sm'
                          : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e5e5ea] hover:text-[#1d1d1f]'
                      }`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2.5 text-xs border-t border-[#e5e5ea] pt-4 text-[#86868b]">
                <div className="flex items-center justify-between">
                  <span>Answered</span>
                  <span className="font-mono font-medium text-[#1d1d1f]">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unanswered</span>
                  <span className="font-mono font-medium text-[#86868b]">{unansweredCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Flagged</span>
                  <span className="font-mono font-medium text-amber-600">{flaggedCount}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="apple-btn-primary w-full mt-6 py-3 px-4 text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Final Exam</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal (Classical Mode) - Apple macOS Alert */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-glass rounded-[28px] max-w-md w-full p-8 shadow-2xl relative border border-[#d2d2d7]">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0071e3] mb-4 mx-auto">
              <Send className="w-5 h-5" />
            </div>

            <h3 className="text-xl font-semibold text-[#1d1d1f] text-center mb-1.5 tracking-tight">
              Submit Examination?
            </h3>
            <p className="text-xs text-[#86868b] text-center mb-6 leading-relaxed">
              Your responses will be graded server-side against the official answer keys and recorded under your USN.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                {submitError}
              </div>
            )}

            <div className="bg-[#f5f5f7] rounded-2xl p-4 border border-[#e5e5ea] mb-6 space-y-2.5 text-xs">
              <div className="flex justify-between text-[#86868b]">
                <span>Total Questions</span>
                <strong className="text-[#1d1d1f] font-medium">{questions.length}</strong>
              </div>
              <div className="flex justify-between text-[#1d1d1f]">
                <span>Answered</span>
                <strong className="text-[#34c759] font-medium">{answeredCount}</strong>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Unanswered</span>
                  <strong className="font-medium">{unansweredCount}</strong>
                </div>
              )}
              <div className="flex justify-between text-[#86868b]">
                <span>Time Remaining</span>
                <strong className="font-mono text-[#1d1d1f]">{formatTimer(overallTimeLeft)}</strong>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="apple-btn-secondary flex-1 py-3 px-4 text-xs font-medium cursor-pointer"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="apple-btn-primary flex-1 py-3 px-4 text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Grading...</span>
                ) : (
                  <>
                    <span>Confirm Submit</span>
                    <Check className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
