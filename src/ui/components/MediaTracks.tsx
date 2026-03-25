import React from "react";
import type { AudioTrack, QueueItem } from "../types";
import { WaveformPlayer } from "../WaveformPlayer";

interface MediaTracksProps {
  selected: QueueItem;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  previewUrls: Record<number, string>;
  analyzeProgress: Record<number, number>;
  busy: boolean;
  loadPreview: (trackIndex: number) => void;
}

export function MediaTracks({
  selected,
  setQueue,
  previewUrls,
  analyzeProgress,
  busy,
  loadPreview,
}: MediaTracksProps) {
  return (
    <div className="panel">
      <h2 className="section-title mb-4">Media Tracks</h2>
      <div className="track-list">
        {(selected.tracks ?? []).map((t: AudioTrack) => {
          const isSelected = selected.selectedTrackIndices.includes(t.index);
          const isAnalyzed = selected.analyzeTrackIndices.includes(t.index);
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
                                  const idxs = q.analyzeTrackIndices.includes(
                                    t.index,
                                  )
                                    ? q.analyzeTrackIndices.filter(
                                        (i) => i !== t.index,
                                      )
                                    : [...q.analyzeTrackIndices, t.index];
                                  return {
                                    ...q,
                                    analyzeTrackIndices: idxs,
                                  };
                                }
                                return q;
                              }),
                            );
                            if (!previewUrls[t.index] && !busy && !isAnalyzed) {
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
                                  const idxs = q.selectedTrackIndices.includes(
                                    t.index,
                                  )
                                    ? q.selectedTrackIndices.filter(
                                        (i) => i !== t.index,
                                      )
                                    : [...q.selectedTrackIndices, t.index];
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
                          selected.analysis?.[t.index]?.detectedSilences || []
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
  );
}
