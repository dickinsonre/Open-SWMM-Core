#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OPENSWMM_SRC="/tmp/openswmm6"
OUTPUT_DIR="$PROJECT_DIR/public/wasm"
BUILD_DIR="/tmp/openswmm-wasm-build"

if [ ! -d "$OPENSWMM_SRC" ]; then
  echo "Cloning OpenSWMMCore (swmm6_rel branch)..."
  git clone --branch swmm6_rel --depth 1 \
    https://github.com/HydroCouple/OpenSWMMCore.git "$OPENSWMM_SRC"
fi

SRC_DIR="$OPENSWMM_SRC/src/legacy/engine"
INCLUDE_DIR="$OPENSWMM_SRC/include/openswmm/legacy/engine"

mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

cat > "$BUILD_DIR/openswmmcore_solver_export.h" << 'EOF'
#ifndef OPENSWMMCORE_SOLVER_EXPORT_H
#define OPENSWMMCORE_SOLVER_EXPORT_H
#define EXPORT_OPENSWMMCORE_SOLVER_API
#endif
EOF

cat > "$BUILD_DIR/version.h" << 'EOF'
#ifndef OPENSWMM_VERSION_H
#define OPENSWMM_VERSION_H

#define OPENSWMM_PROJECT_NAME        "OpenSWMMCore"
#define OPENSWMM_VERSION_MAJOR       6
#define OPENSWMM_VERSION_MINOR       0
#define OPENSWMM_VERSION_PATCH       0
#define OPENSWMM_VERSION             "6.0.0"
#define OPENSWMM_VERSION_PRERELEASE  "alpha.1"
#define OPENSWMM_VERSION_FULL        "6.0.0-alpha.1"
#define OPENSWMM_VERSION_INT         (6 * 10000 + 0 * 1000 + 0)
#define OPENSWMM_BUILD_COMMIT        "wasm"
#define OPENSWMM_BUILD_DATE          ""
#define OPENSWMM_BUILD_BRANCH        "swmm6_rel"

#define PROJECT_NAME                 OPENSWMM_PROJECT_NAME
#define PROJECT_VERSION_MAJOR        OPENSWMM_VERSION_MAJOR
#define PROJECT_VERSION_MINOR        OPENSWMM_VERSION_MINOR
#define PROJECT_VERSION_PATCH        OPENSWMM_VERSION_PATCH
#define PROJECT_VERSION              OPENSWMM_VERSION
#define PROJECT_VERSION_PRERELEASE   OPENSWMM_VERSION_PRERELEASE
#define PROJECT_VERSION_FULL         OPENSWMM_VERSION_FULL
#define PROJECT_VERSION_SWMM_FORMAT  OPENSWMM_VERSION_INT
#define BUILD_COMMIT                 OPENSWMM_BUILD_COMMIT
#define BUILD_DATE                   OPENSWMM_BUILD_DATE
#define BUILD_BRANCH                 OPENSWMM_BUILD_BRANCH

#endif
EOF

EM_CACHE_DIR="/tmp/emcache_openswmm"
if [ -d "$EM_CACHE_DIR" ]; then
  export EM_CACHE="$EM_CACHE_DIR"
fi

echo "Compiling OpenSWMM legacy engine to WebAssembly..."
echo "Source: $SRC_DIR"

SOURCES=$(ls "$SRC_DIR"/*.c)

emcc \
  $SOURCES \
  -I"$SRC_DIR" \
  -I"$INCLUDE_DIR" \
  -I"$BUILD_DIR" \
  -o "$BUILD_DIR/swmm5.js" \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='createSwmmModule' \
  -s EXPORT_ES6=0 \
  -s EXPORTED_FUNCTIONS='["_swmm_run","_swmm_open","_swmm_start","_swmm_step","_swmm_end","_swmm_report","_swmm_close","_swmm_stride","_swmm_getVersion","_swmm_getCount","_swmm_setValue","_swmm_getMassBalErr","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","FS","getValue","setValue"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=33554432 \
  -s MAXIMUM_MEMORY=536870912 \
  -s NO_EXIT_RUNTIME=1 \
  -s FORCE_FILESYSTEM=1 \
  -Wl,--allow-multiple-definition \
  -O2 \
  -DCMI \
  -DNO_OPENMP

cp "$BUILD_DIR/swmm5.js" "$OUTPUT_DIR/swmm5.js"
cp "$BUILD_DIR/swmm5.wasm" "$OUTPUT_DIR/swmm5.wasm"

echo "Build complete!"
ls -lh "$OUTPUT_DIR/swmm5.js" "$OUTPUT_DIR/swmm5.wasm"
