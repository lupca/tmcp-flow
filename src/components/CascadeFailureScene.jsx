import React, { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
} from '@xyflow/react';
import { Easing, Audio, interpolate, Sequence, staticFile } from 'remotion';
import '@xyflow/react/dist/style.css';

import CascadeNode from './CascadeNode';
import CascadeEdge from './CascadeEdge';
import GroupNode from './GroupNode';
import {
  NODE_STATUS,
  EDGE_VARIANT,
  EVENT_TYPE,
  GLOBAL_FX,
  COLORS,
} from '../constants/cascadeConstants';

// ── Node types (static — avoid re-creation) ─────────────────────────
const nodeTypes = { cascade: CascadeNode, group: GroupNode };

// ── Dimension helpers (project convention: ?? not ||) ────────────────
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 100;

function getNodeW(node) {
  return node.measured?.width ?? node.width ?? node.initialWidth ?? node.style?.width ?? DEFAULT_NODE_W;
}
function getNodeH(node) {
  return node.measured?.height ?? node.height ?? node.initialHeight ?? node.style?.height ?? DEFAULT_NODE_H;
}

/** Resolve absolute position for child nodes inside groups */
function getAbsolutePosition(node, allNodes) {
  let x = node.position?.x ?? 0;
  let y = node.position?.y ?? 0;
  if (node.parentId) {
    const parent = allNodes.find((n) => n.id === node.parentId);
    if (parent) {
      const pp = getAbsolutePosition(parent, allNodes);
      x += pp.x;
      y += pp.y;
    }
  }
  return { x, y };
}

/** Compute viewport x/y that centers the bounding box of all non-group nodes */
function computeFitViewport(allNodes, width, height, zoom) {
  const contentNodes = allNodes.filter((n) => n.type !== 'group');
  if (!contentNodes.length) return { x: 0, y: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of contentNodes) {
    const abs = getAbsolutePosition(n, allNodes);
    const w = getNodeW(n);
    const h = getNodeH(n);
    if (abs.x < minX) minX = abs.x;
    if (abs.y < minY) minY = abs.y;
    if (abs.x + w > maxX) maxX = abs.x + w;
    if (abs.y + h > maxY) maxY = abs.y + h;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    x: (width / 2) - (cx * zoom),
    y: (height / 2) - (cy * zoom),
  };
}

