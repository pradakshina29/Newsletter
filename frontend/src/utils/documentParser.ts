import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Ensure PDF worker is initialized gracefully
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
 * Checks if a string contains binary markers, zip archive headers, or xml paths
 */
export function isBinaryOrXmlJunk(str: string): boolean {
  if (!str) return false;
  const s = str.toLowerCase();
  return (
    s.includes('.xml') ||
    s.includes('pk\x03\x04') ||
    s.includes('pkzc') ||
    s.includes('[content_types]') ||
    s.includes('customxml') ||
    s.includes('theme1') ||
    s.includes('word/media') ||
    s.includes('word/theme') ||
    s.includes('word/numbering') ||
    s.includes('docprops') ||
    s.includes('/theme') ||
    str.includes('\uFFFD') ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(str)
  );
}

/**
 * Clean and decode XML entity codes
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extracts clean readable text from Word OpenXML (DOCX) XML strings
 */
function extractTextFromWordXml(xmlStr: string): string[] {
  if (!xmlStr) return [];
  const lines: string[] = [];

  // Match all paragraphs <w:p ...>...</w:p>
  const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xmlStr)) !== null) {
    const pContent = pMatch[1];
    
    // Within paragraph, find all text nodes <w:t ...>...</w:t> or <w:tab/> or <w:br/>
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>/gi;
    let textChunk = '';
    let tMatch: RegExpExecArray | null;

    while ((tMatch = tRegex.exec(pContent)) !== null) {
      if (tMatch[0].startsWith('<w:tab')) {
        textChunk += '  ';
      } else if (tMatch[0].startsWith('<w:br')) {
        textChunk += '\n';
      } else if (tMatch[1] !== undefined) {
        textChunk += tMatch[1];
      }
    }

    const cleanLine = decodeXmlEntities(textChunk).trim();
    if (cleanLine.length > 0 && !isBinaryOrXmlJunk(cleanLine)) {
      lines.push(cleanLine);
    }
  }

  // Fallback: If no <w:p> matched, match all <w:t> nodes directly
  if (lines.length === 0) {
    const directTRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi;
    let tMatch: RegExpExecArray | null;
    let currentBuf = '';
    while ((tMatch = directTRegex.exec(xmlStr)) !== null) {
      currentBuf += (currentBuf ? ' ' : '') + decodeXmlEntities(tMatch[1]);
    }
    if (currentBuf.trim() && !isBinaryOrXmlJunk(currentBuf)) {
      lines.push(currentBuf.trim());
    }
  }

  return lines;
}

/**
 * Extracts clean ASCII and Unicode text streams from legacy Word binary (.doc OLE2) files
 */
function extractTextFromBinaryDoc(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const asciiChunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Printable ASCII characters (32 to 126) plus newline (10) and carriage return (13) and tab (9)
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      currentChunk += String.fromCharCode(b);
    } else {
      if (currentChunk.trim().length >= 4) {
        const lower = currentChunk.toLowerCase();
        // Filter out binary OLE2 metadata tables, font records, and control streams
        if (!lower.includes('root entry') && 
            !lower.includes('worddocument') && 
            !lower.includes('summaryinformation') && 
            !lower.includes('documentxml') && 
            !lower.includes('times new roman') && 
            !lower.includes('compobj') &&
            !isBinaryOrXmlJunk(currentChunk)) {
          asciiChunks.push(currentChunk.trim());
        }
      }
      currentChunk = '';
    }
  }

  if (currentChunk.trim().length >= 4 && !isBinaryOrXmlJunk(currentChunk)) {
    asciiChunks.push(currentChunk.trim());
  }

  return asciiChunks.join('\n');
}

/**
 * Deduplicates sentences and strips repeated boilerplate phrases.
 */
export function deduplicateSentences(text: string): string {
  if (!text) return '';

  // Clean raw bullet points, symbols, and irregular spaces
  const cleaned = text
    .replace(/[•\*\-]\s*/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences using punctuation boundaries
  const rawSentences = cleaned.split(/(?<=[.!?])\s+/);
  const uniqueSentences: string[] = [];
  const seenNorm = new Set<string>();

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (trimmed.length < 5) continue;

    // Normalized key for comparison (lowercase alphanumeric only)
    const normKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normKey.length < 4) continue;

    // Check if this sentence is already seen or a duplicate/substring of an existing sentence
    let isDuplicate = false;
    for (const existing of seenNorm) {
      if (
        existing === normKey ||
        (normKey.length > 25 && existing.includes(normKey)) ||
        (existing.length > 25 && normKey.includes(existing))
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seenNorm.add(normKey);
      uniqueSentences.push(trimmed);
    }
  }

  return uniqueSentences.join(' ');
}

