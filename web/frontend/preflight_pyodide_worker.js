/* multiACE in-browser preflight - Pyodide worker.
 *
 * The Python post-processor and preflight core run in a Web Worker. G-code is
 * copied into MEMFS in bounded chunks and rewritten output is transferred in
 * bounded binary chunks, so a large file never becomes a second giant JS
 * string on the main thread.
 *
 * Message contract:
 *   <- {type:"init", pyodideIndexURL, postprocessSrc, coreSrc}
 *   -> {type:"ready"}                                   (or {type:"error"})
 *   <- {type:"analyze", jobId, file, liveSlots, headCtx}
 *   -> {type:"analyze-done", jobId, report}             (+ {type:"progress"})
 *   <- {type:"rewrite", jobId, liveSlots, headCtx, mode, remapOverride,
 *                        headAssignment, headPlan, bedMesh, camera}
 *   -> {type:"rewrite-chunk", jobId, chunk, done, total}
 *   -> {type:"rewrite-done", jobId, size}               (+ {type:"progress"})
 *   <- {type:"clear", jobId}        ->  {type:"cleared", jobId}
 *
 * liveSlots / headCtx are produced by the main thread from /multiace/api/state
 * (the printer remains the source of live ACE/slot identity).
 */
"use strict";

let pyodide = null;
let ready = false;
let initPromise = null;

const INPUT_CHUNK_SIZE = 4 * 1024 * 1024;
const OUTPUT_CHUNK_SIZE = 2 * 1024 * 1024;

// Keep the File for retrying a different plan, but keep its MEMFS copy as the
// single source file. The rewrite path never converts the whole file to text.
const files = new Map();
const filePaths = new Map();
const slotsByJob = new Map();
const ctxByJob = new Map();

function progress(jobId, stage, percent) {
  self.postMessage({type: "progress", jobId, stage, percent});
}

async function ensureInit(msg) {
  if (ready) return;
  if (!initPromise) {
    initPromise = (async () => {
      const indexURL = msg.pyodideIndexURL ||
        "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/";
      importScripts(indexURL + "pyodide.js");
      pyodide = await self.loadPyodide({indexURL});
      pyodide.FS.mkdirTree("/multiace");
      pyodide.FS.writeFile(
        "/multiace/post_process_virtual_toolheads.py", msg.postprocessSrc);
      pyodide.FS.writeFile("/multiace/preflight_core.py", msg.coreSrc);
      pyodide.runPython(`
import sys, json
sys.path.insert(0, "/multiace")
import post_process_virtual_toolheads as _pp
import preflight_core as _core
`);
      ready = true;
    })();
  }
  await initPromise;
}

function safeJobStem(jobId) {
  const stem = String(jobId || "job").replace(/[^A-Za-z0-9_-]/g, "_");
  return stem.slice(0, 80) || "job";
}

function pathsForJob(jobId) {
  const base = "/preflight/" + safeJobStem(jobId);
  return {
    src: base + ".src.gcode",
    a: base + ".a.gcode",
    b: base + ".b.gcode",
    prefs: base + ".prefs.gcode",
  };
}

function unlinkIfPresent(path) {
  if (!path || !pyodide) return;
  try { pyodide.FS.unlink(path); } catch (_) {}
}

