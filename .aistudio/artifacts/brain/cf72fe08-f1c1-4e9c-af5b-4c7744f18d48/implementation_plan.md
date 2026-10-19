# Multi-Driver Enclosure Support & Passive Crossover Network Designer

This architectural blueprint outlines the expansion of ResonanceCAD to support multi-driver loudspeaker configurations (2-Way, 3-Way, and MTM / D'Appolito vertical driver stacks) alongside a complete passive crossover network calculation engine (1st to 4th order Linkwitz-Riley and Butterworth filters with L-Pad attenuation), accompanied by real-time 3D procedural baffle cutouts and multi-component crossover PCB visualization.

## User Review & Critical Decisions

> [!IMPORTANT] 
> Based on your Phase 1 selections, the system architecture and 3D modeling pipelines will be configured with the following confirmed choices:

- **Confirmed Decision 1: Driver Configuration Layout**: MTM (Midwoofer-Tweeter-Midwoofer / D'Appolito) and 2-Way / 3-Way Vertical Driver Stacks with independent driver assignment, mounting rebates, and acoustic volume sharing.
- **Confirmed Decision 2: Crossover Calculation Engine**: Comprehensive Passive Crossover Network Designer calculating component values for 1st, 2nd, 3rd, and 4th Order Linkwitz-Riley and Butterworth high-pass, low-pass, and band-pass filters, including impedance compensation (Zobel networks) and L-Pad resistor attenuators.
- **Confirmed Decision 3: 3D Visualization & PCB CAD**: Real-time 3D procedural baffle rendering with stacked multi-driver rebates and through-holes, combined with a detailed rear crossover PCB featuring 3D copper inductors, film capacitors, ceramic resistors, and binding posts.

---

## 1. Overview & Core Concept

**ResonanceCAD Expansion** transforms the single-driver enclosure designer into a multi-transducer loudspeaker workstation. Users can configure 2-Way (Tweeter + Woofer), 3-Way (Tweeter + Midrange + Woofer), and MTM (D'Appolito) driver arrangements, assign specific driver models or custom T/S parameters to each band, and automatically calculate precise passive crossover filter networks.

### Key Capabilities
- **Multi-Driver Baffle Stacks**: Dynamic vertical baffle layout positioning Tweeter, Midrange, and Dual Woofers with center-to-center acoustic spacing calculations to prevent lobing.
- **Passive Crossover Designer**: Full filter math for Butterworth and Linkwitz-Riley alignments ($6\text{ dB/oct}$ up to $24\text{ dB/oct}$) generating exact inductor ($m\text{H}$), capacitor ($\mu\text{F}$), and resistor ($\Omega$) values, complete with interactive schematic diagrams and total system frequency response sum.
- **3D Procedural Baffle & Crossover PCB**: Real-time Three.js geometry generating multi-hole front baffles, individual driver motors, and an expanded crossover PCB on the rear panel reflecting the exact calculated filter components.

---

## 2. User Experience & Visual Design

### User Flow
1. **System Topology Selection**: The user selects the speaker configuration (2-Way, 3-Way, MTM, or Single Driver) in the "Acoustics & Alignment" tab.
2. **Driver Assignment**: Individual drivers are chosen for each passband (e.g. Scan-Speak Tweeter + Dual Dayton Audio Woofers).
3. **Crossover Design Tab**: A dedicated Crossover Network tab allows configuring crossover frequencies ($f_{c1}$, $f_{c2}$), filter slope orders (1st, 2nd, 3rd, 4th order), alignment type (Linkwitz-Riley vs Butterworth), and driver attenuation (L-Pad dB offset).
4. **3D Interactive CAD**: The central 3D viewport immediately updates to show stacked driver cutouts, aligned motor structures, and a populated crossover PCB on the rear panel.
5. **Combined SPL Response**: The frequency response chart displays individual passband transfer functions (Tweeter high-pass, Midrange band-pass, Woofer low-pass) and the phase-aligned total acoustic sum.

### Visual Identity
- **Dark Studio Monitor Aesthetic**: Deep matte slate canvas (`#0c0e12`), titanium borders (`#1e2430`), phosphor amber and cyan measurement accents (`#38bdf8`, `#f59e0b`, `#10b981`).
- **Tabular & Telemetry Precision**: Monospace metrics (`tabular-nums`) displaying crossover component values, DC resistance, component wattage ratings, and driver center-to-center distances.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Acoustic Volume Sharing vs Internal Sub-Chambers**
  - *Approach*: Midrange drivers are automatically assigned an isolated internal cylindrical rear enclosure or sealed sub-box volume, while woofers share the primary cabinet volume ($V_b$).
  - *Why*: Prevents woofer back-wave pressure modulation from distorting delicate midrange diaphragms.
- **Decision 2: Crossover Transfer Function Summation**
  - *Approach*: Calculates complex vector sum of individual driver high-pass and low-pass acoustic/electrical transfer functions, accounting for phase reversals in 2nd order Butterworth filters ($180^\circ$ phase shift).
  - *Why*: Accurately predicts crossover notch or dip near the crossover frequency.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESONANCE CAD ENGINE                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────┐   ┌───────────────────────────────────────┐  │
│  │  SYSTEM TOPOLOGY     │   │  ACOUSTIC & CROSSOVER ENGINE          │  │
│  │  • Single / MTM      │──►│  • Combined Vb / Port Calculations    │  │
│  │  • 2-Way / 3-Way     │   │  • Passive Crossover Filter Formulas  │  │
│  └──────────────────────┘   │  • L-Pad & Zobel Network Math         │  │
│                             └───────────────────┬───────────────────┘  │
│                                                 │                      │
│                                                 ▼                      │
│                             ┌───────────────────────────────────────┐  │
│                             │  MECHANICAL & CUT LIST GENERATOR      │  │
│                             │  • Multi-Hole Baffle Geometry         │  │
│                             │  • Midrange Sealed Sub-Chamber        │  │
│                             │  • Crossover PCB Component List       │  │
│                             └───────────────────┬───────────────────┘  │
│                                                 │                      │
│                                                 ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  INTERACTIVE 3D CAD VIEWPORT & INSPECTOR (THREE.JS)               │  │
│  │  • Multi-Driver Baffle Cutouts & Chamfers                        │  │
│  │  • Staggered Motor Structures & Basket Legs                      │  │
│  │  • Populated FR4 PCB with Inductors, Capacitors & Resistors      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Additions

```typescript
export type SystemTopology = 'single' | 'two_way' | 'three_way' | 'mtm';

export type FilterType = 'butterworth' | 'linkwitz_riley';
export type FilterOrder = 1 | 2 | 3 | 4; // 6, 12, 18, 24 dB/oct

export interface DriverAssignment {
  role: 'tweeter' | 'midrange' | 'woofer';
  driver: DriverPreset;
  quantity: number;
  impedanceOhm: number;
  splSensitivityDb: number;
  attenuationDb: number; // L-Pad setting
}

export interface CrossoverBandConfig {
  crossoverFreqHz: number;
  filterOrder: FilterOrder;
  filterType: FilterType;
  hasZobelNetwork: boolean;
  hasLPad: boolean;
}

export interface CrossoverNetworkResult {
  lowPassComponents: { name: string; type: 'inductor' | 'capacitor'; value: number; unit: string }[];
  highPassComponents: { name: string; type: 'inductor' | 'capacitor'; value: number; unit: string }[];
  bandPassComponents?: { name: string; type: 'inductor' | 'capacitor'; value: number; unit: string }[];
  lpadResistors?: { rSeriesOhm: number; rParallelOhm: number };
  zobelNetwork?: { rZobelOhm: number; cZobelUf: number };
  schematicSVG: string;
}
```

---

## 5. Execution Steps

1. **Type Definitions**: Update `loudspeaker.ts` with multi-driver topology, crossover configuration, and filter calculation result interfaces.
2. **Crossover Calculation Service (`/src/services/crossoverEngine.ts`)**: Implement exact Linkwitz-Riley ($Q=0.5$) and Butterworth ($Q=0.707$) equations for 1st through 4th order networks, L-Pad attenuation math, Zobel impedance equalization ($R_z = 1.25 \times R_e$, $C_z = L_{ev} / R_z^2$), and individual passband SPL summation.
3. **Multi-Driver Baffle & Procedural 3D Geometry**: Update `AcousticCADViewer.tsx` to generate multi-hole extruded front baffles (e.g. MTM layout or 3-Way stack), render multiple driver assemblies with proportional scale, and construct a populated crossover PCB on the rear panel with 3D copper coil cylinders, capacitor blocks, and ceramic resistor bricks.
4. **UI Expansion**: Update `ControlDock.tsx` with a dedicated "Crossover Network Designer" tab, driver assignment controls per passband, and interactive schematic view.
5. **Cut List & Workshop Spec Updates**: Expand `cutlistGenerator.ts` to include multi-driver cutout rebates, midrange enclosure dividers, and crossover bill of materials.
6. **Verification & Testing**: Execute `node --test` unit tests, compile applet, and verify 3D multi-driver rendering via Playwright browser inspection.
