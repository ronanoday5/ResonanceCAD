import React, { useCallback, useMemo, useState } from 'react';
import * as THREE from 'three';
import type {
  AcousticParameters,
  CameraPreset,
  DriverPreset,
  EnclosureDimensions,
} from './types/loudspeaker.ts';
import {
  calculateAcoustics,
  calculateOptimalAlignment,
  DRIVER_PRESETS,
  MATERIAL_SPECS,
} from './services/acousticEngine.ts';
import { generateCutList } from './services/cutlistGenerator.ts';
import { autoResolveBaffleClashes } from './services/baffleLayoutEngine.ts';
import { AcousticCADViewer } from './components/AcousticCADViewer.tsx';
import { TopHeader } from './components/TopHeader.tsx';
import { ControlDock } from './components/ControlDock.tsx';
import { PartInspectorModal } from './components/PartInspectorModal.tsx';
import { CutListSheet } from './components/CutListSheet.tsx';
import { FrequencyResponseChart } from './components/FrequencyResponseChart.tsx';
import { CustomDriverModal } from './components/CustomDriverModal.tsx';
import { CrossoverDesigner } from './components/CrossoverDesigner.tsx';
import { LiveSimulationPanel } from './components/LiveSimulationPanel.tsx';
import { CadExportModal } from './components/CadExportModal.tsx';
import type { CadExportScope } from './services/cadExportEngine.ts';
import { CheckCircle, X } from 'lucide-react';

