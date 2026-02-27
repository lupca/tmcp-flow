import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import UniversalNode from '../../components/UniversalNode';
import GroupNode from '../../components/GroupNode';
import ViralEdge from '../../components/ViralEdge';
import { layoutWithElk } from '../../utils/elkLayout';
import {
  initialNodes,
  initialEdges,
  getGroupStyleForTheme,
} from '../../constants/flowConstants';
import { generateAutoSequence, annotateEdgesWithTiming } from '../../utils/autoDirect';
import { ensureLayout } from '../../utils/flowUtils';
import { captureThumbnail, downloadJson } from '../../utils/exportUtils';
import { streamSseEvents } from '../../utils/sse';
import StudioSidebarLeft from './components/StudioSidebarLeft';
import StudioCanvas from './components/StudioCanvas';
import StudioSidebarRight from './components/StudioSidebarRight';
import TimelineBar from './components/TimelineBar';

const AI_API_URL = 'http://localhost:8000';

const nodeTypes = { universal: UniversalNode, group: GroupNode };
const edgeTypes = { viral: ViralEdge };

export default function StudioPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [cameraSequence, setCameraSequence] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [edgeEffectType, setEdgeEffectType] = useState('neon_path');
  const [nodeTheme, setNodeTheme] = useState('vercel_glass');
  const [selectionEffect, setSelectionEffect] = useState('glow_scale');
  const [renderSelectionEffect, setRenderSelectionEffect] = useState(true);
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
    setCameraSequence((prev) => [...prev, kf].sort((a, b) => a.frame - b.frame));
  }, [kfFrame, kfZoom, kfTargetNodeId]);

  const removeKeyframe = useCallback((idx) => {
    setCameraSequence((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateKeyframe = useCallback((idx, field, value) => {
    setCameraSequence((prev) =>
      prev
        .map((kf, i) => {
          if (i !== idx) return kf;
          return { ...kf, [field]: value };
        })
        .sort((a, b) => a.frame - b.frame)
    );
  }, []);

  const handleAutoDirect = useCallback(() => {
    if (
      cameraSequence.length > 0 &&
      !window.confirm('Overwrite the current timeline with Auto Direct?')
    ) {
      return;
    }
    const seq = generateAutoSequence(nodes, edges);
    setCameraSequence(seq);

    const annotatedEdges = annotateEdgesWithTiming(seq, edges, nodes);
    setEdges(annotatedEdges);

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
          nodes: nodes.map((node) => ({
            ...node,
            width: node.width || node.style?.width,
            height: node.height || node.style?.height,
          })),
          edges,
          cameraSequence,
          renderWidth: 1080,
          renderHeight: 1920,
          renderDuration,
          renderFps: 60,
          edgeEffectType,
          nodeTheme,
          selectionEffect,
          renderSelectionEffect,
          previewMode,
          quality: renderQuality,
          introText,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail;
        try {
          detail = JSON.parse(text);
        } catch {
          detail = { error: text };
        }
        alert('Render failed: ' + (detail.error || res.statusText));
        return;
      }

      await streamSseEvents(res, (event) => {
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
      });
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

  const loadVersions = useCallback(
    async (id) => {
      if (!id) return;
      const res = await fetch(`/api/flows/${id}/versions`);
      if (!res.ok) {
        throw new Error('Failed to load versions');
      }
      const data = await res.json();
      setVersions(data.versions || []);
      setFlowName(data.flow?.name || flowName || '');
    },
    [flowName]
  );

  const loadFlow = useCallback(
    async (id) => {
      const res = await fetch(`/api/flows/${id}/versions`);
      if (!res.ok) {
        throw new Error('Failed to load flow');
      }
      const data = await res.json();
      const latest = data.versions?.[0];
      if (latest) {
        const layoutedNodes = await ensureLayout(
          latest.nodes || [],
          latest.edges || []
        );
        setNodes(layoutedNodes);
        setEdges(latest.edges || []);
        setCameraSequence(latest.cameraSequence || []);
      }
      setFlowId(id);
      setFlowName(data.flow?.name || '');
      setVersions(data.versions || []);
    },
    [setNodes, setEdges, setCameraSequence]
  );

  useEffect(() => {
    const urlFlowId = searchParams.get('flowId');
    if (urlFlowId) {
      loadFlow(urlFlowId).catch((error) => {
        console.warn('Failed to load flow:', error);
      });
    }
  }, [searchParams, loadFlow]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          themeKey: nodeTheme,
          selectionEffect: selectionEffect,
        },
      }))
    );
  }, [nodeTheme, selectionEffect, setNodes]);

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
    const layoutedNodes = await ensureLayout(
      version.nodes || [],
      version.edges || []
    );
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
    downloadJson(
      `${payload.name.replace(/\s+/g, '-').toLowerCase()}.json`,
      payload
    );
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedNodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
      const importedEdges = Array.isArray(parsed.edges) ? parsed.edges : [];
      const importedCamera = Array.isArray(parsed.cameraSequence)
        ? parsed.cameraSequence
        : [];

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

      await streamSseEvents(res, async (event) => {
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
            data: {
              ...(n.data || { title: n.id }),
              themeKey: nodeTheme,
              selectionEffect: selectionEffect,
            },
            position: { x: 0, y: 0 },
            width: n.parentId ? 160 : 280,
            ...(n.parentId
              ? { parentId: n.parentId, extent: n.extent || 'parent' }
              : {}),
            ...(n.type === 'group'
              ? { style: { ...getGroupStyleForTheme(nodeTheme), ...(n.style || {}) } }
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
      });
    } catch (err) {
      console.error('Generate flow error:', err);
      setAiError(err.message || 'Không thể kết nối AI server');
      setAiStatus(null);
    } finally {
      setIsGenerating(false);
    }
  }, [
    promptText,
    nodeTheme,
    selectionEffect,
    setNodes,
    setEdges,
    setCameraSequence,
  ]);

  const selectableNodes = nodes.filter((n) => n.type !== 'group');

  return (
    <div className="studio-layout">
      <div className="studio-main">
        <StudioSidebarLeft
          promptText={promptText}
          setPromptText={setPromptText}
          handleGenerateFlow={handleGenerateFlow}
          isGenerating={isGenerating}
          aiStatus={aiStatus}
          aiError={aiError}
        />

        <StudioCanvas
          nodes={nodes}
          edges={edges}
          previewMode={previewMode}
          edgeEffectType={edgeEffectType}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          canvasRef={canvasRef}
        />

        <StudioSidebarRight
          selectedNodeId={selectedNodeId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenFlowManager={() => navigate('/flows')}
          flowName={flowName}
          setFlowName={setFlowName}
          handleSaveVersion={handleSaveVersion}
          isSaving={isSaving}
          handleExportJson={handleExportJson}
          importInputRef={importInputRef}
          handleImportJson={handleImportJson}
          flowId={flowId}
          versions={versions}
          loadVersions={loadVersions}
          handleRollback={handleRollback}
          nodes={nodes}
          setNodes={setNodes}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          handleAutoDirect={handleAutoDirect}
          introText={introText}
          setIntroText={setIntroText}
          selectableNodes={selectableNodes}
          kfTargetNodeId={kfTargetNodeId}
          setKfTargetNodeId={setKfTargetNodeId}
          kfFrame={kfFrame}
          setKfFrame={setKfFrame}
          kfZoom={kfZoom}
          setKfZoom={setKfZoom}
          addKeyframe={addKeyframe}
          edgeEffectType={edgeEffectType}
          setEdgeEffectType={setEdgeEffectType}
          nodeTheme={nodeTheme}
          setNodeTheme={setNodeTheme}
          selectionEffect={selectionEffect}
          setSelectionEffect={setSelectionEffect}
          renderSelectionEffect={renderSelectionEffect}
          setRenderSelectionEffect={setRenderSelectionEffect}
          renderQuality={renderQuality}
          setRenderQuality={setRenderQuality}
          loading={loading}
          handleExport={handleExport}
          handleCancelRender={handleCancelRender}
          renderProgress={renderProgress}
          renderStatus={renderStatus}
          renderEta={renderEta}
          renderElapsed={renderElapsed}
          videoUrl={videoUrl}
        />
      </div>

      <TimelineBar
        cameraSequence={cameraSequence}
        setCameraSequence={setCameraSequence}
        removeKeyframe={removeKeyframe}
        updateKeyframe={updateKeyframe}
        selectableNodes={selectableNodes}
      />
    </div>
  );
}
