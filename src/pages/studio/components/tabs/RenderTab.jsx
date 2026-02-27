export default function RenderTab({
  renderQuality,
  setRenderQuality,
  loading,
  handleExport,
  handleCancelRender,
  renderProgress,
  renderStatus,
  renderEta,
  renderElapsed,
  videoUrl,
}) {
  const presets = [
    { key: 'draft', label: '⚡ Draft', desc: 'Fastest · 2Mbps' },
    { key: 'standard', label: '🎬 Standard', desc: 'Balanced · 8Mbps' },
    { key: 'high', label: '💎 High', desc: 'Best quality · 15Mbps' },
    { key: 'prores', label: '🎞️ ProRes', desc: 'Editing · Huge file' },
  ];

  return (
    <div className="tab-content">
      <div className="section">
        <label className="section-label">Quality Preset</label>
        <div className="render-presets">
          {presets.map((p) => (
            <button
              key={p.key}
              className={`btn btn-preset ${renderQuality === p.key ? 'btn-preset-active' : ''}`}
              onClick={() => setRenderQuality(p.key)}
              disabled={loading}
            >
              <span className="preset-label">{p.label}</span>
              <span className="preset-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <label className="section-label">Performance</label>
        <div className="perf-badges">
          <span className="perf-badge">🖥️ GPU Accel</span>
          <span className="perf-badge">⚡ HW Encode</span>
          <span className="perf-badge">🧵 Multi-thread</span>
          <span className="perf-badge">📸 JPEG Frames</span>
        </div>
      </div>

      <div className="section export-section">
        {!loading ? (
          <button className="btn btn-export" onClick={handleExport}>
            🚀 Export {renderQuality === 'prores' ? 'MOV' : 'MP4'}
          </button>
        ) : (
          <button className="btn btn-cancel" onClick={handleCancelRender}>
            ✕ Cancel Render
          </button>
        )}

        {loading && (
          <div className="render-progress-container">
            <div className="render-progress-bar">
              <div
                className="render-progress-fill"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <div className="render-progress-info">
              <span>{renderStatus}</span>
              <span>
                {renderEta != null ? `ETA ${renderEta}s` : ''}
                {renderElapsed != null ? ` · ${renderElapsed}s elapsed` : ''}
              </span>
            </div>
          </div>
        )}

        {videoUrl && (
          <div className="export-result">
            <div className="success-msg">
              ✨ Render Complete!
              {renderElapsed != null && (
                <span className="elapsed-badge"> in {renderElapsed}s</span>
              )}
            </div>
            <video
              src={videoUrl}
              controls
              autoPlay
              width="100%"
              style={{ borderRadius: 8, marginTop: 8 }}
            />
            <a href={videoUrl} download className="download-link">
              📥 Download {renderQuality === 'prores' ? 'MOV' : 'MP4'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
