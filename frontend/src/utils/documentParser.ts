import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Ensure PDF worker is initialized gracefully with cross-origin Blob URL fallback
try {
  if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    try {
      const workerCode = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js");`;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch (_) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
    }
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
  categoryTag?: string;
  title: string;
  teamName: string;
  student: string;
  classDept: string;
  date: string;
  venue: string;
  purpose: string;
  summary: string;
  outcome: string;
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
    s.includes('document.xml') ||
    str.includes('\uFFFD') ||
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(str)
  );
}

/**
 * Strips all Wingdings symbols (, , , ), square boxes (□, ■), bullet characters (•, *),
 * XML tags, binary markers, and institutional header boilerplate from document text.
 */
export function cleanAndSanitizeReportText(rawText: string): string {
  if (!rawText) return '';

  const decoded = decodeXmlEntities(rawText);

  return decoded
    .replace(/\r\n/g, '\n')
    // 1. Strip raw binary / ZIP / XML metadata
    .replace(/PK[\x00-\x1F\x7F-\xFF]+\[Content_Types\][\s\S]*/gi, '')
    .replace(/(?:\/[a-zA-Z0-9_\-]+\.xml|\b[a-zA-Z0-9_\-]+\.xml(?:PK)?[\x00-\x1F\x7F-\xFF\s\>\]\:\;]*)/gi, ' ')
    .replace(/customxml\/[^\s]+/gi, ' ')
    .replace(/word\/(?:media|theme|fontTable|settings|webSettings|styles|numbering)[^\s]*/gi, ' ')
    .replace(/docProps\/[^\s]*/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    // 2. Strip Unicode Private Use Area (Wingdings bullets like , , , , , ) and replacement chars
    .replace(/[\uE000-\uF8FF\uFFF0-\uFFFF\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    // 3. Strip geometric shapes & square boxes (□, ■, ▲, etc.)
    .replace(/[\u25A0-\u25FF\u2500-\u257F]/g, ' ')
    // 4. Strip bullet symbols and messy punctuation markers while preserving standard word hyphens
    .replace(/[•●○◦▪▫~|]+/g, ' ')
    // 5. Clean common institutional boilerplate tags
    .replace(/KPRCAS\/IQAC\/[^\n]*/gi, '')
    .replace(/VERSION:\s*\d+/gi, '')
    .replace(/Quality System Document/gi, '')
    .replace(/KPR College of Arts Science and Research/gi, '')
    .replace(/\(Affiliated to Bharathiar University[^\)]*\)/gi, '')
    .replace(/Avinashi Road, Arasur[^\n]*/gi, '')
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/Signature of the (?:Coordinator|HOD|Dean|Principal|Faculty)/gi, '')
    .replace(/Prepared by[\s\S]*?Approved by/gi, '')
    // 6. Strip duplicated consecutive words like "with with", "in in", "the the"
    .replace(/\b(with|in|the|of|on|at|and|to|for|a|an|by|is|was|were|has|have|had)\s+\1\b/gi, '$1')
    // 7. Strip incomplete dangling honorific clauses like "presided over by Dr." or lone "Dr." without a name
    .replace(/\b(?:presided over by|felicitated by|graced by|addressed by)\s+Dr\.\s*(?=[.\n\s]|$)/gi, '')
    .replace(/\bDr\.\s*(?=[.\n\s]|$)/gi, '')
    .replace(/\bre\s+sounding\b/gi, 'resounding')
    // 8. Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
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

    const cleanLine = cleanAndSanitizeReportText(decodeXmlEntities(textChunk));
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
    const cleanBuf = cleanAndSanitizeReportText(currentBuf);
    if (cleanBuf.trim() && !isBinaryOrXmlJunk(cleanBuf)) {
      lines.push(cleanBuf.trim());
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
          const cleaned = cleanAndSanitizeReportText(currentChunk);
          if (cleaned.length >= 4) {
            asciiChunks.push(cleaned);
          }
        }
      }
      currentChunk = '';
    }
  }

  if (currentChunk.trim().length >= 4 && !isBinaryOrXmlJunk(currentChunk)) {
    const cleaned = cleanAndSanitizeReportText(currentChunk);
    if (cleaned.length >= 4) {
      asciiChunks.push(cleaned);
    }
  }

  return asciiChunks.join('\n');
}

