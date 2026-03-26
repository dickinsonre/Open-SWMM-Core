import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { parseInpForMap, type MapData, type MapNode } from "../lib/inp-map-parser";

interface NetworkMapProps {
  inpContent: string;
  dark: boolean;
}

const NODE_COLORS: Record<MapNode["type"], { light: string; dark: string }> = {
  junction: { light: "#2563eb", dark: "#60a5fa" },
  outfall: { light: "#dc2626", dark: "#f87171" },
  storage: { light: "#16a34a", dark: "#4ade80" },
  divider: { light: "#d97706", dark: "#fbbf24" },
};

const LINK_COLORS: Record<string, { light: string; dark: string }> = {
  conduit: { light: "#475569", dark: "#94a3b8" },
  pump: { light: "#7c3aed", dark: "#a78bfa" },
  orifice: { light: "#db2777", dark: "#f472b6" },
  weir: { light: "#ea580c", dark: "#fb923c" },
  outlet: { light: "#0891b2", dark: "#22d3ee" },
};

const SUBCATCH_FILL = { light: "rgba(37,99,235,0.08)", dark: "rgba(96,165,250,0.1)" };
const SUBCATCH_STROKE = { light: "rgba(37,99,235,0.25)", dark: "rgba(96,165,250,0.2)" };

