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
import '@xyflow/react/dist/style.css';
import UniversalNode from '../components/UniversalNode';
import ViralEdge from '../components/ViralEdge';
import { layoutWithElk } from '../utils/elkLayout';
import { initialNodes, initialEdges, groupDefaultStyle } from '../constants/flowConstants';
import { generateAutoSequence, annotateEdgesWithTiming } from '../utils/autoDirect';
import { ensureLayout } from '../utils/flowUtils';
import { captureThumbnail, downloadJson } from '../utils/exportUtils';

const AI_API_URL = 'http://localhost:8000';

const nodeTypes = { universal: UniversalNode };
const edgeTypes = { viral: ViralEdge };

function StudioInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [cameraSequence, setCameraSequence] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [edgeEffectType, setEdgeEffectType] = useState('neon_path');
  const [introText, setIntroText] = useState('');



  const [kfFrame, setKfFrame] = useState(0);
  const [kfZoom, setKfZoom] = useState(1.5);
  const [kfTargetNodeId, setKfTargetNodeId] = useState('');

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [renderQuality, setRenderQuality] = useState('standard');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderEta, setRenderEta] = useState(null);
  const [renderElapsed, setRenderElapsed] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);

  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiError, setAiError] = useState(null);

  const [flowId, setFlowId] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [versions, setVersions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('blueprint');

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
    const seq = generateAutoSequence(nodes, edges);
    setCameraSequence(seq);

    // Annotate edges with activation timing based on camera sequence
    const annotatedEdges = annotateEdgesWithTiming(seq, edges, nodes);
    setEdges(annotatedEdges);

    // Auto-enable preview mode to see the synchronized animation
    setPreviewMode(true);
  }, [nodes, edges, cameraSequence.length, setEdges]);

  const handleExport = async () => {
    setLoading(true);
    setVideoUrl(null);
    setRenderProgress(0);
    setRenderEta(null);
    setRenderElapsed(null);
    setRenderStatus('Starting...');

    const lastFrame = cameraSequence.length
      ? Math.max(...cameraSequence.map((k) => k.frame))
      : 0;
    const renderDuration = Math.max(lastFrame + 90, 300);

    try {
      const res = await fetch('/api/render-stream', {
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
          quality: renderQuality,
          introText,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail;
        try { detail = JSON.parse(text); } catch { detail = { error: text }; }
        alert('Render failed: ' + (detail.error || res.statusText));
        return;
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
              setRenderStatus(event.message);
            } else if (event.type === 'progress') {
              setRenderProgress(event.progress);
              setRenderEta(event.eta);
              setRenderElapsed(event.elapsed);
              setRenderStatus(`Rendering... ${event.progress}%`);
            } else if (event.type === 'complete') {
              setVideoUrl(event.videoUrl);
              setRenderProgress(100);
              setRenderElapsed(event.elapsed);
              setRenderEta(null);
              setRenderStatus(null);
            } else if (event.type === 'error') {
              alert('Render failed: ' + event.message);
              setRenderStatus(null);
            }
          } catch (e) {
            console.warn('SSE parse error:', e, line);
          }
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Backend server not running. Start with: npm run dev:full');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRender = async () => {
    try {
      await fetch('/api/render/cancel', { method: 'POST' });
      setLoading(false);
      setRenderStatus(null);
      setRenderProgress(0);
    } catch (err) {
      console.error('Cancel error:', err);
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
      <div className="studio-main">
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

          {selectedNodeId && (
            <div className="selected-indicator">
              Selected: <strong>{selectedNodeId}</strong>
            </div>
          )}

          <div className="tab-nav">
            <button
              className={`tab-btn ${activeTab === 'blueprint' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('blueprint')}
            >
              🏗️ Blueprint
            </button>
            <button
              className={`tab-btn ${activeTab === 'directing' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('directing')}
            >
              🎬 Directing
            </button>
            <button
              className={`tab-btn ${activeTab === 'fx' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('fx')}
            >
              ✨ FX
            </button>
            <button
              className={`tab-btn ${activeTab === 'render' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('render')}
            >
              🎞️ Render
            </button>
          </div>

          {activeTab === 'blueprint' && (
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
                  <button className="btn btn-save" onClick={handleSaveVersion} disabled={isSaving}>
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
                    <button className="btn btn-secondary" onClick={() => loadVersions(flowId)} style={{ marginBottom: '12px' }}>
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
                            <button className="btn btn-secondary" onClick={() => handleRollback(version)}>
                              Rollback
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'directing' && (
            <div className="tab-content">
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



                <button className="btn btn-auto" onClick={handleAutoRirect}>
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
          )}

          {activeTab === 'fx' && (
            <div className="tab-content">
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
            </div>
          )}

          {activeTab === 'render' && (
            <div className="tab-content">
              <div className="section">
                <label className="section-label">Quality Preset</label>
                <div className="render-presets">
                  {[
                    { key: 'draft', label: '⚡ Draft', desc: 'Fastest · 2Mbps' },
                    { key: 'standard', label: '🎬 Standard', desc: 'Balanced · 8Mbps' },
                    { key: 'high', label: '💎 High', desc: 'Best quality · 15Mbps' },
                    { key: 'prores', label: '🎞️ ProRes', desc: 'Editing · Huge file' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      className={`btn btn-preset ${renderQuality === p.key ? 'btn-preset-active' : ''}`}
                      onClick={() => setRenderQuality(p.key)}
                      disabled={loading}
                    >
                      <span className="preset-label">{p.label}</span>
                      <span className="preset-desc">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="section">
                <label className="section-label">Performance</label>
                <div className="perf-badges">
                  <span className="perf-badge">🖥️ GPU Accel</span>
                  <span className="perf-badge">⚡ HW Encode</span>
                  <span className="perf-badge">🧵 Multi-thread</span>
                  <span className="perf-badge">📸 JPEG Frames</span>
                </div>
              </div>

              <div className="section export-section">
                {!loading ? (
                  <button
                    className="btn btn-export"
                    onClick={handleExport}
                  >
                    🚀 Export {renderQuality === 'prores' ? 'MOV' : 'MP4'}
                  </button>
                ) : (
                  <button
                    className="btn btn-cancel"
                    onClick={handleCancelRender}
                  >
                    ✕ Cancel Render
                  </button>
                )}

                {loading && (
                  <div className="render-progress-container">
                    <div className="render-progress-bar">
                      <div
                        className="render-progress-fill"
                        style={{ width: `${renderProgress}%` }}
                      />
                    </div>
                    <div className="render-progress-info">
                      <span>{renderStatus}</span>
                      <span>
                        {renderEta != null ? `ETA ${renderEta}s` : ''}
                        {renderElapsed != null ? ` · ${renderElapsed}s elapsed` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {videoUrl && (
                  <div className="export-result">
                    <div className="success-msg">
                      ✨ Render Complete!
                      {renderElapsed != null && <span className="elapsed-badge"> in {renderElapsed}s</span>}
                    </div>
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      width="100%"
                      style={{ borderRadius: 8, marginTop: 8 }}
                    />
                    <a href={videoUrl} download className="download-link">
                      📥 Download {renderQuality === 'prores' ? 'MOV' : 'MP4'}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="timeline-bottom-bar">
        <div className="timeline-header">
          <label className="timeline-title">
            🎬 Timeline ({cameraSequence.length} keyframes)
          </label>
          {cameraSequence.length > 0 && (
            <button
              className="btn btn-clear-timeline"
              onClick={() => setCameraSequence([])}
            >
              Clear All
            </button>
          )}
        </div>

        {cameraSequence.length === 0 ? (
          <div className="timeline-empty">
            <p className="timeline-empty-hint">Use Auto Direct or add keyframes manually from the Directing tab</p>
          </div>
        ) : (
          <div className="timeline-track">
            {cameraSequence.map((kf, idx) => (
              <div key={idx} className="timeline-keyframe-item">
                <div className="timeline-kf-header">
                  <div className="timeline-kf-label">KF {idx + 1}</div>
                  <button className="timeline-kf-remove" onClick={() => removeKeyframe(idx)} title="Remove keyframe">✕</button>
                </div>

                <div className="timeline-kf-row">
                  <span className="timeline-kf-field-label">Frame</span>
                  <input className="timeline-kf-input timeline-kf-frame" type="number" min={0} value={kf.frame}
                    onChange={(e) => updateKeyframe(idx, 'frame', Math.max(0, parseInt(e.target.value || '0', 10)))}
                    title="Frame" />
                </div>

                <div className="timeline-kf-row">
                  <span className="timeline-kf-field-label">Target</span>
                  <select className="timeline-kf-input timeline-kf-target" value={kf.targetNodeId || ''}
                    onChange={(e) => updateKeyframe(idx, 'targetNodeId', e.target.value || undefined)}
                    title="Target Node">
                    <option value="">manual</option>
                    {selectableNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.data?.title || n.id}</option>
                    ))}
                  </select>
                </div>

                <div className="timeline-kf-row">
                  <span className="timeline-kf-field-label">Zoom</span>
                  <input className="timeline-kf-input timeline-kf-zoom" type="number" step="0.1" min={0.1} max={5} value={kf.zoom}
                    onChange={(e) => updateKeyframe(idx, 'zoom', parseFloat(e.target.value || '1'))}
                    title="Zoom" />
                </div>
              </div>
            ))}
          </div>
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
