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

    // Check if this sentence is already seen or a duplicate of an existing sentence
    let isDuplicate = false;
    for (const existing of seenNorm) {
      if (existing === normKey || (normKey.length > 20 && existing.includes(normKey)) || (existing.length > 20 && normKey.includes(existing))) {
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
 * Universal document extractor: Extracts clean structured text AND embedded geo-tagged photos
 * (directly extracts genuine photo XObjects, discarding full page screenshots, logos, and tiny icons)
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

      // Sort media files by file size to prioritize genuine camera/event photos
      const mediaList: { path: string; size: number; base64: string }[] = [];
      for (const mediaPath of mediaFiles) {
        try {
          const imgFile = zip.files[mediaPath];
          if (imgFile) {
            const base64 = await imgFile.async('base64');
            // Camera photos in event reports are usually > 15KB (approx > 20,000 base64 chars)
            // Filter out tiny icons, logos, bullets (< 15KB)
            if (base64.length > 15000) {
              mediaList.push({ path: mediaPath, size: base64.length, base64 });
            }
          }
        } catch (imgErr) {
          console.warn("Could not inspect DOCX media:", mediaPath, imgErr);
        }
      }

      // Sort largest first (typical camera/geo-tagged photos are largest in DOCX)
      mediaList.sort((a, b) => b.size - a.size);

      for (const item of mediaList.slice(0, 4)) {
        const ext = item.path.split('.').pop()?.toLowerCase() || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        extractedImages.push(`data:${mimeType};base64,${item.base64}`);
      }

      // Extract text from word/document.xml with full table cell and paragraph structure
      const docXmlFile = zip.files['word/document.xml'];
      if (docXmlFile) {
        const xmlStr = await docXmlFile.async('string');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

        // Extract both paragraphs and table structures preserving linebreaks
        const body = xmlDoc.getElementsByTagName('w:body')[0];
        const lines: string[] = [];

        if (body) {
          const childNodes = Array.from(body.childNodes);
          childNodes.forEach(node => {
            const nodeName = node.nodeName.toLowerCase();
            if (nodeName.includes('p')) { // Paragraph
              const texts = Array.from((node as Element).getElementsByTagName('w:t')).map(t => t.textContent || '');
              const pText = texts.join('').trim();
              if (pText.length > 0) lines.push(pText);
            } else if (nodeName.includes('tbl')) { // Table
              const rows = Array.from((node as Element).getElementsByTagName('w:tr'));
              rows.forEach(tr => {
                const cells = Array.from(tr.getElementsByTagName('w:tc'));
                const cellTexts = cells.map(tc => {
                  const tNodes = Array.from(tc.getElementsByTagName('w:t'));
                  return tNodes.map(t => t.textContent || '').join(' ').trim();
                }).filter(Boolean);
                if (cellTexts.length > 0) {
                  lines.push(cellTexts.join(' : '));
                }
              });
            }
          });
        }

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

  // 2. PDF File Extraction using pdfjs-dist (Structured Line Text + Embedded Photo Extraction)
  if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      const textChunks: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        // --- A. Structured Text Extraction with Coordinate-based Linebreaks ---
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
              return yB - yA; // Higher Y coordinate comes first
            }
            return a.transform[4] - b.transform[4]; // Left to right
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
              // New visual line detected
              if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
              }
              currentLine = textStr;
              lastY = curY;
            } else {
              // Same line continuation
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

        // --- B. Offscreen Dummy Render to Decode PDF Embedded Images ---
        let pageCanvas: HTMLCanvasElement | null = null;
        try {
          const viewport = page.getViewport({ scale: 1.5 });
          pageCanvas = document.createElement('canvas');
          pageCanvas.width = viewport.width;
          pageCanvas.height = viewport.height;
          const dummyCtx = pageCanvas.getContext('2d');
          if (dummyCtx) {
            await page.render({ canvasContext: dummyCtx, viewport }).promise;
          }
        } catch (_) {}

        // --- C. Extract Genuine Embedded Photo XObjects from PDF ---
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

                  // Genuine event photos have substantial dimensions (w >= 140, h >= 100)
                  // Exclude banner bars (aspect > 4.2), vertical lines (aspect < 0.25)
                  if (w >= 140 && h >= 100 && aspect >= 0.35 && aspect <= 4.0) {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                      if (imgObj.data) {
                        const imgLen = imgObj.data.length;
                        let imgData: ImageData;
                        if (imgLen === w * h * 4) {
                          // RGBA
                          imgData = new ImageData(new Uint8ClampedArray(imgObj.data), w, h);
                        } else if (imgLen === w * h * 3) {
                          // RGB -> RGBA
                          imgData = ctx.createImageData(w, h);
                          for (let src = 0, dst = 0; src < imgLen; src += 3, dst += 4) {
                            imgData.data[dst] = imgObj.data[src];
                            imgData.data[dst + 1] = imgObj.data[src + 1];
                            imgData.data[dst + 2] = imgObj.data[src + 2];
                            imgData.data[dst + 3] = 255;
                          }
                        } else if (imgLen === w * h) {
                          // Grayscale -> RGBA
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

        // --- D. Fallback: If 0 direct XObjects on this page AND page has "Geo-Tagged Photographs", crop photo section ---
        if (extractedImages.length === 0 && pageCanvas) {
          const lowerPageText = (textChunks[textChunks.length - 1] || '').toLowerCase();
          const isPhotoPage = lowerPageText.includes('geo-tagged') || 
                              lowerPageText.includes('photograph') || 
                              lowerPageText.includes('photo gallery') ||
                              lowerPageText.includes('glimpses');

          if (isPhotoPage) {
            try {
              const cropY = pageCanvas.height * 0.15;
              const cropH = pageCanvas.height * 0.60;
              const cropW = pageCanvas.width * 0.88;
              const cropX = pageCanvas.width * 0.06;

              const cropCanvas = document.createElement('canvas');
              cropCanvas.width = cropW;
              cropCanvas.height = cropH;
              const cropCtx = cropCanvas.getContext('2d');
              if (cropCtx) {
                cropCtx.drawImage(pageCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                const croppedUrl = cropCanvas.toDataURL('image/jpeg', 0.90);
                extractedImages.push(croppedUrl);
              }
            } catch (cropErr) {
              console.warn("Could not crop photo region:", cropErr);
            }
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
    if (m && m[1] && m[1].trim().length > 4) {
      const candidate = m[1].trim().replace(/^[-:•\s]+/, '').replace(/[-:•\s]+$/, '');
      const candLower = candidate.toLowerCase();
      if (!candLower.includes("example report") && 
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
      if (!candLower.includes("example report") && 
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

  // Check if title is missing or contains placeholder artifact words
  const isGenericTitle = !title || 
    title.length < 5 || 
    title.toLowerCase().includes("example report") || 
    title.toLowerCase().includes("quality system document") || 
    title.toLowerCase().includes("report of the event") || 
    title.toLowerCase().startsWith("department of") ||
    title.toLowerCase().startsWith("dept. of") ||
    title.includes("[CONTENT_TYPES]") || 
    title.includes("VERSION:");

  if (isGenericTitle) {
    const topicMatch = sanitizedText.match(/(?:organized a guest lecture on|organized a workshop on|seminar on|session on|program on)\s+["']?([^"'\n\r\.]+)/i) ||
                       sanitizedText.match(/(?:CAMPUS TO CAREER SERIES[^\n\r]*)/i) ||
                       sanitizedText.match(/(?:Topic|Theme|Subject|Event Name|Title)\s*[:\-\s]*\s*([^\n\r]+)/i);
    if (topicMatch && (topicMatch[1] || topicMatch[0])) {
      title = (topicMatch[1] || topicMatch[0]).trim().replace(/^["']|["']$/g, '');
    } else {
      const lines = sanitizedText.split('\n').map(l => l.trim()).filter(l => 
        l.length > 8 && l.length < 110 && 
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
      title = lines.length > 0 ? lines[0] : (cleanName.toLowerCase().includes("example") ? "Academic Skill Initiative" : cleanName);
    }
  }

  title = title.toUpperCase().replace(/\s+/g, ' ').trim();

  // 4. Resource Person / Chief Guest / Speaker / Subject Expert / Student Achievers
  let student = "";
  
  // A. Block-level search for "Details of Resource Person", "Resource Person", "Student(s)", "Winners", etc.
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
        !candidate.toLowerCase().startsWith("date") && 
        !candidate.toLowerCase().startsWith("seminar") && 
        !candidate.toLowerCase().startsWith("department") && 
        !candidate.toLowerCase().includes("distinguished resource person")) {
      student = candidate;
    }
  }

  // A2. Single-line direct match fallback
  if (!student || student.length < 3) {
    const singleLineMatch = sanitizedText.match(
      /(?:Details of Resource Person|Resource Person Details|Resource Person|Chief Guest|Speaker|Trainer|Keynote Speaker|Presented by|Delivered by|Author\(s\)|Expert|Student\(s\)?|Student Name|Students|Winners|Team Members|Recruiter|Company)\s*[:\-\s]+\s*([^\n\r]+)/i
    );
    if (singleLineMatch && singleLineMatch[1]) {
      const cand = singleLineMatch[1].trim();
      if (cand.length > 3 && !cand.toLowerCase().startsWith("date") && !cand.toLowerCase().startsWith("venue") && !cand.toLowerCase().startsWith("department")) {
        student = cand;
      }
    }
  }

  // B. Search for explicit honorific titles (Dr. / Mr. / Ms. / Mrs. / Prof.) in the document
  if (!student || student.length < 4) {
    const honorificMatches = sanitizedText.match(/(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+(?:,\s*[A-Za-z\s\-&]+)?/g);
    if (honorificMatches && honorificMatches.length > 0) {
      const filtered = honorificMatches.filter(h => 
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

  // Clean trailing commas / formatting
  if (student) {
    student = student.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }

  // 5. Extract Dignitaries (Principal, Dean, HOD, Patron)
  let principalName = "Dr. P. Geetha (Principal, KPRCAS)";
  const princMatch = sanitizedText.match(/(?:Dr\.\s+P\.\s+Geetha)/i) ||
                     sanitizedText.match(/(?:presided over by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Principal)?)/i);
  if (princMatch && princMatch[1]) {
    principalName = princMatch[1].trim();
  }

  let deanName = "Dr. P. Sharmila (Dean – SoCS)";
  const deanMatch = sanitizedText.match(/(?:Dr\.\s+P\.\s+Sharmila)/i) ||
                    sanitizedText.match(/(?:felicitated by\s+)?(Dr\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:,\s*Dean)?)/i);
  if (deanMatch && deanMatch[1]) {
    deanName = deanMatch[1].trim();
  }

  let hodName = "";
  const hodMatch = sanitizedText.match(/(?:Head of the Department|HOD)[,\s:]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i);
  if (hodMatch && hodMatch[1]) {
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
    if (!deptFound.toLowerCase().startsWith("date") && !deptFound.toLowerCase().startsWith("venue")) {
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
  if (collabMatch && collabMatch[1] && collabMatch[1].trim().length > 3 && !collabMatch[1].includes("-") && !collabMatch[1].toLowerCase().startsWith("nil")) {
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
  const host = `${principalName} & ${deanName}${hodName ? `, ${hodName} (HOD)` : ''}`;
  const details = purpose || summary || sanitizedText.substring(0, 300);
  const keywords = outcome ? outcome.substring(0, 200) : "Skill enhancement, technical capability, executive presentation, student participation";

  // 12. Synthesize Cohesive, Publication-Grade, Non-Repetitive College Article Story
  const sentences: string[] = [];

  // Sentence 1: Lead opening
  const deptDisplayName = classDept ? (classDept.startsWith('DEPARTMENT OF') ? classDept : `DEPARTMENT OF ${classDept}`) : `DEPARTMENT OF ${defaultDepartment.toUpperCase()}`;
  sentences.push(
    `The ${deptDisplayName}, KPRCAS, ${teamName ? `in collaboration with ${teamName}, ` : ''}successfully organized the academic capability program titled "${title}" on ${date} at the ${venue}${participantInfo ? ` ${participantInfo}` : ''}.`
  );

  // Sentence 2: Resource Person / Dignitaries
  if (student) {
    sentences.push(
      `The session featured eminent Resource Person ${student}, who delivered an empowering keynote address and shared valuable practical insights with the attendees.`
    );
  } else {
    sentences.push(
      `The program was presided over by ${principalName} and felicitated by ${deanName}.`
    );
  }

  // Sentence 3: Purpose / Session Core (use actual summary if available, avoiding duplicate intro)
  if (summary && summary.length > 20) {
    sentences.push(summary);
  } else if (purpose && purpose.length > 15) {
    const cleanPurp = purpose.toLowerCase().startsWith('to ') ? purpose : `to ${purpose}`;
    sentences.push(`The core objective of the program was ${cleanPurp}.`);
  }

  // Sentence 4: Key Outcomes & Vote of thanks
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

  // Apply strict sentence deduplication
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
    details: details.substring(0, 300),
    keywords: keywords.substring(0, 200),
    article,
    rawText: sanitizedText,
    images: []
  };
}
