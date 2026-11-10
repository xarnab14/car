import React, { useState } from 'react';
import { HelpCircle, X, Navigation } from 'lucide-react';
import { WorldTelemetry } from '../three/world';
import { BIOMES } from '../three/terrain';
import { VEHICLE_CONFIGS } from '../three/car';
import { Dashboard } from './Dashboard';

interface HUDProps {
  telemetry: WorldTelemetry;
}

export const HUD: React.FC<HUDProps> = ({ telemetry }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* Top Header Bar */}
      <div className="fixed top-3 left-3 right-3 z-20 pointer-events-none flex justify-between items-start select-none">
        {/* Left: App Brand & Coordinates Badge */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 px-3.5 shadow-xl pointer-events-auto flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm tracking-widest text-sky-400">
              INFINITE WORLD
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {BIOMES[telemetry.biome]?.name || 'Procedural'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-700/60 font-semibold">
              {VEHICLE_CONFIGS[telemetry.vehicleType]?.name || 'Apex GT'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-400">
            <span>X: {telemetry.x}</span>
            <span>Z: {telemetry.z}</span>
            <span>ALT: {telemetry.altitude}m</span>
            <span>{telemetry.distanceKm} km</span>
          </div>
        </div>

        {/* Center: Sports Car Visual Needle-Based Speedometer Dashboard */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Dashboard
            speedKph={telemetry.speedKph}
            gear={telemetry.gear}
            driftScore={telemetry.driftScore}
            isBoosting={telemetry.isBoosting}
            distanceKm={telemetry.distanceKm}
          />
          <button
            onClick={() => setShowHelp(true)}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white shadow-xl transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
            title="Controls & Shortcuts Guide"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">GUIDE</span>
          </button>
        </div>

        {/* Right spacing placeholder for Minimap */}
        <div className="w-44 pointer-events-none" />
      </div>

      {/* Controls Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none select-none">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-bold font-mono tracking-wider text-sky-400 flex items-center gap-2">
                <Navigation className="w-4 h-4" /> DRIVING CONTROLS & SHORTCUTS
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Drive / Reverse</span>
                <span className="font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded">W / S or ↑ / ↓</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Steering</span>
                <span className="font-bold text-amber-300 bg-slate-800 px-2 py-0.5 rounded">A / D or ← / →</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Nitro Boost</span>
                <span className="font-bold text-sky-300 bg-slate-800 px-2 py-0.5 rounded">Shift</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Handbrake Drift</span>
                <span className="font-bold text-sky-300 bg-slate-800 px-2 py-0.5 rounded">Space or B</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Jump Suspension</span>
                <span className="font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded">J</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Car Horn</span>
                <span className="font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded">H</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Respawn Vehicle</span>
                <span className="font-bold text-rose-300 bg-slate-800 px-2 py-0.5 rounded">R</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Cycle Camera</span>
                <span className="font-bold text-purple-300 bg-slate-800 px-2 py-0.5 rounded">C</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Audio Mute</span>
                <span className="font-bold text-purple-300 bg-slate-800 px-2 py-0.5 rounded">L</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Minimap Radar</span>
                <span className="font-bold text-purple-300 bg-slate-800 px-2 py-0.5 rounded">M</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-mono text-xs font-bold transition-colors"
              >
                GOT IT, LET&apos;S DRIVE!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
