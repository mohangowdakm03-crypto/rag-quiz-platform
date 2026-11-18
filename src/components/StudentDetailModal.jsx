import React from 'react';
import { X, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';

export default function StudentDetailModal({ student, onClose }) {
  if (!student) return null;

  const {
    studentName,
    studentId,
    score,
    totalQuestions,
    percentage,
    passed,
    timeTakenSeconds,
    breakdown = []
  } = student;

  const formatTime = (secs) => {
    if (!secs) return 'N/A';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="apple-glass rounded-[28px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl fade-in overflow-hidden border border-white/[0.1]">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-semibold text-white tracking-tight">{studentName}</h2>
              {studentId && (
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#2997ff] border border-white/[0.1]">
                  USN: {studentId}
                </span>
              )}
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                passed 
                  ? 'bg-emerald-500/10 text-[#30d158] border border-emerald-500/20' 
                  : 'bg-rose-500/10 text-[#ff453a] border border-rose-500/20'
              }`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="text-xs text-[#86868b] mt-1.5 flex items-center space-x-3 tracking-tight">
              <span>Score: <strong className="text-white font-medium">{score}/{totalQuestions}</strong> ({percentage}%)</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#2997ff]" />
                <span>Time: {formatTime(timeTakenSeconds)}</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-btn-secondary w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3.5">
          {breakdown.map((item, idx) => {
            const isCorrect = item.isCorrect;
            const letter = item.studentChoice !== null && item.studentChoice !== undefined 
              ? String.fromCharCode(65 + item.studentChoice) 
              : 'None';
            const correctLetter = String.fromCharCode(65 + item.correctAnswer);

            return (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border text-xs transition ${
                  isCorrect 
                    ? 'apple-glass-card border-white/[0.06]' 
                    : 'bg-rose-500/[0.04] border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#30d158]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#ff453a]" />
                    )}
                    <span className="font-semibold text-white tracking-tight">Q{item.questionId || idx + 1}. {item.question}</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#86868b] px-2 py-0.5 rounded-full bg-white/[0.06]">
                    {item.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                  <div className={isCorrect ? 'text-[#30d158]' : 'text-[#ff453a]'}>
                    Selected: <strong>{letter}</strong> ({item.options ? item.options[item.studentChoice] : 'N/A'})
                  </div>
                  {!isCorrect && (
                    <div className="text-emerald-400">
                      Correct: <strong>{correctLetter}</strong> ({item.options ? item.options[item.correctAnswer] : 'N/A'})
                    </div>
                  )}
                </div>

                {item.explanation && (
                  <p className="mt-2 text-slate-400 text-[11px] bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    💡 <strong className="text-slate-300">Explanation:</strong> {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
