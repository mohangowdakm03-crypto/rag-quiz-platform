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
  BarChart3, 
  Eye, 
  Radio, 
  Lock, 
  Key, 
  ArrowLeft,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { subscribeToTeacherData, fetchTeacherSubmissions } from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions';
import StudentDetailModal from './StudentDetailModal';

export default function TeacherDashboard({ 
  quizId, 
  onSwitchToStudent,
  teacherPasscode,
  setTeacherPasscode,
  isAuthenticated,
  setIsAuthenticated
}) {
  const [enteredPasscode, setEnteredPasscode] = useState(teacherPasscode || '');
  const [passcodeError, setPasscodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score-desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard');

  // Verify Passcode
  const handleVerifyPasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    setIsVerifying(true);

    const code = enteredPasscode.trim();
    if (!code) {
      setPasscodeError('Please enter the instructor passcode.');
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetchTeacherSubmissions(quizId, code);
      if (res.success) {
        setTeacherPasscode(code);
        setIsAuthenticated(true);
        sessionStorage.setItem('rag_instructor_passcode', code);
        setSubmissions(res.data);
      } else {
        setPasscodeError(res.error || 'Invalid instructor passcode. Please try again.');
      }
    } catch (err) {
      setPasscodeError('Failed to verify passcode with cloud database.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setTeacherPasscode('');
    sessionStorage.removeItem('rag_instructor_passcode');
    setSubmissions([]);
    setParticipants([]);
  };

  // Real-time synchronization when authenticated
  useEffect(() => {
    if (!isAuthenticated || !teacherPasscode) return;

    const unsubscribe = subscribeToTeacherData(
      quizId,
      teacherPasscode,
      (newSubmissions) => setSubmissions(newSubmissions),
      (newParticipants) => setParticipants(newParticipants)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [quizId, isAuthenticated, teacherPasscode]);

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

    for (let i = 1; i <= RAG_QUIZ_DATA.questions.length; i++) {
      headers.push(`Q${i}_Correct`);
    }

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
          row.push(b.isCorrect ? '1' : '0');
        });
      }

      return row.join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const urlBlob = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlBlob;
    link.download = `rag_quiz_${quizId}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(urlBlob);
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

  // IF NOT AUTHENTICATED: RENDER SECURITY GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white">Instructor Portal</h2>
            <p className="text-xs text-slate-400 mt-2">
              Protected live view. Enter your instructor passcode to access real-time submissions and analytics for Quiz: <strong className="text-emerald-400 font-mono">{quizId}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            {passcodeError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Instructor Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter passcode..."
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Default: <span className="font-mono text-teal-400">rag-instructor-2025</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Unlock Dashboard'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onSwitchToStudent}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Student Join Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED INSTRUCTOR DASHBOARD
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner: Quiz ID & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Live Cloud Sync Active</span>
            <span>•</span>
            <span>60+ Students Simultaneous</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Instructor Control & Live Analytics
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Active Quiz ID: <strong className="text-emerald-300 font-mono text-base">{quizId}</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Copied!' : 'Copy Student Invite Link'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Grade Sheet (CSV)</span>
          </button>

          <button
            onClick={handleLock}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <Lock className="w-4 h-4" />
            <span>Lock</span>
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
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalSubmissions} <span className="text-xs text-slate-500 font-normal">/ 60 Target</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {participants.length} joined session
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
          <div className="text-[11px] text-slate-400 mt-1">
            Across 20 technical questions
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
            {highestScore > 0 ? `${Math.round((highestScore / 20) * 100)}% Top Score` : 'No submissions'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Avg Completion Time</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">
            {totalSubmissions > 0
              ? `${Math.round(submissions.reduce((acc, curr) => acc + (curr.timeTakenSeconds || 0), 0) / totalSubmissions / 60)}m`
              : '0m'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            30 minute time limit
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 mb-6">
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
          <span>Question Item Analysis (20 Questions)</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARD TABLE */}
      {activeTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <label className="text-xs text-slate-400">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
              >
                <option value="score-desc">Score: High to Low</option>
                <option value="score-asc">Score: Low to High</option>
                <option value="name-asc">Student Name: A-Z</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">ID / Roll No.</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Time</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      {searchTerm ? 'No students match your search criteria.' : 'Waiting for students to complete and submit the quiz...'}
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub, index) => (
                    <tr key={sub.id || index} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-500 font-bold">{index + 1}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{sub.studentName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{sub.studentId || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 font-mono text-emerald-400">
                          {sub.score} / {sub.totalQuestions}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold font-mono">
                        <span className={sub.passed ? 'text-emerald-400' : 'text-red-400'}>
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sub.passed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                        {Math.floor((sub.timeTakenSeconds || 0) / 60)}m {((sub.timeTakenSeconds || 0) % 60)}s
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudent(sub)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px] font-medium"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>View Review</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ITEM ANALYSIS (QUESTION BY QUESTION ACCURACY) */}
      {activeTab === 'item-analysis' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
            <h3 className="text-base font-bold text-white mb-1">RAG Technical Item Difficulty & Accuracy</h3>
            <p className="text-xs text-slate-400">
              Live analysis of student accuracy per question. Questions with low pass rates indicate topics where students need further review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itemAnalysis.map((item) => (
              <div 
                key={item.id} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">Question #{item.id}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        item.difficulty === 'Advanced' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {item.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-white mb-4 line-clamp-3 leading-relaxed">
                    {item.question}
                  </p>
                </div>

                <div>
                  {/* Accuracy Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Accuracy</span>
                      <span className={`font-bold ${
                        item.correctPct >= 70 ? 'text-emerald-400' : item.correctPct >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {item.correctPct}% ({item.correctCount || 0}/{item.totalAttempts || 0})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          item.correctPct >= 70 ? 'bg-emerald-500' : item.correctPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.correctPct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mt-2">
                    <strong className="text-emerald-300">Correct: </strong> 
                    {item.options[item.correctAnswer]}
                  </div>
                </div>
              </div>
            ))}
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
