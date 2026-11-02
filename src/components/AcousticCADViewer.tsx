import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Wind, AlertTriangle, CheckCircle, Eye, EyeOff, ShieldCheck, Zap, Download, Activity, X, Sparkles } from 'lucide-react';
import {
  CATEGORY_SPECS,
  type AcousticCalculationResult,
  type AcousticParameters,
  type CameraPreset,
  type CategoryHardwareConfig,
  type CutListItem,
  type DriverPreset,
  type EnclosureDimensions,
  type PartMetadata,
  type SpeakerCategory,
} from '../types/loudspeaker.ts';
import { MATERIAL_SPECS, SURFACE_FINISH_SPECS } from '../services/acousticEngine.ts';
import { computeBaffleLayout } from '../services/baffleLayoutEngine.ts';
import { buildParametricPortManifoldGroup } from '../services/parametricPortEngine.ts';
import { buildAdditiveAcousticGroup } from '../services/additiveAcousticEngine.ts';
import {
  createAcousticFoamTexture,
  createConeTexture,
  createFilamentTexture,
  createPCBTexture,
  createPolyureaTexture,
  createWoodTexture,
  createVibrationStressTexture,
  type VibrationCutoutDef,
} from './proceduralTextures.ts';
import { useUnits } from '../context/UnitContext.tsx';

interface AcousticCADViewerProps {
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  results: AcousticCalculationResult;
  partMetadataMap: Record<string, PartMetadata>;
  cutList?: CutListItem[];
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  onInspectPartSpecs?: (partId: string) => void;
  explodedPercent: number;
  isXRayMode: boolean;
  isCutawayMode: boolean;
  isWireframeMode: boolean;
  cameraPreset: CameraPreset;
  isAirflowStressVisible?: boolean;
  onToggleAirflowStress?: () => void;
  isVibrationAnalysisVisible?: boolean;
  onToggleVibrationAnalysis?: () => void;
  onModelRootReady?: (getRoot: () => THREE.Group | null) => void;
  onOpenCadExport?: () => void;
  setDimensions?: React.Dispatch<React.SetStateAction<EnclosureDimensions>>;
  setCameraPreset?: (preset: CameraPreset) => void;
  setIsXRayMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsCutawayMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  setIsWireframeMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  setExplodedPercent?: (val: number) => void;
  hasPendingOptimizations?: boolean;
  pendingOptimizationReasons?: string[];
  onAutoOptimize?: () => void;
}

interface ComponentMeshDef {
  id: string;
  group: THREE.Group | THREE.Mesh;
  basePosition: THREE.Vector3;
  explosionDirection: THREE.Vector3;
  explosionDistance: number;
  isOuterPanel: boolean;
  baseMaterials: (THREE.Material | THREE.Material[])[];
}

