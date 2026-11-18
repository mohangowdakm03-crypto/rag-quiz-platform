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
  ShieldCheck
} from 'lucide-react';
import { publishQuizSession } from '../supabase';
import { RAG_QUIZ_DATA } from '../data/ragQuestions';

export default function QuizCreator({ onBackToHub, onSessionCreated, teacherPasscode }) {
  const [quizConfig, setQuizConfig] = useState({
    title: '',
    description: '',
    timeLimitMinutes: 30,
    passingScore: 70,
    gameMode: 'classic', // 'classic' | 'assessment'
    perQuestionSeconds: 30,
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
      const res = await publishQuizSession(quizConfig, teacherPasscode, {
        gameMode: quizConfig.gameMode || 'classic',
        perQuestionSeconds: quizConfig.perQuestionSeconds || 30
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
    } catch (err) {
      setErrorMsg(`Publishing failed: ${err.message}`);
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
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <button
          type="button"
          onClick={onBackToHub}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Conducted Sessions</span>
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleLoadRAGTemplate}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Load 20 RAG Template</span>
          </button>

          <button
            type="button"
            onClick={handleStartBlank}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Start Blank Canvas</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-xl shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing & Generating PIN...' : '🚀 Publish & Launch Quiz Session'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold flex items-center space-x-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* 1. QUIZ SETTINGS & GAME MODE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center space-x-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Session Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Specify the title, answering mode, and passing criteria for this conducted session.
          </p>
        </div>

        {/* Title & Description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Quiz / Session Title *
            </label>
            <input
              type="text"
              required
              placeholder=""
              value={quizConfig.title}
              onChange={(e) => setQuizConfig({ ...quizConfig, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Passing Score %
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={quizConfig.passingScore}
              onChange={(e) => setQuizConfig({ ...quizConfig, passingScore: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm"
            />
          </div>
        </div>

        {/* Answering Modes Cards */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Select Answering Mode *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classical Mode Card */}
            <div
              onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'classic' })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                quizConfig.gameMode === 'classic'
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🎮</span>
                    <h4 className="font-extrabold text-white text-base">Classical Mode</h4>
                  </div>
                  {quizConfig.gameMode === 'classic' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold">Selected</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  4 vibrant Kahoot color boxes (Red Triangle, Blue Diamond, Yellow Circle, Green Square). Overall exam countdown timer with full free navigation and review.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Total Exam Timer:</span>
                <select
                  value={quizConfig.timeLimitMinutes}
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

            {/* Assessment Mode Card */}
            <div
              onClick={() => setQuizConfig({ ...quizConfig, gameMode: 'assessment' })}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                quizConfig.gameMode === 'assessment'
                  ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-extrabold text-white text-base">Assessment Mode</h4>
                  </div>
                  {quizConfig.gameMode === 'assessment' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">Selected</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Timed question-by-question flow! Students answer within a strict per-question countdown. Answers lock and save instantly, auto-advancing to the next question.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Seconds Per Question:</span>
                <select
                  value={quizConfig.perQuestionSeconds}
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
      </div>

      {/* 2. QUESTIONS LIST & SINGLE QUESTION EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Question Navigator */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl max-h-[700px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Questions ({quizConfig.questions.length})
            </span>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
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
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">
                      {q.question.trim() || 'Untitled Question...'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-400">
                      {q.points || 1000}p
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuestion(idx);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
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
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <span className="text-xs font-mono px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Editing Question #{editingIndex + 1}
              </span>

              <div className="flex items-center space-x-2">
                <label className="text-xs text-slate-400 font-semibold">Points:</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={currentQ.points || 1000}
                  onChange={(e) => handleUpdateCurrentQ('points', Number(e.target.value))}
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs text-center font-bold"
                />
              </div>
            </div>

            {/* Question Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Question Type</label>
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
                    className={`p-3 rounded-2xl border text-left transition ${
                      (currentQ.type || 'single') === t.id
                        ? 'bg-teal-600/20 border-teal-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">{t.label}</div>
                    <div className="text-[10px] text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Prompt (Clean Empty!) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Question Prompt *
              </label>
              <textarea
                rows={3}
                placeholder=""
                value={currentQ.question || ''}
                onChange={(e) => handleUpdateCurrentQ('question', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed placeholder-slate-600"
              />
            </div>

            {/* Options Editor (Clean Empty!) */}
            {(currentQ.type === 'single' || currentQ.type === 'multi') && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                          isCorrect ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-950 border-slate-800'
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
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition ${
                            isCorrect ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'
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
                          className="flex-1 bg-transparent text-white text-xs sm:text-sm focus:outline-none placeholder-slate-600 font-medium"
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
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Correct Answer</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentQ('correctAnswer', 0)}
                    className={`p-5 rounded-2xl border text-center font-bold text-sm transition ${
                      currentQ.correctAnswer === 0
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    True (Correct)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentQ('correctAnswer', 1)}
                    className={`p-5 rounded-2xl border text-center font-bold text-sm transition ${
                      currentQ.correctAnswer === 1
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
            {currentQ.type === 'text' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Accepted Correct Answer (Case-Insensitive)
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={currentQ.correctAnswer || ''}
                  onChange={(e) => handleUpdateCurrentQ('correctAnswer', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono placeholder-slate-600"
                />
              </div>
            )}

            {/* Explanation (Clean Empty!) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Explanation (Shown to students after submission)
              </label>
              <textarea
                rows={2}
                placeholder=""
                value={currentQ.explanation || ''}
                onChange={(e) => handleUpdateCurrentQ('explanation', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed placeholder-slate-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* LAUNCH SUCCESS MODAL */}
      {launchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 mb-6 mx-auto shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-extrabold text-white text-center mb-1">
              Quiz Session Launched! 🎉
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6">
              Saved separately by name and date in your cloud database.
            </p>

            {/* BIG 6-DIGIT PIN */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-6 text-center mb-6 shadow-inner">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                6-DIGIT GAME PIN
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-wider">
                {launchModal.sessionPin}
              </div>
              <div className="mt-3 flex items-center justify-center space-x-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  Mode: {launchModal.gameMode === 'assessment' ? `⚡ Assessment (${launchModal.perQuestionSeconds}s/Q)` : '🎮 Classical'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {launchModal.totalQuestions} Questions
                </span>
              </div>
            </div>

            {/* Direct Student Link */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Direct Student Link (Auto-fills PIN)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={launchModal.studentLink}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-emerald-300 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(launchModal.studentLink)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.open(launchModal.studentLink, '_blank')}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test Student View</span>
              </button>

              <button
                type="button"
                onClick={() => onSessionCreated(launchModal.sessionPin)}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2"
              >
                <span>Open Session Analytics →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
