# ResonanceCAD: Pending Improvements & Future Features Implementation Plan

A comprehensive audit of the ResonanceCAD codebase comparing the physics/acoustic engines, data models, engineering blueprints, and UI workspaces to surface every pending improvement, un-unified optimization advisory, and partially wired feature—along with a structured execution plan to complete them.

---

## Complete Audit Catalog: All Pending Improvements & Future Features

### Category 1: Un-Unified "Pending Improvements" & Engineering Advisories
Currently, the master `autoOptimizePlan` workflow only monitors and resolves **4 condition types** (`3D Clash`, `Port Velocity`, `Vb/Fb Alignment`, and `Damping Fill`). Meanwhile, the acoustic and mechanical calculation engines actively compute **6 additional warning states** that display isolated inline warning banners or local buttons without feeding into the master `Auto-Optimize` system:

1. **Baffle Edge Diffraction Alert ($\lambda/8$ Chamfer/Roundover Criterion)**
   - **Current State**: The waveguide engine calculates `minBaffleEdgeRadiusMm` ($\lambda/8$ at crossover frequency) and flags `isDiffractionSuppressed === false` with an inline `"Edge Ripple Alert"` badge when `baffleEdgeRadiusMm` is too small.
   - **Missing Upgrade**: Not connected to `pendingOptimizationReasons` or the master `Auto-Optimize` action to automatically expand `baffleEdgeRadiusMm` (clamped safely to panel wall thickness).
2. **Transducer Compatibility Mismatch (`incompatible` / `suboptimal` Pairings)**
   - **Current State**: The compatibility engine flags frequency-gap or sensitivity mismatches between the selected woofer, midrange, and tweeter, and computes `recommendedAlternatives`.
   - **Missing Upgrade**: Does not surface in `pendingOptimizationReasons` or allow `Auto-Optimize` to automatically swap in the highest-scoring compatible transducer.
3. **3D-Printed Filament Wall Compliance Warning**
   - **Current State**: When using additive manufacturing materials (`pla_cf`, `petg_cf`, `abs_asa`, `tpu_95a`), the mechanics engine flags `wallComplianceWarning` if `perimeterShells` or `infillPercent` are insufficient for the cabinet's panel span.
   - **Missing Upgrade**: Not wired into `pendingOptimizationReasons` to automatically increment `perimeterShells`, boost `infillPercent`, or upgrade gyroid/brace stiffness.
4. **Rear Terminal SpeakON Channel Capacity & Internal Depth Clash**
   - **Current State**: The terminal engine flags `hasChannelCapacityWarning` when a 4-pole NL4 connector is paired with a 3-way or quad-amp configuration requiring an 8-pole NL8, and flags `overallClashStatus !== 'clear'` when rear cup projection intersects internal components.
   - **Missing Upgrade**: Not included in `pendingOptimizationReasons` to automatically upgrade `NL4 -> NL8` or reposition the terminal recess.
5. **Standing Wave Axial Mode Mitigation (Internal Reflector & Diffuser Activation)**
   - **Current State**: The standing-wave engine computes `standingWaveRiskLevel === 'high'` for integer-multiple cabinet ratios and calculates an `internalReflector` (45° angled deflector) and `diffuserReport`.
   - **Missing Upgrade**: High standing-wave risk is not surfaced as a pending improvement in `Auto-Optimize`.
6. **Lingering Local "Auto-Fix" Buttons in Structural Rigging Modal**
   - **Current State**: The Structural Rigging & Fly-Hardware modal still contains standalone local fix buttons (`Auto-Upgrade to 12mm Pins`, `Relax Tilt Angle`), an unused `handleAutoFixBridle` function, and a prop signature mismatch (`onApplyRiggingSettings`) that is never invoked to sync rigging changes back to the main project state.

---

### Category 2: Partially Implemented Features (Built in Engine/Types, Missing UI Controls)
Several advanced acoustic and electronics systems are already implemented in the TypeScript data models and physics engines, or documented in the internal electronics blueprint, but lack interactive UI controls:

