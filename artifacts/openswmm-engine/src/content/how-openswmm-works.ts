export const markdownContent = `# How OpenSWMM Works

**A Technical Deep-Dive into the HydroCouple OpenSWMM Engine**
**Version 6.0.0-alpha.1 (swmm6_rel branch)**
**Source: [github.com/HydroCouple/openswmm.engine](https://github.com/HydroCouple/openswmm.engine/tree/swmm6_rel)**

---

## 1. What OpenSWMM Is

OpenSWMM is a community-driven fork of EPA SWMM 5.2.4, led by Caleb Buahin after his departure from EPA ORD in early 2025. The project sits on GitHub under the HydroCouple organization and targets an eventual SWMM 6.0 release. The \`swmm6_rel\` branch contains a complete restructuring of the SWMM codebase into two parallel engines:

1. **Legacy Engine** (\`src/legacy/engine/\`) — the original EPA SWMM 5.x C solver, preserved with minimal modification. This is the proven solver that has run millions of models worldwide since Lew Rossman wrote it.

2. **New Engine** (\`src/engine/\`, \`include/openswmm/engine/\`) — a C++20 rewrite with a transparent C API, data-oriented memory layout, reentrant architecture, and plugin-based I/O. This is the 6.0 engine.

Both compile from the same CMake project. The legacy engine produces \`openswmm_legacy_engine.dll/.so\`. The new engine produces \`openswmm_engine.dll/.so\`. Users choose which one to link against.

## 2. The Two-Engine Architecture

### 2.1 Why Keep the Legacy Engine?

Caleb made a practical decision: the EPA SWMM solver works. Thousands of calibrated models depend on its exact numerical behavior, warts and all. Breaking that would fracture the community.

So the legacy engine sits in \`src/legacy/engine/\` with its original \`.c\` files — \`dwflow.c\`, \`dynwave.c\`, \`flowrout.c\`, \`kinwave.c\`, all the Rossman code — compiled as a shared library with its original API (\`swmm_run\`, \`swmm_open\`, \`swmm_start\`, \`swmm_step\`, \`swmm_end\`, \`swmm_close\`). Of 75 shared source files between OpenSWMM and EPA 5.2.4, 25 are byte-for-byte identical. The rest carry Doxygen documentation, new constants, and the \`swmm5_stats.c\` extension.

The legacy engine owns the following C files (total ~55,700 lines):

| Module | Files | Lines | Purpose |
|--------|-------|-------|---------|
| Core Engine | \`swmm5.c\`, \`project.c\`, \`controls.c\` | ~4,700 | Main loop, project setup, control rules |
| Hydraulics | \`dwflow.c\`, \`dynwave.c\`, \`flowrout.c\`, \`kinwave.c\`, \`forcmain.c\`, \`routing.c\` | ~3,900 | Dynamic wave, kinematic wave, force main, flow routing |
| Cross-sections | \`xsect.c\`, \`shape.c\`, \`transect.c\`, \`culvert.c\`, \`roadway.c\` | ~4,400 | 20 conduit shapes, irregular transects, culvert equations, roadway overtopping |
| Hydrology | \`runoff.c\`, \`subcatch.c\`, \`infil.c\`, \`snow.c\`, \`gwater.c\`, \`climate.c\`, \`gage.c\`, \`rain.c\` | ~7,300 | Nonlinear reservoir runoff, Horton/Green-Ampt/CN infiltration, snowmelt, groundwater, evapotranspiration |
| Water Quality | \`qualrout.c\`, \`treatmnt.c\`, \`surfqual.c\`, \`landuse.c\`, \`massbal.c\` | ~3,300 | CSTR routing, treatment expressions, buildup/washoff, mass balance |
| LID/GI | \`lid.c\`, \`lidproc.c\`, \`exfil.c\` | ~3,900 | Green infrastructure: bio-retention, rain gardens, porous pavement, swales, rain barrels, green roofs |
| Inlets (5.2) | \`inlet.c\`, \`street.c\` | ~2,100 | HEC-22 street inlet capture |
| Network Objects | \`node.c\`, \`link.c\` | ~4,200 | Node/link property management, pump curves, weir/orifice/outlet equations |
| Data I/O | \`input.c\`, \`output.c\`, \`report.c\`, \`rdii.c\`, \`iface.c\`, \`hotstart.c\` | ~6,800 | .inp parsing, binary .out writing, report generation, RDII unit hydrographs |
| Support | \`datetime.c\`, \`mathexpr.c\`, \`odesolve.c\`, \`hash.c\`, \`table.c\`, \`toposort.c\`, \`findroot.c\` | ~2,900 | Date/time, math expressions, Cash-Karp RK5 ODE solver, hash tables, topological sort |
| Infrastructure | \`consts.h\`, \`enums.h\`, \`objects.h\`, \`globals.h\`, \`funcs.h\`, \`text.h\`, \`keywords.c\` | ~3,200 | Constants, enumerations, struct definitions, global variables, function prototypes |

### 2.2 What the Legacy Engine Changed

The diff against EPA 5.2.4 shows 11,232 lines added and 5,780 removed across the shared files. The changes fall into five categories:

**Doxygen documentation everywhere.** \`consts.h\` went from 102 to 305 lines — same constants, but now every \`#define\` has \`\\\\brief\`, \`\\\\details\`, and \`\\\\defgroup\` tags. \`enums.h\` jumped from 500 to 638 lines. \`funcs.h\` grew from 549 to 1,046 lines. This is the single largest source of diff volume.

**Reorganized error handling.** \`error.c\` was gutted from 223 to 49 lines. Error strings moved to \`error.txt\` and are loaded at runtime rather than compiled into the binary. The error codes in \`error.h\` were renumbered and extended.

**Version infrastructure.** \`consts.h\` replaced the hardcoded \`#define VERSION 52004\` with \`#include "version.h"\` and \`#define VERSION PROJECT_VERSION_SWMM_FORMAT\`, pulling version info from CMake. A \`version.h.in\` template generates version macros at build time, including git commit hash and build date.

**New statistics API.** \`swmm5_stats.c\` (255 lines) adds functions to extract per-element statistics and mass balance totals (\`SubcatchStats\`, \`NodeStats\`, \`LinkStats\`, \`StorageStats\`, \`OutfallStats\`, \`PumpStats\`, \`RunoffTotals\`, \`FlowTotals\`) after a simulation run. These were previously internal-only. The new API exposes them through extern linkage.

**Climate and controls enhancements.** \`climate.c\` gained 755 lines (51.7% change) and \`controls.c\` gained 878 lines (63.3% change) — the two largest functional diffs. These include extended evaporation models, better seasonal handling, and more expressive control rule parsing.

### 2.3 The New 6.0 Engine

The new engine lives in \`include/openswmm/engine/\` (18 public C headers, ~5,000 lines) and \`src/engine/\` (C++20 implementation). It wraps the legacy solver's computational core with a modern architecture.

Three design principles drive it:

**Reentrant.** EPA SWMM uses C global variables for everything — \`Node[]\`, \`Link[]\`, \`Subcatch[]\`, \`Nobjects[]\`, simulation clock, error state, file handles. A process can run exactly one simulation at a time. OpenSWMM 6.0 packs all state into an opaque \`SWMM_Engine\` handle (\`typedef void* SWMM_Engine\`). You can create multiple handles and run independent simulations concurrently in the same process. This is the single most important architectural change.

**Data-oriented.** The README describes a Structure of Arrays (SoA) refactoring for cache efficiency and SIMD-friendly computation. Instead of an array of \`TNode\` structs (each containing all properties for one node), the new engine stores arrays of each property across all nodes — \`invert_elev[N]\`, \`max_depth[N]\`, \`depth[N]\`, \`head[N]\`. When the solver iterates over all nodes to update depths, it reads from a contiguous \`depth[]\` array rather than striding through scattered struct members.

**Plugin-based I/O.** Output writing and report generation are abstracted through a plugin interface. Plugins receive read-only simulation snapshots on a dedicated I/O thread with double-buffered state. The \`DefaultOutputPlugin\` writes the standard SWMM binary \`.out\` format. Custom plugins can write HDF5, NetCDF, database backends, or real-time dashboards without modifying the engine.

## 3. The C API in Detail

OpenSWMM 6.0 exposes 322 C functions across 18 domain-specific headers. The API maintains a C89-compatible ABI at the boundary while the implementation uses C++20 internally. Every function takes an \`SWMM_Engine\` handle as its first argument.

### 3.1 Engine Lifecycle

The engine follows an explicit state machine:

\`\`\`
CREATED → OPENED → INITIALIZED → STARTED → [RUNNING] → ENDED → CLOSED
\`\`\`

For programmatic model building (no \`.inp\` file):

\`\`\`
[BUILDING] → INITIALIZED → STARTED → [RUNNING] → ENDED → CLOSED
\`\`\`

The lifecycle functions in \`openswmm_engine.h\`:

\`\`\`c
SWMM_Engine swmm_engine_create(void);     // allocate handle
int swmm_engine_open(e, inp, rpt, out);    // parse .inp file → OPENED
int swmm_engine_initialize(e);             // build solver arrays → INITIALIZED
int swmm_engine_start(e, save_flag);       // begin simulation → STARTED
int swmm_engine_step(e, &elapsed);         // advance one timestep → RUNNING
int swmm_engine_end(e);                    // finalize → ENDED
int swmm_engine_report(e);                 // write report
int swmm_engine_close(e);                  // release files → CLOSED
void swmm_engine_destroy(e);               // free handle
\`\`\`

For programmatic construction:

\`\`\`c
SWMM_Engine e = swmm_engine_new();         // → BUILDING state
swmm_node_add(e, "J1", SWMM_NODE_JUNCTION);
swmm_node_set_invert_elev(e, 0, 100.0);
swmm_node_set_max_depth(e, 0, 6.0);
swmm_link_add(e, "C1", SWMM_LINK_CONDUIT);
swmm_link_set_nodes(e, 0, 0, 1);          // upstream=J1, downstream=J2
swmm_link_set_xsect(e, 0, SWMM_XSECT_CIRCULAR, 2.0, 0, 0, 0);
swmm_finalize_model(e);                    // validate + build → INITIALIZED
\`\`\`

This is a substantial shift. EPA SWMM requires a \`.inp\` text file. PySWMM and the OWA toolkit API let you modify an existing model at runtime, but you cannot build one from scratch without writing an \`.inp\` file first. OpenSWMM 6.0 can construct an entire model in memory, validate it, and run it without touching the filesystem.

### 3.2 Error Handling

All functions return \`SWMM_ErrorCode\` integers. \`SWMM_OK\` (0) is success. Error codes cover 15 categories:

| Code | Name | Meaning |
|------|------|---------|
| 0 | \`SWMM_OK\` | Success |
| 1 | \`SWMM_ERR_NOMEM\` | Memory allocation failed |
| 2 | \`SWMM_ERR_INPFILE\` | Cannot open input file |
| 5 | \`SWMM_ERR_PARSE\` | Input file parse error |
| 6 | \`SWMM_ERR_LIFECYCLE\` | Function called in wrong state |
| 7 | \`SWMM_ERR_BADHANDLE\` | NULL or invalid engine handle |
| 8 | \`SWMM_ERR_BADINDEX\` | Object index out of range |
| 9 | \`SWMM_ERR_BADPARAM\` | Invalid parameter value |
| 10 | \`SWMM_ERR_PLUGIN\` | Plugin initialization or runtime error |
| 12 | \`SWMM_ERR_HOTSTART\` | Hot start file format or content error |
| 13 | \`SWMM_ERR_CRS\` | Coordinate reference system mismatch |
| 14 | \`SWMM_ERR_NUMERICAL\` | Numerical instability or divergence |
| 99 | \`SWMM_ERR_INTERNAL\` | Unrecoverable internal error |

You can retrieve the last error message with \`swmm_get_last_error_msg(engine)\`.

### 3.3 Domain Headers

Each header covers one domain with a consistent pattern: identity functions (\`count\`, \`index\`, \`id\`), creation (\`add\`), property setters, property getters, runtime state access, and bulk array access.

**openswmm_nodes.h** — 55 functions. Four node types: \`JUNCTION\`, \`OUTFALL\`, \`STORAGE\`, \`DIVIDER\`. Create nodes, set invert elevation, max depth, surcharge depth, ponded area. Get runtime depth, head, volume, lateral inflow. Inject lateral inflow during RUNNING state. Bulk getters return arrays for all nodes in a single call (\`swmm_node_get_depths(e, depth_buf, count)\`).

**openswmm_links.h** — 58 functions. Five link types: \`CONDUIT\`, \`PUMP\`, \`ORIFICE\`, \`WEIR\`, \`OUTLET\`. Twenty cross-section shapes from \`CIRCULAR\` through \`IRREGULAR\`. Set connectivity (\`swmm_link_set_nodes\`), geometry (\`swmm_link_set_xsect\`), roughness, offsets, flap gates. Get runtime flow, depth, velocity, volume, Froude number. Control setting injection during simulation (\`swmm_link_set_setting\`).

**openswmm_subcatchments.h** — 41 functions. Set outlet node, area, width, slope, percent impervious, Manning's n for pervious/impervious surfaces. Three infiltration models: Horton (\`swmm_subcatch_set_horton\`), Green-Ampt (\`swmm_subcatch_set_greenampt\`), Curve Number (\`swmm_subcatch_set_curvenumber\`). Landuse coverage assignment. Runtime rainfall, runoff, evaporation, infiltration.

**openswmm_gages.h** — 13 functions. Create rain gages with timeseries or file data sources. Set recording interval, snow catch factor, units conversion. Get current rainfall rate during simulation.

**openswmm_tables.h** — 13 functions. Time series and curve management. Add data points (\`swmm_table_add_point\`), cursor-optimized lookup (\`swmm_table_lookup\`). Pattern management for diurnal/monthly/weekend flow patterns (\`swmm_pattern_add\`, \`swmm_pattern_set_factors\`).

**openswmm_inflows.h** — 4 functions. External inflow, dry weather flow, and RDII assignment to nodes. Compact API because the heavy lifting is in the tables and patterns.

**openswmm_controls.h** — 6 functions. Control rules that change link settings based on conditions (node depth, simulation time, etc.). Both rule-based expressions and direct setting injection.

**openswmm_infrastructure.h** — 15 functions. Transect creation with station-elevation data. Street cross-section definitions. HEC-22 inlet types (grate, curb, slotted, custom). LID control layer definitions (surface, soil, storage, drain, drainmat). LID usage assignment to subcatchments.

**openswmm_spatial.h** — 18 functions. CRS (Coordinate Reference System) management via \`swmm_spatial_set_crs\` / \`swmm_spatial_get_crs\`. Node coordinates (\`swmm_spatial_set_node_coord\`). Link polyline vertices. Subcatchment polygon vertices. Gage coordinates. Bulk coordinate retrieval for all objects.

**openswmm_pollutants.h** — 23 functions. Pollutant definitions with concentration units, copollutant dependencies, snow-only flags. Runtime quality injection at nodes.

**openswmm_quality.h** — 9 functions. Landuse buildup/washoff function configuration. Treatment expressions.

**openswmm_statistics.h** — 15 functions. Post-simulation node, link, and subcatchment statistics. Peak flows, peak depths, flooding duration, surcharge duration.

**openswmm_massbalance.h** — 4 functions. Runoff continuity error, flow routing continuity error, quality routing continuity error. Cumulative flux totals.

**openswmm_hotstart.h** — 10 functions. Save, open, apply, modify, query, and close hot start files. The new format (\`OPENSWMM_HS_V1\`) extends the legacy binary format with UUID object maps, CRS strings, user flags, and CRC32 checksums. Warning support for missing objects when applying a hot start to a different model.

**openswmm_output.h** — 11 functions. Binary output file reader. Open \`.out\` files, get object counts, read per-period results, extract time series for individual elements.

**openswmm_callbacks.h** — 6 callback typedefs. Progress callback (per-timestep fraction complete), warning callback (non-fatal events), step-begin callback (inject forcings before physics), step-end callback (read state after physics), hot-start-missing callback, plugin state callback. All carry a \`void* user_data\` pointer for context.

**openswmm_model.h** — 11 functions. Programmatic model building entry point (\`swmm_engine_new\`). Topology validation (\`swmm_validate_model\`). Model finalization (\`swmm_finalize_model\`). Serialization back to \`.inp\` format (\`swmm_model_write\`). OPTIONS get/set. CRS access. User flags section for custom metadata.

## 4. The Solver: How a Simulation Runs

OpenSWMM's computational engine (whether legacy or 6.0 wrapper) executes the same physics. Here is the sequence.

### 4.1 Opening and Initialization

\`swmm_engine_open\` parses the \`.inp\` file. The parser reads sections in order: \`[TITLE]\`, \`[OPTIONS]\`, \`[RAINGAGES]\`, \`[SUBCATCHMENTS]\`, \`[SUBAREAS]\`, \`[INFILTRATION]\`, \`[JUNCTIONS]\`, \`[OUTFALLS]\`, \`[STORAGE]\`, \`[DIVIDERS]\`, \`[CONDUITS]\`, \`[PUMPS]\`, \`[ORIFICES]\`, \`[WEIRS]\`, \`[OUTLETS]\`, \`[XSECTIONS]\`, \`[TRANSECTS]\`, \`[STREETS]\`, \`[INLETS]\`, \`[LOSSES]\`, \`[CONTROLS]\`, \`[POLLUTANTS]\`, \`[LANDUSES]\`, \`[COVERAGES]\`, \`[BUILDUP]\`, \`[WASHOFF]\`, \`[TREATMENT]\`, \`[INFLOWS]\`, \`[DWF]\`, \`[RDII]\`, \`[HYDROGRAPHS]\`, \`[CURVES]\`, \`[TIMESERIES]\`, \`[PATTERNS]\`, \`[LID_CONTROLS]\`, \`[LID_USAGE]\`, \`[MAP]\`, \`[COORDINATES]\`, \`[VERTICES]\`, \`[POLYGONS]\`, \`[LABELS]\`, \`[TAGS]\`, \`[ADJUSTMENTS]\`, \`[EVAPORATION]\`, \`[TEMPERATURE]\`, \`[SNOWPACKS]\`, \`[GROUNDWATER]\`, \`[AQUIFERS]\`.

\`swmm_engine_initialize\` allocates working arrays. For the legacy engine, this means the global arrays \`Node[]\`, \`Link[]\`, \`Subcatch[]\`, and dozens of supporting arrays. For the 6.0 engine, the SoA arrays are allocated and the CSR (Compressed Sparse Row) connectivity matrix is built from the node-link topology.

### 4.2 The Simulation Loop

\`swmm_engine_start\` sets the simulation clock, opens scratch files, optionally applies a hot start, and writes the output file header.

Each call to \`swmm_engine_step\` advances the simulation by one routing timestep:

1. **Compute new runoff** (\`runoff_execute\` in \`runoff.c\`)
   - For each subcatchment:
     - Get current rainfall from gage
     - Apply snowmelt if active
     - Compute evaporation losses
     - Compute infiltration (Horton, Green-Ampt, or Curve Number)
     - Solve the nonlinear reservoir ODE: \`dV/dt = A·(rainfall - evap - infil) - Q_out\`
     - The outflow \`Q_out = W · d^(5/3) · S^(1/2) / n\` (Manning's equation, overland flow)
     - The ODE is solved with the Cash-Karp Runge-Kutta 5th order method (\`odesolve.c\`)
     - Update groundwater levels if groundwater module is active
     - Compute surface water quality (buildup, washoff)

2. **Route flows through the conveyance network** (\`routing_execute\` in \`routing.c\`)
   - Three routing options:
     - **Steady Flow** — mass balance only, no momentum. Simple proportional routing.
     - **Kinematic Wave** (\`kinwave.c\`) — solves \`∂A/∂t + ∂Q/∂x = q_lat\` with Manning's equation as the momentum surrogate. Each conduit solved independently. No backwater.
     - **Dynamic Wave** (\`dynwave.c\`, \`dwflow.c\`) — solves the full Saint-Venant equations:
       - Continuity: \`∂A/∂t + ∂Q/∂x = q_lat\`
       - Momentum: \`∂Q/∂t + ∂(Q²/A)/∂x + gA·∂H/∂x + gA·Sf = 0\`
       - Implemented as a staggered implicit scheme. Nodes hold depth/head, links hold flow.
       - The solver iterates node heads and link flows until convergence (Successive Approximation).
       - Handles surcharging, flooding, backwater, looped networks, reverse flow.
       - Force main flow uses Hazen-Williams or Darcy-Weisbach when conduits are pressurized.

3. **Route water quality** (\`qualrout_execute\` in \`qualrout.c\`)
   - CSTR (Continuously Stirred Tank Reactor) approach for nodes.
   - Plug flow with dispersion for conduits.
   - Treatment expression evaluation at each node with treatment defined.

4. **Compute inlet capture** (if inlets defined, \`inlet.c\`)
   - HEC-22 methodology for grate, curb, and slotted inlets.
   - Determines captured vs. bypass flow at each inlet.
   - Transfers captured flow and associated pollutants from street conduits to sewer nodes.

5. **Update LID performance** (integrated within subcatchment runoff)
   - LID controls process a chain of layers: surface → soil → storage → drain.
   - Each layer has its own water balance with vertical flow between layers.
   - Eight LID types: bio-retention cell, rain garden, green roof, infiltration trench, permeable pavement, rain barrel, rooftop disconnection, vegetative swale.

6. **Record results** (\`output_saveResults\` in \`output.c\`)
   - Write binary results for this timestep to the \`.out\` file.
   - Update running statistics (peak flows, peak depths, durations).

7. **Update mass balance** (\`massbal_updateRoutingTotals\` in \`massbal.c\`)
   - Track all water entering and leaving the system.
   - Compute instantaneous and cumulative continuity errors.

8. **Determine next timestep**
   - For dynamic wave routing, the timestep adapts based on a Courant-like condition.
   - The variable timestep is bounded by user-specified minimum and maximum values.
   - The timestep \`dt\` satisfies: \`dt ≤ dx / (V + c)\` where \`V\` is flow velocity and \`c\` is wave celerity.

### 4.3 Key Numerical Methods

**ODE Solver** (\`odesolve.c\`): Cash-Karp embedded Runge-Kutta 4(5) with adaptive step control. Used for subcatchment runoff, groundwater flow, and LID layer drainage. The solver evaluates the ODE system at six intermediate points per step, producing both a 4th-order and 5th-order estimate. The difference provides an error estimate for step size control.

**Root Finder** (\`findroot.c\`): Ridder's method — a bracketing root finder with superlinear convergence. Used to find normal depth, critical depth, and other implicit relationships in cross-section geometry.

**Topological Sort** (\`toposort.c\`): Kahn's algorithm on the directed graph of nodes and links. Determines the order in which nodes are processed during kinematic wave routing (upstream to downstream). Also identifies and breaks cycles for dynamic wave routing.

**Hash Tables** (\`hash.c\`): Jenkins' one-at-a-time hash for O(1) lookup of objects by their string IDs. Separate hash tables for nodes, links, subcatchments, and other object types.

## 5. Key Differences from EPA SWMM 5.2.4

### 5.1 Files Only in OpenSWMM

| File | Lines | Purpose |
|------|-------|---------|
| \`swmm5_stats.c\` | 255 | Exposes per-element statistics and mass balance through API functions |
| 18 API headers | 4,979 | The entire new C API (\`openswmm_engine.h\` through \`openswmm_tables.h\`) |
| \`version.h.in\` | 92 | CMake-driven version injection |
| Plugin SDK | — | Header-only SDK for output/report plugins |
| Python bindings | ~8,500 | Cython wrappers for solver, output, and new engine |

### 5.2 Files Identical to EPA 5.2.4

These 25 files compile to identical object code. The proven computational core has not been touched:

\`culvert.c\`, \`exfil.c\`, \`forcmain.c\`, \`hash.c\`, \`hash.h\`, \`headers.h\`, \`inlet.h\`, \`inputrpt.c\`, \`keywords.c\`, \`keywords.h\`, \`lid.h\`, \`macros.h\`, \`mathexpr.c\`, \`mathexpr.h\`, \`mempool.c\`, \`mempool.h\`, \`odesolve.c\`, \`odesolve.h\`, \`rain.c\`, \`roadway.c\`, \`shape.c\`, \`statsrpt.c\`, \`street.c\`, \`street.h\`, \`text.h\`

### 5.3 Heaviest Modifications

| File | Added | Removed | Change % | What Changed |
|------|-------|---------|----------|-------------|
| \`funcs.h\` | +501 | -2,204 | 96.6% | Function prototypes reorganized, Doxygen added, new API function declarations |
| \`enums.h\` | +490 | -1,222 | 98.8% | Every enum value documented, new enum members for state machine |
| \`consts.h\` | +89 | -408 | 95.0% | Version system, \`MAXHOTSTARTFILES\`, \`MAXTIMESERIESCACHESIZE\`, full Doxygen |
| \`controls.c\` | +878 | -1,448 | 63.3% | Extended control rule parser, more control actions, Doxygen |
| \`swmm5.c\` | +841 | -1,982 | 61.6% | Lifecycle management, statistics API hooks, error handling refactor |
| \`climate.c\` | +755 | -1,092 | 51.7% | Extended evaporation models, monthly adjustments, Doxygen |
| \`datetime.h\` | +32 | -181 | 72.7% | Header reorganization |

### 5.4 SWMM 5.2 Features Carried Forward

OpenSWMM inherited and preserves all SWMM 5.2 features:

- **HEC-22 inlet analysis** — \`[STREETS]\`, \`[INLETS]\`, \`[INLET_USAGE]\` sections with grate, curb, slotted, and custom inlet types
- **New storage shapes** — Conical (truncated elliptical cone) and Pyramidal (truncated rectangular pyramid)
- **Variable speed pumps** — Type5 pump curves with speed scaling
- **Control rule enhancements** — Extended math expression support, more trigger conditions

## 6. Build System and Testing

### 6.1 CMake

The project uses CMake 3.21+ with vcpkg for dependency management. Five build targets:

| Target | Type | Language |
|--------|------|----------|
| \`openswmm_legacy_engine\` | Shared library | C17 |
| \`openswmm_legacy_output\` | Shared library | C17 |
| \`openswmm_engine\` | Shared library | C++20 |
| \`openswmm_plugin_sdk\` | Header-only (INTERFACE) | C++20 |
| \`openswmm_cli\` | Executable | C++20 |

Multi-platform CI runs on GitHub Actions: Windows x64, Linux x64, macOS x64, and macOS ARM64.

### 6.2 Testing

Google Test replaced Boost.Test across the entire test suite:

- **73+ legacy engine tests** — Regression tests for the EPA solver
- **41 legacy output tests** — Binary \`.out\` file reader verification
- **New engine unit tests** — API lifecycle, model building, state machine transitions
- **Google Benchmark integration** — Performance profiling for critical-path operations

### 6.3 Python Bindings

Cython-based bindings under \`python/openswmm/\`:

\`\`\`python
from openswmm import solver
from openswmm.solver import Solver

with Solver(inp_file="model.inp") as swmm:
    swmm.start()
    swmm.time_stride = 600

    for elapsed_time, current_datetime in swmm:
        print(current_datetime)
\`\`\`

The bindings support both the legacy engine (\`openswmm.legacy.engine\`) and the new engine (\`openswmm.engine\`). The \`openswmm.solver\` module is a backward-compatibility shim that maps to the legacy engine.

## 7. Plugin System

### 7.1 Architecture

Output and report writing are abstracted through a plugin interface defined in the Plugin SDK (\`include/openswmm/plugin_sdk/\`). The engine communicates with plugins through:

1. **SimulationSnapshot** — a read-only, double-buffered snapshot of the simulation state (node depths, link flows, subcatchment runoff, system totals) at a given timestep.
2. **I/O Thread** — a dedicated thread that receives snapshots and dispatches them to registered plugins. The main simulation thread writes to buffer A while the I/O thread reads from buffer B, then they swap.
3. **Plugin lifecycle** — plugins implement \`IOutputPlugin\` or \`IReportPlugin\` interfaces with \`initialize()\`, \`on_snapshot()\`, and \`finalize()\` methods.

### 7.2 DefaultOutputPlugin

The default plugin writes the standard SWMM binary \`.out\` format. This ensures backward compatibility — existing post-processing tools (SWMM GUI, PySWMM Output reader, swmmtoolbox, swmm-pandas) can read OpenSWMM output files without modification.

## 8. Hot Start File Format

The new hot start format (\`OPENSWMM_HS_V1\`) extends the legacy SWMM binary hot start with:

- **UUID object map** — Each object's identifier is stored, enabling robust missing-object detection when applying a hot start to a model with different topology
- **CRS string** — Spatial consistency checking between the hot start and the target model
- **User flag values** — Custom metadata preserved across hot start save/load cycles
- **CRC32 integrity checksum** — Detects file corruption

The workflow:

\`\`\`c
// Save a hot start at end of warm-up
swmm_hotstart_save(engine, "warmup.hs");

// Later: apply to a different storm event
SWMM_HotStart hs = NULL;
swmm_hotstart_open("warmup.hs", &hs);
swmm_hotstart_apply(engine2, hs);

// Check for warnings (missing objects, CRS mismatch)
int nwarn = swmm_hotstart_warning_count(hs);
for (int i = 0; i < nwarn; i++) {
    printf("Warning: %s\\n", swmm_hotstart_warning(hs, i));
}
swmm_hotstart_close(hs);
\`\`\`

## 9. Where This Goes

The CHANGELOG targets 6.0.0 as the first release, currently at alpha.1. Caleb outlined on OpenSWMM.org his plans for the roadmap through 6.0 and beyond:

- Multi-platform engine (Windows, Linux, macOS) — done
- Expanded unit and regression testing — done
- Expanded API with Python bindings — done
- Consolidated documentation with live web versions — in progress
- Improved input/output handling and CSV support — planned
- Multi-solver architecture (alternative DynWave implementations) — planned
- QGIS plugin via the API — under consideration

The code is MIT-licensed. The original EPA SWMM source is public domain under 17 USC § 105. The community development happens through the HydroCouple GitHub portal with engagement from ASCE EWRI and WEF.

## 10. Source Code Map

\`\`\`
openswmm.engine/
├── include/openswmm/
│   ├── engine/                          # New 6.0 C API (18 headers, 322 functions)
│   │   ├── openswmm_engine.h            #   Engine lifecycle, errors, state machine
│   │   ├── openswmm_model.h             #   Model building, validation, serialization
│   │   ├── openswmm_nodes.h             #   55 node functions (4 types)
│   │   ├── openswmm_links.h             #   58 link functions (5 types, 20 XS shapes)
│   │   ├── openswmm_subcatchments.h     #   41 subcatchment functions
│   │   ├── openswmm_gages.h             #   13 gage functions
│   │   ├── openswmm_pollutants.h        #   23 pollutant functions
│   │   ├── openswmm_tables.h            #   13 table/curve/pattern functions
│   │   ├── openswmm_inflows.h           #   4 inflow/DWF/RDII functions
│   │   ├── openswmm_controls.h          #   6 control rule functions
│   │   ├── openswmm_infrastructure.h    #   15 transect/street/inlet/LID functions
│   │   ├── openswmm_spatial.h           #   18 CRS/coordinate functions
│   │   ├── openswmm_quality.h           #   9 water quality functions
│   │   ├── openswmm_massbalance.h       #   4 mass balance functions
│   │   ├── openswmm_callbacks.h         #   6 callback typedefs
│   │   ├── openswmm_hotstart.h          #   10 hot start functions
│   │   ├── openswmm_statistics.h        #   15 statistics functions
│   │   └── openswmm_output.h            #   11 output reader functions
│   ├── legacy/                          # Legacy public headers
│   └── plugin_sdk/                      # Header-only plugin SDK (C++20)
├── src/
│   ├── engine/                          # New C++20 engine implementation
│   ├── legacy/
│   │   ├── engine/                      # EPA SWMM 5.x solver (75 .c/.h files)
│   │   │   ├── swmm5.c                 #   Main loop (1,721→2,695 lines)
│   │   │   ├── swmm5_stats.c           #   NEW: statistics API (255 lines)
│   │   │   ├── dwflow.c                #   Dynamic wave link flow
│   │   │   ├── dynwave.c               #   Dynamic wave node/system solver
│   │   │   ├── flowrout.c              #   Flow routing dispatcher
│   │   │   ├── kinwave.c               #   Kinematic wave routing
│   │   │   ├── runoff.c                #   Subcatchment runoff
│   │   │   ├── infil.c                 #   Infiltration models
│   │   │   ├── lid.c / lidproc.c       #   LID/Green Infrastructure
│   │   │   ├── inlet.c / street.c      #   HEC-22 inlet capture
│   │   │   ├── node.c / link.c         #   Network object management
│   │   │   └── ...                     #   (see Section 2.1 table)
│   │   ├── output/                      # Legacy binary output reader
│   │   └── cli/                         # Legacy CLI (main.c)
│   ├── plugin_sdk/                      # Plugin SDK CMake target
│   └── cli/                             # New CLI (main.cpp, uses 6.0 API)
├── python/                              # Cython bindings (solver, output, engine)
├── tests/                               # Google Test (73+ engine, 41 output)
├── docs/                                # Doxygen, manuals, HEC-22 docs
├── CMakeLists.txt                       # CMake 3.21+, vcpkg, multi-platform
├── CHANGELOG.md                         # v6.0.0-alpha.1 release notes
└── README.md                            # Project overview
\`\`\`

---

*Generated from source code analysis of [HydroCouple/openswmm.engine@swmm6_rel](https://github.com/HydroCouple/openswmm.engine/tree/swmm6_rel), March 2026.*
*Comparison baseline: [USEPA/Stormwater-Management-Model](https://github.com/USEPA/Stormwater-Management-Model) (EPA SWMM 5.2.4, Build 52004).*
`;
