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
  Sparkles,
  Lock,
  ShieldCheck,
  Flag,
  FileCheck2,
  UserCheck
} from 'lucide-react';

export default function QuizResults({ results, onRetake, onSwitchToTeacher }) {
  const { 
    studentName, 
    studentId, 
    quizId,
    score, 
    totalPossibleScore,
    totalQuestions = 0, 
    percentage, 
    passed, 
    timeTakenSeconds = 0, 
    breakdown = [],
    answeredCount,
    unansweredCount,
    flaggedCount = 0,
    showScore = false,
    showItemAnalysis = false,
    allowRetake = false,
    showRank = false
  } = results || {};

  const [filterMode, setFilterMode] = useState('all'); // 'all', 'incorrect', 'correct'

  // Trigger celebratory confetti on completion
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const formatTime = (secs) => {
    const s = Number(secs) || 0;
    const mins = Math.floor(s / 60);
    const remainingSecs = s % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const answeredTotal = answeredCount !== undefined 
    ? answeredCount 
    : (totalQuestions - (unansweredCount || 0));
  const unansweredTotal = unansweredCount !== undefined 
    ? unansweredCount 
    : Math.max(0, totalQuestions - answeredTotal);
  const completionPct = totalQuestions > 0 ? Math.round((answeredTotal / totalQuestions) * 100) : 100;

  const getTier = (pct) => {
    if (pct >= 90) return { title: 'First Class with Distinction', text: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
    if (pct >= 75) return { title: 'High Commendation', text: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
    if (pct >= 60) return { title: 'Qualified Merit', text: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
    return { title: 'Completed (Reviewed)', text: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' };
  };

  const tier = showScore ? getTier(percentage || 0) : null;

  const filteredBreakdown = (breakdown || []).filter((item) => {
    if (filterMode === 'correct') return item.isCorrect;
    if (filterMode === 'incorrect') return !item.isCorrect;
    return true;
  });

  const correctCount = (breakdown || []).filter((b) => b.isCorrect).length;
  const incorrectCount = (breakdown || []).length - correctCount;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 fade-in">
      {/* Primary Completion & Thank You Card - Apple Glass */}
      <div className="apple-glass rounded-[32px] p-8 sm:p-12 shadow-sm relative overflow-hidden mb-8 border border-[#d2d2d7]/70">
        <div className="relative z-10 text-center">
          
          {/* Top Pill: Mode Status */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 bg-white border border-[#d2d2d7]/80 shadow-sm">
            {showScore ? (
              <>
                <Award className={`w-3.5 h-3.5 ${tier?.text}`} />
                <span className={tier?.text}>{tier?.title}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" />
                <span className="text-[#34c759]">Submission Confirmed</span>
              </>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] apple-title-gradient mb-2">
            {showScore ? 'Assessment Completed' : 'Thank You for Submitting!'}
          </h1>

          <p className="text-[#6e6e73] text-xs sm:text-sm max-w-lg mx-auto mb-6 tracking-tight leading-relaxed">
            Your responses have been securely recorded for{' '}
            <strong className="text-[#1d1d1f] font-semibold">{studentName}</strong> ({studentId}). Stored in the evaluation registry.
          </p>

          {/* Confidential Notice (If Score is Confidential) */}
          {!showScore && (
            <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl bg-[#f5f5f7] border border-[#d2d2d7]/80 text-left flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-[#0071e3]" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-[#1d1d1f] tracking-tight mb-0.5">
                  Confidential Competition Mode
                </h4>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  To ensure fairness, individual scores, question analysis, and rankings remain confidential. Top performers and podium winners will be revealed live by your instructor.
                </p>
              </div>
            </div>
          )}

          {/* Candidate Profile Bar */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 py-2 px-5 rounded-full bg-white border border-[#e5e5ea] text-xs text-[#6e6e73] mb-8 font-medium shadow-sm">
            <span className="flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0071e3]" />
              <strong className="text-[#1d1d1f]">{studentName}</strong>
            </span>
            <span className="text-[#d2d2d7]">•</span>
            <span>USN: <strong className="text-[#1d1d1f] font-mono">{studentId}</strong></span>
          </div>

          {/* If showScore is TRUE: Display Big Score Numbers */}
          {showScore ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 my-6 py-6 border-y border-[#e5e5ea]">
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-1">Final Score</div>
                <div className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f] font-mono">
                  {score !== null && score !== undefined ? score.toLocaleString() : '—'}
                  {totalPossibleScore && (
                    <span className="text-xl text-[#86868b] font-normal"> / {totalPossibleScore.toLocaleString()} pts</span>
                  )}
                </div>
              </div>

              <div className="h-12 w-[1px] bg-[#e5e5ea] hidden sm:block" />

              <div>
                <div className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] mb-1">Percentage</div>
                <div className={`text-4xl sm:text-5xl font-semibold tracking-tight font-mono ${
                  passed ? 'text-[#34c759]' : 'text-[#ff3b30]'
                }`}>
                  {percentage !== null && percentage !== undefined ? `${percentage}%` : '—'}
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
          ) : (
            /* If showScore is FALSE: Display Clean Student Quiz Summary Grid */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-6 max-w-2xl mx-auto">
              {/* Metric 1: Answered */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Questions Answered
                </span>
                <div className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] font-mono">
                  {answeredTotal} <span className="text-xs text-[#86868b] font-normal font-sans">/ {totalQuestions}</span>
                </div>
                <span className="text-[10px] font-medium text-[#34c759] mt-1 block">
                  {completionPct}% Complete
                </span>
              </div>

              {/* Metric 2: Unanswered */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Unanswered
                </span>
                <div className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] font-mono">
                  {unansweredTotal}
                </div>
                <span className="text-[10px] font-medium text-[#86868b] mt-1 block">
                  {unansweredTotal === 0 ? 'All Attempted' : 'Skipped'}
                </span>
              </div>

              {/* Metric 3: Flagged for Review */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Flagged
                </span>
                <div className="text-2xl sm:text-3xl font-semibold text-amber-500 font-mono">
                  {flaggedCount}
                </div>
                <span className="text-[10px] font-medium text-[#86868b] mt-1 block">
                  Review Tags
                </span>
              </div>

              {/* Metric 4: Time Elapsed */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] text-center shadow-sm">
                <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Time Elapsed
                </span>
                <div className="text-2xl sm:text-3xl font-semibold text-[#0071e3] font-mono">
                  {formatTime(timeTakenSeconds)}
                </div>
                <span className="text-[10px] font-medium text-[#86868b] mt-1 block">
                  Total Active Time
                </span>
              </div>
            </div>
          )}

          {/* Retake & Actions Area */}
          <div className="flex flex-col items-center justify-center gap-3 mt-8 pt-4">
            {allowRetake ? (
              <button
                onClick={onRetake}
                className="apple-btn-secondary flex items-center space-x-2 px-6 py-2.5 text-xs font-medium cursor-pointer hover:border-[#1d1d1f]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Examination</span>
              </button>
            ) : (
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]/70 text-[#6e6e73] text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-[#86868b]" />
                <span>Submission Finalized • Retakes are disabled for this session</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Section (Shown ONLY if showItemAnalysis is enabled by the teacher) */}
      {showItemAnalysis && (breakdown || []).length > 0 && (
        <div className="space-y-6 fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  key={item.questionId || index}
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
                        {item.category || 'General'}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-[#86868b] uppercase tracking-wider">
                      {item.difficulty || 'Intermediate'}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h3 className="text-base font-semibold text-[#1d1d1f] mb-4 tracking-tight">
                    {item.question}
                  </h3>

                  {/* Options Breakdown */}
                  <div className="space-y-2 mb-4">
                    {(item.options || []).map((opt, optIdx) => {
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
      )}
    </div>
  );
}
