export type ExportFormat = "xml" | "mp4" | "xml+mp4";

export type SilenceSettings = {
  noiseDb: number;
  minSilenceSec: number;
  minSpeechSec: number;
  marginSec: number;
};

export type AnalysisResult = {
  durationSec: number;
  sourcePath: string;
  detectedSilences: Array<{ start: number; end: number }>;
  keepSegments: Array<{ start: number; end: number }>;
  audioTracks?: AudioTrack[]; // NEW: To know how many tracks to generate in FCP7
};

export type AudioTrack = {
  index: number;
  streamId: string;
  codec?: string;
  channels?: string;
  sampleRateHz?: number;
  language?: string;
  title?: string;
};
