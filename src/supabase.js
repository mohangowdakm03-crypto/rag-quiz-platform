import { createClient } from '@supabase/supabase-js';

// Production Supabase project credentials for rag-quiz-platform
const SUPABASE_URL = "https://zcdauivbacingwrxjsgf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZGF1aXZiYWNpbmd3cnhqc2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMTQxOTcsImV4cCI6MjExMDU5MDE5N30.qmjWYwvd8jtIfPltpDmVcq1tnDtZ1uFwqYycI4kT-9o";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZGF1aXZiYWNpbmd3cnhqc2dmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NTAxNDE5NywiZXhwIjoyMTEwNTkwMTk3fQ.JB808x_mE3enNoVC5odxLjNqZ19z-6fr0-aUsabARvk";

// Master Passcode SHA-256 Hashes
export const MASTER_PASSCODE_HASH_1 = "a5e4b3dc5b49f5f98cbea51223c5b4f52f26d4a34f0cfbf18f6d3658d0947504"; // 'rag-instructor-2025'
export const MASTER_PASSCODE_HASH_2 = "b01b65e7219979bc29f8e09e05c1946b3935360f147b0f30594333d156a82987"; // 'teacher@rag2025'

// SHA-256 hashing helper using Web Crypto API
export async function sha256(message) {
  if (!message) return '';
  const msgBuffer = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let clientInstance = null;
let adminClientInstance = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
  }
  return clientInstance;
}

export function getSupabaseAdminClient() {
  if (!adminClientInstance) {
    adminClientInstance = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });
  }
  return adminClientInstance;
}

