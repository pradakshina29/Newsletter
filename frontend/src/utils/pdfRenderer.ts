import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker URL from CDN to avoid worker bundle path issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ExtractedContentItem {
  id: string;
  type: 'title' | 'paragraph' | 'image' | 'full_page';
  pageNum: number;
  title: string;
  content: string;
  url?: string;
}

export interface PDFPageObject {
  pageNum: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  textLines: string[];
  titles: string[];
  paragraphs: string[];
  hasHighDensity: boolean;
  extractedItems: ExtractedContentItem[];
}

export const renderPdfPages = async (file: File): Promise<PDFPageObject[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const pages: PDFPageObject[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Make near-white background paper pixels transparent so dropped PDF content matches the template theme background
        try {
          const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0; // Transparent alpha
            }
          }
          context.putImageData(imgData, 0, 0);
        } catch (e) {
          console.warn("Could not process transparent background pixels:", e);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');

      // Extract text content lines
      let textLines: string[] = [];
      let extractedItems: ExtractedContentItem[] = [];
      let titles: string[] = [];
      let paragraphs: string[] = [];

      try {
        const textContent = await page.getTextContent();
        textLines = textContent.items
          .map((item: any) => item.str)
          .filter((str: string) => str.trim().length > 0);

        // Group lines into Titles vs Paragraphs
        let currentParagraphBuffer: string[] = [];

        textLines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.length < 80 && (trimmed === trimmed.toUpperCase() || idx === 0 || /^[A-Z0-9\s.,:-]+$/.test(trimmed))) {
            if (currentParagraphBuffer.length > 0) {
              const paraText = currentParagraphBuffer.join(' ');
              paragraphs.push(paraText);
              extractedItems.push({
                id: `ext_p${pageNum}_para_${extractedItems.length + 1}`,
                type: 'paragraph',
                pageNum,
                title: `Page ${pageNum} Body Paragraph`,
                content: paraText
              });
              currentParagraphBuffer = [];
            }
            titles.push(trimmed);
            extractedItems.push({
              id: `ext_p${pageNum}_title_${titles.length}`,
              type: 'title',
              pageNum,
              title: `Page ${pageNum} Title`,
              content: trimmed
            });
          } else {
            currentParagraphBuffer.push(trimmed);
          }
        });

        if (currentParagraphBuffer.length > 0) {
          const paraText = currentParagraphBuffer.join(' ');
          paragraphs.push(paraText);
          extractedItems.push({
            id: `ext_p${pageNum}_para_${extractedItems.length + 1}`,
            type: 'paragraph',
            pageNum,
            title: `Page ${pageNum} Body Paragraph`,
            content: paraText
          });
        }
      } catch (err) {
        console.warn(`Could not extract text lines for PDF page ${pageNum}:`, err);
      }

      // Add Full Page Item
      extractedItems.unshift({
        id: `ext_p${pageNum}_full`,
        type: 'full_page',
        pageNum,
        title: `PDF Page ${pageNum} (Full Page)`,
        content: `Complete A4 PDF Page ${pageNum}`,
        url: dataUrl
      });

      const totalChars = textLines.join(' ').length;
      const hasHighDensity = totalChars > 1200 || textLines.length > 35;

      pages.push({
        pageNum,
        dataUrl,
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height,
        textLines,
        titles,
        paragraphs,
        hasHighDensity,
        extractedItems
      });
    }

    return pages;
  } catch (error) {
    console.error("Error rendering PDF pages:", error);
    throw error;
  }
};

/**
 * Precision canvas cropping utility to cleanly divide a PDF page into
 * top and bottom portions based on a split percentage (0-100%).
 */
export const slicePdfPageCanvas = (
  dataUrl: string,
  splitPercentage: number = 50
): Promise<{ topDataUrl: string; bottomDataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const splitFrac = Math.max(0.1, Math.min(0.9, splitPercentage / 100));
      const topHeight = Math.round(img.height * splitFrac);
      const bottomHeight = img.height - topHeight;

      // 1. Render Top Portion
      const topCanvas = document.createElement('canvas');
      topCanvas.width = img.width;
      topCanvas.height = topHeight;
      const topCtx = topCanvas.getContext('2d');
      if (!topCtx) {
        reject(new Error('Failed to create top canvas context'));
        return;
      }
      topCtx.drawImage(
        img,
        0, 0, img.width, topHeight,
        0, 0, img.width, topHeight
      );
      const topDataUrl = topCanvas.toDataURL('image/png');

      // 2. Render Bottom Portion
      const bottomCanvas = document.createElement('canvas');
      bottomCanvas.width = img.width;
      bottomCanvas.height = bottomHeight;
      const bottomCtx = bottomCanvas.getContext('2d');
      if (!bottomCtx) {
        reject(new Error('Failed to create bottom canvas context'));
        return;
      }
      bottomCtx.drawImage(
        img,
        0, topHeight, img.width, bottomHeight,
        0, 0, img.width, bottomHeight
      );
      const bottomDataUrl = bottomCanvas.toDataURL('image/png');

      resolve({ topDataUrl, bottomDataUrl });
    };
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
};
