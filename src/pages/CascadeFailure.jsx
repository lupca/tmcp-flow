import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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

import CascadeNode from '../components/CascadeNode';
import CascadeEdge from '../components/CascadeEdge';
import GroupNode from '../components/GroupNode';
import {
  NODE_STATUS,
  EDGE_VARIANT,
  EVENT_TYPE,
  GLOBAL_FX,
  COLORS,
  DEMO_NODES,
  DEMO_EDGES,
  DEMO_TIMELINE_EVENTS,
  DEMO_CAMERA_SEQUENCE,
} from '../constants/cascadeConstants.js';
import {
  generateCascadeScenario,
  suggestOriginNode,
} from '../utils/cascadeAutoDirect';

// ── Node/Edge types (static) ─────────────────────────────────────────
const nodeTypes = { cascade: CascadeNode, group: GroupNode };
const edgeTypes = { cascade: CascadeEdge };

/**
 * Derive node/edge visual state at a given preview frame.
 */
function deriveStatesAtFrame(nodes, edges, timelineEvents, frame) {
  // Node statuses
  const nodeStatusMap = new Map();
  for (const evt of timelineEvents) {
    if (evt.type !== EVENT_TYPE.NODE_STATE) continue;
    if (evt.frame > frame) continue;
    const existing = nodeStatusMap.get(evt.targetId);
    if (!existing || evt.frame >= existing.frame) {
      nodeStatusMap.set(evt.targetId, { status: evt.status, frame: evt.frame });
    }
  }

  // Edge variants
  const edgeVariantMap = new Map();
  for (const evt of timelineEvents) {
    if (evt.type !== EVENT_TYPE.EDGE_FLOW) continue;
    if (evt.frame > frame) continue;
    const existing = edgeVariantMap.get(evt.targetId);
    if (!existing || evt.frame >= existing.frame) {
      edgeVariantMap.set(evt.targetId, { variant: evt.variant, frame: evt.frame });
    }
  }

  const processedNodes = nodes.map((node) => {
    if (node.type === 'group') return node;
    const info = nodeStatusMap.get(node.id);
    return {
      ...node,
      type: 'cascade',
      data: {
        ...node.data,
        status: info?.status ?? NODE_STATUS.NORMAL,
        statusFrame: info?.frame ?? 0,
        currentFrame: frame,
      },
    };
  });

  const processedEdges = edges.map((edge) => {
    const info = edgeVariantMap.get(edge.id);
    return {
      ...edge,
      type: 'cascade',
      data: {
        ...edge.data,
        variant: info?.variant ?? EDGE_VARIANT.NORMAL,
        variantFrame: info?.frame ?? 0,
      },
    };
  });

  return { processedNodes, processedEdges };
}

// ════════════════════════════════════════════════════════════════════════
//  CascadeFailure — Full Editor Page
// ════════════════════════════════════════════════════════════════════════

function CascadeFailureInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Core state ─────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(DEMO_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [timelineEvents, setTimelineEvents] = useState(DEMO_TIMELINE_EVENTS);
  const [cameraSequence, setCameraSequence] = useState(DEMO_CAMERA_SEQUENCE);

  // ── Preview state ──────────────────────────────────────────────────
  const [previewFrame, setPreviewFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef(null);

  // ── Render state ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [renderQuality, setRenderQuality] = useState('standard');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState(null);

  // ── Auto-direct state ──────────────────────────────────────────────
  const [originNodeId, setOriginNodeId] = useState('');

  // ── Timeline Event Editor state ────────────────────────────────────
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'auto' | 'fx' | 'render'

  // ── New event form ─────────────────────────────────────────────────
  const [newEventType, setNewEventType] = useState(EVENT_TYPE.NODE_STATE);
  const [newEventFrame, setNewEventFrame] = useState(60);
  const [newEventTarget, setNewEventTarget] = useState('');
  const [newEventStatus, setNewEventStatus] = useState(NODE_STATUS.ERROR);
  const [newEventVariant, setNewEventVariant] = useState(EDGE_VARIANT.DANGER);
  const [newEventEffect, setNewEventEffect] = useState(GLOBAL_FX.SCREEN_SHAKE);

  // ── Total frames computation ───────────────────────────────────────
  const totalFrames = useMemo(() => {
    const maxEventFrame = timelineEvents.length > 0
      ? Math.max(...timelineEvents.map((e) => e.frame))
      : 0;
    const maxCameraFrame = cameraSequence.length > 0
      ? Math.max(...cameraSequence.map((k) => k.frame))
      : 0;
    return Math.max(maxEventFrame, maxCameraFrame, 300) + 90;
  }, [timelineEvents, cameraSequence]);

  // ── Load flow from URL param ───────────────────────────────────────
  useEffect(() => {
    const flowId = searchParams.get('flowId');
    if (flowId) {
      fetch(`/api/flows/${flowId}/versions`)
        .then((r) => r.json())
        .then((versions) => {
          if (versions.length > 0) {
            const latest = versions[versions.length - 1];
            if (latest.nodes) setNodes(latest.nodes);
            if (latest.edges) setEdges(latest.edges);
          }
        })
        .catch(console.error);
    }
  }, [searchParams, setNodes, setEdges]);

  // ── Playback loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setPreviewFrame((prev) => {
          const next = prev + playbackSpeed;
          if (next >= totalFrames) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000 / 60); // 60fps
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalFrames, playbackSpeed]);

  // ── Derived state at preview frame ─────────────────────────────────
  const { processedNodes, processedEdges } = useMemo(
    () => deriveStatesAtFrame(nodes, edges, timelineEvents, previewFrame),
    [nodes, edges, timelineEvents, previewFrame]
  );

  // ── Selectable nodes/edges lists ───────────────────────────────────
  const selectableNodes = useMemo(
    () => nodes.filter((n) => n.type !== 'group'),
    [nodes]
  );

  // ── Event handlers ─────────────────────────────────────────────────

  const handleAddEvent = useCallback(() => {
    const event = { frame: newEventFrame, type: newEventType };

    if (newEventType === EVENT_TYPE.NODE_STATE) {
      if (!newEventTarget) return;
      event.targetId = newEventTarget;
      event.status = newEventStatus;
    } else if (newEventType === EVENT_TYPE.EDGE_FLOW) {
      if (!newEventTarget) return;
      event.targetId = newEventTarget;
      event.variant = newEventVariant;
    } else if (newEventType === EVENT_TYPE.GLOBAL_FX) {
      event.effect = newEventEffect;
    }

    setTimelineEvents((prev) => [...prev, event].sort((a, b) => a.frame - b.frame));
  }, [newEventType, newEventFrame, newEventTarget, newEventStatus, newEventVariant, newEventEffect]);

  const handleRemoveEvent = useCallback((index) => {
    setTimelineEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAutoGenerate = useCallback(() => {
    const origin = originNodeId || suggestOriginNode(nodes, edges);
    if (!origin) {
      alert('No origin node selected or suggested.');
      return;
    }

    const { timelineEvents: newEvents, cameraSequence: newCam, totalFrames: newTotal } =
      generateCascadeScenario(nodes, edges, origin);

    setTimelineEvents(newEvents);
    setCameraSequence(newCam);
    setOriginNodeId(origin);
    setPreviewFrame(0);
  }, [nodes, edges, originNodeId]);

  const handleLoadDemo = useCallback(() => {
    setNodes(DEMO_NODES);
    setEdges(DEMO_EDGES);
    setTimelineEvents(DEMO_TIMELINE_EVENTS);
    setCameraSequence(DEMO_CAMERA_SEQUENCE);
    setPreviewFrame(0);
  }, [setNodes, setEdges]);

  const handleClearTimeline = useCallback(() => {
    if (window.confirm('Clear all timeline events?')) {
      setTimelineEvents([]);
      setCameraSequence([]);
      setPreviewFrame(0);
    }
  }, []);

  const handleExport = async () => {
    setLoading(true);
    setVideoUrl(null);
    setRenderProgress(0);
    setRenderStatus('Starting...');

    try {
      const res = await fetch('/api/render-cascade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes.map((node) => ({
            ...node,
            width: node.width || node.style?.width,
            height: node.height || node.style?.height,
          })),
          edges,
          cameraSequence,
          timelineEvents,
          renderWidth: 1080,
          renderHeight: 1920,
          renderDuration: totalFrames,
          renderFps: 60,
          quality: renderQuality,
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
              setRenderStatus(`Rendering... ${event.progress}%`);
            } else if (event.type === 'complete') {
              setVideoUrl(event.videoUrl);
              setRenderStatus('Complete!');
              setRenderProgress(100);
            } else if (event.type === 'error') {
              setRenderStatus(`Error: ${event.message}`);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setRenderStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Import JSON handler ────────────────────────────────────────────
  const handleImportJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        if (data.timelineEvents) setTimelineEvents(data.timelineEvents);
        if (data.cameraSequence) setCameraSequence(data.cameraSequence);
        setPreviewFrame(0);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    };
    input.click();
  }, [setNodes, setEdges]);

  // ── Export JSON handler ────────────────────────────────────────────
  const handleExportJson = useCallback(() => {
    const data = { nodes, edges, timelineEvents, cameraSequence };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cascade-scenario-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, timelineEvents, cameraSequence]);

  // ── Event type badge helper ────────────────────────────────────────
  const eventBadge = (type 
  ) => {
    switch (type) {
      case EVENT_TYPE.NODE_STATE: return { label: 'NODE', color: '#00FFFF' };
      case EVENT_TYPE.EDGE_FLOW: return { label: 'EDGE', color: '#f97316' };
      case EVENT_TYPE.GLOBAL_FX: return { label: 'FX', color: '#FF003C' };
      default: return { label: '?', color: '#888' };
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case NODE_STATUS.NORMAL: return COLORS.CYAN_NEON;
      case NODE_STATUS.WARNING: return COLORS.YELLOW_WARNING;
      case NODE_STATUS.ERROR: return COLORS.RED_NEON;
      case NODE_STATUS.OFFLINE: return COLORS.GREY_OFFLINE;
      default: return '#888';
    }
  };

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════

  return (
    <div className="cascade-layout">
      {/* ──────────── LEFT SIDEBAR ──────────── */}
      <div className="cascade-sidebar-left glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 18, padding: '4px 8px',
            }}
            title="Back to Studio"
          >
            ←
          </button>
          <h2 className="sidebar-title" style={{ margin: 0 }}>💥 Cascade Failure</h2>
        </div>

        {/* Tab navigation */}
        <div className="tab-nav">
          {[
            { key: 'timeline', label: '📋 Timeline' },
            { key: 'auto', label: '🤖 Auto' },
            { key: 'fx', label: '✨ FX' },
            { key: 'render', label: '🎬 Render' },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div className="section">
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button className="btn btn-sm" onClick={handleLoadDemo}>📦 Demo</button>
                <button className="btn btn-sm" onClick={handleImportJson}>📂 Import</button>
                <button className="btn btn-sm" onClick={handleExportJson}>💾 Export</button>
                <button className="btn btn-sm btn-danger" onClick={handleClearTimeline}>🗑️</button>
              </div>

              <label className="section-label">Add Event</label>

              {/* Event type */}
              <select
                className="field-input"
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
              >
                <option value={EVENT_TYPE.NODE_STATE}>NODE_STATE</option>
                <option value={EVENT_TYPE.EDGE_FLOW}>EDGE_FLOW</option>
                <option value={EVENT_TYPE.GLOBAL_FX}>GLOBAL_FX</option>
              </select>

              {/* Frame */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', minWidth: 40 }}>Frame</label>
                <input
                  type="number"
                  className="field-input"
                  value={newEventFrame}
                  onChange={(e) => setNewEventFrame(Number(e.target.value))}
                  min={0}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Target selector (for NODE_STATE and EDGE_FLOW) */}
              {newEventType !== EVENT_TYPE.GLOBAL_FX && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Target</label>
                  <select
                    className="field-input"
                    value={newEventTarget}
                    onChange={(e) => setNewEventTarget(e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {newEventType === EVENT_TYPE.NODE_STATE
                      ? selectableNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.data?.icon || '🔷'} {n.data?.title || n.id}
                          </option>
                        ))
                      : edges.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.source} → {e.target}
                          </option>
                        ))}
                  </select>
                </div>
              )}

              {/* Status/variant/effect selector */}
              {newEventType === EVENT_TYPE.NODE_STATE && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Status</label>
                  <select
                    className="field-input"
                    value={newEventStatus}
                    onChange={(e) => setNewEventStatus(e.target.value)}
                  >
                    {Object.values(NODE_STATUS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {newEventType === EVENT_TYPE.EDGE_FLOW && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Variant</label>
                  <select
                    className="field-input"
                    value={newEventVariant}
                    onChange={(e) => setNewEventVariant(e.target.value)}
                  >
                    {Object.values(EDGE_VARIANT).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              {newEventType === EVENT_TYPE.GLOBAL_FX && (
                <div style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Effect</label>
                  <select
                    className="field-input"
                    value={newEventEffect}
                    onChange={(e) => setNewEventEffect(e.target.value)}
                  >
                    {Object.values(GLOBAL_FX).map((fx) => (
                      <option key={fx} value={fx}>{fx}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="btn btn-auto"
                onClick={handleAddEvent}
                style={{ marginTop: 8, width: '100%' }}
              >
                ➕ Add Event
              </button>

              {/* Event list */}
              <label className="section-label" style={{ marginTop: 16 }}>
                Events ({timelineEvents.length})
              </label>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {timelineEvents.map((evt, i) => {
                  const badge = eventBadge(evt.type);
                  return (
                    <div
                      key={i}
                      className="cascade-event-card"
                      style={{
                        borderLeft: `3px solid ${badge.color}`,
                        opacity: evt.frame <= previewFrame ? 1 : 0.4,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, color: badge.color,
                          background: `${badge.color}15`, padding: '1px 6px',
                          borderRadius: 4, textTransform: 'uppercase',
                        }}>
                          {badge.label}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                          F{evt.frame}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                        {evt.type === EVENT_TYPE.NODE_STATE && (
                          <span>
                            {evt.targetId}{' '}
                            <span style={{ color: statusColor(evt.status), fontWeight: 600 }}>
                              → {evt.status}
                            </span>
                          </span>
                        )}
                        {evt.type === EVENT_TYPE.EDGE_FLOW && (
                          <span>
                            {evt.targetId}{' '}
                            <span style={{ color: evt.variant === 'danger' ? COLORS.RED_NEON : COLORS.CYAN_NEON, fontWeight: 600 }}>
                              → {evt.variant}
                            </span>
                          </span>
                        )}
                        {evt.type === EVENT_TYPE.GLOBAL_FX && (
                          <span style={{ color: COLORS.RED_NEON, fontWeight: 600 }}>
                            {evt.effect}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveEvent(i)}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          background: 'none', border: 'none',
                          color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── AUTO TAB ── */}
          {activeTab === 'auto' && (
            <div className="section">
              <label className="section-label">🤖 Auto-Generate Cascade</label>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                BFS infection from an origin node. Automatically generates timeline events + camera sequence.
              </p>

              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Origin Node</label>
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
          )}

          {/* ── FX TAB ── */}
          {activeTab === 'fx' && (
            <div className="section">
              <label className="section-label">✨ Visual Effects Info</label>

              <div className="cascade-info-card">
                <h4 style={{ color: COLORS.CYAN_NEON, margin: '0 0 4px 0', fontSize: 12 }}>Node States</h4>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  <div><span style={{ color: COLORS.CYAN_NEON }}>● Normal</span> — Cyberpunk Cyan glow</div>
                  <div><span style={{ color: COLORS.YELLOW_WARNING }}>● Warning</span> — Flashing yellow border</div>
                  <div><span style={{ color: COLORS.RED_NEON }}>● Error</span> — Red neon glow + jitter</div>
                  <div><span style={{ color: COLORS.GREY_OFFLINE }}>● Offline</span> — Grey fade + fall-away</div>
                </div>
              </div>

              <div className="cascade-info-card" style={{ marginTop: 8 }}>
                <h4 style={{ color: '#f97316', margin: '0 0 4px 0', fontSize: 12 }}>Edge Variants</h4>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  <div><span style={{ color: COLORS.CYAN_NEON }}>● Normal</span> — Calm cyan data flow</div>
                  <div><span style={{ color: COLORS.RED_NEON }}>● Danger</span> — Red infection rush (3x speed)</div>
                </div>
              </div>

              <div className="cascade-info-card" style={{ marginTop: 8 }}>
                <h4 style={{ color: COLORS.RED_NEON, margin: '0 0 4px 0', fontSize: 12 }}>Global FX</h4>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  <div>🫨 Screen Shake — Physical vibration</div>
                  <div>🌈 Glitch — Hue-rotate + contrast</div>
                </div>
              </div>
            </div>
          )}

          {/* ── RENDER TAB ── */}
          {activeTab === 'render' && (
            <div className="section">
              <label className="section-label">🎬 Export MP4</label>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Quality</label>
                <select
                  className="field-input"
                  value={renderQuality}
                  onChange={(e) => setRenderQuality(e.target.value)}
                >
                  <option value="draft">Draft (fastest)</option>
                  <option value="standard">Standard</option>
                  <option value="high">High Quality</option>
                </select>
              </div>

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                Duration: {totalFrames} frames ({(totalFrames / 60).toFixed(1)}s @ 60fps)
              </div>

              <button
                className="btn btn-export"
                onClick={handleExport}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? `⏳ ${renderProgress}%` : '🎬 Export Cascade MP4'}
              </button>

              {renderStatus && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                  {renderStatus}
                </div>
              )}

              {loading && (
                <div className="render-progress-container" style={{ marginTop: 8 }}>
                  <div
                    className="render-progress-bar"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              )}

              {videoUrl && (
                <div style={{ marginTop: 12 }}>
                  <video
                    src={videoUrl}
                    controls
                    style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <a
                    href={videoUrl}
                    download
                    style={{
                      display: 'block', textAlign: 'center', marginTop: 8,
                      color: COLORS.CYAN_NEON, fontSize: 12,
                    }}
                  >
                    ⬇ Download MP4
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──────────── MAIN CANVAS ──────────── */}
      <div className="cascade-main">
        <div className="cascade-canvas">
          <ReactFlow
            nodes={processedNodes}
            edges={processedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" color="#1E293B" gap={24} size={2} />
            <Controls
              style={{ background: 'rgba(15, 23, 42, 0.8)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <MiniMap
              nodeColor={(node) => {
                const info = processedNodes.find((n) => n.id === node.id);
                const s = info?.data?.status;
                if (s === NODE_STATUS.ERROR) return COLORS.RED_NEON;
                if (s === NODE_STATUS.WARNING) return COLORS.YELLOW_WARNING;
                if (s === NODE_STATUS.OFFLINE) return COLORS.GREY_OFFLINE;
                return COLORS.CYAN_NEON;
              }}
              style={{
                background: 'rgba(11, 15, 25, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
              }}
            />
          </ReactFlow>
        </div>

        {/* ──────────── BOTTOM: Timeline Scrubber ──────────── */}
        <div className="cascade-scrubber">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px' }}>
            <button
              className="btn btn-sm"
              onClick={() => { setPreviewFrame(0); setIsPlaying(false); }}
              title="Reset"
            >
              ⏮
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', borderRadius: 4, padding: '2px 4px', fontSize: 11,
              }}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>

            <input
              type="range"
              min={0}
              max={totalFrames}
              value={previewFrame}
              onChange={(e) => {
                setPreviewFrame(Number(e.target.value));
                setIsPlaying(false);
              }}
              style={{ flex: 1, accentColor: COLORS.CYAN_NEON }}
            />

            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', minWidth: 90, textAlign: 'right' }}>
              {Math.round(previewFrame)} / {totalFrames}f
            </span>
          </div>

          {/* Event markers on timeline */}
          <div style={{ position: 'relative', height: 20, margin: '0 16px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}>
            {timelineEvents.map((evt, i) => {
              const badge = eventBadge(evt.type);
              const left = totalFrames > 0 ? (evt.frame / totalFrames) * 100 : 0;
              return (
                <div
                  key={i}
                  title={`${evt.type} @ F${evt.frame}`}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    top: 2,
                    width: 3,
                    height: 16,
                    background: badge.color,
                    borderRadius: 2,
                    opacity: 0.6,
                    cursor: 'pointer',
                  }}
                  onClick={() => { setPreviewFrame(evt.frame); setIsPlaying(false); }}
                />
              );
            })}
            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                left: totalFrames > 0 ? `${(previewFrame / totalFrames) * 100}%` : '0%',
                top: 0,
                width: 2,
                height: 20,
                background: '#fff',
                borderRadius: 1,
                boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                transition: isPlaying ? 'none' : 'left 0.1s',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CascadeFailure() {
  return (
    <ReactFlowProvider>
      <CascadeFailureInner />
    </ReactFlowProvider>
  );
}
