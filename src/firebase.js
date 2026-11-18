import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

const firebaseConfig = {
  projectId: "rag-quiz-platform",
  appId: "1:717705318559:web:8b9a908dc0b3b72f86d2aa",
  storageBucket: "rag-quiz-platform.firebasestorage.app",
  apiKey: "AIzaSyAGgJ4iqHy-qjSnACsmCwePgQlc6gt9Rm0",
  authDomain: "rag-quiz-platform.firebaseapp.com",
  messagingSenderId: "717705318559",
  projectNumber: "717705318559"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper to record student joining the room
export async function joinQuizRoom(quizId, studentName, studentId = "") {
  try {
    const participantDoc = doc(collection(db, "quizzes", quizId, "participants"));
    await setDoc(participantDoc, {
      studentName,
      studentId,
      joinedAt: serverTimestamp(),
      status: "in-progress"
    });
    return participantDoc.id;
  } catch (error) {
    console.error("Error registering participant:", error);
    return null;
  }
}

// Helper to save a completed quiz submission
export async function submitStudentQuiz(quizId, submissionData) {
  try {
    const submissionsRef = collection(db, "quizzes", quizId, "submissions");
    const docRef = await addDoc(submissionsRef, {
      studentName: submissionData.studentName,
      studentId: submissionData.studentId || "N/A",
      score: submissionData.score,
      totalQuestions: submissionData.totalQuestions,
      percentage: submissionData.percentage,
      passed: submissionData.passed,
      timeTakenSeconds: submissionData.timeTakenSeconds,
      answers: submissionData.answers, // Record of { questionId: selectedIndex }
      breakdown: submissionData.breakdown, // Array of correctness
      submittedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving submission:", error);
    throw error;
  }
}

// Real-time listener for submissions (Admin/Teacher view)
export function subscribeToSubmissions(quizId, onUpdate) {
  const submissionsRef = collection(db, "quizzes", quizId, "submissions");
  const q = query(submissionsRef, orderBy("submittedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const submissions = [];
    snapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(submissions);
  }, (error) => {
    console.error("Submissions listener error:", error);
  });
}

// Real-time listener for active participants
export function subscribeToParticipants(quizId, onUpdate) {
  const participantsRef = collection(db, "quizzes", quizId, "participants");
  return onSnapshot(participantsRef, (snapshot) => {
    const participants = [];
    snapshot.forEach((doc) => {
      participants.push({ id: doc.id, ...doc.data() });
    });
    onUpdate(participants);
  }, (error) => {
    console.error("Participants listener error:", error);
  });
}
