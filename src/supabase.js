import { createClient } from '@supabase/supabase-js';
import { RAG_QUIZ_DATA } from './data/ragQuestions.js';

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
      // If default 6-digit quiz ID or legacy rag-mastery-2025, return default RAG template
      if (quizId === '202500' || quizId === 'rag-mastery-2025' || quizId === 'default' || !quizId) {
        return {
          id: '202500',
          title: RAG_QUIZ_DATA.title,
          description: RAG_QUIZ_DATA.description,
          timeLimitMinutes: RAG_QUIZ_DATA.timeLimitMinutes || 30,
          passingScore: RAG_QUIZ_DATA.passingScore || 70,
          passcodeHash: MASTER_PASSCODE_HASH_1,
          gameMode: 'classic',
          perQuestionSeconds: 30,
          questions: RAG_QUIZ_DATA.questions.map(q => ({
            ...q,
            type: q.type || 'single',
            points: q.points || 1000
          }))
        };
      }
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
      questions: row.breakdown || []
    };
  } catch (err) {
    console.warn('Quiz definition load error:', err);
    if (quizId === '202500' || quizId === 'rag-mastery-2025' || !quizId) {
      return {
        id: '202500',
        title: RAG_QUIZ_DATA.title,
        description: RAG_QUIZ_DATA.description,
        timeLimitMinutes: 30,
        passingScore: 70,
        passcodeHash: MASTER_PASSCODE_HASH_1,
        gameMode: 'classic',
        perQuestionSeconds: 30,
        questions: RAG_QUIZ_DATA.questions.map(q => ({ ...q, type: 'single', points: 1000 }))
      };
    }
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

  // Check existing quiz to verify passcode
  const existing = await getQuizDefinition(quizId);
  if (existing && existing.passcodeHash) {
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
          passcodeHash: enteredHash || MASTER_PASSCODE_HASH_1,
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
  
  if (!isMaster) {
    throw new Error('Unauthorized: Valid Instructor Passcode required to publish a session.');
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
          passcodeHash: enteredHash,
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

    const sessions = (data || []).map(row => {
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
        createdAt: row.created_at,
        submissionCount: stat.count,
        classAverage: avg,
        passRate: passPct
      };
    });

    // Ensure default 6-digit template 202500 is included if not in DB
    if (!sessions.some(s => s.sessionPin === '202500' || s.sessionPin === 'rag-mastery-2025')) {
      const defaultStat = statsMap['202500'] || statsMap['rag-mastery-2025'] || { count: 0, totalPct: 0, passedCount: 0 };
      sessions.unshift({
        sessionPin: '202500',
        title: 'Retrieval-Augmented Generation (RAG) Mastery Quiz',
        description: 'Comprehensive 20-question technical evaluation covering RAG architecture and paradigms.',
        gameMode: 'classic',
        perQuestionSeconds: 30,
        totalQuestions: 20,
        passingScore: 70,
        timeLimitMinutes: 30,
        createdAt: new Date().toISOString(),
        submissionCount: defaultStat.count,
        classAverage: defaultStat.count > 0 ? Math.round(defaultStat.totalPct / defaultStat.count) : 0,
        passRate: defaultStat.count > 0 ? Math.round((defaultStat.passedCount / defaultStat.count) * 100) : 0
      });
    }

    return sessions;
  } catch (err) {
    console.error('fetchTeacherSessions exception:', err);
    return [];
  }
}

// 4D. Delete a session and its submissions
export async function deleteTeacherSession(sessionPin, rawPasscode) {
  if (sessionPin === '202500' || sessionPin === 'rag-mastery-2025') {
    throw new Error('The default template session cannot be deleted.');
  }

  const auth = await verifyInstructorPasscode(sessionPin, rawPasscode);
  if (!auth.valid) {
    throw new Error('Unauthorized: Invalid Instructor Passcode');
  }

  const adminClient = getSupabaseAdminClient();
  const { error } = await adminClient
    .from('quiz_submissions')
    .delete()
    .eq('quiz_id', sessionPin);

  if (error) throw new Error(error.message);
  return { success: true };
}

// 5. Submit student quiz securely (Universal grading across any question type and points)
export async function submitStudentQuizUniversal(quizId, submissionData) {
  const adminClient = getSupabaseAdminClient();
  const { studentName, studentId, timeTakenSeconds, answers } = submissionData;

  // Retrieve official quiz definition from database
  const fullQuiz = await getQuizDefinition(quizId);
  const questions = fullQuiz.questions || [];

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
  const passed = percentage >= (fullQuiz.passingScore || 70);

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
        answers,
        breakdown
      }
    ])
    .select('id');

  if (error) {
    console.error('Submission write error:', error);
  }

  return {
    id: data?.[0]?.id,
    score: totalEarned,
    totalPossibleScore: totalPossible,
    totalQuestions: questions.length,
    percentage,
    passed,
    timeTakenSeconds,
    breakdown,
    studentName,
    studentId,
    quizId
  };
}

// 6. Verify Instructor Passcode with SHA-256 Hashing
export async function verifyInstructorPasscode(quizId, rawPasscode) {
  if (!rawPasscode || !rawPasscode.trim()) {
    return { valid: false, error: 'Passcode cannot be empty' };
  }

  const enteredHash = await sha256(rawPasscode);

  // Check master hashes first
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

  const formatted = (data || []).map(row => ({
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
    submittedAt: row.created_at ? new Date(row.created_at) : new Date()
  }));

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
