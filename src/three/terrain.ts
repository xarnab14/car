/**
 * Infinite procedural chunk-based terrain engine with road networks,
 * multi-tier biomes, and composite 3D nature props (trees, boulders, fences).
 */

import * as THREE from 'three';
import { terrainNoise, detailNoise } from './noise';

export type BiomeType = 'meadow' | 'autumn' | 'desert' | 'cyber';

export interface BiomeConfig {
  name: string;
  terrainColors: {
    low: number;
    mid: number;
    high: number;
    peak: number;
    road: number;
    roadLine: number;
  };
  foliageColors: number[];
  trunkColor: number;
  rockColor: number;
  waterColor: number;
  fogColor: number;
  skyColor: number;
  sunColor: number;
  hemisphereSky: number;
  hemisphereGround: number;
}

export const BIOMES: Record<BiomeType, BiomeConfig> = {
  meadow: {
    name: 'Alpine Meadow',
    terrainColors: {
      low: 0x3d7042,
      mid: 0x569651,
      high: 0x73aa5d,
      peak: 0x8a9e88,
      road: 0x374151,
      roadLine: 0xfbbf24,
    },
    foliageColors: [0x2d6a4f, 0x1b4332, 0x40916c, 0x52b788],
    trunkColor: 0x5c4033,
    rockColor: 0x6b7280,
    waterColor: 0x0284c7,
    fogColor: 0xdbeafe,
    skyColor: 0x93c5fd,
    sunColor: 0xfffaed,
    hemisphereSky: 0xc7d2fe,
    hemisphereGround: 0x86efac,
  },
  autumn: {
    name: 'Golden Autumn',
    terrainColors: {
      low: 0x7c5e3f,
      mid: 0xa16207,
      high: 0xca8a04,
      peak: 0x78716c,
      road: 0x292524,
      roadLine: 0xfef08a,
    },
    foliageColors: [0xd97706, 0xb45309, 0xea580c, 0xc2410c],
    trunkColor: 0x442c1d,
    rockColor: 0x57534e,
    waterColor: 0x0f766e,
    fogColor: 0xfef3c7,
    skyColor: 0xfde68a,
    sunColor: 0xffedd5,
    hemisphereSky: 0xfed7aa,
    hemisphereGround: 0xd97706,
  },
  desert: {
    name: 'Desert Canyon',
    terrainColors: {
      low: 0xd97736,
      mid: 0xe08d49,
      high: 0xc86432,
      peak: 0xa34424,
      road: 0x1f2937,
      roadLine: 0xfacc15,
    },
    foliageColors: [0x4d7c0f, 0x65a30d, 0x84cc16],
    trunkColor: 0x78350f,
    rockColor: 0x9a3412,
    waterColor: 0x0284c7,
    fogColor: 0xffedd5,
    skyColor: 0xfdba74,
    sunColor: 0xffedd5,
    hemisphereSky: 0xfed7aa,
    hemisphereGround: 0xe08d49,
  },
  cyber: {
    name: 'Synthwave Cyber',
    terrainColors: {
      low: 0x0f0c29,
      mid: 0x1a1235,
      high: 0x2d1b4e,
      peak: 0x481b79,
      road: 0x050510,
      roadLine: 0x00f0ff,
    },
    foliageColors: [0xff007f, 0x00f0ff, 0x7928ca, 0xff00aa],
    trunkColor: 0x111827,
    rockColor: 0x312e81,
    waterColor: 0xd946ef,
    fogColor: 0x1e1035,
    skyColor: 0x0f0728,
    sunColor: 0xff007f,
    hemisphereSky: 0x8b5cf6,
    hemisphereGround: 0x06b6d4,
  },
};

export class TerrainManager {
  public scene: THREE.Scene;
  public chunkGroup: THREE.Group;
  public currentBiome: BiomeType = 'meadow';

  // Chunk sizing specs
  public readonly CHUNK_SIZE = 70; // World units
  public readonly CHUNK_SEGMENTS = 28; // Resolution of terrain grid
  public readonly CHUNK_RADIUS = 2; // Radius in chunks (5x5 grid = 25 chunks)

  // Chunk storage: key = `${cx},${cz}`
  private loadedChunks = new Map<string, THREE.Group>();

