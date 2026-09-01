import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { renderPdfPages, PDFPageObject } from '../../utils/pdfRenderer';
import SmartSplitModal from './SmartSplitModal';
import CanvasWorkspace from './CanvasWorkspace';
import { CanvasElement } from '../../types/editor';
import {
  Upload,
  Sparkles,
  ArrowRight,
  Trash2,
  Scissors,
  CheckCircle2,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfImportStudioProps {
  onClose: () => void;
  initialFile?: File | null;
}

export interface PlacedPdfPage {
  pdfPageNum: number;
  dataUrl: string;
  isSplit?: boolean;
  splitPart?: 'top' | 'bottom' | 'custom';
  splitPercentage?: number;
  originalPdfPageNum?: number;
}

const PdfImportStudio: React.FC<PdfImportStudioProps> = ({ onClose, initialFile }) => {
  const { activeProject, activePageId, loadProject, setActivePageId, updatePageElements } = useEditor();

  const [pdfPages, setPdfPages] = useState<PDFPageObject[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [draggedPdfPage, setDraggedPdfPage] = useState<PDFPageObject | null>(null);

  // Placed PDF page mapping: key = template page index (0-indexed), value = PlacedPdfPage
  const [pagePlacements, setPagePlacements] = useState<Record<number, PlacedPdfPage>>({});
  const [splitBadges, setSplitBadges] = useState<Record<number, string>>({});

  // Replacement modal prompt
  const [replacementPrompt, setReplacementPrompt] = useState<{
    targetPageIndex: number;
    incomingPdfPage: PDFPageObject;
  } | null>(null);

  // Smart Split modal state
  const [splitModalState, setSplitModalState] = useState<{
    pdfPage: PDFPageObject;
    targetPageIndex: number;
  } | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeProject) return null;

  const currentPageIndex = activeProject.pages.findIndex(p => p.id === activePageId);
  const activePageNum = currentPageIndex !== -1 ? currentPageIndex + 1 : 1;

  // Load and render PDF pages whenever a file is uploaded
  const handleLoadPdfFile = async (file: File) => {
    setIsLoadingPdf(true);
    try {
      const renderedPages = await renderPdfPages(file);
      setPdfPages(renderedPages);

      // Expand template dynamically: 1 Cover + N PDF Pages + 1 Editorial Board Page
      ensureDynamicTemplatePages(renderedPages.length);
    } catch (err) {
      console.error("Failed to render uploaded PDF:", err);
      alert("Could not render the uploaded PDF file. Please ensure it is a valid PDF.");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  useEffect(() => {
    if (initialFile) {
      handleLoadPdfFile(initialFile);
    } else {
      ensureDynamicTemplatePages(pdfPages.length || 6);
    }
  }, [initialFile]);

  // Ensure template expands dynamically: Page 1 = Cover, Page 2..N = Content Pages, Page N+1 = Editorial Board
  const ensureDynamicTemplatePages = (pdfPageCount: number) => {
    if (!activeProject) return;

    const deptUpper = (activeProject.department || "Information Technology").toUpperCase();
    const requiredContentPages = Math.max(6, pdfPageCount);
    const totalRequiredPages = 1 + requiredContentPages + 1; // 1 Cover + N Content + 1 Editorial Board

    const getHdr = (pNum: number): CanvasElement[] => [
      { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 },
      { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "left", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
      { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "right", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
      { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 },
      { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.0, letterSpacing: 1.5, opacity: 100, rotation: 0 },
      { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 },
      { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 2.5, opacity: 100, rotation: 0 },
      { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 }
    ];

    const contentTitles = [
      "Student Achievements",
      "Placement Record",
      "Guest Lectures & Workshops",
      "Industrial Visits & Seminars",
      "Association & Club Activities",
      "Faculty Achievements"
    ];

    let currentPages = [...activeProject.pages];

    while (currentPages.length < totalRequiredPages) {
      const idx = currentPages.length + 1;
      currentPages.push({
        id: `page_${idx}`,
        title: `Page ${idx}`,
        status: "DRAFT" as const,
        elements: []
      });
    }

    const updatedPages = currentPages.slice(0, totalRequiredPages).map((p, idx) => {
      const i = idx + 1;
      const isFirstPage = i === 1;
      const isLastPage = i === totalRequiredPages;
      let elements = p.elements || [];

      // Clean legacy header duplicates
      elements = elements.filter((el: any) =>
        !el.id.includes('_bg') && !el.id.includes('line_hdr') && !el.id.includes('dept_hdr') &&
        !el.id.includes('date_hdr') && !el.id.includes('title_hdr') && !el.id.includes('subtitle_hdr')
      );

      const pElems: CanvasElement[] = [...getHdr(i), ...elements];

      if (isFirstPage) {
        const hasLogos = pElems.some(el => el.id === 'p1_kprcas_logo');
        if (!hasLogos) {
          pElems.push(
            { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 100, url: "/assets/kprcas_logo.jpg", borderRadius: 0, opacity: 100, rotation: 0, shadow: "none" },
            { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 100, url: "/assets/launchit_logo.jpg", borderRadius: 0, opacity: 100, rotation: 0, shadow: "none" },
            { id: "p1_school_text", type: "text", x: 50, y: 315, width: 700, height: 25, text: "SCHOOL OF COMPUTING SCIENCE", fontSize: 15, fontFamily: "Poppins", color: "#0f172a", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 1.0, opacity: 100, rotation: 0 },
            { id: "p1_dept_text", type: "text", x: 50, y: 345, width: 700, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 14, fontFamily: "Poppins", color: "#475569", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 1.0, opacity: 100, rotation: 0 }
          );
          const hasCoverImg = pElems.some(el => el.id === 'p1_cover_img');
          if (!hasCoverImg) {
            pElems.push(
              { id: "p1_cover_img", type: "image", x: 50, y: 380, width: 700, height: 575, url: "/assets/kprcas_campus.png", borderRadius: 12, opacity: 100, rotation: 0, shadow: "lg" },
              { id: "p1_cover_caption", type: "text", x: 50, y: 970, width: 700, height: 20, text: "KPRCAS Main Campus • Official Department Newsletter Cover Page", fontSize: 9, fontFamily: "Poppins", color: "#64748b", italic: true, underline: false, bold: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 }
            );
          }
        }
      } else if (isLastPage) {
        const hasRibbon = pElems.some(el => el.id === 'p8_ribbon_text');
        if (!hasRibbon) {
          pElems.push(
            { id: "p8_ribbon_bg", type: "shape", shapeType: "rect", x: 80, y: 220, width: 640, height: 40, fillColor: "#e2e8f0", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 4 },
            { id: "p8_ribbon_text", type: "text", x: 80, y: 228, width: 640, height: 30, text: "EDITORIAL BOARD", fontSize: 20, fontFamily: "Playfair Display", color: "#0f172a", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 3.0, opacity: 100, rotation: 0 },
            { id: "p8_badge_chief_bg", type: "shape", shapeType: "rect", x: 105, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
            { id: "p8_badge_chief_text", type: "text", x: 105, y: 297, width: 240, height: 20, text: "CHIEF EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 1.5, opacity: 100, rotation: 0 },
            { id: "p8_pic_chief", type: "image", x: 135, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", borderRadius: 90, opacity: 100, rotation: 0, shadow: "md" },
            { id: "p8_name_chief", type: "text", x: 50, y: 540, width: 350, height: 25, text: "DR. S. SRIVIDHYA", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_desig_chief", type: "text", x: 50, y: 565, width: 350, height: 20, text: "ASSOCIATE PROFESSOR AND HEAD", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_dept_chief", type: "text", x: 50, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_badge_co_bg", type: "shape", shapeType: "rect", x: 455, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
            { id: "p8_badge_co_text", type: "text", x: 455, y: 297, width: 240, height: 20, text: "CO EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 1.5, opacity: 100, rotation: 0 },
            { id: "p8_pic_co", type: "image", x: 485, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", borderRadius: 90, opacity: 100, rotation: 0, shadow: "md" },
            { id: "p8_name_co", type: "text", x: 400, y: 540, width: 350, height: 25, text: "MR. AKHIL K M", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_desig_co", type: "text", x: 400, y: 565, width: 350, height: 20, text: "ASSISTANT PROFESSOR", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_dept_co", type: "text", x: 400, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 },
            { id: "p8_line_div_left", type: "shape", shapeType: "rect", x: 50, y: 640, width: 320, height: 2, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 },
            { id: "p8_diamond_div1", type: "shape", shapeType: "rect", x: 380, y: 636, width: 10, height: 10, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 45 },
            { id: "p8_diamond_div2", type: "shape", shapeType: "rect", x: 410, y: 636, width: 10, height: 10, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 45 },
            { id: "p8_line_div_right", type: "shape", shapeType: "rect", x: 430, y: 640, width: 320, height: 2, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0 }
          );
        }
      }

      const hasFooter = pElems.some(el => el.id.includes('footer_text'));
      if (!hasFooter) {
        pElems.push({ id: `p${i}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${i} • Official publication of the Department of ${activeProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0 });
      }

      const pageTitle = isFirstPage ? "Cover Page" : isLastPage ? "Editorial Board" : (contentTitles[idx - 1] || `Content Page ${idx}`);

      return {
        ...p,
        title: pageTitle,
        elements: pElems
      };
    });

    loadProject({ ...activeProject, pages: updatedPages });
  };

  // Place PDF page into target template page index with PERFECT FIT bounds & seamless background color blending
  const applyPdfPageToTemplate = (targetIndex: number, pdfPage: PDFPageObject, isSplit = false, splitPart?: 'top' | 'bottom' | 'custom', splitPercentage?: number) => {
    if (!activeProject || !activeProject.pages[targetIndex]) return;

    // Prevent placing random PDF content on Editorial Board Page (Last Page)
    const totalPages = activeProject.pages.length;
    let actualTargetIndex = targetIndex;

    if (targetIndex === totalPages - 1) {
      actualTargetIndex = Math.max(1, totalPages - 2);
    }

    const page = activeProject.pages[actualTargetIndex];
    const pageNum = actualTargetIndex + 1;
    const isFirstPage = actualTargetIndex === 0;

    // PERFECT FIT BOUNDS:
    // Page 1 (Cover Page): x=50, y=380, width=700, height=575
    // Pages 2..N (Content Pages): x=50, y=220, width=700, height=850
    let x = 50;
    let y = isFirstPage ? 380 : 220;
    let width = 700;
    let height = isFirstPage ? 575 : 850;

    if (splitPart === 'top') {
      height = isFirstPage ? 280 : 420;
    } else if (splitPart === 'bottom') {
      y = isFirstPage ? 670 : 650;
      height = isFirstPage ? 280 : 420;
    } else if (splitPart === 'custom' && splitPercentage) {
      const baseH = isFirstPage ? 575 : 850;
      height = Math.round(baseH * (splitPercentage / 100));
    }

    // Filter out old placed PDF content images while preserving header, logos & editorial board elements
    const filteredElements: CanvasElement[] = (page.elements || []).filter((el: any) =>
      el.id.includes('_hdr') || el.id.includes('hdr_') || el.id.includes('line_hdr') ||
      el.id.includes('bg') || el.id.includes('footer') || el.id.includes('logo') ||
      el.id.includes('school') || el.id.includes('dept_text') || el.id.includes('ribbon') ||
      el.id.includes('chief') || el.id.includes('co_editor') || el.id.includes('badge') ||
      el.id.includes('diamond') || el.id.includes('div_left') || el.id.includes('div_right')
    );

    // PDF Page Image element with SEAMLESS multiply background blending
    const pdfImageElement: CanvasElement = {
      id: `p${pageNum}_pdf_page_${pdfPage.pageNum}_${Date.now()}`,
      type: 'image',
      x,
      y,
      width,
      height,
      url: pdfPage.dataUrl,
      borderRadius: isFirstPage ? 8 : 4,
      shadow: 'none',
      opacity: 100,
      rotation: 0,
      locked: false,
      mixBlendMode: 'multiply' // Blends white background into template's #EFEFEF paper background!
    };

    const updatedElements: CanvasElement[] = [...filteredElements, pdfImageElement];
    updatePageElements(page.id, updatedElements);

    setPagePlacements(prev => ({
      ...prev,
      [actualTargetIndex]: {
        pdfPageNum: pdfPage.pageNum,
        dataUrl: pdfPage.dataUrl,
        isSplit,
        splitPart,
        splitPercentage,
        originalPdfPageNum: pdfPage.pageNum
      }
    }));
  };

  // Drag Start Handler
  const handleDragStartLeft = (pdfPage: PDFPageObject) => {
    setDraggedPdfPage(pdfPage);
  };

  // Synchronized Drop Handler for explicit target index
  const handleDropOnSpecificPage = (targetIndex: number) => {
    if (!draggedPdfPage || !activeProject.pages[targetIndex]) return;

    // Switch active page immediately to target index
    const targetPage = activeProject.pages[targetIndex];
    setActivePageId(targetPage.id);

    const existingPlacement = pagePlacements[targetIndex];
    if (existingPlacement) {
      setReplacementPrompt({
        targetPageIndex: targetIndex,
        incomingPdfPage: draggedPdfPage
      });
      return;
    }
    processDropPlacement(targetIndex, draggedPdfPage);
  };

  const processDropPlacement = (targetIndex: number, pdfPage: PDFPageObject) => {
    if (pdfPage.hasHighDensity) {
      setSplitModalState({
        pdfPage,
        targetPageIndex: targetIndex
      });
    } else {
      applyPdfPageToTemplate(targetIndex, pdfPage);
    }
  };

  // Auto Split Handler
  const handlePerformAutoSplit = () => {
    if (!splitModalState || !activeProject) return;

    const { pdfPage, targetPageIndex } = splitModalState;

    applyPdfPageToTemplate(targetPageIndex, pdfPage, true, 'top');

    const nextPageIndex = targetPageIndex + 1;
    if (activeProject.pages[nextPageIndex]) {
      setTimeout(() => {
        applyPdfPageToTemplate(nextPageIndex, pdfPage, true, 'bottom');

        setSplitBadges(prev => ({
          ...prev,
          [targetPageIndex]: `Split from PDF Page ${pdfPage.pageNum} (Part 1)`,
          [nextPageIndex]: `Split from PDF Page ${pdfPage.pageNum} (Part 2)`
        }));
      }, 100);
    }

    setSplitModalState(null);
  };

  // Manual Split Handler
  const handlePerformManualSplit = (splitPercentage: number) => {
    if (!splitModalState || !activeProject) return;

    const { pdfPage, targetPageIndex } = splitModalState;

    applyPdfPageToTemplate(targetPageIndex, pdfPage, true, 'custom', splitPercentage);

    const nextPageIndex = targetPageIndex + 1;
    if (activeProject.pages[nextPageIndex]) {
      setTimeout(() => {
        applyPdfPageToTemplate(nextPageIndex, pdfPage, true, 'custom', 100 - splitPercentage);

        setSplitBadges(prev => ({
          ...prev,
          [targetPageIndex]: `Split from PDF Page ${pdfPage.pageNum} (Top ${splitPercentage}%)`,
          [nextPageIndex]: `Split from PDF Page ${pdfPage.pageNum} (Bottom ${100 - splitPercentage}%)`
        }));
      }, 100);
    }

    setSplitModalState(null);
  };

  // AUTO PLACE ALL Button Handler: PDF Page 1 -> Template Page 1, PDF Page 2 -> Template Page 2, PDF Page 3 -> Template Page 3
  const handleAutoPlaceAll = () => {
    if (pdfPages.length === 0) return;

    // Ensure template has enough content pages
    ensureDynamicTemplatePages(pdfPages.length);

    let highDensityPageFound: { pdfPage: PDFPageObject; targetIndex: number } | null = null;
    const maxContentPages = activeProject.pages.length - 2; // Exclude Last Page (Editorial Board)

    pdfPages.forEach((pdfPage, idx) => {
      // 1-to-1 Mapping: PDF Page 1 -> Template Page 1 (index 0), PDF Page 2 -> Template Page 2 (index 1), PDF Page 3 -> Template Page 3 (index 2)
      const targetIndex = idx;
      if (targetIndex <= maxContentPages) {
        applyPdfPageToTemplate(targetIndex, pdfPage);
        if (pdfPage.hasHighDensity && !highDensityPageFound) {
          highDensityPageFound = { pdfPage, targetIndex };
        }
      }
    });

    if (highDensityPageFound) {
      const item: { pdfPage: PDFPageObject; targetIndex: number } = highDensityPageFound;
      setTimeout(() => {
        setSplitModalState({
          pdfPage: item.pdfPage,
          targetPageIndex: item.targetIndex
        });
      }, 300);
    } else {
      alert(`Successfully auto-placed all ${pdfPages.length} PDF pages onto template pages in 1-to-1 order!`);
    }
  };

  // Remove content from active template page
  const handleRemovePageContent = () => {
    if (!activeProject || currentPageIndex === -1) return;

    const page = activeProject.pages[currentPageIndex];
    const filteredElements: CanvasElement[] = (page.elements || []).filter((el: any) =>
      el.id.includes('_hdr') || el.id.includes('hdr_') || el.id.includes('line_hdr') ||
      el.id.includes('bg') || el.id.includes('footer') || el.id.includes('logo') ||
      el.id.includes('school') || el.id.includes('dept_text') || el.id.includes('ribbon') ||
      el.id.includes('chief') || el.id.includes('co_editor') || el.id.includes('badge') ||
      el.id.includes('diamond') || el.id.includes('div_left') || el.id.includes('div_right')
    );

    updatePageElements(page.id, filteredElements);

    setPagePlacements(prev => {
      const copy = { ...prev };
      delete copy[currentPageIndex];
      return copy;
    });
  };

  // Export PDF Document
  const handleDownloadPdf = async () => {
    if (!activeProject || !activeProject.pages || activeProject.pages.length === 0) return;
    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const getFontStack = (fontFamily?: string) => {
        if (!fontFamily) return "'Poppins', sans-serif";
        if (fontFamily.includes('Playfair')) return "'Playfair Display', serif";
        if (fontFamily.includes('Cinzel')) return "'Cinzel', serif";
        if (fontFamily.includes('Merriweather')) return "'Merriweather', serif";
        if (fontFamily.includes('Inter')) return "'Inter', sans-serif";
        return `'${fontFamily}', 'Poppins', sans-serif`;
      };

      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'fixed';
      exportContainer.style.left = '-9999px';
      exportContainer.style.top = '-9999px';
      exportContainer.style.width = '800px';
      exportContainer.style.height = '1130px';
      exportContainer.style.zIndex = '-9999';
      document.body.appendChild(exportContainer);

      const totalPages = activeProject.pages.length;

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const page = activeProject.pages[pageIdx];

        // Render page DOM unscaled with embedded Google Fonts
        exportContainer.innerHTML = `
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap">
          <div style="position: relative; width: 800px; height: 1130px; background-color: #EFEFEF; overflow: hidden; font-family: 'Poppins', sans-serif;">
            ${(page.elements || []).map((el: any) => {
              if (el.type === 'shape') {
                return `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; background-color: ${el.fillColor || '#000000'}; border-radius: ${el.borderRadius || 0}px; opacity: ${(el.opacity ?? 100) / 100}; transform: rotate(${el.rotation || 0}deg);"></div>`;
              }
              if (el.type === 'text') {
                const fontStack = getFontStack(el.fontFamily);
                const isTitle = el.id?.includes('title_hdr');
                const flexStyle = isTitle ? "display: flex; align-items: center; justify-content: center; line-height: 1.0;" : `line-height: ${el.lineHeight || 1.4};`;
                return `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; font-size: ${el.fontSize}px; font-family: ${fontStack}; color: ${el.color || '#000000'}; font-weight: ${el.bold ? 'bold' : 'normal'}; font-style: ${el.italic ? 'italic' : 'normal'}; text-decoration: ${el.underline ? 'underline' : 'none'}; text-align: ${el.align || 'left'}; ${flexStyle} letter-spacing: ${el.letterSpacing || 0}px; white-space: pre-wrap; word-break: break-word;">${(el.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
              }
              if (el.type === 'image' && el.url) {
                const fit = el.objectFit || (el.id?.includes('logo') ? 'contain' : 'cover');
                const blend = el.mixBlendMode || (el.id?.includes('pdf_page') ? 'multiply' : 'normal');
                return `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; display: flex; align-items: center; justify-content: center; overflow: hidden;"><img src="${el.url}" style="max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: ${fit}; display: block; border-radius: ${el.borderRadius || 0}px; mix-blend-mode: ${blend};" /></div>`;
              }
              return '';
            }).join('')}
          </div>
        `;

        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 250));

        const canvasObj = await html2canvas(exportContainer, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#EFEFEF'
        });

        const imgData = canvasObj.toDataURL('image/jpeg', 0.98);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        if (pageIdx > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      if (document.body.contains(exportContainer)) {
        document.body.removeChild(exportContainer);
      }

      pdf.save(`${activeProject.name.replace(/\s+/g, '_')}_Official_Newsletter.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalSplitCount = Object.keys(splitBadges).length;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none overflow-hidden">
      {/* Top Action & Status Navigation Header */}
      <header className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center space-x-1 text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Close Import View</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div>
            <h2 className="font-extrabold text-sm text-white flex items-center space-x-2">
              <span>{activeProject.name}</span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] rounded-full border border-indigo-500/30 uppercase tracking-wider">
                PDF Import Workspace
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              Newsletter: {activeProject.pages.length} Pages {pdfPages.length > 0 && `(Original PDF: ${pdfPages.length} Pages${totalSplitCount > 0 ? ` + ${totalSplitCount} Split Pages` : ''})`}
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-3">
          {pdfPages.length > 0 && (
            <button
              onClick={handleAutoPlaceAll}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-500 hover:to-primary-dark text-white font-extrabold text-xs rounded-xl shadow-md hover:scale-102 transition-all flex items-center space-x-1.5 border border-indigo-400/30"
              title="Automatically place all PDF pages onto newsletter template pages in 1-to-1 order"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>AUTO PLACE ALL</span>
            </button>
          )}

          <button
            onClick={handleRemovePageContent}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center space-x-1.5 border border-slate-700"
            title="Clear content from active template page"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Page</span>
          </button>

          <button
            disabled={isExporting}
            onClick={handleDownloadPdf}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/40 transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Panel Workspace */}
      <div className="flex-grow flex overflow-hidden">
        {/* LEFT PANEL (50%): Uploaded PDF A4 Page Cards */}
        <div className="w-1/2 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
            <div>
              <h3 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">Uploaded PDF Pages</h3>
              <p className="text-[10px] text-slate-400">Drag a complete A4 page to drop into the template on the right</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <Upload className="w-3 h-3 text-indigo-400" />
              <span>Change PDF</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files && e.target.files.length > 0 && handleLoadPdfFile(e.target.files[0])}
              accept=".pdf"
              className="hidden"
            />
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-6">
            {isLoadingPdf ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-slate-400">Rendering PDF A4 Pages...</p>
              </div>
            ) : pdfPages.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-800 rounded-2xl p-8 hover:border-primary/50 cursor-pointer transition-all bg-slate-950/40 text-center space-y-4"
              >
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Upload PDF File</h4>
                  <p className="text-xs text-slate-400 mt-1">Click or drop a PDF document to start side-by-side page import</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {pdfPages.map(pdfPage => (
                  <div
                    key={pdfPage.pageNum}
                    draggable
                    onDragStart={() => handleDragStartLeft(pdfPage)}
                    className="group relative bg-slate-950 border border-slate-800 rounded-xl p-3 hover:border-indigo-500/50 hover:shadow-xl transition-all cursor-grab active:cursor-grabbing flex flex-col items-center space-y-2"
                  >
                    {/* Header Label */}
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">PDF PAGE {pdfPage.pageNum}</span>
                      {pdfPage.hasHighDensity && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[8px] font-extrabold rounded flex items-center space-x-1">
                          <Scissors className="w-2.5 h-2.5" />
                          <span>High Density</span>
                        </span>
                      )}
                    </div>

                    {/* A4 Page Canvas Preview */}
                    <div className="w-full aspect-[1/1.414] bg-white rounded border border-slate-800 overflow-hidden shadow-md group-hover:scale-[1.02] transition-transform">
                      <img src={pdfPage.dataUrl} alt={`PDF Page ${pdfPage.pageNum}`} className="w-full h-full object-contain pointer-events-none" />
                    </div>

                    {/* Drag Hint Overlay */}
                    <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none flex items-center justify-center">
                      <span className="px-3 py-1 bg-indigo-600 text-white font-extrabold text-[10px] rounded-full shadow-lg flex items-center space-x-1">
                        <ArrowRight className="w-3 h-3" />
                        <span>DRAG TO TEMPLATE</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (50%): Dynamic Newsletter Template Workspace Page-by-Page View */}
        <div className="w-1/2 bg-slate-950 flex flex-col h-full overflow-hidden">
          {/* Header Controls & Active Page Switcher Bar */}
          <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
            <div>
              <h3 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">Newsletter Template Workspace</h3>
              <p className="text-[10px] text-indigo-400 font-bold">
                PAGE {activePageNum} OF {activeProject.pages.length}: {activeProject.pages[currentPageIndex]?.title?.toUpperCase() || `PAGE ${activePageNum}`}
              </p>
            </div>

            {/* Page Nav Controls */}
            <div className="flex items-center space-x-2">
              <button
                disabled={currentPageIndex <= 0}
                onClick={() => setActivePageId(activeProject.pages[currentPageIndex - 1].id)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Page</span>
              </button>
              <span className="text-xs font-extrabold text-white px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
                Page {activePageNum} / {activeProject.pages.length}
              </span>
              <button
                disabled={currentPageIndex >= activeProject.pages.length - 1}
                onClick={() => setActivePageId(activeProject.pages[currentPageIndex + 1].id)}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 text-xs font-bold"
              >
                <span>Next Page</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exact Normal Canvas Workspace Viewport (Identical to Normal Template View) */}
          <div className="flex-grow w-full h-full overflow-auto flex items-start justify-center p-6 bg-slate-900/40 relative">
            <CanvasWorkspace mode="content" onDropOnPage={handleDropOnSpecificPage} />

            {/* Split Badge Banner if applicable */}
            {splitBadges[currentPageIndex] && (
              <div className="absolute top-4 right-4 bg-amber-500/20 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1.5 shadow-lg backdrop-blur-md">
                <Scissors className="w-3 h-3 text-amber-400" />
                <span>{splitBadges[currentPageIndex]}</span>
              </div>
            )}
          </div>

          {/* Interactive Thumbnail Strip Bar: Direct Target Page Drop Zone */}
          <div className="h-32 border-t border-slate-800 bg-slate-900 px-4 py-2 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
              Drop onto any Page Thumbnail below to place PDF Page directly onto Page 1-{activeProject.pages.length}:
            </span>
            <div className="flex items-center space-x-3 overflow-x-auto pb-1">
              {activeProject.pages.map((p, idx) => {
                const isSelected = idx === currentPageIndex;
                const isEditorial = idx === activeProject.pages.length - 1;
                const hasPlacement = !!pagePlacements[idx];
                const badge = splitBadges[idx];

                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePageId(p.id)}
                    onDragOver={e => {
                      e.preventDefault();
                      if (activePageId !== p.id) setActivePageId(p.id);
                    }}
                    onDrop={() => handleDropOnSpecificPage(idx)}
                    className={`flex-shrink-0 w-24 h-20 rounded-lg border-2 p-1 relative flex flex-col items-center justify-between transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-lg scale-105 ring-2 ring-indigo-400/40'
                        : isEditorial
                        ? 'border-amber-500/40 bg-amber-500/10 hover:border-amber-400'
                        : 'border-slate-800 bg-slate-950 hover:border-indigo-400/50'
                    }`}
                    title={`Click to select or Drop PDF page here for Page ${idx + 1}`}
                  >
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[8px] font-extrabold text-indigo-400">P{idx + 1}</span>
                      <span className="text-[7px] text-slate-400 font-bold truncate max-w-[50px]">{p.title || `Page ${idx + 1}`}</span>
                    </div>

                    <div className="w-full flex-grow bg-slate-900 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                      {isEditorial ? (
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                      ) : hasPlacement ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <span className="text-[8px] text-slate-600 font-bold">P{idx + 1}</span>
                      )}
                    </div>

                    {badge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full shadow-xs" title={badge} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Replacement Prompt Modal */}
      {replacementPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <h4 className="font-extrabold text-sm text-white">Replace Existing Page?</h4>
            <p className="text-xs text-slate-400">Template Page {replacementPrompt.targetPageIndex + 1} already contains content. Do you want to replace it?</p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setReplacementPrompt(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const { targetPageIndex, incomingPdfPage } = replacementPrompt;
                  setReplacementPrompt(null);
                  processDropPlacement(targetPageIndex, incomingPdfPage);
                }}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-500 shadow-md"
              >
                Replace Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Split Modal */}
      {splitModalState && (
        <SmartSplitModal
          pdfPage={splitModalState.pdfPage}
          targetPageNum={splitModalState.targetPageIndex + 1}
          onAutoSplit={handlePerformAutoSplit}
          onManualSplit={handlePerformManualSplit}
          onKeepAsOne={() => {
            applyPdfPageToTemplate(splitModalState.targetPageIndex, splitModalState.pdfPage);
            setSplitModalState(null);
          }}
          onCancel={() => setSplitModalState(null)}
        />
      )}
    </div>
  );
};

export default PdfImportStudio;
