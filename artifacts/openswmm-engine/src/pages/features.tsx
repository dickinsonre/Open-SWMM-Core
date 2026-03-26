import { useDarkMode } from "../hooks/use-dark-mode";

const architectureFeatures = [
  {
    icon: "\u26A1",
    title: "Data-Oriented Design",
    desc: "Core data structures refactored to Structure of Arrays (SoA) layout for cache efficiency and SIMD-friendly computation.",
    tag: "Performance",
  },
  {
    icon: "\uD83D\uDD04",
    title: "Reentrant Engine",
    desc: "Global state eliminated. All simulation state encapsulated in an opaque SWMM_Engine handle, enabling multiple independent simulations in the same process.",
    tag: "Architecture",
  },
  {
    icon: "\uD83D\uDD0C",
    title: "Plugin-Based I/O",
    desc: "Output and report writing abstracted through a plugin interface. Plugins receive read-only simulation snapshots on a dedicated I/O thread with double-buffered state.",
    tag: "Extensibility",
  },
  {
    icon: "\u2728",
    title: "C++20 Codebase",
    desc: "New engine written in modern C++20 with a transparent C API boundary. Legacy EPA SWMM 5.x solver preserved unmodified in src/legacy/.",
    tag: "Modern",
  },
];

const apiHeaders = [
  { header: "openswmm_engine.h", domain: "Engine lifecycle, error codes, state machine", funcs: "Core" },
  { header: "openswmm_model.h", domain: "Model building, validation, serialization", funcs: "11" },
  { header: "openswmm_nodes.h", domain: "Junctions, outfalls, storage, dividers", funcs: "55" },
  { header: "openswmm_links.h", domain: "Conduits, pumps, orifices, weirs, outlets", funcs: "58" },
  { header: "openswmm_subcatchments.h", domain: "Subcatchments, infiltration, coverage", funcs: "41" },
  { header: "openswmm_gages.h", domain: "Rain gages (timeseries and file sources)", funcs: "13" },
  { header: "openswmm_pollutants.h", domain: "Pollutant definitions and runtime injection", funcs: "23" },
  { header: "openswmm_tables.h", domain: "Time series, curves, and patterns", funcs: "13" },
  { header: "openswmm_inflows.h", domain: "External inflows, DWF, RDII", funcs: "4" },
  { header: "openswmm_controls.h", domain: "Control rules and direct link actions", funcs: "6" },
  { header: "openswmm_infrastructure.h", domain: "Transects, streets, inlets, LID controls", funcs: "15" },
  { header: "openswmm_spatial.h", domain: "CRS, coordinates, polylines, polygons", funcs: "18" },
  { header: "openswmm_quality.h", domain: "Landuse, buildup, washoff, treatment", funcs: "9" },
  { header: "openswmm_massbalance.h", domain: "Continuity errors and cumulative flux totals", funcs: "4" },
  { header: "openswmm_callbacks.h", domain: "Progress, warning, and step callbacks", funcs: "6" },
  { header: "openswmm_hotstart.h", domain: "Hot start file save/load/modify", funcs: "10" },
  { header: "openswmm_statistics.h", domain: "Node, link, and subcatchment statistics", funcs: "15" },
];

const additionalFeatures = [
  { icon: "\uD83D\uDD25", title: "Hot Start API", desc: "Save, load, modify, and query hot start files with UUID object maps, CRS strings, user flags, and CRC32 checksums." },
  { icon: "\uD83C\uDF0D", title: "CRS Support", desc: "Coordinate reference system specification via OPTIONS for spatial data consistency." },
  { icon: "\uD83C\uDFF7\uFE0F", title: "User Flags", desc: "Custom USER_FLAGS section for user-defined metadata on any model object." },
  { icon: "\uD83E\uDDE9", title: "Plugin SDK", desc: "Header-only development kit for building custom output and report plugins." },
  { icon: "\uD83D\uDEB0", title: "HEC-22 Inlet Analysis", desc: "Street inlet capture with grate, curb, and slotted inlet types from SWMM 5.2." },
  { icon: "\u2699\uFE0F", title: "Variable Speed Pumps", desc: "Type5 pump curves with speed scaling for precise pump control." },
  { icon: "\uD83D\uDCE6", title: "New Storage Shapes", desc: "Conical and pyramidal shapes with elliptical and rectangular bases." },
];

const testingFeatures = [
  { stat: "73+", label: "Legacy Engine Tests", desc: "Regression tests for the EPA solver" },
  { stat: "41", label: "Output Tests", desc: "Binary .out file reader verification" },
  { stat: "4", label: "Platforms", desc: "Windows, Linux, macOS Intel + ARM64" },
  { stat: "19", label: "API Headers", desc: "All fully documented with Doxygen" },
];

