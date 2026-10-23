# Advanced Acoustic Simulation, Port Aerodynamics & Material Cost Calculator

This architectural blueprint outlines the integration of a live acoustic simulation module displaying amplitude vs. frequency curves alongside the 3D CAD viewport, an advanced aerodynamic port engine supporting slot ports and flared aeroports with chuffing prevention, and a custom material density and unit cost calculator for enclosure budgeting.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your Phase 1 selections, the acoustic and economic simulation systems will be configured with the following confirmed parameters:

- **Confirmed Decision 1: Port Turbulence & Chuffing Threshold**: Standard Pro Audio threshold ($v_p < 17\text{ m/s}$) with automated flare radius calculation ($r_f$) and minimum port area recommendation based on driver volume displacement ($V_d = S_d \times X_{\text{max}}$) and tuning frequency ($F_b$).
- **Confirmed Decision 2: Material Cost & Weight Calculation**: User-configurable material density ($\text{kg/m}^3$) and cost per unit area ($\text{\$/m}^2$ and $\text{\$/sq.ft}$), factoring in an optional shop cutting waste percentage (e.g. 10–20% kerf and trim allowance).
- **Confirmed Decision 3: Live Simulation Display**: A dedicated, dockable Acoustic Simulation Panel situated directly alongside the 3D CAD viewport, enabling real-time curve recalculation as enclosure parameters, port dimensions, or materials are adjusted.

---

## 1. Overview & Core Concept

This feature set extends ResonanceCAD from a design tool into an engineering and fabrication workstation:
1. **Interactive Acoustic Simulation Module**: Computes and renders high-resolution Amplitude vs. Frequency (SPL transfer function in dB), Cone Excursion (mm), and Port Air Velocity (m/s) in an interactive split-view panel beside the 3D CAD model.
2. **Advanced Aerodynamic Port Engine**:
   - **Flared Aeroports**: Computes physical tube length accounting for bellmouth flare end-correction:
     $$\Delta L = 2 \times 0.732 \cdot r_0 \times \left(1 + 0.6 \cdot \frac{r_f}{r_0}\right)$$
   - **Slot Ports**: Handles custom slot width ($W_s$) and height ($H_s$), computing equivalent hydraulic diameter ($D_h$) and friction boundary layer effects.
   - **Turbulence Prevention**: Real-time evaluation of Reynolds number and peak air velocity at user-defined input power:
     $$v_p = \frac{2\pi \cdot F_b \cdot V_d}{A_{\text{port}}}$$
3. **Custom Material Density & Cost Estimator**:
   - Allows users to define or override the density ($\text{kg/m}^3$) and unit cost ($\text{\$/m}^2$) for Baltic Birch, MDF, Marine Ply, or custom composites.
   - Computes total board surface area, gross board area with waste factor, estimated dry enclosure mass, and estimated fabrication raw material cost ($).
4. **3D Airflow Interference & Proximity Stress Overlay**:
   - Visualizes acoustic and fluid-dynamic proximity stress in the 3D CAD viewer when ports are placed near driver magnets or window matrix bracing.
   - Employs a continuous **red-to-yellow gradient** ($d \le 18\text{mm}$: Critical Choke / Red, $18-45\text{mm}$: Boundary Drag / Orange, $45-75\text{mm}$: Proximity Alert / Yellow, $> 75\text{mm}$: Laminar Safe).
   - Generates a parametric 3D volumetric intake envelope mesh with vertex-colored stress gradients, concentric isobar rings, and obstacle halo rings around driver magnets and window bracing struts.
   - Features a floating HUD legend in the 3D viewport with an on/off toggle and real-time clearance telemetry.

---

## 2. User Experience & Visual Design

### User Flow
1. **Side-by-Side Acoustic Simulation**: The user can toggle a "Live Simulation" side panel on the right side of the 3D CAD viewport. Dragging cabinet dimensions or tuning frequency immediately recalculates the SPL curve, F3 cutoff point, and air velocity trace.
2. **Port Aerodynamics Tuning**: In the "Acoustics & Alignment" dock tab, users switch between "Flared Round Tube" and "Slot Port (Floor/Shelf)". Sliders allow adjusting flare radius ($r_f$) or slot dimensions ($W_s \times H_s$), with a live indicator showing air velocity and laminar/turbulent status.
3. **Material & Cost Customizer**: In the "Cabinet & Wood" dock tab, an interactive material spec card displays density ($\text{kg/m}^3$), unit cost ($\text{\$/m}^2$), and a waste factor slider. Live totals appear in the top telemetry bar: Cabinet Mass ($\text{kg} / \text{lbs}$) and Material Cost ($\text{\$USD}$).

