import React, { useEffect, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { useNotification } from '../context/NotificationContext';
import { UserSession } from '../types/editor';
import SidebarTools from './editor/SidebarTools';
import CanvasWorkspace from './editor/CanvasWorkspace';
import PropertiesPanel from './editor/PropertiesPanel';
import ContentWizardPanel from './editor/ContentWizardPanel';
import AiToolsPanel from './editor/AiToolsPanel';
import DualPaneStudio from './editor/DualPaneStudio';
import PdfImportStudio from './editor/PdfImportStudio';
import { ArrowLeft, Save, Send, Download, Undo, Redo, ZoomIn, ZoomOut, FilePlus, Sun, Moon, Sparkles, Folder, Sliders, BookOpen, Trash2, FileText, CheckCircle2, Upload, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document as DocxDocument, Packer, Paragraph, TextRun, PageBreak, AlignmentType, ImageRun } from 'docx';
import confetti from 'canvas-confetti';

interface EditorWorkspaceProps {
  projectId: number;
  user: UserSession;
  onClose: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  initialPdfFile?: File | null;
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ projectId, user, onClose, darkMode, toggleDarkMode, initialPdfFile }) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const {
    activeProject,
    selectedElementId,
    activePageId,
    loadProject,
    saveProject,
    updateProjectMetadata,
    undo,
    redo,
    undoStack,
    redoStack,
    zoom,
    setZoom,
    addPage,
    deletePage,
    isSaving
  } = useEditor();

  const [loading, setLoading] = useState<boolean>(true);
  const [activeMode, setActiveMode] = useState<'content' | 'customize' | 'ai'>('content');
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
  const [splitUploadedFile, setSplitUploadedFile] = useState<File | null>(null);
  const [isPdfImportMode, setIsPdfImportMode] = useState<boolean>(!!initialPdfFile);
  const [pdfImportFile, setPdfImportFile] = useState<File | null>(initialPdfFile || null);
  const splitFileInputRef = React.useRef<HTMLInputElement>(null);
  const [verifyingLayout, setVerifyingLayout] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showToolsMenu, setShowToolsMenu] = useState<boolean>(false);

  // Gemini AI Layout Verification & Alignment Auto-Correction
  const handleVerifyPageLayout = async () => {
    if (!activeProject || !activePageId) return;
    const pageIndex = activeProject.pages.findIndex(p => p.id === activePageId);
    if (pageIndex === -1) return;

    const page = activeProject.pages[pageIndex];
    setVerifyingLayout(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/verify-layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ elements: page.elements || [] })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.elements) {
          const updatedPages = [...activeProject.pages];
          updatedPages[pageIndex] = { ...page, elements: data.elements };
          const updatedProject = { ...activeProject, pages: updatedPages };
          loadProject(updatedProject);
          await saveProject(updatedProject);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          showSuccess(data.message || "Gemini AI inspected and perfected layout alignment!", "Layout Perfected");
        }
      } else {
        showError("Failed to verify layout.", "Layout Check Failed");
      }
    } catch (err) {
      console.error(err);
      showError("Error verifying layout.", "Layout Verification Error");
    } finally {
      setVerifyingLayout(false);
    }
  };
  
  // Export Settings
  const [exportFormat, setExportFormat] = useState<string>('a4');
  const [exportOrientation, setExportOrientation] = useState<string>('portrait');

  // Download menu modal state
  const [showDownloadMenuModal, setShowDownloadMenuModal] = useState<boolean>(false);
  const [docxGenerating, setDocxGenerating] = useState<boolean>(false);

  const handleExportJSON = () => {
    if (!activeProject) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      name: activeProject.name,
      category: activeProject.category,
      canvasWidth: activeProject.canvasWidth,
      canvasHeight: activeProject.canvasHeight,
      theme: activeProject.theme,
      pages: activeProject.pages
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeProject.name.replace(/ /g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };


  // Load project from API on mount
  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      let project: any = null;

      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });

        if (response.ok) {
          project = await response.json();
        }
      } catch (err) {
        console.warn("Backend project fetch offline, checking local cache:", err);
      }

      // Check localStorage cache if backend API call failed or offline
      if (!project) {
        const cached = localStorage.getItem(`local_project_${projectId}`);
        if (cached) {
          try {
            project = JSON.parse(cached);
          } catch (e) {}
        }
      }

      if (!project) {
        project = {
          id: projectId,
          name: "Academic Newsletter",
          category: "Academic",
          department: user?.department || "Information Technology",
          status: "DRAFT",
          isTemplate: false,
          content: null
        };
      }

      try {
        let parsedProject = { ...project };

          if (typeof project.content === 'string' && project.content) {
            try {
              const content = JSON.parse(project.content);
              parsedProject = {
                ...project,
                canvasWidth: content.canvasWidth || 800,
                canvasHeight: content.canvasHeight || 1130,
                theme: content.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#f4f4f5' },
                pages: Array.isArray(content.pages) ? content.pages : [],
                promptMetadata: content.promptMetadata
              };
            } catch (jsonErr) {
              console.error("Error parsing project content JSON:", jsonErr);
            }
          }

          // Support dynamic page structures with Cover Page logos & Editorial Board
          if (Array.isArray(parsedProject.pages)) {
            const deptUpper = (parsedProject.department || "Information Technology").toUpperCase();

            parsedProject.pages = parsedProject.pages.map((p: any, idx: number) => {
              const pageNum = idx + 1;
              const isFirstPage = pageNum === 1;
              const isLastPage = pageNum === parsedProject.pages.length;
              let elements = p.elements || [];

              // Clean duplicate headers & unsplash placeholders
              elements = elements.filter((el: any) => {
                if (el.type === 'image' && el.url && el.url.includes("unsplash.com")) return false;
                const id = (el.id || '').toLowerCase();

                if (id === `p${pageNum}_bg` || id.endsWith('_bg') ||
                    id.includes('line_hdr') || id.includes('dept_hdr') || id.includes('date_hdr') ||
                    id.includes('title_hdr') || id.includes('subtitle_hdr') || id.includes('newsletter_title')) {
                  return false;
                }

                if (isFirstPage && (id.includes('ribbon') || id.includes('chief') || id.includes('co_editor') || id.includes('_co_') || id.includes('editorial'))) {
                  return false;
                }

                if (!isFirstPage && (id.includes('kprcas_logo') || id.includes('launchit_logo') || id.includes('school_text') || id.includes('cover_img') || id.includes('cover_caption'))) {
                  return false;
                }

                if (!isLastPage && (id.includes('ribbon') || id.includes('chief') || id.includes('co_editor') || id.includes('editorial'))) {
                  return false;
                }

                return true;
              });

              // Prepend clean header
              const cleanHeader = [
                { id: `p${pageNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "left", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "right", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 1.5, lineHeight: 1.0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 2.5, lineHeight: 1.4, opacity: 100, rotation: 0, locked: true },
                { id: `p${pageNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true }
              ];

              // Page 1 Cover Page additions
              if (isFirstPage) {
                const hasLogos = elements.some((el: any) => el.id === 'p1_kprcas_logo');
                if (!hasLogos) {
                  elements.push(
                    { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 100, url: "/assets/kprcas_logo.jpg", borderRadius: 0, objectFit: "contain" },
                    { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 100, url: "/assets/launchit_logo.jpg", borderRadius: 0, objectFit: "contain" },
                    { id: "p1_school_text", type: "text", x: 50, y: 315, width: 700, height: 25, text: "SCHOOL OF COMPUTING SCIENCE", fontSize: 15, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center", letterSpacing: 1.0 },
                    { id: "p1_dept_text", type: "text", x: 50, y: 345, width: 700, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 14, fontFamily: "Poppins", color: "#475569", bold: true, align: "center", letterSpacing: 1.0 },
                    { id: "p1_cover_img", type: "image", x: 50, y: 380, width: 700, height: 575, url: "/assets/kprcas_campus.png", borderRadius: 12, shadow: "lg", objectFit: "cover" },
                    { id: "p1_cover_caption", type: "text", x: 50, y: 970, width: 700, height: 20, text: "KPRCAS Main Campus • Official Department Newsletter Cover Page", fontSize: 9, fontFamily: "Poppins", color: "#64748b", italic: true, align: "center" }
                  );
                }
              }

              // Page Editorial Board additions for the LAST page of newsletter
              if (isLastPage) {
                const hasRibbon = elements.some((el: any) => el.id.includes('ribbon_text'));
                if (!hasRibbon) {
                  p.title = "Editorial Board";
                  elements.push(
                    { id: `p${pageNum}_ribbon_bg`, type: "shape", shapeType: "rect", x: 80, y: 220, width: 640, height: 40, fillColor: "#e2e8f0", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 4 },
                    { id: `p${pageNum}_ribbon_text`, type: "text", x: 80, y: 228, width: 640, height: 30, text: "EDITORIAL BOARD", fontSize: 20, fontFamily: "Playfair Display", color: "#0f172a", bold: true, align: "center", letterSpacing: 3.0 },
                    { id: `p${pageNum}_badge_chief_bg`, type: "shape", shapeType: "rect", x: 105, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                    { id: `p${pageNum}_badge_chief_text`, type: "text", x: 105, y: 297, width: 240, height: 20, text: "CHIEF EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pageNum}_pic_chief`, type: "image", x: 135, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", borderRadius: 90, shadow: "md", objectFit: "cover" },
                    { id: `p${pageNum}_name_chief`, type: "text", x: 50, y: 540, width: 350, height: 25, text: "DR. S. SRIVIDHYA", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                    { id: `p${pageNum}_desig_chief`, type: "text", x: 50, y: 565, width: 350, height: 20, text: "ASSOCIATE PROFESSOR AND HEAD", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pageNum}_dept_chief`, type: "text", x: 50, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pageNum}_badge_co_bg`, type: "shape", shapeType: "rect", x: 455, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                    { id: `p${pageNum}_badge_co_text`, type: "text", x: 455, y: 297, width: 240, height: 20, text: "CO EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pageNum}_pic_co`, type: "image", x: 485, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", borderRadius: 90, shadow: "md", objectFit: "cover" },
                    { id: `p${pageNum}_name_co`, type: "text", x: 400, y: 540, width: 350, height: 25, text: "MR. AKHIL K M", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                    { id: `p${pageNum}_desig_co`, type: "text", x: 400, y: 565, width: 350, height: 20, text: "ASSISTANT PROFESSOR", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pageNum}_dept_co`, type: "text", x: 400, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pageNum}_line_div_left`, type: "shape", shapeType: "rect", x: 50, y: 640, width: 320, height: 2, fillColor: "#000000" },
                    { id: `p${pageNum}_diamond_div1`, type: "shape", shapeType: "rect", x: 380, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                    { id: `p${pageNum}_diamond_div2`, type: "shape", shapeType: "rect", x: 410, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                    { id: `p${pageNum}_line_div_right`, type: "shape", shapeType: "rect", x: 430, y: 640, width: 320, height: 2, fillColor: "#000000" },
                    { id: `p${pageNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pageNum} • Official publication of the Department of ${parsedProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
                  );
                }
              }

              // Ensure body text elements are formatted as continuous paragraphs (no bullet points or line breaks)
              elements = elements.map((el: any) => {
                if (el.type === 'text' && el.text && (el.id.endsWith('_text') || el.id.endsWith('_desc') || el.id.endsWith('_content') || el.id.endsWith('_msg') || el.id.endsWith('_paragraph'))) {
                  const cleaned = el.text
                    .replace(/^[•\-\*\d+\.]\s*/gm, '')
                    .replace(/[\r\n]+/g, ' ')
                    .replace(/[•\*]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  return { ...el, text: cleaned };
                }
                return el;
              });

              return { ...p, elements: [...cleanHeader, ...elements] };
            });
          }

          if (!parsedProject.theme) {
            parsedProject.theme = { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' };
          }
          if (!Array.isArray(parsedProject.pages) || parsedProject.pages.length === 0) {
            const deptUpper = (parsedProject.department || "Information Technology").toUpperCase();
            const getHdr = (pNum: number) => [
              { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "left", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "right", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 1.5, lineHeight: 1.0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 2.5, lineHeight: 1.4, opacity: 100, rotation: 0, locked: true },
              { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
            ];

            const defaultPages = [];
            for (let i = 1; i <= 8; i++) {
              const pElems: any[] = [
                ...getHdr(i),
              ];
              if (i === 1) {
                pElems.push(
                  { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 100, url: "/assets/kprcas_logo.jpg", borderRadius: 0, objectFit: "contain" },
                  { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 100, url: "/assets/launchit_logo.jpg", borderRadius: 0, objectFit: "contain" },
                  { id: "p1_school_text", type: "text", x: 50, y: 315, width: 700, height: 25, text: "SCHOOL OF COMPUTING SCIENCE", fontSize: 15, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center", letterSpacing: 1.0 },
                  { id: "p1_dept_text", type: "text", x: 50, y: 345, width: 700, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 14, fontFamily: "Poppins", color: "#475569", bold: true, align: "center", letterSpacing: 1.0 },
                  { id: "p1_cover_img", type: "image", x: 50, y: 380, width: 700, height: 575, url: "/assets/kprcas_campus.png", borderRadius: 12, shadow: "lg", objectFit: "cover" },
                  { id: "p1_cover_caption", type: "text", x: 50, y: 970, width: 700, height: 20, text: "KPRCAS Main Campus • Official Department Newsletter Cover Page", fontSize: 9, fontFamily: "Poppins", color: "#64748b", italic: true, align: "center" }
                );
              } else if (i === 8) {
                pElems.push(
                  // Ribbon / Banner
                  { id: "p8_ribbon_bg", type: "shape", shapeType: "rect", x: 80, y: 220, width: 640, height: 40, fillColor: "#e2e8f0", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 4 },
                  { id: "p8_ribbon_text", type: "text", x: 80, y: 228, width: 640, height: 30, text: "EDITORIAL BOARD", fontSize: 20, fontFamily: "Playfair Display", color: "#0f172a", bold: true, align: "center", letterSpacing: 3.0 },

                  // Chief Editor Card
                  { id: "p8_badge_chief_bg", type: "shape", shapeType: "rect", x: 105, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                  { id: "p8_badge_chief_text", type: "text", x: 105, y: 297, width: 240, height: 20, text: "CHIEF EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                  { id: "p8_pic_chief", type: "image", x: 135, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", borderRadius: 90, shadow: "md", objectFit: "cover" },
                  { id: "p8_name_chief", type: "text", x: 50, y: 540, width: 350, height: 25, text: "DR. S. SRIVIDHYA", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                  { id: "p8_desig_chief", type: "text", x: 50, y: 565, width: 350, height: 20, text: "ASSOCIATE PROFESSOR AND HEAD", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                  { id: "p8_dept_chief", type: "text", x: 50, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

                  // Co-Editor Card
                  { id: "p8_badge_co_bg", type: "shape", shapeType: "rect", x: 455, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                  { id: "p8_badge_co_text", type: "text", x: 455, y: 297, width: 240, height: 20, text: "CO EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                  { id: "p8_pic_co", type: "image", x: 485, y: 340, width: 180, height: 180, url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", borderRadius: 90, shadow: "md", objectFit: "cover" },
                  { id: "p8_name_co", type: "text", x: 400, y: 540, width: 350, height: 25, text: "MR. AKHIL K M", fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                  { id: "p8_desig_co", type: "text", x: 400, y: 565, width: 350, height: 20, text: "ASSISTANT PROFESSOR", fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                  { id: "p8_dept_co", type: "text", x: 400, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

                  // Diamond Divider Line
                  { id: "p8_line_div_left", type: "shape", shapeType: "rect", x: 50, y: 640, width: 320, height: 2, fillColor: "#000000" },
                  { id: "p8_diamond_div1", type: "shape", shapeType: "rect", x: 380, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                  { id: "p8_diamond_div2", type: "shape", shapeType: "rect", x: 410, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                  { id: "p8_line_div_right", type: "shape", shapeType: "rect", x: 430, y: 640, width: 320, height: 2, fillColor: "#000000" }
                );
              }
              pElems.push({ id: `p${i}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${i} • Official publication of the Department of ${parsedProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" });

              defaultPages.push({
                id: `page_${i}`,
                title: i === 1 ? "Cover Page" : i === 8 ? "Editorial Board" : `Page ${i}`,
                status: "DRAFT",
                elements: pElems
              });
            }
            parsedProject.pages = defaultPages;
          } else if (parsedProject.pages.length > 0) {
            const deptUpper = (parsedProject.department || "Information Technology").toUpperCase();
            const lastIdx = parsedProject.pages.length - 1;

            // Extract existing editorial board values (chief name, role, co name, role, pics)
            let chiefName = "DR. S. SRIVIDHYA";
            let chiefRole = "ASSOCIATE PROFESSOR AND HEAD";
            let chiefPic = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80";

            let coName = "MR. AKHIL K M";
            let coRole = "ASSISTANT PROFESSOR";
            let coPic = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80";

            parsedProject.pages.forEach((p: any) => {
              if (p.elements) {
                p.elements.forEach((el: any) => {
                  if ((el.id?.includes('name_chief') || el.id === 'p8_name_chief') && el.text) chiefName = el.text;
                  if ((el.id?.includes('desig_chief') || el.id === 'p8_desig_chief') && el.text) chiefRole = el.text;
                  if ((el.id?.includes('pic_chief') || el.id === 'p8_pic_chief') && el.url) chiefPic = el.url;
                  if ((el.id?.includes('name_co') || el.id === 'p8_name_co') && el.text) coName = el.text;
                  if ((el.id?.includes('desig_co') || el.id === 'p8_desig_co') && el.text) coRole = el.text;
                  if ((el.id?.includes('pic_co') || el.id === 'p8_pic_co') && el.url) coPic = el.url;
                });
              }
            });

            parsedProject.pages = parsedProject.pages.map((page: any, idx: number) => {
              const pNum = idx + 1;
              const isLast = idx === lastIdx;
              const hasRibbon = page.elements?.some((el: any) => el.id?.includes('_ribbon_text') || el.id === 'p8_ribbon_text');

              if (isLast) {
                page.title = "Editorial Board";
                if (!hasRibbon) {
                  page.elements = [
                    { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                    { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "left" },
                    { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "right" },
                    { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, align: "center", letterSpacing: 2.5 },
                    { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000" },

                    { id: `p${pNum}_ribbon_bg`, type: "shape", shapeType: "rect", x: 80, y: 220, width: 640, height: 40, fillColor: "#e2e8f0", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 4 },
                    { id: `p${pNum}_ribbon_text`, type: "text", x: 80, y: 228, width: 640, height: 30, text: "EDITORIAL BOARD", fontSize: 20, fontFamily: "Playfair Display", color: "#0f172a", bold: true, align: "center", letterSpacing: 3.0 },

                    { id: `p${pNum}_badge_chief_bg`, type: "shape", shapeType: "rect", x: 105, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                    { id: `p${pNum}_badge_chief_text`, type: "text", x: 105, y: 297, width: 240, height: 20, text: "CHIEF EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pNum}_pic_chief`, type: "image", x: 135, y: 340, width: 180, height: 180, url: chiefPic, borderRadius: 90, shadow: "md", objectFit: "cover" },
                    { id: `p${pNum}_name_chief`, type: "text", x: 50, y: 540, width: 350, height: 25, text: chiefName, fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                    { id: `p${pNum}_desig_chief`, type: "text", x: 50, y: 565, width: 350, height: 20, text: chiefRole, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pNum}_dept_chief`, type: "text", x: 50, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

                    { id: `p${pNum}_badge_co_bg`, type: "shape", shapeType: "rect", x: 455, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
                    { id: `p${pNum}_badge_co_text`, type: "text", x: 455, y: 297, width: 240, height: 20, text: "CO EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pNum}_pic_co`, type: "image", x: 485, y: 340, width: 180, height: 180, url: coPic, borderRadius: 90, shadow: "md", objectFit: "cover" },
                    { id: `p${pNum}_name_co`, type: "text", x: 400, y: 540, width: 350, height: 25, text: coName, fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
                    { id: `p${pNum}_desig_co`, type: "text", x: 400, y: 565, width: 350, height: 20, text: coRole, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
                    { id: `p${pNum}_dept_co`, type: "text", x: 400, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

                    { id: `p${pNum}_line_div_left`, type: "shape", shapeType: "rect", x: 50, y: 640, width: 320, height: 2, fillColor: "#000000" },
                    { id: `p${pNum}_diamond_div1`, type: "shape", shapeType: "rect", x: 380, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                    { id: `p${pNum}_diamond_div2`, type: "shape", shapeType: "rect", x: 410, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
                    { id: `p${pNum}_line_div_right`, type: "shape", shapeType: "rect", x: 430, y: 640, width: 320, height: 2, fillColor: "#000000" },

                    { id: `p${pNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pNum} • Official publication of the Department of ${parsedProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
                  ];
                }
              } else {
                // If an intermediate page has Editorial Board elements (e.g. Page 8 when total pages = 13), revert it to a standard page header
                if (hasRibbon) {
                  page.title = `Page ${pNum}`;
                  page.elements = [
                    { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
                    { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "left" },
                    { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "right" },
                    { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, align: "center", letterSpacing: 1.5 },
                    { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, align: "center", letterSpacing: 2.5 },
                    { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000" },
                    { id: `p${pNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pNum} • Official publication of the Department of ${parsedProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
                  ];
                }
              }
              return page;
            });

            // Ensure Page 1 has properly aligned logos and campus image
            const p1 = parsedProject.pages[0];
            const hasKprLogo = p1.elements.some((el: any) => el.id === 'p1_kprcas_logo');
            if (!hasKprLogo) {
              p1.elements.push(
                { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 100, url: "/assets/kprcas_logo.jpg", borderRadius: 0, objectFit: "contain" },
                { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 100, url: "/assets/launchit_logo.jpg", borderRadius: 0, objectFit: "contain" },
                { id: "p1_school_text", type: "text", x: 50, y: 315, width: 700, height: 25, text: "SCHOOL OF COMPUTING SCIENCE", fontSize: 15, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center", letterSpacing: 1.0 },
                { id: "p1_dept_text", type: "text", x: 50, y: 345, width: 700, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 14, fontFamily: "Poppins", color: "#475569", bold: true, align: "center", letterSpacing: 1.0 },
                { id: "p1_cover_img", type: "image", x: 50, y: 380, width: 700, height: 575, url: "/assets/kprcas_campus.png", borderRadius: 12, shadow: "lg", objectFit: "cover" },
                { id: "p1_cover_caption", type: "text", x: 50, y: 970, width: 700, height: 20, text: "KPRCAS Main Campus • Official Department Newsletter Cover Page", fontSize: 9, fontFamily: "Poppins", color: "#64748b", italic: true, align: "center" }
              );
            } else {
              // Update existing logo element dimensions & objectFit
              p1.elements = p1.elements.map((el: any) => {
                if (el.id === 'p1_kprcas_logo') {
                  return { ...el, x: 50, y: 200, width: 330, height: 100, objectFit: 'contain', url: '/assets/kprcas_logo.jpg' };
                }
                if (el.id === 'p1_launchit_logo') {
                  return { ...el, x: 420, y: 200, width: 330, height: 100, objectFit: 'contain', url: '/assets/launchit_logo.jpg' };
                }
                if (el.id === 'p1_school_text') {
                  return { ...el, x: 50, y: 315, width: 700, height: 25 };
                }
                if (el.id === 'p1_dept_text') {
                  return { ...el, x: 50, y: 345, width: 700, height: 25 };
                }
                if (el.id === 'p1_cover_img') {
                  return { ...el, x: 50, y: 380, width: 700, height: 575, url: '/assets/kprcas_campus.png', borderRadius: 12 };
                }
                if (el.id === 'p1_cover_caption') {
                  return { ...el, x: 50, y: 970, width: 700, height: 20 };
                }
                return el;
              });
            }
          }
          if (!parsedProject.canvasWidth) parsedProject.canvasWidth = 800;
          if (!parsedProject.canvasHeight) parsedProject.canvasHeight = 1130;

          loadProject(parsedProject);
        } catch (e: any) {
          console.error("Error initializing project canvas:", e);
        } finally {
          setLoading(false);
        }
      };
      fetchProject();
    }, [projectId, user.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-white">
        <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wider">Opening KPRCAS Canvas Workspace...</span>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4 text-white p-6 text-center">
        <span className="text-xl font-bold">Project Workspace Unavailable</span>
        <p className="text-xs text-slate-400 max-w-sm">The newsletter data could not be initialized into the active workspace canvas.</p>
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-primary hover:bg-primary-dark font-bold text-xs rounded-xl shadow-md transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Publish / Submit Newsletter flow
  const handlePublishOrSubmit = async () => {
    const isStudent = user.role === 'STUDENT';
    const nextStatus = isStudent ? 'PENDING_APPROVAL' : 'PUBLISHED';
    const promptMsg = isStudent 
      ? 'Submit this newsletter draft for HOD/Faculty review?' 
      : 'Publish this newsletter? It will immediately become live for readers.';

    if (!confirm(promptMsg)) return;

    try {
      const response = await fetch(`/api/projects/${activeProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        if (!isStudent) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
        showSuccess(isStudent ? 'Draft submitted successfully!' : 'Newsletter published live!', 'Publication Success');
        onClose();
      } else {
        showError('Publication update failed.', 'Update Failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // PDF Export Engine (Multi-page canvas render scaling)
  // PDF Export Engine (Unscaled 1:1 html2canvas capture with Google Fonts & #EFEFEF background)
  const handleExportPDF = async () => {
    setExporting(true);
    setShowExportModal(false);

    try {
      await saveProject();
      if (!activeProject || !activeProject.pages || activeProject.pages.length === 0) {
        showWarning("No pages found to export.", "Export Notice");
        setExporting(false);
        return;
      }

      // Ensure Google Web Fonts are fully loaded into browser font cache
      await document.fonts.ready;

      // Create a temporary hidden container element at scale 1:1 for crisp, distortion-free capture
      const exportContainer = document.createElement('div');
      exportContainer.style.position = 'fixed';
      exportContainer.style.top = '-9999px';
      exportContainer.style.left = '-9999px';
      exportContainer.style.width = '800px';
      exportContainer.style.height = '1130px';
      exportContainer.style.backgroundColor = '#EFEFEF';
      exportContainer.style.zIndex = '-9999';
      document.body.appendChild(exportContainer);

      const getFontStack = (font?: string) => {
        if (!font) return "'Poppins', sans-serif";
        if (font.includes('Playfair')) return "'Playfair Display', Georgia, serif";
        if (font.includes('Cinzel')) return "'Cinzel', Georgia, serif";
        if (font.includes('Merriweather')) return "'Merriweather', Georgia, serif";
        if (font.includes('Inter')) return "'Inter', sans-serif";
        if (font.includes('Poppins')) return "'Poppins', sans-serif";
        return `'${font}', sans-serif`;
      };

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      for (let pageIdx = 0; pageIdx < activeProject.pages.length; pageIdx++) {
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
                return `<div style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; display: flex; align-items: center; justify-content: center; overflow: hidden;"><img src="${el.url}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: ${fit}; display: block; border-radius: ${el.borderRadius || 0}px;" /></div>`;
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

      document.body.removeChild(exportContainer);
      pdf.save(`${activeProject.name.replace(/ /g, '_')}_KPRCAS.pdf`);
      confetti({ particleCount: 120, spread: 70, colors: ['#1e40af', '#f97316', '#0f172a'] });
      showSuccess("PDF export completed successfully!", "Export PDF");
    } catch (e) {
      console.error("PDF generation failure", e);
      showError("Error printing PDF document.", "Export PDF Error");
    } finally {
      setExporting(false);
    }
  };

  // DOCX Export Engine with real embedded ImageRun objects
  const handleExportDOCX = async () => {
    if (!activeProject) return;

    setDocxGenerating(true);
    setShowExportModal(false);

    try {
      await saveProject();
      const docChildren: any[] = [];

      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${(activeProject.department || "Information Technology").toUpperCase()} - NEWSLETTER`,
              bold: true,
              size: 24,
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
                size: 24,
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
            if (el.id.includes('line_') || el.id.includes('div_')) continue;

            const isTitle = el.id.includes('title') || el.id.includes('heading') || el.id.includes('hdr');
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
                          width: Math.min(el.width || 350, 480),
                          height: Math.min(el.height || 220, 350)
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
              console.warn("Could not embed image into DOCX:", el.url, imgErr);
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
        sections: [
          {
            properties: {},
            children: docChildren
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.replace(/ /g, '_')}_document.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("DOCX document exported successfully!", "Export Word");
    } catch (err) {
      console.error("DOCX Export failed", err);
      showError("An error occurred during DOCX generation.", "Export Word Error");
    } finally {
      setDocxGenerating(false);
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden font-sans">
      
      {/* Editor Main Header Bar */}
      <header className="sticky top-0 z-50 bg-secondary text-white px-5 py-3 shadow-md flex items-center justify-between border-b border-white/5 select-none">
        
        {/* Left Side Navigation & Metadata */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/5 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={activeProject.name}
                onChange={e => updateProjectMetadata(e.target.value)}
                className="font-bold text-sm bg-transparent border-b border-transparent hover:border-white/20 focus:border-primary focus:outline-none py-0.5 max-w-[200px] sm:max-w-xs truncate"
              />
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider ${
                activeProject.status === 'PUBLISHED' ? 'bg-green-600 text-white' :
                activeProject.status === 'PENDING_APPROVAL' ? 'bg-amber-500 text-white' :
                'bg-slate-700 text-slate-300'
              }`}>
                {activeProject.status}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 capitalize">
              {activeProject.category} Template | {user.department}
            </p>
          </div>
        </div>

        {/* Center Tab Switcher: Content, Customize, AI Tools */}
        <div className="flex bg-slate-900/60 dark:bg-slate-950 p-1 rounded-xl border border-white/5 space-x-1.5 select-none">
          <button
            onClick={() => setActiveMode('content')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'content'
                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Content Page</span>
          </button>
          <button
            onClick={() => setActiveMode('customize')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'customize'
                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-102'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editing Page</span>
          </button>
          <button
            onClick={() => setActiveMode('ai')}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'ai'
                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-102'
                : 'text-slate-450 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Tools</span>
          </button>
        </div>

        {/* Right Side Streamlined Action Bar */}
        <div className="flex items-center space-x-2.5">
          {/* Smart AI & Workspace Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center space-x-1.5 shadow-sm"
              title="Open Smart Tools (Split Studio, AI Layout Verifier, JSON Backup)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Tools</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showToolsMenu && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2 text-slate-200 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setShowToolsMenu(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Smart Tools & AI</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>

                <div className="py-1 space-y-1">
                  {/* Tool 1: Upload File (Split Studio) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowToolsMenu(false);
                      splitFileInputRef.current?.click();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center space-x-3 group"
                  >
                    <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 flex items-center space-x-1.5 font-sans">
                        <span>Upload File (Split Studio)</span>
                        {isSplitViewOpen && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">PDF/Word circular drag-and-drop studio</p>
                    </div>
                  </button>

                  {/* Tool 2: Verify Page Layout */}
                  <button
                    disabled={verifyingLayout}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowToolsMenu(false);
                      handleVerifyPageLayout();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center space-x-3 group"
                  >
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      {verifyingLayout ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 font-sans">Verify Page Layout (AI)</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Gemini AI alignment & layout balance auto-fix</p>
                    </div>
                  </button>

                  {/* Tool 3: Export JSON Backup */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowToolsMenu(false);
                      handleExportJSON();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center space-x-3 group"
                  >
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100 font-sans">Export JSON Backup</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Save offline backup copy of project</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={splitFileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
                  setPdfImportFile(file);
                  setIsPdfImportMode(true);
                } else {
                  setSplitUploadedFile(file);
                  setIsSplitViewOpen(true);
                }
              }
            }}
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
            className="hidden"
          />

          {/* Cloud Save status indicator & button */}
          <button
            onClick={() => saveProject()}
            className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-xl text-xs transition-all shadow-xs ${
              isSaving 
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-300 animate-pulse' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="Click to trigger manual Cloud & Local Save"
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'text-blue-400 animate-spin' : 'text-emerald-400'}`} />
            <span className="hidden md:inline text-[10px] font-extrabold tracking-wide">
              {isSaving ? 'Cloud Saving...' : 'Cloud Autosaved'}
            </span>
          </button>

          {/* Download PDF/DOCX Button */}
          <button
            disabled={exporting || docxGenerating}
            onClick={() => setShowDownloadMenuModal(true)}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold rounded-xl text-xs transition-colors flex items-center space-x-1.5 shadow-sm"
            title="Download PDF or Word Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Printing...' : docxGenerating ? 'Generating...' : 'Download'}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Publish / Submit for approval */}
          <button
            onClick={handlePublishOrSubmit}
            className="px-4 py-1.5 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl text-xs shadow-md shadow-accent/20 transition-all flex items-center space-x-1.5 hover:scale-102"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{user.role === 'STUDENT' ? 'Submit' : 'Publish'}</span>
          </button>
        </div>
      </header>

      {/* Editor Content Area */}
      <div className="flex-grow flex overflow-hidden">
        {/* Render PdfImportStudio ONLY when user uploads a PDF file */}
        {isPdfImportMode ? (
          <PdfImportStudio
            onClose={() => setIsPdfImportMode(false)}
            initialFile={pdfImportFile}
          />
        ) : isSplitViewOpen ? (
          <DualPaneStudio 
            onCloseSplitView={() => setIsSplitViewOpen(false)}
            uploadedFile={splitUploadedFile}
          />
        ) : (
          <>
            {/* Left Editor Side Panel depending on Active Mode */}
            {activeMode === 'content' && (
              <ContentWizardPanel />
            )}
            {activeMode === 'customize' && (
              <SidebarTools />
            )}
            {activeMode === 'ai' && (
              <AiToolsPanel />
            )}

            {/* Center Interactive Live Canvas Viewport */}
            <div className="flex-grow flex flex-col items-center justify-start overflow-hidden relative h-full bg-slate-900/5 dark:bg-slate-950/20">
              <div className="flex-grow w-full h-full overflow-auto flex items-start justify-center">
                <CanvasWorkspace mode={activeMode} onSwitchMode={(m) => setActiveMode(m)} />
              </div>
              
              {/* Floating Canvas Controls bar (Undo, Redo, Zoom, Add Page) */}
              <div className="absolute bottom-5 right-5 z-20 flex items-center bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3 py-2 space-x-4 shadow-lg backdrop-blur-md select-none text-slate-700 dark:text-slate-200">
                {/* Undo/Redo */}
                <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-3">
                  <button
                    disabled={undoStack.length === 0}
                    onClick={undo}
                    className={`p-1.5 rounded-lg transition-colors ${
                      undoStack.length > 0 ? 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200' : 'text-slate-350 dark:text-slate-650 cursor-not-allowed'
                    }`}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    disabled={redoStack.length === 0}
                    onClick={redo}
                    className={`p-1.5 rounded-lg transition-colors ${
                      redoStack.length > 0 ? 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200' : 'text-slate-350 dark:text-slate-650 cursor-not-allowed'
                    }`}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                  <button 
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.15))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold min-w-[36px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button 
                    onClick={() => setZoom(Math.min(2.0, zoom + 0.15))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded text-slate-600 dark:text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Page Add / Delete Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addPage}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-dark rounded-xl text-xs font-bold transition-all shadow-sm shadow-primary/10"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>Add Page</span>
                  </button>
                  <button
                    onClick={() => {
                      if (activeProject && activeProject.pages.length <= 1) {
                        return;
                      }
                      deletePage(activePageId);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/10"
                    title="Delete Current Page"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Page</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Contextual Properties sidebar */}
            {(activeMode === 'customize' || selectedElementId !== null) && (
              <PropertiesPanel />
            )}
          </>
        )}
      </div>

      {/* --- Print Ready PDF Settings Dialog Modal --- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 text-slate-800">
            <h3 className="text-base font-bold text-secondary mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5 text-primary" />
              <span>Export PDF Settings</span>
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Page Size Format</label>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs bg-slate-50 focus:outline-none focus:border-primary font-medium"
                >
                  <option value="a4">A4 (College Newsletter Standard)</option>
                  <option value="a3">A3 (College Magazine)</option>
                  <option value="letter">Letter Format</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Page Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportOrientation('portrait')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      exportOrientation === 'portrait'
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setExportOrientation('landscape')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      exportOrientation === 'landscape'
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Guide margins explanation warning */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] leading-relaxed text-blue-600">
                🚀 <span className="font-bold">Pro Tip:</span> Renders in 2x High-DPI resolution. Keep elements within the safety bleed lines to prevent outer edge clipping.
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark shadow-md"
              >
                Print High-Quality PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Download Menu Selector Modal --- */}
      {showDownloadMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 text-slate-800">
            <h3 className="text-base font-bold text-secondary mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5 text-primary" />
              <span>Download Newsletter</span>
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowDownloadMenuModal(false);
                  handleExportDOCX();
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50 transition-all flex items-start space-x-3 group"
              >
                <div className="p-2 bg-blue-50 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-primary transition-colors">Download Document (.DOCX)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Editable Word document format including page breaks and text elements.</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowDownloadMenuModal(false);
                  setShowExportModal(true);
                }}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-primary hover:bg-slate-50 transition-all flex items-start space-x-3 group"
              >
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-650 group-hover:text-white transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-primary transition-colors font-sans">Download PDF (.PDF)</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">High-quality, print-ready PDF document standard with background and layout styles.</p>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowDownloadMenuModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl font-sans"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EditorWorkspace;
