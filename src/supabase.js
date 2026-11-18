import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or localStorage
export function getSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = localStorage.getItem('rag_supabase_url');
  const localKey = localStorage.getItem('rag_supabase_anon_key');

  const url = (envUrl && envUrl.trim()) || (localUrl && localUrl.trim()) || '';
  const anonKey = (envKey && envKey.trim()) || (localKey && localKey.trim()) || '';

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.includes('supabase.co'))
  };
}

export function saveSupabaseConfig(url, anonKey) {
  if (url) localStorage.setItem('rag_supabase_url', url.trim());
  if (anonKey) localStorage.setItem('rag_supabase_anon_key', anonKey.trim());
}

let supabaseInstance = null;
let currentUrl = null;
let currentKey = null;

export function getSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance || currentUrl !== url || currentKey !== anonKey) {
    supabaseInstance = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
    currentUrl = url;
    currentKey = anonKey;
  }

  return supabaseInstance;
}

// 1. Record participant joining the session
export async function joinQuizRoom(quizId, studentName, studentId = '') {
  const client = getSupabaseClient();
  if (!client) {
    // If not configured, record in local storage session
    console.warn('Supabase not yet configured; storing locally.');
    return null;
  }

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
      .select();

    if (error) {
      console.error('Error inserting participant into Supabase:', error);
      return null;
    }
    return data?.[0]?.id || null;
  } catch (err) {
    console.error('Participant record exception:', err);
    return null;
  }
}

// 2. Submit completed student quiz to Supabase
export async function submitStudentQuiz(quizId, submissionData) {
  const client = getSupabaseClient();
  if (!client) {
    // Store in localStorage as fallback so no work is lost
    const key = `local_submissions_${quizId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const record = {
      id: 'local-' + Date.now(),
      quiz_id: quizId,
      student_name: submissionData.studentName,
      student_id: submissionData.studentId || 'N/A',
      score: submissionData.score,
      total_questions: submissionData.totalQuestions,
      percentage: submissionData.percentage,
      passed: submissionData.passed,
      time_taken_seconds: submissionData.timeTakenSeconds,
      answers: submissionData.answers,
      breakdown: submissionData.breakdown,
      created_at: new Date().toISOString()
    };
    existing.unshift(record);
    localStorage.setItem(key, JSON.stringify(existing));
    return { success: true, id: record.id, local: true };
  }

  const payload = {
    quiz_id: quizId,
    student_name: submissionData.studentName,
    student_id: submissionData.studentId || 'N/A',
    score: submissionData.score,
    total_questions: submissionData.totalQuestions,
    percentage: submissionData.percentage,
    passed: submissionData.passed,
    time_taken_seconds: submissionData.timeTakenSeconds,
    answers: submissionData.answers,
    breakdown: submissionData.breakdown
  };

  const { data, error } = await client
    .from('quiz_submissions')
    .insert([payload])
    .select();

  if (error) {
    console.error('Supabase submission insert error:', error);
    throw error;
  }

  return { success: true, id: data?.[0]?.id };
}

// 3. Fetch all submissions for a quiz
export async function fetchSubmissions(quizId) {
  const client = getSupabaseClient();
  if (!client) {
    const key = `local_submissions_${quizId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  const { data, error } = await client
    .from('quiz_submissions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching submissions from Supabase:', error);
    return [];
  }

  return (data || []).map(row => ({
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
}

// 4. Fetch all participants
export async function fetchParticipants(quizId) {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('quiz_participants')
    .select('*')
    .eq('quiz_id', quizId);

  if (error) return [];
  return data || [];
}

// 5. Real-time subscription to submissions using Supabase Channels
export function subscribeToSubmissions(quizId, onUpdate) {
  const client = getSupabaseClient();
  if (!client) {
    // Poll local fallback
    fetchSubmissions(quizId).then(onUpdate);
    const interval = setInterval(() => {
      fetchSubmissions(quizId).then(onUpdate);
    }, 2000);
    return () => clearInterval(interval);
  }

  // Initial fetch
  fetchSubmissions(quizId).then(onUpdate);

  // Realtime channel
  const channel = client
    .channel(`quiz_submissions_${quizId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quiz_submissions',
        filter: `quiz_id=eq.${quizId}`
      },
      () => {
        // Refresh submissions on any change
        fetchSubmissions(quizId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// 6. Real-time subscription to participants
export function subscribeToParticipants(quizId, onUpdate) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  fetchParticipants(quizId).then(onUpdate);

  const channel = client
    .channel(`quiz_participants_${quizId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'quiz_participants',
        filter: `quiz_id=eq.${quizId}`
      },
      () => {
        fetchParticipants(quizId).then(onUpdate);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
