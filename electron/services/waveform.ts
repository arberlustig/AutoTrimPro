import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { runFfmpeg } from './runFfmpeg';

function hashKey(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

export async function waveformPngDataUrl(args: {
  sourcePath: string;
  trackIndex: number;
  width: number;
  height: number;
}): Promise<string> {
  const { sourcePath, trackIndex } = args;
  const width = Math.max(300, Math.min(2400, Math.round(args.width)));
  const height = Math.max(80, Math.min(600, Math.round(args.height)));

  const dir = path.join(app.getPath('userData'), 'waveforms');
  await fs.mkdir(dir, { recursive: true });

  const outPng = path.join(dir, `${hashKey(`${sourcePath}|a${trackIndex}|${width}x${height}`)}.png`);

  try {
    await fs.access(outPng);
  } catch {
    // Generate waveform image via showwavespic (audio -> single video frame)
    // Use accent-ish color.
    const color = '0xF5B301';
    const filter = `[0:a:${trackIndex}]showwavespic=s=${width}x${height}:colors=${color}[w]`;
    const res = await runFfmpeg([
      '-hide_banner',
      '-y',
      '-i',
      sourcePath,
      '-filter_complex',
      filter,
      '-map',
      '[w]',
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-c:v',
      'png',
      outPng
    ]);
    if (res.code !== 0) {
      throw new Error(`ffmpeg waveform failed (code ${res.code}). ${res.stderr}`);
    }
  }

  const buf = await fs.readFile(outPng);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export async function extractAudioPreview(args: { sourcePath: string; trackIndex: number }): Promise<string> {
  const { sourcePath, trackIndex } = args;
  const dir = path.join(app.getPath('userData'), 'previews');
  await fs.mkdir(dir, { recursive: true });

  const outWav = path.join(dir, `${hashKey(`${sourcePath}|a${trackIndex}`)}.wav`);
  try {
    await fs.access(outWav);
  } catch {
    const res = await runFfmpeg([
      '-hide_banner',
      '-y',
      '-i',
      sourcePath,
      '-map',
      `0:a:${trackIndex}`,
      '-ac',
      '2',
      '-ar',
      '44100',
      '-c:a',
      'pcm_s16le',
      outWav
    ]);
    if (res.code !== 0) {
      throw new Error(`ffmpeg audio preview failed (code ${res.code}). ${res.stderr}`);
    }
  }
  return outWav;
}

