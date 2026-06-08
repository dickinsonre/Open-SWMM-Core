# Open-SWMM-Core

[
[
[
[

Repository for the Replit project: [Open-SWMM-Core](https://replit.com/@robertdickinson/Open-SWMM-Core).[1]

This repository appears to be an experimental **web-based SWMM runtime and interface project** centered on building and running **OpenSWMMCore/WebAssembly** components in the browser.[1] The visible repository structure, commit messages, and package-management files suggest a TypeScript-based monorepo that includes browser artifacts, scripts, sample models, and an in-browser SWMM simulator workflow.[1]

## Overview

Open-SWMM-Core looks like a prototype application intended to expose SWMM simulation capabilities through a modern web stack rather than a traditional desktop-only workflow.[1] The most informative visible commit messages mention:

- **“Add in-browser SWMM simulator for running WASM models.”**[1]
- **“Add multiple sample models to the simulator.”**[1]
- **“Update simulation engine to use OpenSWMMCore for building the WebAssembly…”**[1]

Taken together, those commits strongly suggest that this project is focused on using **OpenSWMMCore** as the simulation engine behind a **browser-delivered SWMM experience**, likely driven through WebAssembly builds and a TypeScript front end.[1]

## Why this repo matters

A browser-based SWMM engine can support lightweight demonstrations, educational tools, deployment-free model execution, and faster experimentation with user interfaces for model setup and result review.[1] For SWMM practitioners, a project like this could become the foundation for interactive web apps that run simulation logic client-side instead of depending entirely on desktop executables or server-side processing.[1]

## Repository structure

The top-level repository structure currently shown on GitHub is:[1]

```text
Open-SWMM-Core/
├── artifacts/            # Build outputs or generated browser/runtime artifacts
├── attached_assets/      # Sample models or static assets used by the app
├── lib/                  # Library code
├── scripts/              # Build and support scripts
├── .gitignore
├── .npmrc
├── .replit
├── .replitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── replit.md
├── replit.nix
├── tsconfig.base.json
└── tsconfig.json
```

This structure points to a **pnpm-managed workspace/monorepo** with TypeScript configuration shared across packages or subprojects.[1] The presence of `artifacts/`, `scripts/`, and `attached_assets/` also suggests a build pipeline that produces compiled outputs and includes example or demo data for the simulator.[1]

## Technology stack

Based on the visible files and GitHub language breakdown, the project likely uses:[1]

- **TypeScript** as the primary development language.[1]
- **pnpm workspaces** for monorepo dependency management, indicated by `pnpm-workspace.yaml` and `pnpm-lock.yaml`.[1]
- **Replit** for development or hosting, indicated by `.replit`, `replit.md`, and `replit.nix`.[1]
- **WebAssembly-oriented build steps**, implied by the simulator-related commit messages and the reference to using OpenSWMMCore for building the WebAssembly engine.[1]
- **HTML and CSS** for the browser-based interface, as reflected in the language breakdown reported by GitHub.[1]

GitHub currently reports the repo language mix as **85.1% TypeScript**, **8.2% HTML**, **5.6% CSS**, and **1.1% other**.[1]

## Development history

The visible history shows **14 commits** on the `main` branch.[1] Key milestones visible from the repository page include:

- Initial project setup.[1]
- Addition of an in-browser SWMM simulator for WASM models.[1]
- Addition of multiple sample models for the simulator.[1]
- A later update that switched the simulation engine to **OpenSWMMCore** for the WebAssembly build path.[1]

That sequence suggests the project matured from a general prototype into something more specifically tied to the OpenSWMMCore engine and browser simulation delivery.[1]

## Likely capabilities

Although the code internals were not inspected directly, the visible repository cues suggest the project may support capabilities such as:[1]

- Loading or bundling sample SWMM models in a web interface.[1]
- Running SWMM simulations in-browser using WebAssembly.[1]
- Demonstrating OpenSWMMCore as a portable simulation backend.[1]
- Using generated artifacts for deployment or preview workflows.[1]
- Supporting scripts that build, package, or prepare the runtime environment.[1]

This would make the repository especially interesting for people exploring **browser-native hydraulic modeling workflows**, educational simulators, or new SWMM front-end concepts.[1]

## Current status

At the moment, the repository should be treated as a **prototype** or **experimental development repo**.[1] GitHub shows **1 branch**, **0 tags**, **no releases**, **no packages**, **0 stars**, **0 forks**, and **1 contributor** listed as `@replit-agent`.[1] There is also currently **no README**, so the project lacks first-party onboarding documentation despite already having a meaningful structure and visible feature history.[1]

## Getting started

Because the repository contains `package.json` and uses `pnpm`, the likely setup flow is:

```bash
git clone https://github.com/dickinsonre/Open-SWMM-Core.git
cd Open-SWMM-Core
pnpm install
pnpm dev
```

If `pnpm` is not installed, you can install it first with:

```bash
npm install -g pnpm
```

The exact workspace scripts would need to be confirmed from `package.json`, but the presence of `pnpm-workspace.yaml` makes `pnpm` the most likely package manager for development.[1]

## Likely development workflow

A reasonable interpretation of the repository workflow is:[1]

1. Use `scripts/` to build or prepare the WebAssembly-enabled runtime.[1]
2. Use `lib/` for shared logic or library components.[1]
3. Use `attached_assets/` for example models or demo resources.[1]
4. Generate outputs into `artifacts/` for browser execution or deployment.[1]
5. Run and test the simulator through a Replit or local browser-based workflow.[1]

This is consistent with the folder layout and the commit messages visible on the repo page.[1]

## Suggested next documentation improvements

This README can be strengthened further once the code files are inspected directly. The most helpful additions would be:

- Exact `pnpm` scripts from `package.json`.[1]
- Clear explanation of what **OpenSWMMCore** is in the context of this repo.[1]
- Screenshots or a short GIF of the browser-based simulator.[1]
- Notes on how the WebAssembly build is produced.[1]
- Description of the sample models included in `attached_assets/`.[1]
- A small architecture diagram showing source code, build scripts, WASM output, and browser UI.[1]

## Replit link

The original hosted or source project is linked from the repository description here: [replit.com/@robertdickinson/Open-SWMM-Core](https://replit.com/@robertdickinson/Open-SWMM-Core).[1]

## License

No explicit license is visible on the repository page right now, so reuse and redistribution terms should be clarified by adding a `LICENSE` file if the project is intended to be openly reusable.[1]
