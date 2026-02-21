Project snapshot
- **Video Presentation Studio** — React + React Flow editor for building camera-directed video presentations
- DynamicFlowScene.jsx — pure Remotion presentation component (replaced ArgoK3dFlow.jsx)
- UniversalNode.jsx — fully inline-styled custom node (replaced CustomNode.jsx)
- ViralEdge.jsx — animated bezier edge with particle
- Remotion for programmatic 1080×1920 (TikTok 9:16) video rendering
- Express server that bundles & renders Remotion compositions (server/server.js)

What an AI coding agent should know (concise)
- Big picture: the app is an interactive Studio editor (frontend) where users lay out React Flow nodes, build a camera timeline (cameraSequence), and export MP4 via a Node server that bundles the Remotion composition. The presentation component is pure/prop-driven so the same code runs in the browser and inside Remotion.
- Key files:
  - src/components/DynamicFlowScene.jsx — pure Remotion presentation; viewport/keyframe interpolation, camera motion (look here for camera behavior)
  - src/components/UniversalNode.jsx — custom node component with inline styles (MUST stay inline for Remotion compatibility)
  - src/components/ViralEdge.jsx — animated bezier edge with dashed bg + solid fg + particle
  - src/remotion/RemotionRoot.jsx — registered composition "DynamicFlowScene"; calculateMetadata reads renderWidth/renderHeight/renderDuration/renderFps from inputProps; imports global CSS
  - src/App.jsx — Studio UI/editor; interactive ReactFlow canvas + sidebar timeline editor, Auto Direct feature, export to /api/render
  - server/server.js — bundles composition and calls Remotion renderer; uses inputProps.cameraSequence
  - server/data/scenarios.json & scripts/render-cli.ts — examples and CLI bulk renders
  - src/styles/App.css — studio layout, sidebar, Auto Direct button styles
  - src/styles/index.css — global font, glassmorphism, edge animation keyframes

Architecture specifics
- Default resolution: 1080×1920 (portrait/TikTok), 60fps, 300 frames (5s)
- Node type: `universal` (UniversalNode) — data shape: `{ title, subtitle, icon }`
- Edge type: `viral` (ViralEdge) — animated particles, colored stroke
- Group nodes: type `group` with inline style for cluster containers (e.g., K3d Cluster)
- Child nodes use `parentId` + `extent: 'parent'` — positions are RELATIVE to parent

Camera / framing specifics
- cameraSequence shape (accepted by DynamicFlowScene and Remotion):
  [ { frame: 0, x: 0, y: 0, zoom: 0.8 }, { frame: 60, targetNodeId: 'source-code', zoom: 1.5 }, ... ]
- semantics:
  - If `targetNodeId` is provided, DynamicFlowScene computes x/y from that node's ABSOLUTE center (resolves parent chain for child nodes).
  - Otherwise use numeric x/y (React Flow coordinate system) and `zoom` (scale multiplier).
  - Frames are absolute (frame number inside the composition).
- Viewport formula: `x = width/2 - centerX * zoom`, `y = height/2 - centerY * zoom` (from React Flow source)
- Where to change behavior: modify `processedKeyframes` / interpolation in `src/components/DynamicFlowScene.jsx`.

Auto Direct feature (camera automation)
- `generateAutoSequence()` in App.jsx — BFS traversal starting from root node (no incoming edges), Hold & Pan rule
- Configurable: holdFrames (default 60), panFrames (default 30), zoomClose (1.8), zoomWide (0.5)
- Generates: [wide opening shot] → [pan to node₁, hold] → [pan to node₂, hold] → ... → [wide closing shot]
- Output cameraSequence uses `targetNodeId` for node-focused shots

Developer workflows / commands
- Frontend dev: npm run dev
- Full dev (frontend + server + Remotion bundle): npm run dev:full
- Export from UI: click "Export MP4" — frontend POSTs to /api/render
- Health/bundle check: GET /api/health
- CLI bulk render (uses scenarios.json): node scripts/render-cli.ts

Project-specific conventions
- Presentation components are pure and must accept all render-time inputs via props (no DOM refs in inputProps).
- Keep any render-affecting state serializable (primitive arrays/objects only).
- Use `targetNodeId` rather than hard-coded x/y when possible so renders remain robust across layout changes.
- **UniversalNode MUST use fully inline styles** — Remotion bundles separately and CSS-class-only styling will be lost in rendered MP4s. Global CSS imports exist in RemotionRoot.jsx as a safety net, but component styles should be inline.
- ViralEdge uses SVG `<animateMotion>` for particles — works in both browser and Remotion.
- Node dimensions: use `measured?.width ?? width ?? initialWidth ?? style?.width ?? 170` chain (never `||` for numeric fallbacks — use `??` to handle 0 correctly).
- Child node positions are relative; always resolve absolute via `getAbsolutePosition()` helper in DynamicFlowScene.

If you implement new features
- Update `src/App.jsx` (persist state, UI controls) and pass data through to DynamicFlowScene and to /api/render payload.
- Ensure `server/server.js` pulls new props from request body and forwards via inputProps.
- Remotion composition metadata (width, height, duration, fps) is driven by `calculateMetadata` in RemotionRoot.jsx — add new render-time overrides there if needed.
- Any new custom node should use **inline styles only** for Remotion compatibility.
- Test with a quick export (npm run dev:full → Export MP4) to verify both browser preview and rendered output match.

Common troubleshooting
- "Render failed: Server is still bundling" — wait for pre-bundle to finish or re-run npm run dev:full
- InputProps must be JSON-serializable — functions/DOM nodes will break rendering
- Coordinate mismatch — DynamicFlowScene computes x,y relative to React Flow layout; prefer targetNodeId for node-focused shots
- CSS missing in MP4 — make sure (a) RemotionRoot.jsx imports global CSS, (b) custom nodes use inline styles
- Video always same length — check that client sends `renderDuration` in POST body and server does NOT override `durationInFrames` in renderMedia
- Wrong node centering for child nodes — use `getAbsolutePosition()` to resolve parent chain, not raw `node.position`