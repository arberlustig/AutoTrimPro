import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AnalysisResult } from "../shared/types";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const TIMEBASE = 60; // AutoTrimPro uses 60

function secondsToFrames(sec: number) {
  return Math.max(0, Math.round(sec * TIMEBASE));
}

function getLocalUrl(filePath: string) {
  const url = pathToFileURL(filePath).href;
  return url.replace("file:///", "file://localhost/");
}

export async function exportFcp7Xml(
  outPath: string,
  analysis: AnalysisResult & { audioTracks?: any[] },
  audioFilesPaths: string[] = [],
): Promise<void> {
  const src = analysis.sourcePath;
  const name = path.basename(src);
  const numAudioTracks = analysis.audioTracks?.length || 1;

  let timelineCursorFrames = 0;

  const clipitems = analysis.keepSegments
    .filter((s) => s.end > s.start)
    .map((seg, idx) => {
      const inFrames = secondsToFrames(seg.start);
      const outFrames = secondsToFrames(seg.end);
      const len = Math.max(1, outFrames - inFrames);
      const start = timelineCursorFrames;
      const end = timelineCursorFrames + len;
      timelineCursorFrames = end;
      return { idx, len, start, end, inFrames, outFrames };
    });

  const timelineDuration = timelineCursorFrames;
  const srcPathUrl = getLocalUrl(src);

  const videoClipItemsXml = clipitems
    .map((c, i) => {
      const isFirst = i === 0;
      const fileNode = isFirst
        ? `
          <file id="videofile-1">
            <name>${xmlEscape(name)}</name>
            <pathurl>${xmlEscape(srcPathUrl)}</pathurl>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <media>
              <video>
                <samplecharacteristics>
                  <rate>
                    <timebase>${TIMEBASE}</timebase>
                    <ntsc>FALSE</ntsc>
                  </rate>
                  <width>1920</width>
                  <height>1080</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                </samplecharacteristics>
              </video>
            </media>
          </file>`
        : `          <file id="videofile-1"/>`;

      return `
        <clipitem id="clipitem-${c.idx + 1}">
          <name>${xmlEscape(name)}</name>
          <enabled>TRUE</enabled>
          <start>${c.start}</start>
          <end>${c.end}</end>
          <in>${c.inFrames}</in>
          <out>${c.outFrames}</out>
${fileNode}
        </clipitem>`;
    })
    .join("");

  const audioTracksXml = Array.from({ length: numAudioTracks })
    .map((_, trackIdx) => {
      const isExtracted = audioFilesPaths.length > 0;
      const audioFilePath = isExtracted ? audioFilesPaths[trackIdx] : src;
      const audioFileName = isExtracted ? path.basename(audioFilePath) : name;
      const audioFileUrl = getLocalUrl(audioFilePath);
      const audioFileId = `audiofile-track${trackIdx + 1}`;
      const sourceTrackIndex = isExtracted ? 1 : trackIdx + 1;

      const audioClipItemsXml = clipitems
        .map((c, i) => {
          const fileNode =
            i === 0
              ? `
          <file id="${audioFileId}">
            <name>${xmlEscape(audioFileName)}</name>
            <pathurl>${xmlEscape(audioFileUrl)}</pathurl>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <media>
              <audio>
                <samplecharacteristics>
                  <depth>16</depth>
                  <samplerate>48000</samplerate>
                </samplecharacteristics>
                <channelcount>2</channelcount>
              </audio>
            </media>
          </file>`
              : `          <file id="${audioFileId}"/>`;

          return `
        <clipitem id="audioclip-${c.idx + 1}-track${trackIdx + 1}">
          <name>${xmlEscape(audioFileName)}</name>
          <enabled>TRUE</enabled>
          <start>${c.start}</start>
          <end>${c.end}</end>
          <in>${c.inFrames}</in>
          <out>${c.outFrames}</out>
${fileNode}
          <sourcetrack>
            <mediatype>audio</mediatype>
            <trackindex>${sourceTrackIndex}</trackindex>
          </sourcetrack>
        </clipitem>`;
        })
        .join("");

      return `
        <track>
${audioClipItemsXml}
        </track>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence>
    <name>CUT - ${xmlEscape(path.basename(name, path.extname(name)))}</name>
    <duration>${timelineDuration}</duration>
    <rate>
      <timebase>${TIMEBASE}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <width>1920</width>
            <height>1080</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
            <rate>
              <timebase>${TIMEBASE}</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
          </samplecharacteristics>
        </format>
        <track>
${videoClipItemsXml}
        </track>
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
${audioTracksXml}
      </audio>
    </media>
  </sequence>
</xmeml>
`;

  await fs.writeFile(outPath, xml, "utf8");
}