### Visual Identity
- **Matte Dark Studio Palette**: Slate canvas (`#0c0e12`), cyan measurement traces (`#38bdf8`), amber cutoff indicators (`#f59e0b`), and emerald safe velocity indicators (`#10b981`).
- **Tabular Precision**: Monospace figures with units for air velocity ($m/s$), Reynolds index, sheet square footage, and currency.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dockable Side-by-Side Panel vs Modal Popup**
  - *Approach*: Implement a collapsible split-screen simulation panel that slides in from the right edge of the 3D viewport, while keeping the full-screen modal available for detailed inspection.
  - *Why*: Allows simultaneous visual inspection of 3D geometry changes and acoustic frequency response curves.
- **Decision 2: Flared Port Acoustic End-Correction**
  - *Approach*: Apply the Small-Margolis acoustic flare formula, which shortens the physical tube length as flare radius increases to maintain exact target $F_b$.
  - *Why*: Prevents real-world enclosures from tuning lower than intended due to unmodeled flare termination mass.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESONANCE CAD ENGINE                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐   ┌───────────────────────────────────────┐  │
│  │ MATERIAL & COST SPEC │   │ ACOUSTIC AERODYNAMICS ENGINE          │  │
│  │ • Density (kg/m³)    │──►│ • Net Vb & Helmholtz Tuning Fb        │  │
│  │ • Unit Cost ($/m²)   │   │ • Flared Aeroport End-Correction      │  │
│  │ • Waste Factor (%)   │   │ • Slot Port Hydraulic Area (Dh)       │  │
│  └──────────────────────┘   │ • Air Velocity & Chuffing Diagnostic  │  │
│                             └───────────────────┬───────────────────┘  │
│                                                 │                      │
│                                                 ▼                      │
│                             ┌───────────────────────────────────────┐  │
│                             │ LIVE ACOUSTIC SIMULATION MODULE       │  │
│                             │ • Multi-Curve SPL Graph (10Hz-20kHz)  │  │
│                             │ • Cone Excursion & Group Delay        │  │
│                             │ • Real-time Peak Air Velocity Curve   │  │
│                             └───────────────────┬───────────────────┘  │
│                                                 │                      │
│                                                 ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SPLIT WORKBENCH VIEWPORT                                         │  │
│  │ • Left: Procedural 3D CAD with Flared Port & Multi-Drivers       │  │
│  │ • Right: Docked Live Acoustic Simulation Graph Panel             │  │
│  │ • Top: Live Telemetry (Net Vb, Fb, F3, Air Vel, Mass, Cost $)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Updates (`src/types/loudspeaker.ts`)

```typescript
export interface MaterialPricingConfig {
  costPerSquareMeter: number; // in $/m²
  wastePercentage: number; // cutting loss, e.g. 15%
}

export interface FlaredPortConfig {
  flareRadiusMm: number; // bellmouth flare radius (typically 12-25mm)
  isDoubleFlared: boolean; // flare at both ends vs exit only
}

export interface MaterialCostResult {
  netSurfaceAreaM2: number;
  grossSurfaceAreaM2: number; // with waste factor
  totalCostUsd: number;
  totalDryWeightKg: number;
}
```

---

## 5. Execution Steps

1. **Type & Data Model Updates**: Add `MaterialPricingConfig`, `FlaredPortConfig`, and `MaterialCostResult` to `src/types/loudspeaker.ts`.
2. **Acoustic & Aerodynamic Engine Expansion (`src/services/acousticEngine.ts`)**:
   - Implement flared port end-correction math and slot port hydraulic diameter formulas.
   - Calculate port air velocity curve vs. frequency.
   - Calculate material cost and weight with user-defined density and unit pricing.
3. **Live Acoustic Simulation Panel (`src/components/LiveSimulationPanel.tsx`)**:
   - Create a dockable side panel beside the 3D viewport displaying real-time SPL amplitude vs. frequency, F3 cutoff marker, and air velocity threshold bar.
4. **3D Port Geometry Update (`src/components/AcousticCADViewer.tsx`)**:
   - Procedurally render flared bellmouth rims matching user-selected flare radius ($r_f$) and slot port entry/exit flares.
5. **UI & Control Dock Integration (`src/components/ControlDock.tsx`, `src/components/TopHeader.tsx`, `src/App.tsx`)**:
   - Add density and unit cost sliders/inputs to the Cabinet & Wood tab.
   - Add total cost indicator to the top telemetry header.
   - Add toggle button for the side-by-side Live Simulation panel.
6. **Testing & Verification**:
   - Update unit test suite in `src/services/acousticEngine.test.ts` to test flare end-correction, slot air velocity, and material cost formulas.
   - Verify with `compile_applet`, `lint_applet`, and visual browser captures via Playwright.
