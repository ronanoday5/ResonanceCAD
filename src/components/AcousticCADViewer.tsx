import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Wind, AlertTriangle, CheckCircle, Eye, EyeOff, ShieldCheck, Zap, Download } from 'lucide-react';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  CameraPreset,
  DriverPreset,
  EnclosureDimensions,
  PartMetadata,
} from '../types/loudspeaker.ts';
import { MATERIAL_SPECS, SURFACE_FINISH_SPECS } from '../services/acousticEngine.ts';
import { computeBaffleLayout } from '../services/baffleLayoutEngine.ts';
import {
  createAcousticFoamTexture,
  createConeTexture,
  createFilamentTexture,
  createPCBTexture,
  createPolyureaTexture,
  createWoodTexture,
} from './proceduralTextures.ts';

interface AcousticCADViewerProps {
  dimensions: EnclosureDimensions;
  acoustics: AcousticParameters;
  results: AcousticCalculationResult;
  partMetadataMap: Record<string, PartMetadata>;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  explodedPercent: number;
  isXRayMode: boolean;
  isCutawayMode: boolean;
  isWireframeMode: boolean;
  cameraPreset: CameraPreset;
  onAutoResolveClashes?: () => void;
  isAirflowStressVisible?: boolean;
  onToggleAirflowStress?: () => void;
  onModelRootReady?: (getRoot: () => THREE.Group | null) => void;
  onOpenCadExport?: () => void;
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
  selectedPartId,
  onSelectPart,
  explodedPercent,
  isXRayMode,
  isCutawayMode,
  isWireframeMode,
  cameraPreset,
  onAutoResolveClashes,
  isAirflowStressVisible = true,
  onToggleAirflowStress,
  onModelRootReady,
  onOpenCadExport,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const clipPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0));
  const componentsRef = useRef<ComponentMeshDef[]>([]);
  const rootGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (onModelRootReady) {
      onModelRootReady(() => rootGroupRef.current);
    }
  }, [onModelRootReady]);

  const targetExplodeRef = useRef<number>(explodedPercent);
  const currentExplodeRef = useRef<number>(explodedPercent);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0.5, 0.4, 0.7));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

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

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    let isUserInteracting = false;
    controls.addEventListener('start', () => { isUserInteracting = true; });
    controls.addEventListener('end', () => { isUserInteracting = false; });

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (!isUserInteracting) {
        camera.position.lerp(targetCamPosRef.current, Math.min(1, delta * 3.5));
        controls.target.lerp(targetCamLookRef.current, Math.min(1, delta * 3.5));
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
        const offset = comp.explosionDirection
          .clone()
          .multiplyScalar(comp.explosionDistance * explodeFactor);
        comp.group.position.copy(comp.basePosition).add(offset);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
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

    while (root.children.length > 0) {
      const obj = root.children[0];
      root.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
    }
    componentsRef.current = [];

    const scale = 0.001;
    const W = dimensions.externalWidthMm * scale;
    const H = dimensions.externalHeightMm * scale;
    const D = dimensions.externalDepthMm * scale;

    const materialSpec = MATERIAL_SPECS[dimensions.material];
    const t = materialSpec.nominalThicknessMm * scale;
    const baffleT = (dimensions.baffleThicknessMm || materialSpec.nominalThicknessMm) * scale;

    const activeFinishKey = dimensions.surfaceFinish || 'natural_hardwood_veneer';
    const finishSpec = SURFACE_FINISH_SPECS[activeFinishKey] || SURFACE_FINISH_SPECS.natural_hardwood_veneer;
    const finishColorHex = dimensions.finishColorHex || (activeFinishKey === 'natural_hardwood_veneer' ? materialSpec.textureColor : activeFinishKey === 'tour_grade_polyurea' ? '#1a1d20' : activeFinishKey === 'high_gloss_automotive' ? '#111111' : '#2b2e34');

    const woodTex = createWoodTexture(finishColorHex, finishSpec.roughness);
    const polyureaTex = createPolyureaTexture(finishColorHex);
    const filamentTex = createFilamentTexture(materialSpec.id, finishColorHex || materialSpec.textureColor);

    const isFilament = materialSpec.category === 'filaments';
    const isCF = materialSpec.id === 'petg_cf' || materialSpec.id === 'pla_cf';

    const filamentMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(finishColorHex || materialSpec.textureColor),
      map: filamentTex,
      roughness: isCF ? 0.72 : 0.35,
      metalness: isCF ? 0.1 : 0.0,
      clearcoat: isCF ? 0.05 : 0.2,
      clearcoatRoughness: isCF ? 0.5 : 0.2,
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

    const activePanelMat = isXRayMode ? xRayMat : (isFilament ? filamentMat : standardFinishMat);

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

    const baffleGeo = new THREE.ExtrudeGeometry(baffleShape, {
      depth: baffleT,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.001,
      bevelThickness: 0.001,
    });
    baffleGeo.center();

    const baffleMesh = new THREE.Mesh(baffleGeo, activePanelMat);
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
      rearPortHole.absarc(portComp.centerX * scale, portComp.centerY * scale, portComp.cutoutRadiusMm * scale, 0, Math.PI * 2, true);
      rearShape.holes.push(rearPortHole);

      rearGeo = new THREE.ExtrudeGeometry(rearShape, { depth: t, bevelEnabled: false });
      rearGeo.center();
    } else {
      rearGeo = new THREE.BoxGeometry(rearW, rearH, t);
    }

    const rearMesh = new THREE.Mesh(rearGeo, activePanelMat);
    const rearBasePos = new THREE.Vector3(0, 0, -D / 2 + t / 2);
    registerComponent('panel_rear', rearMesh, rearBasePos, new THREE.Vector3(0, 0, -1), explDistBase * 1.2, true);

    // 3. TOP & BOTTOM PANELS
    const topBottomD = D - baffleT;
    const topGeo = new THREE.BoxGeometry(W, t, topBottomD);
    const topMesh = new THREE.Mesh(topGeo, activePanelMat);
    registerComponent('panel_top', topMesh, new THREE.Vector3(0, H / 2 - t / 2, -baffleT / 2), new THREE.Vector3(0, 1, 0), explDistBase, true);

    const bottomGeo = new THREE.BoxGeometry(W, t, topBottomD);
    const bottomMesh = new THREE.Mesh(bottomGeo, activePanelMat);
    registerComponent('panel_bottom', bottomMesh, new THREE.Vector3(0, -H / 2 + t / 2, -baffleT / 2), new THREE.Vector3(0, -1, 0), explDistBase, true);

    // 4. SIDE PANELS
    const sideH = H - 2 * t;
    const sideD = D - baffleT;
    const leftSideMesh = new THREE.Mesh(new THREE.BoxGeometry(t, sideH, sideD), activePanelMat);
    registerComponent('panel_left', leftSideMesh, new THREE.Vector3(-W / 2 + t / 2, 0, -baffleT / 2), new THREE.Vector3(-1, 0, 0), explDistBase, true);

    const rightSideMesh = new THREE.Mesh(new THREE.BoxGeometry(t, sideH, sideD), activePanelMat);
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
    frontDrivers.forEach((dp, idx) => {
      const drvPreset = dp.role === 'tweeter' ? tweeter : (dp.role === 'midrange' ? midrange : woofer);
      const driverGroup = build3DDriverAssembly(drvPreset, scale, isCutawayMode, clipPlaneRef);
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

    // 8. PORT TUBE & AERODYNAMICS (Collision-Guaranteed 3D Placement)
    if (acoustics.alignment === 'ported' && portComp) {
      const portLengthM = results.portLengthMm * scale;
      const isRearPort = portComp.panel === 'rear';
      const portCenterX = portComp.centerX * scale;
      const portCenterY = portComp.centerY * scale;

      if (acoustics.portType === 'round') {
        const portGroup = new THREE.Group();
        const innerR = (acoustics.portDiameterMm * scale) / 2;
        const outerR = innerR + 0.003;
        const flareR = (acoustics.flareRadiusMm || results.optimalFlareRadiusMm || 16) * scale;

        const tubeGeo = new THREE.CylinderGeometry(outerR, outerR, portLengthM, 32, 1, true);
        tubeGeo.rotateX(Math.PI / 2);
        const portMat = new THREE.MeshStandardMaterial({
          color: '#1a1e24',
          roughness: 0.35,
          metalness: 0.2,
          side: THREE.DoubleSide,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, portMat);
        portGroup.add(tubeMesh);

        // Outer Bellmouth Exit Flare
        // If front port: exit flare is flush with front baffle exterior face (+portLengthM / 2)
        // If rear port: exit flare is flush with rear panel exterior face (-portLengthM / 2)
        const outerFlareGeo = new THREE.TorusGeometry(outerR + flareR * 0.55, flareR * 0.45, 14, 32);
        const outerFlareMesh = new THREE.Mesh(outerFlareGeo, portMat);
        outerFlareMesh.position.z = isRearPort ? -portLengthM / 2 : portLengthM / 2;
        portGroup.add(outerFlareMesh);

        // Inner Bellmouth Flare (if double flared)
        if (acoustics.isDoubleFlared) {
          const innerFlareGeo = new THREE.TorusGeometry(outerR + flareR * 0.55, flareR * 0.45, 14, 32);
          const innerFlareMesh = new THREE.Mesh(innerFlareGeo, portMat);
          innerFlareMesh.position.z = isRearPort ? portLengthM / 2 : -portLengthM / 2;
          portGroup.add(innerFlareMesh);
        }

        const portBaseZ = isRearPort ? (-D / 2 + portLengthM / 2) : (D / 2 - portLengthM / 2);
        const portBasePos = new THREE.Vector3(portCenterX, portCenterY, portBaseZ);
        const explDir = isRearPort ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
        registerComponent('port_tube', portGroup, portBasePos, explDir, explDistBase * 0.9, false);
      } else {
        const slotGroup = new THREE.Group();
        const slotW = W - 2 * t;
        const slotPlateL = portLengthM;
        const slotBoardGeo = new THREE.BoxGeometry(slotW, t, slotPlateL);
        const slotBoardMat = new THREE.MeshStandardMaterial({
          color: '#ab8251',
          roughness: 0.7,
          metalness: 0.05,
          clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [],
        });
        const slotMesh = new THREE.Mesh(slotBoardGeo, slotBoardMat);
        slotGroup.add(slotMesh);

        // Slot entry rounded lip to mitigate edge turbulence
        const lipR = (acoustics.slotLipRadiusMm || 12) * scale;
        const lipGeo = new THREE.CylinderGeometry(lipR, lipR, slotW, 16);
        lipGeo.rotateZ(Math.PI / 2);
        const lipMesh = new THREE.Mesh(lipGeo, slotBoardMat);
        lipMesh.position.set(0, t / 2, -slotPlateL / 2);
        slotGroup.add(lipMesh);

        const slotHeightM = (portComp.slotHeightMm || 40) * scale;
        const slotBaseY = (portComp.centerY + (portComp.slotHeightMm || 40) / 2 + t / 2) * scale;
        const slotBasePos = new THREE.Vector3(0, slotBaseY, D / 2 - slotPlateL / 2 - baffleT);
        registerComponent('port_slot_board', slotGroup, slotBasePos, new THREE.Vector3(0, -0.3, 0.5), explDistBase * 0.5, false);
      }
    }

    // 9. DAMPING TREATMENT
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
      const portLengthM = results.portLengthMm * scale;
      const isRearPort = portComp.panel === 'rear';
      const portMouthXM = portComp.centerX * scale;
      const portMouthYM = portComp.centerY * scale;
      const portMouthZM = isRearPort ? (-D / 2 + t + portLengthM) : (D / 2 - baffleT - portLengthM);
      const flowDirZ = isRearPort ? 1 : -1;
      const innerR = (acoustics.portDiameterMm * scale) / 2;

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
          const vx = portMouthXM + Math.cos(angle) * curR;
          const vy = portMouthYM + Math.sin(angle) * curR;
          const vz = portMouthZM + zOff;

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
        const ringZ = portMouthZM + flowDirZ * zStep;
        const ringR = innerR + flareExpM * Math.pow(ringIdx * 0.4 + 0.3, 1.25) + 0.012;
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
  }, [dimensions, acoustics, results, isXRayMode, isCutawayMode, isWireframeMode, isAirflowStressVisible]);

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

  const hoveredMeta = hoveredPartId ? partMetadataMap[hoveredPartId] : null;

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0c0e12]">
      <div
        ref={mountRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {hoveredMeta && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none bg-slate-900/90 border border-slate-700/80 rounded px-3 py-2 text-xs shadow-xl backdrop-blur-none transition-all">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold text-slate-100">{hoveredMeta.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {hoveredMeta.category.toUpperCase()} • Click to inspect engineering specs
          </div>
        </div>
      )}

      {/* 3D AIRFLOW INTERFERENCE & PROXIMITY STRESS HUD & LEGEND */}
      {acoustics.alignment === 'ported' && (
        <div className="absolute top-20 left-4 z-20 max-w-[340px] bg-slate-950/92 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-none text-slate-200 font-sans transition-all">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Airflow Stress 3D Field
              </span>
            </div>
            {onToggleAirflowStress && (
              <button
                onClick={onToggleAirflowStress}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                  isAirflowStressVisible
                    ? 'bg-amber-950/80 border border-amber-600/80 text-amber-300 font-bold'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title="Toggle Airflow Proximity Stress Overlay in 3D"
              >
                {isAirflowStressVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{isAirflowStressVisible ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>

          {isAirflowStressVisible && (
            <div className="mt-2.5 space-y-2.5 text-xs">
              {/* Gradient Bar (Strict Red-to-Yellow gradient) */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span className="text-rose-400 font-bold">&le;18mm Choke</span>
                  <span className="text-orange-400">18-45mm Drag</span>
                  <span className="text-yellow-400">45-75mm Caution</span>
                  <span className="text-emerald-400">&gt;75mm Safe</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-red-500 via-orange-500 via-yellow-400 to-emerald-400 border border-slate-700 shadow-inner" />
              </div>

              {/* Status summary */}
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
                        <span className="text-slate-300 font-semibold truncate max-w-[190px]">
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
                          {results.layout.airflowInterference.closestObstruction.distanceMm} mm
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {results.layout.airflowInterference.closestObstruction.description}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Full aerodynamic clearance (&gt;75mm).</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 text-slate-400">
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
                      <div>Matrix Brace:</div>
                      <div className="text-slate-200 font-bold">
                        {results.layout.airflowInterference.minBracingClearanceMm} mm
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
          )}
        </div>
      )}

      {results.layout?.hasCollision && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-rose-950/90 border border-rose-500/80 text-rose-100 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="font-bold text-rose-300">CLASH DETECTED:</span>
            <span>{results.layout.collisions[0]?.description}</span>
          </div>
          {onAutoResolveClashes && (
            <button
              onClick={onAutoResolveClashes}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition shadow cursor-pointer shrink-0"
            >
              Auto-Resolve Clash
            </button>
          )}
        </div>
      )}

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {onOpenCadExport && (
          <button
            onClick={onOpenCadExport}
            title="Export 3D Enclosure to STL or STEP CAD file"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-950/50 border border-cyan-400/30 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-100" />
            <span>Export CAD (STL/STEP)</span>
          </button>
        )}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 font-mono bg-slate-950/70 border border-slate-800/80 rounded px-3 py-1.5 backdrop-blur-sm pointer-events-none">
          <span>ROTATE: Left Click + Drag</span>
          <span className="text-slate-600">|</span>
          <span>PAN: Right Click + Drag</span>
          <span className="text-slate-600">|</span>
          <span>ZOOM: Scroll Wheel</span>
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
  clipPlaneRef: React.MutableRefObject<THREE.Plane>
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

  const dustCapR = coneBotR * 1.35;
  const dustCapMesh = new THREE.Mesh(
    new THREE.SphereGeometry(dustCapR, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#181a1e', roughness: 0.3, metalness: 0.5, clippingPlanes: isCutawayMode ? [clipPlaneRef.current] : [] })
  );
  dustCapMesh.position.z = -coneDepth * 0.75 + dustCapR * 0.4;
  driverGroup.add(dustCapMesh);

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
