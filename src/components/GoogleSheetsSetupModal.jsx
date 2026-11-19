import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Play
} from 'lucide-react';
import { testGoogleSheetsWebhook } from '../supabase';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Oxvane Assessment Platform - Google Sheets Live Webhook Receiver
 * Automatically appends student exam submissions in real-time.
 */
function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000); // Thread-safe concurrency

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Session PIN",
        "Quiz Title",
        "Student Name",
        "USN / Roll No",
        "Score",
        "Total Possible",
        "Percentage",
        "Status",
        "Time Taken",
        "Academic Integrity",
        "Tab Switches",
        "Screenshot Attempts"
      ]);
      sheet.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#f5f5f7");
    }

    var contents = JSON.parse(e.postData.contents);

    // Single student live row append (Zero-click on submit)
    if (contents.studentName) {
      sheet.appendRow([
        new Date().toLocaleString(),
        contents.sessionPin || '',
        contents.sessionTitle || '',
        contents.studentName || '',
        contents.studentId || '',
        contents.score !== null && contents.score !== undefined ? contents.score : 'N/A',
        contents.totalPossible || 'N/A',
        contents.percentage !== null && contents.percentage !== undefined ? contents.percentage + '%' : 'N/A',
        contents.passed ? 'PASSED' : 'FAILED',
        contents.timeTakenSeconds ? Math.floor(contents.timeTakenSeconds / 60) + 'm ' + (contents.timeTakenSeconds % 60) + 's' : '0s',
        contents.integrityStatus || 'Clean',
        contents.tabSwitches || 0,
        contents.screenshotAttempts || 0
      ]);
    }
    // Batch export
    else if (contents.students && Array.isArray(contents.students)) {
      contents.students.forEach(function(s) {
        sheet.appendRow([
          new Date().toLocaleString(),
          contents.sessionPin || '',
          contents.sessionTitle || '',
          s.name || '',
          s.usn || '',
          s.score !== null && s.score !== undefined ? s.score : 'N/A',
          s.totalPossible || '',
          s.percentage + '%',
          s.passed ? 'PASSED' : 'FAILED',
          s.timeTakenSeconds ? Math.floor(s.timeTakenSeconds / 60) + 'm ' + (s.timeTakenSeconds % 60) + 's' : '0s',
          s.integrityStatus || 'Clean',
          s.tabSwitches || 0,
          s.screenshotAttempts || 0
        ]);
      });
    }

    lock.releaseLock();
    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function GoogleSheetsSetupModal({
  isOpen,
  onClose,
  initialUrl = '',
  sessionPin = '',
  sessionTitle = '',
  onSaveUrl
}) {
  const [webhookUrl, setWebhookUrl] = useState(initialUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleSave = () => {
    const trimmed = webhookUrl.trim();
    if (onSaveUrl) {
      onSaveUrl(trimmed);
    }
    onClose();
  };

  const handleTestPing = async () => {
    const trimmed = webhookUrl.trim();
    if (!trimmed) {
      setTestResult({ success: false, message: 'Please paste your Google Web App URL first.' });
      return;
    }
    if (!trimmed.startsWith('https://script.google.com/')) {
      setTestResult({ success: false, message: 'URL must start with https://script.google.com/' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      await testGoogleSheetsWebhook(trimmed, sessionPin || 'LIVE-SYNC', sessionTitle || 'Live Sync Diagnostic');
      setTestResult({ 
        success: true, 
        message: '✓ Test ping dispatched! Check your Google Sheet — a test row should now be appended.' 
      });
    } catch (err) {
      setTestResult({ success: false, message: `Test ping error: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="apple-glass rounded-[28px] max-w-2xl w-full p-6 sm:p-8 border border-[#d2d2d7]/80 shadow-2xl relative fade-in my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">
              Automated Direct Google Sheets Live Sync
            </h3>
            <p className="text-xs text-[#86868b] tracking-tight">
              Zero-click live row append whenever any candidate submits their exam
            </p>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4 my-6">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold">1</span>
                <span>Open Google Sheets & Apps Script</span>
              </span>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-[#0071e3] hover:underline flex items-center space-x-1"
              >
                <span>Create New Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-7">
              In your Google Sheet, click <strong>Extensions</strong> → <strong>Apps Script</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold">2</span>
                <span>Paste Webhook Script</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="apple-btn-secondary px-3 py-1 text-[11px] font-medium flex items-center space-x-1.5 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#34c759]" /> : <Copy className="w-3.5 h-3.5 text-[#0071e3]" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Apps Script'}</span>
              </button>
            </div>
            <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-7">
              Replace any existing code in the script editor with this thread-safe receiver code.
            </p>
            <div className="pl-7">
              <pre className="text-[10px] font-mono bg-[#f5f5f7] p-2.5 rounded-xl text-[#1d1d1f] max-h-24 overflow-y-auto border border-[#e5e5ea]">
                {GOOGLE_APPS_SCRIPT_TEMPLATE.substring(0, 320)}...
              </pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-white border border-[#e5e5ea] space-y-2">
            <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold">3</span>
              <span>Deploy as Web App</span>
            </span>
            <p className="text-[11px] text-[#6e6e73] leading-relaxed pl-7">
              Click <strong>Deploy</strong> → <strong>New deployment</strong> → Select <strong>Web app</strong>. Set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>. Click <strong>Deploy</strong> and copy the <strong>Web App URL</strong>.
            </p>
          </div>

          {/* Step 4: Webhook URL Input */}
          <div className="p-4 rounded-2xl bg-[#fbfbfd] border border-[#0071e3]/30 space-y-3">
            <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold">4</span>
              <span>Enter Web App URL</span>
            </span>
            <div className="space-y-2 pl-7">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="apple-input w-full px-3.5 py-2.5 text-xs font-mono"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isTesting || !webhookUrl.trim()}
                  className="apple-btn-secondary px-3 py-1.5 text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3 text-[#0071e3]" />
                  <span>{isTesting ? 'Sending Test Ping...' : 'Test Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34c759]" /> : <AlertCircle className="w-4 h-4 shrink-0 text-[#ff3b30]" />}
                  <span className="leading-snug">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e5e5ea]">
          <button
            type="button"
            onClick={onClose}
            className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="apple-btn-primary px-6 py-2 text-xs font-medium cursor-pointer"
          >
            Save & Activate Live Sync
          </button>
        </div>
      </div>
    </div>
  );
}
