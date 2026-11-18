import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Users, 
  CheckCircle2,
  Cpu,
  Lock
} from 'lucide-react';
import { joinQuizRoom } from '../supabase';

export default function JoinQuiz({ defaultQuizId, onStartQuiz, onSwitchToTeacher }) {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [quizId, setQuizId] = useState(defaultQuizId || 'rag-mastery-2025');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('Please enter your full name to proceed.');
      return;
    }
    if (!quizId.trim()) {
      setError('Please enter a valid Quiz ID.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Register presence in Supabase
      await joinQuizRoom(quizId.trim(), studentName.trim(), studentId.trim());
      
      onStartQuiz({
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        quizId: quizId.trim()
      });
    } catch (err) {
      console.warn('Join note:', err);
      onStartQuiz({
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        quizId: quizId.trim()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl w-full">
        {/* Glow decoration */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 rounded-3xl blur-xl opacity-30"></div>

          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Advanced AI / LLM Examination System</span>
              </div>

              <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cloud Sync Live (60+ Students)</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              RAG (Retrieval-Augmented Generation) Quiz
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mb-8 leading-relaxed">
              Test your technical knowledge across dense & sparse vector retrieval, chunking algorithms, HNSW indexing, cross-encoder rerankers, Ragas evaluation, and production RAG security.
            </p>

            {/* Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col items-center text-center">
                <HelpCircle className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-lg font-bold text-white">20</span>
                <span className="text-[11px] text-slate-400 font-medium">Questions</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-teal-400 mb-1" />
                <span className="text-lg font-bold text-white">30 Min</span>
                <span className="text-[11px] text-slate-400 font-medium">Time Limit</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col items-center text-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-lg font-bold text-white">70%</span>
                <span className="text-[11px] text-slate-400 font-medium">Passing Score</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col items-center text-center">
                <Users className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-lg font-bold text-white">60+</span>
                <span className="text-[11px] text-slate-400 font-medium">Simultaneous</span>
              </div>
            </div>

            {/* Join Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Student ID / Roll No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS2025-042"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Game PIN / Quiz ID <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 849201 or rag-mastery-2025"
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition text-sm font-mono tracking-wide"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 6-digit Session PIN or Quiz ID provided by your instructor.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Joining Session...</span>
                ) : (
                  <>
                    <span>Enter Quiz & Begin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer switcher (Discreet Instructor Portal) */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                <span>Anti-Cheat Protected • Server Graded</span>
              </div>
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="text-slate-500 hover:text-slate-300 text-[11px] flex items-center space-x-1 transition"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Instructor Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
