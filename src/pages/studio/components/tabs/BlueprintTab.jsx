import NodeSizeControls from './NodeSizeControls';

export default function BlueprintTab({
  flowName,
  setFlowName,
  handleSaveVersion,
  isSaving,
  handleExportJson,
  importInputRef,
  handleImportJson,
  flowId,
  versions,
  loadVersions,
  handleRollback,
  selectedNodeId,
  nodes,
  setNodes,
}) {
  return (
    <div className="tab-content">
      <div className="section">
        <label className="section-label">Flow Metadata</label>
        <div className="form-field">
          <label className="field-label">Flow Name</label>
          <input
            className="field-input"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Untitled Flow"
          />
        </div>
        <div className="form-row">
          <button
            className="btn btn-save"
            onClick={handleSaveVersion}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Version'}
          </button>
        </div>
        <div className="form-row">
          <button className="btn btn-secondary" onClick={handleExportJson}>
            Download Script (.json)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportJson}
          />
        </div>
      </div>

      <div className="section">
        <label className="section-label">Version History</label>
        {!flowId && (
          <p className="empty-hint">Save a version to enable history.</p>
        )}
        {flowId && (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => loadVersions(flowId)}
              style={{ marginBottom: '12px' }}
            >
              Load History
            </button>
            <div className="version-list-inline">
              {versions.length === 0 && (
                <p className="empty-hint">No versions yet.</p>
              )}
              {versions.map((version) => (
                <div key={version.id} className="version-item">
                  <div className="version-meta">
                    <div className="version-note">
                      {version.versionNote || 'Untitled update'}
                    </div>
                    <div className="version-date">
                      {new Date(version.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="version-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRollback(version)}
                    >
                      Rollback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <NodeSizeControls
        selectedNodeId={selectedNodeId}
        nodes={nodes}
        setNodes={setNodes}
      />
    </div>
  );
}
