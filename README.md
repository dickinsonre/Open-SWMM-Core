# Open-SWMM-Core

An experimental in-browser SWMM (Storm Water Management Model) runtime, built around OpenSWMMCore compiled to WebAssembly. It lets you load and run SWMM simulation models directly in a web browser, with no desktop install and no server-side processing required.

Live app: https://replit.com/@robertdickinson/Open-SWMM-Core

## What's inside

The repo includes an in-browser SWMM simulator that runs WASM-compiled models, several bundled sample models for trying out the simulator without supplying your own input file, and a build pipeline that compiles OpenSWMMCore to WebAssembly and packages the resulting runtime for the browser.

## Why this exists

Most SWMM workflows still depend on a desktop executable or a server round-trip to run a simulation. This project explores what a fully client-side alternative looks like: drop a model in the browser, run it with WebAssembly, and see results without leaving the page. That approach is useful for lightweight demos, teaching tools, and quick experimentation with new front-ends for SWMM.

## Tech stack

TypeScript makes up about 85% of the codebase, with HTML and CSS handling the browser UI. Dependencies are managed with pnpm workspaces (pnpm-workspace.yaml) in a monorepo layout. The simulation engine is OpenSWMMCore compiled to WebAssembly. The project was scaffolded and developed on Replit.

## Repository layout

The lib folder holds shared library code. The scripts folder holds build and support scripts for producing the WASM runtime. The attached_assets folder holds sample SWMM models used by the simulator. The artifacts folder holds build outputs and generated runtime artifacts.

## Getting started

git clone https://github.com/dickinsonre/Open-SWMM-Core.git
cd Open-SWMM-Core
pnpm install
pnpm dev

If you don't have pnpm installed, run npm install -g pnpm first.

## Author

Robert Dickinson has spent over 50 years working in stormwater and wastewater modeling. This project is part of a broader set of tools exploring SWMM automation, scripting, and modern front-ends for hydraulic modeling.
