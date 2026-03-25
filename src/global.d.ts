import type {
  AnalysisResult,
  AudioTrack,
  ExportFormat,
  SilenceSettings,
} from "./ui/types";

declare global {
  interface Window {
    autotrimpro: {
      importFile: (file: File) => Promise<string>;
      onAnalyzeProgress: (
        callback: (trackIndex: number, percent: number) => void,
      ) => () => void;
      listAudioTracks: (args: { sourcePath: string }) => Promise<AudioTrack[]>;
      waveformPngDataUrl: (args: {
        sourcePath: string;
        trackIndex: number;
        width: number;
        height: number;
      }) => Promise<string>;
      extractAudioPreview: (args: {
        sourcePath: string;
        trackIndex: number;
      }) => Promise<string>;
      fileUrl: (args: { path: string }) => Promise<string>;
      readFileBytes: (args: { path: string }) => Promise<Uint8Array>;
      analyze: (args: {
        sourcePath: string;
        settings: SilenceSettings;
        trackIndex?: number;
      }) => Promise<AnalysisResult>;
      getDefaultExportDir: () => Promise<string>;
      chooseDirectory: () => Promise<string | null>;
      exportCuts: (args: {
        analysis: AnalysisResult;
        exportFormat: ExportFormat;
        basePath: string;
      }) => Promise<string>;
    };
  }
}

export {};
