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
  Square,
  Zap,
  Timer,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { 
  subscribeToTeacherData, 
  fetchTeacherSubmissions, 
  verifyInstructorPasscode,
  getQuizDefinition,
  saveQuizDefinition,
  publishQuizSession,
  fetchTeacherSessions,
  deleteTeacherSession,
  sha256
} from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions.js';
import StudentDetailModal from './StudentDetailModal';

export default function TeacherDashboard({ 
  quizId: initialQuizId, 
  onSwitchToStudent,
  teacherPasscode,
  setTeacherPasscode,
  isAuthenticated,
  setIsAuthenticated
}) {
  const [enteredPasscode, setEnteredPasscode] = useState(teacherPasscode || '');
  const [passcodeError, setPasscodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Active session PIN state
  const [activeSessionPin, setActiveSessionPin] = useState(initialQuizId || 'rag-mastery-2025');
  const [availableSessions, setAvailableSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score-desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' | 'item-analysis' | 'studio'

  // Quiz Studio Customization State
  const [quizConfig, setQuizConfig] = useState({
    id: activeSessionPin,
    title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
    description: 'Comprehensive 20-question evaluation on RAG architecture and paradigms.',
    timeLimitMinutes: 30,
    passingScore: 70,
    gameMode: 'classic', // 'classic' | 'assessment'
    perQuestionSeconds: 30,
    questions: []
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState(0);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [isPublishingSession, setIsPublishingSession] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Published Session Success Modal state
  const [publishedSessionModal, setPublishedSessionModal] = useState(null); // { sessionPin, studentLink, gameMode, perQuestionSeconds, title }

  // Load available sessions list
  const loadSessionsList = async () => {
    setIsLoadingSessions(true);
    try {
      const list = await fetchTeacherSessions();
      setAvailableSessions(list);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSessionsList();
    }
  }, [isAuthenticated]);

  // Load quiz configuration when activeSessionPin changes
  useEffect(() => {
    async function loadConfig() {
      const def = await getQuizDefinition(activeSessionPin);
      if (def) {
        setQuizConfig({
          id: def.id || activeSessionPin,
          title: def.title || 'Custom Quiz',
          description: def.description || '',
          timeLimitMinutes: def.timeLimitMinutes || 30,
          passingScore: def.passingScore || 70,
          gameMode: def.gameMode || 'classic',
          perQuestionSeconds: def.perQuestionSeconds || 30,
          questions: def.questions || []
        });
      }
    }
    if (isAuthenticated) {
      loadConfig();
    }
  }, [activeSessionPin, isAuthenticated]);

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
      const auth = await verifyInstructorPasscode(activeSessionPin, code);
      if (auth.valid) {
        setTeacherPasscode(code);
        setIsAuthenticated(true);
        sessionStorage.setItem('rag_instructor_passcode', code);
        sessionStorage.setItem('rag_instructor_passcode_hash', auth.hash);
        
        // Fetch submissions for this session
        const res = await fetchTeacherSubmissions(activeSessionPin, code);
        if (res.success) {
          setSubmissions(res.data);
        }
        loadSessionsList();
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

  // Real-time synchronization for activeSessionPin
  useEffect(() => {
    if (!isAuthenticated || !teacherPasscode || !activeSessionPin) return;

    const unsubscribe = subscribeToTeacherData(
      activeSessionPin,
      teacherPasscode,
      (newSubmissions) => setSubmissions(newSubmissions)
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeSessionPin, isAuthenticated, teacherPasscode]);

  // Switch Active Session
  const handleSwitchSession = async (newSessionPin) => {
    setActiveSessionPin(newSessionPin);
    setSubmissions([]);
    const res = await fetchTeacherSubmissions(newSessionPin, teacherPasscode);
    if (res.success) {
      setSubmissions(res.data);
    }
  };

  // Delete an old session
  const handleDeleteSession = async (sessionPinToDelete) => {
    if (sessionPinToDelete === 'rag-mastery-2025') {
      alert('The default RAG master template session cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete session "${sessionPinToDelete}" and all its student submissions?`)) {
      return;
    }

    try {
      await deleteTeacherSession(sessionPinToDelete, teacherPasscode);
      await loadSessionsList();
      if (activeSessionPin === sessionPinToDelete) {
        handleSwitchSession('rag-mastery-2025');
      }
      alert(`Session ${sessionPinToDelete} deleted successfully.`);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Student link generator for active session
  const getStudentInviteLink = (pin = activeSessionPin) => {
    const origin = window.location.origin;
    return `${origin}/?pin=${encodeURIComponent(pin)}`;
  };

  // Copy student join link
  const handleCopyLink = (pin = activeSessionPin) => {
    const shareUrl = getStudentInviteLink(pin);
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Copy PIN only
  const handleCopyPin = (pin = activeSessionPin) => {
    navigator.clipboard.writeText(pin).then(() => {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    });
  };

  // CSV Export for activeSessionPin
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No student submissions yet for this session to export.');
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
    link.download = `session_${activeSessionPin}_grades_${new Date().toISOString().slice(0, 10)}.csv`;
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
    if (!window.confirm('Reset quiz questions to the standard 20 RAG technical questions template?')) return;
    setQuizConfig(prev => ({
      ...prev,
      title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
      description: 'Comprehensive 20-question technical evaluation covering RAG architecture, vector search, chunking, reranking, and paradigms.',
      timeLimitMinutes: 30,
      passingScore: 70,
      gameMode: prev.gameMode || 'classic',
      perQuestionSeconds: prev.perQuestionSeconds || 30,
      questions: RAG_QUIZ_DATA.questions.map(q => ({
        ...q,
        type: 'single',
        points: 1000
      }))
    }));
    setEditingQuestionIndex(0);
    setSaveSuccessMsg('Loaded 20 RAG Questions Template.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Save changes to current session
  const handleSaveQuizToCloud = async () => {
    setIsSavingQuiz(true);
    setSaveSuccessMsg('');
    try {
      await saveQuizDefinition(activeSessionPin, quizConfig, teacherPasscode);
      setSaveSuccessMsg(`Session "${activeSessionPin}" updated in cloud successfully!`);
      await loadSessionsList();
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // PUBLISH BRAND NEW ISOLATED SESSION
  const handlePublishNewSession = async () => {
    setIsPublishingSession(true);
    setSaveSuccessMsg('');
    try {
      const res = await publishQuizSession(quizConfig, teacherPasscode, {
        gameMode: quizConfig.gameMode || 'classic',
        perQuestionSeconds: quizConfig.perQuestionSeconds || 30
      });

      const newPin = res.sessionPin;
      const origin = window.location.origin;
      const directLink = `${origin}/?pin=${newPin}`;

      // Refresh sessions list
      await loadSessionsList();

      // Switch active view to new session
      setActiveSessionPin(newPin);
      setSubmissions([]);

      // Open launch success modal
      setPublishedSessionModal({
        sessionPin: newPin,
        studentLink: directLink,
        gameMode: quizConfig.gameMode || 'classic',
        perQuestionSeconds: quizConfig.perQuestionSeconds || 30,
        title: quizConfig.title,
        totalQuestions: quizConfig.questions.length
      });
    } catch (err) {
      alert(`Publish session error: ${err.message}`);
    } finally {
      setIsPublishingSession(false);
    }
  };

  // Metrics for active session
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
              Protected session monitor. Enter your instructor passcode to access live analytics and the Quiz Studio.
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

  // AUTHENTICATED INSTRUCTOR DASHBOARD
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner with Session Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live Cloud Sync</span>
              <span>•</span>
              <span>60+ Students</span>
            </div>

            {/* Mode Indicator Badge */}
            {quizConfig.gameMode === 'assessment' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Zap className="w-3 h-3" />
                <span>Assessment Mode ({quizConfig.perQuestionSeconds || 30}s / Q)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span>Classical Mode ({quizConfig.timeLimitMinutes || 30} mins)</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {quizConfig.title}
          </h1>

          {/* Session Switcher Selector */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Session PIN:</span>
              <select
                value={activeSessionPin}
                onChange={(e) => handleSwitchSession(e.target.value)}
                className="bg-transparent text-emerald-300 font-mono font-bold text-sm focus:outline-none cursor-pointer"
              >
                {availableSessions.map((s) => (
                  <option key={s.sessionPin} value={s.sessionPin} className="bg-slate-900 text-white font-mono">
                    {s.sessionPin} — {s.title.slice(0, 24)} ({s.gameMode || 'classic'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className="inline-flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Session</span>
            </button>

            {activeSessionPin !== 'rag-mastery-2025' && (
              <button
                type="button"
                onClick={() => handleDeleteSession(activeSessionPin)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Delete this session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleCopyLink(activeSessionPin)}
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
            <span>Lock</span>
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
          <span>Kahoot Quiz Studio & Launch Session</span>
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
              <div className="text-[11px] text-slate-400 mt-1">
                Session: <span className="font-mono text-emerald-300 font-bold">{activeSessionPin}</span>
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
                <span>Pass Rate (≥{quizConfig.passingScore}%)</span>
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

          {/* Search & Filter Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search candidate name or ID..."
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
                <option value="name-asc">Student Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        {totalSubmissions === 0
                          ? `No student submissions yet for Session PIN ${activeSessionPin}. Share the student invite link to start.`
                          : 'No submissions match your search query.'}
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
                          <td className="py-3.5 px-4 font-mono text-slate-400">
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
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-semibold"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Question Difficulty & Accuracy Heatmap
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Item response accuracy across {totalSubmissions} student submissions for Session <strong className="text-emerald-300 font-mono">{activeSessionPin}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizConfig.questions.map((q, idx) => {
                const totalAttempts = submissions.length;
                let correctCount = 0;
                submissions.forEach((s) => {
                  const b = Array.isArray(s.breakdown) ? s.breakdown.find(item => item.questionId === q.id) : null;
                  if (b && b.isCorrect) correctCount++;
                });

                const pct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

                return (
                  <div key={q.id || idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
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
                          {pct}% ({correctCount}/{totalAttempts})
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

      {/* TAB 3: KAHOOT QUIZ STUDIO & LAUNCH NEW SESSION */}
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
                Customize questions, marks, answer modes (Classical vs Assessment), timers, and publish new game sessions.
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
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-teal-400" />
                <span>{isSavingQuiz ? 'Saving...' : 'Update Current Session'}</span>
              </button>

              <button
                type="button"
                onClick={handlePublishNewSession}
                disabled={isPublishingSession}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isPublishingSession ? 'Generating Session...' : '🚀 Publish & Launch New Session'}</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* GAME MODE SELECTION CARDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm uppercase font-bold text-slate-400 tracking-wider mb-4 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Quiz Answering Mode</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Classical Mode */}
              <div 
                onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'classic' })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  (quizConfig.gameMode || 'classic') === 'classic'
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-xl shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        🎮
                      </span>
                      <h4 className="font-extrabold text-base text-white">Classical Mode</h4>
                    </div>
                    {(quizConfig.gameMode || 'classic') === 'classic' && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Displays question with options in 4 distinct Kahoot color boxes (🔺 Red Triangle, 🔷 Blue Diamond, 🟡 Yellow Circle, 🟩 Green Square). Overall exam timer with free navigation & question review before final submission.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Overall Exam Timer:</label>
                  <select
                    value={quizConfig.timeLimitMinutes || 30}
                    onChange={(e) => setQuizConfig({ ...quizConfig, timeLimitMinutes: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  >
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Card 2: Assessment Mode */}
              <div 
                onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'assessment' })}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  quizConfig.gameMode === 'assessment'
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-xl shadow-amber-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        ⚡
                      </span>
                      <h4 className="font-extrabold text-base text-white">Assessment Mode</h4>
                    </div>
                    {quizConfig.gameMode === 'assessment' && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold">Active</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Fast-paced timed countdown per question! Students answer within the countdown (e.g. 20s/30s). Answers are locked and saved instantly, automatically advancing to the next question with no going backwards.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Seconds Per Question:</label>
                  <select
                    value={quizConfig.perQuestionSeconds || 30}
                    onChange={(e) => setQuizConfig({ ...quizConfig, perQuestionSeconds: Number(e.target.value) })}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold"
                  >
                    <option value={10}>10 Seconds (Speed)</option>
                    <option value={15}>15 Seconds</option>
                    <option value={20}>20 Seconds (Fast)</option>
                    <option value={30}>30 Seconds (Kahoot Standard)</option>
                    <option value={45}>45 Seconds</option>
                    <option value={60}>60 Seconds (1 Min)</option>
                    <option value={90}>90 Seconds</option>
                    <option value={120}>120 Seconds (2 Min)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quiz Global Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm uppercase font-bold text-slate-400 tracking-wider mb-4 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>General Session Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Quiz Title</label>
                <input
                  type="text"
                  value={quizConfig.title}
                  onChange={(e) => setQuizConfig({ ...quizConfig, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Description</label>
                <input
                  type="text"
                  value={quizConfig.description || ''}
                  onChange={(e) => setQuizConfig({ ...quizConfig, description: e.target.value })}
                  placeholder=""
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Passing Score %</label>
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

          {/* Questions Grid & Editor */}
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
                    placeholder=""
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
                      placeholder=""
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
                    placeholder=""
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESSION PUBLISHED SUCCESS MODAL */}
      {publishedSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 mb-6 mx-auto shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-extrabold text-white text-center mb-1">
              Quiz Session Launched! 🎉
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6">
              Your session is live in Supabase. Share this Game PIN or direct link with students.
            </p>

            {/* BIG KAHOOT-STYLE PIN DISPLAY */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 text-center mb-6 shadow-inner relative overflow-hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                GAME / SESSION PIN
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wider">
                {publishedSessionModal.sessionPin}
              </div>
              <div className="mt-3 flex items-center justify-center space-x-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  Mode: {publishedSessionModal.gameMode === 'assessment' ? `⚡ Assessment (${publishedSessionModal.perQuestionSeconds}s/Q)` : '🎮 Classical'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {publishedSessionModal.totalQuestions} Questions
                </span>
              </div>
            </div>

            {/* Direct Student Link Box */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Direct Student Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={publishedSessionModal.studentLink}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(publishedSessionModal.sessionPin)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  window.open(publishedSessionModal.studentLink, '_blank');
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test Student View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPublishedSessionModal(null);
                  setActiveTab('leaderboard');
                }}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
              >
                <span>Live Analytics →</span>
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