1. **Procedural Acoustic Diffuser Controls (`qrd_1d` & `skyline_2d`)**
   - **Current State**: `ProceduralDiffuserConfig` (`enabled`, `type: 'qrd_1d' | 'skyline_2d'`, `targetWall`, `primeN: 7 | 11 | 13 | 17 | 19 | 23`, `designFreqHz`, `wellWidthMm`, `finThicknessMm`) and `ProceduralDiffuserReport` are fully modeled and computed in the acoustic engine.
   - **Missing Upgrade**: There is no configuration card in the Master Control Dock or Property Inspector to enable/configure QRD 1D or Skyline 2D internal diffusers, choose quadratic residue prime $N$, or select target cabinet walls (`rear`, `sides`, `top_bottom`, `all`).
2. **4th-Order Bandpass Alignment (`bandpass4`) UI Selector & Chamber Controls**
   - **Current State**: `AlignmentType` supports `'sealed' | 'ported' | 'bandpass4'`, and the Bandpass/Horn Hybrid preset initializes with `bandpass4` (`bandpassFrontVbLiters`, `bandpassRearVbLiters`).
   - **Missing Upgrade**: The alignment selector buttons in the Property Inspector, Control Dock, and Transducer Sizing Modal only display 2 buttons (`Bass Reflex (Ported)` and `Sealed Box`), preventing users from switching to `4th-Order Bandpass` or tuning front/rear chamber volumes directly.
3. **Interactive Passive Crossover Conjugate Networks (From Electronics Blueprint)**
   - **Current State**: The Passive Loudspeaker Electronics Blueprint and Crossover Designer calculate 4 conjugate compensation networks:
     - *Zobel Inductive Impedance Compensation Cell ($R_z, C_z$)*
     - *Motional $F_s$ Parallel RLC Notch Tank ($R_c, C_c, L_c$)*
     - *CD Horn HF Bypass Capacitor ($C_b$)*
     - *Baffle Step Compensation (BSC) RL Contour Shelf ($L_{bsc}, R_{bsc}$)*
   - **Missing Upgrade**: The Motional $F_s$ Tank, CD Horn Bypass Cap, and Baffle Step Shelf are rendered only as read-only diagnostic formulas—they cannot be toggled into the active schematic, component BOM, SPL/Impedance transfer function, or the 3D/2D PCB layout workspace. Additionally, the BSC calculation uses a hardcoded `330 mm` width instead of the live cabinet `externalWidthMm`.
4. **3-Way Midrange Bandpass Filter Controls & 3-Channel Active FIR Export**
   - **Current State**: `AcousticParameters` defines `midPassOrder`, `midPassType`, and midrange driver attenuation, and `CrossoverDesigner` includes a `handleDriverAttenuation('midrange', ...)` handler.
   - **Missing Upgrade**: The Crossover Designer UI only renders filter order/topology and L-Pad controls for the Woofer Low-Pass and Tweeter High-Pass sections (omitting the Midrange Bandpass card in 3-way mode), and the FIR DSP generator only exports `wooferTaps` and `tweeterTaps` (omitting `midrangeTaps`).
5. **Multi-Role Custom Transducer & `.ZMA` Impedance Upload (`Midrange` & `Tweeter`) + Persistence**
   - **Current State**: The Custom Driver & `.ZMA` Upload modal only writes custom drivers and parsed `.ZMA` curves to `driverAssignments.woofer`, and custom drivers reset on page reload.
   - **Missing Upgrade**: Support targeting `woofer`, `midrange`, or `tweeter` slots when saving custom transducers or `.ZMA` files, and persist custom user drivers in `localStorage`.
6. **2D CNC Sheet-Stock Nesting Diagram & Dogbone Fillet Geometry Export**
   - **Current State**: Manufacturing profiles define `dogboneFillet: true` and `minInternalRadiusMm`, and the Cut-List workspace tabulates rectangular panel cuts.
   - **Missing Upgrade**: Add a visual 2D sheet-stock nesting layout (packing panels onto standard 1220×2440 mm / 4'×8' sheets with kerf allowance and grain direction) and render actual T-bone/dogbone corner relief arcs in the exported SVG/DXF/CAD toolpaths.

---

### Category 3: Latent State & Type Inconsistencies Discovered During Audit
1. **Invalid Material Option (`aluminum_6061`) in Simplified Overview**:
   - The Essentials Inspector material dropdown includes `<option value="aluminum_6061">6061-T6 Billet Aluminum (Ultra-Rigid)</option>`, which does not exist in `MaterialType` or `MATERIAL_SPECS`.
