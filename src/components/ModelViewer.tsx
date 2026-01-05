import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
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
    const z = (1 - depth) * depthMultiplier * scale + 0.15;
    
    return [x, y, z] as [number, number, number];
  }, [feature.position, gridSize, depthGrid, scale, depthMultiplier]);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
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
          emissiveIntensity={isSelected ? 1.5 : 0.8}
        />
      </mesh>
      
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.12, 0.15, 32]} />
        <meshBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      
      {isSelected && (
        <Html
          position={[0, 0.35, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div 
            className="bg-background/95 backdrop-blur-sm border border-primary/30 rounded-lg p-3 shadow-xl min-w-[200px] max-w-[280px]"
            style={{ pointerEvents: 'auto' }}
          >
            <h4 className="font-semibold text-primary text-sm mb-1">{feature.name}</h4>
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
  depthMultiplier = 2,
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
      loader.load(
        imageUrl,
        (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
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
    const geo = new THREE.PlaneGeometry(meshSize, meshSize, size - 1, size - 1);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const vertexIndex = (i * size + j) * 3 + 2;
        const depth = depthGrid[i]?.[j] ?? 0.5;
        // Invert depth so 0 = closest = highest z
        positions[vertexIndex] = (1 - depth) * depthMultiplier * scale;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale, depthMultiplier]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      {texture ? (
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      ) : (
        <meshStandardMaterial
          color="#00d4ff"
          metalness={0.2}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      )}
    </mesh>
  );
}

function WireframeOverlay({ depthGrid, scale = 1, depthMultiplier = 2 }: { depthGrid: number[][]; scale: number; depthMultiplier: number }) {
  const geometry = useMemo(() => {
    const size = depthGrid.length;
    const meshSize = 4;
    // Use lower resolution for wireframe
    const wireframeRes = Math.min(size, 32);
    const geo = new THREE.PlaneGeometry(meshSize, meshSize, wireframeRes - 1, wireframeRes - 1);
    const positions = geo.attributes.position.array as Float32Array;
    
    const step = size / wireframeRes;
    for (let i = 0; i < wireframeRes; i++) {
      for (let j = 0; j < wireframeRes; j++) {
        const vertexIndex = (i * wireframeRes + j) * 3 + 2;
        const srcI = Math.floor(i * step);
        const srcJ = Math.floor(j * step);
        const depth = depthGrid[srcI]?.[srcJ] ?? 0.5;
        positions[vertexIndex] = (1 - depth) * depthMultiplier * scale + 0.02;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale, depthMultiplier]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.15} />
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
  const depthMultiplier = modelData.depthMultiplier ?? 2.5;
  const ambient = modelData.lighting?.ambient ?? 0.5;
  const directional = modelData.lighting?.directional;
  const features = modelData.features ?? [];

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight
        position={directional?.position as [number, number, number] ?? [3, 5, 3]}
        intensity={directional?.intensity ?? 1.0}
        castShadow
      />
      <pointLight position={[-3, 3, -3]} intensity={0.4} color="#7c3aed" />
      <pointLight position={[3, 2, 3]} intensity={0.3} color="#00d4ff" />
      
      <group rotation={[-Math.PI / 5, 0, 0]} onClick={() => setSelectedFeature(null)}>
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
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.3}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function ModelViewer({ modelData }: ModelViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const features = modelData?.features ?? [];

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-background relative">
      <Canvas
        camera={{ position: [0, 4, 7], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Scene 
          modelData={modelData} 
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      </Canvas>
      
      {features.length > 0 && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 max-w-[200px]">
          <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
            {modelData?.objectType || "Features"}
          </h3>
          <div className="space-y-1">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${
                  selectedFeature === feature.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: feature.color || "#00d4ff" }}
                />
                <span className="truncate">{feature.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
        Click hotspots to explore • Drag to rotate
      </div>
    </div>
  );
}
