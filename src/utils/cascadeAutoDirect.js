/**
 * Cascade Auto-Director — Automatically generates a cascade failure
 * timeline (timelineEvents + cameraSequence) from a flow topology.
 *
 * Algorithm: BFS from an origin node through connected edges.
 * At each hop the origin infects its neighbors, edges turn danger,
 * and the camera whip-pans to follow the infection front.
 */

import {
  EVENT_TYPE,
  NODE_STATUS,
  EDGE_VARIANT,
  GLOBAL_FX,
  CASCADE_DEFAULTS,
} from '../constants/cascadeConstants.js';

// ── Dimension helpers ────────────────────────────────────────────────
const DEFAULT_NODE_W = 220;
const DEFAULT_NODE_H = 100;

function _getNodeW(node) {
  return node.measured?.width ?? node.width ?? node.initialWidth ?? node.style?.width ?? DEFAULT_NODE_W;
}
function _getNodeH(node) {
  return node.measured?.height ?? node.height ?? node.initialHeight ?? node.style?.height ?? DEFAULT_NODE_H;
}

function _getAbsPos(node, allNodes) {
  let x = node.position?.x ?? 0;
  let y = node.position?.y ?? 0;
  if (node.parentId) {
    const parent = allNodes.find((n) => n.id === node.parentId);
    if (parent) {
      const pp = _getAbsPos(parent, allNodes);
      x += pp.x;
      y += pp.y;
    }
  }
  return { x, y };
}

function _nodeCenter(node, allNodes) {
  const abs = _getAbsPos(node, allNodes);
  return { x: abs.x + _getNodeW(node) / 2, y: abs.y + _getNodeH(node) / 2 };
}

function _dist(a, b, allNodes) {
  const ca = _nodeCenter(a, allNodes);
  const cb = _nodeCenter(b, allNodes);
  return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
}

function _fitAllBounds(nodes, allNodes) {
  if (!nodes.length) return { cx: 0, cy: 0, spanX: 0, spanY: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const abs = _getAbsPos(n, allNodes);
    const w = _getNodeW(n);
    const h = _getNodeH(n);
    if (abs.x < minX) minX = abs.x;
    if (abs.y < minY) minY = abs.y;
    if (abs.x + w > maxX) maxX = abs.x + w;
    if (abs.y + h > maxY) maxY = abs.y + h;
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, spanX: maxX - minX, spanY: maxY - minY };
}

function _fitZoom(spanX, spanY, padding = 200) {
  const targetW = 1080 - padding * 2;
  const targetH = 1920 - padding * 2;
  const zx = spanX > 0 ? targetW / spanX : 2;
  const zy = spanY > 0 ? targetH / spanY : 2;
  return Math.min(zx, zy, 1.2);
}

/**
 * Find the edge connecting two specific nodes (direction-agnostic).
 */
function _findEdge(edges, nodeA, nodeB) {
  return edges.find(
    (e) =>
      (e.source === nodeA && e.target === nodeB) ||
      (e.source === nodeB && e.target === nodeA)
  );
}

/**
 * Generate a complete cascade failure scenario.
 *
 * @param {Array} nodes        — React Flow nodes
 * @param {Array} edges        — React Flow edges
 * @param {string} originNodeId — Node ID where the failure starts
 * @param {Object} [config]    — Override CASCADE_DEFAULTS
 *
 * @returns {{ timelineEvents: Array, cameraSequence: Array, totalFrames: number }}
 */
