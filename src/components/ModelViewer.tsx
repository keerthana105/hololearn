import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Html, ContactShadows, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { Grid, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Maximize2, Info, Box } from "lucide-react";

interface Feature {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z?: number };
  color: string;
}

interface ModelViewerProps {
  modelData: {
    matchedModelId?: string;
    objectType?: string;
    features?: Feature[];
    originalImageUrl?: string;
    confirmed?: boolean;
  } | null;
  glbUrl?: string;
  features?: Feature[];
}

// =============== GLB MODEL LOADER ===============

function GLBModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      // Apply wireframe and PBR settings to all meshes
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              mat.wireframe = wireframe;
              // Enhance PBR if material is standard/physical
              if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                mat.envMapIntensity = 1.5;
                mat.needsUpdate = true;
              }
            });
          }
        }
      });
    }
  }, [scene, wireframe]);

  return (
    <Center>
      <primitive ref={modelRef} object={scene.clone()} scale={1.5} />
    </Center>
  );
}

// =============== FALLBACK PARAMETRIC MODEL ===============

function FallbackModel({ shapeType, wireframe }: { shapeType: string; wireframe: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = (() => {
    switch (shapeType) {
      case 'heart': return new THREE.SphereGeometry(1.2, 64, 64);
      case 'brain': return new THREE.SphereGeometry(1.3, 64, 64);
      case 'lungs': return new THREE.CapsuleGeometry(0.8, 1.5, 32, 64);
      case 'kidney': return new THREE.CapsuleGeometry(0.6, 1.0, 32, 64);
      case 'liver': return new THREE.SphereGeometry(1.4, 64, 64);
      case 'stomach': return new THREE.CapsuleGeometry(0.7, 1.2, 32, 64);
      case 'eye': return new THREE.SphereGeometry(1.0, 64, 64);
      case 'ear': return new THREE.TorusGeometry(0.8, 0.3, 32, 64);
      case 'skeleton': return new THREE.CylinderGeometry(0.5, 0.4, 3, 32);
      case 'tooth': return new THREE.ConeGeometry(0.6, 1.5, 32);
      default: return new THREE.SphereGeometry(1.2, 64, 64);
    }
  })();

  const color = (() => {
    switch (shapeType) {
      case 'heart': return '#cc3333';
      case 'brain': return '#e8b4b8';
      case 'lungs': return '#ff9999';
      case 'kidney': return '#8b4513';
      case 'liver': return '#8b2500';
      case 'stomach': return '#cd853f';
      case 'eye': return '#ffffff';
      case 'skeleton': return '#f5f5dc';
      default: return '#cc6666';
    }
  })();

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshPhysicalMaterial
        color={color}
        roughness={0.4}
        metalness={0.1}
        clearcoat={0.3}
        clearcoatRoughness={0.2}
        wireframe={wireframe}
        envMapIntensity={1.5}
      />
    </mesh>
  );
}

// =============== FLOATING ANIMATION ===============

function FloatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.015;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

// =============== FEATURE HOTSPOT ===============

