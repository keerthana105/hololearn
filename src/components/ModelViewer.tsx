import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Float, Grid, Html } from "@react-three/drei";
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
    features?: Feature[];
  } | null;
}

interface FeatureHotspotProps {
  feature: Feature;
  gridSize: number;
  depthGrid: number[][];
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
}

function FeatureHotspot({ feature, gridSize, depthGrid, scale, isSelected, onSelect }: FeatureHotspotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert normalized position to 3D coordinates
  const position = useMemo(() => {
    const x = (feature.position.x - 0.5) * 4;
    const y = (0.5 - feature.position.y) * 4;
    
    // Sample depth at this position
    const gridX = Math.floor(feature.position.x * (gridSize - 1));
    const gridY = Math.floor(feature.position.y * (gridSize - 1));
    const depth = depthGrid[gridY]?.[gridX] ?? 0.5;
    const z = (1 - depth) * 1.5 * scale + 0.2;
    
    return [x, y, z] as [number, number, number];
  }, [feature.position, gridSize, depthGrid, scale]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
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
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color={feature.color || "#00d4ff"} 
          emissive={feature.color || "#00d4ff"}
          emissiveIntensity={isSelected ? 1 : 0.5}
        />
      </mesh>
      
      {/* Pulsing ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.15, 0.18, 32]} />
        <meshBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={0.5} />
      </mesh>
      
      {isSelected && (
        <Html
          position={[0, 0.4, 0]}
          center
          style={{
            pointerEvents: 'none',
          }}
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

function DepthMesh({ depthGrid, scale = 1 }: { depthGrid: number[][]; scale: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const size = depthGrid.length;
    const geo = new THREE.PlaneGeometry(4, 4, size - 1, size - 1);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const vertexIndex = (i * size + j) * 3 + 2;
        const depth = depthGrid[i]?.[j] ?? 0.5;
        positions[vertexIndex] = (1 - depth) * 1.5 * scale;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#00d4ff"
          metalness={0.3}
          roughness={0.4}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
    </Float>
  );
}

function WireframeMesh({ depthGrid, scale = 1 }: { depthGrid: number[][]; scale: number }) {
  const geometry = useMemo(() => {
    const size = depthGrid.length;
    const geo = new THREE.PlaneGeometry(4, 4, size - 1, size - 1);
    const positions = geo.attributes.position.array as Float32Array;
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const vertexIndex = (i * size + j) * 3 + 2;
        const depth = depthGrid[i]?.[j] ?? 0.5;
        positions[vertexIndex] = (1 - depth) * 1.5 * scale;
      }
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [depthGrid, scale]);

  return (
    <mesh geometry={geometry} position={[0, 0.01, 0]}>
      <meshBasicMaterial color="#7c3aed" wireframe transparent opacity={0.3} />
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

  const scale = modelData.scale ?? 1;
  const ambient = modelData.lighting?.ambient ?? 0.4;
  const directional = modelData.lighting?.directional;
  const features = modelData.features ?? [];

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight
        position={directional?.position as [number, number, number] ?? [5, 5, 5]}
        intensity={directional?.intensity ?? 0.8}
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#7c3aed" />
      
      <group rotation={[-Math.PI / 4, 0, 0]} onClick={() => setSelectedFeature(null)}>
        <DepthMesh depthGrid={modelData.depthGrid} scale={scale} />
        <WireframeMesh depthGrid={modelData.depthGrid} scale={scale} />
        
        {/* Feature Hotspots */}
        {features.map((feature) => (
          <FeatureHotspot
            key={feature.id}
            feature={feature}
            gridSize={modelData.depthGrid.length}
            depthGrid={modelData.depthGrid}
            scale={scale}
            isSelected={selectedFeature === feature.id}
            onSelect={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
          />
        ))}
      </group>
      
      <Grid
        position={[0, -2, 0]}
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
      
      <Environment preset="night" />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={15}
        autoRotate
        autoRotateSpeed={0.5}
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
        camera={{ position: [0, 3, 6], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Scene 
          modelData={modelData} 
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
        />
      </Canvas>
      
      {/* Feature List Panel */}
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
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: feature.color || "#00d4ff" }}
                />
                {feature.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
        Click hotspots to explore features
      </div>
    </div>
  );
}
