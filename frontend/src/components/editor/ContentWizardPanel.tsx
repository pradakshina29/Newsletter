import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Type, BookOpen, Image as ImageIcon, ChevronDown, ChevronUp, Upload, Sparkles, Plus, Trash2, RefreshCw, Shield, FileText } from 'lucide-react';
import { detectAndFixCase } from '../../utils/textCase';


interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, onToggle, icon: Icon, children }) => {
  return (
    <div className="border-b border-slate-800/80 dark:border-slate-800">
      <button
        onClick={onToggle}
        className="w-full py-4 px-5 flex items-center justify-between text-left hover:bg-slate-900/10 dark:hover:bg-white/5 transition-all select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 pt-1 space-y-4 animate-in fade-in slide-in-from-top-1 duration-250">
          {children}
        </div>
      )}
    </div>
  );
};

const formatToParagraph = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/^[•\-\*\d+\.]\s*/gm, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[•\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const ContentWizardPanel: React.FC = () => {
  const { activeProject, activePageId, updateElement, loadProject, setActivePageId, saveProject, updatePageElements, addPage } = useEditor();
  const [openSection, setOpenSection] = useState<string>('header');
  const [subMode, setSubMode] = useState<'form' | 'generator'>('generator');

  const [photos, setPhotos] = useState<string[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  
  // AI generator results
  const [generatedArticle, setGeneratedArticle] = useState<string>("");
  const [isGeneratingArticle, setIsGeneratingArticle] = useState<boolean>(false);
  const [selectedTone, setSelectedTone] = useState<string>("encouraging");

  // Per-page dynamic form values
  const [studentForms, setStudentForms] = useState<{ [pageNum: number]: { title: string; student: string; classDept: string; award: string; host: string; details: string; keywords: string } }>({});
  const [facultyForms, setFacultyForms] = useState<{ [pageNum: number]: { faculty: string; paper: string; journal: string; date: string; contribution: string } }>({});
  const [placementForms, setPlacementForms] = useState<{ [pageNum: number]: { company: string; domain: string; count: string; package: string; highlights: string } }>({});
  const [workshopForms, setWorkshopForms] = useState<{ [pageNum: number]: { title: string; speaker: string; date: string; audience: string; topics: string; keywords: string } }>({});
  const [welcomeForms, setWelcomeForms] = useState<{ [pageNum: number]: { title: string; guest: string; date: string; highlights: string; advice: string } }>({});
  const [customForms, setCustomForms] = useState<{ [pageNum: number]: { title: string; person: string; recipient: string; details: string; keywords: string } }>({});

  const getStudentForm = (pageNum: number) => studentForms[pageNum] || { title: '', student: '', classDept: '', award: '', host: '', details: '', keywords: '' };
  const updateStudentForm = (pageNum: number, field: string, val: string) => {
    setStudentForms(prev => ({ ...prev, [pageNum]: { ...getStudentForm(pageNum), [field]: val } }));
  };

  const getFacultyForm = (pageNum: number) => facultyForms[pageNum] || { faculty: '', paper: '', journal: '', date: '', contribution: '' };
  const updateFacultyForm = (pageNum: number, field: string, val: string) => {
    setFacultyForms(prev => ({ ...prev, [pageNum]: { ...getFacultyForm(pageNum), [field]: val } }));
  };

  const getPlacementForm = (pageNum: number) => placementForms[pageNum] || { company: '', domain: '', count: '', package: '', highlights: '' };
  const updatePlacementForm = (pageNum: number, field: string, val: string) => {
    setPlacementForms(prev => ({ ...prev, [pageNum]: { ...getPlacementForm(pageNum), [field]: val } }));
  };

  const getWorkshopForm = (pageNum: number) => workshopForms[pageNum] || { title: '', speaker: '', date: '', audience: '', topics: '', keywords: '' };
  const updateWorkshopForm = (pageNum: number, field: string, val: string) => {
    setWorkshopForms(prev => ({ ...prev, [pageNum]: { ...getWorkshopForm(pageNum), [field]: val } }));
  };

  const getWelcomeForm = (pageNum: number) => welcomeForms[pageNum] || { title: '', guest: '', date: '', highlights: '', advice: '' };
  const updateWelcomeForm = (pageNum: number, field: string, val: string) => {
    setWelcomeForms(prev => ({ ...prev, [pageNum]: { ...getWelcomeForm(pageNum), [field]: val } }));
  };

  const getCustomForm = (pageNum: number) => customForms[pageNum] || { title: '', person: '', recipient: '', details: '', keywords: '' };
  const updateCustomForm = (pageNum: number, field: string, val: string) => {
    setCustomForms(prev => ({ ...prev, [pageNum]: { ...getCustomForm(pageNum), [field]: val } }));
  };

  const [pageCategories, setPageCategories] = useState<{ [pageNum: number]: string }>({});

  const detectCategoryFromTitle = (title: string): string | null => {
    if (!title || !title.trim()) return null;
    const lower = title.toLowerCase();
    if (lower.includes('faculty') || lower.includes('research') || lower.includes('paper') || lower.includes('author') || lower.includes('staff')) return 'faculty';
    if (lower.includes('student') || lower.includes('hackathon') || lower.includes('app') || lower.includes('achieve') || lower.includes('award') || lower.includes('winner')) return 'student';
    if (lower.includes('placement') || lower.includes('job') || lower.includes('recruiter') || lower.includes('company') || lower.includes('offer') || lower.includes('hired')) return 'placement';
    if (lower.includes('workshop') || lower.includes('seminar') || lower.includes('speaker') || lower.includes('training') || lower.includes('guest lecture') || lower.includes('webinar')) return 'workshop';
    if (lower.includes('welcome') || lower.includes('orientation') || lower.includes('fresher') || lower.includes('induction')) return 'welcome';
    return null;
  };

  const handleSetPageCategory = (pageNum: number, category: string) => {
    setPageCategories(prev => ({ ...prev, [pageNum]: category }));

    const currentTitle = activeProject?.pages[pageNum - 1]?.title || '';
    const defaultTitles: { [cat: string]: string } = {
      student: 'STUDENT ACHIEVEMENTS',
      faculty: 'FACULTY ACHIEVEMENTS',
      placement: 'CAMPUS PLACEMENTS',
      workshop: 'TECHNICAL WORKSHOP',
      welcome: 'FRESHERS ORIENTATION',
      custom: 'DEPARTMENT EVENT'
    };

    const newDefaultTitle = defaultTitles[category];
    if (newDefaultTitle && (!currentTitle || currentTitle.includes('Page') || currentTitle.includes('CAMPUS') || currentTitle.includes('STUDENT') || currentTitle.includes('FACULTY') || currentTitle.includes('WORKSHOP') || currentTitle.includes('WELCOME'))) {
      handleUpdatePageTitle(pageNum - 1, newDefaultTitle);
    }
  };

  const getPageCategory = (pageNum: number): string => {
    if (pageCategories[pageNum]) return pageCategories[pageNum];
    const pageTitle = activeProject?.pages[pageNum - 1]?.title || '';
    const detected = detectCategoryFromTitle(pageTitle);
    if (detected) return detected;

    if (pageNum === 2) return 'student';
    if (pageNum === 3) return 'placement';
    if (pageNum === 4) return 'workshop';
    if (pageNum === 5) return 'welcome';
    if (pageNum === 6) return 'welcome';
    if (pageNum === 7) return 'faculty';
    return 'custom';
  };

  const getFormVal = (pNum: number, field: 'title' | 'person' | 'recipient' | 'details' | 'keywords'): string => {
    const cf = getCustomForm(pNum);
    return cf[field] || '';
  };

  const setFormVal = (pNum: number, field: 'title' | 'person' | 'recipient' | 'details' | 'keywords', val: string) => {
    updateCustomForm(pNum, field, val);
  };

  const handleUpdateDateGlobally = (newDate: string) => {
    const cleanDate = newDate.toUpperCase();
    if (!activeProject || !activeProject.pages) return;

    const updatedPages = activeProject.pages.map((p, idx) => {
      const pageNum = idx + 1;
      const targetId = `p${pageNum}_date_hdr`;

      let dateFound = false;
      const updatedElements = p.elements.map(el => {
        const id = el.id || '';
        if (id === targetId || id.includes('date_hdr') || id.includes('hdr_date')) {
          dateFound = true;
          return { ...el, text: cleanDate };
        }
        return el;
      }).filter((el, index, self) => {
        const id = el.id || '';
        if (id.includes('date_hdr') || id.includes('hdr_date')) {
          return index === self.findIndex(t => t.id?.includes('date_hdr') || t.id?.includes('hdr_date'));
        }
        return true;
      });

      if (!dateFound) {
        updatedElements.unshift({
          id: targetId,
          type: 'text',
          x: 500,
          y: 50,
          width: 250,
          height: 22,
          text: cleanDate,
          fontSize: 12,
          fontFamily: 'Poppins',
          color: '#000000',
          bold: true,
          italic: false,
          underline: false,
          align: 'right',
          lineHeight: 1.4,
          letterSpacing: 0,
          rotation: 0,
          opacity: 100,
          locked: true
        });
      }

      return { ...p, elements: updatedElements };
    });

    loadProject({ ...activeProject, pages: updatedPages });
  };

  const handleUpdateDeptGlobally = (newDept: string) => {
    const deptUpper = newDept.toUpperCase().trim();
    const cleanDeptHeader = deptUpper.startsWith('DEPARTMENT OF') ? deptUpper : `DEPARTMENT OF ${deptUpper}`;
    if (!activeProject || !activeProject.pages) return;

    const updatedPages = activeProject.pages.map((p, idx) => {
      const pageNum = idx + 1;
      const updatedElements = p.elements.map(el => {
        const id = el.id || '';
        if (id === `p${pageNum}_dept_hdr` || id.includes('dept_hdr')) {
          return { ...el, text: cleanDeptHeader };
        }
        if (id === 'p1_dept_text') {
          return { ...el, text: cleanDeptHeader };
        }
        return el;
      });
      return { ...p, elements: updatedElements };
    });

    loadProject({ ...activeProject, pages: updatedPages });
  };

  const handleUpdateTitleGlobally = (newTitle: string) => {
    const cleanTitle = newTitle.toUpperCase().trim();
    if (!activeProject || !activeProject.pages) return;

    const updatedPages = activeProject.pages.map((p, idx) => {
      const pageNum = idx + 1;
      const updatedElements = p.elements.map(el => {
        const id = el.id || '';
        if (id === `p${pageNum}_title_hdr` || id.includes('title_hdr')) {
          return { ...el, text: cleanTitle };
        }
        if (id === 'p1_newsletter_title') {
          return { ...el, text: cleanTitle };
        }
        return el;
      });
      return { ...p, elements: updatedElements };
    });

    loadProject({ ...activeProject, pages: updatedPages });
  };

  const handleUpdatePageTitle = (pageIdx: number, newTitle: string) => {
    if (!activeProject || !activeProject.pages || !activeProject.pages[pageIdx]) return;

    const pageNum = pageIdx + 1;
    const cleanTitle = newTitle.toUpperCase();

    // Auto-detect category whenever user types in section title input
    const detectedCategory = detectCategoryFromTitle(newTitle);
    if (detectedCategory) {
      setPageCategories(prev => ({ ...prev, [pageNum]: detectedCategory }));

      if (detectedCategory === 'student') updateStudentForm(pageNum, 'title', newTitle);
      else if (detectedCategory === 'faculty') updateFacultyForm(pageNum, 'paper', newTitle);
      else if (detectedCategory === 'placement') updatePlacementForm(pageNum, 'company', newTitle);
      else if (detectedCategory === 'workshop') updateWorkshopForm(pageNum, 'title', newTitle);
      else if (detectedCategory === 'welcome') updateWelcomeForm(pageNum, 'title', newTitle);
      else if (detectedCategory === 'custom') updateCustomForm(pageNum, 'title', newTitle);
    }

    const updatedPages = activeProject.pages.map((p, idx) => {
      if (idx === pageIdx) {
        let elements = p.elements || [];
        elements = elements.map(el => {
          if (el.id.includes('ribbon_text') || el.id.includes('section_title') || el.id === `p${pageNum}_title`) {
            return { ...el, text: cleanTitle };
          }
          return el;
        });
        return { ...p, title: newTitle, elements };
      }
      return p;
    });

    loadProject({ ...activeProject, pages: updatedPages });
  };

  if (!activeProject || !activeProject.pages || activeProject.pages.length === 0) {
    return (
      <div className="w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center p-6 text-xs text-slate-400">
        Load a project to start using the form wizard.
      </div>
    );
  }

  const pageIndex = activeProject && activeProject.pages ? activeProject.pages.findIndex(p => p.id === activePageId) : 0;
  const activePageNum = pageIndex !== -1 ? pageIndex + 1 : 1;

  const handleAutoFixCurrentPageForm = () => {
    const cat = getPageCategory(activePageNum);
    if (cat === 'student') {
      const sf = getStudentForm(activePageNum);
      updateStudentForm(activePageNum, 'title', detectAndFixCase(sf.title, 'title'));
      updateStudentForm(activePageNum, 'student', detectAndFixCase(sf.student, 'title'));
      updateStudentForm(activePageNum, 'classDept', detectAndFixCase(sf.classDept, 'upper'));
      updateStudentForm(activePageNum, 'award', detectAndFixCase(sf.award, 'sentence'));
      updateStudentForm(activePageNum, 'host', detectAndFixCase(sf.host, 'title'));
      updateStudentForm(activePageNum, 'details', detectAndFixCase(sf.details, 'sentence'));
      updateStudentForm(activePageNum, 'keywords', detectAndFixCase(sf.keywords, 'sentence'));
    } else if (cat === 'faculty') {
      const ff = getFacultyForm(activePageNum);
      updateFacultyForm(activePageNum, 'faculty', detectAndFixCase(ff.faculty, 'title'));
      updateFacultyForm(activePageNum, 'paper', detectAndFixCase(ff.paper, 'title'));
      updateFacultyForm(activePageNum, 'journal', detectAndFixCase(ff.journal, 'title'));
      updateFacultyForm(activePageNum, 'date', detectAndFixCase(ff.date, 'title'));
      updateFacultyForm(activePageNum, 'contribution', detectAndFixCase(ff.contribution, 'sentence'));
    } else if (cat === 'placement') {
      const pf = getPlacementForm(activePageNum);
      updatePlacementForm(activePageNum, 'company', detectAndFixCase(pf.company, 'title'));
      updatePlacementForm(activePageNum, 'domain', detectAndFixCase(pf.domain, 'title'));
      updatePlacementForm(activePageNum, 'count', detectAndFixCase(pf.count, 'sentence'));
      updatePlacementForm(activePageNum, 'package', detectAndFixCase(pf.package, 'upper'));
      updatePlacementForm(activePageNum, 'highlights', detectAndFixCase(pf.highlights, 'sentence'));
    } else if (cat === 'workshop') {
      const wf = getWorkshopForm(activePageNum);
      updateWorkshopForm(activePageNum, 'title', detectAndFixCase(wf.title, 'title'));
      updateWorkshopForm(activePageNum, 'speaker', detectAndFixCase(wf.speaker, 'title'));
      updateWorkshopForm(activePageNum, 'date', detectAndFixCase(wf.date, 'title'));
      updateWorkshopForm(activePageNum, 'audience', detectAndFixCase(wf.audience, 'sentence'));
      updateWorkshopForm(activePageNum, 'topics', detectAndFixCase(wf.topics, 'sentence'));
      updateWorkshopForm(activePageNum, 'keywords', detectAndFixCase(wf.keywords, 'sentence'));
    } else if (cat === 'welcome') {
      const wf = getWelcomeForm(activePageNum);
      updateWelcomeForm(activePageNum, 'title', detectAndFixCase(wf.title, 'title'));
      updateWelcomeForm(activePageNum, 'guest', detectAndFixCase(wf.guest, 'title'));
      updateWelcomeForm(activePageNum, 'date', detectAndFixCase(wf.date, 'title'));
      updateWelcomeForm(activePageNum, 'highlights', detectAndFixCase(wf.highlights, 'sentence'));
      updateWelcomeForm(activePageNum, 'advice', detectAndFixCase(wf.advice, 'sentence'));
    } else if (cat === 'custom') {
      const cf = getCustomForm(activePageNum);
      updateCustomForm(activePageNum, 'title', detectAndFixCase(cf.title, 'title'));
      updateCustomForm(activePageNum, 'person', detectAndFixCase(cf.person, 'title'));
      updateCustomForm(activePageNum, 'recipient', detectAndFixCase(cf.recipient, 'sentence'));
      updateCustomForm(activePageNum, 'details', detectAndFixCase(cf.details, 'sentence'));
      updateCustomForm(activePageNum, 'keywords', detectAndFixCase(cf.keywords, 'sentence'));
    }

    if (generatedArticle) {
      setGeneratedArticle(detectAndFixCase(generatedArticle, 'sentence'));
    }

    if (activeProject && activeProject.pages[activePageNum - 1]?.title) {
      handleUpdatePageTitle(activePageNum - 1, detectAndFixCase(activeProject.pages[activePageNum - 1].title || '', 'title'));
    }
  };

  const handleQuickFillStudentDemo = (pNum: number) => {
    updateStudentForm(pNum, 'title', "Secure Online Voting System");
    updateStudentForm(pNum, 'student', "Mr. Rahul S, Mr. Sathish G, Mr. Yokesh K, Ms. Pradakshina S K, Mr. Prakash K, Ms. Pradeepa S, and Ms. Prada S");
    updateStudentForm(pNum, 'classDept', "III B.Sc IT 'B'");
    updateStudentForm(pNum, 'award', "School-Level Department Association Office Bearer Selection");
    updateStudentForm(pNum, 'host', "Respected Principal Dr. P. Geetha, Deans of various schools, and Heads of Departments");
    updateStudentForm(pNum, 'details', "The developed system was actively used to conduct the association office bearer elections smoothly and securely.");
    updateStudentForm(pNum, 'keywords', "Executive presentation, student web app deployment, leadership appreciation");
  };

  const handleApplyToActivePage = async () => {
    if (!activeProject || !activePageId || pageIndex === -1) return;

    const page = activeProject.pages[pageIndex];
    const pageNum = pageIndex + 1;

    let headlineVal = "";
    let subTitleVal = "";
    let structuredText = detectAndFixCase(generatedArticle, 'sentence');

    if (pageNum === 1) {
      headlineVal = getElementText('p1_title_hdr') || "CTRL+READ";
    } else if (pageNum === activeProject.pages.length && pageNum > 1) {
      headlineVal = "EDITORIAL BOARD";
    } else {
      const activeCategory = getPageCategory(pageNum);

      if (activeCategory === 'student') {
        const sForm = getStudentForm(pageNum);
        headlineVal = sForm.title ? detectAndFixCase(sForm.title, 'title') : detectAndFixCase(page.title || "STUDENT ACHIEVEMENTS", 'title');
        subTitleVal = sForm.award ? `Project Purpose: ${detectAndFixCase(sForm.award, 'title')}` : "Department Student Recognition";
        if (!structuredText.trim() || sForm.title || sForm.student || sForm.award || sForm.details || sForm.keywords || sForm.host) {
          const cleanTitle = sForm.title ? detectAndFixCase(sForm.title, 'title') : (page.title || 'Student Academic Initiative');
          const cleanHost = sForm.host ? detectAndFixCase(sForm.host, 'title') : 'Respected Principal Dr. P. Geetha, Deans of various schools, and Heads of Departments';
          const cleanStudent = sForm.student ? detectAndFixCase(sForm.student, 'title') : 'Our Student Delegation';
          const cleanClassDept = sForm.classDept ? detectAndFixCase(sForm.classDept, 'upper') : `DEPT. OF ${(activeProject.department || "Information Technology").toUpperCase()}`;
          const cleanAward = sForm.award ? detectAndFixCase(sForm.award, 'sentence') : 'the department academic initiative';
          const cleanDetails = sForm.details ? detectAndFixCase(sForm.details, 'sentence') : 'The developed system was actively used to conduct project showcases smoothly and securely.';
          const cleanKeywords = sForm.keywords ? detectAndFixCase(sForm.keywords, 'sentence') : 'Executive presentation, student web app deployment, leadership appreciation';

          const sentences: string[] = [
            `The Department organized the academic initiative titled "${cleanTitle}" (${cleanAward}) hosted at KPRCAS campus.`,
            `The student delegation (${cleanStudent}), actively representing ${cleanClassDept}, displayed exemplary technical capability and high enthusiasm.`,
            `During the main program session, the project team delivered an executive presentation before ${cleanHost}, demonstrating system architecture and live workflow.`,
            `Key project highlights included student web app deployment, live feature demonstration, and interactive module testing.`,
            `The executive leadership team expressed immense appreciation for the students' problem-solving mindset, practical execution, and dedicated teamwork.`,
            cleanDetails ? cleanDetails : `Focus areas and core event highlights included: ${cleanKeywords}.`,
            `The department warmly congratulates the students on their active participation, exemplary dedication, and outstanding academic initiative!`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      } else if (activeCategory === 'faculty') {
        const fForm = getFacultyForm(pageNum);
        headlineVal = fForm.paper ? detectAndFixCase(fForm.paper, 'title') : detectAndFixCase(page.title || "FACULTY ACHIEVEMENTS", 'title');
        subTitleVal = fForm.journal ? `Journal: ${detectAndFixCase(fForm.journal, 'title')}` : "Academic Research Excellence";
        if (!structuredText.trim() || fForm.paper || fForm.faculty || fForm.journal || fForm.contribution) {
          const cPpr = fForm.paper ? detectAndFixCase(fForm.paper, 'title') : 'Advanced Research Publication';
          const cFac = fForm.faculty ? detectAndFixCase(fForm.faculty, 'title') : 'Department Faculty Members';
          const cJrn = fForm.journal ? detectAndFixCase(fForm.journal, 'title') : 'Indexed Academic Journal';
          const cDate = fForm.date ? detectAndFixCase(fForm.date, 'title') : 'Recent Publication';
          const cCnt = fForm.contribution ? detectAndFixCase(fForm.contribution, 'sentence') : 'novel algorithmic methodologies and experimental domain validation';

          const sentences: string[] = [
            `The Department of ${activeProject.department || "Information Technology"} takes great pride in announcing the milestone research publication titled "${cPpr}".`,
            `Authored by eminent faculty member(s) ${cFac}, the research paper was published in the prestigious journal ${cJrn}${cDate ? ` (${cDate})` : ''}.`,
            `The research work presents high-impact insights into ${cCnt}, addressing critical domain challenges through rigorous academic inquiry.`,
            `The publication underwent rigorous peer review, earning accolades from international reviewers for methodology, depth of analysis, and technical quality.`,
            `This academic achievement underscores the department's continuous commitment to advancing cutting-edge research and intellectual innovation.`,
            `The findings offer practical frameworks that will benefit ongoing student research projects and institutional collaborative studies.`,
            `The Management, Principal, and Department members warmly congratulate ${cFac} on this scholarly milestone!`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      } else if (activeCategory === 'placement') {
        const pForm = getPlacementForm(pageNum);
        headlineVal = pForm.company ? `CAMPUS PLACEMENT - ${detectAndFixCase(pForm.company, 'title')}` : detectAndFixCase(page.title || "CAMPUS PLACEMENTS", 'title');
        subTitleVal = pForm.package ? `Package: ${detectAndFixCase(pForm.package, 'upper')}` : "Industry Career Placements";
        if (!structuredText.trim() || pForm.company || pForm.domain || pForm.count || pForm.package || pForm.highlights) {
          const cComp = pForm.company ? detectAndFixCase(pForm.company, 'title') : 'Leading Industry Recruiter';
          const cPkg = pForm.package ? detectAndFixCase(pForm.package, 'upper') : 'Competitive CTC Package';
          const cDom = pForm.domain ? detectAndFixCase(pForm.domain, 'title') : 'Software & Technical Domain';
          const cCnt = pForm.count ? detectAndFixCase(pForm.count, 'sentence') : 'Multiple eligible candidates';
          const cHigh = pForm.highlights ? detectAndFixCase(pForm.highlights, 'sentence') : 'rigorous coding assessments, technical interviews, and executive HR rounds';

          const sentences: string[] = [
            `The Department of ${activeProject.department || "Information Technology"} successfully organized a targeted campus placement drive in partnership with ${cComp}.`,
            `The recruitment drive was conducted for roles in the ${cDom} domain, offering competitive remuneration packages of ${cPkg}.`,
            `Students from the final year participated with high motivation, demonstrating domain expertise, problem-solving skills, and professional etiquette throughout the selection process.`,
            `${cCnt} successfully cleared the multi-stage evaluation process to secure coveted career offers.`,
            `The selection rounds tested core competencies, technical problem solving, live programming, and executive communication skills.`,
            cHigh ? `Key placement highlights included: ${cHigh}.` : `The recruiters commended KPRCAS candidates for their industry readiness and analytical capability.`,
            `The department extends its heartiest congratulations to all the placed candidates and wishes them a stellar career ahead!`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      } else if (activeCategory === 'workshop') {
        const wForm = getWorkshopForm(pageNum);
        headlineVal = wForm.title ? detectAndFixCase(wForm.title, 'title') : detectAndFixCase(page.title || "TECHNICAL WORKSHOP", 'title');
        subTitleVal = wForm.speaker ? `Resource Person: ${detectAndFixCase(wForm.speaker, 'title')}` : "Technical Training";
        if (!structuredText.trim() || wForm.title || wForm.speaker || wForm.topics || wForm.keywords) {
          const cTitle = wForm.title ? detectAndFixCase(wForm.title, 'title') : (page.title || 'Technical Skill Workshop');
          const cSpk = wForm.speaker ? detectAndFixCase(wForm.speaker, 'title') : 'Renowned Industry Subject Expert';
          const cDate = wForm.date ? detectAndFixCase(wForm.date, 'title') : 'Recent Academic Session';
          const cAud = wForm.audience ? detectAndFixCase(wForm.audience, 'sentence') : 'Department Students and Faculty Participants';
          const cTop = wForm.topics ? detectAndFixCase(wForm.topics, 'sentence') : 'interactive hands-on coding, live architecture setup, and real-world case studies';
          const cKey = wForm.keywords ? detectAndFixCase(wForm.keywords, 'sentence') : 'practical skill development and technical mastery';

          const sentences: string[] = [
            `The Department of ${activeProject.department || "Information Technology"} organized an intensive technical workshop titled "${cTitle}"${cDate ? ` on ${cDate}` : ''}.`,
            `The program featured distinguished resource speaker ${cSpk}, who shared valuable real-world insights and industry best practices.`,
            `A large cohort of ${cAud} actively attended the sessions, gaining comprehensive understanding of modern tools and methodologies.`,
            `Key topics covered during the workshop included: ${cTop}.`,
            `The interactive format enabled participants to engage in hands-on practical exercises, live project demonstrations, and problem-solving modules.`,
            `Key learning outcomes centered on ${cKey}, empowering students to build real-world applications with confidence.`,
            `The workshop concluded with certificate distribution, interactive Q&A, and high appreciation from all attendees.`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      } else if (activeCategory === 'welcome') {
        const wlForm = getWelcomeForm(pageNum);
        headlineVal = wlForm.title ? detectAndFixCase(wlForm.title, 'title') : detectAndFixCase(page.title || "ORIENTATION PROGRAM", 'title');
        subTitleVal = wlForm.guest ? `Chief Guest: ${detectAndFixCase(wlForm.guest, 'title')}` : "Academic Welcome";
        if (!structuredText.trim() || wlForm.title || wlForm.guest || wlForm.highlights) {
          const cTitle = wlForm.title ? detectAndFixCase(wlForm.title, 'title') : (page.title || 'Freshers Induction & Academic Orientation');
          const cGst = wlForm.guest ? detectAndFixCase(wlForm.guest, 'title') : 'Distinguished Chief Guest and Academic Leaders';
          const cDate = wlForm.date ? detectAndFixCase(wlForm.date, 'title') : 'Academic Session Launch';
          const cHigh = wlForm.highlights ? detectAndFixCase(wlForm.highlights, 'sentence') : 'department orientation, curriculum walkthrough, and campus facility introduction';
          const cAdv = wlForm.advice ? detectAndFixCase(wlForm.advice, 'sentence') : 'strive for academic curiosity, technical mastery, and holistic personal growth';

          const sentences: string[] = [
            `The Department of ${activeProject.department || "Information Technology"} organized a memorable orientation program titled "${cTitle}"${cDate ? ` on ${cDate}` : ''}.`,
            `The occasion was graced by ${cGst}, who delivered an inspiring inaugural address to welcome the newly inducted batch.`,
            `The program introduced students to academic regulations, department culture, modern laboratory infrastructure, and student association activities.`,
            `Key event highlights included: ${cHigh}.`,
            `In their keynote address, the dignitaries encouraged students to ${cAdv}, emphasizing continuous learning and innovation.`,
            `Senior student coordinators facilitated ice-breaking sessions and interactive games, creating a warm, collegiate atmosphere.`,
            `The department warmly welcomes the incoming batch and wishes them an enriching academic journey at KPRCAS!`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      } else {
        const cForm = getCustomForm(pageNum);
        headlineVal = detectAndFixCase(cForm.title || page.title || "DEPARTMENT EVENT", 'title');
        const personVal = cForm.person;
        subTitleVal = personVal ? `Organizer / Guest: ${detectAndFixCase(personVal, 'title')}` : "Campus Engagement";
        if (!structuredText.trim() || headlineVal) {
          const cTitle = detectAndFixCase(cForm.title || page.title || "DEPARTMENT ACADEMIC EVENT", 'title');
          const cPerson = cForm.person ? detectAndFixCase(cForm.person, 'title') : 'Event Coordinator and Faculty Convenor';
          const cDetails = cForm.details ? detectAndFixCase(cForm.details, 'sentence') : 'interactive student presentations, project demonstrations, and domain expert feedback';
          const cKeywords = cForm.keywords ? detectAndFixCase(cForm.keywords, 'sentence') : 'collaborative learning, technical excellence, and active student engagement';

          const sentences: string[] = [
            `The Department of ${activeProject.department || "Information Technology"} successfully conducted the academic program titled "${cTitle}".`,
            `Organized under the leadership of ${cPerson}, the event brought together students, faculty, and industry observers for an enriching learning session.`,
            `The program focused on fostering academic collaboration, practical knowledge transfer, and domain skill development.`,
            `Key event highlights included: ${cDetails}.`,
            `Participants actively engaged in interactive discussions, presenting innovative ideas and demonstrating live project solutions.`,
            `The core focus areas highlighted during the sessions were ${cKeywords}, receiving high praise from attendees.`,
            `The department congratulates all organizers and student delegates for making the event a grand academic success!`
          ];
          structuredText = detectAndFixCase(sentences.join(' '), 'sentence');
        }
      }
    }

    let updatedElements: any[] = [...page.elements];

    // Ensure title text element exists (strictly inside content safe area y >= 220) ONLY if user provided a title
    if (headlineVal.trim()) {
      let titleEl = updatedElements.find(el => el.id === `p${pageNum}_title`);
      if (titleEl && titleEl.type === 'text') {
        (titleEl as any).text = headlineVal.toUpperCase();
        (titleEl as any).y = Math.max(220, (titleEl as any).y || 220);
      } else {
        updatedElements.push({
          id: `p${pageNum}_title`,
          type: 'text',
          x: 50,
          y: 220,
          width: 700,
          height: 35,
          text: headlineVal.toUpperCase(),
          fontSize: 18,
          fontFamily: 'Poppins',
          color: '#1e40af',
          bold: true,
          italic: false,
          underline: false,
          align: 'center',
          lineHeight: 1.4,
          letterSpacing: 0,
          opacity: 100,
          rotation: 0
        });
      }
    } else {
      // If title is empty, remove any pre-existing hardcoded section title for this page
      updatedElements = updatedElements.filter(el => el.id !== `p${pageNum}_title`);
    }

    // Ensure subtitle text element exists
    if (subTitleVal) {
      let subTitleEl = updatedElements.find(el => el.id === `p${pageNum}_sub_title`);
      if (subTitleEl && subTitleEl.type === 'text') {
        (subTitleEl as any).text = subTitleVal;
        (subTitleEl as any).y = Math.max(260, (subTitleEl as any).y || 260);
      } else {
        updatedElements.push({
          id: `p${pageNum}_sub_title`,
          type: 'text',
          x: 50,
          y: 260,
          width: 700,
          height: 25,
          text: subTitleVal,
          fontSize: 12,
          fontFamily: 'Poppins',
          color: '#0f172a',
          bold: true,
          italic: false,
          underline: false,
          align: 'center',
          lineHeight: 1.4,
          letterSpacing: 0,
          opacity: 100,
          rotation: 0
        });
      }
    }

    // Ensure body text element exists (formatted as a clean continuous paragraph)
    if (structuredText) {
      const cleanPara = formatToParagraph(structuredText);
      let textEl = updatedElements.find(el => el.id === `p${pageNum}_text`);
      const len = cleanPara.length;
      const fitFontSize = len > 800 ? 9.5 : len > 500 ? 10 : 11;

      if (textEl && textEl.type === 'text') {
        (textEl as any).text = cleanPara;
        (textEl as any).fontSize = fitFontSize;
        (textEl as any).y = Math.max(295, (textEl as any).y || 295);
      } else {
        updatedElements.push({
          id: `p${pageNum}_text`,
          type: 'text',
          x: 50,
          y: 295,
          width: 700,
          height: 200,
          text: cleanPara,
          fontSize: fitFontSize,
          fontFamily: 'Poppins',
          color: '#334155',
          bold: false,
          italic: false,
          underline: false,
          align: 'left',
          lineHeight: 1.5,
          letterSpacing: 0,
          opacity: 100,
          rotation: 0
        });
      }
    }

    // Append uploaded photos cleanly below text (MAXIMUM 3 PHOTOS PER CONTENT ITEM)
    const validPhotos = (photos || []).slice(0, 3);
    if (photos && photos.length > 3) {
      alert("Maximum 3 photos allowed for this content item. Placing top 3 photos into layout.");
    }

    if (validPhotos && validPhotos.length > 0) {
      updatedElements = updatedElements.filter(el => el.type !== 'image' || el.id.includes('logo') || el.id.includes('pic_'));

      validPhotos.forEach((photoUrl, idx) => {
        let x = 50;
        let y = 510;
        let width = 700;
        let height = 360;

        if (validPhotos.length === 1) {
          x = 80;
          y = 510;
          width = 640;
          height = 360;
        } else if (validPhotos.length === 2) {
          x = idx === 0 ? 50 : 415;
          y = 510;
          width = 335;
          height = 340;
        } else if (validPhotos.length === 3) {
          x = idx === 0 ? 50 : idx === 1 ? 290 : 530;
          y = 510;
          width = 220;
          height = 320;
        }

        updatedElements.push({
          id: `p${pageNum}_img_${idx + 1}_${Date.now()}`,
          type: 'image',
          x,
          y,
          width,
          height,
          url: photoUrl,
          borderRadius: 12,
          shadow: 'md',
          rotation: 0,
          opacity: 100
        });
      });
    }

    const updatedPages = [...activeProject.pages];
    updatedPages[pageIndex] = {
      ...page,
      elements: updatedElements
    };

    const updatedProject = {
      ...activeProject,
      pages: updatedPages
    };

    loadProject(updatedProject);
    await saveProject(updatedProject);

    alert(`Successfully applied content and ${photos.length} photo(s) to Page ${pageNum}!`);

    // Advance smoothly to next page forward
    if (pageIndex < activeProject.pages.length - 1) {
      setActivePageId(activeProject.pages[pageIndex + 1].id);
    }
  };

  const currentPage = activeProject.pages[pageIndex] || activeProject.pages[0];
  const elements = currentPage?.elements || [];

  const getElementText = (id: string): string => {
    const el = elements.find(e => e.id === id);
    if (el && el.type === 'text') {
      return el.text;
    }
    return '';
  };

  const getElementUrl = (id: string): string => {
    const el = elements.find(e => e.id === id);
    if (el && el.type === 'image') {
      return el.url;
    }
    return '';
  };

  const handleTextChange = (id: string, text: string) => {
    const page = activeProject.pages[pageIndex];
    if (!page) return;

    // Synchronously update department or title across Page 1 header elements
    if (id === 'p1_dept_text' || id === 'p1_dept_hdr') {
      const cleanDept = text.toUpperCase().startsWith('DEPARTMENT OF') ? text.toUpperCase() : `DEPARTMENT OF ${text.toUpperCase()}`;
      const updated = page.elements.map(el => {
        if (el.id === 'p1_dept_text' || el.id === 'p1_dept_hdr') {
          return { ...el, text: cleanDept };
        }
        return el;
      });
      updatePageElements(page.id, updated);
      return;
    }

    const exists = page.elements.some(e => e.id === id);
    if (exists) {
      updateElement(id, { text } as any);
    } else {
      let x = 50, y = 200, width = 700, height = 40, fontSize = 14, bold = false, align: any = 'center', fontFamily = 'Poppins';
      if (id.includes('title')) { y = 98; height = 65; fontSize = 52; bold = true; fontFamily = 'Playfair Display'; }
      else if (id.includes('school')) { y = 315; fontSize = 15; bold = true; }
      else if (id.includes('dept')) { y = 345; fontSize = 14; bold = true; }
      else if (id.includes('college')) { y = 280; fontSize = 14; bold = true; }
      else if (id.includes('caption')) { y = 970; fontSize = 9; align = 'center'; }
      else if (id.includes('date')) { x = 500; y = 52; width = 250; height = 25; fontSize = 12; align = 'right'; bold = true; }
      else if (id.includes('chief')) { y = 540; width = 350; align = 'center'; }
      else if (id.includes('co')) { x = 400; y = 540; width = 350; align = 'center'; }

      const newEl = {
        id,
        type: 'text' as const,
        x,
        y,
        width,
        height,
        text,
        fontSize,
        fontFamily,
        color: '#0f172a',
        bold,
        italic: false,
        underline: false,
        align,
        lineHeight: 1.4,
        letterSpacing: 0,
        rotation: 0,
        opacity: 100
      };
      updatePageElements(page.id, [...page.elements, newEl]);
    }
  };

  const handleImageChange = (id: string, url: string) => {
    const page = activeProject.pages[pageIndex];
    if (!page) return;

    const exists = page.elements.some(e => e.id === id);
    if (exists) {
      updateElement(id, { url } as any);
    } else {
      let x = 50, y = 380, width = 700, height = 575, objectFit: any = 'cover', borderRadius = 12;
      if (id === 'p1_kprcas_logo') { x = 50; y = 200; width = 330; height = 100; objectFit = 'contain'; borderRadius = 0; }
      else if (id === 'p1_launchit_logo') { x = 420; y = 200; width = 330; height = 100; objectFit = 'contain'; borderRadius = 0; }

      const newImgEl = {
        id,
        type: 'image' as const,
        x,
        y,
        width,
        height,
        url,
        borderRadius,
        shadow: 'md' as const,
        objectFit,
        rotation: 0,
        opacity: 100
      };
      updatePageElements(page.id, [...page.elements, newImgEl as any]);
    }
  };

  const handleEditorPhotoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const newUrl = uploadEvent.target.result as string;
          const targetPage = activeProject.pages[pageIndex];
          if (targetPage) {
            const exists = targetPage.elements.some(el => el.id === id);
            let updated;
            if (exists) {
              updated = targetPage.elements.map(el => el.id === id ? { ...el, url: newUrl } : el);
            } else {
              const isChief = id.includes('chief');
              updated = [...targetPage.elements, {
                id,
                type: 'image' as const,
                x: isChief ? 135 : 485,
                y: 340,
                width: 180,
                height: 180,
                url: newUrl,
                borderRadius: 90,
                shadow: 'md' as const,
                objectFit: 'cover' as const,
                rotation: 0,
                opacity: 100
              }];
            }
            updatePageElements(targetPage.id, updated as any);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocalImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          handleImageChange(id, uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const hasElement = (id: string): boolean => {
    return elements.some(e => e.id === id);
  };

  // Pre-fill elements and image preview states when active page changes
  React.useEffect(() => {
    if (!activeProject || pageIndex === -1) return;
    const page = activeProject.pages[pageIndex];
    const pageNum = pageIndex + 1;

    const titleEl = page.elements.find(el => el.id === `p${pageNum}_title`);
    const textEl = page.elements.find(el => el.id === `p${pageNum}_text`);

    // Load current images for preview
    const currentImgs = page.elements
      .filter(el => el.type === 'image' && el.id.startsWith(`p${pageNum}_img`) && (el as any).url)
      .sort((a, b) => {
        const matchA = a.id.match(/_img(\d+)/);
        const matchB = b.id.match(/_img(\d+)/);
        const numA = matchA ? parseInt(matchA[1], 10) : 0;
        const numB = matchB ? parseInt(matchB[1], 10) : 0;
        return numA - numB;
      })
      .map(el => (el as any).url || '');

    setPhotos(currentImgs);
    setGeneratedArticle(textEl && textEl.type === 'text' ? textEl.text : '');

    // Sync form values from current page elements whenever active page changes
    if (titleEl && titleEl.type === 'text' && titleEl.text) {
      const txt = titleEl.text;
      const cat = getPageCategory(pageNum);
      if (cat === 'student' && !getStudentForm(pageNum).title) updateStudentForm(pageNum, 'title', txt);
      else if (cat === 'faculty' && !getFacultyForm(pageNum).paper) updateFacultyForm(pageNum, 'paper', txt);
      else if (cat === 'placement' && !getPlacementForm(pageNum).company) updatePlacementForm(pageNum, 'company', txt);
      else if (cat === 'workshop' && !getWorkshopForm(pageNum).title) updateWorkshopForm(pageNum, 'title', txt);
      else if (cat === 'welcome' && !getWelcomeForm(pageNum).title) updateWelcomeForm(pageNum, 'title', txt);
      else if (cat === 'custom' && !getCustomForm(pageNum).title) updateCustomForm(pageNum, 'title', txt);
    }
  }, [activePageId, activeProject]);

  // Multiple photos upload handler for Page-specific form
  const handleMultiplePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      filesArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          if (uploadEvent.target?.result) {
            setPhotos((prev) => [...prev, uploadEvent.target!.result as string]);
            setCaptions((prev) => [...prev, ""]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, text: string) => {
    setCaptions((prev) => {
      const updated = [...prev];
      updated[index] = text;
      return updated;
    });
  };

  const handlePageSelect = (num: number) => {
    if (!activeProject || !activeProject.pages) return;
    const targetPage = activeProject.pages[num - 1];
    if (targetPage) {
      setActivePageId(targetPage.id);
    }
  };

  // Universal Inbuilt AI Copywriter for EVERY Page
  const handleInbuiltAiGenerateCurrentPage = (pageNum: number) => {
    if (!activeProject || !activeProject.pages) return;
    const totalPages = activeProject.pages.length;
    const isCover = pageNum === 1;
    const isEditorial = pageNum === totalPages && pageNum > 1;
    const deptName = activeProject.department || "Information Technology";
    const deptUpper = deptName.toUpperCase();

    setIsGeneratingArticle(true);

    setTimeout(() => {
      if (isCover) {
        handleTextChange('p1_school_text', 'SCHOOL OF COMPUTING SCIENCE & DIGITAL INNOVATION');
        handleTextChange('p1_dept_text', `DEPARTMENT OF ${deptUpper}`);
        handleTextChange('p1_title_hdr', 'CTRL+READ');
        handleTextChange('p1_subtitle_hdr', 'OFFICIAL ACADEMIC NEWSLETTER');
        handleTextChange('p1_date_hdr', 'JUNE 2026');
        setGeneratedArticle(`Welcome to the June 2026 edition of CTRL+READ, the official academic publication of the Department of ${deptName} at KPRCAS. This issue highlights exceptional student achievements, national hackathon triumphs, faculty research publications, corporate placement drives, and interactive campus workshops. Our students and faculty members continue to set benchmarks in technical innovation, research endeavors, and academic excellence.`);
      } else if (isEditorial) {
        const chiefNameId = `p${pageNum}_name_chief`;
        const chiefRoleId = `p${pageNum}_desig_chief`;
        const chiefDeptId = `p${pageNum}_dept_chief`;
        const coNameId = `p${pageNum}_name_co`;
        const coRoleId = `p${pageNum}_desig_co`;
        const coDeptId = `p${pageNum}_dept_co`;

        handleTextChange(chiefNameId, 'DR. S. SRIVIDHYA');
        handleTextChange(chiefRoleId, 'ASSOCIATE PROFESSOR AND HEAD');
        handleTextChange(chiefDeptId, `DEPT. OF ${deptUpper}`);
        handleTextChange(coNameId, 'MR. AKHIL K M');
        handleTextChange(coRoleId, 'ASSISTANT PROFESSOR');
        handleTextChange(coDeptId, `DEPT. OF ${deptUpper}`);
        setGeneratedArticle(`The Editorial Board expresses heartfelt gratitude to the management, Principal, HOD, faculty mentors, and student contributors for bringing out this edition of CTRL+READ. For feedback or submissions, contact editor@kprcas.ac.in.`);
      } else {
        const cat = getPageCategory(pageNum);
        let title = "";
        let details = "";
        let article = "";

        if (cat === 'student' || pageNum === 2) {
          title = "NATIONAL HACKATHON TRIUMPH & CASH PRIZE";
          details = "First place winner at the National Smart India Tech Hackathon 2026. Awarded Cash Prize of Rs. 50,000 for AI Web Innovation.";
          article = `Our department student team achieved outstanding national recognition by bagging the First Place Trophy and a cash award of Rs. 50,000 at the National Smart India Tech Hackathon 2026. Out of over 400 participating delegations across leading technical institutions, our students engineered an AI-powered automated workflow platform that solved complex real-world challenges. The jury panel, comprising senior technical leaders and industry domain architects, commended our team for their exceptional system architecture, algorithmic efficiency, and seamless user experience presentation. The Department of ${deptName} warmly congratulates the winners on their stellar academic performance!`;
          
          setStudentForms(prev => ({
            ...prev,
            [pageNum]: {
              title,
              student: "S. KAVIN & TEAM (III YEAR B.SC IT)",
              award: "FIRST PLACE & GOLD MEDAL",
              host: "NATIONAL TECH FEST 2026",
              classDept: `III YEAR ${deptUpper}`,
              details,
              keywords: details
            }
          }));
        } else if (cat === 'faculty' || pageNum === 7) {
          title = "FACULTY RESEARCH PUBLICATION IN IEEE TRANSACTIONS";
          details = "Published peer-reviewed research paper on Machine Learning Architectures & Cloud Optimization. Indexed in Scopus and Web of Science.";
          article = `Dr. S. Srividhya, Associate Professor & Head, Department of ${deptName}, has successfully published a landmark research paper titled "Advanced Machine Learning Architectures for Next-Generation Cloud Systems" in IEEE Transactions. The research presents innovative algorithmic optimizations for distributed data processing and cloud security. This high-impact publication adds significant academic prestige to KPRCAS and serves as an inspiring benchmark for student researchers.`;

          setFacultyForms(prev => ({
            ...prev,
            [pageNum]: {
              faculty: "DR. S. SRIVIDHYA",
              desig: "ASSOCIATE PROFESSOR & HOD",
              paper: title,
              journal: "IEEE TRANSACTIONS ON COMPUTING (VOL. 42)",
              date: "MAY 2026",
              contribution: details
            }
          }));
        } else if (cat === 'placement' || pageNum === 3) {
          title = "RECORD 98% PLACEMENT IN TOP MNC CORPORATE DRIVE";
          details = "Over 45 students secured lucrative career offers in leading MNCs including TCS, Wipro, Infosys, and Cognizant with highest CTC of 9.5 LPA.";
          article = `The Placement Cell of the Department of ${deptName} is proud to announce an exceptional placement milestone for the graduating batch of 2026. Through rigorous campus recruitment drives and technical training bootcamps, over 98% of eligible students secured high-profile software engineering and analytical roles in top-tier multinational corporations. The highest salary package reached 9.5 LPA, with an average CTC of 4.8 LPA. Corporate recruiters commended the students' strong foundational coding skills, problem-solving dexterity, and professional interview readiness.`;

          setPlacementForms(prev => ({
            ...prev,
            [pageNum]: {
              company: "TOP MNC RECRUITERS (TCS, WIPRO, INFOSYS)",
              domain: "SOFTWARE DEVELOPMENT",
              count: "45 STUDENTS PLACED",
              package: "HIGHEST CTC: 9.5 LPA • AVG: 4.8 LPA",
              highlights: details
            }
          }));
        } else if (cat === 'workshop' || pageNum === 4) {
          title = "EXPERT WORKSHOP ON FULL STACK CLOUD ARCHITECTURE";
          details = "Hands-on technical workshop on React, Spring Boot, and Kubernetes deployment led by industry technical lead.";
          article = `An intensive 2-day hands-on workshop on "Full Stack Cloud Architecture & Microservices" was organized by the Department of ${deptName} on May 18-19, 2026. Over 120 student delegates participated in live coding sessions, containerization exercises, and cloud deployment pipelines. The resource person, a Chief Solutions Architect from Amazon Web Services, provided practical insights into industry deployment workflows. Participants successfully deployed real-time web applications by the conclusion of the workshop.`;

          setWorkshopForms(prev => ({
            ...prev,
            [pageNum]: {
              title,
              speaker: "CHIEF ARCHITECT, AWS INDIA",
              date: "MAY 18-19, 2026",
              audience: "DEPARTMENT STUDENTS & FACULTY",
              topics: "REACT, SPRING BOOT, KUBERNETES, CI/CD",
              keywords: details
            }
          }));
        } else if (cat === 'welcome' || pageNum === 5) {
          title = "FRESHERS ORIENTATION & DIGITAL INDUCTION 2026";
          details = "Welcoming the incoming cohort of students with campus orientation, technical club introductions, and mentor interactions.";
          article = `The Department of ${deptName} hosted a grand Orientation & Induction Ceremony to welcome the incoming batch of 2026. The inaugural session commenced with inspiring addresses by the Principal and HOD, highlighting academic opportunities, industry certification courses, and research initiatives available at KPRCAS. Senior student leaders presented live demonstrations of departmental technical clubs, hackathons, and cultural societies. The event concluded with an interactive mentor-mentee orientation session.`;

          setWelcomeForms(prev => ({
            ...prev,
            [pageNum]: {
              title,
              date: "JUNE 2026",
              guest: "PRINCIPAL & DEPARTMENT HOD",
              highlights: "CAMPUS TOUR, MENTORSHIP, HACKATHON CLUBS",
              advice: "EMBRACE LEARNING, INNOVATION & DISCIPLINE"
            }
          }));
        } else {
          title = `DEPARTMENT TECH FEST & EXPO 2026`;
          details = `Showcase of 30+ innovative student projects, AI software apps, and hardware prototypes before college dignitaries.`;
          article = `The Department of ${deptName} organized its flagship Annual Technical Symposium and Project Expo. Over 30 student teams presented cutting-edge software applications, web tools, and AI prototypes before an esteemed jury of industry veterans. The event fostered a vibrant spirit of innovation, collaborative learning, and technical craftsmanship across all academic batches. Outstanding projects were awarded certificates of merit and trophy accolades.`;

          setCustomForms(prev => ({
            ...prev,
            [pageNum]: {
              title,
              person: "CHIEF GUEST & INDUSTRY JURY",
              recipient: "DEPARTMENT STUDENTS & FACULTY",
              details,
              keywords: details
            }
          }));
        }

        setGeneratedArticle(article);
        
        setTimeout(() => {
          handleApplyToActivePage();
        }, 150);
      }

      setIsGeneratingArticle(false);
    }, 300);
  };

  // Call backend to generate factual event copy for specific pages
  const triggerGenerateArticle = async (_tone: string = "standard") => {
    handleInbuiltAiGenerateCurrentPage(activePageNum);
  };

  // Text Sanitizer to scrub binary junk, EXIF metadata, and replacement characters
  const cleanParsedText = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/(?:JFIF|Exif|Photoshop|GIMP|CREATED WITH GIMP|ICC_PROFILE)[\s\S]*?(?=\s[A-Z]|\n|$)/gi, '')
      .replace(/JFIF|Exif|Photoshop|GIMP|CREATED WITH|ICC_PROFILE|\uFFFD/gi, '')
      .replace(/[^\x20-\x7E\s\u00A0-\u024F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 1. Smart Document / Circular Auto-Parser
  const handleParseUploadedDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check if file is an image file uploaded into document text parser
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name);
      if (isImage) {
        alert("⚠️ Notice: Image files cannot be parsed as text documents. Please upload a PDF, Word DOCX, or TXT file to parse circular text.");
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const rawTextContent = uploadEvent.target.result as string;
          const textContent = cleanParsedText(rawTextContent);
          
          try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/ai/parse-document', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ text: textContent })
            });

            if (response.ok) {
              const rawData = await response.json();
              const data = {
                category: rawData.category || 'student',
                title: cleanParsedText(rawData.title || ''),
                person: cleanParsedText(rawData.person || ''),
                date: cleanParsedText(rawData.date || ''),
                highlights: cleanParsedText(rawData.highlights || ''),
                article: cleanParsedText(rawData.article || '')
              };

              const cat = data.category || 'student';
              setPageCategories(prev => ({ ...prev, [activePageNum]: cat }));

              if (cat === 'student') {
                updateStudentForm(activePageNum, 'title', data.title);
                updateStudentForm(activePageNum, 'student', data.person);
                updateStudentForm(activePageNum, 'award', data.title);
                updateStudentForm(activePageNum, 'details', data.highlights);
              } else if (cat === 'faculty') {
                updateFacultyForm(activePageNum, 'paper', data.title);
                updateFacultyForm(activePageNum, 'faculty', data.person);
                updateFacultyForm(activePageNum, 'date', data.date);
                updateFacultyForm(activePageNum, 'contribution', data.highlights);
              } else if (cat === 'placement') {
                updatePlacementForm(activePageNum, 'company', data.title);
                updatePlacementForm(activePageNum, 'domain', data.person);
                updatePlacementForm(activePageNum, 'highlights', data.highlights);
              } else if (cat === 'workshop') {
                updateWorkshopForm(activePageNum, 'title', data.title);
                updateWorkshopForm(activePageNum, 'speaker', data.person);
                updateWorkshopForm(activePageNum, 'date', data.date);
                updateWorkshopForm(activePageNum, 'topics', data.highlights);
              } else if (cat === 'welcome') {
                updateWelcomeForm(activePageNum, 'title', data.title);
                updateWelcomeForm(activePageNum, 'guest', data.person);
                updateWelcomeForm(activePageNum, 'date', data.date);
                updateWelcomeForm(activePageNum, 'highlights', data.highlights);
              } else {
                updateCustomForm(activePageNum, 'title', data.title);
                updateCustomForm(activePageNum, 'person', data.person);
                updateCustomForm(activePageNum, 'details', data.highlights);
              }

              if (data.article) {
                setGeneratedArticle(data.article);
              }

              if (data.title) {
                handleUpdatePageTitle(activePageNum - 1, data.title);
              }

              alert(`✨ Smart Document Auto-Parser successfully extracted clean event data for Page ${activePageNum}!`);
            } else {
              alert("Could not parse document text.");
            }
          } catch (err) {
            console.error(err);
            alert("Error parsing document.");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  // 2. AI Image Auto-Captioning & Smart Layout Balancer
  const handleAutoCaptionAndBalancePhotos = async () => {
    if (photos.length === 0) {
      alert("Please upload at least 1 photo first.");
      return;
    }

    const cat = getPageCategory(activePageNum);
    const eventTitle = activeProject.pages[activePageNum - 1]?.title || "Campus Event";
    const newCaptions: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ai/generate-image-caption', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            eventTitle,
            category: cat,
            imageIndex: i
          })
        });
        if (res.ok) {
          const data = await res.json();
          newCaptions.push(data.caption || `Photograph ${i + 1} of ${eventTitle}`);
        } else {
          newCaptions.push(`Photograph ${i + 1} of ${eventTitle}`);
        }
      } catch (e) {
        newCaptions.push(`Photograph ${i + 1} of ${eventTitle}`);
      }
    }

    setCaptions(newCaptions);
    alert("✨ AI Auto-Captioning complete! Photo captions and dynamic layout balance applied.");
  };

  // 3. 1-Click Multi-Page Full Newsletter Generator Modal State & Handler
  const [showFullGenModal, setShowFullGenModal] = useState(false);
  const [fullGenNotes, setFullGenNotes] = useState("");
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);

  const handleGenerateFullNewsletter = async () => {
    if (!fullGenNotes.trim()) {
      alert("Please paste your event notes or monthly updates first.");
      return;
    }

    setIsGeneratingFull(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/generate-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: fullGenNotes })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.pages && data.pages.length > 0) {
          const updatedProject = {
            ...activeProject,
            pages: data.pages
          };
          loadProject(updatedProject);
          await saveProject(updatedProject);
          setShowFullGenModal(false);
          setFullGenNotes("");
          alert("🚀 1-Click Full Newsletter Generator created all pages successfully!");
        }
      } else {
        alert("Failed to generate full newsletter.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating full newsletter.");
    } finally {
      setIsGeneratingFull(false);
    }
  };
  /*
    const pageNum = activeProject.pages.length + 1;
    const newPageId = `page_${pageNum}_${Date.now()}`;
    const primary = activeProject.theme.primary || "#1e40af";
    const secondary = activeProject.theme.secondary || "#0f172a";
    const background = activeProject.theme.background || "#ffffff";
    const departmentName = activeProject.department || "Information Technology";
    const finalDate = eventDate || "JUNE 2026";
    const finalCategory = category === 'CUSTOM' ? customCategory : category;

    // Compute text height safely
    const charPerLine = 95;
    const totalLines = Math.ceil(generatedArticle.length / charPerLine) + 3;
    const textHeight = Math.max(120, totalLines * 11 * 1.6);
    const textBottom = 260 + textHeight;
    const availableHeight = 1080 - textBottom;

    const pageElements: any[] = [];

    // Background
    pageElements.push({
      id: `${newPageId}_bg`,
      type: "shape",
      shapeType: "rect",
      x: 0,
      y: 0,
      width: 800,
      height: 1130,
      fillColor: background,
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 100,
      rotation: 0,
      locked: true,
      zIndex: 1
    });

    // Header (replicated from visual reference design)
    pageElements.push({
      id: `${newPageId}_hdr_line1`,
      type: "shape",
      shapeType: "rect",
      x: 50,
      y: 55,
      width: 700,
      height: 1,
      fillColor: secondary,
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    pageElements.push({
      id: `${newPageId}_hdr_dept`,
      type: "text",
      x: 50,
      y: 30,
      width: 400,
      height: 20,
      text: departmentName.toUpperCase(),
      fontSize: 10,
      fontFamily: "Poppins",
      bold: true,
      align: "left",
      color: secondary,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    pageElements.push({
      id: `${newPageId}_hdr_date`,
      type: "text",
      x: 450,
      y: 30,
      width: 300,
      height: 20,
      text: finalDate.toUpperCase(),
      fontSize: 10,
      fontFamily: "Poppins",
      bold: true,
      align: "right",
      color: secondary,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    pageElements.push({
      id: `${newPageId}_hdr_title`,
      type: "text",
      x: 50,
      y: 70,
      width: 700,
      height: 45,
      text: activeProject.name.toUpperCase(),
      fontSize: 28,
      fontFamily: "Playfair Display",
      bold: true,
      align: "center",
      color: primary,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    pageElements.push({
      id: `${newPageId}_hdr_subtitle`,
      type: "text",
      x: 50,
      y: 115,
      width: 700,
      height: 20,
      text: "NEWS LETTER",
      fontSize: 10,
      fontFamily: "Poppins",
      bold: true,
      align: "center",
      color: secondary,
      opacity: 100,
      rotation: 0,
      zIndex: 10,
      letterSpacing: 2.0
    });

    pageElements.push({
      id: `${newPageId}_hdr_line2`,
      type: "shape",
      shapeType: "rect",
      x: 50,
      y: 140,
      width: 700,
      height: 1,
      fillColor: secondary,
      strokeColor: "transparent",
      strokeWidth: 0,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    // Category / Section Title
    pageElements.push({
      id: `${newPageId}_category`,
      type: "text",
      x: 50,
      y: 170,
      width: 700,
      height: 30,
      text: finalCategory.toUpperCase(),
      fontSize: 14,
      fontFamily: "Poppins",
      bold: true,
      align: "center",
      color: "#0f172a",
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    // Headline Title
    pageElements.push({
      id: `${newPageId}_headline`,
      type: "text",
      x: 50,
      y: 210,
      width: 700,
      height: 40,
      text: eventTitle.toUpperCase(),
      fontSize: 18,
      fontFamily: "Poppins",
      bold: true,
      align: "center",
      color: primary,
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    // Generated Factual Article Copy
    pageElements.push({
      id: `${newPageId}_text`,
      type: "text",
      x: 50,
      y: 260,
      width: 700,
      height: textHeight,
      text: generatedArticle,
      fontSize: 11,
      fontFamily: "Poppins",
      bold: false,
      align: "justify",
      color: "#334155",
      opacity: 100,
      rotation: 0,
      zIndex: 10,
      lineHeight: 1.6
    });

    // Footer copyright branding
    pageElements.push({
      id: `${newPageId}_footer_text`,
      type: "text",
      x: 50,
      y: 1090,
      width: 700,
      height: 20,
      text: `Page ${pageNum} • Official publication of the Department of ${departmentName}`,
      fontSize: 9,
      fontFamily: "Poppins",
      bold: false,
      align: "center",
      color: "#94a3b8",
      opacity: 100,
      rotation: 0,
      zIndex: 10
    });

    // Setup helper for photo gallery sheets
    const makeGalleryPageObj = (chunkPhotos: string[], startCapIndex: number) => {
      const gPageId = `page_gallery_${Date.now()}_${startCapIndex}`;
      const gElements: any[] = [
        // Background
        { id: `${gPageId}_bg`, type: "shape", shapeType: "rect", x: 0, y: 0, width: 800, height: 1130, fillColor: background, strokeColor: "transparent", strokeWidth: 0, opacity: 100, rotation: 0, locked: true, zIndex: 1 },
        // Header
        { id: `${gPageId}_hdr_line1`, type: "shape", shapeType: "rect", x: 50, y: 55, width: 700, height: 1, fillColor: secondary },
        { id: `${gPageId}_hdr_dept`, type: "text", x: 50, y: 30, width: 400, height: 20, text: departmentName.toUpperCase(), fontSize: 10, fontFamily: "Poppins", bold: true, color: secondary },
        { id: `${gPageId}_hdr_date`, type: "text", x: 450, y: 30, width: 300, height: 20, text: finalDate.toUpperCase(), fontSize: 10, fontFamily: "Poppins", bold: true, color: secondary, align: "right" },
        { id: `${gPageId}_hdr_title`, type: "text", x: 50, y: 70, width: 700, height: 45, text: activeProject.name.toUpperCase(), fontSize: 28, fontFamily: "Playfair Display", bold: true, color: primary, align: "center" },
        { id: `${gPageId}_hdr_subtitle`, type: "text", x: 50, y: 115, width: 700, height: 20, text: "NEWS LETTER", fontSize: 10, fontFamily: "Poppins", bold: true, color: secondary, align: "center", letterSpacing: 2.0 },
        { id: `${gPageId}_hdr_line2`, type: "shape", shapeType: "rect", x: 50, y: 140, width: 700, height: 1, fillColor: secondary },
        // Titles
        { id: `${gPageId}_category`, type: "text", x: 50, y: 170, width: 700, height: 30, text: `${finalCategory} - PHOTOGRAPHS`.toUpperCase(), fontSize: 14, fontFamily: "Poppins", bold: true, align: "center", color: "#0f172a" },
        { id: `${gPageId}_headline`, type: "text", x: 50, y: 210, width: 700, height: 40, text: `${eventTitle} - GALLERY`.toUpperCase(), fontSize: 16, fontFamily: "Poppins", bold: true, align: "center", color: primary }
      ];

      const gridYStart = 260;
      const phW = 335;
      const phH = 230;
      const xL = 50;
      const xR = 415;

      for (let j = 0; j < Math.min(6, chunkPhotos.length); j++) {
        const photoUrl = chunkPhotos[j];
        const row = Math.floor(j / 2);
        const col = j % 2;
        const xPos = col === 0 ? xL : xR;
        const yPos = gridYStart + row * (phH + 25);

        gElements.push({
          id: `${gPageId}_img_${j}`,
          type: "image",
          x: xPos,
          y: yPos,
          width: phW,
          height: phH,
          url: photoUrl,
          borderRadius: 8,
          zIndex: 5
        });

        const captionStr = captions[startCapIndex + j] || "";
        if (captionStr) {
          gElements.push({
            id: `${gPageId}_caption_${j}`,
            type: "text",
            x: xPos,
            y: yPos + phH + 3,
            width: phW,
            height: 20,
            text: captionStr,
            fontSize: 9,
            fontFamily: "Poppins",
            italic: true,
            align: "center",
            color: "#475569",
            zIndex: 10
          });
        }
      }

      gElements.push({
        id: `${gPageId}_footer_text`,
        type: "text",
        x: 50,
        y: 1090,
        width: 700,
        height: 20,
        text: `Page • Official publication of the Department of ${departmentName}`,
        fontSize: 9,
        fontFamily: "Poppins",
        align: "center",
        color: "#94a3b8"
      });

      return {
        id: gPageId,
        elements: gElements
      };
    };

    // Auto arrange grid on main page or continuation pages
    if (photos.length > 0) {
      const imgY = textBottom + 20;
      if (availableHeight >= 200) {
        if (photos.length === 1) {
          const imgH = Math.min(availableHeight - 40, 260);
          pageElements.push({
            id: `${newPageId}_img1`,
            type: "image",
            x: 175,
            y: imgY,
            width: 450,
            height: imgH,
            url: photos[0],
            borderRadius: 8,
            zIndex: 5
          });
          if (captions[0]) {
            pageElements.push({
              id: `${newPageId}_caption1`,
              type: "text",
              x: 175,
              y: imgY + imgH + 4,
              width: 450,
              height: 20,
              text: captions[0],
              fontSize: 9,
              fontFamily: "Poppins",
              italic: true,
              align: "center",
              color: "#475569"
            });
          }
        } else if (photos.length === 2) {
          const imgH = Math.min(availableHeight - 40, 230);
          pageElements.push({
            id: `${newPageId}_img1`,
            type: "image",
            x: 50,
            y: imgY,
            width: 335,
            height: imgH,
            url: photos[0],
            borderRadius: 8,
            zIndex: 5
          });
          if (captions[0]) {
            pageElements.push({
              id: `${newPageId}_caption1`,
              type: "text",
              x: 50,
              y: imgY + imgH + 4,
              width: 335,
              height: 20,
              text: captions[0],
              fontSize: 9,
              fontFamily: "Poppins",
              italic: true,
              align: "center",
              color: "#475569"
            });
          }
          pageElements.push({
            id: `${newPageId}_img2`,
            type: "image",
            x: 415,
            y: imgY,
            width: 335,
            height: imgH,
            url: photos[1],
            borderRadius: 8,
            zIndex: 5
          });
          if (captions[1]) {
            pageElements.push({
              id: `${newPageId}_caption2`,
              type: "text",
              x: 415,
              y: imgY + imgH + 4,
              width: 335,
              height: 20,
              text: captions[1],
              fontSize: 9,
              fontFamily: "Poppins",
              italic: true,
              align: "center",
              color: "#475569"
            });
          }
        } else if (photos.length === 3) {
          const imgH = Math.min((availableHeight - 50) / 2, 160);
          pageElements.push({ id: `${newPageId}_img1`, type: "image", x: 50, y: imgY, width: 335, height: imgH, url: photos[0], borderRadius: 8 });
          pageElements.push({ id: `${newPageId}_img2`, type: "image", x: 415, y: imgY, width: 335, height: imgH, url: photos[1], borderRadius: 8 });
          pageElements.push({ id: `${newPageId}_img3`, type: "image", x: 175, y: imgY + imgH + 15, width: 450, height: imgH, url: photos[2], borderRadius: 8 });
        } else {
          const imgH = Math.min((availableHeight - 50) / 2, 160);
          pageElements.push({ id: `${newPageId}_img1`, type: "image", x: 50, y: imgY, width: 335, height: imgH, url: photos[0], borderRadius: 8 });
          pageElements.push({ id: `${newPageId}_img2`, type: "image", x: 415, y: imgY, width: 335, height: imgH, url: photos[1], borderRadius: 8 });
          pageElements.push({ id: `${newPageId}_img3`, type: "image", x: 50, y: imgY + imgH + 20, width: 335, height: imgH, url: photos[2], borderRadius: 8 });
          pageElements.push({ id: `${newPageId}_img4`, type: "image", x: 415, y: imgY + imgH + 20, width: 335, height: imgH, url: photos[3], borderRadius: 8 });
        }
      }
    }

    const mainPage: Page = {
      id: newPageId,
      elements: pageElements
    };

    const pagesList: Page[] = [mainPage];

    // If photos overflow the page height limit
    if (photos.length > 4 || availableHeight < 200) {
      const startingIndex = availableHeight >= 200 ? 4 : 0;
      let remaining = photos.slice(startingIndex);
      let localIndex = startingIndex;
      while (remaining.length > 0) {
        const chunk = remaining.slice(0, 6);
        const galleryPage = makeGalleryPageObj(chunk, localIndex);
        pagesList.push(galleryPage);
        remaining = remaining.slice(6);
        localIndex += 6;
      }
    }

    // Overwrite first page if it is blank
    const isFirstPageBlank =
      activeProject.pages.length === 1 &&
      (activeProject.pages[0].elements.length <= 1 ||
       (activeProject.pages[0].elements.length === 2 &&
        activeProject.pages[0].elements.some(el => el.id.includes('bg') || el.id.includes('page_1_bg'))));

    const updatedPages = [...activeProject.pages];
    if (isFirstPageBlank) {
      updatedPages[0] = {
        ...updatedPages[0],
        id: newPageId,
        elements: pageElements
      };
      if (pagesList.length > 1) {
        pagesList.slice(1).forEach(p => updatedPages.push(p));
      }
    } else {
      pagesList.forEach(p => updatedPages.push(p));
    }

    const updatedProject = {
      ...activeProject,
      pages: updatedPages
    };

    loadProject(updatedProject);
    setActivePageId(newPageId);
    await saveProject(updatedProject);

    // Reset Generator Inputs
    setEventTitle("");
    setEventDate("");
    setResourcePerson("");
    setParticipants("");
    setAdditionalKeywords("");
    setPhotos([]);
    setCaptions([]);
    setGeneratedArticle("");
    setCustomCategory("");
    alert("Newsletter page successfully generated and appended!");
  };
  */

  // Pre-configured Unsplash academic sample links
  const sampleImages = [
    { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80', label: 'Group Coding' },
    { url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80', label: 'Presentation' },
    { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80', label: 'Graduation' },
    { url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=400&q=80', label: 'Athletics' }
  ];

  return (
    <div className="w-[420px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden select-none">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
        <div>
          <h3 className="font-extrabold text-sm text-secondary dark:text-white">Content Wizard</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Build and populate your newsletter pages with ease.</p>
        </div>
        <button
          onClick={() => setShowFullGenModal(true)}
          className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] font-extrabold rounded-lg shadow-sm flex items-center space-x-1 transition-all cursor-pointer"
          title="Paste monthly updates or notes to generate all 8 newsletter pages in 1 click"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>🚀 Full Newsletter AI</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-500">
        <button
          onClick={() => setSubMode('form')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            subMode === 'form' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Form Editor
        </button>
        <button
          onClick={() => setSubMode('generator')}
          className={`flex-1 py-3 text-center border-b-2 transition-all ${
            subMode === 'generator' 
              ? 'border-primary text-primary bg-primary/5' 
              : 'border-transparent hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Page Generator (AI)
        </button>
      </div>

      {subMode === 'form' ? (
        <div className="flex-grow overflow-y-auto max-h-full divide-y divide-slate-100 dark:divide-slate-800">
          {/* SECTION 1: Masthead & Header */}
          <AccordionSection
            title="1. Masthead & Header"
            isOpen={openSection === 'header'}
            onToggle={() => setOpenSection(openSection === 'header' ? '' : 'header')}
            icon={Type}
          >
            {hasElement('college_title') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">College / Institute Title</label>
                <input
                  type="text"
                  value={getElementText('college_title')}
                  onChange={e => handleTextChange('college_title', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('newsletter_title') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Newsletter Title</label>
                <input
                  type="text"
                  value={getElementText('newsletter_title')}
                  onChange={e => handleTextChange('newsletter_title', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('dept_tag') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Department Tag</label>
                <input
                  type="text"
                  value={getElementText('dept_tag')}
                  onChange={e => handleTextChange('dept_tag', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('volume_text') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Issue & Date Metadata</label>
                <input
                  type="text"
                  value={getElementText('volume_text')}
                  onChange={e => handleTextChange('volume_text', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}
            
            {!hasElement('college_title') && !hasElement('newsletter_title') && !hasElement('dept_tag') && !hasElement('volume_text') && (
              <p className="text-[11px] text-slate-400 py-3 italic">This layout does not contain standard header elements on the active page.</p>
            )}
          </AccordionSection>

          {/* SECTION 2: Main News Article */}
          <AccordionSection
            title="2. Main News Article"
            isOpen={openSection === 'article'}
            onToggle={() => setOpenSection(openSection === 'article' ? '' : 'article')}
            icon={BookOpen}
          >
            {hasElement('headline') || hasElement('content_title') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Main Article Headline</label>
                <input
                  type="text"
                  value={getElementText(hasElement('headline') ? 'headline' : 'content_title')}
                  onChange={e => handleTextChange(hasElement('headline') ? 'headline' : 'content_title', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('sub_headline') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Article Subheading</label>
                <input
                  type="text"
                  value={getElementText('sub_headline')}
                  onChange={e => handleTextChange('sub_headline', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('content_desc') || hasElement('editorial_head') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Article Body Content</label>
                <textarea
                  rows={5}
                  value={getElementText(hasElement('content_desc') ? 'content_desc' : 'editorial_head')}
                  onChange={e => handleTextChange(hasElement('content_desc') ? 'content_desc' : 'editorial_head', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium leading-relaxed"
                />
              </div>
            ) : null}

            {hasElement('principal_msg') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Principal Message / Editorial Note</label>
                <textarea
                  rows={4}
                  value={getElementText('principal_msg')}
                  onChange={e => handleTextChange('principal_msg', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium leading-relaxed"
                />
              </div>
            ) : null}

            {!hasElement('headline') && !hasElement('content_title') && !hasElement('content_desc') && !hasElement('principal_msg') && (
              <p className="text-[11px] text-slate-400 py-3 italic">This layout does not contain main article components on the active page.</p>
            )}
          </AccordionSection>

          {/* SECTION 3: Secondary Features & Columns */}
          <AccordionSection
            title="3. Secondary Features & Columns"
            isOpen={openSection === 'features'}
            onToggle={() => setOpenSection(openSection === 'features' ? '' : 'features')}
            icon={BookOpen}
          >
            {hasElement('event_title') || hasElement('table_title') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Secondary Section Headline</label>
                <input
                  type="text"
                  value={getElementText(hasElement('event_title') ? 'event_title' : 'table_title')}
                  onChange={e => handleTextChange(hasElement('event_title') ? 'event_title' : 'table_title', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary font-medium"
                />
              </div>
            ) : null}

            {hasElement('event_desc') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Secondary Section Body</label>
                <textarea
                  rows={4}
                  value={getElementText('event_desc')}
                  onChange={e => handleTextChange('event_desc', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary font-medium leading-relaxed"
                />
              </div>
            ) : null}

            {hasElement('col_left') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Left Column Column Copy</label>
                <textarea
                  rows={4}
                  value={getElementText('col_left')}
                  onChange={e => handleTextChange('col_left', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary font-medium leading-relaxed"
                />
              </div>
            ) : null}

            {hasElement('col_right') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Right Column / Message Copy</label>
                <textarea
                  rows={4}
                  value={getElementText('col_right')}
                  onChange={e => handleTextChange('col_right', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary font-medium leading-relaxed"
                />
              </div>
            ) : null}

            {!hasElement('event_title') && !hasElement('table_title') && !hasElement('event_desc') && !hasElement('col_left') && !hasElement('col_right') && (
              <p className="text-[11px] text-slate-400 py-3 italic">This layout does not contain dual column article structures on the active page.</p>
            )}
          </AccordionSection>

          {/* SECTION 4: Document Images */}
          <AccordionSection
            title="4. Document Images"
            isOpen={openSection === 'images'}
            onToggle={() => setOpenSection(openSection === 'images' ? '' : 'images')}
            icon={ImageIcon}
          >
            {['news_img', 'event_img', 'principal_img', 'hod_img'].map(imgId => {
              if (!hasElement(imgId)) return null;
              
              const fieldLabel = imgId === 'news_img' ? 'Primary Article Photo' :
                                 imgId === 'event_img' ? 'Secondary Feature Photo' :
                                 imgId === 'principal_img' ? 'Principal Portrait' :
                                 'HOD Portrait';
                                 
              return (
                <div key={imgId} className="space-y-2 p-3 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">{fieldLabel}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 overflow-hidden flex-shrink-0">
                      <img src={getElementUrl(imgId)} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow space-y-1.5">
                      <input
                        type="text"
                        placeholder="Paste Image URL"
                        value={getElementUrl(imgId)}
                        onChange={e => handleImageChange(imgId, e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-slate-800 dark:text-slate-100 focus:outline-none bg-slate-50 dark:bg-slate-900"
                      />
                      <label className="flex items-center justify-center space-x-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/15 text-primary text-[10px] font-bold rounded-lg cursor-pointer transition-colors w-max">
                        <Upload className="w-3 h-3" />
                        <span>Upload Local Photo</span>
                        <input
                          type="file"
                          accept="*"
                          onChange={e => handleLocalImageUpload(imgId, e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Quick Stock Swapper */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                    <span className="text-[8px] font-bold text-slate-400 uppercase block">Quick Swap Campus Presets:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {sampleImages.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleImageChange(imgId, s.url)}
                          className="h-8 bg-slate-100 border border-slate-200/50 rounded overflow-hidden hover:border-primary hover:shadow-xs transition-all"
                          title={s.label}
                        >
                          <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleAutoCaptionAndBalancePhotos}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ AI Auto-Caption & Balance Photo Layout</span>
              </button>
            </div>

            {!hasElement('news_img') && !hasElement('event_img') && !hasElement('principal_img') && !hasElement('hod_img') && (
              <p className="text-[11px] text-slate-400 py-3 italic">This layout does not contain visual image tags on the active page.</p>
            )}
          </AccordionSection>

          {/* SECTION 5: Footer Settings */}
          <AccordionSection
            title="5. Footer Settings"
            isOpen={openSection === 'footer'}
            onToggle={() => setOpenSection(openSection === 'footer' ? '' : 'footer')}
            icon={Type}
          >
            {hasElement('footer_text') ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Footer Copyright & Branding</label>
                <input
                  type="text"
                  value={getElementText('footer_text')}
                  onChange={e => handleTextChange('footer_text', e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 py-3 italic">This layout does not contain footer brand elements on the active page.</p>
            )}
          </AccordionSection>
        </div>
      ) : (
        /* Dynamic A4 Structured Page Generator (AI Panel) */
        <div className="flex-grow overflow-y-auto max-h-full p-5 space-y-5 text-left bg-white dark:bg-slate-900">
          
          {/* Page Pagination Selector */}
          <div className="space-y-1.5 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Active Page Navigation ({activeProject.pages.length} Pages)
              </label>
              <button
                onClick={addPage}
                className="flex items-center space-x-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[10px] font-extrabold transition-all cursor-pointer"
                title="Add new page to newsletter"
              >
                <Plus className="w-3 h-3" />
                <span>Add Page</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-850 max-h-28 overflow-y-auto">
              {activeProject.pages.map((_, idx) => idx + 1).map(num => {
                const isSelected = activePageNum === num;
                return (
                  <button
                    key={num}
                    onClick={() => handlePageSelect(num)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-slate-650 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inbuilt AI Auto-Generate Button for Current Active Page */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-primary/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Inbuilt AI Copywriter (Page {activePageNum})</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full uppercase tracking-wider">
                Inbuilt AI
              </span>
            </div>
            <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Click below to let Inbuilt AI auto-generate professional academic news content, headlines, dates, and articles for Page {activePageNum} and apply them directly into your layout.
            </p>
            <button
              onClick={() => handleInbuiltAiGenerateCurrentPage(activePageNum)}
              disabled={isGeneratingArticle}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingArticle ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>AI Writing Content for Page {activePageNum}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                  <span>✨ Auto-Generate Page {activePageNum} Content with Inbuilt AI</span>
                </>
              )}
            </button>
          </div>

          {/* Render Page-Specific Form or Warnings */}
          {activePageNum === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Page 1: Cover Page Editor</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">College Name</label>
                  <input
                    type="text"
                    value={getElementText('p1_kprcas_logo_text')}
                    onChange={e => handleTextChange('p1_kprcas_logo_text', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">School Name</label>
                  <input
                    type="text"
                    value={getElementText('p1_school_text')}
                    onChange={e => handleTextChange('p1_school_text', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Department Name</label>
                  <input
                    type="text"
                    value={getElementText('p1_dept_text').replace("DEPARTMENT OF ", "")}
                    onChange={e => handleUpdateDeptGlobally(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Newsletter Title / Masthead</label>
                  <input
                    type="text"
                    value={getElementText('p1_newsletter_title') || getElementText('p1_title_hdr') || 'CTRL+READ'}
                    onChange={e => handleUpdateTitleGlobally(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Issue Date / Month Year</label>
                  <input
                    type="text"
                    value={getElementText('p1_date_hdr')}
                    onChange={e => handleUpdateDateGlobally(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Cover Image URL</label>
                  <input
                    type="text"
                    value={getElementUrl('p1_cover_img')}
                    onChange={e => handleImageChange('p1_cover_img', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                  <div className="pt-1">
                    <label className="text-[8px] text-slate-500 font-bold block mb-1">OR UPLOAD LOCAL IMAGE:</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p1_cover_img', e)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Cover Image Caption</label>
                  <input
                    type="text"
                    value={getElementText('p1_cover_caption')}
                    onChange={e => handleTextChange('p1_cover_caption', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </div>
            </div>
          ) : (activePageNum === activeProject.pages.length && activePageNum > 1) ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Page {activePageNum}: Editorial Board Editor</span>
              </div>
              <div className="space-y-3">
                <h5 className="text-[10px] font-extrabold text-primary border-b border-slate-100 dark:border-slate-800 pb-0.5">1. Chief Editor</h5>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Name</label>
                  <input
                    type="text"
                    value={getElementText('p8_name_chief')}
                    onChange={e => handleTextChange('p8_name_chief', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Role / Designation</label>
                  <input
                    type="text"
                    value={getElementText('p8_desig_chief') || getElementText('p8_role_chief') || 'ASSOCIATE PROFESSOR AND HEAD'}
                    onChange={e => {
                      handleTextChange('p8_desig_chief', e.target.value);
                      handleTextChange('p8_role_chief', e.target.value);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Department</label>
                  <input
                    type="text"
                    value={getElementText('p8_dept_chief') || 'DEPT. OF INFORMATION TECHNOLOGY'}
                    onChange={e => handleTextChange('p8_dept_chief', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Photo URL</label>
                  <input
                    type="text"
                    value={getElementUrl('p8_pic_chief')}
                    onChange={e => handleImageChange('p8_pic_chief', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                  <div className="pt-1">
                    <label className="text-[8px] text-slate-500 font-bold block mb-1">OR UPLOAD PHOTO:</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p8_pic_chief', e)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                </div>

                <h5 className="text-[10px] font-extrabold text-primary border-b border-slate-100 dark:border-slate-800 pt-2 pb-0.5">2. Co-Editor</h5>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Name</label>
                  <input
                    type="text"
                    value={getElementText('p8_name_co') || 'MR. AKHIL K M'}
                    onChange={e => handleTextChange('p8_name_co', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Role / Designation</label>
                  <input
                    type="text"
                    value={getElementText('p8_desig_co') || getElementText('p8_role_co') || 'ASSISTANT PROFESSOR'}
                    onChange={e => {
                      handleTextChange('p8_desig_co', e.target.value);
                      handleTextChange('p8_role_co', e.target.value);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Department</label>
                  <input
                    type="text"
                    value={getElementText('p8_dept_co') || 'DEPT. OF INFORMATION TECHNOLOGY'}
                    onChange={e => handleTextChange('p8_dept_co', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Photo URL</label>
                  <input
                    type="text"
                    value={getElementUrl('p8_pic_co')}
                    onChange={e => handleImageChange('p8_pic_co', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                  <div className="pt-1">
                    <label className="text-[8px] text-slate-500 font-bold block mb-1">OR UPLOAD PHOTO:</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p8_pic_co', e)}
                      className="text-[10px] text-slate-550 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Page {activePageNum} Form: {activeProject.pages[activePageNum - 1]?.title || `Page ${activePageNum}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAutoFixCurrentPageForm}
                  className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[9px] rounded-lg transition-all flex items-center space-x-1 shadow-xs"
                  title="Automatically fix casing across all form fields: sentence case for descriptions & title case for headlines."
                >
                  <Type className="w-3 h-3" />
                  <span>✨ Auto-Fix Form Caps/Small</span>
                </button>
              </div>

              {/* User Choice Editable Page Section Title & Category Field for Page 2+ */}
              {activePageNum > 1 && activePageNum < activeProject.pages.length && (
                <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 rounded-xl space-y-2.5 shadow-sm">
                  {/* Smart Document Auto-Parser Upload Banner */}
                  <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 block">📄 Smart Document Auto-Parser</span>
                        <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80 block">Upload circular/report to auto-fill form & copy</span>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md"
                        onChange={handleParseUploadedDocument}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider block">
                      Page {activePageNum} Category / Content Type *
                    </label>
                    <select
                      value={getPageCategory(activePageNum)}
                      onChange={e => handleSetPageCategory(activePageNum, e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-indigo-400/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                    >
                      <option value="student">🎓 Student Achievements & Web Apps / Hackathons</option>
                      <option value="faculty">👨‍🏫 Faculty Achievements & Research Papers</option>
                      <option value="placement">💼 Campus Placements & Recruitment Drives</option>
                      <option value="workshop">🛠️ Workshops, Seminars & Guest Lectures</option>
                      <option value="welcome">🎉 Freshers Welcome & Orientation / Induction</option>
                      <option value="custom">📌 Custom Event / Activity</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider block">
                      Page {activePageNum} Section Title (User Choice) *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter custom title e.g. Student Achievements, Faculty Achievements, Freshers Orientation..."
                      value={activeProject.pages[activePageNum - 1]?.title || ''}
                      onChange={e => handleUpdatePageTitle(activePageNum - 1, e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-indigo-400/40 dark:border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>
              )}

              {/* Page 1 Specific Fields */}
              {activePageNum === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">College / Institution Name</label>
                    <input
                      type="text"
                      value={getElementText('p1_kprcas_logo_text') || getElementText('p1_college_text') || 'KPR College of Arts Science and Research'}
                      onChange={e => {
                        handleTextChange('p1_kprcas_logo_text', e.target.value);
                        handleTextChange('p1_college_text', e.target.value);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">School Name</label>
                    <input
                      type="text"
                      value={getElementText('p1_school_text') || 'SCHOOL OF COMPUTING SCIENCE'}
                      onChange={e => handleTextChange('p1_school_text', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Department Name</label>
                    <input
                      type="text"
                      value={getElementText('p1_dept_text') || getElementText('p1_dept_hdr') || 'DEPARTMENT OF INFORMATION TECHNOLOGY'}
                      onChange={e => handleUpdateDeptGlobally(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Newsletter Masthead / Title</label>
                    <input
                      type="text"
                      value={getElementText('p1_title_hdr') || 'CTRL+READ'}
                      onChange={e => handleUpdateTitleGlobally(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Issue Date / Edition</label>
                    <input
                      type="text"
                      value={getElementText('p1_date_hdr') || 'JUNE 2026'}
                      onChange={e => handleUpdateDateGlobally(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">KPRCAS Logo Image</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p1_kprcas_logo', e)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Launch IT Logo Image</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p1_launchit_logo', e)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Main Campus Cover Photo</label>
                    <input
                      type="file"
                      accept="*"
                      onChange={e => handleLocalImageUpload('p1_cover_img', e)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Dynamic Category Content Form Fields for Pages 2 to 7 */}
              {activePageNum > 1 && activePageNum < activeProject.pages.length && (
                <div className="space-y-3">
                  {getPageCategory(activePageNum) === 'student' && (
                    <>
                      <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300">Need sample student achievement copy?</span>
                        <button
                          type="button"
                          onClick={() => handleQuickFillStudentDemo(activePageNum)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded-lg transition-all shadow-xs flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>⚡ Quick Fill Demo</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Event / Web App Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Secure Online Voting System"
                          value={getStudentForm(activePageNum).title}
                          onChange={e => updateStudentForm(activePageNum, 'title', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Student Developers / Achievers *</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Mr. Rahul S, Mr. Sathish G, Mr. Yokesh K, Ms. Pradakshina S K, Mr. Prakash K, Ms. Pradeepa S, and Ms. Prada S"
                          value={getStudentForm(activePageNum).student}
                          onChange={e => updateStudentForm(activePageNum, 'student', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Class & Section</label>
                        <input
                          type="text"
                          placeholder="e.g. III B.Sc IT 'B'"
                          value={getStudentForm(activePageNum).classDept}
                          onChange={e => updateStudentForm(activePageNum, 'classDept', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Project Purpose / Award *</label>
                        <input
                          type="text"
                          placeholder="e.g. Department Association Office Bearer Selection"
                          value={getStudentForm(activePageNum).award}
                          onChange={e => updateStudentForm(activePageNum, 'award', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Dignitaries Present (Principal, Deans, HODs)</label>
                        <input
                          type="text"
                          placeholder="e.g. Respected Principal Dr. P. Geetha, Deans of various schools, and Heads of Departments"
                          value={getStudentForm(activePageNum).host}
                          onChange={e => updateStudentForm(activePageNum, 'host', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Key Project Details / Highlights</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. The developed system was actively used to conduct the association office bearer elections smoothly and securely..."
                          value={getStudentForm(activePageNum).details}
                          onChange={e => updateStudentForm(activePageNum, 'details', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Additional Keywords</label>
                        <input
                          type="text"
                          placeholder="e.g. Executive presentation, Web App deployment, Leadership appreciation"
                          value={getStudentForm(activePageNum).keywords}
                          onChange={e => updateStudentForm(activePageNum, 'keywords', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}

                  {getPageCategory(activePageNum) === 'faculty' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Faculty Member Name(s) *</label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. S. Srividhya, Associate Professor & Head"
                          value={getFacultyForm(activePageNum).faculty}
                          onChange={e => updateFacultyForm(activePageNum, 'faculty', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Paper Title / Achievement *</label>
                        <input
                          type="text"
                          placeholder="e.g. Deep Learning Framework for Agricultural Disease Prediction"
                          value={getFacultyForm(activePageNum).paper}
                          onChange={e => updateFacultyForm(activePageNum, 'paper', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Publication / Journal / Host Institution *</label>
                        <input
                          type="text"
                          placeholder="e.g. IEEE Transactions on Artificial Intelligence"
                          value={getFacultyForm(activePageNum).journal}
                          onChange={e => updateFacultyForm(activePageNum, 'journal', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Publication Date / Edition *</label>
                        <input
                          type="text"
                          placeholder="e.g. June 2026"
                          value={getFacultyForm(activePageNum).date}
                          onChange={e => updateFacultyForm(activePageNum, 'date', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Key Technical Contribution / Highlights</label>
                        <textarea
                          rows={3}
                          placeholder="e.g. Achieved 98.7% classification accuracy using customized Vision Transformers..."
                          value={getFacultyForm(activePageNum).contribution}
                          onChange={e => updateFacultyForm(activePageNum, 'contribution', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}

                  {getPageCategory(activePageNum) === 'placement' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Recruiter Company *</label>
                        <input
                          type="text"
                          placeholder="e.g. Zoho Corporation"
                          value={getPlacementForm(activePageNum).company}
                          onChange={e => updatePlacementForm(activePageNum, 'company', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Job Role / Domain *</label>
                        <input
                          type="text"
                          placeholder="e.g. Associate Software Engineer"
                          value={getPlacementForm(activePageNum).domain}
                          onChange={e => updatePlacementForm(activePageNum, 'domain', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Placed Student Count *</label>
                        <input
                          type="text"
                          placeholder="e.g. 14 students of BCA"
                          value={getPlacementForm(activePageNum).count}
                          onChange={e => updatePlacementForm(activePageNum, 'count', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Salary Package Offered</label>
                        <input
                          type="text"
                          placeholder="e.g. 5.6 LPA"
                          value={getPlacementForm(activePageNum).package}
                          onChange={e => updatePlacementForm(activePageNum, 'package', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Key recruitment highlights</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Multiple coding rounds, 4 students cleared advanced test..."
                          value={getPlacementForm(activePageNum).highlights}
                          onChange={e => updatePlacementForm(activePageNum, 'highlights', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}

                  {getPageCategory(activePageNum) === 'workshop' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Workshop / Seminar Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Seminar on Cloud Computing and AWS"
                          value={getWorkshopForm(activePageNum).title}
                          onChange={e => updateWorkshopForm(activePageNum, 'title', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Resource Person / Speaker *</label>
                        <input
                          type="text"
                          placeholder="e.g. Mr. Rajesh K, Solutions Architect"
                          value={getWorkshopForm(activePageNum).speaker}
                          onChange={e => updateWorkshopForm(activePageNum, 'speaker', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Date *</label>
                        <input
                          type="text"
                          placeholder="e.g. 18 June 2026"
                          value={getWorkshopForm(activePageNum).date}
                          onChange={e => updateWorkshopForm(activePageNum, 'date', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Audience / Attendees</label>
                        <input
                          type="text"
                          placeholder="e.g. 120 students of II & III BCA"
                          value={getWorkshopForm(activePageNum).audience}
                          onChange={e => updateWorkshopForm(activePageNum, 'audience', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Technical Topics Covered</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. AWS EC2, S3 bucket storage, cloud security, serverless computing..."
                          value={getWorkshopForm(activePageNum).topics}
                          onChange={e => updateWorkshopForm(activePageNum, 'topics', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}

                  {getPageCategory(activePageNum) === 'welcome' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Orientation Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Freshers Welcome & Orientation 2026"
                          value={getWelcomeForm(activePageNum).title}
                          onChange={e => updateWelcomeForm(activePageNum, 'title', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Chief Guest / Key Speaker *</label>
                        <input
                          type="text"
                          placeholder="e.g. Dr. M. Anand, Principal"
                          value={getWelcomeForm(activePageNum).guest}
                          onChange={e => updateWelcomeForm(activePageNum, 'guest', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Date *</label>
                        <input
                          type="text"
                          placeholder="e.g. 05 July 2026"
                          value={getWelcomeForm(activePageNum).date}
                          onChange={e => updateWelcomeForm(activePageNum, 'date', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Brief orientation highlights</label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Curricular opportunities, laboratory protocols, department rules introduction..."
                          value={getWelcomeForm(activePageNum).highlights}
                          onChange={e => updateWelcomeForm(activePageNum, 'highlights', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}

                  {getPageCategory(activePageNum) === 'custom' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Event / Activity Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Annual Department Cultural Fest & Technical Symposium"
                          value={getCustomForm(activePageNum).title}
                          onChange={e => updateCustomForm(activePageNum, 'title', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Primary Person / Guest</label>
                        <input
                          type="text"
                          placeholder="e.g. Chief Guest / Faculty Head"
                          value={getCustomForm(activePageNum).person}
                          onChange={e => updateCustomForm(activePageNum, 'person', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Event Highlights / Details</label>
                        <textarea
                          rows={3}
                          placeholder="Enter event highlights, key achievements, or activity summaries..."
                          value={getCustomForm(activePageNum).details}
                          onChange={e => updateCustomForm(activePageNum, 'details', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Dynamic Content Page Fields for Page 8+ (when not last page) */}
              {activePageNum >= 8 && activePageNum < activeProject.pages.length && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Event / Activity Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Annual Department Cultural Fest & Technical Symposium"
                      value={getFormVal(activePageNum, 'title')}
                      onChange={e => setFormVal(activePageNum, 'title', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Primary Person / Guest</label>
                      <input
                        type="text"
                        placeholder="e.g. Chief Guest / Faculty Head"
                        value={getFormVal(activePageNum, 'person')}
                        onChange={e => setFormVal(activePageNum, 'person', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase block">Recipient / Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g. BCA / BSc Students"
                        value={getFormVal(activePageNum, 'recipient')}
                        onChange={e => setFormVal(activePageNum, 'recipient', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Event Highlights / Details</label>
                    <textarea
                      rows={2}
                      placeholder="Enter event highlights, key achievements, or activity summaries..."
                      value={getFormVal(activePageNum, 'details')}
                      onChange={e => setFormVal(activePageNum, 'details', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block">Keywords / Tags</label>
                    <input
                      type="text"
                      placeholder="e.g. Hackathon, Awards, Workshops, Cultural"
                      value={getFormVal(activePageNum, 'keywords')}
                      onChange={e => setFormVal(activePageNum, 'keywords', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-855 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Editorial Board Specific Fields (rendered on LAST page) */}
              {(activePageNum === activeProject.pages.length && activePageNum > 1) && (
                <div className="space-y-4">
                  {/* Chief Editor Card */}
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center justify-between">
                      <span>1. Chief Editor</span>
                    </h5>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Name</label>
                      <input
                        type="text"
                        value={getElementText('p8_name_chief') || "DR. S. SRIVIDHYA"}
                        onChange={e => handleTextChange('p8_name_chief', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Role / Designation</label>
                      <input
                        type="text"
                        value={getElementText('p8_desig_chief') || "ASSOCIATE PROFESSOR AND HEAD"}
                        onChange={e => handleTextChange('p8_desig_chief', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Department</label>
                      <input
                        type="text"
                        value={getElementText('p8_dept_chief') || "DEPT. OF INFORMATION TECHNOLOGY"}
                        onChange={e => handleTextChange('p8_dept_chief', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Upload Chief Editor Photo</label>
                      <input
                        type="file"
                        accept="*"
                        onChange={e => handleEditorPhotoUpload('p8_pic_chief', e)}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Co-Editor Card */}
                  <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                    <h5 className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center justify-between">
                      <span>2. Co-Editor</span>
                    </h5>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Name</label>
                      <input
                        type="text"
                        value={getElementText('p8_name_co') || "MR. AKHIL K M"}
                        onChange={e => handleTextChange('p8_name_co', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Role / Designation</label>
                      <input
                        type="text"
                        value={getElementText('p8_desig_co') || "ASSISTANT PROFESSOR"}
                        onChange={e => handleTextChange('p8_desig_co', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Department</label>
                      <input
                        type="text"
                        value={getElementText('p8_dept_co') || "DEPT. OF INFORMATION TECHNOLOGY"}
                        onChange={e => handleTextChange('p8_dept_co', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1 pt-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Upload Co-Editor Photo</label>
                      <input
                        type="file"
                        accept="*"
                        onChange={e => handleEditorPhotoUpload('p8_pic_co', e)}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Event Photographs Section */}
              <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-extrabold text-secondary dark:text-white uppercase tracking-wider">
                    2. Event Photographs
                  </h4>
                  <label className="flex items-center space-x-1.5 px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-lg cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="*"
                      onChange={handleMultiplePhotosUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {photos.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No photographs uploaded yet. Standard layout spacing will adapt automatically.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl">
                        <div className="w-12 h-12 rounded bg-slate-100 border border-slate-250 dark:border-slate-800 overflow-hidden flex-shrink-0">
                          <img src={photo} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow space-y-1">
                          <input
                            type="text"
                            placeholder="Image caption"
                            value={captions[idx] || ""}
                            onChange={(e) => updateCaption(idx, e.target.value)}
                            className="w-full border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-[9px] text-slate-800 dark:text-slate-100 focus:outline-none bg-white dark:bg-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newImageEl = {
                              id: `p${activePageNum}_img_single_${Date.now()}`,
                              type: 'image' as const,
                              x: 100,
                              y: 500,
                              width: 600,
                              height: 420,
                              url: photo,
                              borderRadius: 12,
                              shadow: 'md' as const,
                              rotation: 0,
                              opacity: 100
                            };
                            const targetPage = activeProject.pages[pageIndex];
                            if (targetPage) {
                              updatePageElements(targetPage.id, [...targetPage.elements, newImageEl]);
                              alert(`Photo added to Page ${activePageNum}!`);
                            }
                          }}
                          className="px-2 py-1 bg-primary text-white hover:bg-primary-dark rounded text-[9px] font-bold transition-colors flex-shrink-0"
                          title="Add photo to current canvas page"
                        >
                          + Add to Page
                        </button>
                        <button
                          onClick={() => removePhoto(idx)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-650 rounded text-slate-400 transition-colors"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tone Selection & Action Trigger Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Select Writing Tone & Style
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    {[
                      { id: 'encouraging', label: '🎉 Encouraging & Proud', desc: 'Warm, congratulatory' },
                      { id: 'inspiring', label: '🏆 High Impact & Inspiring', desc: 'Excellence & leadership' },
                      { id: 'academic', label: '🎓 Academic & Formal', desc: 'Research & publications' },
                      { id: 'shorter', label: '⚡ Short & Punchy', desc: 'Compact summary' },
                    ].map(toneOpt => (
                      <button
                        key={toneOpt.id}
                        type="button"
                        onClick={() => setSelectedTone(toneOpt.id)}
                        className={`p-2 rounded-lg text-left transition-all ${
                          selectedTone === toneOpt.id
                            ? 'bg-primary text-white font-extrabold shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold border border-slate-150 dark:border-slate-800'
                        }`}
                      >
                        <div className="text-[10px] truncate">{toneOpt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isGeneratingArticle}
                  onClick={() => triggerGenerateArticle(selectedTone)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors shadow-sm ${
                    isGeneratingArticle
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-dark"
                  }`}
                >
                  {isGeneratingArticle ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating article copy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate AI Copy ({selectedTone === 'encouraging' ? 'Encouraging' : selectedTone === 'inspiring' ? 'High Impact' : selectedTone === 'academic' ? 'Academic' : 'Short'})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Generated Result Preview Area */}
              {generatedArticle && (
                <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-extrabold text-secondary dark:text-white uppercase tracking-wider">
                      3. Generated Article Preview
                    </h4>
                    <span className="text-[9px] text-slate-450 font-bold uppercase">Editable</span>
                  </div>

                  <textarea
                    rows={6}
                    value={generatedArticle}
                    onChange={e => setGeneratedArticle(e.target.value)}
                    className="w-full border border-slate-250 dark:border-slate-800 bg-slate-55 dark:bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed font-sans font-medium"
                  />

                  {/* Tone modifiers grid */}
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <button
                      disabled={isGeneratingArticle}
                      onClick={() => triggerGenerateArticle("standard")}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Regenerate</span>
                    </button>
                    <button
                      disabled={isGeneratingArticle}
                      onClick={() => triggerGenerateArticle("shorter")}
                      className="py-1.5 bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors"
                    >
                      Make Shorter
                    </button>
                    <button
                      disabled={isGeneratingArticle}
                      onClick={() => triggerGenerateArticle("professional")}
                      className="py-1.5 bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors"
                    >
                      Make Professional
                    </button>
                    <button
                      disabled={isGeneratingArticle}
                      onClick={() => triggerGenerateArticle("grammar")}
                      className="py-1.5 bg-slate-55 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors"
                    >
                      Improve Grammar
                    </button>
                  </div>
                </div>
              )}

              {/* Always visible Save / Apply page elements button */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleApplyToActivePage}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Content to Page {activePageNum}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal for 1-Click Full Newsletter Generator */}
      {showFullGenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-text">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">🚀 1-Click Multi-Page Full Newsletter AI Generator</h3>
                  <p className="text-[11px] text-slate-500">Paste your raw department event notes or monthly updates below.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullGenModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Monthly Events Raw Notes / Bullet Points *
              </label>
              <textarea
                rows={8}
                placeholder="Paste raw notes, WhatsApp messages, or event summaries for the month e.g.&#10;1. Hackathon winner Rahul S B.Sc IT developed Secure Voting System.&#10;2. Placement drive Zoho hired 14 BCA students at 5.6 LPA.&#10;3. AWS Workshop by Mr. Rajesh K attended by 120 students.&#10;4. Dr. Srividhya published IEEE research paper on Vision Transformers."
                value={fullGenNotes}
                onChange={e => setFullGenNotes(e.target.value)}
                className="w-full border border-slate-250 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowFullGenModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingFull}
                onClick={handleGenerateFullNewsletter}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {isGeneratingFull ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating All Pages...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Full Newsletter (All Pages)</span>
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

export default ContentWizardPanel;