async function cacheFileInMemfs(jobId, file) {
  const cached = filePaths.get(jobId);
  if (cached) return cached;
  if (!file || typeof file.slice !== "function") {
    throw new Error("missing G-code file");
  }
  const paths = pathsForJob(jobId);
  pyodide.FS.mkdirTree("/preflight");
  unlinkIfPresent(paths.src);
  const total = Number(file.size || 0);
  if (!total) throw new Error("empty G-code file");

  let stream = null;
  let written = 0;
  try {
    stream = pyodide.FS.open(paths.src, "w");
    while (written < total) {
      const end = Math.min(total, written + INPUT_CHUNK_SIZE);
      const chunk = new Uint8Array(
        await file.slice(written, end).arrayBuffer());
      if (!chunk.length) throw new Error("G-code file read ended early");
      pyodide.FS.write(stream, chunk, 0, chunk.length);
      written += chunk.length;
      progress(jobId, "analyze", 5 + Math.round((written / total) * 30));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } catch (err) {
    unlinkIfPresent(paths.src);
    throw err;
  } finally {
    if (stream) {
      try { pyodide.FS.close(stream); } catch (_) {}
    }
  }
  files.set(jobId, file);
  filePaths.set(jobId, paths.src);
  return paths.src;
}

async function streamMemfsFile(jobId, path) {
  const stat = pyodide.FS.stat(path);
  const total = Number(stat.size || 0);
  let stream = null;
  let sent = 0;
  try {
    stream = pyodide.FS.open(path, "r");
    while (sent < total) {
      const want = Math.min(OUTPUT_CHUNK_SIZE, total - sent);
      const chunk = new Uint8Array(want);
      const count = pyodide.FS.read(stream, chunk, 0, want);
      if (!count) break;
      const payload = count === chunk.length ? chunk : chunk.slice(0, count);
      self.postMessage({
        type: "rewrite-chunk", jobId, chunk: payload.buffer,
        done: sent + count, total,
      }, [payload.buffer]);
      sent += count;
      progress(jobId, "upload",
        85 + Math.round((sent / Math.max(total, 1)) * 14));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  } finally {
    if (stream) {
      try { pyodide.FS.close(stream); } catch (_) {}
    }
  }
  return sent;
}

function preparePrintPreferenceFile(finalPath, paths, bedMesh, camera) {
  pyodide.globals.set("_final_path", finalPath);
  pyodide.globals.set("_prefs_path", paths.prefs);
  pyodide.globals.set("_bed_mesh", !!bedMesh);
  pyodide.globals.set("_camera", !!camera);
  return pyodide.runPython(`
if _bed_mesh or _camera:
    _prefs_line = ("SET_PRINT_PREFERENCES BED_LEVEL=%d FLOW_CALIBRATE=0 "
                   "TIME_LAPSE_CAMERA=%d FORCE=1" %
                   (1 if _bed_mesh else 0, 1 if _camera else 0))
    with open(_final_path, "r", encoding="utf-8", errors="replace") as _src, \
         open(_prefs_path, "w", encoding="utf-8") as _dst:
        _dst.write("; multiACE preflight: print preferences\\n")
        _dst.write(_prefs_line + "\\n")
        for _line in _src:
            if _line.lstrip().upper().startswith("SET_PRINT_PREFERENCES"):
                _dst.write("; multiACE disabled: " + _line.lstrip())
            else:
                _dst.write(_line)
    _output_path = _prefs_path
else:
    _output_path = _final_path
str(_output_path)
`);
}

async function doAnalyze(jobId, file, liveSlots, headCtx) {
  const srcPath = await cacheFileInMemfs(jobId, file);
  slotsByJob.set(jobId, liveSlots);
  ctxByJob.set(jobId, headCtx);
  progress(jobId, "analyze", 40);

  const py = pyodide;
  py.globals.set("_src_path", srcPath);
  py.globals.set("_live", JSON.stringify(liveSlots || []));
  py.globals.set("_hctx", JSON.stringify(headCtx || {mode: "multi"}));
  py.globals.set("_fname", file.name || "upload.gcode");
  py.globals.set("_fsize", Number(file.size || 0));
  const reportJson = py.runPython(`
_live_slots = json.loads(_live)
_head_ctx   = json.loads(_hctx)
with open(_src_path, "r", encoding="utf-8", errors="replace") as _src:
    _colors, _types, _naces, _used, _plan = _core.parse_meta(_pp, _src)
_report = _core.build_report(
    _pp,
    slicer_colors=_colors, slicer_types=_types, num_aces=_naces,
    plan_proxy=_plan, live_slots=_live_slots, head_ctx=_head_ctx,
    token="", filename=_fname, size=int(_fsize))
json.dumps(_report)
`);
  py.runPython("del _plan, _src_path, _live, _hctx, _fname, _fsize\n");
  progress(jobId, "done", 100);
  return JSON.parse(reportJson);
}

// Rewrite: run the full pipeline in MEMFS, then transfer the result in
// bounded binary chunks instead of returning one giant JS string.
async function doRewrite(jobId, msg) {
  const file = files.get(jobId) || msg.file;
  const srcPath = await cacheFileInMemfs(jobId, file);
  const liveSlots = slotsByJob.get(jobId) || msg.liveSlots || [];
  const headCtx = slotsByJob.has(jobId)
    ? (ctxByJob.get(jobId) || {mode: "multi"})
    : (msg.headCtx || {mode: "multi"});
  const mode = msg.mode || "slicer";
  const paths = pathsForJob(jobId);

  progress(jobId, "analyze", 2);
  const py = pyodide;
  py.FS.mkdirTree("/preflight");
  py.globals.set("_src_path", srcPath);
  py.globals.set("_tmp_a", paths.a);
  py.globals.set("_tmp_b", paths.b);
  py.globals.set("_live", JSON.stringify(liveSlots));
  py.globals.set("_hctx", JSON.stringify(headCtx));
  py.globals.set("_mode", mode);
  py.globals.set("_remap", JSON.stringify(msg.remapOverride || null));
  py.globals.set("_hassign", JSON.stringify(msg.headAssignment || null));
  py.globals.set("_hplan", msg.headPlan || "loadout");

  const onStage = (stage, percent) => progress(jobId, stage, percent);
  py.globals.set("_on_stage", onStage);

  progress(jobId, "rewrite", 10);
  const finalPath = py.runPython(`
_live_slots = json.loads(_live)
_head_ctx   = json.loads(_hctx)
_remap_ov   = json.loads(_remap)
_hassign_ov = json.loads(_hassign)
with open(_src_path, "r", encoding="utf-8", errors="replace") as _src:
    _colors, _types, _naces, _used, _plan = _core.parse_meta(_pp, _src)
_final = _core.rewrite_pipeline(
    _pp,
    src_path=_src_path, tmp_a=_tmp_a, tmp_b=_tmp_b,
    slicer_colors=_colors, slicer_types=_types, num_aces=_naces,
    live_slots=_live_slots, head_ctx=_head_ctx, mode=_mode,
    remap_override=_remap_ov, head_assignment=_hassign_ov, head_plan=_hplan,
    set_stage=lambda s, p: _on_stage(s, p))
str(_final)
`);
  const outputPath = preparePrintPreferenceFile(
    finalPath, paths, msg.bedMesh, msg.camera);
  const size = await streamMemfsFile(jobId, outputPath);

  // Keep the source for a retry; discard generated copies immediately.
  unlinkIfPresent(paths.a);
  unlinkIfPresent(paths.b);
  unlinkIfPresent(paths.prefs);
  py.runPython(
    "del _src_path, _tmp_a, _tmp_b, _live, _hctx, _mode, _remap, " +
    "_hassign, _hplan, _on_stage, _final, _plan\n");
  progress(jobId, "done", 100);
  return {size};
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  const jobId = msg.jobId || "job";
  try {
    if (msg.type === "init") {
      await ensureInit(msg);
      self.postMessage({type: "ready"});
      return;
    }
    if (msg.type === "analyze") {
      await ensureInit(msg);
      const report = await doAnalyze(jobId, msg.file, msg.liveSlots, msg.headCtx);
      self.postMessage({type: "analyze-done", jobId, report});
      return;
    }
    if (msg.type === "rewrite") {
      await ensureInit(msg);
      const result = await doRewrite(jobId, msg);
      self.postMessage({type: "rewrite-done", jobId, size: result.size});
      return;
    }
    if (msg.type === "clear") {
      const paths = pathsForJob(jobId);
      unlinkIfPresent(paths.src);
      unlinkIfPresent(paths.a);
      unlinkIfPresent(paths.b);
      unlinkIfPresent(paths.prefs);
      files.delete(jobId);
      filePaths.delete(jobId);
      slotsByJob.delete(jobId);
      ctxByJob.delete(jobId);
      self.postMessage({type: "cleared", jobId});
      return;
    }
  } catch (err) {
    self.postMessage({
      type: "error", jobId,
      message: err && err.message ? err.message : String(err),
    });
  }
};
