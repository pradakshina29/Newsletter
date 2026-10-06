import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crop, Check, X, RotateCw, ZoomIn, ZoomOut, Maximize2, Square, Image as ImageIcon } from 'lucide-react';

interface ImageCropModalProps {
  imageUrl: string;
  onApplyCrop: (croppedDataUrl: string, croppedWidth: number, croppedHeight: number) => void;
  onClose: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageUrl, onApplyCrop, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null); // null = freeform
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  
  // Crop area coordinates in canvas space (percentages or pixels)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10,
    y: 10,
    width: 80,
    height: 80
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Adjust crop box according to selected aspect ratio
  const applyRatio = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (!ratio) return;

    setCropBox(prev => {
      let newW = prev.width;
      let newH = newW / ratio;
      if (newH > 90) {
        newH = 90;
        newW = newH * ratio;
      }
      return {
        ...prev,
        width: Math.min(90, newW),
        height: Math.min(90, newH)
      };
    });
  };

  // Render crop preview canvas
  const drawCanvas = useCallback(() => {
    if (!imgElement || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerW = canvas.parentElement?.clientWidth || 500;
    const containerH = 380;
    canvas.width = containerW;
    canvas.height = containerH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Move to center for rotation & scaling
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate scale factor to fit image inside viewport canvas
    const imgAspect = imgElement.width / imgElement.height;
    let drawW = containerW * 0.8;
    let drawH = drawW / imgAspect;

    if (drawH > containerH * 0.8) {
      drawH = containerH * 0.8;
      drawW = drawH * imgAspect;
    }

    // Draw source image centered
    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Dark overlay background for non-cropped area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate crop rectangle in pixel coordinates
    const cropPixelX = (cropBox.x / 100) * canvas.width;
    const cropPixelY = (cropBox.y / 100) * canvas.height;
    const cropPixelW = (cropBox.width / 100) * canvas.width;
    const cropPixelH = (cropBox.height / 100) * canvas.height;

    // Clear background inside crop box (reveal original image)
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropPixelX, cropPixelY, cropPixelW, cropPixelH);
    ctx.clip();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop box outline & handles
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropPixelX, cropPixelY, cropPixelW, cropPixelH);

    // Draw rule of thirds grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical grid
    ctx.moveTo(cropPixelX + cropPixelW / 3, cropPixelY);
    ctx.lineTo(cropPixelX + cropPixelW / 3, cropPixelY + cropPixelH);
    ctx.moveTo(cropPixelX + (cropPixelW * 2) / 3, cropPixelY);
    ctx.lineTo(cropPixelX + (cropPixelW * 2) / 3, cropPixelY + cropPixelH);
    // Horizontal grid
    ctx.moveTo(cropPixelX, cropPixelY + cropPixelH / 3);
    ctx.lineTo(cropPixelX + cropPixelW, cropPixelY + cropPixelH / 3);
    ctx.moveTo(cropPixelX, cropPixelY + (cropPixelH * 2) / 3);
    ctx.lineTo(cropPixelX + cropPixelW, cropPixelY + (cropPixelH * 2) / 3);
    ctx.stroke();

    // Corner handle handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;

    const corners = [
      { x: cropPixelX, y: cropPixelY },
      { x: cropPixelX + cropPixelW, y: cropPixelY },
      { x: cropPixelX, y: cropPixelY + cropPixelH },
      { x: cropPixelX + cropPixelW, y: cropPixelY + cropPixelH }
    ];

    corners.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, handleSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

  }, [imgElement, cropBox, zoom, rotation]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle Dragging crop box
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cropPixelX = (cropBox.x / 100) * rect.width;
    const cropPixelY = (cropBox.y / 100) * rect.height;
    const cropPixelW = (cropBox.width / 100) * rect.width;
    const cropPixelH = (cropBox.height / 100) * rect.height;

    // Check corner handles
    const handleThresh = 15;
    if (Math.abs(clickX - (cropPixelX + cropPixelW)) < handleThresh && Math.abs(clickY - (cropPixelY + cropPixelH)) < handleThresh) {
      setDragHandle('se');
    } else if (Math.abs(clickX - cropPixelX) < handleThresh && Math.abs(clickY - cropPixelY) < handleThresh) {
      setDragHandle('nw');
    } else if (clickX >= cropPixelX && clickX <= cropPixelX + cropPixelW && clickY >= cropPixelY && clickY <= cropPixelY + cropPixelH) {
      setDragHandle('move');
    } else {
      setDragHandle(null);
    }

    setIsDragging(true);
    setDragStart({ x: clickX, y: clickY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current || !dragHandle) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const deltaXPercent = ((mouseX - dragStart.x) / rect.width) * 100;
    const deltaYPercent = ((mouseY - dragStart.y) / rect.height) * 100;

    setCropBox(prev => {
      if (dragHandle === 'move') {
        const newX = Math.max(0, Math.min(100 - prev.width, prev.x + deltaXPercent));
        const newY = Math.max(0, Math.min(100 - prev.height, prev.y + deltaYPercent));
        return { ...prev, x: newX, y: newY };
      } else if (dragHandle === 'se') {
        let newW = Math.max(10, Math.min(100 - prev.x, prev.width + deltaXPercent));
        let newH = Math.max(10, Math.min(100 - prev.y, prev.height + deltaYPercent));
        if (aspectRatio) {
          newH = newW / aspectRatio;
        }
        return { ...prev, width: newW, height: newH };
      } else if (dragHandle === 'nw') {
        let newW = Math.max(10, prev.width - deltaXPercent);
        let newH = Math.max(10, prev.height - deltaYPercent);
        let newX = Math.max(0, prev.x + deltaXPercent);
        let newY = Math.max(0, prev.y + deltaYPercent);
        if (aspectRatio) {
          newH = newW / aspectRatio;
        }
        return { x: newX, y: newY, width: newW, height: newH };
      }
      return prev;
    });

    setDragStart({ x: mouseX, y: mouseY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  // Generate cropped image output
  const handleSaveCroppedImage = () => {
    if (!imgElement) return;

    // Create an offscreen canvas to perform high-resolution precision crop
    const cropCanvas = document.createElement('canvas');
    const displayW = containerRef.current?.clientWidth || 500;
    const displayH = 380;

    const cropPixelX = (cropBox.x / 100) * displayW;
    const cropPixelY = (cropBox.y / 100) * displayH;
    const cropPixelW = (cropBox.width / 100) * displayW;
    const cropPixelH = (cropBox.height / 100) * displayH;

    // Source image dimensions and scaling inside display canvas
    const imgAspect = imgElement.width / imgElement.height;
    let drawW = displayW * 0.8;
    let drawH = drawW / imgAspect;

    if (drawH > displayH * 0.8) {
      drawH = displayH * 0.8;
      drawW = drawH * imgAspect;
    }

    const scaleX = imgElement.width / drawW;
    const scaleY = imgElement.height / drawH;

    const imgLeftInDisplay = (displayW - drawW) / 2;
    const imgTopInDisplay = (displayH - drawH) / 2;

    const srcX = Math.max(0, (cropPixelX - imgLeftInDisplay) * scaleX);
    const srcY = Math.max(0, (cropPixelY - imgTopInDisplay) * scaleY);
    const srcW = Math.min(imgElement.width - srcX, cropPixelW * scaleX);
    const srcH = Math.min(imgElement.height - srcY, cropPixelH * scaleY);

    const targetW = Math.max(50, Math.round(srcW));
    const targetH = Math.max(50, Math.round(srcH));

    cropCanvas.width = targetW;
    cropCanvas.height = targetH;

    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    if (rotation !== 0) {
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(imgElement, srcX, srcY, srcW, srcH, -targetW / 2, -targetH / 2, targetW, targetH);
    } else {
      ctx.drawImage(imgElement, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
    }

    const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.95);
    onApplyCrop(croppedDataUrl, targetW, targetH);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Crop & Edit Image</h3>
              <p className="text-[10px] text-slate-400">Drag crop boundaries or select aspect ratio preset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Canvas Area */}
        <div ref={containerRef} className="relative w-full h-[380px] bg-slate-950 flex items-center justify-center overflow-hidden select-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="cursor-crosshair"
          />
        </div>

        {/* Aspect Ratio & Transform Toolbar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-3">
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Aspect Ratio:</span>
            <div className="flex space-x-1.5">
              {[
                { label: 'Freeform', ratio: null, icon: Maximize2 },
                { label: '1:1 Square', ratio: 1.0, icon: Square },
                { label: '4:3 Standard', ratio: 4 / 3, icon: ImageIcon },
                { label: '16:9 Wide', ratio: 16 / 9, icon: ImageIcon },
                { label: '3:2 Classic', ratio: 3 / 2, icon: ImageIcon }
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => applyRatio(opt.ratio)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    aspectRatio === opt.ratio
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
            {/* Zoom & Rotation */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="p-1 hover:text-white bg-slate-800 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold min-w-[30px] text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(Math.min(3.0, zoom + 0.1))}
                  className="p-1 hover:text-white bg-slate-800 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1"
                title="Rotate 90° Right"
              >
                <RotateCw className="w-3 h-3" />
                <span>Rotate ({rotation}°)</span>
              </button>
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCroppedImage}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-primary text-white font-extrabold rounded-xl text-xs shadow-md hover:shadow-lg transition-all flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ImageCropModal;
