# Closed-Loop Multiphysics Co-Optimization & Reference Caliber Engine

Every feature toggle, hardware addition, or dimensional adjustment in ResonanceCAD will automatically preserve and elevate the loudspeaker's acoustic, thermal, structural, and electro-mechanical performance through a **Live Closed-Loop Co-Optimization Engine** paired with a real-time **Reference Caliber Score (0–100)** and per-change quality delta telemetry.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions incorporate your confirmed selections and define how every parameter change will actively enhance overall speaker quality.

- **Confirmed Decision 1 — Enforcement Mode**: **Live Closed-Loop Co-Optimization with Lockable Manual Overrides**. Whenever a user toggles a feature (e.g., Rear Thermal Vents, Plate Amplifier, Sub-Enclosures, TPMS Gyroid Matrix, Bracing, or Driver Selection) or adjusts an unlocked dimension, coupled parameters automatically co-adjust in real time to maintain peak acoustic performance. Users can lock any individual subsystem (`Volume/Depth Lock`, `Tuning Fb Lock`, `Port Geometry Lock`, `Crossover Lock`, `Thermal Lock`) when they intentionally want to inspect an uncompensated manual override.
- **Confirmed Decision 2 — Coupled Multiphysics Subsystems**: All four core multiphysics feedback loops will actively co-adjust:
  1. **Iso-Volume & Tuning Compensation**: Adding or removing internal displacements (Rear Thermal Heat-Exchanger, Plate Amp, Window/TPMS Bracing, Sub-Chambers, QRD Diffuser) automatically adjusts cabinet internal depth (within aspect-ratio guardrails) and/or port length so net acoustic volume ($V_b$) and Helmholtz tuning ($F_b$) never drift from the optimal Thiele-Small alignment.
  2. **Thermal Compression & Rear Vent Auto-Scaling**: When driver continuous power ($P_e$) or enclosure thermal impedance causes steady-state Klippel power compression to exceed $1.0\text{ dB}$, the engine automatically enables and scales the **Rear Thermal Ventilation Slots & Finned Heat-Exchanger** to maximize linear dynamic headroom.
  3. **Structural Eigenmode & Aerodynamic Brace Co-Optimization**: Changing cabinet dimensions, driver mass, or crossover frequency automatically upgrades bracing level, wall thickness, and Karal-Fok brace aperture bevels until the fundamental panel resonance $f_{11}$ clears the $2.0 \times f_{\text{xo}}$ vibro-acoustic threshold.
  4. **Electro-Acoustic Crossover, Zobel & Baffle-Step Synchronization**: Changing cabinet width ($W_{\text{ext}}$) or transducer selection automatically recalculates the Olson baffle-step diffraction knee ($f_{\text{baffle}} = 115 / W_{\text{ext}}$), Linkwitz-Riley crossover handoff ($f_{\text{xo}}$), HF/MF attenuation pads, and Wright/Thorborg Zobel conjugate impedance values.
- **Confirmed Decision 3 — Quality Telemetry & Delta Feedback**: **Real-Time Reference Caliber Score (0–100)** with live **Before / After Quality Delta Badges** (`+4.2 Caliber · -0.6 dB Thermal Compression · +0.0 L Vb Drift`) displayed across the workspace toolbar, Telemetry Inspector, and interactive adjustment notifications.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms ResonanceCAD from a passive calculator—where adding hardware or changing drivers can inadvertently detune the enclosure or induce port chuffing—into a self-balancing **Master Acoustic Synthesis Workstation**. Every manipulation triggers a deterministic multiphysics solver that co-optimizes dependent parameters and quantifies the exact net quality improvement on a 0–100 Reference Caliber scale.
- **Target Audience / Persona**: Loudspeaker engineers, studio monitor designers, pro-audio touring system architects, and custom cabinet fabricators who demand zero-compromise acoustic accuracy and manufacture-ready CAD geometry on every edit.
- **Key Value**: Eliminates hidden acoustic degradation when iterating on designs. Users can freely experiment with drivers, internal bracing, thermal vents, and hardware knowing the cabinet continuously re-balances volume, port Mach velocity, structural eigenmodes, thermal dissipation, and crossover phase alignment.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Zero-State Baseline & Reference Caliber HUD**:
   - In the 3D CAD viewport HUD and Telemetry Inspector, a prominent **Reference Caliber Index (0–100)** displays the speaker's composite grade (e.g., `96.4 / 100 · Master Reference Grade`) alongside its six physics sub-scores:
     - **Thiele-Small Alignment Fidelity** ($V_b / F_b / Q_{tc}$ exactness)
     - **Aero-Acoustic Laminar Margin** (Port Mach $< 0.05$, flaring & Karal-Fok bevel relief)
     - **Klippel Thermal Headroom** (Voice-coil $\Delta T_v$ & power compression $< 1.0\text{ dB}$)
     - **Vibro-Acoustic Structural Inertness** (Rayleigh-Ritz $f_{11} \ge 2.0 \times f_{\text{xo}}$)
     - **Wavefront & Modal Purity** (Baffle edge diffraction $r_{\text{edge}} \ge \lambda/8$ & JCA internal standing-wave damping)
     - **Electro-Acoustic Phase & Impedance Linearity** (Linkwitz-Riley acoustic sum & Zobel conjugation)
