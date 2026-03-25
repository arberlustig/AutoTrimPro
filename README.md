# AutoTrimPro

AutoTrimPro is a local desktop application built with Electron, React, and Vite. It automatically detects silence in your video or audio files and seamlessly exports the trimmed timeline directly.

## Features

- **Silence Detection**: Analyzes audio using `ffmpeg`'s `silencedetect`.
- **Customizable Trimming**:
  - Adjust noise threshold (dB).
  - Set minimum silence duration.
  - Set minimum speech duration to merge short speech segments.
  - Add margins (padding) around your cuts.
- **Export Options**:
  - Generates a **Premiere Pro XML (FCP7)** with the already-cut timeline ready for import.

## Requirements

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

Run the app in development mode:

```bash
npm run dev
```

This will build the Electron app and launch the React frontend locally.

## Build

To build the executable for your operative system:

```bash
npm run build
```
