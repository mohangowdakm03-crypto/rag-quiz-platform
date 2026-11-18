import React, { useState } from 'react';
import { Share2, Check, Sparkles, Database } from 'lucide-react';

export default function StudentHeader({ quizId }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const origin = window.location.origin + window.location.pathname;
    const shareUrl = `${origin}?pin=${encodeURIComponent(quizId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-300 bg-clip-text text-transparent">
                RAG Master
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Exam Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Retrieval-Augmented Generation Evaluation</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Cloud status */}
          <div
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
            title="Real-time cloud database connected"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud Connected</span>
          </div>

          {/* Share Quiz ID button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition-all shadow-sm active:scale-95"
            title="Copy shareable link for quiz"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quiz ID: <strong className="text-emerald-300 ml-1 font-mono">{quizId}</strong></span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
