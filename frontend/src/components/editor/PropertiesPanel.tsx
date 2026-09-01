import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { CanvasElement, TableElement } from '../../types/editor';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Trash2, Copy, Lock, Unlock, ArrowUp, ArrowDown, Sparkles, Wand2, Type } from 'lucide-react';
import { detectAndFixCase } from '../../utils/textCase';

const FONTS = ['Poppins', 'Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Monospace'];

const PropertiesPanel: React.FC = () => {
  const {
    activeProject,
    selectedElementId,
    activePageId,
    snapToGrid,
    showBleed,
    updateElement,
    deleteElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    setSnapToGrid,
    setShowBleed,
    updateTheme
  } = useEditor();

  const [aiLoading, setAiLoading] = useState<boolean>(false);

  if (!activeProject || !activePageId) return null;

  const page = activeProject.pages.find(p => p.id === activePageId);
  const selectedElement = page?.elements.find(el => el.id === selectedElementId);

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedElementId) {
      updateElement(selectedElementId, updates);
    }
  };

  const handleAiRewrite = async (tone: string) => {
    if (!selectedElement || !(selectedElement as any).text) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: (selectedElement as any).text, tone })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rewritten) {
          handleUpdate({ text: data.rewritten });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Render general location, rotation, opacity controls (for all elements)
  const renderGeneralControls = (el: CanvasElement) => {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Position & Transform</h4>
        
        {/* X, Y, Width, Height */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 border border-slate-200/50 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold w-4">X:</span>
            <input
              type="number"
              value={Math.round(el.x)}
              onChange={e => handleUpdate({ x: parseInt(e.target.value) || 0 })}
              className="bg-transparent text-[11px] font-medium text-slate-700 w-full focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 border border-slate-200/50 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold w-4">Y:</span>
            <input
              type="number"
              value={Math.round(el.y)}
              onChange={e => handleUpdate({ y: parseInt(e.target.value) || 0 })}
              className="bg-transparent text-[11px] font-medium text-slate-700 w-full focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 border border-slate-200/50 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold w-4">W:</span>
            <input
              type="number"
              value={Math.round(el.width)}
              onChange={e => handleUpdate({ width: parseInt(e.target.value) || 1 })}
              className="bg-transparent text-[11px] font-medium text-slate-700 w-full focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 border border-slate-200/50 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold w-4">H:</span>
            <input
              type="number"
              value={Math.round(el.height)}
              onChange={e => handleUpdate({ height: parseInt(e.target.value) || 1 })}
              className="bg-transparent text-[11px] font-medium text-slate-700 w-full focus:outline-none"
            />
          </div>
        </div>

        {/* Rotate & Opacity */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Rotation ({el.rotation}°)</span>
            <input
              type="range"
              min="0"
              max="360"
              value={el.rotation}
              onChange={e => handleUpdate({ rotation: parseInt(e.target.value) })}
              className="w-2/3 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>Opacity ({el.opacity}%)</span>
            <input
              type="range"
              min="0"
              max="100"
              value={el.opacity}
              onChange={e => handleUpdate({ opacity: parseInt(e.target.value) })}
              className="w-2/3 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Layer order & lock */}
        <div className="flex space-x-2">
          <button
            onClick={() => bringToFront(el.id)}
            className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold text-slate-600 flex items-center justify-center space-x-1"
            title="Bring Layer to Front"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Forward</span>
          </button>
          <button
            onClick={() => sendToBack(el.id)}
            className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold text-slate-600 flex items-center justify-center space-x-1"
            title="Send Layer to Back"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Backward</span>
          </button>
          <button
            onClick={() => handleUpdate({ locked: !el.locked })}
            className={`p-2 border rounded-xl flex items-center justify-center ${
              el.locked ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'
            }`}
            title={el.locked ? 'Unlock element' : 'Lock element'}
          >
            {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Duplicate & Delete element */}
        <div className="flex space-x-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => duplicateElement(el.id)}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-bold text-slate-700 flex items-center justify-center space-x-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={() => deleteElement(el.id)}
            className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold flex items-center justify-center space-x-1.5 border border-red-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  };

  const renderContentProperties = () => {
    if (!selectedElement) {
      const bgElement = page?.elements.find(el => el.id.endsWith('_bg') || el.id === 'bg');
      const currentBgColor = bgElement ? (bgElement as any).fillColor || '#ffffff' : '#ffffff';

      const newspaperPresets = [
        { name: 'Warm Newsprint', color: '#F9F6EE' },
        { name: 'Aged Parchment', color: '#F5EBE0' },
        { name: 'Classic Newsprint', color: '#F4F1EA' },
        { name: 'Warm Cream', color: '#FDFBF7' },
        { name: 'Antique Tan', color: '#EFEBE0' },
        { name: 'Soft Off-White', color: '#FAFAFA' },
        { name: 'Pure White', color: '#FFFFFF' },
        { name: 'Light Slate', color: '#F1F5F9' },
      ];

      const changePageBgColor = (newColor: string) => {
        if (bgElement) {
          updateElement(bgElement.id, { fillColor: newColor });
        }
      };

      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Document & Page Properties</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Customize page setups and newspaper background feel.</p>
          </div>

          {/* Newspaper Background Colors for Current Page */}
          <div className="space-y-3 p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-extrabold text-amber-900">Page Background Color</h4>
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">{currentBgColor}</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Set custom background colors for Page {activeProject.pages.findIndex(p => p.id === activePageId) + 1} to give your department publication an authentic newsprint feel.
            </p>
            
            <div className="grid grid-cols-2 gap-2 pt-1">
              {newspaperPresets.map((preset) => (
                <button
                  key={preset.color}
                  onClick={() => changePageBgColor(preset.color)}
                  className={`p-2 rounded-xl border flex items-center space-x-2 text-left transition-all ${
                    currentBgColor === preset.color ? 'border-amber-600 ring-2 ring-amber-500/20 font-bold bg-white' : 'border-slate-200 hover:border-slate-300 bg-white/80'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" style={{ backgroundColor: preset.color }} />
                  <span className="text-[10px] text-slate-800 font-semibold truncate">{preset.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-200/40">
              <span className="text-xs text-slate-700 font-semibold">Custom Page Color</span>
              <input
                type="color"
                value={currentBgColor}
                onChange={(e) => changePageBgColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                (activeProject.pages || []).forEach(p => {
                  const bg = p.elements.find(el => el.id.endsWith('_bg') || el.id === 'bg');
                  if (bg) {
                    updateElement(bg.id, { fillColor: currentBgColor });
                  }
                });
              }}
              className="w-full mt-2 py-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Apply Color to All {activeProject.pages.length} Pages</span>
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {/* Margins & Guidelines */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Guides & Alignment</h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-slate-600 font-semibold select-none cursor-pointer">
                  <span>Smart Snap Alignment</span>
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={e => setSnapToGrid(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-600 font-semibold select-none cursor-pointer">
                  <span>Show Bleed Boundaries</span>
                  <input
                    type="checkbox"
                    checked={showBleed}
                    onChange={e => setShowBleed(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                  />
                </label>
              </div>
            </div>

            {/* Custom Theme Config */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Theme Colors</h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">Primary Color</span>
                  <input
                    type="color"
                    value={activeProject.theme.primary}
                    onChange={e => updateTheme({ primary: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">Secondary Navy</span>
                  <input
                    type="color"
                    value={activeProject.theme.secondary}
                    onChange={e => updateTheme({ secondary: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">Accent Orange</span>
                  <input
                    type="color"
                    value={activeProject.theme.accent}
                    onChange={e => updateTheme({ accent: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Text Properties
    if (selectedElement.type === 'text') {
      const el = selectedElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Text Properties</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Customize font size, weight, and styling.</p>
          </div>

          <div className="space-y-4">
            {/* Text Editor area */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span>Text Copy</span>
                <span className="text-[9px] text-primary flex items-center space-x-1 font-extrabold uppercase">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>AI Copilot</span>
                </span>
              </label>
              <textarea
                rows={4}
                value={el.text}
                onChange={e => handleUpdate({ text: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none bg-slate-50 placeholder-slate-400"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdate({ text: detectAndFixCase(el.text, 'auto') })}
                  className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[9px] rounded-lg transition-all flex items-center space-x-1 shadow-xs"
                  title="Automatically fix casing: capitalizes start of sentences and preserves acronyms like KPRCAS, IT, AI, HOD."
                >
                  <Type className="w-2.5 h-2.5" />
                  <span>✨ Auto Fix Caps/Small</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ text: detectAndFixCase(el.text, 'title') })}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg transition-all border border-slate-200"
                  title="Convert to Headline Title Case"
                >
                  <span>Title Case</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ text: detectAndFixCase(el.text, 'upper') })}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg transition-all border border-slate-200"
                  title="UPPERCASE"
                >
                  <span>UPPER</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ text: detectAndFixCase(el.text, 'lower') })}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg transition-all border border-slate-200"
                  title="lowercase"
                >
                  <span>lower</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => handleAiRewrite('academic')}
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[9px] rounded-lg transition-all flex items-center space-x-1 border border-indigo-100"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>AI Polish</span>
                </button>
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => handleAiRewrite('shorten')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg transition-all flex items-center border border-slate-200"
                >
                  <span>Shorten</span>
                </button>
                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={() => handleAiRewrite('tamil')}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[9px] rounded-lg transition-all flex items-center border border-amber-100"
                >
                  <span>Translate Tamil</span>
                </button>
                {aiLoading && (
                  <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin self-center ml-1" />
                )}
              </div>
            </div>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Font Family</label>
                <select
                  value={el.fontFamily}
                  onChange={e => handleUpdate({ fontFamily: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
                >
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Font Size</label>
                <input
                  type="number"
                  value={el.fontSize}
                  onChange={e => handleUpdate({ fontSize: parseInt(e.target.value) || 8 })}
                  className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Typography Styles & Alignment buttons */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Alignment & Formatting</label>
              <div className="flex space-x-2">
                {/* Formatting */}
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => handleUpdate({ bold: !el.bold })}
                    className={`p-2 transition-all ${el.bold ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdate({ italic: !el.italic })}
                    className={`p-2 transition-all ${el.italic ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleUpdate({ underline: !el.underline })}
                    className={`p-2 transition-all ${el.underline ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  {(['left', 'center', 'right', 'justify'] as const).map(align => {
                    const Icon = 
                      align === 'left' ? AlignLeft :
                      align === 'center' ? AlignCenter :
                      align === 'right' ? AlignRight : AlignJustify;
                    return (
                      <button
                        key={align}
                        onClick={() => handleUpdate({ align })}
                        className={`p-2 transition-all ${el.align === align ? 'bg-primary text-white' : 'hover:bg-slate-50 text-slate-500'}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Color Swatch */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600 font-semibold">Font Color</span>
              <input
                type="color"
                value={el.color}
                onChange={e => handleUpdate({ color: e.target.value })}
                className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
              />
            </div>

            {/* Spacing adjustments */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Letter Spacing ({el.letterSpacing}px)</span>
                <input
                  type="range"
                  min="-2"
                  max="10"
                  value={el.letterSpacing}
                  onChange={e => handleUpdate({ letterSpacing: parseFloat(e.target.value) })}
                  className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Line Height ({el.lineHeight})</span>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.1"
                  value={el.lineHeight}
                  onChange={e => handleUpdate({ lineHeight: parseFloat(e.target.value) })}
                  className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Word Spacing ({(el as any).wordSpacing || 0}px)</span>
                <input
                  type="range"
                  min="-5"
                  max="20"
                  step="1"
                  value={(el as any).wordSpacing || 0}
                  onChange={e => handleUpdate({ wordSpacing: parseInt(e.target.value) || 0 })}
                  className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
                />
              </div>
            </div>

          </div>
          {renderGeneralControls(el)}
        </div>
      );
    }

    // Image Properties
    if (selectedElement.type === 'image') {
      const el = selectedElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Image Properties</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Adjust image corners, shadows, and links.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Image URL Link</label>
              <input
                type="text"
                value={el.url}
                onChange={e => handleUpdate({ url: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Rounded Corner Slider */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2">
              <span>Border Radius ({el.borderRadius}px)</span>
              <input
                type="range"
                min="0"
                max="50"
                value={el.borderRadius}
                onChange={e => handleUpdate({ borderRadius: parseInt(e.target.value) })}
                className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
              />
            </div>

            {/* Shadow Select Dropdown */}
            <div className="space-y-1 pt-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Shadow Blur</label>
              <select
                value={el.shadow}
                onChange={e => handleUpdate({ shadow: e.target.value as 'none' | 'sm' | 'md' | 'lg' })}
                className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="none">No Shadow</option>
                <option value="sm">Soft Shadow</option>
                <option value="md">Medium Shadow</option>
                <option value="lg">Premium Depth</option>
              </select>
            </div>
          </div>

          {renderGeneralControls(el)}
        </div>
      );
    }

    // Shape Properties
    if (selectedElement.type === 'shape') {
      const el = selectedElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Shape settings</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Customize borders, colors, and geometries.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Shape ShapeType</label>
              <select
                value={el.shapeType}
                onChange={e => handleUpdate({ shapeType: e.target.value as 'rect' | 'circle' | 'triangle' })}
                className="w-full border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>

            {/* Colors */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">Fill Color</span>
                <input
                  type="color"
                  value={el.fillColor}
                  onChange={e => handleUpdate({ fillColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">Stroke Border Color</span>
                <input
                  type="color"
                  value={el.strokeColor === 'transparent' ? '#ffffff' : el.strokeColor}
                  onChange={e => handleUpdate({ strokeColor: e.target.value })}
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                />
              </div>
            </div>

            {/* Stroke Width Slider */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2">
              <span>Border Stroke ({el.strokeWidth}px)</span>
              <input
                type="range"
                min="0"
                max="10"
                value={el.strokeWidth}
                onChange={e => handleUpdate({ strokeWidth: parseInt(e.target.value), strokeColor: el.strokeColor === 'transparent' ? '#cbd5e1' : el.strokeColor })}
                className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
              />
            </div>

            {/* Border Radius for rect shapes */}
            {el.shapeType === 'rect' && (
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-2">
                <span>Rounded Corners ({el.borderRadius || 0}px)</span>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={el.borderRadius || 0}
                  onChange={e => handleUpdate({ borderRadius: parseInt(e.target.value) })}
                  className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          {renderGeneralControls(el)}
        </div>
      );
    }

    // QR Code Properties
    if (selectedElement.type === 'qrcode') {
      const el = selectedElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">QR Code Settings</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Specify scanning destinations.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Target Website URL</label>
              <input
                type="text"
                value={el.value}
                onChange={e => handleUpdate({ value: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none bg-slate-50"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600 font-semibold">QR Code Color</span>
              <input
                type="color"
                value={el.fgColor || '#0f172a'}
                onChange={e => handleUpdate({ fgColor: e.target.value })}
                className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
              />
            </div>
          </div>

          {renderGeneralControls(el)}
        </div>
      );
    }

    // Table Properties
    if (selectedElement.type === 'table') {
      const el = selectedElement as TableElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Data Table Grid</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Edit columns and cell rows values.</p>
          </div>

          <div className="space-y-4">
            {/* Headers input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Column Headers (Comma separated)</label>
              <input
                type="text"
                value={el.headers.join(', ')}
                onChange={e => {
                  const arr = e.target.value.split(',').map(s => s.trim());
                  handleUpdate({ headers: arr });
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Row editors */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">Grid Data Rows</label>
              {el.data.map((row, rIdx) => (
                <div key={rIdx} className="flex space-x-1.5">
                  {row.map((cell, cIdx) => (
                    <input
                      key={cIdx}
                      type="text"
                      value={cell}
                      onChange={e => {
                        const nextData = el.data.map((r, ri) => {
                          if (ri !== rIdx) return r;
                          return r.map((c, ci) => ci === cIdx ? e.target.value : c);
                        });
                        handleUpdate({ data: nextData });
                      }}
                      className="border border-slate-200 rounded p-1 text-[10px] w-full focus:outline-none focus:border-primary"
                    />
                  ))}
                  <button 
                    onClick={() => {
                      const nextData = el.data.filter((_, idx) => idx !== rIdx);
                      handleUpdate({ data: nextData, rows: nextData.length + 1 });
                    }} 
                    className="p-1 hover:bg-red-50 text-red-500 rounded border border-red-100 flex items-center justify-center flex-shrink-0"
                    title="Delete row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add row */}
            <button
              onClick={() => {
                const newRow = Array(el.cols).fill('New Cell');
                const nextData = [...el.data, newRow];
                handleUpdate({ data: nextData, rows: nextData.length + 1 });
              }}
              className="w-full py-1.5 border border-dashed border-primary/40 hover:bg-slate-50 text-primary text-[10px] font-bold rounded-lg transition-colors"
            >
              + Add New Data Row
            </button>
          </div>

          {renderGeneralControls(el)}
        </div>
      );
    }

    // Divider Properties
    if (selectedElement.type === 'divider') {
      const el = selectedElement;
      return (
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-sm text-secondary">Layout Divider Line</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Customize divider weights and styling.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
              <span>Thickness ({el.thickness}px)</span>
              <input
                type="range"
                min="1"
                max="10"
                value={el.thickness}
                onChange={e => handleUpdate({ thickness: parseInt(e.target.value) })}
                className="w-1/2 h-1 bg-slate-200 rounded-lg cursor-pointer accent-primary"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600 font-semibold">Line Color</span>
              <input
                type="color"
                value={el.color}
                onChange={e => handleUpdate({ color: e.target.value })}
                className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
              />
            </div>
          </div>

          {renderGeneralControls(el)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto max-h-full select-none">
      {renderContentProperties()}
    </div>
  );
};

export default PropertiesPanel;
