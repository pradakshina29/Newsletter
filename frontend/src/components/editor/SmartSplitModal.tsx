import React, { useState } from 'react';
import { Scissors, AlertTriangle, Check, X, MoveVertical } from 'lucide-react';
import { PDFPageObject } from '../../utils/pdfRenderer';

interface SmartSplitModalProps {
  pdfPage: PDFPageObject;
  targetPageNum: number;
  onAutoSplit: () => void;
  onManualSplit: (splitPercentage: number) => void;
  onKeepAsOne: () => void;
  onCancel: () => void;
}

const SmartSplitModal: React.FC<SmartSplitModalProps> = ({
  pdfPage,
  targetPageNum,
  onAutoSplit,
  onManualSplit,
  onKeepAsOne,
  onCancel,
}) => {
  const [mode, setMode] = useState<'choice' | 'manual'>('choice');
  const [splitPos, setSplitPos] = useState<number>(50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Content Exceeds Page Space</h3>
              <p className="text-[11px] text-slate-400">PDF Page {pdfPage.pageNum} requires additional space for Template Page {targetPageNum}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {mode === 'choice' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* PDF Preview Thumbnail */}
              <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Original PDF Page {pdfPage.pageNum}</span>
                <div className="w-48 h-64 border border-slate-700 rounded-lg overflow-hidden shadow-md bg-white">
                  <img src={pdfPage.dataUrl} alt={`PDF Page ${pdfPage.pageNum}`} className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  The uploaded PDF page has high content density. Choose how to split or fit it into the newsletter template:
                </p>

                {/* Auto Split Option */}
                <button
                  onClick={onAutoSplit}
                  className="w-full p-3.5 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-500 hover:to-primary-dark text-left rounded-xl border border-indigo-400/30 transition-all shadow-md group flex items-start space-x-3"
                >
                  <div className="p-2 bg-white/10 rounded-lg text-white group-hover:scale-110 transition-transform">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <span>Smart Auto Split</span>
                      <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-extrabold rounded">Recommended</span>
                    </h4>
                    <p className="text-[10px] text-indigo-100 mt-0.5">
                      Automatically splits content across Template Page {targetPageNum} & Page {targetPageNum + 1} preserving reading order.
                    </p>
                  </div>
                </button>

                {/* Manual Split Option */}
                <button
                  onClick={() => setMode('manual')}
                  className="w-full p-3.5 bg-slate-800/80 hover:bg-slate-800 text-left rounded-xl border border-slate-700 transition-all group flex items-start space-x-3"
                >
                  <div className="p-2 bg-slate-700 rounded-lg text-slate-200 group-hover:scale-110 transition-transform">
                    <MoveVertical className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Manual Cut Slider</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Interactively drag a horizontal split line over the PDF page to customize the exact cut point.
                    </p>
                  </div>
                </button>

                {/* Keep as One Page Option */}
                <button
                  onClick={onKeepAsOne}
                  className="w-full p-3 bg-slate-800/40 hover:bg-slate-800/60 text-left rounded-xl border border-slate-800 transition-all flex items-center space-x-3"
                >
                  <div className="p-1.5 bg-slate-700/50 rounded-lg text-slate-300">
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Keep as One Page</h4>
                    <p className="text-[10px] text-slate-400">Scale proportionally to fit single template page without splitting.</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Manual Split Interactive Cut Slider */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300">Drag Split Line to Adjust Cut Position ({splitPos}% / {100 - splitPos}%)</span>
                <button
                  onClick={() => setMode('choice')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Back to options
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* PDF Canvas with Cut Line */}
                <div className="relative w-64 h-80 mx-auto bg-slate-950 border border-slate-700 rounded-xl overflow-hidden flex flex-col items-center justify-center p-2 shadow-inner">
                  <div className="relative w-full h-full bg-white rounded overflow-hidden">
                    <img src={pdfPage.dataUrl} alt="PDF Page Cut Preview" className="w-full h-full object-contain pointer-events-none" />
                    
                    {/* Draggable Cut Line */}
                    <div
                      style={{ top: `${splitPos}%` }}
                      className="absolute left-0 right-0 h-1 bg-amber-400 shadow-md flex items-center justify-center -translate-y-1/2 cursor-ns-resize z-20 group"
                    >
                      <div className="px-3 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[9px] rounded-full shadow-lg border border-amber-300 flex items-center space-x-1 uppercase tracking-wider">
                        <MoveVertical className="w-3 h-3" />
                        <span>SPLIT HERE ({splitPos}%)</span>
                      </div>
                    </div>

                    {/* Top Portion Highlight */}
                    <div
                      style={{ height: `${splitPos}%` }}
                      className="absolute top-0 left-0 right-0 bg-blue-500/10 border-b border-blue-400/30 pointer-events-none"
                    >
                      <span className="absolute top-1 left-2 text-[9px] font-extrabold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">PAGE {targetPageNum} (TOP)</span>
                    </div>

                    {/* Bottom Portion Highlight */}
                    <div
                      style={{ height: `${100 - splitPos}%`, bottom: 0 }}
                      className="absolute left-0 right-0 bg-emerald-500/10 border-t border-emerald-400/30 pointer-events-none"
                    >
                      <span className="absolute bottom-1 left-2 text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">PAGE {targetPageNum + 1} (BOTTOM)</span>
                    </div>
                  </div>
                </div>

                {/* Live Side-by-Side Preview */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Cut Height Adjustment</label>
                    <input
                      type="range"
                      min={20}
                      max={80}
                      value={splitPos}
                      onChange={e => setSplitPos(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Template Page {targetPageNum}:</span>
                      <span className="text-blue-400">{splitPos}% Height</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Template Page {targetPageNum + 1}:</span>
                      <span className="text-emerald-400">{100 - splitPos}% Height</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onManualSplit(splitPos)}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 border border-emerald-400/30"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Apply Manual Split ({splitPos}% / {100 - splitPos}%)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSplitModal;
