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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl fade-in overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-white">{studentName}</h2>
              {studentId && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/30">
                  USN: {studentId}
                </span>
              )}
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                passed 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
              <span>Score: <strong className="text-white">{score}/{totalQuestions}</strong> ({percentage}%)</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Time: {formatTime(timeTakenSeconds)}</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {breakdown.map((item, idx) => {
            const isCorrect = item.isCorrect;
            const letter = item.studentChoice !== null && item.studentChoice !== undefined 
              ? String.fromCharCode(65 + item.studentChoice) 
              : 'None';
            const correctLetter = String.fromCharCode(65 + item.correctAnswer);

            return (
              <div 
                key={idx}
                className={`p-4 rounded-xl border text-xs ${
                  isCorrect 
                    ? 'bg-slate-950/60 border-slate-800' 
                    : 'bg-rose-950/10 border-rose-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="font-bold text-white">Q{item.questionId || idx + 1}. {item.question}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                    {item.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60">
                  <div className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
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
