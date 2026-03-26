# AutoTrimPro

AutoTrimPro is a robust local desktop application built with Electron, React, and Vite. It automatically detects silence in your video or audio files and seamlessly exports a trimmed timeline directly, saving you hours of tedious manual video editing.

DISCLAIMER: If you experience bad audio quality while playing the waveform preview don't worry! By exporting the cutted version the audio will be completely okay if you put it into premiere pro! I will definitely share a video how to set it up correctly and how the program is intended to be used!

I develop AutoTrim Pro as an open-source project because I believe that free software provides value for everyone. For this reason, the program will always remain free and accessible to all. If you appreciate my work on the code, you are welcome to support the project with a contribution of your choice. This is entirely optional and serves as a simple gesture of appreciation 🤝 paypal.me/ArberBaui

## Features

- **Automated Silence Detection**: Analyzes audio using `ffmpeg`'s powerful `silencedetect` algorithms.
- **Customizable Trimming**: Fine-tune exactly what counts as "silence" and "speech" with intuitive sliders.
- **Waveform Previews**: Visually inspect the audio tracks and see exactly where cuts will be made.
- **Export Options**: Generates a **Premiere Pro XML (FCP7)** with the already-cut timeline ready for import, or an MP4.

## How to Use AutoTrimPro

AutoTrimPro is designed to be fast and intuitive. Here is a breakdown of the core processing parameters and what they do:

### 1. Processing Parameters

- **Silence Threshold (dB)**: Sets the volume level below which audio is considered "silent". The lower the negative number (e.g., -50 dB), the quieter the background must be to be cut. If the app is cutting out your quiet speech, raise this value (e.g., to -25 dB).
- **Minimum Silence (s)**: The minimum duration of a pause required to trigger a cut. If set to `0.5s`, pauses shorter than a half-second are ignored, keeping natural speech flows intact.
- **Minimum Speech (s)**: The minimum duration a spoken segment must be to be kept. If someone makes a tiny noise (like a mic bump) for `0.1s`, but this is set to `0.3s`, that noise is treated as silence and removed.
- **Padding Margin (s)**: Adds a "safety buffer" of audio before and after speech segments. This prevents words from sounding abruptly clipped at the start or end.

### 2. Media Tracks

When you import a file, AutoTrimPro lists all available audio tracks (useful for multi-track video recordings like gameplay or podcasts).

- **Detect Silence**: Select this on tracks you want the algorithm to listen to. (e.g., you want to cut based on your microphone track, but ignore the game audio track).
- **Export Cut**: Select this if you want the track included in your final exported XML/MP4.
- **Load Waveform Preview**: Click this to visualize the audio and see exactly where the detected silences (highlighted sections) are located.

### 3. Output Settings

- **Export Format**: Choose between a Premiere-compatible XML (which creates an editable sequence in Premiere Pro with all the cuts applied) or an MP4 render.
- **Output Folder**: Select where the final files should be saved. Click **Execute Export** when ready!

---

- Node.js (v18+ LTS recommended)

## Setup

1. Copy or clone the repository:
   ```bash
   git clone <your-repo-url>
   cd autotrimpro
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Run the app in development mode (starts both Vite frontend and Electron backend):

```bash
npm run dev
```

_(Note: The first time you run this, it will compile the electron main process and open the React output in an Electron window)_

To build the executable for your operative system (Windows):

```bash
npm run build:win
```

This will create a `release/` folder with your `.exe` installer.

To do a generic build without bundling the installer:

```bash
npm run build
npm start
```