export default function App() {
  const [dimensions, setDimensions] = useState<EnclosureDimensions>({
    externalWidthMm: 330,
    externalHeightMm: 580,
    externalDepthMm: 380,
    material: 'baltic_birch_18',
    baffleThicknessMm: 18,
    jointType: 'rabbet',
  });

  const [acoustics, setAcoustics] = useState<AcousticParameters>({
    topology: 'two_way',
    driverAssignments: {
      woofer: {
        role: 'woofer',
        driver: DRIVER_PRESETS[0],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 0,
      },
      tweeter: {
        role: 'tweeter',
        driver: DRIVER_PRESETS[4],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 2.5,
      },
      midrange: {
        role: 'midrange',
        driver: DRIVER_PRESETS[6],
        quantity: 1,
        impedanceOhm: 8,
        attenuationDb: 0,
      },
    },
    alignment: 'ported',
    targetQtc: 0.707,
    targetFb: 26,
    portType: 'round',
    portPlacement: 'auto',
    portDiameterMm: 80,
    flareRadiusMm: 18,
    isDoubleFlared: true,
    slotWidthMm: 290,
    slotHeightMm: 45,
    slotLipRadiusMm: 12,
    numberOfPorts: 1,
    dampingFillPercent: 50,
    bracingLevel: 'standard',
    materialPricing: {
      customDensityKgM3: 680,
      costPerSquareMeter: 68,
      wastePercentage: 15,
    },
    crossoverLowHz: 2500,
    crossoverHighHz: 3500,
    lowPassOrder: 2,
    lowPassType: 'linkwitz_riley',
    highPassOrder: 2,
    highPassType: 'linkwitz_riley',
  });

  const [explodedPercent, setExplodedPercent] = useState<number>(0);
  const [isXRayMode, setIsXRayMode] = useState<boolean>(false);
  const [isCutawayMode, setIsCutawayMode] = useState<boolean>(false);
  const [isWireframeMode, setIsWireframeMode] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  const [isLiveSimOpen, setIsLiveSimOpen] = useState<boolean>(true);
  const [isCutListOpen, setIsCutListOpen] = useState<boolean>(false);
  const [isResponseChartOpen, setIsResponseChartOpen] = useState<boolean>(false);
  const [isCrossoverDesignerOpen, setIsCrossoverDesignerOpen] = useState<boolean>(false);
  const [isCustomDriverOpen, setIsCustomDriverOpen] = useState<boolean>(false);
  const [isAirflowStressVisible, setIsAirflowStressVisible] = useState<boolean>(true);

  const [isCadExportOpen, setIsCadExportOpen] = useState<boolean>(false);
  const [cadExportScope, setCadExportScope] = useState<CadExportScope>('woodwork_only');
  const [clashNotification, setClashNotification] = useState<string | null>(null);
  const modelRootGetterRef = React.useRef<(() => THREE.Group | null) | null>(null);

  const handleOpenCadExport = useCallback((scope?: CadExportScope) => {
    if (scope) setCadExportScope(scope);
    setIsCadExportOpen(true);
  }, []);

  const acousticResults = useMemo(() => {
    return calculateAcoustics(dimensions, acoustics);
  }, [dimensions, acoustics]);

  const { cutList, partMetadataMap } = useMemo(() => {
    return generateCutList(dimensions, acoustics, acousticResults);
  }, [dimensions, acoustics, acousticResults]);

  const selectedPart = selectedPartId ? partMetadataMap[selectedPartId] || null : null;

  const handleAutoAlign = useCallback(() => {
    const woofer = acoustics.driverAssignments.woofer.driver;
    const optimal = calculateOptimalAlignment(woofer, acoustics.alignment);
    const material = MATERIAL_SPECS[dimensions.material];
    const t = material.nominalThicknessMm;

    const wooferQty = acoustics.topology === 'mtm' ? 2 : 1;
    const targetGrossLiters = optimal.optimalVbLiters * wooferQty * 1.18;
    const baseW = Math.round(Math.cbrt((targetGrossLiters * 1000000) / (1.6 * 1.25)));
    const newW = Math.max(woofer.frameOuterDiameterMm + 40, baseW + 2 * t);
    const newH = Math.round(newW * (acoustics.topology === 'three_way' || acoustics.topology === 'mtm' ? 1.85 : 1.55));
    const newD = Math.round(newW * 1.15);

    const updatedDims: EnclosureDimensions = {
      ...dimensions,
      externalWidthMm: Math.min(750, Math.max(240, newW)),
      externalHeightMm: Math.min(1300, Math.max(280, newH)),
      externalDepthMm: Math.min(800, Math.max(220, newD)),
    };

    const updatedAcoustics: AcousticParameters = {
      ...acoustics,
      targetFb: optimal.optimalFbHz,
      targetQtc: optimal.targetQtc,
    };

    // Calculate preliminary results to run auto-resolve clash solver
    const prelimResults = calculateAcoustics(updatedDims, updatedAcoustics);
    const resolved = autoResolveBaffleClashes(updatedDims, updatedAcoustics, prelimResults);

    // Re-evaluate acoustics for precise telemetry output
    const finalRes = calculateAcoustics(resolved.dimensions, resolved.acoustics);
    const turb = finalRes.layout?.airflowInterference?.turbulenceMultiplier || 1.0;
    const closestMm = Math.round(
      Math.min(
        finalRes.layout?.airflowInterference?.minMagnetClearanceMm ?? 999,
        finalRes.layout?.airflowInterference?.minBracingClearanceMm ?? 999,
        finalRes.layout?.rearWallClearanceMm ?? 999
      )
    );

    setDimensions(resolved.dimensions);
    setAcoustics(resolved.acoustics);
    setClashNotification(
      `Auto-Aligned (${finalRes.netVolumeLiters}L @ ${finalRes.tuningFrequencyFb}Hz) • Zero 2D Clashes • Aerodynamic Health: ${turb}x - Laminar Flow (${closestMm}mm clearance)`
    );
    setTimeout(() => setClashNotification(null), 6000);
  }, [acoustics, dimensions]);

  const handleAutoFixPort = useCallback(() => {
    if (acousticResults.recommendedMinimumPortDiameterMm > 0) {
      setAcoustics((prev) => ({
        ...prev,
        portDiameterMm: Math.max(prev.portDiameterMm, Math.ceil(acousticResults.recommendedMinimumPortDiameterMm)),
      }));
    }
  }, [acousticResults.recommendedMinimumPortDiameterMm]);

  const handleAutoResolveClashes = useCallback(() => {
    const resolved = autoResolveBaffleClashes(dimensions, acoustics, acousticResults);
    setDimensions(resolved.dimensions);
    setAcoustics(resolved.acoustics);
    setClashNotification(resolved.explanation || 'Physical clashes automatically resolved.');
    setTimeout(() => setClashNotification(null), 5000);
  }, [dimensions, acoustics, acousticResults]);

  const handleSaveCustomDriver = (driver: DriverPreset) => {
    setAcoustics((prev) => ({
      ...prev,
      driverAssignments: {
        ...prev.driverAssignments,
        woofer: { ...prev.driverAssignments.woofer, driver },
      },
    }));
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Escape') {
        setSelectedPartId(null);
        setIsCutListOpen(false);
        setIsResponseChartOpen(false);
        setIsCrossoverDesignerOpen(false);
        setIsCustomDriverOpen(false);
      } else if (e.key === 'x' || e.key === 'X') {
        setIsXRayMode((prev) => !prev);
      } else if (e.key === 'c' || e.key === 'C') {
        setIsCutawayMode((prev) => !prev);
      } else if (e.key === 'w' || e.key === 'W') {
        setIsWireframeMode((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        setExplodedPercent((prev) => (prev > 0 ? 0 : 50));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#0c0e12] select-none text-slate-100 font-sans">
      <TopHeader
        results={acousticResults}
        acoustics={acoustics}
        onOptimizeAlignment={handleAutoAlign}
        isLiveSimOpen={isLiveSimOpen}
        onToggleLiveSim={() => setIsLiveSimOpen((p) => !p)}
        onOpenCadExport={handleOpenCadExport}
        onAutoResolveClashes={handleAutoResolveClashes}
      />

      {clashNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-950/95 border border-emerald-500/80 text-emerald-100 shadow-2xl backdrop-blur-md font-mono text-xs animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold">{clashNotification}</span>
        </div>
      )}

      <main className="relative flex-1 w-full h-full overflow-hidden">
        <AcousticCADViewer
          dimensions={dimensions}
          acoustics={acoustics}
          results={acousticResults}
          partMetadataMap={partMetadataMap}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          explodedPercent={explodedPercent}
          isXRayMode={isXRayMode}
          isCutawayMode={isCutawayMode}
          isWireframeMode={isWireframeMode}
          cameraPreset={cameraPreset}
          onAutoResolveClashes={handleAutoResolveClashes}
          isAirflowStressVisible={isAirflowStressVisible}
          onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
          onModelRootReady={(getter) => {
            modelRootGetterRef.current = getter;
          }}
          onOpenCadExport={handleOpenCadExport}
        />

        {/* Live Simulation Dockable Panel (Side-by-side beside 3D CAD) */}
        <LiveSimulationPanel
          results={acousticResults}
          acoustics={acoustics}
          isOpen={isLiveSimOpen}
          onToggle={() => setIsLiveSimOpen(false)}
          onAutoFixPort={handleAutoFixPort}
          onOpenFullModal={() => setIsResponseChartOpen(true)}
        />

        <div className="absolute bottom-24 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
          {explodedPercent > 0 && (
            <div className="bg-slate-900/90 border border-cyan-800/80 px-2.5 py-1 rounded text-xs font-mono text-cyan-300 shadow-lg flex items-center gap-1.5">
              <span>EXPLODED VIEW: {explodedPercent}%</span>
              <button
                onClick={() => setExplodedPercent(0)}
                className="text-[10px] text-slate-400 hover:text-white underline ml-1"
              >
                Assemble
              </button>
            </div>
          )}
          {isXRayMode && (
            <div className="bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded text-xs font-mono text-slate-300 shadow-lg">
              X-RAY GLASS ACTIVE
            </div>
          )}
          {isCutawayMode && (
            <div className="bg-slate-900/90 border border-amber-800 px-2.5 py-1 rounded text-xs font-mono text-amber-300 shadow-lg">
              SECTION CUTAWAY ACTIVE
            </div>
          )}
        </div>
      </main>

      <ControlDock
        dimensions={dimensions}
        setDimensions={setDimensions}
        acoustics={acoustics}
        setAcoustics={setAcoustics}
        results={acousticResults}
        explodedPercent={explodedPercent}
        setExplodedPercent={setExplodedPercent}
        isXRayMode={isXRayMode}
        setIsXRayMode={setIsXRayMode}
        isCutawayMode={isCutawayMode}
        setIsCutawayMode={setIsCutawayMode}
        isWireframeMode={isWireframeMode}
        setIsWireframeMode={setIsWireframeMode}
        cameraPreset={cameraPreset}
        setCameraPreset={setCameraPreset}
        onOpenCutList={() => setIsCutListOpen(true)}
        onOpenResponseChart={() => setIsResponseChartOpen(true)}
        onOpenCrossoverDesigner={() => setIsCrossoverDesignerOpen(true)}
        onOpenCustomDriver={() => setIsCustomDriverOpen(true)}
        onAutoAlign={handleAutoAlign}
        onAutoFixPort={handleAutoFixPort}
        onAutoResolveClashes={handleAutoResolveClashes}
        onToggleLiveSim={() => setIsLiveSimOpen((p) => !p)}
        isLiveSimOpen={isLiveSimOpen}
        isAirflowStressVisible={isAirflowStressVisible}
        onToggleAirflowStress={() => setIsAirflowStressVisible((p) => !p)}
        onOpenCadExport={handleOpenCadExport}
      />

      <CadExportModal
        isOpen={isCadExportOpen}
        onClose={() => setIsCadExportOpen(false)}
        dimensions={dimensions}
        acoustics={acoustics}
        results={acousticResults}
        getModelRoot={() => (modelRootGetterRef.current ? modelRootGetterRef.current() : null)}
        initialScope={cadExportScope}
      />

      {selectedPart && (
        <PartInspectorModal
          part={selectedPart}
          onClose={() => setSelectedPartId(null)}
        />
      )}

      {isCutListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-none animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl">
            <button
              onClick={() => setIsCutListOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <CutListSheet
              cutList={cutList}
              dimensions={dimensions}
              onSelectPart={(partId) => {
                setSelectedPartId(partId);
                setIsCutListOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {isResponseChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-none animate-in fade-in">
          <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2">
            <button
              onClick={() => setIsResponseChartOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <FrequencyResponseChart
              results={acousticResults}
              acoustics={acoustics}
              onAutoFixPort={handleAutoFixPort}
            />
          </div>
        </div>
      )}

      {isCrossoverDesignerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-none animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-2">
            <button
              onClick={() => setIsCrossoverDesignerOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <CrossoverDesigner
              acoustics={acoustics}
              setAcoustics={setAcoustics}
              crossoverResults={acousticResults.crossover}
            />
          </div>
        </div>
      )}

      {isCustomDriverOpen && (
        <CustomDriverModal
          currentDriver={acoustics.driverAssignments.woofer.driver}
          onSave={handleSaveCustomDriver}
          onClose={() => setIsCustomDriverOpen(false)}
        />
      )}
    </div>
  );
}
