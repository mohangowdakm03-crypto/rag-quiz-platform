import React, { useState, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  ShieldAlert, 
  Mail, 
  CheckCircle2, 
  LifeBuoy,
  Send,
  ShieldCheck,
  FileText
} from 'lucide-react';
import OxvaneLogo from './OxvaneLogo';

export default function AppleSupportModal({ isOpen, onClose, defaultCategory = 'support' }) {
  const [category, setCategory] = useState(defaultCategory); // 'issue' | 'security' | 'support' | 'privacy' | 'terms'
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setSubmitted(false);
    }
  }, [isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Apple-style instant telemetry dispatch simulation
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
        setEmail('');
        setSubject('');
        setDescription('');
      }, 2400);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md fade-in">
      <div 
        className="w-full max-w-lg apple-glass rounded-[28px] p-6 sm:p-8 shadow-2xl border border-[#d2d2d7]/80 relative overflow-hidden text-[#1d1d1f] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e5e5ea]/60 transition cursor-pointer z-10"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 shrink-0">
          <OxvaneLogo size="sm" />
          <div>
            <h3 className="text-lg font-semibold tracking-tight apple-title-gradient">
              {category === 'privacy' 
                ? 'Oxvane Privacy Policy' 
                : category === 'terms' 
                  ? 'Oxvane Terms of Service' 
                  : 'Oxvane Support & Incident Center'}
            </h3>
            <p className="text-xs text-[#86868b]">
              Enterprise reliability, ISO-standard security & dedicated engineering support
            </p>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="overflow-y-auto pr-1">
          {category === 'privacy' ? (
            <div className="space-y-4 text-xs text-[#424245] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-white border border-[#d2d2d7]/60 shadow-sm">
                <h4 className="font-semibold text-[#1d1d1f] flex items-center space-x-1.5 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#34c759]" />
                  <span>Zero-Telemetry & Strict Multi-Tenant Isolation</span>
                </h4>
                <p>
                  Oxvane adheres to the highest global data privacy standards, mirroring Apple privacy benchmarks. Quizzes, assessment answers, student submissions, and telemetry data are cryptographically partitioned. No instructor or third party can access cross-tenant records.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbfbfd] border border-[#d2d2d7]/60">
                <h5 className="font-semibold text-[#1d1d1f] mb-1">Data Retention & Ownership</h5>
                <p>
                  Instructors retain 100% intellectual property ownership of all question definitions, rubrics, and exported Google Sheets analytics. Student session credentials and anti-cheat event logs are preserved strictly for the authorized session creator.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbfbfd] border border-[#d2d2d7]/60">
                <h5 className="font-semibold text-[#1d1d1f] mb-1">Compliance & Inquiries</h5>
                <p>
                  For GDPR, FERPA, or COPPA compliance inquiries, contact our Data Protection Officer directly at <strong className="text-[#1d1d1f]">privacy@oxvane.com</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCategory('support')}
                  className="text-xs text-[#0071e3] hover:underline cursor-pointer font-medium"
                >
                  Need Technical Support instead?
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="apple-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : category === 'terms' ? (
            <div className="space-y-4 text-xs text-[#424245] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-white border border-[#d2d2d7]/60 shadow-sm">
                <h4 className="font-semibold text-[#1d1d1f] flex items-center space-x-1.5 mb-1.5">
                  <FileText className="w-4 h-4 text-[#0071e3]" />
                  <span>Oxvane Cloud Terms of Service</span>
                </h4>
                <p>
                  By accessing the Oxvane Assessment Platform or publishing live classroom sessions, educational institutions and individual instructors agree to conduct academic assessments in good faith, respecting student privacy and institutional guidelines.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbfbfd] border border-[#d2d2d7]/60">
                <h5 className="font-semibold text-[#1d1d1f] mb-1">Service Reliability & SLA</h5>
                <p>
                  Oxvane provides high-concurrency real-time WebSocket synchronization backed by Supabase Enterprise PostgreSQL and Firebase Cloud Infrastructure, designed for 99.95% uptime during examination periods.
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setCategory('support')}
                  className="text-xs text-[#0071e3] hover:underline cursor-pointer font-medium"
                >
                  Contact Support
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="apple-btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : submitted ? (
            <div className="py-10 text-center fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#34c759] flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-[#1d1d1f] mb-1">
                Report Successfully Dispatched
              </h4>
              <p className="text-xs text-[#86868b] max-w-xs mx-auto">
                Your ticket has been assigned case reference #{Math.floor(100000 + Math.random() * 900000)}. Our engineering team will review and reply within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Category Segmented Control */}
              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-[0.14em] mb-1.5">
                  Inquiry Category
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#e5e5ea]/80 border border-[#d2d2d7]/70 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setCategory('support')}
                    className={`py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                      category === 'support' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#6e6e73]'
                    }`}
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Support</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('issue')}
                    className={`py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                      category === 'issue' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#6e6e73]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Bug Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('security')}
                    className={`py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                      category === 'security' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'text-[#6e6e73]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#ff3b30]" />
                    <span>Security</span>
                  </button>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Your Contact Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="apple-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    category === 'issue' 
                      ? 'Brief summary of issue or unexpected behavior' 
                      : category === 'security' 
                        ? 'Vulnerability report or access anomaly' 
                        : 'How can our engineering team assist you?'
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="apple-input w-full px-3.5 py-2 text-xs"
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Details & Context
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    category === 'issue' 
                      ? 'Describe the steps to reproduce or what occurred...' 
                      : category === 'security' 
                        ? 'Detail the security observation with reproducible steps...' 
                        : 'Describe your question or deployment requirements...'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="apple-input w-full px-3.5 py-2 text-xs resize-none"
                ></textarea>
              </div>

              {/* Official Support Email Callout */}
              <div className="p-3 rounded-2xl bg-[#fbfbfd] border border-[#d2d2d7]/70 text-[11px] text-[#86868b] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>Direct Contact: <strong>support@oxvane.com</strong></span>
                </div>
                <span className="text-[#34c759] font-medium">SLA: &lt; 24h</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="apple-btn-secondary px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="apple-btn-primary px-5 py-2 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{isSubmitting ? 'Transmitting...' : 'Submit Report'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
