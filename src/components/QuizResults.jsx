import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  RotateCcw, 
  LayoutDashboard, 
  Share2,
  Filter,
  Check,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function QuizResults({ results, onRetake, onSwitchToTeacher }) {
  const { 
    studentName, 
    studentId, 
    score, 
    totalQuestions, 
    percentage, 
    passed, 
    timeTakenSeconds, 
    breakdown 
  } = results;

  const [filterMode, setFilterMode] = useState('all'); // 'all', 'incorrect', 'correct'
  const [copied, setCopied] = useState(false);

  // Trigger celebration confetti if passed
  useEffect(() => {
    if (passed) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [passed]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const getTier = (pct) => {
    if (pct >= 90) return { title: 'RAG Lead Architect', color: 'from-amber-400 to-yellow-600', text: 'text-amber-400' };
    if (pct >= 75) return { title: 'RAG Senior Specialist', color: 'from-emerald-400 to-teal-600', text: 'text-emerald-400' };
    if (pct >= 60) return { title: 'RAG Practitioner', color: 'from-blue-400 to-indigo-600', text: 'text-blue-400' };
    return { title: 'RAG Student / Learner', color: 'from-slate-400 to-slate-600', text: 'text-slate-400' };
  };

  const tier = getTier(percentage);

  const filteredBreakdown = breakdown.filter((item) => {
    if (filterMode === 'correct') return item.isCorrect;
    if (filterMode === 'incorrect') return !item.isCorrect;
    return true;
  });

  const correctCount = breakdown.filter((b) => b.isCorrect).length;
  const incorrectCount = totalQuestions - correctCount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 fade-in">
      {/* Header Results Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-8">
        {/* Glow backdrop */}
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
          passed ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-slate-800/80 border border-slate-700">
            <Award className={`w-4 h-4 ${tier.text}`} />
            <span className={tier.text}>{tier.title}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
            Assessment Completed!
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
            Great job, <strong className="text-white">{studentName}</strong>! Your submission has been securely recorded in the instructor's live database.
          </p>

          {/* Big Score Display */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 my-6 py-6 border-y border-slate-800/80">
            <div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Final Score</div>
              <div className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
                {score} <span className="text-2xl text-slate-500 font-normal">/ {totalQuestions}</span>
              </div>
            </div>

            <div className="h-12 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Percentage</div>
              <div className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${
                passed ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {percentage}%
              </div>
            </div>

            <div className="h-12 w-[1px] bg-slate-800 hidden sm:block" />

            <div>
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Time Expended</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>{formatTime(timeTakenSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center space-x-3 mt-4">
            {passed ? (
              <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Passed with Proficiency</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                <span>Passing threshold is 70% (Needs Review)</span>
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button
              onClick={onRetake}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Quiz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Itemized Question Analysis</h2>
          <p className="text-xs text-slate-400">Review detailed technical explanations for every question.</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({totalQuestions})
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'incorrect'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Incorrect ({incorrectCount})
          </button>
          <button
            onClick={() => setFilterMode('correct')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'correct'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Correct ({correctCount})
          </button>
        </div>
      </div>

      {/* Questions Breakdown List */}
      <div className="space-y-4">
        {filteredBreakdown.map((item, index) => {
          const qNumber = item.questionId;
          const isCorrect = item.isCorrect;

          return (
            <div
              key={item.questionId}
              className={`bg-slate-900 border rounded-2xl p-5 sm:p-6 transition-all ${
                isCorrect ? 'border-slate-800 hover:border-slate-700' : 'border-rose-900/40 bg-rose-950/5'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Question {qNumber}</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-300 font-medium">
                    {item.category}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {item.difficulty}
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-bold text-white mb-4">
                {item.question}
              </h3>

              {/* Options Breakdown */}
              <div className="space-y-2 mb-4">
                {item.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isStudentPick = item.studentChoice === optIdx;
                  const isTheCorrectAnswer = item.correctAnswer === optIdx;

                  let optionStyle = 'bg-slate-950/60 border-slate-800 text-slate-400';
                  let badge = null;

                  if (isTheCorrectAnswer) {
                    optionStyle = 'bg-emerald-500/10 border-emerald-500/50 text-white';
                    badge = (
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1 shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Correct Answer</span>
                      </span>
                    );
                  } else if (isStudentPick && !isCorrect) {
                    optionStyle = 'bg-rose-500/10 border-rose-500/50 text-rose-200';
                    badge = (
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1 shrink-0">
                        <XCircle className="w-3 h-3" />
                        <span>Your Answer</span>
                      </span>
                    );
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start space-x-3 ${optionStyle}`}
                    >
                      <span className="font-mono font-bold shrink-0">{letter}.</span>
                      <span className="flex-1">{opt}</span>
                      {badge}
                    </div>
                  );
                })}
              </div>

              {/* Technical Explanation */}
              <div className="bg-slate-950/90 rounded-xl p-4 border border-blue-900/30 text-xs">
                <div className="font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Technical Explanation</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {item.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
