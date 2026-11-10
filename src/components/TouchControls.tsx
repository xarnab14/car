/**
 * Mobile / Touchscreen on-screen controller for vehicle drive, steering,
 * boost, jump, drift, and horn.
 */

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap, Volume2, ShieldAlert, Disc } from 'lucide-react';
import { InputController } from '../three/controls';

interface TouchControlsProps {
  inputController: InputController;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ inputController }) => {
  const [activeActions, setActiveActions] = useState<{ [key: string]: boolean }>({});

  const handlePointerDown = (action: string) => {
    setActiveActions((prev) => ({ ...prev, [action]: true }));
    switch (action) {
      case 'forward':
        inputController.touchForward = 1;
        break;
      case 'backward':
        inputController.touchForward = -1;
        break;
      case 'left':
        inputController.touchTurn = -1;
        break;
      case 'right':
        inputController.touchTurn = 1;
        break;
      case 'drift':
        inputController.touchDrift = true;
        break;
      case 'boost':
        inputController.touchBoost = true;
        break;
      case 'jump':
        inputController.touchJump = true;
        break;
      case 'honk':
        inputController.touchHonk = true;
        break;
    }
  };

  const handlePointerUp = (action: string) => {
    setActiveActions((prev) => ({ ...prev, [action]: false }));
    switch (action) {
      case 'forward':
      case 'backward':
        inputController.touchForward = 0;
        break;
      case 'left':
      case 'right':
        inputController.touchTurn = 0;
        break;
      case 'drift':
        inputController.touchDrift = false;
        break;
      case 'boost':
        inputController.touchBoost = false;
        break;
      case 'jump':
        inputController.touchJump = false;
        break;
      case 'honk':
        inputController.touchHonk = false;
        break;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex justify-between items-end p-4 pb-24 md:hidden select-none">
      {/* Left side: Steering D-pad */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          onPointerDown={() => handlePointerDown('left')}
          onPointerUp={() => handlePointerUp('left')}
          onPointerCancel={() => handlePointerUp('left')}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl border border-slate-700/80 active:scale-95 transition-transform ${
            activeActions['left'] ? 'bg-sky-500' : 'bg-slate-900/80'
          }`}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onPointerDown={() => handlePointerDown('right')}
          onPointerUp={() => handlePointerUp('right')}
          onPointerCancel={() => handlePointerUp('right')}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl border border-slate-700/80 active:scale-95 transition-transform ${
            activeActions['right'] ? 'bg-sky-500' : 'bg-slate-900/80'
          }`}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Center: Action buttons (Boost, Drift, Jump, Horn) */}
      <div className="flex gap-1.5 pointer-events-auto mb-1">
        <button
          onPointerDown={() => handlePointerDown('boost')}
          onPointerUp={() => handlePointerUp('boost')}
          onPointerCancel={() => handlePointerUp('boost')}
          className={`px-3 py-2.5 rounded-xl flex items-center gap-1 text-xs font-mono font-bold text-white border border-amber-500/40 shadow-lg ${
            activeActions['boost'] ? 'bg-amber-500 scale-95' : 'bg-amber-600/70'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> BOOST
        </button>
        <button
          onPointerDown={() => handlePointerDown('drift')}
          onPointerUp={() => handlePointerUp('drift')}
          onPointerCancel={() => handlePointerUp('drift')}
          className={`px-3 py-2.5 rounded-xl flex items-center gap-1 text-xs font-mono font-bold text-white border border-emerald-500/40 shadow-lg ${
            activeActions['drift'] ? 'bg-emerald-500 scale-95' : 'bg-emerald-700/70'
          }`}
        >
          <Disc className="w-3.5 h-3.5" /> DRIFT
        </button>
        <button
          onPointerDown={() => handlePointerDown('jump')}
          onPointerUp={() => handlePointerUp('jump')}
          onPointerCancel={() => handlePointerUp('jump')}
          className={`px-3 py-2.5 rounded-xl flex items-center gap-1 text-xs font-mono font-bold text-white border border-purple-500/40 shadow-lg ${
            activeActions['jump'] ? 'bg-purple-500 scale-95' : 'bg-purple-700/70'
          }`}
        >
          JUMP
        </button>
      </div>

      {/* Right side: Throttle & Brake Pedals */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <button
          onPointerDown={() => handlePointerDown('forward')}
          onPointerUp={() => handlePointerUp('forward')}
          onPointerCancel={() => handlePointerUp('forward')}
          className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-xl border border-emerald-600/80 active:scale-95 transition-transform ${
            activeActions['forward'] ? 'bg-emerald-500' : 'bg-emerald-700/80'
          }`}
        >
          <ArrowUp className="w-6 h-6" />
          <span className="text-[10px] tracking-wider font-mono">GAS</span>
        </button>
        <button
          onPointerDown={() => handlePointerDown('backward')}
          onPointerUp={() => handlePointerUp('backward')}
          onPointerCancel={() => handlePointerUp('backward')}
          className={`w-16 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-xl border border-rose-700/80 active:scale-95 transition-transform ${
            activeActions['backward'] ? 'bg-rose-600' : 'bg-rose-900/80'
          }`}
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[9px] tracking-wider font-mono">BRAKE</span>
        </button>
      </div>
    </div>
  );
};
