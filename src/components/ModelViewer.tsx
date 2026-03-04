import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Html, ContactShadows, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { Grid, Eye, EyeOff, RotateCcw, ZoomIn, ZoomOut, Info, Box, ChevronDown } from "lucide-react";

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

function GLBModel({ url, wireframe, onLoaded }: { url: string; wireframe: boolean; onLoaded?: (scene: THREE.Group) => void }) {
  const { scene } = useGLTF(url);
  const clonedScene = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const clone = scene.clone(true);
    clonedScene.current = clone;
    
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            mat.wireframe = wireframe;
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
              mat.envMapIntensity = 1.8;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });

    if (onLoaded) onLoaded(clone);
  }, [scene, wireframe, onLoaded]);

  return (
    <Center>
      <primitive object={clonedScene.current || scene.clone()} />
    </Center>
  );
}

// =============== FALLBACK PARAMETRIC MODEL ===============

function FallbackModel({ shapeType, wireframe }: { shapeType: string; wireframe: boolean }) {
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
    <mesh geometry={geometry}>
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
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.01;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

// =============== FEATURE HOTSPOT ===============

function FeatureHotspot3D({ feature, isSelected, onSelect, scaleFactor }: { feature: Feature; isSelected: boolean; onSelect: () => void; scaleFactor: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const position: [number, number, number] = [
    feature.position.x * scaleFactor,
    feature.position.y * scaleFactor,
    (feature.position.z ?? 0) * scaleFactor
  ];

  // Pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.25;
      meshRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      const ringPulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
      ringRef.current.scale.setScalar(ringPulse);
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  const dotSize = 0.06 * scaleFactor;
  const ringInner = 0.08 * scaleFactor;
  const ringOuter = 0.12 * scaleFactor;

  return (
    <group position={position}>
      {/* Core dot */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[dotSize, 16, 16]} />
        <meshStandardMaterial
          color={feature.color || "#00d4ff"}
          emissive={feature.color || "#00d4ff"}
          emissiveIntensity={isSelected ? 4 : 2}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.95}
        />
      </mesh>
      {/* Outer ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[ringInner, ringOuter, 32]} />
        <meshBasicMaterial
          color={feature.color || "#00d4ff"}
          transparent
          opacity={isSelected ? 0.7 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Connecting line from dot outward */}
      {isSelected && (
        <>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, 0.3 * scaleFactor, 0.2 * scaleFactor, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={feature.color || "#00d4ff"} transparent opacity={0.6} />
          </line>
          <Html
            position={[0.35 * scaleFactor, 0.25 * scaleFactor, 0]}
            distanceFactor={6}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[100, 0]}
          >
            <div className="bg-background/95 backdrop-blur-lg border border-primary/40 rounded-xl p-3 shadow-2xl min-w-[220px] max-w-[300px] animate-fade-in">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: feature.color }} />
                <h4 className="text-sm font-bold text-primary">{feature.name}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// =============== AUTO-SCALE + FIT ===============

function AutoScaleAndFit({ children, modelId }: { children: React.ReactNode; modelId?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    // Small delay to let the model load
    const timeout = setTimeout(() => {
      if (groupRef.current) {
        const box = new THREE.Box3().setFromObject(groupRef.current);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim > 0) {
          const targetSize = 2.8;
          const scale = targetSize / maxDim;
          groupRef.current.scale.setScalar(scale);
          // Re-center after scaling
          const newBox = new THREE.Box3().setFromObject(groupRef.current);
          const newCenter = newBox.getCenter(new THREE.Vector3());
          groupRef.current.position.sub(newCenter);
        }

        if (camera instanceof THREE.PerspectiveCamera) {
          camera.position.set(0, 0.5, 4.5);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        }
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [modelId, camera]);

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
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const controlsRef = useRef<any>(null);

  const modelId = modelData?.matchedModelId;
  const features = externalFeatures || modelData?.features || [];
  const objectType = modelData?.objectType || "3D Model";

  // Check if GLB file exists
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

  const handleZoom = (direction: 'in' | 'out') => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const factor = direction === 'in' ? 0.8 : 1.25;
      const camera = controls.object;
      camera.position.multiplyScalar(factor);
      controls.update();
    }
  };

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

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

  const featureScaleFactor = glbAvailable ? 1.2 : 1.0;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden card-glass gradient-border relative">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-background/80 backdrop-blur-md rounded-lg p-1 border border-border/50">
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`p-2 rounded-md transition-colors ${wireframe ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Wireframe"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowFeatures(!showFeatures)}
          className={`p-2 rounded-md transition-colors ${showFeatures ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Hotspots"
        >
          {showFeatures ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2 rounded-md transition-colors ${autoRotate ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
          title="Auto-rotate"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px bg-border/50 mx-0.5" />
        <button onClick={() => handleZoom('in')} className="p-2 rounded-md hover:bg-muted text-muted-foreground" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => handleZoom('out')} className="p-2 rounded-md hover:bg-muted text-muted-foreground" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      {/* Info badge */}
      <div className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-md rounded-lg px-3 py-1.5 border border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <Info className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">
            {objectType}
            {glbAvailable && <span className="text-green-500 ml-1">• GLB</span>}
          </span>
        </div>
      </div>

      {/* Feature dropdown panel */}
      {showFeatures && features.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 bg-background/90 backdrop-blur-md rounded-lg border border-border/50 max-w-[220px]">
          <button
            onClick={() => setFeaturesOpen(!featuresOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors"
          >
            <span>Features ({features.length})</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
          </button>
          {featuresOpen && (
            <div className="px-1 pb-1 space-y-0.5 max-h-[250px] overflow-y-auto scrollbar-thin">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFeature(selectedFeature === f.id ? null : f.id)}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                    selectedFeature === f.id
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/20"
                    style={{ backgroundColor: f.color }}
                  />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0.5, 4.5], fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
          pixelRatio: Math.min(window.devicePixelRatio, 2),
        }}
        shadows
        onClick={() => setSelectedFeature(null)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-3, 3, -3]} intensity={0.5} />
        <spotLight position={[0, 8, 0]} intensity={0.6} angle={0.5} penumbra={1} />
        <pointLight position={[0, -3, 3]} intensity={0.3} color="#88ccff" />

        <Environment preset="studio" />

        <Suspense fallback={<LoadingFallback />}>
          <FloatingGroup>
            <AutoScaleAndFit modelId={modelId}>
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
                  scaleFactor={featureScaleFactor}
                />
              ))}
            </AutoScaleAndFit>
          </FloatingGroup>
        </Suspense>

        <ContactShadows position={[0, -1.8, 0]} opacity={0.5} scale={8} blur={2} far={4} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={1.5}
          maxDistance={15}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enablePan
          maxPolarAngle={Math.PI * 0.88}
          minPolarAngle={Math.PI * 0.12}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
