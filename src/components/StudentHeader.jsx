import React, { useState } from 'react';
import { Share2, Check, Sparkles, Database, Shield } from 'lucide-react';

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
    <header className="apple-glass-nav sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-semibold text-lg tracking-tight apple-title-gradient">
                Oxvane
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[#a1a1a6] border border-white/[0.1]">
                Exam Portal
              </span>
            </div>
            <p className="text-[11px] text-[#86868b] tracking-tight hidden sm:block">Academic Assessment & Evaluation Platform</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Cloud status */}
          <div
            className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            title="Real-time cloud database connected"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] tracking-tight font-medium">Cloud Active</span>
          </div>

          {/* Share Quiz ID button (only if quizId is active) */}
          {quizId ? (
            <button
              onClick={handleCopyLink}
              className="apple-btn-secondary flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium shadow-sm cursor-pointer"
              title="Copy shareable link for quiz"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>PIN: <strong className="text-white ml-1 font-mono tracking-wider">{quizId}</strong></span>
                </>
              )}
            </button>
          ) : (
            <a
              href="/teacher"
              className="text-xs text-[#86868b] hover:text-[#f5f5f7] transition-colors duration-200 flex items-center space-x-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Instructor Console</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
