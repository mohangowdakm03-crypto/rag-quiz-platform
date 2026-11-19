import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Key, 
  ExternalLink, 
  ArrowRight, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  FileCheck2,
  Trash2,
  Sliders,
  HelpCircle,
  Zap
} from 'lucide-react';
import { extractTextFromFile } from '../utils/pdfExtractor';
import { 
  getStoredGeminiApiKey, 
  saveStoredGeminiApiKey, 
  generateQuizQuestionsWithGemini 
} from '../services/geminiService';

export default function GeminiAiChatDrawer({ isOpen, onClose, onApplyQuestions }) {
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  
  // Document and generation state
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [rawText, setRawText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const [extractionError, setExtractionError] = useState('');

  // Generation parameters
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('Mixed');
  const [questionType, setQuestionType] = useState('single');
  const [customInstructions, setCustomInstructions] = useState('');

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [expandedPreview, setExpandedPreview] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setApiKey(getStoredGeminiApiKey());
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle API key saving
  const handleSaveKey = () => {
    if (tempKey.trim()) {
      saveStoredGeminiApiKey(tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyInput(false);
      setTempKey('');
    }
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsExtractingFile(true);
    setExtractionError('');
    setExtractedData(null);

    try {
      const data = await extractTextFromFile(file);
      setExtractedData(data);
      setRawText(data.text);
    } catch (err) {
      setExtractionError(err.message || 'Failed to extract text from document.');
      setUploadedFile(null);
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setExtractedData(null);
    setRawText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger Gemini Quiz Generation
  const handleGenerate = async () => {
    const textToAnalyze = rawText.trim();
    if (!textToAnalyze) {
      setGenerationError('Please upload a document or paste syllabus text first.');
      return;
    }

    if (!apiKey) {
      setShowKeyInput(true);
      setGenerationError('Please enter your free Google Gemini API Key first.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGeneratedResult(null);

    try {
      const result = await generateQuizQuestionsWithGemini({
        content: textToAnalyze,
        count: questionCount,
        difficulty,
        questionType,
        customPrompt: customInstructions,
        apiKey
      });

      setGeneratedResult(result);
    } catch (err) {
      console.error('Gemini error:', err);
      setGenerationError(err.message || 'Failed to generate questions with Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply to QuizCreator
  const handleApply = (mode = 'replace') => {
    if (!generatedResult || !generatedResult.questions) return;
    onApplyQuestions(generatedResult.questions, generatedResult.title, generatedResult.description, mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300" 
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl h-full shadow-2xl border-l border-[#d2d2d7] flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-[#e5e5ea] flex items-center justify-between bg-white/80 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0071e3] via-[#5e5ce6] to-[#af52de] flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-[#1d1d1f] tracking-tight">Gemini AI Studio</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Free Tier
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] tracking-tight">Auto-generate 10–20 questions from syllabus or PDF</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-btn-secondary w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* 1. Free API Key Banner / Config */}
          <div className="apple-glass-card p-3.5 rounded-2xl border border-[#d2d2d7]/70 bg-[#f5f5f7]/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <Key className="w-3.5 h-3.5 text-[#0071e3]" />
                <span className="font-semibold text-[#1d1d1f]">
                  {apiKey ? 'Google Gemini Key Active' : 'Enter Free Gemini API Key'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyInput(!showKeyInput)}
                className="text-[11px] text-[#0071e3] font-medium hover:underline cursor-pointer"
              >
                {showKeyInput ? 'Cancel' : (apiKey ? 'Change Key' : 'Add Key')}
              </button>
            </div>

            {(!apiKey || showKeyInput) && (
              <div className="mt-3 pt-3 border-t border-[#e5e5ea] space-y-2">
                <p className="text-[11px] text-[#6e6e73] leading-relaxed">
                  ✨ <strong>100% Free of Cost:</strong> Get a personal Gemini key from Google AI Studio. 1,500 free requests per day, no credit card required.
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    className="apple-input flex-1 px-3 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="apple-btn-primary px-3 py-1.5 text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] text-[#0071e3] hover:underline pt-1"
                >
                  <span>Get Free Google AI Studio Key (Takes 5 seconds)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* 2. Source Content Selector: Upload vs Paste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#1d1d1f]">Source Content Material</label>
              <div className="flex p-0.5 rounded-full bg-[#e5e5ea] border border-[#d2d2d7]/50 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 rounded-full transition cursor-pointer ${
                    activeTab === 'upload' ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs' : 'text-[#6e6e73]'
                  }`}
                >
                  Upload PDF / Doc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1 rounded-full transition cursor-pointer ${
                    activeTab === 'paste' ? 'bg-white text-[#1d1d1f] font-semibold shadow-xs' : 'text-[#6e6e73]'
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {/* TAB A: Upload Document */}
            {activeTab === 'upload' && (
              <div>
                {!uploadedFile ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#d2d2d7] hover:border-[#0071e3] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#fbfbfd] hover:bg-blue-50/20 group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.json,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0071e3] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-[#1d1d1f]">Click to upload syllabus or textbook PDF</p>
                    <p className="text-[11px] text-[#86868b] mt-0.5">Supports PDF, TXT, Markdown (Max 30 pages)</p>
                  </div>
                ) : (
                  <div className="apple-glass-card p-4 rounded-2xl border border-emerald-300 bg-emerald-50/20 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-[#1d1d1f] truncate">{uploadedFile.name}</h4>
                        <p className="text-[11px] text-[#6e6e73]">
                          {isExtractingFile 
                            ? 'Extracting document text...' 
                            : `${extractedData?.pageCount || 1} page${(extractedData?.pageCount || 1) > 1 ? 's' : ''} • ${extractedData?.wordCount?.toLocaleString() || 0} words extracted`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 rounded-lg text-[#86868b] hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {extractionError && (
                  <p className="text-xs text-red-600 mt-2 flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{extractionError}</span>
                  </p>
                )}
              </div>
            )}

            {/* TAB B: Paste Text / Syllabus */}
            {activeTab === 'paste' && (
              <div>
                <textarea
                  rows={6}
                  placeholder="Paste syllabus outline, lecture notes, textbook chapters, or custom topics here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="apple-input w-full p-3.5 text-xs font-sans leading-relaxed resize-none"
                />
                <div className="text-[11px] text-[#86868b] mt-1 text-right">
                  {rawText.trim().split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            )}
          </div>

          {/* 3. Generation Options Grid */}
          <div className="space-y-3 pt-2 border-t border-[#e5e5ea]">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#1d1d1f]">
              <Sliders className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Assessment Configuration</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Question Count */}
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Question Count</label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#f5f5f7] border border-[#d2d2d7]/70">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`py-1 text-center rounded-lg text-xs font-semibold transition cursor-pointer ${
                        questionCount === num ? 'bg-[#0071e3] text-white shadow-xs' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-[11px] font-medium text-[#6e6e73] mb-1.5">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="apple-input w-full px-2.5 py-1.5 text-xs font-medium cursor-pointer"
                >
                  <option value="Mixed">Mixed (Balanced)</option>
                  <option value="Beginner">Beginner / Fundamentals</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced / Analytical</option>
                </select>
              </div>
            </div>

            {/* Custom Focus Prompt */}
            <div>
              <label className="block text-[11px] font-medium text-[#6e6e73] mb-1">
                Special Focus or Custom Guidance (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Focus on practical edge cases, numerical problems, and algorithms..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="apple-input w-full px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Error Message */}
          {generationError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={isGenerating || isExtractingFile || !rawText.trim()}
            onClick={handleGenerate}
            className="apple-btn-primary w-full py-3.5 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating {questionCount} Questions with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate {questionCount} Questions with Gemini</span>
              </>
            )}
          </button>

          {/* 4. Generated Output Preview & Apply */}
          {generatedResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 border border-blue-200/80 shadow-sm space-y-4 fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                  <h4 className="text-xs font-bold text-[#1d1d1f]">Generation Successful!</h4>
                </div>
                <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full bg-blue-100 text-[#0071e3]">
                  {generatedResult.questions?.length} Questions Ready
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#1d1d1f]">{generatedResult.title}</p>
                <p className="text-[11px] text-[#6e6e73] mt-0.5">{generatedResult.description}</p>
              </div>

              {/* Expandable Preview Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedPreview(!expandedPreview)}
                  className="flex items-center justify-between w-full text-[11px] font-medium text-[#0071e3] hover:underline cursor-pointer py-1"
                >
                  <span>{expandedPreview ? 'Hide Question Breakdown' : 'Preview Generated Questions'}</span>
                  {expandedPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {expandedPreview && (
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                    {generatedResult.questions.map((q, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#e5e5ea] text-[11px]">
                        <p className="font-semibold text-[#1d1d1f]">Q{idx + 1}. {q.question}</p>
                        <div className="mt-1 space-y-0.5 text-[#6e6e73] pl-2">
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className={optIdx === q.correctAnswer ? 'text-emerald-700 font-semibold' : ''}>
                              {String.fromCharCode(65 + optIdx)}. {opt} {optIdx === q.correctAnswer && '✓'}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  className="apple-btn-primary py-2.5 px-3 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <span>Replace Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleApply('append')}
                  className="apple-btn-secondary py-2.5 px-3 text-xs font-medium cursor-pointer hover:border-[#1d1d1f]"
                >
                  <span>Append (+{generatedResult.questions?.length})</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#e5e5ea] bg-[#fbfbfd] text-[11px] text-[#86868b] flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Powered by Gemini 1.5/2.0 Flash</span>
          </span>
          <span>100% Free Tier</span>
        </div>

      </div>
    </div>
  );
}
