import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Users, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  X, 
  Download, 
  Sun, 
  Moon, 
  Clock, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  BarChart3, 
  Tv, 
  FileSpreadsheet,
  Play
} from 'lucide-react';
import { 
  getQuizDefinition, 
  subscribeToParticipants, 
  subscribeToTeacherData 
} from '../supabase';
import { playJoinChime, playStartChime } from '../utils/soundEffects';

export default function HostProjectorView({
  sessionPin,
  teacherPasscode,
  onClose,
  onOpenSheetsModal
}) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState('light'); // 'light' | 'dark' (Classroom Cinema)
  const [activeTab, setActiveTab] = useState('lobby'); // 'lobby' | 'monitor'
  
  const [quizDef, setQuizDef] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastJoinedId, setLastJoinedId] = useState(null);
  const prevCountRef = useRef(0);

  const joinUrl = `${window.location.origin}/?pin=${encodeURIComponent(sessionPin)}`;

  // 1. Load Quiz Definition & Generate QR Code
  useEffect(() => {
    async function init() {
      try {
        const def = await getQuizDefinition(sessionPin);
        if (def) setQuizDef(def);

        // Generate high-resolution, contrast-optimized QR Code
        const url = await QRCode.toDataURL(joinUrl, {
          width: 480,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error('Projector init error:', err);
      }
    }
    init();
  }, [sessionPin, joinUrl]);

  // 2. Real-time Subscription to Joined Participants
  useEffect(() => {
    const unsubscribe = subscribeToParticipants(sessionPin, (updatedList) => {
      setParticipants(updatedList);

      // Check if new student joined
      if (updatedList.length > prevCountRef.current) {
        const newest = updatedList[0];
        if (newest) {
          setLastJoinedId(newest.id);
          setTimeout(() => setLastJoinedId(null), 2500);
        }
        if (soundEnabled && prevCountRef.current > 0) {
          playJoinChime();
        }
      }
      prevCountRef.current = updatedList.length;
    });

    return () => unsubscribe();
  }, [sessionPin, soundEnabled]);

  // 3. Real-time Subscription to Exam Submissions (for Live Monitor mode)
  useEffect(() => {
    if (!teacherPasscode) return;
    const unsubscribe = subscribeToTeacherData(sessionPin, teacherPasscode, (subs) => {
      setSubmissions(subs || []);
    });
    return () => unsubscribe();
  }, [sessionPin, teacherPasscode]);

  // 4. Fullscreen Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(sessionPin).then(() => {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `oxvane-quiz-${sessionPin}-qr.png`;
    a.click();
  };

  const isAssessment = quizDef?.gameMode === 'assessment';
  const submissionRate = participants.length > 0 ? Math.round((submissions.length / participants.length) * 100) : 0;
  const avgScore = submissions.length > 0 ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length) : 0;
  const passRate = submissions.length > 0 ? Math.round((submissions.filter(s => s.passed).length / submissions.length) * 100) : 0;

  const isDark = themeMode === 'dark';

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 overflow-y-auto select-none ${
        isDark 
          ? 'bg-[#000000] text-[#f5f5f7]' 
          : 'bg-[#f5f5f7] text-[#1d1d1f]'
      }`}
    >
      {/* Top Projector Presentation Bar */}
      <header className={`px-6 py-4 flex items-center justify-between border-b transition-colors shrink-0 ${
        isDark 
          ? 'bg-[#121215]/90 border-white/10 backdrop-blur-xl' 
          : 'bg-white/90 border-[#d2d2d7]/70 backdrop-blur-xl'
      }`}>
        {/* Left: Branding & Session Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#0071e3] flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight line-clamp-1">
                {quizDef?.title || 'Interactive Quiz Session'}
              </h2>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${
                isAssessment 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                  : 'bg-blue-500/10 text-[#0071e3] border border-blue-500/20'
              }`}>
                {isAssessment ? `Assessment (${quizDef?.perQuestionSeconds || 30}s/Q)` : `Standard (${quizDef?.timeLimitMinutes || 30}m)`}
              </span>
            </div>
            <p className="text-[11px] text-[#86868b] tracking-tight">
              Classroom Projector Mode • Big Screen Experience
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher (Lobby vs Live Monitor) */}
        <div className={`hidden md:flex items-center p-1 rounded-full border ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-[#e5e5ea] border-[#d2d2d7]/60'
        }`}>
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'lobby'
                ? 'bg-[#0071e3] text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Join Lobby ({participants.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'monitor'
                ? 'bg-[#0071e3] text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Live Monitor ({submissions.length})</span>
          </button>
        </div>

        {/* Right: Projector Controls */}
        <div className="flex items-center space-x-2">
          {/* Google Sheets Live Sync Setup Button */}
          {onOpenSheetsModal && (
            <button
              onClick={onOpenSheetsModal}
              className={`p-2.5 rounded-full border transition cursor-pointer flex items-center space-x-1.5 text-xs font-medium ${
                quizDef?.sheetsWebhookUrl 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                  : isDark ? 'bg-white/5 border-white/10 text-[#86868b] hover:text-white' : 'bg-white border-[#d2d2d7] text-[#6e6e73] hover:text-[#1d1d1f]'
              }`}
              title="Automated Google Sheets Live Sync"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="hidden lg:inline">{quizDef?.sheetsWebhookUrl ? 'Sheets Live' : 'Connect Sheets'}</span>
            </button>
          )}

          {/* Sound Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-full border transition cursor-pointer ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-black/5'
            }`}
            title={soundEnabled ? 'Disable Join Sound Chime' : 'Enable Join Sound Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#34c759]" /> : <VolumeX className="w-4 h-4 text-[#86868b]" />}
          </button>

          {/* Theater Dark / Light Mode */}
          <button
            onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
            className={`p-2.5 rounded-full border transition cursor-pointer ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-black/5'
            }`}
            title={isDark ? 'Switch to Apple Light Mode' : 'Switch to Classroom Cinema Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#6e6e73]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-full border transition cursor-pointer ${
              isDark 
                ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' 
                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-black/5'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Classroom Projector Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Projector */}
          <button
            onClick={onClose}
            className={`p-2.5 rounded-full border transition cursor-pointer ${
              isDark 
                ? 'bg-white/10 border-white/15 text-white hover:bg-rose-500/20 hover:text-red-400' 
                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:bg-rose-50 hover:text-red-500'
            }`}
            title="Exit Projector View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Big Screen Presentation Canvas */}
      <main className="flex-1 p-6 sm:p-10 flex flex-col justify-center max-w-7xl mx-auto w-full">
        {activeTab === 'lobby' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1 my-auto">
            
            {/* LEFT / CENTER STAGE: Huge Game PIN & Join Instructions (Col 7) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              
              {/* Instructions Pill */}
              <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#86868b]">
                <Sparkles className="w-4 h-4 text-[#0071e3]" />
                <span>Join Live Examination Session</span>
              </div>

              {/* Huge PIN Card */}
              <div className={`p-8 sm:p-10 rounded-[32px] border transition-all shadow-xl relative overflow-hidden ${
                isDark 
                  ? 'bg-[#121215] border-white/15 shadow-black/80' 
                  : 'bg-white border-[#d2d2d7]/80 shadow-black/5'
              }`}>
                <div className="text-xs uppercase font-semibold text-[#86868b] tracking-[0.25em] mb-3 text-center sm:text-left">
                  6-Digit Game PIN
                </div>

                {/* Big Screen Numbers */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="text-5xl sm:text-7xl font-mono font-bold tracking-[0.3em] text-[#0071e3]">
                    {sessionPin}
                  </div>

                  {/* Copy PIN & Link Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCopyPin}
                      className="apple-btn-secondary px-4 py-2.5 text-xs font-medium flex items-center space-x-2 cursor-pointer rounded-xl"
                      title="Copy 6-Digit PIN"
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-[#34c759]" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPin ? 'PIN Copied' : 'Copy PIN'}</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="apple-btn-primary px-4 py-2.5 text-xs font-medium flex items-center space-x-2 cursor-pointer rounded-xl"
                      title="Copy Student Invite Link"
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      <span>{copiedLink ? 'Link Copied' : 'Invite Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Web Address Callout */}
                <div className={`mt-6 pt-5 border-t flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 ${
                  isDark ? 'border-white/10 text-[#86868b]' : 'border-[#e5e5ea] text-[#6e6e73]'
                }`}>
                  <div>
                    <span>Go to </span>
                    <strong className="text-[#0071e3] font-semibold text-sm underline underline-offset-4">
                      {window.location.host}
                    </strong>
                    <span> or scan the QR Code on right</span>
                  </div>
                  <span className="text-[11px] font-mono">
                    {quizDef?.totalQuestions || 0} Questions • Anti-Cheat Monitored
                  </span>
                </div>
              </div>

              {/* Live Join Counter Header */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34c759] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#34c759]"></span>
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {participants.length} {participants.length === 1 ? 'Student' : 'Students'} Connected
                  </h3>
                </div>

                {soundEnabled && (
                  <span className="text-[11px] text-[#86868b] flex items-center space-x-1">
                    <Volume2 className="w-3.5 h-3.5 text-[#34c759]" />
                    <span>Chime Active</span>
                  </span>
                )}
              </div>

              {/* Real-Time Participant Grid / Bubbles */}
              <div className={`p-5 rounded-2xl border min-h-[160px] max-h-[260px] overflow-y-auto ${
                isDark ? 'bg-[#08080a] border-white/10' : 'bg-white/60 border-[#e5e5ea]'
              }`}>
                {participants.length === 0 ? (
                  <div className="h-full py-10 flex flex-col items-center justify-center text-center text-[#86868b]">
                    <Users className="w-8 h-8 text-[#86868b]/40 mb-2 animate-pulse" />
                    <p className="text-sm font-medium">Waiting for candidates to enter Game PIN...</p>
                    <p className="text-xs text-[#86868b] mt-1">Names will appear here live in real-time as they join</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {participants.map((p) => {
                      const isNewlyJoined = p.id === lastJoinedId;
                      const initial = p.studentName ? p.studentName.charAt(0).toUpperCase() : '?';
                      
                      return (
                        <div
                          key={p.id}
                          className={`inline-flex items-center space-x-2 py-1.5 px-3 rounded-full text-xs font-medium border transition-all duration-300 transform ${
                            isNewlyJoined 
                              ? 'scale-110 bg-[#34c759] text-white border-[#34c759] shadow-lg shadow-emerald-500/30' 
                              : isDark 
                                ? 'bg-white/10 border-white/10 text-white hover:border-white/20' 
                                : 'bg-white border-[#d2d2d7] text-[#1d1d1f] hover:border-[#86868b] shadow-sm'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isNewlyJoined ? 'bg-white text-[#34c759]' : 'bg-[#0071e3] text-white'
                          }`}>
                            {initial}
                          </span>
                          <span className="font-semibold">{p.studentName}</span>
                          {p.studentId && p.studentId !== 'N/A' && (
                            <span className={`text-[10px] font-mono ${isNewlyJoined ? 'text-white/80' : 'text-[#86868b]'}`}>
                              ({p.studentId})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT STAGE: Instant High-Res QR Code Card (Col 5) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className={`p-8 sm:p-10 rounded-[36px] border text-center shadow-2xl relative group transition-all max-w-sm w-full ${
                isDark 
                  ? 'bg-[#121215] border-white/15' 
                  : 'bg-white border-[#d2d2d7]/80'
              }`}>
                {/* QR Code Canvas */}
                <div className="p-4 bg-white rounded-3xl inline-block shadow-inner border border-[#e5e5ea] mb-5">
                  {qrCodeDataUrl ? (
                    <img 
                      src={qrCodeDataUrl} 
                      alt={`QR Code for Game PIN ${sessionPin}`}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-xs text-[#86868b]">
                      Generating QR...
                    </div>
                  )}
                </div>

                <h4 className="text-base sm:text-lg font-semibold tracking-tight mb-1">
                  Point Camera to Join
                </h4>
                <p className="text-xs text-[#86868b] max-w-xs mx-auto mb-5 leading-relaxed">
                  Opens exam portal with PIN <strong className="text-[#0071e3]">{sessionPin}</strong> already filled in.
                </p>

                {/* QR Download & Action Buttons */}
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={handleDownloadQr}
                    className="apple-btn-secondary px-3.5 py-1.5 text-xs font-medium flex items-center space-x-1.5 cursor-pointer rounded-xl"
                    title="Download QR code PNG for slides"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save QR</span>
                  </button>

                  <button
                    onClick={() => {
                      playStartChime();
                      setActiveTab('monitor');
                    }}
                    className="apple-btn-primary px-4 py-1.5 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer rounded-xl"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Live Monitor</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* LIVE MONITOR VIEW: Big Screen Submissions Tracker */
          <div className="space-y-8 fade-in my-auto">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-6 rounded-3xl border shadow-sm ${
                isDark ? 'bg-[#121215] border-white/10' : 'bg-white border-[#e5e5ea]'
              }`}>
                <span className="text-[11px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Submissions
                </span>
                <div className="text-4xl font-mono font-bold text-[#0071e3]">
                  {submissions.length} <span className="text-lg font-normal text-[#86868b]">/ {participants.length || '—'}</span>
                </div>
                <div className="w-full bg-[#e5e5ea] rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-[#0071e3] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, submissionRate)}%` }}
                  />
                </div>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm ${
                isDark ? 'bg-[#121215] border-white/10' : 'bg-white border-[#e5e5ea]'
              }`}>
                <span className="text-[11px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Completion Rate
                </span>
                <div className="text-4xl font-mono font-bold text-[#34c759]">
                  {submissionRate}%
                </div>
                <span className="text-[11px] text-[#86868b] mt-1 block">Active candidates</span>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm ${
                isDark ? 'bg-[#121215] border-white/10' : 'bg-white border-[#e5e5ea]'
              }`}>
                <span className="text-[11px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Class Average
                </span>
                <div className="text-4xl font-mono font-bold text-[#0071e3]">
                  {avgScore}%
                </div>
                <span className="text-[11px] text-[#86868b] mt-1 block">Real-time graded</span>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm ${
                isDark ? 'bg-[#121215] border-white/10' : 'bg-white border-[#e5e5ea]'
              }`}>
                <span className="text-[11px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1">
                  Pass Rate
                </span>
                <div className="text-4xl font-mono font-bold text-[#34c759]">
                  {passRate}%
                </div>
                <span className="text-[11px] text-[#86868b] mt-1 block">Target: {quizDef?.passingScore || 70}%</span>
              </div>
            </div>

            {/* Live Submissions Feed */}
            <div className={`p-6 sm:p-8 rounded-[32px] border ${
              isDark ? 'bg-[#121215] border-white/10' : 'bg-white border-[#d2d2d7]/80'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#34c759]" />
                  <h3 className="text-lg font-semibold tracking-tight">Recent Submissions</h3>
                </div>
                <span className="text-xs text-[#86868b]">
                  {submissions.length} completed
                </span>
              </div>

              {submissions.length === 0 ? (
                <div className="py-16 text-center text-[#86868b]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="text-sm">Candidates are currently writing the examination...</p>
                  <p className="text-xs text-[#86868b] mt-1">Finished assessments will pop in as they submit</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {submissions.slice(0, 18).map((sub, idx) => (
                    <div 
                      key={sub.id || idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                        isDark ? 'bg-white/5 border-white/10' : 'bg-[#fbfbfd] border-[#e5e5ea]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <strong className="text-xs font-semibold block">{sub.studentName}</strong>
                        <span className="text-[10px] text-[#86868b] font-mono">{sub.studentId}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-mono font-bold ${sub.passed ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                          {sub.percentage}%
                        </span>
                        <span className="text-[10px] text-[#86868b] block">{sub.passed ? 'PASSED' : 'RETRY'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Projector Footer Status */}
      <footer className={`px-6 py-3 border-t flex items-center justify-between text-xs text-[#86868b] ${
        isDark ? 'bg-[#08080a] border-white/10' : 'bg-white/80 border-[#d2d2d7]/60'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse"></span>
          <span>Projector Broadcast Active • Press <strong>F</strong> or Click Fullscreen for best display</span>
        </div>
        <div className="font-mono text-[11px]">
          Session PIN: <strong className="text-[#0071e3]">{sessionPin}</strong>
        </div>
      </footer>
    </div>
  );
}
