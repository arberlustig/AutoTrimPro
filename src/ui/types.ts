export type ExportFormat = "xml" | "mp4" | "xml+mp4";

export type SilenceSettings = {
  noiseDb: number; // e.g. -35
  minSilenceSec: number; // e.g. 0.5
  minSpeechSec: number; // e.g. 0.3
  marginSec: number; // padding per side
};

export type AnalysisResult = {
  durationSec: number;
  sourcePath: string;
  detectedSilences: Array<{ start: number; end: number }>;
  keepSegments: Array<{ start: number; end: number }>;
};

export type AudioTrack = {
  index: number; // 0-based within audio streams (0:a:index)
  streamId: string; // e.g. "0:1"
  codec?: string;
  channels?: string;
  sampleRateHz?: number;
  language?: string;
  title?: string;
};

export type QueueItem = {
  id: string;
  fileName: string;
  sourcePath?: string;
  tracks?: AudioTrack[];
  selectedTrackIndices: number[]; // Tracks to include in export
  analyzeTrackIndices: number[]; // Tracks to use for silence detection
  analysis?: Record<number, AnalysisResult>;
  status: "queued" | "imported" | "analyzing" | "ready" | "error";
  error?: string;
};
