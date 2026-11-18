import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle, 
  HelpCircle,
  CheckCircle2,
  Bookmark,
  Check,
  ShieldAlert,
  X
} from 'lucide-react';
import { submitStudentQuizSecure } from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions';

export default function QuizRunner({ sessionData, quizData, onCompleteQuiz }) {
  const { studentName, studentId, quizId } = sessionData;
  const { questions, timeLimitMinutes = 30 } = quizData;

  // Local storage draft key
  const draftKey = `rag_quiz_draft_${quizId}_${studentName.replace(/\s+/g, '_')}`;

  // State
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

  // Anti-cheat tab switch tracking
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

  // Tab switch listener (Anti-cheat)
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

  // Persist draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        answers: selectedAnswers,
        flagged: flaggedQuestions,
        timeLeft
      }));
    } catch (e) {
      console.warn('Draft save note:', e);
    }
  }, [selectedAnswers, flaggedQuestions, timeLeft, draftKey]);

  // Handle final submission calculation (Server-graded in PostgreSQL)
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const timeTakenSeconds = (timeLimitMinutes * 60) - timeLeft;

    try {
      const results = await submitStudentQuizSecure(quizId, {
        studentName,
        studentId: studentId || 'N/A',
        timeTakenSeconds,
        answers: selectedAnswers,
        fallbackQuestions: RAG_QUIZ_DATA.questions
      });

      // Clear local draft
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

  // Countdown timer effect
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

  // Keyboard shortcut listener (1-4, A-D, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showSubmitModal) return;

      const key = e.key.toLowerCase();
      const currentQ = questions[currentQuestionIndex];

      if (['1', 'a'].includes(key) && currentQ.options[0]) {
        selectOption(currentQ.id, 0);
      } else if (['2', 'b'].includes(key) && currentQ.options[1]) {
        selectOption(currentQ.id, 1);
      } else if (['3', 'c'].includes(key) && currentQ.options[2]) {
        selectOption(currentQ.id, 2);
      } else if (['4', 'd'].includes(key) && currentQ.options[3]) {
        selectOption(currentQ.id, 3);
      } else if (e.key === 'ArrowRight' && currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, questions, showSubmitModal]);

  const selectOption = (questionId, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const toggleFlag = (questionId) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Format time MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQuestionIndex];
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
      {/* Tab Switch Alert Banner */}
      {showTabWarning && (
        <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white block">Academic Integrity Notice</strong>
              <span>Tab switch detected ({tabSwitches} time{tabSwitches > 1 ? 's' : ''}). Switching tabs or navigating away during the exam is monitored.</span>
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

      {/* Top Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Student info */}
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

        {/* Countdown Timer */}
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
        {/* Main Question Panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative">
            {/* Header: Category & Difficulty */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  {currentQ.category}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  currentQ.difficulty === 'Advanced' 
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : currentQ.difficulty === 'Intermediate'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {currentQ.difficulty}
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

            {/* Options list */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOption(currentQ.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3 group ${
                      isSelected
                        ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                    }`}>
                      {optionLetter}
                    </span>
                    <span className="text-sm leading-relaxed pt-0.5 flex-1">{option}</span>
                    {isSelected && (
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Nav Buttons */}
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

              <div className="text-xs text-slate-500 hidden sm:block">
                Press <strong>1-4</strong> or <strong>A-D</strong> to pick • <strong>← / →</strong> to navigate
              </div>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
                >
                  <span>Next</span>
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

        {/* Right Sidebar: Question Grid & Final Action */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">
              Question Navigator
            </h4>

            {/* Grid of 20 questions */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined;
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
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
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

            {/* Legend */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-4 text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-md bg-emerald-600" />
                  <span>Answered</span>
                </span>
                <span className="font-mono font-bold text-white">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-md bg-slate-800" />
                  <span>Unanswered</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{unansweredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-md bg-amber-400" />
                  <span>Flagged for Review</span>
                </span>
                <span className="font-mono font-bold text-amber-400">{flaggedCount}</span>
              </div>
            </div>

            {/* Submit Quiz Action */}
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

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white text-center mb-2">
              Ready to Submit Your Exam?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
              Once submitted, your answers will be verified by the cloud database and your score will be permanently recorded.
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
                Back to Questions
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
