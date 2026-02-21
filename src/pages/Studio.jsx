import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import '@xyflow/react/dist/style.css';
import UniversalNode from '../components/UniversalNode';
import ViralEdge from '../components/ViralEdge';
import { layoutWithElk } from '../utils/elkLayout';

const AI_API_URL = 'http://localhost:8000';

const nodeTypes = { universal: UniversalNode };
const edgeTypes = { viral: ViralEdge };

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

const DEFAULT_HOLD = 60;
const DEFAULT_PAN = 30;
const DEFAULT_ZOOM_CLOSE = 1.8;
const DEFAULT_ZOOM_WIDE = 0.5;

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

function generateAutoSequence(currentNodes, currentEdges, opts = {}) {
  const {
    holdFrames = DEFAULT_HOLD,
    panFrames = DEFAULT_PAN,
    zoomClose = DEFAULT_ZOOM_CLOSE,
    zoomWide = DEFAULT_ZOOM_WIDE,
  } = opts;

  const targetIds = new Set(currentEdges.map((e) => e.target));
  const nonGroupNodes = currentNodes.filter((n) => n.type !== 'group');
  let rootNode = nonGroupNodes.find((n) => !targetIds.has(n.id));
  if (!rootNode) rootNode = nonGroupNodes[0];
  if (!rootNode) return [];

  const visited = new Set();
  const ordered = [];
  const queue = [rootNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = currentNodes.find((n) => n.id === currentId);
    if (node && node.type !== 'group') ordered.push(node);

    const outgoing = currentEdges
      .filter((e) => e.source === currentId)
      .map((e) => e.target)
      .filter((id) => !visited.has(id));
    queue.push(...outgoing);
  }

  for (const n of nonGroupNodes) {
    if (!visited.has(n.id)) ordered.push(n);
  }

  if (ordered.length === 0) return [];

  const sequence = [];
  let frame = 0;

  sequence.push({ frame, targetNodeId: ordered[0].id, zoom: zoomWide });
  frame += holdFrames;

  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i];
    sequence.push({ frame, targetNodeId: node.id, zoom: zoomClose });
    frame += holdFrames;

    if (i < ordered.length - 1) {
      frame += panFrames;
    }
  }

  frame += panFrames;
  sequence.push({ frame, targetNodeId: ordered[ordered.length - 1].id, zoom: zoomWide });

  return sequence;
}

/**
 * Annotate edges with activation timing based on camera sequence.
 * Each edge activates when the camera focuses on its source node.
 */
function annotateEdgesWithTiming(cameraSequence, edges, nodes) {
  if (!cameraSequence || cameraSequence.length === 0) {
    // No sequence — all edges active from start
    return edges.map(edge => ({
      ...edge,
      data: { ...edge.data, startFrame: 0 }
    }));
  }

  return edges.map(edge => {
    // Find the keyframe where camera focuses on this edge's source node
    const sourceKeyframe = cameraSequence.find(kf => kf.targetNodeId === edge.source);
    const startFrame = sourceKeyframe ? sourceKeyframe.frame : 0;

    return {
      ...edge,
      data: { ...edge.data, startFrame }
    };
  });
}

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

function shouldRelayout(nodes) {
  return nodes.some(
    (node) =>
      !node.position ||
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number'
  );
}

async function ensureLayout(nodes, edges) {
  const normalized = normalizeNodes(nodes);
  if (normalized.length === 0) return normalized;
  if (!shouldRelayout(normalized)) return normalized;
  return layoutWithElk(normalized, edges);
}

