import { runFfmpeg } from './runFfmpeg';
import type { AudioTrack } from '../shared/types';

function parseKeyValueTags(s: string) {
  // e.g. (eng) or (ger) or (default)
  const m = s.match(/\(([^)]+)\)/);
  return m?.[1];
}

export async function listAudioTracks(sourcePath: string): Promise<AudioTrack[]> {
  const res = await runFfmpeg(['-hide_banner', '-i', sourcePath]);
  const text = res.stderr;
  const lines = text.split(/\r?\n/);

  // ffmpeg prints lines like:
  // Stream #0:1(eng): Audio: aac (LC), 48000 Hz, stereo, fltp, 128 kb/s
  const tracks: AudioTrack[] = [];
  let audioIdx = 0;

  for (const line of lines) {
    if (!line.includes('Stream #')) continue;
    if (!line.includes('Audio:')) continue;

    const streamIdMatch = line.match(/Stream #([0-9]+:[0-9]+)/);
    const streamId = streamIdMatch?.[1] ?? `0:${audioIdx}`;

    const language = parseKeyValueTags(line);

    const codecMatch = line.match(/Audio:\s*([^,]+)/);
    const codec = codecMatch?.[1]?.trim();

    const srMatch = line.match(/,\s*([0-9]{4,6})\s*Hz\b/i);
    const sampleRateHz = srMatch ? Number(srMatch[1]) : undefined;

    const chMatch = line.match(/,\s*(mono|stereo|[0-9.]+)\s*(?:channels|ch)?\b/i);
    const channels = chMatch?.[1]?.trim();

    tracks.push({
      index: audioIdx,
      streamId,
      codec,
      channels,
      sampleRateHz,
      language
    });

    audioIdx += 1;
  }

  return tracks;
}

