/**
 * Unit tests for cascadeSceneUtils.js — all pure functions.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NODE_W,
  DEFAULT_NODE_H,
  getNodeW,
  getNodeH,
  getAbsolutePosition,
  computeFitViewport,
  deriveNodeStatusMap,
  deriveEdgeVariantMap,
  deriveActiveGlobalFX,
  findFXEventFrame,
  processNodes,
  processEdges,
  resolveKeyframes,
  interpolateViewport,
  findSegmentIndex,
  getEasingFn,
  computeGlobalFXStyle,
  hasAnyCriticalNode,
} from '../cascadeSceneUtils';

import {
  NODE_STATUS,
  EDGE_VARIANT,
  EVENT_TYPE,
  GLOBAL_FX,
} from '../../constants/cascadeConstants';

// ═══════════════════════════════════════════════════════════════════════
//  Helpers & Fixtures
// ═══════════════════════════════════════════════════════════════════════

/** Minimal node factory */
function makeNode(id, x = 0, y = 0, opts = {}) {
  return {
    id,
    type: opts.type ?? 'cascade',
    position: { x, y },
    data: { title: id },
    width: opts.width,
    height: opts.height,
    parentId: opts.parentId,
    measured: opts.measured,
    initialWidth: opts.initialWidth,
    initialHeight: opts.initialHeight,
    style: opts.style,
  };
}

/** Minimal edge factory */
function makeEdge(id, source, target) {
  return { id, source, target, type: 'cascade', data: {} };
}

/** Fake Easing module mirroring Remotion's shape */
const FakeEasing = {
  inOut: (fn) => fn,
  out: (fn) => fn,
  back: () => (t) => t,
  ease: (t) => t,
  cubic: (t) => t,
};

// ═══════════════════════════════════════════════════════════════════════
//  getNodeW / getNodeH
// ═══════════════════════════════════════════════════════════════════════

describe('getNodeW', () => {
  it('returns DEFAULT_NODE_W when node has no dimension info', () => {
    expect(getNodeW({})).toBe(DEFAULT_NODE_W);
  });

  it('prefers measured.width over width', () => {
    expect(getNodeW({ measured: { width: 300 }, width: 200 })).toBe(300);
  });

  it('falls back through width → initialWidth → style.width → default', () => {
    expect(getNodeW({ width: 150 })).toBe(150);
    expect(getNodeW({ initialWidth: 120 })).toBe(120);
    expect(getNodeW({ style: { width: 99 } })).toBe(99);
  });

  it('preserves explicit 0 via ?? (not ||)', () => {
    expect(getNodeW({ width: 0 })).toBe(0);
  });
});