export function generateCascadeScenario(nodes, edges, originNodeId, config = {}) {
  const {
    initialDelay = CASCADE_DEFAULTS.INITIAL_DELAY,
    firstNodePause = CASCADE_DEFAULTS.FIRST_NODE_PAUSE,
    spreadDelay = CASCADE_DEFAULTS.SPREAD_DELAY,
    warningDuration = CASCADE_DEFAULTS.WARNING_DURATION,
    holdPerNode = CASCADE_DEFAULTS.HOLD_PER_NODE,
    cameraZoom = CASCADE_DEFAULTS.CAMERA_ZOOM,
    cameraZoomWide = CASCADE_DEFAULTS.CAMERA_ZOOM_WIDE,
    panFrames = CASCADE_DEFAULTS.PAN_FRAMES,
    screenShakeDelay = CASCADE_DEFAULTS.SCREEN_SHAKE_DELAY,
  } = config;

  const allNodes = nodes;
  const nonGroupNodes = allNodes.filter((n) => n.type !== 'group');
  const originNode = nonGroupNodes.find((n) => n.id === originNodeId);

  if (!originNode) {
    console.warn(`[CascadeAutoDirect] Origin node "${originNodeId}" not found.`);
    return { timelineEvents: [], cameraSequence: [], totalFrames: 0 };
  }

  // Build adjacency (undirected — infection spreads both ways)
  const adjacency = {};
  for (const n of nonGroupNodes) {
    adjacency[n.id] = [];
  }
  for (const e of edges) {
    if (adjacency[e.source]) adjacency[e.source].push(e.target);
    if (adjacency[e.target]) adjacency[e.target].push(e.source);
  }

  const timelineEvents = [];
  const cameraSequence = [];

  // ── Setup Phase: Wide establishing shot (healthy system) ───────────
  // Let the audience read the architecture for INITIAL_DELAY frames.
  const bounds = _fitAllBounds(nonGroupNodes, allNodes);
  const fitZoom = _fitZoom(bounds.spanX, bounds.spanY);

  let currentFrame = 0;
  cameraSequence.push({ frame: 0, fitView: true, zoom: Math.max(fitZoom, 0.25), easing: 'smooth' });
  currentFrame += initialDelay; // Pause to let audience see healthy system

  // ── BFS infection spreading ────────────────────────────────────────
  const visited = new Set();
  const queue = [{ nodeId: originNodeId, arrivalFrame: currentFrame, isOrigin: true }];
  visited.add(originNodeId);

  // Track infection order for camera
  const infectionOrder = [];
  let isFirstNode = true;

  while (queue.length > 0) {
    const { nodeId, arrivalFrame, isOrigin } = queue.shift();
    const node = nonGroupNodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Warning → Error transition
    const warningFrame = arrivalFrame;
    const errorFrame = arrivalFrame + warningDuration;

    timelineEvents.push({
      frame: warningFrame,
      type: EVENT_TYPE.NODE_STATE,
      targetId: nodeId,
      status: NODE_STATUS.WARNING,
    });

    timelineEvents.push({
      frame: errorFrame,
      type: EVENT_TYPE.NODE_STATE,
      targetId: nodeId,
      status: NODE_STATUS.ERROR,
    });

    infectionOrder.push({ nodeId, frame: warningFrame });

    // Camera: pan to this node with slow easing for dramatic effect
    cameraSequence.push({
      frame: Math.max(warningFrame - panFrames, cameraSequence[cameraSequence.length - 1]?.frame ?? 0),
      targetNodeId: nodeId,
      zoom: cameraZoom,
      easing: 'slow',  // Changed from 'snap' to 'slow' for deliberate, suspenseful motion
    });

    // Hold on this node
    cameraSequence.push({
      frame: errorFrame,
      targetNodeId: nodeId,
      zoom: cameraZoom,
      easing: 'slow',
    });

    // Special case: first node failure gets an extra pause before cascade spreads
    let spreadFrame = errorFrame + spreadDelay;
    if (isFirstNode) {
      spreadFrame = errorFrame + firstNodePause + spreadDelay;
      isFirstNode = false;
    }

    // Spread to neighbors
    const neighbors = adjacency[nodeId] || [];
    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);

      // Find the connecting edge
      const edge = _findEdge(edges, nodeId, neighborId);
      if (edge) {
        // Edge turns danger when error propagates
        timelineEvents.push({
          frame: errorFrame,
          type: EVENT_TYPE.EDGE_FLOW,
          targetId: edge.id,
          variant: EDGE_VARIANT.DANGER,
        });
      }

      // Schedule neighbor infection
      queue.push({
        nodeId: neighborId,
        arrivalFrame: spreadFrame,
        isOrigin: false,
      });
    }
  }

  // ── Update currentFrame to after last infection ────────────────────
  const lastEvent = [...timelineEvents]
    .filter((e) => e.type === EVENT_TYPE.NODE_STATE)
    .sort((a, b) => b.frame - a.frame)[0];
  currentFrame = (lastEvent?.frame ?? currentFrame) + holdPerNode;

  // ── Global FX: screen shake after all nodes infected ───────────────
  timelineEvents.push({
    frame: currentFrame,
    type: EVENT_TYPE.GLOBAL_FX,
    effect: GLOBAL_FX.SCREEN_SHAKE,
  });

  // Glitch shortly after
  timelineEvents.push({
    frame: currentFrame + screenShakeDelay,
    type: EVENT_TYPE.GLOBAL_FX,
    effect: GLOBAL_FX.GLITCH,
  });

  // ── Nodes go offline one by one (staggered for visual drama) ────────────────
  // Stagger at 10 frames between each node's offline event for dramatic collapse
  let offlineFrame = currentFrame + screenShakeDelay + 20;
  const offlineStagger = 10;
  for (const { nodeId } of infectionOrder) {
    timelineEvents.push({
      frame: offlineFrame,
      type: EVENT_TYPE.NODE_STATE,
      targetId: nodeId,
      status: NODE_STATUS.OFFLINE,
    });
    offlineFrame += offlineStagger;
  }

  // ── Camera: pull back to wide shot for meltdown ────────────────────
  cameraSequence.push({
    frame: currentFrame - 10,
    fitView: true,
    zoom: cameraZoomWide,
    easing: 'slow',
  });

  // ── Blackout CTA punchline ─────────────────────────────────────────
  const blackoutFrame = offlineFrame + 10;
  timelineEvents.push({
    frame: blackoutFrame,
    type: EVENT_TYPE.GLOBAL_FX,
    effect: GLOBAL_FX.BLACKOUT_CTA,
  });

  // Hold wide for the finale, then blackout
  const totalFrames = blackoutFrame + 90; // Final 90 frames for blackout CTA
  cameraSequence.push({
    frame: totalFrames,
    fitView: true,
    zoom: cameraZoomWide * 0.9,
    easing: 'slow',
  });

  // Sort events by frame for consistency
  timelineEvents.sort((a, b) => a.frame - b.frame);
  cameraSequence.sort((a, b) => a.frame - b.frame);

  return { timelineEvents, cameraSequence, totalFrames };
}

/**
 * Pick the "best" origin node for a cascade — the one with fewest
 * outgoing connections (leaf database, single service, etc.)
 * If no clear candidate, pick the first non-group node.
 */
export function suggestOriginNode(nodes, edges) {
  const nonGroupNodes = nodes.filter((n) => n.type !== 'group');
  if (nonGroupNodes.length === 0) return null;

  // Count outgoing edges per node
  const outDegree = {};
  for (const n of nonGroupNodes) outDegree[n.id] = 0;
  for (const e of edges) {
    if (outDegree[e.source] !== undefined) outDegree[e.source]++;
  }

  // Find leaf nodes (0 outgoing) — good failure origin candidates
  const leaves = nonGroupNodes.filter((n) => outDegree[n.id] === 0);
  if (leaves.length > 0) return leaves[0].id;

  // Fall back to node with fewest connections
  const sorted = [...nonGroupNodes].sort(
    (a, b) => (outDegree[a.id] ?? 0) - (outDegree[b.id] ?? 0)
  );
  return sorted[0]?.id ?? null;
}
