import React from "react";

interface EmptyStateProps {
  onPickFiles: (files: FileList | null) => void;
}

export function EmptyState({ onPickFiles }: EmptyStateProps) {
  return (
    <label className="drop">
      <input
        type="file"
        multiple
        accept="video/*,audio/*"
        style={{ display: "none" }}
        onChange={(e) => onPickFiles(e.target.files)}
      />
      <div className="drop-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
      <div className="drop-title">Import Media</div>
      <div className="drop-subtitle">
        Click to select files or drag them here
      </div>
      <span className="btn btn-primary">Select Files</span>
    </label>
  );
}
