import React, { useState, useEffect } from 'react';
import { 
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
  RefreshCw, 
  BarChart3, 
  Eye, 
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import { subscribeToSubmissions, subscribeToParticipants } from '../firebase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions';
import StudentDetailModal from './StudentDetailModal';

export default function TeacherDashboard({ quizId, onSwitchToStudent }) {
  const [submissions, setSubmissions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score-desc'); // 'score-desc', 'score-asc', 'time-desc', 'name-asc'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard', 'item-analysis'

  // Real-time Firestore subscription
  useEffect(() => {
    const unsubSubmissions = subscribeToSubmissions(quizId, (data) => {
      setSubmissions(data);
    });

    const unsubParticipants = subscribeToParticipants(quizId, (data) => {
      setParticipants(data);
    });

    return () => {
      if (unsubSubmissions) unsubSubmissions();
      if (unsubParticipants) unsubParticipants();
    };
  }, [quizId]);

  // Copy student join link
  const handleCopyLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const shareUrl = `${origin}?quiz=${encodeURIComponent(quizId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No submissions yet to export.');
      return;
    }

    const headers = [
      'Rank',
      'Student Name',
      'Student ID',
      'Score',
      'Total Questions',
      'Percentage',
      'Status',
      'Time Taken (Seconds)',
      'Submitted At'
    ];

    // Add Q1 to Q20 headers
    for (let i = 1; i <= RAG_QUIZ_DATA.questions.length; i++) {
      headers.push(`Q${i}_Correct`);
    }

    const rows = submissions.map((sub, index) => {
      const dateStr = sub.submittedAt?.toDate 
        ? sub.submittedAt.toDate().toLocaleString() 
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

      // Question breakdown
      if (Array.isArray(sub.breakdown)) {
        sub.breakdown.forEach((b) => {
          row.push(b.isCorrect ? '1' : '0');
        });
      }

      return row.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rag_quiz_${quizId}_results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Computed metrics
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
      if (sortBy === 'score-desc') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'score-asc') return (a.score || 0) - (b.score || 0);
      if (sortBy === 'name-asc') return (a.studentName || '').localeCompare(b.studentName || '');
      return 0;
    });

  // Question level accuracy analysis
  const itemAnalysis = RAG_QUIZ_DATA.questions.map((q) => {
    if (totalSubmissions === 0) return { ...q, correctPct: 0, totalAttempts: 0 };
    
    let correctCount = 0;
    submissions.forEach((sub) => {
      if (Array.isArray(sub.breakdown)) {
        const item = sub.breakdown.find((b) => b.questionId === q.id);
        if (item && item.isCorrect) correctCount += 1;
      }
    });

    const pct = Math.round((correctCount / totalSubmissions) * 100);
    return {
      ...q,
      correctCount,
      totalAttempts: totalSubmissions,
      correctPct: pct
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner: Quiz ID & Sharing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Live Cloud Session</span>
            <span>•</span>
            <span>Target: 60 Students Concurrent</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Instructor Control & Live Analytics
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Quiz ID: <strong className="text-blue-300 font-mono text-base">{quizId}</strong>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Student Invite Link'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onSwitchToStudent}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <span>Student View →</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Submissions</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalSubmissions} <span className="text-xs text-slate-500 font-normal">/ 60 Goal</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {participants.length} students currently in room
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Class Average</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300">
            {averageScore}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across all 20 questions
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Pass Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {passedCount} passed (≥70%)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Highest Score</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
            {highestScore} <span className="text-xs text-slate-500 font-normal">/ 20</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {highestScore > 0 ? `${Math.round((highestScore / 20) * 100)}% Max Score` : 'No data'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Database Status</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Firestore Live</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Concurrent writes enabled
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Submissions ({totalSubmissions})</span>
        </button>

        <button
          onClick={() => setActiveTab('item-analysis')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'item-analysis'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Question Difficulty Heatmap (Item Analysis)</span>
        </button>
      </div>

      {/* TAB 1: Student Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
              <span>Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="score-desc">Score: High to Low</option>
                <option value="score-asc">Score: Low to High</option>
                <option value="name-asc">Candidate Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Score</th>
                  <th className="py-3.5 px-4">Percentage</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Time Taken</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((sub, idx) => {
                    const mins = Math.floor((sub.timeTakenSeconds || 0) / 60);
                    const secs = (sub.timeTakenSeconds || 0) % 60;

                    return (
                      <tr 
                        key={sub.id || idx} 
                        className="hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-4 px-4 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-4 px-4 font-bold text-white">
                          {sub.studentName}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400">
                          {sub.studentId || '—'}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-slate-200">
                          {sub.score} / {sub.totalQuestions || 20}
                        </td>
                        <td className="py-4 px-4 font-bold text-sm">
                          <span className={sub.passed ? 'text-emerald-400' : 'text-rose-400'}>
                            {sub.percentage}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.passed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {sub.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-400">
                          {mins}m {secs}s
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(sub)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition text-[11px] font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Answers</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      {totalSubmissions === 0 ? (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users className="w-8 h-8 text-slate-600 animate-pulse" />
                          <p className="text-sm font-semibold text-slate-400">Waiting for students to join and submit...</p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            Share the Quiz ID <span className="font-mono text-blue-400">{quizId}</span> or copy the invite link above.
                          </p>
                        </div>
                      ) : (
                        'No students found matching your search query.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Item Analysis / Question Difficulty Heatmap */}
      {activeTab === 'item-analysis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Classroom Question Performance Heatmap</h2>
            <p className="text-xs text-slate-400">
              Identify which RAG topics had the highest error rate to focus post-quiz lecture review.
            </p>
          </div>

          <div className="space-y-4">
            {itemAnalysis.map((item) => {
              const accuracy = item.correctPct;
              const isDifficult = accuracy < 60;
              const isModerate = accuracy >= 60 && accuracy < 80;

              return (
                <div 
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono font-bold text-blue-400 text-xs">
                        Q{item.id}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white line-clamp-2">
                      {item.question}
                    </p>
                  </div>

                  {/* Accuracy Bar */}
                  <div className="w-full sm:w-56 shrink-0">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400">Class Accuracy:</span>
                      <span className={
                        isDifficult 
                          ? 'text-rose-400' 
                          : isModerate 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                      }>
                        {accuracy}% ({item.correctCount}/{item.totalAttempts})
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDifficult 
                            ? 'bg-rose-500' 
                            : isModerate 
                            ? 'bg-amber-400' 
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Answers Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
