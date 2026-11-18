import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Search, 
  Share2, 
  Check, 
  Clock, 
  BarChart3, 
  Eye, 
  Radio, 
  Lock, 
  Calendar, 
  Zap, 
  FileText,
  Table,
  Copy,
  ExternalLink,
  Crown,
  Medal,
  Sparkles,
  Link2
} from 'lucide-react';
import { 
  subscribeToTeacherData, 
  fetchTeacherSubmissions, 
  getQuizDefinition 
} from '../supabase';
import StudentDetailModal from './StudentDetailModal';

export default function ConductedSessionView({ 
  sessionPin, 
  onBackToHub, 
  teacherPasscode,
  onLock
}) {
  const [sessionDef, setSessionDef] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score-desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSheets, setCopiedSheets] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState(() => {
    try {
      return localStorage.getItem(`sheets_webhook_${sessionPin}`) || '';
    } catch {
      return '';
    }
  });
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncSheetsMsg, setSyncSheetsMsg] = useState('');

  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'item-analysis' | 'questions'
  const [isLoading, setIsLoading] = useState(true);

  // Load session definition & submissions
  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);
      try {
        const def = await getQuizDefinition(sessionPin);
        if (def) setSessionDef(def);

        const res = await fetchTeacherSubmissions(sessionPin, teacherPasscode);
        if (res.success) {
          setSubmissions(res.data);
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionPin) {
      loadSession();
    }
  }, [sessionPin, teacherPasscode]);

  // Real-time synchronization for this conducted session
  useEffect(() => {
    if (!sessionPin || !teacherPasscode) return;

    const unsubscribe = subscribeToTeacherData(
      sessionPin,
      teacherPasscode,
      (newSubmissions) => setSubmissions(newSubmissions)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sessionPin, teacherPasscode]);

  // Copy student invite link
  const handleCopyLink = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/?pin=${encodeURIComponent(sessionPin)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // CSV Export for this session (Sorted with Name, USN, Score)
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No student submissions yet for this session to export.');
      return;
    }

    const headers = [
      'Rank',
      'Student Name',
      'USN / Roll Number',
      'Earned Points / Score',
      'Total Questions',
      'Percentage',
      'Status',
      'Time Taken (Seconds)',
      'Submitted At'
    ];

    const sorted = [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0));

    const rows = sorted.map((sub, index) => {
      const dateStr = sub.submittedAt 
        ? new Date(sub.submittedAt).toLocaleString() 
        : 'Recent';

      return [
        index + 1,
        `"${(sub.studentName || '').replace(/"/g, '""')}"`,
        `"${(sub.studentId || '').replace(/"/g, '""')}"`,
        sub.score || 0,
        sub.totalQuestions || 20,
        `${sub.percentage}%`,
        sub.passed ? 'PASSED' : 'FAILED',
        sub.timeTakenSeconds || 0,
        `"${dateStr}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = `session_${sessionPin}_leaderboard_winners_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(urlBlob);
  };

  // Copy Formatted Data for Instant Google Sheets Paste
  const handleCopyForGoogleSheets = () => {
    if (submissions.length === 0) {
      alert('No student submissions yet to copy.');
      return;
    }

    const headers = ['Rank', 'Student Full Name', 'USN / Roll Number', 'Score', 'Total Questions', 'Percentage', 'Status', 'Time Taken', 'Submitted At'];
    const sorted = [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0));

    const rows = sorted.map((sub, index) => [
      index + 1,
      sub.studentName || '',
      sub.studentId || '',
      sub.score || 0,
      sub.totalQuestions || 20,
      `${sub.percentage}%`,
      sub.passed ? 'PASSED' : 'FAILED',
      `${Math.floor((sub.timeTakenSeconds || 0) / 60)}m ${(sub.timeTakenSeconds || 0) % 60}s`,
      sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ''
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopiedSheets(true);
      setTimeout(() => setCopiedSheets(false), 3000);
    });
  };

  // Sync to Google Sheets Webhook
  const handleSyncToGoogleSheets = async () => {
    if (!sheetsWebhookUrl.trim()) {
      alert('Please enter your Google Apps Script Web App URL first.');
      return;
    }

    setIsSyncingSheets(true);
    setSyncSheetsMsg('');

    try {
      localStorage.setItem(`sheets_webhook_${sessionPin}`, sheetsWebhookUrl.trim());

      const payload = {
        sessionPin,
        sessionTitle: sessionDef?.title || 'Quiz Session',
        exportedAt: new Date().toISOString(),
        students: submissions.map((s, idx) => ({
          rank: idx + 1,
          name: s.studentName,
          usn: s.studentId,
          score: s.score,
          percentage: s.percentage,
          passed: s.passed,
          timeTakenSeconds: s.timeTakenSeconds,
          submittedAt: s.submittedAt
        }))
      };

      await fetch(sheetsWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSyncSheetsMsg('✓ Synchronized all submissions to your Google Sheet successfully!');
    } catch (err) {
      setSyncSheetsMsg(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Metrics
  const totalSubmissions = submissions.length;
  const averageScore = totalSubmissions > 0
    ? Math.round(submissions.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalSubmissions)
    : 0;
  const passedCount = submissions.filter((s) => s.passed).length;
  const passRate = totalSubmissions > 0
    ? Math.round((passedCount / totalSubmissions) * 100)
    : 0;
  const highestScore = totalSubmissions > 0
    ? Math.max(...submissions.map((s) => s.score || 0))
    : 0;

  // Filter & Sort
  const filteredSubmissions = submissions
    .filter((s) => {
      const q = searchTerm.toLowerCase();
      return (
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score-desc') {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0); // Faster time wins ties!
      }
      if (sortBy === 'score-asc') return (a.score || 0) - (b.score || 0);
      if (sortBy === 'name-asc') return (a.studentName || '').localeCompare(b.studentName || '');
      if (sortBy === 'usn-asc') return (a.studentId || '').localeCompare(b.studentId || '');
      return 0;
    });

  // Top 3 Winners
  const winners = filteredSubmissions.slice(0, 3);

  const isAssessment = sessionDef?.gameMode === 'assessment';
  const questionsList = sessionDef?.questions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Navigation */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToHub}
          className="apple-btn-secondary inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Conducted Sessions</span>
        </button>
      </div>

      {/* Session Header Card (Apple Glass) */}
      <div className="apple-glass rounded-[32px] p-6 sm:p-8 mb-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-white text-xs font-mono font-medium">
              <span>GAME PIN: {sessionPin}</span>
            </span>

            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              isAssessment 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                : 'bg-white/[0.06] border border-white/[0.1] text-[#f5f5f7]'
            }`}>
              {isAssessment ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{isAssessment ? `Assessment (${sessionDef?.perQuestionSeconds || 30}s/Q)` : `Standard (${sessionDef?.timeLimitMinutes || 30}m)`}</span>
            </span>

            <span className="inline-flex items-center space-x-1 text-xs text-[#86868b] font-medium">
              <Radio className="w-3 h-3 text-[#30d158] animate-pulse" />
              <span>Live Cloud Sync</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] apple-title-gradient">
            {sessionDef?.title || 'Quiz Session Analytics'}
          </h1>

          <p className="text-[#86868b] text-xs sm:text-sm tracking-tight">
            {sessionDef?.description || 'All student entries are isolated by name & USN below.'}
          </p>
        </div>

        {/* Action Controls with Google Sheets Integration */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="apple-btn-primary flex items-center space-x-1.5 px-4 py-2 text-xs font-medium cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Student Link'}</span>
          </button>

          {/* Instant Google Sheets Copy */}
          <button
            onClick={handleCopyForGoogleSheets}
            className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
            title="Copy sorted table to paste directly into Google Sheets"
          >
            {copiedSheets ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <Table className="w-3.5 h-3.5 text-[#2997ff]" />}
            <span>{copiedSheets ? 'Copied for Sheets!' : 'Copy for Google Sheets'}</span>
          </button>

          {/* Google Sheets Sync Settings Modal */}
          <button
            onClick={() => setShowSheetsModal(true)}
            className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 text-[#2997ff]" />
            <span>Sheets Webhook</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#86868b]" />
            <span>CSV</span>
          </button>

          <button
            onClick={onLock}
            className="apple-btn-secondary p-2 text-xs text-[#86868b] hover:text-[#ff453a] cursor-pointer"
            title="Lock Console"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs (iOS Segmented Control Style) */}
      <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/[0.08] space-x-1 mb-8 w-fit">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center space-x-2 py-1.5 px-4 rounded-full text-xs font-medium transition cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-[#2997ff] text-white shadow-sm'
              : 'text-[#86868b] hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Leaderboard & Podium ({totalSubmissions})</span>
        </button>

        <button
          onClick={() => setActiveTab('item-analysis')}
          className={`flex items-center space-x-2 py-1.5 px-4 rounded-full text-xs font-medium transition cursor-pointer ${
            activeTab === 'item-analysis'
              ? 'bg-[#2997ff] text-white shadow-sm'
              : 'text-[#86868b] hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Question Heatmap ({questionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 py-1.5 px-4 rounded-full text-xs font-medium transition cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-[#2997ff] text-white shadow-sm'
              : 'text-[#86868b] hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Question Bank & Keys</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARD & WINNERS PODIUM */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* WINNERS PODIUM (TOP 3 CANDIDATES) */}
          {winners.length > 0 && (
            <div className="apple-glass rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center space-x-2 tracking-tight">
                    <Crown className="w-4 h-4 text-[#ffd60a]" />
                    <span>Top Winners Podium</span>
                  </h3>
                  <p className="text-xs text-[#86868b] mt-0.5 tracking-tight">
                    Top performing candidates sorted by score and completion speed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyForGoogleSheets}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#a1a1a6] text-xs font-medium hover:bg-white/[0.1] transition cursor-pointer"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>{copiedSheets ? 'Copied to Clipboard!' : 'Copy Podium for Sheets'}</span>
                </button>
              </div>

              {/* 3 Podiums: 2nd, 1st, 3rd */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                {/* 2nd Place */}
                {winners[1] ? (
                  <div className="apple-glass-card border-white/20 rounded-2xl p-5 text-center flex flex-col justify-between order-2 sm:order-1 h-56 shadow-lg">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.16] text-[#f5f5f7] flex items-center justify-center font-bold text-sm mx-auto mb-2">
                        🥈 2
                      </div>
                      <h4 className="font-semibold text-white text-base truncate tracking-tight">{winners[1].studentName}</h4>
                      <p className="text-xs font-mono font-medium text-[#2997ff] mt-0.5">USN: {winners[1].studentId}</p>
                    </div>
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="text-2xl font-semibold font-mono text-[#f5f5f7]">{winners[1].score?.toLocaleString()} pts</div>
                      <div className="text-xs text-[#86868b] font-medium">{winners[1].percentage}% • {Math.floor((winners[1].timeTakenSeconds || 0) / 60)}m {(winners[1].timeTakenSeconds || 0) % 60}s</div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden sm:block order-1"></div>
                )}

                {/* 1st Place (Center / Tallest) */}
                {winners[0] && (
                  <div className="apple-glass-card border-amber-400/40 bg-gradient-to-b from-amber-500/[0.08] via-white/[0.02] to-transparent rounded-[24px] p-6 text-center flex flex-col justify-between order-1 sm:order-2 h-64 shadow-[0_12px_40px_rgba(255,214,10,0.12)] relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#ffd60a] text-black font-semibold text-[10px] uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                      <Crown className="w-3 h-3" />
                      <span>1st Place Winner</span>
                    </div>

                    <div className="mt-2">
                      <div className="w-12 h-12 rounded-full bg-amber-400/20 border-2 border-[#ffd60a] text-[#ffd60a] flex items-center justify-center font-bold text-lg mx-auto mb-2 shadow-inner">
                        🥇 1
                      </div>
                      <h4 className="font-semibold text-white text-lg truncate tracking-tight">{winners[0].studentName}</h4>
                      <p className="text-xs font-mono font-medium text-[#ffd60a] mt-0.5">USN: {winners[0].studentId}</p>
                    </div>

                    <div className="pt-3 border-t border-amber-500/20">
                      <div className="text-3xl font-semibold font-mono text-white">{winners[0].score?.toLocaleString()} pts</div>
                      <div className="text-xs text-[#30d158] font-medium">{winners[0].percentage}% • Completed in {Math.floor((winners[0].timeTakenSeconds || 0) / 60)}m {(winners[0].timeTakenSeconds || 0) % 60}s</div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {winners[2] ? (
                  <div className="apple-glass-card border-amber-600/30 rounded-2xl p-5 text-center flex flex-col justify-between order-3 h-52 shadow-lg">
                    <div>
                      <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/40 text-amber-500 flex items-center justify-center font-bold text-sm mx-auto mb-2">
                        🥉 3
                      </div>
                      <h4 className="font-semibold text-white text-base truncate tracking-tight">{winners[2].studentName}</h4>
                      <p className="text-xs font-mono font-medium text-[#2997ff] mt-0.5">USN: {winners[2].studentId}</p>
                    </div>
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="text-2xl font-semibold font-mono text-[#f5f5f7]">{winners[2].score?.toLocaleString()} pts</div>
                      <div className="text-xs text-[#86868b] font-medium">{winners[2].percentage}% • {Math.floor((winners[2].timeTakenSeconds || 0) / 60)}m {(winners[2].timeTakenSeconds || 0) % 60}s</div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden sm:block order-3"></div>
                )}
              </div>
            </div>
          )}

          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="apple-glass-card rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between text-[#86868b] text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                <span>Submissions</span>
                <Users className="w-4 h-4 text-[#2997ff]" />
              </div>
              <div className="text-3xl font-semibold text-white font-mono tracking-tight">
                {totalSubmissions}
              </div>
              <div className="text-[11px] text-[#86868b] mt-1 font-mono">
                PIN: {sessionPin}
              </div>
            </div>

            <div className="apple-glass-card rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between text-[#86868b] text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                <span>Class Average</span>
                <TrendingUp className="w-4 h-4 text-[#2997ff]" />
              </div>
              <div className="text-3xl font-semibold text-[#2997ff] font-mono tracking-tight">
                {averageScore}%
              </div>
              <div className="text-[11px] text-[#86868b] mt-1">Across all candidates</div>
            </div>

            <div className="apple-glass-card rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between text-[#86868b] text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                <span>Pass Rate (≥{sessionDef?.passingScore || 70}%)</span>
                <CheckCircle2 className="w-4 h-4 text-[#30d158]" />
              </div>
              <div className="text-3xl font-semibold text-[#30d158] font-mono tracking-tight">
                {passRate}%
              </div>
              <div className="text-[11px] text-[#86868b] mt-1">{passedCount} passed</div>
            </div>

            <div className="apple-glass-card rounded-2xl p-5 border border-white/[0.08]">
              <div className="flex items-center justify-between text-[#86868b] text-[10px] font-semibold uppercase tracking-[0.16em] mb-2">
                <span>Highest Score</span>
                <Award className="w-4 h-4 text-[#ffd60a]" />
              </div>
              <div className="text-3xl font-semibold text-[#ffd60a] font-mono tracking-tight">
                {highestScore.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#86868b] mt-1">Top candidate</div>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="apple-glass rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search candidate by name or USN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="apple-input w-full pl-10 pr-4 py-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-[#86868b] font-medium">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="apple-input px-3 py-2 text-xs font-medium cursor-pointer"
              >
                <option value="score-desc">🏆 Score: High to Low (Winners First)</option>
                <option value="score-asc">Score: Low to High</option>
                <option value="name-asc">Candidate Name: A to Z</option>
                <option value="usn-asc">USN / Roll Number: Ascending</option>
              </select>
            </div>
          </div>

          {/* Submissions Table with Prominent USN Column */}
          <div className="apple-glass rounded-[28px] overflow-hidden shadow-xl border border-white/[0.08]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] text-[#86868b] uppercase font-semibold tracking-[0.14em] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-3.5 px-4">Rank</th>
                    <th className="py-3.5 px-4">Student Full Name</th>
                    <th className="py-3.5 px-4 text-[#2997ff]">USN / Roll Number</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Time Taken</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-medium">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#86868b]">
                        {totalSubmissions === 0
                          ? `No student submissions yet for Game PIN ${sessionPin}. Share the student link to start.`
                          : 'No candidate matches your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => {
                      const mins = Math.floor((sub.timeTakenSeconds || 0) / 60);
                      const secs = (sub.timeTakenSeconds || 0) % 60;
                      const timeStr = `${mins}m ${secs}s`;

                      const isWinner = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

                      return (
                        <tr key={sub.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-white">
                            {isWinner}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {sub.studentName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-[#2997ff]">
                            {sub.studentId || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {sub.score?.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white">
                            {sub.percentage}%
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              sub.passed 
                                ? 'bg-emerald-500/10 text-[#30d158] border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-[#ff453a] border border-rose-500/20'
                            }`}>
                              {sub.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{sub.passed ? 'PASSED' : 'FAILED'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#86868b]">
                            {timeStr}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudent(sub)}
                              className="apple-btn-secondary inline-flex items-center space-x-1 px-3 py-1 text-xs cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-[#2997ff]" />
                              <span>View Answers</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ITEM ANALYSIS HEATMAP */}
      {activeTab === 'item-analysis' && (
        <div className="space-y-6">
          <div className="apple-glass rounded-[32px] p-6 sm:p-8 shadow-xl border border-white/[0.08]">
            <h3 className="text-lg font-semibold text-white mb-1 tracking-tight">
              Question Difficulty & Accuracy Heatmap
            </h3>
            <p className="text-xs text-[#86868b] mb-6 tracking-tight">
              Accuracy rate per question across {totalSubmissions} submissions for Game PIN <strong className="text-white font-mono">{sessionPin}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questionsList.map((q, idx) => {
                let correctCount = 0;
                submissions.forEach((s) => {
                  const b = Array.isArray(s.breakdown) ? s.breakdown.find(item => item.questionId === q.id) : null;
                  if (b && b.isCorrect) correctCount++;
                });

                const pct = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0;

                return (
                  <div key={q.id || idx} className="apple-glass-card rounded-2xl p-5 space-y-2.5 border border-white/[0.08]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-[#2997ff]">Q{idx + 1}</span>
                      <span className="text-[#86868b] text-[11px] font-medium">{q.category || 'General'}</span>
                    </div>
                    <div className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                      {q.question}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-[#86868b]">
                        <span>Accuracy</span>
                        <span className={`font-mono font-medium ${pct >= 70 ? 'text-[#30d158]' : pct >= 40 ? 'text-[#ffd60a]' : 'text-[#ff453a]'}`}>
                          {pct}% ({correctCount}/{totalSubmissions})
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${pct >= 70 ? 'bg-[#30d158]' : pct >= 40 ? 'bg-[#ffd60a]' : 'bg-[#ff453a]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUESTION BANK & KEYS */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questionsList.map((q, idx) => (
            <div key={idx} className="apple-glass-card rounded-2xl p-5 shadow-lg border border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-medium text-[#2997ff]">Question #{idx + 1}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#a1a1a6]">{q.points || 1000} pts</span>
              </div>
              <h4 className="text-sm font-semibold text-white mb-3 tracking-tight">{q.question}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(q.options || []).map((opt, optIdx) => {
                  const isCorrect = q.type === 'single'
                    ? q.correctAnswer === optIdx
                    : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIdx);

                  return (
                    <div 
                      key={optIdx} 
                      className={`p-3 rounded-xl border flex items-center space-x-2 ${
                        isCorrect ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white font-medium' : 'bg-white/[0.02] border-white/[0.06] text-[#86868b]'
                      }`}
                    >
                      <span className="font-mono text-xs opacity-60 w-5">{String.fromCharCode(65 + optIdx)}.</span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect && <Check className="w-3.5 h-3.5 ml-auto text-[#30d158]" />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <p className="text-xs text-[#86868b] mt-3 pt-2.5 border-t border-white/[0.06] leading-relaxed">
                  <strong className="text-white font-medium">Explanation:</strong> {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* GOOGLE SHEETS SYNC MODAL (APPLE MAC DIALOG) */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-glass rounded-[28px] max-w-xl w-full p-8 shadow-2xl relative border border-white/[0.1]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-[#2997ff]">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-tight">Google Sheets Integration</h3>
                  <p className="text-xs text-[#86868b]">Sync candidate USN roster and scores.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSheetsModal(false)}
                className="apple-btn-secondary px-3 py-1 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Option 1: 1-Click Copy */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-white text-xs block font-medium">Option A: Instant Paste into Google Sheets</strong>
                  <span className="text-[11px] text-[#86868b]">Copies clean tab-separated table with Rank, Name, USN, and Score.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyForGoogleSheets}
                  className="apple-btn-primary px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  {copiedSheets ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSheets ? 'Copied Table!' : 'Copy Table'}</span>
                </button>
              </div>

              <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#86868b]">
                <span>Then paste into your sheet with <strong>Cmd+V / Ctrl+V</strong>.</span>
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#2997ff] hover:underline flex items-center space-x-1"
                >
                  <span>Open sheets.new</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Quick Option 2: Live Webhook */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-3">
              <div>
                <strong className="text-white text-xs block font-medium">Option B: Real-Time Webhook to Google Sheets</strong>
                <span className="text-[11px] text-[#86868b]">Automatically push all student entries to your Google Apps Script URL.</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#a1a1a6] mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetsWebhookUrl}
                  onChange={(e) => setSheetsWebhookUrl(e.target.value)}
                  className="apple-input w-full px-3 py-2 text-xs font-mono"
                />
              </div>

              {syncSheetsMsg && (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
                  {syncSheetsMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSyncToGoogleSheets}
                disabled={isSyncingSheets}
                className="apple-btn-secondary w-full py-2.5 px-4 text-xs font-medium cursor-pointer"
              >
                <span>{isSyncingSheets ? 'Syncing...' : 'Sync Submissions to Google Sheet Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
