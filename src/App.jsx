import { useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import UniversalNode from './components/UniversalNode';
import ViralEdge from './components/ViralEdge';
import './styles/App.css';
import './styles/index.css';

// ── Node & edge type maps (stable refs, outside component) ──
const nodeTypes = { universal: UniversalNode };
const edgeTypes = { viral: ViralEdge };

// ── Dummy data: GitOps pipeline (type → 'universal', data → { title, subtitle, icon }) ──
const initialNodes = [
  { id: 'source-code', type: 'universal', data: { title: 'Source Code', subtitle: 'Commit & Push', icon: '📝' }, position: { x: 50, y: 50 } },
  { id: 'ci-pipeline', type: 'universal', data: { title: 'CI Pipeline', subtitle: 'Build & Test', icon: '⚙️' }, position: { x: 50, y: 200 } },
  { id: 'docker-registry', type: 'universal', data: { title: 'Docker Registry', subtitle: 'Store Image', icon: '📦' }, position: { x: 300, y: 200 } },
  { id: 'gitops-repo', type: 'universal', data: { title: 'GitOps Repo', subtitle: 'Manifests', icon: '📜' }, position: { x: 550, y: 200 } },
  { id: 'argocd', type: 'universal', data: { title: 'Argo CD', subtitle: 'Sync Controller', icon: '🐙' }, position: { x: 550, y: 350 } },
  {
    id: 'k3d-cluster', type: 'group', data: { label: 'K3d Cluster' },
    position: { x: 250, y: 450 },
    style: {
      width: 400, height: 220,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px dashed rgba(255, 255, 255, 0.2)',
      borderRadius: '16px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 'bold', padding: '10px',
    },
  },
  { id: 'deployment', type: 'universal', data: { title: 'Deployment', subtitle: 'Pods', icon: '🚀' }, position: { x: 30, y: 60 }, parentId: 'k3d-cluster', extent: 'parent' },
  { id: 'service', type: 'universal', data: { title: 'Service', subtitle: 'LoadBalancer', icon: '🌐' }, position: { x: 220, y: 60 }, parentId: 'k3d-cluster', extent: 'parent' },
  { id: 'user', type: 'universal', data: { title: 'End User', subtitle: '', icon: '👤' }, position: { x: 390, y: 750 } },
];

const initialEdges = [
  { id: 'e1', source: 'source-code', target: 'ci-pipeline', type: 'viral', label: 'Push Code', style: { stroke: '#f97316' } },
  { id: 'e2', source: 'ci-pipeline', target: 'docker-registry', type: 'viral', label: 'Push Image', style: { stroke: '#8b5cf6' } },
  { id: 'e3', source: 'ci-pipeline', target: 'gitops-repo', type: 'viral', label: 'Update Tag', style: { stroke: '#8b5cf6' } },
  { id: 'e4', source: 'gitops-repo', target: 'argocd', type: 'viral', label: 'Watch', style: { stroke: '#f97316' } },
  { id: 'e5', source: 'argocd', target: 'deployment', type: 'viral', label: 'Sync', style: { stroke: '#06b6d4' } },
  { id: 'e6', source: 'docker-registry', target: 'deployment', type: 'viral', label: 'Pull Image', style: { stroke: '#a855f7' } },
  { id: 'e7', source: 'deployment', target: 'service', type: 'viral', style: { stroke: '#10b981' } },
  { id: 'e8', source: 'service', target: 'user', type: 'viral', label: 'Access', style: { stroke: '#ec4899' } },
];

// ── Auto Direct: Heuristic camera sequence generator ──
// Hold & Pan rule: for each node → [pan to node] then [hold on node]
const DEFAULT_HOLD = 60;  // frames to hold/focus on each node
const DEFAULT_PAN = 30;   // frames to pan/transition between nodes
const DEFAULT_ZOOM_CLOSE = 1.8; // zoom when focused on a single node
const DEFAULT_ZOOM_WIDE = 0.5;  // zoom for the opening wide shot

function generateAutoSequence(currentNodes, currentEdges, opts = {}) {
  const {
    holdFrames = DEFAULT_HOLD,
    panFrames = DEFAULT_PAN,
    zoomClose = DEFAULT_ZOOM_CLOSE,
    zoomWide = DEFAULT_ZOOM_WIDE,
  } = opts;

  // Step 1: Find root node (no incoming edges)
  const targetIds = new Set(currentEdges.map((e) => e.target));
  const nonGroupNodes = currentNodes.filter((n) => n.type !== 'group');
  let rootNode = nonGroupNodes.find((n) => !targetIds.has(n.id));
  if (!rootNode) rootNode = nonGroupNodes[0];
  if (!rootNode) return [];

  // Step 2: BFS/DFS traversal following edges (source → target)
  const visited = new Set();
  const ordered = [];
  const queue = [rootNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = currentNodes.find((n) => n.id === currentId);
    if (node && node.type !== 'group') ordered.push(node);

    // Find outgoing edges, enqueue targets
    const outgoing = currentEdges
      .filter((e) => e.source === currentId)
      .map((e) => e.target)
      .filter((id) => !visited.has(id));
    queue.push(...outgoing);
  }

  // Also pick up any non-group nodes not connected to the main graph
  for (const n of nonGroupNodes) {
    if (!visited.has(n.id)) ordered.push(n);
  }

  if (ordered.length === 0) return [];

  // Step 3: Build Hold & Pan keyframes
  const sequence = [];
  let frame = 0;

  // Opening: wide shot of the first node area
  sequence.push({ frame, targetNodeId: ordered[0].id, zoom: zoomWide });
  frame += holdFrames;

  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i];
    // Pan to node (arrive at close zoom)
    sequence.push({ frame, targetNodeId: node.id, zoom: zoomClose });
    frame += holdFrames; // hold on node

    // If not last node, add pan transition time
    if (i < ordered.length - 1) {
      frame += panFrames;
    }
  }

  // Ending: pull back to wide shot on last node
  frame += panFrames;
  sequence.push({ frame, targetNodeId: ordered[ordered.length - 1].id, zoom: zoomWide });

  return sequence;
}