export default function Features({ onNavigateDocs }: { onNavigateDocs: () => void }) {
  const [dark, setDark] = useDarkMode();

  return (
    <div className="features-page">
      <header className="features-topbar">
        <div className="features-topbar-inner">
          <div className="features-logo">
            <span className="features-logo-icon">{"\uD83C\uDF0A"}</span>
            <span className="features-logo-text">OpenSWMM Engine</span>
          </div>
          <div className="features-topbar-actions">
            <button
              className="dark-toggle"
              onClick={() => setDark(!dark)}
              aria-label="Toggle dark mode"
            >
              {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
            <button className="features-docs-btn" onClick={onNavigateDocs}>
              Read the Docs
            </button>
            <a
              className="features-gh-btn"
              href="https://github.com/HydroCouple/OpenSWMMCore"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <section className="features-hero">
        <div className="features-hero-inner">
          <span className="features-version-badge">v6.0.0-alpha.1</span>
          <h1>The Next Generation of<br />Stormwater Modeling</h1>
          <p className="features-hero-sub">
            OpenSWMM Engine is a community-driven, open-source continuation of EPA SWMM 5.2.4 —
            rebuilt with a modern C++20 architecture, reentrant design, and a comprehensive 322-function C API.
          </p>
          <div className="features-hero-actions">
            <button className="features-cta-primary" onClick={onNavigateDocs}>
              Technical Deep-Dive
            </button>
            <a
              className="features-cta-secondary"
              href="https://github.com/HydroCouple/OpenSWMMCore"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-section-inner">
          <h2 className="features-section-title">Architecture & Performance</h2>
          <p className="features-section-sub">
            A ground-up rethinking of how SWMM manages state, memory, and I/O.
          </p>
          <div className="features-grid-4">
            {architectureFeatures.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-card-icon">{f.icon}</div>
                <span className="feature-card-tag">{f.tag}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features-section features-section-alt">
        <div className="features-section-inner">
          <h2 className="features-section-title">Domain-Split C API</h2>
          <p className="features-section-sub">
            322 functions across 17 headers — each covering one domain with a consistent pattern of identity, creation, property access, and bulk operations.
          </p>
          <div className="api-table-wrapper">
            <table className="api-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Domain</th>
                  <th>Functions</th>
                </tr>
              </thead>
              <tbody>
                {apiHeaders.map((h) => (
                  <tr key={h.header}>
                    <td><code>{h.header}</code></td>
                    <td>{h.domain}</td>
                    <td className="api-func-count">{h.funcs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-section-inner">
          <h2 className="features-section-title">Additional Features</h2>
          <p className="features-section-sub">
            New capabilities that extend SWMM beyond its traditional boundaries.
          </p>
          <div className="features-grid-3">
            {additionalFeatures.map((f) => (
              <div className="feature-card feature-card-compact" key={f.title}>
                <div className="feature-card-icon-sm">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features-section features-section-alt">
        <div className="features-section-inner">
          <h2 className="features-section-title">Testing & Quality</h2>
          <p className="features-section-sub">
            Migrated to Google Test with comprehensive multi-platform CI.
          </p>
          <div className="features-stats">
            {testingFeatures.map((t) => (
              <div className="stat-card" key={t.label}>
                <div className="stat-number">{t.stat}</div>
                <div className="stat-label">{t.label}</div>
                <div className="stat-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-section-inner">
          <h2 className="features-section-title">Engine Lifecycle</h2>
          <p className="features-section-sub">
            Explicit state machine with clean transitions — from file-based or programmatic model creation through simulation to cleanup.
          </p>
          <div className="lifecycle-diagram">
            <div className="lifecycle-track">
              {["CREATED", "OPENED", "INITIALIZED", "STARTED", "RUNNING", "ENDED", "CLOSED"].map((state, i, arr) => (
                <div className="lifecycle-step" key={state}>
                  <div className="lifecycle-node">{state}</div>
                  {i < arr.length - 1 && <div className="lifecycle-arrow">{"\u2192"}</div>}
                </div>
              ))}
            </div>
            <div className="lifecycle-alt">
              <span className="lifecycle-alt-label">Programmatic:</span>
              {["BUILDING", "INITIALIZED", "STARTED", "RUNNING", "ENDED", "CLOSED"].map((state, i, arr) => (
                <span key={state}>
                  <span className="lifecycle-alt-node">{state}</span>
                  {i < arr.length - 1 && <span className="lifecycle-alt-arrow">{" \u2192 "}</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="features-section features-section-alt">
        <div className="features-section-inner">
          <h2 className="features-section-title">Quick Start</h2>
          <div className="quickstart-grid">
            <div className="quickstart-card">
              <h3>C/C++ Engine</h3>
              <pre><code>{`git clone https://github.com/HydroCouple/OpenSWMMCore.git
cd OpenSWMMCore
export VCPKG_ROOT=$(pwd)/vcpkg
cmake --preset=Linux -B build
cmake --build build --config Release`}</code></pre>
            </div>
            <div className="quickstart-card">
              <h3>Python Bindings</h3>
              <pre><code>{`from openswmm.solver import Solver

with Solver(inp_file="model.inp") as swmm:
    swmm.start()
    swmm.time_stride = 600
    for elapsed, dt in swmm:
        print(dt)`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      <footer className="features-footer">
        <div className="features-footer-inner">
          <p>
            MIT Licensed. Copyright 2026 HydroCouple. Original EPA SWMM material is public domain under 17 USC {"\u00A7"} 105.
          </p>
          <p>
            Built for{" "}
            <a href="https://swmm5.org" target="_blank" rel="noopener noreferrer">SWMM5.org</a>
            {" "}{"\u2022"}{" "}
            <a href="https://github.com/HydroCouple/OpenSWMMCore" target="_blank" rel="noopener noreferrer">GitHub</a>
            {" "}{"\u2022"}{" "}
            <button className="features-footer-link" onClick={onNavigateDocs}>Technical Documentation</button>
          </p>
        </div>
      </footer>
    </div>
  );
}
