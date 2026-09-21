import React, { useRef, useState, useEffect } from 'react';
import { useEditor, ensureCanonicalPageStructure } from '../../context/EditorContext';
import { CanvasElement } from '../../types/editor';
import { Sparkles, Wand2, X } from 'lucide-react';

const TextElementComponent: React.FC<{
  el: any;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, text: string) => void;
}> = ({ el, isSelected, onSelect, onUpdate }) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.innerText !== (el.text || '') && document.activeElement !== divRef.current) {
      divRef.current.innerText = el.text || '';
    }
  }, [el.text]);

  return (
    <div
      ref={divRef}
      id={el.id}
      contentEditable={!el.locked}
      suppressContentEditableWarning={true}
      onFocus={() => !el.locked && onSelect()}
      onClick={(e) => {
        e.stopPropagation();
        if (!el.locked) onSelect();
      }}
      onBlur={() => {
        if (!el.locked && divRef.current) {
          onUpdate(el.id, divRef.current.innerText);
        }
      }}
      onInput={() => {
        if (!el.locked && divRef.current) {
          onUpdate(el.id, divRef.current.innerText);
        }
      }}
      className={`w-full h-full focus:outline-none ${el.locked ? 'cursor-default select-none' : 'cursor-text'} ${isSelected && !el.locked ? 'ring-1 ring-primary/60 bg-blue-50/10' : !el.locked ? 'hover:bg-blue-50/5' : ''}`}
      style={{
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        color: el.color,
        fontWeight: el.bold ? 'bold' : 'normal',
        fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: el.underline ? 'underline' : 'none',
        textAlign: el.align,
        lineHeight: el.lineHeight || 1.4,
        letterSpacing: el.letterSpacing !== undefined ? `${el.letterSpacing}px` : 'normal',
        wordSpacing: (el as any).wordSpacing !== undefined ? `${(el as any).wordSpacing}px` : undefined,
        whiteSpace: 'pre-wrap',
        overflow: 'hidden'
      }}
    >
      {el.text}
    </div>
  );
};

