import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, Grid } from "@react-three/drei";
import * as THREE from "three";

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
  } | null;
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

function Scene({ modelData }: ModelViewerProps) {
  if (!modelData?.depthGrid) {
    return null;
  }

  const scale = modelData.scale ?? 1;
  const ambient = modelData.lighting?.ambient ?? 0.4;
  const directional = modelData.lighting?.directional;

  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight
        position={directional?.position as [number, number, number] ?? [5, 5, 5]}
        intensity={directional?.intensity ?? 0.8}
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#7c3aed" />
      
      <group rotation={[-Math.PI / 4, 0, 0]}>
        <DepthMesh depthGrid={modelData.depthGrid} scale={scale} />
        <WireframeMesh depthGrid={modelData.depthGrid} scale={scale} />
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
  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-background">
      <Canvas
        camera={{ position: [0, 3, 6], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <Scene modelData={modelData} />
      </Canvas>
    </div>
  );
}