  // Shared reusable geometries and materials for performance
  private terrainMaterial: THREE.MeshStandardMaterial;
  private waterMaterial: THREE.MeshStandardMaterial;

  // Composite nature model prototypes
  private pineTreeGeos: { trunk: THREE.BufferGeometry; tiers: THREE.BufferGeometry[] };
  private rockGeos: THREE.BufferGeometry[];
  private streetlightGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    // Dynamic vertex-colored PBR terrain material
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    // Water plane material
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: BIOMES[this.currentBiome].waterColor,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.8,
    });

    // Create procedural geometries for composite props
    this.pineTreeGeos = this.initPineTreeGeos();
    this.rockGeos = this.initRockGeos();
    this.streetlightGeo = this.initStreetlightGeo();
  }

  // 1. Procedural Height Function: combines gentle hills, rolling plains, and road flattening
  getHeight(x: number, z: number): number {
    // Large rolling hills
    const baseElevation = terrainNoise.fbm2D(x * 0.005, z * 0.005, 3, 0.45, 2.0) * 16.0;
    // Medium detail bumps
    const detailElevation = detailNoise.fbm2D(x * 0.02, z * 0.02, 2, 0.5, 2.0) * 3.5;

    let height = baseElevation + detailElevation;

    // Check proximity to procedural highway road
    const roadDist = this.getRoadDistance(x, z);
    const roadWidth = 5.0;
    const roadShoulder = 10.0;

    if (roadDist < roadWidth) {
      // Smooth road level
      const roadTargetHeight = terrainNoise.fbm2D(x * 0.003, z * 0.003, 2, 0.5, 2.0) * 10.0;
      height = roadTargetHeight;
    } else if (roadDist < roadShoulder) {
      // Blend road shoulder into natural terrain
      const roadTargetHeight = terrainNoise.fbm2D(x * 0.003, z * 0.003, 2, 0.5, 2.0) * 10.0;
      const t = (roadDist - roadWidth) / (roadShoulder - roadWidth);
      height = THREE.MathUtils.lerp(roadTargetHeight, height, t);
    }

    return height;
  }

  // Distance from (x, z) to procedural winding road spline
  getRoadDistance(x: number, z: number): number {
    // Continuous sinusoidal curve through the world
    const roadZ = Math.sin(x * 0.012) * 55 + Math.cos(x * 0.004) * 80;
    return Math.abs(z - roadZ);
  }

  // Normal vector calculation at (x, z) for physics orientation
  getNormal(x: number, z: number): THREE.Vector3 {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
    normal.normalize();
    return normal;
  }

  // Ground info helper
  getGroundInfo(x: number, z: number) {
    return {
      height: this.getHeight(x, z),
      normal: this.getNormal(x, z),
    };
  }

  // 2. Chunk streaming update based on car position
  update(carX: number, carZ: number) {
    const currentCx = Math.floor(carX / this.CHUNK_SIZE);
    const currentCz = Math.floor(carZ / this.CHUNK_SIZE);

    const neededKeys = new Set<string>();

    for (let dx = -this.CHUNK_RADIUS; dx <= this.CHUNK_RADIUS; dx++) {
      for (let dz = -this.CHUNK_RADIUS; dz <= this.CHUNK_RADIUS; dz++) {
        const cx = currentCx + dx;
        const cz = currentCz + dz;
        const key = `${cx},${cz}`;
        neededKeys.add(key);

        if (!this.loadedChunks.has(key)) {
          const chunk = this.createChunk(cx, cz);
          this.loadedChunks.set(key, chunk);
          this.chunkGroup.add(chunk);
        }
      }
    }

    // Unload distant chunks to preserve 60fps performance
    for (const [key, chunk] of this.loadedChunks.entries()) {
      if (!neededKeys.has(key)) {
        this.chunkGroup.remove(chunk);
        this.disposeChunk(chunk);
        this.loadedChunks.delete(key);
      }
    }
  }

  // 3. Create a single chunk mesh with low-poly vertex coloring and nature props
  private createChunk(cx: number, cz: number): THREE.Group {
    const chunk = new THREE.Group();
    const startX = cx * this.CHUNK_SIZE;
    const startZ = cz * this.CHUNK_SIZE;

    // Plane geometry
    const geo = new THREE.PlaneGeometry(
      this.CHUNK_SIZE,
      this.CHUNK_SIZE,
      this.CHUNK_SEGMENTS,
      this.CHUNK_SEGMENTS
    );
    geo.rotateX(-Math.PI / 2); // Lay horizontal on XZ plane

    const posAttr = geo.attributes.position;
    const vertexCount = posAttr.count;
    const colors = new Float32Array(vertexCount * 3);

    const biome = BIOMES[this.currentBiome];
    const colorLow = new THREE.Color(biome.terrainColors.low);
    const colorMid = new THREE.Color(biome.terrainColors.mid);
    const colorHigh = new THREE.Color(biome.terrainColors.high);
    const colorPeak = new THREE.Color(biome.terrainColors.peak);
    const colorRoad = new THREE.Color(biome.terrainColors.road);
    const colorRoadLine = new THREE.Color(biome.terrainColors.roadLine);

    const tempColor = new THREE.Color();

    for (let i = 0; i < vertexCount; i++) {
      // Local to world coordinate
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const wx = startX + lx;
      const wz = startZ + lz;

      const h = this.getHeight(wx, wz);
      posAttr.setY(i, h);

      // Color mapping
      const roadDist = this.getRoadDistance(wx, wz);
      if (roadDist < 1.4) {
        // Center road dash lines
        const dashPattern = Math.sin(wx * 0.8) > 0.1;
        if (dashPattern && roadDist < 0.3) {
          tempColor.copy(colorRoadLine);
        } else {
          tempColor.copy(colorRoad);
        }
      } else if (roadDist < 4.8) {
        // Asphalt pavement
        tempColor.copy(colorRoad);
      } else {
        // Natural landscape gradient
        if (h < 2) {
          tempColor.copy(colorLow);
        } else if (h < 8) {
          const t = (h - 2) / 6;
          tempColor.lerpColors(colorLow, colorMid, t);
        } else if (h < 15) {
          const t = (h - 8) / 7;
          tempColor.lerpColors(colorMid, colorHigh, t);
        } else {
          const t = Math.min(1.0, (h - 15) / 10);
          tempColor.lerpColors(colorHigh, colorPeak, t);
        }
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geo, this.terrainMaterial);
    terrainMesh.position.set(startX, 0, startZ);
    terrainMesh.receiveShadow = true;
    chunk.add(terrainMesh);

    // Populate composite 3D nature props (Pine Trees, Rocks, Streetlights)
    this.populateChunkProps(chunk, startX, startZ);

    return chunk;
  }

  // 4. Populate composite props within chunk
  private populateChunkProps(chunk: THREE.Group, startX: number, startZ: number) {
    const biome = BIOMES[this.currentBiome];
    const half = this.CHUNK_SIZE / 2;

    // Use deterministic seeded pseudo-random for consistent chunk regeneration
    let seed = Math.abs((startX * 73856093) ^ (startZ * 19349663));
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 4294967296);
    };

    // Shared materials for props in this chunk
    const trunkMat = new THREE.MeshStandardMaterial({
      color: biome.trunkColor,
      roughness: 0.9,
      metalness: 0.1,
    });

    const rockMat = new THREE.MeshStandardMaterial({
      color: biome.rockColor,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.5,
      metalness: 0.8,
    });

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xffe066,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });

    // Number of trees per chunk
    const treeCount = Math.floor(10 + random() * 12);
    for (let i = 0; i < treeCount; i++) {
      const px = (random() - 0.5) * (this.CHUNK_SIZE - 6);
      const pz = (random() - 0.5) * (this.CHUNK_SIZE - 6);
      const wx = startX + px;
      const wz = startZ + pz;

      // Keep trees away from road
      if (this.getRoadDistance(wx, wz) < 8.0) continue;

      const gy = this.getHeight(wx, wz);
      // Skip submerged points
      if (gy < 0.2) continue;

      const foliageColor = biome.foliageColors[Math.floor(random() * biome.foliageColors.length)];
      const foliageMat = new THREE.MeshStandardMaterial({
        color: foliageColor,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true,
      });

      // Composite Pine Tree (Trunk + 3 Tiers of Foliage)
      const treeGroup = new THREE.Group();
      const scale = 0.8 + random() * 0.5;

      const trunk = new THREE.Mesh(this.pineTreeGeos.trunk, trunkMat);
      trunk.castShadow = true;
      treeGroup.add(trunk);

      for (let t = 0; t < this.pineTreeGeos.tiers.length; t++) {
        const tier = new THREE.Mesh(this.pineTreeGeos.tiers[t], foliageMat);
        tier.position.y = 1.6 + t * 1.3;
        tier.castShadow = true;
        treeGroup.add(tier);
      }

      treeGroup.scale.set(scale, scale, scale);
      treeGroup.rotation.y = random() * Math.PI * 2;
      treeGroup.position.set(startX + px, gy, startZ + pz);
      chunk.add(treeGroup);
    }

    // Number of rocks per chunk
    const rockCount = Math.floor(4 + random() * 6);
    for (let i = 0; i < rockCount; i++) {
      const px = (random() - 0.5) * (this.CHUNK_SIZE - 6);
      const pz = (random() - 0.5) * (this.CHUNK_SIZE - 6);
      const wx = startX + px;
      const wz = startZ + pz;

      if (this.getRoadDistance(wx, wz) < 6.5) continue;

      const gy = this.getHeight(wx, wz);
      const geo = this.rockGeos[Math.floor(random() * this.rockGeos.length)];
      const rock = new THREE.Mesh(geo, rockMat);

      const rScale = 0.6 + random() * 1.2;
      rock.scale.set(rScale, rScale * (0.6 + random() * 0.4), rScale);
      rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      rock.position.set(startX + px, gy + (rScale * 0.3), startZ + pz);
      rock.castShadow = true;
      rock.receiveShadow = true;
      chunk.add(rock);
    }

    // Roadside Streetlights along road edges
    for (let side = -1; side <= 1; side += 2) {
      const roadZCenter = Math.sin(startX * 0.012) * 55 + Math.cos(startX * 0.004) * 80;
      const offsetZ = side * 5.6;
      const targetZ = roadZCenter + offsetZ;

      // Only place if roughly within chunk boundary
      if (Math.abs(targetZ - startZ) < half - 4) {
        const gy = this.getHeight(startX, targetZ);
        const lampGroup = new THREE.Group();

        const post = new THREE.Mesh(this.streetlightGeo, lampMat);
        post.castShadow = true;
        lampGroup.add(post);

        const bulbGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(0, 4.2, 0);
        lampGroup.add(bulb);

        lampGroup.position.set(startX, gy, targetZ);
        chunk.add(lampGroup);
      }
    }
  }

  private initPineTreeGeos() {
    const trunk = new THREE.CylinderGeometry(0.32, 0.45, 2.8, 8);
    trunk.translate(0, 1.4, 0);

    const tier1 = new THREE.ConeGeometry(2.4, 2.2, 7);
    const tier2 = new THREE.ConeGeometry(1.8, 1.8, 7);
    const tier3 = new THREE.ConeGeometry(1.2, 1.4, 7);

    return { trunk, tiers: [tier1, tier2, tier3] };
  }

  private initRockGeos() {
    return [
      new THREE.DodecahedronGeometry(1.2, 0),
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.DodecahedronGeometry(0.9, 0),
    ];
  }

  private initStreetlightGeo() {
    const pole = new THREE.CylinderGeometry(0.1, 0.14, 4.2, 8);
    pole.translate(0, 2.1, 0);
    return pole;
  }

  private disposeChunk(chunk: THREE.Group) {
    chunk.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  }

  setBiome(biome: BiomeType) {
    this.currentBiome = biome;
    this.waterMaterial.color.setHex(BIOMES[biome].waterColor);

    // Rebuild all currently loaded chunks with new biome aesthetics
    for (const [key, chunk] of this.loadedChunks.entries()) {
      this.chunkGroup.remove(chunk);
      this.disposeChunk(chunk);
      const [cx, cz] = key.split(',').map(Number);
      const newChunk = this.createChunk(cx, cz);
      this.loadedChunks.set(key, newChunk);
      this.chunkGroup.add(newChunk);
    }
  }
}
