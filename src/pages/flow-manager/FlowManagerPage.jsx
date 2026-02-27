import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureLayout } from '../../utils/flowUtils';
import { downloadJson } from '../../utils/exportUtils';
import FlowHeader from './components/FlowHeader';
import FlowImportPanel from './components/FlowImportPanel';
import FlowGrid from './components/FlowGrid';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString();
}

export default function FlowManagerPage() {
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
      throw new Error(
        'Combined input must be an object with nodes, edges, cameraSequence.'
      );
    }
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      cameraSequence: Array.isArray(parsed.cameraSequence)
        ? parsed.cameraSequence
        : [],
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
      setFormCombined(
        JSON.stringify(
          {
            nodes: latest?.nodes || [],
            edges: latest?.edges || [],
            cameraSequence: latest?.cameraSequence || [],
          },
          null,
          2
        )
      );
      setFormNote('');
    } catch (err) {
      console.error('Load form error:', err);
      alert('Failed to load flow for editing.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (flow) => {
    if (!window.confirm('Delete this flow and all versions?')) return;
    const res = await fetch(`/api/flows/${flow.id}`, { method: 'DELETE' });
    if (res.ok) {
      setFlows((prev) => prev.filter((item) => item.id !== flow.id));
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
      downloadJson(
        `${flow.name.replace(/\s+/g, '-').toLowerCase()}.json`,
        payload
      );
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
      const payload =
        inputMode === 'combined'
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
      <FlowHeader
        onOpenStudio={() => navigate('/')}
        onImportClick={() => fileInputRef.current?.click()}
        isImporting={isImporting}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImport}
      />

      <FlowImportPanel
        inputMode={inputMode}
        setInputMode={setInputMode}
        handleFormSubmit={handleFormSubmit}
        formLoading={formLoading}
        isImporting={isImporting}
        flows={flows}
        formFlowId={formFlowId}
        setFormFlowId={setFormFlowId}
        resetForm={resetForm}
        loadFormFromFlow={loadFormFromFlow}
        formName={formName}
        setFormName={setFormName}
        formNote={formNote}
        setFormNote={setFormNote}
        formNodes={formNodes}
        setFormNodes={setFormNodes}
        formEdges={formEdges}
        setFormEdges={setFormEdges}
        formCamera={formCamera}
        setFormCamera={setFormCamera}
        formCombined={formCombined}
        setFormCombined={setFormCombined}
      />

      {loading && <p className="empty-hint">Loading flows...</p>}
      {error && <p className="empty-hint">{error}</p>}

      {!loading && !error && flows.length === 0 && (
        <p className="empty-hint">
          No flows yet. Import a JSON or create one in Studio.
        </p>
      )}

      <FlowGrid
        flows={flows}
        onOpenFlow={(flow) => navigate(`/?flowId=${flow.id}`)}
        onExportFlow={handleExport}
        onDeleteFlow={handleDelete}
        formatDate={formatDate}
      />
    </div>
  );
}
