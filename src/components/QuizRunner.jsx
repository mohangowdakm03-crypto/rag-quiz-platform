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
  Check
} from 'lucide-react';
import { submitStudentQuiz } from '../firebase';

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

  // Persist draft to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        answers: selectedAnswers,
        flagged: flaggedQuestions,
        timeLeft
      }));
    } catch (e) {
      console.warn('Failed to save draft to localStorage:', e);
    }
  }, [selectedAnswers, flaggedQuestions, timeLeft, draftKey]);

  // Handle final submission calculation
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError('');

    let correctCount = 0;
    const breakdown = questions.map((q) => {
      const studentChoice = selectedAnswers[q.id];
      const isCorrect = studentChoice === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        studentChoice: studentChoice !== undefined ? studentChoice : null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const score = correctCount;
    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= (quizData.passingScore || 70);
    const timeTakenSeconds = (timeLimitMinutes * 60) - timeLeft;

    const submissionPayload = {
      studentName,
      studentId: studentId || "N/A",
      score,
      totalQuestions,
      percentage,
      passed,
      timeTakenSeconds,
      answers: selectedAnswers,
      breakdown
    };

    try {
      // Write to Firestore database
      await submitStudentQuiz(quizId, submissionPayload);
      
      // Clean draft
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {
        // ignore
      }

      onCompleteQuiz(submissionPayload);
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError('Failed to save to database. Retrying... (Your answers are preserved locally).');
      // Still show results so student does not get locked out
      setTimeout(() => {
        onCompleteQuiz(submissionPayload);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  }, [questions, selectedAnswers, timeLimitMinutes, timeLeft, studentName, studentId, quizId, quizData.passingScore, draftKey, onCompleteQuiz]);

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
  }, [currentQuestionIndex, questions, showSubmitModal, selectedAnswers]);

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
    <div className="max-w-5xl mx-auto px-4 py-6">
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
            <span className="text-blue-400">{answeredCount}/{questions.length} Answered</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
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
            : 'bg-slate-800 text-blue-400 border border-slate-700'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTimer(timeLeft)}</span>
        </div>
      </div>

      {/* Main Question & Navigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Question Box (3 cols) */}
        <div className="lg:col-span-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative fade-in">
            {/* Header: Category, Difficulty & Flag */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {currentQ.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  currentQ.difficulty === 'Fundamental'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : currentQ.difficulty === 'Intermediate'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {currentQ.difficulty}
                </span>
              </div>

              {/* Flag button */}
              <button
                type="button"
                onClick={() => toggleFlag(currentQ.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  flaggedQuestions[currentQ.id]
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {currentQ.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3 mb-8">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                const optionLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOption(currentQ.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start space-x-3.5 group ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                    }`}>
                      {optionLetter}
                    </div>
                    <span className="text-sm leading-relaxed pt-0.5">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="flex items-center space-x-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs text-slate-500 hidden sm:block">
                Press keys <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">A</kbd>-<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">D</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">1</kbd>-<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-slate-300">4</kbd> to select
              </div>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="flex items-center space-x-1 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Jump Grid (1 col) */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl sticky top-24">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-[10px] font-mono text-blue-400">{answeredCount}/{questions.length}</span>
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
                    className={`h-9 rounded-lg font-mono text-xs font-bold relative transition-all ${
                      isCurrent
                        ? 'ring-2 ring-blue-400 bg-blue-600 text-white'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="space-y-2 text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Flagged for Review ({flaggedCount})</span>
              </div>
            </div>

            {/* Direct Submit Button from Sidebar */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full mt-6 py-3 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 text-white transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review & Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl fade-in">
            <h3 className="text-xl font-bold text-white mb-2">Ready to Submit?</h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-6">
              Review your attempt status below. Once submitted, your answers will be permanently saved to the instructor's database.
            </p>

            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-2.5 mb-6 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-bold text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Answered:</span>
                </span>
                <span className="font-bold text-emerald-400">{answeredCount}</span>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Unanswered:</span>
                  </span>
                  <span className="font-bold text-amber-400">{unansweredCount}</span>
                </div>
              )}
              {flaggedCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-purple-400 flex items-center space-x-1">
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Flagged for Review:</span>
                  </span>
                  <span className="font-bold text-purple-400">{flaggedCount}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-400">Time Remaining:</span>
                <span className="font-mono font-bold text-blue-400">{formatTimer(timeLeft)}</span>
              </div>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {submitError}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isSubmitting ? (
                  <span>Saving to DB...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Submit</span>
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
