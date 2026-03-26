import { useState, useRef, useCallback } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";
import { runSwmmSimulation, type SwmmResult } from "../lib/swmm-wasm";
import { parseRptSections, extractTimeSeries, type RptSection, type RptTimeSeries } from "../lib/rpt-parser";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

const SAMPLE_INP = `[TITLE]
;;Example SWMM Model - Simple Test

[OPTIONS]
FLOW_UNITS           CFS
INFILTRATION         HORTON
FLOW_ROUTING         DYNWAVE
LINK_OFFSETS          DEPTH
FORCE_MAIN_EQUATION  H-W
IGNORE_RAINFALL      NO
IGNORE_SNOWMELT      YES
IGNORE_GROUNDWATER   YES
IGNORE_RDII          YES
IGNORE_ROUTING       NO
IGNORE_QUALITY       YES
ALLOW_PONDING        NO
SKIP_STEADY_STATE    NO
SYS_FLOW_TOL        5
LAT_FLOW_TOL        5
START_DATE           01/01/2024
START_TIME           00:00:00
REPORT_START_DATE    01/01/2024
REPORT_START_TIME    00:00:00
END_DATE             01/01/2024
END_TIME             06:00:00
SWEEP_START          01/01
SWEEP_END            12/31
DRY_DAYS             0
REPORT_STEP          00:05:00
WET_STEP             00:05:00
DRY_STEP             01:00:00
ROUTING_STEP         00:00:30
RULE_STEP            00:00:00
INERTIAL_DAMPING     PARTIAL
NORMAL_FLOW_LIMITED  BOTH
MIN_SURFAREA         12.566
MAX_TRIALS           8
HEAD_TOLERANCE       0.005
THREADS              1
TEMPDIR              .

[EVAPORATION]
CONSTANT     0.0

[RAINGAGES]
;;Name           Format    Interval SCF      Source
;;-------------- --------- ------ ------ ----------
RG1              INTENSITY 0:05     1.0      TIMESERIES TS1

[SUBCATCHMENTS]
;;Name           Rain Gage        Outlet           Area     %Imperv  Width    %Slope   CurbLen  SnowPack
;;-------------- ---------------- ---------------- -------- -------- -------- -------- -------- --------
S1               RG1              J1               5        50       500      0.5      0

[SUBAREAS]
;;Subcatchment   N-Imperv   N-Perv     S-Imperv   S-Perv     PctZero    RouteTo    PctRouted
;;-------------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
S1               0.01       0.1        0.05       0.05       25         OUTLET

[INFILTRATION]
;;Subcatchment   MaxRate    MinRate    Decay      DryTime    MaxInfil
;;-------------- ---------- ---------- ---------- ---------- ----------
S1               3.0        0.5        4          7          0

[JUNCTIONS]
;;Name           Elevation  MaxDepth   InitDepth  SurDepth   Aponded
;;-------------- ---------- ---------- ---------- ---------- ----------
J1               100        4          0          0          0
J2               97         4          0          0          0

[OUTFALLS]
;;Name           Elevation  Type       Stage Data       Gated    Route To
;;-------------- ---------- ---------- ---------------- -------- --------
Out1             94         FREE                        NO

[CONDUITS]
;;Name           From Node        To Node          Length     Roughness  InOffset   OutOffset  InitFlow   MaxFlow
;;-------------- ---------------- ---------------- ---------- ---------- ---------- ---------- ---------- ----------
C1               J1               J2               400        0.01       0          0          0          0
C2               J2               Out1             400        0.01       0          0          0          0

[XSECTIONS]
;;Link           Shape        Geom1            Geom2      Geom3      Geom4      Barrels    Culvert
;;-------------- ------------ ---------------- ---------- ---------- ---------- ---------- ----------
C1               CIRCULAR     1.5              0          0          0          1
C2               CIRCULAR     1.5              0          0          0          1

[TIMESERIES]
;;Name           Date       Time       Value
;;-------------- ---------- ---------- ----------
TS1                         0:00       0.0
TS1                         0:15       0.5
TS1                         0:30       1.0
TS1                         0:45       2.0
TS1                         1:00       3.0
TS1                         1:15       4.0
TS1                         1:30       3.5
TS1                         1:45       2.5
TS1                         2:00       1.5
TS1                         2:15       0.8
TS1                         2:30       0.3
TS1                         2:45       0.1
TS1                         3:00       0.0

[REPORT]
SUBCATCHMENTS ALL
NODES ALL
LINKS ALL
`;