export default function NetworkMap({ inpContent, dark }: NetworkMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [showSubcatchments, setShowSubcatchments] = useState(true);

  const mapData: MapData = useMemo(() => {
    if (!inpContent.trim()) {
      return { nodes: [], links: [], subcatchments: [], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } };
    }
    return parseInpForMap(inpContent);
  }, [inpContent]);

  useEffect(() => {
    if (mapData.nodes.length === 0) return;
    const { minX, minY, maxX, maxY } = mapData.bounds;
    setViewBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }, [mapData]);

  const toSvgY = useCallback((y: number) => {
    const { minY, maxY } = mapData.bounds;
    return maxY - (y - minY) + minY;
  }, [mapData.bounds]);

  const nodeRadius = useMemo(() => {
    const range = Math.max(viewBox.w, viewBox.h);
    return Math.max(range * 0.004, 2);
  }, [viewBox]);

  const fontSize = useMemo(() => {
    return Math.max(viewBox.w * 0.008, 4);
  }, [viewBox]);

  const linkWidth = useMemo(() => {
    return Math.max(viewBox.w * 0.002, 1);
  }, [viewBox]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;

    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;

    setViewBox({
      x: viewBox.x + (viewBox.w - newW) * mx,
      y: viewBox.y + (viewBox.h - newH) * my,
      w: newW,
      h: newH,
    });
  }, [viewBox]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = (e.clientX - panStart.x) / rect.width * viewBox.w;
    const dy = (e.clientY - panStart.y) / rect.height * viewBox.h;
    setViewBox((v) => ({ ...v, x: panStart.vx - dx, y: panStart.vy - dy }));
  }, [isPanning, panStart, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    const { minX, minY, maxX, maxY } = mapData.bounds;
    setViewBox({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }, [mapData.bounds]);

  const coordMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of mapData.nodes) {
      m.set(n.id, { x: n.x, y: toSvgY(n.y) });
    }
    return m;
  }, [mapData.nodes, toSvgY]);

  if (mapData.nodes.length === 0) {
    return (
      <div className="sim-map-empty">
        <p>No coordinate data found in this model. The [COORDINATES] section is required to render a network map.</p>
      </div>
    );
  }

  const theme = dark ? "dark" : "light";

  return (
    <div className="sim-map-container" ref={containerRef}>
      <div className="sim-map-toolbar">
        <button className="sim-map-tool-btn" onClick={resetView} title="Reset view">
          Fit
        </button>
        <label className="sim-map-toggle">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          Labels
        </label>
        <label className="sim-map-toggle">
          <input type="checkbox" checked={showSubcatchments} onChange={(e) => setShowSubcatchments(e.target.checked)} />
          Subcatchments
        </label>
        <span className="sim-map-stats">
          {mapData.nodes.length} nodes · {mapData.links.length} links
          {mapData.subcatchments.length > 0 && ` · ${mapData.subcatchments.length} subcatchments`}
        </span>
      </div>

      <svg
        ref={svgRef}
        className="sim-map-svg"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
      >
        {showSubcatchments && mapData.subcatchments.map((sc) => {
          if (sc.polygon.length < 3) return null;
          const points = sc.polygon.map((p) => `${p.x},${toSvgY(p.y)}`).join(" ");
          return (
            <polygon
              key={`sc-${sc.id}`}
              points={points}
              fill={SUBCATCH_FILL[theme]}
              stroke={SUBCATCH_STROKE[theme]}
              strokeWidth={linkWidth * 0.5}
            />
          );
        })}

        {mapData.links.map((link) => {
          const from = coordMap.get(link.from);
          const to = coordMap.get(link.to);
          if (!from || !to) return null;

          const allPoints = [from, ...link.vertices.map((v) => ({ x: v.x, y: toSvgY(v.y) })), to];
          const pathData = allPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
          const color = LINK_COLORS[link.type]?.[theme] || LINK_COLORS.conduit[theme];
          const isHovered = hoveredLink === link.id;

          return (
            <path
              key={`link-${link.id}`}
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? linkWidth * 2.5 : linkWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              onMouseEnter={() => setHoveredLink(link.id)}
              onMouseLeave={() => setHoveredLink(null)}
              style={{ pointerEvents: "stroke" }}
            />
          );
        })}

        {mapData.nodes.map((node) => {
          const color = NODE_COLORS[node.type]?.[theme] || NODE_COLORS.junction[theme];
          const sy = toSvgY(node.y);
          const isOutfall = node.type === "outfall";
          const isStorage = node.type === "storage";
          const r = isOutfall || isStorage ? nodeRadius * 1.4 : nodeRadius;

          return (
            <g
              key={`node-${node.id}`}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {isOutfall ? (
                <polygon
                  points={`${node.x},${sy - r} ${node.x + r},${sy + r * 0.6} ${node.x - r},${sy + r * 0.6}`}
                  fill={color}
                  stroke={dark ? "#1a1a1e" : "#fff"}
                  strokeWidth={linkWidth * 0.5}
                />
              ) : isStorage ? (
                <rect
                  x={node.x - r}
                  y={sy - r * 0.7}
                  width={r * 2}
                  height={r * 1.4}
                  rx={r * 0.2}
                  fill={color}
                  stroke={dark ? "#1a1a1e" : "#fff"}
                  strokeWidth={linkWidth * 0.5}
                />
              ) : (
                <circle
                  cx={node.x}
                  cy={sy}
                  r={r}
                  fill={color}
                  stroke={dark ? "#1a1a1e" : "#fff"}
                  strokeWidth={linkWidth * 0.5}
                />
              )}
              {showLabels && (
                <text
                  x={node.x}
                  y={sy - r * 1.6}
                  textAnchor="middle"
                  fill={dark ? "#aaa" : "#555"}
                  fontSize={fontSize}
                  fontFamily="'DM Sans', sans-serif"
                  style={{ pointerEvents: "none" }}
                >
                  {node.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hoveredNode && (
        <div
          className="sim-map-tooltip"
          style={{ left: mousePos.x + 12, top: mousePos.y - 10 }}
        >
          <strong>{hoveredNode.id}</strong>
          <span className="sim-map-tooltip-type">{hoveredNode.type}</span>
          {hoveredNode.elevation != null && <span>Elev: {hoveredNode.elevation}</span>}
          {hoveredNode.maxDepth != null && <span>Max Depth: {hoveredNode.maxDepth}</span>}
        </div>
      )}

      {hoveredLink && (
        <div
          className="sim-map-tooltip"
          style={{ left: mousePos.x + 12, top: mousePos.y - 10 }}
        >
          <strong>{hoveredLink}</strong>
          <span className="sim-map-tooltip-type">
            {mapData.links.find((l) => l.id === hoveredLink)?.type}
          </span>
          <span>
            {mapData.links.find((l) => l.id === hoveredLink)?.from} → {mapData.links.find((l) => l.id === hoveredLink)?.to}
          </span>
        </div>
      )}

      <div className="sim-map-legend">
        <span className="sim-map-legend-title">Legend</span>
        <div className="sim-map-legend-items">
          {Object.entries(NODE_COLORS).map(([type, c]) => (
            <span key={type} className="sim-map-legend-item">
              <span className="sim-map-legend-swatch" style={{ background: c[theme], borderRadius: type === "junction" ? "50%" : "2px" }} />
              {type}
            </span>
          ))}
          {Object.entries(LINK_COLORS).map(([type, c]) => (
            <span key={type} className="sim-map-legend-item">
              <span className="sim-map-legend-line" style={{ background: c[theme] }} />
              {type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
