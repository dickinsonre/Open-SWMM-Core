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

const BASE = import.meta.env.BASE_URL || "/";

const SAMPLE_MODELS = [
  { id: "greenville", label: "Greenville — All SWMM5 Features (SI)", file: "greenville.inp", desc: "Comprehensive model with all SWMM5 feature types, SI units" },
  { id: "user1", label: "User1 — Urban Drainage (CMS)", file: "user1.inp", desc: "58 subcatchments, dynamic wave routing, metric units" },
  { id: "user2", label: "User2 — Storage Network (CFS)", file: "user2.inp", desc: "17 subcatchments, 21 storage units, tabular curves" },
  { id: "user3", label: "User3 — Dual Pipe System (CMS)", file: "user3.inp", desc: "Large dual-pipe network, 50+ subcatchments" },
  { id: "user4", label: "User4 — Large Municipal (CFS)", file: "user4.inp", desc: "98+ subcatchments, extensive conduit network" },
  { id: "user5", label: "User5 — Stormwater Collection (CFS)", file: "user5.inp", desc: "90+ subcatchments, variable time-step routing" },
];

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

  const loadSample = useCallback(async (model: typeof SAMPLE_MODELS[number]) => {
    setLoading(true);
    setProgress(`Loading ${model.label}...`);
    try {
      const resp = await fetch(`${BASE}samples/${model.file}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      setInpContent(text);
      setFileName(model.file);
      setResult(null);
      setSections([]);
      setTimeSeries([]);
    } catch (err: any) {
      setResult({
        exitCode: -1,
        reportText: "",
        errorMessage: `Failed to load sample model: ${err.message}`,
      });
    } finally {
      setLoading(false);
      setProgress("");
    }
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
            <select
              className="sim-sample-select"
              value=""
              onChange={(e) => {
                const model = SAMPLE_MODELS.find((m) => m.id === e.target.value);
                if (model) loadSample(model);
              }}
              disabled={loading}
            >
              <option value="" disabled>Load Sample Model...</option>
              {SAMPLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
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
