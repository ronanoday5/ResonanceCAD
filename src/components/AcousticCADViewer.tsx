import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {
  AcousticCalculationResult,
  AcousticParameters,
  CameraPreset,
  DriverPreset,
  EnclosureDimensions,
  PartMetadata,
} from '../types/loudspeaker.ts';
import { MATERIAL_SPECS } from '../services/acousticEngine.ts';
import {
  createAcousticFoamTexture,
  createConeTexture,
  createPCBTexture,
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

    const woodTex = createWoodTexture(materialSpec.textureColor, materialSpec.roughness);
    const standardWoodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: materialSpec.roughness,
      metalness: 0.05,
      bumpMap: woodTex,
      bumpScale: 0.001,
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

    const activePanelMat = isXRayMode ? xRayMat : standardWoodMat;

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

    // --- MULTI-DRIVER BAFFLE LAYOUT & CUTOUTS ---
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

    const wooferR = (woofer.cutoutDiameterMm * scale) / 2;
    const tweeterR = (tweeter.cutoutDiameterMm * scale) / 2;
    const midR = (midrange.cutoutDiameterMm * scale) / 2;

    const driverPositions: { role: string; y: number; r: number; driver: typeof woofer }[] = [];

    if (topology === 'single') {
      driverPositions.push({ role: 'woofer', y: H * 0.08, r: wooferR, driver: woofer });
    } else if (topology === 'two_way') {
      driverPositions.push({ role: 'tweeter', y: H * 0.28, r: tweeterR, driver: tweeter });
      driverPositions.push({ role: 'woofer', y: -H * 0.1, r: wooferR, driver: woofer });
    } else if (topology === 'mtm') {
      driverPositions.push({ role: 'woofer', y: H * 0.26, r: wooferR, driver: woofer });
      driverPositions.push({ role: 'tweeter', y: 0, r: tweeterR, driver: tweeter });
      driverPositions.push({ role: 'woofer', y: -H * 0.26, r: wooferR, driver: woofer });
    } else if (topology === 'three_way') {
      driverPositions.push({ role: 'tweeter', y: H * 0.32, r: tweeterR, driver: tweeter });
      driverPositions.push({ role: 'midrange', y: H * 0.08, r: midR, driver: midrange });
      driverPositions.push({ role: 'woofer', y: -H * 0.22, r: wooferR, driver: woofer });
    }

    // Cutout holes in baffle
    driverPositions.forEach((dp) => {
      const path = new THREE.Path();
      path.absarc(0, dp.y, dp.r, 0, Math.PI * 2, true);
      baffleShape.holes.push(path);
    });

    // Front port hole (if ported)
    const isFrontPort = acoustics.alignment === 'ported' && acoustics.portType === 'round';
    const portR = (acoustics.portDiameterMm * scale) / 2;
    const portCenterY = -H * 0.38;
    if (isFrontPort) {
      const portPath = new THREE.Path();
      portPath.absarc(0, portCenterY, portR, 0, Math.PI * 2, true);
      baffleShape.holes.push(portPath);
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

    // 2. REAR PANEL
    const rearW = W - 2 * t;
    const rearH = H - 2 * t;
    const rearGeo = new THREE.BoxGeometry(rearW, rearH, t);
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

    // 6. BUILD 3D DRIVER ASSEMBLIES FOR EACH PASSBAND
    driverPositions.forEach((dp, idx) => {
      const driverGroup = build3DDriverAssembly(dp.driver, scale, isCutawayMode, clipPlaneRef);
      const driverBasePos = new THREE.Vector3(0, dp.y, D / 2);
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
      const midY = H * 0.08;
      registerComponent('midrange_chamber', midChamberMesh, new THREE.Vector3(0, midY, D / 2 - baffleT - midBoxD / 2), new THREE.Vector3(0, 0.2, -0.4), explDistBase * 0.6, false);
    }

    // 8. PORT TUBE
    if (acoustics.alignment === 'ported') {
      const portLengthM = results.portLengthMm * scale;
      if (acoustics.portType === 'round') {
        const portGroup = new THREE.Group();
        const innerR = (acoustics.portDiameterMm * scale) / 2;
        const outerR = innerR + 0.003;

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

        const outerFlareGeo = new THREE.TorusGeometry(outerR + 0.008, 0.007, 14, 32);
        const flareMesh = new THREE.Mesh(outerFlareGeo, portMat);
        flareMesh.position.z = portLengthM / 2;
        portGroup.add(flareMesh);

        const portBasePos = new THREE.Vector3(0, portCenterY, D / 2 - portLengthM / 2);
        registerComponent('port_tube', portGroup, portBasePos, new THREE.Vector3(0, 0, 1), explDistBase * 0.9, false);
      } else {
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
        const slotHeightM = (acoustics.slotHeightMm || 40) * scale;
        const slotBasePos = new THREE.Vector3(0, -H / 2 + t + slotHeightM + t / 2, D / 2 - slotPlateL / 2 - baffleT);
        registerComponent('port_slot_board', slotMesh, slotBasePos, new THREE.Vector3(0, -0.3, 0.5), explDistBase * 0.5, false);
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

    const terminalBasePos = new THREE.Vector3(0, -H * 0.22, -D / 2 + t);
    registerComponent('crossover_pcb', pcbGroup, terminalBasePos, new THREE.Vector3(0, 0, -1), explDistBase * 1.3, false);

    if (sceneRef.current) {
      const shadowPlane = sceneRef.current.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry);
      if (shadowPlane) shadowPlane.position.y = -H / 2 - 0.001;
      const grid = sceneRef.current.children.find((c) => c instanceof THREE.GridHelper);
      if (grid) grid.position.y = -H / 2 - 0.002;
    }
  }, [dimensions, acoustics, results, isXRayMode, isCutawayMode, isWireframeMode]);

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

      <div className="absolute top-4 right-4 z-20 pointer-events-none hidden md:flex items-center gap-3 text-[11px] text-slate-400 font-mono bg-slate-950/70 border border-slate-800/80 rounded px-3 py-1.5">
        <span>ROTATE: Left Click + Drag</span>
        <span className="text-slate-600">|</span>
        <span>PAN: Right Click + Drag</span>
        <span className="text-slate-600">|</span>
        <span>ZOOM: Scroll Wheel</span>
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