type TabId = "raw" | "tables" | "graphs";

export default function Simulator({ onNavigateFeatures }: { onNavigateFeatures: () => void }) {
  const [dark, setDark] = useDarkMode();
  const [inpContent, setInpContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwmmResult | null>(null);
  const [sections, setSections] = useState<RptSection[]>([]);
  const [timeSeries, setTimeSeries] = useState<RptTimeSeries[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("raw");
  const [selectedSeries, setSelectedSeries] = useState<number[]>([]);
  const [progress, setProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInpContent(text);
      setResult(null);
      setSections([]);
      setTimeSeries([]);
    };
    reader.readAsText(file);
  }, []);

  const loadSample = useCallback(() => {
    setInpContent(SAMPLE_INP);
    setFileName("sample-model.inp");
    setResult(null);
    setSections([]);
    setTimeSeries([]);
  }, []);

  const runSimulation = useCallback(async () => {
    if (!inpContent.trim()) return;
    setRunning(true);
    setLoading(true);
    setProgress("Loading SWMM engine...");
    setResult(null);
    setSections([]);
    setTimeSeries([]);

    try {
      setProgress("Running simulation...");
      const res = await runSwmmSimulation(inpContent);
      setResult(res);

      if (res.reportText) {
        setProgress("Parsing results...");
        const parsedSections = parseRptSections(res.reportText);
        setSections(parsedSections);
        const ts = extractTimeSeries(res.reportText);
        setTimeSeries(ts);
        if (ts.length > 0) {
          setSelectedSeries([0]);
        }
        setActiveTab(res.exitCode === 0 ? "tables" : "raw");
      }
    } catch (err: any) {
      setResult({
        exitCode: -1,
        reportText: "",
        errorMessage: `Failed to run simulation: ${err.message}`,
      });
      setActiveTab("raw");
    } finally {
      setRunning(false);
      setLoading(false);
      setProgress("");
    }
  }, [inpContent]);

  const toggleSeries = (idx: number) => {
    setSelectedSeries((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="sim-page">
      <header className="features-topbar">
        <div className="features-topbar-inner">
          <div className="features-logo">
            <span className="features-logo-icon">{"\uD83C\uDF0A"}</span>
            <span className="features-logo-text">OpenSWMM Engine</span>
          </div>
          <div className="features-topbar-actions">
            <button className="dark-toggle" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">
              {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
            </button>
            <button className="features-docs-btn" onClick={onNavigateFeatures}>
              {"\u2190"} Back
            </button>
          </div>
        </div>
      </header>

      <div className="sim-layout">
        <div className="sim-input-panel">
          <h2 className="sim-panel-title">SWMM Input File</h2>

          <div className="sim-file-actions">
            <button
              className="sim-btn sim-btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload .inp File
            </button>
            <button className="sim-btn sim-btn-outline" onClick={loadSample}>
              Load Sample Model
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".inp,.txt"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </div>

          {fileName && <div className="sim-filename">{fileName}</div>}

          <textarea
            className="sim-textarea"
            value={inpContent}
            onChange={(e) => setInpContent(e.target.value)}
            placeholder="Paste your SWMM .inp file contents here, or use the buttons above..."
            spellCheck={false}
          />

          <button
            className="sim-btn sim-btn-primary sim-run-btn"
            onClick={runSimulation}
            disabled={running || !inpContent.trim()}
          >
            {running ? progress || "Running..." : "Run Simulation"}
          </button>

          {loading && (
            <div className="sim-loading">
              <div className="sim-spinner" />
              <span>{progress}</span>
            </div>
          )}
        </div>

        <div className="sim-output-panel">
          <h2 className="sim-panel-title">
            Simulation Results
            {result && (
              <span className={`sim-status ${result.exitCode === 0 ? "sim-status-ok" : "sim-status-err"}`}>
                {result.exitCode === 0 ? "Success" : `Error (code ${result.exitCode})`}
              </span>
            )}
          </h2>

          {result && (
            <>
              <div className="sim-tabs">
                {(["raw", "tables", "graphs"] as TabId[]).map((tab) => (
                  <button
                    key={tab}
                    className={`sim-tab ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "raw" ? "Raw Report" : tab === "tables" ? "Tables" : "Graphs"}
                  </button>
                ))}
              </div>

              <div className="sim-tab-content">
                {activeTab === "raw" && (
                  <pre className="sim-raw-output">{result.reportText || result.errorMessage || "No output"}</pre>
                )}

                {activeTab === "tables" && (
                  <div className="sim-tables">
                    {sections.length === 0 ? (
                      <p className="sim-empty">No tabular data found in the report.</p>
                    ) : (
                      sections.map((section, idx) => (
                        <div className="sim-table-section" key={idx}>
                          <h3>{section.title}</h3>
                          <div className="sim-table-wrap">
                            <table className="sim-table">
                              <thead>
                                <tr>
                                  {section.headers.map((h, i) => (
                                    <th key={i}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {section.rows.map((row, ri) => (
                                  <tr key={ri}>
                                    {row.slice(0, section.headers.length).map((cell, ci) => (
                                      <td key={ci}>{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "graphs" && (
                  <div className="sim-graphs">
                    {timeSeries.length === 0 ? (
                      <p className="sim-empty">No time series data found for graphing.</p>
                    ) : (
                      <>
                        <div className="sim-series-picker">
                          <span className="sim-series-label">Select data series:</span>
                          <div className="sim-series-chips">
                            {timeSeries.map((ts, idx) => (
                              <button
                                key={idx}
                                className={`sim-chip ${selectedSeries.includes(idx) ? "active" : ""}`}
                                onClick={() => toggleSeries(idx)}
                                style={
                                  selectedSeries.includes(idx)
                                    ? { borderColor: COLORS[idx % COLORS.length], background: COLORS[idx % COLORS.length] + "18" }
                                    : {}
                                }
                              >
                                {ts.title}
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedSeries.length > 0 && (
                          <div className="sim-chart-container">
                            <ResponsiveContainer width="100%" height={420}>
                              <LineChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#333" : "#e5e5e5"} />
                                <XAxis
                                  dataKey="time"
                                  allowDuplicatedCategory={false}
                                  tick={{ fontSize: 11 }}
                                  stroke={dark ? "#888" : "#666"}
                                />
                                <YAxis tick={{ fontSize: 11 }} stroke={dark ? "#888" : "#666"} />
                                <Tooltip
                                  contentStyle={{
                                    background: dark ? "#1e1e22" : "#fff",
                                    border: `1px solid ${dark ? "#333" : "#ddd"}`,
                                    borderRadius: 8,
                                    fontSize: 13,
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                {selectedSeries.map((sIdx) => {
                                  const ts = timeSeries[sIdx];
                                  if (!ts) return null;
                                  const data = ts.times.map((t, i) => ({
                                    time: t,
                                    [ts.title]: ts.values[i],
                                  }));
                                  return (
                                    <Line
                                      key={sIdx}
                                      data={data}
                                      type="monotone"
                                      dataKey={ts.title}
                                      stroke={COLORS[sIdx % COLORS.length]}
                                      strokeWidth={2}
                                      dot={false}
                                      name={ts.title}
                                    />
                                  );
                                })}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {!result && !running && (
            <div className="sim-placeholder">
              <div className="sim-placeholder-icon">{"\uD83D\uDCA7"}</div>
              <p>Upload or paste a SWMM .inp file and click <strong>Run Simulation</strong> to see results here.</p>
              <p className="sim-placeholder-sub">The SWMM 5.2 engine runs entirely in your browser via WebAssembly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
