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
  ShieldAlert,
  Smartphone,
  Lock,
  Award,
  Shuffle,
  Tv,
  FileSpreadsheet
} from 'lucide-react';
import { 
  publishQuizSession, 
  saveQuizDefinition, 
  testGoogleSheetsWebhook 
} from '../supabase';
import GeminiAiChatDrawer from './GeminiAiChatDrawer';
import GoogleSheetsSetupModal from './GoogleSheetsSetupModal';

// Official Apple iOS / macOS Tactile Switch Toggle (Large, Touch-Friendly 56px x 32px)
function AppleToggle({ checked, onChange, label = '', disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: '56px',
        height: '32px',
        minWidth: '56px',
        minHeight: '32px',
        borderRadius: '9999px',
        padding: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: checked ? '#34c759' : '#e5e5ea',
        border: checked ? '1px solid #30b852' : '1px solid rgba(210, 210, 215, 0.85)',
        boxShadow: checked ? 'inset 0 1px 2px rgba(0, 0, 0, 0.12)' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        outline: 'none'
      }}
      className="shrink-0 focus-visible:ring-2 focus-visible:ring-[#0071e3]"
      title={label}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        style={{
          width: '24px',
          height: '24px',
          minWidth: '24px',
          minHeight: '24px',
          borderRadius: '9999px',
          backgroundColor: '#ffffff',
          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.18), 0 1px 2px rgba(0, 0, 0, 0.08)',
          transform: checked ? 'translateX(24px)' : 'translateX(0px)',
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          display: 'block'
        }}
      />
    </button>
  );
}

