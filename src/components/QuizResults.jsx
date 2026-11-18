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
    if (pct >= 90) return { title: 'First Class with Distinction', color: 'from-amber-400 to-yellow-600', text: 'text-amber-400' };
    if (pct >= 75) return { title: 'High Commendation', color: 'from-emerald-400 to-teal-600', text: 'text-emerald-400' };
    if (pct >= 60) return { title: 'Qualified Merit', color: 'from-blue-400 to-indigo-600', text: 'text-blue-400' };
    return { title: 'Candidate (Needs Review)', color: 'from-slate-400 to-slate-600', text: 'text-slate-400' };
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
      {/* Header Results Card - Apple Glass */}
      <div className="apple-glass rounded-[32px] p-8 sm:p-12 shadow-sm relative overflow-hidden mb-8">
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-4 bg-white border border-[#d2d2d7]/70 shadow-sm">
            <Award className={`w-3.5 h-3.5 ${tier.text}`} />
            <span className={tier.text}>{tier.title}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] apple-title-gradient mb-2">
            Assessment Completed
          </h1>
          <p className="text-[#6e6e73] text-sm max-w-lg mx-auto mb-6 tracking-tight">
            Submission confirmed for <strong className="text-[#1d1d1f] font-semibold">{studentName}</strong> ({studentId}). Recorded in the central evaluation registry.
          </p>

          {/* Big Score Display */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 my-6 py-6 border-y border-[#e5e5ea]">
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-1">Final Score</div>
              <div className="text-5xl sm:text-6xl font-semibold tracking-tight text-[#1d1d1f]">
                {score} <span className="text-2xl text-[#86868b] font-normal">/ {totalQuestions}</span>
              </div>
            </div>

            <div className="h-12 w-[1px] bg-[#e5e5ea] hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-1">Percentage</div>
              <div className={`text-5xl sm:text-6xl font-semibold tracking-tight ${
                passed ? 'text-[#34c759]' : 'text-[#ff3b30]'
              }`}>
                {percentage}%
              </div>
            </div>

            <div className="h-12 w-[1px] bg-[#e5e5ea] hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-1">Time Elapsed</div>
              <div className="text-2xl sm:text-3xl font-semibold text-[#0071e3] flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-[#0071e3]" />
                <span>{formatTime(timeTakenSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center space-x-3 mt-4">
            {passed ? (
              <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Passed with Official Proficiency</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Passing threshold is 70% (Review Recommended)</span>
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button
              onClick={onRetake}
              className="apple-btn-secondary flex items-center space-x-2 px-6 py-2.5 text-xs font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Examination</span>
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Question Item Analysis</h2>
          <p className="text-xs text-[#86868b] tracking-tight">Review technical explanations and correct option breakdown.</p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center p-1 rounded-full bg-[#e5e5ea] border border-[#d2d2d7]/60">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#0071e3] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            All ({totalQuestions})
          </button>
          <button
            onClick={() => setFilterMode('correct')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              filterMode === 'correct' ? 'bg-[#34c759] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            Correct ({correctCount})
          </button>
          <button
            onClick={() => setFilterMode('incorrect')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              filterMode === 'incorrect' ? 'bg-[#ff3b30] text-white shadow-sm font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            Missed ({incorrectCount})
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
              className={`apple-glass-card rounded-2xl p-5 sm:p-6 transition-all ${
                isCorrect ? 'border-[#d2d2d7]/70' : 'border-rose-300 bg-rose-50/40'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isCorrect ? 'bg-emerald-100 text-[#34c759]' : 'bg-rose-100 text-[#ff3b30]'
                  }`}>
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-xs font-medium text-[#86868b]">Question {qNumber}</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#0071e3] font-medium border border-[#d2d2d7]/70">
                    {item.category}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
                  {item.difficulty}
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-semibold text-[#1d1d1f] mb-4 tracking-tight">
                {item.question}
              </h3>

              {/* Options Breakdown */}
              <div className="space-y-2 mb-4">
                {item.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isStudentPick = item.studentChoice === optIdx;
                  const isTheCorrectAnswer = item.correctAnswer === optIdx;

                  let optionStyle = 'bg-[#fbfbfd] border-[#e5e5ea] text-[#6e6e73]';
                  let badge = null;

                  if (isTheCorrectAnswer) {
                    optionStyle = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold';
                    badge = (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center space-x-1 shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Correct Answer</span>
                      </span>
                    );
                  } else if (isStudentPick && !isCorrect) {
                    optionStyle = 'bg-rose-50 border-rose-300 text-rose-950 font-semibold';
                    badge = (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-rose-700 flex items-center space-x-1 shrink-0">
                        <XCircle className="w-3 h-3" />
                        <span>Your Answer</span>
                      </span>
                    );
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3.5 rounded-xl border flex items-center space-x-3 text-xs sm:text-sm transition ${optionStyle}`}
                    >
                      <span className="font-mono font-medium text-xs opacity-60 w-5">{letter}.</span>
                      <span className="flex-1 font-medium">{opt}</span>
                      {badge}
                    </div>
                  );
                })}
              </div>

              {/* Explanation Card */}
              {item.explanation && (
                <div className="p-4 rounded-xl bg-[#f5f5f7] border border-[#e5e5ea] text-xs text-[#424245] leading-relaxed">
                  <div className="flex items-center space-x-1.5 font-semibold text-[#1d1d1f] mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Technical Rationalization</span>
                  </div>
                  {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
