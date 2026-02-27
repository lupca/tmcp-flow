/**
 * cascadeSceneUtils.js — Pure helper functions for CascadeFailureScene.
 *
 * All functions in this module are **pure** (no React, no side-effects).
 * They handle:
 *   - Node dimension & position resolution
 *   - Bounding-box viewport fitting
 *   - Timeline event derivation (node status, edge variant, FX)
 *   - Camera keyframe resolution & interpolation
 *   - Global FX style computation
 *
 * @module cascadeSceneUtils
 */

import {
  NODE_STATUS,
  EDGE_VARIANT,
  EVENT_TYPE,
  GLOBAL_FX,
} from '../constants/cascadeConstants.js';

// ─── Constants ───────────────────────────────────────────────────────

export const DEFAULT_NODE_W = 220;
export const DEFAULT_NODE_H = 100;

// ─── Dimension Helpers ───────────────────────────────────────────────

/**
 * Resolve effective width of a node using the project fallback chain.
 * Uses `??` (not `||`) so that explicit `0` is preserved.
 *
 * @param {Object} node - React Flow node object
 * @returns {number} Resolved width in pixels
 */
export function getNodeW(node) {
  return (
    node.measured?.width ??
    node.width ??
    node.initialWidth ??
    node.style?.width ??
    DEFAULT_NODE_W
  );
}

/**
 * Resolve effective height of a node using the project fallback chain.
 *
 * @param {Object} node - React Flow node object
 * @returns {number} Resolved height in pixels
 */
export function getNodeH(node) {
  return (
    node.measured?.height ??
    node.height ??
    node.initialHeight ??
    node.style?.height ??
    DEFAULT_NODE_H
  );
}

// ─── Position Resolution ─────────────────────────────────────────────

/**
 * Resolve the **absolute** position of a node by walking up the parent chain.
 * Child nodes inside groups store positions relative to their parent.
 *
 * @param {Object} node     - Target node
 * @param {Array}  allNodes - Complete node list (needed for parent lookup)
 * @returns {{ x: number, y: number }} Absolute position
 */
