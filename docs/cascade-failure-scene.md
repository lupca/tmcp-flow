# Cascade Failure Scene — Architecture & API Reference

## Overview

The **Cascade Failure Scene** is a Remotion-powered cinematic VFX system that
visualises a cascading infrastructure failure across a service-topology graph.
It drives:

| Concern | Module | Pure? |
|---------|--------|-------|
| State engine, camera, FX math | `src/utils/cascadeSceneUtils.js` | Yes |
| React orchestrator | `src/components/CascadeFailureScene.jsx` | — |
| Audio directing | `src/components/cascade/AudioDirector.jsx` | — |
| Vignette & scan-lines | `src/components/cascade/VignetteOverlay.jsx` | — |
| Blackout CTA punchline | `src/components/cascade/BlackoutCTA.jsx` | — |
| Enums, palette, demo data | `src/constants/cascadeConstants.js` | Yes |
| Auto-director (BFS) | `src/utils/cascadeAutoDirect.js` | Yes |

---

## Data Flow

```
inputProps (JSON-serializable)
   │
   ▼
┌─────────────────────────────────┐
│   CascadeFailureScene (React)   │
│  ┌───────────────────────────┐  │
│  │  cascadeSceneUtils (pure) │  │
│  │  ► deriveNodeStatusMap    │  │
│  │  ► deriveEdgeVariantMap   │  │
│  │  ► deriveActiveGlobalFX   │  │
│  │  ► processNodes/Edges     │  │
│  │  ► resolveKeyframes       │  │
│  │  ► interpolateViewport    │  │
│  │  ► computeGlobalFXStyle   │  │
│  └───────────────────────────┘  │
│       │                         │
│       ▼                         │
│  ┌─────────┐ ┌───────────────┐  │
│  │ReactFlow│ │ Overlay Layer │  │
│  │(canvas) │ │ ► Vignette    │  │
│  │         │ │ ► Glitch      │  │
│  │         │ │ ► BlackoutCTA │  │
│  └─────────┘ └───────────────┘  │
│       │                         │
│  ┌────┴───────────┐            │
│  │ AudioDirector  │            │
│  │ ► BGM (ducked) │            │
│  │ ► SFX alarm    │            │
│  │ ► SFX error    │            │
│  └────────────────┘            │
└─────────────────────────────────┘
```

---

## Props — `CascadeFailureScene`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Array` | `[]` | React Flow nodes (type `cascade` or `group`) |
| `edges` | `Array` | `[]` | React Flow edges (type `cascade`) |
| `cameraSequence` | `Array` | `[]` | Camera keyframes — see **Keyframe Modes** |
| `timelineEvents` | `Array` | `[]` | Sorted cascade event script |
| `frame` | `number` | `0` | Current Remotion frame (injected by wrapper) |
| `width` | `number` | `1080` | Composition width in px |
| `height` | `number` | `1920` | Composition height in px |
| `isRemotion` | `boolean` | `false` | Enables audio layers (Remotion-only) |
| `introAudioUrl` | `string\|null` | `null` | Optional voiceover URL |

---

## Camera Keyframe Modes

Each keyframe in `cameraSequence` supports one of three modes:

### 1. `fitView` — Auto-center on all nodes
```js
{ frame: 0, fitView: true, zoom: 0.4, easing: 'smooth' }
```
Computes the bounding box of every non-group node and centres the viewport.

### 2. `targetNodeId` — Focus on one node
```js
{ frame: 60, targetNodeId: 'db-primary', zoom: 1.6, easing: 'snap' }
```
Resolves the node's absolute centre (including parent-chain) and centres on it.

### 3. Literal `x / y`
```js
{ frame: 200, x: 300, y: 500, zoom: 1.0, easing: 'slow' }
```
Pass-through raw viewport coordinates.

### Easing names
| Name | Feel | Remotion function |
|------|------|-------------------|
| `smooth` | Gentle ease-in-out | `Easing.inOut(Easing.ease)` |
| `slow` | Slow, weighted | `Easing.inOut(Easing.cubic)` |
| `snap` | Fast whip-pan | `Easing.out(Easing.back(1.2))` |

