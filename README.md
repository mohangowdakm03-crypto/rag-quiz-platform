# 🏛️ Oxvane — Universal Assessment & Live Examination Platform

An aesthetic, high-performance, real-time assessment platform built with **React**, **Vite**, **Tailwind CSS**, and **Supabase Realtime PostgreSQL**.

Designed for university classes, AI bootcamps, and study groups to host live synchronized exams with 60+ concurrent students.

---

## 🌐 Live URLs

- **Live Application (Student & Instructor)**: [https://rag-quiz-platform.web.app](https://rag-quiz-platform.web.app)
- **Direct Student Invite Link**: [https://rag-quiz-platform.web.app/?quiz=rag-mastery-2025](https://rag-quiz-platform.web.app/?quiz=rag-mastery-2025)
- **Live Instructor Dashboard**: [https://rag-quiz-platform.web.app/?quiz=rag-mastery-2025&mode=teacher](https://rag-quiz-platform.web.app/?quiz=rag-mastery-2025&mode=teacher)
- **GitHub Repository**: [https://github.com/mohangowdakm03-crypto/rag-quiz-platform](https://github.com/mohangowdakm03-crypto/rag-quiz-platform)

---

## 📋 Features

### 👨‍🎓 For Students
- **20 Comprehensive RAG Questions**: Spans architecture, chunking, HNSW vector search, hybrid retrieval (BM25 + RRF), cross-encoder rerankers, HyDE, step-back prompting, GraphRAG, CRAG, Self-RAG, ColPali, and Ragas evaluation metrics.
- **Timed Exam Session**: 30-minute timer with countdown alerts.
- **Local State Preservation**: Automatic draft persistence to `localStorage` in case of accidental browser refresh or network interruption.
- **Question Palette**: Quick-jump drawer showing answered, unanswered, and flagged questions.
- **Keyboard Shortcuts**: Select options with `1-4` or `A-D`, navigate with arrow keys.
- **Immediate Review & Scorecard**: Confetti celebration, performance tier badge, and deep technical explanations for every question.

### 👩‍🏫 For Instructors
- **Real-Time Live Leaderboard**: Uses Firestore real-time listeners (`onSnapshot`) to stream in student submissions with zero page refreshes.
- **High Concurrency**: Handles 60+ simultaneous students submitting concurrently.
- **Question Difficulty Heatmap (Item Analysis)**: Visual breakdown of classroom accuracy per question to pinpoint confusing topics.
- **Individual Attempt Inspector**: Modal view of any student's answer choices, time taken, and score.
- **1-Click CSV Export**: Download complete grades and question-by-question responses for Excel or Google Sheets.

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/mohangowdakm03-crypto/rag-quiz-platform.git
cd rag-quiz-platform

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🚀 Deployment

### Deploy to Firebase Hosting:
```bash
npm run build
firebase deploy --only hosting --project rag-quiz-platform
```

### Deploy to Vercel:
Import the GitHub repo `mohangowdakm03-crypto/rag-quiz-platform` directly in your [Vercel Dashboard](https://vercel.com/new).