export function getAbsolutePosition(node, allNodes) {
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

/**
 * Compute a bounding box that encloses all non-group nodes,
 * then return the viewport offset that centers the graph on screen.
 *
 * Formula: `viewportX = screenWidth/2 - boundsCenterX * zoom`
 *
 * @param {Array}  allNodes - All nodes (groups are filtered out)
 * @param {number} width    - Composition width in px
 * @param {number} height   - Composition height in px
 * @param {number} zoom     - Camera zoom level
 * @returns {{ x: number, y: number }} Viewport offset
 */
export function computeFitViewport(allNodes, width, height, zoom) {
  const contentNodes = allNodes.filter((n) => n.type !== 'group');
  if (!contentNodes.length) return { x: 0, y: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of contentNodes) {
    const abs = getAbsolutePosition(n, allNodes);
    const w = getNodeW(n);
    const h = getNodeH(n);
    minX = Math.min(minX, abs.x);
    minY = Math.min(minY, abs.y);
    maxX = Math.max(maxX, abs.x + w);
    maxY = Math.max(maxY, abs.y + h);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    x: width / 2 - cx * zoom,
    y: height / 2 - cy * zoom,
  };
}

// ─── Timeline Event Derivation ───────────────────────────────────────

/**
 * Derive the latest node status for every node at (or before) the given frame.
 *
 * @param {Array}  timelineEvents - Sorted timeline event list
 * @param {number} frame          - Current frame number
 * @returns {Map<string, { status: string, frame: number }>}
 */
export function deriveNodeStatusMap(timelineEvents, frame) {
  const map = new Map();
  for (const evt of timelineEvents) {
    if (evt.type !== EVENT_TYPE.NODE_STATE) continue;
    if (evt.frame > frame) continue;
    const existing = map.get(evt.targetId);
    if (!existing || evt.frame >= existing.frame) {
      map.set(evt.targetId, { status: evt.status, frame: evt.frame });
    }
  }
  return map;
}

/**
 * Derive the latest edge variant for every edge at (or before) the given frame.
 *
 * @param {Array}  timelineEvents - Sorted timeline event list
 * @param {number} frame          - Current frame number
 * @returns {Map<string, { variant: string, frame: number }>}
 */
export function deriveEdgeVariantMap(timelineEvents, frame) {
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
}

/**
 * Derive processed nodes/edges at a preview frame for the editor.
 * Keeps group nodes intact and updates cascade node/edge data.
 */
export function deriveStatesAtFrame(nodes, edges, timelineEvents, frame) {
  const nodeStatusMap = deriveNodeStatusMap(timelineEvents, frame);
  const edgeVariantMap = deriveEdgeVariantMap(timelineEvents, frame);

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

/**
 * Derive the set of currently-active global FX at the given frame.
 *
 * @param {Array}  timelineEvents - Sorted timeline event list
 * @param {number} frame          - Current frame number
 * @returns {Map<string, { frame: number }>} effect name → trigger frame
 */
export function deriveActiveGlobalFX(timelineEvents, frame) {
  const fxMap = new Map();
  for (const evt of timelineEvents) {
    if (evt.type !== EVENT_TYPE.GLOBAL_FX) continue;
    if (evt.frame > frame) continue;
    fxMap.set(evt.effect, { frame: evt.frame });
  }
  return fxMap;
}

/**
 * Find the **first** frame at which a specific Global FX effect fires.
 * Returns `null` if the effect is not present in the timeline.
 *
 * @param {Array}  timelineEvents - Timeline event list
 * @param {string} effectName     - e.g. GLOBAL_FX.BLACKOUT_CTA
 * @returns {number|null}
 */
export function findFXEventFrame(timelineEvents, effectName) {
  for (const evt of timelineEvents) {
    if (evt.type === EVENT_TYPE.GLOBAL_FX && evt.effect === effectName) {
      return evt.frame;
    }
  }
  return null;
}

// ─── Node / Edge Processing ──────────────────────────────────────────

/**
 * Inject per-frame status data into nodes for CascadeNode rendering.
 *
 * @param {Array} nodes         - Raw React Flow nodes
 * @param {Map}   nodeStatusMap - Output of `deriveNodeStatusMap`
 * @param {number} frame        - Current frame
 * @returns {Array} Processed nodes with injected `data.status`, etc.
 */
export function processNodes(nodes, nodeStatusMap, frame) {
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
      type: 'cascade',
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
}

/**
 * Inject per-frame variant data into edges for CascadeEdge rendering.
 *
 * @param {Array} edges          - Raw React Flow edges
 * @param {Map}   edgeVariantMap - Output of `deriveEdgeVariantMap`
 * @returns {Array} Processed edges with injected `data.variant`, etc.
 */
export function processEdges(edges, edgeVariantMap) {
  return edges.map((edge) => {
    const variantInfo = edgeVariantMap.get(edge.id);
    const variant = variantInfo?.variant ?? EDGE_VARIANT.NORMAL;
    const variantFrame = variantInfo?.frame ?? 0;

    return {
      ...edge,
      type: 'cascade',
      data: {
        ...edge.data,
        variant,
        variantFrame,
      },
    };
  });
}

// ─── Camera ──────────────────────────────────────────────────────────

/**
 * Resolve raw camera keyframes into absolute viewport coordinates.
 *
 * Supports three keyframe modes:
 *   1. `fitView: true`    → auto-center on all-node bounding box
 *   2. `targetNodeId`     → center on a specific node
 *   3. raw `x / y`        → pass-through literal coordinates
 *
 * @param {Array}  cameraSequence - Raw keyframe list from props
 * @param {Array}  allNodes       - Processed nodes (for position lookups)
 * @param {number} width          - Composition width
 * @param {number} height         - Composition height
 * @returns {Array<{ frame, x, y, zoom, easing }>} Sorted resolved keyframes
 */
export function resolveKeyframes(cameraSequence, allNodes, width, height) {
  if (!cameraSequence?.length) {
    const defaultZoom = width < height ? 0.4 : 0.8;
    const fit = computeFitViewport(allNodes, width, height, defaultZoom);
    return [{ frame: 0, x: fit.x, y: fit.y, zoom: defaultZoom }];
  }

  return cameraSequence
    .map((kf) => {
      if (kf.fitView) {
        return resolveFitViewKeyframe(kf, allNodes, width, height);
      }
      if (kf.targetNodeId) {
        return resolveTargetNodeKeyframe(kf, allNodes, width, height);
      }
      return resolveLiteralKeyframe(kf);
    })
    .sort((a, b) => a.frame - b.frame);
}

/** @private Resolve a fitView keyframe */
function resolveFitViewKeyframe(kf, allNodes, width, height) {
  const zoom = kf.zoom || 1;
  const fit = computeFitViewport(allNodes, width, height, zoom);
  return { frame: kf.frame, zoom, x: fit.x, y: fit.y, easing: kf.easing };
}

/** @private Resolve a targetNodeId keyframe */
function resolveTargetNodeKeyframe(kf, allNodes, width, height) {
  const node = allNodes.find((n) => n.id === kf.targetNodeId);
  const zoom = kf.zoom || 1;

  if (node) {
    const absPos = getAbsolutePosition(node, allNodes);
    const centerX = absPos.x + getNodeW(node) / 2;
    const centerY = absPos.y + getNodeH(node) / 2;
    return {
      frame: kf.frame,
      zoom,
      x: width / 2 - centerX * zoom,
      y: height / 2 - centerY * zoom,
      easing: kf.easing,
    };
  }

  // Node not found — fall back to bounding-box center
  const fit = computeFitViewport(allNodes, width, height, zoom);
  return { frame: kf.frame, zoom, x: fit.x, y: fit.y, easing: kf.easing };
}

/** @private Resolve a literal x/y keyframe */
function resolveLiteralKeyframe(kf) {
  return {
    frame: kf.frame,
    zoom: kf.zoom || 1,
    x: kf.x ?? 0,
    y: kf.y ?? 0,
    easing: kf.easing,
  };
}

/**
 * Map an easing name string to a Remotion `Easing` function.
 *
 * @param {string} name - 'smooth' | 'slow' | 'snap'
 * @param {Object} Easing - Remotion Easing module (injected to keep this testable)
 * @returns {Function} Easing function `(t) => t`
 */
export function getEasingFn(name, EasingModule) {
  switch (name) {
    case 'slow':
      return EasingModule.inOut(EasingModule.cubic);
    case 'snap':
      return EasingModule.out(EasingModule.back(1.2));
    case 'smooth':
    default:
      return EasingModule.inOut(EasingModule.ease);
  }
}

/**
 * Find the active keyframe segment for a given frame,
 * then interpolate x/y/zoom using the segment's easing.
 *
 * @param {number} frame               - Current frame
 * @param {Array}  processedKeyframes  - Sorted resolved keyframes
 * @param {Object} EasingModule        - Remotion Easing (injected)
 * @returns {{ x: number, y: number, zoom: number }}
 */
export function interpolateViewport(frame, processedKeyframes, EasingModule) {
  if (processedKeyframes.length < 2) {
    const kf = processedKeyframes[0];
    return { x: kf.x, y: kf.y, zoom: kf.zoom };
  }

  const segIdx = findSegmentIndex(frame, processedKeyframes);
  const from = processedKeyframes[segIdx];
  const to = processedKeyframes[segIdx + 1];
  const segDuration = to.frame - from.frame;

  if (segDuration <= 0) {
    return { x: to.x, y: to.y, zoom: to.zoom };
  }

  const easingFn = getEasingFn(to.easing || 'smooth', EasingModule);
  const localProgress = Math.max(0, Math.min(1, (frame - from.frame) / segDuration));
  const eased = easingFn(localProgress);

  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    zoom: from.zoom + (to.zoom - from.zoom) * eased,
  };
}

/**
 * Binary-ish search for the keyframe segment that contains `frame`.
 *
 * @param {number} frame      - Current frame
 * @param {Array}  keyframes  - Sorted keyframe array
 * @returns {number} Segment start index (always ≤ keyframes.length - 2)
 */
export function findSegmentIndex(frame, keyframes) {
  let segIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (frame >= keyframes[i].frame && frame <= keyframes[i + 1].frame) {
      segIdx = i;
      break;
    }
    if (frame > keyframes[i + 1].frame) segIdx = i + 1;
  }
  return Math.min(segIdx, keyframes.length - 2);
}

