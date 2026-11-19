import React from 'react';
import { X, CheckCircle2, XCircle, Clock, Award, ShieldCheck, ShieldAlert } from 'lucide-react';

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
    tabSwitches = 0,
    screenshotAttempts = 0,
    violationsLog = [],
    integrityStatus = 'Clean',
    deviceUid = '',
    breakdown = []
  } = student;

  const formatTime = (secs) => {
    if (!secs) return 'N/A';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="apple-glass bg-white rounded-[28px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl fade-in overflow-hidden border border-[#d2d2d7]">
        {/* Header */}
        <div className="p-6 border-b border-[#e5e5ea] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">{studentName}</h2>
              {studentId && (
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#0071e3] border border-[#d2d2d7]/70">
                  USN: {studentId}
                </span>
              )}
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                passed 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="text-xs text-[#86868b] mt-1.5 flex items-center space-x-3 tracking-tight">
              <span>Score: <strong className="text-[#1d1d1f] font-medium">{score}/{totalQuestions}</strong> ({percentage}%)</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#0071e3]" />
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

        {/* Proctoring & Academic Integrity Telemetry Card */}
        <div className="px-6 py-3.5 bg-white border-b border-[#e5e5ea] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold uppercase text-[#86868b] tracking-wider">Exam Proctoring:</span>
            {integrityStatus === 'Flagged' || (tabSwitches >= 3 || screenshotAttempts > 0) ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <ShieldAlert className="w-3 h-3 text-[#ff3b30]" />
                <span>Flagged Violation</span>
              </span>
            ) : tabSwitches > 0 ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                <span>Warning ({tabSwitches} Switch{tabSwitches > 1 ? 'es' : ''})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-[#34c759]" />
                <span>Clean Session</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-[#6e6e73]">
            <span>Tab Switches: <strong className="font-mono text-[#1d1d1f]">{tabSwitches}</strong></span>
            <span>•</span>
            <span>Screenshots: <strong className="font-mono text-[#1d1d1f]">{screenshotAttempts}</strong></span>
            {deviceUid && (
              <>
                <span>•</span>
                <span className="font-mono text-[#86868b]">Device: {deviceUid.slice(0, 8)}</span>
              </>
            )}
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3.5 bg-[#f5f5f7]">
          {breakdown.map((item, idx) => {
            const isCorrect = item.isCorrect;
            const letter = item.studentChoice !== null && item.studentChoice !== undefined 
              ? String.fromCharCode(65 + item.studentChoice) 
              : 'None';
            const correctLetter = String.fromCharCode(65 + item.correctAnswer);

            return (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border text-xs transition bg-white shadow-sm ${
                  isCorrect 
                    ? 'border-[#d2d2d7]/70' 
                    : 'border-rose-300 bg-rose-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#ff3b30]" />
                    )}
                    <span className="font-semibold text-[#1d1d1f] tracking-tight">Q{item.questionId || idx + 1}. {item.question}</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#86868b] px-2 py-0.5 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]/50">
                    {item.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#e5e5ea]">
                  <div className={isCorrect ? 'text-emerald-800 font-medium' : 'text-rose-800 font-medium'}>
                    Selected: <strong>{letter}</strong> ({item.options ? item.options[item.studentChoice] : 'N/A'})
                  </div>
                  {!isCorrect && (
                    <div className="text-emerald-700 font-medium">
                      Correct: <strong>{correctLetter}</strong> ({item.options ? item.options[item.correctAnswer] : 'N/A'})
                    </div>
                  )}
                </div>

                {item.explanation && (
                  <p className="mt-2 text-[#424245] text-[11px] bg-[#f5f5f7] p-2.5 rounded-lg border border-[#e5e5ea]">
                    💡 <strong className="text-[#1d1d1f]">Explanation:</strong> {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e5e5ea] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="apple-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
