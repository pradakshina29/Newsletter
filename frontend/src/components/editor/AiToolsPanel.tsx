import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { Sparkles, Image, BookOpen, AlertCircle, Plus, LayoutTemplate } from 'lucide-react';

const AiToolsPanel: React.FC = () => {
  const { addElement, setEntireProject, isGenerating, setIsGenerating } = useEditor();

  // AI Title Generator States
  const [dept, setDept] = useState<string>('Computer Science');
  const [event, setEvent] = useState<string>('National AI Hackathon');
  const [keywords, setKeywords] = useState<string>('Machine Learning, IoT');
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

  // Auto-Generate 8-Page Newsletter States
  const [autoGenPrompt, setAutoGenPrompt] = useState<string>('');

  const triggerAutoGenerate = async () => {
    if (!autoGenPrompt.trim()) return;
    setEntireProject([]); // Clear canvas state (Rule 12: Clear old content before generation)
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/generate-newsletter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: autoGenPrompt })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.pages && Array.isArray(data.pages)) {
          setEntireProject(data.pages);
          alert("8-Page Newsletter generated successfully!");
        }
      } else {
        alert("Failed to generate newsletter.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating newsletter.");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerTitleAI = async () => {
    setGeneratingTitles(true);
    setAiTitles([]);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/titles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ department: dept, event, keywords, category: 'Academic' })
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/images', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/ai/${action}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  return (
    <div className="w-[420px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden select-none">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 className="font-extrabold text-sm text-secondary dark:text-white flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span>AI Writing & Design Tools</span>
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Generate titles, visuals, and copy in one click.</p>
      </div>

      <div className="flex-grow overflow-y-auto max-h-full p-5 space-y-6">
        
        {/* 0. Auto Generate Newsletter */}
        <div className="space-y-4 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl">
          <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
            <LayoutTemplate className="w-4 h-4 text-indigo-500" />
            <span>Full 8-Page Newsletter Generator</span>
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Paste Monthly Event Report Data</label>
              <textarea
                rows={4}
                value={autoGenPrompt}
                onChange={e => setAutoGenPrompt(e.target.value)}
                placeholder="Paste the raw text of events, student achievements, and faculty news here to auto-generate the complete 8-page newsletter matching the official template..."
                className="w-full border border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            
            <button
              disabled={isGenerating || !autoGenPrompt.trim()}
              onClick={triggerAutoGenerate}
              className={`w-full py-2 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors ${
                isGenerating || !autoGenPrompt.trim() 
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              }`}
            >
              {isGenerating ? 'Generating 8 pages...' : '⚡ Generate Complete Newsletter'}
            </button>
          </div>
        </div>

        {/* 1. AI Title Generator */}
        <div className="space-y-4 p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI Masthead Title Generator</span>
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Department</label>
              <input
                type="text"
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Core Event Name</label>
              <input
                type="text"
                value={event}
                onChange={e => setEvent(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Focus Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            
            <button
              disabled={generatingTitles}
              onClick={triggerTitleAI}
              className="w-full py-2 bg-primary text-white font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-primary-dark transition-colors"
            >
              {generatingTitles ? 'AI composing...' : '✨ Generate Title suggestions'}
            </button>
          </div>

          {/* Title Results */}
          {aiTitles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Select to insert:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {aiTitles.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => addElement('text', { text: t.title, fontSize: 24, bold: true })}
                    className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800 rounded-xl transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block leading-tight">{t.title}</span>
                      <span className="text-[9px] text-slate-450 italic mt-0.5 block">{t.style} • {t.description}</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. AI Image Generator */}
        <div className="space-y-4 p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <Image className="w-4 h-4 text-emerald-500" />
            <span>AI Image Creator</span>
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Text Prompt</label>
              <textarea
                rows={2}
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Visual Style</label>
              <select
                value={imageStyle}
                onChange={e => setImageStyle(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 focus:outline-none font-medium"
              >
                <option value="Realistic Photography">Realistic Photography</option>
                <option value="Digital Illustration">Digital Illustration</option>
                <option value="Vintage Editorial Print">Vintage Editorial Print</option>
                <option value="Campus Concept Art">Campus Concept Art</option>
              </select>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase block">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1">
                {['🎓 Graduation Ceremony', '🏆 Sports Day', '🌱 NSS Activity', '💻 Coding Competition'].map(q => (
                  <button
                    key={q}
                    onClick={() => setImagePrompt(q.substring(2))}
                    className="px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[9px] text-slate-600 dark:text-slate-350 rounded transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={generatingImages}
              onClick={triggerImageAI}
              className="w-full py-2 bg-primary text-white font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-primary-dark transition-colors"
            >
              {generatingImages ? 'AI drawing...' : '✨ Generate AI Visual'}
            </button>
          </div>

          {/* Image Results */}
          {aiImages.length > 0 && (
            <div className="pt-2 border-t border-slate-150 dark:border-slate-850">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Click image to add:</span>
              <div className="grid grid-cols-2 gap-2">
                {aiImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => addElement('image', { url: img.url })}
                    className="relative h-24 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:scale-102 transition-all group"
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <span className="px-2 py-1 bg-white text-secondary text-[8px] font-extrabold rounded-md shadow">Add</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. AI Text Copilot */}
        <div className="space-y-4 p-4 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span>AI Copywriting Assistant</span>
          </h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Input Article / Draft Content</label>
              <textarea
                rows={3}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste your rough news report or message copy here..."
                className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                disabled={analyzingText}
                onClick={() => triggerTextAI('summarize')}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors"
              >
                Summarize
              </button>
              <button
                disabled={analyzingText}
                onClick={() => triggerTextAI('grammar')}
                className="flex-1 py-2 bg-slate-750 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-colors"
              >
                Grammar Check
              </button>
            </div>
          </div>

          {analyzingText && (
            <div className="flex items-center justify-center py-4 space-x-2">
              <span className="w-4.5 h-4.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-slate-400 font-medium">AI composing copy...</span>
            </div>
          )}

          {/* Text Result */}
          {aiResultText && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-250/50 dark:border-slate-800 rounded-xl space-y-2.5 text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase">AI Copilot Result:</span>
              <p className="text-[10px] text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{aiResultText}</p>
              
              {grammarIssues.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {grammarIssues.map((issue, index) => (
                    <div key={index} className="flex space-x-1.5 text-[9px] text-red-650 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-150/40 dark:border-red-950/30">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
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
                className="w-full py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold text-[9px] rounded-lg transition-colors block text-center uppercase tracking-wider"
              >
                Insert onto page canvas
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AiToolsPanel;
