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
  FileText
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

  // CSV Export for this session
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

    const questions = sessionDef?.questions || [];
    questions.forEach((q, idx) => {
      headers.push(`Q${idx + 1}_Points`);
    });

    const rows = submissions.map((sub, index) => {
      const dateStr = sub.submittedAt 
        ? new Date(sub.submittedAt).toLocaleString() 
        : 'Recent';

      const row = [
        index + 1,
        `"${(sub.studentName || '').replace(/"/g, '""')}"`,
        `"${(sub.studentId || '').replace(/"/g, '""')}"`,
        sub.score,
        sub.totalQuestions,
        `${sub.percentage}%`,
        sub.passed ? 'PASSED' : 'FAILED',
        sub.timeTakenSeconds || 0,
        `"${dateStr}"`
      ];

      if (Array.isArray(sub.breakdown)) {
        sub.breakdown.forEach((b) => {
          row.push(b.earnedPoints !== undefined ? b.earnedPoints : (b.isCorrect ? 1 : 0));
        });
      }

      return row.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = `session_${sessionPin}_grades_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(urlBlob);
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

  const filteredSubmissions = submissions
    .filter((s) => {
      const q = searchTerm.toLowerCase();
      return (
        (s.studentName || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score-desc') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'score-asc') return (a.score || 0) - (b.score || 0);
      if (sortBy === 'name-asc') return (a.studentName || '').localeCompare(b.studentName || '');
      return 0;
    });

  const isAssessment = sessionDef?.gameMode === 'assessment';
  const questionsList = sessionDef?.questions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Navigation */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Conducted Sessions</span>
        </button>
      </div>

      {/* Session Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-black">
              <span>🎯 GAME PIN: {sessionPin}</span>
            </span>

            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isAssessment 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' 
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            }`}>
              {isAssessment ? <Zap className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              <span>{isAssessment ? `Assessment (${sessionDef?.perQuestionSeconds || 30}s/Q)` : `Classical (${sessionDef?.timeLimitMinutes || 30}m)`}</span>
            </span>

            <span className="inline-flex items-center space-x-1 text-xs text-slate-400 font-medium">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Live Cloud Sync</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {sessionDef?.title || 'Quiz Session Analytics'}
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm">
            {sessionDef?.description || 'All student responses for this session are isolated and recorded below.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Student Invite Link'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onLock}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <Lock className="w-4 h-4" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'leaderboard'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Submissions ({totalSubmissions})</span>
        </button>

        <button
          onClick={() => setActiveTab('item-analysis')}
          className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'item-analysis'
              ? 'border-teal-500 text-teal-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Question Heatmap ({questionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'questions'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Question Bank & Answer Keys</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARD & SUBMISSIONS */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Submissions</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                {totalSubmissions}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                PIN: {sessionPin}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Class Average</span>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-300">
                {averageScore}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Across all questions</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Pass Rate (≥{sessionDef?.passingScore || 70}%)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {passRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{passedCount} passed</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Highest Score</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                {highestScore.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Top candidate</div>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search candidate name or USN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400 font-semibold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none font-medium cursor-pointer"
              >
                <option value="score-desc">Score: High to Low</option>
                <option value="score-asc">Score: Low to High</option>
                <option value="name-asc">Candidate Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Submissions Table with Compulsory USN column */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Rank</th>
                    <th className="py-3.5 px-4">Student Full Name</th>
                    <th className="py-3.5 px-4 text-teal-400 font-extrabold">USN / Roll Number</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Time Taken</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {totalSubmissions === 0
                          ? `No student submissions yet for Game PIN ${sessionPin}. Share the invite link to start.`
                          : 'No candidate matches your search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => {
                      const mins = Math.floor((sub.timeTakenSeconds || 0) / 60);
                      const secs = (sub.timeTakenSeconds || 0) % 60;
                      const timeStr = `${mins}m ${secs}s`;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {sub.studentName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-300">
                            {sub.studentId || 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {sub.score?.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {sub.percentage}%
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              sub.passed 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {sub.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{sub.passed ? 'PASSED' : 'FAILED'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {timeStr}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudent(sub)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-400" />
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Question Difficulty & Accuracy Heatmap
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Accuracy rate per question across {totalSubmissions} submissions for Game PIN <strong className="text-emerald-400 font-mono">{sessionPin}</strong>.
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
                  <div key={q.id || idx} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-emerald-400">Q{idx + 1}</span>
                      <span className="text-slate-400">{q.category || 'General'}</span>
                    </div>
                    <div className="text-xs text-white font-medium line-clamp-2">
                      {q.question}
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Accuracy:</span>
                        <span className={`font-bold ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {pct}% ({correctCount}/{totalSubmissions})
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div 
                          className={`h-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
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
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-emerald-400">Question #{idx + 1}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-400">{q.points || 1000} pts</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-3">{q.question}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {(q.options || []).map((opt, optIdx) => {
                  const isCorrect = q.type === 'single'
                    ? q.correctAnswer === optIdx
                    : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(optIdx);

                  return (
                    <div 
                      key={optIdx} 
                      className={`p-2.5 rounded-xl border flex items-center space-x-2 ${
                        isCorrect ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + optIdx)}.</span>
                      <span>{opt}</span>
                      {isCorrect && <Check className="w-3.5 h-3.5 ml-auto text-emerald-400" />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                  <strong className="text-slate-300">Explanation:</strong> {q.explanation}
                </p>
              )}
            </div>
          ))}
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
