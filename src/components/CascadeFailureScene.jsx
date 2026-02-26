/**
 * CascadeFailureScene — The Director.
 *
 * A pure Remotion presentation component that orchestrates:
 *   1. Timeline-driven state engine (node status, edge variants, global FX)
 *   2. Camera keyframe interpolation with easing (smooth / slow / snap)
 *   3. Global visual FX (screen shake, glitch, blackout CTA)
 *   4. Audio directing (BGM ducking, SFX triggers)
 *
 * This file is the **slim orchestrator**. All pure logic lives in
 * `cascadeSceneUtils.js`; overlay sub-components live in `cascade/`.
 *
 * @module CascadeFailureScene
 * @see {@link module:cascadeSceneUtils} for pure helper functions
 * @see {@link module:BlackoutCTA} for the blackout punchline overlay
 * @see {@link module:AudioDirector} for audio layer management
 * @see {@link module:VignetteOverlay} for crisis atmosphere overlays
 */

import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
} from '@xyflow/react';
import { Easing } from 'remotion';
import '@xyflow/react/dist/style.css';

import CascadeNode from './CascadeNode.jsx';
import CascadeEdge from './CascadeEdge.jsx';
import GroupNode from './GroupNode.jsx';
import { GLOBAL_FX, COLORS } from '../constants/cascadeConstants.js';

// Pure helpers — no React, fully testable
import {
  deriveNodeStatusMap,
  deriveEdgeVariantMap,
  deriveActiveGlobalFX,
  findFXEventFrame,
  processNodes,
  processEdges,
  resolveKeyframes,
  interpolateViewport,
  computeGlobalFXStyle,
  hasAnyCriticalNode,
} from '../utils/cascadeSceneUtils.js';

// Sub-components
import AudioDirector from './cascade/AudioDirector.jsx';
import VignetteOverlay from './cascade/VignetteOverlay.jsx';
import BlackoutCTA from './cascade/BlackoutCTA.jsx';

// ── Static node types (never re-created) ─────────────────────────────
const nodeTypes = { cascade: CascadeNode, group: GroupNode };

/**
 * @typedef {Object} CascadeFailureSceneProps
 * @property {Array}       nodes           - React Flow nodes
 * @property {Array}       edges           - React Flow edges
 * @property {Array}       cameraSequence  - Camera keyframes (fitView / targetNodeId / x,y)
 * @property {Array}       timelineEvents  - Cascade timeline event script
 * @property {number}      frame           - Current Remotion frame
 * @property {number}      width           - Composition width (px)
 * @property {number}      height          - Composition height (px)
 * @property {boolean}     isRemotion      - true inside Remotion renderer
 * @property {string|null} introAudioUrl   - Optional voiceover audio URL
 */
function CascadeFailureSceneInner({
  nodes = [],
  edges = [],
  cameraSequence = [],
  timelineEvents = [],
  frame = 0,
  width = 1080,
  height = 1920,
  isRemotion = false,
  introAudioUrl = null,
}) {

  // ── 1. Derived State Engine ────────────────────────────────────────

  const nodeStatusMap = useMemo(
    () => deriveNodeStatusMap(timelineEvents, frame),
    [timelineEvents, frame],
  );

  const edgeVariantMap = useMemo(
    () => deriveEdgeVariantMap(timelineEvents, frame),
    [timelineEvents, frame],
  );

  const activeGlobalFX = useMemo(
    () => deriveActiveGlobalFX(timelineEvents, frame),
    [timelineEvents, frame],
  );

  // ── 2. Process Nodes & Edges ───────────────────────────────────────

  const processedNodes = useMemo(
    () => processNodes(nodes, nodeStatusMap, frame),
    [nodes, nodeStatusMap, frame],
  );

  const processedEdges = useMemo(
    () => processEdges(edges, edgeVariantMap),
    [edges, edgeVariantMap],
  );

  // ── 3. Camera Interpolation ────────────────────────────────────────

  const processedKeyframes = useMemo(
    () => resolveKeyframes(cameraSequence, processedNodes, width, height),
    [cameraSequence, processedNodes, width, height],
  );

  const currentViewport = useMemo(
    () => interpolateViewport(frame, processedKeyframes, Easing),
    [frame, processedKeyframes],
  );

  // ── 4. Global FX Style ────────────────────────────────────────────

  const globalFXStyle = useMemo(
    () => computeGlobalFXStyle(frame, activeGlobalFX),
    [frame, activeGlobalFX],
  );

  // ── 5. Audio Triggers ─────────────────────────────────────────────

  const blackoutFrame = useMemo(
    () => findFXEventFrame(timelineEvents, GLOBAL_FX.BLACKOUT_CTA),
    [timelineEvents],
  );

  const shakeFrame = useMemo(
    () => findFXEventFrame(timelineEvents, GLOBAL_FX.SCREEN_SHAKE),
    [timelineEvents],
  );

  // ── 6. Edge Types (dynamic factory) ───────────────────────────────

  const edgeTypesWithFrame = useMemo(() => ({
    cascade: (props) => (
      <CascadeEdge
        {...props}
        currentFrame={frame}
        data={{ ...props.data }}
      />
    ),
  }), [frame]);

  // ── 7. Vignette State ─────────────────────────────────────────────

  const vignetteOpacity = useMemo(
    () => hasAnyCriticalNode(nodeStatusMap) ? 0.4 : 0,
    [nodeStatusMap],
  );

  // ── 8. Blackout CTA State ─────────────────────────────────────────

  const blackoutCTAInfo = activeGlobalFX.get(GLOBAL_FX.BLACKOUT_CTA);
  const blackoutElapsed = blackoutCTAInfo ? frame - blackoutCTAInfo.frame : null;

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: COLORS.SURFACE_CANVAS,
        position: 'relative',
        overflow: 'hidden',
        ...globalFXStyle,
      }}
    >
      {/* Audio */}
      <AudioDirector
        isRemotion={isRemotion}
        introAudioUrl={introAudioUrl}
        blackoutFrame={blackoutFrame}
        shakeFrame={shakeFrame}
      />

      {/* Canvas */}
      <ReactFlow
        nodes={processedNodes}
        edges={processedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypesWithFrame}
        viewport={currentViewport}
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

      {/* Overlays */}
      <VignetteOverlay
        vignetteOpacity={vignetteOpacity}
        showGlitch={activeGlobalFX.has(GLOBAL_FX.GLITCH)}
      />

      {/* Blackout CTA punchline */}
      {blackoutElapsed !== null && (
        <BlackoutCTA elapsed={blackoutElapsed} />
      )}
    </div>
  );
}

/**
 * Wrapped with ReactFlowProvider so internal ReactFlow hooks work
 * in standalone Remotion context.
 */
export default function CascadeFailureScene(props) {
  return (
    <ReactFlowProvider>
      <CascadeFailureSceneInner {...props} />
    </ReactFlowProvider>
  );
}
