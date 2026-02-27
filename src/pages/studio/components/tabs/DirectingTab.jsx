export default function DirectingTab({
  previewMode,
  setPreviewMode,
  handleAutoDirect,
  introText,
  setIntroText,
  selectableNodes,
  kfTargetNodeId,
  setKfTargetNodeId,
  kfFrame,
  setKfFrame,
  kfZoom,
  setKfZoom,
  addKeyframe,
}) {
  return (
    <div className="tab-content">
      <div className="section">
        <label className="section-label">Auto Direct (AI Camera)</label>

        <div className="form-row" style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={previewMode}
              onChange={(e) => setPreviewMode(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px' }}>
              🎬 Sync Edges with Camera
            </span>
          </label>
        </div>

        <button className="btn btn-auto" onClick={handleAutoDirect}>
          ✨ Auto Direct (AI Camera)
        </button>
      </div>

      <div className="section">
        <label className="section-label">Intro Voiceover (English)</label>
        <textarea
          className="field-input"
          style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
          placeholder="Enter text for AI voiceover (e.g., Welcome to the architecture overview...)"
          value={introText}
          onChange={(e) => setIntroText(e.target.value)}
        />
      </div>

      <div className="section">
        <label className="section-label">Add Camera Keyframe</label>

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Target Node</label>
            <select
              className="field-input"
              value={kfTargetNodeId}
              onChange={(e) => setKfTargetNodeId(e.target.value)}
            >
              <option value="">— select node —</option>
              {selectableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.data?.title || n.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Frame</label>
            <input
              className="field-input"
              type="number"
              min={0}
              value={kfFrame}
              onChange={(e) => setKfFrame(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div className="form-field">
            <label className="field-label">Zoom</label>
            <input
              className="field-input"
              type="number"
              step="0.1"
              min={0.1}
              max={5}
              value={kfZoom}
              onChange={(e) => setKfZoom(parseFloat(e.target.value || '1'))}
            />
          </div>
        </div>

        <button className="btn btn-add" onClick={addKeyframe}>
          + Add Keyframe
        </button>
      </div>
    </div>
  );
}
