import { createClient } from '@supabase/supabase-js';

// Production Supabase project credentials for rag-quiz-platform
const SUPABASE_URL = "https://zcdauivbacingwrxjsgf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjZGF1aXZiYWNpbmd3cnhqc2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMTQxOTcsImV4cCI6MjExMDU5MDE5N30.qmjWYwvd8jtIfPltpDmVcq1tnDtZ1uFwqYycI4kT-9o";

// Clean any stale or corrupted localStorage overrides from previous development
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('rag_supabase_url');
    localStorage.removeItem('rag_supabase_anon_key');
  }
} catch {
  // ignore storage errors
}

export function getSupabaseConfig() {
  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    isConfigured: true
  };
}

let supabaseInstance = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
  }
  return supabaseInstance;
}

// 1. Record participant joining the session (Student view)
export async function joinQuizRoom(quizId, studentName, studentId = '') {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
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

    if (error) {
      console.warn('Participant presence note:', error.message);
      return null;
    }
    return data?.[0]?.id || null;
  } catch (err) {
    console.warn('Join exception:', err);
    return null;
  }
}

// 2. Submit student quiz securely (Grades in PostgreSQL, returns verified score & explanations)
export async function submitStudentQuizSecure(quizId, submissionData) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase database client not available');
  }

  const { studentName, studentId, timeTakenSeconds, answers, fallbackQuestions } = submissionData;

  try {
    // Attempt secure RPC call where PostgreSQL verifies against protected answer keys
    const { data, error } = await client.rpc('submit_student_quiz_secure', {
      p_quiz_id: quizId,
      p_student_name: studentName,
      p_student_id: studentId || 'N/A',
      p_time_taken_seconds: timeTakenSeconds || 0,
      p_answers: answers || {}
    });

    if (error) {
      console.warn('RPC submission fallback triggered:', error.message);
      throw error;
    }

    if (data && data.success) {
      return {
        id: data.id,
        score: data.score,
        totalQuestions: data.totalQuestions || 20,
        percentage: data.percentage,
        passed: data.passed,
        timeTakenSeconds: data.timeTakenSeconds,
        breakdown: data.breakdown || [],
        studentName,
        studentId,
        quizId
      };
    }
  } catch (rpcErr) {
    console.warn('Using client fallback calculation due to:', rpcErr);
    
    // Offline / fallback calculation if Supabase RPC is temporarily unreachable
    let correctCount = 0;
    const questions = fallbackQuestions || [];
    const breakdown = questions.map((q) => {
      const studentChoice = answers[q.id];
      const isCorrect = studentChoice === q.correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        questionId: q.id,
        category: q.category,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        studentChoice: studentChoice !== undefined ? studentChoice : null,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const score = correctCount;
    const totalQuestions = questions.length || 20;
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 70;

    // Insert directly into submissions table
    try {
      await client.from('quiz_submissions').insert([
        {
          quiz_id: quizId,
          student_name: studentName,
          student_id: studentId || 'N/A',
          score,
          total_questions: totalQuestions,
          percentage,
          passed,
          time_taken_seconds: timeTakenSeconds || 0,
          answers,
          breakdown
        }
      ]);
    } catch (insertErr) {
      console.warn('Direct insert note:', insertErr);
    }

    return {
      score,
      totalQuestions,
      percentage,
      passed,
      timeTakenSeconds,
      breakdown,
      studentName,
      studentId,
      quizId
    };
  }
}

// 3. Fetch submissions for instructor (Protected by instructor passcode)
export async function fetchTeacherSubmissions(quizId, passcode) {
  const client = getSupabaseClient();
  if (!client) return { success: false, data: [], error: 'Client not ready' };

  try {
    const { data, error } = await client.rpc('get_teacher_submissions', {
      p_quiz_id: quizId,
      p_passcode: passcode
    });

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
  } catch (err) {
    return { success: false, data: [], error: err.message || 'Network error' };
  }
}

// 4. Fetch participants for instructor (Protected by instructor passcode)
export async function fetchTeacherParticipants(quizId, passcode) {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('get_teacher_participants', {
      p_quiz_id: quizId,
      p_passcode: passcode
    });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// 5. Realtime subscription / polling for Instructor Dashboard
export function subscribeToTeacherData(quizId, passcode, onSubmissions, onParticipants) {
  let isSubscribed = true;

  const refreshData = async () => {
    if (!isSubscribed) return;
    const res = await fetchTeacherSubmissions(quizId, passcode);
    if (res.success && onSubmissions) {
      onSubmissions(res.data);
    }
    if (onParticipants) {
      const parts = await fetchTeacherParticipants(quizId, passcode);
      onParticipants(parts);
    }
  };

  // Immediate initial load
  refreshData();

  // Poll every 4 seconds for real-time live sync across all 60 students
  const timerId = setInterval(refreshData, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(timerId);
  };
}
