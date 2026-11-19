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
  Search,
  RotateCcw,
  Edit3
} from 'lucide-react';

export default function SessionsHub({ 
  sessions = [], 
  onOpenSession, 
  onCreateNewQuiz, 
  onEditSession,
  onDuplicateSession,
  onRehostSession,
  onDeleteSession,
  onLock,
  isLoading,
  rehostingPin
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
      {/* Top Apple Banner Header */}
      <div className="apple-glass rounded-[32px] p-8 sm:p-10 mb-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-semibold text-[#86868b] uppercase tracking-[0.18em] mb-2">
            <Layers className="w-3.5 h-3.5 text-[#2997ff]" />
            <span>Instructor Administration</span>
            <span>•</span>
            <span>Multi-Session Storage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] apple-title-gradient mb-2">
            Conducted Quiz Sessions
          </h1>
          <p className="text-xs sm:text-sm text-[#86868b] max-w-2xl leading-relaxed tracking-tight">
            Every conducted quiz session is isolated and archived below. Select any session to view the live winners podium, full candidate USN roster, and item accuracy analytics.
          </p>
        </div>

        {/* Primary CTA: Create New Quiz */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="apple-btn-primary px-6 py-3 font-medium text-sm flex items-center space-x-2 cursor-pointer shadow-[0_2px_14px_rgba(0,113,227,0.4)]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Quiz</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            className="apple-btn-secondary px-4 py-2.5 text-xs font-medium cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="apple-glass-card rounded-2xl p-5 border border-[#d2d2d7]/70">
          <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-[0.16em] mb-1">
            Total Sessions
          </div>
          <div className="text-3xl font-semibold text-[#1d1d1f] font-mono tracking-tight">
            {sessions.length}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5 border border-[#d2d2d7]/70">
          <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-[0.16em] mb-1">
            Total Submissions
          </div>
          <div className="text-3xl font-semibold text-[#1d1d1f] font-mono tracking-tight">
            {totalAllSubmissions}
          </div>
        </div>

        <div className="apple-glass-card rounded-2xl p-5 border border-[#d2d2d7]/70 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-[#86868b] font-semibold uppercase tracking-[0.16em] mb-1">
            Database Engine
          </div>
          <div className="text-sm sm:text-base font-semibold text-[#34c759] flex items-center space-x-1.5 mt-2">
            <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
            <span>Supabase Realtime PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="apple-glass rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by session name or 6-digit PIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="apple-input w-full pl-10 pr-4 py-2 text-xs"
          />
        </div>
        <div className="text-xs text-[#86868b] font-medium hidden sm:block">
          Showing <strong className="text-[#1d1d1f]">{filteredSessions.length}</strong> of {sessions.length} sessions
        </div>
      </div>

      {/* SESSIONS GRID OF BOXES / CARDS */}
      {isLoading ? (
        <div className="py-20 text-center text-[#86868b]">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs">Loading sessions from cloud...</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="apple-glass rounded-[32px] p-12 text-center max-w-lg mx-auto">
          <Sparkles className="w-10 h-10 text-[#0071e3] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2 tracking-tight">No Quiz Sessions Found</h3>
          <p className="text-xs text-[#86868b] mb-6 leading-relaxed">
            Create your first quiz session to generate a 6-digit PIN and invite candidates to participate.
          </p>
          <button
            type="button"
            onClick={onCreateNewQuiz}
            className="apple-btn-primary px-6 py-2.5 text-xs font-medium cursor-pointer"
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
                className="apple-glass-card rounded-[28px] p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group relative overflow-hidden transition-all duration-300"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        isAssessment 
                          ? 'bg-amber-50 border border-amber-200 text-amber-700' 
                          : 'bg-[#f5f5f7] border border-[#d2d2d7]/70 text-[#1d1d1f]'
                      }`}>
                        {isAssessment ? <Zap className="w-3 h-3 text-amber-500" /> : <Clock className="w-3 h-3 text-[#0071e3]" />}
                        <span>{isAssessment ? `Assessment (${session.perQuestionSeconds || 30}s/Q)` : `Standard (${session.timeLimitMinutes || 30}m)`}</span>
                      </span>

                      {!session.showScore && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 border border-blue-200 text-[#0071e3]">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Confidential</span>
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.sessionPin);
                      }}
                      className="p-1.5 rounded-xl text-[#86868b] hover:text-[#ff3b30] hover:bg-rose-50 transition border border-transparent hover:border-red-200"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Session Title */}
                  <h3 className="text-lg font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors line-clamp-2 mb-2 tracking-tight">
                    {session.title || 'Untitled Quiz Session'}
                  </h3>

                  {/* Date & Time conducted */}
                  <div className="flex items-center space-x-1.5 text-xs text-[#86868b] mb-4">
                    <Calendar className="w-3.5 h-3.5 text-[#86868b] shrink-0" />
                    <span>Conducted: <strong className="text-[#1d1d1f] font-medium">{dateDisplay}</strong></span>
                  </div>

                  {/* 6-Digit Game PIN Banner */}
                  <div className="bg-[#fbfbfd] border border-[#d2d2d7]/70 group-hover:border-[#0071e3]/40 rounded-2xl p-3.5 mb-5 flex items-center justify-between transition-colors">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-[0.16em] block">Game PIN</span>
                      <span className="text-xl font-mono font-semibold text-[#1d1d1f] tracking-widest">
                        {session.sessionPin}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleCopyPin(session.sessionPin, e)}
                        className="apple-btn-secondary px-3 py-1.5 text-[11px] font-mono flex items-center space-x-1 cursor-pointer"
                        title="Copy PIN only"
                      >
                        {copiedPin === session.sessionPin ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPin === session.sessionPin ? 'Copied' : 'PIN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(session.sessionPin, e)}
                        className="apple-btn-primary px-3 py-1.5 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                        title="Copy student invite link"
                      >
                        {copiedLink === session.sessionPin ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedLink === session.sessionPin ? 'Copied' : 'Link'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Submissions & Performance Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3.5 bg-[#fbfbfd] rounded-xl border border-[#e5e5ea] mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-[#86868b] uppercase block font-semibold tracking-wider">Submissions</span>
                      <span className="text-sm font-semibold text-[#1d1d1f] font-mono">{session.submissionCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#86868b] uppercase block font-semibold tracking-wider">Class Avg</span>
                      <span className="text-sm font-semibold text-[#0071e3] font-mono">{session.classAverage || 0}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#86868b] uppercase block font-semibold tracking-wider">Pass Rate</span>
                      <span className="text-sm font-semibold text-[#34c759] font-mono">{session.passRate || 0}%</span>
                    </div>
                  </div>

                  {/* Action Buttons: Re-host, Edit, Duplicate */}
                  <div className="pt-2 pb-1 grid grid-cols-3 gap-2 border-t border-[#e5e5ea] mb-3">
                    {/* Re-host (Kahoot-style: fresh 6-digit PIN for new class) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRehostSession(session.sessionPin);
                      }}
                      disabled={rehostingPin === session.sessionPin}
                      className="apple-btn-secondary px-2 py-1.5 text-[11px] font-medium flex items-center justify-center space-x-1.5 rounded-xl cursor-pointer hover:border-[#0071e3] hover:text-[#0071e3] transition-all disabled:opacity-50"
                      title="Re-host: Launch a new live session with this quiz and get a fresh 6-digit PIN"
                    >
                      <RotateCcw className={`w-3 h-3 text-[#0071e3] ${rehostingPin === session.sessionPin ? 'animate-spin' : ''}`} />
                      <span>{rehostingPin === session.sessionPin ? 'Hosting...' : 'Re-host'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSession(session.sessionPin);
                      }}
                      className="apple-btn-secondary px-2 py-1.5 text-[11px] font-medium flex items-center justify-center space-x-1.5 rounded-xl cursor-pointer hover:border-[#1d1d1f] hover:text-[#1d1d1f] transition-all"
                      title="Edit: Modify quiz questions, answers, and time settings"
                    >
                      <Edit3 className="w-3 h-3 text-[#1d1d1f]" />
                      <span>Edit</span>
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSession(session.sessionPin);
                      }}
                      className="apple-btn-secondary px-2 py-1.5 text-[11px] font-medium flex items-center justify-center space-x-1.5 rounded-xl cursor-pointer hover:border-[#1d1d1f] hover:text-[#1d1d1f] transition-all"
                      title="Duplicate: Clone quiz as a new copy to create variations"
                    >
                      <Copy className="w-3 h-3 text-[#86868b]" />
                      <span>Duplicate</span>
                    </button>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-3 border-t border-[#e5e5ea] flex items-center justify-between text-xs font-medium text-[#0071e3] group-hover:text-[#0077ed] transition-colors">
                  <span>Open Session Analytics</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