async function captureThumbnail(containerRef) {
  const target = containerRef.current?.querySelector('.react-flow');
  if (!target) return null;

  try {
    return await toPng(target, {
      cacheBust: true,
      backgroundColor: '#0B0F19',
      pixelRatio: 0.6,
    });
  } catch (error) {
    console.warn('Thumbnail capture failed:', error);
    return null;
  }
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

function StudioInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [cameraSequence, setCameraSequence] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [edgeEffectType, setEdgeEffectType] = useState('neon_path');

  const [holdFrames, setHoldFrames] = useState(DEFAULT_HOLD);
  const [panFrames, setPanFrames] = useState(DEFAULT_PAN);
  const [zoomClose, setZoomClose] = useState(DEFAULT_ZOOM_CLOSE);
  const [zoomWide, setZoomWide] = useState(DEFAULT_ZOOM_WIDE);

  const [kfFrame, setKfFrame] = useState(0);
  const [kfZoom, setKfZoom] = useState(1.5);
  const [kfTargetNodeId, setKfTargetNodeId] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [flowId, setFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [versions, setVersions] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef(null);
  const importInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const onNodeClick = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
    setKfTargetNodeId(node.id);
  }, []);

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

  const removeKeyframe = useCallback((idx) => {
    setCameraSequence((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateKeyframe = useCallback((idx, field, value) => {
    setCameraSequence((prev) =>
      prev.map((kf, i) => {
        if (i !== idx) return kf;
        return { ...kf, [field]: value };
      }).sort((a, b) => a.frame - b.frame)
    );
  }, []);

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
    
    // Annotate edges with activation timing based on camera sequence
    const annotatedEdges = annotateEdgesWithTiming(seq, edges, nodes);
    setEdges(annotatedEdges);
    
    // Auto-enable preview mode to see the synchronized animation
    setPreviewMode(true);
  }, [nodes, edges, cameraSequence.length, holdFrames, panFrames, zoomClose, zoomWide, setEdges]);

  const handleExport = async () => {
    setLoading(true);
    setVideoUrl(null);

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
          edgeEffectType,
          previewMode,
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

  const loadVersions = useCallback(async (id) => {
    if (!id) return;
    const res = await fetch(`/api/flows/${id}/versions`);
    if (!res.ok) {
      throw new Error('Failed to load versions');
    }
    const data = await res.json();
    setVersions(data.versions || []);
    setFlowName(data.flow?.name || flowName || '');
  }, [flowName]);

  const loadFlow = useCallback(async (id) => {
    const res = await fetch(`/api/flows/${id}/versions`);
    if (!res.ok) {
      throw new Error('Failed to load flow');
    }
    const data = await res.json();
    const latest = data.versions?.[0];
    if (latest) {
      const layoutedNodes = await ensureLayout(latest.nodes || [], latest.edges || []);
      setNodes(layoutedNodes);
      setEdges(latest.edges || []);
      setCameraSequence(latest.cameraSequence || []);
    }
    setFlowId(id);
    setFlowName(data.flow?.name || '');
    setVersions(data.versions || []);
  }, [setNodes, setEdges, setCameraSequence]);

  useEffect(() => {
    const urlFlowId = searchParams.get('flowId');
    if (urlFlowId) {
      loadFlow(urlFlowId).catch((error) => {
        console.warn('Failed to load flow:', error);
      });
    }
  }, [searchParams, loadFlow]);

  useEffect(() => {
    if (isHistoryOpen && flowId && versions.length === 0) {
      loadVersions(flowId).catch((error) => {
        console.warn('Failed to load versions:', error);
      });
    }
  }, [isHistoryOpen, flowId, versions.length, loadVersions]);

  const handleSaveVersion = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let currentFlowId = flowId;
      let name = flowName?.trim();
      if (!name) {
        name = window.prompt('Flow name', 'Untitled Flow');
      }
      if (!name) {
        setIsSaving(false);
        return;
      }

      if (!currentFlowId) {
        const createRes = await fetch('/api/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        if (!createRes.ok) {
          throw new Error('Failed to create flow');
        }
        const created = await createRes.json();
        currentFlowId = created.id;
        setFlowId(created.id);
        setFlowName(created.name || name);
      }

      const versionNote = window.prompt('Version note', '') || '';
      const thumbnail = await captureThumbnail(canvasRef);

      const res = await fetch(`/api/flows/${currentFlowId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          edges,
          cameraSequence,
          versionNote,
          thumbnail,
          name,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save version');
      }

      await loadVersions(currentFlowId);
      if (!isHistoryOpen) {
        setIsHistoryOpen(true);
      }
      alert('Saved version.');
    } catch (error) {
      console.error('Save version error:', error);
      alert('Failed to save version.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRollback = async (version) => {
    if (!version) return;
    const layoutedNodes = await ensureLayout(version.nodes || [], version.edges || []);
    setNodes(layoutedNodes);
    setEdges(version.edges || []);
    setCameraSequence(version.cameraSequence || []);
  };

  const handleExportJson = () => {
    const payload = {
      name: flowName || 'Untitled Flow',
      flowId: flowId || null,
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
      cameraSequence,
    };
    downloadJson(`${payload.name.replace(/\s+/g, '-').toLowerCase()}.json`, payload);
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const importedEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
      const importedCamera = Array.isArray(parsed.cameraSequence) ? parsed.cameraSequence : [];

      const layoutedNodes = await ensureLayout(importedNodes, importedEdges);
      setNodes(layoutedNodes);
      setEdges(importedEdges);
      setCameraSequence(importedCamera);
      setFlowName(parsed.name || 'Imported Flow');
      setFlowId(null);
      setVersions([]);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Invalid JSON file.');
    } finally {
      event.target.value = '';
    }
  };

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
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'status') {
              setAiStatus({ step: event.step, message: event.message });
            } else if (event.type === 'eval') {
              if (!event.passed) {
                const issueCount = (event.issues || []).length;
                setAiStatus({
                  step: 'eval-retry',
                  message: `⚠️ Phát hiện ${issueCount} lỗi — đang thử lại...`,
                });
              }
            } else if (event.type === 'result') {
              setAiStatus({ step: 'layout', message: '📐 Đang tính toán layout...' });

              const sortedNodes = [
                ...event.nodes.filter((n) => n.type === 'group'),
                ...event.nodes.filter((n) => n.type !== 'group'),
              ];

              const rfNodes = sortedNodes.map((n) => ({
                id: n.id,
                type: n.type || 'universal',
                data: n.data || { title: n.id },
                position: { x: 0, y: 0 },
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

              const layoutedNodes = await layoutWithElk(rfNodes, rfEdges);

              setNodes(layoutedNodes);
              setEdges(rfEdges);
              setCameraSequence([]);
              setFlowId(null);
              setVersions([]);
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

  const selectableNodes = nodes.filter((n) => n.type !== 'group');

  return (
    <div className="studio-layout">
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

      <div className="studio-canvas" ref={canvasRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges.map(edge => ({
            ...edge,
            data: { ...edge.data, previewMode, effectType: edgeEffectType }
          }))}
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

      <div className="studio-sidebar glass-panel">
        <div className="studio-sidebar-header">
          <div>
            <h2 className="sidebar-title">Studio</h2>
            <p className="sidebar-hint">TikTok 9:16 · 1080×1920</p>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/flows')}>
            Flow Manager
          </button>
        </div>

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
            <button className="btn btn-save" onClick={handleSaveVersion} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Version'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              disabled={!flowId}
            >
              Version History
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

        {selectedNodeId && (
          <div className="selected-indicator">
            Selected: <strong>{selectedNodeId}</strong>
          </div>
        )}

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

        <div className="section">
          <label className="section-label">✨ Edge Visual Effects</label>
          
          <div className="form-field">
            <label className="field-label">Effect Type</label>
            <select 
              className="field-input" 
              value={edgeEffectType} 
              onChange={(e) => setEdgeEffectType(e.target.value)}
              style={{ 
                fontSize: '13px',
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
              }}
            >
              <option value="neon_path">⚡ Neon Path (Microservices)</option>
              <option value="particle_blast">💥 Particle Blast (CI/CD)</option>
              <option value="stepped_circuit">🔧 Stepped Circuit (Kubernetes)</option>
              <option value="ghost_echo">👻 Ghost Echo (Monitoring)</option>
              <option value="electric_bolt">⚡ Electric Bolt (Lightning)</option>
              <option value="data_packets">📦 Data Packets (Streaming)</option>
              <option value="liquid_gradient">🌊 Liquid Gradient (Flow)</option>
              <option value="pulse_glow">💓 Pulse Glow (Energy)</option>
            </select>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#60a5fa' }}>💡 Effect Suggestions</div>
            <table style={{ width: '100%', fontSize: '10px', lineHeight: '1.4' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>Effect</th>
                  <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>Feel</th>
                  <th style={{ textAlign: 'left', padding: '4px 0', color: '#94a3b8' }}>Best For</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '3px 0' }}>⚡ Neon Path</td>
                  <td style={{ padding: '3px 0' }}>Modern</td>
                  <td style={{ padding: '3px 0' }}>API Calls</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>💥 Particle Blast</td>
                  <td style={{ padding: '3px 0' }}>Powerful</td>
                  <td style={{ padding: '3px 0' }}>CI/CD Success</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>🔧 Stepped Circuit</td>
                  <td style={{ padding: '3px 0' }}>Precise</td>
                  <td style={{ padding: '3px 0' }}>Kubernetes</td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0' }}>👻 Ghost Echo</td>
                  <td style={{ padding: '3px 0' }}>Smooth</td>
                  <td style={{ padding: '3px 0' }}>Monitoring</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="section">
          <label className="section-label">Auto Direct (AI Camera)</label>

          <div className="form-row" style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '14px' }}>🎬 Sync Edges with Camera</span>
            </label>
          </div>

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

      <div className={`version-drawer ${isHistoryOpen ? 'open' : ''}`}>
        <div className="version-drawer-header">
          <div>
            <h3>Version History</h3>
            <p>{flowName || 'Untitled Flow'}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setIsHistoryOpen(false)}>
            Close
          </button>
        </div>
        {!flowId && (
          <p className="empty-hint">Save a version to enable history.</p>
        )}
        {flowId && (
          <div className="version-list">
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
                  <button className="btn btn-secondary" onClick={() => handleRollback(version)}>
                    Rollback
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {flowId && (
          <button className="btn btn-secondary" onClick={() => loadVersions(flowId)}>
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

export default function Studio() {
  return (
    <ReactFlowProvider>
      <StudioInner />
    </ReactFlowProvider>
  );
}
