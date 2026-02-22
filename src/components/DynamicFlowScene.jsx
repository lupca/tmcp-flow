import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
} from '@xyflow/react';
import { interpolate, Easing, useCurrentFrame, Audio } from 'remotion';
import '@xyflow/react/dist/style.css';
import UniversalNode from './UniversalNode';
import ViralEdge from './ViralEdge';

// Register node & edge types outside the component to avoid re-creation
const nodeTypes = { universal: UniversalNode };

// Default fallback dimensions for nodes when width/height not yet measured
// Matches typical UniversalNode rendered size
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 100;

/**
 * Get node dimensions using React Flow's own priority chain:
 * measured > width/height > initialWidth/initialHeight > style > default
 */
function getNodeW(node) {
  return node.measured?.width ?? node.width ?? node.initialWidth ?? node.style?.width ?? DEFAULT_NODE_W;
}
function getNodeH(node) {
  return node.measured?.height ?? node.height ?? node.initialHeight ?? node.style?.height ?? DEFAULT_NODE_H;
}

/**
 * Resolve the ABSOLUTE position of a node.
 * Child nodes (parentId set) store position relative to their parent,
 * so we must add the parent's absolute position.
 */
function getAbsolutePosition(node, allNodes) {
  let x = node.position.x;
  let y = node.position.y;

  if (node.parentId) {
    const parent = allNodes.find((n) => n.id === node.parentId);
    if (parent) {
      // Recursively resolve in case parent is also a child
      const parentPos = getAbsolutePosition(parent, allNodes);
      x += parentPos.x;
      y += parentPos.y;
    }
  }

  return { x, y };
}

/**
 * DynamicFlowScene — Pure presentation component for Remotion rendering.
 *
 * Receives serializable props only (no DOM refs, no callbacks).
 * Renders a read-only React Flow canvas with camera interpolation
 * driven by cameraSequence + the current Remotion frame.
 */
function DynamicFlowSceneInner({
  nodes = [],
  edges = [],
  cameraSequence = [],
  frame = 0,
  width = 1080,
  height = 1920,
  isRemotion = false,
  edgeEffectType = 'neon_path',
  previewMode = false,
  introAudioUrl = null,
}) {
  // ---- 1. Process keyframes: resolve targetNodeId → absolute x/y ----
  const processedKeyframes = useMemo(() => {
    if (!cameraSequence?.length) {
      // Portrait-friendly default when no sequence is provided
      return [{ frame: 0, x: 0, y: 0, zoom: width < height ? 0.4 : 0.8 }];
    }

    return cameraSequence
      .map((kf) => {
        if (kf.targetNodeId) {
          const node = nodes.find((n) => n.id === kf.targetNodeId);
          if (node) {
            const nodeW = getNodeW(node);
            const nodeH = getNodeH(node);
            // Use ABSOLUTE position (handles child nodes inside groups)
            const absPos = getAbsolutePosition(node, nodes);
            const centerX = absPos.x + nodeW / 2;
            const centerY = absPos.y + nodeH / 2;
            const zoom = kf.zoom || 1;

            return {
              frame: kf.frame,
              zoom,
              x: (width / 2) - (centerX * zoom),
              y: (height / 2) - (centerY * zoom),
              easing: kf.easing,
            };
          }
          return { frame: kf.frame, zoom: kf.zoom || 1, x: 0, y: 0, easing: kf.easing };
        }
        return {
          frame: kf.frame,
          zoom: kf.zoom || 1,
          x: kf.x ?? 0,
          y: kf.y ?? 0,
          easing: kf.easing,
        };
      })
      .sort((a, b) => a.frame - b.frame);
  }, [cameraSequence, nodes, width, height]);

  // ---- 2. Interpolate viewport with per-segment easing ----
  const currentViewport = useMemo(() => {
    if (processedKeyframes.length < 2) {
      const kf = processedKeyframes[0];
      return { x: kf.x, y: kf.y, zoom: kf.zoom };
    }

    // Find the current segment (pair of keyframes we're between)
    const kfs = processedKeyframes;
    let segIdx = 0;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (frame >= kfs[i].frame && frame <= kfs[i + 1].frame) {
        segIdx = i;
        break;
      }
      if (frame > kfs[i + 1].frame) segIdx = i + 1;
    }
    // Clamp to valid range
    segIdx = Math.min(segIdx, kfs.length - 2);

    const from = kfs[segIdx];
    const to = kfs[segIdx + 1];
    const segDuration = to.frame - from.frame;

    if (segDuration <= 0) {
      return { x: to.x, y: to.y, zoom: to.zoom };
    }

    // Pick easing based on the TARGET keyframe's easing field
    const easingName = to.easing || 'smooth';
    let easingFn;
    switch (easingName) {
      case 'slow':
        easingFn = Easing.inOut(Easing.cubic);
        break;
      case 'snap':
        easingFn = Easing.out(Easing.ease);
        break;
      case 'smooth':
      default:
        easingFn = Easing.inOut(Easing.ease);
        break;
    }

    const localProgress = Math.max(0, Math.min(1, (frame - from.frame) / segDuration));
    const eased = easingFn(localProgress);

    return {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
      zoom: from.zoom + (to.zoom - from.zoom) * eased,
    };
  }, [frame, processedKeyframes]);

  // ---- 3. Inject current frame, effect type, and preview mode into edges ----
  // Create edge types wrapper that passes frame and settings to ViralEdge
  const edgeTypesWithFrame = useMemo(() => ({
    viral: (props) => <ViralEdge {...props} currentFrame={frame} data={{ ...props.data, effectType: edgeEffectType, previewMode }} />
  }), [frame, edgeEffectType, previewMode]);

  // ---- 4. Render ----
  return (
    <div style={{ width: '100%', height: '100%', background: '#0B0F19' }}>
      {introAudioUrl && <Audio src={introAudioUrl} />}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypesWithFrame}
        viewport={currentViewport}
        // Fully read-only in Remotion context
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" color="#1E293B" gap={24} size={2} />
      </ReactFlow>
    </div>
  );
}

/**
 * Wrapped with ReactFlowProvider so internal ReactFlow hooks work
 * even when this component is rendered as a standalone Remotion scene.
 */
export default function DynamicFlowScene(props) {
  return (
    <ReactFlowProvider>
      <DynamicFlowSceneInner {...props} />
    </ReactFlowProvider>
  );
}
