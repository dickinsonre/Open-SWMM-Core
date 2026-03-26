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
}

let modulePromise: Promise<SwmmModule> | null = null;

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
    return instance;
  })();
  modulePromise = p;
  p.catch(() => { modulePromise = null; });
  return p;
}

export interface SwmmResult {
  exitCode: number;
  reportText: string;
  errorMessage?: string;
}

export async function runSwmmSimulation(inpContent: string): Promise<SwmmResult> {
  const swmm = await loadSwmm();

  swmm.FS.writeFile("/input.inp", inpContent);

  const swmm_run = swmm.cwrap("swmm_run", "number", ["string", "string", "string"]);
  const exitCode = swmm_run("/input.inp", "/output.rpt", "/output.out");

  let reportText = "";
  try {
    reportText = swmm.FS.readFile("/output.rpt", { encoding: "utf8" }) as string;
  } catch {
    reportText = "";
  }

  let errorMessage: string | undefined;
  if (exitCode !== 0) {
    errorMessage = `SWMM exited with code ${exitCode}`;
  }

  try { swmm.FS.unlink("/input.inp"); } catch {}
  try { swmm.FS.unlink("/output.rpt"); } catch {}
  try { swmm.FS.unlink("/output.out"); } catch {}

  return { exitCode, reportText, errorMessage };
}
