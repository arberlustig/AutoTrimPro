import { runFfmpeg } from "./runFfmpeg";
import type { AnalysisResult, SilenceSettings } from "../shared/types";

type SilenceEvent =
  | { type: "start"; t: number }
  | { type: "end"; t: number; silenceDuration?: number };

function parseSilenceEvents(ffmpegStderr: string): SilenceEvent[] {
  const events: SilenceEvent[] = [];
  const lines = ffmpegStderr.split(/\r?\n/);

  for (const line of lines) {
    // Examples:
    // [silencedetect @ ...] silence_start: 12.345
    // [silencedetect @ ...] silence_end: 34.567 | silence_duration: 22.222
    const mStart = line.match(/silence_start:\s*([0-9.]+)/);
    if (mStart) {
      events.push({ type: "start", t: Number(mStart[1]) });
      continue;
    }
    const mEnd = line.match(
      /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/,
    );
    if (mEnd) {
      events.push({
        type: "end",
        t: Number(mEnd[1]),
        silenceDuration: Number(mEnd[2]),
      });
    }
  }

  return events;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalizeSegments(segments: Array<{ start: number; end: number }>) {
  const out: Array<{ start: number; end: number }> = [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  for (const s of sorted) {
    if (s.end <= s.start) continue;
    const last = out[out.length - 1];
    if (!last) {
      out.push({ start: s.start, end: s.end });
      continue;
    }
    if (s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
    } else {
      out.push({ start: s.start, end: s.end });
    }
  }
  return out;
}

function invertToKeepSegments(
  durationSec: number,
  silences: Array<{ start: number; end: number }>,
  settings: SilenceSettings,
) {
  // Apply margins around silence before inverting.
  const margin = Math.max(0, settings.marginSec);
  const withMargin = silences.map((s) => ({
    start: clamp(s.start - margin, 0, durationSec),
    end: clamp(s.end + margin, 0, durationSec),
  }));
  const mergedSilences = normalizeSegments(withMargin);

  const keep: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const s of mergedSilences) {
    if (s.start > cursor) keep.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < durationSec) keep.push({ start: cursor, end: durationSec });

  // Merge away very short speech segments (minSpeechSec):
  // if a keep segment is shorter than minSpeechSec, treat it as silence and merge with neighbors.
  const minSpeech = Math.max(0, settings.minSpeechSec);
  if (minSpeech > 0) {
    const filtered: Array<{ start: number; end: number }> = [];
    for (const seg of keep) {
      if (seg.end - seg.start < minSpeech) {
        // skip it; it will be removed as "too short speech"
        continue;
      }
      filtered.push(seg);
    }
    return normalizeSegments(filtered);
  }

  return normalizeSegments(keep);
}

export async function analyzeSilence(
  sourcePath: string,
  settings: SilenceSettings,
  opts?: { trackIndex?: number; onProgress?: (percent: number) => void },
): Promise<AnalysisResult> {
  const noise = settings.noiseDb;
  const minSilence = Math.max(0.05, settings.minSilenceSec);

  // Get duration with ffprobe-like call through ffmpeg.
  // ffmpeg prints "Duration: 00:00:26.70" in stderr.
  const probe = await runFfmpeg(["-i", sourcePath, "-hide_banner"]);
  const durMatch = probe.stderr.match(
    /Duration:\s*([0-9]{2}):([0-9]{2}):([0-9]{2}\.[0-9]+)/,
  );
  if (!durMatch) {
    throw new Error("Could not read duration from file (ffmpeg).");
  }
  const hh = Number(durMatch[1]);
  const mm = Number(durMatch[2]);
  const ss = Number(durMatch[3]);
  const durationSec = hh * 3600 + mm * 60 + ss;

  // Analyze silence on selected audio stream (defaults to first).
  // threshold expects e.g. -35dB
  const trackIndex = opts?.trackIndex ?? 0;
  const filter = `silencedetect=noise=${noise}dB:d=${minSilence}`;

  const res = await runFfmpeg(
    [
      "-hide_banner",
      "-i",
      sourcePath,
      "-map",
      `0:a:${trackIndex}`,
      "-vn",
      "-af",
      filter,
      "-f",
      "null",
      "-",
    ],
    (chunk) => {
      if (opts?.onProgress && durationSec > 0) {
        // Find latest time=... in this chunk
        const timeMatches = [
          ...chunk.matchAll(
            /time=\s*([0-9]{2}):([0-9]{2}):([0-9]{2}\.[0-9]+)/g,
          ),
        ];
        if (timeMatches.length > 0) {
          const match = timeMatches[timeMatches.length - 1]; // Use the last match in the chunk
          const h = Number(match[1]);
          const m = Number(match[2]);
          const s = Number(match[3]);
          const currentSec = h * 3600 + m * 60 + s;
          opts.onProgress(clamp(currentSec / durationSec, 0, 1));
        }
      }
    },
  );

  const events = parseSilenceEvents(res.stderr);
  const silences: Array<{ start: number; end: number }> = [];
  let currentStart: number | null = null;

  for (const ev of events) {
    if (ev.type === "start") {
      currentStart = ev.t;
    } else {
      if (currentStart == null) continue;
      silences.push({ start: currentStart, end: ev.t });
      currentStart = null;
    }
  }
  if (currentStart != null) {
    silences.push({ start: currentStart, end: durationSec });
  }

  const detectedSilences = normalizeSegments(silences).map((s) => ({
    start: round3(s.start),
    end: round3(s.end),
  }));
  const keepSegments = invertToKeepSegments(
    durationSec,
    detectedSilences,
    settings,
  ).map((s) => ({
    start: round3(s.start),
    end: round3(s.end),
  }));

  return {
    durationSec: round3(durationSec),
    sourcePath,
    detectedSilences,
    keepSegments,
  };
}
