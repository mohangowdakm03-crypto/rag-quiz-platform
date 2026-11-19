import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Settings, 
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Award
} from 'lucide-react';
import { publishQuizSession, saveQuizDefinition } from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions';

export default function QuizCreator({ 
  onBackToHub, 
  onSessionCreated, 
  onSessionUpdated, 
  teacherPasscode,
  creatorMode = 'create', // 'create' | 'edit' | 'duplicate'
  editingSessionPin = null,
  initialQuizConfig = null
}) {
  const [quizConfig, setQuizConfig] = useState(() => {
    if (initialQuizConfig) {
      return {
        title: initialQuizConfig.title || '',
        description: initialQuizConfig.description || '',
        timeLimitMinutes: initialQuizConfig.timeLimitMinutes || 30,
        passingScore: initialQuizConfig.passingScore || 70,
        gameMode: initialQuizConfig.gameMode || 'classic',
        perQuestionSeconds: initialQuizConfig.perQuestionSeconds || 30,
        showScore: initialQuizConfig.showScore === true,
        showItemAnalysis: initialQuizConfig.showItemAnalysis === true,
        allowRetake: initialQuizConfig.allowRetake === true,
        showRank: initialQuizConfig.showRank === true,
        questions: (initialQuizConfig.questions && initialQuizConfig.questions.length > 0)
          ? initialQuizConfig.questions.map((q, idx) => ({
              ...q,
              id: idx + 1,
              type: q.type || 'single',
              points: q.points || 1000,
              question: q.question || '',
              options: q.options || ['', '', '', ''],
              correctAnswer: q.correctAnswer ?? 0,
              explanation: q.explanation || ''
            }))
          : [
              {
                id: 1,
                type: 'single',
                category: 'General',
                difficulty: 'Intermediate',
                points: 1000,
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 0,
                explanation: ''
              }
            ]
      };
    }
    return {
      title: '',
      description: '',
      timeLimitMinutes: 30,
      passingScore: 70,
      gameMode: 'classic',
      perQuestionSeconds: 30,
      showScore: false,
      showItemAnalysis: false,
      allowRetake: false,
      showRank: false,
      questions: [
        {
          id: 1,
          type: 'single',
          category: 'General',
          difficulty: 'Intermediate',
          points: 1000,
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: ''
        }
      ]
    };
  });

  const [editingIndex, setEditingIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [launchModal, setLaunchModal] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load 20 RAG Template
  const handleLoadRAGTemplate = () => {
    setQuizConfig(prev => ({
      ...prev,
      title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
      description: 'Comprehensive 20-question evaluation covering vector search, chunking, reranking, and paradigms.',
      timeLimitMinutes: 30,
      passingScore: 70,
      questions: RAG_QUIZ_DATA.questions.map(q => ({
        ...q,
        type: q.type || 'single',
        points: q.points || 1000
      }))
    }));
    setEditingIndex(0);
  };

  // Start with clean blank question
  const handleStartBlank = () => {
    setQuizConfig({
      title: '',
      description: '',
      timeLimitMinutes: 30,
      passingScore: 70,
      gameMode: 'classic',
      perQuestionSeconds: 30,
      showScore: false,
      showItemAnalysis: false,
      allowRetake: false,
      showRank: false,
      questions: [
        {
          id: 1,
          type: 'single',
          category: 'General',
          difficulty: 'Intermediate',
          points: 1000,
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: ''
        }
      ]
    });
    setEditingIndex(0);
  };

  // Add question (completely clean, zero pre-typed dummy text!)
  const handleAddQuestion = () => {
    const newQ = {
      id: quizConfig.questions.length + 1,
      type: 'single',
      category: 'General',
      difficulty: 'Intermediate',
      points: 1000,
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };
    setQuizConfig(prev => ({
      ...prev,
      questions: [...prev.questions, newQ]
    }));
    setEditingIndex(quizConfig.questions.length);
  };

  // Delete question
  const handleDeleteQuestion = (idx) => {
    if (quizConfig.questions.length <= 1) {
      alert('Quiz must have at least one question.');
      return;
    }
    const filtered = quizConfig.questions.filter((_, i) => i !== idx).map((q, i) => ({
      ...q,
      id: i + 1
    }));
    setQuizConfig(prev => ({ ...prev, questions: filtered }));
    setEditingIndex(Math.max(0, idx - 1));
  };

  // Update current question
  const handleUpdateCurrentQ = (field, value) => {
    setQuizConfig(prev => {
      const updated = [...prev.questions];
      updated[editingIndex] = {
        ...updated[editingIndex],
        [field]: value
      };
      return { ...prev, questions: updated };
    });
  };

  const handleUpdateOption = (optIdx, val) => {
    setQuizConfig(prev => {
      const updated = [...prev.questions];
      const curr = { ...updated[editingIndex] };
      const opts = [...(curr.options || [])];
      opts[optIdx] = val;
      curr.options = opts;
      updated[editingIndex] = curr;
      return { ...prev, questions: updated };
    });
  };

  // Publish and Launch Session
  const handlePublish = async () => {
    setErrorMsg('');
    const title = quizConfig.title.trim();
    if (!title) {
      setErrorMsg('Please enter a Quiz / Session Title.');
      return;
    }

    // Verify all questions have text
    for (let i = 0; i < quizConfig.questions.length; i++) {
      const q = quizConfig.questions[i];
      if (!q.question.trim()) {
        setErrorMsg(`Question #${i + 1} has an empty prompt. Please fill in the question.`);
        setEditingIndex(i);
        return;
      }
      if (q.type === 'single' || q.type === 'multi') {
        const hasEmptyOpt = (q.options || []).some(o => !o.trim());
        if (hasEmptyOpt) {
          setErrorMsg(`Question #${i + 1} has empty options. Please fill all options.`);
          setEditingIndex(i);
          return;
        }
      }
    }

    setIsPublishing(true);

    try {
      if (creatorMode === 'edit' && editingSessionPin) {
        // Save updates to existing session without generating a new PIN
        await saveQuizDefinition(editingSessionPin, quizConfig, teacherPasscode);
        alert(`Session ${editingSessionPin} updated successfully!`);
        if (onSessionUpdated) {
          onSessionUpdated(editingSessionPin);
        } else {
          onBackToHub();
        }
      } else {
        // Create brand-new session or duplicate
        const res = await publishQuizSession(quizConfig, teacherPasscode, {
          gameMode: quizConfig.gameMode || 'classic',
          perQuestionSeconds: quizConfig.perQuestionSeconds || 30,
          showScore: quizConfig.showScore,
          showItemAnalysis: quizConfig.showItemAnalysis,
          allowRetake: quizConfig.allowRetake,
          showRank: quizConfig.showRank
        });

        const pin = res.sessionPin;
        const origin = window.location.origin;
        const studentLink = `${origin}/?pin=${pin}`;

        setLaunchModal({
          sessionPin: pin,
          studentLink,
          title: quizConfig.title,
          gameMode: quizConfig.gameMode,
          perQuestionSeconds: quizConfig.perQuestionSeconds,
          totalQuestions: quizConfig.questions.length
        });
      }
    } catch (err) {
      setErrorMsg(`${creatorMode === 'edit' ? 'Saving' : 'Publishing'} failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const currentQ = quizConfig.questions[editingIndex] || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
      {/* Top Banner for Edit / Duplicate Mode */}
      {creatorMode === 'edit' && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0071e3] text-[10px]">
              Edit Mode
            </span>
            <span>Editing live session <strong>PIN: {editingSessionPin}</strong>. Changes will be saved directly to this session.</span>
          </div>
        </div>
      )}

      {creatorMode === 'duplicate' && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px]">
              Duplicate Mode
            </span>
            <span>Cloned from existing session. Publishing will generate a brand-new 6-digit Game PIN.</span>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button
          type="button"
          onClick={onBackToHub}
          className="apple-btn-secondary inline-flex items-center space-x-2 px-4 py-2 text-xs font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Conducted Sessions</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {creatorMode !== 'edit' && (
            <>
              <button
                type="button"
                onClick={handleLoadRAGTemplate}
                className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#2997ff]" />
                <span>Load 20 RAG Template</span>
              </button>

              <button
                type="button"
                onClick={handleStartBlank}
                className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#86868b]" />
                <span>Start Blank Canvas</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="apple-btn-primary flex items-center space-x-2 px-5 py-2 text-xs font-medium cursor-pointer disabled:opacity-50 shadow-[0_2px_14px_rgba(0,113,227,0.4)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isPublishing 
                ? (creatorMode === 'edit' ? 'Saving Changes...' : 'Publishing Session...') 
                : (creatorMode === 'edit' ? 'Save Changes' : (creatorMode === 'duplicate' ? 'Publish Cloned Session' : 'Publish & Launch Session'))}
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center space-x-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* 1. QUIZ SETTINGS & GAME MODE */}
      <div className="apple-glass rounded-[32px] p-6 sm:p-8 mb-8 shadow-sm space-y-6 border border-[#d2d2d7]/70">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] flex items-center space-x-2.5 tracking-tight">
            <Settings className="w-5 h-5 text-[#0071e3]" />
            <span>Session Configuration</span>
          </h2>
          <p className="text-xs text-[#86868b] mt-1 tracking-tight">
            Configure title, student answering mode, and passing threshold for this conducted session.
          </p>
        </div>

        {/* Title & Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
              Quiz / Session Title <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder=""
              value={quizConfig.title}
              onChange={(e) => setQuizConfig({ ...quizConfig, title: e.target.value })}
              className="apple-input w-full px-4 py-3 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1d1d1f] mb-1.5">
              Passing Score %
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={quizConfig.passingScore}
              onChange={(e) => setQuizConfig({ ...quizConfig, passingScore: Number(e.target.value) })}
              className="apple-input w-full px-4 py-3 font-mono text-sm"
            />
          </div>
        </div>

        {/* Answering Modes Cards */}
        <div>
          <label className="block text-xs font-semibold text-[#1d1d1f] mb-3">
            Select Answering Mode *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classical Mode Card */}
            <div
              onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'classic' })}
              className={`apple-glass-card p-6 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
                quizConfig.gameMode === 'classic'
                  ? 'border-[#0071e3] ring-2 ring-[#0071e3]/30 shadow-md'
                  : 'border-[#d2d2d7]/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎮</span>
                    <h4 className="font-semibold text-[#1d1d1f] text-base tracking-tight">Classical Mode</h4>
                  </div>
                  {quizConfig.gameMode === 'classic' && (
                    <span className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-[#0071e3] text-white">Selected</span>
                  )}
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed mb-4 tracking-tight">
                  4 vibrant Kahoot color boxes (Triangle, Diamond, Circle, Square). Overall exam countdown timer with full free navigation and review.
                </p>
              </div>

              <div className="pt-3 border-t border-[#e5e5ea] flex items-center justify-between">
                <span className="text-xs font-medium text-[#6e6e73]">Total Exam Timer:</span>
                <select
                  value={quizConfig.timeLimitMinutes}
                  onChange={(e) => setQuizConfig({ ...quizConfig, timeLimitMinutes: Number(e.target.value) })}
                  className="apple-input px-3 py-1.5 text-xs font-mono cursor-pointer"
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

            {/* Assessment Mode Card */}
            <div
              onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'assessment' })}
              className={`apple-glass-card p-6 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
                quizConfig.gameMode === 'assessment'
                  ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                  : 'border-[#d2d2d7]/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">⚡</span>
                    <h4 className="font-semibold text-[#1d1d1f] text-base tracking-tight">Assessment Mode</h4>
                  </div>
                  {quizConfig.gameMode === 'assessment' && (
                    <span className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold">Selected</span>
                  )}
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed mb-4 tracking-tight">
                  Timed question-by-question flow. Candidates answer within a strict per-question countdown. Answers lock instantly, auto-advancing to the next question.
                </p>
              </div>

              <div className="pt-3 border-t border-[#e5e5ea] flex items-center justify-between">
                <span className="text-xs font-medium text-[#6e6e73]">Seconds Per Question:</span>
                <select
                  value={quizConfig.perQuestionSeconds}
                  onChange={(e) => setQuizConfig({ ...quizConfig, perQuestionSeconds: Number(e.target.value) })}
                  className="apple-input px-3 py-1.5 text-xs font-mono font-medium cursor-pointer"
                >
                  <option value={10}>10 Seconds (Speed)</option>
                  <option value={15}>15 Seconds</option>
                  <option value={20}>20 Seconds (Fast)</option>
                  <option value={30}>30 Seconds (Standard)</option>
                  <option value={45}>45 Seconds</option>
                  <option value={60}>60 Seconds (1 Min)</option>
                  <option value={90}>90 Seconds</option>
                  <option value={120}>120 Seconds (2 Min)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Post-Exam Visibility & Permissions (Confidential Mode / Retake Controls) */}
        <div className="pt-6 border-t border-[#e5e5ea]">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
              <h3 className="text-sm font-semibold text-[#1d1d1f] tracking-tight">
                Post-Exam Visibility & Student Permissions
              </h3>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5 tracking-tight">
              Control what candidates see upon submitting. By default, scores, question analysis, and retakes remain strictly confidential to keep competition fair and reveal winners later.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Toggle 1: Show Score & Percentage */}
            <div className="apple-glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-[#d2d2d7]/70 bg-white/70">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#0071e3]" />
                  <span className="text-xs font-semibold text-[#1d1d1f]">Show Score & Percentage</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  {quizConfig.showScore 
                    ? 'Students will see their score, points & pass status immediately.' 
                    : 'Confidential: Scores and pass status are kept hidden until you reveal winners.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quizConfig.showScore}
                onClick={() => setQuizConfig(prev => ({ ...prev, showScore: !prev.showScore }))}
                className={`w-12 h-7 flex shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  quizConfig.showScore ? 'bg-[#34c759]' : 'bg-[#e5e5ea]'
                }`}
                title="Toggle student score visibility"
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  quizConfig.showScore ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Toggle 2: Show Question Item Analysis */}
            <div className="apple-glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-[#d2d2d7]/70 bg-white/70">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#0071e3]" />
                  <span className="text-xs font-semibold text-[#1d1d1f]">Question Item Analysis</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  {quizConfig.showItemAnalysis 
                    ? 'Students can inspect correct answers, mistakes & technical explanations.' 
                    : 'Confidential: Correct answers & explanations are hidden to prevent leaking to peers.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quizConfig.showItemAnalysis}
                onClick={() => setQuizConfig(prev => ({ ...prev, showItemAnalysis: !prev.showItemAnalysis }))}
                className={`w-12 h-7 flex shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  quizConfig.showItemAnalysis ? 'bg-[#34c759]' : 'bg-[#e5e5ea]'
                }`}
                title="Toggle question item analysis visibility"
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  quizConfig.showItemAnalysis ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Toggle 3: Allow Retake */}
            <div className="apple-glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-[#d2d2d7]/70 bg-white/70">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-[#0071e3]" />
                  <span className="text-xs font-semibold text-[#1d1d1f]">Allow Retake Examination</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  {quizConfig.allowRetake 
                    ? 'Students can retake the quiz multiple times.' 
                    : 'Single Attempt: Retake button is disabled and duplicate attempts are blocked.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quizConfig.allowRetake}
                onClick={() => setQuizConfig(prev => ({ ...prev, allowRetake: !prev.allowRetake }))}
                className={`w-12 h-7 flex shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  quizConfig.allowRetake ? 'bg-[#34c759]' : 'bg-[#e5e5ea]'
                }`}
                title="Toggle allow retake examination"
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  quizConfig.allowRetake ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Toggle 4: Show Rank / Leaderboard */}
            <div className="apple-glass-card p-4 rounded-2xl flex items-center justify-between gap-4 border border-[#d2d2d7]/70 bg-white/70">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#0071e3]" />
                  <span className="text-xs font-semibold text-[#1d1d1f]">Show Rank / Leaderboard</span>
                </div>
                <p className="text-[11px] text-[#86868b] leading-snug">
                  {quizConfig.showRank 
                    ? 'Students can see their live rank/position on completion.' 
                    : 'Confidential: Final ranks and podium winners are reserved for the instructor.'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quizConfig.showRank}
                onClick={() => setQuizConfig(prev => ({ ...prev, showRank: !prev.showRank }))}
                className={`w-12 h-7 flex shrink-0 items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  quizConfig.showRank ? 'bg-[#34c759]' : 'bg-[#e5e5ea]'
                }`}
                title="Toggle student rank visibility"
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  quizConfig.showRank ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUESTIONS LIST & SINGLE QUESTION EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Question Navigator */}
        <div className="apple-glass rounded-[28px] p-5 shadow-sm max-h-[700px] overflow-y-auto border border-[#d2d2d7]/70">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-semibold uppercase text-[#86868b] tracking-[0.16em]">
              Questions ({quizConfig.questions.length})
            </span>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="apple-btn-secondary flex items-center space-x-1 px-3 py-1 text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="space-y-2">
            {quizConfig.questions.map((q, idx) => {
              const isSelected = idx === editingIndex;
              return (
                <div
                  key={idx}
                  onClick={() => setEditingIndex(idx)}
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#0071e3] text-[#1d1d1f] shadow-sm font-semibold'
                      : 'bg-white border-[#e5e5ea] text-[#6e6e73] hover:border-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-medium text-xs shrink-0 ${
                      isSelected ? 'bg-[#0071e3] text-white' : 'bg-[#f5f5f7] text-[#6e6e73]'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">
                      {q.question.trim() || 'Untitled Question...'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#f5f5f7] text-[#6e6e73] border border-[#d2d2d7]/50">
                      {q.points || 1000}p
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(idx);
                      }}
                      className="p-1 rounded text-[#86868b] hover:text-[#ff3b30] hover:bg-rose-50 transition"
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

        {/* Right 2 Columns: Question Editor (Clean Inputs!) */}
        {currentQ && (
          <div className="lg:col-span-2 apple-glass rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6 border border-[#d2d2d7]/70">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5e5ea]">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d2d2d7]">
                Editing Question #{editingIndex + 1}
              </span>

              <div className="flex items-center space-x-2">
                <label className="text-xs text-[#86868b] font-medium">Points:</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={currentQ.points || 1000}
                  onChange={(e) => handleUpdateCurrentQ('points', Number(e.target.value))}
                  className="apple-input w-24 px-3 py-1.5 font-mono text-xs text-center font-medium"
                />
              </div>
            </div>

            {/* Question Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-2">Question Type</label>
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
                      handleUpdateCurrentQ('type', t.id);
                      if (t.id === 'boolean') {
                        handleUpdateCurrentQ('options', ['True', 'False']);
                        handleUpdateCurrentQ('correctAnswer', 0);
                      } else if (t.id === 'multi' && !Array.isArray(currentQ.correctAnswer)) {
                        handleUpdateCurrentQ('correctAnswer', [0]);
                      } else if (t.id === 'single' && Array.isArray(currentQ.correctAnswer)) {
                        handleUpdateCurrentQ('correctAnswer', 0);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      (currentQ.type || 'single') === t.id
                        ? 'bg-blue-50/80 border-[#0071e3] text-[#1d1d1f] shadow-sm'
                        : 'bg-[#fbfbfd] border-[#e5e5ea] text-[#6e6e73] hover:border-[#86868b]'
                    }`}
                  >
                    <div className="font-semibold text-xs text-[#1d1d1f]">{t.label}</div>
                    <div className="text-[10px] text-[#86868b]">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Prompt (Clean Empty!) */}
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] mb-2">
                Question Prompt *
              </label>
              <textarea
                rows={3}
                placeholder=""
                value={currentQ.question || ''}
                onChange={(e) => handleUpdateCurrentQ('question', e.target.value)}
                className="apple-input w-full px-4 py-3 text-sm leading-relaxed"
              />
            </div>

            {/* Options Editor (Clean Empty!) */}
            {(currentQ.type === 'single' || currentQ.type === 'multi') && (
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-2">
                  Answer Options & Correct Answer Selection
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const isCorrect = currentQ.type === 'single'
                      ? currentQ.correctAnswer === optIdx
                      : Array.isArray(currentQ.correctAnswer) && currentQ.correctAnswer.includes(optIdx);

                    return (
                      <div 
                        key={optIdx} 
                        className={`p-3.5 rounded-2xl border flex items-center space-x-3 transition ${
                          isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#d2d2d7]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (currentQ.type === 'single') {
                              handleUpdateCurrentQ('correctAnswer', optIdx);
                            } else {
                              const arr = Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer : [];
                              const updated = arr.includes(optIdx) ? arr.filter(i => i !== optIdx) : [...arr, optIdx];
                              handleUpdateCurrentQ('correctAnswer', updated);
                            }
                          }}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition cursor-pointer ${
                            isCorrect ? 'bg-[#34c759] border-[#34c759] text-white shadow-sm' : 'border-[#d2d2d7] bg-[#f5f5f7] text-[#86868b] hover:text-[#1d1d1f]'
                          }`}
                          title={isCorrect ? 'Correct Answer' : 'Click to mark as correct'}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <input
                          type="text"
                          placeholder=""
                          value={opt || ''}
                          onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                          className="flex-1 bg-transparent text-[#1d1d1f] text-xs sm:text-sm focus:outline-none placeholder-[#86868b] font-medium"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* True / False Option */}
            {currentQ.type === 'boolean' && (
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-2">Correct Answer</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentQ('correctAnswer', 0)}
                    className={`p-5 rounded-2xl border text-center font-bold text-sm transition cursor-pointer ${
                      currentQ.correctAnswer === 0
                        ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm'
                        : 'bg-white border-[#d2d2d7] text-[#6e6e73] hover:border-[#86868b]'
                    }`}
                  >
                    True (Correct)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentQ('correctAnswer', 1)}
                    className={`p-5 rounded-2xl border text-center font-bold text-sm transition cursor-pointer ${
                      currentQ.correctAnswer === 1
                        ? 'bg-[#ff3b30] border-[#ff3b30] text-white shadow-sm'
                        : 'bg-white border-[#d2d2d7] text-[#6e6e73] hover:border-[#86868b]'
                    }`}
                  >
                    False (Correct)
                  </button>
                </div>
              </div>
            )}

            {/* Short Answer Target */}
            {currentQ.type === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                  Accepted Correct Answer (Case-Insensitive)
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={currentQ.correctAnswer || ''}
                  onChange={(e) => handleUpdateCurrentQ('correctAnswer', e.target.value)}
                  className="apple-input w-full px-4 py-3 text-xs font-mono"
                />
              </div>
            )}

            {/* Explanation (Clean Empty!) */}
            <div>
              <label className="block text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                Explanation (Shown to students after submission)
              </label>
              <textarea
                rows={2}
                placeholder=""
                value={currentQ.explanation || ''}
                onChange={(e) => handleUpdateCurrentQ('explanation', e.target.value)}
                className="apple-input w-full px-4 py-2.5 text-xs leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      {/* LAUNCH SUCCESS MODAL (APPLE MAC ALERT) */}
      {launchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="apple-glass rounded-[32px] max-w-lg w-full p-8 shadow-2xl relative border border-[#d2d2d7]">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0071e3] mb-6 mx-auto shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-2xl font-semibold tracking-[-0.02em] apple-title-gradient text-center mb-1">
              Quiz Session Launched
            </h3>
            <p className="text-xs text-[#86868b] text-center mb-6 tracking-tight">
              Isolated session generated and registered in your central database.
            </p>

            {/* BIG 6-DIGIT PIN */}
            <div className="bg-[#fbfbfd] border border-[#d2d2d7] rounded-2xl p-6 text-center mb-6">
              <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-[0.2em] block mb-2">
                6-DIGIT GAME PIN
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-semibold text-[#1d1d1f] tracking-[0.2em]">
                {launchModal.sessionPin}
              </div>
              <div className="mt-3 flex items-center justify-center space-x-2">
                <span className="text-xs px-3 py-1 rounded-full bg-white text-[#6e6e73] font-medium border border-[#d2d2d7]/70">
                  Mode: {launchModal.gameMode === 'assessment' ? `⚡ Assessment (${launchModal.perQuestionSeconds}s/Q)` : 'Standard'}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-white text-[#6e6e73] font-medium border border-[#d2d2d7]/70">
                  {launchModal.totalQuestions} Questions
                </span>
              </div>
            </div>

            {/* Direct Student Link */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-semibold text-[#1d1d1f]">
                Direct Student Link (Auto-fills PIN)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={launchModal.studentLink}
                  className="apple-input flex-1 px-4 py-2.5 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(launchModal.studentLink)}
                  className="apple-btn-secondary px-4 py-2.5 text-xs font-medium cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.open(launchModal.studentLink, '_blank')}
                className="apple-btn-secondary py-3 px-4 text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Student View</span>
              </button>

              <button
                type="button"
                onClick={() => onSessionCreated(launchModal.sessionPin)}
                className="apple-btn-primary py-3 px-4 text-xs font-medium flex items-center justify-center space-x-2 cursor-pointer shadow-[0_2px_14px_rgba(0,113,227,0.4)]"
              >
                <span>Open Analytics →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
