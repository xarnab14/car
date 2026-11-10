/**
 * Real-time 2D radar / minimap showing vehicle position, heading,
 * chunk grid boundaries, and road path.
 */

import React, { useEffect, useRef } from 'react';
import { Compass, Maximize2, Minimize2 } from 'lucide-react';

interface MinimapProps {
  carX: number;
  carZ: number;
  heading: number; // in radians
  visible: boolean;
  onToggle: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  carX,
  carZ,
  heading,
  visible,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 0.55; // pixels per world unit

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, width, height);

    // Grid lines (Chunk divisions: 70 units)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    const worldLeft = carX - centerX / scale;
    const worldRight = carX + centerX / scale;
    const worldTop = carZ - centerY / scale;
    const worldBottom = carZ + centerY / scale;

    const chunkSize = 70;
    const firstGridX = Math.floor(worldLeft / chunkSize) * chunkSize;
    for (let gx = firstGridX; gx <= worldRight; gx += chunkSize) {
      const screenX = centerX + (gx - carX) * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();
    }

    const firstGridZ = Math.floor(worldTop / chunkSize) * chunkSize;
    for (let gz = firstGridZ; gz <= worldBottom; gz += chunkSize) {
      const screenY = centerY + (gz - carZ) * scale;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();
    }

    // Draw winding highway road
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    let started = false;

    for (let px = 0; px <= width; px += 4) {
      const worldX = carX + (px - centerX) / scale;
      const roadZ = Math.sin(worldX * 0.012) * 55 + Math.cos(worldX * 0.004) * 80;
      const screenY = centerY + (roadZ - carZ) * scale;

      if (screenY >= -20 && screenY <= height + 20) {
        if (!started) {
          ctx.moveTo(px, screenY);
          started = true;
        } else {
          ctx.lineTo(px, screenY);
        }
      } else {
        started = false;
      }
    }
    ctx.stroke();

    // Radar circular range ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width * 0.42, 0, Math.PI * 2);
    ctx.stroke();

    // Car blip & Direction indicator
    ctx.save();
    ctx.translate(centerX, centerY);
    // Heading in 3D: headingAngle is around Y. In screen XZ plane, forward is +Z or sin/cos
    ctx.rotate(heading);

    // Car body triangle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 8); // front
    ctx.lineTo(-5, -7);
    ctx.lineTo(0, -4);
    ctx.lineTo(5, -7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 4, centerY);
    ctx.lineTo(centerX + 4, centerY);
    ctx.moveTo(centerX, centerY - 4);
    ctx.lineTo(centerX, centerY + 4);
    ctx.stroke();
  }, [carX, carZ, heading, visible]);

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-30 p-2.5 rounded-xl bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg transition-colors flex items-center gap-1.5 text-xs font-mono"
        title="Open Minimap (M)"
      >
        <Compass className="w-4 h-4 text-sky-400" />
        <span>MAP [M]</span>
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-30 flex flex-col items-end">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl">
        <div className="flex items-center justify-between pb-1.5 px-1 text-slate-300 text-xs font-mono">
          <span className="flex items-center gap-1 text-sky-400 font-semibold tracking-wider">
            <Compass className="w-3.5 h-3.5" /> RADAR
          </span>
          <button
            onClick={onToggle}
            className="p-1 hover:text-white text-slate-400 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative rounded-xl overflow-hidden border border-slate-800">
          <canvas
            ref={canvasRef}
            width={160}
            height={160}
            className="block"
          />
        </div>
        <div className="pt-1.5 px-1 flex justify-between text-[10px] font-mono text-slate-400">
          <span>X: {carX}</span>
          <span>Z: {carZ}</span>
        </div>
      </div>
    </div>
  );
};