/**
 * Deduplicates sentences and strips repeated boilerplate phrases while preserving all substantive sentences and paragraphs.
 */
export function deduplicateSentences(text: string): string {
  if (!text) return '';

  const paragraphs = text.split(/\n\s*\n/);
  const resultParagraphs: string[] = [];
  const seenNorm = new Set<string>();

  for (const para of paragraphs) {
    const rawSentences = para.split(/(?<=[.!?])\s+/);
    const uniqueSentences: string[] = [];

    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (trimmed.length < 5) continue;

      const normKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normKey.length < 5) continue;

      if (!seenNorm.has(normKey)) {
        seenNorm.add(normKey);
        uniqueSentences.push(trimmed);
      }
    }

    if (uniqueSentences.length > 0) {
      resultParagraphs.push(uniqueSentences.join(' '));
    }
  }

  return resultParagraphs.join('\n\n');
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
              if (base64.length > 3000) {
                mediaList.push({ path: mediaPath, size: base64.length, base64 });
              }
            }
          } catch (imgErr) {
            console.warn("Could not inspect DOCX media:", mediaPath, imgErr);
          }
        }

        mediaList.sort((a, b) => b.size - a.size);

        for (const item of mediaList) {
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
            text: cleanAndSanitizeReportText(fullText),
            images: extractedImages
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
            text: cleanAndSanitizeReportText(docText),
            images: []
          };
        }
      } catch (docErr) {
        console.warn("Legacy DOC extraction error:", docErr);
      }
    }
  }

  // 3. PDF File Extraction using pdfjs-dist with raw ArrayBuffer fallback
  if (isPdf || fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    if (arrayBuffer) {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        const textChunks: string[] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);

          const textContent = await page.getTextContent();
          const items = textContent.items as Array<{
            str: string;
            transform: number[];
            hasEOL?: boolean;
            width?: number;
            height?: number;
          }>;

          if (items && items.length > 0) {
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

          // Extract embedded raster photos
          try {
            const ops = await page.getOperatorList();
            for (let i = 0; i < ops.fnArray.length; i++) {
              const fn = ops.fnArray[i];
              if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
                const imgKey = ops.argsArray[i][0];
                if (imgKey) {
                  let imgObj: any = null;
                  try {
                    imgObj = await Promise.race([
                      new Promise(resolve => {
                        try {
                          if (page.objs && typeof (page.objs as any).get === 'function') {
                            const direct = (page.objs as any).get(imgKey, (obj: any) => resolve(obj));
                            if (direct) resolve(direct);
                          } else {
                            resolve(null);
                          }
                        } catch (_) {
                          resolve(null);
                        }
                      }),
                      new Promise(resolve => setTimeout(() => resolve(null), 400))
                    ]);

                    if (!imgObj && (pdfDoc as any).commonObjs && typeof (pdfDoc as any).commonObjs.get === 'function') {
                      imgObj = (pdfDoc as any).commonObjs.get(imgKey);
                    }
                  } catch (_) {}

                  if (imgObj && imgObj.width && imgObj.height) {
                    const w = imgObj.width;
                    const h = imgObj.height;
                    const aspect = w / h;

                    if (w >= 100 && h >= 80 && aspect >= 0.35 && aspect <= 3.5) {
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
                          if (!extractedImages.includes(dataUrl)) {
                            extractedImages.push(dataUrl);
                          }
                        } else if (typeof ctx.drawImage === 'function') {
                          ctx.drawImage(imgObj, 0, 0);
                          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
                          if (!extractedImages.includes(dataUrl)) {
                            extractedImages.push(dataUrl);
                          }
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
        if (fullText.trim().length > 15) {
          return {
            text: cleanAndSanitizeReportText(fullText),
            images: extractedImages
          };
        }
      } catch (pdfErr) {
        console.warn("pdfjs extraction failed, trying raw ArrayBuffer PDF text scanner:", pdfErr);
      }

      // Raw PDF ArrayBuffer Stream Text Scanner Fallback
      try {
        const rawText = extractRawTextFromPdfArrayBuffer(arrayBuffer);
        if (rawText.trim().length > 15) {
          return {
            text: cleanAndSanitizeReportText(rawText),
            images: extractedImages
          };
        }
      } catch (rawPdfErr) {
        console.warn("Raw PDF stream scanner failed:", rawPdfErr);
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
        return { text: cleanAndSanitizeReportText(text), images: [] };
      }
    } catch (textErr) {
      console.warn("Direct file.text() reading error:", textErr);
    }
  }

  // 5. Default Clean Safe Fallback
  const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  return {
    text: `Event Report: ${cleanBaseName}`,
    images: []
  };
}

/**
 * Direct raw text extractor from PDF stream bytes when pdf.js worker fails
 */
function extractRawTextFromPdfArrayBuffer(buffer: ArrayBuffer): string {
  try {
    const textDecoder = new TextDecoder('latin1');
    const raw = textDecoder.decode(buffer);
    const textParts: string[] = [];
    
    // Extract text inside Tj PDF stream objects: (text) Tj
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(raw)) !== null) {
      if (match[1] && match[1].length > 1) {
        const clean = match[1].replace(/\\([()])/g, '$1');
        if (!isBinaryOrXmlJunk(clean) && clean.trim().length > 1) {
          textParts.push(clean);
        }
      }
    }
    
    // Extract text inside TJ arrays: [ (str1) -10 (str2) ] TJ
    const arrayTjRegex = /\[\s*((?:\([^)]*\)|-?\d+\s*)+)\s*\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(raw)) !== null) {
      const inner = match[1];
      const strRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let strMatch: RegExpExecArray | null;
      let lineBuf = '';
      while ((strMatch = strRegex.exec(inner)) !== null) {
        lineBuf += strMatch[1].replace(/\\([()])/g, '$1');
      }
      if (lineBuf.trim().length > 1 && !isBinaryOrXmlJunk(lineBuf)) {
        textParts.push(lineBuf.trim());
      }
    }

    return textParts.join('\n');
  } catch (err) {
    return '';
  }
}

