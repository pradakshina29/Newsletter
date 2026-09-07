import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Ensure PDF worker is initialized
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn("Could not set PDF worker URL:", e);
}

export interface ExtractedDocumentResult {
  text: string;
  images: string[];
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
  images: string[];
}

/**
 * Universal document extractor: Extracts clean text AND embedded/rendered event images from any document format (PDF, DOCX, TXT, JSON, MD)
 */
export async function extractDocumentContent(file: File): Promise<ExtractedDocumentResult> {
  const fileName = file.name.toLowerCase();
  const extractedImages: string[] = [];

  // 1. DOCX File Extraction using JSZip (Unpacks word/document.xml and word/media/*)
  if (fileName.endsWith('.docx') || file.type.includes('wordprocessingml') || file.type.includes('officedocument')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Extract embedded images from word/media/
      const mediaFiles = Object.keys(zip.files).filter(path => 
        path.startsWith('word/media/') && /\.(png|jpe?g|webp|gif|bmp)$/i.test(path)
      );

      for (const mediaPath of mediaFiles) {
        try {
          const imgFile = zip.files[mediaPath];
          if (imgFile) {
            const base64 = await imgFile.async('base64');
            // Filter out tiny icon images (< 3KB) so only genuine event photos are kept
            if (base64.length > 3000) {
              const ext = mediaPath.split('.').pop()?.toLowerCase() || 'jpeg';
              const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              extractedImages.push(`data:${mimeType};base64,${base64}`);
            }
          }
        } catch (imgErr) {
          console.warn("Could not extract DOCX image:", mediaPath, imgErr);
        }
      }

      // Extract text from word/document.xml
      const docXmlFile = zip.files['word/document.xml'];
      if (docXmlFile) {
        const xmlStr = await docXmlFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

        const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'));
        const lines: string[] = [];

        paragraphs.forEach(p => {
          const textNodes = Array.from(p.getElementsByTagName('w:t'));
          const pText = textNodes.map(t => t.textContent || '').join('').trim();
          if (pText.length > 0) {
            lines.push(pText);
          }
        });

        const fullText = lines.join('\n');
        if (fullText.trim().length > 10) {
          return {
            text: fullText,
            images: extractedImages.slice(0, 3)
          };
        }
      }
    } catch (docxErr) {
      console.warn("JSZip DOCX extraction error:", docxErr);
    }
  }

  // 2. PDF File Extraction using pdfjs-dist (Text + High-Res Photo Crops)
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

        const lowerPageText = pageText.toLowerCase();
        const hasPhotoClues = lowerPageText.includes("photograph") || 
                              lowerPageText.includes("geo-tagged") || 
                              lowerPageText.includes("inauguration") || 
                              lowerPageText.includes("session") || 
                              lowerPageText.includes("valedictory") ||
                              lowerPageText.includes("glimpses") ||
                              pageNum >= 2;

        // Render photo snapshots for pages likely to contain photos
        if ((hasPhotoClues || numPages === 1) && extractedImages.length < 3) {
          try {
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
              extractedImages.push(dataUrl);
            }
          } catch (renderErr) {
            console.warn("Could not capture PDF page photo snapshot:", renderErr);
          }
        }
      }

      const fullText = textChunks.join('\n\n');
      if (fullText.trim().length > 10) {
        return {
          text: fullText,
          images: extractedImages.slice(0, 3)
        };
      }
    } catch (pdfErr) {
      console.warn("pdfjs extraction failed, falling back to stream decoder:", pdfErr);
    }
  }

  // 3. Plain Text, Markdown, CSV, JSON
  try {
    const text = await file.text();
    if (text && text.trim().length > 0) {
      if (fileName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.content || parsed.pages) {
            return { text: JSON.stringify(parsed, null, 2), images: [] };
          }
        } catch (_) {}
      }
      return { text, images: [] };
    }
  } catch (textErr) {
    console.warn("Direct file.text() reading error:", textErr);
  }

  // 4. Default Fallback
  return {
    text: `Event Report: ${file.name.replace(/\.[^/.]+$/, "")}`,
    images: []
  };
}

/**
 * Backward compatibility helper for text extraction
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  const res = await extractDocumentContent(file);
  return res.text;
}

/**
 * Universal NLP & Heuristic Parser for Any Academic / College / Department Event Report
 */