describe('getNodeH', () => {
  it('returns DEFAULT_NODE_H for empty node', () => {
    expect(getNodeH({})).toBe(DEFAULT_NODE_H);
  });

  it('prefers measured.height', () => {
    expect(getNodeH({ measured: { height: 50 }, height: 80 })).toBe(50);
  });

  it('preserves explicit 0', () => {
    expect(getNodeH({ height: 0 })).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  getAbsolutePosition
// ═══════════════════════════════════════════════════════════════════════

describe('getAbsolutePosition', () => {
  it('returns raw position for top-level node', () => {
    const node = makeNode('a', 100, 200);
    expect(getAbsolutePosition(node, [node])).toEqual({ x: 100, y: 200 });
  });

  it('adds parent offset for child nodes', () => {
    const parent = makeNode('parent', 100, 100);
    const child = makeNode('child', 50, 50, { parentId: 'parent' });
    const all = [parent, child];
    expect(getAbsolutePosition(child, all)).toEqual({ x: 150, y: 150 });
  });

  it('resolves multi-level parent chain', () => {
    const grandparent = makeNode('gp', 10, 10);
    const parent = makeNode('p', 20, 20, { parentId: 'gp' });
    const child = makeNode('c', 30, 30, { parentId: 'p' });
    const all = [grandparent, parent, child];
    expect(getAbsolutePosition(child, all)).toEqual({ x: 60, y: 60 });
  });

  it('handles missing parent gracefully', () => {
    const orphan = makeNode('orphan', 10, 20, { parentId: 'missing' });
    expect(getAbsolutePosition(orphan, [orphan])).toEqual({ x: 10, y: 20 });
  });

  it('defaults to 0,0 when node has no position', () => {
    const node = { id: 'a' };
    expect(getAbsolutePosition(node, [node])).toEqual({ x: 0, y: 0 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  computeFitViewport
// ═══════════════════════════════════════════════════════════════════════

describe('computeFitViewport', () => {
  it('returns origin for empty node list', () => {
    expect(computeFitViewport([], 1080, 1920, 1)).toEqual({ x: 0, y: 0 });
  });

  it('centres a single node on screen', () => {
    const node = makeNode('n', 100, 200, { width: 200, height: 100 });
    const result = computeFitViewport([node], 1080, 1920, 1);
    // cx = 100 + 200/2 = 200, cy = 200 + 100/2 = 250
    expect(result.x).toBe(1080 / 2 - 200);
    expect(result.y).toBe(1920 / 2 - 250);
  });

  it('applies zoom scaling correctly', () => {
    const node = makeNode('n', 0, 0, { width: 200, height: 100 });
    const zoom = 2;
    const result = computeFitViewport([node], 1080, 1920, zoom);
    // cx = 100, cy = 50 -> x = 540 - 100*2 = 340, y = 960 - 50*2 = 860
    expect(result.x).toBe(340);
    expect(result.y).toBe(860);
  });

  it('filters out group nodes', () => {
    const group = makeNode('grp', 0, 0, { type: 'group', width: 1000, height: 1000 });
    const node = makeNode('n', 50, 50, { width: 100, height: 100 });
    const result = computeFitViewport([group, node], 1080, 1920, 1);
    // Should only consider 'n' → cx = 100, cy = 100
    expect(result.x).toBe(1080 / 2 - 100);
    expect(result.y).toBe(1920 / 2 - 100);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  deriveNodeStatusMap
// ═══════════════════════════════════════════════════════════════════════

describe('deriveNodeStatusMap', () => {
  const events = [
    { frame: 10, type: EVENT_TYPE.NODE_STATE, targetId: 'a', status: NODE_STATUS.WARNING },
    { frame: 20, type: EVENT_TYPE.NODE_STATE, targetId: 'a', status: NODE_STATUS.ERROR },
    { frame: 30, type: EVENT_TYPE.NODE_STATE, targetId: 'b', status: NODE_STATUS.WARNING },
    { frame: 50, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e1', variant: EDGE_VARIANT.DANGER },
  ];

  it('returns empty map for no events', () => {
    expect(deriveNodeStatusMap([], 100).size).toBe(0);
  });

  it('only includes events up to current frame', () => {
    const map = deriveNodeStatusMap(events, 15);
    expect(map.size).toBe(1);
    expect(map.get('a').status).toBe(NODE_STATUS.WARNING);
  });

  it('last event wins for same node', () => {
    const map = deriveNodeStatusMap(events, 25);
    expect(map.get('a').status).toBe(NODE_STATUS.ERROR);
    expect(map.get('a').frame).toBe(20);
  });

  it('ignores non-NODE_STATE events', () => {
    const map = deriveNodeStatusMap(events, 100);
    expect(map.has('e1')).toBe(false);
    expect(map.size).toBe(2); // 'a' + 'b'
  });

  it('returns multiple nodes at later frame', () => {
    const map = deriveNodeStatusMap(events, 100);
    expect(map.get('a').status).toBe(NODE_STATUS.ERROR);
    expect(map.get('b').status).toBe(NODE_STATUS.WARNING);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  deriveEdgeVariantMap
// ═══════════════════════════════════════════════════════════════════════

describe('deriveEdgeVariantMap', () => {
  const events = [
    { frame: 10, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e1', variant: EDGE_VARIANT.DANGER },
    { frame: 20, type: EVENT_TYPE.NODE_STATE, targetId: 'a', status: NODE_STATUS.ERROR },
  ];

  it('derives edge variants correctly', () => {
    const map = deriveEdgeVariantMap(events, 15);
    expect(map.get('e1').variant).toBe(EDGE_VARIANT.DANGER);
  });

  it('ignores non-EDGE_FLOW events', () => {
    const map = deriveEdgeVariantMap(events, 100);
    expect(map.size).toBe(1);
    expect(map.has('a')).toBe(false);
  });

  it('returns empty map before any edge event', () => {
    expect(deriveEdgeVariantMap(events, 5).size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  deriveActiveGlobalFX
// ═══════════════════════════════════════════════════════════════════════

describe('deriveActiveGlobalFX', () => {
  const events = [
    { frame: 100, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.SCREEN_SHAKE },
    { frame: 120, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.GLITCH },
    { frame: 200, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.BLACKOUT_CTA },
  ];

  it('returns empty map before any FX event', () => {
    expect(deriveActiveGlobalFX(events, 50).size).toBe(0);
  });

  it('accumulates FX as frame advances', () => {
    expect(deriveActiveGlobalFX(events, 110).size).toBe(1);
    expect(deriveActiveGlobalFX(events, 130).size).toBe(2);
    expect(deriveActiveGlobalFX(events, 250).size).toBe(3);
  });

  it('records the trigger frame for each effect', () => {
    const map = deriveActiveGlobalFX(events, 250);
    expect(map.get(GLOBAL_FX.SCREEN_SHAKE).frame).toBe(100);
    expect(map.get(GLOBAL_FX.BLACKOUT_CTA).frame).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  findFXEventFrame
// ═══════════════════════════════════════════════════════════════════════

describe('findFXEventFrame', () => {
  const events = [
    { frame: 100, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.SCREEN_SHAKE },
    { frame: 200, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.BLACKOUT_CTA },
    { frame: 50, type: EVENT_TYPE.NODE_STATE, targetId: 'a', status: NODE_STATUS.ERROR },
  ];

  it('finds the first frame of a specific FX', () => {
    expect(findFXEventFrame(events, GLOBAL_FX.SCREEN_SHAKE)).toBe(100);
    expect(findFXEventFrame(events, GLOBAL_FX.BLACKOUT_CTA)).toBe(200);
  });

  it('returns null for missing FX', () => {
    expect(findFXEventFrame(events, GLOBAL_FX.GLITCH)).toBeNull();
  });

  it('returns null for empty events', () => {
    expect(findFXEventFrame([], GLOBAL_FX.SCREEN_SHAKE)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  processNodes
// ═══════════════════════════════════════════════════════════════════════

describe('processNodes', () => {
  it('injects status data into cascade nodes', () => {
    const nodes = [makeNode('a', 10, 20, { width: 200, height: 90 })];
    const statusMap = new Map([['a', { status: NODE_STATUS.ERROR, frame: 90 }]]);
    const result = processNodes(nodes, statusMap, 100);

    expect(result[0].type).toBe('cascade');
    expect(result[0].data.status).toBe(NODE_STATUS.ERROR);
    expect(result[0].data.statusFrame).toBe(90);
    expect(result[0].data.currentFrame).toBe(100);
    expect(result[0].data.isRendering).toBe(true);
  });

  it('defaults to NORMAL for nodes without events', () => {
    const nodes = [makeNode('x', 0, 0)];
    const statusMap = new Map();
    const result = processNodes(nodes, statusMap, 0);
    expect(result[0].data.status).toBe(NODE_STATUS.NORMAL);
  });

  it('preserves group nodes without status injection', () => {
    const group = makeNode('grp', 0, 0, { type: 'group', width: 500, height: 400 });
    const result = processNodes([group], new Map(), 0);
    expect(result[0].type).toBe('group');
    expect(result[0].data.status).toBeUndefined();
  });

  it('marks child nodes correctly', () => {
    const child = makeNode('child', 0, 0, { parentId: 'p' });
    const result = processNodes([child], new Map(), 0);
    expect(result[0].data.isChildNode).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  processEdges
// ═══════════════════════════════════════════════════════════════════════

describe('processEdges', () => {
  it('injects variant data', () => {
    const edges = [makeEdge('e1', 'a', 'b')];
    const variantMap = new Map([['e1', { variant: EDGE_VARIANT.DANGER, frame: 50 }]]);
    const result = processEdges(edges, variantMap);

    expect(result[0].type).toBe('cascade');
    expect(result[0].data.variant).toBe(EDGE_VARIANT.DANGER);
    expect(result[0].data.variantFrame).toBe(50);
  });

  it('defaults to NORMAL for edges without events', () => {
    const edges = [makeEdge('e2', 'c', 'd')];
    const result = processEdges(edges, new Map());
    expect(result[0].data.variant).toBe(EDGE_VARIANT.NORMAL);
    expect(result[0].data.variantFrame).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  resolveKeyframes
// ═══════════════════════════════════════════════════════════════════════

describe('resolveKeyframes', () => {
  const nodes = [
    makeNode('a', 100, 200, { width: 200, height: 100 }),
    makeNode('b', 400, 300, { width: 200, height: 100 }),
  ];
  const W = 1080;
  const H = 1920;

  it('auto-centers when cameraSequence is empty', () => {
    const kfs = resolveKeyframes([], nodes, W, H);
    expect(kfs).toHaveLength(1);
    expect(kfs[0].frame).toBe(0);
    // Portrait → default zoom 0.4
    expect(kfs[0].zoom).toBe(0.4);
    // Should not be 0,0
    expect(kfs[0].x).not.toBe(0);
    expect(kfs[0].y).not.toBe(0);
  });

  it('resolves fitView keyframes', () => {
    const seq = [{ frame: 0, fitView: true, zoom: 0.5, easing: 'smooth' }];
    const kfs = resolveKeyframes(seq, nodes, W, H);
    expect(kfs[0].zoom).toBe(0.5);
    // cx = (100 + 600) / 2 = 350, viewport.x = 540 - 350*0.5 = 365
    expect(kfs[0].x).toBe(365);
  });

  it('resolves targetNodeId keyframes', () => {
    const seq = [{ frame: 0, targetNodeId: 'a', zoom: 1, easing: 'snap' }];
    const kfs = resolveKeyframes(seq, nodes, W, H);
    // node 'a' center: x=100+100=200, y=200+50=250
    expect(kfs[0].x).toBe(W / 2 - 200);
    expect(kfs[0].y).toBe(H / 2 - 250);
  });

  it('falls back to fitView for missing targetNodeId', () => {
    const seq = [{ frame: 0, targetNodeId: 'nonexistent', zoom: 1 }];
    const kfs = resolveKeyframes(seq, nodes, W, H);
    // Should center on all nodes, not default to 0,0
    expect(kfs[0].x).not.toBe(0);
  });

  it('passes through literal x/y keyframes', () => {
    const seq = [{ frame: 0, x: 42, y: 84, zoom: 2, easing: 'slow' }];
    const kfs = resolveKeyframes(seq, nodes, W, H);
    expect(kfs[0]).toEqual({ frame: 0, x: 42, y: 84, zoom: 2, easing: 'slow' });
  });

  it('sorts keyframes by frame', () => {
    const seq = [
      { frame: 60, x: 0, y: 0, zoom: 1 },
      { frame: 0, fitView: true, zoom: 0.5 },
      { frame: 30, targetNodeId: 'a', zoom: 1.5 },
    ];
    const kfs = resolveKeyframes(seq, nodes, W, H);
    expect(kfs[0].frame).toBe(0);
    expect(kfs[1].frame).toBe(30);
    expect(kfs[2].frame).toBe(60);
  });

  it('uses landscape zoom for wide compositions', () => {
    const kfs = resolveKeyframes([], nodes, 1920, 1080);
    expect(kfs[0].zoom).toBe(0.8); // landscape
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  findSegmentIndex
// ═══════════════════════════════════════════════════════════════════════

describe('findSegmentIndex', () => {
  const kfs = [
    { frame: 0 },
    { frame: 60 },
    { frame: 120 },
    { frame: 200 },
  ];

  it('returns 0 for frame within first segment', () => {
    expect(findSegmentIndex(30, kfs)).toBe(0);
  });

  it('returns correct segment for middle frame', () => {
    expect(findSegmentIndex(90, kfs)).toBe(1);
  });

  it('returns last segment for frame beyond all keyframes', () => {
    expect(findSegmentIndex(999, kfs)).toBe(2); // kfs.length - 2
  });

  it('handles frame exactly on a keyframe boundary', () => {
    expect(findSegmentIndex(60, kfs)).toBe(0); // 60 is within [0,60]
    expect(findSegmentIndex(120, kfs)).toBe(1); // 120 is within [60,120]
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  getEasingFn
// ═══════════════════════════════════════════════════════════════════════

describe('getEasingFn', () => {
  it('returns a function for smooth', () => {
    expect(typeof getEasingFn('smooth', FakeEasing)).toBe('function');
  });

  it('returns a function for slow', () => {
    expect(typeof getEasingFn('slow', FakeEasing)).toBe('function');
  });

  it('returns a function for snap', () => {
    expect(typeof getEasingFn('snap', FakeEasing)).toBe('function');
  });

  it('defaults to smooth for unknown names', () => {
    const smooth = getEasingFn('smooth', FakeEasing);
    const unknown = getEasingFn('banana', FakeEasing);
    expect(smooth).toBe(unknown);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  interpolateViewport
// ═══════════════════════════════════════════════════════════════════════

describe('interpolateViewport', () => {
  it('returns single keyframe directly when only one exists', () => {
    const kfs = [{ frame: 0, x: 10, y: 20, zoom: 0.5 }];
    expect(interpolateViewport(50, kfs, FakeEasing)).toEqual({ x: 10, y: 20, zoom: 0.5 });
  });

  it('interpolates between two keyframes at midpoint', () => {
    const kfs = [
      { frame: 0, x: 0, y: 0, zoom: 1, easing: 'smooth' },
      { frame: 100, x: 100, y: 200, zoom: 2, easing: 'smooth' },
    ];
    // With FakeEasing (linear), midpoint = 50% progress
    const result = interpolateViewport(50, kfs, FakeEasing);
    expect(result.x).toBe(50);
    expect(result.y).toBe(100);
    expect(result.zoom).toBe(1.5);
  });

  it('clamps at 0% for frames before first keyframe', () => {
    const kfs = [
      { frame: 10, x: 0, y: 0, zoom: 1 },
      { frame: 50, x: 100, y: 100, zoom: 2, easing: 'smooth' },
    ];
    const result = interpolateViewport(0, kfs, FakeEasing);
    // progress = clamp((0 - 10)/(50-10), 0, 1) = 0
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('returns target values for zero-duration segment', () => {
    const kfs = [
      { frame: 50, x: 0, y: 0, zoom: 1 },
      { frame: 50, x: 99, y: 99, zoom: 3, easing: 'smooth' },
    ];
    const result = interpolateViewport(50, kfs, FakeEasing);
    expect(result).toEqual({ x: 99, y: 99, zoom: 3 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  computeGlobalFXStyle
// ═══════════════════════════════════════════════════════════════════════

describe('computeGlobalFXStyle', () => {
  it('returns empty object when no FX active', () => {
    expect(computeGlobalFXStyle(100, new Map())).toEqual({});
  });

  it('produces transform for screen_shake', () => {
    const fxMap = new Map([[GLOBAL_FX.SCREEN_SHAKE, { frame: 100 }]]);
    const style = computeGlobalFXStyle(115, fxMap);
    expect(style.transform).toBeDefined();
    expect(style.transform).toContain('translateX');
    expect(style.transform).toContain('translateY');
  });

  it('produces filter for glitch', () => {
    const fxMap = new Map([[GLOBAL_FX.GLITCH, { frame: 100 }]]);
    const style = computeGlobalFXStyle(110, fxMap);
    expect(style.filter).toBeDefined();
    expect(style.filter).toContain('hue-rotate');
    expect(style.filter).toContain('contrast');
  });

  it('produces both transform and filter when both active', () => {
    const fxMap = new Map([
      [GLOBAL_FX.SCREEN_SHAKE, { frame: 100 }],
      [GLOBAL_FX.GLITCH, { frame: 110 }],
    ]);
    const style = computeGlobalFXStyle(120, fxMap);
    expect(style.transform).toBeDefined();
    expect(style.filter).toBeDefined();
  });

  it('ramps shake intensity over 30 frames', () => {
    const fxMap = new Map([[GLOBAL_FX.SCREEN_SHAKE, { frame: 0 }]]);
    // At frame 0 (elapsed=0), intensity = 0 → no displacement
    const style0 = computeGlobalFXStyle(0, fxMap);
    expect(style0.transform).toContain('0px');
    // At frame 30+ (elapsed≥30), intensity = 1 → max
    const style30 = computeGlobalFXStyle(30, fxMap);
    expect(style30.transform).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  hasAnyCriticalNode
// ═══════════════════════════════════════════════════════════════════════

describe('hasAnyCriticalNode', () => {
  it('returns false for empty map', () => {
    expect(hasAnyCriticalNode(new Map())).toBe(false);
  });

  it('returns false for only normal/warning nodes', () => {
    const map = new Map([
      ['a', { status: NODE_STATUS.NORMAL }],
      ['b', { status: NODE_STATUS.WARNING }],
    ]);
    expect(hasAnyCriticalNode(map)).toBe(false);
  });

  it('returns true for ERROR node', () => {
    const map = new Map([['a', { status: NODE_STATUS.ERROR }]]);
    expect(hasAnyCriticalNode(map)).toBe(true);
  });

  it('returns true for OFFLINE node', () => {
    const map = new Map([['a', { status: NODE_STATUS.OFFLINE }]]);
    expect(hasAnyCriticalNode(map)).toBe(true);
  });

  it('returns true when mixed statuses include critical', () => {
    const map = new Map([
      ['a', { status: NODE_STATUS.NORMAL }],
      ['b', { status: NODE_STATUS.ERROR }],
    ]);
    expect(hasAnyCriticalNode(map)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Integration: full pipeline simulation
// ═══════════════════════════════════════════════════════════════════════

describe('Integration — full pipeline', () => {
  const nodes = [
    makeNode('gateway', 430, 0, { width: 200, height: 90 }),
    makeNode('db', 700, 420, { width: 200, height: 90 }),
  ];
  const edges = [makeEdge('e1', 'gateway', 'db')];
  const events = [
    { frame: 60, type: EVENT_TYPE.NODE_STATE, targetId: 'db', status: NODE_STATUS.WARNING },
    { frame: 90, type: EVENT_TYPE.NODE_STATE, targetId: 'db', status: NODE_STATUS.ERROR },
    { frame: 90, type: EVENT_TYPE.EDGE_FLOW, targetId: 'e1', variant: EDGE_VARIANT.DANGER },
    { frame: 300, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.SCREEN_SHAKE },
    { frame: 400, type: EVENT_TYPE.GLOBAL_FX, effect: GLOBAL_FX.BLACKOUT_CTA },
  ];
  const camera = [
    { frame: 0, fitView: true, zoom: 0.4, easing: 'smooth' },
    { frame: 50, targetNodeId: 'db', zoom: 1.6, easing: 'snap' },
  ];

  it('derives correct state at frame 70', () => {
    const statusMap = deriveNodeStatusMap(events, 70);
    const variantMap = deriveEdgeVariantMap(events, 70);
    const fxMap = deriveActiveGlobalFX(events, 70);

    expect(statusMap.get('db').status).toBe(NODE_STATUS.WARNING);
    expect(variantMap.size).toBe(0);
    expect(fxMap.size).toBe(0);
  });

  it('derives correct state at frame 100', () => {
    const statusMap = deriveNodeStatusMap(events, 100);
    const variantMap = deriveEdgeVariantMap(events, 100);

    expect(statusMap.get('db').status).toBe(NODE_STATUS.ERROR);
    expect(variantMap.get('e1').variant).toBe(EDGE_VARIANT.DANGER);
  });

  it('processes nodes and edges end-to-end', () => {
    const statusMap = deriveNodeStatusMap(events, 100);
    const variantMap = deriveEdgeVariantMap(events, 100);

    const pNodes = processNodes(nodes, statusMap, 100);
    const pEdges = processEdges(edges, variantMap);

    expect(pNodes.find((n) => n.id === 'db').data.status).toBe(NODE_STATUS.ERROR);
    expect(pEdges[0].data.variant).toBe(EDGE_VARIANT.DANGER);
  });

  it('resolves camera keyframes with proper centering', () => {
    const pNodes = processNodes(nodes, new Map(), 0);
    const kfs = resolveKeyframes(camera, pNodes, 1080, 1920);

    // First keyframe: fitView — should not be 0,0
    expect(kfs[0].x).not.toBe(0);
    expect(kfs[0].y).not.toBe(0);

    // Second keyframe: targetNodeId 'db' — should center on db
    // db center: 700 + 100 = 800, 420 + 45 = 465
    const dbKf = kfs.find((k) => k.frame === 50);
    expect(dbKf.x).toBeCloseTo(1080 / 2 - 800 * 1.6);
    expect(dbKf.y).toBeCloseTo(1920 / 2 - 465 * 1.6);
  });

  it('detects FX event frames', () => {
    expect(findFXEventFrame(events, GLOBAL_FX.SCREEN_SHAKE)).toBe(300);
    expect(findFXEventFrame(events, GLOBAL_FX.BLACKOUT_CTA)).toBe(400);
    expect(findFXEventFrame(events, GLOBAL_FX.GLITCH)).toBeNull();
  });
});