2. **Dead Modal State Variables in Root Application**:
   - `isCutListModalOpen` and `isCrossoverModalOpen` remain declared in root state alongside their rendered modal instances even though navigation migrated to main workspace tabs (`activeWorkspace === 'cut_list'` and `'crossover_pcb'`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Review the proposed upgrade scope below. When you click **Proceed** (or let us know which phases to prioritize), we will execute these upgrades cleanly across the codebase.

- **Decision 1 — Expand Master `Auto-Optimize` Scope**: Expand `autoOptimizePlan` from 4 checks to all 10 acoustic, mechanical, terminal, and diffraction advisories so every warning badge in the app can be resolved from the single pulsing Acoustic Health pill and Inspector header button.
- **Decision 2 — Expose All Latent Engine Capabilities in UI**: Wire up full interactive controls for the Procedural Diffuser engine (`QRD 1D` / `Skyline 2D`), `4th-Order Bandpass` chamber tuning, toggleable Passive Conjugate Networks (`Fs Notch`, `Baffle Step`, `CD Horn Bypass`), and 3-Way Midrange Bandpass + FIR synthesis.
- **Decision 3 — Resolve Type & State Bugs**: Add `aluminum_6061` to `MATERIAL_SPECS`, unify the Structural Rigging modal's optimization & state-apply flow, wire live `externalWidthMm` into Baffle Step calculations, and remove dead modal state.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates ResonanceCAD from a partially wired multi-engine prototype into a fully unified acoustic, structural, and electronics CAD workstation where every physics calculation, conjugate circuit, internal diffuser, and engineering advisory is interactively controllable and connected to the master `Auto-Optimize` engine.
- **Target Audience / Persona**: Loudspeaker acoustic engineers, pro-audio cabinet designers, DIY builders, and CNC/3D-printing fabricators.
- **Key Value**: Eliminates dead-end read-only advisories and hidden engine features—every simulated defect can be fixed with one click, and every modeled acoustic/electronic subsystem has complete UI and export coverage.

---

## 2. User Experience & Visual Design

- **Unified Optimization Experience**:
  - Whenever *any* of the 10 acoustic, mechanical, diffraction, driver-pairing, or terminal advisories trigger, the bottom-left **Acoustic Health Pill** and Inspector **Auto-Optimize** button pulse subtly and list the exact pending improvements (e.g., `Port Velocity · Edge Diffraction · NL8 Capacity`).
  - Clicking **Auto-Optimize** resolves all active advisories in a single atomic state update and displays a concise toast summarizing the adjustments applied.
- **Visual Identity & Theme**:
  - Preserves the precision dark-mode scientific CAD aesthetic (`#090B10` canvas, `#11151F` inspector cards, `#38BDF8` sky-blue telemetry accents, `#F59E0B` amber engineering warnings, `#10B981` emerald optimal badges, and crisp `JetBrains Mono` numerical readouts).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Comprehensive 10-Point `autoOptimizePlan` Aggregator**
  - *Chosen Approach*: Consolidate Baffle Diffraction ($\lambda/8$), Driver Compatibility swaps, 3D Filament Wall Compliance, SpeakON NL4/NL8 capacity/clash fixes, and Standing Wave mitigation into the central `autoOptimizePlan` memo.
  - *Why*: Ensures zero orphaned warning banners where a user sees an alert badge in a card without `Auto-Optimize` recognizing or fixing it.
- **Decision 2: Interactive Conjugate Circuit Toggles on the Crossover Bus**
  - *Chosen Approach*: Add individual enable toggles (`enableZobel`, `enableFsNotch`, `enableBsc`, `enableHornBypass`) and a 3-Way Midrange Bandpass card in `CrossoverDesigner`, feeding directly into `crossoverResults.allComponents`, total BOM cost, impedance curves, and the 3D/2D PCB workspace.
  - *Why*: Turns static textbook formulas from the Electronics Blueprint into real schematic components that populate the PCB layout and bill of materials.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ResonanceCAD Root State (App)                         │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌──────────────┐ │
│  │   CabinetDimensions     │  │   AcousticParameters     │  │ CustomDriver │ │
│  │ + aluminum_6061 spec    │  │ + diffuserConfig UI      │  │ Store (Local │ │
│  │ + bandpassFront/Rear Vb │  │ + conjugate network flags│  │ Storage +    │ │
│  │ + structural rigging    │  │ + 3-way midPass controls │  │ 3-way slots) │ │
│  └───────────┬─────────────┘  └────────────┬─────────────┘  └──────┬───────┘ │
└──────────────┼─────────────────────────────┼───────────────────────┼─────────┘
               ▼                             ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Master Acoustic, Mechanical & Crossover Engines              │
│  • 10-Point autoOptimizePlan (Clashes, Port, Vb/Fb, Fill, Diffraction,       │
│    Driver Match, 3D Wall Compliance, SpeakON NL8/Clash, Standing Wave)       │
│  • Procedural Diffuser Synthesis (QRD 1D / Skyline 2D well depth matrices)   │
│  • 3-Way Passive + Active FIR Tap Generator (Woofer, Midrange, Tweeter)      │
│  • Dynamic Baffle Step (externalWidthMm) + Active Conjugate BOM Builder      │
└──────────────┬─────────────────────────────┬───────────────────────┬─────────┘
               ▼                             ▼                       ▼
┌────────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────┐
│   1. Design Workspace      │ │  2. Simulate Workspace    │ │ 3. Fabricate    │
│ • 3-Alignment Selector     │ │ • Full 3-Way Crossover &  │ │ • 2D CNC Sheet  │
│   (Ported/Sealed/Bandpass4)│ │   Toggleable Conjugates   │ │   Nesting View  │
│ • QRD/Skyline Diffuser Card│ │ • 3-Ch FIR .TXT/.WAV/.JSON│ │ • Dogbone DXF/  │
│ • Unified Rigging Optimizer│ │ • Multi-Role .ZMA Import  │ │   SVG Toolpaths │
└────────────────────────────┘ └───────────────────────────┘ └─────────────────┘
```

### Phased Execution Roadmap
1. **Phase 1 — Master `Auto-Optimize` Expansion & Bug Resolution**:
   - Add `aluminum_6061` to `MaterialType` and `MATERIAL_SPECS`.
   - Expand `autoOptimizePlan` to cover all 10 engineering advisories (adding Baffle Edge Diffraction radius, Driver Compatibility auto-pairing, 3D Filament Wall Compliance, SpeakON NL4/NL8 capacity & depth clash, and Standing Wave mitigation).
   - Consolidate the local auto-fix buttons in `StructuralRiggingModal` into a single unified modal optimize action and wire `onApplyRiggingSettings` properly.
   - Clean up unused `isCutListModalOpen` and `isCrossoverModalOpen` state variables.
2. **Phase 2 — Unwired Acoustic & Enclosure Features (`bandpass4` & `ProceduralDiffuserConfig`)**:
   - Add `4th-Order Bandpass` to the alignment selectors in the Property Inspector, Control Dock, and Transducer Sizing Modal, exposing front/rear chamber volume controls (`bandpassFrontVbLiters`, `bandpassRearVbLiters`).
   - Add the **Procedural Internal Diffuser** configuration card (`QRD 1D` vs `Skyline 2D`, prime $N$, design frequency, target walls, and well depth visualization) to the Master Control Dock.
3. **Phase 3 — Passive Crossover Blueprint & 3-Way FIR Completion**:
   - Replace the hardcoded `330 mm` baffle width in the Baffle Step Compensation calculation with live `dimensions.externalWidthMm`.
   - Make Zobel, Motional $F_s$ Notch Tank, Baffle Step Shelf, and CD Horn HF Bypass toggleable into the active component BOM and PCB workspace.
   - Add the 3-Way Midrange Bandpass filter card (`midPassOrder`, `midPassType`, midrange L-Pad) and 3-channel midrange FIR tap export (`midrangeTaps`).
4. **Phase 4 — Multi-Role Custom Transducers & CNC Sheet Nesting**:
   - Upgrade the Custom Driver & `.ZMA` Upload modal to target `woofer`, `midrange`, or `tweeter` slots with `localStorage` persistence.
   - Add a 2D CNC sheet-stock nesting visualization and dogbone corner relief geometry in the Cut-List and CAD Export pipelines.
