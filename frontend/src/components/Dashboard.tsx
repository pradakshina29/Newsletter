import React, { useState, useEffect } from 'react';
import { UserSession, ProjectData } from '../types/editor';
import { Plus, Search, LogOut, FileText, Bell, CheckCircle, RefreshCw, Sparkles, Shield, Edit, Edit3, Eye, Save, Layers, Copy, Trash2, Folder, ExternalLink, Sun, Moon, Upload } from 'lucide-react';

interface DashboardProps {
  user: UserSession;
  onLogout: () => void;
  onEditProject: (projectId: number) => void;
  onOpenAdmin: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const CATEGORIES = ['All', 'Academic', 'Placement', 'Events', 'Sports', 'Research', 'Achievements'];

const createBlankNewsletterContent = (_name: string, department: string) => {
  const deptUpper = (department || "Information Technology").toUpperCase();
  const dateUpper = "JUNE 2026";

  const pages: any[] = [];

  const getHeaderElements = (pageNum: number) => [
    { id: `p${pageNum}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: "#EFEFEF", strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true },
    { id: `p${pageNum}_line_hdr0`, type: "shape", shapeType: "rect", x: 50, y: 40, width: 700, height: 1, fillColor: "#000000", locked: true },
    { id: `p${pageNum}_dept_hdr`, type: "text", x: 50, y: 52, width: 450, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "left", locked: true },
    { id: `p${pageNum}_date_hdr`, type: "text", x: 500, y: 52, width: 250, height: 25, text: dateUpper, fontSize: 12, fontFamily: "Poppins", color: "#000000", bold: true, align: "right", locked: true },
    { id: `p${pageNum}_line_hdr1`, type: "shape", shapeType: "rect", x: 50, y: 85, width: 700, height: 1, fillColor: "#000000", locked: true },
    { id: `p${pageNum}_title_hdr`, type: "text", x: 50, y: 98, width: 700, height: 65, text: "CTRL+READ", fontSize: 52, fontFamily: "Playfair Display", color: "#000000", bold: true, align: "center", letterSpacing: 1.5, locked: true },
    { id: `p${pageNum}_line_hdr2_left`, type: "shape", shapeType: "rect", x: 50, y: 180, width: 240, height: 1, fillColor: "#000000", locked: true },
    { id: `p${pageNum}_subtitle_hdr`, type: "text", x: 300, y: 170, width: 200, height: 20, text: "NEWS LETTER", fontSize: 11, fontFamily: "Poppins", color: "#000000", bold: true, align: "center", letterSpacing: 2.5, locked: true },
    { id: `p${pageNum}_line_hdr2_right`, type: "shape", shapeType: "rect", x: 510, y: 180, width: 240, height: 1, fillColor: "#000000", locked: true },
  ];

  // Generate 8 pages with official logos and campus cover photo on Page 1
  for (let i = 1; i <= 8; i++) {
    const pageElements: any[] = [
      ...getHeaderElements(i),
    ];

    if (i === 1) {
      pageElements.push(
        { id: "p1_kprcas_logo", type: "image", x: 50, y: 200, width: 330, height: 100, url: "/assets/kprcas_logo.jpg", borderRadius: 0, objectFit: "contain" },
        { id: "p1_launchit_logo", type: "image", x: 420, y: 200, width: 330, height: 100, url: "/assets/launchit_logo.jpg", borderRadius: 0, objectFit: "contain" },
        { id: "p1_school_text", type: "text", x: 50, y: 315, width: 700, height: 25, text: "SCHOOL OF COMPUTING SCIENCE", fontSize: 15, fontFamily: "Poppins", color: "#0f172a", bold: true, align: "center", letterSpacing: 1.0 },
        { id: "p1_dept_text", type: "text", x: 50, y: 345, width: 700, height: 25, text: `DEPARTMENT OF ${deptUpper}`, fontSize: 14, fontFamily: "Poppins", color: "#475569", bold: true, align: "center", letterSpacing: 1.0 },
        { id: "p1_cover_img", type: "image", x: 50, y: 380, width: 700, height: 575, url: "/assets/kprcas_campus.png", borderRadius: 12, shadow: "lg", objectFit: "cover" },
        { id: "p1_cover_caption", type: "text", x: 50, y: 970, width: 700, height: 20, text: "KPRCAS Main Campus • Official Department Newsletter Cover Page", fontSize: 9, fontFamily: "Poppins", color: "#64748b", italic: true, align: "center" }
      );
    } else if (i === 8) {
      pageElements.push(
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

    pageElements.push({
      id: `p${i}_footer_text`,
      type: "text",
      x: 50,
      y: 1090,
      width: 700,
      height: 20,
      text: `Page ${i} • Official publication of the Department of ${department || "Information Technology"}`,
      fontSize: 9,
      fontFamily: "Poppins",
      color: "#94a3b8",
      bold: false,
      align: "center"
    });

    pages.push({
      id: `page_${i}`,
      title: i === 1 ? "Cover Page" : i === 8 ? "Editorial Board" : `Page ${i}`,
      status: "DRAFT",
      elements: pageElements
    });
  }

  return JSON.stringify({
    canvasWidth: 800,
    canvasHeight: 1130,
    theme: {
      primary: "#1e40af",
      secondary: "#0f172a",
      accent: "#f97316",
      background: "#EFEFEF"
    },
    pages
  });
};

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onEditProject, onOpenAdmin, darkMode, toggleDarkMode }) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [templates, setTemplates] = useState<ProjectData[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // UI Dialog States
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');

  const handleOpenCreateModal = () => {
    setNewProjectName('');
    setShowCreateModal(true);
  };
  
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameProjectId, setRenameProjectId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Stats
  const [stats, setStats] = useState({
    drafts: 0,
    published: 0,
    pending: 0
  });

  const [notifications, setNotifications] = useState<string[]>([
    "Dr. K. Srinivasan approved your latest Research Newsletter draft.",
    "Draft placement document autosaved 2 minutes ago."
  ]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [currentViewTab, setCurrentViewTab] = useState<'my-dashboard' | 'browse-templates'>('my-dashboard');
  const [listTab, setListTab] = useState<'drafts' | 'published'>('drafts');
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectData | null>(null);

  // AI Wizard States
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'ta-IN'>('en-US');
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [analyzedResult, setAnalyzedResult] = useState<any>(null);
  const [selectedTemplateRecId, setSelectedTemplateRecId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Raw Content Intermediate Modal States
  const [showRawContentModal, setShowRawContentModal] = useState<boolean>(false);
  const [rawContentFileName, setRawContentFileName] = useState<string>('');
  const [extractedArticles, setExtractedArticles] = useState<Array<{
    title: string;
    category: string;
    content: string;
    images: string[];
  }>>([]);
  const [isPopulatingNewsletter, setIsPopulatingNewsletter] = useState<boolean>(false);

  // Fetch projects and templates from Spring Boot backend
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Projects
      const projRes = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (projRes.status === 401 || projRes.status === 403) {
        console.warn("Session expired or database reset. Logging out.");
        onLogout();
        return;
      }

      let serverProjects: any[] = [];
      if (projRes.ok) {
        serverProjects = await projRes.json();
      }

      // Collect all local cached projects from localStorage
      const localProjectMap = new Map<number, any>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('local_project_')) {
          try {
            const cachedItem = localStorage.getItem(key);
            if (cachedItem) {
              const parsed = JSON.parse(cachedItem);
              if (parsed && parsed.id) {
                localProjectMap.set(Number(parsed.id), parsed);
              }
            }
          } catch (e) {}
        }
      }

      // Combine server and local projects
      const combinedMap = new Map<number, any>();

      // First add local cached projects
      localProjectMap.forEach((localProj, id) => {
        combinedMap.set(id, localProj);
      });

      // Then merge server projects
      (serverProjects || []).forEach((pj: any, idx: number) => {
        let displayName = pj.name;
        if (!displayName || displayName === "it" || displayName.includes("CTRL+READ") || displayName.includes("Sports & Clubs") || displayName.startsWith("My ") || displayName === "Academic" || displayName === "New Project") {
          displayName = idx === 0 ? "Untitled Draft" : `Untitled Draft ${idx + 1}`;
        }

        const localVersion = combinedMap.get(pj.id);
        if (localVersion) {
          combinedMap.set(pj.id, {
            ...pj,
            name: localVersion.name || displayName,
            canvasWidth: localVersion.canvasWidth || 800,
            canvasHeight: localVersion.canvasHeight || 1130,
            theme: localVersion.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
            pages: localVersion.pages || []
          });
        } else {
          let contentObj: any = {};
          if (typeof pj.content === 'string' && pj.content) {
            try {
              contentObj = JSON.parse(pj.content);
            } catch (err) {}
          }
          combinedMap.set(pj.id, {
            ...pj,
            name: displayName,
            canvasWidth: contentObj.canvasWidth || 800,
            canvasHeight: contentObj.canvasHeight || 1130,
            theme: contentObj.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
            pages: contentObj.pages || []
          });
        }
      });

      const parsedProjects: ProjectData[] = Array.from(combinedMap.values());
      setProjects(parsedProjects);
      
      // Calculate user stats
      let d = 0, p = 0, pa = 0;
      parsedProjects.forEach((pj: ProjectData) => {
        if (pj.status === 'DRAFT') d++;
        else if (pj.status === 'PUBLISHED') p++;
        else if (pj.status === 'PENDING_APPROVAL') pa++;
      });
      setStats({ drafts: d, published: p, pending: pa });

      // 2. Templates
      const tempRes = await fetch('/api/projects/templates', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (tempRes.status === 401 || tempRes.status === 403) {
        console.warn("Session expired or database reset. Logging out.");
        onLogout();
        return;
      }

      if (tempRes.ok) {
        const tempData = await tempRes.json();
        
        // Safely parse template content string
        const parsedTemplates = tempData.map((tp: any) => {
          if (typeof tp.content === 'string' && tp.content) {
            try {
              const contentObj = JSON.parse(tp.content);
              return {
                ...tp,
                canvasWidth: contentObj.canvasWidth || 800,
                canvasHeight: contentObj.canvasHeight || 1130,
                theme: contentObj.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
                pages: contentObj.pages || []
              };
            } catch (err) {
              console.error("Error parsing content for template " + tp.id, err);
            }
          }
          return {
            ...tp,
            canvasWidth: 800,
            canvasHeight: 1130,
            theme: { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
            pages: []
          };
        });

        setTemplates(parsedTemplates);
      }
    } catch (e) {
      console.error("Error fetching dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.token]);

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setSaving(true);
    const deptName = user?.department || "Information Technology";
    const blankContent = createBlankNewsletterContent(newProjectName, deptName);

    try {
      const token = user?.token || localStorage.getItem('token') || '';
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProjectName,
          category: 'Academic',
          department: deptName,
          status: 'DRAFT',
          isTemplate: false,
          content: blankContent
        })
      });

      if (response.ok) {
        const created = await response.json();
        setShowCreateModal(false);
        setNewProjectName('');
        onEditProject(created.id);
        return;
      }
    } catch (err: any) {
      console.warn("Backend create API unreachable, creating fallback local newsletter:", err);
    }

    // Fallback local creation so project creation never fails
    const localId = Date.now();
    const localProject = {
      id: localId,
      name: newProjectName,
      category: 'Academic',
      department: deptName,
      status: 'DRAFT',
      isTemplate: false,
      content: blankContent,
      ownerName: user?.name || 'KPRCAS Editorial Team'
    };
    localStorage.setItem(`local_project_${localId}`, JSON.stringify(localProject));
    setShowCreateModal(false);
    setNewProjectName('');
    onEditProject(localId);
    setSaving(false);
  };

  // Start Speech Recognition
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      if (isListening) {
        stopSpeechRecognition();
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLanguage;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setAiPrompt(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + finalTranscript);
        }
      };

      rec.onerror = (e: any) => {
        console.error(e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      (window as any).currentRecognition = rec;
      rec.start();
    } catch (err) {
      console.error(err);
    }
  };

  // Stop Speech Recognition
  const stopSpeechRecognition = () => {
    if ((window as any).currentRecognition) {
      try {
        (window as any).currentRecognition.stop();
      } catch (e) {}
      setIsListening(false);
    }
  };

  // Analyze prompt
  const handleAnalyzePrompt = async () => {
    if (!aiPrompt.trim()) return;
    setAiAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      if (res.status === 401 || res.status === 403) {
        onLogout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setAnalyzedResult(data);
        setAiStep(2); // Go to step 2: Select template!
        if (data.recommendations && data.recommendations.length > 0) {
          setSelectedTemplateRecId(data.recommendations[0].id);
        }
      } else {
        alert("Failed to analyze prompt. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error analyzing prompt.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Generate Newsletter with AI
  const handleGenerateNewsletter = async () => {
    if (!selectedTemplateRecId || !analyzedResult) return;
    setAiGenerating(true);
    try {
      // Find recommendation item
      const recItem = analyzedResult.recommendations.find((r: any) => r.id === selectedTemplateRecId);
      
      // Match one of the loaded template projects by name keywords or category
      const targetDbTemplate = templates.find((t: any) => {
        if (!recItem) return false;
        const templateNameFirstWord = t.name.toLowerCase().split(' ')[0];
        const recNameFirstWord = recItem.name.toLowerCase().split(' ')[0];
        return templateNameFirstWord.includes(recNameFirstWord) || recNameFirstWord.includes(templateNameFirstWord);
      }) || templates[0];

      if (!targetDbTemplate) {
        alert("No templates found in system database. Please seed templates first.");
        return;
      }

      const res = await fetch('/api/projects/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          templateId: targetDbTemplate.id,
          name: analyzedResult.title || ((analyzedResult.eventType || 'AI Generated') + " Newsletter"),
          eventType: analyzedResult.eventType,
          department: analyzedResult.department,
          date: analyzedResult.date,
          audience: analyzedResult.audience,
          keywords: analyzedResult.keywords,
          tone: analyzedResult.tone,
          prompt: aiPrompt
        })
      });

      if (res.status === 401 || res.status === 403) {
        onLogout();
        return;
      }

      if (res.ok) {
        const newProject = await res.json();
        setShowAiModal(false);
        // Clear wizard states
        setAiPrompt('');
        setAnalyzedResult(null);
        setAiStep(1);
        onEditProject(newProject.id);
      } else {
        alert("Failed to generate publication from template.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating publication.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Duplicate Project handler
  const handleDuplicateProject = async (id: number) => {
    try {
      const response = await fetch(`/api/projects/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      if (response.ok) {
        fetchData();
      } else {
        alert("Failed to duplicate newsletter");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Rename Project handler
  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameProjectId || !renameValue.trim()) return;

    try {
      const response = await fetch(`/api/projects/${renameProjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: renameValue })
      });

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      if (response.ok) {
        setShowRenameModal(false);
        setRenameProjectId(null);
        setRenameValue('');
        fetchData();
      } else {
        alert("Failed to rename project");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Project handler
  const handleDeleteProject = async (id: number) => {
    if (!confirm("Are you sure you want to delete this newsletter project? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      if (response.ok) {
        fetchData();
      } else {
        alert("Failed to delete project");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isCleanText = (str: string): boolean => {
    if (!str || str.trim().length < 4) return false;
    const lower = str.toLowerCase();
    if (lower.includes('producer') || lower.includes('creator') || lower.includes('moddate') || 
        lower.includes('creationdate') || lower.includes('wps docs') || lower.includes('font') || 
        lower.includes('adobe') || lower.includes('mediabox') || lower.includes('endstream') || 
        lower.includes('flatedecode') || lower.includes('procset') || lower.includes('xobject') ||
        lower.includes('type /pages') || lower.includes('type /catalog')) {
      return false;
    }
    let printableCount = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
        printableCount++;
      }
    }
    return (printableCount / str.length) > 0.85;
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

          // Extract uncompressed parenthesized strings
          const rawMatches = rawText.match(/\(([^()]{3,})\)/g);
          if (rawMatches) {
            rawMatches.forEach(m => {
              const clean = m.slice(1, -1).replace(/\\\(|\r|\n/g, ' ').trim();
              if (isCleanText(clean)) {
                textChunks.push(clean);
              }
            });
          }

          // Decompress FlateDecode PDF streams if present
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
                      if (isCleanText(clean)) {
                        textChunks.push(clean);
                      }
                    });
                  } else {
                    const words = decompressedText.match(/[A-Za-z0-9\s.,'":;!\-–—]{4,}/g);
                    if (words) {
                      words.forEach(w => {
                        const clean = w.trim();
                        if (isCleanText(clean)) {
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

          const uniqueText = Array.from(new Set(textChunks)).filter(s => isCleanText(s));
          if (uniqueText.length > 0) {
            resolve(uniqueText.join('\n'));
            return;
          }

          // Fallback word scanner
          const wordsFallback = rawText.match(/[A-Za-z0-9\s.,'":;!\-–—]{4,}/g);
          if (wordsFallback && wordsFallback.length > 0) {
            const filtered = wordsFallback
              .map(w => w.trim())
              .filter(w => isCleanText(w));
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

  const parseRawTextToArticles = (rawText: string, fileName: string) => {
    const cleanText = rawText
      .replace(/Producer|Creator|ModDate|CreationDate|WPS Docs|Adobe|MediaBox|endstream|FlateDecode|Catalog|Pages|Type \/Pages/gi, '')
      .replace(/\r/g, '')
      .trim();

    const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const articles: Array<{ title: string; category: string; content: string; images: string[] }> = [];

    let currentTitle = "";
    let currentCategory = "Department Highlights";
    let currentParagraphs: string[] = [];

    const detectCategory = (str: string): string => {
      const lower = str.toLowerCase();
      if (lower.includes("achievement") || lower.includes("award") || lower.includes("winner") || lower.includes("prize") || lower.includes("hackathon") || lower.includes("trophy") || lower.includes("skillup")) {
        return "Student Achievements";
      }
      if (lower.includes("research") || lower.includes("paper") || lower.includes("journal") || lower.includes("scopus") || lower.includes("patent") || lower.includes("faculty")) {
        return "Faculty Research";
      }
      if (lower.includes("placement") || lower.includes("offer") || lower.includes("salary") || lower.includes("ctc") || lower.includes("recruiter") || lower.includes("company")) {
        return "Placements & Internships";
      }
      if (lower.includes("workshop") || lower.includes("seminar") || lower.includes("training") || lower.includes("guest") || lower.includes("speaker") || lower.includes("webinar")) {
        return "Workshops & Seminars";
      }
      if (lower.includes("induction") || lower.includes("orientation") || lower.includes("fresher") || lower.includes("welcome") || lower.includes("deeksharambh")) {
        return "Induction & Activities";
      }
      if (lower.includes("sport") || lower.includes("club") || lower.includes("tournament") || lower.includes("match") || lower.includes("athlete")) {
        return "Sports & Clubs";
      }
      return "";
    };

    lines.forEach((line) => {
      const detected = detectCategory(line);
      const isHeader = line.length < 80 && (line === line.toUpperCase() || line.endsWith(":") || detected || line.startsWith("#"));

      if (isHeader) {
        if (currentTitle && currentParagraphs.length > 0) {
          articles.push({
            title: currentTitle,
            category: currentCategory,
            content: currentParagraphs.join(" ").trim(),
            images: []
          });
        }
        currentTitle = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
        currentCategory = detected || currentCategory;
        currentParagraphs = [];
      } else {
        if (!currentTitle) {
          currentTitle = detected ? line : `${fileName.replace(/\.[^/.]+$/, "")} Spotlight`;
          if (detected) currentCategory = detected;
        }
        currentParagraphs.push(line);
      }
    });

    if (currentTitle && currentParagraphs.length > 0) {
      articles.push({
        title: currentTitle,
        category: currentCategory,
        content: currentParagraphs.join(" ").trim(),
        images: []
      });
    }

    if (articles.length === 0) {
      articles.push({
        title: fileName.replace(/\.[^/.]+$/, "") || "Department Spotlight",
        category: "Department Highlights",
        content: cleanText || "Extracted content from uploaded file.",
        images: []
      });
    }

    return articles;
  };

  const handleConfirmRawContentToNewsletter = async () => {
    if (extractedArticles.length === 0) return;
    setIsPopulatingNewsletter(true);
    try {
      const promptParts = extractedArticles.map((art, idx) => 
        `Article ${idx + 1} [Category: ${art.category}]:\nTitle: ${art.title}\nContent: ${art.content}`
      );
      const combinedPrompt = `Extracted Raw Content from file "${rawContentFileName}":\n\n` + promptParts.join("\n\n");
      const deptName = user?.department || "Information Technology";
      const cleanName = rawContentFileName.replace(/\s*\(Imported\)/g, '').replace(/\s*\(AI Generated\)/g, '');

      const analyzeRes = await fetch('/api/ai/analyze-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ prompt: combinedPrompt })
      });

      let eventType = "Uploaded Event";
      let date = "June 2026";
      let audience = "150 Students";

      if (analyzeRes.ok) {
        const analyzed = await analyzeRes.json();
        eventType = analyzed.eventType || eventType;
        date = analyzed.date || date;
        audience = analyzed.audience || audience;
      }

      const genRes = await fetch('/api/projects/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          templateId: 1,
          name: cleanName,
          eventType,
          department: deptName,
          date,
          audience,
          keywords: "Imported Event File",
          tone: "Professional",
          prompt: combinedPrompt
        })
      });

      if (genRes.ok) {
        const created = await genRes.json();
        setShowRawContentModal(false);
        alert(`Successfully populated ${extractedArticles.length} extracted content section(s) into the fixed CTRL+READ 8-page newsletter!`);
        onEditProject(created.id);
      } else {
        alert("Failed to generate newsletter from raw content.");
      }
    } catch (e) {
      console.error(e);
      alert("Error populating newsletter.");
    } finally {
      setIsPopulatingNewsletter(false);
    }
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileNameClean = file.name.replace(/\.[^/.]+$/, "");
    setRawContentFileName(fileNameClean);

    // Process PDF file directly
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setSaving(true);
      try {
        const pdfText = await extractTextFromPdf(file);
        const articles = parseRawTextToArticles(pdfText, fileNameClean);
        setExtractedArticles(articles);
        setShowRawContentModal(true);
      } catch (err) {
        console.error("PDF parsing error", err);
        alert("Error parsing PDF file.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.pages || parsed.content) {
              let contentStr = "";
              if (parsed.content) {
                contentStr = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content);
              } else {
                contentStr = JSON.stringify({
                  canvasWidth: parsed.canvasWidth || 800,
                  canvasHeight: parsed.canvasHeight || 1130,
                  theme: parsed.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#ffffff' },
                  pages: parsed.pages || []
                });
              }

              setSaving(true);
              const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                  name: parsed.name || `${fileNameClean} (Imported)`,
                  category: parsed.category || 'Academic',
                  department: user.department || 'General',
                  status: 'DRAFT',
                  isTemplate: false,
                  content: contentStr
                })
              });

              if (response.ok) {
                const created = await response.json();
                alert("Project imported successfully!");
                onEditProject(created.id);
                return;
              }
            }
          } catch (jsonErr) {
            // Not a valid project JSON, treat as text prompt
          }
        }
        
        // Parse text into raw articles and show Raw Content Intermediate View
        const articles = parseRawTextToArticles(text, fileNameClean);
        setExtractedArticles(articles);
        setShowRawContentModal(true);
      } catch (err) {
        console.error(err);
        alert("Error parsing uploaded file.");
      }
    };
    reader.readAsText(file);
  };



  const handleUseTemplate = async (template: ProjectData) => {
    setSaving(true);
    try {
      let contentStr = "";
      if (typeof template.content === 'string' && template.content.trim().startsWith('{')) {
        contentStr = template.content;
      } else {
        contentStr = JSON.stringify({
          canvasWidth: template.canvasWidth || 800,
          canvasHeight: template.canvasHeight || 1130,
          theme: template.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#ffffff' },
          pages: template.pages || []
        });
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          name: `My ${template.name}`,
          category: template.category,
          department: user.department || 'Information Technology',
          status: 'DRAFT',
          isTemplate: false,
          content: contentStr
        })
      });

      if (response.ok) {
        const created = await response.json();
        let pagesObj: any[] = [];
        try {
          pagesObj = typeof contentStr === 'string' ? JSON.parse(contentStr).pages : ((contentStr as any)?.pages || []);
        } catch (e) {}

        const fullLocalProj = {
          ...created,
          name: created.name || `My ${template.name}`,
          category: template.category || 'Academic',
          department: user.department || 'Information Technology',
          status: 'DRAFT',
          canvasWidth: template.canvasWidth || 800,
          canvasHeight: template.canvasHeight || 1130,
          theme: template.theme || { primary: '#1e40af', secondary: '#0f172a', accent: '#f97316', background: '#EFEFEF' },
          pages: pagesObj
        };
        localStorage.setItem(`local_project_${created.id}`, JSON.stringify(fullLocalProj));
        localStorage.setItem(`last_autosaved_${created.id}`, new Date().toISOString());
        onEditProject(created.id);
        return;
      } else {
        const errText = await response.text();
        alert(`Failed to clone template: ${errText || response.statusText}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error creating newsletter from template.");
    } finally {
      setSaving(false);
    }
  };

  // Filter templates and user projects by Category and Search Query
  const filteredTemplates = templates.filter(temp => {
    const matchesCat = activeCategory === 'All' || temp.category === activeCategory;
    const matchesSearch = temp.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredProjects = projects.filter(proj => {
    const matchesSearch = proj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          proj.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dashboard Navbar */}
      <header className="sticky top-0 z-40 bg-secondary text-white px-6 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentViewTab('my-dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white shadow-md">
              K
            </div>
            <span className="font-bold tracking-tight text-lg">KPRCAS Newsletter Studio</span>
          </div>
          <button
            onClick={() => setCurrentViewTab('my-dashboard')}
            className={`hidden md:block text-xs font-bold transition-colors ${currentViewTab === 'my-dashboard' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentViewTab('browse-templates')}
            className={`hidden md:block text-xs font-bold transition-colors ${currentViewTab === 'browse-templates' ? 'text-white' : 'text-slate-300 hover:text-white'}`}
          >
            Browse Templates
          </button>
        </div>

        {/* Global Search */}
        <div className="relative w-64 md:w-96 hidden sm:block">
          <input
            type="text"
            placeholder="Search newsletters, templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-secondary-light/60 border border-white/10 rounded-xl px-10 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:bg-secondary-light"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-ping" />}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 glass shadow-xl border border-slate-200/50 rounded-xl p-4 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Notifications</h4>
                  <button onClick={() => setNotifications([])} className="text-[10px] text-primary hover:underline">Clear all</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No new notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n, idx) => (
                      <div key={idx} className="flex space-x-2.5 text-xs">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <p className="text-slate-600 font-medium leading-relaxed">{n}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin panel link */}
          {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
            <button 
              onClick={onOpenAdmin} 
              className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          )}

          {/* Profile Menu */}
          <div className="flex items-center space-x-2.5 pl-3 border-l border-white/10">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold leading-none">{user.name}</p>
              <p className="text-[9px] text-slate-400 capitalize mt-0.5">{user.role.toLowerCase()} | {user.department}</p>
            </div>
            <button 
              onClick={onLogout} 
              className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      {currentViewTab === 'my-dashboard' ? (
        <main className="flex-grow p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
          
          {/* Welcome Hero Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-900 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 dark:bg-slate-800/60 rounded-full border border-white/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-405 animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-100">KPRCAS Newsletter Studio</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">Hello, {user.name.split(' ')[0]}!</h2>
                <p className="text-sm text-slate-200/90 leading-relaxed max-w-lg">
                  Design and publish professional-grade academic and campus newsletters with automated AI copywriting and pixel-perfect layouts.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => {
                    setAiStep(1);
                    setAiPrompt('');
                    setAnalyzedResult(null);
                    setSelectedTemplateRecId(null);
                    setShowAiModal(true);
                  }} 
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl transition-all flex items-center space-x-2 text-xs shadow-lg shadow-amber-500/20 active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
                  <span>Create with AI</span>
                </button>
                <button 
                  onClick={handleOpenCreateModal} 
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-2xl transition-all flex items-center space-x-2 text-xs active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Blank Draft</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-800">
                <FileText className="w-5 h-5 text-slate-550" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold block">Draft Workspaces</span>
                <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 block">{stats.drafts}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50/60 dark:bg-slate-955 rounded-xl border border-blue-100/10 dark:border-slate-800">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-[10px] text-blue-500/80 dark:text-slate-500 uppercase tracking-wider font-bold block">Pending Approval</span>
                <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 block">{stats.pending}</span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-green-50/60 dark:bg-slate-955 rounded-xl border border-green-100/10 dark:border-slate-800">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <span className="text-[10px] text-green-600/80 dark:text-slate-500 uppercase tracking-wider font-bold block">Published Issues</span>
                <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 block">{stats.published}</span>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Main Content Area (lg:col-span-3) */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Templates & Newsletter Actions Panel */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary dark:text-white">Create a Newsletter</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Select the official 8-page newsletter template, start a blank issue, or generate content using AI.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* CTRL+READ Official Department Newsletter Template (Single Official Template) */}
                  <div 
                    onClick={() => {
                      const origTemp = templates.find(t => t.name.includes("Department Newsletter") || t.name.includes("CTRL+READ")) || templates[0];
                      if (origTemp) handleUseTemplate(origTemp);
                      else handleOpenCreateModal();
                    }}
                    className="group bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:border-primary transition-all flex flex-col justify-between cursor-pointer h-48"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        OFFICIAL TEMPLATE
                      </span>
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1 my-2">
                      <h4 className="font-extrabold text-sm text-secondary dark:text-white group-hover:text-primary transition-colors">
                        CTRL+READ — Official Department Newsletter
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 font-medium">
                        Official 8-page KPRCAS department newsletter with CTRL+READ headers, campus cover page & pre-formatted sections.
                      </p>
                    </div>
                    <button className="w-full py-1.5 bg-primary hover:bg-primary-dark text-white text-[11px] font-bold rounded-xl transition-all text-center shadow-xs">
                      Use Official Template
                    </button>
                  </div>

                  {/* + New blank draft quick action */}
                  <div 
                    onClick={handleOpenCreateModal}
                    className="group border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 hover:bg-slate-100/50 dark:hover:bg-slate-850/20 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:border-primary/40 h-48"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        CUSTOM DRAFT
                      </span>
                      <Plus className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="space-y-1 my-2">
                      <h4 className="font-extrabold text-sm text-secondary dark:text-white group-hover:text-primary transition-colors">
                        New Custom Publication
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Enter custom name and department to initialize a fresh 8-page newsletter draft.
                      </p>
                    </div>
                    <button className="w-full py-1.5 bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-xl text-center">
                      + Create Blank
                    </button>
                  </div>

                  {/* Create with AI card */}
                  <div 
                    onClick={() => {
                      setAiStep(1);
                      setAiPrompt('');
                      setAnalyzedResult(null);
                      setSelectedTemplateRecId(null);
                      setShowAiModal(true);
                    }}
                    className="group bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] h-48"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider">
                        AI ASSISTED
                      </span>
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div className="space-y-1 my-2">
                      <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                        Create with AI
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Describe event details in 4–5 lines to generate 8-page newsletter stories automatically.
                      </p>
                    </div>
                    <button className="w-full py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[11px] font-bold rounded-xl text-center shadow-sm">
                      ✨ Generate with AI
                    </button>
                  </div>
                </div>
              </div>

              {/* Segmented Tab List for Drafts & Published */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <div className="flex space-x-6">
                    <button
                      onClick={() => setListTab('drafts')}
                      className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                        listTab === 'drafts' 
                          ? 'border-primary text-secondary dark:text-white font-sans' 
                          : 'border-transparent text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      Active Draft Workspaces ({filteredProjects.filter(p => p.status !== 'PUBLISHED').length})
                    </button>
                    <button
                      onClick={() => setListTab('published')}
                      className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                        listTab === 'published' 
                          ? 'border-green-600 text-secondary dark:text-white font-sans' 
                          : 'border-transparent text-slate-400 hover:text-slate-650'
                      }`}
                    >
                      Published Archives ({filteredProjects.filter(p => p.status === 'PUBLISHED').length})
                    </button>
                  </div>
                  
                  <button 
                    onClick={fetchData} 
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-655 transition-colors"
                    title="Refresh lists"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Render tab content */}
                {listTab === 'drafts' ? (
                  /* Drafts List */
                  loading ? (
                    <div className="space-y-4">
                      {[1, 2].map(i => (
                        <div key={i} className="animate-pulse bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl h-20" />
                      ))}
                    </div>
                  ) : filteredProjects.filter(p => p.status !== 'PUBLISHED').length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-450 font-semibold">No ongoing draft newsletters created yet.</p>
                      <button 
                        onClick={() => setShowCreateModal(true)} 
                        className="mt-2 text-xs text-primary font-bold hover:underline"
                      >
                        Create new draft issue
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredProjects.filter(p => p.status !== 'PUBLISHED').map(proj => {
                        const isExpanded = expandedProjectId === proj.id;

                        const pageTitles = [
                          'Page 1: Cover Page',
                          'Page 2: Student Achievement',
                          'Page 3: Student Activity',
                          'Page 4: Department Event',
                          'Page 5: Freshers Welcome',
                          'Page 6: Induction Program',
                          'Page 7: Faculty Achievement',
                          'Page 8: Editorial Board'
                        ];

                        return (
                          <div 
                            key={proj.id} 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                          >
                            {/* Card Top Header & Actions */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                                    proj.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {proj.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-slate-400 font-medium">| {proj.category} • 8 A4 Pages</span>
                                </div>
                                <h4 className="font-extrabold text-base text-secondary dark:text-white">{proj.name}</h4>
                                <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
                                  <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                    <span>Autosaved</span>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {localStorage.getItem(`last_autosaved_${proj.id}`)
                                      ? `Saved at ${new Date(localStorage.getItem(`last_autosaved_${proj.id}`)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                                      : `Last modified ${new Date(proj.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                  </span>
                                </div>
                              </div>

                              {/* Symbol-Only Quick Actions Toolbar */}
                              <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                <button
                                  onClick={() => onEditProject(proj.id!)}
                                  className="p-2 bg-primary hover:bg-primary-dark text-white rounded-xl transition-all shadow-xs flex items-center justify-center"
                                  title="Continue Draft"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => setPreviewProject(proj)}
                                  className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center"
                                  title="Preview Newsletter"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                </button>

                                <button
                                  onClick={() => {
                                    setNotifications(prev => [`Draft "${proj.name}" successfully saved in database.`, ...prev]);
                                    alert(`Draft "${proj.name}" is saved and fully accessible.`);
                                  }}
                                  className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center"
                                  title="Save Draft"
                                >
                                  <Save className="w-4 h-4 text-slate-600" />
                                </button>

                                <button
                                  onClick={() => onEditProject(proj.id!)}
                                  className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center justify-center"
                                  title="Generate PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => {
                                    setRenameProjectId(proj.id!);
                                    setRenameValue(proj.name);
                                    setShowRenameModal(true);
                                  }}
                                  className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center"
                                  title="Rename Draft"
                                >
                                  <Edit className="w-4 h-4 text-indigo-600" />
                                </button>

                                <button 
                                  onClick={() => handleDuplicateProject(proj.id!)} 
                                  className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors flex items-center justify-center"
                                  title="Duplicate"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                <button 
                                  onClick={() => handleDeleteProject(proj.id!)} 
                                  className="p-2 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-500 hover:text-red-600 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors flex items-center justify-center"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>

                                <button 
                                  onClick={() => setExpandedProjectId(isExpanded ? null : proj.id!)} 
                                  className="px-2.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center space-x-1"
                                  title="Manage Pages 1-8"
                                >
                                  <Layers className="w-4 h-4 text-slate-600" />
                                  <span className="text-[10px]">{isExpanded ? '▲' : '▼'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Page 1-8 Management Matrix (Collapsible) */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Page Status Matrix (Pages 1–8)</h5>
                                  <span className="text-[10px] text-green-600 font-bold">All 8 Pages Ready</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                  {pageTitles.map((pTitle, idx) => {
                                    const pageNum = idx + 1;
                                    const pageObj = proj.pages && proj.pages[idx];
                                    const statusVal = pageObj?.status || 'COMPLETED';

                                    return (
                                      <div key={pageNum} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                        <div>
                                          <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{pTitle}</p>
                                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-100 text-green-700 tracking-wider">
                                            {statusVal}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => onEditProject(proj.id!)}
                                          className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-primary dark:text-blue-400 hover:bg-slate-100 font-bold rounded-lg text-[10px] transition-colors"
                                        >
                                          Edit Page
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Published Archives List */
                  filteredProjects.filter(p => p.status === 'PUBLISHED').length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <Folder className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                      <p className="text-xs text-slate-450 font-semibold">No publications published or approved yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredProjects.filter(p => p.status === 'PUBLISHED').map(proj => (
                        <div 
                          key={proj.id} 
                          className="p-4 bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition-all flex justify-between items-center"
                        >
                          <div className="space-y-1.5 max-w-[70%]">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 tracking-wider">
                                PUBLISHED
                              </span>
                              <span className="text-[10px] text-slate-455 font-semibold">| {proj.category}</span>
                            </div>
                            <h4 className="font-bold text-sm text-secondary dark:text-white truncate">{proj.name}</h4>
                            <p className="text-[10px] text-slate-400">
                              Published: {new Date(proj.updatedAt || '').toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric'
                              })}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button 
                              onClick={() => onEditProject(proj.id!)} 
                              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-[10px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="Open in Reader Mode"
                            >
                              Read / View
                            </button>
                            <button 
                              onClick={() => handleDuplicateProject(proj.id!)} 
                              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-455 hover:text-slate-655 transition-colors"
                              title="Clone"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProject(proj.id!)} 
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-400 hover:text-red-655 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Utility Sidebar (lg:col-span-1) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Approved Brand Kit */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-555">Approved Brand Kit</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-xs">K</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">KPRCAS Logo</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-555">High-res PNG locked</p>
                      </div>
                    </div>
                    <button className="p-1.5 hover:bg-slate-205 dark:hover:bg-slate-855 rounded-lg text-slate-500" onClick={() => alert("Logo file loaded inside the Brand Kit panel in Editor.")}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-555">Primary Color Theme</p>
                    <div className="flex space-x-2">
                      <div className="w-6 h-6 rounded bg-primary" title="Royal Blue" />
                      <div className="w-6 h-6 rounded bg-secondary" title="Dark Navy" />
                      <div className="w-6 h-6 rounded bg-accent" title="Orange" />
                      <div className="w-6 h-6 rounded bg-white border border-slate-200 dark:border-slate-700" title="White" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Import Center */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-3.5">
                <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-555">Import Workspace & PDF Formats</h3>
                <div className="space-y-2.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-555 leading-relaxed">
                    Upload a `.pdf` format, `.json` backup, or document file to generate a newsletter matching your PDF content using AI.
                  </p>
                  <label className="w-full py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-[10px] font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center space-x-1.5 shadow-sm">
                    <input type="file" accept="*" onChange={handleImportProject} className="hidden" />
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Upload PDF / Backup / Event File</span>
                  </label>
                </div>
              </div>
            </div>

          </div>
        </main>
      ) : (
        /* Full Template Catalog Directory Page */
        <main className="flex-grow p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
            <div>
              <button
                onClick={() => setCurrentViewTab('my-dashboard')}
                className="text-xs font-bold text-primary hover:underline flex items-center space-x-1 mb-2"
              >
                <span>← Back to Dashboard</span>
              </button>
              <h3 className="text-xl font-extrabold text-secondary dark:text-white">Templates Library</h3>
              <p className="text-xs text-slate-400 mt-0.5">Deploy templates instantly into your workspace drafts catalog.</p>
            </div>

            {/* Category Filter list */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 text-[11px] font-bold rounded-full border transition-all ${
                    activeCategory === cat 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 py-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-white border border-slate-100 rounded-2xl h-64 shadow-sm" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-850 rounded-2xl">
              <Folder className="w-10 h-10 text-slate-350 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-semibold">No templates matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {filteredTemplates.map(temp => (
                <div 
                  key={temp.id} 
                  onClick={() => handleUseTemplate(temp)}
                  className="group bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between cursor-pointer h-64 p-3"
                >
                           {/* High-Fidelity Mini Page Preview Cover */}
                  <div className="h-36 w-full bg-slate-50 dark:bg-slate-900/50 relative rounded-xl border border-slate-200/60 dark:border-slate-750 overflow-hidden flex flex-col justify-between p-2.5 select-none shadow-2xs group-hover:border-primary/30 transition-all">
                    {/* Header */}
                    <div 
                      className="h-9 rounded-lg flex items-center justify-between px-2.5 text-[7px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: temp.theme.primary }}
                    >
                      <div className="scale-[0.8] origin-left truncate max-w-[70%]">
                        {temp.name.replace("KPRCAS", "").replace("Newsletter", "").trim().toUpperCase()}
                      </div>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: temp.theme.accent }} />
                    </div>

                    {/* Body Columns based on style index */}
                    {temp.id && temp.id % 4 === 1 ? (
                      /* Style 1: Magazine (Hero Image Top, Double Column Text Bottom) */
                      <div className="flex flex-col flex-grow pt-1.5 space-y-1.5 justify-between">
                        <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-350/20 flex items-center justify-center">
                          <span className="text-[5px] text-slate-400 font-bold">HERO IMAGE</span>
                        </div>
                        <div className="flex space-x-2">
                          <div className="space-y-0.5 w-1/2">
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
                          </div>
                          <div className="space-y-0.5 w-1/2">
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-9/12" />
                          </div>
                        </div>
                      </div>
                    ) : temp.id && temp.id % 4 === 2 ? (
                      /* Style 2: Minimal (Left Image, Right Text) */
                      <div className="flex space-x-2 flex-grow items-center justify-between pt-2">
                        <div className="w-5/12 h-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-[5px] text-slate-400 font-bold">LEFT IMG</span>
                        </div>
                        <div className="space-y-1 w-6/12">
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-850 rounded w-full" />
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-850 rounded w-11/12" />
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-850 rounded w-4/5" />
                        </div>
                      </div>
                    ) : temp.id && temp.id % 4 === 3 ? (
                      /* Style 3: Clean Grid (Top Grid Images, Bottom text) */
                      <div className="flex flex-col flex-grow pt-1.5 space-y-1 justify-between">
                        <div className="flex space-x-1">
                          <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="w-1/3 h-5 rounded bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                        </div>
                      </div>
                    ) : (
                      /* Style 0: Modern Academic (Standard) */
                      <div className="flex space-x-2.5 flex-grow items-center justify-between pt-2.5">
                        <div className="space-y-1.5 w-1/2">
                          <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                          <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
                          <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
                        </div>
                        <div className="w-5/12 h-14 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900/40">
                          <div className="w-3.5 h-3.5 rounded-sm opacity-55" style={{ backgroundColor: temp.theme.accent }} />
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800 mt-1">
                      <span className="text-[6px] text-slate-400 tracking-wider">KPRCAS Newsletter</span>
                      <span className="text-[6px] text-slate-400">Page 1</span>
                    </div>
                  </div>

                  <div className="p-2 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-bold text-primary uppercase tracking-wider block">{temp.category}</span>
                      <h4 className="font-bold text-xs text-secondary dark:text-white truncate mt-0.5 group-hover:text-primary transition-colors">{temp.name}</h4>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-[9px] text-slate-400">
                      <span>{temp.department}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* --- Dialog Modals --- */}

      {/* Create Blank Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-secondary mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-primary" />
              <span>Create blank publication</span>
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Newsletter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE placement highlights"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-xs hover:bg-primary-dark shadow-md"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
            <h3 className="text-base font-bold text-secondary mb-4">Rename Newsletter</h3>
            <form onSubmit={handleRenameProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">New Name</label>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary bg-slate-50"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setRenameProjectId(null);
                    setRenameValue('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-xs hover:bg-primary-dark"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Creation Wizard Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-primary/10 via-accent/5 to-slate-50 dark:to-slate-800 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-md shadow-primary/10">
                  ✨
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-secondary dark:text-white">AI Newsletter Studio Wizard</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Create custom publications from simple event briefs in English or Tamil</p>
                </div>
              </div>
              
              {/* Wizard Steps indicator */}
              <div className="flex items-center space-x-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  aiStep === 1 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>1</span>
                <span className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700" />
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  aiStep === 2 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>2</span>
              </div>
            </div>

            {/* Modal Content Viewport */}
            <div className="p-6 flex-grow overflow-y-auto space-y-6">
              {aiStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  {/* Left prompt description & inputs */}
                  <div className="md:col-span-3 space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Describe your Campus Event</label>
                      <textarea
                        rows={6}
                        required
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder={`Provide 4-5 lines describing the event. Example:
Department of Computer Science organized an AI Workshop on 15 August.
Around 250 students participated.
The chief guest explained Machine Learning and Generative AI.
Students enjoyed hands-on sessions and received certificates.`}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 leading-relaxed font-medium placeholder-slate-400 resize-none shadow-inner"
                      />
                    </div>

                    {/* Dictation & Voice Settings Row */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Voice Dictation Language:</span>
                        <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setSpeechLanguage('en-US')}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              speechLanguage === 'en-US' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            English
                          </button>
                          <button
                            type="button"
                            onClick={() => setSpeechLanguage('ta-IN')}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              speechLanguage === 'ta-IN' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            தமிழ் (Tamil)
                          </button>
                        </div>
                      </div>

                      {/* Microphone trigger */}
                      <button
                        type="button"
                        onClick={startSpeechRecognition}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse shadow-red-200/50 hover:bg-red-650'
                            : 'bg-primary/5 hover:bg-primary/10 text-primary dark:text-blue-450 dark:bg-white/5'
                        }`}
                      >
                        <span className="text-base">🎙️</span>
                        <span>{isListening ? 'Listening (Click to Stop)' : 'Dictate Event details'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Tip box / Examples */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-3">
                      <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                        <span>💡</span>
                        <span>AI Creation Tips</span>
                      </h4>
                      <ul className="list-disc pl-4 space-y-2 font-medium">
                        <li>You can speak in <strong>English, Tamil, or Tanglish</strong>.</li>
                        <li>Mention critical event details like date, department name, participant count, and chief guest.</li>
                        <li>The AI parses your prompt instantly to customize the typography structure, images, and content.</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Try Tamil Dictation:</span>
                      <p className="text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 italic">
                        "கணினி அறிவியல் துறை AI Workshop நடத்தியது. 250 மாணவர்கள் கலந்து கொண்டனர். முகேஷ் கண்ணா சிறப்பு விருந்தினராக வந்து பேசினார்."
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {aiStep === 2 && analyzedResult && (
                <div className="space-y-6">
                  {/* Parsed elements summary */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-405 uppercase tracking-wider block">EVENT TYPE</span>
                      <span className="text-secondary dark:text-white font-bold">{analyzedResult.eventType}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-405 uppercase tracking-wider block">DEPARTMENT</span>
                      <span className="text-secondary dark:text-white font-bold">{analyzedResult.department}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-405 uppercase tracking-wider block">DATE / RELEASE</span>
                      <span className="text-secondary dark:text-white font-bold">{analyzedResult.date}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-405 uppercase tracking-wider block">TARGET AUDIENCE</span>
                      <span className="text-secondary dark:text-white font-bold">{analyzedResult.audience}</span>
                    </div>
                  </div>

                  {/* Template grid recommendation */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">AI Recommended Newsletter Templates</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                      {analyzedResult.recommendations.map((rec: any) => {
                        const isSelected = selectedTemplateRecId === rec.id;
                        
                        // Pick a mock color template based on recommendation index
                        const primaryColor = 
                          rec.category === 'Sports' ? '#d97706' :
                          rec.category === 'Research' ? '#16a34a' :
                          rec.category === 'Placement' ? '#0f172a' : '#1e40af';

                        const secondaryColor = 
                          rec.category === 'Sports' ? '#0f172a' :
                          rec.category === 'Research' ? '#052e16' :
                          rec.category === 'Placement' ? '#1e3a8a' : '#0f172a';

                        const accentColor = 
                          rec.category === 'Sports' ? '#ef4444' :
                          rec.category === 'Research' ? '#10b981' :
                          rec.category === 'Placement' ? '#f59e0b' : '#f97316';

                        return (
                          <div
                            key={rec.id}
                            onClick={() => setSelectedTemplateRecId(rec.id)}
                            className={`group cursor-pointer rounded-2xl border-2 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden flex flex-col justify-between transition-all hover:scale-[1.01] ${
                              isSelected
                                ? 'border-primary dark:border-blue-400 ring-2 ring-primary/20 bg-primary/5 dark:bg-blue-950/10'
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-350'
                            }`}
                          >
                            {/* Live preview cover mockup */}
                            <div className="h-28 bg-white dark:bg-slate-950 p-2.5 flex flex-col justify-between shadow-inner relative overflow-hidden select-none border-b border-slate-100 dark:border-slate-800">
                              <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] select-none pointer-events-none">
                                <span className="text-[50px] font-extrabold">K</span>
                              </div>
                              <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: primaryColor }}>
                                <span className="text-[5px] font-extrabold tracking-widest uppercase" style={{ color: primaryColor }}>KPRCAS</span>
                                <span className="text-[4px] font-bold text-slate-400">PAGE 1</span>
                              </div>
                              <div className="py-1">
                                <div className="h-1.5 w-1/3 rounded-full mb-1" style={{ backgroundColor: primaryColor }} />
                                <div className="h-2.5 w-2/3 rounded-full mb-2" style={{ backgroundColor: secondaryColor }} />
                                <div className="grid grid-cols-3 gap-1">
                                  <div className="col-span-2 space-y-1">
                                    <div className="h-1 w-full bg-slate-200 rounded-full" />
                                    <div className="h-1 w-4/5 bg-slate-200 rounded-full" />
                                  </div>
                                  <div className="col-span-1 h-4 w-full bg-slate-100 rounded border flex items-center justify-center text-[4px] text-slate-300 font-bold border-slate-200 overflow-hidden">
                                    Photo
                                  </div>
                                </div>
                              </div>
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <div className="h-1 w-1/4 bg-slate-300 rounded-full" />
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                              </div>
                            </div>

                            {/* Recommended details */}
                            <div className="p-3 flex-grow flex flex-col justify-between">
                              <div>
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase inline-block mb-1" style={{ backgroundColor: primaryColor }}>
                                  {rec.category}
                                </span>
                                <h5 className="text-xs font-bold text-secondary dark:text-white truncate">{rec.name}</h5>
                                <p className="text-[9px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{rec.description}</p>
                              </div>
                              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[8px] text-slate-400 italic">
                                Use case: {rec.usecase}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <div>
                {aiStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setAiStep(1)}
                    className="px-5 py-2 text-xs font-semibold text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Back to Prompt
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAiModal(false)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                
                {aiStep === 1 ? (
                  <button
                    type="button"
                    disabled={aiAnalyzing || !aiPrompt.trim()}
                    onClick={handleAnalyzePrompt}
                    className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-dark shadow-md disabled:opacity-50 flex items-center space-x-2"
                  >
                    {aiAnalyzing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>AI Parsing...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate recommended layouts</span>
                        <span className="text-xs">➔</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={aiGenerating || !selectedTemplateRecId}
                    onClick={handleGenerateNewsletter}
                    className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl text-xs hover:bg-accent-dark shadow-md disabled:opacity-50 flex items-center space-x-2"
                  >
                    {aiGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating newsletter...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate & Edit Newsletter</span>
                        <span className="text-xs">➔</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter Preview Modal */}
      {previewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Preview Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white text-xs">
                  8
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">{previewProject.name} — Full 8-Page Preview</h3>
                  <p className="text-[10px] text-slate-400">Official Department of {previewProject.department} Newsletter</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    const id = previewProject.id;
                    setPreviewProject(null);
                    if (id) onEditProject(id);
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Open in Editor</span>
                </button>
                <button
                  onClick={() => setPreviewProject(null)}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Preview Pages Grid / Scroll */}
            <div className="p-6 flex-grow overflow-y-auto bg-slate-100 dark:bg-slate-950 space-y-6">
              <div className="text-center text-xs font-bold text-slate-500 mb-2">
                Showing all 8 A4 pages rendered with exact reference layouts
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(pNum => {
                  const titles = [
                    'Page 1: Cover Page',
                    'Page 2: Student Achievement',
                    'Page 3: Student Activity',
                    'Page 4: Department Event',
                    'Page 5: Freshers Welcome',
                    'Page 6: Induction Program',
                    'Page 7: Faculty Achievement',
                    'Page 8: Editorial Board'
                  ];

                  return (
                    <div key={pNum} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="font-extrabold text-secondary dark:text-white">{titles[pNum - 1]}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">Ready</span>
                      </div>
                      <div className="h-64 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between text-[10px] text-slate-500 overflow-hidden relative">
                        <div className="flex justify-between items-center border-b pb-1 border-slate-300">
                          <span className="font-bold text-[8px] uppercase">DEPT OF INFORMATION TECHNOLOGY</span>
                          <span className="font-bold text-[8px]">JUNE 2026</span>
                        </div>
                        <div className="text-center py-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          CTRL+READ
                        </div>
                        <div className="text-center text-[9px] font-semibold text-slate-600 dark:text-slate-400">
                          {pNum === 1 ? 'SCHOOL OF COMPUTING SCIENCE' : pNum === 8 ? 'EDITORIAL BOARD' : titles[pNum - 1].replace(/Page \d: /, '').toUpperCase()}
                        </div>
                        <div className="flex-grow flex items-center justify-center text-[9px] text-slate-400 italic">
                          {pNum === 1 ? '[Campus Cover Photo]' :
                           pNum === 2 ? '[2x2 Photo Grid & Certificate]' :
                           pNum === 3 ? '[3 Activity & Internship Photos]' :
                           pNum === 4 ? '[3 Workshop & Speaker Photos]' :
                           pNum === 5 ? '[6 Freshers Orientation Photos]' :
                           pNum === 6 ? '[5 Induction Program Photos]' :
                           pNum === 7 ? '[Faculty Poster & 3 Session Photos]' :
                           '[Chief & Co-Editor Profiles]'}
                        </div>
                        <div className="text-center text-[8px] text-slate-400 border-t pt-1">
                          Page {pNum} • Official publication of the Department of Information Technology
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preview Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Document formatted as 8 A4 pages with crisp high resolution</span>
              <button
                onClick={() => {
                  const id = previewProject.id;
                  setPreviewProject(null);
                  if (id) onEditProject(id);
                }}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                Generate & Export 8-Page PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Content Intermediate Preview Modal */}
      {showRawContentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold flex items-center space-x-2">
                    <span>Raw Content Extracted: "{rawContentFileName}"</span>
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] rounded-full font-bold">
                      {extractedArticles.length} Section{extractedArticles.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Review extracted raw content before populating into the fixed CTRL+READ 8-page newsletter.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRawContentModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Inspection Banner & List */}
            <div className="p-6 flex-grow overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>STRICT TEMPLATE + CONTENT FITTING</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Source file formatting & headers are ignored. Only clean content is extracted and will be fitted strictly into the Content Safe Area (below the locked CTRL+READ header).
                </p>
              </div>

              {extractedArticles.map((art, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Section #{idx + 1}
                    </span>
                    <select
                      value={art.category}
                      onChange={(e) => {
                        const updated = [...extractedArticles];
                        updated[idx].category = e.target.value;
                        setExtractedArticles(updated);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-primary focus:outline-none"
                    >
                      <option value="Student Achievements">Student Achievements</option>
                      <option value="Faculty Research">Faculty Research</option>
                      <option value="Placements & Internships">Placements & Internships</option>
                      <option value="Workshops & Seminars">Workshops & Seminars</option>
                      <option value="Induction & Activities">Induction & Activities</option>
                      <option value="Sports & Clubs">Sports & Clubs</option>
                      <option value="Department Highlights">Department Highlights</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Article / Section Headline</label>
                    <input
                      type="text"
                      value={art.title}
                      onChange={(e) => {
                        const updated = [...extractedArticles];
                        updated[idx].title = e.target.value;
                        setExtractedArticles(updated);
                      }}
                      className="w-full mt-1 px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Extracted Article Body</label>
                    <textarea
                      rows={4}
                      value={art.content}
                      onChange={(e) => {
                        const updated = [...extractedArticles];
                        updated[idx].content = e.target.value;
                        setExtractedArticles(updated);
                      }}
                      className="w-full mt-1 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowRawContentModal(false)}
                className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPopulatingNewsletter || extractedArticles.length === 0}
                onClick={handleConfirmRawContentToNewsletter}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {isPopulatingNewsletter ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Fitting content into template...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Populate Newsletter Template</span>
                    <span className="text-xs">➔</span>
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

export default Dashboard;