2. **Closed-Loop Manipulation Flow**:
   - When the user makes any change—for example, switching to a $1000\text{ W}$ touring woofer or toggling **Rear Thermal Ventilation Slots**—the **Closed-Loop Co-Optimizer** intercepts the state transition:
     - Computes the exact internal volume displacement delta ($\Delta V_{\text{disp}}$) from the new magnet structure, thermal collector, or bracing.
     - Automatically adjusts enclosure depth (unless `Depth Lock` is active) to hold optimal $V_b$, resizes the port aperture to keep air velocity laminar below category Mach limits, enables/scales rear thermal ventilation slots if power compression exceeds $1.0\text{ dB}$, and synchronizes crossover/baffle-step compensation.
3. **Before / After Quality Delta Banner**:
   - Immediately upon any manipulation, a non-intrusive HUD delta summary surfaces the exact engineering actions taken and the resulting quality gain (e.g., `Caliber 91.2 → 96.8 (+5.6) · Depth +14mm to preserve 42.0L Vb · Rear Thermal Vents scaled to 8 slots (-0.58 dB compression)`).
4. **Parameter Lock Controls (Selective Manual Override)**:
   - Next to coupled parameter groups in the Right Property Inspector (Cabinet Dimensions, Port Tuning, Bracing, Thermal Vents, Crossover), clean lock toggle buttons (`Auto Co-Optimize` vs. `Locked`) allow engineers to pin specific physical constraints (such as fixed exterior dimensions for an existing rack/enclosure) while the remaining unlocked subsystems co-optimize around that constraint.

### Visual Identity & Theme

- **Aesthetic Direction**: High-precision electro-acoustic laboratory instrument—dark obsidian canvas (`#07090e`), slate structural surfaces (`#0b0f17`), crisp hairline dividers (`border-slate-800/90`), and high-contrast tabular telemetry (`font-mono tabular-nums`).
- **Color Palette & Semantic Encoding**:
  - **60% Dominant Canvas**: Deep obsidian `#07090e` and dark graphite `#0b0f17` panels that keep the 3D WebGL loudspeaker assembly as the undisputed visual anchor.
  - **30% Structural Surfaces**: Subdued slate containers (`bg-slate-900/70`) with clean unboxed metadata separated by typographic middots (`·`).
  - **10% Accent & Telemetry Budget**:
    - Cyan (`#06B6D4`) for active acoustic alignment and laminar airflow metrics
    - Emerald (`#10B981`) for positive Reference Caliber deltas and verified thresholds
    - Amber (`#F59E0B`) for thermal load and manual override locks
    - Rose (`#F43F5E`) paired with explicit text labels for physical boundary violations when manual locks prevent full compensation
- **Typography & Tabular Discipline**:
  - Clean sans-serif structural hierarchy paired with strict monospace tabular numerals (`font-mono tabular-nums`) for all decibel, Hertz, millimeter, liter, and 0–100 Caliber score readouts so real-time slider scrubbing never causes horizontal layout jitter.
- **Interactive Feedback & Motion**:
  - Instant ($\le 150\text{ms}$) compositor-safe transitions on Caliber score gauges and delta readouts; zero arrival popups or decorative status dots.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Synchronous Intercept Co-Optimization vs. Post-Render Reactive Effects**
  - *Chosen Approach*: Execute the Closed-Loop Co-Optimization solver **synchronously inside the state update pipeline** before committing `dimensions` and `acoustics` to React state.
  - *Why*: Eliminates double-renders, prevents transient 3D geometry clashes in the Three.js viewport, and allows exact calculation of the **Before vs. After Reference Caliber Delta** in a single deterministic pass.
  - *Alternatives Considered*: Running `useEffect` hooks after state changes, which causes visible 3D mesh jumping and race conditions between coupled subsystems.

