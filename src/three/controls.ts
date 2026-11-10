/**
 * Unified input controller handling keyboard, gamepad, and touch events
 * for driving, drifting, jumping, boosting, and horn.
 */

export interface InputState {
  forward: number; // -1 to 1
  turn: number;    // -1 to 1
  drift: boolean;
  boost: boolean;
  jump: boolean;
  hydraulics: boolean;
  honk: boolean;
  respawnRequested: boolean;
  cameraToggleRequested: boolean;
  muteToggleRequested: boolean;
}

export class InputController {
  private keys = new Set<string>();

  // Touch / Virtual controls state
  public touchForward = 0;
  public touchTurn = 0;
  public touchDrift = false;
  public touchBoost = false;
  public touchJump = false;
  public touchHonk = false;

  private onHonkCallback?: () => void;
  private onRespawnCallback?: () => void;
  private onCameraCallback?: () => void;
  private onMuteCallback?: () => void;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      // Trigger one-shot events
      if (e.code === 'KeyH' && this.onHonkCallback) {
        this.onHonkCallback();
      }
      if (e.code === 'KeyR' && this.onRespawnCallback) {
        this.onRespawnCallback();
      }
      if (e.code === 'KeyC' && this.onCameraCallback) {
        this.onCameraCallback();
      }
      if (e.code === 'KeyL' && this.onMuteCallback) {
        this.onMuteCallback();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Reset keys if window loses focus
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  setCallbacks(callbacks: {
    onHonk?: () => void;
    onRespawn?: () => void;
    onCamera?: () => void;
    onMute?: () => void;
  }) {
    this.onHonkCallback = callbacks.onHonk;
    this.onRespawnCallback = callbacks.onRespawn;
    this.onCameraCallback = callbacks.onCamera;
    this.onMuteCallback = callbacks.onMute;
  }

  getState(): InputState {
    let forward = 0;
    let turn = 0;

    // Keyboard inputs
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) turn -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) turn += 1;

    // Combine with touch controls
    if (Math.abs(this.touchForward) > 0.05) forward = this.touchForward;
    if (Math.abs(this.touchTurn) > 0.05) turn = this.touchTurn;

    // Check Gamepad API if available
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads && gamepads[0]) {
      const gp = gamepads[0];
      // Left stick turn
      if (Math.abs(gp.axes[0]) > 0.15) turn = gp.axes[0];
      // Triggers for accelerate / reverse
      const rt = gp.buttons[7]?.value || 0;
      const lt = gp.buttons[6]?.value || 0;
      if (rt > 0.1) forward = rt;
      else if (lt > 0.1) forward = -lt;
    }

    const drift = this.keys.has('Space') || this.keys.has('KeyB') || this.keys.has('ControlLeft') || this.touchDrift;
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchBoost;
    const jump = this.keys.has('KeyJ') || this.touchJump;
    const hydraulics = this.keys.has('Digit1') || this.keys.has('Digit2') || this.keys.has('Digit3');
    const honk = this.keys.has('KeyH') || this.touchHonk;

    return {
      forward: Math.max(-1, Math.min(1, forward)),
      turn: Math.max(-1, Math.min(1, turn)),
      drift,
      boost,
      jump,
      hydraulics,
      honk,
      respawnRequested: this.keys.has('KeyR'),
      cameraToggleRequested: this.keys.has('KeyC'),
      muteToggleRequested: this.keys.has('KeyL'),
    };
  }
}