export const AcousticCADViewer: React.FC<AcousticCADViewerProps> = ({
  dimensions,
  acoustics,
  results,
  partMetadataMap,
  cutList,
  selectedPartId,
  onSelectPart,
  onInspectPartSpecs,
  explodedPercent,
  isXRayMode,
  isCutawayMode,
  isWireframeMode,
  cameraPreset,
  isAirflowStressVisible = true,
  onToggleAirflowStress,
  isVibrationAnalysisVisible = false,
  onToggleVibrationAnalysis,
  onModelRootReady,
  onOpenCadExport,
  setDimensions,
  setCameraPreset,
  setIsXRayMode,
  setIsCutawayMode,
  setIsWireframeMode,
  setExplodedPercent,
  hasPendingOptimizations = false,
  pendingOptimizationReasons = [],
  onAutoOptimize,
}) => {
  const { formatLength, formatVolume, formatWeight, formatVelocity } = useUnits();
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // In-Viewport UI States: Acoustic Health Pill & Click-to-Edit Dimension Overlays
  const [isHealthExpanded, setIsHealthExpanded] = useState<boolean>(false);
  const [editingDim, setEditingDim] = useState<'width' | 'height' | 'depth' | null>(null);
  const [tempDimVal, setTempDimVal] = useState<string>('');

  const handleStartEditDim = (dim: 'width' | 'height' | 'depth', currentVal: number) => {
    setEditingDim(dim);
    setTempDimVal(String(currentVal));
  };

  const handleCommitDim = () => {
    if (!editingDim || !setDimensions) {
      setEditingDim(null);
      return;
    }
    const val = parseFloat(tempDimVal);
    if (!isNaN(val) && val >= 80 && val <= 3000) {
      setDimensions((prev) => {
        if (editingDim === 'width') return { ...prev, externalWidthMm: Math.round(val) };
        if (editingDim === 'height') return { ...prev, externalHeightMm: Math.round(val) };
        if (editingDim === 'depth') return { ...prev, externalDepthMm: Math.round(val) };
        return prev;
      });
    }
    setEditingDim(null);
  };

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  const componentsRef = useRef<ComponentMeshDef[]>([]);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);

  // Dynamic 3D Label & Anchor Leader Line Refs
  const dynamicBadgeRef = useRef<HTMLDivElement | null>(null);
  const targetReticleRef = useRef<HTMLDivElement | null>(null);
  const leaderLineSvgRef = useRef<SVGSVGElement | null>(null);
  const leaderPathRef = useRef<SVGPathElement | null>(null);

  const selectedPartIdRef = useRef<string | null>(selectedPartId);
  const hoveredPartIdRef = useRef<string | null>(hoveredPartId);

  useEffect(() => {
    selectedPartIdRef.current = selectedPartId;
  }, [selectedPartId]);

  useEffect(() => {
    hoveredPartIdRef.current = hoveredPartId;
  }, [hoveredPartId]);

  // Pre-allocated math helpers for zero GC during 60 FPS animation loop
  const box3HelperRef = useRef<THREE.Box3>(new THREE.Box3());
  const anchorVecRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const projVecRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    if (onModelRootReady) {
      onModelRootReady(() => rootGroupRef.current);
    }
  }, [onModelRootReady]);

  const targetExplodeRef = useRef<number>(explodedPercent);
  const currentExplodeRef = useRef<number>(explodedPercent);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0.5, 0.4, 0.7));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isTransitioningCamRef = useRef<boolean>(false);

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-10, -10));

  useEffect(() => {
    targetExplodeRef.current = explodedPercent;
  }, [explodedPercent]);

  // Handle Camera View Presets
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const maxDim = Math.max(dimensions.externalWidthMm, dimensions.externalHeightMm, dimensions.externalDepthMm) / 1000;
    const dist = maxDim * 2.2;

    switch (cameraPreset) {
      case 'isometric':
        targetCamPosRef.current.set(dist * 0.8, dist * 0.65, dist * 0.9);
        targetCamLookRef.current.set(0, 0, 0);
        break;
      case 'front':
        targetCamPosRef.current.set(0, 0, dist * 1.3);
        targetCamLookRef.current.set(0, 0, 0);
        break;
      case 'side':
        targetCamPosRef.current.set(dist * 1.3, 0, 0);
        targetCamLookRef.current.set(0, 0, 0);
        break;
      case 'top':
        targetCamPosRef.current.set(0, dist * 1.3, 0.001);
        targetCamLookRef.current.set(0, 0, 0);
        break;
      case 'cutaway':
        targetCamPosRef.current.set(dist * 0.6, dist * 0.35, dist * 0.75);
        targetCamLookRef.current.set(0, 0, 0);
        break;
      case 'crossover':
        targetCamPosRef.current.set(-dist * 0.4, -dist * 0.1, -dist * 1.1);
        targetCamLookRef.current.set(0, -maxDim * 0.2, 0);
        break;
    }
    isTransitioningCamRef.current = true;
  }, [cameraPreset, dimensions]);

  // Scene & Renderer Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0e12');
    sceneRef.current = scene;

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.localClippingEnabled = true;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.02, 100);
    camera.position.set(0.65, 0.45, 0.85);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.15;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Environment & Studio Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const keyLight = new THREE.DirectionalLight('#fff5ea', 2.8);
    keyLight.position.set(2.5, 3.5, 2.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#c8e1ff', 1.4);
    fillLight.position.set(-3.0, 1.8, -1.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#a3c2f0', 1.8);
    rimLight.position.set(0, -2, -3);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight('#f0f4f8', '#101216', 0.65);
    scene.add(hemiLight);

    scene.fog = new THREE.FogExp2('#0c0e12', 0.35);

    const grid = new THREE.GridHelper(2.5, 25, '#3b4252', '#1e222a');
    grid.position.y = -0.001;
    scene.add(grid);

    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.001;
    scene.add(shadowMesh);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // 3D Highlight Wireframe Box Accent
    const boxHelper = new THREE.BoxHelper(new THREE.Mesh(), 0x38bdf8);
    boxHelper.visible = false;
    if (boxHelper.material && !Array.isArray(boxHelper.material)) {
      const bMat = boxHelper.material as THREE.LineBasicMaterial;
      bMat.depthTest = false;
      bMat.transparent = true;
      bMat.opacity = 0.85;
    }
    scene.add(boxHelper);
    boxHelperRef.current = boxHelper;

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    let isUserInteracting = false;
    controls.addEventListener('start', () => {
      isUserInteracting = true;
      isTransitioningCamRef.current = false;
    });
    controls.addEventListener('end', () => {
      isUserInteracting = false;
    });

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (isTransitioningCamRef.current && !isUserInteracting) {
        camera.position.lerp(targetCamPosRef.current, Math.min(1, delta * 3.5));
        controls.target.lerp(targetCamLookRef.current, Math.min(1, delta * 3.5));

        const posDist = camera.position.distanceTo(targetCamPosRef.current);
        const lookDist = controls.target.distanceTo(targetCamLookRef.current);
        if (posDist < 0.005 && lookDist < 0.005) {
          camera.position.copy(targetCamPosRef.current);
          controls.target.copy(targetCamLookRef.current);
          isTransitioningCamRef.current = false;
        }
      }
      controls.update();

      const explodeLambda = 6.0;
      currentExplodeRef.current = THREE.MathUtils.damp(
        currentExplodeRef.current,
        targetExplodeRef.current,
        explodeLambda,
        delta
      );

      const explodeFactor = currentExplodeRef.current / 100;
      for (const comp of componentsRef.current) {
        comp.group.position
          .copy(comp.basePosition)
          .addScaledVector(comp.explosionDirection, comp.explosionDistance * explodeFactor);
      }

      // Live 3D Highlight Box & Dynamic CAD Label Leader Projection
      const activeId = selectedPartIdRef.current || hoveredPartIdRef.current;
      const bHelper = boxHelperRef.current;
      const badgeEl = dynamicBadgeRef.current;
      const reticleEl = targetReticleRef.current;
      const lineEl = leaderLineSvgRef.current;
      const pathEl = leaderPathRef.current;
      const box3Helper = box3HelperRef.current;
      const anchorVec = anchorVecRef.current;
      const projVec = projVecRef.current;

      if (activeId && componentsRef.current.length > 0) {
        const comp = componentsRef.current.find((c) => c.id === activeId);
        if (comp && container) {
          if (bHelper) {
            bHelper.setFromObject(comp.group);
            bHelper.visible = true;
          }

          box3Helper.setFromObject(comp.group);
          box3Helper.getCenter(anchorVec);
          anchorVec.y = Math.min(box3Helper.max.y, anchorVec.y + 0.05);

          projVec.copy(anchorVec).project(camera);

          if (projVec.z < 1.0) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const screenX = (projVec.x * 0.5 + 0.5) * w;
            const screenY = (-projVec.y * 0.5 + 0.5) * h;

            const badgeW = 270;
            const badgeH = 145;
            let cardX = screenX + 38;
            let cardY = screenY - 70;

            if (cardX + badgeW > w - 16) {
              cardX = screenX - badgeW - 38;
            }
            cardX = Math.max(16, Math.min(w - badgeW - 16, cardX));
            cardY = Math.max(65, Math.min(h - badgeH - 25, cardY));

            const attachX = cardX < screenX ? cardX + badgeW : cardX;
            const attachY = cardY + 28;

            if (reticleEl) {
              reticleEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
              reticleEl.style.display = 'flex';
            }

            if (badgeEl) {
              badgeEl.style.transform = `translate3d(${cardX}px, ${cardY}px, 0)`;
              badgeEl.style.display = 'block';
            }

            if (lineEl && pathEl) {
              lineEl.style.display = 'block';
              pathEl.setAttribute(
                'd',
                `M ${screenX} ${screenY} L ${screenX + (cardX < screenX ? -15 : 15)} ${attachY} L ${attachX} ${attachY}`
              );
            }
          } else {
            if (badgeEl) badgeEl.style.display = 'none';
            if (reticleEl) reticleEl.style.display = 'none';
            if (lineEl) lineEl.style.display = 'none';
          }
        } else {
          if (bHelper) bHelper.visible = false;
          if (badgeEl) badgeEl.style.display = 'none';
          if (reticleEl) reticleEl.style.display = 'none';
          if (lineEl) lineEl.style.display = 'none';
        }
      } else {
        if (bHelper) bHelper.visible = false;
        if (badgeEl) badgeEl.style.display = 'none';
        if (reticleEl) reticleEl.style.display = 'none';
        if (lineEl) lineEl.style.display = 'none';
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (boxHelper && scene.children.includes(boxHelper)) {
        scene.remove(boxHelper);
        boxHelper.geometry?.dispose();
        (boxHelper.material as THREE.Material)?.dispose();
      }
      if (rootGroupRef.current) {
        rootGroupRef.current.traverse((child) => {
          const anyChild = child as THREE.Mesh | THREE.Line;
          if (anyChild.geometry) {
            anyChild.geometry.dispose();
          }
          const mat = (anyChild as THREE.Mesh).material;
          const disposeSingleMat = (m: THREE.Material) => {
            const stdMat = m as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
            stdMat.map?.dispose();
            stdMat.bumpMap?.dispose();
            stdMat.normalMap?.dispose();
            stdMat.roughnessMap?.dispose();
            stdMat.emissiveMap?.dispose();
            m.dispose();
          };
          if (Array.isArray(mat)) {
            mat.forEach(disposeSingleMat);
          } else if (mat) {
            disposeSingleMat(mat);
          }
        });
      }
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      envTexture.dispose();
    };
  }, []);

  // Update Procedural 3D Geometry
  useEffect(() => {
    const root = rootGroupRef.current;
    if (!root) return;

    const disposeMaterialWithTextures = (m: THREE.Material) => {
      const stdMat = m as THREE.MeshStandardMaterial & THREE.MeshPhysicalMaterial;
      stdMat.map?.dispose();
      stdMat.bumpMap?.dispose();
      stdMat.normalMap?.dispose();
      stdMat.roughnessMap?.dispose();
      stdMat.emissiveMap?.dispose();
      m.dispose();
    };

    while (root.children.length > 0) {
      const obj = root.children[0];
      root.remove(obj);
      obj.traverse((child) => {
        const anyChild = child as THREE.Mesh | THREE.Line;
        if (anyChild.geometry) {
          anyChild.geometry.dispose();
        }
        const mat = (anyChild as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach(disposeMaterialWithTextures);
        } else if (mat) {
          disposeMaterialWithTextures(mat);
        }
      });
    }
    componentsRef.current = [];

    const scale = 0.001;
    const W = dimensions.externalWidthMm * scale;
    const H = dimensions.externalHeightMm * scale;
    const D = dimensions.externalDepthMm * scale;

    const materialSpec = MATERIAL_SPECS[dimensions.material] || MATERIAL_SPECS.baltic_birch_18;
    const t = (materialSpec?.nominalThicknessMm || 18) * scale;
    const baffleT = (dimensions.baffleThicknessMm || materialSpec?.nominalThicknessMm || 18) * scale;

    const activeFinishKey = dimensions.surfaceFinish || 'natural_hardwood_veneer';
    const finishSpec = SURFACE_FINISH_SPECS[activeFinishKey] || SURFACE_FINISH_SPECS.natural_hardwood_veneer;
    const finishColorHex = dimensions.finishColorHex || (activeFinishKey === 'natural_hardwood_veneer' ? materialSpec.textureColor : activeFinishKey === 'tour_grade_polyurea' ? '#1a1d20' : activeFinishKey === 'high_gloss_automotive' ? '#111111' : '#2b2e34');

    const isFilament = materialSpec.category === 'filaments';
    const isCF =
      materialSpec.id === 'petg_cf' ||
      materialSpec.id === 'pla_cf' ||
      materialSpec.id === 'carbon_fiber_12' ||
      materialSpec.id === 'carbon_fiber_18';

    const useFilamentBranch = !isXRayMode && (isFilament || isCF);
    const useStandardBranch = !isXRayMode && !useFilamentBranch;

    const woodTex =
      useStandardBranch && finishSpec.bumpType === 'woodgrain'
        ? createWoodTexture(finishColorHex, finishSpec.roughness)
        : undefined;
    const polyureaTex =
      useStandardBranch && finishSpec.bumpType === 'polyurea_noise'
        ? createPolyureaTexture(finishColorHex)
        : undefined;
    const filamentTex = useFilamentBranch
      ? createFilamentTexture(materialSpec.id, finishColorHex || materialSpec.textureColor)
      : undefined;

    const filamentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(finishColorHex || materialSpec.textureColor),
      map: filamentTex,
      roughness: isCF ? 0.55 : 0.35,
      metalness: isCF ? 0.18 : 0.0,
      clearcoat: isCF ? 0.25 : 0.2,
      clearcoatRoughness: isCF ? 0.35 : 0.2,
      bumpMap: filamentTex,
      bumpScale: isCF ? 0.002 : 0.001,
      clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      clipShadows: true,
    });

    const standardFinishMat = new THREE.MeshPhysicalMaterial({
      color: finishSpec.bumpType === 'none' ? new THREE.Color(finishColorHex) : undefined,
      map: finishSpec.bumpType === 'woodgrain' ? woodTex : finishSpec.bumpType === 'polyurea_noise' ? polyureaTex : undefined,
      roughness: finishSpec.roughness,
      metalness: finishSpec.metalness,
      clearcoat: finishSpec.clearcoat,
      clearcoatRoughness: finishSpec.clearcoatRoughness,
      bumpMap: finishSpec.bumpType === 'woodgrain' ? woodTex : finishSpec.bumpType === 'polyurea_noise' ? polyureaTex : undefined,
      bumpScale: finishSpec.bumpType === 'polyurea_noise' ? 0.003 : finishSpec.bumpType === 'woodgrain' ? 0.001 : 0.0,
      clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      clipShadows: true,
    });

    const xRayMat = new THREE.MeshPhysicalMaterial({
      color: 0x6e94b8,
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.88,
      thickness: 0.05,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      wireframe: isWireframeMode,
      clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
    });

    const activePanelMat = isXRayMode ? xRayMat : (isFilament || isCF ? filamentMat : standardFinishMat);

    const registerComponent = (
      id: string,
      obj: THREE.Group | THREE.Mesh,
      basePos: THREE.Vector3,
      explDir: THREE.Vector3,
      explDist: number,
      isOuter: boolean
    ) => {
      obj.position.copy(basePos);
      obj.userData = { componentId: id };
      root.add(obj);

      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData = { componentId: id };
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      componentsRef.current.push({
        id,
        group: obj,
        basePosition: basePos.clone(),
        explosionDirection: explDir.clone(),
        explosionDistance: explDist,
        isOuterPanel: isOuter,
        baseMaterials: [],
      });
    };

    const explDistBase = Math.max(W, H, D) * 0.45;

    // --- INTELLIGENT COLLISION-FREE BAFFLE LAYOUT & CUTOUTS ---
    const layout = results.layout || computeBaffleLayout(dimensions, acoustics, results);
    const frontDrivers = layout.components.filter((c) => c.panel === 'front' && c.role !== 'port');
    const portComp = layout.components.find((c) => c.role === 'port');

    const baffleShape = new THREE.Shape();
    baffleShape.moveTo(-W / 2, -H / 2);
    baffleShape.lineTo(W / 2, -H / 2);
    baffleShape.lineTo(W / 2, H / 2);
    baffleShape.lineTo(-W / 2, H / 2);
    baffleShape.closePath();

    const { topology, driverAssignments } = acoustics;
    const woofer = driverAssignments.woofer.driver;
    const tweeter = driverAssignments.tweeter.driver;
    const midrange = driverAssignments.midrange.driver;

    // Cutout holes in front baffle for all front transducers
    frontDrivers.forEach((dp) => {
      const path = new THREE.Path();
      path.absarc(dp.centerX * scale, dp.centerY * scale, dp.cutoutRadiusMm * scale, 0, Math.PI * 2, true);
      baffleShape.holes.push(path);
    });

    // Front port hole (if ported alignment and port is on front)
    if (acoustics.alignment === 'ported' && portComp && portComp.panel === 'front') {
      if (acoustics.portType === 'round') {
        const portPath = new THREE.Path();
        portPath.absarc(portComp.centerX * scale, portComp.centerY * scale, portComp.cutoutRadiusMm * scale, 0, Math.PI * 2, true);
        baffleShape.holes.push(portPath);
      } else {
        const slotWidthM = Math.min(W - 2 * t - 0.005, (portComp.slotWidthMm || 280) * scale);
        const slotHeightM = (portComp.slotHeightMm || 40) * scale;
        const slotPath = new THREE.Path();
        const slotBottomY = (portComp.centerY - (portComp.slotHeightMm || 40) / 2) * scale;
        const hw = slotWidthM / 2;
        slotPath.moveTo(-hw, slotBottomY);
        slotPath.lineTo(hw, slotBottomY);
        slotPath.lineTo(hw, slotBottomY + slotHeightM);
        slotPath.lineTo(-hw, slotBottomY + slotHeightM);
        slotPath.closePath();
        baffleShape.holes.push(slotPath);
      }
    }

    // Vibration Analysis Stress Heat-Map Materials (Modulated by Bending Stiffness D)
    const stiffnessD = results.mechanics?.bendingStiffnessNm ?? 4500;

    const frontCutouts: VibrationCutoutDef[] = frontDrivers.map((dp) => ({
      centerX: (dp.centerX / dimensions.externalWidthMm) + 0.5,
      centerY: (dp.centerY / dimensions.externalHeightMm) + 0.5,
      radius: dp.cutoutRadiusMm / Math.max(dimensions.externalWidthMm, dimensions.externalHeightMm),
    }));

    if (acoustics.alignment === 'ported' && portComp && portComp.panel === 'front') {
      frontCutouts.push({
        centerX: (portComp.centerX / dimensions.externalWidthMm) + 0.5,
        centerY: (portComp.centerY / dimensions.externalHeightMm) + 0.5,
        radius: (portComp.cutoutRadiusMm || 35) / Math.max(dimensions.externalWidthMm, dimensions.externalHeightMm),
      });
    }

    const rearCutouts: VibrationCutoutDef[] = [];
    if (acoustics.alignment === 'ported' && portComp && portComp.panel === 'rear') {
      rearCutouts.push({
        centerX: (portComp.centerX / dimensions.externalWidthMm) + 0.5,
        centerY: (portComp.centerY / dimensions.externalHeightMm) + 0.5,
        radius: (portComp.cutoutRadiusMm || 35) / Math.max(dimensions.externalWidthMm, dimensions.externalHeightMm),
      });
    }

    let currentBaffleMat: THREE.Material = isXRayMode ? xRayMat : activePanelMat;
    let currentRearMat: THREE.Material = isXRayMode ? xRayMat : activePanelMat;
    let currentPanelMat: THREE.Material = isXRayMode ? xRayMat : activePanelMat;

    if (!isXRayMode && isVibrationAnalysisVisible) {
      const vibrationBaffleTex = createVibrationStressTexture(stiffnessD, 'baffle', frontCutouts);
      const vibrationRearTex = createVibrationStressTexture(stiffnessD, 'panel', rearCutouts);
      const vibrationPanelTex = createVibrationStressTexture(stiffnessD, 'panel', []);

      currentBaffleMat = new THREE.MeshStandardMaterial({
        map: vibrationBaffleTex,
        roughness: 0.5,
        metalness: 0.1,
        wireframe: isWireframeMode,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });

      currentRearMat = new THREE.MeshStandardMaterial({
        map: vibrationRearTex,
        roughness: 0.5,
        metalness: 0.1,
        wireframe: isWireframeMode,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });

      currentPanelMat = new THREE.MeshStandardMaterial({
        map: vibrationPanelTex,
        roughness: 0.5,
        metalness: 0.1,
        wireframe: isWireframeMode,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });
    }

    const baffleGeo = new THREE.ExtrudeGeometry(baffleShape, {
      depth: baffleT,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.001,
      bevelThickness: 0.001,
    });
    baffleGeo.center();

    const baffleMesh = new THREE.Mesh(baffleGeo, currentBaffleMat);
    const baffleBasePos = new THREE.Vector3(0, 0, D / 2 - baffleT / 2);
    registerComponent('baffle_front', baffleMesh, baffleBasePos, new THREE.Vector3(0, 0, 1), explDistBase * 1.2, true);

    // 2. REAR PANEL (with cutout if rear port is active)
    const rearW = W - 2 * t;
    const rearH = H - 2 * t;
    let rearGeo: THREE.BufferGeometry;

    if (acoustics.alignment === 'ported' && portComp && portComp.panel === 'rear') {
      const rearShape = new THREE.Shape();
      rearShape.moveTo(-rearW / 2, -rearH / 2);
      rearShape.lineTo(rearW / 2, -rearH / 2);
      rearShape.lineTo(rearW / 2, rearH / 2);
      rearShape.lineTo(-rearW / 2, rearH / 2);
      rearShape.closePath();

      const rearPortHole = new THREE.Path();
      if (acoustics.portType === 'slot' || portComp.isSlot) {
        const sw = Math.min(rearW - 0.01, (portComp.slotWidthMm || dimensions.externalWidthMm - 36) * scale);
        const sh = Math.min(rearH * 0.4, (portComp.slotHeightMm || 45) * scale);
        const px = portComp.centerX * scale;
        const py = Math.max(-rearH / 2 + sh / 2 + 0.005, Math.min(rearH / 2 - sh / 2 - 0.005, portComp.centerY * scale));
        rearPortHole.moveTo(px - sw / 2, py - sh / 2);
        rearPortHole.lineTo(px + sw / 2, py - sh / 2);
        rearPortHole.lineTo(px + sw / 2, py + sh / 2);
        rearPortHole.lineTo(px - sw / 2, py + sh / 2);
        rearPortHole.closePath();
      } else {
        const safeCutoutR = Math.min(
          portComp.cutoutRadiusMm * scale,
          Math.max(0.015, Math.min(rearW, rearH) / 2 - 0.012)
        );
        const safePy = Math.max(
          -rearH / 2 + safeCutoutR + 0.008,
          Math.min(rearH / 2 - safeCutoutR - 0.008, portComp.centerY * scale)
        );
        rearPortHole.absarc(portComp.centerX * scale, safePy, safeCutoutR, 0, Math.PI * 2, true);
      }
      rearShape.holes.push(rearPortHole);

      rearGeo = new THREE.ExtrudeGeometry(rearShape, { depth: t, bevelEnabled: false });
      rearGeo.center();
    } else {
      rearGeo = new THREE.BoxGeometry(rearW, rearH, t);
    }

    const rearMesh = new THREE.Mesh(rearGeo, currentRearMat);
    const rearBasePos = new THREE.Vector3(0, 0, -D / 2 + t / 2);
    registerComponent('panel_rear', rearMesh, rearBasePos, new THREE.Vector3(0, 0, -1), explDistBase * 1.2, true);

    // 3. TOP & BOTTOM PANELS
    const topBottomD = D - baffleT;
    const topGeo = new THREE.BoxGeometry(W, t, topBottomD);
    const topMesh = new THREE.Mesh(topGeo, currentPanelMat);
    registerComponent('panel_top', topMesh, new THREE.Vector3(0, H / 2 - t / 2, -baffleT / 2), new THREE.Vector3(0, 1, 0), explDistBase, true);

    const bottomGeo = new THREE.BoxGeometry(W, t, topBottomD);
    const bottomMesh = new THREE.Mesh(bottomGeo, currentPanelMat);
    registerComponent('panel_bottom', bottomMesh, new THREE.Vector3(0, -H / 2 + t / 2, -baffleT / 2), new THREE.Vector3(0, -1, 0), explDistBase, true);

    // 4. SIDE PANELS
    const sideH = H - 2 * t;
    const sideD = D - baffleT;
    const leftSideMesh = new THREE.Mesh(new THREE.BoxGeometry(t, sideH, sideD), currentPanelMat);
    registerComponent('panel_left', leftSideMesh, new THREE.Vector3(-W / 2 + t / 2, 0, -baffleT / 2), new THREE.Vector3(-1, 0, 0), explDistBase, true);

    const rightSideMesh = new THREE.Mesh(new THREE.BoxGeometry(t, sideH, sideD), currentPanelMat);
    registerComponent('panel_right', rightSideMesh, new THREE.Vector3(W / 2 - t / 2, 0, -baffleT / 2), new THREE.Vector3(1, 0, 0), explDistBase, true);

    // 5. INTERNAL WINDOW MATRIX BRACE
    const braceW = W - 2 * t - 0.002;
    const braceD = D - baffleT - t - 0.002;
    const braceShape = new THREE.Shape();
    braceShape.moveTo(-braceW / 2, -braceD / 2);
    braceShape.lineTo(braceW / 2, -braceD / 2);
    braceShape.lineTo(braceW / 2, braceD / 2);
    braceShape.lineTo(-braceW / 2, braceD / 2);
    braceShape.closePath();

    const holeRadius = Math.min(braceW, braceD) * 0.18;
    const holeOffX = braceW * 0.24;
    const holeOffY = braceD * 0.24;
    [[ -holeOffX, -holeOffY ], [ holeOffX, -holeOffY ], [ -holeOffX, holeOffY ], [ holeOffX, holeOffY ]].forEach(([hx, hy]) => {
      const hPath = new THREE.Path();
      hPath.absarc(hx, hy, holeRadius, 0, Math.PI * 2, true);
      braceShape.holes.push(hPath);
    });

    const braceGeo = new THREE.ExtrudeGeometry(braceShape, {
      depth: t,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.0005,
      bevelThickness: 0.0005,
    });
    braceGeo.center();

    const braceMat = new THREE.MeshStandardMaterial({
      color: '#c29b68',
      roughness: 0.7,
      metalness: 0.05,
      clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
    });

    const braceMesh = new THREE.Mesh(braceGeo, braceMat);
    braceMesh.rotation.x = Math.PI / 2;
    registerComponent('brace_window', braceMesh, new THREE.Vector3(0, -H * 0.05, -baffleT / 2 - t / 2), new THREE.Vector3(0, 0.4, 0), explDistBase * 0.4, false);

    // 6. BUILD 3D DRIVER ASSEMBLIES FOR EACH PASSBAND (Collision-Free)
    const isCoaxial = !!results.subcategoryTelemetry?.isCoaxial || dimensions.subcategory === 'coaxial_point_source';
    frontDrivers.forEach((dp, idx) => {
      const drvPreset = dp.role === 'tweeter' ? tweeter : (dp.role === 'midrange' ? midrange : woofer);
      const isWooferCoaxial = dp.role === 'woofer' && isCoaxial;
      const driverGroup = build3DDriverAssembly(drvPreset, scale, isCutawayMode, clipPlaneRef, isWooferCoaxial);
      const driverBasePos = new THREE.Vector3(dp.centerX * scale, dp.centerY * scale, D / 2);
      registerComponent(`driver_${dp.role}_${idx}`, driverGroup, driverBasePos, new THREE.Vector3(0, 0, 1), explDistBase * 1.5, false);
    });

    // 7. MIDRANGE REAR ISOLATED SUB-CHAMBER (3-Way)
    if (topology === 'three_way') {
      const midBoxW = Math.max(0.12, (midrange.frameOuterDiameterMm * scale) + 0.02);
      const midBoxH = midBoxW;
      const midBoxD = 0.14;
      const midChamberGeo = new THREE.BoxGeometry(midBoxW, midBoxH, midBoxD);
      const midChamberMat = new THREE.MeshStandardMaterial({
        color: '#ab8251',
        roughness: 0.7,
        metalness: 0.05,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });
      const midChamberMesh = new THREE.Mesh(midChamberGeo, midChamberMat);
      const midComp = frontDrivers.find((d) => d.role === 'midrange');
      const midY = midComp ? midComp.centerY * scale : H * 0.08;
      registerComponent('midrange_chamber', midChamberMesh, new THREE.Vector3(0, midY, D / 2 - baffleT - midBoxD / 2), new THREE.Vector3(0, 0.2, -0.4), explDistBase * 0.6, false);
    }

    // 8. CUSTOM PARAMETRIC PORT SYNTHESIS & MANIFOLD MESH (6 Profiles)
    if (acoustics.alignment === 'ported' && portComp) {
      const activePortLenMm = results.parametricPort?.effectiveLengthMm || results.portLengthMm;
      const portLengthM = activePortLenMm * scale;
      const isRearPort = portComp.panel === 'rear';
      const usableCavityDepthM = Math.max(0.03, D - baffleT - t);
      const maxAxialM = Math.max(0.024, usableCavityDepthM - 0.025);

      let activeProfile =
        results.parametricPort?.profileType ||
        acoustics.parametricPortConfig?.profileType ||
        (acoustics.portType === 'slot' ? 'rectilinear_slot' : 'circular_bellmouth');

      const isProfileSlotFamily =
        activeProfile === 'rectilinear_slot' ||
        activeProfile === 'folded_l_conduit' ||
        activeProfile === 'folded_u_conduit';
      if (acoustics.portType === 'round' && isProfileSlotFamily) {
        activeProfile = 'circular_bellmouth';
      } else if (acoustics.portType === 'slot' && !isProfileSlotFamily) {
        activeProfile = 'rectilinear_slot';
      }

      const isSlotFamily =
        activeProfile === 'rectilinear_slot' ||
        activeProfile === 'folded_l_conduit' ||
        activeProfile === 'folded_u_conduit';

      const foldDown = portComp.centerY > 0;
      const manifoldPortGroup = buildParametricPortManifoldGroup(
        acoustics,
        results.parametricPort,
        activePortLenMm,
        isRearPort,
        W,
        t,
        scale,
        isCutawayMode ? [clipPlaneRef.current] : [],
        isWireframeMode,
        foldDown,
        H,
        D,
        baffleT
      );

      if (!isSlotFamily) {
        const leg1TargetM =
          results.parametricPort?.legLengthsMm?.[0] !== undefined
            ? results.parametricPort.legLengthsMm[0] * scale
            : portLengthM;
        const axialLenM = Math.min(Math.max(0.024, leg1TargetM), maxAxialM);
        const outerR = Math.min(
          portComp.outerRadiusMm * scale,
          Math.max(0.02, Math.min(W, H) / 2 - t - 0.01)
        );
        const portCenterX = Math.max(
          -W / 2 + t + outerR,
          Math.min(W / 2 - t - outerR, portComp.centerX * scale)
        );
        const portCenterY = Math.max(
          -H / 2 + t + outerR,
          Math.min(H / 2 - t - outerR, portComp.centerY * scale)
        );
        const rawPortBaseZ = isRearPort ? (-D / 2 + axialLenM / 2) : (D / 2 - axialLenM / 2);
        const portBaseZ = Math.max(
          -D / 2 + t + axialLenM / 2 - 0.008,
          Math.min(D / 2 - baffleT - axialLenM / 2 + 0.008, rawPortBaseZ)
        );
        const portBasePos = new THREE.Vector3(portCenterX, portCenterY, portBaseZ);
        const explDir = isRearPort ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
        registerComponent('port_tube', manifoldPortGroup, portBasePos, explDir, explDistBase * 0.9, false);
      } else {
        const leg1M = Math.min(
          Math.max(0.03, (results.parametricPort?.legLengthsMm?.[0] || activePortLenMm) * scale),
          maxAxialM
        );
        const slotH = Math.max(0.02, (portComp.slotHeightMm || acoustics.slotHeightMm || 45) * scale);
        const rawSlotBaseY =
          portComp.centerY * scale + (foldDown ? -(slotH / 2 + t / 2) : (slotH / 2 + t / 2));
        const slotBaseY = Math.max(
          -H / 2 + t + 0.015,
          Math.min(H / 2 - t - 0.015, rawSlotBaseY)
        );
        const rawSlotBaseZ = isRearPort ? (-D / 2 + leg1M / 2 + t) : (D / 2 - leg1M / 2 - baffleT);
        const slotBaseZ = Math.max(
          -D / 2 + t + leg1M / 2,
          Math.min(D / 2 - baffleT - leg1M / 2, rawSlotBaseZ)
        );
        const slotBasePos = new THREE.Vector3(0, slotBaseY, slotBaseZ);
        registerComponent('port_slot_board', manifoldPortGroup, slotBasePos, new THREE.Vector3(0, -0.3, isRearPort ? -0.5 : 0.5), explDistBase * 0.5, false);
      }
    }

    // 9. DAMPING TREATMENT & INTEGRAL 3D-PRINTED ACOUSTIC MATRIX
    if (results.additiveAcousticReport && results.additiveAcousticReport.enabled) {
      // Monolithic 3D-printed internal TPMS core and rear acoustic labyrinth trap
      const additiveGroup = buildAdditiveAcousticGroup(
        dimensions,
        results.additiveAcousticReport,
        scale,
        isCutawayMode ? [clipPlaneRef.current] : [],
        isWireframeMode
      );
      registerComponent(
        'integral_damping_matrix',
        additiveGroup,
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -0.4),
        explDistBase * 0.45,
        false
      );
    } else {
      // Conventional damping foam fallback
      const foamTex = createAcousticFoamTexture();
      const foamMat = new THREE.MeshStandardMaterial({
        map: foamTex,
        roughness: 0.95,
        metalness: 0.0,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });
      const dampingGroup = new THREE.Group();
      const rearFoamMesh = new THREE.Mesh(new THREE.BoxGeometry(rearW * 0.92, rearH * 0.85, 0.035), foamMat);
      rearFoamMesh.position.set(0, 0, -D / 2 + t + 0.018);
      dampingGroup.add(rearFoamMesh);
      registerComponent('damping_treatment', dampingGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -0.5), explDistBase * 0.5, false);
    }

    // 10. POPULATED CROSSOVER PCB ON REAR PANEL
    const pcbGroup = new THREE.Group();
    const pcbTex = createPCBTexture();
    const pcbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.003),
      new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.4, metalness: 0.4, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
    );
    pcbGroup.add(pcbMesh);

    // Render 3D Copper Air-Core Inductor Coils
    const copperMat = new THREE.MeshStandardMaterial({ color: '#c4662d', metalness: 0.85, roughness: 0.25, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] });
    [[-0.04, 0.03], [0.04, 0.03]].forEach(([cx, cy]) => {
      const coilMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 20), copperMat);
      coilMesh.position.set(cx, cy, 0.012);
      pcbGroup.add(coilMesh);
    });

    // Render 3D Film Capacitor Cylinders
    const capMat = new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.3, roughness: 0.4, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] });
    [[-0.03, -0.02], [0.03, -0.02]].forEach(([cx, cy]) => {
      const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.028, 16), capMat);
      capMesh.rotation.z = Math.PI / 2;
      capMesh.position.set(cx, cy, 0.008);
      pcbGroup.add(capMesh);
    });

    // Gold Binding Posts
    const goldMat = new THREE.MeshStandardMaterial({ color: '#ffd043', metalness: 0.95, roughness: 0.15, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] });
    [-0.02, 0.02].forEach((px) => {
      const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.025, 16), goldMat);
      postMesh.rotation.x = Math.PI / 2;
      postMesh.position.set(px, -0.04, -0.015);
      pcbGroup.add(postMesh);
    });

    // Offset crossover PCB if rear port is active so they never clash
    const isRearPortActive = portComp && portComp.panel === 'rear';
    const crossoverBaseY = isRearPortActive ? -rearH * 0.28 : -H * 0.22;
    const terminalBasePos = new THREE.Vector3(0, crossoverBaseY, -D / 2 + t);
    registerComponent('crossover_pcb', pcbGroup, terminalBasePos, new THREE.Vector3(0, 0, -1), explDistBase * 1.3, false);

    // 10B. NEUTRIK SPEAKON (NL4 / NL8) REAR TERMINAL DISH & CHASSIS CONNECTORS
    if (results.speakonReport) {
      const spk = results.speakonReport;
      const dishGroup = new THREE.Group();
      const dishW = spk.dishWidthMm * scale;
      const dishH = spk.dishHeightMm * scale;
      const dishPocketD = spk.dishPocketDepthMm * scale;

      const steelDishMat = new THREE.MeshStandardMaterial({
        color: '#11151c',
        metalness: 0.78,
        roughness: 0.32,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const neutrikFlangeMat = new THREE.MeshStandardMaterial({
        color: spk.connectorModel === 'nlt4mp' ? '#272b33' : '#1b2028',
        metalness: spk.connectorModel === 'nlt4mp' ? 0.88 : 0.35,
        roughness: 0.28,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const neutrikKeywayMat = new THREE.MeshStandardMaterial({
        color: spk.poleCount === 8 ? '#0284c7' : '#0891b2',
        metalness: 0.45,
        roughness: 0.3,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const silverScrewMat = new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        metalness: 0.92,
        roughness: 0.2,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      // Outer mounting bezel + recessed dish/cup backplate
      const bezelMesh = new THREE.Mesh(new THREE.BoxGeometry(dishW, dishH, 0.0025), steelDishMat);
      dishGroup.add(bezelMesh);

      const pocketMesh = new THREE.Mesh(
        new THREE.BoxGeometry(dishW * 0.86, dishH * 0.82, dishPocketD),
        steelDishMat
      );
      pocketMesh.position.z = dishPocketD / 2;
      dishGroup.add(pocketMesh);

      if (spk.connectorModel === 'binding_posts_gold') {
        // --- STUDIO PASSIVE RECESSED CUP WITH 4× GOLD 5-WAY BINDING POSTS & BI-WIRE JUMPERS ---
        const postMat = new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          metalness: 0.95,
          roughness: 0.2,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
          wireframe: isWireframeMode,
        });
        const redRingMat = new THREE.MeshStandardMaterial({
          color: '#ef4444',
          metalness: 0.2,
          roughness: 0.4,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const blkRingMat = new THREE.MeshStandardMaterial({
          color: '#0f172a',
          metalness: 0.2,
          roughness: 0.4,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });

        // 4 Posts: (x: -16mm, +16mm) x (y: +18mm HF, -18mm LF)
        const postCoords = [
          { x: -0.016, y: 0.018, isPos: false, label: 'HF-' },
          { x: 0.016, y: 0.018, isPos: true, label: 'HF+' },
          { x: -0.016, y: -0.018, isPos: false, label: 'LF-' },
          { x: 0.016, y: -0.018, isPos: true, label: 'LF+' },
        ];

        postCoords.forEach((pt) => {
          const postSub = new THREE.Group();
          postSub.position.set(pt.x, pt.y, -0.002);

          // Knurled thumbnut shaft
          const shaftGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.018, 16);
          shaftGeo.rotateX(Math.PI / 2);
          const shaftMesh = new THREE.Mesh(shaftGeo, postMat);
          shaftMesh.position.z = -0.007;
          postSub.add(shaftMesh);

          // Colored identification ring (Red for +, Black for -)
          const ringGeo = new THREE.CylinderGeometry(0.0062, 0.0062, 0.004, 16);
          ringGeo.rotateX(Math.PI / 2);
          const ringMesh = new THREE.Mesh(ringGeo, pt.isPos ? redRingMat : blkRingMat);
          ringMesh.position.z = -0.013;
          postSub.add(ringMesh);

          // 4mm central banana plug aperture
          const holeGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.006, 12);
          holeGeo.rotateX(Math.PI / 2);
          const holeMesh = new THREE.Mesh(holeGeo, blkRingMat);
          holeMesh.position.z = -0.015;
          postSub.add(holeMesh);

          // Internal solder lug extending inside cabinet
          const lugMesh = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.001, 0.015), postMat);
          lugMesh.position.set(0, 0, dishPocketD + 0.006);
          postSub.add(lugMesh);

          dishGroup.add(postSub);
        });

        // 2× Solid Brass Gold-Plated Bi-Wire Jumper Bars linking HF and LF
        [-0.016, 0.016].forEach((jx) => {
          const jumperBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.0045, 0.036, 0.0015),
            postMat
          );
          jumperBar.position.set(jx, 0, -0.005);
          dishGroup.add(jumperBar);
        });

        // 4-corner M3.5 mounting screws
        spk.mountingHolesPerConnector.forEach((mh) => {
          const screwMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0018, 0.0018, 0.004, 12).rotateX(Math.PI / 2),
            silverScrewMat
          );
          screwMesh.position.set(mh.xMm * scale, mh.yMm * scale, -0.002);
          dishGroup.add(screwMesh);
        });

      } else if (spk.connectorModel === 'active_plate_xlr') {
        // --- STUDIO ACTIVE RECESSED ALUMINUM SUB-PLATE (COMBO XLR/TRS + IEC INLET) ---
        const xlrBodyMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          metalness: 0.6,
          roughness: 0.35,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const silverTabMat = new THREE.MeshStandardMaterial({
          color: '#cbd5e1',
          metalness: 0.95,
          roughness: 0.2,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });

        // 2× Balanced XLR/TRS Combo Jacks (Input + Thru)
        [-0.024, 0.024].forEach((cx, cIdx) => {
          const xlrSub = new THREE.Group();
          xlrSub.position.set(cx, 0.032, -0.002);

          const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.011, 0.011, 0.01, 24).rotateX(Math.PI / 2),
            xlrBodyMat
          );
          barrel.position.z = -0.003;
          xlrSub.add(barrel);

          const innerHole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0032, 0.0032, 0.008, 16).rotateX(Math.PI / 2),
            silverScrewMat
          );
          innerHole.position.z = -0.006;
          xlrSub.add(innerHole);

          const pushTab = new THREE.Mesh(
            new THREE.BoxGeometry(0.006, 0.004, 0.003),
            silverTabMat
          );
          pushTab.position.set(0, 0.011, -0.004);
          xlrSub.add(pushTab);

          dishGroup.add(xlrSub);
        });

        // Rotary Level / Gain Potentiometer Knob
        const knobMat = new THREE.MeshStandardMaterial({
          color: '#0284c7',
          metalness: 0.85,
          roughness: 0.3,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const potKnob = new THREE.Mesh(
          new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16).rotateX(Math.PI / 2),
          knobMat
        );
        potKnob.position.set(0, -0.008, -0.005);
        dishGroup.add(potKnob);

        // Schurter Fused IEC C14 AC Power Inlet
        const iecInlet = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.022, 0.008),
          xlrBodyMat
        );
        iecInlet.position.set(0, -0.052, -0.003);
        dishGroup.add(iecInlet);

        // 6 perimeter M3 mounting screws
        spk.mountingHolesPerConnector.forEach((mh) => {
          const screwMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0016, 0.0016, 0.004, 12).rotateX(Math.PI / 2),
            silverScrewMat
          );
          screwMesh.position.set(mh.xMm * scale, mh.yMm * scale, -0.002);
          dishGroup.add(screwMesh);
        });

      } else {
        // --- TOURING LIVE PA NEUTRIK SPEAKON NL4 / NL8 RECESSED STEEL DISH ---
        const connSpacingM = spk.connectorSpacingCenterMm * scale;
        const xOffsets = spk.connectorQuantity === 2 ? [-connSpacingM / 2, connSpacingM / 2] : [0];
        const flangeW = spk.flangeWidthMm * scale;
        const flangeH = spk.flangeHeightMm * scale;
        const boreR = (spk.cutoutBoreDiameterMm * scale) / 2;

        xOffsets.forEach((cx) => {
          const connSub = new THREE.Group();
          connSub.position.set(cx, 0, -0.0015);

          // D-Shape (26x31mm) or G-Shape Square (51.8x51.8mm) Flange
          const flangeMesh = new THREE.Mesh(
            new THREE.BoxGeometry(flangeW, flangeH, 0.0035),
            neutrikFlangeMat
          );
          connSub.add(flangeMesh);

          // Circular locking barrel & keyway ring
          const barrelGeo = new THREE.CylinderGeometry(boreR, boreR, 0.012, 24);
          barrelGeo.rotateX(Math.PI / 2);
          const barrelMesh = new THREE.Mesh(barrelGeo, neutrikKeywayMat);
          barrelMesh.position.z = -0.004;
          connSub.add(barrelMesh);

          // Center contact core
          const coreGeo = new THREE.CylinderGeometry(boreR * 0.48, boreR * 0.48, 0.014, 20);
          coreGeo.rotateX(Math.PI / 2);
          const coreMesh = new THREE.Mesh(coreGeo, neutrikFlangeMat);
          coreMesh.position.z = -0.0045;
          connSub.add(coreMesh);

          // M3 (diagonal 2-hole D-size) or M3.5 (4-corner G-size) mounting screws
          spk.mountingHolesPerConnector.forEach((mh) => {
            const screwGeo = new THREE.CylinderGeometry(
              (mh.diameterMm * scale) / 2,
              (mh.diameterMm * scale) / 2,
              0.005,
              12
            );
            screwGeo.rotateX(Math.PI / 2);
            const screwMesh = new THREE.Mesh(screwGeo, silverScrewMat);
            screwMesh.position.set(mh.xMm * scale, mh.yMm * scale, -0.002);
            connSub.add(screwMesh);
          });

          // Rear NLFASTON 0.187" crimp terminal lugs projecting inside cabinet
          const lugCount = spk.poleCount;
          for (let p = 0; p < lugCount; p++) {
            const angle = (p / lugCount) * Math.PI * 2;
            const lugR = boreR * 0.68;
            const lugMesh = new THREE.Mesh(
              new THREE.BoxGeometry(0.0048, 0.001, 0.014),
              goldMat
            );
            lugMesh.position.set(
              Math.cos(angle) * lugR,
              Math.sin(angle) * lugR,
              dishPocketD + 0.007
            );
            connSub.add(lugMesh);
          }

          dishGroup.add(connSub);
        });
      }

      const dishPosY = spk.dishCenterYMm * scale;
      const dishBasePos = new THREE.Vector3(0, dishPosY, -D / 2 - 0.001);
      registerComponent(
        'speakon_terminal_dish',
        dishGroup,
        dishBasePos,
        new THREE.Vector3(0, 0, -1),
        explDistBase * 1.6,
        false
      );
    }

    // --- 10.5 PROCEDURAL ARCHETYPE HARDWARE GENERATION ---
    const categoryKey: SpeakerCategory = dimensions.category || 'studio_monitor';
    const catSpec = CATEGORY_SPECS[categoryKey] || CATEGORY_SPECS.studio_monitor;
    const hwConfig: CategoryHardwareConfig = {
      showHandles: dimensions.hardware?.showHandles ?? catSpec.defaultHardware.showHandles,
      showPoleMount: dimensions.hardware?.showPoleMount ?? catSpec.defaultHardware.showPoleMount,
      showCornerProtectors: dimensions.hardware?.showCornerProtectors ?? catSpec.defaultHardware.showCornerProtectors,
      showIsolationFeet: dimensions.hardware?.showIsolationFeet ?? catSpec.defaultHardware.showIsolationFeet,
    };

    // A. Recessed Side Carry Handles
    if (hwConfig.showHandles) {
      const handleH = Math.min(0.20, H * 0.35);
      const handleW = Math.min(0.14, (D - baffleT) * 0.45);
      const handlePocketDepth = 0.038;

      const createHandleAssembly = (side: 'left' | 'right') => {
        const hGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({
          color: '#1a1d24',
          metalness: 0.85,
          roughness: 0.35,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
          wireframe: isWireframeMode,
        });
        const barMat = new THREE.MeshStandardMaterial({
          color: '#383e4d',
          metalness: 0.92,
          roughness: 0.22,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
          wireframe: isWireframeMode,
        });

        const flange = new THREE.Mesh(new THREE.BoxGeometry(0.003, handleH, handleW), metalMat);
        hGroup.add(flange);

        const pocket = new THREE.Mesh(new THREE.BoxGeometry(handlePocketDepth, handleH * 0.82, handleW * 0.82), metalMat);
        pocket.position.x = side === 'left' ? handlePocketDepth / 2 : -handlePocketDepth / 2;
        hGroup.add(pocket);

        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, handleW * 0.65, 16), barMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.x = side === 'left' ? 0.012 : -0.012;
        hGroup.add(bar);

        return hGroup;
      };

      const isDualHandle = categoryKey === 'live_sub' && H >= 0.65;
      const yOffsets = isDualHandle ? [H * 0.18, -H * 0.18] : [0];

      const leftHandlesGroup = new THREE.Group();
      yOffsets.forEach((yOff) => {
        const hMesh = createHandleAssembly('left');
        hMesh.position.y = yOff;
        leftHandlesGroup.add(hMesh);
      });
      registerComponent(
        'hardware_handle_left',
        leftHandlesGroup,
        new THREE.Vector3(-W / 2 + 0.001, 0, -baffleT / 2),
        new THREE.Vector3(-1, 0, 0),
        explDistBase * 1.05,
        false
      );

      const rightHandlesGroup = new THREE.Group();
      yOffsets.forEach((yOff) => {
        const hMesh = createHandleAssembly('right');
        hMesh.position.y = yOff;
        rightHandlesGroup.add(hMesh);
      });
      registerComponent(
        'hardware_handle_right',
        rightHandlesGroup,
        new THREE.Vector3(W / 2 - 0.001, 0, -baffleT / 2),
        new THREE.Vector3(1, 0, 0),
        explDistBase * 1.05,
        false
      );
    }

    // B. 35mm Bottom Pole-Mount Socket (Live Top / Sub Extension)
    if (hwConfig.showPoleMount) {
      const poleCupGroup = new THREE.Group();
      const cupMat = new THREE.MeshStandardMaterial({
        color: '#16181f',
        metalness: 0.9,
        roughness: 0.3,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.004, 32), cupMat);
      collar.position.y = -t / 2;
      poleCupGroup.add(collar);

      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.075, 32), cupMat);
      socket.position.y = 0.02;
      poleCupGroup.add(socket);

      const knob = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.01, 0.022),
        new THREE.MeshStandardMaterial({ color: '#2b303d', metalness: 0.8, roughness: 0.35, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
      );
      knob.position.set(0.038, -t / 2, 0);
      poleCupGroup.add(knob);

      registerComponent(
        'hardware_pole_cup',
        poleCupGroup,
        new THREE.Vector3(0, -H / 2 + t / 2, -baffleT / 2),
        new THREE.Vector3(0, -1, 0),
        explDistBase * 1.05,
        false
      );
    }

    // C. Heavy-Duty Steel Corner Protectors
    if (hwConfig.showCornerProtectors) {
      const cornersGroup = new THREE.Group();
      const cornerMat = new THREE.MeshStandardMaterial({
        color: '#282d38',
        metalness: 0.88,
        roughness: 0.32,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const legL = Math.min(0.045, Math.min(W, H, D) * 0.12);
      const legT = 0.003;

      const xSigns = [-1, 1];
      const ySigns = [-1, 1];
      const zSigns = [-1, 1];

      xSigns.forEach((sx) => {
        ySigns.forEach((sy) => {
          zSigns.forEach((sz) => {
            const bracket = new THREE.Group();
            const posX = sx * (W / 2);
            const posY = sy * (H / 2);
            const posZ = sz === 1 ? (D / 2) : (-D / 2);

            const ball = new THREE.Mesh(new THREE.SphereGeometry(legT * 2.5, 12, 12), cornerMat);
            bracket.add(ball);

            const lx = new THREE.Mesh(new THREE.BoxGeometry(legL, legT, legL * 0.6), cornerMat);
            lx.position.set(-sx * (legL / 2), 0, 0);
            bracket.add(lx);

            const ly = new THREE.Mesh(new THREE.BoxGeometry(legT, legL, legL * 0.6), cornerMat);
            ly.position.set(0, -sy * (legL / 2), 0);
            bracket.add(ly);

            const lz = new THREE.Mesh(new THREE.BoxGeometry(legL * 0.6, legT, legL), cornerMat);
            lz.position.set(0, 0, -sz * (legL / 2));
            bracket.add(lz);

            bracket.position.set(posX, posY, posZ);
            cornersGroup.add(bracket);
          });
        });
      });

      registerComponent('hardware_corner_guards', cornersGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), 0, false);
    }

    // D. Acoustic Decoupling Isolation Feet
    if (hwConfig.showIsolationFeet) {
      const feetGroup = new THREE.Group();
      const footR = Math.min(0.024, W * 0.07);
      const footH = 0.016;

      const rubberMat = new THREE.MeshStandardMaterial({
        color: '#15171c',
        metalness: 0.1,
        roughness: 0.9,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const aluminumRingMat = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        metalness: 0.95,
        roughness: 0.25,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const offX = W / 2 - footR * 2.2;
      const offZ = (topBottomD / 2) - footR * 2.2;
      const footPositions = [
        [-offX, -offZ],
        [offX, -offZ],
        [-offX, offZ],
        [offX, offZ],
      ];

      footPositions.forEach(([fx, fz]) => {
        const foot = new THREE.Group();
        const rubberCyl = new THREE.Mesh(new THREE.CylinderGeometry(footR * 0.85, footR, footH, 24), rubberMat);
        foot.add(rubberCyl);

        const aluRing = new THREE.Mesh(new THREE.CylinderGeometry(footR * 1.02, footR * 1.02, footH * 0.28, 24), aluminumRingMat);
        aluRing.position.y = footH * 0.2;
        foot.add(aluRing);

        foot.position.set(fx, -H / 2 - footH / 2, -baffleT / 2 + fz);
        feetGroup.add(foot);
      });

      registerComponent(
        'hardware_isolation_feet',
        feetGroup,
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -1, 0),
        explDistBase,
        false
      );
    }

    // E. Commercial Plate Amplifier Chassis (for Active Powered Tops/Monitors)
    const hasPlateAmp = !!results.subcategoryTelemetry?.hasPlateAmplifier || dimensions.subcategory === 'active_powered_biamp';
    if (hasPlateAmp) {
      const ampGroup = new THREE.Group();
      const ampPlateW = Math.min(0.22, rearW * 0.72);
      const ampPlateH = Math.min(0.32, rearH * 0.65);
      const ampPlateDepth = 0.055; // 55mm internal chassis depth

      const aluBlackMat = new THREE.MeshStandardMaterial({
        color: '#1a1d24',
        metalness: 0.88,
        roughness: 0.3,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const heatsinkFinMat = new THREE.MeshStandardMaterial({
        color: '#282c35',
        metalness: 0.92,
        roughness: 0.25,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      const connectorMat = new THREE.MeshStandardMaterial({
        color: '#0ea5e9',
        metalness: 0.8,
        roughness: 0.4,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        wireframe: isWireframeMode,
      });

      // Front fascia flange on rear panel
      const faceFlange = new THREE.Mesh(new THREE.BoxGeometry(ampPlateW, ampPlateH, 0.003), aluBlackMat);
      ampGroup.add(faceFlange);

      // Internal electronics enclosure chassis can
      const chassisCan = new THREE.Mesh(new THREE.BoxGeometry(ampPlateW * 0.88, ampPlateH * 0.88, ampPlateDepth), aluBlackMat);
      chassisCan.position.z = ampPlateDepth / 2;
      ampGroup.add(chassisCan);

      // External extruded heatsink fins (protruding outward on exterior rear)
      const numFins = 8;
      const finSpacing = (ampPlateW * 0.7) / numFins;
      for (let f = 0; f < numFins; f++) {
        const finX = -((numFins - 1) * finSpacing) / 2 + f * finSpacing;
        const finMesh = new THREE.Mesh(new THREE.BoxGeometry(0.0025, ampPlateH * 0.5, 0.015), heatsinkFinMat);
        finMesh.position.set(finX, ampPlateH * 0.15, -0.0075);
        ampGroup.add(finMesh);
      }

      // Blue PowerCON AC mains connector
      const powercon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16).rotateX(Math.PI / 2), connectorMat);
      powercon.position.set(-ampPlateW * 0.25, -ampPlateH * 0.28, -0.004);
      ampGroup.add(powercon);

      // Balanced XLR Input & Thru jacks
      const xlrInput = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
      );
      xlrInput.position.set(ampPlateW * 0.1, -ampPlateH * 0.28, -0.004);
      ampGroup.add(xlrInput);

      const xlrThru = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.008, 16).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.2, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
      );
      xlrThru.position.set(ampPlateW * 0.28, -ampPlateH * 0.28, -0.004);
      ampGroup.add(xlrThru);

      // Position plate amplifier on lower half of rear panel
      const ampY = -rearH * 0.12;
      registerComponent(
        'hardware_plate_amp',
        ampGroup,
        new THREE.Vector3(0, ampY, -D / 2 + t / 2),
        new THREE.Vector3(0, 0, -1),
        explDistBase * 1.1,
        false
      );
    }

    // 11. VISUAL 3D COLLISION ALERT RINGS (If any clash is present)
    if (layout.hasCollision && rootGroupRef.current) {
      layout.collisions.forEach((col) => {
        const comp = layout.components.find((c) => col.id.includes(c.id));
        if (comp) {
          const ringR = comp.outerRadiusMm * scale;
          const ringGeo = new THREE.RingGeometry(ringR * 0.98, ringR * 1.05, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            depthTest: false,
            transparent: true,
            opacity: 0.85,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          const zPos = comp.panel === 'rear' ? (-D / 2 - 0.002) : (D / 2 + 0.002);
          ringMesh.position.set(comp.centerX * scale, comp.centerY * scale, zPos);
          rootGroupRef.current?.add(ringMesh);
        }
      });
    }

    // 12. 3D VISUAL AIRFLOW INTERFERENCE & PROXIMITY STRESS OVERLAY (Red-to-Yellow Gradient)
    if (acoustics.alignment === 'ported' && portComp && isAirflowStressVisible !== false) {
      const maxAxialM = Math.max(0.05, D - baffleT - t - 0.035);
      const portLengthM = Math.min(results.portLengthMm * scale, maxAxialM);
      const isRearPort = portComp.panel === 'rear';
      const portMouthXM = portComp.centerX * scale;
      const portMouthYM = Math.max(-H / 2 + t + 0.02, Math.min(H / 2 - t - 0.02, portComp.centerY * scale));
      const portMouthZM = isRearPort ? (-D / 2 + t + portLengthM) : (D / 2 - baffleT - portLengthM);
      const flowDirZ = isRearPort ? 1 : -1;
      const innerR = Math.min((acoustics.portDiameterMm * scale) / 2, Math.max(0.015, (W - 2 * t) / 2.5));

      const overlayGroup = new THREE.Group();

      // Red-to-Yellow Stress to RGB gradient helper:
      // Red (Critical Choke <=18mm) -> Orange (18-45mm) -> Yellow (45-75mm)
      const getStressGradientColor = (s: number): THREE.Color => {
        const col = new THREE.Color();
        if (s >= 0.7) {
          // Critical Choke: Vivid Red (#ef4444) to Orange-Red
          const t = Math.min(1, Math.max(0, (s - 0.7) / 0.3));
          col.setRGB(0.96, 0.22 * (1 - t) + 0.12 * t, 0.14 * (1 - t) + 0.10 * t);
        } else if (s >= 0.35) {
          // Boundary Drag: Vivid Orange (#f97316) to Golden Yellow
          const t = Math.min(1, Math.max(0, (s - 0.35) / 0.35));
          col.setRGB(0.98, 0.82 * (1 - t) + 0.45 * t, 0.06);
        } else {
          // Proximity Alert: Bright Yellow (#eab308 / #facc15)
          col.setRGB(0.95, 0.85, 0.12);
        }
        return col;
      };

      // Calculate distance in mm from any 3D coordinate to nearest obstacle surface
      const getDistanceToObstaclesMm = (px: number, py: number, pz: number): number => {
        let minDist = 999;
        // 1. Driver Magnets
        frontDrivers.forEach((drv) => {
          const isW = drv.role === 'woofer';
          const magR = (isW ? woofer.magnetDiameterMm : drv.role === 'midrange' ? midrange.magnetDiameterMm : tweeter.magnetDiameterMm) * scale / 2;
          const magRearZ = D / 2 - (drv.depthMm * scale);
          const magFrontZ = magRearZ + ((isW ? woofer.magnetDepthMm : 30) * scale);
          const dx = px - drv.centerX * scale;
          const dy = py - drv.centerY * scale;
          const radDist = Math.max(0, Math.hypot(dx, dy) - magR);
          let dz = 0;
          if (pz < magRearZ) dz = magRearZ - pz;
          else if (pz > magFrontZ) dz = pz - magFrontZ;
          const distM = Math.hypot(radDist, dz);
          if (distM * 1000 < minDist) minDist = distM * 1000;
        });
        // 2. Window Brace
        const braceY = -H * 0.05;
        const braceDistMm = Math.max(0, Math.abs(py - braceY) - t / 2) * 1000;
        if (braceDistMm < minDist) minDist = braceDistMm;
        // 3. Opposing Wall
        const wallZ = isRearPort ? (D / 2 - baffleT) : (-D / 2 + t);
        const wallDistMm = Math.abs(pz - wallZ) * 1000;
        if (wallDistMm < minDist) minDist = wallDistMm;

        return minDist;
      };

      const computeStressFromDist = (dMm: number): number => {
        if (dMm <= 18) return Math.min(1.0, 0.7 + 0.3 * ((18 - dMm) / 18));
        if (dMm <= 45) return 0.35 + 0.35 * ((45 - dMm) / 27);
        if (dMm <= 75) return 0.05 + 0.30 * ((75 - dMm) / 30);
        return 0;
      };

      // A. Volumetric Airflow Intake Suction Cone / Envelope (Parametric Mesh with Red-Yellow Vertex Colors)
      const radialSegs = 36;
      const lengthSegs = 14;
      const flowLengthM = Math.min(0.085, D * 0.3);
      const flareExpM = Math.max(0.02, (acoustics.flareRadiusMm || 18) * scale);

      // Enforce internal cavity bounds (3mm margin) so vertices never puncture cabinet walls
      const minX = -W / 2 + t + 0.003;
      const maxX = W / 2 - t - 0.003;
      const minY = -H / 2 + t + 0.003;
      const maxY = H / 2 - t - 0.003;
      const minZ = -D / 2 + t + 0.003;
      const maxZ = D / 2 - baffleT - 0.003;

      const positions: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];

      for (let j = 0; j <= lengthSegs; j++) {
        const vFrac = j / lengthSegs;
        const zOff = flowDirZ * vFrac * flowLengthM;
        const curR = innerR + flareExpM * Math.pow(vFrac, 1.25) + 0.015 * vFrac;

        for (let i = 0; i <= radialSegs; i++) {
          const uFrac = i / radialSegs;
          const angle = uFrac * Math.PI * 2;
          const rawVx = portMouthXM + Math.cos(angle) * curR;
          const rawVy = portMouthYM + Math.sin(angle) * curR;
          const rawVz = portMouthZM + zOff;

          const vx = Math.max(minX, Math.min(maxX, rawVx));
          const vy = Math.max(minY, Math.min(maxY, rawVy));
          const vz = Math.max(minZ, Math.min(maxZ, rawVz));

          positions.push(vx, vy, vz);

          const distMm = getDistanceToObstaclesMm(vx, vy, vz);
          const stress = computeStressFromDist(distMm);
          const color = getStressGradientColor(stress);
          colors.push(color.r, color.g, color.b);
        }
      }

      for (let j = 0; j < lengthSegs; j++) {
        for (let i = 0; i < radialSegs; i++) {
          const a = j * (radialSegs + 1) + i;
          const b = (j + 1) * (radialSegs + 1) + i;
          const c = (j + 1) * (radialSegs + 1) + (i + 1);
          const d = j * (radialSegs + 1) + (i + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const flowFieldGeo = new THREE.BufferGeometry();
      flowFieldGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      flowFieldGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      flowFieldGeo.setIndex(indices);
      flowFieldGeo.computeVertexNormals();

      const flowFieldMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      });
      const flowFieldMesh = new THREE.Mesh(flowFieldGeo, flowFieldMat);
      overlayGroup.add(flowFieldMesh);

      // B. Concentric Isobar Stress Rings around Inner Intake Mouth
      [0.015, 0.035, 0.06].forEach((zStep, ringIdx) => {
        const rawRingZ = portMouthZM + flowDirZ * zStep;
        const ringZ = Math.max(minZ, Math.min(maxZ, rawRingZ));
        const maxAllowedR = Math.max(
          0.01,
          Math.min(
            portMouthXM - minX,
            maxX - portMouthXM,
            portMouthYM - minY,
            maxY - portMouthYM
          ) - 0.002
        );
        const ringR = Math.min(
          maxAllowedR,
          innerR + flareExpM * Math.pow(ringIdx * 0.4 + 0.3, 1.25) + 0.012
        );
        const ringGeo = new THREE.RingGeometry(ringR * 0.98, ringR * 1.02, 36);
        const ringDist = getDistanceToObstaclesMm(portMouthXM, portMouthYM, ringZ);
        const ringStress = computeStressFromDist(ringDist);
        const ringColor = getStressGradientColor(ringStress);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ringColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const isobarMesh = new THREE.Mesh(ringGeo, ringMat);
        isobarMesh.position.set(portMouthXM, portMouthYM, ringZ);
        overlayGroup.add(isobarMesh);
      });

      // C. Highlight Belts on Obstructing Driver Magnets & Matrix Brace
      const airflowRep = layout.airflowInterference;
      if (airflowRep && airflowRep.obstructions) {
        airflowRep.obstructions.forEach((obs) => {
          const obsCol = getStressGradientColor(obs.stressLevel);

          // 3D Proximity Ray / Line connecting mouth and obstacle
          const rayPoints = [
            new THREE.Vector3(obs.portPosition.x, obs.portPosition.y, obs.portPosition.z),
            new THREE.Vector3(obs.position.x, obs.position.y, obs.position.z),
          ];
          const rayGeo = new THREE.BufferGeometry().setFromPoints(rayPoints);
          const rayMat = new THREE.LineBasicMaterial({
            color: obsCol,
            linewidth: 2,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
          });
          const rayLine = new THREE.Line(rayGeo, rayMat);
          overlayGroup.add(rayLine);

          // 3D Proximity Marker Beacon at obstacle point
          const beaconGeo = new THREE.OctahedronGeometry(0.007, 0);
          const beaconMat = new THREE.MeshBasicMaterial({
            color: obsCol,
            wireframe: false,
            depthTest: false,
            transparent: true,
            opacity: 0.9,
          });
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
          beaconMesh.position.set(obs.position.x, obs.position.y, obs.position.z);
          overlayGroup.add(beaconMesh);

          // Halo rings around driver magnet
          if (obs.type === 'driver_magnet') {
            const haloGeo = new THREE.TorusGeometry(0.055, 0.0025, 12, 36);
            const haloMat = new THREE.MeshBasicMaterial({
              color: obsCol,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
              depthWrite: false,
              clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
            });
            const haloMesh = new THREE.Mesh(haloGeo, haloMat);
            haloMesh.position.set(obs.position.x, obs.position.y, obs.position.z);
            overlayGroup.add(haloMesh);
          } else if (obs.type === 'window_brace') {
            // Highlight strip on window brace edge
            const stripGeo = new THREE.BoxGeometry(0.12, 0.004, 0.008);
            const stripMat = new THREE.MeshBasicMaterial({
              color: obsCol,
              transparent: true,
              opacity: 0.85,
              depthWrite: false,
              clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
            });
            const stripMesh = new THREE.Mesh(stripGeo, stripMat);
            stripMesh.position.set(obs.position.x, obs.position.y, obs.position.z);
            overlayGroup.add(stripMesh);
          }
        });
      }

      rootGroupRef.current?.add(overlayGroup);
    }

    if (sceneRef.current) {
      const shadowPlane = sceneRef.current.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry);
      if (shadowPlane) shadowPlane.position.y = -H / 2 - 0.001;
      const grid = sceneRef.current.children.find((c) => c instanceof THREE.GridHelper);
      if (grid) grid.position.y = -H / 2 - 0.002;
    }
  }, [dimensions, acoustics, results, isXRayMode, isCutawayMode, isWireframeMode, isAirflowStressVisible, isVibrationAnalysisVisible]);

  // Hover & Selection Highlight
  useEffect(() => {
    for (const comp of componentsRef.current) {
      const isSelected = comp.id === selectedPartId;
      const isHovered = comp.id === hoveredPartId;

      comp.group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material && !Array.isArray(mesh.material)) {
            const mat = mesh.material as any;
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              if (isSelected) {
                mat.emissive.set('#38bdf8');
                mat.emissiveIntensity = 0.45;
              } else if (isHovered) {
                mat.emissive.set('#0ea5e9');
                mat.emissiveIntensity = 0.22;
              } else {
                mat.emissive.set('#000000');
                mat.emissiveIntensity = 0;
              }
            }
          }
        }
      });
    }
  }, [selectedPartId, hoveredPartId]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 0) return;
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    if (!rootGroupRef.current) return;

    const intersects = raycasterRef.current.intersectObjects(rootGroupRef.current.children, true);
    if (intersects.length > 0) {
      let targetObj: THREE.Object3D | null = intersects[0].object;
      let foundId: string | null = null;
      while (targetObj && targetObj !== rootGroupRef.current) {
        if (targetObj.userData && targetObj.userData.componentId) {
          foundId = targetObj.userData.componentId;
          break;
        }
        targetObj = targetObj.parent;
      }
      setHoveredPartId(foundId);
      container.style.cursor = foundId ? 'pointer' : 'default';
    } else {
      setHoveredPartId(null);
      container.style.cursor = 'default';
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pointerDownPosRef.current) return;
    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    pointerDownPosRef.current = null;
    if (dist > 6) return;

    const container = mountRef.current;
    if (!container || !cameraRef.current || !rootGroupRef.current) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(rootGroupRef.current.children, true);

    if (intersects.length > 0) {
      let targetObj: THREE.Object3D | null = intersects[0].object;
      let foundId: string | null = null;
      while (targetObj && targetObj !== rootGroupRef.current) {
        if (targetObj.userData && targetObj.userData.componentId) {
          foundId = targetObj.userData.componentId;
          break;
        }
        targetObj = targetObj.parent;
      }
      onSelectPart(foundId);
    } else {
      onSelectPart(null);
    }
  };

  const activeHighlightId = selectedPartId || hoveredPartId;
  const activeHighlightMeta = activeHighlightId ? partMetadataMap[activeHighlightId] : null;
  const activeHighlightCutItem = activeHighlightId && cutList ? cutList.find((c) => c.id === activeHighlightId) : null;
  const activeHighlightSpatialLabel = activeHighlightMeta?.spatialLabel || activeHighlightCutItem?.spatialLabel || activeHighlightId;
  const activeHighlightSpatialLoc = activeHighlightMeta?.spatialLocation || activeHighlightCutItem?.spatialLocation || 'Enclosure Part';

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0c0e12]">
      <div
        ref={mountRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* DYNAMIC 3D CAD LEADER LINE & BILLBOARD OVERLAY */}
      <svg
        ref={leaderLineSvgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
        style={{ display: 'none' }}
      >
        <path
          ref={leaderPathRef}
          d=""
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className="opacity-90 drop-shadow-[0_0_5px_rgba(56,189,248,0.7)]"
        />
      </svg>

      {/* 3D Anchor Reticle Pin */}
      <div
        ref={targetReticleRef}
        className="absolute -top-3 -left-3 pointer-events-none z-30 w-6 h-6 items-center justify-center"
        style={{ display: 'none' }}
      >
        <div className="w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-cyan-500/40 shadow-lg shadow-cyan-400/80 animate-pulse" />
        <div className="absolute inset-0 border border-cyan-400/60 rounded-full" />
      </div>

      {/* Dynamic 3D CAD Spatial Label Billboard Card */}
      <div
        ref={dynamicBadgeRef}
        className="absolute top-0 left-0 pointer-events-auto z-30 w-[275px] bg-slate-950/95 border-2 border-cyan-500/80 rounded-xl p-3 shadow-2xl shadow-cyan-950/80 text-slate-200 font-sans backdrop-blur-none"
        style={{ display: 'none' }}
      >
        {(activeHighlightMeta || activeHighlightCutItem) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-sm shrink-0">
                  {activeHighlightSpatialLabel}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider truncate">
                  {activeHighlightSpatialLoc}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {selectedPartId && onSelectPart && (
                  <button
                    type="button"
                    onClick={() => onSelectPart(null)}
                    className="p-1 rounded bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-200 border border-slate-800 transition cursor-pointer"
                    title="Deselect Part"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold text-xs text-slate-100 truncate">
                {activeHighlightMeta?.name || activeHighlightCutItem?.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                {activeHighlightMeta?.category ? `${activeHighlightMeta.category.toUpperCase()} • ` : ''}
                {activeHighlightMeta?.material || activeHighlightCutItem?.materialName}
              </div>
            </div>

            {(activeHighlightMeta?.dimensionsMm || activeHighlightCutItem) && (
              <div className="grid grid-cols-2 gap-1.5 bg-slate-900/80 border border-slate-800/80 p-1.5 rounded text-[11px] font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block">DIMENSIONS (W×H×D)</span>
                  <span className="text-cyan-300 font-bold text-[10px] sm:text-[11px] truncate block">
                    {activeHighlightMeta?.dimensionsMm
                      ? `${formatLength(activeHighlightMeta.dimensionsMm.w)} × ${formatLength(activeHighlightMeta.dimensionsMm.h)}`
                      : activeHighlightCutItem
                      ? `${formatLength(activeHighlightCutItem.widthMm)} × ${formatLength(activeHighlightCutItem.lengthMm)}`
                      : ''}
                  </span>
                </div>
                {(activeHighlightMeta?.weightKg || activeHighlightCutItem?.weightKg) && (
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block">EST. MASS</span>
                    <span className="text-emerald-300 font-bold text-[11px]">
                      {activeHighlightMeta?.weightKg ?? activeHighlightCutItem?.weightKg} kg
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1 gap-1.5">
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedPartId === activeHighlightId ? '● Highlighted in 3D' : 'Hovered in Viewport'}
              </span>
              {onInspectPartSpecs && activeHighlightId && (
                <button
                  type="button"
                  onClick={() => onInspectPartSpecs(activeHighlightId)}
                  className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-mono font-bold transition cursor-pointer shadow-sm shadow-cyan-600/30"
                >
                  Full Specs →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NON-OVERLAPPING TOP OVERLAY CONTAINER */}
      <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2.5 pointer-events-none">
        {/* TOP BAR ROW: Left = Interactive Dimensions Pill | Right = Airflow/Vibration Stress & Export CAD */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* INTERACTIVE 3D ARCHITECTURAL DIMENSION OVERLAYS (Point 8: Click-to-Type in Canvas) */}
          <div className="pointer-events-auto flex items-center gap-2 bg-[#090d16]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Dimensions:</span>
            {(['width', 'height', 'depth'] as const).map((dimKey) => {
              const label = dimKey === 'width' ? 'W' : dimKey === 'height' ? 'H' : 'D';
              const valMm =
                dimKey === 'width'
                  ? dimensions.externalWidthMm
                  : dimKey === 'height'
                  ? dimensions.externalHeightMm
                  : dimensions.externalDepthMm;
              const isEditing = editingDim === dimKey;

              return (
                <div key={dimKey} className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px] font-bold">{label}:</span>
                  {isEditing ? (
                    <input
                      type="number"
                      autoFocus
                      value={tempDimVal}
                      onChange={(e) => setTempDimVal(e.target.value)}
                      onBlur={handleCommitDim}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitDim();
                        if (e.key === 'Escape') setEditingDim(null);
                      }}
                      className="w-14 px-1 py-0.5 rounded bg-slate-950 border border-cyan-400 text-cyan-200 text-xs font-bold font-mono focus:outline-hidden"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEditDim(dimKey, valMm)}
                      title={`Click to edit cabinet ${dimKey} directly`}
                      className="px-1.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/80 text-cyan-300 font-bold transition cursor-pointer"
                    >
                      {formatLength(valMm)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT CONTROLS: Compact Viewport Overlay Toggles & CAD Export */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto pointer-events-auto">
            {acoustics.alignment === 'ported' && onToggleAirflowStress && (
              <button
                type="button"
                onClick={onToggleAirflowStress}
                title={isAirflowStressVisible ? 'Close Airflow Stress Window' : 'Open Airflow Stress Window'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer whitespace-nowrap shadow-md ${
                  isAirflowStressVisible
                    ? 'bg-amber-950/90 border-amber-500/80 text-amber-200'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>Airflow Stress</span>
              </button>
            )}

            {onToggleVibrationAnalysis && (
              <button
                type="button"
                onClick={onToggleVibrationAnalysis}
                title={isVibrationAnalysisVisible ? 'Close Vibration Stress FEA Window' : 'Open Vibration Stress FEA Window'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer whitespace-nowrap shadow-md ${
                  isVibrationAnalysisVisible
                    ? 'bg-violet-950/90 border-violet-500/80 text-violet-200'
                    : 'bg-slate-950/85 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-violet-400" />
                <span>Vibration Stress</span>
              </button>
            )}

            {onOpenCadExport && (
              <button
                type="button"
                onClick={onOpenCadExport}
                title="Export 3D Enclosure to STL or STEP CAD file"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/50 border border-cyan-400/30 transition cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-cyan-100" />
                <span>Export CAD</span>
              </button>
            )}
          </div>
        </div>

        {/* COLLAPSIBLE DIAGNOSTIC WINDOWS (Only mounted when toggled on, stacked cleanly below top bar) */}
        {((acoustics.alignment === 'ported' && isAirflowStressVisible) || isVibrationAnalysisVisible) && (
          <div className="flex flex-col gap-2.5 w-[270px] sm:w-[295px] max-w-full max-h-[calc(100vh-11rem)] overflow-y-auto no-scrollbar pointer-events-none">
            {/* 1. 3D AIRFLOW INTERFERENCE & PROXIMITY STRESS WINDOW */}
            {acoustics.alignment === 'ported' && isAirflowStressVisible && (
              <div className="pointer-events-auto bg-slate-950/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-slate-200 font-sans transition-all">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Wind className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 truncate">
                      Airflow Stress 3D Field
                    </span>
                  </div>
                  {onToggleAirflowStress && (
                    <button
                      type="button"
                      onClick={onToggleAirflowStress}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-600/80 text-slate-300 hover:text-rose-200 text-[10px] font-mono font-bold transition cursor-pointer shrink-0"
                      title="Close Airflow Stress 3D Window"
                    >
                      <X className="w-3 h-3" />
                      <span>Close</span>
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-2.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="text-rose-400 font-bold">&le;18mm Choke</span>
                      <span className="text-orange-400">18-45mm</span>
                      <span className="text-yellow-400">45-75mm</span>
                      <span className="text-emerald-400">&gt;75mm Safe</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-400 to-emerald-400 border border-slate-700 shadow-inner" />
                  </div>

                  {results.layout?.airflowInterference && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Clearance Status:</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                            results.layout.airflowInterference.overallStatus === 'choked'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700'
                              : results.layout.airflowInterference.overallStatus === 'caution'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}
                        >
                          {results.layout.airflowInterference.overallStatus === 'choked'
                            ? 'Boundary Choked'
                            : results.layout.airflowInterference.overallStatus === 'caution'
                            ? 'Proximity Drag'
                            : 'Laminar Safe'}
                        </span>
                      </div>

                      {results.layout.airflowInterference.closestObstruction ? (
                        <div className="bg-slate-900/80 border border-slate-800 rounded p-2 text-[11px]">
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-slate-300 font-semibold truncate max-w-[165px]">
                              {results.layout.airflowInterference.closestObstruction.name}
                            </span>
                            <span
                              className={`font-bold ${
                                results.layout.airflowInterference.closestObstruction.distanceMm <= 18
                                  ? 'text-rose-400'
                                  : results.layout.airflowInterference.closestObstruction.distanceMm <= 45
                                  ? 'text-orange-400'
                                  : 'text-yellow-400'
                              }`}
                            >
                              {formatLength(results.layout.airflowInterference.closestObstruction.distanceMm)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            {results.layout.airflowInterference.closestObstruction.description}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Full aerodynamic clearance (&gt;{formatLength(75)}).</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-400">
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <div>Matrix Brace:</div>
                          <div className="text-slate-200 font-bold">
                            {formatLength(results.layout.airflowInterference.minBracingClearanceMm)}
                          </div>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                          <div>Turbulence Mult:</div>
                          <div className="text-cyan-300 font-bold">
                            {results.layout.airflowInterference.turbulenceMultiplier}x
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ENCLOSURE PANEL VIBRATION STRESS (FEA) WINDOW */}
            {isVibrationAnalysisVisible && (
              <div className="pointer-events-auto bg-slate-950/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-slate-200 font-sans transition-all">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Activity className="w-4 h-4 text-violet-400 shrink-0" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 truncate">
                      Vibration Stress (FEA)
                    </span>
                  </div>
                  {onToggleVibrationAnalysis && (
                    <button
                      type="button"
                      onClick={onToggleVibrationAnalysis}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-600/80 text-slate-300 hover:text-rose-200 text-[10px] font-mono font-bold transition cursor-pointer shrink-0"
                      title="Close Vibration Stress FEA Window"
                    >
                      <X className="w-3 h-3" />
                      <span>Close</span>
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-2.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span className="text-blue-400 font-bold">Node (0.0)</span>
                      <span className="text-emerald-400">Low</span>
                      <span className="text-yellow-400">Flex</span>
                      <span className="text-rose-400 font-bold">Peak (1.0)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gradient-to-r from-blue-700 via-cyan-500 via-emerald-500 via-yellow-400 to-red-600 border border-slate-700 shadow-inner" />
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bending Rigidity (D):</span>
                      <span className="text-cyan-300 font-bold">
                        {results.mechanics?.bendingStiffnessNm?.toLocaleString() ?? '—'} N·m
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Wall Rigidity Rating:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] border ${
                          (results.mechanics?.bendingStiffnessNm ?? 0) >= 5000
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : (results.mechanics?.bendingStiffnessNm ?? 0) >= 2500
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : (results.mechanics?.bendingStiffnessNm ?? 0) >= 1200
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-rose-950 text-rose-300 border-rose-700'
                        }`}
                      >
                        {(results.mechanics?.bendingStiffnessNm ?? 0) >= 5000
                          ? 'Ultra-Rigid'
                          : (results.mechanics?.bendingStiffnessNm ?? 0) >= 2500
                          ? 'High Rigidity'
                          : (results.mechanics?.bendingStiffnessNm ?? 0) >= 1200
                          ? 'Moderate'
                          : 'Compliance Risk'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                        <div className="text-slate-400">Fundamental f1,1:</div>
                        <div className="text-violet-300 font-bold">
                          {results.mechanics?.fundamentalPanelModeHz ?? '—'} Hz
                        </div>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                        <div className="text-slate-400">Braced Mode:</div>
                        <div className="text-emerald-300 font-bold">
                          {results.mechanics?.bracedPanelModeHz ?? '—'} Hz
                        </div>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                        <div className="text-slate-400">Modulus (E):</div>
                        <div className="text-cyan-300 font-bold">
                          {results.mechanics?.flexuralModulusGpa ?? '—'} GPa
                        </div>
                      </div>
                      <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                        <div className="text-slate-400">Loss Factor (η):</div>
                        <div className="text-amber-300 font-bold">
                          {results.mechanics?.compositeLossFactor ?? '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* UNIFIED BOTTOM HUD BAR: ACOUSTIC HEALTH PILL + CAMERA & DISPLAY DOCK (Prevents any overlap on narrow viewports) */}
      <div className="absolute bottom-3 inset-x-3 z-20 pointer-events-none flex flex-wrap items-end justify-between gap-2.5">
        {/* SINGLE "ACOUSTIC HEALTH" STATUS PILL */}
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          {/* Expanded Telemetry Popover (When clicking the Health Pill) */}
          {isHealthExpanded && (
            <div className="p-3 bg-[#070a11]/95 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-2xl font-mono text-xs text-slate-200 w-76 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  Full Acoustic Telemetry
                </span>
                <button
                  type="button"
                  onClick={() => setIsHealthExpanded(false)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">Net Volume (Vb)</span>
                  <span className="text-cyan-300 font-bold">{formatVolume(results.netVolumeLiters)}</span>
                  <span className="text-[9px] text-slate-400 block">F3: {results.f3CutoffHz} Hz</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">
                    {acoustics.alignment === 'sealed' ? 'Box Qtc' : 'Tuning (Fb)'}
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {acoustics.alignment === 'sealed' ? results.boxQtc : `${results.tuningFrequencyFb} Hz`}
                  </span>
                  <span className="text-[9px] text-slate-400 block uppercase">{acoustics.alignment}</span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">Port Air Velocity</span>
                  <span
                    className={`font-bold block ${
                      results.isChuffingRisk ? 'text-rose-400' : 'text-emerald-300'
                    }`}
                  >
                    {acoustics.alignment === 'sealed' ? 'Sealed' : formatVelocity(results.portAirVelocityMs)}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    {acoustics.alignment === 'sealed'
                      ? 'No vent'
                      : results.isChuffingRisk
                      ? 'Choke risk'
                      : 'Laminar flow'}
                  </span>
                </div>
                <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block uppercase">Weight &amp; BOM</span>
                  <span className="text-slate-200 font-bold">{formatWeight(results.totalWeightKg)}</span>
                  <span className="text-[9px] text-emerald-400 block">
                    ${results.materialCost?.totalCostUsd?.toFixed(0) ?? 0} est.
                  </span>
                </div>
              </div>

              {hasPendingOptimizations && (
                <div className="pt-2 border-t border-slate-800/90 space-y-2">
                  <div className="flex items-start gap-1.5 text-[10px] text-amber-200/90 bg-amber-950/40 border border-amber-500/30 rounded-lg px-2 py-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-amber-300 block">
                        Pending Improvements ({pendingOptimizationReasons.join(' • ')})
                      </span>
                      <span className="text-slate-300">
                        Use unified <span className="text-cyan-300 font-bold">Auto-Optimize</span> in the Inspector header or click below.
                      </span>
                    </div>
                  </div>
                  {onAutoOptimize && (
                    <button
                      type="button"
                      onClick={() => {
                        onAutoOptimize();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-amber-950/90 hover:bg-amber-900 border border-amber-500/70 text-amber-100 font-bold text-[11px] transition cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Run Unified Auto-Optimize</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact Acoustic Health Diagnostic Pill (Click to toggle telemetry popover; subtly pulses when Auto-Optimize has pending improvements) */}
          <div
            onClick={() => setIsHealthExpanded((prev) => !prev)}
            title={
              hasPendingOptimizations
                ? `Auto-Optimize improvements available (${pendingOptimizationReasons.join(', ')}) — Click to inspect or use Auto-Optimize in the Inspector header`
                : 'Click to toggle full telemetry numbers'
            }
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md shadow-xl border font-mono text-xs cursor-pointer transition-all duration-300 select-none ${
              results.layout?.hasCollision
                ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 hover:bg-rose-900 shadow-[0_0_16px_rgba(244,63,94,0.28)]'
                : results.isChuffingRisk
                ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 hover:bg-amber-900 shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                : hasPendingOptimizations
                ? 'bg-[#0b1320]/95 border-cyan-400/75 text-cyan-100 hover:bg-[#101b2d] shadow-[0_0_14px_rgba(34,211,238,0.22)]'
                : 'bg-[#080d16]/90 border-emerald-500/60 text-emerald-200 hover:bg-[#0c121e]'
            }`}
          >
            {/* Subtle outer pulse ring when unified Auto-Optimize has pending improvements */}
            {hasPendingOptimizations && (
              <span
                className={`pointer-events-none absolute -inset-[2px] rounded-full border animate-pulse ${
                  results.layout?.hasCollision
                    ? 'border-rose-400/60'
                    : results.isChuffingRisk
                    ? 'border-amber-400/60'
                    : 'border-cyan-400/55'
                }`}
              />
            )}

            {results.layout?.hasCollision ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="font-bold text-[11px] truncate max-w-[190px] sm:max-w-[260px]">
                  ▲ Clash: {results.layout.collisions[0]?.description || 'Collision'}
                </span>
              </>
            ) : results.isChuffingRisk ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-bold text-[11px]">
                  ▲ Port Velocity: {results.portAirVelocityMs.toFixed(1)} m/s (Turbulent)
                </span>
              </>
            ) : hasPendingOptimizations ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="font-bold text-[11px]">
                  ● {results.netVolumeLiters.toFixed(1)}L @ {results.tuningFrequencyFb}Hz •{' '}
                  {pendingOptimizationReasons[0] || 'Optimization Ready'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-bold text-[11px]">
                  ● Optimal ({results.netVolumeLiters.toFixed(1)}L @ {results.tuningFrequencyFb}Hz • Laminar)
                </span>
              </>
            )}

            {/* Unified Auto-Optimize guidance indicator */}
            {hasPendingOptimizations && (
              <span className="inline-flex items-center gap-1 pl-2 ml-0.5 border-l border-current/25 text-[10px] font-bold tracking-tight text-amber-300 animate-pulse shrink-0">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Auto-Optimize</span>
              </span>
            )}
          </div>
        </div>

        {/* FLOATING IN-VIEWPORT CAMERA & DISPLAY DOCK */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-[#070b13]/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 shadow-2xl font-mono text-xs ml-auto sm:mx-auto">
          {/* Camera Preset Icons */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            {(
              [
                { id: 'isometric', label: 'Iso' },
                { id: 'front', label: 'Front' },
                { id: 'top', label: 'Top' },
                { id: 'side', label: 'Side' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCameraPreset?.(preset.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  cameraPreset === preset.id
                    ? 'bg-cyan-950 border border-cyan-500/80 text-cyan-200'
                    : 'bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Visual Display Toggles: X-Ray, Cutaway, Wireframe */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
            <button
              type="button"
              onClick={() => setIsXRayMode?.((prev) => !prev)}
              title="Toggle X-Ray Internal Transparency"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                isXRayMode
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-200 shadow-sm'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              X-Ray
            </button>
            <button
              type="button"
              onClick={() => setIsCutawayMode?.((prev) => !prev)}
              title="Toggle 50% Section Cutaway View"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                isCutawayMode
                  ? 'bg-amber-950 border-amber-500 text-amber-200 shadow-sm'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Cutaway
            </button>
            <button
              type="button"
              onClick={() => setIsWireframeMode?.((prev) => !prev)}
              title="Toggle Technical Wireframe Mesh"
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                isWireframeMode
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-200 shadow-sm'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Wireframe
            </button>
          </div>

          {/* Exploded View Slider Pill */}
          <div className="flex items-center gap-1.5 pl-1">
            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
              Explode: {explodedPercent}%
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={explodedPercent}
              onChange={(e) => setExplodedPercent?.(Number(e.target.value))}
              className="w-16 h-1.5 rounded-lg appearance-none bg-slate-800 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to build high-detail 3D driver composite assembly
 */
function build3DDriverAssembly(
  drv: DriverPreset,
  scale: number,
  isCutawayMode: boolean,
  clipPlaneRef: React.MutableRefObject<THREE.Plane>,
  isCoaxial: boolean = false
): THREE.Group {
  const driverGroup = new THREE.Group();
  const frameOuterR = (drv.frameOuterDiameterMm * scale) / 2;
  const frameMountDepth = drv.mountingDepthMm * scale;
  const magnetR = (drv.magnetDiameterMm * scale) / 2;
  const magnetD = drv.magnetDepthMm * scale;

  const aluminumMat = new THREE.MeshStandardMaterial({
    color: '#1a1c20',
    metalness: 0.85,
    roughness: 0.28,
    clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
  });

  const flangeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(frameOuterR, frameOuterR, 0.008, 36).rotateX(Math.PI / 2),
    aluminumMat
  );
  driverGroup.add(flangeMesh);

  const rollR = frameOuterR * 0.78;
  const tubeR = (frameOuterR - rollR) * 0.85;
  const surroundMesh = new THREE.Mesh(
    new THREE.TorusGeometry(rollR, tubeR, 16, 40),
    new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.85, metalness: 0.05, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
  );
  surroundMesh.position.z = 0.003;
  driverGroup.add(surroundMesh);

  const coneTex = createConeTexture();
  const coneTopR = rollR - tubeR;
  const coneBotR = (drv.voiceCoilDiameterMm * scale) / 2;
  const coneDepth = frameMountDepth * 0.45;
  const coneMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(coneTopR, coneBotR, coneDepth, 32, 1, true).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: coneTex, color: '#252830', roughness: 0.4, metalness: 0.35, side: THREE.DoubleSide, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
  );
  coneMesh.position.z = -coneDepth / 2;
  driverGroup.add(coneMesh);

  if (isCoaxial) {
    // Concentric HF Waveguide Horn Throat Aperture & Symmetrical Phase Plug
    const throatR = coneBotR * 0.95;
    const throatDepth = coneDepth * 0.45;
    const throatMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(throatR * 1.35, throatR * 0.5, throatDepth, 32, 1, true).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#15171c',
        roughness: 0.22,
        metalness: 0.9,
        side: THREE.DoubleSide,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      })
    );
    throatMesh.position.z = -coneDepth * 0.75;
    driverGroup.add(throatMesh);

    // Coaxial Central Waveguide Phase Bullet / High-Frequency Aperture
    const bulletMesh = new THREE.Mesh(
      new THREE.ConeGeometry(throatR * 0.4, throatDepth * 0.8, 24).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.2,
        metalness: 0.95,
        clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
      })
    );
    bulletMesh.position.z = -coneDepth * 0.72 + (throatDepth * 0.4);
    driverGroup.add(bulletMesh);
  } else {
    // Standard Dust Cap
    const dustCapR = coneBotR * 1.35;
    const dustCapMesh = new THREE.Mesh(
      new THREE.SphereGeometry(dustCapR, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#181a1e', roughness: 0.3, metalness: 0.5, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
    );
    dustCapMesh.position.z = -coneDepth * 0.75 + dustCapR * 0.4;
    driverGroup.add(dustCapMesh);
  }

  for (let s = 0; s < 4; s++) {
    const angle = (s * Math.PI) / 2 + Math.PI / 4;
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, frameMountDepth * 0.65), aluminumMat);
    legMesh.position.set(Math.cos(angle) * (frameOuterR * 0.55), Math.sin(angle) * (frameOuterR * 0.55), -frameMountDepth * 0.35);
    legMesh.rotation.z = angle;
    driverGroup.add(legMesh);
  }

  const magnetMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(magnetR, magnetR, magnetD, 32).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.5, metalness: 0.6, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
  );
  magnetMesh.position.z = -frameMountDepth + magnetD / 2;
  driverGroup.add(magnetMesh);

  return driverGroup;
}