- **Decision 2: Depth-First Iso-Volume Compensation with Aspect-Ratio Fallback**
  - *Chosen Approach*: When internal hardware, bracing, or driver displacement changes ($\Delta V_{\text{disp}}$), compensate internal enclosure depth ($D_{\text{ext}}$) first while preserving front baffle width ($W_{\text{ext}}$) and height ($H_{\text{ext}}$) up to the Golden Ratio depth ceiling; only adjust height/width if depth reaches its mechanical limit.
  - *Why*: Front baffle width directly governs the Olson baffle-step diffraction frequency ($f_{\text{baffle}}$) and driver layout clearances. Preserving baffle width during internal hardware changes keeps horizontal dispersion and baffle aesthetics stable.
  - *Alternatives Considered*: Uniformly scaling $W, H, D$ on every hardware toggle, which would constantly shift driver positions and baffle-step frequencies.

- **Decision 3: Physics-Weighted Reference Caliber Score (0–100) Without Arbitrary Vanity Numbers**
  - *Chosen Approach*: Compute the 0–100 Reference Caliber Score directly from six normalized physical error functions (Thiele-Small $V_b/F_b$ deviation, Port Mach ratio $M / M_{\text{crit}}$, Klippel power compression $L_{\text{comp}}$, Rayleigh-Ritz modal margin $f_{11} / 2f_{\text{xo}}$, Standing-Wave QRD/JCA absorption coefficient, and Crossover/Zobel impedance flatness).
  - *Why*: Grounds the quality score in verifiable acoustic engineering equations so every point gained or lost corresponds to a measurable physical improvement (e.g., $+1.2\text{ dB}$ SPL headroom or $-0.4\text{ dB}$ passband ripple).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         USER MANIPULATION / FEATURE TOGGLE                        │
│  (Driver Swap, Rear Thermal Vents, Bracing, Port Profile, Dimensions, Hardware)   │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                CLOSED-LOOP MULTIPHYSICS CO-OPTIMIZER ENGINE                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │ 1. Baseline Snapshot │─▶│ 2. Coupled Subsystem │─▶│ 3. 3D Clash & Boundary  │  │
│  │    (Pre-Edit Caliber │  │    Co-Adjustment     │  │    Verification         │  │
│  │     & Vb/Fb Target)  │  │    (Respects Locks)  │  │    (Baffle + Rear Panel)│  │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────────────┘  │
│                                         │                                         │
│     ┌───────────────────────────────────┼───────────────────────────────────┐     │
│     ▼                                   ▼                                   ▼     │
│  ┌─────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────┐  │
│  │ Iso-Volume & Port   │   │ Thermal & Vibro-Acoustic│   │ Crossover, Zobel &  │  │
│  │ Mach Stabilizer     │   │ Auto-Scaler             │   │ Baffle-Step Sync    │  │
│  │ • Compensates ΔVdisp│   │ • Enables Rear Vents if │   │ • Updates f_xo,     │  │
│  │   via Depth / Port  │   │   Klippel Comp > 1.0 dB │   │   L-pad attenuation │  │
│  │ • Keeps Mach < Crit │   │ • Upgrades Brace f11    │   │   & Zobel C_z / R_z │  │
│  └─────────────────────┘   └─────────────────────────┘   └─────────────────────┘  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                  REFERENCE CALIBER EVALUATOR (0–100) & DELTA DIFF                 │
│  • Computes 6 Sub-Scores + Composite Reference Caliber Grade                      │
│  • Emits Before → After Delta Record (ΔScore, ΔCompression, ΔVelocity, Actions)   │
└──────────────────┬──────────────────────┴──────────────────────┬──────────────────┘
                   ▼                                             ▼
