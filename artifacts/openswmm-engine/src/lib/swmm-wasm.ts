export interface SwmmModule {
  cwrap: (name: string, returnType: string, argTypes: string[]) => (...args: any[]) => any;
  ccall: (name: string, returnType: string, argTypes: string[], args: any[]) => any;
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
    unlink: (path: string) => void;
  };
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  HEAPF64: Float64Array;
  getValue: (ptr: number, type: string) => number;
}

let modulePromise: Promise<SwmmModule> | null = null;
let cachedModule: SwmmModule | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

export async function loadSwmm(): Promise<SwmmModule> {
  if (cachedModule) return cachedModule;
  if (modulePromise) return modulePromise;

  const p = (async () => {
    const base = import.meta.env.BASE_URL || "/";
    const jsUrl = `${base}wasm/swmm5.js`;
    await loadScript(jsUrl);

    const factory = (window as any).createSwmmModule;
    if (!factory) {
      throw new Error("createSwmmModule not found after loading script");
    }

    const instance: SwmmModule = await factory({
      locateFile: (path: string) => `${base}wasm/${path}`,
    });
    cachedModule = instance;
    return instance;
  })();

  modulePromise = p;
  p.catch(() => {
    modulePromise = null;
  });
  return p;
}

export interface SwmmResult {
  exitCode: number;
  reportText: string;
  errorMessage?: string;
  stats?: {
    steps: number;
    elapsedMs: number;
  };
}

export type ProgressCallback = (phase: string, pct: number) => void;

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function readDouble(swmm: SwmmModule, ptr: number): number {
  if (typeof swmm.getValue === "function") {
    return swmm.getValue(ptr, "double");
  }
  if (swmm.HEAPF64) {
    return swmm.HEAPF64[ptr / 8];
  }
  return -1;
}

export async function runSwmmSimulation(
  inpContent: string,
  onProgress?: ProgressCallback
): Promise<SwmmResult> {
  let swmm: SwmmModule;
  onProgress?.("Loading SWMM engine...", 0);

  try {
    swmm = await loadSwmm();
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("buffer") || msg.includes("memory") || msg.includes("allocation")) {
      return {
        exitCode: -1,
        reportText: "",
        errorMessage:
          "Not enough memory to initialize the SWMM engine. " +
          "Try opening this page in a full browser tab (not an embedded iframe) " +
          "or close other tabs to free memory, then reload and try again.",
      };
    }
    return {
      exitCode: -1,
      reportText: "",
      errorMessage: `Failed to load SWMM engine: ${msg}`,
    };
  }

  onProgress?.("Preparing model...", 5);
  await yieldToUI();

  swmm.FS.writeFile("/input.inp", inpContent);

  const hasStepAPI = typeof swmm.cwrap("swmm_open", "number", ["string", "string", "string"]) === "function";

  if (hasStepAPI) {
    return runWithSteps(swmm, onProgress);
  } else {
    return runBlocking(swmm, onProgress);
  }
}

async function runWithSteps(
  swmm: SwmmModule,
  onProgress?: ProgressCallback
): Promise<SwmmResult> {
  const swmm_open = swmm.cwrap("swmm_open", "number", ["string", "string", "string"]);
  const swmm_start = swmm.cwrap("swmm_start", "number", ["number"]);
  const swmm_step = swmm.cwrap("swmm_step", "number", ["number"]);
  const swmm_end = swmm.cwrap("swmm_end", "number", []);
  const swmm_report = swmm.cwrap("swmm_report", "number", []);
  const swmm_close = swmm.cwrap("swmm_close", "number", []);

  const startWall = Date.now();

  let exitCode = swmm_open("/input.inp", "/output.rpt", "/output.out");
  if (exitCode !== 0) {
    let rpt = "";
    try { rpt = swmm.FS.readFile("/output.rpt", { encoding: "utf8" }) as string; } catch {}
    swmm_close();
    cleanup(swmm);
    return { exitCode, reportText: rpt, errorMessage: `SWMM failed to open model (code ${exitCode})` };
  }

  onProgress?.("Initializing solver...", 10);
  await yieldToUI();

  exitCode = swmm_start(1);
  if (exitCode !== 0) {
    swmm_end();
    let rpt = "";
    try { rpt = swmm.FS.readFile("/output.rpt", { encoding: "utf8" }) as string; } catch {}
    swmm_close();
    cleanup(swmm);
    return { exitCode, reportText: rpt, errorMessage: `SWMM failed to start simulation (code ${exitCode})` };
  }

  const elapsedTimePtr = swmm._malloc(8);
  let stepCount = 0;
  let lastYield = Date.now();

  onProgress?.("Running simulation...", 15);
  await yieldToUI();

  try {
    while (true) {
      exitCode = swmm_step(elapsedTimePtr);
      if (exitCode !== 0) break;

      const elapsedDays = readDouble(swmm, elapsedTimePtr);
      if (elapsedDays <= 0.0) break;

      stepCount++;

      const now = Date.now();
      if (now - lastYield > 200) {
        lastYield = now;
        const wallSec = (now - startWall) / 1000;
        const rate = stepCount / wallSec;
        const hrs = (elapsedDays * 24).toFixed(1);
        onProgress?.(
          `Simulating... ${hrs} hrs elapsed | ${stepCount.toLocaleString()} steps (${rate.toFixed(0)}/s)`,
          Math.min(15 + stepCount * 0.05, 85)
        );
        await yieldToUI();
      }
    }
  } catch {
    if (exitCode === 0) exitCode = -99;
  }

  swmm._free(elapsedTimePtr);

  onProgress?.("Generating report...", 90);
  await yieldToUI();

  swmm_end();
  swmm_report();

  onProgress?.("Reading results...", 95);
  await yieldToUI();

  let reportText = "";
  try {
    reportText = swmm.FS.readFile("/output.rpt", { encoding: "utf8" }) as string;
  } catch {}

  swmm_close();
  cleanup(swmm);

  const elapsedMs = Date.now() - startWall;

  let errorMessage: string | undefined;
  if (exitCode !== 0) {
    errorMessage = `SWMM exited with code ${exitCode}`;
  }

  onProgress?.("Complete!", 100);

  return { exitCode, reportText, errorMessage, stats: { steps: stepCount, elapsedMs } };
}

async function runBlocking(
  swmm: SwmmModule,
  onProgress?: ProgressCallback
): Promise<SwmmResult> {
  const startWall = Date.now();

  onProgress?.("Running simulation...", 20);
  await yieldToUI();

  const swmm_run = swmm.cwrap("swmm_run", "number", ["string", "string", "string"]);
  const exitCode = swmm_run("/input.inp", "/output.rpt", "/output.out");

  onProgress?.("Reading results...", 90);
  await yieldToUI();

  let reportText = "";
  try {
    reportText = swmm.FS.readFile("/output.rpt", { encoding: "utf8" }) as string;
  } catch {}

  cleanup(swmm);

  const elapsedMs = Date.now() - startWall;

  let errorMessage: string | undefined;
  if (exitCode !== 0) {
    errorMessage = `SWMM exited with code ${exitCode}`;
  }

  onProgress?.("Complete!", 100);

  return { exitCode, reportText, errorMessage, stats: { steps: 0, elapsedMs } };
}

function cleanup(swmm: SwmmModule) {
  try { swmm.FS.unlink("/input.inp"); } catch {}
  try { swmm.FS.unlink("/output.rpt"); } catch {}
  try { swmm.FS.unlink("/output.out"); } catch {}
}
