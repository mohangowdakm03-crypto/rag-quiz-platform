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
  ShieldCheck, 
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Settings,
  HelpCircle,
  Copy,
  Sliders,
  Triangle,
  Diamond,
  Circle,
  Square
} from 'lucide-react';
import { 
  subscribeToTeacherData, 
  fetchTeacherSubmissions, 
  verifyInstructorPasscode,
  getQuizDefinition,
  saveQuizDefinition,
  sha256
} from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions.js';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score-desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'item-analysis' | 'studio'

  // Quiz Studio Customization State
  const [quizConfig, setQuizConfig] = useState({
    id: quizId,
    title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
    description: 'Comprehensive 20-question evaluation on RAG architecture and paradigms.',
    timeLimitMinutes: 30,
    passingScore: 70,
    questions: []
  });
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(0);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Load quiz configuration from cloud database
  useEffect(() => {
    async function loadConfig() {
      const def = await getQuizDefinition(quizId);
      if (def) {
        setQuizConfig({
          id: def.id || quizId,
          title: def.title || 'Custom Quiz',
          description: def.description || '',
          timeLimitMinutes: def.timeLimitMinutes || 30,
          passingScore: def.passingScore || 70,
          questions: def.questions || []
        });
      }
    }
    loadConfig();
  }, [quizId]);

  // Verify Passcode with SHA-256 Hashing
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
      const auth = await verifyInstructorPasscode(quizId, code);
      if (auth.valid) {
        setTeacherPasscode(code);
        setIsAuthenticated(true);
        sessionStorage.setItem('rag_instructor_passcode', code);
        sessionStorage.setItem('rag_instructor_passcode_hash', auth.hash);
        
        // Fetch submissions
        const res = await fetchTeacherSubmissions(quizId, code);
        if (res.success) {
          setSubmissions(res.data);
        }
      } else {
        setPasscodeError('Invalid instructor passcode. Verification failed.');
      }
    } catch (err) {
      setPasscodeError('Authentication check error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setTeacherPasscode('');
    sessionStorage.removeItem('rag_instructor_passcode');
    sessionStorage.removeItem('rag_instructor_passcode_hash');
    setSubmissions([]);
  };

  // Real-time synchronization when authenticated
  useEffect(() => {
    if (!isAuthenticated || !teacherPasscode) return;

    const unsubscribe = subscribeToTeacherData(
      quizId,
      teacherPasscode,
      (newSubmissions) => setSubmissions(newSubmissions)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [quizId, isAuthenticated, teacherPasscode]);

  // Copy student join link
  const handleCopyLink = () => {
    const origin = window.location.origin + window.location.pathname.replace('/teacher', '');
    const shareUrl = `${origin}?quiz=${encodeURIComponent(quizConfig.id)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No student submissions yet to export.');
      return;
    }

    const headers = [
      'Rank',
      'Student Name',
      'Student ID',
      'Earned Points / Score',
      'Total Possible Score',
      'Percentage',
      'Status',
      'Time Taken (Seconds)',
      'Submitted At'
    ];

    quizConfig.questions.forEach((q, idx) => {
      headers.push(`Q${idx + 1}_Earned_Points`);
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
    link.download = `quiz_${quizConfig.id}_grades_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(urlBlob);
  };

  // QUIZ STUDIO HANDLERS
  const handleAddQuestion = () => {
    const newQ = {
      id: quizConfig.questions.length + 1,
      type: 'single',
      category: 'General',
      difficulty: 'Intermediate',
      points: 1000,
      question: 'New Question Title',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 0,
      explanation: 'Explanation for correct answer.'
    };
    setQuizConfig(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
    setEditingQuestionIndex(quizConfig.questions.length);
  };

  const handleDeleteQuestion = (index) => {
    if (quizConfig.questions.length <= 1) {
      alert('A quiz must have at least 1 question.');
      return;
    }
    const updated = quizConfig.questions.filter((_, idx) => idx !== index).map((q, idx) => ({
      ...q,
      id: idx + 1
    }));
    setQuizConfig(prev => ({ ...prev, questions: updated }));
    setEditingQuestionIndex(Math.max(0, index - 1));
  };

  const handleUpdateCurrentQuestion = (field, value) => {
    setQuizConfig(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[editingQuestionIndex] = {
        ...updatedQuestions[editingQuestionIndex],
        [field]: value
      };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleUpdateOption = (optIndex, value) => {
    setQuizConfig(prev => {
      const updatedQuestions = [...prev.questions];
      const currentQ = { ...updatedQuestions[editingQuestionIndex] };
      const updatedOptions = [...(currentQ.options || [])];
      updatedOptions[optIndex] = value;
      currentQ.options = updatedOptions;
      updatedQuestions[editingQuestionIndex] = currentQ;
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleResetToRAGTemplate = () => {
    if (!window.confirm('Reset quiz to the standard 20 RAG technical questions template?')) return;
    setQuizConfig({
      id: 'rag-mastery-2025',
      title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
      description: 'Comprehensive 20-question technical evaluation covering RAG architecture, vector search, chunking, reranking, and paradigms.',
      timeLimitMinutes: 30,
      passingScore: 70,
      questions: RAG_QUIZ_DATA.questions.map(q => ({
        ...q,
        type: 'single',
        points: 1000
      }))
    });
    setEditingQuestionIndex(0);
    setSaveSuccessMsg('Loaded 20 RAG Questions Template. Click "Save & Publish" to update cloud.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleSaveQuizToCloud = async () => {
    setIsSavingQuiz(true);
    setSaveSuccessMsg('');
    try {
      await saveQuizDefinition(quizConfig.id.trim(), quizConfig, teacherPasscode);
      setSaveSuccessMsg(`Quiz "${quizConfig.id}" saved and published to cloud successfully!`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSavingQuiz(false);
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

  // Current editing question
  const currentEditingQ = quizConfig.questions[editingQuestionIndex] || {};

  // IF NOT AUTHENTICATED: RENDER HASHED PASSCODE GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-6 mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white">Instructor Security Portal</h2>
            <p className="text-xs text-slate-400 mt-2">
              Protected live view. Enter your instructor passcode to access real-time submissions, analytics, and the Kahoot Quiz Studio for: <strong className="text-emerald-400 font-mono">{quizId}</strong>
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
                Instructor Passcode (SHA-256 Verified)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter instructor passcode..."
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 font-mono"
                />
                <Key className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Passcode is hashed client-side with SHA-256 before verification.</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying SHA-256 Hash...' : 'Unlock Instructor Console'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onSwitchToStudent}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <span>Switch to Student Quiz View →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED INSTRUCTOR DASHBOARD & KAHOOT STUDIO
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400">Live Supabase Sync Active</span>
            <span>•</span>
            <span>60+ Students Simultaneous</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {quizConfig.title}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Active Quiz ID: <strong className="text-emerald-300 font-mono text-base">{quizConfig.id}</strong> • Total Questions: <strong className="text-white font-mono">{quizConfig.questions.length}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Student Invite Link'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleLock}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
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
          <span>Question Heatmap ({quizConfig.questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('studio')}
          className={`flex items-center space-x-2 py-3 px-5 text-sm font-semibold border-b-2 transition ${
            activeTab === 'studio'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Kahoot Quiz Studio (Customize Everything)</span>
        </button>
      </div>

      {/* TAB 1: LEADERBOARD TABLE */}
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
                {totalSubmissions} <span className="text-xs text-slate-500 font-normal">/ 60 Target</span>
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
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Pass Rate (≥{quizConfig.passingScore}%)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {passRate}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>Top Score</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
                {highestScore.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pts</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">ID / Roll No.</th>
                    <th className="py-3.5 px-4 text-center">Points Earned</th>
                    <th className="py-3.5 px-4 text-center">Percentage</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Time</th>
                    <th className="py-3.5 px-4 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {searchTerm ? 'No matching submissions.' : 'Waiting for students to join and submit the quiz...'}
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
                            {Number(sub.score).toLocaleString()} pts
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
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ITEM ANALYSIS */}
      {activeTab === 'item-analysis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizConfig.questions.map((q, idx) => {
              let correctCount = 0;
              submissions.forEach(sub => {
                if (Array.isArray(sub.breakdown)) {
                  const item = sub.breakdown.find(b => String(b.questionId) === String(q.id));
                  if (item && item.isCorrect) correctCount++;
                }
              });
              const pct = totalSubmissions > 0 ? Math.round((correctCount / totalSubmissions) * 100) : 0;

              return (
                <div key={q.id || idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-teal-400">Question #{idx + 1}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {q.type?.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300">
                          {q.points || 1000} pts
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-white mb-4 line-clamp-3 leading-relaxed">
                      {q.question}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Accuracy</span>
                      <span className={`font-bold ${pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pct}% ({correctCount}/{totalSubmissions})
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
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
      )}

      {/* TAB 3: KAHOOT QUIZ STUDIO (CUSTOMIZE EVERYTHING) */}
      {activeTab === 'studio' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Kahoot Quiz Studio</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Customize questions, marks, question types (Multiple Choice, True/False, Multi-Select, Short Answer), timers, and passcodes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResetToRAGTemplate}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Load 20 RAG Template</span>
              </button>

              <button
                type="button"
                onClick={handleSaveQuizToCloud}
                disabled={isSavingQuiz}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingQuiz ? 'Saving to Cloud...' : 'Save & Publish Quiz'}</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Quiz Global Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm uppercase font-bold text-slate-400 tracking-wider mb-4 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Quiz Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Quiz ID (Join Code)</label>
                <input
                  type="text"
                  value={quizConfig.id}
                  onChange={(e) => setQuizConfig({ ...quizConfig, id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Quiz Title</label>
                <input
                  type="text"
                  value={quizConfig.title}
                  onChange={(e) => setQuizConfig({ ...quizConfig, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Timer (Mins)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={quizConfig.timeLimitMinutes}
                    onChange={(e) => setQuizConfig({ ...quizConfig, timeLimitMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Pass %</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={quizConfig.passingScore}
                    onChange={(e) => setQuizConfig({ ...quizConfig, passingScore: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Question Studio Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Questions List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl max-h-[700px] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Questions ({quizConfig.questions.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-2">
                {quizConfig.questions.map((q, idx) => {
                  const isSelected = idx === editingQuestionIndex;
                  return (
                    <div
                      key={q.id || idx}
                      onClick={() => setEditingQuestionIndex(idx)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                          isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium">{q.question || 'Untitled Question'}</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-400">
                          {q.points || 1000}p
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuestion(idx);
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: Single Question Editor */}
            {currentEditingQ && (
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">
                      Editing Question #{editingQuestionIndex + 1}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5">
                      <label className="text-xs text-slate-400">Points / Marks:</label>
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={currentEditingQ.points || 1000}
                        onChange={(e) => handleUpdateCurrentQuestion('points', Number(e.target.value))}
                        className="w-20 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Question Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Question Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'single', label: 'Single Choice', desc: '4 Options (Kahoot)' },
                      { id: 'boolean', label: 'True / False', desc: '2 Big Cards' },
                      { id: 'multi', label: 'Multi-Select', desc: 'Multiple Answers' },
                      { id: 'text', label: 'Short Answer', desc: 'Typed Match' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          handleUpdateCurrentQuestion('type', t.id);
                          if (t.id === 'boolean') {
                            handleUpdateCurrentQuestion('options', ['True', 'False']);
                            handleUpdateCurrentQuestion('correctAnswer', 0);
                          } else if (t.id === 'multi' && !Array.isArray(currentEditingQ.correctAnswer)) {
                            handleUpdateCurrentQuestion('correctAnswer', [0]);
                          } else if (t.id === 'single' && Array.isArray(currentEditingQ.correctAnswer)) {
                            handleUpdateCurrentQuestion('correctAnswer', 0);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          (currentEditingQ.type || 'single') === t.id
                            ? 'bg-teal-600/20 border-teal-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{t.label}</div>
                        <div className="text-[10px] text-slate-500">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Question Prompt</label>
                  <textarea
                    rows={3}
                    value={currentEditingQ.question || ''}
                    onChange={(e) => handleUpdateCurrentQuestion('question', e.target.value)}
                    placeholder="Enter question prompt..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>

                {/* Options Editor */}
                {(currentEditingQ.type === 'single' || currentEditingQ.type === 'multi') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                      Answer Options & Correct Answer
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(currentEditingQ.options || []).map((opt, optIdx) => {
                        const isCorrect = currentEditingQ.type === 'single'
                          ? currentEditingQ.correctAnswer === optIdx
                          : Array.isArray(currentEditingQ.correctAnswer) && currentEditingQ.correctAnswer.includes(optIdx);

                        return (
                          <div 
                            key={optIdx} 
                            className={`p-3 rounded-xl border flex items-center space-x-2.5 transition ${
                              isCorrect ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (currentEditingQ.type === 'single') {
                                  handleUpdateCurrentQuestion('correctAnswer', optIdx);
                                } else {
                                  const currentArr = Array.isArray(currentEditingQ.correctAnswer) ? currentEditingQ.correctAnswer : [];
                                  const updated = currentArr.includes(optIdx)
                                    ? currentArr.filter(i => i !== optIdx)
                                    : [...currentArr, optIdx];
                                  handleUpdateCurrentQuestion('correctAnswer', updated);
                                }
                              }}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                isCorrect ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'
                              }`}
                              title={isCorrect ? 'Correct Answer' : 'Mark as Correct'}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className="flex-1 bg-transparent text-white text-xs focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* True / False Option */}
                {currentEditingQ.type === 'boolean' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Correct Answer</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentQuestion('correctAnswer', 0)}
                        className={`p-4 rounded-xl border text-center font-bold text-sm transition ${
                          currentEditingQ.correctAnswer === 0
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        True (Correct)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentQuestion('correctAnswer', 1)}
                        className={`p-4 rounded-xl border text-center font-bold text-sm transition ${
                          currentEditingQ.correctAnswer === 1
                            ? 'bg-red-600 border-red-400 text-white shadow-lg'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        False (Correct)
                      </button>
                    </div>
                  </div>
                )}

                {/* Short Answer Target */}
                {currentEditingQ.type === 'text' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                      Accepted Correct Text Answer (Case-Insensitive)
                    </label>
                    <input
                      type="text"
                      value={currentEditingQ.correctAnswer || ''}
                      onChange={(e) => handleUpdateCurrentQuestion('correctAnswer', e.target.value)}
                      placeholder="e.g. Retrieval Augmented Generation"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono"
                    />
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Explanation</label>
                  <textarea
                    rows={2}
                    value={currentEditingQ.explanation || ''}
                    onChange={(e) => handleUpdateCurrentQuestion('explanation', e.target.value)}
                    placeholder="Enter explanation shown to candidates after exam completion..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>
              </div>
            )}
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
