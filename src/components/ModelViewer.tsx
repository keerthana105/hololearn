import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

interface Feature {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z?: number };
  color: string;
}

interface GeometryParams {
  scale?: number;
  detailLevel?: number;
  asymmetry?: number;
  depthMultiplier?: number;
  aspectRatio?: number[];
}

interface ModelViewerProps {
  modelData: {
    shapeType?: string;
    objectType?: string;
    geometryParams?: GeometryParams;
    features?: Feature[];
    originalImageUrl?: string;
    depthGrid?: number[][];
    scale?: number;
    depthMultiplier?: number;
  } | null;
}

// =============== PARAMETRIC GEOMETRY GENERATORS ===============

function createHeartGeometry(detail: number = 64): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const latSegments = detail;
  const lonSegments = detail;
  
  // Use the classic parametric heart surface equation for accurate shape
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI; // 0 to PI
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI; // 0 to 2PI
      
      // Parametric heart equation (improved version)
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      // Start with a sphere
      let x = sinTheta * cosPhi;
      let y = cosTheta;
      let z = sinTheta * sinPhi;
      
      // === Heart shaping ===
      // Top lobes: create the two rounded bumps at the top
      if (y > 0) {
        // Split into two lobes by pushing outward based on |cos(phi)|
        const lobeSep = Math.pow(Math.abs(cosPhi), 0.6) * 0.45 * y;
        x *= 1 + lobeSep;
        z *= 1 + lobeSep * 0.5;
        
        // Create the center cleft between lobes
        const cleftDepth = 0.5 * Math.pow(y, 1.5);
        const cleftWidth = Math.pow(Math.max(0, 1 - Math.abs(cosPhi) * 2.5), 2);
        // Push inward at center top
        const r = Math.sqrt(x * x + z * z);
        if (r > 0) {
          const shrink = 1 - cleftWidth * cleftDepth;
          x *= shrink;
          z *= shrink;
        }
        // Also push y down in the cleft
        y -= cleftWidth * cleftDepth * 0.4;
      }
      
      // Bottom: taper to a point
      if (y < -0.2) {
        const pointFactor = Math.pow((-y - 0.2) / 0.8, 1.2);
        const taper = Math.max(0, 1 - pointFactor * 0.92);
        x *= taper;
        z *= taper;
      }
      
      // Widen the midsection slightly for organic feel
      if (y > -0.3 && y < 0.3) {
        const bulgeFactor = 1 + 0.12 * (1 - Math.pow(y / 0.3, 2));
        x *= bulgeFactor;
        z *= bulgeFactor;
      }
      
      // Front-back asymmetry: slightly flatter in back
      if (sinPhi < 0) {
        z *= 0.85;
      }
      
      const scale = 1.8;
      x *= scale;
      y *= scale;
      z *= scale;
      
      vertices.push(x, y, z);
      
      const nx = x, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const current = lat * (lonSegments + 1) + lon;
      const next = current + lonSegments + 1;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function createBrainGeometry(detail: number = 64): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const latSegments = detail;
  const lonSegments = detail;
  
  const noise = (x: number, y: number, z: number, freq: number) => {
    return Math.sin(x * freq) * Math.cos(y * freq * 0.8) * Math.sin(z * freq * 1.2);
  };
  
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI;
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI;
      
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      let x = sinTheta * cosPhi * 1.3;
      let y = cosTheta * 0.9;
      let z = sinTheta * sinPhi * 1.1;
      
      const sulci1 = noise(x, y, z, 8) * 0.08;
      const sulci2 = noise(x * 2, y * 2, z * 2, 12) * 0.04;
      const sulci3 = noise(x * 0.5, y * 0.5, z * 0.5, 4) * 0.06;
      const sulciTotal = sulci1 + sulci2 + sulci3;
      
      const fissureDepth = 0.15 * Math.exp(-Math.pow(z * 8, 2));
      
      if (y < -0.3) {
        const flatFactor = (-y - 0.3) / 0.6;
        y = -0.3 - flatFactor * 0.2;
      }
      
      const radius = Math.sqrt(x * x + y * y + z * z);
      const deformedRadius = radius * (1 + sulciTotal - fissureDepth);
      const factor = deformedRadius / (radius || 1);
      
      x *= factor * 1.5;
      y *= factor * 1.5;
      z *= factor * 1.5;
      
      vertices.push(x, y, z);
      
      const nx = x, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const current = lat * (lonSegments + 1) + lon;
      const next = current + lonSegments + 1;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function createLungGeometry(detail: number = 48, isLeft: boolean = false): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const latSegments = detail;
  const lonSegments = detail;
  
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI;
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI;
      
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      let x = sinTheta * cosPhi * 0.7;
      let y = cosTheta * 1.4;
      let z = sinTheta * sinPhi * 0.5;
      
      if (y > 0) {
        const taperFactor = 1 - y * 0.3;
        x *= taperFactor;
        z *= taperFactor;
      }
      
      const lobeSeparation = isLeft ? 0.1 : 0.15;
      if (y < 0.2 && y > -0.8) {
        const lobeIndent = Math.sin((y + 0.3) * 3) * 0.1 * (1 - Math.abs(sinPhi));
        x += lobeIndent;
      }
      
      const innerCurve = Math.exp(-Math.pow((phi - Math.PI) * 2, 2)) * 0.2;
      if (cosPhi > 0) {
        x -= innerCurve * (isLeft ? 1 : -1);
      }
      
      const scale = 1.4;
      const offsetX = isLeft ? -0.9 : 0.9;
      x = x * scale + offsetX;
      y *= scale;
      z *= scale;
      
      vertices.push(x, y, z);
      
      const nx = x - offsetX, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const current = lat * (lonSegments + 1) + lon;
      const next = current + lonSegments + 1;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function createKidneyGeometry(detail: number = 48): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const latSegments = detail;
  const lonSegments = detail;
  
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI;
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI;
      
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      let x = sinTheta * cosPhi;
      let y = cosTheta * 0.5;
      let z = sinTheta * sinPhi * 0.4;
      
      const hilumAngle = Math.PI;
      const hilumDepth = 0.3 * Math.exp(-Math.pow((phi - hilumAngle) * 2, 2));
      const hilumY = Math.exp(-Math.pow(y * 3, 2));
      x -= hilumDepth * hilumY * cosPhi;
      z -= hilumDepth * hilumY * sinPhi * 0.5;
      
      x += Math.sin(theta) * 0.2 * Math.sign(cosPhi);
      
      const scale = 2.0;
      x *= scale;
      y *= scale;
      z *= scale;
      
      vertices.push(x, y, z);
      
      const nx = x, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const current = lat * (lonSegments + 1) + lon;
      const next = current + lonSegments + 1;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function createOrganicGeometry(detail: number = 48): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const latSegments = detail;
  const lonSegments = detail;
  
  const noise = (x: number, y: number, z: number) => {
    return Math.sin(x * 3) * Math.cos(y * 4) * Math.sin(z * 3.5) * 0.15 +
           Math.sin(x * 7) * Math.cos(y * 6) * 0.05;
  };
  
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI;
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI;
      
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      let x = sinTheta * cosPhi;
      let y = cosTheta;
      let z = sinTheta * sinPhi;
      
      const n = noise(x * 5, y * 5, z * 5);
      const radius = 1.5 + n;
      
      x *= radius;
      y *= radius;
      z *= radius;
      
      vertices.push(x, y, z);
      
      const nx = x, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  for (let lat = 0; lat < latSegments; lat++) {
    for (let lon = 0; lon < lonSegments; lon++) {
      const current = lat * (lonSegments + 1) + lon;
      const next = current + lonSegments + 1;
      
      indices.push(current, next, current + 1);
      indices.push(current + 1, next, next + 1);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

// =============== FLOATING ANIMATION ===============

function FloatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating motion
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
      // Very subtle tilt
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

// =============== 3D FEATURE HOTSPOT ===============

interface FeatureHotspot3DProps {
  feature: Feature;
  shapeType: string;
  isSelected: boolean;
  onSelect: () => void;
}

function FeatureHotspot3D({ feature, shapeType, isSelected, onSelect }: FeatureHotspot3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const position = useMemo(() => {
    const { x, y, z } = feature.position;
    
    if (z !== undefined) {
      return [x * 2 - 1, y * 2 - 1, z] as [number, number, number];
    }
    
    const theta = y * Math.PI;
    const phi = x * 2 * Math.PI;
    
    let radius = 1.6;
    
    switch (shapeType) {
      case 'heart': radius = 2.0; break;
      case 'brain': radius = 1.7; break;
      case 'lung':
      case 'lungs': radius = 1.5; break;
      case 'kidney': radius = 2.2; break;
      default: radius = 1.8;
    }
    
    const px = Math.sin(theta) * Math.cos(phi) * radius;
    const py = Math.cos(theta) * radius;
    const pz = Math.sin(theta) * Math.sin(phi) * radius;
    
    return [px, py, pz] as [number, number, number];
  }, [feature.position, shapeType]);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      <mesh 
        ref={meshRef} 
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial 
          color={feature.color || "#00d4ff"} 
          emissive={feature.color || "#00d4ff"}
          emissiveIntensity={isSelected ? 3 : 1.5}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Pulsing outer glow ring */}
      <mesh>
        <ringGeometry args={[0.1, 0.14, 32]} />
        <meshBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={isSelected ? 0.9 : 0.5} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Tooltip */}
      {isSelected && (
        <Html
          position={[0, 0.4, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="rounded-xl p-4 shadow-2xl min-w-[240px] max-w-[320px] border"
            style={{ 
              pointerEvents: 'auto',
              background: 'rgba(10, 15, 30, 0.95)',
              borderColor: feature.color || '#00d4ff',
              boxShadow: `0 0 20px ${feature.color || '#00d4ff'}40, 0 0 60px ${feature.color || '#00d4ff'}20`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0 shadow-lg" 
                style={{ 
                  backgroundColor: feature.color || "#00d4ff",
                  boxShadow: `0 0 8px ${feature.color || '#00d4ff'}`
                }}
              />
              <h4 className="font-semibold text-sm" style={{ color: feature.color || '#00d4ff' }}>{feature.name}</h4>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(200, 220, 255, 0.8)' }}>{feature.description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============== DEPTH-DISPLACED 3D MODEL ===============

function createDepthDisplacedGeometry(
  depthGrid: number[][],
  baseShapeType: string,
  depthMultiplier: number = 1.5,
  aspectRatio: number[] = [1, 1, 0.5],
  detail: number = 64
): THREE.BufferGeometry {
  // If we have a known anatomy shape AND a depth grid, combine them
  // For "relief" or unknown shapes, create a displaced plane/sphere from depth
  
  if (baseShapeType === "relief" || baseShapeType === "sphere" || baseShapeType === "box" || baseShapeType === "cylinder") {
    // Create a depth-displaced surface from the grid
    return createReliefGeometry(depthGrid, depthMultiplier, aspectRatio, detail);
  }
  
  // For anatomy types, use parametric shape but apply depth displacement
  let baseGeometry: THREE.BufferGeometry;
  switch (baseShapeType.toLowerCase()) {
    case 'heart': baseGeometry = createHeartGeometry(detail); break;
    case 'brain': baseGeometry = createBrainGeometry(detail); break;
    case 'lung': case 'lungs': baseGeometry = createLungGeometry(detail, false); break;
    case 'kidney': baseGeometry = createKidneyGeometry(detail); break;
    default: baseGeometry = createOrganicGeometry(detail);
  }

  // Apply depth grid as displacement to the parametric shape
  if (depthGrid && depthGrid.length > 0) {
    applyDepthDisplacement(baseGeometry, depthGrid, depthMultiplier * 0.3);
  }
  
  baseGeometry.computeVertexNormals();
  return baseGeometry;
}

function createReliefGeometry(
  depthGrid: number[][],
  depthMultiplier: number,
  aspectRatio: number[],
  detail: number
): THREE.BufferGeometry {
  const rows = depthGrid.length;
  const cols = depthGrid[0]?.length || rows;
  const segX = Math.max(detail, cols * 4);
  const segY = Math.max(detail, rows * 4);
  
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const scaleX = (aspectRatio[0] || 1) * 2.5;
  const scaleY = (aspectRatio[1] || 1) * 2.5;
  const scaleZ = (aspectRatio[2] || 0.5) * depthMultiplier;
  
  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      
      // Sample depth from grid with bilinear interpolation
      const depth = sampleDepthGrid(depthGrid, u, v);
      
      // Create a curved surface (slightly spherical base + depth displacement)
      const cx = (u - 0.5) * 2; // -1 to 1
      const cy = (v - 0.5) * 2;
      const baseCurve = 0.3 * (1 - cx * cx - cy * cy); // slight dome shape
      
      const x = (u - 0.5) * scaleX;
      const y = (0.5 - v) * scaleY;
      const z = (depth * scaleZ) + baseCurve;
      
      vertices.push(x, y, z);
      uvs.push(u, 1 - v);
      normals.push(0, 0, 1); // Will be recomputed
    }
  }
  
  // Also create the back face for thickness
  const frontVertCount = vertices.length / 3;
  for (let iy = 0; iy <= segY; iy++) {
    const v = iy / segY;
    for (let ix = 0; ix <= segX; ix++) {
      const u = ix / segX;
      const idx = iy * (segX + 1) + ix;
      const x = vertices[idx * 3];
      const y = vertices[idx * 3 + 1];
      const z = -0.15; // Flat back
      
      vertices.push(x, y, z);
      uvs.push(u, 1 - v);
      normals.push(0, 0, -1);
    }
  }
  
  // Front face indices
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * (segX + 1) + ix;
      const b = a + 1;
      const c = a + (segX + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  
  // Back face indices (reversed winding)
  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = frontVertCount + iy * (segX + 1) + ix;
      const b = a + 1;
      const c = a + (segX + 1);
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  // Side edges to connect front and back
  // Top edge
  for (let ix = 0; ix < segX; ix++) {
    const f1 = ix;
    const f2 = ix + 1;
    const b1 = frontVertCount + ix;
    const b2 = frontVertCount + ix + 1;
    indices.push(f1, f2, b1);
    indices.push(f2, b2, b1);
  }
  // Bottom edge
  for (let ix = 0; ix < segX; ix++) {
    const f1 = segY * (segX + 1) + ix;
    const f2 = f1 + 1;
    const b1 = frontVertCount + segY * (segX + 1) + ix;
    const b2 = b1 + 1;
    indices.push(f1, b1, f2);
    indices.push(f2, b1, b2);
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function sampleDepthGrid(grid: number[][], u: number, v: number): number {
  const rows = grid.length;
  const cols = grid[0]?.length || 1;
  
  const gx = u * (cols - 1);
  const gy = v * (rows - 1);
  
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, cols - 1);
  const y1 = Math.min(y0 + 1, rows - 1);
  
  const fx = gx - x0;
  const fy = gy - y0;
  
  const v00 = grid[y0]?.[x0] ?? 0.5;
  const v10 = grid[y0]?.[x1] ?? 0.5;
  const v01 = grid[y1]?.[x0] ?? 0.5;
  const v11 = grid[y1]?.[x1] ?? 0.5;
  
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

function applyDepthDisplacement(geometry: THREE.BufferGeometry, depthGrid: number[][], strength: number) {
  const pos = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const normal = geometry.getAttribute('normal');
  
  if (!pos || !uv || !normal) return;
  
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const depth = sampleDepthGrid(depthGrid, u, v);
    const displacement = (depth - 0.5) * strength;
    
    pos.setX(i, pos.getX(i) + normal.getX(i) * displacement);
    pos.setY(i, pos.getY(i) + normal.getY(i) * displacement);
    pos.setZ(i, pos.getZ(i) + normal.getZ(i) * displacement);
  }
  
  pos.needsUpdate = true;
}

// =============== VOLUMETRIC 3D MODEL (Updated) ===============

interface Volumetric3DModelProps {
  shapeType: string;
  imageUrl?: string;
  scale?: number;
  detailLevel?: number;
  depthGrid?: number[][];
  depthMultiplier?: number;
  aspectRatio?: number[];
}

function Volumetric3DModel({ shapeType, imageUrl, scale = 1, detailLevel = 64, depthGrid, depthMultiplier = 1.5, aspectRatio = [1, 1, 0.5] }: Volumetric3DModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  useEffect(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      loader.load(
        imageUrl,
        (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
          setTexture(loadedTexture);
        },
        undefined,
        (error) => console.error('Error loading texture:', error)
      );
    }
  }, [imageUrl]);
  
  const geometry = useMemo(() => {
    if (depthGrid && depthGrid.length > 0) {
      return createDepthDisplacedGeometry(depthGrid, shapeType, depthMultiplier, aspectRatio, detailLevel);
    }
    
    // Fallback to parametric shapes
    switch (shapeType.toLowerCase()) {
      case 'heart': return createHeartGeometry(detailLevel);
      case 'brain': return createBrainGeometry(detailLevel);
      case 'lung': case 'lungs': return createLungGeometry(detailLevel, false);
      case 'kidney': return createKidneyGeometry(detailLevel);
      default: return createOrganicGeometry(detailLevel);
    }
  }, [shapeType, detailLevel, depthGrid, depthMultiplier, aspectRatio]);

  // Auto-scale
  useEffect(() => {
    if (meshRef.current) {
      const box = new THREE.Box3().setFromObject(meshRef.current);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const normalizeScale = 3.0 / maxDim;
        meshRef.current.scale.setScalar(normalizeScale * scale);
      }
      const center = new THREE.Vector3();
      box.getCenter(center);
      meshRef.current.position.sub(center);
    }
  }, [geometry, scale]);

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      {texture ? (
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.6}
          side={THREE.DoubleSide}
          envMapIntensity={1.0}
        />
      ) : (
        <meshStandardMaterial
          color="#e8b4b4"
          metalness={0.1}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}


// =============== GLOW RING EFFECT ===============

function GlowRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });
  
  return (
    <mesh ref={ringRef} position={[0, -2.5, 0]}>
      <ringGeometry args={[2.5, 2.8, 64]} />
      <meshBasicMaterial color="#00d4ff" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

// =============== MAIN SCENE ===============

function Scene({ modelData, selectedFeature, setSelectedFeature }: ModelViewerProps & { 
  selectedFeature: string | null; 
  setSelectedFeature: (id: string | null) => void;
}) {
  if (!modelData) {
    return null;
  }

  const shapeType = modelData.shapeType || 'organic';
  const scale = modelData.geometryParams?.scale || modelData.scale || 1.0;
  const detailLevel = modelData.geometryParams?.detailLevel || 64;
  const features = modelData.features ?? [];
  const objectType = modelData.objectType || 'Model';
  const depthGrid = modelData.depthGrid;
  const depthMultiplier = modelData.geometryParams?.depthMultiplier || modelData.depthMultiplier || 1.5;
  const aspectRatio = modelData.geometryParams?.aspectRatio || [1, 1, 0.5];

  return (
    <>
      {/* Dark space background with stars */}
      <color attach="background" args={['#050a18']} />
      <fog attach="fog" args={['#050a18', 15, 30]} />
      <Stars radius={50} depth={50} count={2000} factor={3} saturation={0.5} fade speed={1} />
      
      {/* Lighting - dramatic, cinematic */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color="#ffffff"
      />
      <pointLight position={[-3, 3, -3]} intensity={0.6} color="#7c3aed" distance={15} />
      <pointLight position={[3, 2, 3]} intensity={0.5} color="#00d4ff" distance={15} />
      <pointLight position={[0, -3, 4]} intensity={0.3} color="#0ea5e9" distance={12} />
      <spotLight 
        position={[0, 6, 0]} 
        angle={0.4} 
        penumbra={0.8} 
        intensity={0.8} 
        color="#00d4ff"
        distance={20}
      />
      
      {/* Model title displayed above */}
      <Html position={[0, 3.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="text-center" style={{ pointerEvents: 'none' }}>
          <h2 
            className="font-bold tracking-wider uppercase whitespace-nowrap"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '18px',
              color: '#00d4ff',
              textShadow: '0 0 20px rgba(0, 212, 255, 0.6), 0 0 40px rgba(0, 212, 255, 0.3)',
              letterSpacing: '3px'
            }}
          >
            {objectType}
          </h2>
          <div 
            style={{
              width: '60px',
              height: '2px',
              margin: '6px auto 0',
              background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
            }}
          />
        </div>
      </Html>
      
      {/* Floating model group */}
      <FloatingGroup>
        <group onClick={() => setSelectedFeature(null)}>
          <Volumetric3DModel 
            shapeType={shapeType}
            imageUrl={modelData.originalImageUrl}
            scale={scale}
            detailLevel={detailLevel}
            depthGrid={depthGrid}
            depthMultiplier={depthMultiplier}
            aspectRatio={aspectRatio}
          />
          
          {/* Feature Hotspots */}
          {features.map((feature) => (
            <FeatureHotspot3D
              key={feature.id}
              feature={feature}
              shapeType={shapeType}
              isSelected={selectedFeature === feature.id}
              onSelect={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
            />
          ))}
        </group>
      </FloatingGroup>
      
      {/* Subtle glow ring beneath */}
      <GlowRing />
      
      <Environment preset="night" />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.8}
        target={[0, 0, 0]}
      />
    </>
  );
}

// =============== MAIN COMPONENT ===============

export default function ModelViewer({ modelData }: ModelViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [featurePanelOpen, setFeaturePanelOpen] = useState(false);
  const features = modelData?.features ?? [];
  const objectType = modelData?.objectType;
  const shapeType = modelData?.shapeType || 'organic';

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden relative" style={{ background: '#050a18' }}>
      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 40 }}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <Scene 
          modelData={modelData} 
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      </Canvas>
      
      {/* Feature Panel - Collapsible */}
      {features.length > 0 && (
        <div 
          className="absolute top-4 left-4 rounded-xl max-w-[220px] z-10"
          style={{
            background: 'rgba(5, 10, 24, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)'
          }}
        >
          <button
            onClick={() => setFeaturePanelOpen(!featurePanelOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
              <h3 
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: '#00d4ff' }}
              >
                {objectType || "Features"}
              </h3>
            </div>
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{ color: '#00d4ff', transform: featurePanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {featurePanelOpen && (
            <div className="px-3 pb-3">
              <p className="text-[10px] mb-2" style={{ color: 'rgba(150, 180, 220, 0.7)' }}>
                Click markers to explore
              </p>
              <div className="space-y-1 max-h-[250px] overflow-y-auto">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all flex items-center gap-2"
                    style={{
                      background: selectedFeature === feature.id ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
                      color: selectedFeature === feature.id ? '#00d4ff' : 'rgba(180, 200, 230, 0.7)',
                      border: selectedFeature === feature.id ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid transparent'
                    }}
                  >
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ 
                        backgroundColor: feature.color || "#00d4ff",
                        boxShadow: `0 0 6px ${feature.color || '#00d4ff'}`
                      }}
                    />
                    <span className="truncate">{feature.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Instructions */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-4 py-2 rounded-full"
        style={{
          background: 'rgba(5, 10, 24, 0.7)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(150, 180, 220, 0.6)',
          border: '1px solid rgba(0, 212, 255, 0.1)'
        }}
      >
        🎯 Touch features • 🔄 Rotate 360° • 🔍 Zoom
      </div>
    </div>
  );
}