┌─────────────────────────────────────────┐   ┌─────────────────────────────────────┐
│       3D CAD VIEWPORT & HUD OVERLAY     │   │    RIGHT PROPERTY INSPECTOR & DOCK  │
│  • Live Reference Caliber Badge (0-100) │   │  • 6-Axis Caliber Breakdown Card    │
│  • Real-Time Delta Toast & Action Strip │   │  • Per-Subsystem Co-Optimize Locks  │
│  • Clash-Free 3D Geometry Rebuild       │   │  • Coupled Parameter Change Badges  │
└─────────────────────────────────────────┘   └─────────────────────────────────────┘
```

### Data Model & State Strategy

1. **Co-Optimization Lock & Policy State (`CoOptimizationConfig`)**:
   - `enabled: boolean` (default `true` — Live Closed-Loop Co-Optimization active)
   - `lockCabinetDimensions: boolean` (when `true`, prevents automatic external dimension compensation and instead re-tunes port/damping within fixed exterior bounds)
   - `lockPortGeometry: boolean` (when `true`, preserves manual port aperture dimensions)
   - `lockThermalVents: boolean` (when `true`, respects manual rear thermal slot toggle/sizing even if compression $> 1.0\text{ dB}$)
   - `lockStructuralBracing: boolean` (when `true`, preserves manual bracing level and wall thickness)
   - `lockCrossoverNetwork: boolean` (when `true`, preserves manual crossover frequency and pad settings)
2. **Reference Caliber Report (`SpeakerCaliberReport`)**:
   - `overallScore: number` (`0` to `100`, 1 decimal precision)
   - `gradeLabel: 'Master Reference' | 'Studio Precision' | 'Production Grade' | 'Sub-Optimal'`
   - `subScores`:
     - `alignmentScore: number` (0–100: $V_b$ and $F_b / Q_{tc}$ match to optimal Thiele-Small alignment)
     - `aeroPortScore: number` (0–100: Port Mach number vs. category limit, flare geometry, Karal-Fok brace chamfer relief)
     - `thermalHeadroomScore: number` (0–100: Voice-coil steady-state $\Delta T_v$, thermal power compression $< 1.0\text{ dB}$, rear thermal vent effectiveness)
     - `structuralModalScore: number` (0–100: Rayleigh-Ritz $f_{11} / f_{\text{xo}}$ ratio $\ge 2.0$, wall compliance safety)
     - `diffractionDampingScore: number` (0–100: Baffle edge radius $r_{\text{edge}} \ge \lambda/8$, internal standing-wave mitigation via JCA porous fill / QRD / TPMS)
     - `electroAcousticScore: number` (0–100: Crossover driver bandwidth safety, baffle-step alignment, Zobel impedance conjugation)
   - `activeImprovements: string[]` (concise human-readable list of active optimizations)
   - `limitingFactors: string[]` (specific physical bottlenecks if any subsystem is manually locked in a sub-optimal state)
3. **Manipulation Delta Telemetry (`CaliberDeltaEvent`)**:
   - `previousScore: number`
   - `currentScore: number`
   - `deltaScore: number`
   - `triggerDescription: string`
   - `coOptimizedActions: string[]` (e.g., `["Depth +12mm (Iso-Vb)", "Rear Vents 8x78mm (-0.6dB Comp)", "Bracing -> Heavy (f11 640Hz)"]`)

### Interactive Component & State Mapping

- **Centralized Mutation Wrapper in Root State**:
  - Every state setter passed to the 3D CAD Viewport, Right Property Inspector, Control Dock, Setup Wizard, and Transducer Sizing modal routes through a unified `applyCoOptimizedUpdate(nextDims, nextAcoustics, triggerSource)` handler.
  - When the user explicitly edits a specific subsystem (for example, dragging the `External Depth` slider directly), the solver treats that specific axis as the user's primary intent and co-optimizes the *remaining* unlocked subsystems (port tuning, bracing, crossover baffle-step, thermal relief) around it so the user's direct manipulation is never fought or reverted.
  - When the user toggles an internal feature or swaps a driver (where dimensional drift is an unintended side effect of internal displacement change $\Delta V_{\text{disp}}$), the solver automatically adjusts unlocked depth/port/thermal/bracing parameters to maintain peak Reference Caliber.
- **Complete Expanded `autoOptimizePlan` Parity**:
  - If a user temporarily locks subsystems or imports a legacy project with sub-optimal parameters, clicking **Auto-Optimize** executes all 8 multiphysics stages (Driver Match, Iso-Volume Golden Ratio Sizing, Laminar Port Sizing, Rear Thermal Vent Activation & Scaling, Rayleigh-Ritz Structural Bracing Upgrade, Baffle Diffraction Rounding, Standing-Wave QRD/JCA Mitigation, and Crossover/Baffle-Step Synchronization) to bring the design immediately to `Master Reference` caliber.
