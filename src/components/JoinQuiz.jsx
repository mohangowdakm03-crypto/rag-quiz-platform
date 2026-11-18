import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  Cpu, 
  Lock,
  KeyRound,
  IdCard,
  User
} from 'lucide-react';
import { joinQuizRoom, getStudentQuizDefinition } from '../supabase';

export default function JoinQuiz({ defaultQuizId, onStartQuiz, onSwitchToTeacher }) {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState(''); // USN / Roll Number (Compulsory)
  const [quizId, setQuizId] = useState(defaultQuizId && defaultQuizId !== 'rag-mastery-2025' ? defaultQuizId : '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Update quizId if defaultQuizId changes via URL params
  useEffect(() => {
    if (defaultQuizId && defaultQuizId !== 'rag-mastery-2025') {
      setQuizId(defaultQuizId);
    }
  }, [defaultQuizId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedPin = quizId.trim();
    const trimmedName = studentName.trim();
    const trimmedUsn = studentId.trim();

    if (!trimmedPin) {
      setError('Please enter the 6-digit Game PIN provided by your teacher.');
      return;
    }

    if (!trimmedUsn) {
      setError('Please enter your University Seat Number (USN) / Roll Number.');
      return;
    }

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      // Validate that the session PIN exists in Supabase
      const cloudQuiz = await getStudentQuizDefinition(trimmedPin);
      if (!cloudQuiz || !cloudQuiz.questions || cloudQuiz.questions.length === 0) {
        setError(`Invalid Game PIN "${trimmedPin}". No active quiz session was found. Please check with your instructor.`);
        setIsLoading(false);
        return;
      }

      // Register presence in Supabase
      await joinQuizRoom(trimmedPin, trimmedName, trimmedUsn);
      
      onStartQuiz({
        studentName: trimmedName,
        studentId: trimmedUsn,
        quizId: trimmedPin
      });
    } catch (err) {
      console.warn('Join note:', err);
      setError(`Could not join session: ${err.message || 'Please check your internet connection.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full">
        {/* Glow decoration */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500 rounded-3xl blur-xl opacity-30"></div>

          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Header Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Student Examination Portal</span>
              </div>

              <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cloud Sync Active</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Join Quiz Session
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
              Enter the 6-digit Game PIN displayed on the teacher's screen along with your official USN and Name to begin.
            </p>

            {/* Join Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-semibold leading-relaxed">
                  ⚠️ {error}
                </div>
              )}

              {/* 1. BIG 6-DIGIT GAME PIN INPUT (CENTERPIECE) */}
              <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-inner">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest text-center mb-2 flex items-center justify-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>6-Digit Game PIN <span className="text-red-400 font-bold">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 849201"
                  value={quizId}
                  onChange={(e) => setQuizId(e.target.value)}
                  className="w-full text-center text-2xl sm:text-3xl font-mono font-black py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-emerald-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition tracking-widest uppercase shadow-md"
                />
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Ask your teacher for the 6-digit session PIN or click the invite link they shared.
                </p>
              </div>

              {/* 2. USN / ROLL NUMBER */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <IdCard className="w-3.5 h-3.5 text-teal-400" />
                  <span>University Seat Number (USN) / Roll No. <span className="text-red-400 font-bold text-sm">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1MS21CS042 or 2025-CS-101"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition text-sm font-mono tracking-wide"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Required for official grading and score certification.
                </p>
              </div>

              {/* 3. CANDIDATE FULL NAME */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Name <span className="text-red-400 font-bold text-sm">*</span></span>
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

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all transform active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Verifying PIN & Loading Session...</span>
                ) : (
                  <>
                    <span>Enter Quiz & Begin</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Footer security tag */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                <span>Anti-Cheat Monitored • Universal Server Graded</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">60+ Concurrent Capacity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
