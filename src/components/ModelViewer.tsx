import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html } from "@react-three/drei";
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
}

interface ModelViewerProps {
  modelData: {
    shapeType?: string;
    objectType?: string;
    geometryParams?: GeometryParams;
    features?: Feature[];
    originalImageUrl?: string;
    // Legacy support
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
  
  // Generate vertices using parametric heart surface
  for (let lat = 0; lat <= latSegments; lat++) {
    const v = lat / latSegments;
    const theta = v * Math.PI;
    
    for (let lon = 0; lon <= lonSegments; lon++) {
      const u = lon / lonSegments;
      const phi = u * 2 * Math.PI;
      
      // Heart parametric equations
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      
      // Modified sphere with heart shape deformation
      let x = sinTheta * cosPhi;
      let y = cosTheta;
      let z = sinTheta * sinPhi;
      
      // Apply heart deformation
      const heartFactor = Math.pow(Math.abs(y), 0.3);
      const indent = y < 0 ? 0.3 * (1 - heartFactor) * Math.pow(Math.cos(phi), 2) : 0;
      const bulge = y > 0.2 ? 0.2 * Math.pow(1 - y, 2) : 0;
      
      // Bottom point
      if (y < -0.7) {
        const pointFactor = (-y - 0.7) / 0.3;
        x *= 1 - pointFactor * 0.8;
        z *= 1 - pointFactor * 0.8;
      }
      
      // Top lobes
      if (y > 0) {
        const lobeFactor = y * 0.5;
        const lobeOffset = Math.abs(Math.sin(phi)) * lobeFactor;
        x *= 1 + lobeOffset * 0.3;
        z *= 1 + lobeOffset * 0.3;
      }
      
      // Apply indent for top cleft
      if (y > 0.3) {
        const cleftDepth = 0.4 * Math.pow((y - 0.3) / 0.7, 2);
        const cleftWidth = Math.pow(Math.cos(phi), 4);
        const radialFactor = Math.sqrt(x * x + z * z);
        x -= cleftWidth * cleftDepth * Math.sign(x) * 0.5;
      }
      
      // Scale
      const scale = 1.8;
      x *= scale;
      y *= scale;
      z *= scale;
      
      vertices.push(x, y, z);
      
      // Simple normal approximation
      const nx = x, ny = y, nz = z;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, 1 - v);
    }
  }
  
  // Generate indices
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
  
  // Simple noise function for sulci
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
      
      // Base ellipsoid (brain proportions: wider than tall)
      let x = sinTheta * cosPhi * 1.3;  // Wider
      let y = cosTheta * 0.9;            // Shorter top-bottom
      let z = sinTheta * sinPhi * 1.1;   // Medium front-back
      
      // Add sulci (grooves) - multiple frequencies
      const sulci1 = noise(x, y, z, 8) * 0.08;
      const sulci2 = noise(x * 2, y * 2, z * 2, 12) * 0.04;
      const sulci3 = noise(x * 0.5, y * 0.5, z * 0.5, 4) * 0.06;
      const sulciTotal = sulci1 + sulci2 + sulci3;
      
      // Central fissure (longitudinal)
      const fissureDepth = 0.15 * Math.exp(-Math.pow(z * 8, 2));
      
      // Flatten the bottom
      if (y < -0.3) {
        const flatFactor = (-y - 0.3) / 0.6;
        y = -0.3 - flatFactor * 0.2;
      }
      
      // Apply deformations
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
      
      // Elongated base shape
      let x = sinTheta * cosPhi * 0.7;
      let y = cosTheta * 1.4;  // Taller
      let z = sinTheta * sinPhi * 0.5;  // Thinner
      
      // Taper at top
      if (y > 0) {
        const taperFactor = 1 - y * 0.3;
        x *= taperFactor;
        z *= taperFactor;
      }
      
      // Create lobes
      const lobeSeparation = isLeft ? 0.1 : 0.15;
      if (y < 0.2 && y > -0.8) {
        const lobeIndent = Math.sin((y + 0.3) * 3) * 0.1 * (1 - Math.abs(sinPhi));
        x += lobeIndent;
      }
      
      // Inner curve (where heart sits)
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
      
      // Bean shape base
      let x = sinTheta * cosPhi;
      let y = cosTheta * 0.5;  // Shorter
      let z = sinTheta * sinPhi * 0.4;  // Thin
      
      // Create the hilum (inner indent)
      const hilumAngle = Math.PI;
      const hilumDepth = 0.3 * Math.exp(-Math.pow((phi - hilumAngle) * 2, 2));
      const hilumY = Math.exp(-Math.pow(y * 3, 2));
      x -= hilumDepth * hilumY * cosPhi;
      z -= hilumDepth * hilumY * sinPhi * 0.5;
      
      // Make it bean-curved
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
  
  // Simple noise for organic shape
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
      
