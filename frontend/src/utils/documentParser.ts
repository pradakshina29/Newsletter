import * as pdfjsLib from 'pdfjs-dist';

// Ensure PDF worker is initialized
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn("Could not set PDF worker URL:", e);
}

/**
 * Extract clean plain text from any uploaded document (PDF, DOCX, TXT, JSON, MD)
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // 1. PDF File Extraction using pdfjs-dist
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const textChunks: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .filter((str: string) => typeof str === 'string' && str.trim().length > 0)
          .join(' ');
        if (pageText.trim()) {
          textChunks.push(pageText.trim());
        }
      }

      const fullText = textChunks.join('\n\n');
      if (fullText.trim().length > 10) {
        return fullText;
      }
    } catch (pdfErr) {
      console.warn("pdfjs extraction failed, falling back to binary stream decoder:", pdfErr);
    }

    // Fallback PDF text recovery using Latin1 stream decoding
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const rawText = new TextDecoder('latin1').decode(uint8);
      const matches = rawText.match(/\(([^()]{3,})\)/g);
      if (matches && matches.length > 0) {
        const extracted = matches
          .map(m => m.slice(1, -1).replace(/\\\(|\r|\n/g, ' ').trim())
          .filter(t => t.length > 3 && /[a-zA-Z0-9]/.test(t))
          .join(' ');
        if (extracted.length > 20) {
          return extracted;
        }
      }
    } catch (e) {
      console.warn("PDF stream recovery failed:", e);
    }
  }

  // 2. DOCX File Extraction (Extracting XML text tags from zip structure)
  if (fileName.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    try {
      const buffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder('utf-8');
      const rawXml = textDecoder.decode(buffer);
      // Match all Word text nodes: <w:t>text</w:t> or <w:t xml:space="preserve">text</w:t>
      const wordTextMatches = rawXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      if (wordTextMatches && wordTextMatches.length > 0) {
        const docxText = wordTextMatches
          .map(m => m.replace(/<[^>]+>/g, '').trim())
          .filter(t => t.length > 0)
          .join(' ');
        if (docxText.length > 10) {
          return docxText;
        }
      }
    } catch (docxErr) {
      console.warn("DOCX extraction error:", docxErr);
    }
  }

  // 3. Plain Text, Markdown, CSV, JSON, HTML
  try {
    const text = await file.text();
    if (text && text.trim().length > 0) {
      // If file is JSON, try to format or stringify cleanly
      if (fileName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.content || parsed.pages) {
            return JSON.stringify(parsed, null, 2);
          }
        } catch (_) {}
      }
      return text;
    }
  } catch (textErr) {
    console.warn("Direct file.text() reading error:", textErr);
  }

  // 4. Default Fallback
  return `Event Report: ${file.name.replace(/\.[^/.]+$/, "")}`;
}
