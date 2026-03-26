import React, { useMemo, useState, useEffect } from "react";
import type {
  ExportFormat,
  QueueItem,
  SilenceSettings,
  AnalysisResult,
} from "./types";
import { Header } from "./components/Header";
import { EmptyState } from "./components/EmptyState";
import { OutputSettings } from "./components/OutputSettings";
import { ProcessingParameters } from "./components/ProcessingParameters";
import { MediaTracks } from "./components/MediaTracks";

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
    window.autotrimpro
      .getDefaultExportDir()
      .then(setExportPath)
      .catch(console.error);

    const cleanup = window.autotrimpro.onAnalyzeProgress(
      (trackIndex, percent) => {
        setAnalyzeProgress((prev) => ({ ...prev, [trackIndex]: percent }));
      },
    );
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
        const sourcePath = await window.autotrimpro.importFile(f);
        console.log("Source path resolved to:", sourcePath);

        const tracks = await window.autotrimpro.listAudioTracks({ sourcePath });
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
          results[trackIndex] = await window.autotrimpro.analyze({
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
      const out = await window.autotrimpro.exportCuts({
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
      const wavPath = await window.autotrimpro.extractAudioPreview({
        sourcePath: selected.sourcePath,
        trackIndex,
      });
      const customUrl = `local-media://${encodeURIComponent(wavPath)}`;
      setPreviewObjectUrls((prev) => {
        if (prev[trackIndex] && prev[trackIndex].startsWith('blob:')) {
          URL.revokeObjectURL(prev[trackIndex]);
        }
        return { ...prev, [trackIndex]: customUrl };
      });
      setPreviewUrls((prev) => ({ ...prev, [trackIndex]: customUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="app">
      <Header theme={theme} toggleTheme={toggleTheme} />

      <main className="container">
        {!selected ? (
          <EmptyState onPickFiles={onPickFiles} />
        ) : (
          <>
            <OutputSettings
              exportFormat={exportFormat}
              setExportFormat={setExportFormat}
              exportPath={exportPath}
              setExportPath={setExportPath}
              resetState={resetState}
              busy={busy}
            />

            <ProcessingParameters
              settings={settings}
              setSettings={setSettings}
              defaultSettings={defaultSettings}
              runAnalysis={runAnalysis}
              canAnalyze={canAnalyze}
            />

            <MediaTracks
              selected={selected}
              setQueue={setQueue}
              previewUrls={previewUrls}
              analyzeProgress={analyzeProgress}
              busy={busy}
              loadPreview={loadPreview}
            />

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