// 1. Participant presence & live progress
export async function joinQuizRoom(quizId, studentName, studentId = '') {
  const client = getSupabaseClient();
  try {
    const { data } = await client
      .from('quiz_participants')
      .insert([
        {
          quiz_id: quizId,
          student_name: studentName,
          student_id: studentId || 'N/A',
          status: 'in-progress'
        }
      ])
      .select('id');
    return data?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function updateParticipantProgress(participantId, statusText) {
  if (!participantId) return;
  const client = getSupabaseClient();
  try {
    await client
      .from('quiz_participants')
      .update({ status: statusText })
      .eq('id', participantId);
  } catch {
    // ignore
  }
}

// 1B. Fetch all joined participants for classroom presentation view
export async function fetchQuizParticipants(quizId) {
  const client = getSupabaseAdminClient();
  try {
    const { data, error } = await client
      .from('quiz_participants')
      .select('id, student_name, student_id, status, created_at')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('fetchQuizParticipants error:', error);
      return [];
    }
    return (data || []).map(p => ({
      id: p.id,
      studentName: p.student_name,
      studentId: p.student_id,
      status: p.status,
      joinedAt: p.created_at ? new Date(p.created_at) : new Date()
    }));
  } catch (err) {
    console.warn('fetchQuizParticipants exception:', err);
    return [];
  }
}

// 1C. Real-time participant join subscription (Supabase Realtime + Polling fallback)
export function subscribeToParticipants(quizId, onParticipantsChange) {
  let isSubscribed = true;

  const load = async () => {
    if (!isSubscribed) return;
    const participants = await fetchQuizParticipants(quizId);
    if (isSubscribed && onParticipantsChange) {
      onParticipantsChange(participants);
    }
  };

  // Immediate initial load
  load();

  // Poll every 2.5 seconds to guarantee 100% reliable updates on projectors
  const pollTimer = setInterval(load, 2500);

  // Subscribe to Supabase Realtime channel for instant push events
  let channel = null;
  try {
    const client = getSupabaseClient();
    channel = client
      .channel(`participants-${quizId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_participants', filter: `quiz_id=eq.${quizId}` },
        () => {
          if (isSubscribed) load();
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription note:', err);
  }

  return () => {
    isSubscribed = false;
    clearInterval(pollTimer);
    if (channel) {
      try {
        const client = getSupabaseClient();
        client.removeChannel(channel);
      } catch {
        // ignore
      }
    }
  };
}

// 2. Fetch full quiz definition from Supabase (including answer key & settings)
export async function getQuizDefinition(quizId) {
  const adminClient = getSupabaseAdminClient();
  try {
    const { data, error } = await adminClient
      .from('quiz_submissions')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_name', '__QUIZ_DEFINITION__')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    const answers = row.answers || {};
    return {
      id: row.quiz_id,
      title: answers.title || 'Custom Quiz',
      description: answers.description || '',
      timeLimitMinutes: answers.timeLimitMinutes || 30,
      passingScore: answers.passingScore || 70,
      passcodeHash: answers.passcodeHash || MASTER_PASSCODE_HASH_1,
      gameMode: answers.gameMode || 'classic',
      perQuestionSeconds: answers.perQuestionSeconds || 30,
      sessionPin: answers.sessionPin || row.quiz_id,
      showScore: answers.showScore === true,
      showItemAnalysis: answers.showItemAnalysis === true,
      allowRetake: answers.allowRetake === true,
      showRank: answers.showRank === true,
      oneAttemptPerDevice: answers.oneAttemptPerDevice !== false,
      antiCheatEnabled: answers.antiCheatEnabled !== false,
      strictAutoSubmit: answers.strictAutoSubmit !== false,
      maxTabSwitches: Number(answers.maxTabSwitches || 3),
      shuffleQuestions: answers.shuffleQuestions === true,
      sheetsWebhookUrl: answers.sheetsWebhookUrl || '',
      questions: row.breakdown || []
    };
  } catch (err) {
    console.warn('Quiz definition load error:', err);
    return null;
  }
}

// 3. Fetch sanitized quiz definition for students (STRIPS answers & explanations)
export async function getStudentQuizDefinition(quizId) {
  const fullQuiz = await getQuizDefinition(quizId);
  if (!fullQuiz) return null;

  return {
    id: fullQuiz.id,
    title: fullQuiz.title,
    description: fullQuiz.description,
    timeLimitMinutes: fullQuiz.timeLimitMinutes,
    passingScore: fullQuiz.passingScore,
    gameMode: fullQuiz.gameMode || 'classic',
    perQuestionSeconds: fullQuiz.perQuestionSeconds || 30,
    sessionPin: fullQuiz.sessionPin || fullQuiz.id,
    showScore: fullQuiz.showScore === true,
    showItemAnalysis: fullQuiz.showItemAnalysis === true,
    allowRetake: fullQuiz.allowRetake === true,
    showRank: fullQuiz.showRank === true,
    oneAttemptPerDevice: fullQuiz.oneAttemptPerDevice !== false,
    antiCheatEnabled: fullQuiz.antiCheatEnabled !== false,
    strictAutoSubmit: fullQuiz.strictAutoSubmit !== false,
    maxTabSwitches: fullQuiz.maxTabSwitches || 3,
    shuffleQuestions: fullQuiz.shuffleQuestions === true,
    totalQuestions: fullQuiz.questions.length,
    questions: fullQuiz.questions.map(q => ({
      id: q.id,
      type: q.type || 'single',
      category: q.category || 'General',
      difficulty: q.difficulty || 'Intermediate',
      question: q.question,
      options: q.options || [],
      points: q.points || 1000
    }))
  };
}

// 4. Save or Update existing quiz definition (Custom Kahoot Studio)
export async function saveQuizDefinition(quizId, quizData, instructorPasscode) {
  const adminClient = getSupabaseAdminClient();
  const enteredHash = await sha256(instructorPasscode);
  const isAuthUser = instructorPasscode === 'authenticated_user';

  // Check existing quiz to verify passcode
  const existing = await getQuizDefinition(quizId);
  if (existing && existing.passcodeHash && !isAuthUser) {
    const isMaster = enteredHash === MASTER_PASSCODE_HASH_1 || enteredHash === MASTER_PASSCODE_HASH_2;
    const isQuizPass = enteredHash === existing.passcodeHash;
    if (!isMaster && !isQuizPass) {
      throw new Error('Unauthorized: Incorrect Instructor Passcode Hash');
    }
  }

  // Remove existing definition record for this quiz
  await adminClient
    .from('quiz_submissions')
    .delete()
    .eq('quiz_id', quizId)
    .eq('student_name', '__QUIZ_DEFINITION__');

  // Insert updated definition
  const { data, error } = await adminClient
    .from('quiz_submissions')
    .insert([
      {
        quiz_id: quizId,
        student_name: '__QUIZ_DEFINITION__',
        student_id: 'SYSTEM',
        score: quizData.questions.reduce((acc, q) => acc + (q.points || 1000), 0),
        total_questions: quizData.questions.length,
        percentage: 100,
        passed: true,
        answers: {
          sessionPin: quizId,
          title: quizData.title,
          description: quizData.description || '',
          timeLimitMinutes: quizData.timeLimitMinutes || 30,
          passingScore: quizData.passingScore || 70,
          gameMode: quizData.gameMode || 'classic',
          perQuestionSeconds: quizData.perQuestionSeconds || 30,
          showScore: quizData.showScore === true,
          showItemAnalysis: quizData.showItemAnalysis === true,
          allowRetake: quizData.allowRetake === true,
          showRank: quizData.showRank === true,
          oneAttemptPerDevice: quizData.oneAttemptPerDevice !== false,
          antiCheatEnabled: quizData.antiCheatEnabled !== false,
          strictAutoSubmit: quizData.strictAutoSubmit !== false,
          maxTabSwitches: Number(quizData.maxTabSwitches || 3),
          shuffleQuestions: quizData.shuffleQuestions === true,
          sheetsWebhookUrl: quizData.sheetsWebhookUrl || '',
          instructorId: quizData.instructorId || existing?.instructorId || '',
          instructorEmail: quizData.instructorEmail || existing?.instructorEmail || '',
          instructorName: quizData.instructorName || existing?.instructorName || '',
          passcodeHash: isAuthUser ? (existing?.passcodeHash || 'auth_user') : (enteredHash || MASTER_PASSCODE_HASH_1),
          updatedAt: new Date().toISOString()
        },
        breakdown: quizData.questions
      }
    ])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, id: data?.[0]?.id };
}

// 4B. Publish a Brand-New Quiz Session with unique 6-digit PIN and mode
export async function publishQuizSession(quizData, instructorPasscode, options = {}) {
  const adminClient = getSupabaseAdminClient();
  const enteredHash = await sha256(instructorPasscode);
  const isMaster = enteredHash === MASTER_PASSCODE_HASH_1 || enteredHash === MASTER_PASSCODE_HASH_2;
  const isAuthUser = instructorPasscode === 'authenticated_user';
  
  if (!isMaster && !isAuthUser) {
    throw new Error('Unauthorized: Valid Instructor Passcode or Logged-in Teacher required to publish a session.');
  }

  // Generate unique 6-digit PIN (e.g. 582914) or use custom code
  let sessionPin = options.customPin?.trim();
  if (!sessionPin) {
    sessionPin = Math.floor(100000 + Math.random() * 900000).toString();
  }

  const gameMode = options.gameMode || quizData.gameMode || 'classic';
  const perQuestionSeconds = Number(options.perQuestionSeconds || quizData.perQuestionSeconds || 30);
  const timeLimitMinutes = Number(quizData.timeLimitMinutes || 30);
  const passingScore = Number(quizData.passingScore || 70);
  const showScore = options.showScore ?? quizData.showScore ?? false;
  const showItemAnalysis = options.showItemAnalysis ?? quizData.showItemAnalysis ?? false;
  const allowRetake = options.allowRetake ?? quizData.allowRetake ?? false;
  const showRank = options.showRank ?? quizData.showRank ?? false;
  const oneAttemptPerDevice = options.oneAttemptPerDevice ?? quizData.oneAttemptPerDevice ?? true;
  const antiCheatEnabled = options.antiCheatEnabled ?? quizData.antiCheatEnabled ?? true;
  const strictAutoSubmit = options.strictAutoSubmit ?? quizData.strictAutoSubmit ?? true;
  const maxTabSwitches = Number(options.maxTabSwitches || quizData.maxTabSwitches || 3);
  const shuffleQuestions = options.shuffleQuestions ?? quizData.shuffleQuestions ?? false;

  // Insert fresh session definition
  const { data, error } = await adminClient
    .from('quiz_submissions')
    .insert([
      {
        quiz_id: sessionPin,
        student_name: '__QUIZ_DEFINITION__',
        student_id: 'SYSTEM',
        score: (quizData.questions || []).reduce((acc, q) => acc + (q.points || 1000), 0),
        total_questions: (quizData.questions || []).length,
        percentage: 100,
        passed: true,
        answers: {
          sessionPin,
          title: quizData.title || 'Interactive Quiz Session',
          description: quizData.description || '',
          timeLimitMinutes,
          passingScore,
          gameMode,
          perQuestionSeconds,
          showScore,
          showItemAnalysis,
          allowRetake,
          showRank,
          oneAttemptPerDevice,
          antiCheatEnabled,
          strictAutoSubmit,
          maxTabSwitches,
          shuffleQuestions,
          sheetsWebhookUrl: options.sheetsWebhookUrl || quizData.sheetsWebhookUrl || '',
          instructorId: options.instructorId || quizData.instructorId || '',
          instructorEmail: options.instructorEmail || quizData.instructorEmail || '',
          instructorName: options.instructorName || quizData.instructorName || '',
          passcodeHash: isAuthUser ? 'auth_user' : enteredHash,
          publishedAt: new Date().toISOString()
        },
        breakdown: quizData.questions || []
      }
    ])
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    sessionPin,
    gameMode,
    perQuestionSeconds,
    showScore,
    showItemAnalysis,
    allowRetake,
    showRank,
    oneAttemptPerDevice,
    antiCheatEnabled,
    strictAutoSubmit,
    maxTabSwitches,
    sheetsWebhookUrl: options.sheetsWebhookUrl || quizData.sheetsWebhookUrl || '',
    id: data?.[0]?.id
  };
}

// 4C. Fetch all available teacher sessions with real-time stats
export async function fetchTeacherSessions() {
  const adminClient = getSupabaseAdminClient();
  try {
    const [{ data, error }, { data: subsData }] = await Promise.all([
      adminClient
        .from('quiz_submissions')
        .select('quiz_id, created_at, answers, breakdown, total_questions')
        .eq('student_name', '__QUIZ_DEFINITION__')
        .order('created_at', { ascending: false }),
      adminClient
        .from('quiz_submissions')
        .select('quiz_id, score, percentage, passed')
        .neq('student_name', '__QUIZ_DEFINITION__')
    ]);

    if (error) {
      console.error('fetchTeacherSessions error:', error);
      return [];
    }

    // Build stats map per session PIN
    const statsMap = {};
    (subsData || []).forEach(s => {
      if (!statsMap[s.quiz_id]) {
        statsMap[s.quiz_id] = { count: 0, totalPct: 0, passedCount: 0 };
      }
      statsMap[s.quiz_id].count++;
      statsMap[s.quiz_id].totalPct += (s.percentage || 0);
      if (s.passed) statsMap[s.quiz_id].passedCount++;
    });

    const sessions = (data || [])
      .filter(row => row.quiz_id !== 'rag-mastery-2025' && row.quiz_id !== '202500')
      .map(row => {
        const ans = row.answers || {};
        const stat = statsMap[row.quiz_id] || { count: 0, totalPct: 0, passedCount: 0 };
        const avg = stat.count > 0 ? Math.round(stat.totalPct / stat.count) : 0;
        const passPct = stat.count > 0 ? Math.round((stat.passedCount / stat.count) * 100) : 0;

        return {
          sessionPin: row.quiz_id,
          title: ans.title || 'Quiz Session',
          description: ans.description || '',
          gameMode: ans.gameMode || 'classic',
          perQuestionSeconds: ans.perQuestionSeconds || 30,
          totalQuestions: row.breakdown?.length || row.total_questions || 20,
          passingScore: ans.passingScore || 70,
          timeLimitMinutes: ans.timeLimitMinutes || 30,
          showScore: ans.showScore === true,
          showItemAnalysis: ans.showItemAnalysis === true,
          allowRetake: ans.allowRetake === true,
          showRank: ans.showRank === true,
          oneAttemptPerDevice: ans.oneAttemptPerDevice !== false,
          antiCheatEnabled: ans.antiCheatEnabled !== false,
          strictAutoSubmit: ans.strictAutoSubmit !== false,
          maxTabSwitches: Number(ans.maxTabSwitches || 3),
          sheetsWebhookUrl: ans.sheetsWebhookUrl || '',
          instructorId: ans.instructorId || '',
          instructorEmail: ans.instructorEmail || '',
          instructorName: ans.instructorName || '',
          createdAt: row.created_at,
          submissionCount: stat.count,
          classAverage: avg,
          passRate: passPct
        };
      });

    return sessions;
  } catch (err) {
    console.error('fetchTeacherSessions exception:', err);
    return [];
  }
}

// 4D. Delete a session and its submissions
export async function deleteTeacherSession(sessionPin, rawPasscode) {
  const auth = await verifyInstructorPasscode(sessionPin, rawPasscode);
  if (!auth.valid) {
    throw new Error('Unauthorized: Invalid Instructor Passcode');
  }

  const adminClient = getSupabaseAdminClient();
  
  // Clean up participants table if present
  try {
    await adminClient
      .from('quiz_participants')
      .delete()
      .eq('quiz_id', sessionPin);
  } catch (pErr) {
    console.warn('Participant cleanup note:', pErr);
  }

  // Delete all quiz submissions (including definition and student entries)
  const { error } = await adminClient
    .from('quiz_submissions')
    .delete()
    .eq('quiz_id', sessionPin);

  if (error) throw new Error(error.message);
  return { success: true };
}

// 4E. Re-host a Quiz Session with a brand-new 6-digit PIN
export async function rehostQuizSession(sourcePin, rawPasscode) {
  const def = await getQuizDefinition(sourcePin);
  if (!def) {
    throw new Error(`Unable to load quiz configuration for session ${sourcePin}.`);
  }

  // Publish a brand new session with exact same questions and rules
  return publishQuizSession({
    title: def.title,
    description: def.description,
    timeLimitMinutes: def.timeLimitMinutes,
    passingScore: def.passingScore,
    gameMode: def.gameMode,
    perQuestionSeconds: def.perQuestionSeconds,
    showScore: def.showScore,
    showItemAnalysis: def.showItemAnalysis,
    allowRetake: def.allowRetake,
    showRank: def.showRank,
    oneAttemptPerDevice: def.oneAttemptPerDevice,
    antiCheatEnabled: def.antiCheatEnabled,
    strictAutoSubmit: def.strictAutoSubmit,
    maxTabSwitches: def.maxTabSwitches,
    questions: def.questions
  }, rawPasscode);
}

// Device UID & Single Attempt Local Helpers
export function getOrCreateDeviceUid() {
  const KEY = 'oxvane_device_uid';
  try {
    let uid = localStorage.getItem(KEY);
    if (!uid) {
      uid = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem(KEY, uid);
    }
    return uid;
  } catch {
    return 'dev_' + Math.random().toString(36).substring(2, 10);
  }
}

export function isDeviceAttemptCompleted(quizId) {
  try {
    return localStorage.getItem(`oxvane_submitted_${quizId}`) === 'true';
  } catch {
    return false;
  }
}

export function markDeviceAttemptCompleted(quizId, studentId) {
  try {
    localStorage.setItem(`oxvane_submitted_${quizId}`, 'true');
    localStorage.setItem(`oxvane_attempt_${quizId}_${(studentId || '').trim().toUpperCase()}`, new Date().toISOString());
  } catch {
    // ignore
  }
}

// 5. Submit student quiz securely (Universal grading across any question type and points)
export async function submitStudentQuizUniversal(quizId, submissionData) {
  const adminClient = getSupabaseAdminClient();
  const { 
    studentName, 
    studentId, 
    timeTakenSeconds, 
    answers,
    flaggedCount = 0,
    answeredCount,
    deviceUid = '',
    tabSwitches = 0,
    screenshotAttempts = 0,
    violationsLog = []
  } = submissionData;

  // Retrieve official quiz definition from database
  const fullQuiz = await getQuizDefinition(quizId);
  const questions = fullQuiz?.questions || [];

  let totalEarned = 0;
  let totalPossible = 0;

  const breakdown = questions.map((q) => {
    const type = q.type || 'single';
    const points = typeof q.points === 'number' ? q.points : 1000;
    totalPossible += points;

    const studentChoice = answers[q.id];
    let isCorrect = false;

    if (studentChoice !== undefined && studentChoice !== null) {
      if (type === 'single' || type === 'boolean') {
        isCorrect = Number(studentChoice) === Number(q.correctAnswer);
      } else if (type === 'multi') {
        const studentArr = Array.isArray(studentChoice) ? [...studentChoice].sort() : [studentChoice];
        const correctArr = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort() : [q.correctAnswer];
        isCorrect = JSON.stringify(studentArr) === JSON.stringify(correctArr);
      } else if (type === 'text') {
        const studentStr = String(studentChoice).trim().toLowerCase();
        if (Array.isArray(q.correctAnswer)) {
          isCorrect = q.correctAnswer.some(ans => String(ans).trim().toLowerCase() === studentStr);
        } else {
          isCorrect = studentStr === String(q.correctAnswer).trim().toLowerCase();
        }
      }
    }

    const earnedPoints = isCorrect ? points : 0;
    totalEarned += earnedPoints;

    return {
      questionId: q.id,
      type,
      category: q.category || 'General',
      difficulty: q.difficulty || 'Intermediate',
      question: q.question,
      options: q.options || [],
      studentChoice: studentChoice !== undefined ? studentChoice : null,
      correctAnswer: q.correctAnswer,
      isCorrect,
      earnedPoints,
      maxPoints: points,
      explanation: q.explanation || ''
    };
  });

  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  const passed = percentage >= (fullQuiz?.passingScore || 70);

  // Compute Academic Integrity Status
  const integrityStatus = (Number(tabSwitches || 0) >= (fullQuiz?.maxTabSwitches || 3) || Number(screenshotAttempts || 0) > 0)
    ? 'Flagged'
    : (Number(tabSwitches || 0) > 0 ? 'Warning' : 'Clean');

  // Package answers payload with proctoring telemetry
  const proctoredAnswers = {
    ...answers,
    _deviceUid: deviceUid,
    _tabSwitches: Number(tabSwitches || 0),
    _screenshotAttempts: Number(screenshotAttempts || 0),
    _violationsLog: violationsLog || [],
    _integrityStatus: integrityStatus
  };

  // Write verified record into database
  const { data, error } = await adminClient
    .from('quiz_submissions')
    .insert([
      {
        quiz_id: quizId,
        student_name: studentName.trim(),
        student_id: studentId?.trim() || 'N/A',
        score: totalEarned,
        total_questions: questions.length,
        percentage,
        passed,
        time_taken_seconds: timeTakenSeconds || 0,
        answers: proctoredAnswers,
        breakdown
      }
    ])
    .select('id');

  if (error) {
    console.error('Submission write error:', error);
  }

  // Mark local device attempt completed
  markDeviceAttemptCompleted(quizId, studentId);

  // Automated Direct Google Sheets Live Webhook Sync (Zero-click row append on submit)
  const webhookUrl = fullQuiz?.sheetsWebhookUrl || 
    (typeof localStorage !== 'undefined' ? (localStorage.getItem(`sheets_webhook_${quizId}`) || localStorage.getItem('oxvane_global_sheets_webhook')) : '');

  if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim().startsWith('http')) {
    try {
      fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          sessionPin: quizId,
          sessionTitle: fullQuiz?.title || 'Quiz Session',
          studentName: studentName.trim(),
          studentId: studentId?.trim() || 'N/A',
          score: totalEarned,
          totalPossible: totalPossible,
          percentage,
          passed,
          timeTakenSeconds: timeTakenSeconds || 0,
          integrityStatus,
          tabSwitches: Number(tabSwitches || 0),
          screenshotAttempts: Number(screenshotAttempts || 0),
          submittedAt: new Date().toISOString()
        })
      }).catch(sheetErr => {
        console.warn('Google Sheets live row append note:', sheetErr);
      });
    } catch (sheetSyncErr) {
      console.warn('Google Sheets live sync error:', sheetSyncErr);
    }
  }

  const answeredTotal = answeredCount !== undefined 
    ? answeredCount 
    : Object.keys(answers || {}).filter(k => !k.startsWith('_') && answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length;

  const isShowScore = fullQuiz?.showScore === true;
  const isShowItemAnalysis = fullQuiz?.showItemAnalysis === true;
  const isAllowRetake = fullQuiz?.allowRetake === true;
  const isShowRank = fullQuiz?.showRank === true;

  return {
    id: data?.[0]?.id,
    studentName: studentName.trim(),
    studentId: studentId?.trim() || 'N/A',
    quizId,
    totalQuestions: questions.length,
    answeredCount: answeredTotal,
    unansweredCount: Math.max(0, questions.length - answeredTotal),
    flaggedCount: flaggedCount || 0,
    timeTakenSeconds: timeTakenSeconds || 0,
    submittedAt: new Date().toISOString(),
    // Teacher post-exam permissions:
    showScore: isShowScore,
    showItemAnalysis: isShowItemAnalysis,
    allowRetake: isAllowRetake,
    showRank: isShowRank,
    // Integrity metrics
    tabSwitches: Number(tabSwitches || 0),
    screenshotAttempts: Number(screenshotAttempts || 0),
    integrityStatus,
    // Sensitive performance metrics sent ONLY if permitted by instructor:
    score: isShowScore ? totalEarned : null,
    totalPossibleScore: isShowScore ? totalPossible : null,
    percentage: isShowScore ? percentage : null,
    passed: isShowScore ? passed : null,
    breakdown: isShowItemAnalysis ? breakdown : []
  };
}

// 5B. Check if a student USN or device has already submitted to this quiz session (Google Forms style)
export async function checkStudentOrDeviceAlreadySubmitted(quizId, studentId, deviceUid) {
  if (!quizId) return { alreadySubmitted: false };

  // 1. Check local device storage first
  if (isDeviceAttemptCompleted(quizId)) {
    return {
      alreadySubmitted: true,
      reason: 'device',
      message: 'This device has already submitted this examination. Only 1 attempt per device is permitted.'
    };
  }

  const adminClient = getSupabaseAdminClient();
  try {
    const { data, error } = await adminClient
      .from('quiz_submissions')
      .select('id, student_id, answers')
      .eq('quiz_id', quizId)
      .neq('student_name', '__QUIZ_DEFINITION__');

    if (error || !data) return { alreadySubmitted: false };

    const targetUsn = (studentId || '').trim().toUpperCase();
    const targetDev = (deviceUid || '').trim();

    for (const sub of data) {
      // Check USN (case-insensitive)
      if (targetUsn && (sub.student_id || '').trim().toUpperCase() === targetUsn) {
        return {
          alreadySubmitted: true,
          reason: 'usn',
          message: `Candidate USN (${studentId}) has already submitted this examination. Only 1 attempt is permitted.`
        };
      }

      // Check deviceUid in answers
      const subDev = sub.answers?._deviceUid;
      if (targetDev && subDev && subDev === targetDev) {
        return {
          alreadySubmitted: true,
          reason: 'device',
          message: 'This device has already submitted this examination. Only 1 attempt per device is permitted.'
        };
      }
    }

    return { alreadySubmitted: false };
  } catch (err) {
    console.warn('checkStudentOrDeviceAlreadySubmitted error:', err);
    return { alreadySubmitted: false };
  }
}

// Legacy fallback helper for backwards compatibility
export async function checkStudentAlreadySubmitted(quizId, studentId) {
  const res = await checkStudentOrDeviceAlreadySubmitted(quizId, studentId);
  return res.alreadySubmitted;
}

// 6. Verify Instructor Passcode with SHA-256 Hashing
export async function verifyInstructorPasscode(quizId, rawPasscode) {
  if (!rawPasscode || !rawPasscode.trim()) {
    return { valid: false, error: 'Passcode cannot be empty' };
  }

  const enteredHash = await sha256(rawPasscode);

  // Check authenticated teacher user or master hashes first
  if (rawPasscode === 'authenticated_user') {
    return { valid: true, hash: 'auth_user' };
  }

  if (enteredHash === MASTER_PASSCODE_HASH_1 || enteredHash === MASTER_PASSCODE_HASH_2) {
    return { valid: true, hash: enteredHash };
  }

  // Check custom quiz hash in database
  const quizDef = await getQuizDefinition(quizId);
  if (quizDef && quizDef.passcodeHash && enteredHash === quizDef.passcodeHash) {
    return { valid: true, hash: enteredHash };
  }

  return { valid: false, error: 'Invalid instructor passcode hash' };
}

// 7. Fetch submissions for instructor (Protected by SHA-256 Passcode)
export async function fetchTeacherSubmissions(quizId, rawPasscode) {
  const authRes = await verifyInstructorPasscode(quizId, rawPasscode);
  if (!authRes.valid) {
    return { success: false, data: [], error: 'Unauthorized: Invalid Instructor Passcode Hash' };
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from('quiz_submissions')
    .select('*')
    .eq('quiz_id', quizId)
    .neq('student_name', '__QUIZ_DEFINITION__')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, data: [], error: error.message };
  }

  const formatted = (data || []).map(row => {
    const ans = row.answers || {};
    const tabSwitches = Number(ans._tabSwitches || 0);
    const screenshotAttempts = Number(ans._screenshotAttempts || 0);
    const integrityStatus = ans._integrityStatus || ((tabSwitches >= 3 || screenshotAttempts > 0) ? 'Flagged' : (tabSwitches > 0 ? 'Warning' : 'Clean'));

    return {
      id: row.id,
      studentName: row.student_name,
      studentId: row.student_id,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: row.percentage,
      passed: row.passed,
      timeTakenSeconds: row.time_taken_seconds,
      answers: row.answers,
      breakdown: row.breakdown,
      submittedAt: row.created_at ? new Date(row.created_at) : new Date(),
      // Proctoring & Academic Integrity:
      deviceUid: ans._deviceUid || '',
      tabSwitches,
      screenshotAttempts,
      violationsLog: ans._violationsLog || [],
      integrityStatus
    };
  });

  return { success: true, data: formatted, error: null };
}

// 8. Real-time subscription / polling for Instructor Dashboard
export function subscribeToTeacherData(quizId, rawPasscode, onSubmissions) {
  let isSubscribed = true;

  const refreshData = async () => {
    if (!isSubscribed) return;
    const res = await fetchTeacherSubmissions(quizId, rawPasscode);
    if (res.success && onSubmissions) {
      onSubmissions(res.data);
    }
  };

  // Immediate load
  refreshData();

  // Poll every 4 seconds
  const timerId = setInterval(refreshData, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(timerId);
  };
}

// 9. Diagnostic Ping to verify Google Sheets Webhook Connectivity
export async function testGoogleSheetsWebhook(webhookUrl, sessionPin = 'TEST-PIN', sessionTitle = 'Diagnostic Test') {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    throw new Error('Please enter a valid Google Apps Script Web App URL starting with https://');
  }

  const payload = {
    sessionPin,
    sessionTitle,
    studentName: 'Diagnostic Ping (Oxvane)',
    studentId: 'TEST-001',
    score: 1000,
    totalPossible: 1000,
    percentage: 100,
    passed: true,
    timeTakenSeconds: 42,
    integrityStatus: 'Clean',
    tabSwitches: 0,
    screenshotAttempts: 0,
    submittedAt: new Date().toISOString(),
    isTest: true
  };

  await fetch(webhookUrl.trim(), {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return { success: true };
}