export default function QuizCreator({ 
  onBackToHub, 
  onSessionCreated, 
  onSessionUpdated, 
  teacherPasscode,
  creatorMode = 'create', // 'create' | 'edit' | 'duplicate'
  editingSessionPin = null,
  initialQuizConfig = null,
  onOpenProjector = null,
  currentTeacher = null
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
        oneAttemptPerDevice: initialQuizConfig.oneAttemptPerDevice !== false,
        antiCheatEnabled: initialQuizConfig.antiCheatEnabled !== false,
        strictAutoSubmit: initialQuizConfig.strictAutoSubmit !== false,
        maxTabSwitches: initialQuizConfig.maxTabSwitches || 3,
        shuffleQuestions: initialQuizConfig.shuffleQuestions === true,
        sheetsWebhookUrl: initialQuizConfig.sheetsWebhookUrl || (editingSessionPin && typeof localStorage !== 'undefined' ? localStorage.getItem(`sheets_webhook_${editingSessionPin}`) : '') || '',
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
      oneAttemptPerDevice: true,
      antiCheatEnabled: true,
      strictAutoSubmit: true,
      maxTabSwitches: 3,
      shuffleQuestions: false,
      sheetsWebhookUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem('oxvane_global_sheets_webhook') : '') || '',
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
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestStatus, setWebhookTestStatus] = useState(null);

  const handleTestSheetsWebhook = async () => {
    const url = quizConfig.sheetsWebhookUrl?.trim();
    if (!url) return;
    setIsTestingWebhook(true);
    setWebhookTestStatus(null);
    try {
      await testGoogleSheetsWebhook(url, editingSessionPin || 'STUDIO-TEST', quizConfig.title || 'Studio Quiz');
      setWebhookTestStatus({ success: true, message: '✓ Test ping sent! Check your Google Sheet to confirm.' });
    } catch (err) {
      setWebhookTestStatus({ success: false, message: `Ping failed: ${err.message}` });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Apply AI Generated Questions (from Gemini AI Studio)
  const handleApplyAiQuestions = (newQuestions, newTitle, newDescription, mode = 'replace') => {
    setQuizConfig(prev => {
      if (mode === 'append') {
        const startId = prev.questions.length;
        const adjusted = newQuestions.map((q, idx) => ({
          ...q,
          id: startId + idx + 1
        }));
        return {
          ...prev,
          questions: [...prev.questions, ...adjusted]
        };
      }
      return {
        ...prev,
        title: newTitle || prev.title,
        description: newDescription || prev.description,
        questions: newQuestions
      };
    });
    setEditingIndex(0);
  };

  // Clear canvas to blank question
  const handleStartBlank = () => {
    if (quizConfig.questions.length > 1 || quizConfig.questions[0]?.question) {
      if (!window.confirm('Clear all questions and start fresh with a blank question?')) return;
    }
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
      oneAttemptPerDevice: true,
      antiCheatEnabled: true,
      strictAutoSubmit: true,
      maxTabSwitches: 3,
      shuffleQuestions: false,
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
        await saveQuizDefinition(editingSessionPin, {
          ...quizConfig,
          instructorId: currentTeacher?.uid || quizConfig.instructorId || '',
          instructorEmail: currentTeacher?.email || currentTeacher?.phoneNumber || quizConfig.instructorEmail || '',
          instructorName: currentTeacher?.displayName || quizConfig.instructorName || ''
        }, teacherPasscode);
        if (quizConfig.sheetsWebhookUrl) {
          localStorage.setItem(`sheets_webhook_${editingSessionPin}`, quizConfig.sheetsWebhookUrl);
        }
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
          showRank: quizConfig.showRank,
          oneAttemptPerDevice: quizConfig.oneAttemptPerDevice !== false,
          antiCheatEnabled: quizConfig.antiCheatEnabled !== false,
          strictAutoSubmit: quizConfig.strictAutoSubmit !== false,
          maxTabSwitches: quizConfig.maxTabSwitches || 3,
          shuffleQuestions: quizConfig.shuffleQuestions === true,
          sheetsWebhookUrl: quizConfig.sheetsWebhookUrl || '',
          instructorId: currentTeacher?.uid || '',
          instructorEmail: currentTeacher?.email || currentTeacher?.phoneNumber || '',
          instructorName: currentTeacher?.displayName || ''
        });

        const pin = res.sessionPin;
        const origin = window.location.origin;
        const studentLink = `${origin}/?pin=${pin}`;

        if (quizConfig.sheetsWebhookUrl) {
          localStorage.setItem(`sheets_webhook_${pin}`, quizConfig.sheetsWebhookUrl);
          localStorage.setItem('oxvane_global_sheets_webhook', quizConfig.sheetsWebhookUrl);
        }

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
          {/* Gemini AI Generator Option via Small Logo */}
          <button
            type="button"
            onClick={() => setShowAiDrawer(true)}
            className="apple-btn-secondary flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-[#0071e3] border-blue-200/90 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/60 hover:border-[#0071e3] transition shadow-xs cursor-pointer group"
            title="AI Quiz Generator via Google Gemini (Free Tier)"
          >
            <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#0071e3] via-[#5e5ce6] to-[#af52de] flex items-center justify-center text-white shadow-xs group-hover:scale-110 transition-transform">
              <Sparkles className="w-2.5 h-2.5" />
            </span>
            <span>Gemini AI Studio</span>
          </button>

          {creatorMode !== 'edit' && (
            <button
              type="button"
              onClick={handleStartBlank}
              className="apple-btn-secondary flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium cursor-pointer"
              title="Clear all questions and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#86868b]" />
              <span>Clear Canvas</span>
            </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Classical Mode Card */}
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

            {/* 2. Assessment Mode Card */}
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

            {/* 3. Live Kahoot Game Mode Card (Optional Synchronous) */}
            <div
              onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'live_kahoot', perQuestionSeconds: quizConfig.perQuestionSeconds || 20 })}
              className={`apple-glass-card p-6 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
                quizConfig.gameMode === 'live_kahoot'
                  ? 'border-[#af52de] ring-2 ring-[#af52de]/30 shadow-md'
                  : 'border-[#d2d2d7]/70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📺</span>
                    <h4 className="font-semibold text-[#1d1d1f] text-base tracking-tight">Live Kahoot Mode</h4>
                  </div>
                  {quizConfig.gameMode === 'live_kahoot' && (
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#af52de] to-[#0071e3] text-white">Selected</span>
                  )}
                </div>
                <p className="text-xs text-[#86868b] leading-relaxed mb-4 tracking-tight">
                  Synchronous classroom projector game. Teacher controls rounds on the big screen; students tap 4 vibrant mobile color buttons with speed bonus, live charts & grand podium.
                </p>
              </div>

              <div className="pt-3 border-t border-[#e5e5ea] flex items-center justify-between">
                <span className="text-xs font-medium text-[#6e6e73]">Seconds Per Round:</span>
                <select
                  value={quizConfig.perQuestionSeconds || 20}
                  onChange={(e) => setQuizConfig({ ...quizConfig, perQuestionSeconds: Number(e.target.value) })}
                  className="apple-input px-3 py-1.5 text-xs font-mono font-medium cursor-pointer"
                >
                  <option value={10}>10 Seconds (Speed)</option>
                  <option value={15}>15 Seconds</option>
                  <option value={20}>20 Seconds (Standard)</option>
                  <option value={30}>30 Seconds</option>
                  <option value={45}>45 Seconds</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Session Policies & Exam Configuration (8 Apple-Style Tactile Toggles) */}
        <div className="pt-6 border-t border-[#e5e5ea]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-[#0071e3]" />
                <h3 className="text-sm sm:text-base font-semibold text-[#1d1d1f] tracking-tight">
                  Session Policies & Exam Configuration (8 Controls)
                </h3>
              </div>
              <p className="text-xs text-[#86868b] mt-0.5 tracking-tight">
                Tap anywhere on any card or toggle bar to adjust settings. Authentic Apple tactile switches (56×32pt).
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white border border-[#d2d2d7]/80 text-[#1d1d1f] font-semibold w-fit flex items-center space-x-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
              <span>8 Active Policies</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle 1: Show Score & Percentage */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, showScore: !prev.showScore }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.showScore 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.showScore ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <Award className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Show Score & Percentage</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.showScore 
                    ? 'Students will see their score, points & pass status immediately upon submission.' 
                    : 'Confidential: Scores remain hidden until you reveal the winners live.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.showScore}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, showScore: checked }))}
                label="Toggle student score visibility"
              />
            </div>

            {/* Toggle 2: Show Question Item Analysis */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, showItemAnalysis: !prev.showItemAnalysis }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.showItemAnalysis 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.showItemAnalysis ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Question Item Analysis</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.showItemAnalysis 
                    ? 'Students can inspect correct answers, mistakes & technical explanations.' 
                    : 'Confidential: Correct answers & explanations are hidden to prevent peer leaks.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.showItemAnalysis}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, showItemAnalysis: checked }))}
                label="Toggle question item analysis visibility"
              />
            </div>

            {/* Toggle 3: Allow Retake */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, allowRetake: !prev.allowRetake }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.allowRetake 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.allowRetake ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <RotateCcw className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Allow Retake Examination</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.allowRetake 
                    ? 'Students can retake the quiz multiple times.' 
                    : 'Single Attempt: Retake button is disabled and duplicate attempts are blocked.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.allowRetake}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, allowRetake: checked }))}
                label="Toggle allow retake examination"
              />
            </div>

            {/* Toggle 4: Show Rank / Leaderboard */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, showRank: !prev.showRank }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.showRank 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.showRank ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Show Rank / Leaderboard</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.showRank 
                    ? 'Students can see their live rank & position on completion.' 
                    : 'Confidential: Final ranks and podium winners are reserved for instructor reveal.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.showRank}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, showRank: checked }))}
                label="Toggle student rank visibility"
              />
            </div>

            {/* Toggle 5: One Attempt per Device (Google Forms Style) */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, oneAttemptPerDevice: !prev.oneAttemptPerDevice }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.oneAttemptPerDevice 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.oneAttemptPerDevice ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Limit to 1 Response / Device</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.oneAttemptPerDevice 
                    ? 'Google Forms rule: Locks device UID and candidate USN to block repeat tries.' 
                    : 'Unrestricted: Candidates can submit multiple times from this device.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.oneAttemptPerDevice}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, oneAttemptPerDevice: checked }))}
                label="Toggle single response per device"
              />
            </div>

            {/* Toggle 6: Proctoring & Anti-Cheat Suite */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, antiCheatEnabled: !prev.antiCheatEnabled }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.antiCheatEnabled 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.antiCheatEnabled ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <ShieldAlert className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Proctoring & Anti-Cheat Suite</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.antiCheatEnabled 
                    ? 'Monitors tab switches, window blur, blocks screenshot shortcuts & copy-paste.' 
                    : 'Disabled: No browser event monitoring or screenshot restrictions.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.antiCheatEnabled}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, antiCheatEnabled: checked }))}
                label="Toggle proctoring & anti-cheat suite"
              />
            </div>

            {/* Toggle 7: Strict Auto-Submit on 3 Violations */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, strictAutoSubmit: !prev.strictAutoSubmit }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.strictAutoSubmit 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.strictAutoSubmit ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <Lock className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Auto-Submit on 3 Violations</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.strictAutoSubmit 
                    ? 'Strict fairness: Force-submits the candidate’s exam if they leave the tab 3 times.' 
                    : 'Log only: Violations are logged to instructor console without forced submission.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.strictAutoSubmit}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, strictAutoSubmit: checked }))}
                label="Toggle auto-submit on violations"
              />
            </div>

            {/* Toggle 8: Shuffle Question Order (Anti-Peeking) */}
            <div 
              onClick={() => setQuizConfig(prev => ({ ...prev, shuffleQuestions: !prev.shuffleQuestions }))}
              className={`apple-glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none active:scale-[0.99] ${
                quizConfig.shuffleQuestions 
                  ? 'border-[#34c759]/50 bg-emerald-50/20 shadow-sm' 
                  : 'border-[#d2d2d7]/70 bg-white/70 hover:border-[#86868b]/60 hover:bg-white'
              }`}
            >
              <div className="space-y-1 pr-2 flex-1">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    quizConfig.shuffleQuestions ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                  }`}>
                    <Shuffle className="w-4 h-4" />
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight">Shuffle Question Order</span>
                </div>
                <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-10.5">
                  {quizConfig.shuffleQuestions 
                    ? 'Anti-peeking: Randomizes question sequence per student to prevent copying in the room.' 
                    : 'Standard: All candidates receive questions in identical sequential order.'}
                </p>
              </div>
              <AppleToggle
                checked={quizConfig.shuffleQuestions}
                onChange={(checked) => setQuizConfig(prev => ({ ...prev, shuffleQuestions: checked }))}
                label="Toggle shuffle question order"
              />
            </div>
          </div>
        </div>

        {/* Automated Direct Google Sheets Live Webhook Sync (Zero-Click Row Append) */}
        <div className="pt-6 border-t border-[#e5e5ea]">
          <div className="p-5 rounded-2xl border border-[#d2d2d7]/80 bg-white/70 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  quizConfig.sheetsWebhookUrl ? 'bg-emerald-100 text-[#34c759]' : 'bg-[#f5f5f7] text-[#6e6e73]'
                }`}>
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#1d1d1f] tracking-tight flex items-center space-x-2">
                    <span>Automated Direct Google Sheets Live Sync</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      quizConfig.sheetsWebhookUrl 
                        ? 'bg-emerald-50 text-[#34c759] border border-emerald-200' 
                        : 'bg-[#f5f5f7] text-[#86868b] border border-[#d2d2d7]'
                    }`}>
                      {quizConfig.sheetsWebhookUrl ? '✓ Live Append Active' : 'Optional'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#6e6e73] leading-snug">
                    Zero-click row append: Submissions automatically append to your private Google Sheet the instant each candidate submits.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSheetsModal(true)}
                className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium cursor-pointer shrink-0"
              >
                Setup Guide & 1-Click Code
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec (Paste Web App URL)"
                value={quizConfig.sheetsWebhookUrl || ''}
                onChange={(e) => setQuizConfig(prev => ({ ...prev, sheetsWebhookUrl: e.target.value.trim() }))}
                className="apple-input flex-1 px-3.5 py-2 text-xs font-mono w-full"
              />
              <button
                type="button"
                onClick={handleTestSheetsWebhook}
                disabled={isTestingWebhook || !quizConfig.sheetsWebhookUrl}
                className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTestingWebhook ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {webhookTestStatus && (
              <p className={`text-[11px] font-medium leading-snug ${
                webhookTestStatus.success ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {webhookTestStatus.message}
              </p>
            )}
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
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowAiDrawer(true)}
                className="apple-btn-secondary flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-[#0071e3] border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 cursor-pointer shadow-xs"
                title="Generate with Gemini AI"
              >
                <Sparkles className="w-3 h-3 text-[#0071e3]" />
                <span>AI</span>
              </button>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="apple-btn-secondary flex items-center space-x-1 px-3 py-1 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
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
                  Mode: {launchModal.gameMode === 'assessment' ? `⚡ Assessment (${launchModal.perQuestionSeconds}s/Q)` : launchModal.gameMode === 'live_kahoot' ? `📺 Live Kahoot (${launchModal.perQuestionSeconds || 20}s/Q)` : '🎮 Classical'}
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

            {/* Projector Presentation View Button */}
            {onOpenProjector && (
              <button
                type="button"
                onClick={() => {
                  const pin = launchModal.sessionPin;
                  setLaunchModal(null);
                  onOpenProjector(pin);
                }}
                className="w-full mb-3 apple-btn-secondary py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 text-[#0071e3] border-[#0071e3]/40 hover:border-[#0071e3] hover:bg-blue-50/50 cursor-pointer shadow-sm rounded-2xl"
              >
                <Tv className="w-4 h-4 text-[#0071e3]" />
                <span>📽️ Open Classroom Projector Mode (Instant QR & Live Count)</span>
              </button>
            )}

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

      {/* Gemini AI Quiz Generator Side Chat Drawer */}
      <GeminiAiChatDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        onApplyQuestions={handleApplyAiQuestions}
      />

      {/* Automated Google Sheets Setup Modal */}
      <GoogleSheetsSetupModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        initialUrl={quizConfig.sheetsWebhookUrl || ''}
        sessionPin={editingSessionPin || 'LIVE-SYNC'}
        sessionTitle={quizConfig.title || 'Studio Quiz'}
        onSaveUrl={(url) => {
          setQuizConfig(prev => ({ ...prev, sheetsWebhookUrl: url }));
          if (editingSessionPin) {
            localStorage.setItem(`sheets_webhook_${editingSessionPin}`, url);
          }
          localStorage.setItem('oxvane_global_sheets_webhook', url);
        }}
      />
    </div>
  );
}
