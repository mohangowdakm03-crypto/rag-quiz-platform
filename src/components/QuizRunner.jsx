import React, { useState, useEffect, useCallback } from 'react';
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
  CheckSquare
} from 'lucide-react';
import { submitStudentQuizUniversal } from '../supabase';

// Kahoot-style Shape & Color Palette for Options
const KAHOOT_STYLES = [
  {
    name: 'Red Triangle',
    icon: Triangle,
    cardBg: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60',
    activeBg: 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/30',
    badgeBg: 'bg-red-600 text-white',
    symbolColor: 'text-red-400'
  },
  {
    name: 'Blue Diamond',
    icon: Diamond,
    cardBg: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/60',
    activeBg: 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30',
    badgeBg: 'bg-blue-600 text-white',
    symbolColor: 'text-blue-400'
  },
  {
    name: 'Yellow Circle',
    icon: Circle,
    cardBg: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/60',
    activeBg: 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg shadow-amber-500/30',
    badgeBg: 'bg-amber-500 text-slate-950',
    symbolColor: 'text-amber-400'
  },
  {
    name: 'Green Square',
    icon: Square,
    cardBg: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/60',
    activeBg: 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30',
    badgeBg: 'bg-emerald-600 text-white',
    symbolColor: 'text-emerald-400'
  }
];

export default function QuizRunner({ sessionData, quizData, onCompleteQuiz }) {
  const { studentName, studentId, quizId } = sessionData;
  const { questions, timeLimitMinutes = 30 } = quizData;

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

  // Anti-cheat tab switch monitoring
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);

  // Timer in seconds
  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.timeLeft === 'number' && parsed.timeLeft > 0) {
          return parsed.timeLeft;
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
        timeLeft
      }));
    } catch {
      // ignore
    }
  }, [selectedAnswers, flaggedQuestions, timeLeft, draftKey]);

  // Handle final submission (Universal server-graded)
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const timeTakenSeconds = (timeLimitMinutes * 60) - timeLeft;

    try {
      const results = await submitStudentQuizUniversal(quizId, {
        studentName,
        studentId: studentId || 'N/A',
        timeTakenSeconds,
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
  }, [timeLimitMinutes, timeLeft, quizId, studentName, studentId, selectedAnswers, draftKey, onCompleteQuiz]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleFinalSubmit]);

  const selectSingleOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const toggleMultiOption = (questionId, optionIndex) => {
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

      {/* Top Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Candidate</span>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white">{studentName}</h2>
            {studentId && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {studentId}
              </span>
            )}
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span className="text-emerald-400">{answeredCount}/{questions.length} Answered</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-base font-bold transition-all ${
          timeLeft <= 300 
            ? 'bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse' 
            : timeLeft <= 600
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            : 'bg-slate-800 text-emerald-400 border border-slate-700'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative">
            {/* Question Header & Points */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  {currentQ.category || 'General'}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  {currentQ.points ? `${currentQ.points.toLocaleString()} pts` : '1,000 pts'}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                  {currentType === 'single' ? 'Multiple Choice' : currentType === 'boolean' ? 'True / False' : currentType === 'multi' ? 'Multi-Select' : 'Type Answer'}
                </span>

                <button
                  type="button"
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    flaggedQuestions[currentQ.id]
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-lg sm:text-xl font-bold text-white mb-6 leading-relaxed">
              {currentQ.question}
            </h3>

            {/* DYNAMIC ANSWER INPUT BASED ON TYPE */}
            {/* TYPE 1: SINGLE CHOICE (KAHOOT 4 TILES) */}
            {currentType === 'single' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(currentQ.options || []).map((option, idx) => {
                  const style = KAHOOT_STYLES[idx % KAHOOT_STYLES.length];
                  const Icon = style.icon;
                  const isSelected = selectedAnswers[currentQ.id] === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectSingleOption(currentQ.id, idx)}
                      className={`text-left p-4 rounded-xl border transition-all flex items-start space-x-3 group relative overflow-hidden ${
                        isSelected ? style.activeBg : `${style.cardBg} text-slate-200`
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all font-bold ${
                        isSelected ? 'bg-white/20 text-white' : style.badgeBg
                      }`}>
                        <Icon className="w-4 h-4 fill-current" />
                      </span>
                      <span className="text-sm font-medium leading-relaxed pt-1 flex-1">{option}</span>
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
                  onClick={() => selectSingleOption(currentQ.id, 0)}
                  className={`p-6 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                    selectedAnswers[currentQ.id] === 0
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/30'
                      : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-300'
                  }`}
                >
                  <Diamond className="w-8 h-8 fill-current mb-1" />
                  <span className="text-xl font-extrabold uppercase tracking-wider">True</span>
                </button>

                <button
                  type="button"
                  onClick={() => selectSingleOption(currentQ.id, 1)}
                  className={`p-6 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                    selectedAnswers[currentQ.id] === 1
                      ? 'bg-red-600 border-red-400 text-white shadow-xl shadow-red-600/30'
                      : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-300'
                  }`}
                >
                  <Triangle className="w-8 h-8 fill-current mb-1" />
                  <span className="text-xl font-extrabold uppercase tracking-wider">False</span>
                </button>
              </div>
            )}

            {/* TYPE 3: MULTI-SELECT CHECKBOXES */}
            {currentType === 'multi' && (
              <div className="space-y-3">
                <div className="text-xs text-teal-400 font-semibold mb-2">
                  * Multi-Select: Choose all correct answers
                </div>
                {(currentQ.options || []).map((option, idx) => {
                  const currentSelection = Array.isArray(selectedAnswers[currentQ.id]) ? selectedAnswers[currentQ.id] : [];
                  const isChecked = currentSelection.includes(idx);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleMultiOption(currentQ.id, idx)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                        isChecked
                          ? 'bg-teal-600/20 border-teal-500 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium leading-relaxed pt-0.5 flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* TYPE 4: SHORT ANSWER TEXT INPUT */}
            {currentType === 'text' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Type Your Answer
                </label>
                <input
                  type="text"
                  placeholder="Type your answer here..."
                  value={selectedAnswers[currentQ.id] || ''}
                  onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
                <p className="text-xs text-slate-500">Case-insensitive matching applies upon submission.</p>
              </div>
            )}

            {/* Bottom Nav */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Review & Submit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Grid Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">
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
                    className={`relative w-full aspect-square rounded-xl text-xs font-mono font-bold flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 font-extrabold scale-105'
                        : ''
                    } ${
                      isAnswered
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 text-xs border-t border-slate-800 pt-4 text-slate-400">
              <div className="flex items-center justify-between">
                <span>Answered</span>
                <span className="font-mono font-bold text-white">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unanswered</span>
                <span className="font-mono font-bold text-slate-400">{unansweredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Flagged</span>
                <span className="font-mono font-bold text-amber-400">{flaggedCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Submit Final Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">
              Ready to Submit?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              Your responses will be graded server-side against the official answer keys and recorded.
            </p>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {submitError}
              </div>
            )}

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Questions:</span>
                <strong className="text-white">{questions.length}</strong>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Answered:</span>
                <strong>{answeredCount}</strong>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Unanswered Questions:</span>
                  <strong>{unansweredCount}</strong>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span>Time Remaining:</span>
                <strong className="font-mono text-emerald-400">{formatTimer(timeLeft)}</strong>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Grading...</span>
                ) : (
                  <>
                    <span>Confirm Submit</span>
                    <Check className="w-4 h-4" />
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
