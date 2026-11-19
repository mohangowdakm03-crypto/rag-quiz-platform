import React from 'react';
import { Sparkles } from 'lucide-react';

export default function StudentHeader() {
  return (
    <header className="apple-glass-nav sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-2xl bg-[#0071e3] flex items-center justify-center shadow-md shadow-[#0071e3]/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-semibold text-lg tracking-tight apple-title-gradient">
                Oxvane
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]">
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
            className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700"
            title="Real-time cloud database connected"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] tracking-tight font-medium">Cloud Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
