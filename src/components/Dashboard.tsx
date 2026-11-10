/**
 * Visual Needle-Based Instrument Cluster Dashboard for vehicle simulation.
 * Features an SVG analog needle speedometer, RPM tachometer arc,
 * dynamic redline zone, digital speed readout, gear indicator, and drift telemetry.
 */

import React from 'react';
import { Zap, Sparkles, Flame } from 'lucide-react';

interface DashboardProps {
  speedKph: number;
  gear: 'P' | 'D' | 'R';
  driftScore: number;
  isBoosting: boolean;
  distanceKm: number;
  maxSpeed?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({
  speedKph,
  gear,
  driftScore,
  isBoosting,
  distanceKm,
  maxSpeed = 220,
}) => {
  // Gauge geometry
  const radius = 72;
  const cx = 90;
  const cy = 90;
  const startAngle = -135; // degrees (bottom-left)
  const endAngle = 135;   // degrees (bottom-right)
  const totalAngle = endAngle - startAngle; // 270 degrees

  // Calculate needle angle clamped to [0, maxSpeed]
  const clampedSpeed = Math.max(0, Math.min(speedKph, maxSpeed));
  const speedRatio = clampedSpeed / maxSpeed;
  const needleAngle = startAngle + speedRatio * totalAngle;

  // Approximate simulated RPM based on speed and gear
  let simulatedRpm = 1000;
  if (gear === 'D') {
    const gearSpeed = speedKph % 45;
    simulatedRpm = 1200 + (gearSpeed / 45) * 5800 + (isBoosting ? 1200 : 0);
  } else if (gear === 'R') {
    simulatedRpm = 1200 + Math.min(1.0, Math.abs(speedKph) / 25) * 4500;
  }
  const rpmRatio = Math.min(1.0, simulatedRpm / 8000);

  // Helper to convert polar to cartesian coordinates
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  // Helper to describe an SVG circular arc path
  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Generate tick marks (every 20 km/h)
  const ticks = [];
  const tickCount = 11; // 0, 20, 40, ... 200, 220
  for (let i = 0; i <= tickCount; i++) {
    const val = i * 20;
    const angle = startAngle + (i / tickCount) * totalAngle;
    const isMajor = val % 40 === 0;
    const tickStart = polarToCartesian(cx, cy, radius - (isMajor ? 11 : 6), angle);
    const tickEnd = polarToCartesian(cx, cy, radius, angle);
    const labelPos = polarToCartesian(cx, cy, radius - 20, angle);

    const isRedline = val >= 180;
    const strokeColor = isRedline ? '#ef4444' : isMajor ? '#e2e8f0' : '#64748b';

    ticks.push({
      val,
      angle,
      isMajor,
      isRedline,
      strokeColor,
      x1: tickStart.x,
      y1: tickStart.y,
      x2: tickEnd.x,
      y2: tickEnd.y,
      labelX: labelPos.x,
      labelY: labelPos.y,
    });
  }

  // Active speed arc
  const activeArcEndAngle = startAngle + Math.max(1, speedRatio * totalAngle);
  const activeArcPath = describeArc(cx, cy, radius - 2, startAngle, activeArcEndAngle);
  const bgArcPath = describeArc(cx, cy, radius - 2, startAngle, endAngle);

  // Redline background arc (180 to 220 km/h)
  const redlineStartAngle = startAngle + (180 / maxSpeed) * totalAngle;
  const redlineArcPath = describeArc(cx, cy, radius - 2, redlineStartAngle, endAngle);

  // Needle tip coordinate for rotation
  const needleLength = radius - 14;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-2.5 shadow-2xl flex items-center gap-3 select-none pointer-events-auto">
      {/* Analog Speedometer Dial SVG */}
      <div className="relative w-[180px] h-[180px] shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180" className="overflow-visible">
          <defs>
            {/* Speed Gradient */}
            <linearGradient id="speedArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="90%" stopColor="#ef4444" />
            </linearGradient>

            {/* Needle Glow Filter */}
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#ef4444" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Outer Ring */}
          <circle cx={cx} cy={cy} r={radius + 4} fill="#090d16" stroke="#1e293b" strokeWidth="2" />

          {/* Dial Background Arc */}
          <path d={bgArcPath} fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />

          {/* Redline Warning Arc (180 - 220 km/h) */}
          <path
            d={redlineArcPath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Dynamic Active Speed Arc */}
          {speedKph > 0.5 && (
            <path
              d={activeArcPath}
              fill="none"
              stroke="url(#speedArcGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}

          {/* Dial Tick Marks */}
          {ticks.map((t) => (
            <g key={t.val}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.strokeColor}
                strokeWidth={t.isMajor ? 2.2 : 1.2}
              />
              {t.isMajor && (
                <text
                  x={t.labelX}
                  y={t.labelY + 3.5}
                  textAnchor="middle"
                  fill={t.isRedline ? '#f87171' : '#94a3b8'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {t.val}
                </text>
              )}
            </g>
          ))}

          {/* Tachometer RPM Arc (Inner Ring) */}
          <path
            d={describeArc(cx, cy, radius - 33, -110, 110)}
            fill="none"
            stroke="#1e293b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {rpmRatio > 0 && (
            <path
              d={describeArc(cx, cy, radius - 33, -110, -110 + rpmRatio * 220)}
              fill="none"
              stroke={rpmRatio > 0.85 ? '#ef4444' : '#38bdf8'}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}

          {/* Central Digital Readout */}
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="26"
            fontFamily="monospace"
            fontWeight="900"
            letterSpacing="-1"
          >
            {speedKph}
          </text>
          <text
            x={cx}
            y={cy + 29}
            textAnchor="middle"
            fill="#64748b"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="1"
          >
            KM/H
          </text>

          {/* Dynamic Analog Needle with Smooth Spring Rotation */}
          <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`}>
            {/* Needle Shadow */}
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - needleLength}
              stroke="#000000"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.3"
              transform="translate(1, 1)"
            />
            {/* Tapered Needle */}
            <line
              x1={cx}
              y1={cy + 10}
              x2={cx}
              y2={cy - needleLength}
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#needleGlow)"
            />
            {/* White Tip Accent */}
            <circle cx={cx} cy={cy - needleLength + 2} r="2" fill="#ffffff" />
            {/* Center Pivot Nut Hub */}
            <circle cx={cx} cy={cy} r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="2.5" fill="#ef4444" />
          </g>
        </svg>
      </div>

      {/* Side Telemetry Panel: Gear, RPM, Drift, Odometer */}
      <div className="flex flex-col justify-between h-[155px] py-1 gap-2 pr-1">
        {/* Top: Gear Box & RPM */}
        <div className="flex items-center gap-2">
          {/* Sports Gear Pill */}
          <div className="flex flex-col items-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <span
              className={`font-mono font-black text-base px-1 rounded ${
                gear === 'D'
                  ? 'text-emerald-400'
                  : gear === 'R'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {gear}
            </span>
            <span className="text-[8px] font-mono font-bold text-slate-500">GEAR</span>
          </div>

          {/* Tachometer RPM Display */}
          <div className="flex flex-col justify-center bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 min-w-[70px]">
            <span className="text-[8px] font-mono text-slate-500">RPM x1000</span>
            <span className="font-mono font-bold text-xs text-sky-400">
              {(simulatedRpm / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        {/* Center: Nitro Boost / Drift Combo Badge */}
        <div className="flex flex-col gap-1">
          {isBoosting ? (
            <div className="px-2 py-1 rounded-lg bg-cyan-950/90 border border-cyan-500 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-md">
              <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-300" />
              <span>NITRO BOOST</span>
            </div>
          ) : driftScore > 0 ? (
            <div className="px-2 py-1 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{driftScore.toLocaleString()} pts</span>
            </div>
          ) : (
            <div className="px-2 py-1 rounded-lg bg-slate-950 text-slate-500 text-[10px] font-mono flex items-center gap-1 border border-slate-800/80">
              <Flame className="w-3 h-3 text-slate-600" />
              <span>READY</span>
            </div>
          )}
        </div>

        {/* Bottom: Trip Odometer */}
        <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span className="text-slate-500">TRIP</span>
          <span className="text-slate-200 font-bold">{distanceKm.toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
};
