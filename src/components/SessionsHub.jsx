import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Share2, 
  Download, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Zap, 
  Clock, 
  ArrowRight, 
  Check, 
  Copy,
  Layers,
  Lock,
  Search
} from 'lucide-react';

export default function SessionsHub({ 
  sessions = [], 
  onOpenSession, 
  onCreateNewQuiz, 
  onDeleteSession,
  onLock,
  isLoading
}) {
  const [copiedPin, setCopiedPin] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatSessionDate = (dateStr) => {
    if (!dateStr) return 'Recently Created';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recently Created';
    }
  };

  const handleCopyPin = (pin, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pin).then(() => {
      setCopiedPin(pin);
      setTimeout(() => setCopiedPin(null), 2000);
    });
  };

  const handleCopyLink = (pin, e) => {
    e.stopPropagation();
    const origin = window.location.origin;
    const shareUrl = `${origin}/?pin=${encodeURIComponent(pin)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(pin);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const filteredSessions = sessions.filter(s => {
    const q = searchTerm.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.sessionPin || '').toLowerCase().includes(q) ||
      (s.gameMode || '').toLowerCase().includes(q)
    );
  });

  const totalAllSubmissions = sessions.reduce((acc, s) => acc + (s.submissionCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Instructor Administration Dashboard</span>
            <span>•</span>
            <span>Multi-Session Storage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Conducted Quiz Sessions
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Every quiz session you conduct is saved separately by name and date below. Click any session box to view its live leaderboard, student submissions, and question accuracy heatmap.
          </p>
        </div>

        {/* Primary CTA: Create New Quiz */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create & Launch New Quiz</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            className="flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Total Conducted Sessions
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {sessions.length}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Total Student Submissions
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-300 font-mono">
            {totalAllSubmissions}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Storage Engine
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-400 flex items-center space-x-1.5 mt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Supabase Cloud PG</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search session by name, date or PIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing <strong className="text-white">{filteredSessions.length}</strong> of {sessions.length} sessions
        </div>
      </div>

      {/* SESSIONS GRID OF BOXES / CARDS */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span>Loading conducted sessions from Supabase...</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Quiz Sessions Found</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Create your first quiz session to generate a 6-digit PIN and invite students to answer.
          </p>
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
          >
            Create New Quiz Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const isAssessment = session.gameMode === 'assessment';
            const dateDisplay = formatSessionDate(session.createdAt);

            return (
              <div
                key={session.sessionPin}
                onClick={() => onOpenSession(session.sessionPin)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isAssessment 
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {isAssessment ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{isAssessment ? `Assessment (${session.perQuestionSeconds || 30}s/Q)` : `Classical (${session.timeLimitMinutes || 30}m)`}</span>
                    </span>

                    {/* Delete button (except default) */}
                    {session.sessionPin !== 'rag-mastery-2025' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.sessionPin);
                        }}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Session Title */}
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition line-clamp-2 mb-2">
                    {session.title || 'Untitled Quiz Session'}
                  </h3>

                  {/* Date & Time conducted */}
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Conducted: <strong className="text-slate-300 font-medium">{dateDisplay}</strong></span>
                  </div>

                  {/* 6-Digit Game PIN Banner */}
                  <div className="bg-slate-950 border border-slate-800 group-hover:border-slate-700 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Game PIN</span>
                      <span className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                        {session.sessionPin}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyPin(session.sessionPin, e)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-xs flex items-center space-x-1"
                        title="Copy PIN only"
                      >
                        {copiedPin === session.sessionPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[11px] font-mono">{copiedPin === session.sessionPin ? 'Copied' : 'PIN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(session.sessionPin, e)}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition text-xs flex items-center space-x-1 shadow-md shadow-emerald-500/20"
                        title="Copy student invite link"
                      >
                        {copiedLink === session.sessionPin ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span className="text-[11px] font-bold">{copiedLink === session.sessionPin ? 'Copied' : 'Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Submissions & Performance Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Submissions</span>
                      <span className="text-sm font-bold text-white font-mono">{session.submissionCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Class Avg</span>
                      <span className="text-sm font-bold text-teal-300 font-mono">{session.classAverage || 0}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Pass Rate</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">{session.passRate || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                  <span>Open Session Analytics</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
