import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { renderPdfPages, PDFPageObject, slicePdfPageCanvas } from '../../utils/pdfRenderer';
import SmartSplitModal from './SmartSplitModal';
import CanvasWorkspace from './CanvasWorkspace';
import { CanvasElement, Page } from '../../types/editor';
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
  Eye,
  Undo2,
  Redo2,
  Save,
  FileText,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document as DocxDocument, Packer, Paragraph, TextRun, PageBreak, AlignmentType, ImageRun } from 'docx';
import confetti from 'canvas-confetti';

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

interface StudioHistoryState {
  pages: Page[];
  pagePlacements: Record<number, PlacedPdfPage>;
  splitBadges: Record<number, string>;
}

const PdfImportStudio: React.FC<PdfImportStudioProps> = ({ onClose, initialFile }) => {
  const { activeProject, activePageId, loadProject, setActivePageId, updatePageElements, saveProject } = useEditor();

  const [pdfPages, setPdfPages] = useState<PDFPageObject[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [draggedPdfPage, setDraggedPdfPage] = useState<PDFPageObject | null>(null);

  // Placed PDF page mapping: key = template page index (0-indexed), value = PlacedPdfPage
  const [pagePlacements, setPagePlacements] = useState<Record<number, PlacedPdfPage>>({});
  const [splitBadges, setSplitBadges] = useState<Record<number, string>>({});

  // History for Undo / Redo inside Studio
  const [undoStack, setUndoStack] = useState<StudioHistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<StudioHistoryState[]>([]);

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

  // Preview Newsletter Modal
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeProject) return null;

  const currentPageIndex = activeProject.pages.findIndex(p => p.id === activePageId);
  const activePageNum = currentPageIndex !== -1 ? currentPageIndex + 1 : 1;

  // Push state to Undo Stack
  const pushHistory = (
    pagesToPush?: Page[],
    placementsToPush?: Record<number, PlacedPdfPage>,
    badgesToPush?: Record<number, string>
  ) => {
    const state: StudioHistoryState = {
      pages: JSON.parse(JSON.stringify(pagesToPush || activeProject.pages)),
      pagePlacements: JSON.parse(JSON.stringify(placementsToPush || pagePlacements)),
      splitBadges: JSON.parse(JSON.stringify(badgesToPush || splitBadges))
    };
    setUndoStack(prev => [...prev, state].slice(-30));
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const currentState: StudioHistoryState = {
      pages: JSON.parse(JSON.stringify(activeProject.pages)),
      pagePlacements: JSON.parse(JSON.stringify(pagePlacements)),
      splitBadges: JSON.parse(JSON.stringify(splitBadges))
    };
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);

    loadProject({ ...activeProject, pages: previousState.pages });
    setPagePlacements(previousState.pagePlacements);
    setSplitBadges(previousState.splitBadges);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const currentState: StudioHistoryState = {
      pages: JSON.parse(JSON.stringify(activeProject.pages)),
      pagePlacements: JSON.parse(JSON.stringify(pagePlacements)),
      splitBadges: JSON.parse(JSON.stringify(splitBadges))
    };
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);

    loadProject({ ...activeProject, pages: nextState.pages });
    setPagePlacements(nextState.pagePlacements);
    setSplitBadges(nextState.splitBadges);
  };

  // Helper to create official locked fixed CTRL+READ header
  const getOfficialHeader = (pNum: number, deptName: string): CanvasElement[] => {
    const deptUpper = (deptName || "Information Technology").toUpperCase();
    return [
      { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "left", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "right", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.0, letterSpacing: 1.5, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 2.5, opacity: 100, rotation: 0, locked: true },
      { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true }
    ];
  };

  // Helper to create official footer
  const getOfficialFooter = (pNum: number, deptName: string): CanvasElement[] => [
    {
      id: `p${pNum}_footer_text`,
      type: "text",
      x: 50,
      y: 1090,
      width: 700,
      height: 20,
      text: `Page ${pNum} • Official publication of the Department of ${deptName || "Information Technology"}`,
      fontSize: 9,
      fontFamily: "Poppins",
      color: "#94a3b8",
      bold: false,
      italic: false,
      underline: false,
      align: "center",
      lineHeight: 1.4,
      letterSpacing: 0,
      opacity: 100,
      rotation: 0,
      locked: true
    }
  ];

  // Helper to create Cover Page branding (Page 1 only)
  const getCoverPageLogos = (deptName: string): CanvasElement[] => {
    const deptUpper = (deptName || "Information Technology").toUpperCase();
    return [
      { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 80, url: "/assets/kprcas_logo.jpg", borderRadius: 0, opacity: 100, rotation: 0, shadow: "none", locked: true },
      { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 80, url: "/assets/launchit_logo.jpg", borderRadius: 0, opacity: 100, rotation: 0, shadow: "none", locked: true },
      { id: "p1_dept_banner_text", type: "text", x: 50, y: 285, width: 700, height: 20, text: `SCHOOL OF COMPUTING SCIENCE • DEPARTMENT OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#475569", bold: true, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 1.0, opacity: 100, rotation: 0, locked: true }
    ];
  };

  // Construct a single dynamic template page
  const createTemplatePage = (pNum: number, deptName: string): Page => {
    const header = getOfficialHeader(pNum, deptName);
    const footer = getOfficialFooter(pNum, deptName);
    const coverLogos = pNum === 1 ? getCoverPageLogos(deptName) : [];

    return {
      id: `page_${pNum}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: pNum === 1 ? "Cover Page" : `Page ${pNum}`,
      status: "DRAFT",
      elements: [...header, ...coverLogos, ...footer]
    };
  };

  // Re-number and normalize all pages in the project (updates headers, footers, IDs)
  const renormalizeProjectPages = (pages: Page[], deptName: string): Page[] => {
    return pages.map((p, idx) => {
      const pNum = idx + 1;
      const header = getOfficialHeader(pNum, deptName);
      const footer = getOfficialFooter(pNum, deptName);
      const coverLogos = pNum === 1 ? getCoverPageLogos(deptName) : [];

      // Retain only placed content / custom elements
      const contentElements = (p.elements || []).filter((el: any) => {
        const id = (el.id || '').toLowerCase();
        return (
          !id.includes('line_hdr') &&
          !id.includes('dept_hdr') &&
          !id.includes('date_hdr') &&
          !id.includes('title_hdr') &&
          !id.includes('subtitle_hdr') &&
          !id.includes('footer_text') &&
          !id.endsWith('_bg') &&
          !id.includes('kprcas_logo') &&
          !id.includes('launchit_logo') &&
          !id.includes('dept_banner_text')
        );
      });

      return {
        ...p,
        id: p.id || `page_${pNum}_${Date.now()}`,
        title: pNum === 1 ? "Cover Page" : `Page ${pNum}`,
        elements: [...header, ...coverLogos, ...contentElements, ...footer]
      };
    });
  };

  // Initialize Dynamic Template matching uploaded PDF page count
  const initializeDynamicTemplateForPdf = (pdfPageCount: number) => {
    if (!activeProject) return;
    const dept = activeProject.department || "Information Technology";
    const targetCount = Math.max(1, pdfPageCount);

    const newPages: Page[] = [];
    for (let i = 1; i <= targetCount; i++) {
      newPages.push(createTemplatePage(i, dept));
    }

    pushHistory(newPages, {}, {});
    loadProject({
      ...activeProject,
      pages: newPages
    });
    setPagePlacements({});
    setSplitBadges({});
    if (newPages.length > 0) {
      setActivePageId(newPages[0].id);
    }
  };

  // Load and render PDF pages whenever a file is selected
  const handleLoadPdfFile = async (file: File) => {
    setIsLoadingPdf(true);
    try {
      const renderedPages = await renderPdfPages(file);
      setPdfPages(renderedPages);

      // Automatically initialize dynamic template pages equal to PDF page count
      initializeDynamicTemplateForPdf(renderedPages.length);
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
    } else if (pdfPages.length === 0 && activeProject.pages.length === 0) {
      initializeDynamicTemplateForPdf(8);
    }
  }, [initialFile]);

  // Place PDF page image into template target page index
  const applyPdfImageToTemplate = (
    targetIndex: number,
    dataUrl: string,
    pdfPageNum: number,
    isSplit: boolean = false,
    splitPart?: 'top' | 'bottom' | 'custom',
    splitPercentage?: number
  ) => {
    if (!activeProject || !activeProject.pages[targetIndex]) return;

    const page = activeProject.pages[targetIndex];
    const pageNum = targetIndex + 1;
    const isFirstPage = targetIndex === 0;

    // Safe Content Boundaries:
    // Page 1: x=50, y=315, width=700, height=760
    // Page 2..N: x=50, y=215, width=700, height=860
    const x = 50;
    const y = isFirstPage ? 315 : 215;
    const width = 700;
    const height = isFirstPage ? 760 : 860;

    // Filter out old placed PDF content images while preserving locked headers/footers
    const preservedElements: CanvasElement[] = (page.elements || []).filter((el: any) => {
      const id = (el.id || '').toLowerCase();
      return (
        id.includes('_hdr') ||
        id.includes('hdr_') ||
        id.includes('line_hdr') ||
        id.includes('bg') ||
        id.includes('footer') ||
        id.includes('logo') ||
        id.includes('dept_banner_text')
      );
    });

    // Clean placed PDF image element with multiply blend mode
    const pdfImageElement: CanvasElement = {
      id: `p${pageNum}_pdf_page_${pdfPageNum}_${Date.now()}`,
      type: 'image',
      x,
      y,
      width,
      height,
      url: dataUrl,
      borderRadius: 4,
      shadow: 'none',
      opacity: 100,
      rotation: 0,
      locked: false,
      mixBlendMode: 'multiply'
    };

    const updatedElements: CanvasElement[] = [...preservedElements, pdfImageElement];
    updatePageElements(page.id, updatedElements);

    const nextPlacements = {
      ...pagePlacements,
      [targetIndex]: {
        pdfPageNum,
        dataUrl,
        isSplit,
        splitPart,
        splitPercentage,
        originalPdfPageNum: pdfPageNum
      }
    };
    setPagePlacements(nextPlacements);
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
      pushHistory();
      applyPdfImageToTemplate(targetIndex, pdfPage.dataUrl, pdfPage.pageNum);
    }
  };

  // Smart Auto Split Execution
  const handlePerformAutoSplit = async () => {
    if (!splitModalState || !activeProject) return;

    const { pdfPage, targetPageIndex } = splitModalState;
    setSplitModalState(null);

    try {
      // 1. Cleanly slice PDF canvas into Top (50%) and Bottom (50%) without distortion
      const { topDataUrl, bottomDataUrl } = await slicePdfPageCanvas(pdfPage.dataUrl, 50);

      const dept = activeProject.department || "Information Technology";
      const currentPages = [...activeProject.pages];

      // 2. Insert extra template page at targetPageIndex + 1
      const newPageNum = targetPageIndex + 2;
      const insertedPage = createTemplatePage(newPageNum, dept);
      currentPages.splice(targetPageIndex + 1, 0, insertedPage);

      // 3. Renormalize all pages to update page numbers and footers
      const renormalized = renormalizeProjectPages(currentPages, dept);

      // 4. Shift placements after targetPageIndex by +1
      const updatedPlacements: Record<number, PlacedPdfPage> = {};
      Object.keys(pagePlacements).forEach(k => {
        const idx = Number(k);
        if (idx < targetPageIndex) {
          updatedPlacements[idx] = pagePlacements[idx];
        } else if (idx > targetPageIndex) {
          updatedPlacements[idx + 1] = pagePlacements[idx];
        }
      });

      // Assign Part 1 to targetPageIndex and Part 2 to targetPageIndex + 1
      updatedPlacements[targetPageIndex] = {
        pdfPageNum: pdfPage.pageNum,
        dataUrl: topDataUrl,
        isSplit: true,
        splitPart: 'top',
        splitPercentage: 50,
        originalPdfPageNum: pdfPage.pageNum
      };
      updatedPlacements[targetPageIndex + 1] = {
        pdfPageNum: pdfPage.pageNum,
        dataUrl: bottomDataUrl,
        isSplit: true,
        splitPart: 'bottom',
        splitPercentage: 50,
        originalPdfPageNum: pdfPage.pageNum
      };

      // 5. Shift badges
      const updatedBadges: Record<number, string> = {};
      Object.keys(splitBadges).forEach(k => {
        const idx = Number(k);
        if (idx < targetPageIndex) {
          updatedBadges[idx] = splitBadges[idx];
        } else if (idx > targetPageIndex) {
          updatedBadges[idx + 1] = splitBadges[idx];
        }
      });
      updatedBadges[targetPageIndex] = `Split from PDF Page ${pdfPage.pageNum} (Part 1)`;
      updatedBadges[targetPageIndex + 1] = `Split from PDF Page ${pdfPage.pageNum} (Part 2)`;

      pushHistory(renormalized, updatedPlacements, updatedBadges);

      loadProject({ ...activeProject, pages: renormalized });
      setPagePlacements(updatedPlacements);
      setSplitBadges(updatedBadges);

      // Apply image content to both pages
      setTimeout(() => {
        applyPdfImageToTemplate(targetPageIndex, topDataUrl, pdfPage.pageNum, true, 'top', 50);
        applyPdfImageToTemplate(targetPageIndex + 1, bottomDataUrl, pdfPage.pageNum, true, 'bottom', 50);
      }, 150);
    } catch (err) {
      console.error("Auto Split failed:", err);
      alert("Error splitting page content. Placed as full page instead.");
      applyPdfImageToTemplate(targetPageIndex, pdfPage.dataUrl, pdfPage.pageNum);
    }
  };

  // Manual Split Execution with slider percentage
  const handlePerformManualSplit = async (splitPercentage: number) => {
    if (!splitModalState || !activeProject) return;

    const { pdfPage, targetPageIndex } = splitModalState;
    setSplitModalState(null);

    try {
      // 1. Slice canvas into Top (splitPercentage%) and Bottom (100 - splitPercentage%)
      const { topDataUrl, bottomDataUrl } = await slicePdfPageCanvas(pdfPage.dataUrl, splitPercentage);

      const dept = activeProject.department || "Information Technology";
      const currentPages = [...activeProject.pages];

      // 2. Insert extra template page at targetPageIndex + 1
      const newPageNum = targetPageIndex + 2;
      const insertedPage = createTemplatePage(newPageNum, dept);
      currentPages.splice(targetPageIndex + 1, 0, insertedPage);

      // 3. Renormalize all pages
      const renormalized = renormalizeProjectPages(currentPages, dept);

      // 4. Shift placements
      const updatedPlacements: Record<number, PlacedPdfPage> = {};
      Object.keys(pagePlacements).forEach(k => {
        const idx = Number(k);
        if (idx < targetPageIndex) {
          updatedPlacements[idx] = pagePlacements[idx];
        } else if (idx > targetPageIndex) {
          updatedPlacements[idx + 1] = pagePlacements[idx];
        }
      });

      updatedPlacements[targetPageIndex] = {
        pdfPageNum: pdfPage.pageNum,
        dataUrl: topDataUrl,
        isSplit: true,
        splitPart: 'custom',
        splitPercentage,
        originalPdfPageNum: pdfPage.pageNum
      };
      updatedPlacements[targetPageIndex + 1] = {
        pdfPageNum: pdfPage.pageNum,
        dataUrl: bottomDataUrl,
        isSplit: true,
        splitPart: 'custom',
        splitPercentage: 100 - splitPercentage,
        originalPdfPageNum: pdfPage.pageNum
      };

      // 5. Shift badges
      const updatedBadges: Record<number, string> = {};
      Object.keys(splitBadges).forEach(k => {
        const idx = Number(k);
        if (idx < targetPageIndex) {
          updatedBadges[idx] = splitBadges[idx];
        } else if (idx > targetPageIndex) {
          updatedBadges[idx + 1] = splitBadges[idx];
        }
      });
      updatedBadges[targetPageIndex] = `Split from PDF Page ${pdfPage.pageNum} (${splitPercentage}%)`;
      updatedBadges[targetPageIndex + 1] = `Split from PDF Page ${pdfPage.pageNum} (${100 - splitPercentage}%)`;

      pushHistory(renormalized, updatedPlacements, updatedBadges);

      loadProject({ ...activeProject, pages: renormalized });
      setPagePlacements(updatedPlacements);
      setSplitBadges(updatedBadges);

      setTimeout(() => {
        applyPdfImageToTemplate(targetPageIndex, topDataUrl, pdfPage.pageNum, true, 'custom', splitPercentage);
        applyPdfImageToTemplate(targetPageIndex + 1, bottomDataUrl, pdfPage.pageNum, true, 'custom', 100 - splitPercentage);
      }, 150);
    } catch (err) {
      console.error("Manual Split failed:", err);
      alert("Error executing manual cut. Placed as full page instead.");
      applyPdfImageToTemplate(targetPageIndex, pdfPage.dataUrl, pdfPage.pageNum);
    }
  };

  // AUTO PLACE ALL Button Handler: 1-to-1 sequential placement (PDF 1 -> Page 1, PDF 2 -> Page 2, ...)
  const handleAutoPlaceAll = () => {
    if (pdfPages.length === 0) return;

    // Ensure template has matching page count
    if (activeProject.pages.length < pdfPages.length) {
      initializeDynamicTemplateForPdf(pdfPages.length);
    }

    pushHistory();

    let highDensityPageFound: { pdfPage: PDFPageObject; targetIndex: number } | null = null;

    pdfPages.forEach((pdfPage, idx) => {
      if (idx < activeProject.pages.length) {
        applyPdfImageToTemplate(idx, pdfPage.dataUrl, pdfPage.pageNum);
        if (pdfPage.hasHighDensity && !highDensityPageFound) {
          highDensityPageFound = { pdfPage, targetIndex: idx };
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
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  // Clear content from active template page
  const handleRemovePageContent = () => {
    if (!activeProject || currentPageIndex === -1) return;

    pushHistory();

    const page = activeProject.pages[currentPageIndex];
    const preservedElements: CanvasElement[] = (page.elements || []).filter((el: any) => {
      const id = (el.id || '').toLowerCase();
      return (
        id.includes('_hdr') ||
        id.includes('hdr_') ||
        id.includes('line_hdr') ||
        id.includes('bg') ||
        id.includes('footer') ||
        id.includes('logo') ||
        id.includes('dept_banner_text')
      );
    });

    updatePageElements(page.id, preservedElements);

    setPagePlacements(prev => {
      const copy = { ...prev };
      delete copy[currentPageIndex];
      return copy;
    });

    setSplitBadges(prev => {
      const copy = { ...prev };
      delete copy[currentPageIndex];
      return copy;
    });
  };

  // Export Multi-page PDF Document with exact dynamic page count
  const handleDownloadPdf = async () => {
    if (!activeProject || !activeProject.pages || activeProject.pages.length === 0) return;
    setIsExportingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const getFontStack = (fontFamily?: string) => {
        if (!fontFamily) return "'Poppins', sans-serif";
        if (fontFamily.includes('Playfair')) return "'Playfair Display', serif";
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

        exportContainer.innerHTML = `
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap">
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
        await new Promise(r => setTimeout(r, 200));

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

      pdf.save(`${activeProject.name.replace(/\s+/g, '_')}_Imported_Newsletter.pdf`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Multi-page DOCX Document
  const handleDownloadDocx = async () => {
    if (!activeProject || !activeProject.pages || activeProject.pages.length === 0) return;
    setIsExportingDocx(true);

    try {
      const docChildren: any[] = [];
      const deptName = activeProject.department || "Information Technology";

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `DEPARTMENT OF ${deptName.toUpperCase()} - NEWSLETTER`,
              bold: true,
              size: 26,
              font: "Arial"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 }
        })
      );

      for (let pageIdx = 0; pageIdx < activeProject.pages.length; pageIdx++) {
        const page = activeProject.pages[pageIdx];
        const pageNum = pageIdx + 1;

        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `=== PAGE ${pageNum} ===`,
                bold: true,
                size: 22,
                font: "Arial"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 150 }
          })
        );

        const sortedElements = [...(page.elements || [])].sort((a, b) => a.y - b.y);

        for (const el of sortedElements) {
          if (el.type === 'text') {
            if (el.id.includes('line_')) continue;
            const isTitle = el.id.includes('title_hdr');
            const fontSize = el.fontSize ? Math.round(el.fontSize * 1.8) : 22;

            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: el.text || "",
                    bold: el.bold || isTitle,
                    italics: el.italic || false,
                    size: fontSize,
                    font: el.fontFamily || "Calibri"
                  })
                ],
                alignment: el.align === 'center' ? AlignmentType.CENTER : el.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
                spacing: { before: isTitle ? 140 : 60, after: 60 }
              })
            );
          } else if (el.type === 'image' && el.url) {
            try {
              let imageData: Uint8Array | null = null;
              if (el.url.startsWith('data:image')) {
                const base64Str = el.url.split(',')[1];
                const binaryStr = atob(base64Str);
                const bytes = new Uint8Array(binaryStr.length);
                for (let b = 0; b < binaryStr.length; b++) {
                  bytes[b] = binaryStr.charCodeAt(b);
                }
                imageData = bytes;
              } else {
                const res = await fetch(el.url);
                const blob = await res.blob();
                const arrayBuffer = await blob.arrayBuffer();
                imageData = new Uint8Array(arrayBuffer);
              }

              if (imageData) {
                docChildren.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: imageData,
                        transformation: {
                          width: Math.min(el.width || 400, 500),
                          height: Math.min(el.height || 300, 450)
                        },
                        type: 'png' as any
                      })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100, after: 100 }
                  })
                );
              }
            } catch (imgErr) {
              console.warn("Could not embed image into DOCX:", imgErr);
            }
          }
        }

        if (pageIdx < activeProject.pages.length - 1) {
          docChildren.push(
            new Paragraph({
              children: [new PageBreak()]
            })
          );
        }
      }

      const doc = new DocxDocument({
        sections: [{ properties: {}, children: docChildren }]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.replace(/\s+/g, '_')}_document.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX export error:", err);
      alert("DOCX export failed.");
    } finally {
      setIsExportingDocx(false);
    }
  };

  const totalSplitCount = Object.keys(splitBadges).length;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white select-none overflow-hidden font-sans">
      {/* Top Action & Status Navigation Header */}
      <header className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30 shadow-md">
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
              <span className="truncate max-w-[200px] sm:max-w-xs">{activeProject.name}</span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] rounded-full border border-indigo-500/30 uppercase tracking-wider">
                IMPORT & PLACE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Uploaded PDF: <strong className="text-white">{pdfPages.length || 0} Pages</strong> • Newsletter Template: <strong className="text-emerald-400">{activeProject.pages.length} Pages</strong> {totalSplitCount > 0 && <span className="text-amber-400 font-bold">({totalSplitCount} split)</span>}
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center space-x-2.5">
          {/* Undo / Redo */}
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              disabled={undoStack.length === 0}
              onClick={handleUndo}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={redoStack.length === 0}
              onClick={handleRedo}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-700 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {pdfPages.length > 0 && (
            <button
              onClick={handleAutoPlaceAll}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-500 hover:to-primary-dark text-white font-extrabold text-xs rounded-xl shadow-md hover:scale-102 transition-all flex items-center space-x-1.5 border border-indigo-400/30"
              title="Automatically place all PDF pages onto newsletter template pages in 1-to-1 order"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AUTO PLACE ALL</span>
            </button>
          )}

          <button
            onClick={handleRemovePageContent}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center space-x-1.5 border border-slate-700"
            title="Clear placed PDF content from active template page"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Page</span>
          </button>

          {/* Preview Newsletter */}
          <button
            onClick={() => {
              setShowPreviewModal(true);
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 border border-indigo-500/30 shadow-xs"
            title="Preview final clean newsletter without editor controls"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preview</span>
          </button>

          {/* Save Project */}
          <button
            onClick={() => saveProject()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 border border-slate-700"
            title="Save project state"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span>Save</span>
          </button>

          {/* Download PDF / DOCX */}
          <div className="flex items-center space-x-1.5">
            <button
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-950/40 transition-all flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
            </button>
            <button
              disabled={isExportingDocx}
              onClick={handleDownloadDocx}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center space-x-1.5"
              title="Download Microsoft Word (.docx) document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? 'Exporting DOCX...' : 'DOCX'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Panel Workspace */}
      <div className="flex-grow flex overflow-hidden">
        {/* LEFT PANEL (50%): Uploaded PDF A4 Page Cards */}
        <div className="w-1/2 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
            <div>
              <h3 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span>UPLOADED PDF PAGES</span>
                <span className="px-2 py-0.5 bg-slate-800 text-indigo-400 text-[10px] rounded-md font-bold">
                  {pdfPages.length} Pages Total
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Drag a complete A4 page to drop into the template on the right</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
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
              <h3 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">NEWSLETTER TEMPLATE WORKSPACE</h3>
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
                        : 'border-slate-800 bg-slate-950 hover:border-indigo-400/50'
                    }`}
                    title={`Click to select or Drop PDF page here for Page ${idx + 1}`}
                  >
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[8px] font-extrabold text-indigo-400">P{idx + 1}</span>
                      <span className="text-[7px] text-slate-400 font-bold truncate max-w-[50px]">{p.title || `Page ${idx + 1}`}</span>
                    </div>

                    <div className="w-full flex-grow bg-slate-900 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                      {hasPlacement ? (
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
            <p className="text-xs text-slate-400">Template Page {replacementPrompt.targetPageIndex + 1} already contains placed content. Do you want to replace it?</p>
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
            pushHistory();
            applyPdfImageToTemplate(splitModalState.targetPageIndex, splitModalState.pdfPage.dataUrl, splitModalState.pdfPage.pageNum);
            setSplitModalState(null);
          }}
          onCancel={() => setSplitModalState(null)}
        />
      )}

      {/* Preview Newsletter Fullscreen Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
          {/* Top Bar */}
          <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 font-extrabold text-xs rounded-lg border border-indigo-500/30 uppercase tracking-wider">
                Newsletter Preview
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {activeProject.name} • {activeProject.pages.length} Pages
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleDownloadPdf}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multi-page sequential rendering container */}
          <div className="flex-grow overflow-y-auto p-8 flex flex-col items-center space-y-8 bg-slate-950/90">
            {activeProject.pages.map((p, idx) => (
              <div key={p.id} className="flex flex-col items-center space-y-2">
                <span className="text-xs font-extrabold text-slate-400 tracking-wider">
                  PAGE {idx + 1} OF {activeProject.pages.length} {splitBadges[idx] && `(${splitBadges[idx]})`}
                </span>
                <div
                  style={{ width: '800px', height: '1130px', backgroundColor: '#EFEFEF' }}
                  className="relative shadow-2xl rounded-sm overflow-hidden border border-slate-300"
                >
                  {(p.elements || []).map((el: any) => {
                    if (el.type === 'shape') {
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            backgroundColor: el.fillColor || '#000000',
                            borderRadius: `${el.borderRadius || 0}px`,
                            opacity: (el.opacity ?? 100) / 100,
                            transform: `rotate(${el.rotation || 0}deg)`
                          }}
                        />
                      );
                    }
                    if (el.type === 'text') {
                      const isTitle = el.id?.includes('title_hdr');
                      const flexStyle = isTitle ? "flex items-center justify-center" : "";
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            fontSize: `${el.fontSize}px`,
                            fontFamily: el.fontFamily || 'Poppins',
                            color: el.color || '#000000',
                            fontWeight: el.bold ? 'bold' : 'normal',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            textAlign: el.align || 'left',
                            letterSpacing: `${el.letterSpacing || 0}px`,
                            lineHeight: el.lineHeight || 1.4
                          }}
                          className={`${flexStyle} select-none`}
                        >
                          {el.text}
                        </div>
                      );
                    }
                    if (el.type === 'image' && el.url) {
                      const fit = el.objectFit || (el.id?.includes('logo') ? 'contain' : 'cover');
                      const blend = el.mixBlendMode || (el.id?.includes('pdf_page') ? 'multiply' : 'normal');
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`
                          }}
                          className="flex items-center justify-center overflow-hidden"
                        >
                          <img
                            src={el.url}
                            alt=""
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: '100%',
                              height: '100%',
                              objectFit: fit as any,
                              borderRadius: `${el.borderRadius || 0}px`,
                              mixBlendMode: blend as any
                            }}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfImportStudio;
