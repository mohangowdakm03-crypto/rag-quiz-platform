import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

/**
 * Format raw Firebase User into standardized Instructor Profile
 */
export function formatTeacherUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Instructor'),
    photoURL: user.photoURL || '',
    provider: user.providerData?.[0]?.providerId || 'email',
    isAnonymous: user.isAnonymous || false
  };
}

/**
 * 1. Google 1-Click Sign-In
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const teacher = formatTeacherUser(result.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('oxvane_teacher_auth', JSON.stringify(teacher));
      sessionStorage.setItem('rag_instructor_passcode', 'authenticated_user');
    }
    return { success: true, user: teacher };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    let msg = error.message;
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Sign-in window closed before completing.';
    } else if (error.code === 'auth/cancelled-popup-request') {
      msg = 'Sign-in request cancelled.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 2. Email & Password Sign-In
 */
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    const teacher = formatTeacherUser(result.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('oxvane_teacher_auth', JSON.stringify(teacher));
      sessionStorage.setItem('rag_instructor_passcode', 'authenticated_user');
    }
    return { success: true, user: teacher };
  } catch (error) {
    console.error('Email Sign-In Error:', error);
    let msg = 'Invalid email or password.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = 'Incorrect email or password. Please verify your credentials.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Access temporarily locked due to multiple failed attempts. Try resetting your password.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 3. Email & Password Sign-Up (New Teacher Registration)
 */
export async function registerWithEmail(email, password, displayName = '') {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() });
    }
    const teacher = formatTeacherUser(result.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('oxvane_teacher_auth', JSON.stringify(teacher));
      sessionStorage.setItem('rag_instructor_passcode', 'authenticated_user');
    }
    return { success: true, user: teacher };
  } catch (error) {
    console.error('Sign-Up Error:', error);
    let msg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      msg = 'An account with this email already exists. Please sign in instead.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 4. Password Recovery via Email Reset Link
 */
export async function sendPasswordRecoveryLink(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { 
      success: true, 
      message: '✓ Recovery link dispatched! Please check your inbox (and spam folder) to set a new password.' 
    };
  } catch (error) {
    console.error('Password Reset Error:', error);
    let msg = error.message;
    if (error.code === 'auth/user-not-found') {
      msg = 'No instructor account registered with this email.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 5. Initialize invisible Phone reCAPTCHA Verifier
 */
export function initPhoneRecaptcha(containerId = 'recaptcha-container') {
  try {
    if (typeof window !== 'undefined') {
      if (window.phoneRecaptchaVerifier) {
        window.phoneRecaptchaVerifier.clear();
      }
      window.phoneRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired');
        }
      });
      return window.phoneRecaptchaVerifier;
    }
    return null;
  } catch (err) {
    console.error('Recaptcha init error:', err);
    return null;
  }
}

/**
 * 6. Send SMS OTP to Mobile Phone Number
 */
export async function sendPhoneVerificationOtp(phoneNumber) {
  try {
    const verifier = initPhoneRecaptcha('recaptcha-container');
    if (!verifier) {
      throw new Error('Could not initialize verification engine. Please refresh the page.');
    }
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
    return { success: true, confirmationResult };
  } catch (error) {
    console.error('Phone OTP Send Error:', error);
    let msg = error.message;
    if (error.code === 'auth/invalid-phone-number') {
      msg = 'Invalid phone number format. Include country code (e.g. +91 9876543210).';
    } else if (error.code === 'auth/quota-exceeded') {
      msg = 'SMS quota temporarily exceeded. Please use Google Sign-In or Email.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 7. Confirm 6-Digit SMS OTP
 */
export async function confirmPhoneVerificationOtp(confirmationResult, otpCode) {
  try {
    const result = await confirmationResult.confirm(otpCode.trim());
    const teacher = formatTeacherUser(result.user);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('oxvane_teacher_auth', JSON.stringify(teacher));
      sessionStorage.setItem('rag_instructor_passcode', 'authenticated_user');
    }
    return { success: true, user: teacher };
  } catch (error) {
    console.error('Confirm OTP Error:', error);
    let msg = 'Invalid or expired OTP code. Please try again.';
    if (error.code === 'auth/code-expired') {
      msg = 'This OTP has expired. Please request a new one.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 8. Sign Out Teacher
 */
export async function logoutTeacher() {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('oxvane_teacher_auth');
    sessionStorage.removeItem('rag_instructor_passcode');
    sessionStorage.removeItem('rag_instructor_passcode_hash');
  }
}

/**
 * 9. Real-time Auth State Subscription (100% Genuine Firebase Auth)
 */
export function subscribeToTeacherAuth(onTeacherChanged) {
  return onAuthStateChanged(auth, async (user) => {
    if (user && !user.isAnonymous) {
      const teacher = formatTeacherUser(user);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('oxvane_teacher_auth', JSON.stringify(teacher));
        sessionStorage.setItem('rag_instructor_passcode', 'authenticated_user');
      }
      onTeacherChanged(teacher);
    } else {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('oxvane_teacher_auth');
        sessionStorage.removeItem('rag_instructor_passcode');
        sessionStorage.removeItem('rag_instructor_passcode_hash');
      }
      onTeacherChanged(null);
    }
  });
}

/**
 * 10. Check if Current Session is Truly Authenticated
 */
export async function isTeacherAuthorized() {
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return { authorized: true, user: formatTeacherUser(auth.currentUser) };
  }
  return { authorized: false, user: null };
}
