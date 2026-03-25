import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  AnalysisResult,
  AudioTrack,
  ExportFormat,
  SilenceSettings,
} from "./shared/types";

contextBridge.exposeInMainWorld("quietcut", {
  importFile: async (file: File & { path?: string }) => {
    // 1. Try webUtils (the modern, safe Electron way for File objects)
    if (typeof webUtils !== "undefined" && webUtils.getPathForFile) {
      const p = webUtils.getPathForFile(file);
      if (p) return p;
    }
    // 2. Try the old Chromium hack bypass
    if (file.path) {
      return file.path;
    }
    // 3. Fallback: warn and array buffer (DANGEROUS for large files)
    console.warn(
      "Could not extract native path for file, falling back to reading into RAM. This will fail for large files!",
    );
    const ab = await file.arrayBuffer();
    const data = new Uint8Array(ab);
    return await ipcRenderer.invoke("qc:importFile", { name: file.name, data });
  },
  onAnalyzeProgress: (
    callback: (trackIndex: number, percent: number) => void,
  ) => {
    const handler = (
      _event: any,
      args: { trackIndex: number; percent: number },
    ) => {
      callback(args.trackIndex, args.percent);
    };
    ipcRenderer.on("qc:analyze:progress", handler);
    return () => {
      ipcRenderer.removeListener("qc:analyze:progress", handler);
    };
  },
  listAudioTracks: async (args: {
    sourcePath: string;
  }): Promise<AudioTrack[]> => {
    return await ipcRenderer.invoke("qc:listAudioTracks", args);
  },
  waveformPngDataUrl: async (args: {
    sourcePath: string;
    trackIndex: number;
    width: number;
    height: number;
  }): Promise<string> => {
    return await ipcRenderer.invoke("qc:waveformPngDataUrl", args);
  },
  extractAudioPreview: async (args: {
    sourcePath: string;
    trackIndex: number;
  }): Promise<string> => {
    return await ipcRenderer.invoke("qc:extractAudioPreview", args);
  },
  fileUrl: async (args: { path: string }): Promise<string> => {
    return await ipcRenderer.invoke("qc:fileUrl", args);
  },
  readFileBytes: async (args: { path: string }): Promise<Uint8Array> => {
    return await ipcRenderer.invoke("qc:readFileBytes", args);
  },
  analyze: async (args: {
    sourcePath: string;
    settings: SilenceSettings;
  }): Promise<AnalysisResult> => {
    return await ipcRenderer.invoke("qc:analyze", args);
  },
  getDefaultExportDir: async (): Promise<string> => {
    return await ipcRenderer.invoke("qc:getDefaultExportDir");
  },
  chooseDirectory: async (): Promise<string | null> => {
    return await ipcRenderer.invoke("qc:chooseDirectory");
  },
  exportCuts: async (args: {
    analysis: AnalysisResult;
    exportFormat: ExportFormat;
    basePath: string;
  }): Promise<string> => {
    return await ipcRenderer.invoke("qc:export", args);
  },
});