function FeatureHotspot3D({ feature, isSelected, onSelect }: { feature: Feature; isSelected: boolean; onSelect: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position: [number, number, number] = [
    feature.position.x,
    feature.position.y,
    feature.position.z ?? 0
  ];

  useFrame((state) => {
    if (meshRef.current) meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.3);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={feature.color || "#00d4ff"} emissive={feature.color || "#00d4ff"} emissiveIntensity={isSelected ? 3 : 1.5} metalness={0.5} roughness={0.2} transparent opacity={0.9} />
      </mesh>
      {/* Outer ring */}
      <mesh>
        <ringGeometry args={[0.1, 0.14, 32]} />
        <meshBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={isSelected ? 0.8 : 0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Label */}
      {isSelected && (
        <Html position={[0.2, 0.15, 0]} distanceFactor={5} style={{ pointerEvents: 'none' }}>
          <div className="bg-background/95 backdrop-blur-md border border-primary/30 rounded-lg p-3 shadow-xl min-w-[200px] max-w-[280px]">
            <h4 className="text-sm font-bold text-primary mb-1">{feature.name}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// =============== AUTO-SCALE ===============

function AutoScale({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (groupRef.current) {
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 3;
      if (maxDim > 0) {
        const scale = targetSize / maxDim;
        groupRef.current.scale.setScalar(scale);
        groupRef.current.position.sub(center.multiplyScalar(scale));
      }
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.position.set(0, 1, 5);
        camera.lookAt(0, 0, 0);
      }
    }
  }, [children, camera]);

  return <group ref={groupRef}>{children}</group>;
}

// =============== LOADING INDICATOR ===============

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading 3D model...</span>
      </div>
    </Html>
  );
}

// =============== MAIN COMPONENT ===============

export default function ModelViewer({ modelData, glbUrl, features: externalFeatures }: ModelViewerProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [glbAvailable, setGlbAvailable] = useState(false);
  const [resolvedGlbUrl, setResolvedGlbUrl] = useState<string | null>(null);

  const modelId = modelData?.matchedModelId;
  const features = externalFeatures || modelData?.features || [];
  const objectType = modelData?.objectType || "3D Model";

  // Check if GLB file exists in public/models/
  useEffect(() => {
    if (glbUrl) {
      setResolvedGlbUrl(glbUrl);
      setGlbAvailable(true);
      return;
    }

    if (modelId && modelId !== "unknown") {
      const url = `/models/${modelId}.glb`;
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (res.ok) {
            setResolvedGlbUrl(url);
            setGlbAvailable(true);
          } else {
            setGlbAvailable(false);
            setResolvedGlbUrl(null);
          }
        })
        .catch(() => {
          setGlbAvailable(false);
          setResolvedGlbUrl(null);
        });
    }
  }, [modelId, glbUrl]);

  // Estimate polygon count
  const polyCount = glbAvailable ? "~50K+" : "~8K";

  if (!modelData) {
    return (
      <div className="w-full h-full rounded-2xl overflow-hidden card-glass gradient-border flex items-center justify-center">
        <div className="text-center p-8">
          <Box className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Upload an image to generate a 3D model</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden card-glass gradient-border relative">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5 bg-background/80 backdrop-blur-md rounded-lg p-1 border border-border/50">
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`p-2 rounded-md transition-colors ${wireframe ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Toggle wireframe"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className={`p-2 rounded-md transition-colors ${showFeatures ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Toggle feature hotspots"
        >
          {showFeatures ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-md transition-colors ${autoRotate ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Toggle auto-rotate"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Info badge */}
      <div className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <Info className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            {objectType} • {polyCount} polys
            {glbAvailable && <span className="text-green-500 ml-1">• GLB</span>}
          </span>
        </div>
      </div>

      {/* Feature list */}
      {showFeatures && features.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 bg-background/80 backdrop-blur-md rounded-lg p-2 border border-border/50 max-w-[200px]">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Features</p>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFeature(selectedFeature === f.id ? null : f.id)}
                className={`w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  selectedFeature === f.id ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        shadows
        onClick={() => setSelectedFeature(null)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} />
        <spotLight position={[0, 8, 0]} intensity={0.5} angle={0.5} penumbra={1} />

        <Environment preset="studio" />

        <Suspense fallback={<LoadingFallback />}>
          <FloatingGroup>
            <AutoScale>
              {glbAvailable && resolvedGlbUrl ? (
                <GLBModel url={resolvedGlbUrl} wireframe={wireframe} />
              ) : (
                <FallbackModel shapeType={modelId || "heart"} wireframe={wireframe} />
              )}

              {/* Feature hotspots */}
              {showFeatures && features.map((feature) => (
                <FeatureHotspot3D
                  key={feature.id}
                  feature={feature}
                  isSelected={selectedFeature === feature.id}
                  onSelect={() => setSelectedFeature(selectedFeature === feature.id ? null : feature.id)}
                />
              ))}
            </AutoScale>
          </FloatingGroup>
        </Suspense>

        <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={12}
          autoRotate={autoRotate}
          autoRotateSpeed={1.5}
          enablePan
          maxPolarAngle={Math.PI * 0.85}
          minPolarAngle={Math.PI * 0.15}
        />
      </Canvas>
    </div>
  );
}
