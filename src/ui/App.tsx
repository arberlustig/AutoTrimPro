import React, { useMemo, useState, useEffect } from "react";
import type {
  AudioTrack,
  ExportFormat,
  QueueItem,
  SilenceSettings,
  AnalysisResult,
} from "./types";
import { WaveformPlayer } from "./WaveformPlayer";

const defaultSettings: SilenceSettings = {
  noiseDb: -35,
  minSilenceSec: 0.5,
  minSpeechSec: 0.3,
  marginSec: 0,
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function cryptoRandomId() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SilenceSettings>(defaultSettings);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xml");
  const [exportPath, setExportPath] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [previewObjectUrls, setPreviewObjectUrls] = useState<
    Record<number, string>
  >({});
  const [analyzeProgress, setAnalyzeProgress] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.quietcut
      .getDefaultExportDir()
      .then(setExportPath)
      .catch(console.error);

    const cleanup = window.quietcut.onAnalyzeProgress((trackIndex, percent) => {
      setAnalyzeProgress((prev) => ({ ...prev, [trackIndex]: percent }));
    });
    return cleanup;
  }, []);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? null,
    [queue, selectedId],
  );
  const canAnalyze = useMemo(
    () => !!selected && !!selected.sourcePath && !busy,
    [selected, busy],
  );
  const canExport = useMemo(
    () => !!selected?.analysis && !busy,
    [selected, busy],
  );

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function resetState() {
    setQueue([]);
    setSelectedId(null);
    setPreviewUrls({});
    Object.values(previewObjectUrls).forEach((url) => URL.revokeObjectURL(url));
    setPreviewObjectUrls({});
    setAnalyzeProgress({});
    setStatus("");
    setError("");
  }

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    resetState();

    const items: QueueItem[] = Array.from(files).map((f) => ({
      id: cryptoRandomId(),
      fileName: f.name,
      selectedTrackIndices: [],
      analyzeTrackIndices: [],
      status: "queued",
    }));
    setQueue(items);
    setSelectedId(items[0]?.id ?? null);

    setBusy(true);
    try {
      for (const [idx, f] of Array.from(files).entries()) {
        setStatus(`Importing file ${idx + 1}/${files.length}…`);

        console.log("Starting import for:", f.name);
        const sourcePath = await window.quietcut.importFile(f);
        console.log("Source path resolved to:", sourcePath);

        const tracks = await window.quietcut.listAudioTracks({ sourcePath });
        setQueue((prev) =>
          prev.map((q) =>
            q.fileName === f.name && q.status === "queued"
              ? {
                  ...q,
                  sourcePath,
                  tracks,
                  status: "imported",
                  selectedTrackIndices: tracks
                    ? tracks.map((t) => t.index)
                    : [0],
                  analyzeTrackIndices:
                    tracks && tracks.length ? [tracks[0].index] : [0],
                }
              : q,
          ),
        );
      }
      setStatus("Import complete.");
      setTimeout(() => setStatus(""), 2000);
    } catch (e: any) {
      console.error("Import error:", e);
      let errorMsg = e?.message || e?.toString() || "Unknown Error";
      setError(`Failed to import: ${errorMsg}`);
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis() {
    if (!selected?.sourcePath) return;
    setBusy(true);
    setAnalyzeProgress({});
    setError("");
    setStatus("Analyzing audio...");
    try {
      const results: Record<number, AnalysisResult> = {};
      await Promise.all(
        selected.analyzeTrackIndices.map(async (trackIndex) => {
          results[trackIndex] = await window.quietcut.analyze({
            sourcePath: selected.sourcePath!,
            settings,
            trackIndex,
          });
        }),
      );
      setQueue((prev) =>
        prev.map((q) =>
          q.id === selected.id
            ? { ...q, analysis: results, status: "ready" }
            : q,
        ),
      );
      setStatus("Analysis complete. Ready for export.");
      setTimeout(() => setStatus(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function exportFile() {
    if (!selected?.analysis) return;
    const analyses = Object.values(selected.analysis);
    if (analyses.length === 0) return;

    const allSegments = analyses
      .flatMap((a) => a.keepSegments)
      .sort((a, b) => a.start - b.start);
    const mergedKeepSegments: Array<{ start: number; end: number }> = [];
    if (allSegments.length > 0) {
      mergedKeepSegments.push({ ...allSegments[0] });
      for (let i = 1; i < allSegments.length; i++) {
        const prev = mergedKeepSegments[mergedKeepSegments.length - 1];
        const curr = allSegments[i];
        if (curr.start <= prev.end) {
          prev.end = Math.max(prev.end, curr.end);
        } else {
          mergedKeepSegments.push({ ...curr });
        }
      }
    }

    const combinedAnalysis = {
      ...analyses[0],
      keepSegments: mergedKeepSegments,
      detectedSilences: [],
      audioTracks:
        selected.tracks?.filter((t) =>
          selected.selectedTrackIndices.includes(t.index),
        ) ?? [],
    };

    setBusy(true);
    setError("");
    setStatus("Exporting...");
    try {
      const out = await window.quietcut.exportCuts({
        analysis: combinedAnalysis,
        exportFormat,
        basePath: exportPath,
      });
      if (out === "cancelled") {
        setStatus("");
      } else {
        setStatus(`Export complete!`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function loadPreview(trackIndex: number) {
    if (!selected?.sourcePath) return;
    try {
      const wavPath = await window.quietcut.extractAudioPreview({
        sourcePath: selected.sourcePath,
        trackIndex,
      });
      const bytes = await window.quietcut.readFileBytes({ path: wavPath });
      const blob = new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
      const objUrl = URL.createObjectURL(blob);
      setPreviewObjectUrls((prev) => {
        if (prev[trackIndex]) URL.revokeObjectURL(prev[trackIndex]);
        return { ...prev, [trackIndex]: objUrl };
      });
      setPreviewUrls((prev) => ({ ...prev, [trackIndex]: objUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <span className="brand">AutoTrim Pro</span>
        </div>
        <button
          className="theme-btn"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </header>

      <main className="container">
        {!selected ? (
          <label className="drop">
            <input
              type="file"
              multiple
              accept="video/*,audio/*"
              style={{ display: "none" }}
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <div className="drop-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
            <div className="drop-title">Import Media</div>
            <div className="drop-subtitle">
              Click to select files or drag them here
            </div>
            <span className="btn btn-primary">Select Files</span>
          </label>
        ) : (
          <>
            <div className="panel">
              <div className="panel-header">
                <h2 className="section-title">Output Settings</h2>
                <button className="btn" onClick={resetState} disabled={busy}>
                  Start Over
                </button>
              </div>

              <div className="settings-grid mb-4">
                <div className="control-group">
                  <span className="control-header">Export Format</span>
                  <div className="tabs">
                    <button
                      className={`tab ${exportFormat === "xml" ? "active" : ""}`}
                      onClick={() => setExportFormat("xml")}
                    >
                      Premiere XML
                    </button>
                    <button
                      className={`tab ${exportFormat === "mp4" ? "active" : ""}`}
                      onClick={() => setExportFormat("mp4")}
                    >
                      Render MP4
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-header">Output Folder</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div
                      className="control-val"
                      title={exportPath}
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {exportPath || "Select a folder"}
                    </div>
                    <button
                      className="btn"
                      onClick={async () => {
                        const dir = await window.quietcut.chooseDirectory();
                        if (dir) setExportPath(dir);
                      }}
                    >
                      Choose
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel">
              <h2 className="section-title mb-4">Processing Parameters</h2>
              <div className="settings-grid">
                <div className="control-group">
                  <div className="control-header">
                    <span>Silence Threshold (dB)</span>
                    <span className="control-val">{settings.noiseDb} dB</span>
                  </div>
                  <input
                    type="range"
                    min={-60}
                    max={-10}
                    step={1}
                    value={settings.noiseDb}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        noiseDb: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="control-group">
                  <div className="control-header">
                    <span>Minimum Silence (s)</span>
                    <span className="control-val">
                      {settings.minSilenceSec.toFixed(1)} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={settings.minSilenceSec}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        minSilenceSec: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="control-group">
                  <div className="control-header">
                    <span>Minimum Speech (s)</span>
                    <span className="control-val">
                      {settings.minSpeechSec.toFixed(1)} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2}
                    step={0.1}
                    value={settings.minSpeechSec}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        minSpeechSec: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="control-group">
                  <div className="control-header">
                    <span>Padding Margin (s)</span>
                    <span className="control-val">
                      {settings.marginSec.toFixed(2)} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.marginSec}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        marginSec: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="mt-6" style={{ display: "flex", gap: "12px" }}>
                <button
                  className="btn btn-primary"
                  onClick={runAnalysis}
                  disabled={!canAnalyze}
                >
                  Analyze Media
                </button>
                <button
                  className="btn"
                  onClick={() => setSettings(defaultSettings)}
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div className="panel">
              <h2 className="section-title mb-4">Media Tracks</h2>
              <div className="track-list">
                {(selected.tracks ?? []).map((t: AudioTrack) => {
                  const isSelected = selected.selectedTrackIndices.includes(
                    t.index,
                  );
                  const isAnalyzed = selected.analyzeTrackIndices.includes(
                    t.index,
                  );
                  return (
                    <div
                      key={t.index}
                      className="track-item"
                      style={{
                        flexDirection: "column",
                        gap: "12px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        className="track-header"
                        style={{ width: "100%", cursor: "default" }}
                      >
                        <div
                          className="track-label"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div>
                              Audio Track {t.index + 1}
                              <span className="track-meta">
                                ({t.codec ?? "audio"}, {t.channels ?? "N/A"})
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "16px",
                                alignItems: "center",
                                fontSize: "0.9rem",
                              }}
                            >
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox-custom"
                                  checked={isAnalyzed}
                                  readOnly
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQueue((prev) =>
                                      prev.map((q) => {
                                        if (q.id === selected.id) {
                                          const idxs =
                                            q.analyzeTrackIndices.includes(
                                              t.index,
                                            )
                                              ? q.analyzeTrackIndices.filter(
                                                  (i) => i !== t.index,
                                                )
                                              : [
                                                  ...q.analyzeTrackIndices,
                                                  t.index,
                                                ];
                                          return {
                                            ...q,
                                            analyzeTrackIndices: idxs,
                                          };
                                        }
                                        return q;
                                      }),
                                    );
                                    if (
                                      !previewUrls[t.index] &&
                                      !busy &&
                                      !isAnalyzed
                                    ) {
                                      loadPreview(t.index);
                                    }
                                  }}
                                />
                                Detect Silence
                              </label>

                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox-custom"
                                  checked={isSelected}
                                  readOnly
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQueue((prev) =>
                                      prev.map((q) => {
                                        if (q.id === selected.id) {
                                          const idxs =
                                            q.selectedTrackIndices.includes(
                                              t.index,
                                            )
                                              ? q.selectedTrackIndices.filter(
                                                  (i) => i !== t.index,
                                                )
                                              : [
                                                  ...q.selectedTrackIndices,
                                                  t.index,
                                                ];
                                          return {
                                            ...q,
                                            selectedTrackIndices: idxs,
                                          };
                                        }
                                        return q;
                                      }),
                                    );
                                  }}
                                />
                                Export Cut
                              </label>
                            </div>
                          </div>

                          {analyzeProgress[t.index] !== undefined &&
                            analyzeProgress[t.index] < 1 && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  marginTop: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    background: "var(--border-color)",
                                    height: "6px",
                                    borderRadius: "3px",
                                    width: "150px",
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.round(
                                        analyzeProgress[t.index]! * 100,
                                      )}%`,
                                      height: "100%",
                                      background: "var(--accent-color)",
                                      transition: "width 0.2s",
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted">
                                  {Math.round(analyzeProgress[t.index]! * 100)}%
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                      {(isAnalyzed || isSelected) && (
                        <div style={{ marginLeft: "8px", width: "100%" }}>
                          {!previewUrls[t.index] ? (
                            <button
                              className="btn text-xs"
                              onClick={() => loadPreview(t.index)}
                              disabled={busy}
                            >
                              Load Waveform Preview
                            </button>
                          ) : (
                            <div
                              style={{
                                background: "var(--panel-bg)",
                                borderRadius: "var(--radius-sm)",
                                overflow: "hidden",
                                width: "100%",
                              }}
                            >
                              <WaveformPlayer
                                audioUrl={previewUrls[t.index]}
                                silenceSegments={
                                  selected.analysis?.[t.index]
                                    ?.detectedSilences || []
                                }
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {status && <div className="status-msg status-info">{status}</div>}
            {error && <div className="status-msg status-error">{error}</div>}

            <div className="mt-4 text-center">
              <button
                className="btn btn-primary btn-block"
                onClick={exportFile}
                disabled={!canExport || busy}
              >
                Execute Export
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