/**
 * CascadeFailureScene — The Director.
 *
 * Pure Remotion presentation component that:
 *  1. Processes timelineEvents to derive per-frame node/edge states
 *  2. Drives camera whip-pans tracking the infection front (spring-based)
 *  3. Applies global FX (screen shake, glitch, blackout CTA) on cue
 *  4. Audio directing — BGM ducking + SFX triggers
 *
 * Props (all JSON-serializable):
 *  nodes            — React Flow nodes array
 *  edges            — React Flow edges array
 *  cameraSequence   — Explicit camera keyframes (optional, supports fitView flag)
 *  timelineEvents   — Cascade failure event script
 *  frame            — Current Remotion frame (injected by wrapper)
 *  width / height   — Composition dimensions
 *  isRemotion       — true when inside Remotion renderer
 *  introAudioUrl    — Optional voiceover audio (from TTS)
 *  bgmUrl           — Optional background music URL
 *  sfxAlarmUrl      — Optional alarm SFX URL (plays at screen_shake)
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
  bgmUrl = null,
  sfxAlarmUrl = null,
}) {

  // ════════════════════════════════════════════════════════════════════
  //  1. DERIVED STATE ENGINE — process timelineEvents at current frame
  // ════════════════════════════════════════════════════════════════════

  /** Map<nodeId, { status, frame }> — last NODE_STATE per node ≤ current frame */
  const nodeStatusMap = useMemo(() => {
    const map = new Map();
    for (const evt of timelineEvents) {
      if (evt.type !== EVENT_TYPE.NODE_STATE) continue;
      if (evt.frame > frame) continue;
      // Always overwrite — events are sorted, last one wins
      const existing = map.get(evt.targetId);
      if (!existing || evt.frame >= existing.frame) {
        map.set(evt.targetId, { status: evt.status, frame: evt.frame });
      }
    }
    return map;
  }, [timelineEvents, frame]);

  /** Map<edgeId, { variant, frame }> — last EDGE_FLOW per edge ≤ current frame */
  const edgeVariantMap = useMemo(() => {
    const map = new Map();
    for (const evt of timelineEvents) {
      if (evt.type !== EVENT_TYPE.EDGE_FLOW) continue;
      if (evt.frame > frame) continue;
      const existing = map.get(evt.targetId);
      if (!existing || evt.frame >= existing.frame) {
        map.set(evt.targetId, { variant: evt.variant, frame: evt.frame });
      }
    }
    return map;
  }, [timelineEvents, frame]);

  /** Active global FX set */
  const activeGlobalFX = useMemo(() => {
    const fxSet = new Map(); // effect -> { frame }
    for (const evt of timelineEvents) {
      if (evt.type !== EVENT_TYPE.GLOBAL_FX) continue;
      if (evt.frame > frame) continue;
      fxSet.set(evt.effect, { frame: evt.frame });
    }
    return fxSet;
  }, [timelineEvents, frame]);

  // ════════════════════════════════════════════════════════════════════
  //  2. PROCESS NODES — inject status + frame data
  // ════════════════════════════════════════════════════════════════════

  const processedNodes = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'group') {
        return {
          ...node,
          width: node.width || node.style?.width,
          height: node.height || node.style?.height,
        };
      }

      const statusInfo = nodeStatusMap.get(node.id);
      const status = statusInfo?.status ?? NODE_STATUS.NORMAL;
      const statusFrame = statusInfo?.frame ?? 0;

      return {
        ...node,
        type: 'cascade', // ensure cascade node type
        data: {
          ...node.data,
          status,
          statusFrame,
          currentFrame: frame,
          isChildNode: !!node.parentId,
          isRendering: true,
        },
        width: node.width || node.style?.width,
        height: node.height || node.style?.height,
        style: {
          ...node.style,
          width: node.width || node.style?.width,
          height: node.height || node.style?.height,
        },
      };
    });
  }, [nodes, nodeStatusMap, frame]);

  // ════════════════════════════════════════════════════════════════════
  //  3. PROCESS EDGES — inject variant + frame data
  // ════════════════════════════════════════════════════════════════════

  const processedEdges = useMemo(() => {
    return edges.map((edge) => {
      const variantInfo = edgeVariantMap.get(edge.id);
      const variant = variantInfo?.variant ?? EDGE_VARIANT.NORMAL;
      const variantFrame = variantInfo?.frame ?? 0;

      return {
        ...edge,
        type: 'cascade', // ensure cascade edge type
        data: {
          ...edge.data,
          variant,
          variantFrame,
        },
      };
    });
  }, [edges, edgeVariantMap]);

  // ════════════════════════════════════════════════════════════════════
  //  4. CAMERA — cameraSequence keyframe interpolation (from DynamicFlowScene)
  //     + whip-pan auto-tracking of infection front
  // ════════════════════════════════════════════════════════════════════

  const processedKeyframes = useMemo(() => {
    if (!cameraSequence?.length) {
      // No camera sequence — auto-center on bounding box of all nodes
      const defaultZoom = width < height ? 0.4 : 0.8;
      const fit = computeFitViewport(processedNodes, width, height, defaultZoom);
      return [{ frame: 0, x: fit.x, y: fit.y, zoom: defaultZoom }];
    }

    return cameraSequence
      .map((kf) => {
        // fitView: auto-center bounding box of all nodes at given zoom
        if (kf.fitView) {
          const zoom = kf.zoom || 1;
          const fit = computeFitViewport(processedNodes, width, height, zoom);
          return {
            frame: kf.frame,
            zoom,
            x: fit.x,
            y: fit.y,
            easing: kf.easing,
          };
        }

        if (kf.targetNodeId) {
          const node = processedNodes.find((n) => n.id === kf.targetNodeId);
          if (node) {
            const nodeW = getNodeW(node);
            const nodeH = getNodeH(node);
            const absPos = getAbsolutePosition(node, processedNodes);
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
          // Node not found — fall back to bounding-box center
          const zoom = kf.zoom || 1;
          const fit = computeFitViewport(processedNodes, width, height, zoom);
          return { frame: kf.frame, zoom, x: fit.x, y: fit.y, easing: kf.easing };
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
  }, [cameraSequence, processedNodes, width, height]);

  /** Segment-based easing interpolation */
  const currentViewport = useMemo(() => {
    if (processedKeyframes.length < 2) {
      const kf = processedKeyframes[0];
      return { x: kf.x, y: kf.y, zoom: kf.zoom };
    }

    const kfs = processedKeyframes;
    let segIdx = 0;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (frame >= kfs[i].frame && frame <= kfs[i + 1].frame) {
        segIdx = i;
        break;
      }
      if (frame > kfs[i + 1].frame) segIdx = i + 1;
    }
    segIdx = Math.min(segIdx, kfs.length - 2);

    const from = kfs[segIdx];
    const to = kfs[segIdx + 1];
    const segDuration = to.frame - from.frame;

    if (segDuration <= 0) {
      return { x: to.x, y: to.y, zoom: to.zoom };
    }

    const easingName = to.easing || 'smooth';
    let easingFn;
    switch (easingName) {
      case 'slow':
        easingFn = Easing.inOut(Easing.cubic);
        break;
      case 'snap':
        // Snap easing: fast start, smooth end — feels like whip-pan
        easingFn = Easing.out(Easing.back(1.2));
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

  // ════════════════════════════════════════════════════════════════════
  //  5. GLOBAL FX — screen shake & glitch
  // ════════════════════════════════════════════════════════════════════

  const globalFXStyle = useMemo(() => {
    const style = {};

    const shakeInfo = activeGlobalFX.get(GLOBAL_FX.SCREEN_SHAKE);
    const glitchInfo = activeGlobalFX.get(GLOBAL_FX.GLITCH);

    if (shakeInfo) {
      // Ramp up intensity over 30 frames, then sustain
      const elapsed = frame - shakeInfo.frame;
      const ramp = Math.min(1, elapsed / 30);
      const intensity = ramp;
      const shakeX = Math.sin(frame * 0.8) * 15 * intensity;
      const shakeY = Math.cos(frame * 1.2) * 10 * intensity;
      style.transform = `translateX(${shakeX}px) translateY(${shakeY}px)`;
    }

    if (glitchInfo) {
      const elapsed = frame - glitchInfo.frame;
      const ramp = Math.min(1, elapsed / 20);
      const hueRotate = frame * 5 * ramp;
      const contrast = 1 + 0.5 * ramp;
      // Chromatic aberration feel
      style.filter = `hue-rotate(${hueRotate}deg) contrast(${contrast})`;
    }

    return style;
  }, [frame, activeGlobalFX]);

  // ════════════════════════════════════════════════════════════════════
  //  5b. AUDIO FRAME DETECTION — key frames for SFX triggers & ducking
  // ════════════════════════════════════════════════════════════════════

  const blackoutFrame = useMemo(() => {
    for (const evt of timelineEvents) {
      if (evt.type === EVENT_TYPE.GLOBAL_FX && evt.effect === GLOBAL_FX.BLACKOUT_CTA) {
        return evt.frame;
      }
    }
    return null;
  }, [timelineEvents]);

  const shakeFrame = useMemo(() => {
    for (const evt of timelineEvents) {
      if (evt.type === EVENT_TYPE.GLOBAL_FX && evt.effect === GLOBAL_FX.SCREEN_SHAKE) {
        return evt.frame;
      }
    }
    return null;
  }, [timelineEvents]);

  // ════════════════════════════════════════════════════════════════════
  //  6. EDGE TYPES with frame injection (dynamic factory, memoized)
  // ════════════════════════════════════════════════════════════════════

  const edgeTypesWithFrame = useMemo(() => ({
    cascade: (props) => (
      <CascadeEdge
        {...props}
        currentFrame={frame}
        data={{ ...props.data }}
      />
    ),
  }), [frame]);

  // ════════════════════════════════════════════════════════════════════
  //  7. VIGNETTE OVERLAY — darkened edges during crisis
  // ════════════════════════════════════════════════════════════════════

  const hasAnyError = useMemo(() => {
    for (const [, info] of nodeStatusMap) {
      if (info.status === NODE_STATUS.ERROR || info.status === NODE_STATUS.OFFLINE) {
        return true;
      }
    }
    return false;
  }, [nodeStatusMap]);

  const vignetteOpacity = hasAnyError ? 0.4 : 0;

  // ════════════════════════════════════════════════════════════════════
  //  8. RENDER
  // ════════════════════════════════════════════════════════════════════

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
      {/* ── Audio Directing ── */}
      {introAudioUrl && <Audio src={introAudioUrl} />}
      {isRemotion && (
        <Audio
          src={staticFile('bgm-calm.mp3')}
          volume={(f) => {
            // Duck to silence during blackout CTA
            if (blackoutFrame !== null && f >= blackoutFrame) {
              const elapsed = f - blackoutFrame;
              return Math.max(0, 0.3 * (1 - elapsed / 20));
            }
            return 0.3;
          }}
        />
      )}
      {isRemotion && shakeFrame !== null && (
        <Sequence from={shakeFrame}>
          <Audio src={staticFile('sfx-alarm.mp3')} volume={0.6} />
        </Sequence>
      )}
      {isRemotion && shakeFrame !== null && (
        <Sequence from={shakeFrame}>
          <Audio src={staticFile('sfx-error.mp3')} volume={0.5} />
        </Sequence>
      )}

      {/* ReactFlow canvas */}
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

      {/* Vignette overlay for crisis atmosphere */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          transition: 'background 0.5s',
        }}
      />

      {/* Red alert scan-line overlay during glitch */}
      {activeGlobalFX.has(GLOBAL_FX.GLITCH) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,0,60,0.03) 3px, rgba(255,0,60,0.03) 6px)',
            opacity: 0.7,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* ── Blackout CTA Punchline ── */}
      {activeGlobalFX.has(GLOBAL_FX.BLACKOUT_CTA) && (() => {
        const fxInfo = activeGlobalFX.get(GLOBAL_FX.BLACKOUT_CTA);
        const elapsed = frame - fxInfo.frame;
        const fadeIn = Math.min(1, elapsed / 20);
        const textScale = interpolate(elapsed, [0, 15, 25], [0.8, 1.05, 1], {
          extrapolateRight: 'clamp',
        });
        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 999,
              background: `rgba(0, 0, 0, ${fadeIn})`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                opacity: interpolate(elapsed, [10, 30], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                transform: `scale(${textScale})`,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#FF003C',
                  textShadow:
                    '0 0 40px rgba(255, 0, 60, 0.8), 0 0 80px rgba(255, 0, 60, 0.4)',
                  letterSpacing: '-2px',
                  marginBottom: 24,
                }}
              >
                SERVER DOWN
              </div>
              <div
                style={{
                  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
                  fontSize: 32,
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.7)',
                  opacity: interpolate(elapsed, [25, 45], [0, 1], {
                    extrapolateLeft: 'clamp',
                    extrapolateRight: 'clamp',
                  }),
                }}
              >
                The CTO is calling...
              </div>
            </div>
          </div>
        );
      })()}
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