export function parseReportEntities(rawText: string, fileName: string, defaultDepartment: string = "Information Technology"): ParsedReportData {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  let text = (rawText || cleanName).replace(/\r\n/g, '\n').trim();

  // 1. Clean binary/ZIP debris and standard institutional metadata templates
  text = text.replace(/PK[\x00-\x1F\x7F-\xFF]+\[Content_Types\][\s\S]*/i, '').trim();

  const sanitizedText = text
    .replace(/KPRCAS\/IQAC\/[^\n]*/gi, '')
    .replace(/VERSION:\s*\d+[^\n]*/gi, '')
    .replace(/Quality System Document/gi, '')
    .replace(/Report of the Event/gi, '')
    .replace(/Event Report/gi, '')
    .replace(/Activity Report/gi, '')
    .replace(/KPR College of Arts Science and Research/gi, '')
    .replace(/\(Affiliated to Bharathiar University[^\)]*\)/gi, '')
    .replace(/Avinashi Road, Arasur[^\n]*/gi, '');

  const lower = sanitizedText.toLowerCase();

  // 2. Intelligent Category Detection
  let category = "workshop";
  if (lower.includes("placement") || lower.includes("recruiter") || lower.includes("package") || lower.includes("lpa") || lower.includes("hired") || lower.includes("campus drive") || lower.includes("offer letter") || lower.includes("placed")) {
    category = "placement";
  } else if (lower.includes("hackathon") || lower.includes("first place") || lower.includes("second place") || lower.includes("1st prize") || lower.includes("2nd prize") || lower.includes("trophy") || lower.includes("cash award") || lower.includes("competition winner") || lower.includes("achiever")) {
    category = "student";
  } else if (lower.includes("faculty") || lower.includes("research paper") || lower.includes("journal publication") || lower.includes("scopus") || lower.includes("ieee") || lower.includes("springer") || lower.includes("patent") || lower.includes("impact factor")) {
    category = "faculty";
  } else if (lower.includes("workshop") || lower.includes("seminar") || lower.includes("hands-on") || lower.includes("guest lecture") || lower.includes("resource person") || lower.includes("campus to career") || lower.includes("fdp") || lower.includes("training program") || lower.includes("webinar") || lower.includes("keynote")) {
    category = "workshop";
  } else if (lower.includes("welcome") || lower.includes("orientation") || lower.includes("induction") || lower.includes("fresher") || lower.includes("farewell") || lower.includes("inauguration of association")) {
    category = "welcome";
  } else {
    category = "custom";
  }

  // 3. Robust Event Title Extraction
  let title = "";
  const titlePatterns = [
    /(?:Event Title|Title of the Event|Name of the Event|Topic|Theme|Project Title|Paper Title|Event Name)\s*[:\-\s]*\s*([^\n\r]+?)(?=\s*(?:Organizing Body|Collaborations|Details of|Resource Person|Speaker|Organizing Department|Event Date|Date|Venue|Time|\n\n|$))/i,
    /CAMPUS TO CAREER SERIES[^\n\r]+/i,
    /Report on\s+([^\n\r]+)/i,
    /Two[- ]Day\s+(?:National|International|Hands[- ]on)?\s+(?:Workshop|Seminar|Conference|Symposium|FDP)\s+on\s+([^\n\r]+)/i,
    /One[- ]Day\s+(?:National|International|Hands[- ]on)?\s+(?:Workshop|Seminar|Conference|Symposium|FDP)\s+on\s+([^\n\r]+)/i,
    /Guest Lecture on\s+([^\n\r]+)/i,
    /Orientation Program on\s+([^\n\r]+)/i,
    /Placement Drive by\s+([^\n\r]+)/i
  ];

  for (const regex of titlePatterns) {
    const m = sanitizedText.match(regex);
    if (m && m[1] && m[1].trim().length > 4) {
      title = m[1].trim().replace(/^[-:•\s]+/, '').replace(/[-:•\s]+$/, '');
      break;
    } else if (m && m[0] && m[0].trim().length > 4) {
      title = m[0].trim().replace(/^[-:•\s]+/, '').replace(/[-:•\s]+$/, '');
      break;
    }
  }

  if (!title || title.length < 5 || title.includes("[CONTENT_TYPES]") || title.includes("VERSION:")) {
    const lines = sanitizedText.split('\n').map(l => l.trim()).filter(l => 
      l.length > 8 && l.length < 110 && 
      !l.toLowerCase().startsWith("date") && 
      !l.toLowerCase().startsWith("venue") &&
      !l.toLowerCase().startsWith("time") &&
      !l.toLowerCase().startsWith("kpr") &&
      !l.toLowerCase().startsWith("page")
    );
    title = lines.length > 0 ? lines[0] : cleanName;
  }

  title = title.toUpperCase().replace(/\s+/g, ' ').trim();

  // 4. Chief Guest / Resource Person / Speaker / Faculty In-Charge
  let student = "";
  const speakerPatterns = [
    /(?:Details of Resource Person|Resource Person|Chief Guest|Speaker|Trainer|Expert|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Faculty Member)\s*[:\-\s]*\s*([^\n\r]+(?:\s*-\s*[^\n\r]+)?)/i,
    /Resource person of the session\s+([^\n\r,]+(?:\s*,\s*[^\n\r.]+)?)/i,
    /Chief guest of the day\s+([^\n\r,]+(?:\s*,\s*[^\n\r.]+)?)/i,
    /(?:Ms\.|Mr\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s*,\s*[^\n\r.]+)?/
  ];

  for (const regex of speakerPatterns) {
    const m = sanitizedText.match(regex);
    if (m && m[1] && m[1].trim().length > 3) {
      student = m[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    } else if (m && m[0] && m[0].trim().length > 3) {
      student = m[0].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  if (!student) {
    student = category === 'placement' ? "Placement Cell & Industry Partners" :
              category === 'student' ? "Student Innovation Achievers" :
              category === 'faculty' ? "Department Faculty Researchers" : "Distinguished Resource Person";
  }

  // 5. Extract Dignitaries (Principal, Dean, HOD, Patron)
  let principalName = "Dr. P. Geetha (Principal, KPRCAS)";
  const princMatch = sanitizedText.match(/(?:presided over by|Principal[,\s:]+)\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:[,\s]+Principal[^\n\r,.]*)?)/i) ||
                     sanitizedText.match(/(?:Dr\.\s+P\.\s+Geetha[^\n\r,.]*)/i);
  if (princMatch) {
    principalName = princMatch[0].replace(/presided over by/i, '').trim();
  }

  let deanName = "Dr. P. Sharmila (Dean – SoCS)";
  const deanMatch = sanitizedText.match(/(?:felicitated by|Dean[,\s:]+)\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:[,\s]+Dean[^\n\r,.]*)?)/i) ||
                    sanitizedText.match(/(?:Dr\.\s+P\.\s+Sharmila[^\n\r,.]*)/i);
  if (deanMatch) {
    deanName = deanMatch[0].replace(/felicitated by/i, '').trim();
  }

  let hodName = "";
  const hodMatch = sanitizedText.match(/(?:Head of the Department|HOD)[,\s:]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i);
  if (hodMatch) {
    hodName = hodMatch[1].trim();
  }

  // 6. Student Organizers / Anchors / Vote of Thanks
  let studentAnchors = "";
  const anchorMatches = sanitizedText.match(/(?:Ms\.|Mr\.)\s+[A-Z][a-z\.\s]+,\s*(?:I|II|III|IV)\s+(?:IT|B\.Sc|BCA|CS|Commerce)[^\n.]*/gi);
  if (anchorMatches && anchorMatches.length > 0) {
    studentAnchors = anchorMatches.join(', ');
  }

  // 7. Extract Class & Department
  let classDept = "";
  const deptMatch = sanitizedText.match(/(?:Organizing Department|Department of|Dept\. of)[:\s]+([^\n\r]+)/i);
  if (deptMatch && deptMatch[1]) {
    const deptFound = deptMatch[1].trim();
    if (!deptFound.toLowerCase().startsWith("date")) {
      classDept = deptFound.toUpperCase();
    }
  }
  if (!classDept) {
    const classPatternMatch = sanitizedText.match(/(?:II|III|I|IV)\s+(?:IT|B\.Sc|BCA|CS|B\.Sc\.\s+IT)[^,\n.]*/i);
    if (classPatternMatch) {
      classDept = classPatternMatch[0].trim().toUpperCase();
    } else {
      classDept = `DEPARTMENT OF ${defaultDepartment.toUpperCase()}`;
    }
  }

  // 8. Extract Team Name / Collaborations / Sponsoring Agency
  let teamName = "";
  const collabMatch = sanitizedText.match(/(?:Collaborations|Organizing Body|Sponsored by|Association|Club|In Association with)(?:\s*\(If any\))?[:\s]+([^\n\r]+)/i);
  if (collabMatch && collabMatch[1] && collabMatch[1].trim().length > 3 && !collabMatch[1].includes("-")) {
    teamName = collabMatch[1].trim();
  } else {
    const teamMatch = sanitizedText.match(/(?:team name:?|team:?|team name is)\s*([^.,;\n]{2,50})/i);
    if (teamMatch) {
      teamName = teamMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  // 9. Extract Event Date (Filters out template version date 18/02/2022)
  let date = "August 2025";
  const dateMatch = sanitizedText.match(/(?:Event Date|Date of the Event|Date)[:\s]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i) ||
                    sanitizedText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/);
  if (dateMatch) {
    const foundDate = (dateMatch[1] || dateMatch[0]).trim();
    if (!foundDate.includes("18/02/2022") && !foundDate.includes("01/01/1970")) {
      date = foundDate;
    }
  }

  // 10. Extract Venue & Participation Count
  let venue = "Seminar Hall";
  const venueMatch = sanitizedText.match(/Venue[:\s]+([^\n\r,]+)/i);
  if (venueMatch && venueMatch[1]) {
    venue = venueMatch[1].trim();
  }

  let participantInfo = "";
  const partMatch = sanitizedText.match(/(?:Total number of Students Participated|Participants Count|Total Beneficiaries|Attendance)[:\s]+(\d+)/i);
  if (partMatch) {
    participantInfo = `with active participation from over ${partMatch[1]} students and faculty members`;
  }

  // 11. Extract Purpose, Summary & Outcome
  let purpose = "";
  const purposeMatch = sanitizedText.match(/(?:Purpose of the Event|Objective\(s\)?|Aim of the Event|Abstract)[:\s]+([\s\S]*?)(?=Summary of the Event|Outcome of the Event|Date|Venue|Proceedings|$)/i);
  if (purposeMatch && purposeMatch[1]) {
    purpose = purposeMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let summary = "";
  const summaryMatch = sanitizedText.match(/(?:Summary of the Event|Proceedings|Event Description|Executive Summary)[:\s]+([\s\S]*?)(?=Outcome of the Event|Geo-Tagged|Photographs|HOD|Dean|Principal|$)/i);
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].replace(/[\r\n]+/g, ' ').replace(/[•\*\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let outcome = "";
  const outcomeMatch = sanitizedText.match(/(?:Outcome of the Event|Key Outcomes|Feedback & Conclusion|Results)[:\s]+([\s\S]*?)(?=Geo-Tagged|Photographs|HOD|Dean|Principal|$)/i);
  if (outcomeMatch && outcomeMatch[1]) {
    outcome = outcomeMatch[1].replace(/[\r\n]+/g, ' ').replace(/[•\*\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const award = teamName ? `Collaboration: ${teamName}` : `Department Academic Initiative`;
  const host = `${principalName} and ${deanName}${hodName ? `, with ${hodName} (HOD)` : ''}`;
  const details = purpose || summary || sanitizedText.substring(0, 300);
  const keywords = outcome ? outcome.substring(0, 200) : "Skill enhancement, technical capability, executive presentation, student participation";

  // 12. Synthesize Authentic, Publication-Grade College Article Story
  const sentences: string[] = [];

  // Opening Paragraph
  sentences.push(
    `The ${classDept || `Department of ${defaultDepartment}`}, KPRCAS, ${teamName ? `in collaboration with ${teamName}, ` : ''}successfully organized the academic capability program titled "${title}" on ${date} at the ${venue}${participantInfo ? ` ${participantInfo}` : ''}.`
  );

  // Dignitaries & Speaker introduction
  if (summary) {
    sentences.push(summary);
  } else {
    sentences.push(
      `The program was presided over by ${principalName} and felicitated by ${deanName}. ${student ? `The session featured eminent Resource Person ${student}, who delivered an empowering keynote address.` : ''} ${studentAnchors ? `Student coordinators (${studentAnchors}) actively anchored the event proceedings.` : ''}`
    );
  }

  // Purpose & Content
  if (purpose) {
    sentences.push(`The core objective of the program was ${purpose.toLowerCase().startsWith('to ') ? purpose : `to ${purpose}`}.`);
  }

  // Outcomes & Appreciation
  if (outcome) {
    sentences.push(`Key outcomes achieved: ${outcome}.`);
  } else {
    sentences.push(`The interactive session enabled participants to gain practical knowledge, build industry-ready skills, and develop greater academic excellence.`);
  }

  sentences.push(
    `The Principal, Dean, and Department Faculty members warmly commended all organizers, resource delegates, and student participants for their exemplary commitment and grand success.`
  );

  const article = sentences.join(' ').replace(/\s+/g, ' ').trim();

  return {
    category,
    title,
    teamName,
    student,
    classDept,
    date,
    award,
    host,
    details: details.substring(0, 300),
    keywords: keywords.substring(0, 200),
    article,
    rawText: sanitizedText,
    images: []
  };
}
