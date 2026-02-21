import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { layoutWithElk } from '../utils/elkLayout';

const groupDefaultStyle = {
  backgroundColor: 'rgba(30, 41, 59, 0.35)',
  border: '1px dashed rgba(148, 163, 184, 0.25)',
  borderRadius: '20px',
  color: 'rgba(248, 250, 252, 0.6)',
  fontWeight: 'bold',
  padding: '16px',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
};

function normalizeNodes(nodes) {
  const mapped = nodes.map((n) => ({
    ...n,
    type: n.type || 'universal',
    data: n.data || { title: n.id },
    ...(n.type === 'group'
      ? { style: { ...groupDefaultStyle, ...(n.style || {}) } }
      : {}),
  }));

  return [
    ...mapped.filter((n) => n.type === 'group'),
    ...mapped.filter((n) => n.type !== 'group'),
  ];
}

async function ensureLayout(nodes, edges) {
  const normalized = normalizeNodes(nodes);
  if (normalized.length === 0) return normalized;
  return layoutWithElk(normalized, edges);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

export default function FlowManager() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [formFlowId, setFormFlowId] = useState('new');
  const [formName, setFormName] = useState('');
  const [formNodes, setFormNodes] = useState('');
  const [formEdges, setFormEdges] = useState('');
  const [formCamera, setFormCamera] = useState('');
  const [formCombined, setFormCombined] = useState('');
  const [inputMode, setInputMode] = useState('split');
  const [formNote, setFormNote] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flows');
      if (!res.ok) {
        throw new Error('Failed to load flows');
      }
      const data = await res.json();
      setFlows(data.flows || []);
    } catch (err) {
      setError(err.message || 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const importFromPayload = async (payload, note = 'Imported JSON') => {
    const name = payload.name || 'Imported Flow';
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload.edges) ? payload.edges : [];
    const cameraSequence = Array.isArray(payload.cameraSequence)
      ? payload.cameraSequence
      : [];

    const layoutedNodes = await ensureLayout(nodes, edges);

    const createRes = await fetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!createRes.ok) throw new Error('Failed to create flow');
    const created = await createRes.json();

    const saveRes = await fetch(`/api/flows/${created.id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: layoutedNodes,
        edges,
        cameraSequence,
        versionNote: note,
        name,
      }),
    });
    if (!saveRes.ok) throw new Error('Failed to save version');

    await loadFlows();
  };

  const resetForm = () => {
    setFormName('');
    setFormNodes('');
    setFormEdges('');
    setFormCamera('');
    setFormCombined('');
    setFormNote('');
  };

  const parseJsonArray = (value, label) => {
    if (!value.trim()) return [];
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array.`);
    }
    return parsed;
  };

  const parseCombinedPayload = (value) => {
    if (!value.trim()) {
      return { nodes: [], edges: [], cameraSequence: [] };
    }
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error('Combined input must be valid JSON.');
    }
    if (Array.isArray(parsed)) {
      throw new Error('Combined input must be an object with nodes, edges, cameraSequence.');
    }
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      cameraSequence: Array.isArray(parsed.cameraSequence) ? parsed.cameraSequence : [],
    };
  };

  const loadFormFromFlow = async (flowId) => {
    setFormLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/versions`);
      if (!res.ok) throw new Error('Failed to load flow');
      const data = await res.json();
      const latest = data.versions?.[0];
      setFormName(data.flow?.name || '');
      setFormNodes(JSON.stringify(latest?.nodes || [], null, 2));
      setFormEdges(JSON.stringify(latest?.edges || [], null, 2));
      setFormCamera(JSON.stringify(latest?.cameraSequence || [], null, 2));
      setFormCombined(JSON.stringify({
        nodes: latest?.nodes || [],
        edges: latest?.edges || [],
        cameraSequence: latest?.cameraSequence || [],
      }, null, 2));
      setFormNote('');
    } catch (err) {
      console.error('Load form error:', err);
      alert('Failed to load flow for editing.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (flowId) => {
    if (!window.confirm('Delete this flow and all versions?')) return;
    const res = await fetch(`/api/flows/${flowId}`, { method: 'DELETE' });
    if (res.ok) {
      setFlows((prev) => prev.filter((flow) => flow.id !== flowId));
    } else {
      alert('Failed to delete flow.');
    }
  };

  const handleExport = async (flow) => {
    try {
      const res = await fetch(`/api/flows/${flow.id}/versions`);
      if (!res.ok) throw new Error('Failed to load versions');
      const data = await res.json();
      const latest = data.versions?.[0];
      if (!latest) {
        alert('No versions available for export.');
        return;
      }
      const payload = {
        name: flow.name,
        flowId: flow.id,
        exportedAt: new Date().toISOString(),
        nodes: latest.nodes,
        edges: latest.edges,
        cameraSequence: latest.cameraSequence,
      };
      downloadJson(`${flow.name.replace(/\s+/g, '-').toLowerCase()}.json`, payload);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export.');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importFromPayload(parsed, 'Imported JSON file');
    } catch (error) {
      console.error('Import error:', error);
      alert('Invalid JSON file.');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleFormSubmit = async () => {
    if (formLoading || isImporting) return;
    const name = formName.trim();
    if (!name) {
      alert('Flow name is required.');
      return;
    }

    try {
      setFormLoading(true);
      const payload = inputMode === 'combined'
        ? parseCombinedPayload(formCombined)
        : {
          nodes: parseJsonArray(formNodes, 'Nodes'),
          edges: parseJsonArray(formEdges, 'Edges'),
          cameraSequence: parseJsonArray(formCamera, 'CameraSequence'),
        };

      const nodes = payload.nodes;
      const edges = payload.edges;
      const cameraSequence = payload.cameraSequence;

      let flowId = formFlowId;
      if (flowId === 'new') {
        const createRes = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!createRes.ok) throw new Error('Failed to create flow');
        const created = await createRes.json();
        flowId = created.id;
      }

      const layoutedNodes = await ensureLayout(nodes, edges);

      const saveRes = await fetch(`/api/flows/${flowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: layoutedNodes,
          edges,
          cameraSequence,
          versionNote: formNote || 'Manual update',
          name,
        }),
      });
      if (!saveRes.ok) throw new Error('Failed to save version');

      await loadFlows();
      setFormFlowId('new');
      resetForm();
      alert('Flow saved.');
    } catch (error) {
      console.error('Form submit error:', error);
      alert(error.message || 'Failed to save flow.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flow-manager">
      <div className="flow-header">
        <div>
          <h1>Flow Manager</h1>
          <p>Manage, version, and publish flows for Remotion render.</p>
        </div>
        <div className="flow-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            Open Studio
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import from File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
      </div>

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

      {loading && <p className="empty-hint">Loading flows...</p>}
      {error && <p className="empty-hint">{error}</p>}

      {!loading && !error && flows.length === 0 && (
        <p className="empty-hint">No flows yet. Import a JSON or create one in Studio.</p>
      )}

      <div className="flow-grid">
        {flows.map((flow) => (
          <div key={flow.id} className="flow-card">
            <div className="flow-card-thumb">
              {flow.thumbnail ? (
                <img src={flow.thumbnail} alt={flow.name} />
              ) : (
                <div className="flow-card-thumb-empty">No Preview</div>
              )}
            </div>
            <div className="flow-card-body">
              <div className="flow-card-title">{flow.name}</div>
              <div className="flow-card-meta">
                Updated {formatDate(flow.updatedAt)}
              </div>
            </div>
            <div className="flow-card-actions">
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/?flowId=${flow.id}`)}
              >
                Open in Studio
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExport(flow)}
              >
                Export JSON
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(flow.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
