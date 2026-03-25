import React from "react";
import type { ExportFormat } from "../types";

interface OutputSettingsProps {
  exportFormat: ExportFormat;
  setExportFormat: (val: ExportFormat) => void;
  exportPath: string;
  setExportPath: (val: string) => void;
  resetState: () => void;
  busy: boolean;
}

export function OutputSettings({
  exportFormat,
  setExportFormat,
  exportPath,
  setExportPath,
  resetState,
  busy,
}: OutputSettingsProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="section-title">Output Settings</h2>
        <button className="btn" onClick={resetState} disabled={busy}>
          Start Over
        </button>
      </div>

      <div className="settings-grid mb-4">
        <div className="control-group">
          <span className="control-header">Export Format</span>
          <div className="tabs">
            <button
              className={`tab ${exportFormat === "xml" ? "active" : ""}`}
              onClick={() => setExportFormat("xml")}
            >
              Premiere XML
            </button>
            <button
              className={`tab ${exportFormat === "mp4" ? "active" : ""}`}
              onClick={() => setExportFormat("mp4")}
            >
              Render MP4
            </button>
          </div>
        </div>

        <div className="control-group">
          <span className="control-header">Output Folder</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <div
              className="control-val"
              title={exportPath}
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {exportPath || "Select a folder"}
            </div>
            <button
              className="btn"
              onClick={async () => {
                const dir = await window.autotrimpro.chooseDirectory();
                if (dir) setExportPath(dir);
              }}
            >
              Choose
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
