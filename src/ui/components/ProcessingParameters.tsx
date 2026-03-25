import React from "react";
import type { SilenceSettings } from "../types";

interface ProcessingParametersProps {
  settings: SilenceSettings;
  setSettings: React.Dispatch<React.SetStateAction<SilenceSettings>>;
  defaultSettings: SilenceSettings;
  runAnalysis: () => void;
  canAnalyze: boolean;
}

export function ProcessingParameters({
  settings,
  setSettings,
  defaultSettings,
  runAnalysis,
  canAnalyze,
}: ProcessingParametersProps) {
  return (
    <div className="panel">
      <h2 className="section-title mb-4">Processing Parameters</h2>
      <div className="settings-grid">
        <div className="control-group">
          <div className="control-header">
            <span>Silence Threshold (dB)</span>
            <span className="control-val">{settings.noiseDb} dB</span>
          </div>
          <input
            type="range"
            min={-60}
            max={-10}
            step={1}
            value={settings.noiseDb}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                noiseDb: Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="control-group">
          <div className="control-header">
            <span>Minimum Silence (s)</span>
            <span className="control-val">
              {settings.minSilenceSec.toFixed(1)} s
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={settings.minSilenceSec}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                minSilenceSec: Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="control-group">
          <div className="control-header">
            <span>Minimum Speech (s)</span>
            <span className="control-val">
              {settings.minSpeechSec.toFixed(1)} s
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.1}
            value={settings.minSpeechSec}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                minSpeechSec: Number(e.target.value),
              }))
            }
          />
        </div>
        <div className="control-group">
          <div className="control-header">
            <span>Padding Margin (s)</span>
            <span className="control-val">
              {settings.marginSec.toFixed(2)} s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.marginSec}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                marginSec: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="mt-6" style={{ display: "flex", gap: "12px" }}>
        <button
          className="btn btn-primary"
          onClick={runAnalysis}
          disabled={!canAnalyze}
        >
          Analyze Media
        </button>
        <button className="btn" onClick={() => setSettings(defaultSettings)}>
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
