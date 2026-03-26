import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importFileToAppData } from "./services/importFile";
import { analyzeSilence } from "./services/silenceDetect";
import { exportFcp7Xml } from "./services/fcp7";
import { listAudioTracks } from "./services/audioTracks";
import { extractAudioPreview, waveformPngDataUrl } from "./services/waveform";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import type {
  AnalysisResult,
  ExportFormat,
  SilenceSettings,
} from "./shared/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isDev() {
  return !app.isPackaged;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    backgroundColor: "#0b0d10",
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev()) {
    await win.loadURL("http://127.0.0.1:5173/");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // Sichere Pfadauflösung für ge-packte Electron Apps
    await win.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle(
  "qc:importFile",
  async (_evt, args: { name: string; data: Uint8Array }) => {
    return await importFileToAppData(args.name, args.data);
  },
);

ipcMain.handle(
  "qc:analyze",
  async (
    _evt,
    args: {
      sourcePath: string;
      settings: SilenceSettings;
      trackIndex?: number;
    },
  ): Promise<AnalysisResult> => {
    return await analyzeSilence(args.sourcePath, args.settings, {
      trackIndex: args.trackIndex,
      onProgress: (percent) => {
        _evt.sender.send("qc:analyze:progress", {
          trackIndex: args.trackIndex ?? 0,
          percent,
        });
      },
    });
  },
);

ipcMain.handle(
  "qc:listAudioTracks",
  async (_evt, args: { sourcePath: string }) => {
    return await listAudioTracks(args.sourcePath);
  },
);

ipcMain.handle(
  "qc:waveformPngDataUrl",
  async (
    _evt,
    args: {
      sourcePath: string;
      trackIndex: number;
      width: number;
      height: number;
    },
  ) => {
    return await waveformPngDataUrl(args);
  },
);

ipcMain.handle(
  "qc:extractAudioPreview",
  async (_evt, args: { sourcePath: string; trackIndex: number }) => {
    return await extractAudioPreview(args);
  },
);

ipcMain.handle("qc:fileUrl", async (_evt, args: { path: string }) => {
  return pathToFileURL(args.path).toString();
});

ipcMain.handle("qc:readFileBytes", async (_evt, args: { path: string }) => {
  const buf = await fs.readFile(args.path);
  return new Uint8Array(buf);
});

ipcMain.handle("qc:getDefaultExportDir", async () => {
  return app.getPath("desktop");
});

ipcMain.handle("qc:chooseDirectory", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select Destination Folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
});

import { runFfmpeg } from "./services/runFfmpeg";

ipcMain.handle(
  "qc:export",
  async (
    _evt,
    args: {
      analysis: AnalysisResult & { audioTracks?: any[] };
      exportFormat: ExportFormat;
      basePath: string;
    },
  ): Promise<string> => {
    const { analysis, exportFormat, basePath } = args;

    // Attach all detected audio tracks if not already present so we know how many channels to output in fcp7
    if (!analysis.audioTracks || analysis.audioTracks.length === 0) {
      try {
        analysis.audioTracks = await listAudioTracks(analysis.sourcePath);
      } catch {
        analysis.audioTracks = [];
      }
    }

    const videoName = path.parse(analysis.sourcePath).name;
    const now = new Date();

    // Nutze ein freundlicheres Format, z.B.: (Export 25.03.2026 14-30-05)
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const userFriendlyTime = `Export ${day}.${month}.${year} ${hours}-${minutes}-${seconds}`;
    const exportDir = path.join(basePath, `${videoName} (${userFriendlyTime})`);

    await fs.mkdir(exportDir, { recursive: true });

    if (exportFormat === "xml" || exportFormat === "xml+mp4") {
      const xmlPath = path.join(exportDir, `${videoName}-cuts.xml`);

      const audioFilesPaths: string[] = [];

      // Extract audio files based on tracks list
      if (analysis.audioTracks && analysis.audioTracks.length > 0) {
        for (let i = 0; i < analysis.audioTracks.length; i++) {
          const trackIndex = analysis.audioTracks[i].index;
          // output like tutorial lol_A1.wav
          const outWav = path.join(exportDir, `${videoName}_A${i + 1}.wav`);
          try {
            await runFfmpeg([
              "-y",
              "-i",
              analysis.sourcePath,
              "-map",
              `0:a:${trackIndex}`,
              "-c:a",
              "pcm_s16le",
              outWav,
            ]);
            audioFilesPaths.push(outWav);
          } catch (e) {
            console.error(`Failed to extract track ${trackIndex}`, e);
          }
        }
      }

      await exportFcp7Xml(xmlPath, analysis, audioFilesPaths);
      if (exportFormat === "xml") return exportDir;
      // MP4 render: TODO (kept for next iteration)
      return `${exportDir} (MP4 render TODO)`;
    }

    // MP4 render: TODO (kept for next iteration)
    return `${exportDir} (MP4 render TODO)`;
  },
);
