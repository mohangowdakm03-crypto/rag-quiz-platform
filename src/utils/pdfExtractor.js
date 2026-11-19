import * as pdfjsLib from 'pdfjs-dist';

// Use standard cloudflare CDN worker matching installed pdfjs-dist version
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

/**
 * Extracts plain text from a user-uploaded PDF or text file
 * @param {File} file 
 * @returns {Promise<{ text: string, pageCount: number, wordCount: number }>}
 */
export async function extractTextFromFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const name = file.name.toLowerCase();

  // If plain text, markdown, or JSON
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.csv')) {
    const text = await file.text();
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return {
      text,
      pageCount: 1,
      wordCount: words
    };
  }

  // If PDF file
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let fullText = '';

      // Limit extraction to first 30 pages to prevent memory exhaustion on massive textbooks
      const maxPages = Math.min(numPages, 30);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }

      const words = fullText.trim().split(/\s+/).filter(Boolean).length;

      return {
        text: fullText,
        pageCount: numPages,
        wordCount: words
      };
    } catch (err) {
      console.error('PDF parsing error:', err);
      throw new Error(`Could not parse PDF document: ${err.message || 'Corrupted or password-protected PDF.'}`);
    }
  }

  // Fallback try reading as text
  try {
    const text = await file.text();
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return {
      text,
      pageCount: 1,
      wordCount: words
    };
  } catch (err) {
    throw new Error(`Unsupported file type: ${file.name}. Please upload a PDF, TXT, or MD document.`);
  }
}
