/**
 * Collapsible Bottom Control Dock adhering to Three.js skill guidelines:
 * Zero viewport occlusion, solid/rgba surfaces (no backdrop-filter over WebGL),
 * static indicators (no pulsating dots), and tabbed control sections.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Camera,
  Sun,
  Moon,
  Compass,
  Palette,
  Volume2,
  VolumeX,
  RotateCcw,
  Volume1,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CameraMode } from '../three/world';
import { BiomeType, BIOMES } from '../three/terrain';
import { VehicleType, VEHICLE_CONFIGS } from '../three/car';

interface ControlDockProps {
  cameraMode: CameraMode;
  onCameraChange: (mode: CameraMode) => void;
  biome: BiomeType;
  onBiomeChange: (biome: BiomeType) => void;
  timeOfDay: number;
  onTimeChange: (time: number) => void;
  vehicleType: VehicleType;
  onVehicleTypeChange: (type: VehicleType) => void;
  currentColorHex: number;
  onColorChange: (hex: number) => void;
  onRespawn: () => void;
  onHonk: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}

const CAR_COLORS = [
  { name: 'Racing Crimson', hex: 0xef4444, bg: '#ef4444' },
  { name: 'Cyber Cyan', hex: 0x06b6d4, bg: '#06b6d4' },
  { name: 'Electric Amber', hex: 0xf59e0b, bg: '#f59e0b' },
  { name: 'Emerald Speed', hex: 0x10b981, bg: '#10b981' },
  { name: 'Midnight Onyx', hex: 0x18181b, bg: '#18181b' },
  { name: 'Vapor Purple', hex: 0x8b5cf6, bg: '#8b5cf6' },
  { name: 'Polar White', hex: 0xf8fafc, bg: '#f8fafc' },
  { name: 'Hyper Lime', hex: 0x84cc16, bg: '#84cc16' },
];

export const ControlDock: React.FC<ControlDockProps> = ({
  cameraMode,
  onCameraChange,
  biome,
  onBiomeChange,
  timeOfDay,
  onTimeChange,
  vehicleType,
  onVehicleTypeChange,
  currentColorHex,
  onColorChange,
  onRespawn,
  onHonk,
  onToggleMute,
  isMuted,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'biome' | 'time' | 'vehicle'>('camera');

  const getTimeLabel = (t: number) => {
    if (t < 0.2) return 'Midnight 02:00';
    if (t < 0.35) return 'Dawn Sunrise 06:30';
    if (t < 0.65) return 'Bright Noon 12:00';
    if (t < 0.82) return 'Golden Sunset 18:45';
    return 'Twilight Night 22:30';
  };

  return (
    <div
      className="fixed bottom-3 inset-x-0 z-30 flex flex-col items-center pointer-events-none transition-transform duration-300 ease-out select-none"
      style={{
        transform: collapsed ? 'translateY(calc(100% - 38px))' : 'translateY(0)',
      }}
    >
      {/* Collapse Toggle Tab attached to top edge */}
      <div className="flex justify-center mb-1 pointer-events-auto">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono font-medium shadow-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Dock Container (Solid rgba surfaces, zero backdrop-filter) */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 text-slate-200 pointer-events-auto w-[94vw] max-w-3xl">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'camera'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>

            <button
              onClick={() => setActiveTab('biome')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'biome'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Biomes</span>
            </button>

            <button
              onClick={() => setActiveTab('time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'time'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Time of Day</span>
            </button>

            <button
              onClick={() => setActiveTab('vehicle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'vehicle'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Vehicle Paint</span>
            </button>
          </div>

          {/* Quick Actions (Honk, Respawn, Audio) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onHonk}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Honk Car Horn (H)"
            >
              <Volume1 className="w-3.5 h-3.5" />
              <span>HONK [H]</span>
            </button>

            <button
              onClick={onRespawn}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Reset Vehicle to Road (R)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>RESET [R]</span>
            </button>

            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Toggle Audio (L)"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="px-1 py-1">
          {/* CAMERA TAB */}
          {activeTab === 'camera' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <button
                onClick={() => onCameraChange('chase')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cameraMode === 'chase'
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs font-bold text-sky-400">CHASE CAM</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Smooth chase trail</div>
              </button>

              <button
                onClick={() => onCameraChange('drift')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cameraMode === 'drift'
                    ? 'bg-amber-950/80 border-amber-500 text-white shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
                  <span>DRIFT CAM</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">NEW</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Cinematic lag & wide swing</div>
              </button>

              <button
                onClick={() => onCameraChange('hood')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cameraMode === 'hood'
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs font-bold text-emerald-400">COCKPIT HOOD</div>
                <div className="text-[10px] text-slate-400 mt-0.5">High-speed bumper view</div>
              </button>

              <button
                onClick={() => onCameraChange('isometric')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cameraMode === 'isometric'
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs font-bold text-indigo-400">AERIAL DRONE</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Top-down isometric angle</div>
              </button>

              <button
                onClick={() => onCameraChange('free')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  cameraMode === 'free'
                    ? 'bg-sky-950/80 border-sky-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-xs font-bold text-purple-400">ORBIT INSPECT</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Free drag & zoom look</div>
              </button>
            </div>
          )}

          {/* BIOMES TAB */}
          {activeTab === 'biome' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(BIOMES) as BiomeType[]).map((bKey) => {
                const b = BIOMES[bKey];
                const isActive = biome === bKey;
                return (
                  <button
                    key={bKey}
                    onClick={() => onBiomeChange(bKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-slate-800 border-sky-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: `#${b.terrainColors.mid.toString(16).padStart(6, '0')}` }}
                      />
                      <span className="font-mono text-xs font-bold text-slate-200">{b.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {bKey === 'meadow' && 'Lush green pines & granite hills'}
                      {bKey === 'autumn' && 'Amber golden leaves & sunset valleys'}
                      {bKey === 'desert' && 'Red canyon plateaus & dunes'}
                      {bKey === 'cyber' && 'Neon gridways & luminescent trees'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* TIME OF DAY TAB */}
          {activeTab === 'time' && (
            <div className="flex flex-col gap-2 p-1">
              <div className="flex justify-between items-center text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Sun className="w-3.5 h-3.5" />
                  <span>ATMOSPHERE & CELESTIAL POSITION</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-semibold">
                  {getTimeLabel(timeOfDay)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={timeOfDay}
                  onChange={(e) => onTimeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                <span>00:00 (Midnight)</span>
                <span>06:00 (Dawn)</span>
                <span>12:00 (Noon)</span>
                <span>18:00 (Sunset)</span>
                <span>24:00 (Night)</span>
              </div>
            </div>
          )}

          {/* VEHICLE CUSTOMIZATION GARAGE TAB */}
          {activeTab === 'vehicle' && (
            <div className="flex flex-col gap-3 p-1">
              {/* Vehicle Models Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(VEHICLE_CONFIGS) as VehicleType[]).map((vKey) => {
                  const cfg = VEHICLE_CONFIGS[vKey];
                  const isActive = vehicleType === vKey;
                  return (
                    <button
                      key={vKey}
                      onClick={() => onVehicleTypeChange(vKey)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 border-sky-400 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-100">{cfg.name}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-sky-400/90 mt-0.5">
                        {cfg.category} • {Math.round(cfg.maxSpeed * 3.6)} KM/H
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {cfg.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Vehicle Paint Finishes Swatches */}
              <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2 flex-wrap">
                <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>PAINT FINISH:</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {CAR_COLORS.map((c) => {
                    const isSelected = currentColorHex === c.hex;
                    return (
                      <button
                        key={c.name}
                        onClick={() => onColorChange(c.hex)}
                        className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
                        title={c.name}
                      >
                        <div
                          className={`w-7 h-7 rounded-full border-2 transition-all shadow-md group-hover:scale-110 active:scale-95 ${
                            isSelected
                              ? 'border-white ring-2 ring-sky-400 scale-105'
                              : 'border-slate-700 hover:border-slate-400'
                          }`}
                          style={{ backgroundColor: c.bg }}
                        />
                        <span className="text-[10px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 whitespace-nowrap bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 z-20 pointer-events-none">
                          {c.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
