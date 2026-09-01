import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Layout, Type, Image, Square, Upload, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { ProjectData } from '../../types/editor';

const TABS = [
  { id: 'templates', label: 'Templates', icon: Layout },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'elements', label: 'Elements', icon: Square },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'ai', label: 'AI Studio', icon: Sparkles }
];



const SidebarTools: React.FC = () => {
  const {
    activeProject,
    loadProject,
    addElement,
    updateTheme,
    saveProject,
    changeTemplate
  } = useEditor();

  const [activeTab, setActiveTab] = useState<string>('templates');
  const [templates, setTemplates] = useState<ProjectData[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // AI Title Generator States
  const [dept, setDept] = useState<string>('Computer Science');
  const [event, setEvent] = useState<string>('National AI Hackathon');
  const [keywords, setKeywords] = useState<string>('Machine Learning, IoT');
  const [cat] = useState<string>('Academic');
  const [aiTitles, setAiTitles] = useState<Array<{ title: string; style: string; description: string }>>([]);
  const [generatingTitles, setGeneratingTitles] = useState<boolean>(false);

  // AI Image Generator States
  const [imagePrompt, setImagePrompt] = useState<string>('Students coding in a clean lab');
  const [imageStyle, setImageStyle] = useState<string>('Realistic Photography');
  const [aiImages, setAiImages] = useState<Array<{ url: string; alt: string }>>([]);
  const [generatingImages, setGeneratingImages] = useState<boolean>(false);

  // AI Grammar & Text Summarizer States
  const [rawText, setRawText] = useState<string>('');
  const [aiResultText, setAiResultText] = useState<string>('');
  const [grammarIssues, setGrammarIssues] = useState<Array<{ error: string; suggestion: string; description: string }>>([]);
  const [analyzingText, setAnalyzingText] = useState<boolean>(false);

  // Brand Swatches
  const brandPalettes = [
    { name: 'KPRCAS Brand Kit', primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
    { name: 'Academic Emerald', primary: '#166534', secondary: '#0f172a', accent: '#15803d', background: '#EFEFEF' },
    { name: 'Active Sports', primary: '#ea580c', secondary: '#0f172a', accent: '#1e40af', background: '#EFEFEF' },
    { name: 'Vibrant Arts', primary: '#7e22ce', secondary: '#0f172a', accent: '#e11d48', background: '#EFEFEF' }
  ];

  // Mock Uploaded images list
  const [uploads, setUploads] = useState<string[]>([
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=500&q=80'
  ]);

  // 500+ Images Gallery States
  const [uploadSubTab, setUploadSubTab] = useState<'uploads' | 'gallery'>('uploads');
  const [gallery, setGallery] = useState<Array<{ id: string; url: string; category: string; alt: string }>>([]);
  const [loadingGallery, setLoadingGallery] = useState<boolean>(false);
  const [galleryCategory, setGalleryCategory] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(40);

  // Load 500+ gallery images from backend
  useEffect(() => {
    const fetchGallery = async () => {
      setLoadingGallery(true);
      const token = localStorage.getItem('token');
      try {
        const response = await fetch('/api/ai/gallery', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          setGallery(await response.json());
        }
      } catch (err) {
        console.error("Failed to load gallery images", err);
      } finally {
        setLoadingGallery(false);
      }
    };
    fetchGallery();
  }, []);

  // Load templates from database
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/projects/templates', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          setTemplates(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  const regenerateNewsletterWithNewTemplate = async (templateId: number) => {
    if (!activeProject || !activeProject.id) return;
    const metadata = (activeProject as any).promptMetadata;
    if (!metadata || !metadata.prompt) return;

    setLoadingTemplates(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/regenerate-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: templateId,
          prompt: metadata.prompt,
          eventType: metadata.eventType || 'Campus Event',
          department: metadata.department || activeProject.department,
          date: metadata.date || 'June 2026',
          audience: metadata.audience || 'Students'
        })
      });
      if (response.ok) {
        const updated = await response.json();
        let parsed = updated;
        if (typeof updated.content === 'string') {
          const content = JSON.parse(updated.content);
          parsed = {
            ...updated,
            canvasWidth: content.canvasWidth || 800,
            canvasHeight: content.canvasHeight || 1130,
            theme: content.theme,
            pages: content.pages,
            promptMetadata: content.promptMetadata
          };
        }
        loadProject(parsed);
      } else {
        alert("Failed to regenerate layout using prompt.");
      }
    } catch (e) {
      console.error(e);
      alert("Error regenerating layout.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleImportTemplate = (temp: ProjectData) => {
    if (!activeProject) return;

    // Save project before template switch
    saveProject();

    const parsedContent = typeof temp.content === 'string' ? JSON.parse(temp.content) : temp.content;
    const templatePages = parsedContent.pages || [];
    const currentPages = activeProject.pages || [];

    const updatedPages = templatePages.map((tPage: any, pageIdx: number) => {
      const cPage = currentPages[pageIdx];
      if (!cPage) return tPage;

      // Collect current page assets
      const currentImages = cPage.elements.filter((el: any) => el.type === 'image' && el.url).map((el: any) => el.url);
      const currentTexts = cPage.elements.filter((el: any) => el.type === 'text' && el.text);
      
      // Categorize current texts
      const bodyTexts = currentTexts.filter((el: any) => {
        const lowerId = el.id.toLowerCase();
        return el.text.length > 35 || lowerId.includes('_text') || lowerId.includes('_body') || lowerId.includes('_desc') || lowerId.includes('_col');
      }).map((el: any) => el.text);

      const titleTexts = currentTexts.filter((el: any) => {
        const lowerId = el.id.toLowerCase();
        return (el.fontSize && el.fontSize >= 14) || lowerId.includes('title') || lowerId.includes('hdr') || lowerId.includes('heading');
      }).map((el: any) => el.text);

      const listTexts = currentTexts.filter((el: any) => {
        const lowerId = el.id.toLowerCase();
        return lowerId.includes('session') || lowerId.includes('bullet') || el.text.startsWith('•');
      }).map((el: any) => el.text);

      let usedImageCount = 0;
      let usedBodyCount = 0;
      let usedTitleCount = 0;
      let usedListCount = 0;

      const mappedElements = tPage.elements.map((tEl: any) => {
        // Try exact ID match first
        const cEl = cPage.elements.find((el: any) => el.id === tEl.id);
        if (cEl) {
          if (tEl.type === 'text' && cEl.type === 'text') {
            return { ...tEl, text: cEl.text };
          }
          if (tEl.type === 'image' && cEl.type === 'image') {
            return { ...tEl, url: cEl.url };
          }
          return { ...tEl };
        }

        // If no exact ID match, perform smart positional/type-based fallback mapping
        if (tEl.type === 'image' && currentImages.length > 0) {
          const fallbackUrl = currentImages[usedImageCount % currentImages.length];
          usedImageCount++;
          return { ...tEl, url: fallbackUrl };
        }

        if (tEl.type === 'text') {
          const lowerId = tEl.id.toLowerCase();
          
          // List item fallback
          if ((lowerId.includes('session') || lowerId.includes('bullet') || tEl.text.startsWith('•')) && listTexts.length > 0) {
            const val = listTexts[usedListCount % listTexts.length];
            usedListCount++;
            return { ...tEl, text: val };
          }

          // Title fallback
          if (((tEl.fontSize && tEl.fontSize >= 14) || lowerId.includes('title') || lowerId.includes('hdr') || lowerId.includes('heading')) && titleTexts.length > 0) {
            const val = titleTexts[usedTitleCount % titleTexts.length];
            usedTitleCount++;
            return { ...tEl, text: val };
          }

          // Body text fallback
          if ((tEl.text.length > 35 || lowerId.includes('_text') || lowerId.includes('_body') || lowerId.includes('_desc') || lowerId.includes('_col')) && bodyTexts.length > 0) {
            const val = bodyTexts[usedBodyCount % bodyTexts.length];
            usedBodyCount++;
            return { ...tEl, text: val };
          }
        }

        return tEl;
      });

      return {
        ...tPage,
        elements: mappedElements
      };
    });

    changeTemplate(
      updatedPages,
      parsedContent.theme || activeProject.theme,
      parsedContent.canvasWidth,
      parsedContent.canvasHeight
    );
  };

  const triggerTitleAI = async () => {
    setGeneratingTitles(true);
    setAiTitles([]);
    try {
      const response = await fetch('/api/ai/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: dept, event, keywords, category: cat })
      });
      if (response.ok) {
        setAiTitles(await response.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingTitles(false);
    }
  };

  const triggerImageAI = async () => {
    setGeneratingImages(true);
    setAiImages([]);
    try {
      const response = await fetch('/api/ai/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, style: imageStyle })
      });
      if (response.ok) {
        const data = await response.json();
        setAiImages(data.images);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingImages(false);
    }
  };

  const triggerTextAI = async (action: 'summarize' | 'grammar') => {
    if (!rawText.trim()) return;
    setAnalyzingText(true);
    setAiResultText('');
    setGrammarIssues([]);
    try {
      const response = await fetch(`/api/ai/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      if (response.ok) {
        const data = await response.json();
        if (action === 'summarize') {
          setAiResultText(data.summary);
        } else {
          setAiResultText(data.corrected);
          setGrammarIssues(data.issues);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingText(false);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const uint8 = new Uint8Array(buffer);
          const decoder = new TextDecoder('latin1');
          const rawText = decoder.decode(uint8);

          let textChunks: string[] = [];

          const rawMatches = rawText.match(/\(([^()]{3,})\)/g);
          if (rawMatches) {
            rawMatches.forEach(m => {
              const clean = m.slice(1, -1).replace(/\\\(|\r|\n/g, ' ').trim();
              if (clean.length > 2 && !/^[\d\s.\\\/]+$/.test(clean) && !clean.toLowerCase().includes('font') && !clean.toLowerCase().includes('adobe')) {
                textChunks.push(clean);
              }
            });
          }

          const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
          let match: RegExpExecArray | null;

          while ((match = streamRegex.exec(rawText)) !== null) {
            try {
              const streamContent = match[1];
              const bytes = new Uint8Array(streamContent.length);
              for (let i = 0; i < streamContent.length; i++) {
                bytes[i] = streamContent.charCodeAt(i) & 0xff;
              }

              if (typeof DecompressionStream !== 'undefined') {
                try {
                  const deflateBytes = (bytes[0] === 0x78) ? bytes.subarray(2) : bytes;
                  const ds = new DecompressionStream('deflate-raw');
                  const writer = ds.writable.getWriter();
                  writer.write(deflateBytes);
                  writer.close();

                  const response = new Response(ds.readable);
                  const decompressedBuffer = await response.arrayBuffer();
                  const decompressedText = new TextDecoder('utf-8').decode(decompressedBuffer);

                  const streamMatches = decompressedText.match(/\(([^()]{3,})\)/g);
                  if (streamMatches) {
                    streamMatches.forEach(sm => {
                      const clean = sm.slice(1, -1).replace(/\\\(|\r|\n/g, ' ').trim();
                      if (clean.length > 2 && !/^[\d\s.\\\/]+$/.test(clean) && !clean.toLowerCase().includes('font')) {
                        textChunks.push(clean);
                      }
                    });
                  } else {
                    const words = decompressedText.match(/[A-Za-z0-9\s.,'":;!\-–—]{4,}/g);
                    if (words) {
                      words.forEach(w => {
                        const clean = w.trim();
                        if (clean.length > 3 && !clean.includes('obj') && !clean.includes('stream') && !clean.includes('endstream')) {
                          textChunks.push(clean);
                        }
                      });
                    }
                  }
                } catch {
                  // Stream inflate fallback
                }
              }
            } catch {
              // Ignore stream error
            }
          }

          const uniqueText = Array.from(new Set(textChunks)).filter(s => s.length > 2);
          if (uniqueText.length > 0) {
            resolve(uniqueText.join('\n'));
            return;
          }

          const wordsFallback = rawText.match(/[A-Za-z0-9\s.,'":;!\-–—]{4,}/g);
          if (wordsFallback && wordsFallback.length > 0) {
            const filtered = wordsFallback
              .map(w => w.trim())
              .filter(w => w.length > 3 && !w.includes('obj') && !w.includes('stream') && !w.includes('endstream') && !w.includes('PDF'));
            resolve(filtered.slice(0, 150).join('\n'));
            return;
          }

          resolve(`Newsletter format from PDF file: ${file.name}`);
        } catch {
          resolve(`Newsletter format from PDF file: ${file.name}`);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const token = localStorage.getItem('token');
    const fileNameLower = file.name.toLowerCase();

    // Handle PDF, JSON backup, or Document upload inside Editor Workspace
    if (fileNameLower.endsWith('.pdf') || file.type === 'application/pdf' || fileNameLower.endsWith('.json') || fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.doc') || fileNameLower.endsWith('.docx')) {
      try {
        if (fileNameLower.endsWith('.json')) {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed.pages) {
            changeTemplate(parsed.pages, parsed.theme || activeProject?.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#ffffff' });
            alert(`Newsletter workspace imported successfully from JSON backup: "${file.name}"!`);
            return;
          }
        }

        let extractedText = file.name;
        if (fileNameLower.endsWith('.pdf') || file.type === 'application/pdf') {
          extractedText = await extractTextFromPdf(file);
        } else {
          extractedText = await file.text();
        }

        const promptText = `Uploaded campus file: ${file.name}. Contents extracted: ${extractedText}. Please format and generate an 8-page newsletter based on this file content.`;
        
        // Call backend generate-ai endpoint
        const response = await fetch('/api/projects/generate-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            templateId: 1,
            name: file.name.replace(/\.[^/.]+$/, ""),
            eventType: "Uploaded Newsletter Format",
            department: activeProject?.department || "Information Technology",
            date: "June 2026",
            audience: "All Students",
            keywords: "Imported, Newsletter",
            tone: "Professional",
            prompt: promptText
          })
        });

        if (response.ok) {
          const generatedProj = await response.json();
          let parsedContent = generatedProj.content;
          if (typeof parsedContent === 'string') {
            parsedContent = JSON.parse(parsedContent);
          }
          if (parsedContent.pages) {
            changeTemplate(parsedContent.pages, parsedContent.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#ffffff' });
            alert(`Newsletter automatically generated from uploaded file "${file.name}" using available site templates!`);
            return;
          }
        }
      } catch (err) {
        console.error("Sidebar file upload processing error", err);
      }
    }

    // Default image upload handler
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setUploads(prev => [uploadEvent.target!.result as string, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-96 bg-white border-r border-slate-200 flex h-full">
      {/* Mini vertical icon tab strip */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-4 space-y-6 text-slate-400 select-none">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center space-y-1.5 transition-colors ${
                isActive ? 'text-white' : 'hover:text-slate-200'
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-all ${
                isActive ? 'bg-primary text-white shadow shadow-primary/35 scale-105' : 'hover:bg-white/5'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-semibold tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Drawer Panel area */}
      <div className="flex-grow p-5 overflow-y-auto max-h-full space-y-5">
        
        {/* TAB: Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-sm text-secondary dark:text-white">Document Templates</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Click to import standard layout guides.</p>
            </div>
            {loadingTemplates ? (
              <p className="text-xs text-slate-400 py-6 text-center animate-pulse">Loading templates...</p>
            ) : (
              <div className="space-y-4">
                {templates.map(temp => {
                  let themeConfig = { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316' };
                  if (typeof temp.content === 'string') {
                    try {
                      const contentObj = JSON.parse(temp.content);
                      themeConfig = contentObj.theme || themeConfig;
                    } catch (e) {
                      console.error(e);
                    }
                  } else if (temp.theme) {
                    themeConfig = temp.theme;
                  }
                  
                  return (
                    <div
                      key={temp.id}
                      onClick={() => handleImportTemplate(temp)}
                      className="group p-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/85 dark:hover:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md"
                    >
                      {/* Miniature Design Preview Mockup */}
                      <div className="h-28 w-full bg-white dark:bg-slate-950 relative rounded-lg border border-slate-200/60 dark:border-slate-850 overflow-hidden mb-2.5 shadow-2xs flex flex-col justify-between p-2 select-none group-hover:border-primary/40 transition-colors">
                        {/* Header Banner */}
                        <div 
                          className="h-8 rounded flex items-center justify-between px-2 text-[6px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: themeConfig.primary }}
                        >
                          <div className="scale-[0.8] origin-left truncate max-w-[70%]">
                            {activeProject ? activeProject.name.toUpperCase() : temp.name.replace("KPRCAS", "").replace("Newsletter", "").trim().toUpperCase()}
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeConfig.accent }} />
                        </div>

                        {/* Body columns */}
                        <div className="flex space-x-2 flex-grow items-center justify-between pt-2">
                          <div className="space-y-1 w-1/2">
                            <div className="text-[4px] font-bold text-slate-400 truncate uppercase">
                              {activeProject ? activeProject.department : "Academic Dept"}
                            </div>
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                          </div>
                          <div className="w-5/12 h-10 rounded border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900/40">
                            <div className="w-2.5 h-2.5 rounded-xs opacity-50" style={{ backgroundColor: themeConfig.accent }} />
                          </div>
                        </div>

                        {/* Miniature Footer */}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-850 mt-1">
                          <span className="text-[5px] text-slate-400 tracking-wider">KPRCAS Newsletter</span>
                          <span className="text-[5px] text-slate-400">Page 1</span>
                        </div>
                      </div>

                      <span className="text-[8px] font-bold text-primary uppercase tracking-wider block">{temp.category}</span>
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-350 mt-0.5 group-hover:text-primary transition-colors">{temp.name}</h4>
                      <p className="text-[9px] text-slate-400 leading-relaxed mt-1 line-clamp-1">{temp.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Text */}
        {activeTab === 'text' && (
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-sm text-secondary">Typography Presets</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Add styled text blocks to the canvas.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => addElement('text', { text: 'Heading Level 1', fontSize: 32, bold: true })}
                className="w-full text-left p-3.5 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl transition-all"
              >
                <span className="text-xl font-bold text-slate-800 block">Add Heading</span>
                <span className="text-[9px] text-slate-400">Poppins Bold | 32px</span>
              </button>
              <button
                onClick={() => addElement('text', { text: 'Subheading Content', fontSize: 20, bold: true })}
                className="w-full text-left p-3.5 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl transition-all"
              >
                <span className="text-base font-semibold text-slate-700 block">Add Subheading</span>
                <span className="text-[9px] text-slate-400">Poppins Semibold | 20px</span>
              </button>
              <button
                onClick={() => addElement('text', { text: 'A paragraph of regular newsletter content. Double click here to edit the copy.', fontSize: 11 })}
                className="w-full text-left p-3.5 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl transition-all"
              >
                <span className="text-xs text-slate-500 block leading-relaxed line-clamp-2">Add body text. Build detailed columns or messages.</span>
                <span className="text-[9px] text-slate-400 block mt-1">Poppins Regular | 11px</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: Elements */}
        {activeTab === 'elements' && (
          <div className="space-y-5">
            {/* Shape Presets */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Shapes & Blocks</h4>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => addElement('shape', { shapeType: 'rect' })}
                  className="p-3 bg-slate-50 border border-slate-200 hover:border-primary/30 rounded-xl flex flex-col items-center space-y-1.5 transition-colors"
                >
                  <div className="w-8 h-6 bg-slate-400 rounded-sm" />
                  <span className="text-[9px] font-semibold text-slate-500">Rectangle</span>
                </button>
                <button
                  onClick={() => addElement('shape', { shapeType: 'circle' })}
                  className="p-3 bg-slate-50 border border-slate-200 hover:border-primary/30 rounded-xl flex flex-col items-center space-y-1.5 transition-colors"
                >
                  <div className="w-7 h-7 bg-slate-400 rounded-full" />
                  <span className="text-[9px] font-semibold text-slate-500">Circle</span>
                </button>
                <button
                  onClick={() => addElement('shape', { shapeType: 'triangle' })}
                  className="p-3 bg-slate-50 border border-slate-200 hover:border-primary/30 rounded-xl flex flex-col items-center space-y-1.5 transition-colors"
                >
                  <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[24px] border-b-slate-400 border-l-transparent border-r-transparent" />
                  <span className="text-[9px] font-semibold text-slate-500">Triangle</span>
                </button>
              </div>
            </div>

            {/* Smart Components */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Interactive Components</h4>
              <div className="space-y-2">
                <button
                  onClick={() => addElement('qrcode', { value: 'https://kprcas.ac.in' })}
                  className="w-full p-3 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl flex items-center justify-between text-xs text-slate-600 font-semibold"
                >
                  <span>Insert QR Code Link</span>
                  <div className="w-5 h-5 bg-slate-400/20 border border-slate-400/40 rounded flex items-center justify-center font-bold text-[10px]">QR</div>
                </button>
                <button
                  onClick={() => addElement('table', {
                    rows: 3, cols: 3,
                    headers: ['Academic Year', 'Grants', 'Publications'],
                    data: [['2025', '₹5 Lakhs', '12'], ['2026', '₹10 Lakhs', '18']]
                  })}
                  className="w-full p-3 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl flex items-center justify-between text-xs text-slate-600 font-semibold"
                >
                  <span>Insert Data Table</span>
                  <span className="text-[10px] text-slate-400">Headers + Rows</span>
                </button>
                <button
                  onClick={() => addElement('divider', { thickness: 2, color: '#e2e8f0' })}
                  className="w-full p-3 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl flex items-center justify-between text-xs text-slate-600 font-semibold"
                >
                  <span>Insert Layout Line</span>
                  <div className="w-8 h-0.5 bg-slate-400" />
                </button>
              </div>
            </div>

            {/* Quick Themes */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Brand Color Kits</h4>
              <div className="grid grid-cols-2 gap-2">
                {brandPalettes.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateTheme({ primary: p.primary, secondary: p.secondary, accent: p.accent, background: p.background })}
                    className="p-2.5 bg-slate-50 border border-slate-200/50 hover:border-primary/30 rounded-xl text-left transition-all"
                  >
                    <span className="text-[10px] font-bold text-slate-600 block truncate">{p.name}</span>
                    <div className="flex space-x-1 mt-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: p.primary }} />
                      <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: p.accent }} />
                      <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: p.secondary }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB: Uploads */}
        {activeTab === 'uploads' && (
          <div className="space-y-4 flex flex-col h-full overflow-hidden">
            <div>
              <h3 className="font-bold text-sm text-secondary dark:text-white">Visual Assets Library</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Upload your own photos or choose from KPRCAS assets.</p>
            </div>

            {/* Sub-tabs for uploads vs gallery */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setUploadSubTab('uploads')}
                className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${uploadSubTab === 'uploads' ? 'border-primary text-primary dark:text-blue-400' : 'border-transparent text-slate-400'}`}
              >
                My Uploads
              </button>
              <button 
                onClick={() => setUploadSubTab('gallery')}
                className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${uploadSubTab === 'gallery' ? 'border-primary text-primary dark:text-blue-400' : 'border-transparent text-slate-400'}`}
              >
                College Library (500+)
              </button>
            </div>

            {uploadSubTab === 'uploads' ? (
              <div className="space-y-4 overflow-y-auto pr-1">
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 rounded-xl p-5 text-center block cursor-pointer bg-slate-50 dark:bg-slate-900/50 transition-colors">
                  <input type="file" accept="*" onChange={handleUploadImage} className="hidden" />
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="text-[11px] font-bold text-primary dark:text-blue-400">Browse Files</span>
                  <span className="text-[9px] text-slate-400 block mt-1">Supports PDF, Documents, Images up to 10MB</span>
                </label>

                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">My Uploaded Assets</h4>
                  {uploads.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No uploads yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {uploads.map((url, idx) => {
                        const isNonImage = url.startsWith('data:application/pdf') || url.startsWith('data:text/') || url.includes('.pdf') || url.includes('.json');
                        if (isNonImage) {
                          return (
                            <div
                              key={idx}
                              onClick={() => alert("Document file format extracted and applied to workspace!")}
                              className="relative group h-24 bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-all border border-slate-200/40"
                            >
                              <BookOpen className="w-6 h-6 text-primary mb-1" />
                              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 line-clamp-1">PDF Format</span>
                              <span className="text-[8px] text-green-600 font-bold mt-0.5">Applied to Pages</span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={idx}
                            onClick={() => addElement('image', { url })}
                            className="relative group h-24 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all border border-slate-200/40"
                          >
                            <img
                              src={url}
                              alt="Uploaded visual"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">Add to Page</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-grow flex flex-col overflow-hidden">
                {/* Category tags selector */}
                <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-thin select-none">
                  {['All', 'Campus Life', 'Technology', 'Library', 'Graduation', 'Sports', 'Seminars', 'Classroom', 'Achievements'].map(c => (
                    <button
                      key={c}
                      onClick={() => { setGalleryCategory(c); setVisibleCount(40); }}
                      className={`px-2.5 py-1 text-[10px] rounded-lg font-semibold whitespace-nowrap transition-all ${
                        galleryCategory === c
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                {/* Grid scrollbox */}
                <div className="flex-grow overflow-y-auto pr-1 space-y-3">
                  {loadingGallery ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                      <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Loading college assets...</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {gallery
                          .filter(img => galleryCategory === 'All' || img.category === galleryCategory)
                          .slice(0, visibleCount)
                          .map((img) => (
                            <div
                              key={img.id}
                              onClick={() => addElement('image', { url: img.url })}
                              className="relative group h-24 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all border border-slate-200/40"
                              title={img.alt}
                            >
                              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">Add to Page</span>
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      {/* Load More Button */}
                      {gallery.filter(img => galleryCategory === 'All' || img.category === galleryCategory).length > visibleCount && (
                        <button
                          onClick={() => setVisibleCount(prev => prev + 40)}
                          className="w-full py-2 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Load More College Photos...
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: AI Studio */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            
            {/* Active Generation Prompt Editor */}
            {(activeProject as any).promptMetadata?.prompt && (
              <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                  <span>Active Newsletter Prompt</span>
                </h4>
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={(activeProject as any).promptMetadata.prompt}
                    onChange={e => {
                      if (!activeProject) return;
                      const updatedProj = {
                        ...activeProject,
                        promptMetadata: {
                          ...(activeProject as any).promptMetadata,
                          prompt: e.target.value
                        }
                      } as any;
                      loadProject(updatedProj);
                    }}
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    disabled={loadingTemplates}
                    onClick={() => regenerateNewsletterWithNewTemplate((activeProject as any).promptMetadata.templateId || 1)}
                    className="w-full py-2 bg-purple-600 text-white font-bold text-[10px] tracking-wide rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    {loadingTemplates ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply & Re-generate Newsletter</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 1. AI Title suggestion */}
            <div className="space-y-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
              <h4 className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>AI Title Generator</span>
              </h4>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Department</label>
                  <input
                    type="text"
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Event / Topic Name</label>
                  <input
                    type="text"
                    value={event}
                    onChange={e => setEvent(e.target.value)}
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Keywords</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="Innovation, coding"
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <button
                  disabled={generatingTitles}
                  onClick={triggerTitleAI}
                  className="w-full py-2 bg-primary text-white font-bold text-[11px] tracking-wide rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center space-x-1.5"
                >
                  {generatingTitles ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ Generate AI Titles</span>
                    </>
                  )}
                </button>
              </div>

              {/* Title result scrollbox */}
              {aiTitles.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-100 max-h-48 overflow-y-auto space-y-2 pr-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">15-20 Suggestions:</span>
                  {aiTitles.map((t, idx) => (
                    <div
                      key={idx}
                      onClick={() => addElement('text', { text: t.title, fontSize: 24, bold: true })}
                      className="p-2 bg-white hover:bg-blue-100/30 border border-slate-200/60 rounded-xl cursor-pointer text-left transition-colors"
                      title="Click to insert into page"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-accent">{t.style}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700 mt-1 leading-snug">{t.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. AI Image generator */}
            <div className="space-y-3 p-4 bg-orange-50/40 border border-orange-100/50 rounded-2xl">
              <h4 className="text-xs font-extrabold text-accent uppercase tracking-wider flex items-center space-x-1.5">
                <Image className="w-4 h-4" />
                <span>AI Image Generator</span>
              </h4>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Describe Image Prompt</label>
                  <textarea
                    rows={2}
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    placeholder="A coding hackathon classroom..."
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Illustration Style</label>
                  <select
                    value={imageStyle}
                    onChange={e => setImageStyle(e.target.value)}
                    className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option>Realistic Photography</option>
                    <option>Minimal Illustration</option>
                    <option>Modern Vector</option>
                    <option>Watercolor</option>
                    <option>3D Render</option>
                  </select>
                </div>

                {/* Quick Prompts suggestions */}
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {['🎓 Graduation Ceremony', '🏆 Sports Day', '🌱 NSS Activity', '💻 Coding Competition'].map(q => (
                      <button
                        key={q}
                        onClick={() => setImagePrompt(q.substring(2))}
                        className="px-1.5 py-0.5 bg-white border border-slate-200 text-[9px] text-slate-600 rounded hover:bg-slate-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={generatingImages}
                  onClick={triggerImageAI}
                  className="w-full py-2 bg-accent text-white font-bold text-[11px] tracking-wide rounded-xl hover:bg-accent-dark transition-colors flex items-center justify-center space-x-1.5"
                >
                  {generatingImages ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ Generate AI Image</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Generated Images Grid */}
              {aiImages.length > 0 && (
                <div className="mt-4 pt-3 border-t border-orange-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Select to add:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {aiImages.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => addElement('image', { url: img.url })}
                        className="relative h-20 bg-slate-100 rounded-xl overflow-hidden cursor-pointer hover:shadow hover:scale-102 transition-all"
                      >
                        <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 hover:opacity-100 flex items-center justify-center">
                          <span className="text-[9px] text-white font-bold">Add</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. AI Text Copilot */}
            <div className="space-y-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl">
              <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen className="w-4 h-4" />
                <span>AI Text Assistant</span>
              </h4>
              <div className="space-y-2.5">
                <textarea
                  rows={3}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste article text here..."
                  className="w-full border border-slate-200/60 bg-white rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                />
                
                <div className="flex space-x-2">
                  <button
                    disabled={analyzingText}
                    onClick={() => triggerTextAI('summarize')}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                  >
                    Summarize
                  </button>
                  <button
                    disabled={analyzingText}
                    onClick={() => triggerTextAI('grammar')}
                    className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] rounded-lg transition-colors"
                  >
                    Check Grammar
                  </button>
                </div>
              </div>

              {analyzingText && (
                <div className="flex items-center justify-center py-4 space-x-2">
                  <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-400">AI working...</span>
                </div>
              )}

              {/* Text Copilot result box */}
              {aiResultText && (
                <div className="mt-3 p-3 bg-white border border-purple-100 rounded-xl space-y-2 text-left">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Result:</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-medium">{aiResultText}</p>
                  
                  {grammarIssues.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      {grammarIssues.map((issue, index) => (
                        <div key={index} className="flex space-x-1.5 text-[9px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Avoid "{issue.error}": </span>
                            <span>Try "{issue.suggestion}" - {issue.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => addElement('text', { text: aiResultText, fontSize: 12 })}
                    className="px-2 py-1 bg-purple-100 text-purple-700 font-bold text-[9px] rounded hover:bg-purple-200 transition-colors block mt-2"
                  >
                    Insert Result text
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default SidebarTools;
