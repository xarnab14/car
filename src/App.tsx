import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WorldEngine, WorldTelemetry, CameraMode } from './three/world';
import { BiomeType } from './three/terrain';
import { VehicleType } from './three/car';
import { HUD } from './components/HUD';
import { ControlDock } from './components/ControlDock';
import { Minimap } from './components/Minimap';
import { TouchControls } from './components/TouchControls';
import { audioManager } from './three/audio';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<WorldEngine | null>(null);

  // Minimap visibility
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [currentColorHex, setCurrentColorHex] = useState(0xef4444);

  // HUD & Telemetry State
  const [telemetry, setTelemetry] = useState<WorldTelemetry>({
    speedKph: 0,
    gear: 'P',
    driftScore: 0,
    distanceKm: 0,
    x: 0,
    z: 0,
    altitude: 0,
    cameraMode: 'chase',
    biome: 'meadow',
    timeOfDay: 0.45,
    isMuted: false,
    isBoosting: false,
    vehicleType: 'coupe',
  });

  // Handle first user interaction to resume Web Audio API context
  const handleInteraction = useCallback(() => {
    audioManager.init();
  }, []);

  useEffect(() => {
    const mountContainer = canvasMountRef.current;
    if (!mountContainer) return;

    // Initialize 3D World Engine inside isolated ref
    const world = new WorldEngine(mountContainer);
    worldRef.current = world;

    // Listen to telemetry updates (throttled to 10Hz by world engine)
    world.onTelemetry = (t: WorldTelemetry) => {
      setTelemetry(t);
    };

    // Keyboard shortcut for Minimap toggle (M)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        setMinimapVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Audio init on click or keydown
    window.addEventListener('pointerdown', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      world.destroy();
      worldRef.current = null;
    };
  }, [handleInteraction]);

  // Handlers for Control Dock actions
  const handleCameraChange = (mode: CameraMode) => {
    worldRef.current?.setCameraMode(mode);
  };

  const handleBiomeChange = (biome: BiomeType) => {
    worldRef.current?.setBiome(biome);
  };

  const handleTimeChange = (time: number) => {
    worldRef.current?.setTimeOfDay(time);
  };

  const handleColorChange = (hex: number) => {
    setCurrentColorHex(hex);
    worldRef.current?.setCarColor(hex);
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    worldRef.current?.setVehicleType(type);
  };

  const handleRespawn = () => {
    worldRef.current?.input.setCallbacks;
    if (worldRef.current) {
      // Trigger car reset
      worldRef.current.car.respawn((x, z) => worldRef.current!.terrain.getGroundInfo(x, z));
      audioManager.playJump();
    }
  };

  const handleHonk = () => {
    audioManager.playHonk();
  };

  const handleToggleMute = () => {
    const isMuted = audioManager.toggleMute();
    setTelemetry((prev) => ({ ...prev, isMuted }));
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans"
      onPointerDown={handleInteraction}
    >
      {/* 3D WebGL Canvas Container: Isolated in useRef container outside React state */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Real-time Top HUD Header */}
      <HUD telemetry={telemetry} />

      {/* 2D Minimap Radar */}
      <Minimap
        carX={telemetry.x}
        carZ={telemetry.z}
        heading={worldRef.current?.car.headingAngle ?? 0}
        visible={minimapVisible}
        onToggle={() => setMinimapVisible((v) => !v)}
      />

      {/* Mobile Touch Controls for Steering and Pedals */}
      {worldRef.current && (
        <TouchControls inputController={worldRef.current.input} />
      )}

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        cameraMode={telemetry.cameraMode}
        onCameraChange={handleCameraChange}
        biome={telemetry.biome}
        onBiomeChange={handleBiomeChange}
        timeOfDay={telemetry.timeOfDay}
        onTimeChange={handleTimeChange}
        vehicleType={telemetry.vehicleType}
        onVehicleTypeChange={handleVehicleTypeChange}
        currentColorHex={currentColorHex}
        onColorChange={handleColorChange}
        onRespawn={handleRespawn}
        onHonk={handleHonk}
        onToggleMute={handleToggleMute}
        isMuted={telemetry.isMuted}
      />
    </div>
  );
}