// ── Studio App ──
function StudioInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Camera timeline state
  const [cameraSequence, setCameraSequence] = useState([]);

  // Auto Direct timing settings
  const [holdFrames, setHoldFrames] = useState(DEFAULT_HOLD);
  const [panFrames, setPanFrames] = useState(DEFAULT_PAN);
  const [zoomClose, setZoomClose] = useState(DEFAULT_ZOOM_CLOSE);
  const [zoomWide, setZoomWide] = useState(DEFAULT_ZOOM_WIDE);

  // Keyframe form fields
  const [kfFrame, setKfFrame] = useState(0);
  const [kfZoom, setKfZoom] = useState(1.5);
  const [kfTargetNodeId, setKfTargetNodeId] = useState('');

  // Selected node (auto-fill on click)
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Render state
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  // When user clicks a node on canvas → auto-fill the keyframe form
  const onNodeClick = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    setKfTargetNodeId(node.id);
  }, []);

  // Add keyframe
  const addKeyframe = useCallback(() => {
    const kf = {
      frame: Math.max(0, kfFrame),
      zoom: kfZoom,
      ...(kfTargetNodeId ? { targetNodeId: kfTargetNodeId } : {}),
    };
    setCameraSequence((prev) =>
      [...prev, kf].sort((a, b) => a.frame - b.frame)
    );
  }, [kfFrame, kfZoom, kfTargetNodeId]);

  // Remove keyframe by index
  const removeKeyframe = useCallback((idx) => {
    setCameraSequence((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Edit a single keyframe field inline
  const updateKeyframe = useCallback((idx, field, value) => {
    setCameraSequence((prev) =>
      prev.map((kf, i) => {
        if (i !== idx) return kf;
        const updated = { ...kf, [field]: value };
        return updated;
      }).sort((a, b) => a.frame - b.frame)
    );
  }, []);

  // Auto Direct handler
  const handleAutoRirect = useCallback(() => {
    if (
      cameraSequence.length > 0 &&
      !window.confirm('Overwrite the current timeline with Auto Direct?')
    ) {
      return;
    }
    const seq = generateAutoSequence(nodes, edges, {
      holdFrames,
      panFrames,
      zoomClose,
      zoomWide,
    });
    setCameraSequence(seq);
  }, [nodes, edges, cameraSequence.length, holdFrames, panFrames, zoomClose, zoomWide]);

  // Export MP4
  const handleExport = async () => {
    setLoading(true);
    setVideoUrl(null);

    // Compute render duration: last keyframe frame + 90 buffer, minimum 300 frames
    const lastFrame = cameraSequence.length
      ? Math.max(...cameraSequence.map((k) => k.frame))
      : 0;
    const renderDuration = Math.max(lastFrame + 90, 300);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          edges,
          cameraSequence,
          renderWidth: 1080,
          renderHeight: 1920,
          renderDuration,
          renderFps: 60,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail;
        try { detail = JSON.parse(text); } catch { detail = { error: text }; }
        alert('Render failed: ' + (detail.error || res.statusText));
        return;
      }

      const data = await res.json();
      if (data.success) {
        setVideoUrl(data.videoUrl);
      } else {
        alert('Render failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Backend server not running. Start with: npm run dev:full');
    } finally {
      setLoading(false);
    }
  };

  // Selectable nodes for dropdown (exclude groups)
  const selectableNodes = nodes.filter((n) => n.type !== 'group');

  return (
    <div className="studio-layout">
      {/* ───── Canvas (main area) ───── */}
      <div className="studio-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          nodesConnectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1a1a1a" gap={20} size={1} />
          <Controls style={{ background: '#1a1a1a', border: '1px solid #333' }} />
          <MiniMap nodeColor="#444" style={{ background: '#0a0a0a', border: '1px solid #333' }} />
        </ReactFlow>
      </div>

      {/* ───── Sidebar (Timeline Editor) ───── */}
      <div className="studio-sidebar glass-panel">
        <h2 className="sidebar-title">Studio</h2>
        <p className="sidebar-hint">TikTok 9:16 · 1080×1920</p>

        {/* ─ Selected node indicator ─ */}
        {selectedNodeId && (
          <div className="selected-indicator">
            Selected: <strong>{selectedNodeId}</strong>
          </div>
        )}

        {/* ─ Add Keyframe Form ─ */}
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

        {/* ─ Auto Direct ─ */}
        <div className="section">
          <label className="section-label">Auto Direct (AI Camera)</label>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Hold (frames)</label>
              <input className="field-input" type="number" min={10} max={300} value={holdFrames}
                onChange={(e) => setHoldFrames(Math.max(10, parseInt(e.target.value || '60', 10)))} />
            </div>
            <div className="form-field">
              <label className="field-label">Pan (frames)</label>
              <input className="field-input" type="number" min={5} max={120} value={panFrames}
                onChange={(e) => setPanFrames(Math.max(5, parseInt(e.target.value || '30', 10)))} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">Close zoom</label>
              <input className="field-input" type="number" step="0.1" min={0.5} max={5} value={zoomClose}
                onChange={(e) => setZoomClose(parseFloat(e.target.value || '1.8'))} />
            </div>
            <div className="form-field">
              <label className="field-label">Wide zoom</label>
              <input className="field-input" type="number" step="0.1" min={0.1} max={3} value={zoomWide}
                onChange={(e) => setZoomWide(parseFloat(e.target.value || '0.5'))} />
            </div>
          </div>

          <button className="btn btn-auto" onClick={handleAutoRirect}>
            ✨ Auto Direct (AI Camera)
          </button>
        </div>

        {/* ─ Keyframe List ─ */}
        <div className="section">
          <label className="section-label">
            Timeline ({cameraSequence.length} keyframes)
          </label>

          {cameraSequence.length === 0 && (
            <p className="empty-hint">Click a node, then add keyframes — or use Auto Direct above.</p>
          )}

          <div className="keyframe-list">
            {cameraSequence.map((kf, idx) => (
              <div key={idx} className="kf-item">
                <input className="kf-edit kf-edit-frame" type="number" min={0} value={kf.frame}
                  onChange={(e) => updateKeyframe(idx, 'frame', Math.max(0, parseInt(e.target.value || '0', 10)))} title="Frame" />
                <select className="kf-edit kf-edit-target" value={kf.targetNodeId || ''}
                  onChange={(e) => updateKeyframe(idx, 'targetNodeId', e.target.value || undefined)}>
                  <option value="">manual</option>
                  {selectableNodes.map((n) => (
                    <option key={n.id} value={n.id}>{n.data?.title || n.id}</option>
                  ))}
                </select>
                <input className="kf-edit kf-edit-zoom" type="number" step="0.1" min={0.1} max={5} value={kf.zoom}
                  onChange={(e) => updateKeyframe(idx, 'zoom', parseFloat(e.target.value || '1'))} title="Zoom" />
                <button className="kf-remove" onClick={() => removeKeyframe(idx)} title="Remove keyframe">✕</button>
              </div>
            ))}
          </div>

          {cameraSequence.length > 0 && (
            <button
              className="btn btn-clear"
              onClick={() => setCameraSequence([])}
            >
              Clear All
            </button>
          )}
        </div>

        {/* ─ Export ─ */}
        <div className="section export-section">
          <button
            className="btn btn-export"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? '🎬 Rendering...' : '🚀 Export MP4'}
          </button>

          {videoUrl && (
            <div className="export-result">
              <div className="success-msg">✨ Render Complete!</div>
              <video
                src={videoUrl}
                controls
                autoPlay
                width="100%"
                style={{ borderRadius: 8, marginTop: 8 }}
              />
              <a href={videoUrl} download className="download-link">
                📥 Download MP4
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <StudioInner />
    </ReactFlowProvider>
  );
}

