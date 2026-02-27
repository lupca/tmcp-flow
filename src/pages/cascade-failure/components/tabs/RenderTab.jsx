import { COLORS } from '../../../../constants/cascadeConstants';

export default function RenderTab({
  renderQuality,
  setRenderQuality,
  totalFrames,
  previewFps,
  loading,
  renderProgress,
  renderStatus,
  handleExport,
  videoUrl,
}) {
  return (
    <div className="section">
      <label className="section-label">🎬 Export MP4</label>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          Quality
        </label>
        <select
          className="field-input"
          value={renderQuality}
          onChange={(e) => setRenderQuality(e.target.value)}
        >
          <option value="draft">Draft (fastest)</option>
          <option value="standard">Standard</option>
          <option value="high">High Quality</option>
        </select>
      </div>

      <div
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}
      >
        Duration: {totalFrames} frames ({(totalFrames / previewFps).toFixed(1)}s
        @ {previewFps}fps)
      </div>

      <button
        className="btn btn-export"
        onClick={handleExport}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? `⏳ ${renderProgress}%` : '🎬 Export Cascade MP4'}
      </button>

      {renderStatus && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          {renderStatus}
        </div>
      )}

      {loading && (
        <div className="render-progress-container" style={{ marginTop: 8 }}>
          <div className="render-progress-bar" style={{ width: `${renderProgress}%` }} />
        </div>
      )}

      {videoUrl && (
        <div style={{ marginTop: 12 }}>
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <a
            href={videoUrl}
            download
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 8,
              color: COLORS.CYAN_NEON,
              fontSize: 12,
            }}
          >
            ⬇ Download MP4
          </a>
        </div>
      )}
    </div>
  );
}
