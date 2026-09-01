import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { ProjectData, Page, CanvasElement, ElementType, ThemeConfig, TextElement, ImageElement, ShapeElement, QrCodeElement, TableElement, DividerElement } from '../types/editor';

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
    const stateObj = {
      pages: pagesToPush || activeProject.pages,
      theme: activeProject.theme,
      canvasWidth: activeProject.canvasWidth,
      canvasHeight: activeProject.canvasHeight
    };
    const serialized = JSON.stringify(stateObj);
    setUndoStack(prev => {
      // Avoid pushing identical state consecutively
      if (prev.length > 0 && prev[prev.length - 1] === serialized) return prev;
      return [...prev, serialized].slice(-30); // Max history size 30
    });
    setRedoStack([]);
  }, [activeProject]);

  const loadProject = useCallback((project: ProjectData) => {
    setActiveProject(project);
    if (project.pages && project.pages.length > 0) {
      setActivePageId(prev => {
        const exists = project.pages.some(p => p.id === prev);
        return exists ? prev : project.pages[0].id;
      });
    }
    setUndoStack([]);
    setRedoStack([]);
    prevContentRef.current = JSON.stringify(project.pages);
  }, []);

  // Save project back to server & local cache
  const saveProject = useCallback(async (projectToSave?: ProjectData) => {
    const proj = projectToSave || activeProject;
    if (!proj || !proj.id) return;

    // Immediately cache to localStorage so sudden tab closes lose nothing
    try {
      localStorage.setItem(`local_project_${proj.id}`, JSON.stringify(proj));
      localStorage.setItem(`last_autosaved_${proj.id}`, new Date().toISOString());
    } catch (err) {
      console.warn('LocalStorage save warning:', err);
    }

    const authToken = token || localStorage.getItem('token') || '';
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${proj.id}`, {
        method: 'PUT',
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
            canvasWidth: proj.canvasWidth,
            canvasHeight: proj.canvasHeight,
            theme: proj.theme,
            pages: proj.pages,
            promptMetadata: (proj as any).promptMetadata
          })
        })
      });

      if (!response.ok) {
        console.warn('Cloud save response warning:', response.status);
      }
    } catch (e) {
      console.error('Cloud Save error:', e);
    } finally {
      setIsSaving(false);
    }
  }, [activeProject, token]);

  // Fast Debounced Autosave (Every 2 seconds check if content changed)
  useEffect(() => {
    if (!activeProject || !activeProject.id) return;
    
    const currentSerialized = JSON.stringify({
      name: activeProject.name,
      pages: activeProject.pages,
      theme: activeProject.theme
    });
    if (currentSerialized === prevContentRef.current) return; // No change

    // Immediate local cache save on change
    try {
      localStorage.setItem(`local_project_${activeProject.id}`, JSON.stringify(activeProject));
      localStorage.setItem(`last_autosaved_${activeProject.id}`, new Date().toISOString());
    } catch (e) {}

    const interval = setTimeout(() => {
      saveProject();
      prevContentRef.current = currentSerialized;
    }, 2000); // 2 seconds fast autosave check

    return () => clearTimeout(interval);
  }, [activeProject, saveProject]);

  // Sudden window close / tab refresh protection listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeProject && activeProject.id) {
        try {
          localStorage.setItem(`local_project_${activeProject.id}`, JSON.stringify(activeProject));
          localStorage.setItem(`last_autosaved_${activeProject.id}`, new Date().toISOString());
        } catch (e) {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeProject]);

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
      return {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          const nextZIndex = page.elements.length + 1;
          return {
            ...page,
            elements: [...page.elements, { ...newElement, zIndex: nextZIndex }]
          };
        })
      };
    });
    setSelectedElementId(newId);
  };

  const updateElement = (elementId: string, updates: Partial<CanvasElement>) => {
    if (!activeProject || !activePageId) return;
    
    // We update without pushing state for smooth dragging/resizing updates.
    // If update calls from dragEnd or blur, pushState will be called.
    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          return {
            ...page,
            elements: page.elements.map(el => {
              if (el.id !== elementId) return el;
              return { ...el, ...updates } as CanvasElement;
            })
          };
        })
      };
    });
  };

  const deleteElement = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          return {
            ...page,
            elements: page.elements.filter(el => el.id !== elementId)
          };
        })
      };
    });

    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const duplicateElement = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id !== activePageId) return page;
          const target = page.elements.find(el => el.id === elementId);
          if (!target) return page;

          const newId = `${target.type}_${Date.now()}`;
          const duplicate: CanvasElement = {
            ...target,
            id: newId,
            x: target.x + 20, // Offset
            y: target.y + 20,
            zIndex: page.elements.length + 1
          } as CanvasElement;

          // Set immediate timeout to select duplicate
          setTimeout(() => setSelectedElementId(newId), 0);

          return {
            ...page,
            elements: [...page.elements, duplicate]
          };
        })
      };
    });
  };

  // Adjust layer orders
  const bringToFront = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);
    setActiveProject(prev => {
      if (!prev) return null;
      return {
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
    });
  };

  const sendToBack = (elementId: string) => {
    if (!activeProject || !activePageId) return;
    pushState(activeProject.pages);
    setActiveProject(prev => {
      if (!prev) return null;
      return {
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
    });
  };

  // --- Page Actions ---

  const addPage = () => {
    if (!activeProject) return;
    pushState(activeProject.pages);

    const oldPages = [...activeProject.pages];
    const newPageNum = oldPages.length + 1;
    const newPageId = `page_${newPageNum}_${Date.now()}`;
    const deptUpper = (activeProject.department || "Information Technology").toUpperCase();

    // Preserve existing editorial board field values if available
    let chiefName = "DR. S. SRIVIDHYA";
    let chiefRole = "ASSOCIATE PROFESSOR AND HEAD";
    let chiefPic = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80";

    let coName = "MR. AKHIL K M";
    let coRole = "ASSISTANT PROFESSOR";
    let coPic = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80";

    oldPages.forEach((p) => {
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

    // Clean previous last page if it had Editorial Board elements
    const updatedOldPages = oldPages.map((p, idx) => {
      const pNum = idx + 1;
      const hasRibbon = p.elements?.some((el: any) => el.id?.includes('_ribbon_text') || el.id === 'p8_ribbon_text');
      if (hasRibbon) {
        return {
          ...p,
          title: `Page ${pNum}`,
          elements: [
            { id: `p${pNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
            { id: `p${pNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000" },
            { id: `p${pNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "left" },
            { id: `p${pNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "right" },
            { id: `p${pNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000" },
            { id: `p${pNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, align: "center", letterSpacing: 1.5 },
            { id: `p${pNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000" },
            { id: `p${pNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, align: "center", letterSpacing: 2.5 },
            { id: `p${pNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000" },
            { id: `p${pNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pNum} • Official publication of the Department of ${activeProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
          ]
        };
      }
      return p;
    });

    // Construct the new LAST PAGE with Editorial Board elements
    const newEditorialPage: Page = {
      id: newPageId,
      title: "Editorial Board",
      status: "DRAFT",
      elements: [
        { id: `p${newPageNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
        { id: `p${newPageNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000" },
        { id: `p${newPageNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "left" },
        { id: `p${newPageNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: "JUNE 2026", fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "right" },
        { id: `p${newPageNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000" },
        { id: `p${newPageNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, align: "center", letterSpacing: 1.5 },
        { id: `p${newPageNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000" },
        { id: `p${newPageNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, align: "center", letterSpacing: 2.5 },
        { id: `p${newPageNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000" },

        { id: `p${newPageNum}_ribbon_bg`, type: "shape", shapeType: "rect", x: 80, y: 220, width: 640, height: 40, fillColor: "#e2e8f0", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 4 },
        { id: `p${newPageNum}_ribbon_text`, type: "text", x: 80, y: 228, width: 640, height: 30, text: "EDITORIAL BOARD", fontSize: 20, fontFamily: "Playfair Display", color: "#0f172a", bold: true, align: "center", letterSpacing: 3.0 },

        { id: `p${newPageNum}_badge_chief_bg`, type: "shape", shapeType: "rect", x: 105, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
        { id: `p${newPageNum}_badge_chief_text`, type: "text", x: 105, y: 297, width: 240, height: 20, text: "CHIEF EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
        { id: `p${newPageNum}_pic_chief`, type: "image", x: 135, y: 340, width: 180, height: 180, url: chiefPic, borderRadius: 90, shadow: "md", objectFit: "cover" },
        { id: `p${newPageNum}_name_chief`, type: "text", x: 50, y: 540, width: 350, height: 25, text: chiefName, fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
        { id: `p${newPageNum}_desig_chief`, type: "text", x: 50, y: 565, width: 350, height: 20, text: chiefRole, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
        { id: `p${newPageNum}_dept_chief`, type: "text", x: 50, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

        { id: `p${newPageNum}_badge_co_bg`, type: "shape", shapeType: "rect", x: 455, y: 290, width: 240, height: 32, fillColor: "#ddd6fe", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, borderRadius: 6 },
        { id: `p${newPageNum}_badge_co_text`, type: "text", x: 455, y: 297, width: 240, height: 20, text: "CO EDITOR", fontSize: 13, fontFamily: "Playfair Display", color: "#4c1d95", bold: true, align: "center", letterSpacing: 1.5 },
        { id: `p${newPageNum}_pic_co`, type: "image", x: 485, y: 340, width: 180, height: 180, url: coPic, borderRadius: 90, shadow: "md", objectFit: "cover" },
        { id: `p${newPageNum}_name_co`, type: "text", x: 400, y: 540, width: 350, height: 25, text: coName, fontSize: 14, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center" },
        { id: `p${newPageNum}_desig_co`, type: "text", x: 400, y: 565, width: 350, height: 20, text: coRole, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },
        { id: `p${newPageNum}_dept_co`, type: "text", x: 400, y: 585, width: 350, height: 20, text: `DEPT. OF ${deptUpper}`, fontSize: 11, fontFamily: "Poppins", color: "#334155", bold: false, align: "center" },

        { id: `p${newPageNum}_line_div_left`, type: "shape", shapeType: "rect", x: 50, y: 640, width: 320, height: 2, fillColor: "#000000" },
        { id: `p${newPageNum}_diamond_div1`, type: "shape", shapeType: "rect", x: 380, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
        { id: `p${newPageNum}_diamond_div2`, type: "shape", shapeType: "rect", x: 410, y: 636, width: 10, height: 10, fillColor: "#000000", rotation: 45 },
        { id: `p${newPageNum}_line_div_right`, type: "shape", shapeType: "rect", x: 430, y: 640, width: 320, height: 2, fillColor: "#000000" },

        { id: `p${newPageNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${newPageNum} • Official publication of the Department of ${activeProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
      ] as CanvasElement[]
    };

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: [...updatedOldPages, newEditorialPage] as Page[]
      };
    });
    setActivePageId(newPageId);
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

    setActiveProject(prev => {
      if (!prev) return null;
      const nextPages = [...prev.pages];
      nextPages.splice(pageIndex + 1, 0, newPage); // Insert right after original
      return {
        ...prev,
        pages: nextPages
      };
    });
    setActivePageId(newPageId);
  };

  const deletePage = (pageId: string) => {
    if (!activeProject) return;
    if (activeProject.pages.length <= 1) {
      alert("Newsletter must have at least 1 page.");
      return;
    }
    pushState(activeProject.pages);

    const oldPages = activeProject.pages.filter(p => p.id !== pageId);
    const deptUpper = (activeProject.department || "Information Technology").toUpperCase();
    const lastIdx = oldPages.length - 1;

    // Preserve existing editorial board field values if available
    let chiefName = "DR. S. SRIVIDHYA";
    let chiefRole = "ASSOCIATE PROFESSOR AND HEAD";
    let chiefPic = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80";

    let coName = "MR. AKHIL K M";
    let coRole = "ASSISTANT PROFESSOR";
    let coPic = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80";

    oldPages.forEach((p) => {
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

    const updatedPages = oldPages.map((page, idx) => {
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

            { id: `p${pNum}_footer_text`, type: "text", x: 50, y: 1090, width: 700, height: 20, text: `Page ${pNum} • Official publication of the Department of ${activeProject.department || "Information Technology"}`, fontSize: 9, fontFamily: "Poppins", color: "#94a3b8", bold: false, align: "center" }
          ] as CanvasElement[];
        }
      }
      return page;
    });

    setActiveProject(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: updatedPages as Page[]
      };
    });

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
    
    setActiveProject(prev => {
      if (!prev) return null;
      const nextPages = [...prev.pages];
      const temp = nextPages[index];
      nextPages[index] = nextPages[targetIndex];
      nextPages[targetIndex] = temp;
      return {
        ...prev,
        pages: nextPages
      };
    });
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
