import React, { useState } from 'react';
import { 
  Database, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../supabase';

const SQL_SCHEMA = `-- 1. Create table for quiz submissions
create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  score integer not null,
  total_questions integer not null default 20,
  percentage integer not null,
  passed boolean not null default false,
  time_taken_seconds integer default 0,
  answers jsonb default '{}'::jsonb,
  breakdown jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 2. Create table for live participants
create table if not exists public.quiz_participants (
  id uuid primary key default gen_random_uuid(),
  quiz_id text not null,
  student_name text not null,
  student_id text,
  joined_at timestamptz default now(),
  status text default 'in-progress'
);

-- 3. Enable Row Level Security (RLS)
alter table public.quiz_submissions enable row level security;
alter table public.quiz_participants enable row level security;

-- 4. Policies to allow all students to join and submit
create policy "Allow public insert to submissions" on public.quiz_submissions for insert with check (true);
create policy "Allow public read on submissions" on public.quiz_submissions for select using (true);
create policy "Allow public insert to participants" on public.quiz_participants for insert with check (true);
create policy "Allow public read on participants" on public.quiz_participants for select using (true);

-- 5. Enable Supabase Realtime for live updates
alter publication supabase_realtime add table public.quiz_submissions;
alter publication supabase_realtime add table public.quiz_participants;`;

export default function SupabaseConfigModal({ isOpen, onClose, onConfigSaved }) {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onConfigSaved();
      onClose();
    }, 1200);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl fade-in max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Supabase Database Connection</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL
                </span>
              </h2>
              <p className="text-xs text-slate-400">Connect to your free Supabase project in 30 seconds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Step Quick Guide */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 mb-6 text-xs space-y-3">
          <div className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>Quick 30-Second Setup</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-start space-x-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <div>
                <span>Create a free project on </span>
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-400 underline font-semibold inline-flex items-center space-x-0.5"
                >
                  <span>supabase.com</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
                <span> and paste the SQL schema in <strong>SQL Editor</strong>:</span>
              </div>
            </div>

            <div className="pt-1 pl-7">
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedSql ? 'SQL Schema Copied!' : 'Copy 1-Click SQL Schema'}</span>
              </button>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <span>Go to <strong>Project Settings → API</strong>, copy your <strong>Project URL</strong> and <strong>anon public key</strong>, and paste them below:</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xyzproject.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Supabase Anon Public API Key
            </label>
            <input
              type="text"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Supabase credentials saved successfully!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save & Connect to Supabase</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