/**
 * Universal document extractor: Extracts clean structured text AND embedded photos
 * Supports PDF (with fallback), Word DOCX, DOC, TXT, Markdown, CSV, and JSON.
 */
export async function extractDocumentContent(file: File): Promise<ExtractedDocumentResult> {
  const fileName = file.name.toLowerCase();
  const extractedImages: string[] = [];

  let arrayBuffer: ArrayBuffer | null = null;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    console.warn("Could not read file ArrayBuffer:", err);
  }

  // Detect file magic bytes if available
  let isZip = false;
  let isOleDoc = false;
  let isPdf = false;

  if (arrayBuffer && arrayBuffer.byteLength >= 4) {
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
    isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B && headerBytes[2] === 0x03 && headerBytes[3] === 0x04; // PK\x03\x04
    isOleDoc = headerBytes[0] === 0xD0 && headerBytes[1] === 0xCF && headerBytes[2] === 0x11 && headerBytes[3] === 0xE0; // OLE2 doc
    isPdf = headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46; // %PDF
  }

  // 1. DOCX / OpenXML File Extraction using JSZip (Unpacks word/document*.xml, headers, and word/media/*)
  if (isZip || fileName.endsWith('.docx') || file.type.includes('wordprocessingml') || file.type.includes('officedocument')) {
    if (arrayBuffer) {
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Extract embedded images from word/media/
        const mediaFiles = Object.keys(zip.files).filter(path => 
          path.startsWith('word/media/') && /\.(png|jpe?g|webp|gif|bmp)$/i.test(path)
        );

        const mediaList: { path: string; size: number; base64: string }[] = [];
        for (const mediaPath of mediaFiles) {
          try {
            const imgFile = zip.files[mediaPath];
            if (imgFile) {
              const base64 = await imgFile.async('base64');
              // Filter out tiny icons (< 3KB)
              if (base64.length > 3000) {
                mediaList.push({ path: mediaPath, size: base64.length, base64 });
              }
            }
          } catch (imgErr) {
            console.warn("Could not inspect DOCX media:", mediaPath, imgErr);
          }
        }

        mediaList.sort((a, b) => b.size - a.size);

        for (const item of mediaList.slice(0, 4)) {
          const ext = item.path.split('.').pop()?.toLowerCase() || 'jpeg';
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          extractedImages.push(`data:${mimeType};base64,${item.base64}`);
        }

        // Collect all XML text files in the DOCX package
        const textParts: string[] = [];
        const xmlPaths = Object.keys(zip.files).filter(p => 
          p.startsWith('word/') && (
            p.includes('document') || 
            p.includes('header') || 
            p.includes('footer') || 
            p.includes('footnotes') || 
            p.includes('endnotes')
          ) && p.endsWith('.xml')
        );

        // Prioritize word/document.xml first
        xmlPaths.sort((a, b) => (a === 'word/document.xml' ? -1 : b === 'word/document.xml' ? 1 : 0));

        for (const xmlPath of xmlPaths) {
          const docXmlFile = zip.files[xmlPath];
          if (docXmlFile) {
            const xmlStr = await docXmlFile.async('string');
            const lines = extractTextFromWordXml(xmlStr);
            textParts.push(...lines);
          }
        }

        const fullText = textParts.join('\n');
        if (fullText.trim().length > 10) {
          return {
            text: fullText,
            images: extractedImages.slice(0, 4)
          };
        }
      } catch (docxErr) {
        console.warn("JSZip DOCX extraction error:", docxErr);
      }
    }
  }

  // 2. Legacy Word Binary (.doc) Extraction
  if (isOleDoc || fileName.endsWith('.doc')) {
    if (arrayBuffer) {
      try {
        const docText = extractTextFromBinaryDoc(arrayBuffer);
        if (docText.trim().length > 15) {
          return {
            text: docText,
            images: []
          };
        }
      } catch (docErr) {
        console.warn("Legacy DOC extraction error:", docErr);
      }
    }
  }

  // 3. PDF File Extraction using pdfjs-dist
  if (isPdf || fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    if (arrayBuffer) {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const textChunks: string[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);

          // Text content
          const textContent = await page.getTextContent();
          const items = textContent.items as Array<{
            str: string;
            transform: number[];
            hasEOL?: boolean;
            width?: number;
            height?: number;
          }>;

          if (items && items.length > 0) {
            // Sort items: Top to bottom (Y descending), then Left to right (X ascending)
            const sortedItems = [...items].sort((a, b) => {
              const yA = a.transform[5];
              const yB = b.transform[5];
              if (Math.abs(yA - yB) > 4) {
                return yB - yA;
              }
              return a.transform[4] - b.transform[4];
            });

            const pageLines: string[] = [];
            let currentLine = '';
            let lastY = -1;

            for (const it of sortedItems) {
              const textStr = (it.str || '').trim();
              if (!textStr) continue;

              const curY = it.transform[5];
              if (lastY === -1) {
                currentLine = textStr;
                lastY = curY;
              } else if (Math.abs(lastY - curY) > 6) {
                if (currentLine.trim()) {
                  pageLines.push(currentLine.trim());
                }
                currentLine = textStr;
                lastY = curY;
              } else {
                currentLine += (currentLine.endsWith(' ') || currentLine.endsWith(':') ? '' : ' ') + textStr;
              }
            }

            if (currentLine.trim()) {
              pageLines.push(currentLine.trim());
            }

            if (pageLines.length > 0) {
              textChunks.push(pageLines.join('\n'));
            }
          }

          // Extract genuine embedded photo XObjects
          try {
            const ops = await page.getOperatorList();
            for (let i = 0; i < ops.fnArray.length; i++) {
              const fn = ops.fnArray[i];
              if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
                const imgKey = ops.argsArray[i][0];
                if (imgKey) {
                  let imgObj: any = null;
                  try {
                    if (page.objs && typeof (page.objs as any).get === 'function') {
                      imgObj = await new Promise(resolve => {
                        try {
                          const direct = (page.objs as any).get(imgKey, (obj: any) => resolve(obj));
                          if (direct) resolve(direct);
                        } catch (_) {
                          resolve(null);
                        }
                      });
                    }
                    if (!imgObj && (pdfDoc as any).commonObjs) {
                      imgObj = (pdfDoc as any).commonObjs.get(imgKey);
                    }
                  } catch (_) {}

                  if (imgObj && imgObj.width && imgObj.height) {
                    const w = imgObj.width;
                    const h = imgObj.height;
                    const aspect = w / h;

                    if (w >= 120 && h >= 90 && aspect >= 0.35 && aspect <= 4.0) {
                      const canvas = document.createElement('canvas');
                      canvas.width = w;
                      canvas.height = h;
                      const ctx = canvas.getContext('2d');

                      if (ctx) {
                        if (imgObj.data) {
                          const imgLen = imgObj.data.length;
                          let imgData: ImageData;
                          if (imgLen === w * h * 4) {
                            imgData = new ImageData(new Uint8ClampedArray(imgObj.data), w, h);
                          } else if (imgLen === w * h * 3) {
                            imgData = ctx.createImageData(w, h);
                            for (let src = 0, dst = 0; src < imgLen; src += 3, dst += 4) {
                              imgData.data[dst] = imgObj.data[src];
                              imgData.data[dst + 1] = imgObj.data[src + 1];
                              imgData.data[dst + 2] = imgObj.data[src + 2];
                              imgData.data[dst + 3] = 255;
                            }
                          } else if (imgLen === w * h) {
                            imgData = ctx.createImageData(w, h);
                            for (let src = 0, dst = 0; src < imgLen; src++, dst += 4) {
                              const val = imgObj.data[src];
                              imgData.data[dst] = val;
                              imgData.data[dst + 1] = val;
                              imgData.data[dst + 2] = val;
                              imgData.data[dst + 3] = 255;
                            }
                          } else {
                            imgData = new ImageData(new Uint8ClampedArray(imgObj.data.buffer || imgObj.data), w, h);
                          }
                          ctx.putImageData(imgData, 0, 0);
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                          extractedImages.push(dataUrl);
                        } else if (typeof ctx.drawImage === 'function') {
                          ctx.drawImage(imgObj, 0, 0);
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                          extractedImages.push(dataUrl);
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (imgExtractErr) {
            console.warn("Direct embedded XObject image extraction error on page", pageNum, imgExtractErr);
          }
        }

        const fullText = textChunks.join('\n\n');
        if (fullText.trim().length > 10) {
          return {
            text: fullText,
            images: extractedImages.slice(0, 4)
          };
        }
      } catch (pdfErr) {
        console.warn("pdfjs extraction failed:", pdfErr);
      }
    }
  }

  // 4. Plain Text, Markdown, CSV, JSON (Guarded: NEVER treat binary data as plain text)
  if (!isZip && !isOleDoc && !isPdf && (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json'))) {
    try {
      const text = await file.text();
      if (text && text.trim().length > 0 && !isBinaryOrXmlJunk(text)) {
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
  }

  // 5. Default Clean Safe Fallback (NEVER return raw binary garbage)
  const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  return {
    text: `Event Report: ${cleanBaseName}`,
    images: []
  };
}

export async function extractTextFromDocument(file: File): Promise<string> {
  const res = await extractDocumentContent(file);
  return res.text;
}

/**
 * Universal NLP & Heuristic Parser for Any Academic / Department Event Report
 * Accurately extracts meaning, definitions, context, and key entities.
 */
export function parseReportEntities(
  rawText: string,
  fileName: string,
  defaultDepartment: string = "Information Technology"
): ParsedReportData {
  const cleanFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  
  // 0. Binary & XML Scrubbing Guard: Strip all zip metadata, xml paths, binary markers
  let text = (rawText || cleanFileName)
    .replace(/\r\n/g, '\n')
    .replace(/PK[\x00-\x1F\x7F-\xFF]+\[Content_Types\][\s\S]*/gi, '')
    .replace(/(?:\/[a-zA-Z0-9_\-]+\.xml|\b[a-zA-Z0-9_\-]+\.xml(?:PK)?[\x00-\x1F\x7F-\xFF\s\>\]\:\;]*)/gi, ' ')
    .replace(/customxml\/[^\s]+/gi, ' ')
    .replace(/word\/(?:media|theme|fontTable|settings|webSettings|styles|numbering)[^\s]*/gi, ' ')
    .replace(/docProps\/[^\s]*/gi, ' ')
    .replace(/[^\x20-\x7E\s\u00A0-\u024F\u0900-\u0D7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean common institutional template headers to isolate event-specific data
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

  // 1. Intelligent Category Detection
  let category = "workshop";
  if (lower.includes("placement") || lower.includes("recruiter") || lower.includes("package") || lower.includes("lpa") || lower.includes("hired") || lower.includes("campus drive") || lower.includes("offer letter") || lower.includes("placed")) {
    category = "placement";
  } else if (lower.includes("hackathon") || lower.includes("first place") || lower.includes("second place") || lower.includes("1st prize") || lower.includes("2nd prize") || lower.includes("trophy") || lower.includes("cash award") || lower.includes("competition winner") || lower.includes("achiever") || lower.includes("won the")) {
    category = "student";
  } else if (lower.includes("faculty") || lower.includes("research paper") || lower.includes("journal publication") || lower.includes("scopus") || lower.includes("ieee") || lower.includes("springer") || lower.includes("patent") || lower.includes("impact factor") || lower.includes("author")) {
    category = "faculty";
  } else if (lower.includes("workshop") || lower.includes("seminar") || lower.includes("hands-on") || lower.includes("guest lecture") || lower.includes("resource person") || lower.includes("campus to career") || lower.includes("fdp") || lower.includes("training program") || lower.includes("webinar") || lower.includes("keynote")) {
    category = "workshop";
  } else if (lower.includes("welcome") || lower.includes("orientation") || lower.includes("induction") || lower.includes("fresher") || lower.includes("farewell") || lower.includes("inauguration of association")) {
    category = "welcome";
  } else {
    category = "custom";
  }

  // 2. Event Title Extraction (with strict junk rejection)
  let title = "";
  const titlePatterns = [
    /(?:Event Title|Title of the Event|Name of the Event|Topic|Theme|Project Title|Paper Title|Event Name)\s*[:\-\s]*\s*([^\n\r]+?)(?=\s*(?:Organizing Body|Collaborations|Details of|Resource Person|Speaker|Organizing Department|Nature of|Event Date|Date|Venue|Time|\n\n|$))/i,
    /CAMPUS TO CAREER SERIES[^\n\r]*/i,
    /Guest Lecture on\s+([^\n\r]+)/i,
    /Workshop on\s+([^\n\r]+)/i,
    /Seminar on\s+([^\n\r]+)/i,
    /Orientation Program on\s+([^\n\r]+)/i,
    /Two[- ]Day\s+(?:National|International|Hands[- ]on)?\s+(?:Workshop|Seminar|Conference|Symposium|FDP)\s+on\s+([^\n\r]+)/i,
    /One[- ]Day\s+(?:National|International|Hands[- ]on)?\s+(?:Workshop|Seminar|Conference|Symposium|FDP)\s+on\s+([^\n\r]+)/i,
    /Placement Drive by\s+([^\n\r]+)/i
  ];

  for (const regex of titlePatterns) {
    const m = sanitizedText.match(regex);
    if (m && m[1] && m[1].trim().length > 3) {
      const candidate = m[1].trim().replace(/^[-:•\s]+/, '').replace(/[-:•\s]+$/, '');
      const candLower = candidate.toLowerCase();
      if (!isBinaryOrXmlJunk(candidate) &&
          !candidate.includes('/') &&
          !candidate.includes('\\') &&
          !candLower.includes("example report") && 
          !candLower.includes("quality system") && 
          !candLower.includes("report of the event") &&
          !candLower.startsWith("department of") &&
          !candLower.startsWith("dept. of") &&
          !candLower.startsWith("school of")) {
        title = candidate;
        break;
      }
    } else if (m && m[0] && m[0].trim().length > 4) {
      const candidate = m[0].trim().replace(/^[-:•\s]+/, '').replace(/[-:•\s]+$/, '');
      const candLower = candidate.toLowerCase();
      if (!isBinaryOrXmlJunk(candidate) &&
          !candidate.includes('/') &&
          !candidate.includes('\\') &&
          !candLower.includes("example report") && 
          !candLower.includes("quality system") && 
          !candLower.includes("report of the event") &&
          !candLower.startsWith("department of") &&
          !candLower.startsWith("dept. of") &&
          !candLower.startsWith("school of")) {
        title = candidate;
        break;
      }
    }
  }

  // Fallback title extraction from topic matches or clean lines
  const isGenericTitle = !title || 
    title.length < 4 || 
    isBinaryOrXmlJunk(title) ||
    title.includes('/') ||
    title.toLowerCase().includes("example report") || 
    title.toLowerCase().includes("quality system") || 
    title.toLowerCase().includes("report of the event") || 
    title.toLowerCase().startsWith("department of") ||
    title.toLowerCase().startsWith("dept. of") ||
    title.includes("VERSION:");

  if (isGenericTitle) {
    const topicMatch = sanitizedText.match(/(?:organized a guest lecture on|organized a workshop on|seminar on|session on|program on)\s+["']?([^"'\n\r\.]+)/i) ||
                       sanitizedText.match(/(?:CAMPUS TO CAREER SERIES[^\n\r]*)/i) ||
                       sanitizedText.match(/(?:Topic|Theme|Subject|Event Name|Title)\s*[:\-\s]*\s*([^\n\r]+)/i);
    if (topicMatch && (topicMatch[1] || topicMatch[0])) {
      const cand = (topicMatch[1] || topicMatch[0]).trim().replace(/^["']|["']$/g, '');
      if (!isBinaryOrXmlJunk(cand) && !cand.includes('/')) {
        title = cand;
      }
    }
    
    if (!title || isBinaryOrXmlJunk(title)) {
      const lines = sanitizedText.split('\n').map(l => l.trim()).filter(l => 
        l.length > 6 && l.length < 110 && 
        !isBinaryOrXmlJunk(l) &&
        !l.includes('/') &&
        !l.toLowerCase().includes("example report") &&
        !l.toLowerCase().includes("quality system") &&
        !l.toLowerCase().includes("report of the event") &&
        !l.toLowerCase().includes("version:") &&
        !l.toLowerCase().startsWith("department of") &&
        !l.toLowerCase().startsWith("dept. of") &&
        !l.toLowerCase().startsWith("school of") &&
        !l.toLowerCase().startsWith("date") && 
        !l.toLowerCase().startsWith("venue") &&
        !l.toLowerCase().startsWith("time") &&
        !l.toLowerCase().startsWith("kpr") &&
        !l.toLowerCase().startsWith("page")
      );
      title = lines.length > 0 ? lines[0] : cleanFileName;
    }
  }

  title = title.toUpperCase().replace(/\s+/g, ' ').trim();

  // 3. Resource Person / Speaker / Chief Guest / Student Achievers / Facilitator
  let student = "";
  const resourceBlockMatch = sanitizedText.match(
    /(?:Details of Resource Person|Resource Person Details|Resource Person|Chief Guest|Speaker|Trainer|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Expert|Student\(s\)?|Student Name|Students|Winners|Team Members|Recruiter|Company)\s*[:\-\s]*\s*([\s\S]*?)(?=(?:Organizing Department|Organizing Body|Nature of the Event|Event Date|Date|Venue|Time|Total number|Purpose|Summary|Outcome|Target Audience|Achievement|Journal|Package|Count|\n\s*\n|$))/i
  );

  if (resourceBlockMatch && resourceBlockMatch[1]) {
    let candidate = resourceBlockMatch[1]
      .replace(/[\r\n]+/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/^[:\-\s,]+/, '')
      .replace(/[:\-\s,]+$/, '')
      .trim();

    candidate = candidate.replace(/^Name\s*:\s*/i, '').trim();

    if (candidate.length > 3 && 
        !isBinaryOrXmlJunk(candidate) &&
        !candidate.includes('/') &&
        !candidate.toLowerCase().startsWith("date") && 
        !candidate.toLowerCase().startsWith("seminar") && 
        !candidate.toLowerCase().startsWith("department") && 
        !candidate.toLowerCase().includes("distinguished resource person")) {
      student = candidate;
    }
  }

  if (!student || student.length < 3) {
    const singleLineMatch = sanitizedText.match(
      /(?:Details of Resource Person|Resource Person Details|Resource Person|Chief Guest|Speaker|Trainer|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Expert|Student\(s\)?|Student Name|Students|Winners|Team Members|Recruiter|Company)\s*[:\-\s]+\s*([^\n\r]+)/i
    );
    if (singleLineMatch && singleLineMatch[1]) {
      const cand = singleLineMatch[1].trim();
      if (cand.length > 3 && !isBinaryOrXmlJunk(cand) && !cand.includes('/') && !cand.toLowerCase().startsWith("date") && !cand.toLowerCase().startsWith("venue") && !cand.toLowerCase().startsWith("department")) {
        student = cand;
      }
    }
  }

  if (!student || student.length < 4) {
    const honorificMatches = sanitizedText.match(/(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+(?:,\s*[A-Za-z\s\-&]+)?/g);
    if (honorificMatches && honorificMatches.length > 0) {
      const filtered = honorificMatches.filter(h => 
        !isBinaryOrXmlJunk(h) &&
        !h.toLowerCase().includes("geetha") && 
        !h.toLowerCase().includes("sharmila") &&
        !h.toLowerCase().includes("principal") &&
        !h.toLowerCase().includes("dean")
      );
      if (filtered.length > 0) {
        student = filtered[0].trim();
      }
    }
  }

  if (student) {
    student = student.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }

  // 4. Dignitaries (Principal, Dean, HOD)
  let principalName = "Dr. P. Geetha (Principal, KPRCAS)";
  const princMatch = sanitizedText.match(/(?:Dr\.\s+P\.\s+Geetha)/i) ||
                     sanitizedText.match(/(?:presided over by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Principal)?)/i);
  if (princMatch && princMatch[1] && !isBinaryOrXmlJunk(princMatch[1])) {
    principalName = princMatch[1].trim();
  }

  let deanName = "Dr. P. Sharmila (Dean – SoCS)";
  const deanMatch = sanitizedText.match(/(?:Dr\.\s+P\.\s+Sharmila)/i) ||
                    sanitizedText.match(/(?:felicitated by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Dean)?)/i);
  if (deanMatch && deanMatch[1] && !isBinaryOrXmlJunk(deanMatch[1])) {
    deanName = deanMatch[1].trim();
  }

  let hodName = "";
  const hodMatch = sanitizedText.match(/(?:Head of the Department|HOD)[,\s:]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i);
  if (hodMatch && hodMatch[1] && !isBinaryOrXmlJunk(hodMatch[1])) {
    hodName = hodMatch[1].trim();
  }

  // 5. Student Anchors / Vote of Thanks
  let studentAnchors = "";
  const anchorMatches = sanitizedText.match(/(?:Ms\.|Mr\.)\s+[A-Z][a-z\.\s]+,\s*(?:I|II|III|IV)\s+(?:IT|B\.Sc|BCA|CS|Commerce)[^\n.]*/gi);
  if (anchorMatches && anchorMatches.length > 0) {
    studentAnchors = anchorMatches.filter(a => !isBinaryOrXmlJunk(a)).join(', ');
  }

  // 6. Class & Department
  let classDept = "";
  const deptMatch = sanitizedText.match(/(?:Organizing Department|Department of|Dept\. of)[:\s]+([^\n\r]+)/i);
  if (deptMatch && deptMatch[1]) {
    const deptFound = deptMatch[1].trim();
    if (!isBinaryOrXmlJunk(deptFound) && !deptFound.toLowerCase().startsWith("date") && !deptFound.toLowerCase().startsWith("venue")) {
      classDept = deptFound.toUpperCase();
    }
  }
  if (!classDept) {
    const classPatternMatch = sanitizedText.match(/(?:II|III|I|IV)\s+(?:IT|B\.Sc|BCA|CS|B\.Sc\.\s+IT)[^,\n.]*/i);
    if (classPatternMatch && !isBinaryOrXmlJunk(classPatternMatch[0])) {
      classDept = classPatternMatch[0].trim().toUpperCase();
    } else {
      classDept = `DEPARTMENT OF ${defaultDepartment.toUpperCase()}`;
    }
  }

  // 7. Team Name / Collaborations
  let teamName = "";
  const collabMatch = sanitizedText.match(/(?:Collaborations|Organizing Body|Sponsored by|Association|Club|In Association with)(?:\s*\(If any\))?[:\s]+([^\n\r]+)/i);
  if (collabMatch && collabMatch[1] && collabMatch[1].trim().length > 3 && !collabMatch[1].includes("-") && !collabMatch[1].toLowerCase().startsWith("nil") && !isBinaryOrXmlJunk(collabMatch[1])) {
    teamName = collabMatch[1].trim();
  } else {
    const teamMatch = sanitizedText.match(/(?:team name:?|team:?|team name is)\s*([^.,;\n]{2,50})/i);
    if (teamMatch && !isBinaryOrXmlJunk(teamMatch[1])) {
      teamName = teamMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  // 8. Event Date
  let date = "August 2025";
  const dateMatch = sanitizedText.match(/(?:Event Date|Date of the Event|Date)[:\s]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i) ||
                    sanitizedText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/);
  if (dateMatch) {
    const foundDate = (dateMatch[1] || dateMatch[0]).trim();
    if (!foundDate.includes("18/02/2022") && !foundDate.includes("01/01/1970") && !isBinaryOrXmlJunk(foundDate)) {
      date = foundDate;
    }
  }

  // 9. Venue & Attendance
  let venue = "Seminar Hall";
  const venueMatch = sanitizedText.match(/Venue[:\s]+([^\n\r,]+)/i);
  if (venueMatch && venueMatch[1] && !isBinaryOrXmlJunk(venueMatch[1])) {
    venue = venueMatch[1].trim();
  }

  let participantInfo = "";
  const partMatch = sanitizedText.match(/(?:Total number of Students Participated|Participants Count|Total Beneficiaries|Attendance)[:\s]+(\d+)/i);
  if (partMatch) {
    participantInfo = `with active participation from over ${partMatch[1]} students and faculty members`;
  }

  // 10. Purpose, Detailed Summary & Outcomes (Definition & Meaning)
  let purpose = "";
  const purposeMatch = sanitizedText.match(/(?:Purpose of the Event|Objective\(s\)?|Aim of the Event|Abstract)[:\s]+([\s\S]*?)(?=Summary of the Event|Outcome of the Event|Date|Venue|Proceedings|$)/i);
  if (purposeMatch && purposeMatch[1] && !isBinaryOrXmlJunk(purposeMatch[1])) {
    purpose = purposeMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let summary = "";
  const summaryMatch = sanitizedText.match(/(?:Summary of the Event|Proceedings|Event Description|Executive Summary)[:\s]+([\s\S]*?)(?=Outcome of the Event|Geo-Tagged|Photographs|HOD|Dean|Principal|$)/i);
  if (summaryMatch && summaryMatch[1] && !isBinaryOrXmlJunk(summaryMatch[1])) {
    summary = summaryMatch[1].replace(/[\r\n]+/g, ' ').replace(/[•\*\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let outcome = "";
  const outcomeMatch = sanitizedText.match(/(?:Outcome of the Event|Key Outcomes|Feedback & Conclusion|Results)[:\s]+([\s\S]*?)(?=Geo-Tagged|Photographs|HOD|Dean|Principal|$)/i);
  if (outcomeMatch && outcomeMatch[1] && !isBinaryOrXmlJunk(outcomeMatch[1])) {
    outcome = outcomeMatch[1].replace(/[\r\n]+/g, ' ').replace(/[•\*\-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const award = teamName ? `Collaboration: ${teamName}` : `Department Academic Initiative`;
  const host = `${principalName} & ${deanName}${hodName ? `, ${hodName} (HOD)` : ''}`;
  const details = summary || purpose || sanitizedText.substring(0, 300);
  const keywords = outcome ? outcome.substring(0, 200) : "Skill enhancement, technical capability, executive presentation, student participation";

  // 11. Cohesive, Publication-Grade Article Synthesizer (Captures Exact Meaning & Definition)
  const sentences: string[] = [];
  const deptDisplayName = classDept ? (classDept.startsWith('DEPARTMENT OF') ? classDept : `DEPARTMENT OF ${classDept}`) : `DEPARTMENT OF ${defaultDepartment.toUpperCase()}`;

  // Sentence 1: Lead opening
  sentences.push(
    `The ${deptDisplayName}, KPRCAS, ${teamName ? `in collaboration with ${teamName}, ` : ''}successfully organized the academic program titled "${title}" on ${date} at the ${venue}${participantInfo ? ` ${participantInfo}` : ''}.`
  );

  // Sentence 2: Resource Person / Dignitary Keynote
  if (student) {
    sentences.push(
      `The session featured eminent Resource Person ${student}, who delivered an empowering keynote address and shared valuable practical insights with the attendees.`
    );
  } else {
    sentences.push(
      `The program was presided over by ${principalName} and felicitated by ${deanName}.`
    );
  }

  // Sentence 3: Purpose & Detailed Summary
  if (summary && summary.length > 25) {
    sentences.push(summary);
  } else if (purpose && purpose.length > 15) {
    const cleanPurp = purpose.toLowerCase().startsWith('to ') ? purpose : `to ${purpose}`;
    sentences.push(`The core objective of the program was ${cleanPurp}.`);
  }

  // Sentence 4: Key Outcomes & Practical Learning
  if (outcome && outcome.length > 15) {
    sentences.push(`Key outcomes achieved: ${outcome}.`);
  } else {
    sentences.push(`The interactive session enabled participants to gain practical knowledge, build industry-ready skills, and develop greater academic excellence.`);
  }

  if (studentAnchors) {
    sentences.push(`Student coordinators (${studentAnchors}) actively coordinated the proceedings.`);
  }

  // Sentence 5: Concluding appreciation
  sentences.push(
    `The Principal, Dean, and Department Faculty members warmly commended all organizers, resource delegates, and student participants for making the event a grand success.`
  );

  const rawArticle = sentences.join(' ');
  const article = deduplicateSentences(rawArticle);

  return {
    category,
    title,
    teamName,
    student,
    classDept,
    date,
    award,
    host,
    details: details.substring(0, 350),
    keywords: keywords.substring(0, 250),
    article,
    rawText: sanitizedText,
    images: []
  };
}