---

## Timeline Events

Events are objects with a `frame` and a `type`:

### `NODE_STATE`
```js
{ frame: 90, type: 'NODE_STATE', targetId: 'db-primary', status: 'error' }
```
Valid statuses: `normal` → `warning` → `error` → `offline`.

### `EDGE_FLOW`
```js
{ frame: 90, type: 'EDGE_FLOW', targetId: 'e-user-db', variant: 'danger' }
```
Variants: `normal`, `danger`.

### `GLOBAL_FX`
```js
{ frame: 340, type: 'GLOBAL_FX', effect: 'screen_shake' }
{ frame: 380, type: 'GLOBAL_FX', effect: 'glitch' }
{ frame: 490, type: 'GLOBAL_FX', effect: 'blackout_cta' }
```

---

## Audio Directing

Audio is handled by `AudioDirector` and only renders inside Remotion (`isRemotion === true`).

| Track | File | Trigger | Behaviour |
|-------|------|---------|-----------|
| BGM | `public/bgm-calm.mp3` | Frame 0 | Volume 0.3, ducks to 0 on `blackout_cta` |
| Alarm SFX | `public/sfx-alarm.mp3` | `screen_shake` frame | Volume 0.6 |
| Error SFX | `public/sfx-error.mp3` | `screen_shake` frame | Volume 0.5 |

Assets are referenced via `staticFile()` for Remotion compatibility.

---

## Pure Utility API — `cascadeSceneUtils.js`

All functions are pure and have **zero React/Remotion imports** (except `getEasingFn` which receives `Easing` as a parameter).

| Function | Signature | Returns |
|----------|-----------|---------|
| `getNodeW(node)` | `Node → number` | Effective width |
| `getNodeH(node)` | `Node → number` | Effective height |
| `getAbsolutePosition(node, allNodes)` | `→ {x, y}` | Absolute position (resolves parent chain) |
| `computeFitViewport(allNodes, w, h, zoom)` | `→ {x, y}` | Viewport offset centering all nodes |
| `deriveNodeStatusMap(events, frame)` | `→ Map` | nodeId → { status, frame } |
| `deriveEdgeVariantMap(events, frame)` | `→ Map` | edgeId → { variant, frame } |
| `deriveActiveGlobalFX(events, frame)` | `→ Map` | effectName → { frame } |
| `findFXEventFrame(events, effectName)` | `→ number\|null` | First frame of a specific FX |
| `processNodes(nodes, statusMap, frame)` | `→ Array` | Nodes with injected status data |
| `processEdges(edges, variantMap)` | `→ Array` | Edges with injected variant data |
| `resolveKeyframes(seq, nodes, w, h)` | `→ Array` | Sorted resolved keyframes |
| `interpolateViewport(frame, kfs, Easing)` | `→ {x, y, zoom}` | Current viewport position |
| `findSegmentIndex(frame, kfs)` | `→ number` | Active keyframe segment index |
| `getEasingFn(name, Easing)` | `→ Function` | Easing function for a name |
| `computeGlobalFXStyle(frame, fxMap)` | `→ Object` | CSS transform/filter |
| `hasAnyCriticalNode(statusMap)` | `→ boolean` | Any node in error/offline? |

---

## File Structure

```
src/
├── components/
│   ├── CascadeFailureScene.jsx    ← Orchestrator (slim, ~200 lines)
│   ├── CascadeNode.jsx            ← 4-state cyberpunk node
│   ├── CascadeEdge.jsx            ← 2-variant animated edge
│   └── cascade/
│       ├── AudioDirector.jsx      ← Audio layer management
│       ├── BlackoutCTA.jsx        ← Blackout punchline overlay
│       └── VignetteOverlay.jsx    ← Crisis atmosphere overlays
├── constants/
│   └── cascadeConstants.js        ← Enums, palette, demo data
└── utils/
    ├── cascadeSceneUtils.js       ← Pure helpers (testable)
    ├── cascadeAutoDirect.js       ← BFS auto-director
    └── __tests__/
        └── cascadeSceneUtils.test.js  ← Unit tests (Vitest)
```
