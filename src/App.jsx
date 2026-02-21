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
import { layoutWithElk } from './utils/elkLayout';
import './styles/App.css';
import './styles/index.css';

const AI_API_URL = 'http://localhost:8000';

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
      width: 520, height: 260,
      backgroundColor: 'rgba(30, 41, 59, 0.35)',
      border: '1px dashed rgba(148, 163, 184, 0.25)',
      borderRadius: '20px', color: 'rgba(248, 250, 252, 0.6)', fontWeight: 'bold', padding: '16px',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
    },
  },
  { id: 'deployment', type: 'universal', data: { title: 'Deployment', subtitle: 'Pods', icon: '🚀' }, position: { x: 40, y: 70 }, parentId: 'k3d-cluster', extent: 'parent' },
  { id: 'service', type: 'universal', data: { title: 'Service', subtitle: 'LoadBalancer', icon: '🌐' }, position: { x: 280, y: 70 }, parentId: 'k3d-cluster', extent: 'parent' },
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

  // AI Generate state
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState(null); // { step, message }
  const [aiError, setAiError] = useState(null);

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

  // ── AI Generate Flow handler (SSE) ──
  const handleGenerateFlow = useCallback(async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setAiStatus({ step: 'start', message: '🚀 Đang kết nối AI server...' });
    setAiError(null);

    try {
      const res = await fetch(`${AI_API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'status') {
              setAiStatus({ step: event.step, message: event.message });
            } else if (event.type === 'eval') {
              // Evaluator feedback — show pass/fail status
              if (!event.passed) {
                const issueCount = (event.issues || []).length;
                setAiStatus({
                  step: 'eval-retry',
                  message: `⚠️ Phát hiện ${issueCount} lỗi — đang thử lại...`,
                });
              }
              // If passed, status is already set by the 'status' event
            } else if (event.type === 'result') {
              setAiStatus({ step: 'layout', message: '📐 Đang tính toán layout...' });

              // Build React Flow nodes from AI response
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

              // Group nodes MUST come before their children in the array
              const sortedNodes = [
                ...event.nodes.filter((n) => n.type === 'group'),
                ...event.nodes.filter((n) => n.type !== 'group'),
              ];

              const rfNodes = sortedNodes.map((n) => ({
                id: n.id,
                type: n.type || 'universal',
                data: n.data || { title: n.id },
                position: { x: 0, y: 0 }, // placeholder — ELK will compute
                ...(n.parentId ? { parentId: n.parentId, extent: n.extent || 'parent' } : {}),
                ...(n.type === 'group'
                  ? { style: { ...groupDefaultStyle, ...(n.style || {}) } }
                  : {}),
              }));

              const rfEdges = event.edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type || 'viral',
                ...(e.label ? { label: e.label } : {}),
                ...(e.style ? { style: e.style } : {}),
              }));

              // Run ELK layout
              const layoutedNodes = await layoutWithElk(rfNodes, rfEdges);

              setNodes(layoutedNodes);
              setEdges(rfEdges);
              setCameraSequence([]); // clear old timeline
              setAiStatus({ step: 'done', message: '✅ Hoàn thành!' });
            } else if (event.type === 'error') {
              setAiError(event.message);
              setAiStatus(null);
            }
          } catch (parseErr) {
            console.warn('SSE parse error:', parseErr, line);
          }
        }
      }
    } catch (err) {
      console.error('Generate flow error:', err);
      setAiError(err.message || 'Không thể kết nối AI server');
      setAiStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }, [promptText, setNodes, setEdges, setCameraSequence]);

  // Selectable nodes for dropdown (exclude groups)
  const selectableNodes = nodes.filter((n) => n.type !== 'group');

  return (
    <div className="studio-layout">
      {/* ───── Left Sidebar (AI Prompt) ───── */}
      <div className="studio-sidebar-left glass-panel">
        <h2 className="sidebar-title">🤖 AI Flow</h2>
        <p className="sidebar-hint">Mô tả hệ thống, AI sẽ sinh sơ đồ</p>

        <div className="section">
          <label className="section-label">Prompt</label>
          <textarea
            className="field-input prompt-textarea"
            placeholder="Ví dụ: Hệ thống CI/CD với GitOps, ArgoCD, Docker Registry, K3d cluster..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={5}
            disabled={isGenerating}
          />

          <button
            className="btn btn-generate"
            onClick={handleGenerateFlow}
            disabled={isGenerating || !promptText.trim()}
          >
            {isGenerating ? '⏳ Đang sinh...' : '🚀 Generate Flow'}
          </button>
        </div>

        {/* Agent status stream */}
        {aiStatus && (
          <div className="ai-status-panel">
            <div className={`ai-status-dot ${aiStatus.step === 'done' ? 'done' : 'active'}`} />
            <span className="ai-status-text">{aiStatus.message}</span>
          </div>
        )}

        {aiError && (
          <div className="ai-error-panel">
            ⚠️ {aiError}
          </div>
        )}

        {/* Quick templates */}
        <div className="section" style={{ marginTop: 'auto' }}>
          <label className="section-label">Quick Templates</label>
          {[
            { label: 'GitOps CI/CD', prompt: 'GitOps CI/CD pipeline with GitHub Actions, Docker Registry, ArgoCD, and Kubernetes cluster with deployments and services' },
            { label: 'Microservices', prompt: 'Microservices architecture with API Gateway, Auth Service, User Service, Product Service, Order Service, Message Queue, and PostgreSQL databases' },
            { label: 'ML Pipeline', prompt: 'Machine Learning pipeline with data ingestion, feature engineering, model training, model registry, A/B testing, and serving infrastructure' },
          ].map((t) => (
            <button
              key={t.label}
              className="btn btn-template"
              onClick={() => setPromptText(t.prompt)}
              disabled={isGenerating}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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
          nodesConnectable={true}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" color="#1E293B" gap={24} size={2} />
          <Controls style={{ background: '#0F172A', border: '1px solid rgba(148, 163, 184, 0.15)' }} />
          <MiniMap nodeColor="#334155" style={{ background: '#0B0F19', border: '1px solid rgba(148, 163, 184, 0.15)' }} />
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

