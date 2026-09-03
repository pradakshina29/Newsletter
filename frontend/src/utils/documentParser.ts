import * as pdfjsLib from 'pdfjs-dist';

// Ensure PDF worker is initialized
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn("Could not set PDF worker URL:", e);
}

export interface ParsedReportData {
  category: string;
  title: string;
  teamName: string;
  student: string;
  classDept: string;
  date: string;
  award: string;
  host: string;
  details: string;
  keywords: string;
  article: string;
  rawText: string;
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

/**
 * Parses raw extracted text into structured entities (Title, Team Name, Members, Class, Date, Article)
 */
export function parseReportEntities(rawText: string, fileName: string, defaultDepartment: string = "Information Technology"): ParsedReportData {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  const text = (rawText || cleanName).replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();

  // Detect Category
  let category = "student";
  if (lower.includes("faculty") || lower.includes("paper") || lower.includes("journal") || lower.includes("publication") || lower.includes("research")) {
    category = "faculty";
  } else if (lower.includes("placement") || lower.includes("recruiter") || lower.includes("package") || lower.includes("lpa") || lower.includes("hired") || lower.includes("offer")) {
    category = "placement";
  } else if (lower.includes("workshop") || lower.includes("seminar") || lower.includes("speaker") || lower.includes("guest lecture") || lower.includes("webinar") || lower.includes("training")) {
    category = "workshop";
  } else if (lower.includes("welcome") || lower.includes("orientation") || lower.includes("induction") || lower.includes("fresher")) {
    category = "welcome";
  }

  // Extract Team Name
  let teamName = "";
  const teamMatch = text.match(/(?:team name:?|team:?|team name is)\s*([^.,;\n]{2,50})/i);
  if (teamMatch) {
    teamName = teamMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // Extract Members / Student Names
  let student = "";
  const memberMatch = text.match(/(?:members?:?|team members?:?|members name:?|students?:?|student name:?|developers?:?|achievers?:?)\s*([^;\n.]{3,120})/i);
  if (memberMatch) {
    student = memberMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  // Extract Class & Department
  let classDept = "";
  const classMatch = text.match(/(?:class:?|class\/dept:?|section:?|batch:?|year:?)\s*([^;\n.]{2,40})/i);
  if (classMatch) {
    classDept = classMatch[1].trim();
  } else {
    classDept = `III B.SC ${defaultDepartment.toUpperCase()}`;
  }

  // Extract Date
  let date = "June 2026";
  const dateMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i) ||
                    text.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i);
  if (dateMatch) {
    date = dateMatch[0].trim();
  }

  // Extract Event Title
  let title = cleanName;
  const titleMatch = text.match(/(?:title:?|event:?|topic:?|project:?|paper:?)\s*([^.,;\n]{4,80})/i);
  if (titleMatch) {
    title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
  } else {
    // Take first capitalized phrase or filename
    const firstLines = text.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 5 && s.length < 80);
    if (firstLines.length > 0) {
      title = firstLines[0];
    }
  }

  // Clean Title
  title = title.toUpperCase();

  // Extract Award / Purpose
  let award = `School-Level Department Academic Event`;
  if (lower.includes("hackathon")) award = "National Hackathon Initiative & Project Innovation";
  else if (lower.includes("election") || lower.includes("office bearer")) award = "Department Association Office Bearer Selection";
  else if (lower.includes("workshop")) award = "Hands-on Technical Training & Skill Workshop";
  else if (lower.includes("placement")) award = "Campus Recruitment Placement Drive";

  const host = "Respected Principal Dr. P. Geetha, Deans of various schools, and Heads of Departments";
  const details = text.length > 300 ? text.substring(0, 300) + "..." : text;
  const keywords = "Executive presentation, student deployment, leadership appreciation, live demonstration";

  // Synthesize Complete News Article
  const sentences: string[] = [
    `The Department of ${defaultDepartment} organized the academic initiative titled "${title}" hosted at KPRCAS campus.`,
    teamName ? `The project was engineered and presented by Team "${teamName}" from ${classDept}.` : '',
    student ? `The student delegation (${student}), actively representing ${classDept}, demonstrated commendable technical expertise and high enthusiasm.` : '',
    `During the main program session, the participants delivered an executive presentation before ${host}, demonstrating system architecture and live workflow.`,
    `Key session highlights included technical design reviews, practical feature demonstrations, and interactive validation.`,
    `The institutional leadership team expressed immense appreciation for the students' problem-solving mindset, practical execution, and dedicated teamwork.`,
    details ? `Key focus areas and event updates: ${details}` : '',
    `The department warmly congratulates all contributors on their active participation, exemplary dedication, and outstanding academic initiative!`
  ].filter(Boolean);

  const article = sentences.join(' ');

  return {
    category,
    title,
    teamName,
    student: student || "Student Delegation",
    classDept,
    date,
    award,
    host,
    details,
    keywords,
    article,
    rawText: text
  };
}