const CanvasWorkspace: React.FC<{ 
  mode?: 'content' | 'customize' | 'ai';
  onDropOnPage?: (pageIndex: number) => void;
  onSwitchMode?: (mode: 'content' | 'customize' | 'ai') => void;
}> = ({ mode: _mode = 'customize', onDropOnPage, onSwitchMode: _onSwitchMode }) => {
  const {
    activeProject,
    selectedElementId,
    activePageId,
    zoom,
    snapToGrid,
    showBleed,
    guidesX,
    guidesY,
    setSelectedElementId,
    setActivePageId,
    updateElement,
    setGuides,
    updatePageElements,
    isGenerating
  } = useEditor();

  const workspaceRef = useRef<HTMLDivElement>(null);

  const isProgrammaticScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll active page into view whenever activePageId changes (e.g. working on page 3 or clicking page 4)
  useEffect(() => {
    if (!activePageId) return;

    isProgrammaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    const timer = setTimeout(() => {
      const pageElement = document.getElementById(activePageId);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 750);
    }, 50);

    return () => clearTimeout(timer);
  }, [activePageId]);

  // Scroll observer: update activePageId when user manually scrolls pages in canvas viewport
  useEffect(() => {
    const container = workspaceRef.current;
    if (!container || !activeProject?.pages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const targetId = entry.target.id;
            if (targetId && targetId !== activePageId) {
              setActivePageId(targetId);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.5
      }
    );

    activeProject.pages.forEach((p) => {
      const pageEl = document.getElementById(p.id);
      if (pageEl) {
        observer.observe(pageEl);
      }
    });

    return () => observer.disconnect();
  }, [activeProject?.pages, activePageId, setActivePageId]);
  
  // Dragging & Resizing States
  const [dragState, setDragState] = useState<{
    elementId: string;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    action: 'drag' | 'resize' | 'rotate' | null;
    handle: string | null;
  } | null>(null);

  // AI Page Customize States
  const [aiCustomPageId, setAiCustomPageId] = useState<string | null>(null);
  const [aiCustomPageNum, setAiCustomPageNum] = useState<number>(0);
  const [aiPromptText, setAiPromptText] = useState<string>('');
  const [aiCustomizing, setAiCustomizing] = useState<boolean>(false);

  const handleAiCustomizePage = (pageId: string, pageNum: number) => {
    setAiCustomPageId(pageId);
    setAiCustomPageNum(pageNum);
    setAiPromptText('');
  };

  const applyPageAiCustomization = async () => {
    if (!aiPromptText.trim() || !aiCustomPageId || !activeProject) return;
    setAiCustomizing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/page-customize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageNumber: aiCustomPageNum,
          department: activeProject.department || "Information Technology",
          prompt: aiPromptText,
          currentElements: activeProject.pages.find(p => p.id === aiCustomPageId)?.elements || []
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.elements) {
          const targetId = aiCustomPageId;
          setAiCustomPageId(null);
          // Let the modal transition out before updating elements
          setTimeout(() => {
            updatePageElements(targetId, data.elements);
          }, 50);
        } else {
          alert("AI didn't return updated elements.");
        }
      } else {
        alert("Failed to apply page customization.");
      }
    } catch (e) {
      console.error(e);
      alert("Error customizing page.");
    } finally {
      setAiCustomizing(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex-grow flex items-center justify-center h-full text-slate-400 bg-slate-100">
        No active project loaded.
      </div>
    );
  }

  // Smart Guide Snapping calculation logic
  const checkSnapping = (movingId: string, elements: CanvasElement[], newX: number, newY: number, width: number, height: number) => {
    if (!snapToGrid) return { snappedX: newX, snappedY: newY, lineX: [], lineY: [] };

    const SNAP_THRESH = 5; // Snap within 5px
    let snappedX = newX;
    let snappedY = newY;
    let lineX: number[] = [];
    let lineY: number[] = [];

    const movingRight = newX + width;
    const movingBottom = newY + height;
    const movingCenterX = newX + width / 2;
    const movingCenterY = newY + height / 2;

    // Check against A4 margins and center lines
    const pageWidth = activeProject.canvasWidth;
    const pageHeight = activeProject.canvasHeight;

    // Page Horizontal snapping (Centers/Margins)
    if (Math.abs(movingCenterX - pageWidth / 2) < SNAP_THRESH) {
      snappedX = pageWidth / 2 - width / 2;
      lineY.push(pageWidth / 2);
    }
    if (Math.abs(newX - 40) < SNAP_THRESH) { // Standard 40px margin
      snappedX = 40;
      lineY.push(40);
    }
    if (Math.abs(movingRight - (pageWidth - 40)) < SNAP_THRESH) {
      snappedX = pageWidth - 40 - width;
      lineY.push(pageWidth - 40);
    }

    // Page Vertical snapping (Centers/Margins)
    if (Math.abs(movingCenterY - pageHeight / 2) < SNAP_THRESH) {
      snappedY = pageHeight / 2 - height / 2;
      lineX.push(pageHeight / 2);
    }

    // Check alignment against other elements on the same page
    elements.forEach(other => {
      if (other.id === movingId || other.locked) return;

      const otherRight = other.x + other.width;
      const otherBottom = other.y + other.height;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;

      // X alignment checks (Vertical snap lines)
      if (Math.abs(newX - other.x) < SNAP_THRESH) {
        snappedX = other.x;
        lineY.push(other.x);
      }
      if (Math.abs(movingRight - otherRight) < SNAP_THRESH) {
        snappedX = otherRight - width;
        lineY.push(otherRight);
      }
      if (Math.abs(newX - otherRight) < SNAP_THRESH) {
        snappedX = otherRight;
        lineY.push(otherRight);
      }
      if (Math.abs(movingRight - other.x) < SNAP_THRESH) {
        snappedX = other.x - width;
        lineY.push(other.x);
      }
      if (Math.abs(movingCenterX - otherCenterX) < SNAP_THRESH) {
        snappedX = otherCenterX - width / 2;
        lineY.push(otherCenterX);
      }

      // Y alignment checks (Horizontal snap lines)
      if (Math.abs(newY - other.y) < SNAP_THRESH) {
        snappedY = other.y;
        lineX.push(other.y);
      }
      if (Math.abs(movingBottom - otherBottom) < SNAP_THRESH) {
        snappedY = otherBottom - height;
        lineX.push(otherBottom);
      }
      if (Math.abs(newY - otherBottom) < SNAP_THRESH) {
        snappedY = otherBottom;
        lineX.push(otherBottom);
      }
      if (Math.abs(movingBottom - other.y) < SNAP_THRESH) {
        snappedY = other.y - height;
        lineX.push(other.y);
      }
      if (Math.abs(movingCenterY - otherCenterY) < SNAP_THRESH) {
        snappedY = otherCenterY - height / 2;
        lineX.push(otherCenterY);
      }
    });

    return { snappedX, snappedY, lineX, lineY };
  };

  const handleMouseDown = (
    e: React.MouseEvent, 
    element: CanvasElement, 
    action: 'drag' | 'resize' | 'rotate', 
    handle: string | null = null,
    pageId?: string
  ) => {
    e.stopPropagation();
    if (element.locked && action !== 'rotate') return;

    setSelectedElementId(element.id);
    if (pageId && activePageId !== pageId) {
      setActivePageId(pageId);
    }

    setDragState({
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: element.x,
      startTop: element.y,
      startWidth: element.width,
      startHeight: element.height,
      action,
      handle
    });
  };

  // Drag-and-resize mouse listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !activePageId) return;

      const page = activeProject.pages.find(p => p.id === activePageId);
      if (!page) return;

      const element = page.elements.find(el => el.id === dragState.elementId);
      if (!element) return;

      // Delta change scaled by zoom factor
      const deltaX = (e.clientX - dragState.startX) / zoom;
      const deltaY = (e.clientY - dragState.startY) / zoom;

      if (dragState.action === 'drag') {
        const rawX = dragState.startLeft + deltaX;
        let rawY = dragState.startTop + deltaY;

        // Prevent dragging content elements into Protected Header Zone (y < 220)
        const isHeaderEl = element.locked || element.id.includes('_hdr') || element.id.includes('hdr_') || element.id.includes('line_hdr');
        if (!isHeaderEl) {
          rawY = Math.max(220, rawY);
        }

        // Apply snapping
        const { snappedX, snappedY, lineX, lineY } = checkSnapping(
          element.id,
          page.elements,
          rawX,
          rawY,
          element.width,
          element.height
        );

        const finalY = isHeaderEl ? snappedY : Math.max(220, snappedY);

        updateElement(element.id, { x: snappedX, y: finalY });
        setGuides(lineX, lineY);
      } 
      
      else if (dragState.action === 'resize' && dragState.handle) {
        let newWidth = dragState.startWidth;
        let newHeight = dragState.startHeight;
        let newLeft = dragState.startLeft;
        let newTop = dragState.startTop;

        const h = dragState.handle;

        // Right resize
        if (h.includes('e')) {
          newWidth = Math.max(10, dragState.startWidth + deltaX);
        }
        // Left resize
        if (h.includes('w')) {
          const possibleWidth = dragState.startWidth - deltaX;
          if (possibleWidth > 10) {
            newWidth = possibleWidth;
            newLeft = dragState.startLeft + deltaX;
          }
        }
        // Bottom resize
        if (h.includes('s')) {
          newHeight = Math.max(10, dragState.startHeight + deltaY);
        }
        // Top resize
        if (h.includes('n')) {
          const possibleHeight = dragState.startHeight - deltaY;
          if (possibleHeight > 10) {
            newHeight = possibleHeight;
            newTop = dragState.startTop + deltaY;
          }
        }

        // Snap size guides
        updateElement(element.id, {
          x: newLeft,
          y: newTop,
          width: newWidth,
          height: newHeight
        });
      } 
      
      else if (dragState.action === 'rotate') {
        // Calculate angle relative to element center
        const elDom = document.getElementById(element.id);
        if (!elDom) return;

        const rect = elDom.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = Math.round(angleRad * (180 / Math.PI));
        
        // Normalize angle to [0, 360]
        if (angleDeg < 0) angleDeg += 360;

        updateElement(element.id, { rotation: angleDeg });
      }
    };

    const handleMouseUp = () => {
      if (dragState) {
        setDragState(null);
        setGuides([], []); // Clear smart lines
      }
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, activePageId, updateElement, setGuides]);

  const handlePageClick = (pageId: string) => {
    setActivePageId(pageId);
    setSelectedElementId(null); // Click background clears selection
  };

  // Render individual component types inside workspace
  const renderElement = (el: CanvasElement, pageId: string) => {
    const isSelected = el.id === selectedElementId;

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      opacity: (el.opacity !== undefined && !isNaN(Number(el.opacity)) ? Number(el.opacity) : 100) / 100,
      transform: `rotate(${el.rotation || 0}deg)`,
      zIndex: el.zIndex !== undefined ? el.zIndex : (el.id?.endsWith('_bg') || el.id === 'bg' ? 0 : el.id?.includes('_hdr') || el.id?.includes('hdr_') || el.id?.includes('footer') ? 50 : 2),
    };

    const innerContent = () => {
      switch (el.type) {
        case 'text':
          return (
            <TextElementComponent
              el={el}
              isSelected={selectedElementId === el.id}
              onSelect={() => {
                setSelectedElementId(el.id);
                if (activePageId !== pageId) {
                  setActivePageId(pageId);
                }
              }}
              onUpdate={(id, text) => updateElement(id, { text })}
            />
          );

        case 'image':
          return (
            <img
              id={el.id}
              src={el.url}
              alt="Workspace visual"
              className="w-full h-full"
              style={{
                objectFit: (el as any).objectFit || (el.id.includes('logo') ? 'contain' : 'cover'),
                borderRadius: `${el.borderRadius || 0}px`,
                mixBlendMode: (el as any).mixBlendMode || (el.id.includes('pdf_page') ? 'multiply' : 'normal'),
                boxShadow: 
                  el.shadow === 'sm' ? '0 1px 2px 0 rgba(0,0,0,0.05)' :
                  el.shadow === 'md' ? '0 4px 6px -1px rgba(0,0,0,0.1)' :
                  el.shadow === 'lg' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none'
              }}
            />
          );

        case 'shape':
          const shapeStyle: React.CSSProperties = {
            width: '100%',
            height: '100%',
            backgroundColor: el.fillColor,
            border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.strokeColor}` : 'none',
            borderRadius: el.shapeType === 'circle' ? '50%' : `${el.borderRadius || 0}px`
          };

          if (el.shapeType === 'triangle') {
            return (
              <div 
                id={el.id}
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `${el.width / 2}px solid transparent`,
                  borderRight: `${el.width / 2}px solid transparent`,
                  borderBottom: `${el.height}px solid ${el.fillColor}`
                }}
              />
            );
          }
          return <div id={el.id} style={shapeStyle} />;

        case 'qrcode':
          return (
            <div id={el.id} className="w-full h-full bg-white border border-slate-100 flex items-center justify-center p-2 rounded">
              {/* Render a beautiful graphic QR placeholder since it is dynamic */}
              <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center p-1">
                <svg className="w-10 h-10 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="3" height="3" />
                  <rect x="17" y="17" width="4" height="4" />
                  <path d="M14 20h.01M17 14h.01" />
                </svg>
                <span className="text-[8px] text-slate-400 font-bold truncate max-w-full mt-1.5">{el.value}</span>
              </div>
            </div>
          );

        case 'table':
          return (
            <div id={el.id} className="w-full h-full overflow-hidden bg-white border border-slate-200 text-[10px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {el.headers.map((h, idx) => (
                      <th key={idx} className="p-1.5 font-bold border-r border-slate-200 last:border-r-0 text-slate-600 text-left truncate">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {el.data.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-1.5 border-r border-slate-200 last:border-r-0 text-slate-500 font-medium truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

        case 'divider':
          return (
            <div 
              id={el.id}
              className="w-full"
              style={{
                height: `${el.thickness}px`,
                backgroundColor: el.color
              }}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div 
        key={el.id} 
        style={baseStyle}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedElementId(el.id);
          if (activePageId !== pageId) {
            setActivePageId(pageId);
          }
        }}
        onMouseDown={(e) => {
          if (el.type === 'text') return;
          handleMouseDown(e, el, 'drag', null, pageId);
        }}
        className={`group ${isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-primary/40'} ${el.type === 'text' ? '' : 'select-none'}`}
      >
        {innerContent()}

        {/* Selected Resizer Handles overlay */}
        {isSelected && !el.locked && (
          <>
            {/* Rotate handler bubble */}
            <div 
              onMouseDown={(e) => handleMouseDown(e, el, 'rotate')}
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all z-50"
              title="Rotate"
            >
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>

            {/* Corner Resize Handles */}
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'nw')} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-primary rounded-full cursor-nwse-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'ne')} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-primary rounded-full cursor-nesw-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-primary rounded-full cursor-nesw-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'se')} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-primary rounded-full cursor-nwse-resize shadow z-10" />

            {/* Edges Resize Handles */}
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'n')} className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-white border border-primary rounded-full cursor-ns-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 's')} className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-white border border-primary rounded-full cursor-ns-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'e')} className="absolute top-1/2 -translate-y-1/2 -right-1 w-1.5 h-3.5 bg-white border border-primary rounded-full cursor-ew-resize shadow z-10" />
            <div onMouseDown={(e) => handleMouseDown(e, el, 'resize', 'w')} className="absolute top-1/2 -translate-y-1/2 -left-1 w-1.5 h-3.5 bg-white border border-primary rounded-full cursor-ew-resize shadow z-10" />
          </>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={workspaceRef}
      className="flex-grow overflow-auto p-8 flex items-start justify-center editor-grid-bg relative h-full"
    >
      {isGenerating && (
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-md z-[100] flex flex-col items-center justify-center space-y-4">
          <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-white uppercase tracking-wider animate-pulse">Creating your newsletter...</span>
        </div>
      )}
      {/* Smart snap lines indicators */}
      {guidesY.map((yVal, idx) => (
        <div key={idx} className="snap-guide-y" style={{ left: `${yVal * zoom + 32}px` }} // added padding compensation
        />
      ))}
      {guidesX.map((xVal, idx) => (
        <div key={idx} className="snap-guide-x" style={{ top: `${xVal * zoom + 32}px` }} />
      ))}

      {/* Pages Container list */}
      <div 
        className="flex flex-col space-y-12 items-center pb-24"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        {(activeProject.pages || []).map((page, index) => {
          const isActive = page.id === activePageId;
          const canonicalPage = ensureCanonicalPageStructure(page, index + 1, activeProject.department || "Information Technology");
          const pageElements = canonicalPage.elements || [];
          return (
            <div
              key={page.id || index}
              id={page.id || `page_${index}`}
              onClick={() => handlePageClick(page.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (activePageId !== page.id) {
                  setActivePageId(page.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (onDropOnPage) {
                  onDropOnPage(index);
                }
              }}
              className={`canvas-page relative bg-white shadow-xl hover:shadow-2xl border transition-all duration-300 ${
                isActive ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
              } ${showBleed ? 'bleed-guide' : ''} group`}
              style={{
                width: activeProject.canvasWidth || 800,
                height: activeProject.canvasHeight || 1130,
              }}
            >
              {/* Element Mapper */}
              {pageElements.map(el => renderElement(el, page.id))}

              {/* Floating Page Toolbar */}
              <div className="absolute top-4 right-4 z-30 select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
                  <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300">Page Color:</span>
                  <input
                    type="color"
                    value={(pageElements.find(el => el.id.endsWith('_bg') || el.id === 'bg') as any)?.fillColor || '#ffffff'}
                    onChange={(e) => {
                      const bgEl = pageElements.find(el => el.id.endsWith('_bg') || el.id === 'bg');
                      if (bgEl) {
                        updateElement(bgEl.id, { fillColor: e.target.value });
                      }
                    }}
                    title="Change Page Background Color"
                    className="w-5 h-5 rounded cursor-pointer border border-slate-300"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const bgEl = pageElements.find(el => el.id.endsWith('_bg') || el.id === 'bg');
                      if (bgEl) {
                        updateElement(bgEl.id, { fillColor: '#F9F6EE' });
                      }
                    }}
                    className="px-1.5 py-0.5 bg-[#F9F6EE] hover:bg-[#F3EFE6] text-slate-800 border border-slate-300 rounded text-[9px] font-bold shadow-xs"
                    title="Apply Newsprint Vintage Background"
                  >
                    Newsprint
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentBgColor = (pageElements.find(el => el.id.endsWith('_bg') || el.id === 'bg') as any)?.fillColor || '#ffffff';
                      (activeProject.pages || []).forEach(p => {
                        const bg = p.elements.find(el => el.id.endsWith('_bg') || el.id === 'bg');
                        if (bg) {
                          updateElement(bg.id, { fillColor: currentBgColor });
                        }
                      });
                    }}
                    className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-extrabold shadow-xs transition-colors"
                    title={`Apply current color to all ${activeProject.pages.length} pages in 1 click`}
                  >
                    Apply to All {activeProject.pages.length} Pages
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAiCustomizePage(page.id, index + 1);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-primary text-white font-extrabold text-[10px] rounded-xl shadow-md hover:shadow-lg hover:scale-103 transition-all flex items-center space-x-1.5 border border-white/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>AI Customize Page</span>
                </button>
              </div>

              {/* Page Numbering Visual */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase select-none pointer-events-none">
                Page {index + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Page Customization Glass Modal */}
      {aiCustomPageId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-850 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span>AI Customize Page {aiCustomPageNum}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAiCustomPageId(null)}
                className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Describe what details or changes you want on Page {aiCustomPageNum} (e.g., "Change student achievements to sports winners R. Aswin and S. Karthi" or write it in Tamil).
            </p>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase">AI Customization Prompt</label>
              <textarea
                rows={4}
                value={aiPromptText}
                onChange={e => setAiPromptText(e.target.value)}
                placeholder="Type your event description or customization instructions here..."
                className="w-full border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-primary font-medium"
              />
            </div>
            
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAiCustomPageId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={aiCustomizing || !aiPromptText.trim()}
                onClick={applyPageAiCustomization}
                className="flex-1 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center space-x-1.5"
              >
                {aiCustomizing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Apply Customization</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasWorkspace;
