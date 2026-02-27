import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useNodesState, useEdgesState } from '@xyflow/react';

import CascadeNode from '../../components/CascadeNode';
import CascadeEdge from '../../components/CascadeEdge';
import GroupNode from '../../components/GroupNode';
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
} from '../../constants/cascadeConstants.js';
import { generateCascadeScenario, suggestOriginNode } from '../../utils/cascadeAutoDirect';
import { deriveStatesAtFrame } from '../../utils/cascadeSceneUtils';
import { streamSseEvents } from '../../utils/sse';
import CascadeSidebar from './components/CascadeSidebar';
import CascadeCanvas from './components/CascadeCanvas';
import CascadeScrubber from './components/CascadeScrubber';

const nodeTypes = { cascade: CascadeNode, group: GroupNode };
const edgeTypes = { cascade: CascadeEdge };
const PREVIEW_FPS = 30;

export default function CascadeFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [nodes, setNodes, onNodesChange] = useNodesState(DEMO_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [timelineEvents, setTimelineEvents] = useState(DEMO_TIMELINE_EVENTS);
  const [cameraSequence, setCameraSequence] = useState(DEMO_CAMERA_SEQUENCE);

  const [previewFrame, setPreviewFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [renderQuality, setRenderQuality] = useState('standard');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState(null);

  const [originNodeId, setOriginNodeId] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');

  const [newEventType, setNewEventType] = useState(EVENT_TYPE.NODE_STATE);
  const [newEventFrame, setNewEventFrame] = useState(60);
  const [newEventTarget, setNewEventTarget] = useState('');
  const [newEventStatus, setNewEventStatus] = useState(NODE_STATUS.ERROR);
  const [newEventVariant, setNewEventVariant] = useState(EDGE_VARIANT.DANGER);
  const [newEventEffect, setNewEventEffect] = useState(GLOBAL_FX.SCREEN_SHAKE);

  const totalFrames = useMemo(() => {
    const maxEventFrame = timelineEvents.length > 0
      ? Math.max(...timelineEvents.map((e) => e.frame))
      : 0;
    const maxCameraFrame = cameraSequence.length > 0
      ? Math.max(...cameraSequence.map((k) => k.frame))
      : 0;
    return Math.max(maxEventFrame, maxCameraFrame, 300) + 90;
  }, [timelineEvents, cameraSequence]);

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
      }, 1000 / PREVIEW_FPS);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalFrames, playbackSpeed]);

  const { processedNodes, processedEdges } = useMemo(
    () => deriveStatesAtFrame(nodes, edges, timelineEvents, previewFrame),
    [nodes, edges, timelineEvents, previewFrame]
  );

  const selectableNodes = useMemo(
    () => nodes.filter((n) => n.type !== 'group'),
    [nodes]
  );

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
  }, [
    newEventType,
    newEventFrame,
    newEventTarget,
    newEventStatus,
    newEventVariant,
    newEventEffect,
  ]);

  const handleRemoveEvent = useCallback((index) => {
    setTimelineEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAutoGenerate = useCallback(() => {
    const origin = originNodeId || suggestOriginNode(nodes, edges);
    if (!origin) {
      alert('No origin node selected or suggested.');
      return;
    }

    const { timelineEvents: newEvents, cameraSequence: newCam } =
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
          renderFps: PREVIEW_FPS,
          quality: renderQuality,
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
          setRenderStatus(`Rendering... ${event.progress}%`);
        } else if (event.type === 'complete') {
          setVideoUrl(event.videoUrl);
          setRenderStatus('Complete!');
          setRenderProgress(100);
        } else if (event.type === 'error') {
          setRenderStatus(`Error: ${event.message}`);
        }
      });
    } catch (err) {
      setRenderStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const eventBadge = (type) => {
    switch (type) {
      case EVENT_TYPE.NODE_STATE:
        return { label: 'NODE', color: '#00FFFF' };
      case EVENT_TYPE.EDGE_FLOW:
        return { label: 'EDGE', color: '#f97316' };
      case EVENT_TYPE.GLOBAL_FX:
        return { label: 'FX', color: '#FF003C' };
      default:
        return { label: '?', color: '#888' };
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case NODE_STATUS.NORMAL:
        return COLORS.CYAN_NEON;
      case NODE_STATUS.WARNING:
        return COLORS.YELLOW_WARNING;
      case NODE_STATUS.ERROR:
        return COLORS.RED_NEON;
      case NODE_STATUS.OFFLINE:
        return COLORS.GREY_OFFLINE;
      default:
        return '#888';
    }
  };

  return (
    <div className="cascade-layout">
      <CascadeSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={() => navigate('/')}
        timelineProps={{
          handleLoadDemo,
          handleImportJson,
          handleExportJson,
          handleClearTimeline,
          newEventType,
          setNewEventType,
          newEventFrame,
          setNewEventFrame,
          newEventTarget,
          setNewEventTarget,
          newEventStatus,
          setNewEventStatus,
          newEventVariant,
          setNewEventVariant,
          newEventEffect,
          setNewEventEffect,
          selectableNodes,
          edges,
          handleAddEvent,
          timelineEvents,
          eventBadge,
          statusColor,
          previewFrame,
          handleRemoveEvent,
        }}
        autoProps={{
          originNodeId,
          setOriginNodeId,
          selectableNodes,
          handleAutoGenerate,
          handleImportJson,
          handleLoadDemo,
        }}
        renderProps={{
          renderQuality,
          setRenderQuality,
          totalFrames,
          previewFps: PREVIEW_FPS,
          loading,
          renderProgress,
          renderStatus,
          handleExport,
          videoUrl,
        }}
      />

      <div className="cascade-main">
        <CascadeCanvas
          processedNodes={processedNodes}
          processedEdges={processedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
        />
        <CascadeScrubber
          previewFrame={previewFrame}
          setPreviewFrame={setPreviewFrame}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          totalFrames={totalFrames}
          timelineEvents={timelineEvents}
          eventBadge={eventBadge}
        />
      </div>
    </div>
  );
}
