/**
 * Master World Engine coordinating Three.js renderer, camera modes,
 * procedural chunk streaming, car physics, audio, and UI telemetry.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ProceduralCar, CarPhysicsState, VehicleType } from './car';
import { TerrainManager, BiomeType } from './terrain';
import { EnvironmentManager } from './environment';
import { audioManager } from './audio';
import { InputController } from './controls';

export type CameraMode = 'chase' | 'drift' | 'hood' | 'isometric' | 'free';

export interface WorldTelemetry {
  speedKph: number;
  gear: 'P' | 'D' | 'R';
  driftScore: number;
  distanceKm: number;
  x: number;
  z: number;
  altitude: number;
  cameraMode: CameraMode;
  biome: BiomeType;
  timeOfDay: number;
  isMuted: boolean;
  isBoosting: boolean;
  vehicleType: VehicleType;
}

export class WorldEngine {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  // Subsystems
  public car: ProceduralCar;
  public terrain: TerrainManager;
  public environment: EnvironmentManager;
  public input: InputController;

  // Camera settings
  public cameraMode: CameraMode = 'chase';
  private cameraTarget = new THREE.Vector3();
  private cameraPosTarget = new THREE.Vector3();
  private driftCamAngle = 0.98;
  private driftCamRoll = 0;
  private targetFov = 58;

  // Telemetry stats
  private driftScore = 0;
  private distanceTraveled = 0;
  private lastPosition = new THREE.Vector3();

  // Loop & Lifecycle
  private isRunning = false;
  private lastFrameTime = 0;
  private frameId = 0;
  private isSoftwareGl = false;

  // Callback to React HUD (throttled to 10Hz to prevent React re-renders impacting WebGL 60fps)
  public onTelemetry?: (telemetry: WorldTelemetry) => void;
  private telemetryTimer = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / container.clientHeight,
      0.2,
      600
    );
    this.camera.position.set(0, 10, -18);

    // 3. Renderer configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls for Free Look Mode
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.enabled = false; // Enabled only in 'free' mode

    // 5. Initialize Subsystems
    this.terrain = new TerrainManager(this.scene);
    this.environment = new EnvironmentManager(this.scene, this.renderer);
    this.car = new ProceduralCar(0xef4444, 0x111827);
    this.scene.add(this.car.group);
    this.input = new InputController();

    // Spawn car directly in the center of the highway road
    const spawnX = 0;
    const spawnZ = 80;
    const startGround = this.terrain.getGroundInfo(spawnX, spawnZ);
    this.car.position.set(spawnX, startGround.height + 0.5, spawnZ);
    this.car.headingAngle = 0.98; // Aligned with the road curve
    this.lastPosition.copy(this.car.position);

    // Setup input callbacks
    this.input.setCallbacks({
      onHonk: () => {
        audioManager.playHonk();
      },
      onRespawn: () => {
        this.respawnCar();
      },
      onCamera: () => {
        this.cycleCamera();
      },
      onMute: () => {
        audioManager.toggleMute();
      },
    });

    // Window resize
    window.addEventListener('resize', this.onResize);

    // Start Engine Loop
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private respawnCar() {
    this.car.respawn((x, z) => this.terrain.getGroundInfo(x, z));
    audioManager.playJump();
  }

  cycleCamera() {
    const modes: CameraMode[] = ['chase', 'drift', 'hood', 'isometric', 'free'];
    const idx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(idx + 1) % modes.length];
    this.controls.enabled = this.cameraMode === 'free';
    if (this.controls.enabled) {
      this.controls.target.copy(this.car.position);
    }
  }

  setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    this.controls.enabled = mode === 'free';
    if (this.controls.enabled) {
      this.controls.target.copy(this.car.position);
    }
  }

  setBiome(biome: BiomeType) {
    this.terrain.setBiome(biome);
    this.environment.setBiome(biome);
  }

  setTimeOfDay(time: number) {
    this.environment.setTimeOfDay(time);
  }

  setCarColor(hex: number) {
    this.car.setBodyColor(hex);
  }

  setVehicleType(type: VehicleType) {
    this.car.setVehicleType(type);
  }

  // Animation Loop with Software WebGL afterDraw pacing guard
  private tick = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // 1. Read Inputs
    const inputState = this.input.getState();

    // 2. Physics & Vehicle Update
    const prevAirborne = this.car.isAirborne;
    this.car.update(
      dt,
      {
        forward: inputState.forward,
        turn: inputState.turn,
        drift: inputState.drift,
        boost: inputState.boost,
        jump: inputState.jump,
        hydraulics: inputState.hydraulics,
      },
      (x, z) => this.terrain.getGroundInfo(x, z)
    );

    // Audio triggers on landing impact
    if (prevAirborne && !this.car.isAirborne) {
      audioManager.playImpact();
    }
    if (!prevAirborne && this.car.isAirborne) {
      audioManager.playJump();
    }

    // 3. Update Audio Synthesizer
    const normSpeed = Math.min(1.0, Math.abs(this.car.forwardSpeed) / this.car.MAX_FORWARD_SPEED);
    audioManager.update(
      normSpeed,
      inputState.forward > 0,
      this.car.driftIntensity,
      this.car.isBoosting
    );

    // 4. Update Infinite Terrain Chunks around car
    this.terrain.update(this.car.position.x, this.car.position.z);

    // 5. Update Environment & Atmosphere
    this.environment.update(this.car.position);

    // 6. Camera Follow with Spring Damping
    this.updateCamera(dt);

    // 7. Track Telemetry & Stats
    const distDelta = this.car.position.distanceTo(this.lastPosition);
    if (distDelta < 20) {
      this.distanceTraveled += distDelta / 1000;
    }
    this.lastPosition.copy(this.car.position);

    if (this.car.driftIntensity > 0.25) {
      this.driftScore += Math.round(this.car.driftIntensity * 15);
    }

    // 8. Render Frame
    this.renderer.render(this.scene, this.camera);

    // 9. Dispatch Telemetry to React (Throttled to 10Hz)
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.08) {
      this.telemetryTimer = 0;
      if (this.onTelemetry) {
        const phys = this.car.getPhysicsState();
        this.onTelemetry({
          speedKph: phys.forwardSpeed,
          gear: phys.gear,
          driftScore: this.driftScore,
          distanceKm: parseFloat(this.distanceTraveled.toFixed(2)),
          x: Math.round(this.car.position.x),
          z: Math.round(this.car.position.z),
          altitude: Math.round(this.car.position.y),
          cameraMode: this.cameraMode,
          biome: this.terrain.currentBiome,
          timeOfDay: this.environment.timeOfDay,
          isMuted: audioManager.getIsMuted(),
          isBoosting: this.car.isBoosting,
          vehicleType: phys.vehicleType,
        });
      }
    }

    // 10. Next Frame scheduling
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private updateCamera(dt: number) {
    if (this.cameraMode === 'free') {
      this.camera.up.set(0, 1, 0);
      if (Math.abs(this.camera.fov - 58) > 0.1) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }
      this.controls.target.copy(this.car.position);
      this.controls.update();
      return;
    }

    const heading = this.car.headingAngle;
    const carPos = this.car.position;

    if (this.cameraMode === 'chase') {
      this.camera.up.set(0, 1, 0);
      if (Math.abs(this.camera.fov - 58) > 0.1) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }

      // Dynamic chase camera: pulls back at high speed and nitro
      const speedRatio = Math.min(1.0, Math.abs(this.car.forwardSpeed) / this.car.MAX_FORWARD_SPEED);
      const dist = 10.5 + speedRatio * 3.5 + (this.car.isBoosting ? 2.5 : 0);
      const height = 4.8 + speedRatio * 1.2;

      // Position behind car along heading
      this.cameraPosTarget.set(
        carPos.x - Math.sin(heading) * dist,
        carPos.y + height,
        carPos.z - Math.cos(heading) * dist
      );

      // Look slightly ahead of car
      this.cameraTarget.set(
        carPos.x + Math.sin(heading) * 4.0,
        carPos.y + 1.2,
        carPos.z + Math.cos(heading) * 4.0
      );

      this.camera.position.lerp(this.cameraPosTarget, Math.min(1.0, 11 * dt));
      this.camera.lookAt(this.cameraTarget);
    } else if (this.cameraMode === 'drift') {
      // Cinematic Dynamic Drift Cam: heavy rotational & lateral inertia, dynamic swing
      const speedRatio = Math.min(1.0, Math.abs(this.car.forwardSpeed) / this.car.MAX_FORWARD_SPEED);
      const driftFactor = this.car.driftIntensity; // 0 to 1
      const steer = this.car.steerAngle; // current steering angle

      // Lag the camera's orbital angle behind car heading:
      // When drifting (high slip angle), follow rate slows down to 2.2 for dramatic wide corner swing!
      const followRate = driftFactor > 0.2 ? 2.2 : 3.8;
      let angleDiff = heading - this.driftCamAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.driftCamAngle += angleDiff * (1 - Math.exp(-followRate * dt));

      // Low-slung aggressive stance: height drops to 2.8m, distance pulls closer on drifts
      const baseDist = 9.0 + speedRatio * 3.6 + (this.car.isBoosting ? 3.0 : 0);
      const dist = Math.max(7.2, baseDist - driftFactor * 1.6);
      const height = 2.8 + speedRatio * 0.9 - driftFactor * 0.4;

      // Dynamic outward lateral swing: shifts camera outward so car profile and tire smoke are prominently framed
      const lateralSwing = steer * 2.4 + (driftFactor * Math.sign(steer) * 2.6);
      const swingX = Math.cos(this.driftCamAngle) * lateralSwing;
      const swingZ = -Math.sin(this.driftCamAngle) * lateralSwing;

      this.cameraPosTarget.set(
        carPos.x - Math.sin(this.driftCamAngle) * dist + swingX,
        carPos.y + height,
        carPos.z - Math.cos(this.driftCamAngle) * dist + swingZ
      );

      // LookAt target: leads ahead of the car and into the corner apex
      const leadDist = 5.2 + speedRatio * 4.2;
      const apexOffset = steer * 2.2;
      this.cameraTarget.set(
        carPos.x + Math.sin(heading) * leadDist + Math.cos(heading) * apexOffset,
        carPos.y + 1.1,
        carPos.z + Math.cos(heading) * leadDist - Math.sin(heading) * apexOffset
      );

      // Exponential position damping (smoother lag for cinematic momentum)
      this.camera.position.lerp(this.cameraPosTarget, Math.min(1.0, 7.5 * dt));

      // Dynamic camera roll (Dutch angle) during aggressive corners and drifts
      const targetRoll = (-steer * 0.08) - (driftFactor * Math.sign(steer) * 0.06);
      this.driftCamRoll = THREE.MathUtils.damp(this.driftCamRoll, targetRoll, 5.0, dt);

      this.camera.up.set(Math.sin(this.driftCamRoll), Math.cos(this.driftCamRoll), 0);
      this.camera.lookAt(this.cameraTarget);

      // Dynamic FOV breathing based on speed, boost, and drift
      const desiredFov = 58 + speedRatio * 9 + (this.car.isBoosting ? 7 : 0) + driftFactor * 4;
      this.targetFov = THREE.MathUtils.damp(this.targetFov, desiredFov, 4.0, dt);
      if (Math.abs(this.camera.fov - this.targetFov) > 0.08) {
        this.camera.fov = this.targetFov;
        this.camera.updateProjectionMatrix();
      }
    } else if (this.cameraMode === 'hood') {
      this.camera.up.set(0, 1, 0);
      if (Math.abs(this.camera.fov - 58) > 0.1) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }

      // Cockpit / Hood camera right at the front windshield
      this.cameraPosTarget.set(
        carPos.x + Math.sin(heading) * 0.4,
        carPos.y + 1.2,
        carPos.z + Math.cos(heading) * 0.4
      );
      this.cameraTarget.set(
        carPos.x + Math.sin(heading) * 20.0,
        carPos.y + 1.0,
        carPos.z + Math.cos(heading) * 20.0
      );

      this.camera.position.copy(this.cameraPosTarget);
      this.camera.lookAt(this.cameraTarget);
    } else if (this.cameraMode === 'isometric') {
      this.camera.up.set(0, 1, 0);
      if (Math.abs(this.camera.fov - 58) > 0.1) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }

      // High-angle aerial drone / isometric view
      this.cameraPosTarget.set(
        carPos.x - 22,
        carPos.y + 32,
        carPos.z - 22
      );
      this.cameraTarget.copy(carPos);

      this.camera.position.lerp(this.cameraPosTarget, Math.min(1.0, 8 * dt));
      this.camera.lookAt(this.cameraTarget);
    }
  }

  // Paced loop for headless / software WebGL environments
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
