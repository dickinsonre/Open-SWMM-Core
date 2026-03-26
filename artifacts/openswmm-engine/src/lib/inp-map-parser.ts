export interface MapNode {
  id: string;
  x: number;
  y: number;
  type: "junction" | "outfall" | "storage" | "divider";
  elevation?: number;
  maxDepth?: number;
}

export interface MapLink {
  id: string;
  from: string;
  to: string;
  type: "conduit" | "pump" | "orifice" | "weir" | "outlet";
  vertices: { x: number; y: number }[];
}

export interface MapSubcatchment {
  id: string;
  outlet: string;
  polygon: { x: number; y: number }[];
}

export interface MapData {
  nodes: MapNode[];
  links: MapLink[];
  subcatchments: MapSubcatchment[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function parseSection(text: string, sectionName: string): string[] {
  const pattern = new RegExp(`\\[${sectionName}\\]`, "i");
  const match = text.search(pattern);
  if (match === -1) return [];
  const afterHeader = text.substring(match);
  const lines = afterHeader.split("\n").slice(1);
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) break;
    if (!trimmed || trimmed.startsWith(";;")) continue;
    result.push(trimmed);
  }
  return result;
}

function splitFields(line: string): string[] {
  return line.split(/\s+/).filter(Boolean);
}

export function parseInpForMap(inpText: string): MapData {
  const coords = new Map<string, { x: number; y: number }>();
  const nodes: MapNode[] = [];
  const links: MapLink[] = [];
  const subcatchments: MapSubcatchment[] = [];

  for (const line of parseSection(inpText, "COORDINATES")) {
    const fields = splitFields(line);
    if (fields.length >= 3) {
      const x = parseFloat(fields[1]);
      const y = parseFloat(fields[2]);
      if (!isNaN(x) && !isNaN(y)) {
        coords.set(fields[0], { x, y });
      }
    }
  }

  if (coords.size === 0) {
    return { nodes: [], links: [], subcatchments: [], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 } };
  }

  const junctionIds = new Set<string>();
  for (const line of parseSection(inpText, "JUNCTIONS")) {
    const fields = splitFields(line);
    if (fields.length >= 2) {
      junctionIds.add(fields[0]);
      const coord = coords.get(fields[0]);
      if (coord) {
        nodes.push({
          id: fields[0],
          x: coord.x,
          y: coord.y,
          type: "junction",
          elevation: parseFloat(fields[1]) || undefined,
          maxDepth: parseFloat(fields[2]) || undefined,
        });
      }
    }
  }

  for (const line of parseSection(inpText, "OUTFALLS")) {
    const fields = splitFields(line);
    if (fields.length >= 2) {
      const coord = coords.get(fields[0]);
      if (coord) {
        nodes.push({
          id: fields[0],
          x: coord.x,
          y: coord.y,
          type: "outfall",
          elevation: parseFloat(fields[1]) || undefined,
        });
      }
    }
  }

  for (const line of parseSection(inpText, "STORAGE")) {
    const fields = splitFields(line);
    if (fields.length >= 2) {
      const coord = coords.get(fields[0]);
      if (coord) {
        nodes.push({
          id: fields[0],
          x: coord.x,
          y: coord.y,
          type: "storage",
          elevation: parseFloat(fields[1]) || undefined,
        });
      }
    }
  }

  for (const line of parseSection(inpText, "DIVIDERS")) {
    const fields = splitFields(line);
    if (fields.length >= 2) {
      const coord = coords.get(fields[0]);
      if (coord) {
        nodes.push({
          id: fields[0],
          x: coord.x,
          y: coord.y,
          type: "divider",
          elevation: parseFloat(fields[1]) || undefined,
        });
      }
    }
  }

  const nodeSet = new Set(nodes.map((n) => n.id));
  for (const [id, c] of coords) {
    if (!nodeSet.has(id)) {
      nodes.push({ id, x: c.x, y: c.y, type: "junction" });
    }
  }

  const verticesMap = new Map<string, { x: number; y: number }[]>();
  for (const line of parseSection(inpText, "VERTICES")) {
    const fields = splitFields(line);
    if (fields.length >= 3) {
      const x = parseFloat(fields[1]);
      const y = parseFloat(fields[2]);
      if (!isNaN(x) && !isNaN(y)) {
        if (!verticesMap.has(fields[0])) verticesMap.set(fields[0], []);
        verticesMap.get(fields[0])!.push({ x, y });
      }
    }
  }

  const linkSections: { section: string; type: MapLink["type"] }[] = [
    { section: "CONDUITS", type: "conduit" },
    { section: "PUMPS", type: "pump" },
    { section: "ORIFICES", type: "orifice" },
    { section: "WEIRS", type: "weir" },
    { section: "OUTLETS", type: "outlet" },
  ];

  for (const { section, type } of linkSections) {
    for (const line of parseSection(inpText, section)) {
      const fields = splitFields(line);
      if (fields.length >= 3) {
        links.push({
          id: fields[0],
          from: fields[1],
          to: fields[2],
          type,
          vertices: verticesMap.get(fields[0]) || [],
        });
      }
    }
  }

  const polygonMap = new Map<string, { x: number; y: number }[]>();
  for (const line of parseSection(inpText, "Polygons")) {
    const fields = splitFields(line);
    if (fields.length >= 3) {
      const x = parseFloat(fields[1]);
      const y = parseFloat(fields[2]);
      if (!isNaN(x) && !isNaN(y)) {
        if (!polygonMap.has(fields[0])) polygonMap.set(fields[0], []);
        polygonMap.get(fields[0])!.push({ x, y });
      }
    }
  }

  for (const line of parseSection(inpText, "SUBCATCHMENTS")) {
    const fields = splitFields(line);
    if (fields.length >= 3) {
      subcatchments.push({
        id: fields[0],
        outlet: fields[2],
        polygon: polygonMap.get(fields[0]) || [],
      });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  for (const l of links) {
    for (const v of l.vertices) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
    }
  }
  for (const s of subcatchments) {
    for (const p of s.polygon) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  const pad = (maxX - minX) * 0.05 || 50;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  return { nodes, links, subcatchments, bounds: { minX, minY, maxX, maxY } };
}
