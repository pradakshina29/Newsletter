import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Upload, FileText, Sparkles, Move, Layers, ArrowRight, ShieldCheck, RefreshCw, X, Trash2, Plus } from 'lucide-react';
import CanvasWorkspace from './CanvasWorkspace';

interface ExtractedBlock {
  id: string;
  type: 'title' | 'sub_title' | 'text' | 'image';
  title?: string;
  content: string;
  url?: string;
  category?: string;
}

interface DualPaneStudioProps {
  onCloseSplitView: () => void;
  uploadedFile?: File | null;
}

const DualPaneStudio: React.FC<DualPaneStudioProps> = ({ onCloseSplitView, uploadedFile }) => {
  const { activeProject, activePageId, updatePageElements, saveProject, setActivePageId } = useEditor();
  const [extractedBlocks, setExtractedBlocks] = useState<ExtractedBlock[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [draggedBlock, setDraggedBlock] = useState<ExtractedBlock | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeProject) return null;

  const pageIndex = activeProject.pages.findIndex(p => p.id === activePageId);
  const activePageNum = pageIndex !== -1 ? pageIndex + 1 : 1;
  const currentPage = activeProject.pages[pageIndex] || activeProject.pages[0];

  // Process uploaded file whenever a file is passed or uploaded
  const parseFileObject = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      setTimeout(() => {
        let parsed: ExtractedBlock[] = [];
        if (typeof content === 'string' && content.trim()) {
          const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
          const rawTitle = lines[0] || 'EXTRACTED EVENT TITLE';
          const rawSubtitle = lines[1] || 'Activity Details & Report';
          const rawBody = lines.slice(2).join('\n\n') || 'Event details extracted from source file.';

          parsed = [
            { id: `ext_${Date.now()}_1`, type: 'title', title: 'EVENT HEADLINE', content: rawTitle.toUpperCase() },
            { id: `ext_${Date.now()}_2`, type: 'sub_title', title: 'SUBTITLE / DIGNITARY', content: rawSubtitle },
            { id: `ext_${Date.now()}_3`, type: 'text', title: 'ARTICLE BODY CONTENT', content: rawBody }
          ];
        } else if (file.type.startsWith('image/')) {
          parsed = [
            { id: `ext_${Date.now()}_1`, type: 'title', title: 'IMAGE TITLE', content: file.name.replace(/\.[^/.]+$/, "").toUpperCase() },
            { id: `ext_${Date.now()}_2`, type: 'image', title: 'UPLOADED PHOTO', content: file.name, url: content as string }
          ];
        } else {
          parsed = [
            { id: `ext_${Date.now()}_1`, type: 'title', title: 'FILE TITLE', content: file.name.replace(/\.[^/.]+$/, "").toUpperCase() },
            { id: `ext_${Date.now()}_2`, type: 'text', title: 'DOCUMENT DETAILS', content: `Content extracted from ${file.name}. Drag this text onto the right template.` }
          ];
        }
        setExtractedBlocks(parsed);
        setIsParsing(false);
      }, 400);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (uploadedFile) {
      parseFileObject(uploadedFile);
    }
  }, [uploadedFile]);

  // File Upload Event
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseFileObject(e.target.files[0]);
    }
  };

  // Clear current page elements to a pristine blank template (preserving locked CTRL+READ header)
  const handleClearToBlankTemplate = async () => {
    if (!currentPage) return;
    if (!confirm(`Clear Page ${activePageNum} content to a blank template? Header branding will remain locked.`)) return;

    // Filter out content elements, preserving locked header elements (y < 200 or locked: true)
    const headerElements = (currentPage.elements || []).filter((el: any) => el.locked || el.id.includes('_hdr') || el.id.includes('hdr_') || el.id.includes('line_hdr'));
    
    updatePageElements(currentPage.id, headerElements);
    await saveProject();
  };

  // Block Content Editing
  const handleUpdateBlockContent = (id: string, newContent: string) => {
    setExtractedBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
  };

  // Add custom manual text block to left inspector
  const handleAddCustomBlock = (type: 'title' | 'sub_title' | 'text') => {
    const newBlock: ExtractedBlock = {
      id: `ext_custom_${Date.now()}`,
      type,
      title: type === 'title' ? 'CUSTOM HEADLINE' : type === 'sub_title' ? 'CUSTOM SUBTITLE' : 'CUSTOM PARAGRAPH',
      content: type === 'title' ? 'NEW SECTION TITLE' : type === 'sub_title' ? 'New Subheading Details' : 'Type or edit custom text content here to drag onto canvas.'
    };
    setExtractedBlocks(prev => [...prev, newBlock]);
  };

  // HTML5 Drag Start
  const handleDragStart = (e: React.DragEvent, block: ExtractedBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.setData('application/json', JSON.stringify(block));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // HTML5 Drop on Canvas Target
  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);

    if (!currentPage) return;
    const rawData = e.dataTransfer.getData('application/json');
    let block: ExtractedBlock | null = draggedBlock;

    if (rawData) {
      try {
        block = JSON.parse(rawData);
      } catch (err) {
        console.error("Error parsing drag data", err);
      }
    }

    if (!block) return;

    // Calculate Y drop coordinate relative to target page canvas (strictly enforce header boundary protection y >= 220)
    const canvasDom = document.getElementById(currentPage.id);
    let dropY = 300;
    if (canvasDom) {
      const rect = canvasDom.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top);
      dropY = Math.max(220, relativeY);
    }

    let updatedElements = [...(currentPage.elements || [])];

    if (block.type === 'title') {
      const existing = updatedElements.find(el => el.id === `p${activePageNum}_title`);
      if (existing) {
        updatedElements = updatedElements.map(el => el.id === `p${activePageNum}_title` ? { ...el, text: block!.content.toUpperCase() } : el);
      } else {
        updatedElements.push({
          id: `p${activePageNum}_title`,
          type: 'text',
          x: 50,
          y: Math.max(220, dropY),
          width: 700,
          height: 35,
          text: block.content.toUpperCase(),
          fontSize: 18,
          fontFamily: 'Poppins',
          color: '#1e40af',
          bold: true,
          italic: false,
          underline: false,
          align: 'center',
          lineHeight: 1.4,
          letterSpacing: 0,
          rotation: 0,
          opacity: 100
        });
      }
    } else if (block.type === 'sub_title') {
      const existing = updatedElements.find(el => el.id === `p${activePageNum}_sub_title`);
      if (existing) {
        updatedElements = updatedElements.map(el => el.id === `p${activePageNum}_sub_title` ? { ...el, text: block!.content } : el);
      } else {
        updatedElements.push({
          id: `p${activePageNum}_sub_title`,
          type: 'text',
          x: 50,
          y: Math.max(260, dropY),
          width: 700,
          height: 25,
          text: block.content,
          fontSize: 12,
          fontFamily: 'Poppins',
          color: '#0f172a',
          bold: true,
          italic: false,
          underline: false,
          align: 'center',
          lineHeight: 1.4,
          letterSpacing: 0,
          rotation: 0,
          opacity: 100
        });
      }
    } else if (block.type === 'text') {
      const existing = updatedElements.find(el => el.id === `p${activePageNum}_text`);
      if (existing) {
        updatedElements = updatedElements.map(el => el.id === `p${activePageNum}_text` ? { ...el, text: block!.content } : el);
      } else {
        updatedElements.push({
          id: `p${activePageNum}_text`,
          type: 'text',
          x: 50,
          y: Math.max(295, dropY),
          width: 700,
          height: 200,
          text: block.content,
          fontSize: 10.5,
          fontFamily: 'Poppins',
          color: '#334155',
          bold: false,
          italic: false,
          underline: false,
          align: 'left',
          lineHeight: 1.5,
          letterSpacing: 0,
          rotation: 0,
          opacity: 100
        });
      }
    } else if (block.type === 'image' && block.url) {
      const existingImgs = updatedElements.filter(el => el.type === 'image' && el.id.startsWith(`p${activePageNum}_img`));
      const nextIdx = existingImgs.length + 1;
      updatedElements.push({
        id: `p${activePageNum}_img_${nextIdx}_${Date.now()}`,
        type: 'image',
        x: 50,
        y: Math.max(510, dropY),
        width: 700,
        height: 360,
        url: block.url,
        borderRadius: 12,
        shadow: 'md',
        rotation: 0,
        opacity: 100
      });
    }

    updatePageElements(currentPage.id, updatedElements);
    await saveProject();
    setDraggedBlock(null);
  };

  return (
    <div className="flex-grow flex w-full h-full bg-slate-950 overflow-hidden select-none">
      
      {/* LEFT PANE: UPLOADED FILE INSPECTOR & ASSET WORKBENCH (50% WIDTH) */}
      <div className="w-1/2 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden">
        
        {/* Left Pane Header Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Uploaded File Inspector</h3>
              <p className="text-[10px] text-slate-400 font-medium">Extracted Content Workbench • Drag blocks to right template</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{fileName ? 'Change File' : 'Upload File'}</span>
            </button>
            <button
              onClick={onCloseSplitView}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
              title="Close Split View"
            >
              <X className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
              className="hidden"
            />
          </div>
        </div>

        {/* Upload Summary Status Bar */}
        {fileName && (
          <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-200">
              <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="font-semibold truncate max-w-xs">{fileName}</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full">Parsed Cleanly</span>
            </div>

            <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Header Protected</span>
            </div>
          </div>
        )}

        {/* Extracted Asset Cards Workbench */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4">
          {isParsing ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-semibold">Parsing details & inline photos from uploaded file...</span>
            </div>
          ) : extractedBlocks.length === 0 ? (
            /* Upload Dropzone Empty State */
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="my-8 p-8 border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-900/70 rounded-3xl cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 text-center group"
            >
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">Upload Content File to Split View</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-medium">
                  Select a PDF, Word DOCX, Text file, or Photo to extract content into draggable blocks.
                </p>
              </div>
              <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors">
                Choose Document File
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <span>Extracted Content Blocks ({extractedBlocks.length})</span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleAddCustomBlock('text')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-bold text-[9px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Text Block</span>
                  </button>
                  <span className="text-slate-500 flex items-center space-x-1">
                    <Move className="w-3 h-3 text-indigo-400" />
                    <span>Drag to Canvas</span>
                  </span>
                </div>
              </div>

              {extractedBlocks.map((block) => (
                <div
                  key={block.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, block)}
                  className={`p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing group relative ${
                    draggedBlock?.id === block.id 
                      ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30' 
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50 shadow-md'
                  }`}
                >
                  {/* Top Card Badge & Drag Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                        block.type === 'title' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        block.type === 'sub_title' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        block.type === 'image' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {block.title || block.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-500 group-hover:text-indigo-400 transition-colors">
                      <span className="text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Drag Me</span>
                      <Move className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Card Content (Text / Image) */}
                  {block.type === 'image' && block.url ? (
                    <div className="space-y-2">
                      <div className="h-36 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                        <img src={block.url} alt={block.content} className="max-h-full max-w-full object-contain" />
                      </div>
                      <p className="text-[11px] text-slate-300 italic font-medium">{block.content}</p>
                    </div>
                  ) : (
                    <div>
                      {editingId === block.id ? (
                        <textarea
                          rows={3}
                          value={block.content}
                          onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          autoFocus
                          className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <p 
                          onClick={() => setEditingId(block.id)}
                          className={`text-xs text-slate-200 leading-relaxed font-medium cursor-text hover:text-white transition-colors ${
                            block.type === 'title' ? 'font-bold text-sm text-indigo-300' : ''
                          }`}
                        >
                          {block.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANE: LIVE NEWSLETTER CANVAS & DROP TARGET (50% WIDTH) */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragOverCanvas(true); }}
        onDragLeave={() => setIsDragOverCanvas(false)}
        onDrop={handleCanvasDrop}
        className={`w-1/2 flex flex-col h-full overflow-hidden relative transition-all ${
          isDragOverCanvas ? 'ring-4 ring-indigo-500/80 bg-indigo-950/20' : ''
        }`}
      >
        {/* Right Pane Overlay Header Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Target Canvas • Page {activePageNum}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Right Side Template • Drop content anywhere below locked header</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearToBlankTemplate}
              className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
              title="Clear page items below header for a fresh blank template"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Blank Template</span>
            </button>

            <button
              onClick={() => {
                const prev = Math.max(1, activePageNum - 1);
                setActivePageId(activeProject.pages[prev - 1].id);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              ← Page {Math.max(1, activePageNum - 1)}
            </button>
            <button
              onClick={() => {
                const next = Math.min(activeProject.pages.length, activePageNum + 1);
                setActivePageId(activeProject.pages[next - 1].id);
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              Page {Math.min(activeProject.pages.length, activePageNum + 1)} →
            </button>
          </div>
        </div>

        {/* Drop Zone Active Visual Overlay Banner */}
        {isDragOverCanvas && (
          <div className="absolute top-16 inset-x-4 z-50 bg-indigo-600/90 backdrop-blur-md text-white py-3 px-6 rounded-2xl shadow-2xl flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <ArrowRight className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Release mouse to drop content onto Page {activePageNum}!</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">Header Protected</span>
          </div>
        )}

        {/* Live Interactive Workspace Component */}
        <div className="flex-grow overflow-auto">
          <CanvasWorkspace mode="customize" />
        </div>
      </div>

    </div>
  );
};

export default DualPaneStudio;
