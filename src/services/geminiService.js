/**
 * Gemini AI Quiz Generation Service (100% Free Tier via Google AI Studio)
 */

export function getStoredGeminiApiKey() {
  try {
    const localKey = localStorage.getItem('oxvane_gemini_api_key');
    if (localKey && localKey.trim()) return localKey.trim();
  } catch {
    // ignore
  }
  try {
    return import.meta?.env?.VITE_GEMINI_API_KEY || '';
  } catch {
    return '';
  }
}

export function saveStoredGeminiApiKey(key) {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem('oxvane_gemini_api_key');
    } else {
      localStorage.setItem('oxvane_gemini_api_key', key.trim());
    }
  } catch {
    // ignore
  }
}

/**
 * Calls Gemini 1.5/2.0 Flash to generate structured quiz questions
 */
export async function generateQuizQuestionsWithGemini({
  content,
  count = 10,
  difficulty = 'Mixed',
  questionType = 'single',
  customPrompt = '',
  apiKey = ''
}) {
  const activeKey = (apiKey || getStoredGeminiApiKey()).trim();

  if (!activeKey) {
    throw new Error('Please provide a Google Gemini API Key. (Free at aistudio.google.com/app/apikey)');
  }

  if (!content || !content.trim()) {
    throw new Error('Please provide text, syllabus notes, or upload a document to generate questions from.');
  }

  const prompt = `You are an expert university professor and examination author.
Your task is to generate exactly ${count} multiple-choice assessment questions based strictly on the provided syllabus, text, or textbook excerpt.

Target Criteria:
- Total Questions: ${count}
- Difficulty Level: ${difficulty}
- Question Format: ${questionType === 'boolean' ? 'True / False (2 options)' : 'Multiple Choice (4 distinct options)'}
${customPrompt ? `- Instructor Focus / Instructions: ${customPrompt}` : ''}

Strict Output Requirements:
1. Output ONLY a valid JSON object matching the schema below. No markdown wrapping, no backticks, no introductory text.
2. Every question must have plausible, thoughtful distractors (wrong options). Do not use "All of the above" or "None of the above".
3. Provide a clear, technical, pedagogical explanation for why the correct option is right.

JSON Schema:
{
  "title": "Concise, descriptive quiz title",
  "description": "1-sentence summary of the covered topic",
  "questions": [
    {
      "id": 1,
      "type": "${questionType === 'boolean' ? 'boolean' : 'single'}",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "points": 1000,
      "category": "Topic Name",
      "difficulty": "${difficulty === 'Mixed' ? 'Intermediate' : difficulty}",
      "explanation": "Detailed explanation of the correct answer."
    }
  ]
}

Content Material:
"""
${content.slice(0, 45000)}
"""`;

  // Try gemini-1.5-flash first (most reliable free quota), fallback to gemini-2.0-flash
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errMsg);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Gemini returned an empty response. Please check your content.');
      }

      // Parse JSON from response
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Strip markdown code fences if model enclosed them
        const cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('Failed to parse questions array from Gemini response.');
      }

      // Sanitize and normalize questions
      const normalizedQuestions = parsed.questions.map((q, idx) => {
        let options = Array.isArray(q.options) ? q.options.map(String) : ['True', 'False'];
        if (options.length < 2) options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        
        let correct = Number(q.correctAnswer ?? 0);
        if (isNaN(correct) || correct < 0 || correct >= options.length) {
          correct = 0;
        }

        return {
          id: idx + 1,
          type: q.type || (options.length === 2 ? 'boolean' : 'single'),
          category: q.category || 'General',
          difficulty: q.difficulty || 'Intermediate',
          points: Number(q.points) || 1000,
          question: String(q.question || `Question ${idx + 1}`),
          options,
          correctAnswer: correct,
          explanation: String(q.explanation || 'Official answer explanation.')
        };
      });

      return {
        title: parsed.title || 'AI Generated Assessment',
        description: parsed.description || `Generated ${normalizedQuestions.length} questions from syllabus material.`,
        questions: normalizedQuestions
      };
    } catch (err) {
      console.warn(`Model ${model} failed, checking fallback:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate quiz with Gemini.');
}
