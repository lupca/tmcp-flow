export default function AutoTab({
  originNodeId,
  setOriginNodeId,
  selectableNodes,
  handleAutoGenerate,
  handleImportJson,
  handleLoadDemo,
}) {
  return (
    <div className="section">
      <label className="section-label">🤖 Auto-Generate Cascade</label>
      <p
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 12,
        }}
      >
        BFS infection from an origin node. Automatically generates timeline
        events + camera sequence.
      </p>

      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
        Origin Node
      </label>
      <select
        className="field-input"
        value={originNodeId}
        onChange={(e) => setOriginNodeId(e.target.value)}
      >
        <option value="">Auto-detect (leaf node)</option>
        {selectableNodes.map((n) => (
          <option key={n.id} value={n.id}>
            {n.data?.icon || '🔷'} {n.data?.title || n.id}
          </option>
        ))}
      </select>

      <button
        className="btn btn-generate"
        onClick={handleAutoGenerate}
        style={{ marginTop: 12, width: '100%' }}
      >
        ⚡ Generate Cascade
      </button>

      <div style={{ marginTop: 16 }}>
        <label className="section-label">Import Flow Data</label>
        <button
          className="btn btn-sm"
          onClick={handleImportJson}
          style={{ width: '100%' }}
        >
          📂 Import from JSON
        </button>
        <button
          className="btn btn-sm"
          onClick={handleLoadDemo}
          style={{ width: '100%', marginTop: 6 }}
        >
          📦 Load Demo Scenario
        </button>
      </div>
    </div>
  );
}