export async function extractTextFromDocument(file: File): Promise<string> {
  const res = await extractDocumentContent(file);
  return res.text;
}

/**
 * Universal NLP & Heuristic Parser for Any Academic / Department Event Report
 * Accurately extracts genuine content, meaning, definitions, context, and key entities from the currently uploaded file.
 */
export function parseReportEntities(
  rawText: string,
  fileName: string,
  defaultDepartment: string = "Information Technology",
  inputImages: string[] = []
): ParsedReportData {
  const cleanFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-+]/g, ' ').trim();
  
  // Clean, strip symbols, strip Wingdings bullets, and sanitize text
  const sanitizedText = cleanAndSanitizeReportText(rawText || cleanFileName);
  const lower = sanitizedText.toLowerCase();

  // 1. Intelligent Category Tag Detection (matching standard department newsletter sections)
  let categoryTag = "DEPARTMENT EVENTS";
  let category = "workshop";

  if (lower.includes("workshop") || lower.includes("guest lecture") || lower.includes("seminar") || lower.includes("webinar") || lower.includes("training") || lower.includes("fdp") || lower.includes("campus to career") || lower.includes("skill development") || lower.includes("hands-on") || lower.includes("lecture on") || lower.includes("session on") || lower.includes("inauguration") || lower.includes("organized a")) {
    categoryTag = "DEPARTMENT EVENTS";
    category = "workshop";
  } else if (lower.includes("orientation") || lower.includes("induction") || lower.includes("fresher") || lower.includes("welcome")) {
    categoryTag = "FRESHERS ORIENTATION";
    category = "welcome";
  } else if (lower.includes("placement") || lower.includes("recruiter") || lower.includes("package") || lower.includes("lpa") || lower.includes("hired") || lower.includes("campus drive") || lower.includes("offer letter") || lower.includes("placed")) {
    categoryTag = "CAMPUS PLACEMENT";
    category = "placement";
  } else if (lower.includes("faculty") || lower.includes("research paper") || lower.includes("journal") || lower.includes("publication") || lower.includes("scopus") || lower.includes("ieee") || lower.includes("ijcrt") || lower.includes("authored") || lower.includes("co-authored")) {
    categoryTag = "FACULTY ACHIEVEMENT";
    category = "faculty";
  } else if (lower.includes("patent") || lower.includes("certification") || lower.includes("prize") || lower.includes("winner") || lower.includes("1st place") || lower.includes("2nd prize") || lower.includes("award") || lower.includes("trophy") || lower.includes("shines at") || lower.includes("bagged") || lower.includes("won") || lower.includes("hackathon")) {
    categoryTag = "STUDENT’S ACHIEVEMENTS";
    category = "student";
  } else if (lower.includes("swachh") || lower.includes("nss") || lower.includes("cleanliness drive") || lower.includes("extension activity") || lower.includes("village") || lower.includes("social service")) {
    categoryTag = "EXTENSION ACTIVITY";
    category = "custom";
  } else if (lower.includes("symposium") || lower.includes("fashion show") || lower.includes("outreach") || lower.includes("book fair") || lower.includes("exhibition") || lower.includes("visit")) {
    categoryTag = "STUDENT PARTICIPATION";
    category = "student";
  } else {
    categoryTag = "DEPARTMENT EVENTS";
    category = "workshop";
  }

  // 2. Event Title Extraction (with concise title extractor & colon/symbol stripping)
  let title = "";
  const titlePatterns = [
    /(?:Event Title|Title of the Event|Name of the Event|Topic|Theme|Project Title|Paper Title|Event Name)\s*[:\-\s]*\s*([^\n\r]+?)(?=\s*(?:Organizing Body|Collaborations|Details of|Resource Person|Speaker|Organizing Department|Nature of|Event Date|Date|Venue|Time|\n\n|$))/i,
    /CAMPUS TO CAREER SERIES[^\n\r]*/i,
    /(?:National|International|State)?\s*Level\s*(?:Technical\s*)?(?:Symposium|Fest|Conference|Workshop)\s*[:\-\s]*\s*([^\n\r]+)/i,
    /TECHRAGA\s*'?\d*[^\n\r]*/i,
    /Guest Lecture on\s+([^\n\r]+)/i,
    /Workshop on\s+([^\n\r]+)/i,
    /Seminar on\s+([^\n\r]+)/i,
    /Orientation Program on\s+([^\n\r]+)/i,
    /(?:Two|One)[- ]Day\s+(?:National|International|Hands[- ]on)?\s*(?:Workshop|Seminar|Conference|Symposium|FDP)\s+on\s+([^\n\r]+)/i,
    /Placement Drive by\s+([^\n\r]+)/i,
    /Association Inauguration[^\n\r]*/i,
    /Knowledge Outreach[^\n\r]*/i,
    /Skill Development Programme[^\n\r]*/i
  ];

  for (const regex of titlePatterns) {
    const m = sanitizedText.match(regex);
    if (m && m[1] && m[1].trim().length > 2) {
      const candidate = m[1].trim().replace(/^[:\-\s•\*\.]+|[:\-\s•\*\.]+$/g, '').trim();
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
    } else if (m && m[0] && m[0].trim().length > 3) {
      const candidate = m[0].trim().replace(/^[:\-\s•\*\.]+|[:\-\s•\*\.]+$/g, '').trim();
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
    title.length < 3 || 
    isBinaryOrXmlJunk(title) ||
    title.includes('/') ||
    title.toLowerCase().includes("example report") || 
    title.toLowerCase().includes("quality system") || 
    title.toLowerCase().includes("report of the event") || 
    title.toLowerCase().startsWith("department of") ||
    title.toLowerCase().startsWith("dept. of") ||
    title.includes("VERSION:");

  if (isGenericTitle) {
    const topicMatch = sanitizedText.match(/(?:organized a guest lecture on|organized a workshop on|seminar on|session on|program on|organized a symposium titled|celebration on|celebration of|organized an educational visit titled|organized an extension activity titled|organized)\s+["']?([^"'\n\r\.]+)/i) ||
                       sanitizedText.match(/(?:CAMPUS TO CAREER SERIES[^\n\r]*)/i) ||
                       sanitizedText.match(/(?:Topic|Theme|Subject|Event Name|Title)\s*[:\-\s]*\s*([^\n\r]+)/i);
    if (topicMatch && (topicMatch[1] || topicMatch[0])) {
      const cand = (topicMatch[1] || topicMatch[0]).trim().replace(/^["':\-\s•]+|["':\-\s•]+$/g, '');
      if (!isBinaryOrXmlJunk(cand) && !cand.includes('/')) {
        title = cand;
      }
    }
    
    if (!title || isBinaryOrXmlJunk(title)) {
      const lines = sanitizedText.split('\n').map(l => l.replace(/^[:\-\s•\*\.]+|[:\-\s•\*\.]+$/g, '').trim()).filter(l => 
        l.length > 4 && l.length < 110 && 
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

  // Format concise, punchy title (max 6-9 words, uppercase)
  let cleanTitleCandidate = title
    .replace(/^[:\-\s•\*\."']+|[:\-\s•\*\."']+$/g, '')
    .replace(/^(?:A\s+|An\s+|The\s+)?(?:Report\s+on\s+|Activity\s+report\s+on\s+|Event\s+report\s+on\s+|Detailed\s+report\s+on\s+)/i, '')
    .trim();

  const splitMatch = cleanTitleCandidate.match(/^(.+?)(?:\s+(?:on|at|to\s+recognize|to\s+celebrate|held\s+on|conducted\s+on|organized\s+on)\s+(?:\d{1,2}|the\s+|KPRCAS|College|recognize|appreciate))/i);
  if (splitMatch && splitMatch[1] && splitMatch[1].trim().length >= 4) {
    cleanTitleCandidate = splitMatch[1].trim();
  }

  const titleWords = cleanTitleCandidate.split(/\s+/);
  if (titleWords.length > 9 || cleanTitleCandidate.length > 70) {
    cleanTitleCandidate = titleWords.slice(0, 8).join(' ');
  }

  title = cleanTitleCandidate.toUpperCase().replace(/\s+/g, ' ').trim();

  // 3. Resource Person / Speaker / Chief Guest / Student Achievers / Facilitator
  let student = "";
  const resourceBlockMatch = sanitizedText.match(
    /(?:Details of Resource Person|Resource Person Details|Resource Person|Chief Guest|Speaker|Trainer|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Expert|Student\(s\)?|Student Name|Students|Winners|Team Members|Recruiter|Company)\s*[:\-\s]*\s*([\s\S]*?)(?=(?:Organizing Department|Organizing Body|Nature of the Event|Event Date|Date|Venue|Time|Total number|Purpose|Summary|Outcome|Target Audience|Achievement|Journal|Package|Count|1\.\s*Introduction|Head of the Department|Academic Year|\n\s*\n|$))/i
  );

  if (resourceBlockMatch && resourceBlockMatch[1]) {
    let candidate = resourceBlockMatch[1]
      .split(/(?:Head of the Department|HOD|Academic Year|1\.\s*Introduction|Introduction|Objectives|Summary|Outcome|Venue|Date|Time|Signature)/i)[0]
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
      if (candidate.length > 80) {
        candidate = candidate.substring(0, 80).replace(/,[^,]*$/, '').trim();
      }
      student = candidate;
    }
  }

  if (!student || student.length < 3) {
    const singleLineMatch = sanitizedText.match(
      /(?:Details of Resource Person|Resource Person Details|Resource Person|Chief Guest|Speaker|Trainer|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Expert|Student\(s\)?|Student Name|Students|Winners|Team Members|Recruiter|Company)\s*[:\-\s]+\s*([^\n\r]+)/i
    );
    if (singleLineMatch && singleLineMatch[1]) {
      let cand = singleLineMatch[1].trim().replace(/^[:\-\s,]+|[:\-\s,]+$/g, '');
      cand = cand.split(/(?:Head of the Department|Academic Year|1\.\s*Introduction|Introduction|Objectives|Summary)/i)[0].trim();
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
        let hName = filtered[0].trim();
        if (hName.length > 70) hName = hName.substring(0, 70).trim();
        student = hName;
      }
    }
  }

  if (student) {
    student = student.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }

  // 4. Dignitaries (ONLY IF EXPLICITLY PRESENT IN THIS DOCUMENT)
  let principalName = "";
  if (lower.includes("geetha")) {
    principalName = "Dr. P. Geetha (Principal, KPRCAS)";
  } else {
    const princMatch = sanitizedText.match(/(?:presided over by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Principal)?)/i);
    if (princMatch && princMatch[1] && !isBinaryOrXmlJunk(princMatch[1])) {
      principalName = princMatch[1].trim();
    }
  }

  let deanName = "";
  if (lower.includes("sharmila")) {
    deanName = "Dr. P. Sharmila (Dean – SoCS)";
  } else {
    const deanMatch = sanitizedText.match(/(?:felicitated by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Dean)?)/i);
    if (deanMatch && deanMatch[1] && !isBinaryOrXmlJunk(deanMatch[1])) {
      deanName = deanMatch[1].trim();
    }
  }

  let hodName = "";
  const hodMatch = sanitizedText.match(/(?:Head of the Department|HOD)[,\s:]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i);
  if (hodMatch && hodMatch[1] && !isBinaryOrXmlJunk(hodMatch[1])) {
    hodName = hodMatch[1].trim();
  }

  // 5. Student Anchors / Vote of Thanks

  // 6. Class & Department
  let classDept = "";
  const deptMatch = sanitizedText.match(/(?:Organizing Department|Department of|Dept\. of)[:\s]+([^\n\r]+)/i);
  if (deptMatch && deptMatch[1]) {
    const deptFound = deptMatch[1].trim().replace(/^[:\-\s,]+|[:\-\s,]+$/g, '');
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

  // 7. Team Name / Collaborations / Association
  let teamName = "";
  const collabMatch = sanitizedText.match(/(?:Collaborations|Organizing Body|Sponsored by|Association|Club|In Association with)(?:\s*\(If any\))?[:\s]+([^\n\r]+)/i);
  if (collabMatch && collabMatch[1] && collabMatch[1].trim().length > 3 && !collabMatch[1].includes("-") && !collabMatch[1].toLowerCase().startsWith("nil") && !isBinaryOrXmlJunk(collabMatch[1])) {
    teamName = collabMatch[1].trim().replace(/^[:\-\s,]+|[:\-\s,]+$/g, '');
  } else {
    const teamMatch = sanitizedText.match(/(?:team name:?|team:?|team name is)\s*([^.,;\n]{2,50})/i);
    if (teamMatch && !isBinaryOrXmlJunk(teamMatch[1])) {
      teamName = teamMatch[1].trim().replace(/^["']|["']$/g, '');
    }
  }

  // 8. Event Date (ONLY IF FOUND IN CURRENT DOCUMENT, with date range support)
  let date = "";
  const dateMatch = sanitizedText.match(/(?:Event Date|Date of the Event|Date)\s*[:\s]+\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}(?:\s*(?:to|-)\s*[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})?|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4}(?:\s*(?:to|-)\s*[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})?|[A-Za-z]+\s+[0-9]{1,2}(?:,\s*[0-9]{4})?(?:\s*(?:to|-)\s*[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})?|[A-Za-z]+\s+[0-9]{4})/i) ||
                    sanitizedText.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}(?:\s*(?:to|-)\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})?\b/);
  if (dateMatch) {
    const foundDate = (dateMatch[1] || dateMatch[0]).trim().replace(/^[:\-\s,]+|[:\-\s,]+$/g, '');
    if (!foundDate.includes("18/02/2022") && !foundDate.includes("01/01/1970") && !isBinaryOrXmlJunk(foundDate)) {
      date = foundDate;
    }
  }

  // 9. Venue & Attendance (ONLY IF FOUND IN CURRENT DOCUMENT)
  let venue = "";
  const venueMatch = sanitizedText.match(/(?:Venue|Hall|Auditorium|Lab|Location|Premises)\s*[:\s]+\s*([^\n\r,]+)/i);
  if (venueMatch && venueMatch[1] && !isBinaryOrXmlJunk(venueMatch[1])) {
    const vCandidate = decodeXmlEntities(venueMatch[1].trim()).replace(/^[:\-\s,]+|[:\-\s,]+$/g, '');
    if (vCandidate.length > 2 && !vCandidate.toLowerCase().startsWith("date") && !vCandidate.toLowerCase().startsWith("time") && !vCandidate.toLowerCase().startsWith("page")) {
      venue = vCandidate;
    }
  }

  // 10. Extract Genuine Document Content Sections in FULL
  let purpose = "";
  const purposeMatch = sanitizedText.match(/(?:Purpose of the Event|Purpose|Objective\(s\)?|Objectives|Aim of the Event|Abstract|Background|Context|Theme & Concept)\s*[:\s]+\s*([\s\S]*?)(?=(?:Summary of the Event|Summary|Proceedings|Events Conducted|Competitions|Outcome of the Event|Outcome|Target Audience|Venue|Date|HOD|Dean|Principal|Signature|$))/i);
  if (purposeMatch && purposeMatch[1] && !isBinaryOrXmlJunk(purposeMatch[1])) {
    purpose = purposeMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let summary = "";
  const summaryMatch = sanitizedText.match(/(?:Summary of the Event|Summary|Proceedings|Event Description|Executive Summary|Events Conducted|Competition Details|Event Highlights|Detailed Report)\s*[:\s]+\s*([\s\S]*?)(?=(?:Outcome of the Event|Outcome|Key Outcomes|Feedback & Conclusion|Results|Valedictory|Geo-Tagged|Photographs|HOD|Dean|Principal|Signature|$))/i);
  if (summaryMatch && summaryMatch[1] && !isBinaryOrXmlJunk(summaryMatch[1])) {
    summary = summaryMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  let outcome = "";
  const outcomeMatch = sanitizedText.match(/(?:Outcome of the Event|Outcome|Key Outcomes|Feedback & Conclusion|Results|Valedictory|Impact & Takeaways)\s*[:\s]+\s*([\s\S]*?)(?=(?:Geo-Tagged|Photographs|HOD|Dean|Principal|Signature|Page \d+|$))/i);
  if (outcomeMatch && outcomeMatch[1] && !isBinaryOrXmlJunk(outcomeMatch[1])) {
    outcome = outcomeMatch[1].replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const partMatch = sanitizedText.match(/(?:Total number of Students Participated|Participants Count|Total Beneficiaries|Total Participants|Attendance)[:\s]+(\d+)/i) ||
                    sanitizedText.match(/(?:over|more than|around)\s+(\d+)\s+(?:students|participants|delegates)/i);
  if (partMatch && partMatch[1] && !outcome) {
    outcome = `Over ${partMatch[1]} students participated in the program.`;
  }

  // Collect notable student achievers mentioned in the text
  const studentNames: string[] = [];
  const studentMatches = sanitizedText.match(/(?:Mr\.|Ms\.)?\s+(?:Thirunageshwaran|Tarun Kumar|Vikas|Sudhakaran|Sahana|Sandya|Sowbharnica|Rakshita|Vaishnavi|Gowsika|Mahant|Ragul|Poojana|Shankavi|Suruthika|Tharunika|Vivinkumar|Arichandran|Rahul|Sathish|Yokesh|Pradakshina|Prakash|Pradeepa|Prada|Diksha|Vivin Kumar|Kanika|Praneeth|Sudharsan|Priya|Arun|Harini|Kavin|Deepak|Sneha|Sanjay|Divya|Ananya|Vignesh|Swetha|Keerthana|Surya|Naveen|Gokul|Pavithra|Manoj)(?:\s+[A-Z]\.?|\s+[A-Z][a-z]+)*/g);
  if (studentMatches) {
    studentMatches.forEach(name => {
      const trimmed = name.trim();
      if (!studentNames.includes(trimmed) && trimmed.length > 3) studentNames.push(trimmed);
    });
  }

  const award = teamName ? `Collaboration: ${teamName}` : `Department Academic Initiative`;
  const hostParts = [principalName, deanName, hodName ? `${hodName} (HOD)` : ''].filter(Boolean);
  const host = hostParts.length > 0 ? hostParts.join(' & ') : '';
  const details = summary || purpose || sanitizedText.substring(0, 300);
  const keywords = outcome ? outcome.substring(0, 250) : "Technical innovation, analytical problem-solving, domain competencies, student excellence";

  // 11. Comprehensive Grounded Narrative (Preserving full report text, purpose, summary & outcomes)
  const fullArticleSections: string[] = [];

  // Line 1: Header / Event Announcement
  const deptDisplayName = classDept ? (classDept.startsWith('DEPARTMENT') ? classDept : `Department of ${classDept}`) : `Department of ${defaultDepartment}`;
  const teamClause = teamName && teamName !== categoryTag ? `, in collaboration with ${teamName},` : '';
  fullArticleSections.push(`The ${deptDisplayName}${teamClause} organized the event titled "${title}".`);

  // Line 2: Schedule & Venue
  if (date || venue) {
    const scheduleParts = [];
    if (date) scheduleParts.push(`Date: ${date}`);
    if (venue) scheduleParts.push(`Venue: ${venue}`);
    fullArticleSections.push(`Event Schedule: ${scheduleParts.join(' | ')}.`);
  }

  // Line 3: Resource Person / Speaker
  if (student) {
    fullArticleSections.push(`Resource Person / Speaker: ${student}.`);
  }

  // Purpose of the Event (FULL)
  if (purpose && purpose.length > 10) {
    const cleanPurp = purpose.replace(/^(?:Purpose of the Event|Purpose|Objective\(s\)?|Objectives|Aim)[:\s]*/i, '').trim();
    fullArticleSections.push(`Purpose of the Event:\n${cleanPurp}`);
  }

  // Summary of the Event (FULL)
  if (summary && summary.length > 10) {
    const cleanSumm = summary.replace(/^(?:Summary of the Event|Summary|Events Conducted)[:\s]*/i, '').trim();
    fullArticleSections.push(`Summary of the Event:\n${cleanSumm}`);
  }

  // Outcome of the Event (FULL)
  if (outcome && outcome.length > 10) {
    const cleanOut = outcome.replace(/^(?:Outcome of the Event|Outcome|Key Outcomes)[:\s]*/i, '').trim();
    fullArticleSections.push(`Outcome of the Event:\n${cleanOut}`);
  }

  // Fallback: If purpose/summary/outcome were not separately matched, include full sanitizedText
  if (fullArticleSections.length <= 3 && sanitizedText && sanitizedText.length > 30) {
    fullArticleSections.push(sanitizedText);
  }

  const article = deduplicateSentences(fullArticleSections.join('\n\n'));

  return {
    category,
    categoryTag,
    title,
    teamName: teamName || categoryTag,
    student,
    classDept,
    date: date || "",
    venue: venue || "",
    purpose,
    summary,
    outcome,
    award,
    host,
    details: details.trim(),
    keywords: keywords.trim(),
    article,
    rawText: sanitizedText,
    images: inputImages && inputImages.length > 0 ? inputImages : []
  };
}
