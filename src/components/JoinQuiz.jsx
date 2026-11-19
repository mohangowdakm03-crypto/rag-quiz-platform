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
import { joinQuizRoom, getStudentQuizDefinition, checkStudentAlreadySubmitted } from '../supabase';

export default function JoinQuiz({ defaultQuizId, onStartQuiz, onSwitchToTeacher }) {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState(''); // USN / Roll Number (Compulsory)
  const [quizId, setQuizId] = useState(() => {
    const raw = (defaultQuizId || '').toString();
    return raw.replace(/\D/g, '').slice(0, 6);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Update quizId if defaultQuizId changes via URL params
  useEffect(() => {
    if (defaultQuizId) {
      const numeric = defaultQuizId.toString().replace(/\D/g, '').slice(0, 6);
      if (numeric) {
        setQuizId(numeric);
      }
    }
  }, [defaultQuizId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedPin = quizId.replace(/\D/g, '').slice(0, 6);
    const trimmedName = studentName.trim();
    const trimmedUsn = studentId.trim();

    if (!trimmedPin || trimmedPin.length !== 6) {
      setError('Please enter a valid 6-digit Game PIN.');
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
        setError(`Invalid Game PIN "${trimmedPin}". No active quiz session was found.`);
        setIsLoading(false);
        return;
      }

      // Check retake permission if this candidate already completed the exam
      if (cloudQuiz.allowRetake === false) {
        const alreadySubmitted = await checkStudentAlreadySubmitted(trimmedPin, trimmedUsn);
        if (alreadySubmitted) {
          setError(`Candidate USN "${trimmedUsn}" has already submitted this examination. Retakes are disabled for this session.`);
          setIsLoading(false);
          return;
        }
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
      setError(`Could not join session: ${err.message || 'Please check your connection.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] apple-bg-ambient flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full fade-in">
        {/* Apple Glass Container */}
        <div className="apple-glass rounded-[32px] p-8 sm:p-12 relative overflow-hidden">
          {/* Subtle top specular sheen */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

          {/* Header Eyebrow */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#86868b]">
              Candidate Portal
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sync Active</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] apple-title-gradient mb-2.5">
            Join Examination
          </h1>
          <p className="text-sm text-[#86868b] leading-relaxed mb-8 tracking-tight">
            Enter your instructor's 6-digit Game PIN, verified University Seat Number (USN), and name to enter the live session.
          </p>

          {/* Join Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium leading-relaxed flex items-center space-x-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* 1. 6-DIGIT GAME PIN (STRICTLY NUMERIC & MAX 6 DIGITS) */}
            <div className="p-5 rounded-2xl bg-[#fbfbfd] border border-[#d2d2d7]/70 shadow-sm relative group hover:border-[#86868b] transition-all">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e6e73] text-center mb-2.5">
                6-Digit Game PIN <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                placeholder="••••••"
                value={quizId}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setQuizId(numeric);
                  if (error) setError('');
                }}
                className="w-full text-center text-3xl sm:text-4xl font-mono font-semibold py-3 px-4 rounded-xl bg-white border border-[#d2d2d7] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/15 transition-all tracking-[0.25em] shadow-sm"
              />
              <p className="text-[11px] text-[#86868b] text-center mt-2.5 tracking-tight">
                Enter the 6-digit PIN shown on the host screen or in your invite link.
              </p>
            </div>

            {/* 2. USN / ROLL NUMBER */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-2 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <IdCard className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>University Seat Number (USN)</span>
                  <span className="text-red-500 font-bold">*</span>
                </span>
                <span className="text-[11px] text-[#86868b]">Required for score certification</span>
              </label>
              <input
                type="text"
                required
                placeholder=""
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="apple-input w-full px-4 py-3 text-sm font-mono tracking-wide"
              />
            </div>

            {/* 3. CANDIDATE FULL NAME */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-2 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-[#86868b]" />
                <span>Full Name</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                placeholder=""
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="apple-input w-full px-4 py-3 text-sm"
              />
            </div>

            {/* SUBMIT BUTTON (APPLE PILL) */}
            <button
              type="submit"
              disabled={isLoading}
              className="apple-btn-primary w-full py-3.5 px-6 font-medium text-[15px] tracking-tight flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Connecting to Session...</span>
              ) : (
                <>
                  <span>Begin Examination</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer security tag */}
          <div className="mt-8 pt-6 border-t border-[#e5e5ea] flex items-center justify-between text-xs text-[#86868b]">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#86868b]" />
              <span>Anti-Cheat Monitored</span>
            </div>
            <span className="text-[11px] text-[#6e6e73]">Server Verified • 60+ Concurrent Capacity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
