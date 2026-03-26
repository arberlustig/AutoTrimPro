import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export type FfmpegResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export async function runFfmpeg(
  args: string[],
  onStderr?: (chunk: string) => void,
): Promise<FfmpegResult> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg not found (ffmpeg-static returned null).");
  }

  // FIX: In der gepackten Electron-App (ASAR) liegt ffmpeg.exe im app.asar.unpacked Ordner,
  // da wir es in der package.json mit asarUnpack definiert haben. 
  // ffmpeg-static liefert aber den Pfad in app.asar zurück, was zu ENOENT führt.
  let fixedFfmpegPath = ffmpegPath as string;
  if (fixedFfmpegPath.includes('app.asar') && !fixedFfmpegPath.includes('app.asar.unpacked')) {
    fixedFfmpegPath = fixedFfmpegPath.replace('app.asar', 'app.asar.unpacked');
  }

  const safeArgs = ["-nostdin", ...args];
  console.log(`[FFMPEG] Executing: ${fixedFfmpegPath} ${safeArgs.join(" ")}`);

  return await new Promise((resolve, reject) => {
    let p;
    try {
      p = spawn(fixedFfmpegPath, safeArgs, { windowsHide: true });
    } catch (err) {
      console.error("[FFMPEG] Spawn error:", err);
      return reject(err);
    }

    let stdout = "";
    let stderr = "";
    const MAX_BUFFER = 2 * 1024 * 1024;

    p.stdout.on("data", (d: any) => {
      const chunk = d.toString();
      if (stdout.length < MAX_BUFFER) stdout += chunk;
    });
    
    p.stderr.on("data", (d: any) => {
      const chunk = d.toString();
      if (stderr.length < MAX_BUFFER) stderr += chunk;
      if (onStderr) onStderr(chunk);
    });
    
    p.on("error", (err: any) => {
      console.error(`[FFMPEG] process error:`, err);
      reject(err);
    });
    
    p.on("close", (code: any) => {
      console.log(`[FFMPEG] Finished with exit code ${code}`);
      if (code !== 0 && code !== 1) {
        console.warn(`[FFMPEG] Exited with code ${code}.`);
      }
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