      // Add organic variation
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

// =============== 3D FEATURE HOTSPOT ===============

interface FeatureHotspot3DProps {
  feature: Feature;
  shapeType: string;
  isSelected: boolean;
  onSelect: () => void;
}

function FeatureHotspot3D({ feature, shapeType, isSelected, onSelect }: FeatureHotspot3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert 2D position to 3D position on the shape surface
  const position = useMemo(() => {
    const { x, y, z } = feature.position;
    
    // If z is provided, use it directly
    if (z !== undefined) {
      return [x * 2 - 1, y * 2 - 1, z] as [number, number, number];
    }
    
    // Otherwise, map 2D to 3D sphere surface
    const theta = y * Math.PI;
    const phi = x * 2 * Math.PI;
    
    let radius = 1.6;
    
    // Adjust radius based on shape type
    switch (shapeType) {
      case 'heart':
        radius = 2.0;
        break;
      case 'brain':
        radius = 1.7;
        break;
      case 'lung':
      case 'lungs':
        radius = 1.5;
        break;
      case 'kidney':
        radius = 2.2;
        break;
      default:
        radius = 1.8;
    }
    
    const px = Math.sin(theta) * Math.cos(phi) * radius;
    const py = Math.cos(theta) * radius;
    const pz = Math.sin(theta) * Math.sin(phi) * radius;
    
    return [px, py, pz] as [number, number, number];
  }, [feature.position, shapeType]);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
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
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={feature.color || "#00d4ff"} 
          emissive={feature.color || "#00d4ff"}
          emissiveIntensity={isSelected ? 2 : 1}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      
      {/* Outer ring */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.12, 0.16, 32]} />
        <meshBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Tooltip */}
      {isSelected && (
        <Html
          position={[0, 0.4, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="bg-background/95 backdrop-blur-sm border border-primary/40 rounded-lg p-4 shadow-2xl min-w-[220px] max-w-[300px]"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: feature.color || "#00d4ff" }}
              />
              <h4 className="font-semibold text-primary text-sm">{feature.name}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============== VOLUMETRIC 3D MODEL ===============

interface Volumetric3DModelProps {
  shapeType: string;
  imageUrl?: string;
  scale?: number;
  detailLevel?: number;
}

function Volumetric3DModel({ shapeType, imageUrl, scale = 1, detailLevel = 48 }: Volumetric3DModelProps) {
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
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
        }
      );
    }
  }, [imageUrl]);
  
  const geometry = useMemo(() => {
    const detail = detailLevel;
    
    switch (shapeType.toLowerCase()) {
      case 'heart':
        return createHeartGeometry(detail);
      case 'brain':
        return createBrainGeometry(detail);
      case 'lung':
      case 'lungs':
        return createLungGeometry(detail, false);
      case 'kidney':
        return createKidneyGeometry(detail);
      case 'organ':
      case 'organic':
      case 'circular':
      case 'irregular':
      default:
        return createOrganicGeometry(detail);
    }
  }, [shapeType, detailLevel]);

  return (
    <mesh ref={meshRef} geometry={geometry} scale={scale} castShadow receiveShadow>
      {texture ? (
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.6}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
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

// =============== WIREFRAME OVERLAY ===============

function WireframeOverlay3D({ shapeType, scale = 1 }: { shapeType: string; scale?: number }) {
  const geometry = useMemo(() => {
    const detail = 24; // Lower detail for wireframe
    
    switch (shapeType.toLowerCase()) {
      case 'heart':
        return createHeartGeometry(detail);
      case 'brain':
        return createBrainGeometry(detail);
      case 'lung':
      case 'lungs':
        return createLungGeometry(detail, false);
      case 'kidney':
        return createKidneyGeometry(detail);
      default:
        return createOrganicGeometry(detail);
    }
  }, [shapeType]);

  return (
    <mesh geometry={geometry} scale={scale * 1.002}>
      <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.15} />
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

  // Determine shape type (with legacy fallback)
  const shapeType = modelData.shapeType || 'organic';
  const scale = modelData.geometryParams?.scale || modelData.scale || 1.0;
  const detailLevel = modelData.geometryParams?.detailLevel || 48;
  const features = modelData.features ?? [];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3, 3, -3]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[3, 2, 3]} intensity={0.4} color="#00d4ff" />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#ffffff" />
      
      {/* Main 3D Model - NO fixed rotation, full 360° rotation enabled */}
      <group onClick={() => setSelectedFeature(null)}>
        <Volumetric3DModel 
          shapeType={shapeType}
          imageUrl={modelData.originalImageUrl}
          scale={scale}
          detailLevel={detailLevel}
        />
        <WireframeOverlay3D shapeType={shapeType} scale={scale} />
        
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
      
      <Grid
        position={[0, -3, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#00d4ff"
        fadeDistance={25}
        fadeStrength={1}
        infiniteGrid
      />
      
      <Environment preset="city" />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
        target={[0, 0, 0]}
      />
    </>
  );
}

// =============== MAIN COMPONENT ===============

export default function ModelViewer({ modelData }: ModelViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const features = modelData?.features ?? [];
  const objectType = modelData?.objectType;
  const shapeType = modelData?.shapeType || 'organic';

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-background relative">
      <Canvas
        camera={{ position: [0, 2, 5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene 
          modelData={modelData} 
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      </Canvas>
      
      {/* Shape Type Badge */}
      <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs px-3 py-1.5 rounded-full font-medium uppercase tracking-wider">
        {shapeType} Model
      </div>
      
      {/* Feature Panel */}
      {features.length > 0 && (
        <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 max-w-[220px] shadow-xl">
          <h3 className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
            {objectType || "Detected Features"}
          </h3>
          <p className="text-[10px] text-muted-foreground mb-3">Click markers to learn more</p>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded transition-all flex items-center gap-2 ${
                  selectedFeature === feature.id
                    ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-white/20" 
                  style={{ backgroundColor: feature.color || "#00d4ff" }}
                />
                <span className="truncate">{feature.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50">
        🎯 Click hotspots • 🔄 Drag to rotate 360° • 🔍 Scroll to zoom
      </div>
    </div>
  );
}
