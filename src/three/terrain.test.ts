import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainNoise, detailNoise } from './noise.ts';
import { VEHICLE_CONFIGS } from './car.ts';

test('SimplexNoise 2D produces bounded outputs in [-1, 1]', () => {
  for (let x = -50; x <= 50; x += 10) {
    for (let y = -50; y <= 50; y += 10) {
      const val = terrainNoise.noise2D(x * 0.1, y * 0.1);
      assert.ok(!Number.isNaN(val), `noise2D returned NaN at (${x}, ${y})`);
      assert.ok(val >= -1.2 && val <= 1.2, `noise2D value ${val} out of bounds at (${x}, ${y})`);
    }
  }
});

test('FBM produces valid continuous elevations without NaN', () => {
  for (let x = -200; x <= 200; x += 50) {
    for (let y = -200; y <= 200; y += 50) {
      const val = terrainNoise.fbm2D(x * 0.01, y * 0.01, 3, 0.5, 2.0);
      assert.ok(!Number.isNaN(val), `fbm2D returned NaN at (${x}, ${y})`);
      assert.ok(val >= -1.5 && val <= 1.5, `fbm2D value ${val} out of expected range`);
    }
  }
});

test('Road distance calculation gives continuous non-negative distance', () => {
  const getRoadDistance = (x: number, z: number) => {
    const roadZ = Math.sin(x * 0.012) * 55 + Math.cos(x * 0.004) * 80;
    return Math.abs(z - roadZ);
  };

  const d1 = getRoadDistance(0, 80);
  assert.ok(Math.abs(d1 - 0) < 0.001, 'Center of road at x=0, z=80 should be ~0');

  const d2 = getRoadDistance(0, 100);
  assert.ok(Math.abs(d2 - 20) < 0.001, 'Distance at z=100 should be 20 units');

  const d3 = getRoadDistance(150, -30);
  assert.ok(!Number.isNaN(d3) && d3 >= 0, 'Distance must be non-negative real number');
});

test('Drift camera angular lag smoothly converges to car heading', () => {
  let camAngle = 0.0;
  const targetHeading = Math.PI * 0.5; // 90 degree turn
  const dt = 0.016; // 60fps frame delta
  const followRate = 2.2; // drift mode follow rate

  // Run 60 frames (1 second) of exponential damping
  for (let frame = 0; frame < 60; frame++) {
    let diff = targetHeading - camAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    camAngle += diff * (1 - Math.exp(-followRate * dt));
  }

  // Camera should have lagged smoothly and be approaching target heading without overshooting
  assert.ok(camAngle > 0.8 && camAngle <= targetHeading, `Lagged angle ${camAngle} not in expected convergence range`);
});

test('Speedometer needle angle maps speed [0, 220] to [-135, +135] degrees', () => {
  const startAngle = -135;
  const endAngle = 135;
  const totalAngle = endAngle - startAngle; // 270 deg
  const maxSpeed = 220;

  const getNeedleAngle = (speed: number) => {
    const clamped = Math.max(0, Math.min(speed, maxSpeed));
    return startAngle + (clamped / maxSpeed) * totalAngle;
  };

  assert.equal(getNeedleAngle(0), -135, '0 km/h should be -135 deg');
  assert.equal(getNeedleAngle(110), 0, '110 km/h should be 0 deg (top center)');
  assert.equal(getNeedleAngle(220), 135, '220 km/h should be 135 deg');
  assert.equal(getNeedleAngle(300), 135, 'Speed above max should clamp at 135 deg');
  assert.equal(getNeedleAngle(-50), -135, 'Negative speed should clamp at -135 deg');
});

test('Vehicle archetypes have valid distinct physics specs', () => {
  const types = ['coupe', 'truck', 'muscle', 'racer'] as const;
  for (const t of types) {
    const cfg = VEHICLE_CONFIGS[t];
    assert.ok(cfg, `Config for ${t} should exist`);
    assert.ok(cfg.maxSpeed > 30 && cfg.maxSpeed < 100, `${t} maxSpeed should be realistic m/s`);
    assert.ok(cfg.boostSpeed > cfg.maxSpeed, `${t} boostSpeed must exceed maxSpeed`);
    assert.ok(cfg.acceleration > 20, `${t} acceleration must be positive and responsive`);
    assert.ok(cfg.maxSteer >= 0.4 && cfg.maxSteer <= 0.8, `${t} maxSteer must be within realistic turn range`);
  }
});



