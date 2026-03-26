#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SWMM_SRC="/tmp/swmm-src"
OUTPUT_DIR="$PROJECT_DIR/public/wasm"

if [ ! -d "$SWMM_SRC" ]; then
  echo "Cloning EPA SWMM source..."
  git clone --depth 1 https://github.com/OpenWaterAnalytics/Stormwater-Management-Model.git "$SWMM_SRC"
fi

if [ ! -f "$SWMM_SRC/src/solver/version.h" ]; then
  echo "Creating version.h..."
  cat > "$SWMM_SRC/src/solver/version.h" << 'EOF'
#ifndef VERSION_H_
#define VERSION_H_
#define PROJECT             "SWMM"
#define ORGANIZATION        "Open_Water_Analytics"
#define VERSION             "5.2.4"
#define VERSION_MAJOR       5
#define VERSION_MINOR       2
#define VERSION_PATCH       4
#define GIT_HASH            "wasm-build"
#define PLATFORM            "Emscripten"
#define COMPILER            "emcc"
#define COMPILER_VERSION    "4.0"
#define BUILD_ID            "wasm"
#define TOOLKIT_VERSION     "1.0"
static inline int get_version_legacy() {
    return VERSION_MAJOR * 10000 + VERSION_MINOR * 1000 + VERSION_PATCH;
}
#endif
EOF
fi

if [ ! -f "$SWMM_SRC/src/solver/include/toolkit_export.h" ]; then
  echo "Creating toolkit_export.h..."
  cat > "$SWMM_SRC/src/solver/include/toolkit_export.h" << 'EOF'
#ifndef TOOLKIT_EXPORT_H
#define TOOLKIT_EXPORT_H
#define TOOLKIT_EXPORT
#define TOOLKIT_NO_EXPORT
#define EXPORT_TOOLKIT
#endif
EOF
fi

mkdir -p "$OUTPUT_DIR"

if [ -d "/tmp/emcache2" ]; then
  export EM_CACHE=/tmp/emcache2
fi

echo "Compiling SWMM to WebAssembly..."
emcc -O2 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=0 \
  -s EXPORT_NAME='createSwmmModule' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","FS"]' \
  -s EXPORTED_FUNCTIONS='["_swmm_run","_swmm_open","_swmm_start","_swmm_step","_swmm_stride","_swmm_end","_swmm_report","_swmm_close","_swmm_getMassBalErr","_swmm_getVersion","_swmm_getError","_swmm_getWarnings","_swmm_getCount","_swmm_getName","_swmm_getIndex","_swmm_getValue","_swmm_setValue","_swmm_getSavedValue","_malloc","_free"]' \
  -s ENVIRONMENT='web' \
  -I"$SWMM_SRC/src/solver/include" \
  -I"$SWMM_SRC/src/solver" \
  -I"$SWMM_SRC/src" \
  -o "$OUTPUT_DIR/swmm5.js" \
  "$SWMM_SRC"/src/solver/*.c \
  "$SWMM_SRC"/src/shared/*.c

echo "Build complete!"
ls -lh "$OUTPUT_DIR/swmm5.js" "$OUTPUT_DIR/swmm5.wasm"