// ─── Global FX Style ─────────────────────────────────────────────────

/**
 * Compute CSS transform/filter for active screen_shake & glitch FX.
 *
 * @param {number} frame         - Current frame
 * @param {Map}    activeGlobalFX - Output of `deriveActiveGlobalFX`
 * @returns {Object} CSS style object ({ transform?, filter? })
 */
export function computeGlobalFXStyle(frame, activeGlobalFX) {
  const style = {};

  const shakeInfo = activeGlobalFX.get(GLOBAL_FX.SCREEN_SHAKE);
  if (shakeInfo) {
    const elapsed = frame - shakeInfo.frame;
    const intensity = Math.min(1, elapsed / 30);
    const shakeX = Math.sin(frame * 0.8) * 15 * intensity;
    const shakeY = Math.cos(frame * 1.2) * 10 * intensity;
    style.transform = `translateX(${shakeX}px) translateY(${shakeY}px)`;
  }

  const glitchInfo = activeGlobalFX.get(GLOBAL_FX.GLITCH);
  if (glitchInfo) {
    const elapsed = frame - glitchInfo.frame;
    const ramp = Math.min(1, elapsed / 20);
    const hueRotate = frame * 5 * ramp;
    const contrast = 1 + 0.5 * ramp;
    style.filter = `hue-rotate(${hueRotate}deg) contrast(${contrast})`;
  }

  return style;
}

// ─── Vignette ────────────────────────────────────────────────────────

/**
 * Determine whether any node is in an error/offline state.
 *
 * @param {Map} nodeStatusMap - Output of `deriveNodeStatusMap`
 * @returns {boolean}
 */
export function hasAnyCriticalNode(nodeStatusMap) {
  for (const [, info] of nodeStatusMap) {
    if (info.status === NODE_STATUS.ERROR || info.status === NODE_STATUS.OFFLINE) {
      return true;
    }
  }
  return false;
}
