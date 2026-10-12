import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ProjectData, Page, CanvasElement, ElementType, ThemeConfig, TextElement, ImageElement, ShapeElement, QrCodeElement, TableElement, DividerElement } from '../types/editor';
import { saveProjectToIndexedDB } from '../utils/projectStorage';

interface EditorContextType {
  activeProject: ProjectData | null;
  selectedElementId: string | null;
  activePageId: string;
  zoom: number; // 0.5 to 2.0 (50% to 200%)
  snapToGrid: boolean;
  showBleed: boolean;
  guidesX: number[];
  guidesY: number[];
  undoStack: string[];
  redoStack: string[];
  isSaving: boolean;
  
  // Actions
  loadProject: (project: ProjectData) => void;
  saveProject: (projectToSave?: ProjectData) => Promise<void>;
  updateProjectMetadata: (name: string, description?: string, category?: string, department?: string) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  setSelectedElementId: (id: string | null) => void;
  setActivePageId: (id: string) => void;
  setZoom: (zoom: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowBleed: (bleed: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  changeTemplate: (pages: Page[], theme: ThemeConfig, width?: number, height?: number) => void;
  
  // Element Actions
  addElement: (type: ElementType, custom?: Partial<CanvasElement>) => void;
  updateElement: (elementId: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (elementId: string) => void;
  duplicateElement: (elementId: string) => void;
  bringToFront: (elementId: string) => void;
  sendToBack: (elementId: string) => void;
  
  // Page Actions
  addPage: () => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, direction: 'up' | 'down') => void;
  updatePageElements: (pageId: string, elements: CanvasElement[]) => void;
  setEntireProject: (pages: Page[]) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Snap Guides setter
  setGuides: (x: number[], y: number[]) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};

// Canonical Page Structure Normalizer (ensures complete CTRL+READ header and non-overlapping content stack)
export const ensureCanonicalPageStructure = (page: Page, pNum: number, deptName: string = "Information Technology", defaultDate?: string): Page => {
  const deptUpper = (deptName || "Information Technology").toUpperCase();
  const elements = page.elements || [];

  const existingDate = (elements.find((el: any) => el.id && (el.id.includes('date_hdr') || el.id.includes('hdr_date')) && (el as any).text) as any)?.text || defaultDate || "OCTOBER 2026";
  const existingDept = (elements.find((el: any) => el.id && (el.id.includes('dept_hdr') || el.id.includes('hdr_dept')) && (el as any).text) as any)?.text || `DEPARTMENT OF ${deptUpper}`;

  const isCoverPage = pNum === 1 && elements.some((el: any) => el.id && (el.id.includes('cover_img') || el.id.includes('kprcas_logo')));
  const isEditorialPage = elements.some((el: any) => el.id && (el.id.includes('ribbon_text') || el.id.includes('badge_chief')));

  const canonicalHeader: CanvasElement[] = [
    { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 0 },
    { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 10 },
    { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: existingDept, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "left", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: false, zIndex: 50 },
    { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: existingDate, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "right", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: false, zIndex: 50 },
    { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 10 },
    { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 1.5, lineHeight: 1.0, opacity: 100, rotation: 0, locked: true, zIndex: 50 },
    { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 10 },
    { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, italic: false, underline: false, align: "center", letterSpacing: 2.5, lineHeight: 1.4, opacity: 100, rotation: 0, locked: true, zIndex: 50 },
    { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 10 },
  ];

  const canonicalFooter: CanvasElement[] = [
    { id: `p${pNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pNum} • Official publication of the Department of ${deptName}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, italic: false, underline: false, align: "center", lineHeight: 1.4, letterSpacing: 0, opacity: 100, rotation: 0, locked: true, zIndex: 50 }
  ];

  // Strip broken/legacy header elements (keep non-header content elements)
  const nonHeaderElements = elements.filter((el: any) => {
    const id = (el.id || '').toLowerCase();
    return !(
      id === `p${pNum}_bg` || id === 'page_bg' || id === 'canvas_bg' ||
      id.includes('dept_hdr') || id.includes('date_hdr') ||
      id.includes('title_hdr') || id.includes('subtitle_hdr') || id.includes('footer_text') ||
      id.includes('meta_line') || id.includes('line_hdr')
    );
  });

  // PRESERVE ALL user elements and uploaded content completely without flattening, dropping, or altering them!
  const isExtraPage = pNum > 8 || (page.id?.startsWith('page_') && !['page_1', 'page_2', 'page_3', 'page_4', 'page_5', 'page_6', 'page_7', 'page_8'].includes(page.id));
  if (nonHeaderElements.length > 0 || isCoverPage || isEditorialPage || isExtraPage) {
    return {
      ...page,
      elements: [
        ...canonicalHeader,
        ...nonHeaderElements,
        ...canonicalFooter
      ]
    };
  }

  // Realign content elements in content safe area (y >= 215)
  let currentY = 215;
  const realignedContent: CanvasElement[] = [];

  const titleEl = nonHeaderElements.find((el: any) => el.type === 'text' && (el.id.includes('_title') || el.id.includes('title_')) && !el.id.includes('sub'));
  const subEl = nonHeaderElements.find((el: any) => el.type === 'text' && (el.id.includes('_sub') || el.id.includes('sub_')));
  const hostEl = nonHeaderElements.find((el: any) => el.type === 'text' && el.id.includes('_host'));
  const categoryTagEl = nonHeaderElements.find((el: any) => el.type === 'text' && (el.id.includes('category') || el.id.includes('tag') || el.id.includes('badge') || el.id.includes('section')));
  const bodyEl = nonHeaderElements.find((el: any) => el.type === 'text' && (el.id.includes('_text') || el.id.includes('_body') || el.id.includes('_content') || el.id.includes('_paragraph') || el.id.includes('_desc')));
  const photoEls = nonHeaderElements.filter((el: any) => el.type === 'image' && !el.id.includes('logo') && !el.id.includes('pic_') && !el.id.includes('pdf_page'));
  
  // Exclude elements already in realignedContent, but NEVER delete other user elements
  const otherEls = nonHeaderElements.filter((el: any) => {
    if (el === titleEl || el === subEl || el === hostEl || el === categoryTagEl || el === bodyEl || photoEls.includes(el)) return false;
    return true;
  });

  if (titleEl) {
    const isMoved = (titleEl as any).userMoved;
    const textStr = (titleEl as any).text || '';
    const titleHeight = textStr.length > 55 ? 46 : 28;
    const defaultFontSize = textStr.length > 70 ? 15.5 : textStr.length > 50 ? 16.5 : 18;
    const userFontSize = (titleEl as any).fontSize;
    const finalFontSize = (userFontSize !== undefined && !isNaN(Number(userFontSize))) ? Number(userFontSize) : defaultFontSize;

    realignedContent.push({
      ...titleEl,
      x: isMoved ? (titleEl as any).x : ((titleEl as any).x !== undefined ? (titleEl as any).x : 50),
      y: isMoved ? (titleEl as any).y : currentY,
      width: (titleEl as any).width || 700,
      height: (titleEl as any).height || titleHeight,
      fontSize: finalFontSize,
      align: (titleEl as any).align || 'center',
      bold: (titleEl as any).bold !== undefined ? (titleEl as any).bold : true,
      italic: (titleEl as any).italic !== undefined ? (titleEl as any).italic : false,
      underline: (titleEl as any).underline !== undefined ? (titleEl as any).underline : false,
      color: (titleEl as any).color || '#1E40AF',
      fontFamily: (titleEl as any).fontFamily || 'Poppins',
      lineHeight: (titleEl as any).lineHeight || 1.25,
      letterSpacing: (titleEl as any).letterSpacing !== undefined ? (titleEl as any).letterSpacing : 0
    } as any);
    if (!isMoved) currentY += ((titleEl as any).height || titleHeight) + 8;
  }

  if (subEl) {
    const isMoved = (subEl as any).userMoved;
    const textStr = (subEl as any).text || '';
    const subHeight = textStr.length > 85 ? 32 : 20;
    const defaultSubFontSize = textStr.length > 85 ? 10 : 10.5;
    const userSubFontSize = (subEl as any).fontSize;
    const finalSubFontSize = (userSubFontSize !== undefined && !isNaN(Number(userSubFontSize))) ? Number(userSubFontSize) : defaultSubFontSize;

    realignedContent.push({
      ...subEl,
      x: isMoved ? (subEl as any).x : ((subEl as any).x !== undefined ? (subEl as any).x : 50),
      y: isMoved ? (subEl as any).y : currentY,
      width: (subEl as any).width || 700,
      height: (subEl as any).height || subHeight,
      fontSize: finalSubFontSize,
      align: (subEl as any).align || 'center',
      bold: (subEl as any).bold !== undefined ? (subEl as any).bold : true,
      italic: (subEl as any).italic !== undefined ? (subEl as any).italic : false,
      underline: (subEl as any).underline !== undefined ? (subEl as any).underline : false,
      color: (subEl as any).color || '#0F172A',
      fontFamily: (subEl as any).fontFamily || 'Poppins',
      lineHeight: (subEl as any).lineHeight || 1.35,
      letterSpacing: (subEl as any).letterSpacing !== undefined ? (subEl as any).letterSpacing : 0
    } as any);
    if (!isMoved) currentY += ((subEl as any).height || subHeight) + 6;
  }

  if (hostEl) {
    const isMoved = (hostEl as any).userMoved;
    const userHostFontSize = (hostEl as any).fontSize;
    const finalHostFontSize = (userHostFontSize !== undefined && !isNaN(Number(userHostFontSize))) ? Number(userHostFontSize) : 9.5;

    realignedContent.push({
      ...hostEl,
      x: isMoved ? (hostEl as any).x : ((hostEl as any).x !== undefined ? (hostEl as any).x : 50),
      y: isMoved ? (hostEl as any).y : currentY,
      width: (hostEl as any).width || 700,
      height: (hostEl as any).height || 18,
      fontSize: finalHostFontSize,
      align: (hostEl as any).align || 'center',
      italic: (hostEl as any).italic !== undefined ? (hostEl as any).italic : true,
      bold: (hostEl as any).bold !== undefined ? (hostEl as any).bold : true,
      underline: (hostEl as any).underline !== undefined ? (hostEl as any).underline : false,
      color: (hostEl as any).color || '#EA580C',
      fontFamily: (hostEl as any).fontFamily || 'Poppins',
      lineHeight: (hostEl as any).lineHeight || 1.4
    } as any);
    if (!isMoved) currentY += 22;
  }

  if (categoryTagEl) {
    const isMoved = (categoryTagEl as any).userMoved;
    realignedContent.push({
      ...categoryTagEl,
      x: isMoved ? (categoryTagEl as any).x : ((categoryTagEl as any).x !== undefined ? (categoryTagEl as any).x : 50),
      y: isMoved ? (categoryTagEl as any).y : currentY,
      width: (categoryTagEl as any).width || 700,
      height: (categoryTagEl as any).height || 22,
      fontSize: (categoryTagEl as any).fontSize || 12,
      align: (categoryTagEl as any).align || 'center',
      bold: true,
      color: (categoryTagEl as any).color || '#0F172A',
      fontFamily: (categoryTagEl as any).fontFamily || 'Poppins'
    } as any);
    if (!isMoved) currentY += 26;
  }

  if (bodyEl) {
    const isMoved = (bodyEl as any).userMoved;
    const hasPhotos = photoEls.length > 0;
    const bodyHeight = hasPhotos ? Math.max(160, 535 - currentY) : (1060 - currentY);
    const textLen = ((bodyEl as any).text || '').length;
    const defaultBodyFontSize = (hasPhotos && textLen > 650) ? 9.5 : 10.5;
    const userBodyFontSize = (bodyEl as any).fontSize;
    const finalBodyFontSize = (userBodyFontSize !== undefined && !isNaN(Number(userBodyFontSize))) ? Number(userBodyFontSize) : defaultBodyFontSize;

    realignedContent.push({
      ...bodyEl,
      x: isMoved ? (bodyEl as any).x : ((bodyEl as any).x !== undefined ? (bodyEl as any).x : 50),
      y: isMoved ? (bodyEl as any).y : currentY,
      width: (bodyEl as any).width || 700,
      height: (bodyEl as any).height || bodyHeight,
      fontSize: finalBodyFontSize,
      align: (bodyEl as any).align || 'left',
      bold: (bodyEl as any).bold !== undefined ? (bodyEl as any).bold : false,
      italic: (bodyEl as any).italic !== undefined ? (bodyEl as any).italic : false,
      underline: (bodyEl as any).underline !== undefined ? (bodyEl as any).underline : false,
      lineHeight: (bodyEl as any).lineHeight || 1.5,
      color: (bodyEl as any).color || '#334155',
      fontFamily: (bodyEl as any).fontFamily || 'Georgia'
    } as any);
  }

  if (photoEls.length > 0) {
    // Preserve all photo elements without dropping duplicates
    const totalP = photoEls.length;
    photoEls.forEach((photo, idx) => {
      // PRESERVE CUSTOM USER POSITIONS
      const userX = (photo as any).x;
      const userY = (photo as any).y;
      const isMoved = (photo as any).userMoved;

      let defaultX = 50;
      let defaultY = 550;
      let width = 700;
      let height = 325;

      if (totalP === 1) {
        defaultX = 100; defaultY = 550; width = 600; height = 325;
      } else if (totalP === 2) {
        defaultX = idx === 0 ? 50 : 415; defaultY = 550; width = 335; height = 325;
      } else if (totalP === 3) {
        defaultX = idx === 0 ? 50 : idx === 1 ? 290 : 530; defaultY = 550; width = 220; height = 325;
      } else if (totalP === 4) {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        defaultX = col === 0 ? 50 : 415;
        defaultY = row === 0 ? 550 : 775;
        width = 335;
        height = 210;
      } else if (totalP === 5) {
        if (idx < 2) {
          defaultX = idx === 0 ? 50 : 415;
          defaultY = 550;
          width = 335;
          height = 210;
        } else {
          const col = idx - 2;
          defaultX = col === 0 ? 50 : col === 1 ? 290 : 530;
          defaultY = 775;
          width = 220;
          height = 210;
        }
      } else {
        const row = Math.floor(idx / 3);
        const col = idx % 3;
        defaultX = col === 0 ? 50 : col === 1 ? 290 : 530;
        defaultY = 550 + (row * 175);
        width = 220;
        height = 160;
      }

      const hasCustomPos = isMoved || (userX !== undefined && userX !== 50) || (userY !== undefined && userY !== 550 && userY >= 215);

      realignedContent.push({
        ...photo,
        x: hasCustomPos ? userX : defaultX,
        y: hasCustomPos ? userY : defaultY,
        width: (photo as any).width || width,
        height: (photo as any).height || height,
        borderRadius: (photo as any).borderRadius !== undefined ? (photo as any).borderRadius : 10,
        shadow: (photo as any).shadow || 'md'
      } as any);
    });
  }

  const safeOtherEls = otherEls.map((el: any) => {
    if (el.y < 215 && el.id !== `p${pNum}_bg` && !el.id.endsWith('_bg')) {
      return { ...el, y: Math.max(215, currentY + 10) };
    }
    return el;
  });

  return {
    ...page,
    elements: [
      ...canonicalHeader,
      ...realignedContent,
      ...safeOtherEls,
      ...canonicalFooter
    ]
  };
};

export const safeSaveToLocalStorage = (key: string, value: string) => {
  try {
    // If value exceeds safe local storage capacity (3.5MB), don't risk quota exception
    if (value.length > 3.5 * 1024 * 1024) {
      return;
    }
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k !== key && k !== 'token' && k !== 'user' && (k.startsWith('local_project_') || k.startsWith('last_autosaved_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (err2) {
        // Quota safely handled
      }
    }
  }
};

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProject, setActiveProject] = useState<ProjectData | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string>('');
  const [zoom, setZoom] = useState<number>(0.85); // Default zoom fits standard desktop screens
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showBleed, setShowBleed] = useState<boolean>(false);
  const [guidesX, setGuidesX] = useState<number[]>([]);
  const [guidesY, setGuidesY] = useState<number[]>([]);
  
  // History Stacks (Store serialized JSON pages array)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const prevContentRef = useRef<string>('');
  const token = localStorage.getItem('token');

  // Push current page state to undo stack
  const pushState = useCallback((pagesToPush?: Page[]) => {
    if (!activeProject) return;
    try {
      const stateObj = {
        pages: pagesToPush || activeProject.pages,
        theme: activeProject.theme,
        canvasWidth: activeProject.canvasWidth,
        canvasHeight: activeProject.canvasHeight
      };
      const serialized = JSON.stringify(stateObj);
      setUndoStack(prev => {
        if (prev.length > 0 && prev[prev.length - 1] === serialized) return prev;
        return [...prev, serialized].slice(-5); // Max history size 5 to prevent memory bloat and browser freezes
      });
      setRedoStack([]);
    } catch (e) {
      console.warn("Could not push state snapshot:", e);
    }
  }, [activeProject]);

  const loadProject = useCallback((project: ProjectData) => {
    if (!project) return;
    const dept = project.department || "Information Technology";
    const normalizedPages = (project.pages || []).map((p, idx) => 
      ensureCanonicalPageStructure(p, idx + 1, dept)
    );
    const normalizedProject = {
      ...project,
      pages: normalizedPages
    };

    setActiveProject(normalizedProject);
    if (normalizedProject.id) {
      saveProjectToIndexedDB(normalizedProject).catch(() => {});
      try {
        safeSaveToLocalStorage(`local_project_${normalizedProject.id}`, JSON.stringify(normalizedProject));
        safeSaveToLocalStorage(`last_autosaved_${normalizedProject.id}`, new Date().toISOString());
      } catch (_) {}
    }
    if (normalizedProject.pages && normalizedProject.pages.length > 0) {
      setActivePageId(prev => {
        const exists = normalizedProject.pages.some(p => p.id === prev);
        return exists ? prev : normalizedProject.pages[0].id;
      });
    }
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Save project back to server & local storage + IndexedDB
  const saveProject = useCallback(async (projectToSave?: ProjectData) => {
    const proj = projectToSave || activeProject;
    if (!proj || !proj.id) return;

    // Immediately cache to IndexedDB (asynchronous & safe from 5MB quota)
    saveProjectToIndexedDB(proj).catch(err => console.warn('IndexedDB save warning:', err));

    // Also cache to localStorage with quota-safe protection
    try {
      safeSaveToLocalStorage(`local_project_${proj.id}`, JSON.stringify(proj));
      safeSaveToLocalStorage(`last_autosaved_${proj.id}`, new Date().toISOString());
    } catch (_) {}

    const authToken = token || localStorage.getItem('token') || 'default_admin_token';
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${proj.id}`, {
        method: 'PUT',
        // Note: NEVER use keepalive: true here because keepalive limits total body size to 64KB in Chromium!
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          name: proj.name,
          description: proj.description,
          category: proj.category,
          department: proj.department,
          status: proj.status,
          content: JSON.stringify({
            canvasWidth: proj.canvasWidth || 800,
            canvasHeight: proj.canvasHeight || 1130,
            theme: proj.theme,
            pages: proj.pages,
            promptMetadata: (proj as any).promptMetadata
          })
        })
      });

      if (!response.ok) {
        console.warn('Cloud save response status:', response.status);
      }
    } catch (e) {
      console.warn('Cloud Save offline or queued:', e);
    } finally {
      setIsSaving(false);
    }
  }, [activeProject, token]);

  // Fast Responsive Autosave (Immediate IndexedDB sync on every edit + debounced cloud save)
  useEffect(() => {
    if (!activeProject || !activeProject.id) return;
    
    // Always immediately sync to IndexedDB (never fails on 5MB quota)
    saveProjectToIndexedDB(activeProject).catch(() => {});

    const currentSerialized = JSON.stringify({
      name: activeProject.name,
      pages: activeProject.pages,
      theme: activeProject.theme,
      department: activeProject.department
    });

    try {
      safeSaveToLocalStorage(`local_project_${activeProject.id}`, JSON.stringify(activeProject));
      safeSaveToLocalStorage(`last_autosaved_${activeProject.id}`, new Date().toISOString());
    } catch (_) {}

    if (currentSerialized === prevContentRef.current) return; // Cloud save already in sync

    const interval = setTimeout(() => {
      saveProject();
      prevContentRef.current = currentSerialized;
    }, 400); // 400ms responsive autosave to cloud

    return () => clearTimeout(interval);
  }, [activeProject, saveProject]);

  // Sudden window close / tab refresh / tab hide protection listeners
  useEffect(() => {
    const handleImmediateSave = () => {
      if (activeProject && activeProject.id) {
        saveProjectToIndexedDB(activeProject).catch(() => {});
        try {
          safeSaveToLocalStorage(`local_project_${activeProject.id}`, JSON.stringify(activeProject));
          safeSaveToLocalStorage(`last_autosaved_${activeProject.id}`, new Date().toISOString());
        } catch (_) {}
        saveProject();
      }
    };

    const handleBeforeUnload = () => {
      handleImmediateSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleImmediateSave();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleImmediateSave);
    };
  }, [activeProject, saveProject]);

  const updateProjectMetadata = (name: string, description?: string, category?: string, department?: string) => {
    if (!activeProject) return;
    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        name,
        description: description !== undefined ? description : prev.description,
        category: category !== undefined ? category : prev.category,
        department: department !== undefined ? department : prev.department
      };
    });
  };

  const updateTheme = (newTheme: Partial<ThemeConfig>) => {
    if (!activeProject) return;
    pushState(activeProject.pages);
    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        theme: { ...prev.theme, ...newTheme }
      };
    });
  };

  const setGuides = (x: number[], y: number[]) => {
    setGuidesX(x);
    setGuidesY(y);
  };

  // --- Element CRUD Actions ---

  const addElement = (type: ElementType, customProps?: Partial<CanvasElement>) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);

    // Dynamic ID based on time
    const newId = `${type}_${Date.now()}`;
    const x = 100;
    const y = 150;
    let newElement: CanvasElement;

    // Create element by type
    switch (type) {
      case 'text':
        newElement = {
          id: newId,
          type: 'text',
          x, y,
          width: 300,
          height: 80,
          opacity: 100,
          rotation: 0,
          text: 'Double click to edit text',
          fontSize: 18,
          fontFamily: 'Poppins',
          color: activeProject.theme.secondary || '#0f172a',
          bold: false,
          italic: false,
          underline: false,
          align: 'left',
          lineHeight: 1.4,
          letterSpacing: 0.5,
          ...customProps
        } as TextElement;
        break;
      case 'image':
        newElement = {
          id: newId,
          type: 'image',
          x, y,
          width: 250,
          height: 180,
          opacity: 100,
          rotation: 0,
          url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=500&q=80',
          borderRadius: 8,
          shadow: 'md',
          ...customProps
        } as ImageElement;
        break;
      case 'shape':
        newElement = {
          id: newId,
          type: 'shape',
          x, y,
          width: 150,
          height: 150,
          opacity: 100,
          rotation: 0,
          shapeType: 'rect',
          fillColor: activeProject.theme.primary || '#1e40af',
          strokeColor: 'transparent',
          strokeWidth: 0,
          borderRadius: 0,
          ...customProps
        } as ShapeElement;
        break;
      case 'qrcode':
        newElement = {
          id: newId,
          type: 'qrcode',
          x, y,
          width: 120,
          height: 120,
          opacity: 100,
          rotation: 0,
          value: 'https://kprcas.ac.in',
          fgColor: activeProject.theme.secondary || '#0f172a',
          ...customProps
        } as QrCodeElement;
        break;
      case 'table':
        newElement = {
          id: newId,
          type: 'table',
          x, y,
          width: 500,
          height: 160,
          opacity: 100,
          rotation: 0,
          rows: 3,
          cols: 3,
          headers: ['Header 1', 'Header 2', 'Header 3'],
          data: [
            ['Cell 1', 'Cell 2', 'Cell 3'],
            ['Cell 4', 'Cell 5', 'Cell 6']
          ],
          ...customProps
        } as TableElement;
        break;
      case 'divider':
        newElement = {
          id: newId,
          type: 'divider',
          x, y,
          width: 500,
          height: 10,
          opacity: 100,
          rotation: 0,
          color: '#cbd5e1',
          thickness: 2,
          ...customProps
        } as DividerElement;
        break;
      default:
        return;
    }

    setActiveProject(prev => {
      if (!prev) return null;
      const nextPages = prev.pages.map(page => {
        if (page.id !== activePageId) return page;
        const nextZIndex = page.elements.length + 1;
        return {
          ...page,
          elements: [...page.elements, { ...newElement, zIndex: nextZIndex }]
        };
      });
      const updatedProject = {
        ...prev,
        pages: nextPages
      };
      return updatedProject;
    });
    setSelectedElementId(newId);
  };

  const updateElement = (elementId: string, updates: Partial<CanvasElement>) => {
    if (!activeProject) return;

    setActiveProject(prev => {
      if (!prev) return null;
      const nextPages = prev.pages.map(page => {
        const hasTarget = page.elements.some(el => el.id === elementId);
        if (!hasTarget) return page;
        return {
          ...page,
          elements: page.elements.map(el => {
            if (el.id !== elementId) return el;
            return { ...el, ...updates } as CanvasElement;
          })
        };
      });
      const updatedProject = {
        ...prev,
        pages: nextPages
      };
      return updatedProject;
    });
  };

  const deleteElement = (elementId: string) => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    setActiveProject(prev => {
      if (!prev) return null;
      const updatedProject = {
        ...prev,
        pages: prev.pages.map(page => {
          const hasTarget = page.elements.some(el => el.id === elementId);
          if (!hasTarget) return page;
          return {
            ...page,
            elements: page.elements.filter(el => el.id !== elementId)
          };
        })
      };
      return updatedProject;
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    let createdId = '';
    setActiveProject(prev => {
      if (!prev) return null;
      const updatedProject = {
        ...prev,
        pages: prev.pages.map(page => {
          const target = page.elements.find(el => el.id === elementId);
          if (!target) return page;

          createdId = `${target.type}_${Date.now()}`;
          const duplicate: CanvasElement = {
            ...target,
            id: createdId,
            x: Math.min(activeProject.canvasWidth - target.width - 20, target.x + 20),
            y: Math.min(activeProject.canvasHeight - target.height - 20, target.y + 20)
          };

          return {
            ...page,
            elements: [...page.elements, duplicate]
          };
        })
      };
      return updatedProject;
    });
  };

  // Adjust layer orders
  const bringToFront = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);
    setActiveProject(prev => {
      if (!prev) return null;
      const updatedProject = {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          const elements = [...page.elements];
          const index = elements.findIndex(el => el.id === elementId);
          if (index === -1) return page;
          
          const target = elements.splice(index, 1)[0];
          elements.push(target); // Add back to end of array (top zIndex)
          
          // Re-index Z indices
          return {
            ...page,
            elements: elements.map((el, i) => ({ ...el, zIndex: i + 1 }))
          };
        })
      };
      return updatedProject;
    });
  };

  const sendToBack = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);
    setActiveProject(prev => {
      if (!prev) return null;
      const updatedProject = {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          const elements = [...page.elements];
          const index = elements.findIndex(el => el.id === elementId);
          if (index === -1) return page;
          
          const target = elements.splice(index, 1)[0];
          elements.unshift(target); // Add back to front of array (bottom zIndex)
          
          // Re-index Z indices
          return {
            ...page,
            elements: elements.map((el, i) => ({ ...el, zIndex: i + 1 }))
          };
        })
      };
      return updatedProject;
    });
  };

  // --- Page Actions ---

  const addPage = () => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    const oldPages = [...activeProject.pages];
    const newPageNum = oldPages.length + 1;
    const newPageId = `page_${newPageNum}_${Date.now()}`;
    const currentHeaderDate = (oldPages[0]?.elements?.find((el: any) => el.id?.includes('date_hdr') || el.id?.includes('hdr_date')) as any)?.text || "OCTOBER 2026";

    // Create the new blank canvas page with canonical header and footer - leaves all existing pages 100% untouched!
    const emptyNewPage: Page = {
      id: newPageId,
      title: `Page ${newPageNum}`,
      status: "DRAFT",
      elements: []
    };
    const newPage = ensureCanonicalPageStructure(emptyNewPage, newPageNum, activeProject.department || "Information Technology", currentHeaderDate);

    const newProject: ProjectData = {
      ...activeProject,
      pages: [...oldPages, newPage]
    };

    setActiveProject(newProject);
    setActivePageId(newPageId);
    safeSaveToLocalStorage(`local_project_${newProject.id}`, JSON.stringify(newProject));
    safeSaveToLocalStorage(`last_autosaved_${newProject.id}`, new Date().toISOString());
    saveProject(newProject);
  };

  const duplicatePage = (pageId: string) => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    const pageIndex = activeProject.pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;

    const sourcePage = activeProject.pages[pageIndex];
    const newPageId = `page_${Date.now()}`;

    // Duplicate all page elements with fresh IDs
    const duplicatedElements = sourcePage.elements.map(el => {
      const newElId = `${el.type}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      return {
        ...el,
        id: newElId
      } as CanvasElement;
    });

    const newPage: Page = {
      id: newPageId,
      elements: duplicatedElements
    };

    const nextPages = [...activeProject.pages];
    nextPages.splice(pageIndex + 1, 0, newPage); // Insert right after original
    const newProject: ProjectData = {
      ...activeProject,
      pages: nextPages
    };

    setActiveProject(newProject);
    setActivePageId(newPageId);
    saveProject(newProject);
  };

  const deletePage = (pageId: string) => {
    if (!activeProject || activeProject.pages.length <= 1) return;
    pushState(activeProject.pages);

    // Keep all pages except the deleted one, preserving all their elements 100%
    const updatedPages = activeProject.pages.filter(p => p.id !== pageId);

    const newProject: ProjectData = {
      ...activeProject,
      pages: updatedPages
    };

    setActiveProject(newProject);
    safeSaveToLocalStorage(`local_project_${newProject.id}`, JSON.stringify(newProject));
    safeSaveToLocalStorage(`last_autosaved_${newProject.id}`, new Date().toISOString());
    saveProject(newProject);

    // Reset active page ID safely
    const deletedIndex = activeProject.pages.findIndex(p => p.id === pageId);
    if (activePageId === pageId) {
      const nextActiveIndex = deletedIndex === 0 ? 0 : Math.min(deletedIndex - 1, updatedPages.length - 1);
      setActivePageId(updatedPages[nextActiveIndex].id);
    }
  };

  const movePage = (pageId: string, direction: 'up' | 'down') => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    const index = activeProject.pages.findIndex(p => p.id === pageId);
    if (index === -1) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activeProject.pages.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const nextPages = [...activeProject.pages];
    const temp = nextPages[index];
    nextPages[index] = nextPages[targetIndex];
    nextPages[targetIndex] = temp;

    const newProject: ProjectData = {
      ...activeProject,
      pages: nextPages
    };

    setActiveProject(newProject);
    saveProject(newProject);
  };

  const updatePageElements = (pageId: string, elements: CanvasElement[]) => {
    if (!activeProject) return;
    pushState(activeProject.pages);
    
    const updatedPages = activeProject.pages.map(page => {
      if (page.id !== pageId) return page;
      return {
        ...page,
        elements: elements
      };
    });
    
    const updatedProject = {
      ...activeProject,
      pages: updatedPages
    };
    
    setActiveProject(updatedProject);
    saveProject(updatedProject);
  };

  const setEntireProject = (pages: Page[]) => {
    if (!activeProject) return;
    pushState(activeProject.pages);
    
    const updatedProject = {
      ...activeProject,
      pages: pages
    };
    
    setActiveProject(updatedProject);
    if (pages.length > 0) {
      setActivePageId(pages[0].id);
    }
    saveProject(updatedProject);
  };

  // --- Undo/Redo Engine ---

  const changeTemplate = (pages: Page[], theme: ThemeConfig, width?: number, height?: number) => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    const updatedProject = {
      ...activeProject,
      theme: theme,
      pages: pages,
      canvasWidth: width || activeProject.canvasWidth,
      canvasHeight: height || activeProject.canvasHeight
    };

    setActiveProject(updatedProject);
    saveProject(updatedProject);
  };

  const undo = () => {
    if (undoStack.length === 0 || !activeProject) return;

    const prevStateString = undoStack[undoStack.length - 1];
    let prevPages: Page[] = [];
    let prevTheme = activeProject.theme;
    let prevWidth = activeProject.canvasWidth;
    let prevHeight = activeProject.canvasHeight;

    try {
      const parsed = JSON.parse(prevStateString);
      if (Array.isArray(parsed)) {
        prevPages = parsed;
      } else {
        prevPages = parsed.pages || [];
        prevTheme = parsed.theme || prevTheme;
        prevWidth = parsed.canvasWidth || prevWidth;
        prevHeight = parsed.canvasHeight || prevHeight;
      }
    } catch (e) {
      console.error(e);
      return;
    }

    // Save current to redo stack
    const currentStateObj = {
      pages: activeProject.pages,
      theme: activeProject.theme,
      canvasWidth: activeProject.canvasWidth,
      canvasHeight: activeProject.canvasHeight
    };
    setRedoStack(prev => [...prev, JSON.stringify(currentStateObj)]);
    setUndoStack(prev => prev.slice(0, -1));

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prevPages,
        theme: prevTheme,
        canvasWidth: prevWidth,
        canvasHeight: prevHeight
      };
    });
  };

  const redo = () => {
    if (redoStack.length === 0 || !activeProject) return;

    const nextStateString = redoStack[redoStack.length - 1];
    let nextPages: Page[] = [];
    let nextTheme = activeProject.theme;
    let nextWidth = activeProject.canvasWidth;
    let nextHeight = activeProject.canvasHeight;

    try {
      const parsed = JSON.parse(nextStateString);
      if (Array.isArray(parsed)) {
        nextPages = parsed;
      } else {
        nextPages = parsed.pages || [];
        nextTheme = parsed.theme || nextTheme;
        nextWidth = parsed.canvasWidth || nextWidth;
        nextHeight = parsed.canvasHeight || nextHeight;
      }
    } catch (e) {
      console.error(e);
      return;
    }

    const currentStateObj = {
      pages: activeProject.pages,
      theme: activeProject.theme,
      canvasWidth: activeProject.canvasWidth,
      canvasHeight: activeProject.canvasHeight
    };
    setUndoStack(prev => [...prev, JSON.stringify(currentStateObj)]);
    setRedoStack(prev => prev.slice(0, -1));

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: nextPages,
        theme: nextTheme,
        canvasWidth: nextWidth,
        canvasHeight: nextHeight
      };
    });
  };

  const clearHistory = () => {
    setUndoStack([]);
    setRedoStack([]);
  };

  // --- Keyboard Shortcuts Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only fire when not typing in text areas/inputs
      const activeEl = document.activeElement?.tagName;
      if (activeEl === 'INPUT' || activeEl === 'TEXTAREA' || document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedElementId) {
          duplicateElement(selectedElementId);
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          deleteElement(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, undo, redo, deleteElement, duplicateElement]);

  return (
    <EditorContext.Provider value={{
      activeProject,
      selectedElementId,
      activePageId,
      zoom,
      snapToGrid,
      showBleed,
      guidesX,
      guidesY,
      undoStack,
      redoStack,
      isSaving,
      
      loadProject,
      saveProject,
      updateProjectMetadata,
      updateTheme,
      setSelectedElementId,
      setActivePageId,
      setZoom,
      setSnapToGrid,
      setShowBleed,
      isGenerating,
      setIsGenerating,
      changeTemplate,
      
      addElement,
      updateElement,
      deleteElement,
      duplicateElement,
      bringToFront,
      sendToBack,
      
      addPage,
      duplicatePage,
      deletePage,
      movePage,
      updatePageElements,
      setEntireProject,
      
      undo,
      redo,
      clearHistory,
      setGuides
    }}>
      {children}
    </EditorContext.Provider>
  );
};
