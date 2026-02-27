export default function FlowImportPanel({
  inputMode,
  setInputMode,
  handleFormSubmit,
  formLoading,
  isImporting,
  flows,
  formFlowId,
  setFormFlowId,
  resetForm,
  loadFormFromFlow,
  formName,
  setFormName,
  formNote,
  setFormNote,
  formNodes,
  setFormNodes,
  formEdges,
  setFormEdges,
  formCamera,
  setFormCamera,
  formCombined,
  setFormCombined,
}) {
  return (
    <div className="flow-import-panel">
      <div className="flow-import-header">
        <div>
          <h3>Manual Input</h3>
          <p>Switch between per-field input or combined JSON.</p>
        </div>
        <div className="flow-import-actions">
          <div className="flow-import-toggle">
            <button
              className={`btn btn-secondary ${inputMode === 'split' ? 'active' : ''}`}
              onClick={() => setInputMode('split')}
              disabled={formLoading}
            >
              Split Fields
            </button>
            <button
              className={`btn btn-secondary ${inputMode === 'combined' ? 'active' : ''}`}
              onClick={() => setInputMode('combined')}
              disabled={formLoading}
            >
              Combined JSON
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFormSubmit}
            disabled={formLoading || isImporting}
          >
            {formLoading ? 'Saving...' : 'Save Flow'}
          </button>
        </div>
      </div>

      <div className="flow-form-grid">
        <div className="flow-form-field">
          <label>Target Flow</label>
          <select
            value={formFlowId}
            onChange={(event) => {
              const next = event.target.value;
              setFormFlowId(next);
              if (next === 'new') {
                resetForm();
              } else {
                loadFormFromFlow(next);
              }
            }}
          >
            <option value="new">Create new flow</option>
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flow-form-field">
          <label>Flow Name</label>
          <input
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            placeholder="Flow name"
          />
        </div>

        <div className="flow-form-field">
          <label>Version Note</label>
          <input
            value={formNote}
            onChange={(event) => setFormNote(event.target.value)}
            placeholder="What changed?"
          />
        </div>
      </div>

      {inputMode === 'split' ? (
        <div className="flow-form-textareas">
          <div>
            <label>Nodes (JSON Array)</label>
            <textarea
              className="flow-import-textarea"
              placeholder="[ { id: 'node-1', ... } ]"
              value={formNodes}
              onChange={(event) => setFormNodes(event.target.value)}
              rows={6}
            />
          </div>
          <div>
            <label>Edges (JSON Array)</label>
            <textarea
              className="flow-import-textarea"
              placeholder="[ { id: 'edge-1', ... } ]"
              value={formEdges}
              onChange={(event) => setFormEdges(event.target.value)}
              rows={6}
            />
          </div>
          <div>
            <label>CameraSequence (JSON Array)</label>
            <textarea
              className="flow-import-textarea"
              placeholder="[ { frame: 0, targetNodeId: 'node-1', zoom: 1.2 } ]"
              value={formCamera}
              onChange={(event) => setFormCamera(event.target.value)}
              rows={6}
            />
          </div>
        </div>
      ) : (
        <div className="flow-form-textareas single">
          <div>
            <label>Combined JSON (nodes, edges, cameraSequence)</label>
            <textarea
              className="flow-import-textarea"
              placeholder='{ "nodes": [ ... ], "edges": [ ... ], "cameraSequence": [ ... ] }'
              value={formCombined}
              onChange={(event) => setFormCombined(event.target.value)}
              rows={10}
            />
          </div>
        </div>
      )}
    </div>
  );
}
