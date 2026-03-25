import React, { useEffect, useMemo, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

export function WaveformPlayer(props: {
  audioUrl: string;
  silenceSegments?: { start: number; end: number }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isReady, setIsReady] = useState(false);

  const timeLabel = useMemo(() => {
    const fmt = (s: number) => {
      const m = Math.floor(s / 60);
      const ss = Math.floor(s % 60);
      return `${m}:${String(ss).padStart(2, "0")}`;
    };
    return `${fmt(current)} / ${fmt(duration)}`;
  }, [current, duration]);

  useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
    setCurrent(0);
    setDuration(0);

    const el = containerRef.current;
    if (!el) return;

    const ws = WaveSurfer.create({
      container: el,
      waveColor: "rgba(232, 237, 245, 0.4)",
      progressColor: "#F5B301",
      cursorColor: "#F5B301",
      height: 100,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      interact: true,
    });

    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;

    wsRef.current = ws;

    ws.on("ready", () => {
      setIsReady(true);
      setDuration(ws.getDuration());
      try {
        ws.zoom(zoom);
      } catch {}
    });
    ws.on("audioprocess", () => setCurrent(ws.getCurrentTime()));
    ws.on("timeupdate", () => setCurrent(ws.getCurrentTime()));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => setIsPlaying(false));

    ws.load(props.audioUrl);

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.audioUrl]);

  useEffect(() => {
    if (!wsRef.current) return;
    try {
      wsRef.current.zoom(zoom);
    } catch {}
  }, [zoom]);

  useEffect(() => {
    if (!isReady || !regionsRef.current) return;

    // clear existing regions safely
    try {
      regionsRef.current.clearRegions();
    } catch {}

    if (props.silenceSegments) {
      for (const seg of props.silenceSegments) {
        regionsRef.current.addRegion({
          start: seg.start,
          end: seg.end,
          color: "rgba(255, 0, 0, 0.3)",
          drag: false,
          resize: false,
        });
      }
    }
  }, [props.silenceSegments, isReady]);

  return (
    <div className="waveform-panel">
      <div className="waveform-topbar">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 100,
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--text)" }}>
            Waveform
          </span>
          <span>Zoom</span>
        </div>

        <div
          style={{ display: "flex", flex: 1, flexDirection: "column", gap: 6 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button
              className="waveform-play-btn"
              onClick={() => wsRef.current?.playPause()}
              disabled={!isReady}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span style={{ color: "var(--text)" }}>{timeLabel}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min={1}
              max={100}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)", height: 4 }}
              disabled={!isReady}
            />
            <span style={{ width: 30, textAlign: "right" }}>2m</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="waveform-container" />
    </div>
  );
}
