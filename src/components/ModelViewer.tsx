import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html } from "@react-three/drei";
import * as THREE from "three";

interface Feature {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number };
  color: string;
}

interface ModelViewerProps {
  modelData: {
    depthGrid: number[][];
    objectType?: string;
    suggestedMaterials?: string[];
    lighting?: {
      ambient?: number;
      directional?: { intensity: number; position: number[] };
    };
    scale?: number;
    depthMultiplier?: number;
    features?: Feature[];
    originalImageUrl?: string;
  } | null;
}

interface FeatureHotspotProps {
  feature: Feature;
  gridSize: number;
  depthGrid: number[][];
  scale: number;
  depthMultiplier: number;
  isSelected: boolean;
  onSelect: () => void;
}

function FeatureHotspot({ feature, gridSize, depthGrid, scale, depthMultiplier, isSelected, onSelect }: FeatureHotspotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const position = useMemo(() => {
    const meshSize = 4;
    const x = (feature.position.x - 0.5) * meshSize;
    const y = (0.5 - feature.position.y) * meshSize;
    
    const gridX = Math.floor(feature.position.x * (gridSize - 1));
    const gridY = Math.floor(feature.position.y * (gridSize - 1));
    const depth = depthGrid[gridY]?.[gridX] ?? 0.5;
    const z = (1 - depth) * depthMultiplier * scale + 0.2;
    
    return [x, y, z] as [number, number, number];
  }, [feature.position, gridSize, depthGrid, scale, depthMultiplier]);

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
        <sphereGeometry args={[0.08, 16, 16]} />
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
        <ringGeometry args={[0.1, 0.13, 32]} />
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

function TexturedDepthMesh({ 
  depthGrid, 
  scale = 1, 
  depthMultiplier = 3,
  imageUrl 
}: { 
  depthGrid: number[][]; 
  scale: number;
  depthMultiplier: number;
  imageUrl?: string;
}) {
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
          loadedTexture.generateMipmaps = true;
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
    const size = depthGrid.length;
    const meshSize = 4;
    const segments = Math.min(size - 1, 256); // Limit for performance
    const geo = new THREE.PlaneGeometry(meshSize, meshSize, segments, segments);
    const positions = geo.attributes.position.array as Float32Array;
    
    const step = (size - 1) / segments;
    
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const vertexIndex = (i * (segments + 1) + j) * 3 + 2;
        const srcI = Math.min(Math.floor(i * step), size - 1);
        const srcJ = Math.min(Math.floor(j * step), size - 1);
        const depth = depthGrid[srcI]?.[srcJ] ?? 0.5;
        // Depth 0 = closest (max z), depth 1 = farthest (min z)
        positions[vertexIndex] = (1 - depth) * depthMultiplier * scale;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale, depthMultiplier]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      {texture ? (
        <meshStandardMaterial
          map={texture}
          metalness={0.05}
          roughness={0.7}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      ) : (
        <meshStandardMaterial
          color="#a0c4ff"
          metalness={0.1}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}

function WireframeOverlay({ depthGrid, scale = 1, depthMultiplier = 3 }: { depthGrid: number[][]; scale: number; depthMultiplier: number }) {
  const geometry = useMemo(() => {
    const size = depthGrid.length;
    const meshSize = 4;
    const wireframeRes = Math.min(size, 48);
    const geo = new THREE.PlaneGeometry(meshSize, meshSize, wireframeRes - 1, wireframeRes - 1);
    const positions = geo.attributes.position.array as Float32Array;
    
    const step = (size - 1) / (wireframeRes - 1);
    for (let i = 0; i < wireframeRes; i++) {
      for (let j = 0; j < wireframeRes; j++) {
        const vertexIndex = (i * wireframeRes + j) * 3 + 2;
        const srcI = Math.min(Math.floor(i * step), size - 1);
        const srcJ = Math.min(Math.floor(j * step), size - 1);
        const depth = depthGrid[srcI]?.[srcJ] ?? 0.5;
        positions[vertexIndex] = (1 - depth) * depthMultiplier * scale + 0.01;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale, depthMultiplier]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.12} />
    </mesh>
  );
}

function Scene({ modelData, selectedFeature, setSelectedFeature }: ModelViewerProps & { 
  selectedFeature: string | null; 
  setSelectedFeature: (id: string | null) => void;
}) {
  if (!modelData?.depthGrid) {
    return null;
  }

  const scale = modelData.scale ?? 1.5;
  const depthMultiplier = modelData.depthMultiplier ?? 3.0;
  const ambient = modelData.lighting?.ambient ?? 0.6;
  const directional = modelData.lighting?.directional;
  const features = modelData.features ?? [];

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight
        position={directional?.position as [number, number, number] ?? [3, 5, 3]}
        intensity={directional?.intensity ?? 1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-3, 3, -3]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[3, 2, 3]} intensity={0.4} color="#00d4ff" />
      <pointLight position={[0, -2, 4]} intensity={0.3} color="#ffffff" />
      
      <group rotation={[-Math.PI / 4.5, 0, 0]} onClick={() => setSelectedFeature(null)}>
        <TexturedDepthMesh 
          depthGrid={modelData.depthGrid} 
          scale={scale} 
          depthMultiplier={depthMultiplier}
          imageUrl={modelData.originalImageUrl}
        />
        <WireframeOverlay 
          depthGrid={modelData.depthGrid} 
          scale={scale} 
          depthMultiplier={depthMultiplier}
        />
        
        {features.map((feature) => (
          <FeatureHotspot
            key={feature.id}
            feature={feature}
            gridSize={modelData.depthGrid.length}
            depthGrid={modelData.depthGrid}
            scale={scale}
            depthMultiplier={depthMultiplier}
            isSelected={selectedFeature === feature.id}
            onSelect={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
          />
        ))}
      </group>
      
      <Grid
        position={[0, -4, 0]}
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
        minDistance={3}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.4}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function ModelViewer({ modelData }: ModelViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const features = modelData?.features ?? [];
  const objectType = modelData?.objectType;

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-background relative">
      <Canvas
        camera={{ position: [0, 4, 8], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Scene 
          modelData={modelData} 
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      </Canvas>
      
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
        🎯 Click hotspots • 🔄 Drag to rotate • 🔍 Scroll to zoom
      </div>
    </div>
  );
}
