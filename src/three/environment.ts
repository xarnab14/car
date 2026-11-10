/**
 * Studio PBR lighting, RoomEnvironment PMREM reflections,
 * dynamic Day / Sunset / Night atmosphere, celestial bodies & fog.
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BiomeType, BIOMES } from './terrain';

export class EnvironmentManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;

  // Lights
  public sunLight: THREE.DirectionalLight;
  public hemisphereLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;

  // Atmosphere
  public fog: THREE.FogExp2;
  private starField: THREE.Points;
  private sunMesh: THREE.Mesh;

  // Time of Day: 0.0 (midnight), 0.25 (dawn), 0.5 (noon), 0.75 (dusk), 1.0 (midnight)
  public timeOfDay = 0.45; // Default late afternoon / crisp daylight
  private currentBiome: BiomeType = 'meadow';

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    // 1. Mandatory Studio RoomEnvironment via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 2. Directional Key Sun Light with tight shadow frustum
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 180;
    const d = 45;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // 3. Cool/Warm Hemisphere fill light
    this.hemisphereLight = new THREE.HemisphereLight(0xc7d2fe, 0x86efac, 0.7);
    this.scene.add(this.hemisphereLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambientLight);

    // 4. Horizon-matched Fog
    this.fog = new THREE.FogExp2(0xdbeafe, 0.009);
    this.scene.fog = this.fog;

    // 5. Celestial Sun Sphere
    const sunGeo = new THREE.SphereGeometry(6, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    // 6. Night Sky Starfield
    this.starField = this.createStarfield();
    this.scene.add(this.starField);

    this.updateLighting();
  }

  private createStarfield(): THREE.Points {
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 140 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.95); // Upper hemisphere only

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 15;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0,
    });

    return new THREE.Points(starGeo, starMat);
  }

  setTimeOfDay(time: number) {
    this.timeOfDay = Math.max(0, Math.min(1, time));
    this.updateLighting();
  }

  setBiome(biome: BiomeType) {
    this.currentBiome = biome;
    this.updateLighting();
  }

  // Update atmosphere, sky color, sun position, and shadow bounds to follow car
  update(carPosition: THREE.Vector3) {
    // Keep sun shadow box centered around car
    const angle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunDistance = 110;
    const sunX = carPosition.x + Math.cos(angle) * sunDistance;
    const sunY = Math.max(-10, Math.sin(angle) * sunDistance + 20);
    const sunZ = carPosition.z + 40;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(carPosition);
    this.sunLight.target.updateMatrixWorld();

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.starField.position.copy(carPosition);
  }

  private updateLighting() {
    const biome = BIOMES[this.currentBiome];
    const angle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunElevation = Math.sin(angle); // -1 (midnight) to +1 (noon)

    const skyColor = new THREE.Color();
    const fogColor = new THREE.Color();

    if (sunElevation > 0.3) {
      // Full daylight
      skyColor.setHex(biome.skyColor);
      fogColor.setHex(biome.fogColor);
      this.sunLight.color.setHex(biome.sunColor);
      this.sunLight.intensity = 2.4;
      this.hemisphereLight.intensity = 0.85;
      this.ambientLight.intensity = 0.2;
      (this.starField.material as THREE.PointsMaterial).opacity = 0;
    } else if (sunElevation > -0.1) {
      // Golden Hour / Sunset transition
      const t = (sunElevation - (-0.1)) / 0.4;
      const sunsetSky = new THREE.Color(0xf97316);
      const sunsetFog = new THREE.Color(0xfdba74);
      const daySky = new THREE.Color(biome.skyColor);
      const dayFog = new THREE.Color(biome.fogColor);

      skyColor.lerpColors(sunsetSky, daySky, t);
      fogColor.lerpColors(sunsetFog, dayFog, t);

      this.sunLight.color.setHex(0xffaa44);
      this.sunLight.intensity = 1.0 + t * 1.4;
      this.hemisphereLight.intensity = 0.4 + t * 0.45;
      (this.starField.material as THREE.PointsMaterial).opacity = (1 - t) * 0.5;
    } else {
      // Night time
      const nightSky = new THREE.Color(0x090d16);
      const nightFog = new THREE.Color(0x0a1128);

      skyColor.copy(nightSky);
      fogColor.copy(nightFog);

      this.sunLight.color.setHex(0x38bdf8); // Moonlight tone
      this.sunLight.intensity = 0.4;
      this.hemisphereLight.intensity = 0.25;
      this.ambientLight.intensity = 0.08;
      (this.starField.material as THREE.PointsMaterial).opacity = 0.95;
    }

    this.scene.background = skyColor;
    this.fog.color.copy(fogColor);

    this.hemisphereLight.color.setHex(biome.hemisphereSky);
    this.hemisphereLight.groundColor.setHex(biome.hemisphereGround);
  }
}
