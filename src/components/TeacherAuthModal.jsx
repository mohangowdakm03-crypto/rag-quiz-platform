import React, { useState } from 'react';
import OxvaneLogo from './OxvaneLogo';
import { 
  Lock, 
  Mail, 
  Smartphone, 
  Sparkles, 
  Check, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  User,
  ArrowLeft
} from 'lucide-react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  sendPasswordRecoveryLink, 
  sendPhoneVerificationOtp, 
  confirmPhoneVerificationOtp,
  verifyAdminPasscode
} from '../services/authService';

export default function TeacherAuthModal({ onAuthenticated }) {
  // Mode: 'google_email' | 'phone_otp' | 'passcode' | 'forgot_password'
  const [authMode, setAuthMode] = useState('google_email');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneStep, setPhoneStep] = useState('phone'); // 'phone' | 'otp'

  // Passcode state
  const [passcode, setPasscode] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // 1. Google 1-Click Sign-In
  const handleGoogleSignIn = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        onAuthenticated(res.user);
      } else {
        setErrorMsg(res.error || 'Google Sign-In failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Google Sign-In error.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email Sign-In / Sign-Up
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegisterMode) {
        const res = await registerWithEmail(email, password, displayName);
        if (res.success) {
          onAuthenticated(res.user);
        } else {
          setErrorMsg(res.error);
        }
      } else {
        const res = await loginWithEmail(email, password);
        if (res.success) {
          onAuthenticated(res.user);
        } else {
          setErrorMsg(res.error);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Password Recovery Link
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMsg('Please enter your email address to receive the password recovery link.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPasswordRecoveryLink(email);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch recovery link.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Send Phone SMS OTP
  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!phoneNumber.trim() || phoneNumber.trim() === '+91') {
      setErrorMsg('Please enter a valid mobile number with country code (e.g. +91 9876543210).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPhoneVerificationOtp(phoneNumber);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setPhoneStep('otp');
        setSuccessMsg(`✓ 6-Digit OTP sent via SMS to ${phoneNumber}.`);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not send SMS verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Confirm Phone SMS OTP
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit OTP code received on your phone.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await confirmPhoneVerificationOtp(confirmationResult, otpCode);
      if (res.success) {
        onAuthenticated(res.user);
      } else {
        setErrorMsg(res.error);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Master Passcode Verification
  const handlePasscodeSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!passcode.trim()) {
      setErrorMsg('Please enter the instructor passcode.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyAdminPasscode(passcode);
      if (res.valid) {
        onAuthenticated(res.user);
      } else {
        setErrorMsg(res.error || 'Invalid administrator passcode.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen apple-bg-ambient flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Invisible reCAPTCHA container for Phone Auth */}
      <div id="recaptcha-container"></div>

      <div className="max-w-md w-full fade-in">
        <div className="apple-glass rounded-[32px] p-8 sm:p-10 shadow-2xl relative border border-[#d2d2d7]/80 overflow-hidden">
          
          {/* Header Brand */}
          <div className="text-center mb-6">
            <OxvaneLogo size="xl" className="mx-auto mb-3.5" />

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Educator & Instructor Portal</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] apple-title-gradient">
              {authMode === 'forgot_password' 
                ? 'Reset Password' 
                : isRegisterMode 
                  ? 'Create Instructor Account' 
                  : 'Sign in to Oxvane'}
            </h1>
            <p className="text-xs text-[#86868b] mt-1 tracking-tight">
              {authMode === 'forgot_password' 
                ? 'We will send a password recovery link to your email.'
                : 'Manage quiz sessions, examine real-time telemetry, and grade submissions.'}
            </p>
          </div>

          {/* Top Auth Method Segmented Tabs (Google/Email vs Phone SMS vs Passcode) */}
          {authMode !== 'forgot_password' && (
            <div className="flex items-center p-1 rounded-full bg-[#e5e5ea] border border-[#d2d2d7]/60 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('google_email');
                  clearMessages();
                }}
                className={`flex-1 py-1.5 rounded-full transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'google_email'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email / Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone_otp');
                  clearMessages();
                }}
                className={`flex-1 py-1.5 rounded-full transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'phone_otp'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone SMS</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('passcode');
                  clearMessages();
                }}
                className={`flex-1 py-1.5 rounded-full transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  authMode === 'passcode'
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Passcode</span>
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff3b30]" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34c759]" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* 1. GOOGLE & EMAIL / PASSWORD MODE */}
          {authMode === 'google_email' && (
            <div className="space-y-4">
              {/* Google 1-Click Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white border border-[#d2d2d7] hover:border-[#86868b] hover:bg-[#fbfbfd] text-[#1d1d1f] text-sm font-semibold flex items-center justify-center space-x-3 transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {/* Official Google G SVG Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#d2d2d7]/70"></div>
                <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-[#86868b] font-medium">or email</span>
                <div className="flex-grow border-t border-[#d2d2d7]/70"></div>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-[#86868b]" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      required={isRegisterMode}
                      placeholder="Prof. Jane Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="apple-input w-full px-3.5 py-2.5 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#86868b]" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="professor@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="apple-input w-full px-3.5 py-2.5 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#1d1d1f] flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#86868b]" />
                      <span>Password</span>
                    </label>
                    {!isRegisterMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot_password');
                          clearMessages();
                        }}
                        className="text-[11px] text-[#0071e3] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="apple-input w-full px-3.5 py-2.5 text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#86868b] hover:text-[#1d1d1f]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="apple-btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <span>{isRegisterMode ? 'Create Account & Enter' : 'Sign in to Dashboard'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Register / Sign In */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    clearMessages();
                  }}
                  className="text-xs text-[#0071e3] hover:underline cursor-pointer font-medium"
                >
                  {isRegisterMode 
                    ? 'Already have an account? Sign in' 
                    : "New instructor? Create your account"}
                </button>
              </div>
            </div>
          )}

          {/* 2. PHONE SMS OTP MODE */}
          {authMode === 'phone_otp' && (
            <div className="space-y-4">
              {phoneStep === 'phone' ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5 flex items-center space-x-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#86868b]" />
                      <span>Mobile Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="apple-input w-full px-3.5 py-2.5 text-xs font-mono"
                    />
                    <p className="text-[11px] text-[#86868b] mt-1.5 leading-snug">
                      Include country code (e.g. +91 for India, +1 for US/Canada). A 6-digit verification code will be sent via SMS.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="apple-btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isLoading ? <span>Dispatching SMS...</span> : <span>Send 6-Digit SMS OTP</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmOtp} className="space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-xs text-[#86868b]">Code sent to</span>
                    <strong className="block text-sm font-mono text-[#1d1d1f]">{phoneNumber}</strong>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#6e6e73] text-center mb-2">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      required
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="apple-input w-full text-center text-3xl font-mono tracking-[0.25em] py-2.5 font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="apple-btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <span>Verifying OTP...</span> : <span>Confirm & Sign In</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep('phone');
                      setOtpCode('');
                      clearMessages();
                    }}
                    className="w-full text-center text-xs text-[#86868b] hover:text-[#1d1d1f] cursor-pointer pt-1"
                  >
                    Change Phone Number
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 3. MASTER PASSCODE MODE (BACKWARD COMPATIBLE) */}
          {authMode === 'passcode' && (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>Master Administrator Passcode</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="apple-input w-full px-3.5 py-2.5 text-xs font-mono"
                />
                <p className="text-[11px] text-[#86868b] mt-1.5 leading-snug">
                  Universal administrative bypass for session management & emergency access.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="apple-btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? <span>Verifying...</span> : <span>Unlock Instructor Console</span>}
              </button>
            </form>
          )}

          {/* 4. FORGOT PASSWORD RECOVERY VIEW */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#86868b]" />
                  <span>Account Email</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="professor@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="apple-input w-full px-3.5 py-2.5 text-xs"
                />
                <p className="text-[11px] text-[#86868b] mt-1.5 leading-snug">
                  Enter your registered instructor email. An instant password reset link will be dispatched immediately.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="apple-btn-primary w-full py-3 px-4 text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? <span>Dispatching Link...</span> : <span>Send Recovery Link</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('google_email');
                  clearMessages();
                }}
                className="w-full text-center text-xs text-[#0071e3] hover:underline cursor-pointer flex items-center justify-center space-x-1 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="mt-8 pt-5 border-t border-[#d2d2d7]/60 flex items-center justify-between text-[11px] text-[#86868b]">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34c759]" />
              <span>TLS 1.3 • Encrypted Tokens</span>
            </div>
            <span className="font-mono text-[10px]">Multi-Tenant Auth</span>
          </div>

        </div>
      </div>
    </div>
  );
}
